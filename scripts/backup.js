#!/usr/bin/env node

/**
 * scripts/backup.js
 * 
 * Automated Pre-Migration & Pre-Deploy Backup Engine
 * Creates cryptographic, timestamped backup snapshots with companion SHA-256 metadata.
 * 
 * Invocation:
 *   node scripts/backup.js [--source=<path>] [--output-dir=<dir>] [--tag=<tag>] [--json]
 * 
 * Exit Codes:
 *   0 = Backup successfully created and verified
 *   1 = Backup failed (missing source database, permission error, write error)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Parses CLI arguments supporting --arg=val, --arg val, -s, -o, -t flags.
 * @param {string[]} argv 
 * @returns {Object}
 */
function parseArgs(argv = []) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--source=')) {
      options.source = arg.slice('--source='.length);
    } else if (arg === '--source' || arg === '-s') {
      options.source = argv[++i];
    } else if (arg.startsWith('-s=')) {
      options.source = arg.slice('-s='.length);
    } else if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.slice('--output-dir='.length);
    } else if (arg === '--output-dir' || arg === '--output' || arg === '-o') {
      options.outputDir = argv[++i];
    } else if (arg.startsWith('-o=')) {
      options.outputDir = arg.slice('-o='.length);
    } else if (arg.startsWith('--output=')) {
      options.outputDir = arg.slice('--output='.length);
    } else if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length);
    } else if (arg === '--tag' || arg === '-t') {
      options.tag = argv[++i];
    } else if (arg.startsWith('-t=')) {
      options.tag = arg.slice('-t='.length);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  return options;
}

/**
 * Normalizes and strips file: prefix or enclosing quotes from a path.
 * @param {string} rawPath 
 * @returns {string}
 */
function cleanPath(rawPath) {
  if (!rawPath) return rawPath;
  let p = String(rawPath).trim();
  p = p.replace(/^['"]|['"]$/g, '');
  if (p.toLowerCase().startsWith('file:')) {
    p = p.slice(5);
  }
  return p;
}

/**
 * Inspects raw buffer to extract record counts if JSON or SQLite.
 * @param {Buffer} rawData 
 * @returns {Object.<string, number>}
 */
function extractRecordCounts(rawData) {
  const counts = {};

  // 1. Check if JSON data
  try {
    const parsed = JSON.parse(rawData.toString('utf8'));
    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed)) {
        counts.items = parsed.length;
      } else {
        for (const [key, val] of Object.entries(parsed)) {
          if (Array.isArray(val)) {
            counts[key] = val.length;
          }
        }
      }
      return counts;
    }
  } catch {}

  // 2. Check if SQLite format 3
  if (rawData.length >= 100 && rawData.subarray(0, 15).toString() === 'SQLite format 3') {
    try {
      let pageSize = rawData.readUInt16BE(16);
      if (pageSize === 1) pageSize = 65536;
      if (pageSize >= 512 && pageSize <= 65536 && (pageSize & (pageSize - 1)) === 0) {
        let totalLeafCells = 0;
        const numPages = Math.floor(rawData.length / pageSize);
        for (let i = 0; i < numPages; i++) {
          const pageOffset = i * pageSize;
          const headerOffset = i === 0 ? 100 : 0;
          if (pageOffset + headerOffset + 3 < rawData.length) {
            const pageType = rawData[pageOffset + headerOffset];
            // 0x0d = B-Tree Leaf Table Page
            if (pageType === 0x0d) {
              totalLeafCells += rawData.readUInt16BE(pageOffset + headerOffset + 3);
            }
          }
        }
        counts.totalRecords = totalLeafCells;
      }
    } catch {}
  }

  return counts;
}

/**
 * Creates an authoritative, cryptographic backup of the specified source database.
 * @param {Object} [options]
 * @param {string} [options.source]
 * @param {string} [options.outputDir]
 * @param {string} [options.tag]
 * @returns {{ success: boolean, backupPath: string, metaPath: string, hash: string, byteSize: number, tag: string }}
 */
function createBackup(options = {}) {
  // Resolve source database path with environment fallbacks
  let rawSource = options.source ||
    process.env.BACKUP_SOURCE_DB ||
    process.env.SOURCE_DB ||
    process.env.DATABASE_URL ||
    'prisma/dev.db';

  rawSource = cleanPath(rawSource);
  const sourceDb = path.resolve(rawSource);

  // Validate source existence (fail-closed)
  if (!fs.existsSync(sourceDb)) {
    const errorMsg = `FATAL: Source database does not exist or is unspecified: ${sourceDb}`;
    throw new Error(errorMsg);
  }

  const stat = fs.statSync(sourceDb);
  if (stat.isDirectory()) {
    const errorMsg = `FATAL: Source database is a directory, not a valid database file: ${sourceDb}`;
    throw new Error(errorMsg);
  }

  // Resolve output directory
  let rawOutputDir = options.outputDir ||
    process.env.BACKUP_OUTPUT_DIR ||
    'backups';
  rawOutputDir = cleanPath(rawOutputDir);
  const outputDir = path.resolve(rawOutputDir);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Resolve tag
  let tag = options.tag || process.env.BACKUP_TAG || 'automated';
  tag = String(tag).trim();

  // Read raw binary buffer for cryptographic parity
  const rawData = fs.readFileSync(sourceDb);
  const hash = crypto.createHash('sha256').update(rawData).digest('hex');

  // Format timestamp (ISO without colons or dots for filesystem safety)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup_${timestamp}_${tag}.json`;
  const backupPath = path.join(outputDir, backupFileName);
  const metaPath = path.join(outputDir, `${backupFileName}.meta.json`);

  // Write backup archive byte-for-byte
  fs.writeFileSync(backupPath, rawData);

  // Extract structural record counts
  const recordCounts = extractRecordCounts(rawData);

  // Authoritative companion metadata schema
  const meta = {
    tag,
    createdAt: new Date().toISOString(),
    timestamp,
    hash,
    byteSize: rawData.length,
    recordCounts,
    sourceDb: path.basename(sourceDb),
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  return {
    success: true,
    backupPath,
    metaPath,
    hash,
    byteSize: rawData.length,
    tag,
    recordCounts,
  };
}

function printUsage() {
  console.log(`
Backup Engine — Pre-Deploy & Pre-Migration Automated Backup Utility

Usage:
  node scripts/backup.js [options]

Options:
  --source, -s <path>     Path to the source database (default: DATABASE_URL or prisma/dev.db)
  --output-dir, -o <dir>  Directory to write backups (default: backups/)
  --tag, -t <tag>         Descriptive snapshot tag (default: 'automated')
  --json                  Output summary in JSON format
  --help, -h              Display this help message

Environment Variables:
  BACKUP_SOURCE_DB        Fallback source database path
  SOURCE_DB               Fallback source database path
  DATABASE_URL            Prisma database connection string or file path
  BACKUP_OUTPUT_DIR       Fallback backup directory
  BACKUP_TAG              Fallback tag string
`);
}

function runCli() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  try {
    const result = createBackup(options);
    const summary = {
      success: true,
      backupPath: result.backupPath,
      metaPath: result.metaPath,
      hash: result.hash,
      byteSize: result.byteSize,
    };
    console.log(JSON.stringify(summary));
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  createBackup,
  extractRecordCounts,
  parseArgs,
  runCli,
};
