#!/usr/bin/env node

/**
 * scripts/restore.js
 * 
 * Point-in-Time Disaster Recovery & Restore Engine
 * Verifies cryptographic integrity of backup snapshots before atomic co-located replacement.
 * 
 * Invocation:
 *   node scripts/restore.js --backup=<backupPath> --target=<targetDbPath> [--dry-run] [--force] [--json]
 * 
 * Exit Codes:
 *   0 = Restore successfully verified and applied (or valid dry-run)
 *   1 = Verification failed, corrupted checksum, missing metadata, or missing params
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Parses CLI arguments supporting --arg=val, --arg val, -b, -t, -d, -f flags.
 * @param {string[]} argv 
 * @returns {Object}
 */
function parseArgs(argv = []) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--backup=')) {
      options.backup = arg.slice('--backup='.length);
    } else if (arg === '--backup' || arg === '-b') {
      options.backup = argv[++i];
    } else if (arg.startsWith('-b=')) {
      options.backup = arg.slice('-b='.length);
    } else if (arg.startsWith('--target=')) {
      options.target = arg.slice('--target='.length);
    } else if (arg === '--target' || arg === '-t' || arg === '--dest' || arg === '--destination') {
      options.target = argv[++i];
    } else if (arg.startsWith('-t=')) {
      options.target = arg.slice('-t='.length);
    } else if (arg.startsWith('--dest=')) {
      options.target = arg.slice('--dest='.length);
    } else if (arg.startsWith('--destination=')) {
      options.target = arg.slice('--destination='.length);
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
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
 * Restores a database snapshot after strict cryptographic verification.
 * @param {Object} options
 * @param {string} options.backup
 * @param {string} options.target
 * @param {boolean} [options.dryRun=false]
 * @returns {{ success?: boolean, restored?: boolean, dryRun?: boolean, valid?: boolean, target?: string, hash: string, byteSize?: number, recordCounts?: Object }}
 */
function restoreBackup(options = {}) {
  // Resolve backup file path with environment fallbacks
  let rawBackup = options.backup ||
    process.env.RESTORE_BACKUP_PATH ||
    process.env.BACKUP_PATH;

  // Resolve target database path with environment fallbacks
  let rawTarget = options.target ||
    process.env.RESTORE_TARGET_DB ||
    process.env.TARGET_DB ||
    process.env.DATABASE_URL;

  const dryRun = Boolean(options.dryRun || process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1');

  if (!rawBackup || !rawTarget) {
    throw new Error('FATAL: Both --backup and --target parameters are required.');
  }

  const backupPath = path.resolve(cleanPath(rawBackup));
  const targetDbPath = path.resolve(cleanPath(rawTarget));

  // 1. Validate backup file existence (target untouched)
  if (!fs.existsSync(backupPath)) {
    throw new Error(`FATAL: Backup file does not exist: ${backupPath}`);
  }

  // 2. Validate metadata companion file existence (target untouched)
  const metaPath = `${backupPath}.meta.json`;
  if (!fs.existsSync(metaPath)) {
    throw new Error(`FATAL: Metadata file missing for backup: ${metaPath}`);
  }

  // 3. Read metadata
  let meta;
  try {
    const metaRaw = fs.readFileSync(metaPath, 'utf8');
    meta = JSON.parse(metaRaw);
  } catch (err) {
    throw new Error(`FATAL: Corrupted or unparseable metadata file: ${metaPath} - ${err.message}`);
  }

  // 4. Read raw backup data and compute SHA-256
  const backupData = fs.readFileSync(backupPath);
  const actualHash = crypto.createHash('sha256').update(backupData).digest('hex');

  // 5. Fail-closed cryptographic tamper detection (target untouched)
  if (actualHash !== meta.hash) {
    throw new Error(`INTEGRITY_VIOLATION: Backup checksum mismatch! Expected ${meta.hash}, got ${actualHash}. Restore aborted to prevent corruption.`);
  }

  // 6. Dry run validation: report success without touching target
  if (dryRun) {
    return {
      dryRun: true,
      valid: true,
      hash: actualHash,
      recordCounts: meta.recordCounts || {},
      message: 'Dry run completed successfully. Backup is fully valid.',
    };
  }

  // 7. Atomic two-phase write co-located in target directory
  const targetDir = path.dirname(targetDbPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const tempRestoreTarget = path.join(
    targetDir,
    `.tmp-restore-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  try {
    // Write exact bytes to staging file in target directory (avoids cross-device EXDEV)
    fs.writeFileSync(tempRestoreTarget, backupData);

    // Atomic rename with Windows-tolerant retry loop
    let renamed = false;
    let lastErr = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        fs.renameSync(tempRestoreTarget, targetDbPath);
        renamed = true;
        break;
      } catch (renameErr) {
        lastErr = renameErr;
        const waitTill = Date.now() + 15;
        while (Date.now() < waitTill) {}
      }
    }

    if (!renamed) {
      throw lastErr;
    }
  } finally {
    if (fs.existsSync(tempRestoreTarget)) {
      try {
        fs.unlinkSync(tempRestoreTarget);
      } catch {}
    }
  }

  return {
    success: true,
    restored: true,
    target: targetDbPath,
    hash: actualHash,
    byteSize: backupData.length,
  };
}

function printUsage() {
  console.log(`
Restore Engine — Point-in-Time Disaster Recovery & Restore Utility

Usage:
  node scripts/restore.js --backup=<backupPath> --target=<targetDbPath> [options]

Options:
  --backup, -b <path>     Path to the backup archive file
  --target, -t <path>     Path to the destination database
  --dry-run, -d           Validate backup integrity without modifying the target
  --force, -f             Force restore operation
  --json                  Output summary in JSON format
  --help, -h              Display this help message

Environment Variables:
  RESTORE_BACKUP_PATH     Fallback backup file path
  BACKUP_PATH             Fallback backup file path
  RESTORE_TARGET_DB       Fallback target database path
  TARGET_DB               Fallback target database path
  DATABASE_URL            Prisma database connection string or file path
  DRY_RUN                 Set to 'true' or '1' for dry-run verification
`);
}

function runCli() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  try {
    const result = restoreBackup(options);
    console.log(JSON.stringify(result));
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
  restoreBackup,
  parseArgs,
  runCli,
};
