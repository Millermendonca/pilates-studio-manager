/**
 * Tier 2 - Boundary & Corner Cases: JWT Token Integrity & Expiration Boundaries
 * (>=5 test cases per feature)
 */
import test from 'node:test';
import assert from 'node:assert';
import { testDb } from '../harness/db-store.js';
import { invokeApiRoute } from '../harness/route-invoker.js';
import {
  createStudentJwt,
  createExpiredStudentJwt,
  createStudentJwtWithWrongKey,
  createUnsignedJwt,
  createAdminJwt,
} from '../harness/crypto-tools.js';

test.describe('Tier 2 - Token Boundaries: Expiration, Clock Skew & Malformed Tokens', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-T2.2.1: Expired student token returns HTTP 401 in /api/auth/me', async () => {
    const expiredToken = await createExpiredStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: expiredToken,
      },
    });

    assert.strictEqual(
      res.status,
      401,
      `Expected HTTP 401 for expired student session, got ${res.status}`
    );
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('TC-T2.2.2: Malformed token with only 1 segment (no dots) returns HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('TC-T2.2.3: Malformed token with 2 segments (missing signature) returns HTTP 401', async () => {
    const legit = await createStudentJwt({ id: 'student_legit_001' });
    const [h, p] = legit.split('.');
    const twoParts = `${h}.${p}`;

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: twoParts,
      },
    });

    assert.strictEqual(res.status, 401);
  });

  test('TC-T2.2.4: Malformed token with 4 segments returns HTTP 401', async () => {
    const legit = await createStudentJwt({ id: 'student_legit_001' });
    const fourParts = `${legit}.extraSegment`;

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: fourParts,
      },
    });

    assert.strictEqual(res.status, 401);
  });

  test('TC-T2.2.5: Token with corrupted base64url characters in payload returns HTTP 401', async () => {
    const legit = await createStudentJwt({ id: 'student_legit_001' });
    const [h, p, s] = legit.split('.');
    // Inject invalid base64 characters
    const corruptedPayload = p.slice(0, -4) + '!!!@';
    const badToken = `${h}.${corruptedPayload}.${s}`;

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: badToken,
      },
    });

    assert.strictEqual(res.status, 401);
  });
});

test.describe('Tier 2 - Token Boundaries: Secret Confusion & Cross-Role Tokens', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-T2.2.6: Admin token passed to student endpoint /api/auth/me is rejected or not treated as student', async () => {
    const adminToken = await createAdminJwt({ username: 'admin' });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: adminToken, // admin token in student cookie slot
      },
    });

    // Admin token is signed with JWT_ADMIN_SECRET, not JWT_STUDENT_SECRET
    // Therefore student JWT verification MUST fail with 401
    assert.strictEqual(
      res.status,
      401,
      `Expected HTTP 401 when using admin token in student cookie slot, got ${res.status}`
    );
  });

  test('TC-T2.2.7: Student token passed to admin route /api/students is rejected with HTTP 401', async () => {
    const studentToken = await createStudentJwt({ id: 'student_legit_001' });

    const res = await invokeApiRoute('src/app/api/students/route.ts', 'GET', {
      cookies: {
        admin_session: studentToken, // student token in admin cookie slot
      },
    });

    assert.strictEqual(
      res.status,
      401,
      `Expected HTTP 401 when using student token in admin cookie slot, got ${res.status}`
    );
  });

  test('TC-T2.2.8: Token with completely empty signature part returns HTTP 401', async () => {
    const legit = await createStudentJwt({ id: 'student_legit_001' });
    const [h, p] = legit.split('.');
    const emptySigToken = `${h}.${p}.`;

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: emptySigToken,
      },
    });

    assert.strictEqual(res.status, 401);
  });

  test('TC-T2.2.9: Token with valid signature but pointing to deleted/nonexistent student ID returns authenticated=false', async () => {
    const nonExistentToken = await createStudentJwt({
      id: 'student_does_not_exist_in_db_9999',
      email: 'ghost@example.com',
      name: 'Ghost User',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: nonExistentToken,
      },
    });

    // Valid signature but student not in DB
    assert.strictEqual(res.data?.authenticated, false);
    assert.strictEqual(res.data?.student, null);
  });

  test('TC-T2.2.10: SQL injection payload inside token student ID does not cause SQL execution or leak', async () => {
    const sqlInjectionId = "' OR '1'='1";
    const injectionToken = await createStudentJwt({
      id: sqlInjectionId,
      email: 'hacker@example.com',
      name: 'SQL Hacker',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: injectionToken,
      },
    });

    assert.strictEqual(res.data?.authenticated, false);
  });
});
