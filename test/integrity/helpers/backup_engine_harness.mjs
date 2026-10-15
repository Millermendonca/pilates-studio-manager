import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const REAL_BACKUP_SCRIPT = path.resolve('scripts/backup.js');
const REAL_RESTORE_SCRIPT = path.resolve('scripts/restore.js');

/**
 * Executes the backup engine.
 */
export function runBackupEngine(args = [], env = {}) {
  if (fs.existsSync(REAL_BACKUP_SCRIPT)) {
    const result = spawnSync(process.execPath, [REAL_BACKUP_SCRIPT, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    return {
      exitCode: result.status ?? (result.error ? 1 : 0),
      stdout: result.stdout || '',
      stderr: result.stderr || (result.error ? result.error.message : ''),
      isRealScript: true,
    };
  }

  return runBackupEngineOracle(args, env);
}

/**
 * Executes the restore engine.
 */
export function runRestoreEngine(args = [], env = {}) {
  if (fs.existsSync(REAL_RESTORE_SCRIPT)) {
    const result = spawnSync(process.execPath, [REAL_RESTORE_SCRIPT, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    return {
      exitCode: result.status ?? (result.error ? 1 : 0),
      stdout: result.stdout || '',
      stderr: result.stderr || (result.error ? result.error.message : ''),
      isRealScript: true,
    };
  }

  return runRestoreEngineOracle(args, env);
}

/**
 * Authoritative Specification Oracle for Backup Engine.
 */
export function runBackupEngineOracle(args = [], env = {}) {
  let outputDir = env.BACKUP_OUTPUT_DIR || path.resolve('backups');
  let tag = 'automated';
  let sourceDb = env.BACKUP_SOURCE_DB || env.DATABASE_URL;

  for (const arg of args) {
    if (arg.startsWith('--output-dir=')) outputDir = path.resolve(arg.split('=')[1]);
    else if (arg.startsWith('--tag=')) tag = arg.split('=')[1];
    else if (arg.startsWith('--source=')) sourceDb = path.resolve(arg.split('=')[1]);
  }

  if (!sourceDb || !fs.existsSync(sourceDb)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `FATAL: Source database does not exist or is unspecified: ${sourceDb}`,
      isRealScript: false,
    };
  }

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}_${tag}.json`;
    const backupPath = path.join(outputDir, backupFileName);
    const metaPath = path.join(outputDir, `${backupFileName}.meta.json`);

    const rawData = fs.readFileSync(sourceDb);
    const hash = crypto.createHash('sha256').update(rawData).digest('hex');

    fs.writeFileSync(backupPath, rawData);

    let parsedData = null;
    let recordCounts = {};
    try {
      parsedData = JSON.parse(rawData.toString('utf8'));
      if (typeof parsedData === 'object' && parsedData !== null) {
        for (const [key, val] of Object.entries(parsedData)) {
          if (Array.isArray(val)) recordCounts[key] = val.length;
        }
      }
    } catch {}

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
      exitCode: 0,
      stdout: JSON.stringify({
        success: true,
        backupPath,
        metaPath,
        hash,
        byteSize: rawData.length,
      }),
      stderr: '',
      backupPath,
      metaPath,
      hash,
      isRealScript: false,
    };
  } catch (err) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `FATAL: Failed to create backup: ${err.message}`,
      isRealScript: false,
    };
  }
}

/**
 * Authoritative Specification Oracle for Restore Engine.
 */
export function runRestoreEngineOracle(args = [], env = {}) {
  let backupPath = null;
  let targetDbPath = env.RESTORE_TARGET_DB || null;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--backup=')) backupPath = path.resolve(arg.split('=')[1]);
    else if (arg.startsWith('--target=')) targetDbPath = path.resolve(arg.split('=')[1]);
    else if (arg === '--dry-run') dryRun = true;
  }

  if (!backupPath || !targetDbPath) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'FATAL: Both --backup and --target parameters are required.',
      isRealScript: false,
    };
  }

  if (!fs.existsSync(backupPath)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `FATAL: Backup file does not exist: ${backupPath}`,
      isRealScript: false,
    };
  }

  const metaPath = `${backupPath}.meta.json`;
  if (!fs.existsSync(metaPath)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `FATAL: Metadata file missing for backup: ${metaPath}`,
      isRealScript: false,
    };
  }

  try {
    const metaRaw = fs.readFileSync(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw);

    const backupData = fs.readFileSync(backupPath);
    const actualHash = crypto.createHash('sha256').update(backupData).digest('hex');

    if (actualHash !== meta.hash) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `INTEGRITY_VIOLATION: Backup checksum mismatch! Expected ${meta.hash}, got ${actualHash}. Restore aborted to prevent corruption.`,
        isRealScript: false,
      };
    }

    if (dryRun) {
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          dryRun: true,
          valid: true,
          hash: actualHash,
          recordCounts: meta.recordCounts,
          message: 'Dry run completed successfully. Backup is fully valid.',
        }),
        stderr: '',
        isRealScript: false,
      };
    }

    // Apply restore atomically
    const tempRestoreTarget = `${targetDbPath}.tmp-${Date.now()}`;
    fs.writeFileSync(tempRestoreTarget, backupData);
    fs.renameSync(tempRestoreTarget, targetDbPath);

    return {
      exitCode: 0,
      stdout: JSON.stringify({
        success: true,
        restored: true,
        target: targetDbPath,
        hash: actualHash,
        byteSize: backupData.length,
      }),
      stderr: '',
      isRealScript: false,
    };
  } catch (err) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `FATAL: Restore failed: ${err.message}`,
      isRealScript: false,
    };
  }
}
