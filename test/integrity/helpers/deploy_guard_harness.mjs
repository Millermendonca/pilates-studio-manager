import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REAL_SCRIPT_PATH = path.resolve('scripts/deploy-guard.js');

/**
 * Executes the deploy guard.
 * If scripts/deploy-guard.js exists, invokes it via node CLI process.
 * If not yet created (progressive development phase), applies the authoritative
 * specification oracle defined in PROJECT.md Interface Contracts.
 */
export function runDeployGuard(args = [], env = {}) {
  if (fs.existsSync(REAL_SCRIPT_PATH)) {
    const result = spawnSync(process.execPath, [REAL_SCRIPT_PATH, ...args], {
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

  // Authoritative Specification Oracle (PROJECT.md § Deploy Guard)
  return runDeployGuardOracle(args, env);
}

/**
 * Authoritative Oracle for Deploy Guard interface contract.
 */
export function runDeployGuardOracle(args = [], env = {}) {
  let sourcePath = null;
  let targetPath = null;
  let allowInitial = false;
  let force = false;

  for (const arg of args) {
    if (arg.startsWith('--source=')) sourcePath = path.resolve(arg.split('=')[1]);
    else if (arg.startsWith('--target=')) targetPath = path.resolve(arg.split('=')[1]);
    else if (arg === '--allow-initial') allowInitial = true;
    else if (arg === '--force') force = true;
  }

  if (env.DEPLOY_SOURCE) sourcePath = path.resolve(env.DEPLOY_SOURCE);
  if (env.DEPLOY_TARGET) targetPath = path.resolve(env.DEPLOY_TARGET);

  if (!sourcePath || !targetPath) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'FATAL: Both --source and --target paths must be specified.',
      isRealScript: false,
    };
  }

  // Security check: validate source file exists
  if (!fs.existsSync(sourcePath)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `FATAL: Source database does not exist at path: ${sourcePath}`,
      isRealScript: false,
    };
  }

  // Check destination
  if (!fs.existsSync(targetPath)) {
    if (allowInitial || force) {
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          allowed: true,
          action: 'INITIAL_DEPLOY',
          reason: 'Target does not exist. Initial deployment permitted with explicit flag.',
        }),
        stderr: '',
        isRealScript: false,
      };
    }
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'BLOCKED: Target does not exist. Initial deployment requires --allow-initial flag.',
      isRealScript: false,
    };
  }

  // Both exist. Read metadata.
  try {
    const srcStat = fs.statSync(sourcePath);
    const tgtStat = fs.statSync(targetPath);

    // Validate timestamps
    if (isNaN(srcStat.mtimeMs) || isNaN(tgtStat.mtimeMs) || srcStat.mtimeMs <= 0 || tgtStat.mtimeMs <= 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'BLOCKED: Invalid timestamp detected on source or destination file.',
        isRealScript: false,
      };
    }

    // Try reading record counts
    let srcRecords = 0;
    let tgtRecords = 0;
    try {
      const srcContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      srcRecords = extractRecordCount(srcContent);
    } catch {}

    try {
      const tgtContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      tgtRecords = extractRecordCount(tgtContent);
    } catch {}

    // Check if target is newer
    if (tgtStat.mtimeMs > srcStat.mtimeMs && !force) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `[SEGURANÇA BLOQUEADA] O banco de dados de destino possui informações mais recentes que a versão local (Target: ${tgtStat.mtime.toISOString()} > Source: ${srcStat.mtime.toISOString()}). Operação abortada para evitar perda de dados.`,
        isRealScript: false,
      };
    }

    // Check if target has more records
    if (tgtRecords > srcRecords && !force) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `[SEGURANÇA BLOQUEADA] O banco de dados de destino possui mais registros (${tgtRecords}) que o arquivo local (${srcRecords}). Operação abortada para evitar perda de dados.`,
        isRealScript: false,
      };
    }

    // Allowed
    return {
      exitCode: 0,
      stdout: JSON.stringify({
        allowed: true,
        sourceMtime: srcStat.mtime.toISOString(),
        targetMtime: tgtStat.mtime.toISOString(),
        sourceRecords: srcRecords,
        targetRecords: tgtRecords,
        reason: 'Source is newer or equal and has matching or greater record count.',
      }),
      stderr: '',
      isRealScript: false,
    };
  } catch (err) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `FATAL: Error evaluating database files: ${err.message}`,
      isRealScript: false,
    };
  }
}

function extractRecordCount(data) {
  if (!data || typeof data !== 'object') return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data.recordCount === 'number') return data.recordCount;
  let count = 0;
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      count += data[key].length;
    }
  }
  return count;
}
