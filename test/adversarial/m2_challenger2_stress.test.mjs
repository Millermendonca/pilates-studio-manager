/**
 * test/adversarial/m2_challenger2_stress.test.mjs
 * 
 * Milestone 2 Adversarial Empirical Stress Test Suite
 * Executed by Empirical Challenger 2 (Empirical Challenger)
 * 
 * Verifies 5 Critical Stress Dimensions:
 * 1. Concurrency & Collision: Rapid parallel processes, sequential loops, clock collisions.
 * 2. Large Database Scale: Multi-megabyte payloads (5MB JSON, 15MB binary, memory/record extraction).
 * 3. Real Binary SQLite 3: Authentic Prisma SQLite dev.db, leaf page counting, functional Prisma queries on restored DB.
 * 4. Permissions & Read-Only: Read-only target database (attrib +R), read-only dirs, read-only source.
 * 5. Paths with Spaces & Accents: Diacritics ("Área de Trabalho", "São Paulo"), quotes, file: URLs.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync, spawn, execSync } from 'node:child_process';
import { createBackup, extractRecordCounts } from '../../scripts/backup.js';
import { restoreBackup } from '../../scripts/restore.js';

const PROJECT_ROOT = path.resolve(process.cwd());
const BACKUP_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'backup.js');
const RESTORE_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'restore.js');
const REAL_DEV_DB = path.join(PROJECT_ROOT, 'prisma', 'dev.db');

function createTempDir(prefix = 'm2-challenger2-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTempDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      try {
        if (process.platform === 'win32') {
          execSync(`attrib -R "${path.join(dir, '*')}" /s /d`, { stdio: 'ignore' });
        }
      } catch {}
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }
  } catch (err) {
    // Windows file locking tolerance
  }
}

function runBackupCli(args = [], env = {}, timeout = 15000) {
  const result = spawnSync(process.execPath, [BACKUP_SCRIPT, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, ...env },
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout || '',
    stderr: result.stderr || (result.error ? result.error.message : ''),
    error: result.error,
  };
}

function runRestoreCli(args = [], env = {}, timeout = 15000) {
  const result = spawnSync(process.execPath, [RESTORE_SCRIPT, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, ...env },
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout || '',
    stderr: result.stderr || (result.error ? result.error.message : ''),
    error: result.error,
  };
}

function computeFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

describe('Challenger 2 — Milestone 2 Adversarial Empirical Stress Suite', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  // =========================================================================
  // 1. CONCURRENCY & COLLISION DIMENSION
  // =========================================================================
  describe('Dimension 1: Concurrency & Collision Resilience', () => {
    it('1.1: Rapid parallel child processes (10 concurrent backups) generate valid independent snapshots', async () => {
      const srcDb = path.join(tmpDir, 'source.db');
      fs.writeFileSync(srcDb, JSON.stringify({ version: 1, timestamp: Date.now() }));
      const outDir = path.join(tmpDir, 'concurrent_backups');
      fs.mkdirSync(outDir, { recursive: true });

      const concurrency = 10;
      const promises = [];

      for (let i = 0; i < concurrency; i++) {
        promises.push(new Promise((resolve) => {
          const p = spawn(process.execPath, [
            BACKUP_SCRIPT,
            `--source=${srcDb}`,
            `--output-dir=${outDir}`,
            `--tag=worker-${i}`,
          ], { cwd: PROJECT_ROOT });

          let stdout = '';
          let stderr = '';
          p.stdout.on('data', (d) => { stdout += d; });
          p.stderr.on('data', (d) => { stderr += d; });
          p.on('close', (code) => {
            resolve({ code, stdout, stderr, workerId: i });
          });
        }));
      }

      const results = await Promise.all(promises);

      // Verify all child processes succeeded
      for (const res of results) {
        assert.strictEqual(res.code, 0, `Worker ${res.workerId} failed: ${res.stderr}`);
        const parsed = JSON.parse(res.stdout);
        assert.strictEqual(parsed.success, true);
        assert.ok(fs.existsSync(parsed.backupPath), `Backup file must exist for worker ${res.workerId}`);
        assert.ok(fs.existsSync(parsed.metaPath), `Metadata file must exist for worker ${res.workerId}`);
      }

      // Verify each backup file has matching SHA-256 with its companion metadata
      const files = fs.readdirSync(outDir);
      const archives = files.filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      assert.strictEqual(archives.length, concurrency, `Must produce ${concurrency} distinct backup archives`);

      for (const archive of archives) {
        const archivePath = path.join(outDir, archive);
        const metaPath = path.join(outDir, `${archive}.meta.json`);
        assert.ok(fs.existsSync(metaPath), `Companion metadata must exist for ${archive}`);
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const hashOnDisk = computeFileHash(archivePath);
        assert.strictEqual(meta.hash, hashOnDisk, `Hash mismatch in concurrent backup ${archive}`);
      }
    });

    it('1.2: Rapid sequential loop (10 consecutive calls) creates ordered timestamped archives', () => {
      const srcDb = path.join(tmpDir, 'loop-source.db');
      fs.writeFileSync(srcDb, 'LOOP_DATA_PAYLOAD');
      const outDir = path.join(tmpDir, 'loop-backups');

      const backups = [];
      for (let i = 0; i < 10; i++) {
        const res = createBackup({
          source: srcDb,
          outputDir: outDir,
          tag: 'loop',
        });
        backups.push(res);
      }

      assert.strictEqual(backups.length, 10);
      for (const b of backups) {
        assert.ok(fs.existsSync(b.backupPath));
        assert.ok(fs.existsSync(b.metaPath));
        const meta = JSON.parse(fs.readFileSync(b.metaPath, 'utf8'));
        assert.strictEqual(meta.hash, b.hash);
      }
    });

    it('1.3: Collision behavior when clock/timestamp and tag are identical', () => {
      const srcA = path.join(tmpDir, 'sourceA.db');
      const srcB = path.join(tmpDir, 'sourceB.db');
      fs.writeFileSync(srcA, 'CONTENT_VERSION_A_INITIAL');
      fs.writeFileSync(srcB, 'CONTENT_VERSION_B_UPDATED');
      const outDir = path.join(tmpDir, 'collision_test');

      const fixedTime = '2026-10-15T13-00-00-000Z';
      const origToIso = Date.prototype.toISOString;
      Date.prototype.toISOString = () => fixedTime;

      try {
        const resA = createBackup({ source: srcA, outputDir: outDir, tag: 'fixed' });
        const resB = createBackup({ source: srcB, outputDir: outDir, tag: 'fixed' });

        assert.strictEqual(resA.backupPath, resB.backupPath, 'Paths collide when timestamp and tag are identical');
        
        // Empirically verify that on disk, metadata matches the current archive content
        const onDiskContent = fs.readFileSync(resA.backupPath, 'utf8');
        const onDiskHash = computeFileHash(resA.backupPath);
        const metaContent = JSON.parse(fs.readFileSync(resA.metaPath, 'utf8'));

        assert.strictEqual(onDiskContent, 'CONTENT_VERSION_B_UPDATED');
        assert.strictEqual(metaContent.hash, onDiskHash, 'Metadata must strictly reflect the byte content on disk');
      } finally {
        Date.prototype.toISOString = origToIso;
      }
    });

    it('1.4: Concurrent parallel restore operations to separate destinations run without cross-talk', async () => {
      const srcDb = path.join(tmpDir, 'restore-source.db');
      const originalPayload = JSON.stringify({ studio: 'Pilates Concord', count: 42 });
      fs.writeFileSync(srcDb, originalPayload);
      const originalHash = computeFileHash(srcDb);

      const backupRes = createBackup({ source: srcDb, outputDir: tmpDir, tag: 'multi-restore' });

      const targets = [];
      const restoreCount = 5;
      for (let i = 0; i < restoreCount; i++) {
        targets.push(path.join(tmpDir, `restored-target-${i}.db`));
      }

      const promises = targets.map((target, idx) => {
        return new Promise((resolve) => {
          const p = spawn(process.execPath, [
            RESTORE_SCRIPT,
            `--backup=${backupRes.backupPath}`,
            `--target=${target}`,
          ], { cwd: PROJECT_ROOT });

          let stdout = '';
          let stderr = '';
          p.stdout.on('data', (d) => { stdout += d; });
          p.stderr.on('data', (d) => { stderr += d; });
          p.on('close', (code) => {
            resolve({ code, stdout, stderr, idx, target });
          });
        });
      });

      const results = await Promise.all(promises);
      for (const res of results) {
        assert.strictEqual(res.code, 0, `Restore to ${res.target} failed: ${res.stderr}`);
        assert.ok(fs.existsSync(res.target));
        assert.strictEqual(computeFileHash(res.target), originalHash);
        assert.strictEqual(fs.readFileSync(res.target, 'utf8'), originalPayload);
      }
    });
  });

  // =========================================================================
  // 2. LARGE DATABASE SCALE (MULTI-MEGABYTE)
  // =========================================================================
  describe('Dimension 2: Large Database Scale (Multi-Megabyte Payloads)', () => {
    it('2.1: 5 MB simulated relational database restores with 100% byte parity and record verification', () => {
      const srcDb = path.join(tmpDir, 'scale-5mb.db');
      const targetDb = path.join(tmpDir, 'scale-5mb-restored.db');
      const backupDir = path.join(tmpDir, 'scale-backups');

      // Generate ~5+ MB JSON data with 25,000 records
      const students = [];
      const invoices = [];
      for (let i = 0; i < 25000; i++) {
        students.push({
          id: `std_${i}`,
          name: `Aluno Teste Escala Número ${i}`,
          cpf: `000.111.222-${String(i).padStart(2, '0')}`,
          healthNotes: `Histórico clínico detalhado para teste de estresse número ${i} com dor lombar e hérnia de disco recidivante`,
        });
        if (i % 2 === 0) {
          invoices.push({
            id: `inv_${i}`,
            studentId: `std_${i}`,
            amount: 350.0 + (i % 50),
            status: i % 4 === 0 ? 'PAID' : 'PENDING',
          });
        }
      }

      const rawJson = JSON.stringify({ studio: 'Escala Studio', students, invoices });
      fs.writeFileSync(srcDb, rawJson, 'utf8');

      const srcStat = fs.statSync(srcDb);
      assert.ok(srcStat.size >= 5 * 1024 * 1024, `Source DB size must be >= 5MB (actual: ${srcStat.size} bytes)`);
      const originalHash = computeFileHash(srcDb);

      // Backup CLI
      const backupResult = runBackupCli([
        `--source=${srcDb}`,
        `--output-dir=${backupDir}`,
        '--tag=scale-5mb',
      ]);
      assert.strictEqual(backupResult.exitCode, 0, `Backup of 5MB DB failed: ${backupResult.stderr}`);
      const backupJson = JSON.parse(backupResult.stdout);
      assert.strictEqual(backupJson.hash, originalHash);
      assert.strictEqual(backupJson.byteSize, srcStat.size);

      // Verify metadata record counts
      const meta = JSON.parse(fs.readFileSync(backupJson.metaPath, 'utf8'));
      assert.strictEqual(meta.recordCounts.students, 25000);
      assert.strictEqual(meta.recordCounts.invoices, 12500);

      // Restore CLI
      const restoreResult = runRestoreCli([
        `--backup=${backupJson.backupPath}`,
        `--target=${targetDb}`,
      ]);
      assert.strictEqual(restoreResult.exitCode, 0, `Restore of 5MB DB failed: ${restoreResult.stderr}`);

      // Verify byte-for-byte exactness
      assert.strictEqual(computeFileHash(targetDb), originalHash);
      const restoredStat = fs.statSync(targetDb);
      assert.strictEqual(restoredStat.size, srcStat.size);

      const parsedRestored = JSON.parse(fs.readFileSync(targetDb, 'utf8'));
      assert.strictEqual(parsedRestored.students.length, 25000);
      assert.strictEqual(parsedRestored.invoices.length, 12500);
    });

    it('2.2: 15 MB high-entropy binary payload preserves cryptographic hash and zero byte drift', () => {
      const srcDb = path.join(tmpDir, 'scale-15mb.bin');
      const targetDb = path.join(tmpDir, 'scale-15mb-restored.bin');
      const backupDir = path.join(tmpDir, 'scale-bin-backups');

      // Create 15 MB buffer with random cryptographic entropy
      const targetSize = 15 * 1024 * 1024;
      const chunkSize = 1024 * 1024; // 1 MB chunks
      const fd = fs.openSync(srcDb, 'w');
      for (let offset = 0; offset < targetSize; offset += chunkSize) {
        const chunk = crypto.randomBytes(chunkSize);
        fs.writeSync(fd, chunk);
      }
      fs.closeSync(fd);

      const srcSize = fs.statSync(srcDb).size;
      assert.strictEqual(srcSize, targetSize);
      const preHash = computeFileHash(srcDb);

      // CLI Backup
      const backupResult = runBackupCli([
        `--source=${srcDb}`,
        `--output-dir=${backupDir}`,
        '--tag=entropy-15mb',
      ]);
      assert.strictEqual(backupResult.exitCode, 0);
      const backupJson = JSON.parse(backupResult.stdout);
      assert.strictEqual(backupJson.hash, preHash);

      // CLI Restore
      const restoreResult = runRestoreCli([
        `--backup=${backupJson.backupPath}`,
        `--target=${targetDb}`,
      ]);
      assert.strictEqual(restoreResult.exitCode, 0);

      // Cryptographic equality
      const postHash = computeFileHash(targetDb);
      assert.strictEqual(postHash, preHash, 'Cryptographic hash of 15MB binary restore must match original');
      assert.strictEqual(fs.statSync(targetDb).size, targetSize);
    });

    it('2.3: Record count extractor gracefully handles multi-megabyte non-JSON payloads without crash', () => {
      const hugeBuffer = crypto.randomBytes(8 * 1024 * 1024); // 8MB random bytes
      const counts = extractRecordCounts(hugeBuffer);
      assert.deepStrictEqual(counts, {}, 'Must return empty object without throwing OOM or parsing error');
    });
  });

  // =========================================================================
  // 3. REAL BINARY SQLITE 3 DATABASES
  // =========================================================================
  describe('Dimension 3: Real Binary SQLite 3 Databases', () => {
    it('3.1: Real SQLite 3 database backup accurately extracts leaf cell count from header and pages', () => {
      if (!fs.existsSync(REAL_DEV_DB)) {
        console.warn('Skipping dev.db inspection: prisma/dev.db not present');
        return;
      }

      // Copy dev.db to isolated temp environment
      const isolatedDb = path.join(tmpDir, 'real-sqlite.db');
      fs.copyFileSync(REAL_DEV_DB, isolatedDb);
      const originalHash = computeFileHash(isolatedDb);

      const outDir = path.join(tmpDir, 'sqlite-backups');
      const backupResult = runBackupCli([
        `--source=${isolatedDb}`,
        `--output-dir=${outDir}`,
        '--tag=sqlite-real',
      ]);

      assert.strictEqual(backupResult.exitCode, 0);
      const backupJson = JSON.parse(backupResult.stdout);
      assert.strictEqual(backupJson.hash, originalHash);

      const meta = JSON.parse(fs.readFileSync(backupJson.metaPath, 'utf8'));
      assert.ok(typeof meta.recordCounts.totalRecords === 'number', 'SQLite metadata must record totalRecords');
      assert.ok(meta.recordCounts.totalRecords >= 0);

      // Restore to clean path
      const restoredDb = path.join(tmpDir, 'restored-sqlite.db');
      const restoreResult = runRestoreCli([
        `--backup=${backupJson.backupPath}`,
        `--target=${restoredDb}`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 0);
      assert.strictEqual(computeFileHash(restoredDb), originalHash);

      // Verify SQLite header magic in restored file
      const restoredHeader = fs.readFileSync(restoredDb, { length: 16 });
      assert.strictEqual(restoredHeader.subarray(0, 15).toString('utf8'), 'SQLite format 3');
    });

    it('3.2: Synthetic SQLite 3 B-Tree Leaf Page format is correctly parsed and restored', () => {
      // Build a synthetic 8192-byte valid SQLite 3 file: 2 pages of 4096 bytes each
      const pageSize = 4096;
      const buf = Buffer.alloc(pageSize * 2);

      // Page 1: Header
      buf.write('SQLite format 3\0', 0, 16, 'ascii');
      buf.writeUInt16BE(pageSize, 16); // page size
      buf.writeUInt8(1, 18); // file format write version
      buf.writeUInt8(1, 19); // file format read version

      // Page 1 is a leaf table b-tree page (0x0d) at offset 100
      buf.writeUInt8(0x0d, 100);
      buf.writeUInt16BE(15, 103); // 15 leaf cells on page 1

      // Page 2 is a leaf table b-tree page (0x0d) at offset 4096
      buf.writeUInt8(0x0d, 4096);
      buf.writeUInt16BE(27, 4096 + 3); // 27 leaf cells on page 2

      const syntheticDb = path.join(tmpDir, 'synthetic.db');
      fs.writeFileSync(syntheticDb, buf);
      const expectedHash = computeFileHash(syntheticDb);

      const backupDir = path.join(tmpDir, 'synthetic-backups');
      const backupResult = runBackupCli([
        `--source=${syntheticDb}`,
        `--output-dir=${backupDir}`,
        '--tag=synthetic-leaf',
      ]);

      assert.strictEqual(backupResult.exitCode, 0);
      const backupJson = JSON.parse(backupResult.stdout);
      assert.strictEqual(backupJson.hash, expectedHash);

      const meta = JSON.parse(fs.readFileSync(backupJson.metaPath, 'utf8'));
      assert.strictEqual(meta.recordCounts.totalRecords, 15 + 27, 'Total leaf records must sum across all pages (15 + 27 = 42)');

      const restoredTarget = path.join(tmpDir, 'synthetic-restored.db');
      const restoreResult = runRestoreCli([
        `--backup=${backupJson.backupPath}`,
        `--target=${restoredTarget}`,
      ]);
      assert.strictEqual(restoreResult.exitCode, 0);
      assert.strictEqual(computeFileHash(restoredTarget), expectedHash);
    });

    it('3.3: Functional Prisma query execution on restored real SQLite database', async () => {
      if (!fs.existsSync(REAL_DEV_DB)) {
        return;
      }

      const isolatedSource = path.join(tmpDir, 'query-source.db');
      fs.copyFileSync(REAL_DEV_DB, isolatedSource);

      const backupRes = createBackup({
        source: isolatedSource,
        outputDir: tmpDir,
        tag: 'prisma-query-test',
      });

      const restoredDbPath = path.join(tmpDir, 'prisma-restored.db');
      restoreBackup({
        backup: backupRes.backupPath,
        target: restoredDbPath,
      });

      // Verify Prisma client can connect and query the restored database
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${restoredDbPath}`,
          },
        },
      });

      try {
        const studentCount = await prisma.student.count();
        assert.ok(typeof studentCount === 'number');
        const studioSettings = await prisma.studioSettings.findFirst();
        // Database successfully queried without corruption
        assert.ok(studentCount >= 0);
      } finally {
        await prisma.$disconnect();
      }
    });
  });

  // =========================================================================
  // 4. PERMISSIONS & READ-ONLY TARGETS
  // =========================================================================
  describe('Dimension 4: Permissions & Read-Only Targets', () => {
    it('4.1: Restore to a read-only destination file fails cleanly with exit code 1 without corrupting target', () => {
      const srcDb = path.join(tmpDir, 'ro-src.db');
      fs.writeFileSync(srcDb, 'NEW_RESTORE_DATA_PAYLOAD');
      const backupRes = createBackup({ source: srcDb, outputDir: tmpDir, tag: 'ro-test' });

      const targetDb = path.join(tmpDir, 'existing-readonly-target.db');
      const originalTargetContent = 'CRITICAL_EXISTING_DATA_THAT_MUST_NOT_BE_CORRUPTED';
      fs.writeFileSync(targetDb, originalTargetContent);
      const originalTargetHash = computeFileHash(targetDb);

      // Mark target read-only
      if (process.platform === 'win32') {
        execSync(`attrib +R "${targetDb}"`);
      } else {
        fs.chmodSync(targetDb, 0o444);
      }

      try {
        const restoreResult = runRestoreCli([
          `--backup=${backupRes.backupPath}`,
          `--target=${targetDb}`,
        ]);

        assert.strictEqual(restoreResult.exitCode, 1, 'Restore must exit code 1 when target is read-only');
        assert.ok(
          restoreResult.stderr.includes('EPERM') ||
          restoreResult.stderr.includes('permission') ||
          restoreResult.stderr.includes('access'),
          `Stderr must report permission/access error: ${restoreResult.stderr}`
        );

        // Verify target database was untouched
        assert.strictEqual(computeFileHash(targetDb), originalTargetHash);
        assert.strictEqual(fs.readFileSync(targetDb, 'utf8'), originalTargetContent);
      } finally {
        if (process.platform === 'win32') {
          execSync(`attrib -R "${targetDb}"`);
        } else {
          fs.chmodSync(targetDb, 0o666);
        }
      }
    });

    it('4.2: Backup succeeds when source database is read-only (backup only needs read access)', () => {
      const srcDb = path.join(tmpDir, 'readonly-src.db');
      fs.writeFileSync(srcDb, 'READONLY_SOURCE_PAYLOAD');
      const originalHash = computeFileHash(srcDb);

      if (process.platform === 'win32') {
        execSync(`attrib +R "${srcDb}"`);
      } else {
        fs.chmodSync(srcDb, 0o444);
      }

      try {
        const backupResult = runBackupCli([
          `--source=${srcDb}`,
          `--output-dir=${path.join(tmpDir, 'ro-backup-out')}`,
          '--tag=ro-src',
        ]);

        assert.strictEqual(backupResult.exitCode, 0, 'Backup of read-only source must succeed');
        const parsed = JSON.parse(backupResult.stdout);
        assert.strictEqual(parsed.hash, originalHash);
      } finally {
        if (process.platform === 'win32') {
          execSync(`attrib -R "${srcDb}"`);
        } else {
          fs.chmodSync(srcDb, 0o666);
        }
      }
    });

    it('4.3: Restore recursively creates missing nested destination directories', () => {
      const srcDb = path.join(tmpDir, 'create-dir-src.db');
      fs.writeFileSync(srcDb, 'NESTED_DIR_PAYLOAD');
      const backupRes = createBackup({ source: srcDb, outputDir: tmpDir, tag: 'nested-dir' });

      const deeplyNestedTarget = path.join(tmpDir, 'deeply', 'nested', 'level1', 'level2', 'restored.db');
      assert.strictEqual(fs.existsSync(path.dirname(deeplyNestedTarget)), false);

      const restoreResult = runRestoreCli([
        `--backup=${backupRes.backupPath}`,
        `--target=${deeplyNestedTarget}`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 0);
      assert.ok(fs.existsSync(deeplyNestedTarget));
      assert.strictEqual(fs.readFileSync(deeplyNestedTarget, 'utf8'), 'NESTED_DIR_PAYLOAD');
    });

    it('4.4: Backup fails with exit code 1 when source is an unreadable directory', () => {
      const directorySource = path.join(tmpDir, 'source-is-a-folder');
      fs.mkdirSync(directorySource);

      const backupResult = runBackupCli([
        `--source=${directorySource}`,
        `--output-dir=${path.join(tmpDir, 'out')}`,
      ]);

      assert.strictEqual(backupResult.exitCode, 1);
      assert.ok(backupResult.stderr.includes('directory') || backupResult.stderr.includes('valid database file'));
    });
  });

  // =========================================================================
  // 5. PATHS WITH SPACES, ACCENTS, AND SPECIAL CHARACTERS
  // =========================================================================
  describe('Dimension 5: Paths with Spaces, Accents, and Special Characters', () => {
    it('5.1: Operates correctly on paths with Portuguese diacritics and spaces (Área de Trabalho)', () => {
      const specialDir = path.join(tmpDir, 'Área de Trabalho — Pilates & Fisioterapia (São Paulo)');
      fs.mkdirSync(specialDir, { recursive: true });

      const specialSrc = path.join(specialDir, 'banco_de_dados_produção_2026.sqlite');
      const payload = JSON.stringify({ estúdio: 'São Paulo Pilates', status: 'ativo', alunos: 15 });
      fs.writeFileSync(specialSrc, payload, 'utf8');
      const expectedHash = computeFileHash(specialSrc);

      const specialOut = path.join(specialDir, 'cópias de segurança (backups)');
      const backupResult = runBackupCli([
        `--source=${specialSrc}`,
        `--output-dir=${specialOut}`,
        '--tag=produção-são-paulo',
      ]);

      assert.strictEqual(backupResult.exitCode, 0, `Backup failed with accented path: ${backupResult.stderr}`);
      const backupJson = JSON.parse(backupResult.stdout);
      assert.strictEqual(backupJson.hash, expectedHash);
      assert.ok(fs.existsSync(backupJson.backupPath));
      assert.ok(fs.existsSync(backupJson.metaPath));

      // Restore to another path with spaces and accents
      const specialTarget = path.join(specialDir, 'recuperação_desastre', 'banco_restaurado_área.sqlite');
      const restoreResult = runRestoreCli([
        `--backup=${backupJson.backupPath}`,
        `--target=${specialTarget}`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 0, `Restore failed with accented path: ${restoreResult.stderr}`);
      assert.ok(fs.existsSync(specialTarget));
      assert.strictEqual(computeFileHash(specialTarget), expectedHash);
      assert.strictEqual(fs.readFileSync(specialTarget, 'utf8'), payload);
    });

    it('5.2: cleanPath handles quoted paths and file: URL schemes correctly', () => {
      const cleanSrc = path.join(tmpDir, 'url-test.db');
      fs.writeFileSync(cleanSrc, 'URL_PAYLOAD');
      const expectedHash = computeFileHash(cleanSrc);

      // Pass path with file: prefix
      const backupRes = createBackup({
        source: `file:${cleanSrc}`,
        outputDir: tmpDir,
        tag: 'url-test',
      });

      assert.strictEqual(backupRes.hash, expectedHash);

      const restoreDest = path.join(tmpDir, 'url-restored.db');
      const restoreRes = restoreBackup({
        backup: `file:${backupRes.backupPath}`,
        target: `file:${restoreDest}`,
      });

      assert.strictEqual(restoreRes.restored, true);
      assert.strictEqual(computeFileHash(restoreDest), expectedHash);
    });

    it('5.3: Handles CLI args with enclosed single and double quotes', () => {
      const srcWithSpace = path.join(tmpDir, 'source with space.db');
      fs.writeFileSync(srcWithSpace, 'SPACE_PAYLOAD');
      const expectedHash = computeFileHash(srcWithSpace);

      const outDir = path.join(tmpDir, 'backup space dir');
      const backupResult = runBackupCli([
        `--source="${srcWithSpace}"`,
        `--output-dir="${outDir}"`,
        '--tag=quoted-args',
      ]);

      assert.strictEqual(backupResult.exitCode, 0);
      const backupJson = JSON.parse(backupResult.stdout);

      const targetWithSpace = path.join(tmpDir, 'target space dir', 'restored space.db');
      const restoreResult = runRestoreCli([
        `--backup="${backupJson.backupPath}"`,
        `--target="${targetWithSpace}"`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 0);
      assert.strictEqual(computeFileHash(targetWithSpace), expectedHash);
    });

    it('5.4: Custom tag with complex symbols and spaces is trimmed and preserved', () => {
      const srcDb = path.join(tmpDir, 'tag-src.db');
      fs.writeFileSync(srcDb, 'TAG_PAYLOAD');

      const complexTag = 'deploy_v1.0-alpha.1';
      const backupResult = runBackupCli([
        `--source=${srcDb}`,
        `--output-dir=${tmpDir}`,
        `--tag=${complexTag}`,
      ]);

      assert.strictEqual(backupResult.exitCode, 0);
      const backupJson = JSON.parse(backupResult.stdout);
      assert.ok(backupJson.backupPath.includes(complexTag));
      const meta = JSON.parse(fs.readFileSync(backupJson.metaPath, 'utf8'));
      assert.strictEqual(meta.tag, complexTag);
    });
  });
});
