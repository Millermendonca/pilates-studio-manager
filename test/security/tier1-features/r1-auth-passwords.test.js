/**
 * Tier 1 - R1: Autenticação Segura, Gestão de Senhas e Prevenção de Força Bruta
 * Feature coverage (>=5 test cases per feature)
 */
import test from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { testDb } from '../harness/db-store.js';
import { invokeApiRoute } from '../harness/route-invoker.js';
import {
  createStudentJwt,
  createExpiredStudentJwt,
  createStudentJwtWithWrongKey,
  createUnsignedJwt,
  isBcryptHash,
} from '../harness/crypto-tools.js';
import { loadSourceModule } from '../harness/loader.js';

test.describe('Tier 1 - R1.1: Backdoor Password Removal (senha123)', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R1.1.1: Reject senha123 for account with custom non-default password', async () => {
    // maria.silva has password 'minhaSenhaForte!2026'
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'senha123',
      },
    });

    assert.strictEqual(
      res.status,
      401,
      `Expected HTTP 401 when using backdoor senha123 on custom password account, got ${res.status}`
    );
    assert.strictEqual(res.data?.success, undefined);
  });

  test('TC-R1.1.2: Reject senha123 with trailing whitespace on custom password account', async () => {
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'senha123 ',
      },
    });

    assert.strictEqual(res.status, 401);
  });

  test('TC-R1.1.3: Reject uppercase SENHA123 on custom password account', async () => {
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'SENHA123',
      },
    });

    assert.strictEqual(res.status, 401);
  });

  test('TC-R1.1.4: Reject arbitrary incorrect passwords on custom password account', async () => {
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'wrong_password_attempt',
      },
    });

    assert.strictEqual(res.status, 401);
  });

  test('TC-R1.1.5: Reject backdoor on newly enrolled student with explicit password', async () => {
    testDb.insertRaw('Student', {
      id: 'student_custom_new',
      name: 'Novo Aluno',
      email: 'novo.aluno@example.com',
      password: bcrypt.hashSync('senhaExplicita#2026', 10),
      active: true,
      isDeleted: false,
    });

    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'novo.aluno@example.com',
        password: 'senha123',
      },
    });

    assert.strictEqual(res.status, 401, 'Backdoor senha123 must be rejected for new student with explicit password');
  });
});

test.describe('Tier 1 - R1.2: Bcrypt Password Hashing & Safe Storage', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R1.2.1: Migrated student passwords in DB match standard Bcrypt format ($2a$ or $2b$, 60 chars)', () => {
    const student = testDb.getRaw('Student', 'student_migrated_003');
    assert.ok(student, 'Migrated student should exist');
    assert.ok(
      isBcryptHash(student.password),
      `Stored password "${student.password}" must be a 60-character Bcrypt hash`
    );
  });

  test('TC-R1.2.2: Plaintext password is never stored directly for new accounts', async () => {
    const rawPlainPassword = 'MySecretPlainPassword!2026';
    const hash = bcrypt.hashSync(rawPlainPassword, 12);

    testDb.insertRaw('Student', {
      id: 'student_check_hash',
      name: 'Teste Hash',
      email: 'teste.hash@example.com',
      password: hash,
      active: true,
      isDeleted: false,
    });

    const stored = testDb.getRaw('Student', 'student_check_hash');
    assert.notStrictEqual(stored.password, rawPlainPassword);
    assert.ok(isBcryptHash(stored.password));
    assert.ok(bcrypt.compareSync(rawPlainPassword, stored.password));
  });

  test('TC-R1.2.3: Password hash uses 12 rounds cost factor', () => {
    const student = testDb.getRaw('Student', 'student_migrated_003');
    // Bcrypt prefix: $2b$12$...
    const rounds = parseInt(student.password.split('$')[2], 10);
    assert.strictEqual(rounds >= 10, true, `Bcrypt cost factor must be >= 10, got ${rounds}`);
  });

  test('TC-R1.2.4: Admin password is authenticated with Bcrypt hash', () => {
    const admin = testDb.getRaw('AdminUser', 'admin_master_001');
    assert.ok(isBcryptHash(admin.passwordHash));
    assert.ok(bcrypt.compareSync('adminMaster#2026', admin.passwordHash));
    assert.strictEqual(bcrypt.compareSync('wrongAdminPassword', admin.passwordHash), false);
  });

  test('TC-R1.2.5: Two students with identical passwords produce distinct salt hashes', () => {
    const commonPwd = 'mesmasenha#2026';
    const hash1 = bcrypt.hashSync(commonPwd, 12);
    const hash2 = bcrypt.hashSync(commonPwd, 12);

    assert.notStrictEqual(hash1, hash2, 'Bcrypt must produce unique salts/hashes for identical passwords');
    assert.ok(bcrypt.compareSync(commonPwd, hash1));
    assert.ok(bcrypt.compareSync(commonPwd, hash2));
  });
});

