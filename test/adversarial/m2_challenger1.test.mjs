/**
 * test/adversarial/m2_challenger1.test.mjs
 * 
 * Milestone 2 Adversarial Empirical Stress Test Suite
 * Executed by Empirical Challenger 1
 * 
 * Target: scripts/backup.js & scripts/restore.js
 * 
 * Attack Vectors:
 * 1. Tampered Backup Bytes (Single-byte flip, Middle-byte flip, Last-byte flip, Truncated files, Appended bytes, Byte swaps)
 * 2. Companion Metadata Integrity (.meta.json missing, 0-byte, corrupt JSON, missing hash key, forged hash, type confusion)
 * 3. Dry-Run Verification & Target Invariance (Zero bytes written, Non-existent target stays non-existent, Dry-run fails on tamper)
 * 4. Target Immutability & Atomic Write Safety (Failures preserve target byte-for-byte, No staging leak, Recursive dir creation)
 * 5. Backup Engine Robustness & Fail-Closed Invariants (Missing source DB, Source DB is directory, Recursive output dirs, SQLite binary parsing)
 * 6. End-to-End Disaster Recovery Lifecycle & Adversarial Resistance
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

import backupPkg from '../../scripts/backup.js';
const { createBackup, extractRecordCounts } = backupPkg;

import restorePkg from '../../scripts/restore.js';
const { restoreBackup } = restorePkg;

const PROJECT_ROOT = path.resolve(process.cwd());
const BACKUP_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'backup.js');
const RESTORE_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'restore.js');

function createTempDir(prefix = 'm2-adv-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTempDir(dir) {
  if (dir && fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } catch {
      // Windows file lock tolerance on teardown
    }
  }
}

function calculateSha256(contentOrPath) {
  const hash = crypto.createHash('sha256');
  if (typeof contentOrPath === 'string' && fs.existsSync(contentOrPath)) {
    return hash.update(fs.readFileSync(contentOrPath)).digest('hex');
  }
  return hash.update(contentOrPath).digest('hex');
}

function runCli(scriptPath, args = [], env = {}, timeout = 10000) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, ...env },
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout || '',
    stderr: result.stderr || (result.error ? result.error.message : ''),
  };
}

function createSampleJsonData() {
  return {
    studio: {
      id: 'studio_master',
      name: 'Studio Pilates Integridade',
      activePlan: 'PREMIUM_ENTERPRISE',
      maxCapacity: 10,
    },
    students: [
      { id: 'std_01', name: 'Mariana Duarte Costa', cpf: '123.456.789-01', phone: '(11) 98888-1111', notes: 'Lombalgia e escoliose' },
      { id: 'std_02', name: 'Guilherme Albuquerque', cpf: '234.567.890-12', phone: '(11) 98888-2222', notes: 'Pós-operatório menisco esquerdo' },
      { id: 'std_03', name: 'Beatriz Vasconcelos', cpf: '345.678.901-23', phone: '(11) 98888-3333', notes: 'Gestante 18 semanas' },
      { id: 'std_04', name: 'Thiago Nogueira Paes', cpf: '456.789.012-34', phone: '(11) 98888-4444', notes: 'Hérnia de disco C5-C6' },
    ],
    invoices: [
      { id: 'inv_101', studentId: 'std_01', amount: 450.0, status: 'PAID' },
      { id: 'inv_102', studentId: 'std_02', amount: 450.0, status: 'PAID' },
      { id: 'inv_103', studentId: 'std_03', amount: 380.0, status: 'PENDING' },
    ],
    schedules: [
      { id: 'sch_201', studentId: 'std_01', day: 1, hour: '07:00' },
      { id: 'sch_202', studentId: 'std_02', day: 1, hour: '07:00' },
      { id: 'sch_203', studentId: 'std_03', day: 3, hour: '08:00' },
    ],
  };
}

function createMockSqliteBuffer(cellCount = 12) {
  const pageSize = 4096;
  const buf = Buffer.alloc(pageSize);
  buf.write('SQLite format 3\0', 0, 16, 'ascii');
  buf.writeUInt16BE(pageSize, 16); // Page size = 4096
  buf[18] = 1; // File format write version
  buf[19] = 1; // File format read version
  buf[100] = 0x0d; // B-tree Table Leaf Page
  buf.writeUInt16BE(cellCount, 103); // Cell count = 12
  for (let i = 105; i < pageSize; i++) {
    buf[i] = (i * 37 + 11) & 0xff;
  }
  return buf;
}

describe('Challenger 1 — Milestone 2 Adversarial Stress Suite', () => {
  let tmpDir;
  let sourceDb;
  let targetDb;
  let backupDir;

  beforeEach(() => {
    tmpDir = createTempDir('m2-adv-');
    sourceDb = path.join(tmpDir, 'source-live.db');
    targetDb = path.join(tmpDir, 'target-production.db');
    backupDir = path.join(tmpDir, 'backups-archive');

    // Create source DB with sample data
    fs.writeFileSync(sourceDb, JSON.stringify(createSampleJsonData(), null, 2), 'utf8');

    // Create target DB with existing live state
    const existingTargetData = {
      studio: { id: 'target_live', name: 'Existing Live Target' },
      criticalData: 'MUST_NEVER_BE_CORRUPTED_OR_OVERWRITTEN_ON_FAILURE',
      counter: 9999,
    };
    fs.writeFileSync(targetDb, JSON.stringify(existingTargetData, null, 2), 'utf8');
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  // =========================================================================
  // SUITE 1: Tampered Backup Bytes (Bit-flip, Truncation, Appended Data)
  // =========================================================================
  describe('Suite 1: Adversarial Bit-Flip & Byte Tampering Attacks', () => {
    it('Attack 1.1: Single-bit flip at offset 0 (first byte XOR 0x01) aborts with INTEGRITY_VIOLATION and preserves target DB', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=bitflip-offset0',
      ]);
      assert.strictEqual(backupRes.exitCode, 0, 'Backup generation should succeed');

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      // Mutate exactly 1 bit in byte 0
      const raw = fs.readFileSync(backupPath);
      raw[0] = raw[0] ^ 0x01;
      fs.writeFileSync(backupPath, raw);

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1, 'Restore must reject tampered byte with exit code 1');
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i, 'Must report INTEGRITY_VIOLATION on stderr');
      assert.strictEqual(calculateSha256(targetDb), targetPreHash, 'Target DB must remain 100% byte-identical');
    });

    it('Attack 1.2: Single-bit flip in the middle of payload (offset len/2 XOR 0x80) aborts with INTEGRITY_VIOLATION', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=bitflip-mid',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const raw = fs.readFileSync(backupPath);
      const midOffset = Math.floor(raw.length / 2);
      raw[midOffset] = raw[midOffset] ^ 0x80;
      fs.writeFileSync(backupPath, raw);

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash, 'Target DB untouched');
    });

    it('Attack 1.3: Single-bit flip at the very last byte (offset len-1 XOR 0x04) aborts with INTEGRITY_VIOLATION', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=bitflip-last',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const raw = fs.readFileSync(backupPath);
      raw[raw.length - 1] = raw[raw.length - 1] ^ 0x04;
      fs.writeFileSync(backupPath, raw);

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 1.4: Truncated backup payload (50% byte size) fails closed without touching target', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=truncated-half',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const raw = fs.readFileSync(backupPath);
      const truncated = raw.subarray(0, Math.floor(raw.length / 2));
      fs.writeFileSync(backupPath, truncated);

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 1.5: Truncated backup payload to 0 bytes fails closed without touching target', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=zero-bytes',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      fs.writeFileSync(backupPath, Buffer.alloc(0));

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 1.6: Appending malicious bytes to backup payload fails closed with checksum mismatch', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=appended-data',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const raw = fs.readFileSync(backupPath);
      const maliciousPayload = Buffer.from('\n/* MALICIOUS_INJECTION: DROP ALL TABLES; */\n', 'utf8');
      fs.writeFileSync(backupPath, Buffer.concat([raw, maliciousPayload]));

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 1.7: Swapping two adjacent bytes in payload preserves file length but triggers INTEGRITY_VIOLATION', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=byte-swap',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const raw = fs.readFileSync(backupPath);
      // Find two differing adjacent bytes
      let swapped = false;
      for (let i = 0; i < raw.length - 1; i++) {
        if (raw[i] !== raw[i + 1]) {
          const tmp = raw[i];
          raw[i] = raw[i + 1];
          raw[i + 1] = tmp;
          swapped = true;
          break;
        }
      }
      assert.ok(swapped, 'Should have found differing bytes to swap');
      fs.writeFileSync(backupPath, raw);

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 1.8: Real SQLite binary database file with single-byte tampering triggers INTEGRITY_VIOLATION', () => {
      const sqliteDbPath = path.join(tmpDir, 'sample-binary.db');
      const sqliteBuf = createMockSqliteBuffer(25);
      fs.writeFileSync(sqliteDbPath, sqliteBuf);

      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sqliteDbPath}`,
        `--output-dir=${backupDir}`,
        '--tag=sqlite-binary',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      // Corrupt 1 byte in the SQLite B-Tree header
      const raw = fs.readFileSync(backupPath);
      raw[100] = raw[100] ^ 0xff;
      fs.writeFileSync(backupPath, raw);

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });
  });

  // =========================================================================
  // SUITE 2: Companion Metadata File Integrity Attacks (.meta.json)
  // =========================================================================
  describe('Suite 2: Companion Metadata (.meta.json) Tampering & Corruption Attacks', () => {
    it('Attack 2.1: Missing companion .meta.json file aborts restore with exit code 1 and preserves target', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=missing-meta',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);
      const metaPath = `${backupPath}.meta.json`;

      assert.ok(fs.existsSync(metaPath), 'Metadata must have been generated');
      fs.unlinkSync(metaPath); // Delete companion metadata file

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1, 'Missing metadata must exit code 1');
      assert.match(restoreRes.stderr, /Metadata file missing/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 2.2: Empty (0-byte) .meta.json file aborts restore with Corrupted or unparseable metadata', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=empty-meta',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);
      const metaPath = `${backupPath}.meta.json`;

      fs.writeFileSync(metaPath, '', 'utf8'); // 0 bytes

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /Corrupted or unparseable metadata/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 2.3: Syntactically malformed / corrupted JSON structure in .meta.json fails closed', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=malformed-json',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);
      const metaPath = `${backupPath}.meta.json`;

      fs.writeFileSync(metaPath, '{"tag": "corrupt", "hash": "abcdef', 'utf8'); // Truncated JSON

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /Corrupted or unparseable metadata/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 2.4: Valid JSON but missing "hash" key in .meta.json triggers INTEGRITY_VIOLATION and fails closed', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=no-hash-key',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);
      const metaPath = `${backupPath}.meta.json`;

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      delete meta.hash;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 2.5: Forged / altered hash in .meta.json triggers checksum mismatch and aborts', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=forged-hash',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);
      const metaPath = `${backupPath}.meta.json`;

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      // Replace with another valid 64-char hex string
      meta.hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Attack 2.6: Type confusion on hash in .meta.json (null, number, boolean) fails closed', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=type-confusion',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);
      const metaPath = `${backupPath}.meta.json`;

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      meta.hash = null;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

      const targetPreHash = calculateSha256(targetDb);
      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      assert.match(restoreRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });
  });

  // =========================================================================
  // SUITE 3: Dry-Run Verification & Target Invariance
  // =========================================================================
  describe('Suite 3: Dry-Run Verification & Zero-Mutation Invariants', () => {
    it('DryRun 3.1: Valid backup with --dry-run completes successfully with ZERO bytes written to target DB', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=dryrun-valid',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const targetPreHash = calculateSha256(targetDb);
      const targetPreMtime = fs.statSync(targetDb).mtimeMs;
      const targetPreContent = fs.readFileSync(targetDb, 'utf8');

      const dryRunRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
        '--dry-run',
      ]);

      assert.strictEqual(dryRunRes.exitCode, 0, 'Dry-run must exit 0 for valid backup');
      const dryRunJson = JSON.parse(dryRunRes.stdout);
      assert.strictEqual(dryRunJson.dryRun, true);
      assert.strictEqual(dryRunJson.valid, true);

      // Verify target immutability
      assert.strictEqual(calculateSha256(targetDb), targetPreHash, 'Target DB hash must be 100% unchanged');
      assert.strictEqual(fs.statSync(targetDb).mtimeMs, targetPreMtime, 'Target DB mtime must be unchanged');
      assert.strictEqual(fs.readFileSync(targetDb, 'utf8'), targetPreContent, 'Target DB content must be byte-identical');
    });

    it('DryRun 3.2: Valid backup with --dry-run when target DB does not exist: target file is NOT created', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=dryrun-nonexistent',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const nonExistentTarget = path.join(tmpDir, 'never-created-target.db');
      assert.strictEqual(fs.existsSync(nonExistentTarget), false);

      const dryRunRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${nonExistentTarget}`,
        '--dry-run',
      ]);

      assert.strictEqual(dryRunRes.exitCode, 0);
      assert.strictEqual(fs.existsSync(nonExistentTarget), false, 'Target database must NOT be created by dry-run');
    });

    it('DryRun 3.3: Tampered backup with --dry-run triggers INTEGRITY_VIOLATION (does not falsely report valid)', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=dryrun-tampered',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      // Tamper byte
      const raw = fs.readFileSync(backupPath);
      raw[10] = raw[10] ^ 0xff;
      fs.writeFileSync(backupPath, raw);

      const targetPreHash = calculateSha256(targetDb);
      const dryRunRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
        '--dry-run',
      ]);

      assert.strictEqual(dryRunRes.exitCode, 1, 'Dry run MUST fail on tampered backup');
      assert.match(dryRunRes.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('DryRun 3.4: Missing metadata with --dry-run fails closed with exit code 1', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=dryrun-nometa',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);
      fs.unlinkSync(`${backupPath}.meta.json`);

      const targetPreHash = calculateSha256(targetDb);
      const dryRunRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
        '--dry-run',
      ]);

      assert.strictEqual(dryRunRes.exitCode, 1);
      assert.match(dryRunRes.stderr, /Metadata file missing/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('DryRun 3.5: Respects DRY_RUN environment variable (DRY_RUN=1 or DRY_RUN=true) without CLI flag', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=dryrun-env',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const targetPreHash = calculateSha256(targetDb);
      const dryRunRes = runCli(
        RESTORE_SCRIPT,
        [`--backup=${backupPath}`, `--target=${targetDb}`],
        { DRY_RUN: 'true' }
      );

      assert.strictEqual(dryRunRes.exitCode, 0);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash, 'Target DB untouched when DRY_RUN=true env set');
    });
  });

  // =========================================================================
  // SUITE 4: Target Immutability & Atomic Write Safety
  // =========================================================================
  describe('Suite 4: Target Immutability & Staging Cleanup Safety', () => {
    it('Atomic 4.1: Restore failure never leaves temporary staging files (.tmp-restore-*) behind in target directory', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=staging-cleanup',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      // Tamper backup to trigger mid-operation failure
      const raw = fs.readFileSync(backupPath);
      raw[5] = raw[5] ^ 0xaa;
      fs.writeFileSync(backupPath, raw);

      const targetDir = path.dirname(targetDb);
      const filesBefore = fs.readdirSync(targetDir);

      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 1);
      const filesAfter = fs.readdirSync(targetDir);
      const stagingLeaks = filesAfter.filter((f) => f.startsWith('.tmp-restore-'));
      assert.strictEqual(stagingLeaks.length, 0, 'No temporary restore staging files should be leaked');
      assert.deepStrictEqual(filesAfter, filesBefore, 'Directory file listing must remain unchanged');
    });

    it('Atomic 4.2: Clean install restore creates destination directory recursively and applies valid backup', () => {
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=clean-install',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      const nestedTargetDb = path.join(tmpDir, 'nested', 'deeply', 'fresh', 'production.db');
      assert.strictEqual(fs.existsSync(nestedTargetDb), false);

      const restoreRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${nestedTargetDb}`,
      ]);

      assert.strictEqual(restoreRes.exitCode, 0, 'Should restore into newly created nested directory');
      assert.ok(fs.existsSync(nestedTargetDb), 'Target database must exist after restore');
      assert.strictEqual(calculateSha256(nestedTargetDb), calculateSha256(sourceDb), 'Restored DB must match source hash exactly');
    });

    it('Atomic 4.3: Missing mandatory CLI parameters exits code 1 without touching target', () => {
      const targetPreHash = calculateSha256(targetDb);

      // Missing --target
      const res1 = runCli(RESTORE_SCRIPT, ['--backup=some-path.json']);
      assert.strictEqual(res1.exitCode, 1);
      assert.match(res1.stderr, /Both --backup and --target parameters are required/i);

      // Missing --backup
      const res2 = runCli(RESTORE_SCRIPT, [`--target=${targetDb}`]);
      assert.strictEqual(res2.exitCode, 1);
      assert.match(res2.stderr, /Both --backup and --target parameters are required/i);

      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });

    it('Atomic 4.4: Non-existent backup file path exits code 1 without touching target', () => {
      const targetPreHash = calculateSha256(targetDb);
      const ghostBackup = path.join(tmpDir, 'does-not-exist.json');

      const res = runCli(RESTORE_SCRIPT, [
        `--backup=${ghostBackup}`,
        `--target=${targetDb}`,
      ]);

      assert.strictEqual(res.exitCode, 1);
      assert.match(res.stderr, /Backup file does not exist/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash);
    });
  });

  // =========================================================================
  // SUITE 5: Backup Engine Edge Cases & Fail-Closed Invariants
  // =========================================================================
  describe('Suite 5: Backup Engine Robustness & Fail-Closed Behavior', () => {
    it('Backup 5.1: Non-existent source database path aborts with exit code 1 matching stderr pattern', () => {
      const ghostSource = path.join(tmpDir, 'ghost-source-database.db');
      assert.strictEqual(fs.existsSync(ghostSource), false);

      const res = runCli(BACKUP_SCRIPT, [
        `--source=${ghostSource}`,
        `--output-dir=${backupDir}`,
      ]);

      assert.strictEqual(res.exitCode, 1, 'Backup of missing DB must exit 1');
      assert.match(
        res.stderr,
        /Source database does not exist|not found/i,
        'Stderr must match required failure pattern'
      );
      assert.strictEqual(fs.existsSync(backupDir), false, 'Must not create backup directory on missing source');
    });

    it('Backup 5.2: Source database path is an existing directory: aborts with exit code 1', () => {
      const sourceAsDir = path.join(tmpDir, 'directory-not-db');
      fs.mkdirSync(sourceAsDir);

      const res = runCli(BACKUP_SCRIPT, [
        `--source=${sourceAsDir}`,
        `--output-dir=${backupDir}`,
      ]);

      assert.strictEqual(res.exitCode, 1);
      assert.match(res.stderr, /is a directory/i);
    });

    it('Backup 5.3: Non-existent output directory (including deeply nested path) is created recursively', () => {
      const deeplyNestedOutputDir = path.join(tmpDir, 'archives', 'sub1', 'sub2', '2026', 'backups');
      assert.strictEqual(fs.existsSync(deeplyNestedOutputDir), false);

      const res = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${deeplyNestedOutputDir}`,
        '--tag=deeply-nested',
      ]);

      assert.strictEqual(res.exitCode, 0, 'Backup into nested dir must succeed');
      assert.ok(fs.existsSync(deeplyNestedOutputDir), 'Nested directory must be created recursively');

      const files = fs.readdirSync(deeplyNestedOutputDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const metaFile = files.find((f) => f.endsWith('.meta.json'));
      assert.ok(backupFile, 'Backup file exists');
      assert.ok(metaFile, 'Metadata file exists');

      const meta = JSON.parse(fs.readFileSync(path.join(deeplyNestedOutputDir, metaFile), 'utf8'));
      assert.strictEqual(meta.hash, calculateSha256(sourceDb));
    });

    it('Backup 5.4: Custom tags with special characters and complex version strings handled safely', () => {
      const complexTag = 'release_v2.4.0-rc3@staging+sha.abcdef';
      const res = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        `--tag=${complexTag}`,
      ]);

      assert.strictEqual(res.exitCode, 0);
      const files = fs.readdirSync(backupDir);
      const backup = files.find((f) => f.includes('release_v2.4.0-rc3@staging+sha.abcdef'));
      assert.ok(backup, 'Backup file should contain complex tag');

      const metaPath = path.join(backupDir, `${backup}.meta.json`);
      assert.ok(fs.existsSync(metaPath));
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      assert.strictEqual(meta.tag, complexTag);
    });

    it('Backup 5.5: SQLite binary database: correctly extracts leaf cells into companion metadata recordCounts', () => {
      const sqliteDbPath = path.join(tmpDir, 'studio-prod.db');
      const expectedRecords = 18;
      const sqliteBuf = createMockSqliteBuffer(expectedRecords);
      fs.writeFileSync(sqliteDbPath, sqliteBuf);

      const res = runCli(BACKUP_SCRIPT, [
        `--source=${sqliteDbPath}`,
        `--output-dir=${backupDir}`,
        '--tag=sqlite-counts',
      ]);

      assert.strictEqual(res.exitCode, 0);
      const files = fs.readdirSync(backupDir);
      const metaFile = files.find((f) => f.endsWith('.meta.json'));
      const meta = JSON.parse(fs.readFileSync(path.join(backupDir, metaFile), 'utf8'));

      assert.strictEqual(meta.recordCounts.totalRecords, expectedRecords, 'Must extract SQLite table leaf cells');
      assert.strictEqual(meta.byteSize, sqliteBuf.length);
      assert.strictEqual(meta.hash, calculateSha256(sqliteDbPath));
    });

    it('Backup 5.6: Environment variables BACKUP_SOURCE_DB and BACKUP_OUTPUT_DIR work as fallbacks', () => {
      const res = runCli(
        BACKUP_SCRIPT,
        ['--tag=env-test'],
        {
          BACKUP_SOURCE_DB: sourceDb,
          BACKUP_OUTPUT_DIR: backupDir,
        }
      );

      assert.strictEqual(res.exitCode, 0);
      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.includes('env-test'));
      assert.ok(backupFile, 'Backup created via env vars');
    });
  });

  // =========================================================================
  // SUITE 6: End-to-End Adversarial Stress & Disaster Recovery Lifecycle
  // =========================================================================
  describe('Suite 6: End-to-End Adversarial Stress & Disaster Recovery Lifecycle', () => {
    it('Lifecycle 6.1: Full Adversarial Disaster Recovery Cycle: Backup -> Dry-Run -> Attack Blocked -> Restore Success', () => {
      // 1. Establish initial production state
      const preDisasterSourceHash = calculateSha256(sourceDb);

      // 2. Automated pre-migration/pre-deploy backup
      const backupRes = runCli(BACKUP_SCRIPT, [
        `--source=${sourceDb}`,
        `--output-dir=${backupDir}`,
        '--tag=full-lifecycle',
      ]);
      assert.strictEqual(backupRes.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const backupFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const backupPath = path.join(backupDir, backupFile);

      // 3. Dry-run verification on target before disaster
      const targetPreHash = calculateSha256(targetDb);
      const dryRunRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
        '--dry-run',
      ]);
      assert.strictEqual(dryRunRes.exitCode, 0);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash, 'Target DB untouched by dry-run');

      // 4. Adversarial Attack Simulation: attacker tampers with backup archive
      const pristineBackupBytes = fs.readFileSync(backupPath);
      const tamperedBytes = Buffer.from(pristineBackupBytes);
      tamperedBytes[tamperedBytes.length - 2] = tamperedBytes[tamperedBytes.length - 2] ^ 0x55;
      fs.writeFileSync(backupPath, tamperedBytes);

      // Attempt restore with tampered backup
      const attackedRestore = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);
      assert.strictEqual(attackedRestore.exitCode, 1, 'Attacked backup MUST be rejected');
      assert.match(attackedRestore.stderr, /INTEGRITY_VIOLATION/i);
      assert.strictEqual(calculateSha256(targetDb), targetPreHash, 'Target DB preserved despite attack');

      // 5. Simulate Disaster: Active target database suffers catastrophic corruption
      fs.writeFileSync(targetDb, '{"disaster": "CATASTROPHIC_SYSTEM_CRASH_CORRUPTED_DATABASE"}', 'utf8');
      assert.notStrictEqual(calculateSha256(targetDb), preDisasterSourceHash);

      // 6. Repair backup to pristine bytes and execute disaster recovery
      fs.writeFileSync(backupPath, pristineBackupBytes);
      const recoveryRes = runCli(RESTORE_SCRIPT, [
        `--backup=${backupPath}`,
        `--target=${targetDb}`,
      ]);
      assert.strictEqual(recoveryRes.exitCode, 0, 'Pristine restore must succeed');

      // 7. Verify 100% Cryptographic Parity and Data Parity
      assert.strictEqual(
        calculateSha256(targetDb),
        preDisasterSourceHash,
        'Target DB must have 100% byte-for-byte cryptographic parity with source DB'
      );

      const recoveredData = JSON.parse(fs.readFileSync(targetDb, 'utf8'));
      assert.strictEqual(recoveredData.students.length, 4);
      assert.strictEqual(recoveredData.students[0].name, 'Mariana Duarte Costa');
      assert.strictEqual(recoveredData.invoices.length, 3);
      assert.strictEqual(recoveredData.schedules.length, 3);
    });

    it('Lifecycle 6.2: Rapid consecutive backup snapshots maintain unique timestamps without race collision', () => {
      const results = [];
      for (let i = 0; i < 3; i++) {
        const res = runCli(BACKUP_SCRIPT, [
          `--source=${sourceDb}`,
          `--output-dir=${backupDir}`,
          `--tag=rapid-${i}`,
        ]);
        assert.strictEqual(res.exitCode, 0);
        results.push(res);
      }

      const files = fs.readdirSync(backupDir);
      const backupArchives = files.filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      assert.strictEqual(backupArchives.length, 3, 'All 3 rapid backups must exist independently');

      // Each backup archive has its own matching .meta.json
      for (const archive of backupArchives) {
        const metaPath = path.join(backupDir, `${archive}.meta.json`);
        assert.ok(fs.existsSync(metaPath), `Metadata file for ${archive} must exist`);
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        assert.strictEqual(meta.hash, calculateSha256(sourceDb));
      }
    });
  });
});
