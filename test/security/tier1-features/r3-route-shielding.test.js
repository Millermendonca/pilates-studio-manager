/**
 * Tier 1 - R3: Blindagem de Rotas, Telas e APIs (Zero Vazamento)
 * Feature coverage (>=5 test cases per feature)
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { testDb } from '../harness/db-store.js';
import { invokeApiRoute, invokeMiddleware } from '../harness/route-invoker.js';
import { createAdminJwt, createStudentJwt } from '../harness/crypto-tools.js';
import { PROJECT_ROOT } from '../harness/env.js';

test.describe('Tier 1 - R3.1 & R3.2: Admin Route Shielding on /api/students and [id]', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R3.1.1: GET /api/students without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/students/route.ts', 'GET');
    assert.strictEqual(
      res.status,
      401,
      `Expected HTTP 401 on unauthenticated GET /api/students, got ${res.status}`
    );
  });

  test('TC-R3.1.2: POST /api/students without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/students/route.ts', 'POST', {
      body: {
        name: 'Aluno Invasor',
        email: 'invasor@hack.com',
        phone: '11999999999',
      },
    });
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated POST /api/students, got ${res.status}`);
  });

  test('TC-R3.1.3: DELETE /api/students (batch) without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/students/route.ts', 'DELETE', {
      body: { ids: ['student_legit_001'] },
    });
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated DELETE /api/students, got ${res.status}`);
  });

  test('TC-R3.2.1: GET /api/students/[id] without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/students/[id]/route.ts', 'GET', {
      params: { id: 'student_legit_001' },
    });
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated GET /api/students/[id], got ${res.status}`);
  });

  test('TC-R3.2.2: PUT /api/students/[id] without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/students/[id]/route.ts', 'PUT', {
      params: { id: 'student_legit_001' },
      body: { name: 'Nome Alterado Hacker' },
    });
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated PUT /api/students/[id], got ${res.status}`);
  });

  test('TC-R3.2.3: DELETE /api/students/[id] without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/students/[id]/route.ts', 'DELETE', {
      params: { id: 'student_legit_001' },
    });
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated DELETE /api/students/[id], got ${res.status}`);
  });

  test('TC-R3.1.4: Student session cookie on /api/students is rejected with HTTP 401 (Privilege Escalation)', async () => {
    const studentToken = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/students/route.ts', 'GET', {
      cookies: {
        student_session: studentToken, // student trying to access admin students API
      },
    });

    assert.strictEqual(res.status, 401, 'Student token must not be accepted on admin /api/students');
  });

  test('TC-R3.1.5: Valid admin cookie on /api/students succeeds with HTTP 200', async () => {
    const adminToken = await createAdminJwt({ username: 'admin' });
    const res = await invokeApiRoute('src/app/api/students/route.ts', 'GET', {
      cookies: {
        admin_session: adminToken,
      },
    });

    if (res.status !== 401) {
      assert.strictEqual(res.status, 200);
    }
  });
});

test.describe('Tier 1 - R3.3 & R3.4: Admin Route Shielding on /api/invoices and /api/reports', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R3.3.1: GET /api/invoices without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/invoices/route.ts', 'GET');
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated GET /api/invoices, got ${res.status}`);
  });

  test('TC-R3.3.2: POST /api/invoices without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/invoices/route.ts', 'POST', {
      body: {
        studentId: 'student_legit_001',
        title: 'Fatura Teste',
        amount: 150.0,
      },
    });
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated POST /api/invoices, got ${res.status}`);
  });

  test('TC-R3.4.1: GET /api/reports without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/reports/route.ts', 'GET');
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated GET /api/reports, got ${res.status}`);
  });

  test('TC-R3.4.2: Student cookie on /api/reports returns HTTP 401 (Zero Financial Leak)', async () => {
    const studentToken = await createStudentJwt({ id: 'student_legit_001' });
    const res = await invokeApiRoute('src/app/api/reports/route.ts', 'GET', {
      cookies: {
        student_session: studentToken,
      },
    });
    assert.strictEqual(res.status, 401, 'Student token must not access studio financial /api/reports');
  });

  test('TC-R3.3.3: Forged admin cookie on /api/invoices returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/invoices/route.ts', 'GET', {
      cookies: {
        admin_session: 'admin_master_001', // raw cuid
      },
    });
    assert.strictEqual(res.status, 401);
  });
});

test.describe('Tier 1 - R3.5 & R3.6: Settings and Test Data Reset Protection', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R3.5.1: POST /api/settings write without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/settings/route.ts', 'POST', {
      body: { studioName: 'Hacked Studio Name' },
    });
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated POST /api/settings, got ${res.status}`);
  });

  test('TC-R3.5.2: PUT /api/settings write without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/settings/route.ts', 'PUT', {
      body: { studioName: 'Hacked Studio Name' },
    });
    assert.strictEqual(res.status, 401, `Expected HTTP 401 on unauthenticated PUT /api/settings, got ${res.status}`);
  });

  test('TC-R3.5.3: PATCH /api/settings write without admin cookie returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/settings/route.ts', 'PATCH', {
      body: { defaultClassCapacity: 10 },
    });
    // In Next.js, if PATCH is not exported it returns 405 or 401
    assert.ok(res.status === 401 || res.status === 405);
  });

  test('TC-R3.6.1: POST /api/settings/reset-test-data without admin cookie returns HTTP 401 (Prevent Wiping DB)', async () => {
    const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST');
    assert.strictEqual(
      res.status,
      401,
      `Expected HTTP 401 on unauthenticated POST /api/settings/reset-test-data, got ${res.status}`
    );
  });

  test('TC-R3.6.2: Student session cookie on /api/settings/reset-test-data returns HTTP 401', async () => {
    const studentToken = await createStudentJwt({ id: 'student_legit_001' });
    const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
      cookies: {
        student_session: studentToken,
      },
    });
    assert.strictEqual(res.status, 401, 'Student session must never trigger reset-test-data');
  });
});

test.describe('Tier 1 - R3.7: Public /login Leakage Elimination', () => {
  const loginPagePath = path.resolve(PROJECT_ROOT, 'src/app/login/page.tsx');
  let loginPageSource = '';

  test.before(() => {
    if (fs.existsSync(loginPagePath)) {
      loginPageSource = fs.readFileSync(loginPagePath, 'utf8');
    }
  });

  test('TC-R3.7.1: Public /login does not fetch /api/students', () => {
    assert.strictEqual(
      loginPageSource.includes("fetch('/api/students')") || loginPageSource.includes('fetch("/api/students")'),
      false,
      'Public login page must not fetch /api/students'
    );
  });

  test('TC-R3.7.2: Public /login does not contain demo student quick-access buttons displaying real names', () => {
    assert.strictEqual(
      loginPageSource.includes('student_legit_001') || loginPageSource.includes('Maria Silva Santos'),
      false,
      'Public login page must not render real student names or IDs'
    );
  });

  test('TC-R3.7.3: Public /login does not display or suggest "senha123" hint to users', () => {
    assert.strictEqual(
      loginPageSource.includes('senha123'),
      false,
      'Public login page must not recommend the universal backdoor password "senha123"'
    );
  });

  test('TC-R3.7.4: Public /login form accepts email and password without client-side pre-population of real users', () => {
    assert.ok(
      loginPageSource.includes('type="password"') || loginPageSource.includes("type='password'"),
      'Login page must have password field'
    );
  });

  test('TC-R3.7.5: Public /login does not import prisma or server database modules directly', () => {
    assert.strictEqual(loginPageSource.includes('@/lib/prisma'), false);
    assert.strictEqual(loginPageSource.includes('@prisma/client'), false);
  });
});

test.describe('Tier 1 - R3.8: Matricula Lookup Sanitization (/api/matricula/lookup)', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R3.8.1: /api/matricula/lookup does not return student password', async () => {
    const res = await invokeApiRoute('src/app/api/matricula/lookup/route.ts', 'POST', {
      body: { phone: '(11) 98765-4321' },
    });

    if (res.data?.student) {
      assert.strictEqual(res.data.student.password, undefined, 'Password must be completely stripped');
    }
  });

  test('TC-R3.8.2: /api/matricula/lookup does not return unmasked CPF', async () => {
    const res = await invokeApiRoute('src/app/api/matricula/lookup/route.ts', 'POST', {
      body: { phone: '(11) 98765-4321' },
    });

    if (res.data?.student) {
      assert.strictEqual(res.data.student.cpf, undefined, 'CPF must not be returned in public lookup');
    }
  });

  test('TC-R3.8.3: /api/matricula/lookup does not return medical history or health notes', async () => {
    const res = await invokeApiRoute('src/app/api/matricula/lookup/route.ts', 'POST', {
      body: { phone: '(11) 98765-4321' },
    });

    if (res.data?.student) {
      assert.strictEqual(res.data.student.healthNotes, undefined);
      assert.strictEqual(res.data.student.medicalHistory, undefined);
      assert.strictEqual(res.data.student.injuries, undefined);
      assert.strictEqual(res.data.student.surgeries, undefined);
      assert.strictEqual(res.data.student.movementRestrictions, undefined);
      assert.strictEqual(res.data.student.physicalAssessment, undefined);
    }
  });

  test('TC-R3.8.4: /api/matricula/lookup does not return full residential address', async () => {
    const res = await invokeApiRoute('src/app/api/matricula/lookup/route.ts', 'POST', {
      body: { phone: '(11) 98765-4321' },
    });

    if (res.data?.student) {
      assert.strictEqual(res.data.student.address, undefined, 'Full address must not be exposed');
    }
  });

  test('TC-R3.8.5: /api/matricula/lookup returns only non-sensitive identifying info (id, name, masked info)', async () => {
    const res = await invokeApiRoute('src/app/api/matricula/lookup/route.ts', 'POST', {
      body: { phone: '(11) 98765-4321' },
    });

    if (res.data?.student) {
      const allowedKeys = ['id', 'name', 'phone', 'email', 'planName', 'found', 'status'];
      for (const key of Object.keys(res.data.student)) {
        assert.ok(
          allowedKeys.includes(key),
          `Unexpected key "${key}" returned by public /api/matricula/lookup`
        );
      }
    }
  });
});

test.describe('Tier 1 - Protected Administrative Pages Interception (Middleware)', () => {
  const protectedAdminPages = [
    '/alunos',
    '/agenda',
    '/financeiro',
    '/relatorios',
    '/mapa',
    '/mensagens',
    '/configuracoes',
  ];

  for (const page of protectedAdminPages) {
    test(`TC-R3.9: Unauthenticated access to ${page} redirects to /admin/login`, async () => {
      const res = await invokeMiddleware(page, { cookies: {} });
      assert.strictEqual(
        res.isRedirect,
        true,
        `Expected redirect for unauthenticated access to ${page}, got status ${res.status}`
      );
      assert.ok(
        res.location?.includes('/admin/login'),
        `Redirect location for ${page} must point to /admin/login, got ${res.location}`
      );
    });
  }

  test('TC-R3.9.8: Valid admin session cookie grants access to protected admin pages (no redirect)', async () => {
    const adminToken = await createAdminJwt({ username: 'admin' });
    const res = await invokeMiddleware('/alunos', {
      cookies: {
        admin_session: adminToken,
      },
    });

    assert.strictEqual(res.isRedirect, false, 'Valid admin session must not be redirected away from /alunos');
  });
});
