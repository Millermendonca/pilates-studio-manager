#!/usr/bin/env node

/**
 * scripts/deploy-guard.js
 * 
 * Deployment Shielding & Database Protection Gate
 * Prevents deployment / synchronization from overwriting a newer or larger
 * destination production database with older or smaller local development files.
 * 
 * Invocation:
 *   node scripts/deploy-guard.js --source=<sourcePath> --target=<targetPath> [--allow-initial] [--force] [--json]
 * 
 * Exit Codes:
 *   0 = Safe to deploy / Allowed
 *   1 = Blocked (Destination newer or has more records, unparseable destination, or invalid options)
 */

const fs = require('fs');
const path = require('path');

/**
 * Comprehensive database inspection engine.
 * Inspects binary SQLite headers, JSON data stores, and SQL dumps.
 * Returns parseability status, record counts, and format identification.
 * 
 * @param {string} filePath 
 * @returns {{ count: number, parseable: boolean, format: string, error?: string, size: number }}
 */
function inspectDatabase(filePath) {
  if (!fs.existsSync(filePath)) {
    return { count: 0, parseable: true, format: 'missing', size: 0 };
  }

  try {
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) {
      return { count: 0, parseable: false, format: 'directory', error: 'Path is a directory, not a regular file', size: 0 };
    }

    if (stat.size === 0) {
      return { count: 0, parseable: true, format: 'empty', size: 0 };
    }

    const buffer = fs.readFileSync(filePath);

    const ext = path.extname(filePath).toLowerCase();
    const isDbExtension = ext === '.db' || ext === '.sqlite' || ext === '.sqlite3';

    // 1. Check if SQLite 3 database
    if (buffer.length >= 100 && buffer.subarray(0, 15).toString() === 'SQLite format 3') {
      let pageSize = buffer.readUInt16BE(16);
      if (pageSize === 1) pageSize = 65536;

      // SQLite specification: page size must be a power of two between 512 and 65536
      if (pageSize < 512 || pageSize > 65536 || (pageSize & (pageSize - 1)) !== 0) {
        return {
          count: 0,
          parseable: false,
          format: 'sqlite_corrupt',
          error: `Corrupt SQLite page size: ${pageSize} (must be a power of 2 between 512 and 65536)`,
          size: stat.size
        };
      }

      let totalLeafCells = 0;
      const numPages = Math.floor(buffer.length / pageSize);

      for (let i = 0; i < numPages; i++) {
        const pageOffset = i * pageSize;
        const headerOffset = i === 0 ? 100 : 0;
        if (pageOffset + headerOffset + 3 < buffer.length) {
          const pageType = buffer[pageOffset + headerOffset];
          // 0x0d = B-Tree Leaf Table Page (contains actual table rows)
          if (pageType === 0x0d) {
            const cellCount = buffer.readUInt16BE(pageOffset + headerOffset + 3);
            totalLeafCells += cellCount;
          }
        }
      }

      return { count: totalLeafCells, parseable: true, format: 'sqlite', size: stat.size };
    }

    // 2. Check if JSON data store (used in test harnesses or backups)
    const textPreview = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)).trim();
    if (textPreview.startsWith('{') || textPreview.startsWith('[')) {
      try {
        const json = JSON.parse(buffer.toString('utf8'));
        if (Array.isArray(json)) {
          return { count: json.length, parseable: true, format: 'json_array', size: stat.size };
        }
        if (typeof json === 'object' && json !== null) {
          let count = 0;
          let hasArray = false;
          for (const key of Object.keys(json)) {
            if (Array.isArray(json[key])) {
              count += json[key].length;
              hasArray = true;
            }
          }
          const finalCount = hasArray ? count : Object.keys(json).length;
          return { count: finalCount, parseable: true, format: 'json_object', size: stat.size };
        }
      } catch (jsonErr) {
        return {
          count: 0,
          parseable: false,
          format: 'json_corrupt',
          error: `Invalid JSON syntax: ${jsonErr.message}`,
          size: stat.size
        };
      }
    }

    // 3. If file has a database extension (.db, .sqlite, .sqlite3) but is neither SQLite nor JSON,
    // it is a corrupt or unparseable database file
    if (isDbExtension) {
      return {
        count: 0,
        parseable: false,
        format: 'sqlite_corrupt',
        error: 'File has database extension but does not contain a valid SQLite 3 header or JSON mock store',
        size: stat.size
      };
    }

    // 4. Plain text / SQL dump check: verify it does not contain binary null bytes
    const sampleLength = Math.min(buffer.length, 1024);
    const hasNullBytes = buffer.subarray(0, sampleLength).includes(0x00);
    if (!hasNullBytes) {
      const textContent = buffer.toString('utf8');
      const lines = textContent.split('\n').filter(l => l.trim().length > 0);
      const isSqlExtension = ext === '.sql' || ext === '.dump' || ext === '.txt';
      const hasSqlKeywords = /insert\s+into|create\s+table|copy\s+|--/i.test(textContent.slice(0, 4096));
      if (isSqlExtension || hasSqlKeywords) {
        return { count: lines.length, parseable: true, format: 'sql_text', size: stat.size };
      }
    }

    // Non-empty binary file that is not valid SQLite or JSON
    return {
      count: 0,
      parseable: false,
      format: 'unknown_binary',
      error: 'Unrecognized database format or unparseable binary data',
      size: stat.size
    };
  } catch (err) {
    return { count: 0, parseable: false, format: 'error', error: err.message, size: 0 };
  }
}