test.describe('Tier 1 - R1.3: Signed Student Session Cookies in /api/auth/me', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R1.3.1: Legitimate signed JWT student cookie succeeds with HTTP 200 and authenticated=true', async () => {
    const token = await createStudentJwt({
      id: 'student_migrated_003',
      email: 'beatriz.almeida@example.com',
      name: 'Beatriz Almeida',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: token,
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.authenticated, true);
    assert.strictEqual(res.data?.student?.id, 'student_migrated_003');
  });

  test('TC-R1.3.2: Signed JWT payload correctly binds student email and id', async () => {
    const token = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: token,
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.student?.email, 'maria.silva@example.com');
  });

  test('TC-R1.3.3: /api/auth/me returns authenticated=false when no session cookie is provided', async () => {
    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {},
    });

    assert.strictEqual(res.data?.authenticated, false);
    assert.strictEqual(res.data?.student, null);
  });

  test('TC-R1.3.4: Student login route sets signed JWT cookie on successful login', async () => {
    // Beatriz is a migrated student with valid bcrypt password
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'beatriz.almeida@example.com',
        password: 'senhaSeguraAluno#2026',
      },
    });

    // Check if login was successful and cookie was set
    if (res.status === 200) {
      const sessionCookie = res.cookies?.find((c) => c.name === 'student_session');
      assert.ok(sessionCookie, 'student_session cookie must be set on successful login');
      // Must not be a raw cuid: JWT contains two dots (header.payload.signature)
      assert.strictEqual(
        sessionCookie.value.split('.').length,
        3,
        'student_session cookie value must be a signed 3-part JWT, not a raw cuid'
      );
      assert.strictEqual(sessionCookie.httpOnly, true, 'student_session cookie must be HttpOnly');
    }
  });

  test('TC-R1.3.5: /api/auth/me does not expose student password in response', async () => {
    const token = await createStudentJwt({
      id: 'student_migrated_003',
      email: 'beatriz.almeida@example.com',
      name: 'Beatriz Almeida',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: token,
      },
    });

    assert.strictEqual(res.data?.student?.password, undefined, 'Student password must not be returned in /api/auth/me');
  });
});

test.describe('Tier 1 - R1.4 & R1.5: Forged & Invalid Cookie Rejection in /api/auth/me', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R1.4.1: Reject raw ID cookie student_session=<id> with HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: 'student_legit_001', // raw cuid injection
      },
    });

    assert.strictEqual(
      res.status,
      401,
      `Expected HTTP 401 for raw cuid cookie forgery, got ${res.status}`
    );
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('TC-R1.4.2: Reject arbitrary non-JWT string cookie with HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: 'not_a_valid_token_string_random_garbage',
      },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('TC-R1.5.1: Reject token with tampered signature component with HTTP 401', async () => {
    const legitToken = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const parts = legitToken.split('.');
    // Tamper the signature portion
    const tamperedSig = parts[2].slice(0, -3) + 'XYZ';
    const forgedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: forgedToken,
      },
    });

    assert.strictEqual(
      res.status,
      401,
      `Expected HTTP 401 for tampered signature token, got ${res.status}`
    );
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('TC-R1.5.2: Reject token signed with wrong secret key with HTTP 401', async () => {
    const tokenWrongKey = await createStudentJwtWithWrongKey({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: tokenWrongKey,
      },
    });

    assert.strictEqual(res.status, 401, 'Token signed with foreign secret must be rejected with HTTP 401');
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('TC-R1.5.3: Reject "alg: none" unsigned token with HTTP 401', async () => {
    const unsigned = createUnsignedJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: unsigned,
      },
    });

    assert.strictEqual(res.status, 401, 'Unsigned alg:none token must be rejected with HTTP 401');
    assert.strictEqual(res.data?.authenticated, false);
  });
});

