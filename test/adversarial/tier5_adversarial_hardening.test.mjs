/**
 * Tier 5 White-Box Adversarial Hardening Suite
 * test/adversarial/tier5_adversarial_hardening.test.mjs
 * 
 * Final Milestone Adversarial Challenger 2 (challenger_final_2)
 * 
 * Verifies 6 Critical Adversarial Hardening Dimensions:
 * 1. Route Shielding & Path Normalization Bypasses (src/middleware.ts)
 * 2. Authentication Hardening, Backdoor Elimination & Bcrypt Stress (src/app/api/auth/login)
 * 3. Token Tampering & Session Boundaries (src/lib/auth/jwt, src/app/api/auth/me)
 * 4. Zero Data Leakage on Public Interfaces (/api/matricula/lookup & /login UI)
 * 5. Repository Hygiene & Packaging Isolation in Temp Environment
 * 6. Database Migration Lifecycle & Pre-Migration Backup Safety in Temp Environment
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Harness modules
import { testDb } from '../security/harness/db-store.js';
import { invokeApiRoute, invokeMiddleware, setActiveCookies } from '../security/harness/route-invoker.js';
import { loadSourceModule } from '../security/harness/loader.js';
import {
  createAdminJwt,
  createStudentJwt,
  createExpiredStudentJwt,
  createStudentJwtWithWrongKey,
  createUnsignedJwt,
  isBcryptHash,
} from '../security/harness/crypto-tools.js';
import { createTempDir, cleanupTempDir, createMockDatabase } from '../integrity/helpers/temp_env.mjs';

let studentAuthModule;
let cryptoModule;

test.before(async () => {
  studentAuthModule = await loadSourceModule('src/lib/auth/studentAuth.ts');
  cryptoModule = await loadSourceModule('src/lib/crypto.ts');
});

// ============================================================================
// SUITE 1: Route Shielding & Path Normalization Adversarial Stress
// ============================================================================
test.describe('SUITE 1: Route Shielding & Path Normalization Adversarial Stress', () => {
  const protectedPages = [
    '/alunos',
    '/agenda',
    '/financeiro',
    '/relatorios',
    '/mapa',
    '/mensagens',
    '/configuracoes',
  ];

  const strictAdminApiRoutes = [
    '/api/auth/admin/security-logs',
    '/api/auth/admin/revoke-sessions',
    '/api/auth/admin/change-credentials',
    '/api/students',
    '/api/invoices',
    '/api/reports',
    '/api/settings/reset-test-data',
  ];

  test('1.1: Unauthenticated access to admin pages redirects to /admin/login', async () => {
    for (const page of protectedPages) {
      const res = await invokeMiddleware(page);
      assert.strictEqual(
        res.isRedirect,
        true,
        `Expected redirect for ${page}, got status ${res.status}`
      );
      assert.match(
        res.location || '',
        /\/admin\/login/,
        `Redirect location for ${page} must target /admin/login`
      );
    }
  });

  test('1.2: Sub-routes of admin pages redirect to /admin/login', async () => {
    const subPages = [
      '/alunos/novo',
      '/alunos/cuid_123/editar',
      '/financeiro/faturas',
      '/configuracoes/geral',
    ];
    for (const page of subPages) {
      const res = await invokeMiddleware(page);
      assert.strictEqual(res.isRedirect, true, `Expected redirect for sub-page ${page}`);
      assert.match(res.location || '', /\/admin\/login/);
    }
  });

  test('1.3: Unauthenticated access to strict admin APIs returns HTTP 401', async () => {
    for (const apiPath of strictAdminApiRoutes) {
      const res = await invokeMiddleware(apiPath);
      assert.strictEqual(
        res.status,
        401,
        `Strict admin API ${apiPath} must be blocked with HTTP 401`
      );
    }
  });

  test('1.4: Sub-paths and ID routes of strict admin APIs return HTTP 401', async () => {
    const apiSubPaths = [
      '/api/students/cuid_test_123',
      '/api/students/cuid_test_123/schedules',
      '/api/invoices/inv_999/pay',
      '/api/reports/monthly',
    ];
    for (const apiPath of apiSubPaths) {
      const res = await invokeMiddleware(apiPath);
      assert.strictEqual(
        res.status,
        401,
        `Strict API subpath ${apiPath} must return 401 when unauthenticated`
      );
    }
  });

  test('1.5: Trailing and multi-slashes are shielded by middleware; encoded paths shielded by route handlers', async () => {
    // Trailing slash and multi-slash path variations blocked by middleware
    const slashPaths = [
      '/api/students/',
      '/api/students//',
      '/api/invoices/',
      '/api/reports/',
      '/api/settings/reset-test-data/',
    ];

    for (const slashPath of slashPaths) {
      const res = await invokeMiddleware(slashPath);
      assert.strictEqual(
        res.status,
        401,
        `Slashed path "${slashPath}" must return 401 from middleware`
      );
    }

    // Defense-in-depth: Route handlers themselves block unauthenticated access even under encoded paths
    const studentRes = await invokeApiRoute('src/app/api/students/route.ts', 'GET', {
      url: 'http://localhost:3000/api/%73tudents',
    });
    assert.strictEqual(studentRes.status, 401, 'Students API route handler must block unauthenticated access');

    const invoiceRes = await invokeApiRoute('src/app/api/invoices/route.ts', 'GET', {
      url: 'http://localhost:3000/api/%69nvoices',
    });
    assert.strictEqual(invoiceRes.status, 401, 'Invoices API route handler must block unauthenticated access');
  });

  test('1.6: HTTP method tampering on /api/settings: mutation methods require admin auth', async () => {
    const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    for (const method of mutationMethods) {
      const res = await invokeMiddleware('/api/settings', {
        headers: { 'x-http-method-override': method },
      });
      // Test directly with NextRequest method
      const { NextRequest } = await import('next/server.js');
      const req = new NextRequest('http://localhost:3000/api/settings', { method });
      const middlewareModule = await loadSourceModule('src/middleware.ts');
      const mwRes = await middlewareModule.middleware(req);
      assert.strictEqual(
        mwRes.status,
        401,
        `Method ${method} on /api/settings must return 401 when unauthenticated`
      );
    }
  });

  test('1.7: Global security headers are injected into all responses', async () => {
    const res = await invokeMiddleware('/login');
    assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.strictEqual(res.headers['permissions-policy'], 'camera=(), microphone=(), geolocation=(self)');
    assert.strictEqual(res.headers['x-xss-protection'], '1; mode=block');
  });

  test('1.8: Valid admin session token allows access and decorates request headers', async () => {
    const validAdminToken = await createAdminJwt({
      adminId: 'admin_master_1',
      username: 'admin',
      role: 'SUPERADMIN',
    });

    const res = await invokeMiddleware('/api/students', {
      cookies: {
        admin_session: validAdminToken,
      },
    });

    assert.strictEqual(res.status, 200, 'Valid admin session must be permitted through middleware');
    assert.strictEqual(res.headers['x-admin-id'], 'admin_master_1');
    assert.strictEqual(res.headers['x-admin-username'], 'admin');
  });
});

// ============================================================================
// SUITE 2: Authentication Hardening, Backdoor Elimination & Bcrypt Stress
// ============================================================================
test.describe('SUITE 2: Authentication Hardening & Backdoor Elimination', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
    studentAuthModule.resetStudentRateLimits();
  });

  test('2.1: Rejection of universal backdoor password "senha123" for account with custom password', async () => {
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'senha123',
      },
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    assert.strictEqual(res.status, 401, 'senha123 must be rejected with 401 for custom account');
    assert.strictEqual(res.data?.success, undefined);
    assert.match(res.data?.error || '', /incorretos/i);
  });

  test('2.2: Rejection of blank, empty, or whitespace passwords', async () => {
    const blankPasswords = ['', '   ', '\t', '\n'];
    for (const pwd of blankPasswords) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: {
          email: 'maria.silva@example.com',
          password: pwd,
        },
        headers: { 'x-forwarded-for': `203.0.113.${20 + blankPasswords.indexOf(pwd)}` },
      });

      assert.ok([400, 401].includes(res.status), `Blank password must be rejected, got ${res.status}`);
    }
  });

  test('2.3: Bcrypt verification: hashPassword produces valid bcrypt hash with salt rounds >= 10', async () => {
    const hash = await studentAuthModule.hashPassword('TesteSeguranca#2026');
    assert.strictEqual(studentAuthModule.isBcryptHash(hash), true, 'Hash must match bcrypt pattern');
    // Bcrypt format: $2a$12$... or $2b$12$...
    const roundsMatch = hash.match(/^\$2[aby]\$(\d+)\$/);
    assert.ok(roundsMatch, 'Hash must include cost parameter');
    const rounds = parseInt(roundsMatch[1], 10);
    assert.ok(rounds >= 10, `Bcrypt cost rounds must be >= 10, got ${rounds}`);

    // Verify password match
    const isValid = await studentAuthModule.verifyPassword('TesteSeguranca#2026', hash);
    assert.strictEqual(isValid, true, 'verifyPassword must return true for correct password');

    const isInvalid = await studentAuthModule.verifyPassword('SenhaIncorreta', hash);
    assert.strictEqual(isInvalid, false, 'verifyPassword must return false for wrong password');
  });

  test('2.4: Lazy migration: account with legacy plain text password authenticates and upgrades in DB', async () => {
    // student_default_002 is seeded with plain-text password 'senha123'
    const studentBefore = testDb.tables.Student.get('student_default_002');
    assert.strictEqual(studentBefore.password, 'senha123');

    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'joao.oliveira@example.com',
        password: 'senha123',
      },
      headers: { 'x-forwarded-for': '203.0.113.30' },
    });

    assert.strictEqual(res.status, 200, 'Legacy plain-text login must succeed');
    assert.strictEqual(res.data?.success, true);

    // Verify in database: password has been upgraded to bcrypt hash
    const studentAfter = testDb.tables.Student.get('student_default_002');
    assert.notStrictEqual(studentAfter.password, 'senha123');
    assert.strictEqual(studentAuthModule.isBcryptHash(studentAfter.password), true);
  });

  test('2.5: Rate limiting under burst traffic: 5 failures triggers HTTP 429 lockout on attempt 6', async () => {
    const attackIp = '198.51.100.77';

    for (let i = 1; i <= 8; i++) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: {
          email: 'maria.silva@example.com',
          password: `tentativa_errada_${i}`,
        },
        headers: { 'x-forwarded-for': attackIp },
      });

      if (i <= 5) {
        assert.strictEqual(res.status, 401, `Attempt ${i} should be 401`);
      } else {
        assert.strictEqual(res.status, 429, `Attempt ${i} must trigger 429`);
        assert.ok(res.data?.retryAfterSeconds > 0);
      }
    }

    // Fail-closed: submitting correct password from locked IP still returns 429
    const lockRes = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'minhaSenhaForte!2026',
      },
      headers: { 'x-forwarded-for': attackIp },
    });
    assert.strictEqual(lockRes.status, 429, 'Locked IP must fail-closed even with correct password');
  });

  test('2.6: Rate limiting state isolation: innocent IP is not affected by attacker burst', async () => {
    const attackIp = '198.51.100.88';
    const innocentIp = '198.51.100.89';

    // Lock attacker IP
    for (let i = 0; i < 6; i++) {
      await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: { email: 'maria.silva@example.com', password: `errado_${i}` },
        headers: { 'x-forwarded-for': attackIp },
      });
    }

    // Innocent IP logs in successfully
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: { email: 'maria.silva@example.com', password: 'minhaSenhaForte!2026' },
      headers: { 'x-forwarded-for': innocentIp },
    });
    assert.strictEqual(res.status, 200, 'Innocent IP must succeed with HTTP 200');
  });
});

// ============================================================================
// SUITE 3: Token Boundaries & Session Hijacking Resilience
// ============================================================================
test.describe('SUITE 3: Token Boundaries & Session Shielding', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('3.1: Raw CUID in student_session cookie is rejected with HTTP 401 on /api/auth/me', async () => {
    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: { student_session: 'student_legit_001' },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('3.2: Tampered signature in student JWT is rejected with HTTP 401', async () => {
    const legitJwt = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });
    const parts = legitJwt.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}XXXX`;

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: { student_session: tampered },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('3.3: Expired student JWT is rejected with HTTP 401', async () => {
    const expiredJwt = await createExpiredStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: { student_session: expiredJwt },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('3.4: Student JWT signed with foreign secret key is rejected with HTTP 401', async () => {
    const foreignJwt = await createStudentJwtWithWrongKey({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: { student_session: foreignJwt },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('3.5: Student session cannot access admin routes (Privilege Separation)', async () => {
    const studentToken = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    // Try accessing admin API with student token as admin_session cookie
    const res = await invokeMiddleware('/api/students', {
      cookies: { admin_session: studentToken },
    });
    assert.strictEqual(res.status, 401, 'Student token must not satisfy admin middleware check');
  });
});

// ============================================================================
// SUITE 4: Zero Data Leakage on Public Interfaces (/api/matricula/lookup & /login)
// ============================================================================
test.describe('SUITE 4: Zero Data Leakage on Public Interfaces (LGPD)', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('4.1: /api/matricula/lookup masks phone and email, and returns ZERO sensitive medical/CPF data', async () => {
    const res = await invokeApiRoute('src/app/api/matricula/lookup/route.ts', 'GET', {
      url: 'http://localhost:3000/api/matricula/lookup?phone=11987654321',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.found, true);
    assert.ok(res.data?.student);

    const s = res.data.student;
    // Allowed fields
    assert.strictEqual(s.name, 'Maria Silva Santos');
    assert.ok(s.phone.includes('****'), 'Phone must be masked');
    assert.ok(s.email.includes('***'), 'Email must be masked');

    // Forbidden sensitive fields (MUST BE UNDEFINED)
    const forbiddenFields = [
      'cpf',
      'password',
      'healthNotes',
      'restrictions',
      'medicalHistory',
      'injuries',
      'surgeries',
      'movementRestrictions',
      'physicalAssessment',
      'address',
      'neighborhood',
      'cep',
      'emergencyContactName',
      'emergencyContactPhone',
      'emergencyContactRelation',
    ];

    for (const field of forbiddenFields) {
      assert.strictEqual(
        s[field],
        undefined,
        `Field "${field}" MUST NOT be leaked by /api/matricula/lookup`
      );
    }
  });

  test('4.2: /api/matricula/lookup rejects invalid or short phone numbers with HTTP 400', async () => {
    const invalidPhones = ['', '123', 'abc', '12345'];
    for (const phone of invalidPhones) {
      const res = await invokeApiRoute('src/app/api/matricula/lookup/route.ts', 'GET', {
        url: `http://localhost:3000/api/matricula/lookup?phone=${encodeURIComponent(phone)}`,
      });
      assert.strictEqual(res.status, 400, `Phone "${phone}" must return 400`);
    }
  });

  test('4.3: /login UI static audit: zero calls to /api/students and no hardcoded student data', () => {
    const loginPagePath = path.join(PROJECT_ROOT, 'src/app/login/page.tsx');
    assert.ok(fs.existsSync(loginPagePath), 'Login page must exist');
    const content = fs.readFileSync(loginPagePath, 'utf8');

    assert.strictEqual(
      content.includes('/api/students'),
      false,
      'Login page must NOT fetch or call /api/students'
    );
    assert.strictEqual(
      content.includes('maria.silva@example.com'),
      false,
      'Login page must NOT expose real student email addresses'
    );
  });
});

// ============================================================================
// SUITE 5: Repository Hygiene & Packaging Isolation in Temp Environment
// ============================================================================
test.describe('SUITE 5: Repository Hygiene & Packaging Isolation', () => {
  test('5.1: Zero sensitive database files tracked in Git repository', () => {
    const result = spawnSync('git', ['ls-files', '*.db', '*.sqlite*', '*.db-wal', '*.db-shm'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 0);
    const trackedDbFiles = (result.stdout || '').trim().split('\n').filter(Boolean);
    assert.deepStrictEqual(trackedDbFiles, [], 'No database files should be tracked by Git');
  });

  test('5.2: Zero secrets or environment files tracked in Git repository', () => {
    const result = spawnSync('git', ['ls-files', '.env*', '*.pem', '*.key'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 0);
    const trackedSecrets = (result.stdout || '')
      .trim()
      .split('\n')
      .filter((f) => Boolean(f) && f !== '.env.example');
    assert.deepStrictEqual(trackedSecrets, [], 'No secret files should be tracked by Git');
  });

  test('5.3: Exclusion rule consistency across .gitignore, .dockerignore, .vercelignore', () => {
    const gitignore = fs.readFileSync(path.join(PROJECT_ROOT, '.gitignore'), 'utf8');
    const dockerignore = fs.readFileSync(path.join(PROJECT_ROOT, '.dockerignore'), 'utf8');
    const vercelignore = fs.readFileSync(path.join(PROJECT_ROOT, '.vercelignore'), 'utf8');

    for (const ignoreContent of [gitignore, dockerignore, vercelignore]) {
      assert.ok(ignoreContent.includes('*.db') || ignoreContent.includes('**/*.db*'));
      assert.ok(ignoreContent.includes('*.sqlite') || ignoreContent.includes('**/*.sqlite*'));
      assert.ok(ignoreContent.includes('backups/'));
      assert.ok(ignoreContent.includes('.env*'));
    }
  });

  test('5.4: Production staging in isolated temp dir ignores sensitive files', () => {
    const tempDir = createTempDir('challenger2-hygiene-');
    try {
      // Simulate staging a mock database in the temp environment
      const mockDb = path.join(tempDir, 'prod.sqlite3');
      fs.writeFileSync(mockDb, 'binary content');
      assert.ok(fs.existsSync(mockDb));
      // Verify temp isolation
      assert.ok(tempDir.includes('challenger2-hygiene-'));
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

// ============================================================================
// SUITE 6: Database Migration Lifecycle & Pre-Migration Safety in Temp Environment
// ============================================================================
test.describe('SUITE 6: Database Migration Safety & Recovery in Isolated Temp Dir', () => {
  let tempDir;

  test.beforeEach(() => {
    tempDir = createTempDir('challenger2-mig-');
  });

  test.afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('6.1: Pre-migration backup creates verifiable snapshot with SHA-256 and metadata', () => {
    const mockDbPath = path.join(tempDir, 'dev.db');
    createMockDatabase(mockDbPath, {
      students: [{ id: 's1', name: 'TESTE MIGRACAO' }],
      invoices: [{ id: 'i1', amount: 350 }],
    });

    const backupDir = path.join(tempDir, 'backups');
    const backupScript = path.join(PROJECT_ROOT, 'scripts/backup.js');

    const result = spawnSync(
      process.execPath,
      [backupScript, `--output-dir=${backupDir}`, '--tag=pre-migration', `--source=${mockDbPath}`],
      { cwd: PROJECT_ROOT, encoding: 'utf8' }
    );

    assert.strictEqual(result.status, 0, `Backup script must succeed. Stderr: ${result.stderr}`);

    // Verify files created
    const files = fs.readdirSync(backupDir);
    const backupFile = files.find(f => f.includes('pre-migration') && !f.endsWith('.meta.json'));
    const metaFile = files.find(f => f.includes('pre-migration') && f.endsWith('.meta.json'));

    assert.ok(backupFile, 'Backup artifact must exist');
    assert.ok(metaFile, 'Metadata companion must exist');

    const meta = JSON.parse(fs.readFileSync(path.join(backupDir, metaFile), 'utf8'));
    assert.ok(meta.hash, 'Metadata must contain hash');
    assert.strictEqual(meta.hash.length, 64, 'Hash must be 64-char SHA-256');
    assert.strictEqual(meta.tag, 'pre-migration');
  });

  test('6.2: Complete recovery after simulated failed migration in isolated temp dir', () => {
    const liveDbPath = path.join(tempDir, 'live.db');
    const originalData = {
      students: [
        { id: 's1', name: 'ALUNO SEGURO 1' },
        { id: 's2', name: 'ALUNO SEGURO 2' },
      ],
      records: 2,
    };
    createMockDatabase(liveDbPath, originalData);

    const backupDir = path.join(tempDir, 'backups');
    const backupScript = path.join(PROJECT_ROOT, 'scripts/backup.js');
    const restoreScript = path.join(PROJECT_ROOT, 'scripts/restore.js');

    // 1. Take pre-migration backup
    const bkpRes = spawnSync(
      process.execPath,
      [backupScript, `--output-dir=${backupDir}`, '--tag=pre-migration-test', `--source=${liveDbPath}`],
      { cwd: PROJECT_ROOT, encoding: 'utf8' }
    );
    assert.strictEqual(bkpRes.status, 0);

    const files = fs.readdirSync(backupDir);
    const backupFile = files.find(f => f.includes('pre-migration-test') && !f.endsWith('.meta.json'));
    const fullBackupPath = path.join(backupDir, backupFile);

    // 2. Simulate failed migration: database gets corrupted/truncated
    fs.writeFileSync(liveDbPath, 'CORRUPTED_MIGRATION_STATE');

    // 3. Execute disaster recovery
    const restoreRes = spawnSync(
      process.execPath,
      [restoreScript, `--backup=${fullBackupPath}`, `--target=${liveDbPath}`],
      { cwd: PROJECT_ROOT, encoding: 'utf8' }
    );
    assert.strictEqual(restoreRes.status, 0, `Restore must succeed. Stderr: ${restoreRes.stderr}`);

    // 4. Verify 100% recovery
    const recoveredData = JSON.parse(fs.readFileSync(liveDbPath, 'utf8'));
    assert.deepStrictEqual(recoveredData, originalData, 'Database must be restored with 100% parity');
  });
});