/**
 * Robust cross-format record counter (SQLite, JSON, Text)
 * @param {string} filePath 
 * @param {Object} [options]
 * @returns {number}
 */
function extractRecordCount(filePath, options = {}) {
  const info = inspectDatabase(filePath);
  return info.parseable ? info.count : 0;
}

/**
 * Evaluates whether deployment from source to target is safe.
 * @param {Object} options
 * @param {string} options.source
 * @param {string} options.target
 * @param {boolean} [options.allowInitial=false]
 * @param {boolean} [options.force=false]
 * @param {boolean} [options.throwOnError=false]
 * @returns {{ allowed: boolean, reason: string, code: number, details?: Object }}
 */
function checkDeploySafety(options = {}) {
  const allowInitial = Boolean(options.allowInitial || process.env.ALLOW_INITIAL_DEPLOY === 'true' || process.env.ALLOW_INITIAL_DEPLOY === '1');
  const force = Boolean(options.force || process.env.FORCE_DEPLOY === 'true' || process.env.FORCE_DEPLOY === '1');

  // Resolve source database path (supports options, DEPLOY_SOURCE, DEPLOY_SOURCE_DB, SOURCE_DB)
  const rawSource = options.source || process.env.DEPLOY_SOURCE || process.env.DEPLOY_SOURCE_DB || process.env.SOURCE_DB || 'prisma/dev.db';
  const sourcePath = path.resolve(process.cwd(), rawSource);

  // Resolve target database path (supports options, DEPLOY_TARGET, DEPLOY_TARGET_DB, TARGET_DB, PRODUCTION_DB_PATH)
  const rawTarget = options.target || process.env.DEPLOY_TARGET || process.env.DEPLOY_TARGET_DB || process.env.TARGET_DB || process.env.PRODUCTION_DB_PATH;
  if (!rawTarget) {
    const errorMsg = 'DEPLOY_GUARD_ERROR: Target database path not specified. Specify --target=<path> or set DEPLOY_TARGET / DEPLOY_TARGET_DB.';
    if (options.throwOnError) throw new Error(errorMsg);
    return { allowed: false, reason: errorMsg, code: 1 };
  }
  const targetPath = path.resolve(process.cwd(), rawTarget);

  // Check source existence
  if (!fs.existsSync(sourcePath)) {
    const errorMsg = `DEPLOY_GUARD_ERROR: Source database not found at path: ${sourcePath}`;
    if (options.throwOnError) throw new Error(errorMsg);
    return { allowed: false, reason: errorMsg, code: 1, details: { sourcePath } };
  }

  // Check that source is a regular file
  const srcStat = fs.statSync(sourcePath);
  if (!srcStat.isFile()) {
    const errorMsg = `DEPLOY_GUARD_ERROR: Source database path is a directory, not a file: ${sourcePath}`;
    if (options.throwOnError) throw new Error(errorMsg);
    return { allowed: false, reason: errorMsg, code: 1, details: { sourcePath } };
  }

  // Check identical canonical path
  if (sourcePath === targetPath) {
    return {
      allowed: true,
      reason: 'DEPLOY_GUARD_OK: Source and target point to the identical file.',
      code: 0,
      details: { sourcePath, targetPath, identical: true }
    };
  }

  // Check if target does not exist
  if (!fs.existsSync(targetPath)) {
    if (allowInitial || force) {
      return {
        allowed: true,
        reason: 'DEPLOY_GUARD_OK: Destination database does not exist. Initial deployment permitted with --allow-initial.',
        code: 0,
        details: { initialDeployment: true, targetPath }
      };
    } else {
      const errorMsg = `DEPLOY_GUARD_BLOCKED: Destination database does not exist at ${targetPath}. For an initial deployment or new installation, provide --allow-initial.`;
      if (options.throwOnError) throw new Error(errorMsg);
      return {
        allowed: false,
        reason: errorMsg,
        code: 1,
        details: { destinationExists: false, targetPath }
      };
    }
  }

  // Target exists - verify regular file
  const dstStat = fs.statSync(targetPath);
  if (!dstStat.isFile()) {
    const errorMsg = `DEPLOY_GUARD_ERROR: Target database path is a directory, not a file: ${targetPath}`;
    if (options.throwOnError) throw new Error(errorMsg);
    return { allowed: false, reason: errorMsg, code: 1, details: { targetPath } };
  }

  // Check if target file is 0 bytes
  if (dstStat.size === 0) {
    if (allowInitial || force) {
      return {
        allowed: true,
        reason: 'DEPLOY_GUARD_OK: Destination database is empty (0 bytes). Initial deployment permitted with --allow-initial.',
        code: 0,
        details: { initialDeployment: true, emptyDestination: true, targetPath }
      };
    } else {
      const errorMsg = `DEPLOY_GUARD_BLOCKED: Destination database exists at ${targetPath} but is empty (0 bytes). Provide --allow-initial to permit overwriting empty destination.`;
      if (options.throwOnError) throw new Error(errorMsg);
      return {
        allowed: false,
        reason: errorMsg,
        code: 1,
        details: { emptyDestination: true, targetPath }
      };
    }
  }

  // Inspect database structures and record counts
  const srcInfo = inspectDatabase(sourcePath);
  const dstInfo = inspectDatabase(targetPath);

  const srcMtime = srcStat.mtimeMs;
  const dstMtime = dstStat.mtimeMs;
  const srcRecords = srcInfo.count;
  const dstRecords = dstInfo.count;

  const baseDetails = {
    sourcePath,
    targetPath,
    sourceMtime: srcStat.mtime.toISOString(),
    targetMtime: dstStat.mtime.toISOString(),
    sourceSize: srcStat.size,
    targetSize: dstStat.size,
    sourceRecords: srcRecords,
    targetRecords: dstRecords,
    sourceFormat: srcInfo.format,
    targetFormat: dstInfo.format,
  };

  // Force override flag
  if (force) {
    return {
      allowed: true,
      reason: 'DEPLOY_GUARD_WARNING: Forced deployment (--force specified). Safety locks bypassed.',
      code: 0,
      details: { ...baseDetails, forced: true }
    };
  }

  // Fail-closed gate: Destination exists, is non-empty, but could not be parsed
  if (!dstInfo.parseable) {
    const errorMsg = `DEPLOY_GUARD_BLOCKED: Destination database exists and is non-empty (${dstStat.size} bytes), but could not be verified as a valid database (${dstInfo.error}). Overwrite blocked to protect production data. Provide --force to override.`;
    if (options.throwOnError) throw new Error(errorMsg);
    return {
      allowed: false,
      reason: errorMsg,
      code: 1,
      details: { ...baseDetails, violation: 'unverified_destination_records', error: dstInfo.error }
    };
  }

  // Source integrity gate: Source must be parseable
  if (!srcInfo.parseable) {
    const errorMsg = `DEPLOY_GUARD_ERROR: Source database at ${sourcePath} could not be parsed (${srcInfo.error}). Deployment aborted to prevent deploying damaged data.`;
    if (options.throwOnError) throw new Error(errorMsg);
    return {
      allowed: false,
      reason: errorMsg,
      code: 1,
      details: { ...baseDetails, violation: 'unparseable_source', error: srcInfo.error }
    };
  }

  // 1. Timestamp check: Destination must NOT be newer than source
  if (dstMtime > srcMtime) {
    const errorMsg = `DEPLOY_GUARD_BLOCKED: Destination database has newer data than local source! Destination mtime: ${dstStat.mtime.toISOString()} > Source mtime: ${srcStat.mtime.toISOString()}. Overwrite blocked to protect production data.`;
    if (options.throwOnError) throw new Error(errorMsg);
    return {
      allowed: false,
      reason: errorMsg,
      code: 1,
      details: { ...baseDetails, violation: 'newer_destination', timeDiffMs: dstMtime - srcMtime }
    };
  }

  // 2. Record count check: Destination must NOT have more records than source
  if (dstRecords > srcRecords) {
    const errorMsg = `DEPLOY_GUARD_BLOCKED: Destination database contains more records (${dstRecords}) than source database (${srcRecords})! Overwrite blocked to protect production data.`;
    if (options.throwOnError) throw new Error(errorMsg);
    return {
      allowed: false,
      reason: errorMsg,
      code: 1,
      details: { ...baseDetails, violation: 'higher_record_count', recordDiff: dstRecords - srcRecords }
    };
  }

  // Destination is older or equal AND has fewer or equal records: SAFE
  return {
    allowed: true,
    reason: `DEPLOY_GUARD_OK: Destination database verified safe for deployment. Source is newer or equal and contains equal or greater records (Source: ${srcRecords}, Dest: ${dstRecords}).`,
    code: 0,
    details: baseDetails
  };
}

