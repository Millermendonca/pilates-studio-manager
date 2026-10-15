/**
 * test/adversarial/m1_r2_challenger2.test.mjs
 * 
 * Milestone 1 Round 2 Adversarial Empirical Test Suite
 * Executed by Challenger 2 (Empirical Challenger)
 * 
 * Verifies:
 * 1. DEPLOY_SOURCE and DEPLOY_TARGET environment variables in positive and negative deployment flows
 * 2. Directory path rejection (stat.isFile() enforcement, bypass attempts with --allow-initial and --force)
 * 3. Git ignore, Dockerignore, Vercelignore, and npm packaging across nested directory levels
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import deployGuardPkg from '../../scripts/deploy-guard.js';
const { checkDeploySafety, inspectDatabase, safeDeployGuard } = deployGuardPkg;

const PROJECT_ROOT = path.resolve(process.cwd());
const DEPLOY_GUARD_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'deploy-guard.js');

function createTempDir(prefix = 'challenger2-r2-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTempDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    }
  } catch (err) {
    // Windows file locking tolerance during test cleanup
  }
}

function runDeployGuardCli(args = [], env = {}, timeout = 5000) {
  const result = spawnSync(process.execPath, [DEPLOY_GUARD_SCRIPT, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, ...env }
  });
  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error,
    timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT')
  };
}

describe('Challenger 2 (Round 2) — Empirical Adversarial Stress Suite', () => {
  let tmpDir;
  let sourceDb;
  let targetDb;

  beforeEach(() => {
    tmpDir = createTempDir();
    sourceDb = path.join(tmpDir, 'source.db');
    targetDb = path.join(tmpDir, 'target.db');
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  // =========================================================================
  // REQUIREMENT 1: DEPLOY_SOURCE & DEPLOY_TARGET ENVIRONMENT VARIABLES
  // =========================================================================
  describe('Requirement 1: DEPLOY_SOURCE & DEPLOY_TARGET Environment Variables', () => {
    it('Env 1.1: Positive Forward Deployment via DEPLOY_SOURCE and DEPLOY_TARGET (Newer Source, Equal Records)', () => {
      const payload = JSON.stringify({ students: [{ id: 1 }, { id: 2 }, { id: 3 }] });
      fs.writeFileSync(sourceDb, payload);
      fs.writeFileSync(targetDb, payload);

      const now = Date.now();
      fs.utimesSync(sourceDb, new Date(now), new Date(now));
      fs.utimesSync(targetDb, new Date(now - 10000), new Date(now - 10000));

      // Invoke deploy-guard with NO path arguments, only environment variables
      const res = runDeployGuardCli([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: targetDb
      });

      assert.strictEqual(res.exitCode, 0, 'Positive deployment must exit with code 0');
      assert.match(res.stdout, /DEPLOY_GUARD_OK/);
      assert.match(res.stdout, /Source is newer or equal/);
    });

    it('Env 1.2: Negative Deployment Block via Env Vars when Destination is Newer (mtime violation)', () => {
      const payload = JSON.stringify({ students: [{ id: 1 }, { id: 2 }] });
      fs.writeFileSync(sourceDb, payload);
      fs.writeFileSync(targetDb, payload);

      const now = Date.now();
      // Destination is 15 seconds newer than source
      fs.utimesSync(sourceDb, new Date(now - 15000), new Date(now - 15000));
      fs.utimesSync(targetDb, new Date(now), new Date(now));

      const res = runDeployGuardCli([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: targetDb
      });

      assert.strictEqual(res.exitCode, 1, 'Older source must be blocked with exit code 1');
      assert.match(res.stderr, /DEPLOY_GUARD_BLOCKED/);
      assert.match(res.stderr, /Destination database has newer data than local source!/);
      assert.match(res.stderr, /Violation: newer_destination/);
    });

    it('Env 1.3: Negative Deployment Block via Env Vars when Destination has More Records', () => {
      // Source has 2 records, target has 5 records (even if source mtime is newer)
      fs.writeFileSync(sourceDb, JSON.stringify({ students: [{ id: 1 }, { id: 2 }] }));
      fs.writeFileSync(targetDb, JSON.stringify({ students: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] }));

      const now = Date.now();
      fs.utimesSync(sourceDb, new Date(now), new Date(now));
      fs.utimesSync(targetDb, new Date(now - 10000), new Date(now - 10000));

      const res = runDeployGuardCli([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: targetDb
      });

      assert.strictEqual(res.exitCode, 1, 'Smaller source record count must be blocked with exit code 1');
      assert.match(res.stderr, /DEPLOY_GUARD_BLOCKED/);
      assert.match(res.stderr, /Destination database contains more records \(5\) than source database \(2\)!/);
      assert.match(res.stderr, /Violation: higher_record_count/);
    });

    it('Env 1.4: Missing Target Database in Env Vars causes graceful exit code 1 with clear guidance', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ data: [1] }));

      // Clean all target environment variables
      const res = runDeployGuardCli([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: '',
        DEPLOY_TARGET_DB: '',
        TARGET_DB: '',
        PRODUCTION_DB_PATH: ''
      });

      assert.strictEqual(res.exitCode, 1);
      assert.match(res.stderr, /Target database path not specified/);
      assert.match(res.stderr, /Specify --target=<path> or set DEPLOY_TARGET/);
    });

    it('Env 1.5: Precedence Hierarchy: CLI arguments override DEPLOY_SOURCE and DEPLOY_TARGET', () => {
      const goodSource = path.join(tmpDir, 'good_source.db');
      const badSource = path.join(tmpDir, 'bad_source.db');
      fs.writeFileSync(goodSource, JSON.stringify({ items: [1, 2, 3] }));
      fs.writeFileSync(badSource, JSON.stringify({ items: [1] }));
      fs.writeFileSync(targetDb, JSON.stringify({ items: [1, 2] }));

      const now = Date.now();
      fs.utimesSync(goodSource, new Date(now), new Date(now));
      fs.utimesSync(badSource, new Date(now - 100000), new Date(now - 100000));
      fs.utimesSync(targetDb, new Date(now - 5000), new Date(now - 5000));

      // Env vars point to badSource (which would fail), but CLI overrides with goodSource
      const res = runDeployGuardCli([`--source=${goodSource}`, `--target=${targetDb}`], {
        DEPLOY_SOURCE: badSource,
        DEPLOY_TARGET: path.join(tmpDir, 'dummy.db')
      });

      assert.strictEqual(res.exitCode, 0, 'CLI argument must take precedence over env var');
      assert.match(res.stdout, /DEPLOY_GUARD_OK/);
    });

    it('Env 1.6: Precedence Hierarchy: DEPLOY_SOURCE / DEPLOY_TARGET override legacy variables', () => {
      const primarySource = path.join(tmpDir, 'primary_source.db');
      const legacySource = path.join(tmpDir, 'legacy_source.db');
      fs.writeFileSync(primarySource, JSON.stringify({ items: [1, 2, 3] }));
      fs.writeFileSync(legacySource, JSON.stringify({ items: [1] }));
      fs.writeFileSync(targetDb, JSON.stringify({ items: [1, 2] }));

      const now = Date.now();
      fs.utimesSync(primarySource, new Date(now), new Date(now));
      fs.utimesSync(legacySource, new Date(now - 100000), new Date(now - 100000));
      fs.utimesSync(targetDb, new Date(now - 5000), new Date(now - 5000));

      // DEPLOY_SOURCE is valid, legacy DEPLOY_SOURCE_DB is outdated
      const res = runDeployGuardCli([], {
        DEPLOY_SOURCE: primarySource,
        DEPLOY_SOURCE_DB: legacySource,
        DEPLOY_TARGET: targetDb
      });

      assert.strictEqual(res.exitCode, 0);
      assert.match(res.stdout, /DEPLOY_GUARD_OK/);
    });

    it('Env 1.7: Environment Variables with ALLOW_INITIAL_DEPLOY flag', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ items: [1] }));
      const nonExistentTarget = path.join(tmpDir, 'non_existent.db');

      // 1. Without ALLOW_INITIAL_DEPLOY: blocked
      const blockedRes = runDeployGuardCli([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: nonExistentTarget,
        ALLOW_INITIAL_DEPLOY: 'false'
      });
      assert.strictEqual(blockedRes.exitCode, 1);
      assert.match(blockedRes.stderr, /Destination database does not exist/);

      // 2. With ALLOW_INITIAL_DEPLOY=true: allowed
      const allowedRes = runDeployGuardCli([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: nonExistentTarget,
        ALLOW_INITIAL_DEPLOY: 'true'
      });
      assert.strictEqual(allowedRes.exitCode, 0);
      assert.match(allowedRes.stdout, /Initial deployment permitted/);
    });

    it('Env 1.8: Environment Variables with FORCE_DEPLOY flag overrides newer destination', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ count: 1 }));
      fs.writeFileSync(targetDb, JSON.stringify({ count: 5 }));

      const now = Date.now();
      fs.utimesSync(sourceDb, new Date(now - 10000), new Date(now - 10000));
      fs.utimesSync(targetDb, new Date(now), new Date(now));

      const res = runDeployGuardCli([], {
        DEPLOY_SOURCE: sourceDb,
        DEPLOY_TARGET: targetDb,
        FORCE_DEPLOY: '1'
      });

      assert.strictEqual(res.exitCode, 0);
      assert.match(res.stdout, /DEPLOY_GUARD_WARNING: Forced deployment/);
    });

    it('Env 1.9: npm run deploy:check executes successfully using DEPLOY_SOURCE and DEPLOY_TARGET', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ users: [1, 2] }));
      fs.writeFileSync(targetDb, JSON.stringify({ users: [1] }));

      const now = Date.now();
      fs.utimesSync(sourceDb, new Date(now), new Date(now));
      fs.utimesSync(targetDb, new Date(now - 5000), new Date(now - 5000));

      const npmRes = spawnSync('npm', ['run', 'deploy:check'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        shell: true,
        env: {
          ...process.env,
          DEPLOY_SOURCE: sourceDb,
          DEPLOY_TARGET: targetDb
        }
      });

      assert.strictEqual(npmRes.status, 0, 'npm run deploy:check must exit 0 on safe deployment');
      assert.match(npmRes.stdout, /DEPLOY_GUARD_OK/);
    });
  });

  // =========================================================================
  // REQUIREMENT 2: DIRECTORY PATH REJECTION (stat.isFile() ENFORCEMENT)
  // =========================================================================
  describe('Requirement 2: Directory Path Rejection (stat.isFile() Enforcement)', () => {
    it('Dir 2.1: Rejects deployment when source is an existing directory path', () => {
      const sourceSubDir = path.join(tmpDir, 'source_folder');
      fs.mkdirSync(sourceSubDir);
      fs.writeFileSync(targetDb, JSON.stringify({ valid: true }));

      const res = runDeployGuardCli([`--source=${sourceSubDir}`, `--target=${targetDb}`, '--json']);
      assert.strictEqual(res.exitCode, 1, 'Directory source must exit code 1');

      const json = JSON.parse(res.stdout);
      assert.strictEqual(json.allowed, false);
      assert.match(json.reason, /Source database path is a directory, not a file/);
    });

    it('Dir 2.2: Rejects deployment when target is an existing directory path', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ valid: true }));
      const targetSubDir = path.join(tmpDir, 'target_folder');
      fs.mkdirSync(targetSubDir);

      const res = runDeployGuardCli([`--source=${sourceDb}`, `--target=${targetSubDir}`, '--json']);
      assert.strictEqual(res.exitCode, 1, 'Directory target must exit code 1');

      const json = JSON.parse(res.stdout);
      assert.strictEqual(json.allowed, false);
      assert.match(json.reason, /Target database path is a directory, not a file/);
    });

    it('Dir 2.3: Bypass Attack: Target directory cannot be bypassed using --allow-initial', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ valid: true }));
      const targetSubDir = path.join(tmpDir, 'target_folder_initial');
      fs.mkdirSync(targetSubDir);

      // Attempt bypass using --allow-initial
      const res = runDeployGuardCli([`--source=${sourceDb}`, `--target=${targetSubDir}`, '--allow-initial', '--json']);
      assert.strictEqual(res.exitCode, 1, 'Directory target with --allow-initial must still be rejected');

      const json = JSON.parse(res.stdout);
      assert.strictEqual(json.allowed, false);
      assert.match(json.reason, /Target database path is a directory, not a file/);
    });

    it('Dir 2.4: Bypass Attack: Source or Target directory cannot be bypassed using --force', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ valid: true }));
      const targetSubDir = path.join(tmpDir, 'target_folder_force');
      fs.mkdirSync(targetSubDir);

      // 1. Target is directory with --force
      const resTarget = runDeployGuardCli([`--source=${sourceDb}`, `--target=${targetSubDir}`, '--force', '--json']);
      assert.strictEqual(resTarget.exitCode, 1, 'Target directory with --force must be rejected');

      // 2. Source is directory with --force
      const sourceSubDir = path.join(tmpDir, 'source_folder_force');
      fs.mkdirSync(sourceSubDir);
      const resSource = runDeployGuardCli([`--source=${sourceSubDir}`, `--target=${targetDb}`, '--force', '--json']);
      assert.strictEqual(resSource.exitCode, 1, 'Source directory with --force must be rejected');
    });

    it('Dir 2.5: Both source and target are existing directories', () => {
      const sourceSubDir = path.join(tmpDir, 'src_dir');
      const targetSubDir = path.join(tmpDir, 'dst_dir');
      fs.mkdirSync(sourceSubDir);
      fs.mkdirSync(targetSubDir);

      const res = runDeployGuardCli([`--source=${sourceSubDir}`, `--target=${targetSubDir}`]);
      assert.strictEqual(res.exitCode, 1);
      assert.match(res.stderr, /Source database path is a directory, not a file/);
    });

    it('Dir 2.6: Current working directory "." or root directory "/" rejected as directory', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ ok: true }));

      // Target = "."
      const resDot = runDeployGuardCli([`--source=${sourceDb}`, '--target=.']);
      assert.strictEqual(resDot.exitCode, 1);
      assert.match(resDot.stderr, /Target database path is a directory, not a file/);

      // Source = "."
      const resSrcDot = runDeployGuardCli(['--source=.', `--target=${sourceDb}`]);
      assert.strictEqual(resSrcDot.exitCode, 1);
      assert.match(resSrcDot.stderr, /Source database path is a directory, not a file/);
    });

    it('Dir 2.7: Direct API call safeDeployGuard throws Error when path is directory', () => {
      const subDir = path.join(tmpDir, 'api_test_dir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(sourceDb, JSON.stringify({ a: 1 }));

      // Source is directory
      assert.throws(() => {
        safeDeployGuard(subDir, sourceDb);
      }, /Source database path is a directory, not a file/);

      // Target is directory
      assert.throws(() => {
        safeDeployGuard(sourceDb, subDir);
      }, /Target database path is a directory, not a file/);
    });

    it('Dir 2.8: inspectDatabase directly flags directory path with format="directory" and parseable=false', () => {
      const subDir = path.join(tmpDir, 'inspect_dir');
      fs.mkdirSync(subDir);

      const inspection = inspectDatabase(subDir);
      assert.strictEqual(inspection.parseable, false);
      assert.strictEqual(inspection.format, 'directory');
      assert.strictEqual(inspection.count, 0);
      assert.match(inspection.error, /Path is a directory, not a regular file/);
    });
  });

  // =========================================================================
  // REQUIREMENT 3: GIT IGNORE & PACKAGE EXCLUSION ACROSS NESTED DIRECTORIES
  // =========================================================================
  describe('Requirement 3: Git Ignore & Package Exclusion Across Nested Directories', () => {
    it('Ignore 3.1: git check-ignore confirms all nested database and backup patterns are ignored', () => {
      const testPaths = [
        'data/local.db',
        'data/nested/local.db',
        'prisma/nested/backup.sqlite',
        'prisma/nested/deep/store.sqlite3',
        'src/nested/deep/level/test.sqlite',
        'arbitrary/path/mydb.db',
        'data/cache/session.db-wal',
        'data/cache/session.db-shm',
        'data/cache/session.db-journal',
        'backups/nested/2026/snapshot.bak',
        'deep/nested/dir/dump.sql',
        'storage/backups/dump.dump',
        'nested/folder/.env.production',
        'packages/server/.env.local',
        'secrets/.env.stage',
        '.env.secrets'
      ];

      const res = spawnSync('git', ['check-ignore', '-v', ...testPaths], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
      });

      assert.strictEqual(res.status, 0, 'git check-ignore must return 0 for ignored files');

      const outputLines = res.stdout.trim().split('\n').filter(Boolean);
      // Verify every tested path is present in git check-ignore output
      for (const p of testPaths) {
        const found = outputLines.some((line) => line.includes(p));
        assert.ok(found, `Expected ${p} to be matched by .gitignore, but line not found in output: ${res.stdout}`);
      }
    });

    it('Ignore 3.2: .env.example is explicitly preserved and NEVER git-ignored', () => {
      const res = spawnSync('git', ['check-ignore', '-v', '.env.example'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
      });
      // git check-ignore returns exit code 1 when the file is NOT ignored (i.e. tracked)
      assert.strictEqual(res.status, 1, '.env.example must NOT be ignored by git');
    });

    it('Ignore 3.3: .dockerignore contains recursive wildcards for nested databases and backups', () => {
      const dockerignoreContent = fs.readFileSync(path.join(PROJECT_ROOT, '.dockerignore'), 'utf8');
      const lines = dockerignoreContent.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

      // Check required recursive globbing patterns
      const requiredGlobs = [
        '**/*.sqlite*',
        '**/*.db*',
        '**/*.bak',
        '**/*.sql',
        '**/*.dump',
        '.env*'
      ];

      for (const req of requiredGlobs) {
        assert.ok(lines.includes(req), `.dockerignore must include explicit rule '${req}'`);
      }

      // Check unignore rule for .env.example
      assert.ok(lines.includes('!.env.example'), `.dockerignore must re-include '!.env.example'`);
    });

    it('Ignore 3.4: .vercelignore contains recursive wildcards for nested databases and backups', () => {
      const vercelignoreContent = fs.readFileSync(path.join(PROJECT_ROOT, '.vercelignore'), 'utf8');
      const lines = vercelignoreContent.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

      const requiredGlobs = [
        '**/*.sqlite*',
        '**/*.db*',
        '**/*.bak',
        '**/*.sql',
        '**/*.dump',
        '.env*'
      ];

      for (const req of requiredGlobs) {
        assert.ok(lines.includes(req), `.vercelignore must include explicit rule '${req}'`);
      }

      assert.ok(lines.includes('!.env.example'), `.vercelignore must re-include '!.env.example'`);
    });

    it('Ignore 3.5: npm pack --dry-run excludes nested database and backup files created on disk', () => {
      // Create nested dummy files to test real-world packaging exclusion
      const nestedDirs = [
        path.join(PROJECT_ROOT, 'data'),
        path.join(PROJECT_ROOT, 'prisma', 'nested')
      ];

      const createdFiles = [
        path.join(PROJECT_ROOT, 'data', 'local.db'),
        path.join(PROJECT_ROOT, 'prisma', 'nested', 'backup.sqlite'),
        path.join(PROJECT_ROOT, '.env.stage_test')
      ];

      try {
        for (const dir of nestedDirs) {
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        }
        for (const file of createdFiles) {
          fs.writeFileSync(file, 'DUMMY_SENSITIVE_DATA_FOR_CHALLENGER_TEST');
        }

        const packRes = spawnSync('npm', ['pack', '--dry-run', '--json'], {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          shell: true
        });

        assert.strictEqual(packRes.status, 0);

        let files = [];
        try {
          const info = JSON.parse(packRes.stdout);
          if (Array.isArray(info) && info[0]?.files) {
            files = info[0].files.map((f) => f.path);
          }
        } catch {
          files = packRes.stdout.split('\n');
        }

        for (const sensitivePath of ['data/local.db', 'prisma/nested/backup.sqlite', '.env.stage_test']) {
          const leaked = files.some((f) => f.includes(sensitivePath) || f.endsWith(path.basename(sensitivePath)));
          assert.strictEqual(leaked, false, `Forbidden file ${sensitivePath} leaked into npm pack tarball!`);
        }
      } finally {
        // Strict cleanup of created dummy files
        for (const file of createdFiles) {
          try {
            if (fs.existsSync(file)) fs.unlinkSync(file);
          } catch {}
        }
        try {
          if (fs.existsSync(path.join(PROJECT_ROOT, 'prisma', 'nested'))) {
            fs.rmdirSync(path.join(PROJECT_ROOT, 'prisma', 'nested'));
          }
          if (fs.existsSync(path.join(PROJECT_ROOT, 'data'))) {
            fs.rmdirSync(path.join(PROJECT_ROOT, 'data'));
          }
        } catch {}
      }
    });
  });
});
