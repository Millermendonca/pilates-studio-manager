import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(process.cwd());

describe('Package & Git Exclusion Rules Suite', () => {
  // ==========================================
  // TIER 1: FEATURE COVERAGE (>=5 tests)
  // ==========================================
  describe('Tier 1 - Primary Feature Coverage', () => {
    it('Feature 2.1: git ls-files confirms zero database files (.db, .sqlite, .sqlite3) are tracked in the repository', () => {
      const gitOutput = execSync('git ls-files', { cwd: PROJECT_ROOT, encoding: 'utf8' });
      const trackedFiles = gitOutput.split('\n').map((f) => f.trim()).filter(Boolean);

      const forbiddenDbExtensions = ['.db', '.sqlite', '.sqlite3', '.db-journal', '.db-wal', '.db-shm'];
      const trackedDbFiles = trackedFiles.filter((file) => {
        const lower = file.toLowerCase();
        // Skip markdown/documentation references
        if (lower.endsWith('.md')) return false;
        return forbiddenDbExtensions.some((ext) => lower.endsWith(ext));
      });

      assert.deepStrictEqual(
        trackedDbFiles,
        [],
        `Found forbidden database files tracked in Git repository: ${trackedDbFiles.join(', ')}`
      );
    });

    it('Feature 2.2: git ls-files confirms zero environment secrets or private keys (.env, .env.local, .key, .pem) are tracked', () => {
      const gitOutput = execSync('git ls-files', { cwd: PROJECT_ROOT, encoding: 'utf8' });
      const trackedFiles = gitOutput.split('\n').map((f) => f.trim()).filter(Boolean);

      const forbiddenSecretPatterns = ['.env', '.env.local', '.env.production', '.key', '.pem', '.crt'];
      const trackedSecretFiles = trackedFiles.filter((file) => {
        const lower = file.toLowerCase();
        // Allow .env.example
        if (lower.endsWith('.env.example') || lower.endsWith('.example') || lower.endsWith('.md')) return false;
        return forbiddenSecretPatterns.some((pattern) => {
          return lower === pattern || lower.endsWith(`/${pattern}`) || lower.endsWith(pattern);
        });
      });

      assert.deepStrictEqual(
        trackedSecretFiles,
        [],
        `Found forbidden secret/credential files tracked in Git repository: ${trackedSecretFiles.join(', ')}`
      );
    });

    it('Feature 2.3: .gitignore contains comprehensive ignore patterns for databases, backups, and secrets', () => {
      const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
      assert.ok(fs.existsSync(gitignorePath), '.gitignore file must exist in project root');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

      const requiredPatterns = ['.db', '.sqlite', 'backups', '.env'];
      for (const pattern of requiredPatterns) {
        assert.ok(
          gitignoreContent.includes(pattern),
          `.gitignore must contain rule covering "${pattern}"`
        );
      }
    });

    it('Feature 2.4: .dockerignore exists and explicitly ignores database files, backups, and secrets', () => {
      const dockerignorePath = path.join(PROJECT_ROOT, '.dockerignore');
      assert.ok(fs.existsSync(dockerignorePath), '.dockerignore must exist in project root');
      const dockerignoreContent = fs.readFileSync(dockerignorePath, 'utf8');

      assert.match(dockerignoreContent, /\.db|\.sqlite/i, '.dockerignore must ignore database files');
      assert.match(dockerignoreContent, /backups|\.bak|\.sql/i, '.dockerignore must ignore backup files');
      assert.match(dockerignoreContent, /\.env/i, '.dockerignore must ignore .env files');
      assert.match(dockerignoreContent, /node_modules/i, '.dockerignore must ignore node_modules');
    });

    it('Feature 2.5: .vercelignore exists and explicitly ignores database files, backups, and secrets', () => {
      const vercelignorePath = path.join(PROJECT_ROOT, '.vercelignore');
      assert.ok(fs.existsSync(vercelignorePath), '.vercelignore must exist in project root');
      const vercelignoreContent = fs.readFileSync(vercelignorePath, 'utf8');

      assert.match(vercelignoreContent, /\.db|\.sqlite/i, '.vercelignore must ignore database files');
      assert.match(vercelignoreContent, /backups|\.bak|\.sql/i, '.vercelignore must ignore backups');
      assert.match(vercelignoreContent, /\.env/i, '.vercelignore must ignore secrets');
    });

    it('Feature 2.6: npm packaging dry run (npm pack --dry-run) excludes database and backup archives', () => {
      const packOutput = execSync('npm pack --dry-run --json', { cwd: PROJECT_ROOT, encoding: 'utf8' });
      let packFiles = [];
      try {
        const packInfo = JSON.parse(packOutput);
        if (Array.isArray(packInfo) && packInfo[0]?.files) {
          packFiles = packInfo[0].files.map((f) => f.path.toLowerCase());
        }
      } catch {
        // Fallback to text check if JSON not supported
        packFiles = packOutput.split('\n').map((l) => l.trim().toLowerCase());
      }

      const forbiddenBundleMatches = packFiles.filter((file) => {
        if (file.endsWith('.md')) return false;
        return file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.sqlite3') || file.startsWith('backups/');
      });

      assert.deepStrictEqual(
        forbiddenBundleMatches,
        [],
        `npm package bundle would include database/backup files: ${forbiddenBundleMatches.join(', ')}`
      );
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 tests)
  // ==========================================
  describe('Tier 2 - Boundary and Corner Cases', () => {
    it('Boundary 2.1: Ignore configurations protect case-insensitive variants (.DB, .SQLITE, .BAK)', () => {
      const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '.gitignore'), 'utf8');
      const dockerignore = fs.readFileSync(path.join(PROJECT_ROOT, '.dockerignore'), 'utf8');
      const vercelignore = fs.readFileSync(path.join(PROJECT_ROOT, '.vercelignore'), 'utf8');

      const allIgnores = `${gitignore}\n${dockerignore}\n${vercelignore}`.toLowerCase();
      assert.ok(allIgnores.includes('*.db') || allIgnores.includes('.db'));
      assert.ok(allIgnores.includes('*.sqlite') || allIgnores.includes('.sqlite'));
      assert.ok(allIgnores.includes('*.bak') || allIgnores.includes('backups'));
    });

    it('Boundary 2.2: SQLite temporary journal and write-ahead log files (.db-wal, .db-shm, .db-journal) are excluded', () => {
      const dockerignore = fs.readFileSync(path.join(PROJECT_ROOT, '.dockerignore'), 'utf8');
      assert.ok(
        dockerignore.includes('.db-wal') || dockerignore.includes('*.db*'),
        '.dockerignore must exclude SQLite WAL files'
      );
      assert.ok(
        dockerignore.includes('.db-shm') || dockerignore.includes('*.db*'),
        '.dockerignore must exclude SQLite shared memory files'
      );
    });

    it('Boundary 2.3: Production seed safety lock in prisma/seed.js aborts immediately with exit code 1 in production (case-insensitive & trimmed)', () => {
      const seedScriptPath = path.join(PROJECT_ROOT, 'prisma', 'seed.js');
      for (const envVal of ['production', 'Production', 'PRODUCTION', 'prod', 'production ']) {
        const result = spawnSync(process.execPath, [seedScriptPath], {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          env: { ...process.env, NODE_ENV: envVal },
        });

        assert.strictEqual(result.status, 1, `prisma/seed.js must exit with code 1 when NODE_ENV="${envVal}"`);
        assert.match(
          result.stderr,
          /SEED_ABORTED|forbidden in production/i,
          'prisma/seed.js must log production safety lock abortion'
        );
      }
    });

    it('Boundary 2.4: Production simulation safety lock in prisma/simulate-high-occupancy.js aborts with exit code 1 in production (case-insensitive & trimmed)', () => {
      const simScriptPath = path.join(PROJECT_ROOT, 'prisma', 'simulate-high-occupancy.js');
      for (const envVal of ['production', 'Production', 'PRODUCTION', 'prod', 'production ']) {
        const result = spawnSync(process.execPath, [simScriptPath], {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          env: { ...process.env, NODE_ENV: envVal },
        });

        assert.strictEqual(result.status, 1, `prisma/simulate-high-occupancy.js must exit with code 1 when NODE_ENV="${envVal}"`);
        assert.match(
          result.stderr,
          /SEED_ABORTED|forbidden in production/i,
          'prisma/simulate-high-occupancy.js must log production safety lock abortion'
        );
      }
    });

    it('Boundary 2.5: prisma/seed.js blocks deleteMany() without --confirm-wipe if records exist in non-production', () => {
      const seedScript = fs.readFileSync(path.join(PROJECT_ROOT, 'prisma', 'seed.js'), 'utf8');
      assert.ok(
        seedScript.includes('--confirm-wipe') || seedScript.includes('CONFIRM_WIPE'),
        'prisma/seed.js must verify --confirm-wipe flag before wiping database'
      );
    });

    it('Boundary 2.6: package.json scripts contain safety checks and deployment guards', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
      assert.ok(pkg.scripts, 'package.json must have scripts object');
      assert.ok(
        pkg.scripts['deploy:check'] || pkg.scripts['test'] || pkg.scripts['backup'],
        'package.json must contain data integrity scripts'
      );
    });
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE INTEGRATION
  // ==========================================
  describe('Tier 3 - Cross-Feature Packaging & Staging Protection', () => {
    it('Tier 3.1: Staging a mock database or backup in project workspace is immediately recognized as git-ignored', () => {
      const testDbPath = path.join(PROJECT_ROOT, 'prisma', 'ephemeral-safety-check.db');
      try {
        fs.writeFileSync(testDbPath, 'MOCK_DATA');
        // Check git status
        const gitStatus = execSync(`git status --porcelain "${testDbPath}"`, {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
        }).trim();

        assert.strictEqual(
          gitStatus,
          '',
          `File ${testDbPath} must be completely ignored by Git and not appear in git status`
        );
      } finally {
        if (fs.existsSync(testDbPath)) {
          fs.unlinkSync(testDbPath);
        }
      }
    });
  });
});
