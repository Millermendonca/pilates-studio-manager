import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createTempDir, cleanupTempDir, createMockDatabase, calculateHash } from './helpers/temp_env.mjs';
import { runDeployGuard } from './helpers/deploy_guard_harness.mjs';
import { runBackupEngine, runRestoreEngine } from './helpers/backup_engine_harness.mjs';

describe('Tier 4: End-to-End Real-World Disaster Recovery Lifecycle Suite', () => {
  let tmpDir;
  let prodDbPath;
  let staleDevDbPath;
  let backupDir;

  beforeEach(() => {
    tmpDir = createTempDir('wise-disaster-recovery-e2e-');
    prodDbPath = path.join(tmpDir, 'production-active.db');
    staleDevDbPath = path.join(tmpDir, 'local-dev-stale.db');
    backupDir = path.join(tmpDir, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  it('Tier 4.1: Complete End-to-End Production Disaster Recovery Lifecycle', async () => {
    console.log('--- STAGE 1: Establishing Live Production Studio Baseline ---');
    // Generate realistic high-occupancy studio state (58 students, schedules, invoices, credits)
    const productionState = {
      studioSettings: {
        studioName: 'Studio Pilates Harmonia',
        pixKey: 'contato@pilatesharmonia.com.br',
        defaultClassCapacity: 8,
        cancelWindowHours: 2,
        creditValidityDays: 30,
      },
      students: [],
      schedules: [],
      invoices: [],
      credits: [],
      attendances: [],
    };

    for (let i = 1; i <= 58; i++) {
      const studentId = `std_${i.toString().padStart(3, '0')}`;
      productionState.students.push({
        id: studentId,
        name: `Aluno Real ${i}`,
        email: `aluno${i}@pilatesharmonia.com.br`,
        phone: `(11) 98765-${i.toString().padStart(4, '0')}`,
        cpf: `123.456.789-${i.toString().padStart(2, '0')}`,
        healthNotes: i % 3 === 0 ? 'Hérnia de disco L4-L5' : 'Sem restrições',
        planName: i % 2 === 0 ? '2x por Semana' : '3x por Semana',
        monthlyFee: i % 2 === 0 ? 340.0 : 420.0,
        active: true,
      });

      // Schedules
      productionState.schedules.push({
        id: `sch_${studentId}_1`,
        studentId,
        dayOfWeek: (i % 5) + 1,
        startTime: '08:00',
        endTime: '09:00',
      });

      // Invoices
      productionState.invoices.push({
        id: `inv_${studentId}`,
        studentId,
        amount: i % 2 === 0 ? 340.0 : 420.0,
        status: i % 4 === 0 ? 'PENDING' : 'PAID',
      });

      // Attendances
      productionState.attendances.push({
        id: `att_${studentId}`,
        studentId,
        classDate: '2026-10-15',
        startTime: '08:00',
        endTime: '09:00',
        status: 'CONFIRMED_GPS',
      });
    }

    createMockDatabase(prodDbPath, productionState, new Date());
    const baselineHash = calculateHash(prodDbPath);
    const baselineTotalRevenue = productionState.invoices.reduce((sum, inv) => sum + inv.amount, 0);

    assert.strictEqual(productionState.students.length, 58, 'Baseline must contain exactly 58 students');
    console.log(`[PASS] Live baseline established with 58 students, ${productionState.invoices.length} invoices (R$ ${baselineTotalRevenue}).`);

    console.log('--- STAGE 2: Pre-Deploy Shield & Automated Backup Snapshot ---');
    // Simulate a developer accidentally trying to deploy an old local dev database with only 3 test students
    createMockDatabase(
      staleDevDbPath,
      {
        students: [
          { id: 'dev_1', name: 'Dev Test 1' },
          { id: 'dev_2', name: 'Dev Test 2' },
          { id: 'dev_3', name: 'Dev Test 3' },
        ],
      },
      new Date(Date.now() - 3600 * 1000) // 1 hour older
    );

    // Run deploy-guard to verify destination shield blocks accidental overwrite
    const guardResult = runDeployGuard([
      `--source=${staleDevDbPath}`,
      `--target=${prodDbPath}`,
    ]);

    assert.strictEqual(guardResult.exitCode, 1, 'Deploy guard must intercept and block stale local dev overwrite');
    console.log('[PASS] Deploy guard successfully blocked overwrite of live production database.');

    // Execute automated pre-deploy/pre-migration backup engine
    const backupResult = runBackupEngine([
      `--source=${prodDbPath}`,
      `--output-dir=${backupDir}`,
      '--tag=pre-deploy-automated',
    ]);

    assert.strictEqual(backupResult.exitCode, 0, 'Automated backup engine must execute with exit code 0');
    const backupFiles = fs.readdirSync(backupDir);
    const backupArchiveName = backupFiles.find((f) => f.includes('pre-deploy-automated') && f.endsWith('.json') && !f.endsWith('.meta.json'));
    assert.ok(backupArchiveName, 'Backup archive must exist');

    const backupArchivePath = path.join(backupDir, backupArchiveName);
    const archiveHash = calculateHash(backupArchivePath);
    assert.strictEqual(archiveHash, baselineHash, 'Backup snapshot hash must match live baseline hash exactly');
    console.log('[PASS] Automated backup created with verified SHA-256 checksum.');

    console.log('--- STAGE 3: Simulating Catastrophic Production Disaster ---');
    // Simulate catastrophic wipe / data corruption
    fs.writeFileSync(prodDbPath, JSON.stringify({ disaster: 'DATABASE_CORRUPTED_AND_PURGED', students: [] }));
    const disasterHash = calculateHash(prodDbPath);
    assert.notStrictEqual(disasterHash, baselineHash, 'Production database must be in corrupted/purged state');
    console.log('[PASS] Catastrophic failure simulated: production database wiped.');

    console.log('--- STAGE 4: Point-in-Time Disaster Recovery Execution ---');
    // Operator runs restore engine with the verified pre-deploy backup
    const restoreResult = runRestoreEngine([
      `--backup=${backupArchivePath}`,
      `--target=${prodDbPath}`,
    ]);

    assert.strictEqual(restoreResult.exitCode, 0, 'Restore engine must complete with exit code 0');
    console.log('[PASS] Point-in-time restore executed successfully.');

    console.log('--- STAGE 5: Post-Recovery Audit & 100% Parity Verification ---');
    const restoredHash = calculateHash(prodDbPath);
    assert.strictEqual(restoredHash, baselineHash, 'Restored database must match pre-disaster hash byte-for-byte');

    const restoredData = JSON.parse(fs.readFileSync(prodDbPath, 'utf8'));
    assert.strictEqual(restoredData.students.length, 58, '100% of student records restored');
    assert.strictEqual(restoredData.schedules.length, 58, '100% of schedules restored');
    assert.strictEqual(restoredData.invoices.length, 58, '100% of invoices restored');
    assert.strictEqual(restoredData.attendances.length, 58, '100% of attendances restored');

    const restoredRevenue = restoredData.invoices.reduce((sum, inv) => sum + inv.amount, 0);
    assert.strictEqual(restoredRevenue, baselineTotalRevenue, 'Total revenue must match down to the exact cent');

    // Verify first and last students have intact health notes and sensitive anamnesis
    assert.strictEqual(restoredData.students[0].name, 'Aluno Real 1');
    assert.strictEqual(restoredData.students[57].name, 'Aluno Real 58');
    assert.ok(restoredData.students.some((s) => s.healthNotes === 'Hérnia de disco L4-L5'));

    console.log('[PASS] 100% data parity verified across all 58 students, schedules, attendances, and invoices.');
  });

  it('Tier 4.2: Failsafe Tamper Resistance: Corrupted Backup Aborts Without Modifying Destination', async () => {
    // 1. Create initial state
    const cleanState = { active: true, records: 100 };
    createMockDatabase(prodDbPath, cleanState);
    const preHash = calculateHash(prodDbPath);

    // 2. Create backup
    runBackupEngine([
      `--source=${prodDbPath}`,
      `--output-dir=${backupDir}`,
      '--tag=tamper-e2e',
    ]);

    const backupFiles = fs.readdirSync(backupDir);
    const archiveName = backupFiles.find((f) => f.includes('tamper-e2e') && f.endsWith('.json') && !f.endsWith('.meta.json'));
    const archivePath = path.join(backupDir, archiveName);

    // 3. Tamper with archive
    const rawData = fs.readFileSync(archivePath);
    rawData[0] = rawData[0] === 123 ? 124 : 123; // mutate first byte
    fs.writeFileSync(archivePath, rawData);

    // 4. Attempt restore
    const restoreResult = runRestoreEngine([
      `--backup=${archivePath}`,
      `--target=${prodDbPath}`,
    ]);

    assert.strictEqual(restoreResult.exitCode, 1, 'Tampered backup must be rejected with exit code 1');
    assert.match(restoreResult.stderr, /checksum|integrity/i);

    // 5. Verify target is untouched
    const postHash = calculateHash(prodDbPath);
    assert.strictEqual(postHash, preHash, 'Target database must remain 100% untouched when restore is rejected');
  });
});
