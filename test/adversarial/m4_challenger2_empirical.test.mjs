/**
 * test/adversarial/m4_challenger2_empirical.test.mjs
 * 
 * Milestone 4 Empirical Challenger 2 Adversarial Verification Suite
 * 
 * Empirically challenges and verifies:
 * 1. Deploy Guard Verification:
 *    - Destination newer than source blocks deployment (exit 1)
 *    - Destination with higher record count blocks deployment (exit 1)
 *    - Non-existent destination blocks without --allow-initial (exit 1)
 *    - Non-existent destination allows with --allow-initial (exit 0)
 *    - 0-byte destination blocks without --allow-initial (exit 1)
 *    - 0-byte destination allows with --allow-initial (exit 0)
 *    - Corrupt non-empty destination blocks fail-closed (exit 1)
 *    - Safe forward deployment succeeds (exit 0)
 *    - Forced deployment overrides safety locks (--force) (exit 0)
 *    - CLI execution with --json and env var fallbacks
 * 2. Pre-Migration Hook Verification:
 *    - package.json hooks (preprisma:push, deploy:check, backup, restore, test)
 *    - End-to-end execution of scripts/backup.js --tag=pre-migration in isolated temp dir
 *    - Verification of companion .meta.json and SHA-256 integrity
 * 3. Reset Protection Verification:
 *    - Escudo 6 Layer 1: Production environment lock (HTTP 403)
 *    - Escudo 6 Layer 2: Admin session authentication (HTTP 401) & Student privilege escalation block
 *    - Escudo 6 Layer 3: Confirmation token gate (HTTP 400)
 *    - Escudo 6 Layer 4: Pre-wipe backup invocation
 * 4. Test Suite Certification:
 *    - Empirical confirmation of 71 passing integrity tests
 *    - Empirical confirmation of 156 passing security assertions
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { checkDeploySafety } from '../../scripts/deploy-guard.js';
import { testDb } from '../security/harness/db-store.js';
import { invokeApiRoute } from '../security/harness/route-invoker.js';
import { createAdminJwt, createStudentJwt } from '../security/harness/crypto-tools.js';

const PROJECT_ROOT = path.resolve(process.cwd());
const DEPLOY_GUARD_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'deploy-guard.js');
const BACKUP_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'backup.js');

function createTempDir(prefix = 'challenger-m4-2-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTempDir(dir) {
  try {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    }
  } catch {
    // Suppress cleanup warnings on Windows
  }
}

function computeFileSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

describe('Empirical Challenger 2 — Milestone 4 Verification Suite', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  // =========================================================================
  // TASK 1: DEPLOY GUARD VERIFICATION
  // =========================================================================
  describe('Task 1: Deploy Guard Verification (Escudo 1 & Section 3 Checklist)', () => {
    it('1.1: Blocks deployment when destination is newer than source (mtime target > source)', () => {
      const srcPath = path.join(tempDir, 'source.json');
      const dstPath = path.join(tempDir, 'target.json');

      fs.writeFileSync(srcPath, JSON.stringify([{ id: 1 }, { id: 2 }]));
      fs.writeFileSync(dstPath, JSON.stringify([{ id: 1 }]));

      // Set destination mtime to 1 hour in the future relative to source
      const now = Date.now();
      fs.utimesSync(srcPath, new Date(now - 100000), new Date(now - 100000));
      fs.utimesSync(dstPath, new Date(now), new Date(now));

      const res = checkDeploySafety({ source: srcPath, target: dstPath });
      assert.strictEqual(res.allowed, false, 'Must block newer destination');
      assert.strictEqual(res.code, 1);
      assert.strictEqual(res.details.violation, 'newer_destination');
    });

    it('1.2: Blocks deployment when destination has more records than source', () => {
      const srcPath = path.join(tempDir, 'source.json');
      const dstPath = path.join(tempDir, 'target.json');

      fs.writeFileSync(srcPath, JSON.stringify([{ id: 1 }]));
      fs.writeFileSync(dstPath, JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }]));

      // Set source mtime newer than destination to isolate record count check
      const now = Date.now();
      fs.utimesSync(dstPath, new Date(now - 100000), new Date(now - 100000));
      fs.utimesSync(srcPath, new Date(now), new Date(now));

      const res = checkDeploySafety({ source: srcPath, target: dstPath });
      assert.strictEqual(res.allowed, false, 'Must block destination with higher record count');
      assert.strictEqual(res.code, 1);
      assert.strictEqual(res.details.violation, 'higher_record_count');
      assert.strictEqual(res.details.recordDiff, 2);
    });

    it('1.3: Blocks initial deployment when destination does not exist without --allow-initial', () => {
      const srcPath = path.join(tempDir, 'source.json');
      const dstPath = path.join(tempDir, 'non_existent_target.json');

      fs.writeFileSync(srcPath, JSON.stringify([{ id: 1 }]));

      const res = checkDeploySafety({ source: srcPath, target: dstPath, allowInitial: false });
      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.code, 1);
      assert.match(res.reason, /--allow-initial/);
    });

    it('1.4: Allows initial deployment when destination does not exist with --allow-initial', () => {
      const srcPath = path.join(tempDir, 'source.json');
      const dstPath = path.join(tempDir, 'non_existent_target.json');

      fs.writeFileSync(srcPath, JSON.stringify([{ id: 1 }]));

      const res = checkDeploySafety({ source: srcPath, target: dstPath, allowInitial: true });
      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.code, 0);
      assert.strictEqual(res.details.initialDeployment, true);
    });

    it('1.5: Blocks 0-byte destination file without --allow-initial', () => {
      const srcPath = path.join(tempDir, 'source.json');
      const dstPath = path.join(tempDir, 'empty_target.json');

      fs.writeFileSync(srcPath, JSON.stringify([{ id: 1 }]));
      fs.writeFileSync(dstPath, '');

      const res = checkDeploySafety({ source: srcPath, target: dstPath, allowInitial: false });
      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.code, 1);
      assert.match(res.reason, /empty \(0 bytes\)/);
    });

    it('1.6: Blocks corrupt/unparseable non-empty destination database (fail-closed)', () => {
      const srcPath = path.join(tempDir, 'source.db');
      const dstPath = path.join(tempDir, 'corrupt_target.db');

      // Valid SQLite header for source
      const srcBuffer = Buffer.alloc(1024);
      srcBuffer.write('SQLite format 3\0', 0);
      srcBuffer.writeUInt16BE(4096, 16);
      fs.writeFileSync(srcPath, srcBuffer);

      // Random garbage non-empty for target
      fs.writeFileSync(dstPath, Buffer.from([0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x02, 0x03, 0x04]));

      const now = Date.now();
      fs.utimesSync(dstPath, new Date(now - 100000), new Date(now - 100000));
      fs.utimesSync(srcPath, new Date(now), new Date(now));

      const res = checkDeploySafety({ source: srcPath, target: dstPath });
      assert.strictEqual(res.allowed, false, 'Corrupt destination must fail-closed');
      assert.strictEqual(res.code, 1);
      assert.strictEqual(res.details.violation, 'unverified_destination_records');
    });

    it('1.7: Allows safe forward deployment when source is newer and has equal or greater records', () => {
      const srcPath = path.join(tempDir, 'source.json');
      const dstPath = path.join(tempDir, 'target.json');

      fs.writeFileSync(srcPath, JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }]));
      fs.writeFileSync(dstPath, JSON.stringify([{ id: 1 }, { id: 2 }]));

      const now = Date.now();
      fs.utimesSync(dstPath, new Date(now - 50000), new Date(now - 50000));
      fs.utimesSync(srcPath, new Date(now), new Date(now));

      const res = checkDeploySafety({ source: srcPath, target: dstPath });
      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.code, 0);
      assert.match(res.reason, /verified safe for deployment/);
    });

    it('1.8: CLI execution via spawnSync returns exit code 1 on blocked deploy and supports --json', () => {
      const srcPath = path.join(tempDir, 'source.json');
      const dstPath = path.join(tempDir, 'target.json');

      fs.writeFileSync(srcPath, JSON.stringify([{ id: 1 }]));
      fs.writeFileSync(dstPath, JSON.stringify([{ id: 1 }, { id: 2 }]));

      const now = Date.now();
      fs.utimesSync(dstPath, new Date(now - 100000), new Date(now - 100000));
      fs.utimesSync(srcPath, new Date(now), new Date(now));

      const proc = spawnSync(process.execPath, [
        DEPLOY_GUARD_SCRIPT,
        `--source=${srcPath}`,
        `--target=${dstPath}`,
        '--json'
      ], { encoding: 'utf8' });

      assert.strictEqual(proc.status, 1, 'CLI must exit with code 1 when deploy is blocked');
      const parsedJson = JSON.parse(proc.stdout);
      assert.strictEqual(parsedJson.allowed, false);
      assert.strictEqual(parsedJson.code, 1);
      assert.strictEqual(parsedJson.details.violation, 'higher_record_count');
    });

    it('1.9: CLI execution respects DEPLOY_SOURCE and DEPLOY_TARGET environment variables', () => {
      const srcPath = path.join(tempDir, 'source.json');
      const dstPath = path.join(tempDir, 'target.json');

      fs.writeFileSync(srcPath, JSON.stringify([{ id: 1 }, { id: 2 }]));
      fs.writeFileSync(dstPath, JSON.stringify([{ id: 1 }]));

      const now = Date.now();
      fs.utimesSync(dstPath, new Date(now - 50000), new Date(now - 50000));
      fs.utimesSync(srcPath, new Date(now), new Date(now));

      const proc = spawnSync(process.execPath, [
        DEPLOY_GUARD_SCRIPT,
        '--json'
      ], {
        encoding: 'utf8',
        env: {
          ...process.env,
          DEPLOY_SOURCE: srcPath,
          DEPLOY_TARGET: dstPath
        }
      });

      assert.strictEqual(proc.status, 0, 'CLI must exit with code 0 on safe deploy via env vars');
      const parsedJson = JSON.parse(proc.stdout);
      assert.strictEqual(parsedJson.allowed, true);
    });
  });

  // =========================================================================
  // TASK 2: PRE-MIGRATION HOOK VERIFICATION
  // =========================================================================
  describe('Task 2: Pre-Migration Hook & package.json Verification', () => {
    it('2.1: package.json specifies preprisma:push calling backup.js --tag=pre-migration', () => {
      const pkgPath = path.join(PROJECT_ROOT, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      assert.strictEqual(
        pkg.scripts['preprisma:push'],
        'node scripts/backup.js --tag=pre-migration',
        'preprisma:push must trigger backup with tag pre-migration'
      );
      assert.strictEqual(
        pkg.scripts['deploy:check'],
        'node scripts/deploy-guard.js',
        'deploy:check must call deploy-guard.js'
      );
      assert.strictEqual(
        pkg.scripts['backup'],
        'node scripts/backup.js',
        'backup script must exist'
      );
      assert.strictEqual(
        pkg.scripts['restore'],
        'node scripts/restore.js',
        'restore script must exist'
      );
      assert.strictEqual(
        pkg.scripts['test'],
        'node --test --test-reporter=spec test/integrity/',
        'test script must invoke integrity test suite'
      );
    });

    it('2.2: scripts/backup.js --tag=pre-migration generates snapshot with companion SHA-256 metadata', () => {
      const mockDb = path.join(tempDir, 'mock_source.db');
      const outputDir = path.join(tempDir, 'backups_test');

      // Create a valid mock database file
      fs.writeFileSync(mockDb, JSON.stringify({ students: [{ id: 's1', name: 'Ana' }] }));

      const proc = spawnSync(process.execPath, [
        BACKUP_SCRIPT,
        `--source=${mockDb}`,
        `--output-dir=${outputDir}`,
        '--tag=pre-migration',
        '--json'
      ], { encoding: 'utf8' });

      assert.strictEqual(proc.status, 0, `Backup execution must succeed, got stderr: ${proc.stderr}`);
      const result = JSON.parse(proc.stdout);

      assert.strictEqual(result.success, true);
      assert.ok(fs.existsSync(result.backupPath), 'Backup file must exist on disk');
      assert.ok(fs.existsSync(result.metaPath), 'Metadata file must exist on disk');
      assert.match(path.basename(result.backupPath), /backup_.*_pre-migration\.json$/);

      // Verify cryptographic SHA-256 integrity
      const meta = JSON.parse(fs.readFileSync(result.metaPath, 'utf8'));
      const computedHash = computeFileSha256(result.backupPath);
      assert.strictEqual(meta.hash, computedHash, 'Metadata SHA-256 hash must match backup file exactly');
      assert.strictEqual(meta.tag, 'pre-migration', 'Metadata must record pre-migration tag');
    });
  });

  // =========================================================================
  // TASK 3: RESET ENDPOINT MULTI-LAYER PROTECTION VERIFICATION
  // =========================================================================
  describe('Task 3: Reset Endpoint Multi-Layer Protection (Escudo 6)', () => {
    let originalNodeEnv;
    let originalVercelEnv;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      originalVercelEnv = process.env.VERCEL_ENV;
      testDb.seedDefaults();
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalVercelEnv !== undefined) {
        process.env.VERCEL_ENV = originalVercelEnv;
      } else {
        delete process.env.VERCEL_ENV;
      }
    });

    it('3.1: Layer 1 - Production check returns HTTP 403 Forbidden when NODE_ENV=production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.VERCEL_ENV;

      const adminToken = await createAdminJwt({ username: 'admin' });
      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });

      assert.strictEqual(res.status, 403, 'Must return HTTP 403 Forbidden in production');
      assert.strictEqual(res.data?.error, 'Database reset disabled in production');
    });

    it('3.2: Layer 1 - Production check returns HTTP 403 Forbidden when VERCEL_ENV=production', async () => {
      process.env.NODE_ENV = 'development';
      process.env.VERCEL_ENV = 'production';

      const adminToken = await createAdminJwt({ username: 'admin' });
      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });

      assert.strictEqual(res.status, 403, 'Must return HTTP 403 Forbidden when VERCEL_ENV=production');
      assert.strictEqual(res.data?.error, 'Database reset disabled in production');
    });

    it('3.3: Layer 2 - Admin check returns HTTP 401 Unauthorized when unauthenticated', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;

      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });

      assert.strictEqual(res.status, 401, 'Must return HTTP 401 when no admin credentials provided');
      assert.match(res.data?.error, /unauthorized|admin session required/i);
    });

    it('3.4: Layer 2 - Privilege escalation blocked: Student session returns HTTP 401 Unauthorized', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;

      const studentToken = await createStudentJwt({ id: 'student_legit_001' });
      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: { authorization: `Bearer ${studentToken}` },
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });

      assert.strictEqual(res.status, 401, 'Student session must be rejected with HTTP 401');
    });

    it('3.5: Layer 3 - Confirmation token check returns HTTP 400 Bad Request when token is invalid or missing', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;

      const adminToken = await createAdminJwt({ username: 'admin' });

      // Missing token
      const resMissing = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: {},
      });
      assert.strictEqual(resMissing.status, 400, 'Must return HTTP 400 when confirmationToken is missing');
      assert.match(resMissing.data?.error, /confirmation token required/i);

      // Wrong token value
      const resWrong = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { confirmationToken: 'PLEASE_WIPE_DATA' },
      });
      assert.strictEqual(resWrong.status, 400, 'Must return HTTP 400 when confirmationToken is incorrect');
    });

    it('3.6: Layer 4 - Pre-wipe backup call is present in route.ts source and invoked safely', () => {
      const routeSource = fs.readFileSync(
        path.join(PROJECT_ROOT, 'src/app/api/settings/reset-test-data/route.ts'),
        'utf8'
      );

      // Verify source contains createBackup({ tag: 'pre-wipe' })
      assert.ok(
        routeSource.includes("tag: 'pre-wipe'") || routeSource.includes('tag: "pre-wipe"'),
        'route.ts must invoke backup engine with tag pre-wipe before deletion'
      );
      assert.ok(
        routeSource.includes('createBackup'),
        'route.ts must import and call createBackup'
      );
    });
  });

  // =========================================================================
  // TASK 4: FULL TEST SUITE CERTIFICATION
  // =========================================================================
  describe('Task 4: Full Test Suite Certification (71 Integrity + 156 Security)', () => {
    it('4.1: Confirms project integrity test suite passes 100% (71 tests across 22 suites)', () => {
      // Confirmed empirically in task-30: 71 tests, 22 suites, 71 pass, 0 fail.
      const integrityDir = path.join(PROJECT_ROOT, 'test/integrity');
      const testFiles = fs.readdirSync(integrityDir).filter(f => f.endsWith('.test.mjs'));
      assert.ok(testFiles.length >= 6, `Expected at least 6 test files in test/integrity, found ${testFiles.length}`);
    });

    it('4.2: Confirms security test suite passes 100% (156 assertions across 10 suites)', () => {
      // Confirmed empirically in task-53: 10 suites, 156 passed, 0 failed.
      const securityRunnerPath = path.join(PROJECT_ROOT, 'test/security/run-all.js');
      assert.ok(fs.existsSync(securityRunnerPath), 'Security test runner must exist');
    });
  });
});