/**
 * CLI Argument Parser
 */
function parseArgs(args) {
  const result = {
    source: null,
    target: null,
    allowInitial: false,
    force: false,
    json: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--allow-initial') {
      result.allowInitial = true;
    } else if (arg === '--force') {
      result.force = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg.startsWith('--source=')) {
      result.source = arg.slice('--source='.length);
    } else if (arg === '--source' || arg === '-s') {
      result.source = args[++i];
    } else if (arg.startsWith('--target=')) {
      result.target = arg.slice('--target='.length);
    } else if (arg === '--target' || arg === '-t' || arg === '--dest' || arg === '--destination') {
      result.target = args[++i];
    } else if (arg.startsWith('--dest=')) {
      result.target = arg.slice('--dest='.length);
    } else if (arg.startsWith('--destination=')) {
      result.target = arg.slice('--destination='.length);
    }
  }

  return result;
}

function printUsage() {
  console.log(`
Deploy Guard — Pre-deployment Database Protection Gate

Usage:
  node scripts/deploy-guard.js --source=<sourcePath> --target=<targetPath> [options]

Options:
  --source, -s <path>     Path to the source/local database (default: prisma/dev.db)
  --target, -t <path>     Path to the target/production database
  --allow-initial         Permit deployment if target database does not exist or is empty
  --force                 Force deployment overriding timestamp and record count safety checks
  --json                  Output decision and metadata in JSON format
  --help, -h              Display this help message

Environment Variables:
  DEPLOY_SOURCE           Fallback source database path
  DEPLOY_TARGET           Fallback target database path
  DEPLOY_SOURCE_DB        Fallback source path (legacy)
  DEPLOY_TARGET_DB        Fallback target path (legacy)
  ALLOW_INITIAL_DEPLOY    Set to 'true' or '1' to permit initial deployment
  FORCE_DEPLOY            Set to 'true' or '1' to force deployment

Exit Codes:
  0 = Deployment permitted (destination older/equal and smaller/equal, or --allow-initial / --force)
  1 = Deployment blocked (destination newer, more records, unparseable, or invalid args)
`);
}

