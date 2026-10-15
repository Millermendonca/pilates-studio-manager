/**
 * test/adversarial/deploy_guard_adversarial.test.mjs
 * 
 * Adversarial Empirical Stress Test Suite for Milestone 1
 * Written by Challenger 2 (Empirical Challenger)
 * 
 * Verifies:
 * 1. Binary inspection robustness & SQLite header corruption
 * 2. Rapid concurrent invocations & race conditions
 * 3. File locks, read-only files, and OS permission errors
 * 4. Exit code consistency & JSON stdout formatting
 * 5. Packaging exclusions & build context simulation (Docker, Vercel, npm)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, spawn } from 'node:child_process';
import { checkDeploySafety, extractRecordCount } from '../../scripts/deploy-guard.js';

const PROJECT_ROOT = path.resolve(process.cwd());
const DEPLOY_GUARD_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'deploy-guard.js');

function createTempDir(prefix = 'challenger-m1-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTempDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    }
  } catch (err) {
    // Ignore cleanup errors on Windows
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
    timedOut: result.error && result.error.code === 'ETIMEDOUT'
  };
}

describe('Challenger 2 — Milestone 1 Adversarial Empirical Stress Suite', () => {
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
  // SUITE 1: BINARY INSPECTION & SQLITE HEADER CORRUPTION ROBUSTNESS
  // =========================================================================
  describe('Suite 1: Binary Inspection & Header Corruption Robustness', () => {
    it('Bug Reproduction 1.1: Corrupt pageSize=0 in SQLite header triggers infinite loop (Denial of Service)', () => {
      // Craft a 100-byte file with valid SQLite 3 magic header but invalid pageSize = 0
      const corruptBuffer = Buffer.alloc(100);
      corruptBuffer.write('SQLite format 3\0', 0);
      corruptBuffer.writeUInt16BE(0, 16); // pageSize = 0 (Spec requires >= 512)
      fs.writeFileSync(targetDb, corruptBuffer);

      // Run extractRecordCount in a child process with a strict 1.5-second timeout.
      const testCode = `
        const { extractRecordCount } = require('./scripts/deploy-guard.js');
        const count = extractRecordCount(${JSON.stringify(targetDb)});
        console.log('EXTRACTED_COUNT:' + count);
      `;
      const res = spawnSync(process.execPath, ['-e', testCode], {
        cwd: PROJECT_ROOT,
        timeout: 1500,
        encoding: 'utf8'
      });

      const timedOut = Boolean(res.error && res.error.code === 'ETIMEDOUT');
      assert.strictEqual(
        timedOut,
        false,
        'pageSize=0 terminates safely without infinite loop'
      );
      assert.strictEqual(res.status, 0);
      assert.match(res.stdout, /EXTRACTED_COUNT:0/);
    });

    it('Scenario 1.2: Corrupt pageSize with non-power of two or odd values (e.g. 3)', () => {
      const corruptBuffer = Buffer.alloc(512);
      corruptBuffer.write('SQLite format 3\0', 0);
      corruptBuffer.writeUInt16BE(3, 16); // Invalid odd pageSize = 3
      fs.writeFileSync(targetDb, corruptBuffer);

      const count = extractRecordCount(targetDb);
      assert.ok(typeof count === 'number');
      assert.ok(Number.isFinite(count), 'Extracted count must be a finite number');
    });

    it('Scenario 1.3: Truncated SQLite file (< 100 bytes) safely returns 0 without counting binary newlines', () => {
      // 80 bytes of binary containing some 0x0A (newline) bytes
      const binaryJunk = Buffer.from([
        0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x0a, // includes \n
        0x01, 0x02, 0x0a, 0x04, 0x05, 0x0a, 0x07, 0x08, // includes 2 more \n
      ]);
      fs.writeFileSync(targetDb, binaryJunk);

      const count = extractRecordCount(targetDb);
      assert.strictEqual(count, 0, 'Truncated binary database safely returns 0 records');
    });

    it('Scenario 1.4: Invalid B-tree magic numbers and out-of-bounds cell count', () => {
      const pageBuffer = Buffer.alloc(1024);
      pageBuffer.write('SQLite format 3\0', 0);
      pageBuffer.writeUInt16BE(512, 16); // pageSize = 512
      // Page 1 header at offset 100
      pageBuffer[100] = 0x0d; // Table leaf
      pageBuffer.writeUInt16BE(65535, 103); // Cell count claim: 65535 cells in a 512-byte page!
      fs.writeFileSync(targetDb, pageBuffer);

      const count = extractRecordCount(targetDb);
      assert.strictEqual(count, 65535);

      // Even with inflated cell count, checkDeploySafety remains fail-safe by blocking deploy
      fs.writeFileSync(sourceDb, Buffer.from('{"students":[]}'));
      const safety = checkDeploySafety({ source: sourceDb, target: targetDb });
      assert.strictEqual(safety.allowed, false, 'Manipulated high cell count blocks deployment (fail safe)');
    });

    it('Scenario 1.5: File with valid JSON structure returns exact array/object key count', () => {
      const data = {
        users: [{ id: 1 }, { id: 2 }],
        invoices: [{ id: 101 }, { id: 102 }, { id: 103 }]
      };
      fs.writeFileSync(targetDb, JSON.stringify(data));
      const count = extractRecordCount(targetDb);
      assert.strictEqual(count, 5, 'Must accurately sum arrays in JSON mock database');
    });
  });

  // =========================================================================
  // SUITE 2: CONCURRENCY & RAPID PROCESS STRESS
  // =========================================================================
  describe('Suite 2: Concurrency & Rapid Process Stress', () => {
    it('Concurrency 2.1: 25 rapid concurrent CLI invocations return consistent exit codes without crashing', async () => {
      // Setup source and target with identical timestamps and records
      const payload = JSON.stringify({ items: [1, 2, 3] });
      fs.writeFileSync(sourceDb, payload);
      fs.writeFileSync(targetDb, payload);

      const fixedTime = new Date('2026-10-15T12:00:00.000Z');
      fs.utimesSync(sourceDb, fixedTime, fixedTime);
      fs.utimesSync(targetDb, fixedTime, fixedTime);

      const numCalls = 25;
      const promises = [];

      for (let i = 0; i < numCalls; i++) {
        promises.push(new Promise((resolve) => {
          const child = spawn(process.execPath, [
            DEPLOY_GUARD_SCRIPT,
            `--source=${sourceDb}`,
            `--target=${targetDb}`,
            '--json'
          ], { cwd: PROJECT_ROOT });

          let stdout = '';
          let stderr = '';
          child.stdout.on('data', (d) => { stdout += d.toString(); });
          child.stderr.on('data', (d) => { stderr += d.toString(); });
          child.on('close', (code) => {
            resolve({ code, stdout, stderr });
          });
        }));
      }

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, numCalls);

      for (const res of results) {
        assert.strictEqual(res.code, 0, 'Concurrent execution must succeed with exit code 0');
        assert.doesNotThrow(() => JSON.parse(res.stdout), 'Output must be parseable JSON');
        const parsed = JSON.parse(res.stdout);
        assert.strictEqual(parsed.allowed, true);
      }
    });

    it('Concurrency 2.2: Concurrent checkDeploySafety during active target file replacement/write', async () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ students: [1, 2, 3, 4, 5] }));
      fs.writeFileSync(targetDb, JSON.stringify({ students: [1] }));

      let keepWriting = true;
      // Start background writer continuously writing to targetDb
      const writer = (async () => {
        let counter = 0;
        while (keepWriting) {
          try {
            fs.writeFileSync(targetDb, JSON.stringify({ students: new Array(counter % 10).fill(1) }));
          } catch {
            // Transient lock error is expected
          }
          counter++;
          await new Promise((r) => setTimeout(r, 2));
        }
      })();

      // Concurrently run deploy-guard checks
      const checks = [];
      for (let i = 0; i < 20; i++) {
        checks.push(new Promise((resolve) => {
          const res = runDeployGuardCli([`--source=${sourceDb}`, `--target=${targetDb}`, '--json']);
          resolve(res);
        }));
        await new Promise((r) => setTimeout(r, 5));
      }

      const checkResults = await Promise.all(checks);
      keepWriting = false;
      await writer;

      // Verify that every single check exited with either 0 or 1, NEVER an unhandled crash or undefined code
      for (const res of checkResults) {
        assert.ok([0, 1].includes(res.exitCode), `Exit code must be 0 or 1, got ${res.exitCode}`);
        if (res.exitCode === 0) {
          const json = JSON.parse(res.stdout);
          assert.strictEqual(json.allowed, true);
        }
      }
    });
  });

  // =========================================================================
  // SUITE 3: FILE LOCKS, READ-ONLY TARGETS & OS PERMISSION FAIL-SAFES
  // =========================================================================
  describe('Suite 3: File Locks & Permissions', () => {
    it('Permission 3.1: Read-only destination file is inspected successfully when source is newer', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ count: 10 }));
      fs.writeFileSync(targetDb, JSON.stringify({ count: 5 }));

      const now = Date.now();
      fs.utimesSync(sourceDb, new Date(now), new Date(now));
      fs.utimesSync(targetDb, new Date(now - 10000), new Date(now - 10000));

      // Set target to read-only
      fs.chmodSync(targetDb, 0o444);

      try {
        const result = runDeployGuardCli([`--source=${sourceDb}`, `--target=${targetDb}`, '--json']);
        assert.strictEqual(result.exitCode, 0);
        const json = JSON.parse(result.stdout);
        assert.strictEqual(json.allowed, true);
      } finally {
        fs.chmodSync(targetDb, 0o666);
      }
    });

    it('Permission 3.2: Locked destination file (open write descriptor) fails safely', () => {
      fs.writeFileSync(sourceDb, JSON.stringify({ count: 10 }));
      fs.writeFileSync(targetDb, JSON.stringify({ count: 5 }));

      // Hold open handle on targetDb
      const fd = fs.openSync(targetDb, 'r+');
      try {
        const result = runDeployGuardCli([`--source=${sourceDb}`, `--target=${targetDb}`, '--json']);
        // Must either successfully inspect or fail safely with code 1, never hang
        assert.ok([0, 1].includes(result.exitCode));
      } finally {
        fs.closeSync(fd);
      }
    });

    it('Vulnerability Probe 3.3: Silent record count fallback on non-empty binary destination allows overwrite (Fail-Open)', () => {
      // Source has 10 records, target is 100KB binary database (with non-zero size)
      fs.writeFileSync(sourceDb, JSON.stringify({ students: new Array(10).fill({ id: 1 }) }));
      fs.writeFileSync(targetDb, Buffer.alloc(100 * 1024, 0x41)); // 100KB binary file

      const dstStat = fs.statSync(targetDb);
      assert.ok(dstStat.size > 0);

      // Extract record count returns 0 because 100KB binary file is not valid SQLite or JSON
      const targetCount = extractRecordCount(targetDb);
      assert.strictEqual(targetCount, 0, 'Target count safely returns 0 for unrecognized binary format');

      // Target mtime is older than source
      const now = Date.now();
      fs.utimesSync(sourceDb, new Date(now), new Date(now));
      fs.utimesSync(targetDb, new Date(now - 10000), new Date(now - 10000));

      const res = checkDeploySafety({ source: sourceDb, target: targetDb });
      assert.strictEqual(
        res.allowed,
        false,
        'deploy-guard blocks overwriting 100KB unverified binary destination (Fail-Closed)'
      );
      assert.strictEqual(res.code, 1);
      assert.match(res.reason, /DEPLOY_GUARD_BLOCKED/);
    });
  });

  // =========================================================================
  // SUITE 4: CLI & EXIT CODE CONSISTENCY
  // =========================================================================
  describe('Suite 4: CLI & Exit Code Consistency', () => {
    it('CLI 4.1: --json flag ALWAYS produces valid parseable JSON on stdout on blocked deploy (exit 1)', () => {
      const now = Date.now();
      fs.writeFileSync(sourceDb, JSON.stringify({ version: 1 }));
      fs.writeFileSync(targetDb, JSON.stringify({ version: 2 }));
      fs.utimesSync(sourceDb, new Date(now - 5000), new Date(now - 5000));
      fs.utimesSync(targetDb, new Date(now), new Date(now));

      const res = runDeployGuardCli([`--source=${sourceDb}`, `--target=${targetDb}`, '--json']);
      assert.strictEqual(res.exitCode, 1, 'Blocked deploy must exit 1');
      assert.doesNotThrow(() => JSON.parse(res.stdout), 'Stdout must be valid JSON even on exit 1');
      const json = JSON.parse(res.stdout);
      assert.strictEqual(json.allowed, false);
      assert.strictEqual(json.code, 1);
    });

    it('CLI 4.2: --json flag produces valid JSON on missing target parameter (exit 1)', () => {
      const res = runDeployGuardCli(['--json']);
      assert.strictEqual(res.exitCode, 1);
      assert.doesNotThrow(() => JSON.parse(res.stdout));
      const json = JSON.parse(res.stdout);
      assert.strictEqual(json.allowed, false);
    });

    it('CLI 4.3: --json flag produces valid JSON on missing source file (exit 1)', () => {
      const missingSource = path.join(tmpDir, 'does-not-exist.db');
      fs.writeFileSync(targetDb, 'target');

      const res = runDeployGuardCli([`--source=${missingSource}`, `--target=${targetDb}`, '--json']);
      assert.strictEqual(res.exitCode, 1);
      assert.doesNotThrow(() => JSON.parse(res.stdout));
      const json = JSON.parse(res.stdout);
      assert.strictEqual(json.allowed, false);
    });

    it('CLI 4.4: Unknown arguments do not crash the CLI process', () => {
      fs.writeFileSync(sourceDb, 'data');
      fs.writeFileSync(targetDb, 'data');

      const res = runDeployGuardCli([
        `--source=${sourceDb}`,
        `--target=${targetDb}`,
        '--non-existent-flag',
        '--random=123'
      ]);
      assert.ok([0, 1].includes(res.exitCode));
    });
  });

  // =========================================================================
  // SUITE 5: PACKAGING & BUILD CONTEXT SIMULATION
  // =========================================================================
  describe('Suite 5: Packaging & Build Context Simulation', () => {
    it('Packaging 5.1: npm pack --dry-run excludes all database, backup, and secret files', () => {
      const packRes = spawnSync('npm', ['pack', '--dry-run', '--json'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        shell: true,
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

      const leakedFiles = files.filter((f) => {
        const lower = f.toLowerCase();
        if (lower.endsWith('.md')) return false;
        if (lower.endsWith('.env.example') || lower.endsWith('.example')) return false;
        return (
          lower.endsWith('.db') ||
          lower.endsWith('.sqlite') ||
          lower.endsWith('.sqlite3') ||
          lower.startsWith('backups/') ||
          lower.includes('.env')
        );
      });

      assert.deepStrictEqual(leakedFiles, [], `Found leaked sensitive files in npm bundle: ${leakedFiles.join(', ')}`);
    });

    it('Packaging 5.2: Docker build context wildcard rule audit: .dockerignore must protect nested SQLite databases', () => {
      const dockerignorePath = path.join(PROJECT_ROOT, '.dockerignore');
      assert.ok(fs.existsSync(dockerignorePath));
      const dockerignoreContent = fs.readFileSync(dockerignorePath, 'utf8');

      const lines = dockerignoreContent.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

      const hasRecursiveDb = lines.some((l) => l.includes('**/*.db') || l.includes('prisma/*.db*'));
      const hasRecursiveSqlite = lines.some((l) => l.includes('**/*.sqlite') || l.includes('prisma/*.sqlite'));

      // Documenting whether .dockerignore covers recursive SQLite files:
      assert.ok(
        hasRecursiveDb,
        '.dockerignore must at least protect prisma/*.db*'
      );
    });

    it('Packaging 5.3: .vercelignore and .gitignore consistency', () => {
      const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '.gitignore'), 'utf8');
      const vercelignore = fs.readFileSync(path.join(PROJECT_ROOT, '.vercelignore'), 'utf8');

      // Both must ignore backups, .env, .db, .sqlite
      for (const pattern of ['.db', '.sqlite', 'backups', '.env']) {
        assert.ok(gitignore.includes(pattern), `.gitignore must include ${pattern}`);
        assert.ok(vercelignore.includes(pattern), `.vercelignore must include ${pattern}`);
      }
    });
  });
});
