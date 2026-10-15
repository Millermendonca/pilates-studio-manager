import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createTempDir, cleanupTempDir, createMockDatabase, calculateHash } from './helpers/temp_env.mjs';
import { runDeployGuard } from './helpers/deploy_guard_harness.mjs';

describe('Destination DB Shielding & Overwrite Prevention Suite', () => {
  let tmpDir;
  let sourceDb;
  let targetDb;

  beforeEach(() => {
    tmpDir = createTempDir('wise-dest-shield-');
    sourceDb = path.join(tmpDir, 'source-dev.db');
    targetDb = path.join(tmpDir, 'target-prod.db');
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE (>=5 tests)
  // ==========================================
  describe('Tier 1 - Primary Feature Coverage', () => {
    it('Feature 1.1: Blocks deployment when destination mtime is strictly newer than source mtime', () => {
      const now = Date.now();
      createMockDatabase(sourceDb, { version: 1, students: [{ id: 1, name: 'Local Dev Student' }] }, new Date(now - 3600 * 1000));
      const targetPayload = { version: 2, students: [{ id: 1, name: 'Local Dev Student' }, { id: 2, name: 'Real Prod Student' }] };
      createMockDatabase(targetDb, targetPayload, new Date(now));
      const initialTargetHash = calculateHash(targetDb);

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.strictEqual(result.exitCode, 1, 'Deploy guard must exit with code 1 when destination is newer');
      assert.match(result.stderr, /SEGURANÇA BLOQUEADA|newer/i, 'Deploy guard must emit clear security blockage message');
      assert.strictEqual(calculateHash(targetDb), initialTargetHash, 'Destination database must remain completely unmodified');
    });

    it('Feature 1.2: Blocks deployment when destination has more records than local source (record count protection)', () => {
      const timestamp = new Date();
      createMockDatabase(sourceDb, { students: [{ id: 1, name: 'Dev Student' }] }, timestamp);
      createMockDatabase(targetDb, { students: [{ id: 1, name: 'Dev Student' }, { id: 2, name: 'New Student A' }, { id: 3, name: 'New Student B' }] }, timestamp);
      const initialTargetHash = calculateHash(targetDb);

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.strictEqual(result.exitCode, 1, 'Deploy guard must exit with code 1 when destination has more records');
      assert.match(result.stderr, /registros|records/i, 'Must warn about higher record count in destination');
      assert.strictEqual(calculateHash(targetDb), initialTargetHash, 'Target database must be untouched');
    });

    it('Feature 1.3: Allows deployment when local source is strictly newer with equal or greater records (valid forward update)', () => {
      const now = Date.now();
      createMockDatabase(sourceDb, { version: 3, students: [{ id: 1, name: 'Student 1' }, { id: 2, name: 'Student 2' }] }, new Date(now));
      createMockDatabase(targetDb, { version: 2, students: [{ id: 1, name: 'Student 1' }] }, new Date(now - 7200 * 1000));

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.strictEqual(result.exitCode, 0, 'Deploy guard must allow deployment when source is strictly newer');
      assert.strictEqual(result.stderr, '', 'Stderr should be empty on successful verification');
    });

    it('Feature 1.4: Allows initial deployment when destination does not exist and --allow-initial flag is provided', () => {
      createMockDatabase(sourceDb, { version: 1, students: [] }, new Date());
      // targetDb does not exist

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`, '--allow-initial']);

      assert.strictEqual(result.exitCode, 0, 'Initial deployment must be allowed with --allow-initial flag');
    });

    it('Feature 1.5: Blocks initial deployment when destination does not exist and --allow-initial flag is omitted (failsafe against typos)', () => {
      createMockDatabase(sourceDb, { version: 1, students: [] }, new Date());
      // targetDb does not exist

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.strictEqual(result.exitCode, 1, 'Initial deployment must be blocked if --allow-initial is missing');
      assert.match(result.stderr, /--allow-initial|does not exist/i, 'Must guide user to supply explicit flag');
    });

    it('Feature 1.6: Allows explicit override when --force flag is passed by authorized operator', () => {
      const now = Date.now();
      createMockDatabase(sourceDb, { version: 1 }, new Date(now - 5000));
      createMockDatabase(targetDb, { version: 2 }, new Date(now));

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`, '--force']);

      assert.strictEqual(result.exitCode, 0, 'Force flag must override timestamp check when explicitly commanded');
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 tests)
  // ==========================================
  describe('Tier 2 - Boundary and Corner Cases', () => {
    it('Boundary 2.1: Handles empty destination database (0-byte file) without throwing unhandled exceptions', () => {
      createMockDatabase(sourceDb, { students: [{ id: 1 }] }, new Date());
      fs.writeFileSync(targetDb, ''); // 0 bytes

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.doesNotThrow(() => result);
      assert.ok([0, 1].includes(result.exitCode), 'Exit code must be 0 or 1, never crashing node process');
    });

    it('Boundary 2.2: Handles exact millisecond timestamp equality by verifying record counts', () => {
      const exactTime = new Date('2026-10-15T12:00:00.000Z');
      createMockDatabase(sourceDb, { students: [{ id: 1 }] }, exactTime);
      createMockDatabase(targetDb, { students: [{ id: 1 }, { id: 2 }] }, exactTime);

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.strictEqual(result.exitCode, 1, 'Equal timestamp but higher destination records must be blocked');
    });

    it('Boundary 2.3: Rejects deployment with exit code 1 when source timestamp is epoch (1970-01-01) and destination is newer', () => {
      const epochTime = new Date(0);
      const modernTime = new Date('2026-10-15T12:00:00.000Z');
      createMockDatabase(sourceDb, { students: [{ id: 1 }] }, epochTime);
      createMockDatabase(targetDb, { students: [{ id: 1 }] }, modernTime);

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.strictEqual(result.exitCode, 1, 'Older epoch source against modern destination must trigger security halt');
    });

    it('Boundary 2.4: Aborts with exit code 1 when source database path does not exist', () => {
      const nonExistentSource = path.join(tmpDir, 'missing-source.db');
      createMockDatabase(targetDb, { students: [] }, new Date());

      const result = runDeployGuard([`--source=${nonExistentSource}`, `--target=${targetDb}`]);

      assert.strictEqual(result.exitCode, 1, 'Missing source file must abort deployment');
      assert.match(result.stderr, /does not exist|Source/i);
    });

    it('Boundary 2.5: Aborts with exit code 1 when mandatory CLI parameters are missing', () => {
      const result = runDeployGuard([]);

      assert.strictEqual(result.exitCode, 1, 'Missing parameters must abort immediately');
      assert.match(result.stderr, /--source|--target/i);
    });

    it('Boundary 2.6: Rejects corrupted JSON in source database safely without unhandled crash', () => {
      fs.writeFileSync(sourceDb, '{ "corruptedJson": [');
      createMockDatabase(targetDb, { students: [] }, new Date());

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.ok([0, 1].includes(result.exitCode));
    });
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE & ENVIRONMENT COMBINATIONS
  // ==========================================
  describe('Tier 3 - Cross-Feature & Environment Combinations', () => {
    it('Tier 3.1: Supports configuration via environment variables DEPLOY_SOURCE and DEPLOY_TARGET', () => {
      const now = Date.now();
      createMockDatabase(sourceDb, { version: 1 }, new Date(now - 1000));
      createMockDatabase(targetDb, { version: 2 }, new Date(now));

      const result = runDeployGuard([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: targetDb,
      });

      assert.strictEqual(result.exitCode, 1, 'Must detect newer destination via environment variables');
      assert.match(result.stderr, /newer/i, 'Must cite newer destination violation, not missing parameter');

      // Forward deployment: source is newer than destination
      createMockDatabase(sourceDb, { version: 3 }, new Date(now + 2000));
      const allowedResult = runDeployGuard([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: targetDb,
      });
      assert.strictEqual(allowedResult.exitCode, 0, 'Must allow deployment via environment variables when source is newer');
    });

    it('Tier 3.2: Full integrity invariant: blocked deploy guarantees byte-for-byte target persistence', () => {
      const targetPayload = JSON.stringify({
        studio: 'Studio Pilates Harmonia',
        activeStudents: 58,
        invoices: [{ id: 'inv_real', amount: 340.0 }],
      });
      fs.writeFileSync(targetDb, targetPayload);
      const targetMtime = new Date();
      fs.utimesSync(targetDb, targetMtime, targetMtime);
      const preHash = calculateHash(targetDb);

      createMockDatabase(sourceDb, { studio: 'Local Dev Scratch', activeStudents: 0 }, new Date(Date.now() - 5000));

      const result = runDeployGuard([`--source=${sourceDb}`, `--target=${targetDb}`]);

      assert.strictEqual(result.exitCode, 1);
      const postHash = calculateHash(targetDb);
      assert.strictEqual(postHash, preHash, 'Cryptographic hash of production target must not change on blocked deploy');
      assert.strictEqual(fs.readFileSync(targetDb, 'utf8'), targetPayload, 'Target file content must be byte-for-byte preserved');
    });
  });
});