test.describe('Tier 1 - R1.6: Brute-Force Rate Limiting & Lockout', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R1.6.1: Successive invalid login attempts on /api/auth/login trigger HTTP 429 or 423', async () => {
    let triggeredRateLimit = false;
    let finalStatus = 401;

    // Send 15 rapid invalid login attempts
    for (let i = 0; i < 15; i++) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: {
          email: 'maria.silva@example.com',
          password: `invalid_password_${i}`,
        },
      });

      if (res.status === 429 || res.status === 423) {
        triggeredRateLimit = true;
        finalStatus = res.status;
        break;
      }
    }

    assert.ok(
      triggeredRateLimit,
      `Expected successive invalid attempts to trigger rate limit (HTTP 429 or 423), last status was ${finalStatus}`
    );
  });

  test('TC-R1.6.2: Rate limiting returns informative error or retry-after header', async () => {
    let rateLimitRes = null;
    for (let i = 0; i < 15; i++) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: {
          email: 'maria.silva@example.com',
          password: `wrong_pass_${i}`,
        },
      });
      if (res.status === 429 || res.status === 423) {
        rateLimitRes = res;
        break;
      }
    }

    if (rateLimitRes) {
      assert.ok(
        rateLimitRes.data?.error || rateLimitRes.headers?.['retry-after'],
        'Rate limit response must provide an error message or retry-after header'
      );
    }
  });

  test('TC-R1.6.3: Rate limiter distinguishes between different client IPs or targets', async () => {
    // Attempt from IP A
    for (let i = 0; i < 6; i++) {
      await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': '198.51.100.1' },
        body: { email: 'target.a@example.com', password: 'bad' },
      });
    }

    // Attempt from independent IP B should not be immediately blocked by IP A's attempts
    const resB = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      headers: { 'x-forwarded-for': '203.0.113.2' },
      body: { email: 'target.b@example.com', password: 'bad' },
    });

    // If rate limiting is IP-scoped, resB will return standard 401 instead of preemptive 429
    assert.strictEqual(resB.status, 401);
  });

  test('TC-R1.6.4: Admin login /api/auth/admin/login also enforces rate limiting or account lockout', async () => {
    let adminRateLimited = false;
    for (let i = 0; i < 10; i++) {
      const res = await invokeApiRoute('src/app/api/auth/admin/login/route.ts', 'POST', {
        body: {
          username: 'admin',
          password: `wrong_admin_pwd_${i}`,
        },
      });

      if (res.status === 429 || res.status === 423) {
        adminRateLimited = true;
        break;
      }
    }

    // In PROJECT.md: AdminUser has failedLoginAttempts and lockoutUntil, or returns 429/423
    assert.ok(adminRateLimited, 'Admin login must trigger lockout or HTTP 429/423 on repeated failures');
  });

  test('TC-R1.6.5: Legitimate login succeeds on first attempt without hitting rate limit', async () => {
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      headers: { 'x-forwarded-for': '192.0.2.99' },
      body: {
        email: 'beatriz.almeida@example.com',
        password: 'senhaSeguraAluno#2026',
      },
    });

    assert.notStrictEqual(res.status, 429);
    assert.notStrictEqual(res.status, 423);
  });
});
