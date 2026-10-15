import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createTempDir, cleanupTempDir, createMockDatabase, calculateHash } from './helpers/temp_env.mjs';
import { runBackupEngine, runRestoreEngine } from './helpers/backup_engine_harness.mjs';

describe('Automated Backup & Point-in-Time Disaster Recovery Suite', () => {
  let tmpDir;
  let activeDb;
  let backupDir;

  const sampleStudioData = {
    studio: {
      id: 'studio_1',
      studioName: 'Studio Pilates Harmonia',
      pixKey: 'contato@pilatesharmonia.com.br',
      defaultClassCapacity: 8,
    },
    students: [
      { id: 'std_1', name: 'Camila Rodrigues', phone: '(11) 98765-4321', cpf: '123.456.789-00', healthNotes: 'Hérnia L4-L5' },
      { id: 'std_2', name: 'Rodrigo Mendonça', phone: '(11) 97654-3210', cpf: '234.567.890-11', healthNotes: 'Condromalácia patelar' },
      { id: 'std_3', name: 'Mariana Silva Alencar', phone: '(11) 96543-2109', cpf: '345.678.901-22', healthNotes: 'Gestante 22 semanas' },
    ],
    schedules: [
      { id: 'sch_1', studentId: 'std_1', dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
      { id: 'sch_2', studentId: 'std_2', dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
      { id: 'sch_3', studentId: 'std_3', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
    ],
    invoices: [
      { id: 'inv_1', studentId: 'std_1', amount: 420.0, status: 'PAID' },
      { id: 'inv_2', studentId: 'std_2', amount: 320.0, status: 'PENDING' },
    ],
    credits: [
      { id: 'crd_1', studentId: 'std_1', originReason: 'Cancelamento tempestivo', used: false },
    ],
  };

  beforeEach(() => {
    tmpDir = createTempDir('wise-backup-test-');
    activeDb = path.join(tmpDir, 'active-studio.db');
    backupDir = path.join(tmpDir, 'backups');
    createMockDatabase(activeDb, sampleStudioData);
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE (>=5 tests)
  // ==========================================
  describe('Tier 1 - Primary Feature Coverage', () => {
    it('Feature 3.1: Automated backup engine generates timestamped backup archive and metadata files', () => {
      const result = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=pre-deploy',
      ]);

      assert.strictEqual(result.exitCode, 0, 'Backup engine must exit with code 0 on success');
      const backupFiles = fs.readdirSync(backupDir);
      const jsonBackup = backupFiles.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const metaBackup = backupFiles.find((f) => f.endsWith('.meta.json'));

      assert.ok(jsonBackup, 'Must generate backup archive file');
      assert.ok(metaBackup, 'Must generate accompanying metadata JSON file');
      assert.ok(jsonBackup.includes('pre-deploy'), 'Backup filename must contain tag');
    });

    it('Feature 3.2: Metadata contains authoritative SHA-256 hash matching the exact byte content of the archive', () => {
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=sha-check',
      ]);
      assert.strictEqual(backupResult.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const archiveFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const metaFile = `${archiveFile}.meta.json`;

      const archivePath = path.join(backupDir, archiveFile);
      const metaPath = path.join(backupDir, metaFile);

      const computedHash = calculateHash(archivePath);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

      assert.strictEqual(meta.hash, computedHash, 'Metadata hash must equal SHA-256 of backup file');
      assert.strictEqual(meta.tag, 'sha-check', 'Metadata must record specified tag');
    });

    it('Feature 3.3: Restore engine restores 100% of records from backup with exact cryptographic parity', () => {
      const originalHash = calculateHash(activeDb);

      // Create backup
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=full-restore',
      ]);
      assert.strictEqual(backupResult.exitCode, 0);

      const files = fs.readdirSync(backupDir);
      const archiveFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const archivePath = path.join(backupDir, archiveFile);

      // Simulate disaster: wipe active database
      fs.writeFileSync(activeDb, JSON.stringify({ students: [] }));
      assert.notStrictEqual(calculateHash(activeDb), originalHash);

      // Restore from backup
      const restoreResult = runRestoreEngine([
        `--backup=${archivePath}`,
        `--target=${activeDb}`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 0, 'Restore engine must exit with code 0');
      assert.strictEqual(calculateHash(activeDb), originalHash, 'Restored database must match pre-disaster hash exactly');

      const restoredData = JSON.parse(fs.readFileSync(activeDb, 'utf8'));
      assert.strictEqual(restoredData.students.length, 3, 'Must restore all 3 students');
      assert.strictEqual(restoredData.students[0].name, 'Camila Rodrigues');
      assert.strictEqual(restoredData.invoices.length, 2);
    });

    it('Feature 3.4: Restore dry-run mode validates backup integrity and prints summary without modifying target', () => {
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=dry-run-test',
      ]);
      const files = fs.readdirSync(backupDir);
      const archiveFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const archivePath = path.join(backupDir, archiveFile);

      // Modify active database to a modified state
      const modifiedContent = JSON.stringify({ modified: true });
      fs.writeFileSync(activeDb, modifiedContent);
      const beforeHash = calculateHash(activeDb);

      // Run restore with --dry-run
      const dryRunResult = runRestoreEngine([
        `--backup=${archivePath}`,
        `--target=${activeDb}`,
        '--dry-run',
      ]);

      assert.strictEqual(dryRunResult.exitCode, 0, 'Dry-run must exit with code 0 on valid backup');
      assert.strictEqual(calculateHash(activeDb), beforeHash, 'Dry-run must NOT modify target database');
      assert.strictEqual(fs.readFileSync(activeDb, 'utf8'), modifiedContent);
    });

    it('Feature 3.5: Preserves multi-table relational records and foreign keys during restore', () => {
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=relations',
      ]);
      const files = fs.readdirSync(backupDir);
      const archiveFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const archivePath = path.join(backupDir, archiveFile);

      // Disaster
      fs.writeFileSync(activeDb, '{}');

      // Restore
      const restoreResult = runRestoreEngine([
        `--backup=${archivePath}`,
        `--target=${activeDb}`,
      ]);
      assert.strictEqual(restoreResult.exitCode, 0);

      const restored = JSON.parse(fs.readFileSync(activeDb, 'utf8'));
      // Verify foreign key integrity: each schedule studentId exists in students
      const studentIds = new Set(restored.students.map((s) => s.id));
      for (const schedule of restored.schedules) {
        assert.ok(studentIds.has(schedule.studentId), `Schedule ${schedule.id} references valid studentId`);
      }
      for (const invoice of restored.invoices) {
        assert.ok(studentIds.has(invoice.studentId), `Invoice ${invoice.id} references valid studentId`);
      }
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 tests)
  // ==========================================
  describe('Tier 2 - Boundary and Corner Cases', () => {
    it('Boundary 3.1: Restores safely when target database is completely empty (clean install)', () => {
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=clean-target',
      ]);
      const files = fs.readdirSync(backupDir);
      const archiveFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const archivePath = path.join(backupDir, archiveFile);

      const cleanInstallDb = path.join(tmpDir, 'new-install.db');
      fs.writeFileSync(cleanInstallDb, ''); // 0 bytes

      const restoreResult = runRestoreEngine([
        `--backup=${archivePath}`,
        `--target=${cleanInstallDb}`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 0, 'Clean install restore must succeed');
      const restored = JSON.parse(fs.readFileSync(cleanInstallDb, 'utf8'));
      assert.strictEqual(restored.students.length, 3);
    });

    it('Boundary 3.2: Aborts restore with exit code 1 when backup payload is corrupted (tamper detection)', () => {
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=tamper-check',
      ]);
      const files = fs.readdirSync(backupDir);
      const archiveFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const archivePath = path.join(backupDir, archiveFile);

      // Maliciously tamper with 1 byte in the backup archive
      const originalBytes = fs.readFileSync(archivePath);
      originalBytes[originalBytes.length - 1] = originalBytes[originalBytes.length - 1] ^ 0xff;
      fs.writeFileSync(archivePath, originalBytes);

      const targetBeforeHash = calculateHash(activeDb);

      const restoreResult = runRestoreEngine([
        `--backup=${archivePath}`,
        `--target=${activeDb}`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 1, 'Corrupted backup must be rejected with exit code 1');
      assert.match(restoreResult.stderr, /checksum|integrity/i, 'Must report integrity violation');
      assert.strictEqual(calculateHash(activeDb), targetBeforeHash, 'Target DB must not be corrupted by failed restore');
    });

    it('Boundary 3.3: Aborts restore with exit code 1 when metadata file is missing or malformed', () => {
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=missing-meta',
      ]);
      const files = fs.readdirSync(backupDir);
      const archiveFile = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
      const archivePath = path.join(backupDir, archiveFile);
      const metaPath = `${archivePath}.meta.json`;

      // Delete metadata file
      fs.unlinkSync(metaPath);

      const restoreResult = runRestoreEngine([
        `--backup=${archivePath}`,
        `--target=${activeDb}`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 1, 'Missing metadata must abort restore');
      assert.match(restoreResult.stderr, /metadata/i);
    });

    it('Boundary 3.4: Aborts backup with exit code 1 when source database path is invalid or missing', () => {
      const missingDb = path.join(tmpDir, 'does-not-exist.db');

      const backupResult = runBackupEngine([
        `--source=${missingDb}`,
        `--output-dir=${backupDir}`,
      ]);

      assert.strictEqual(backupResult.exitCode, 1, 'Backup of non-existent DB must fail with exit code 1');
      assert.match(backupResult.stderr, /Source database does not exist|not found/i);
    });

    it('Boundary 3.5: Preserves target database completely intact if restore operation fails validation', () => {
      const targetPreHash = calculateHash(activeDb);
      const nonExistentBackup = path.join(tmpDir, 'ghost-backup.json');

      const restoreResult = runRestoreEngine([
        `--backup=${nonExistentBackup}`,
        `--target=${activeDb}`,
      ]);

      assert.strictEqual(restoreResult.exitCode, 1);
      assert.strictEqual(calculateHash(activeDb), targetPreHash, 'Target database must remain untouched on failure');
    });

    it('Boundary 3.6: Handles custom tags with special characters and timestamp formatting safely', () => {
      const customTag = 'pre_deploy-v1.2.0-rc1';
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        `--tag=${customTag}`,
      ]);

      assert.strictEqual(backupResult.exitCode, 0);
      const files = fs.readdirSync(backupDir);
      const match = files.find((f) => f.includes(customTag));
      assert.ok(match, 'Must accept complex alphanumeric and hyphens in backup tags');
    });
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================
  describe('Tier 3 - Pre-Migration Safety & Rollback Lifecycle', () => {
    it('Tier 3.1: Pre-migration backup lifecycle: automatic snapshot permits 100% recovery after failed migration', () => {
      // 1. Establish initial stable state
      const preMigrationHash = calculateHash(activeDb);

      // 2. Trigger automated pre-migration backup hook
      const backupResult = runBackupEngine([
        `--source=${activeDb}`,
        `--output-dir=${backupDir}`,
        '--tag=pre-migration-safety',
      ]);
      assert.strictEqual(backupResult.exitCode, 0);

      // 3. Simulate destructive migration failure (e.g. dropped column, corrupted table)
      fs.writeFileSync(activeDb, JSON.stringify({ error: 'MIGRATION_FAILED_TABLE_DROPPED' }));

      // 4. Trigger disaster recovery
      const files = fs.readdirSync(backupDir);
      const archive = files.find((f) => f.includes('pre-migration-safety') && f.endsWith('.json') && !f.endsWith('.meta.json'));
      const archivePath = path.join(backupDir, archive);

      const restoreResult = runRestoreEngine([
        `--backup=${archivePath}`,
        `--target=${activeDb}`,
      ]);
      assert.strictEqual(restoreResult.exitCode, 0);

      // 5. Verify 100% parity with pre-migration baseline
      const postRestoreHash = calculateHash(activeDb);
      assert.strictEqual(postRestoreHash, preMigrationHash, 'Database must be restored to exact pre-migration state');
    });
  });
});