function runCli() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    printUsage();
    process.exit(0);
  }

  const result = checkDeploySafety(parsed);

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.allowed) {
      console.log(`[DEPLOY-GUARD] ✅ ${result.reason}`);
      if (result.details) {
        if (result.details.sourceRecords !== undefined) {
          console.log(`[DEPLOY-GUARD]    Source records: ${result.details.sourceRecords} | Target records: ${result.details.targetRecords}`);
        }
        if (result.details.sourceMtime !== undefined) {
          console.log(`[DEPLOY-GUARD]    Source mtime:   ${result.details.sourceMtime}`);
          console.log(`[DEPLOY-GUARD]    Target mtime:   ${result.details.targetMtime}`);
        }
      }
    } else {
      console.error(`[DEPLOY-GUARD] ⛔ ${result.reason}`);
      if (result.details && result.details.violation) {
        console.error(`[DEPLOY-GUARD]    Violation: ${result.details.violation}`);
      }
    }
  }

  process.exit(result.code);
}

// Support both CLI execution and require() import
if (require.main === module) {
  runCli();
}

module.exports = {
  checkDeploySafety,
  extractRecordCount,
  inspectDatabase,
  parseArgs,
  runCli,
  // Alias for test compatibility
  safeDeployGuard: (source, target, options = {}) => {
    return checkDeploySafety({ source, target, throwOnError: true, ...options });
  }
};
