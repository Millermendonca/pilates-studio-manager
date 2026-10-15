/**
 * test/integrity/challenger_m4_stress.test.mjs
 * 
 * Milestone 4 Empirical Challenger Adversarial Stress Suite
 * 
 * Empirically validates Section 4 of RELATORIO_PREVENCAO_PERDA_DE_DADOS.md:
 * 1. CLI Execution Parity with documented commands:
 *    - `npm run backup` in isolated temp environment
 *    - `node scripts/backup.js --tag=fechamento-mensal-outubro`
 *    - `node scripts/restore.js --backup=... --target=... --dry-run`
 *    - `node scripts/restore.js --backup=... --target=...`
 * 2. Output Format Verification:
 *    - JSON schema and field types matching Section 4 documented outputs
 * 3. Dry-Run Target Immutability:
 *    - Nonexistent target remains nonexistent
 *    - Existing target retains exact hash, byte size, and mtime
 *    - Staging files cleaned up
 * 4. Full Restore Fidelity:
 *    - 100% byte-for-byte and structural data recovery
 * 5. Emergency Scenarios & Fail-Closed Tamper Resistance:
 *    - Corrupted backup archive bit-flip detection
 *    - Missing or corrupted companion metadata detection
 *    - Missing source / missing parameter errors
 *    - Strict preservation of target database under all failure modes
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createTempDir, cleanupTempDir, createMockDatabase, calculateHash } from './helpers/temp_env.mjs';

const PROJECT_ROOT = path.resolve('.');
const BACKUP_SCRIPT = path.resolve('scripts/backup.js');
const RESTORE_SCRIPT = path.resolve('scripts/restore.js');

const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';

describe('Milestone 4 Empirical Challenger — Section 4 CLI & Disaster Recovery Parity', () => {
  let tmpDir;
  let sourceDb;
  let targetDb;
  let backupDir;

  const sampleStudioData = {
    studio: {
      id: 'studio_pilates_01',
      name: 'Pilates Studio Manager Official',
      plan: 'ENTERPRISE_LGPD',
    },
    students: [
      { id: 'std_01', name: 'Juliana Paes', cpf: '111.222.333-44', healthNotes: 'Hérnia L5-S1' },
      { id: 'std_02', name: 'Carlos Eduardo', cpf: '222.333.444-55', healthNotes: 'Condromalácia' },
      { id: 'std_03', name: 'Beatriz Lima', cpf: '333.444.555-66', healthNotes: 'Gestante' },
    ],
    invoices: [
      { id: 'inv_01', studentId: 'std_01', amount: 380.0, status: 'PAID' },
      { id: 'inv_02', studentId: 'std_02', amount: 450.0, status: 'PAID' },
    ],
    schedules: [
      { id: 'sch_01', studentId: 'std_01', day: 'MONDAY', time: '09:00' },
      { id: 'sch_02', studentId: 'std_02', day: 'WEDNESDAY', time: '10:00' },
    ],
  };

  beforeEach(() => {
    tmpDir = createTempDir('wise-m4-challenger-');
    sourceDb = path.join(tmpDir, 'source-database.json');
    targetDb = path.join(tmpDir, 'target-database.json');
    backupDir = path.join(tmpDir, 'backups');
    createMockDatabase(sourceDb, sampleStudioData);
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  // =========================================================================
  // CATEGORY 1: CLI EXECUTION PARITY (SECTION 4 DOCUMENTED COMMANDS)
  // =========================================================================
  describe('1. CLI Execution Parity with Documented Commands', () => {
    it('1.1: Executes "npm run backup" via package.json script in isolated environment', () => {
      // Execute npm run backup with environment pointing strictly to isolated temp directory
      const proc = spawnSync(NPM_CMD, ['run', 'backup'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          BACKUP_SOURCE_DB: sourceDb,
          BACKUP_OUTPUT_DIR: backupDir,
          BACKUP_TAG: 'npm-run-test',
        },
      });

      assert.strictEqual(proc.status, 0, `npm run backup exited with status ${proc.status}: ${proc.stderr}`);
      
      // Locate the JSON output in stdout (ignoring npm header banners)
      const lines = proc.stdout.trim().split(/\r?\n/);
      const jsonLine = lines.find(l => l.startsWith('{') && l.endsWith('}'));
      assert.ok(jsonLine, 'Expected JSON output from npm run backup');

      const parsed = JSON.parse(jsonLine);
      assert.strictEqual(parsed.success, true);
      assert.ok(fs.existsSync(parsed.backupPath), `Backup file must exist at ${parsed.backupPath}`);
      assert.ok(fs.existsSync(parsed.metaPath), `Meta file must exist at ${parsed.metaPath}`);
    });

    it('1.2: Executes "node scripts/backup.js --tag=fechamento-mensal-outubro" as documented in guide', () => {
      const proc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=fechamento-mensal-outubro',
      ], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });

      assert.strictEqual(proc.status, 0, `backup.js exited with ${proc.status}: ${proc.stderr}`);
      const output = JSON.parse(proc.stdout.trim());

      assert.strictEqual(output.success, true);
      assert.ok(output.backupPath.includes('fechamento-mensal-outubro'), 'Filename must include documented tag');
      assert.ok(output.metaPath.includes('fechamento-mensal-outubro'), 'Metadata filename must include tag');

      // Verify metadata companion content
      const meta = JSON.parse(fs.readFileSync(output.metaPath, 'utf8'));
      assert.strictEqual(meta.tag, 'fechamento-mensal-outubro');
      assert.strictEqual(meta.hash, output.hash);
      assert.strictEqual(meta.byteSize, output.byteSize);
    });

    it('1.3: Executes "node scripts/restore.js --backup=... --target=... --dry-run" as documented in guide', () => {
      // Create backup first
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backupOutput = JSON.parse(backupProc.stdout.trim());

      // Execute dry-run restore
      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backupOutput.backupPath}`,
        `--target=${targetDb}`,
        '--dry-run',
      ], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });

      assert.strictEqual(restoreProc.status, 0, `restore.js --dry-run failed: ${restoreProc.stderr}`);
      const dryRunOutput = JSON.parse(restoreProc.stdout.trim());

      assert.strictEqual(dryRunOutput.dryRun, true);
      assert.strictEqual(dryRunOutput.valid, true);
      assert.strictEqual(dryRunOutput.hash, backupOutput.hash);
      assert.strictEqual(dryRunOutput.message, 'Dry run completed successfully. Backup is fully valid.');
    });

    it('1.4: Executes "node scripts/restore.js --backup=... --target=..." (real restore) as documented in guide', () => {
      // Create backup first
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backupOutput = JSON.parse(backupProc.stdout.trim());

      // Execute real restore
      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backupOutput.backupPath}`,
        `--target=${targetDb}`,
      ], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });

      assert.strictEqual(restoreProc.status, 0, `restore.js failed: ${restoreProc.stderr}`);
      const restoreOutput = JSON.parse(restoreProc.stdout.trim());

      assert.strictEqual(restoreOutput.success, true);
      assert.strictEqual(restoreOutput.restored, true);
      assert.strictEqual(restoreOutput.target, path.resolve(targetDb));
      assert.strictEqual(restoreOutput.hash, backupOutput.hash);
      assert.ok(fs.existsSync(targetDb), 'Target database must exist after full restore');
    });
  });

  // =========================================================================
  // CATEGORY 2: OUTPUT FORMAT & JSON SCHEMA PARITY (SECTION 4 VERIFICATION)
  // =========================================================================
  describe('2. Output Format Verification (Section 4 Schemas)', () => {
    it('2.1: Backup engine stdout exactly matches documented schema in Section 4 (lines 245-252)', () => {
      const proc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=fechamento-mensal-outubro',
      ], { encoding: 'utf8' });

      assert.strictEqual(proc.status, 0);
      const parsed = JSON.parse(proc.stdout.trim());

      // Expected keys according to Section 4:
      // { "success": true, "backupPath": "...", "metaPath": "...", "hash": "...", "byteSize": 128450 }
      assert.strictEqual(typeof parsed.success, 'boolean');
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(typeof parsed.backupPath, 'string');
      assert.strictEqual(typeof parsed.metaPath, 'string');
      assert.strictEqual(typeof parsed.hash, 'string');
      assert.match(parsed.hash, /^[a-f0-9]{64}$/, 'hash must be a 64-character SHA-256 hex string');
      assert.strictEqual(typeof parsed.byteSize, 'number');
      assert.ok(parsed.byteSize > 0, 'byteSize must be greater than zero');
      assert.strictEqual(parsed.byteSize, fs.readFileSync(sourceDb).length);
    });

    it('2.2: Restore engine --dry-run stdout exactly matches documented schema in Section 4 (lines 272-280)', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
        '--dry-run',
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 0);
      const parsed = JSON.parse(restoreProc.stdout.trim());

      // Expected keys according to Section 4:
      // { "dryRun": true, "valid": true, "hash": "...", "recordCounts": { ... }, "message": "..." }
      assert.strictEqual(parsed.dryRun, true);
      assert.strictEqual(parsed.valid, true);
      assert.strictEqual(typeof parsed.hash, 'string');
      assert.match(parsed.hash, /^[a-f0-9]{64}$/);
      assert.strictEqual(typeof parsed.recordCounts, 'object');
      assert.strictEqual(parsed.message, 'Dry run completed successfully. Backup is fully valid.');
    });

    it('2.3: Restore engine real restore stdout exactly matches documented schema in Section 4 (lines 294-302)', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 0);
      const parsed = JSON.parse(restoreProc.stdout.trim());

      // Expected keys according to Section 4:
      // { "success": true, "restored": true, "target": "...", "hash": "...", "byteSize": 128450 }
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.restored, true);
      assert.strictEqual(typeof parsed.target, 'string');
      assert.strictEqual(parsed.target, path.resolve(targetDb));
      assert.strictEqual(typeof parsed.hash, 'string');
      assert.match(parsed.hash, /^[a-f0-9]{64}$/);
      assert.strictEqual(typeof parsed.byteSize, 'number');
      assert.strictEqual(parsed.byteSize, backup.byteSize);
    });
  });

  // =========================================================================
  // CATEGORY 3: TARGET IMMUTABILITY UNDER DRY-RUN
  // =========================================================================
  describe('3. Target Immutability Under Dry-Run Verification', () => {
    it('3.1: Nonexistent target database remains completely nonexistent after dry-run', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      const nonExistentTarget = path.join(tmpDir, 'should-never-exist.db');
      assert.strictEqual(fs.existsSync(nonExistentTarget), false, 'Precondition: target does not exist');

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${nonExistentTarget}`,
        '--dry-run',
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 0);
      assert.strictEqual(fs.existsSync(nonExistentTarget), false, 'INVARIANT VIOLATED: dry-run created target file!');
    });

    it('3.2: Existing target database retains identical mtime, byteSize, and SHA-256 after dry-run', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      // Create an existing distinct target database
      const existingTargetData = { uniqueKey: 'live-production-target-must-not-change', counter: 999 };
      createMockDatabase(targetDb, existingTargetData, new Date(Date.now() - 7200000));

      const beforeStat = fs.statSync(targetDb);
      const beforeHash = calculateHash(targetDb);
      const beforeContent = fs.readFileSync(targetDb, 'utf8');

      // Execute dry-run against the existing target
      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
        '--dry-run',
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 0);

      const afterStat = fs.statSync(targetDb);
      const afterHash = calculateHash(targetDb);
      const afterContent = fs.readFileSync(targetDb, 'utf8');

      assert.strictEqual(afterHash, beforeHash, 'INVARIANT VIOLATED: target hash changed during dry-run!');
      assert.strictEqual(afterStat.size, beforeStat.size, 'INVARIANT VIOLATED: target size changed during dry-run!');
      assert.strictEqual(afterStat.mtimeMs, beforeStat.mtimeMs, 'INVARIANT VIOLATED: target mtime changed during dry-run!');
      assert.strictEqual(afterContent, beforeContent, 'INVARIANT VIOLATED: target content altered during dry-run!');
    });

    it('3.3: Temporary staging files (.tmp-restore-*) are never created or left behind in target directory during dry-run', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      const targetDir = path.join(tmpDir, 'isolated-target-dir');
      fs.mkdirSync(targetDir, { recursive: true });
      const targetInDir = path.join(targetDir, 'destination.db');

      const filesBefore = fs.readdirSync(targetDir);

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetInDir}`,
        '--dry-run',
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 0);

      const filesAfter = fs.readdirSync(targetDir);
      assert.deepStrictEqual(filesAfter, filesBefore, 'No temp files or directories should be created during dry-run');
    });
  });

  // =========================================================================
  // CATEGORY 4: DISASTER RECOVERY & DATA PARITY
  // =========================================================================
  describe('4. Disaster Recovery & Data Parity', () => {
    it('4.1: Restores 100% of data and produces byte-for-byte exact copy of original database', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      // Target doesn't exist yet
      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 0);

      const sourceBuffer = fs.readFileSync(sourceDb);
      const targetBuffer = fs.readFileSync(targetDb);

      assert.strictEqual(sourceBuffer.compare(targetBuffer), 0, 'Restored database must be byte-for-byte identical to source');
      const restoredData = JSON.parse(targetBuffer.toString('utf8'));
      assert.deepStrictEqual(restoredData, sampleStudioData, 'Restored data structure must match original 100%');
    });

    it('4.2: Full restore overwrites a corrupted or damaged database atomically', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      // Create a heavily corrupted target database
      fs.writeFileSync(targetDb, 'CORRUPTED_GARBAGE_DATA_FROM_DISK_FAILURE_XYZ');

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 0);
      const restoredData = JSON.parse(fs.readFileSync(targetDb, 'utf8'));
      assert.deepStrictEqual(restoredData, sampleStudioData);
    });
  });

  // =========================================================================
  // CATEGORY 5: EMERGENCY SCENARIOS & FAIL-CLOSED TAMPER RESISTANCE
  // =========================================================================
  describe('5. Emergency Scenarios & Fail-Closed Tamper Resistance', () => {
    it('5.1: Bit-flipped / corrupted backup file fails dry-run with code 1 and leaves target untouched', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      // Establish target state
      createMockDatabase(targetDb, { safeData: 'intact' }, new Date(Date.now() - 3600000));
      const targetHashBefore = calculateHash(targetDb);
      const targetMtimeBefore = fs.statSync(targetDb).mtimeMs;

      // Corrupt the backup file by appending garbage bytes (tampering with content without updating metadata)
      fs.appendFileSync(backup.backupPath, 'TAMPERED_MALICIOUS_INJECTION');

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
        '--dry-run',
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 1, 'Corrupted backup must exit with status 1');
      assert.ok(restoreProc.stderr.includes('INTEGRITY_VIOLATION'), `Stderr must report INTEGRITY_VIOLATION: ${restoreProc.stderr}`);
      assert.ok(restoreProc.stderr.includes('Backup checksum mismatch'), 'Stderr must explain checksum mismatch');

      // Verify target untouched
      const targetHashAfter = calculateHash(targetDb);
      const targetMtimeAfter = fs.statSync(targetDb).mtimeMs;
      assert.strictEqual(targetHashAfter, targetHashBefore, 'Target database must remain untouched on corrupted dry-run');
      assert.strictEqual(targetMtimeAfter, targetMtimeBefore, 'Target mtime must remain untouched on corrupted dry-run');
    });

    it('5.2: Corrupted backup file in real restore fails with code 1 and leaves existing database unharmed', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      createMockDatabase(targetDb, { existingStudio: 'critical-live-records' });
      const targetHashBefore = calculateHash(targetDb);

      // Flip the first byte of the backup archive
      const buf = fs.readFileSync(backup.backupPath);
      buf[0] ^= 0xff;
      fs.writeFileSync(backup.backupPath, buf);

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 1, 'Corrupted real restore must exit with status 1');
      assert.ok(restoreProc.stderr.includes('INTEGRITY_VIOLATION'));

      // Invariant: Target database was NOT replaced
      const targetHashAfter = calculateHash(targetDb);
      assert.strictEqual(targetHashAfter, targetHashBefore, 'Existing database must not be overwritten by corrupted backup');
    });

    it('5.3: Missing companion metadata file (.meta.json) aborts restore with code 1', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      // Delete metadata companion
      fs.unlinkSync(backup.metaPath);

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 1);
      assert.ok(restoreProc.stderr.includes('FATAL: Metadata file missing for backup'));
    });

    it('5.4: Corrupted JSON inside .meta.json companion aborts restore with code 1', () => {
      const backupProc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });
      const backup = JSON.parse(backupProc.stdout.trim());

      // Corrupt metadata JSON syntax
      fs.writeFileSync(backup.metaPath, '{ invalid_json: broken syntax ... ');

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${backup.backupPath}`,
        `--target=${targetDb}`,
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 1);
      assert.ok(restoreProc.stderr.includes('Corrupted or unparseable metadata file'));
    });

    it('5.5: Nonexistent backup file aborts restore with code 1 without creating target', () => {
      const nonExistentBackup = path.join(tmpDir, 'ghost-backup.json');

      const restoreProc = spawnSync(process.execPath, [
        RESTORE_SCRIPT,
        `--backup=${nonExistentBackup}`,
        `--target=${targetDb}`,
      ], { encoding: 'utf8' });

      assert.strictEqual(restoreProc.status, 1);
      assert.ok(restoreProc.stderr.includes('FATAL: Backup file does not exist'));
      assert.strictEqual(fs.existsSync(targetDb), false);
    });

    it('5.6: Missing mandatory CLI parameters aborts restore with code 1', () => {
      const proc = spawnSync(process.execPath, [RESTORE_SCRIPT], { encoding: 'utf8' });

      assert.strictEqual(proc.status, 1);
      assert.ok(proc.stderr.includes('FATAL: Both --backup and --target parameters are required.'));
    });

    it('5.7: Missing source database during backup aborts with code 1', () => {
      const nonExistentSource = path.join(tmpDir, 'nonexistent-source.db');

      const proc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${nonExistentSource}`,
        `--output-dir=${backupDir}`,
      ], { encoding: 'utf8' });

      assert.strictEqual(proc.status, 1);
      assert.ok(proc.stderr.includes('FATAL: Source database does not exist'));
    });
  });
});
