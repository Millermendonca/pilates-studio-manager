/**
 * test/adversarial/gate2_challenger1.test.mjs
 * 
 * GATE 2 EMPIRICAL ADVERSARIAL TEST SUITE
 * Challenger 1: Adversarial Auth, Session & Crypto Verifier
 * 
 * Probes:
 * 1. Account takeover attempt on student login using 'senha123' -> HTTP 401
 * 2. Session hijacking using forged raw cuid cookie on /api/auth/me -> HTTP 401
 * 3. Brute force rate limiting on /api/auth/login -> HTTP 429
 * 4. Tamper resistance on decryptField -> throws error on mutated bit
 * 5. Random IV & semantic security -> distinct ciphertexts
 * 6. Database verification on prisma/dev.db -> confirm 62 Bcrypt hashes
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

import { testDb } from '../security/harness/db-store.js';
import { invokeApiRoute, setActiveCookies } from '../security/harness/route-invoker.js';
import { loadSourceModule } from '../security/harness/loader.js';
import {
  createStudentJwt,
  createExpiredStudentJwt,
  createStudentJwtWithWrongKey,
  createUnsignedJwt,
  isBcryptHash,
  isEncryptedFormat,
  tamperCiphertext,
  tamperAuthTag,
  tamperIV,
} from '../security/harness/crypto-tools.js';

let cryptoModule;
let studentAuthModule;

test.before(async () => {
  cryptoModule = await loadSourceModule('src/lib/crypto.ts');
  studentAuthModule = await loadSourceModule('src/lib/auth/studentAuth.ts');
});

// ==============================================================================
// PROBE 1: ACCOUNT TAKEOVER ATTEMPT ON STUDENT LOGIN USING 'senha123' -> HTTP 401
// ==============================================================================
test.describe('Adversarial Probe 1: Account Takeover Attempt via Default Password (senha123)', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
    if (studentAuthModule?.resetStudentRateLimits) {
      studentAuthModule.resetStudentRateLimits();
    }
  });

  test('P1.1: Direct takeover attempt on student account with custom password using senha123 -> HTTP 401', async () => {
    // Student maria.silva has custom password 'minhaSenhaForte!2026'
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      headers: { 'x-forwarded-for': '10.0.1.1' },
      body: {
        email: 'maria.silva@example.com',
        password: 'senha123',
      },
    });

    assert.strictEqual(res.status, 401, `Expected HTTP 401 on takeover attempt, got ${res.status}`);
    assert.strictEqual(res.data?.success, undefined);
    assert.strictEqual(res.data?.error, 'E-mail ou senha incorretos');
  });

  test('P1.2: Takeover attempt with trailing/leading whitespace variants of senha123 -> HTTP 401', async () => {
    const variants = ['senha123 ', ' senha123', '  senha123  ', 'senha123\t', 'senha123\n'];
    for (const variant of variants) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': `10.0.1.${Math.floor(Math.random() * 200) + 10}` },
        body: {
          email: 'maria.silva@example.com',
          password: variant,
        },
      });
      assert.strictEqual(res.status, 401, `Variant "${variant}" must be rejected with 401`);
    }
  });

  test('P1.3: Takeover attempt with case permutations (SENHA123, Senha123, sEnHa123) -> HTTP 401', async () => {
    const caseVariants = ['SENHA123', 'Senha123', 'sEnHa123', 'sENHA123'];
    for (const variant of caseVariants) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': `10.0.2.${Math.floor(Math.random() * 200) + 10}` },
        body: {
          email: 'maria.silva@example.com',
          password: variant,
        },
      });
      assert.strictEqual(res.status, 401, `Case variant "${variant}" must be rejected with 401`);
    }
  });

  test('P1.4: SQL injection / null byte payloads using senha123 -> HTTP 401', async () => {
    const payloads = [
      "senha123' OR '1'='1",
      'senha123\0',
      'senha123"; DROP TABLE students; --',
    ];
    for (const p of payloads) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': `10.0.3.${Math.floor(Math.random() * 200) + 10}` },
        body: {
          email: 'maria.silva@example.com',
          password: p,
        },
      });
      assert.strictEqual(res.status, 401, `Payload "${p}" must be rejected with 401`);
    }
  });

  test('P1.5: Positive control oracle: Valid custom password authenticates successfully -> HTTP 200', async () => {
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      headers: { 'x-forwarded-for': '10.0.1.99' },
      body: {
        email: 'maria.silva@example.com',
        password: 'minhaSenhaForte!2026',
      },
    });

    assert.strictEqual(res.status, 200, 'Valid custom password must succeed with 200');
    assert.strictEqual(res.data?.success, true);
    assert.strictEqual(res.data?.student?.email, 'maria.silva@example.com');
    // Ensure sensitive medical data and password are NOT returned
    assert.strictEqual(res.data?.student?.password, undefined);
    assert.strictEqual(res.data?.student?.cpf, undefined);
  });
});

// ==============================================================================
// PROBE 2: SESSION HIJACKING USING FORGED RAW CUID COOKIE ON /api/auth/me -> HTTP 401
// ==============================================================================
test.describe('Adversarial Probe 2: Session Hijacking via Forged Cookie on /api/auth/me', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('P2.1: Hijack attempt with raw CUID string of legitimate student -> HTTP 401', async () => {
    const rawCuid = 'student_legit_001';
    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: rawCuid,
      },
    });

    assert.strictEqual(res.status, 401, `Raw cuid must return HTTP 401, got ${res.status}`);
    assert.strictEqual(res.data?.authenticated, false);
    assert.strictEqual(res.data?.student, null);
    assert.match(res.data?.error || '', /Sessão inválida ou expirada/);
  });

  test('P2.2: Hijack attempt with random 25-char alphanumeric CUID format -> HTTP 401', async () => {
    const randomCuids = [
      'clh1234567890abcdefghijkl',
      'cuid_fake_student_session',
      'clx00112233445566778899aa',
    ];

    for (const cuid of randomCuids) {
      const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
        cookies: {
          student_session: cuid,
        },
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data?.authenticated, false);
    }
  });

  test('P2.3: Hijack attempt with unsigned alg:none JWT -> HTTP 401', async () => {
    const unsignedJwt = createUnsignedJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: unsignedJwt,
      },
    });

    assert.strictEqual(res.status, 401, 'Unsigned alg:none JWT must be rejected with 401');
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('P2.4: Hijack attempt with token signed by wrong HMAC secret key -> HTTP 401', async () => {
    const forgedToken = await createStudentJwtWithWrongKey({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: forgedToken,
      },
    });

    assert.strictEqual(res.status, 401, 'Wrong key signed JWT must be rejected with 401');
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('P2.5: Hijack attempt with expired signed JWT -> HTTP 401', async () => {
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

    assert.strictEqual(res.status, 401, 'Expired signed JWT must be rejected with 401');
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('P2.6: Positive control oracle: Valid signed JWT yields HTTP 200 with authenticated=true', async () => {
    const validToken = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: validToken,
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.authenticated, true);
    assert.strictEqual(res.data?.student?.id, 'student_legit_001');
    assert.strictEqual(res.data?.student?.email, 'maria.silva@example.com');
  });
});

// ==============================================================================
// PROBE 3: BRUTE FORCE RATE LIMITING ON /api/auth/login -> HTTP 429
// ==============================================================================
test.describe('Adversarial Probe 3: Brute Force Rate Limiting on /api/auth/login', () => {
  const ATTACKER_IP = '198.51.100.77';

  test.beforeEach(() => {
    testDb.seedDefaults();
    if (studentAuthModule?.resetStudentRateLimits) {
      studentAuthModule.resetStudentRateLimits();
    }
  });

  test('P3.1: Sequential attack burst triggers HTTP 429 on exceeding threshold (5 allowed, 6th blocked)', async () => {
    // 5 consecutive failed login attempts
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': ATTACKER_IP },
        body: {
          email: 'maria.silva@example.com',
          password: `wrong_password_${attempt}`,
        },
      });

      assert.strictEqual(
        res.status,
        401,
        `Attempt ${attempt} of 5 should return 401, got ${res.status}`
      );
    }

    // 6th attempt MUST return HTTP 429
    const blockedRes = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      headers: { 'x-forwarded-for': ATTACKER_IP },
      body: {
        email: 'maria.silva@example.com',
        password: 'wrong_password_6',
      },
    });

    assert.strictEqual(
      blockedRes.status,
      429,
      `Attempt 6 must be blocked with HTTP 429 Too Many Requests, got ${blockedRes.status}`
    );
    assert.ok(
      blockedRes.data?.retryAfterSeconds > 0,
      `Expected retryAfterSeconds > 0, got ${blockedRes.data?.retryAfterSeconds}`
    );
    assert.match(
      blockedRes.data?.error || '',
      /Muitas tentativas|bloqueado/i,
      'Error message must indicate lockout'
    );
    assert.ok(
      blockedRes.headers['retry-after'],
      'Response must include Retry-After HTTP header'
    );
  });

  test('P3.2: Rate limit persists on attempts 7, 8, 9 and 10 even if correct credentials are supplied', async () => {
    // Exhaust 5 attempts
    for (let i = 0; i < 5; i++) {
      await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': ATTACKER_IP },
        body: { email: 'maria.silva@example.com', password: 'bad' },
      });
    }

    // Subsequent attempts with CORRECT password MUST STILL be rejected with 429
    for (let attempt = 6; attempt <= 10; attempt++) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': ATTACKER_IP },
        body: {
          email: 'maria.silva@example.com',
          password: 'minhaSenhaForte!2026', // Correct password!
        },
      });

      assert.strictEqual(
        res.status,
        429,
        `Attempt ${attempt} during lockout period must return HTTP 429 even with correct password`
      );
    }
  });

  test('P3.3: Rate limit is IP-isolated (distinct IP is unaffected)', async () => {
    // Exhaust limit on ATTACKER_IP
    for (let i = 0; i < 5; i++) {
      await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': ATTACKER_IP },
        body: { email: 'maria.silva@example.com', password: 'bad' },
      });
    }

    // Another IP can still log in normally
    const legitRes = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      headers: { 'x-forwarded-for': '203.0.113.99' },
      body: {
        email: 'maria.silva@example.com',
        password: 'minhaSenhaForte!2026',
      },
    });

    assert.strictEqual(legitRes.status, 200, 'Legitimate IP must not be blocked by attacker IP activity');
    assert.strictEqual(legitRes.data?.success, true);
  });
});

// ==============================================================================
// PROBE 4: TAMPER RESISTANCE ON decryptField -> THROWS ERROR ON MUTATED BIT
// ==============================================================================
test.describe('Adversarial Probe 4: Tamper Resistance on decryptField', () => {
  const sensitivePlaintext = 'CPF: 123.456.789-00 | Diagnóstico: Hérnia discal L5-S1';

  test('P4.1: Single bit flip in ciphertext causes decryptField to throw strictly', () => {
    const encrypted = cryptoModule.encryptField(sensitivePlaintext);
    assert.ok(isEncryptedFormat(encrypted));

    const tampered = tamperCiphertext(encrypted);
    assert.throws(
      () => cryptoModule.decryptField(tampered),
      /Falha na autenticação do dado cifrado: dado corrompido ou adulterado/,
      'Tampered ciphertext bit must cause decryptField to throw'
    );
  });

  test('P4.2: Auth tag mutation causes decryptField to throw strictly', () => {
    const encrypted = cryptoModule.encryptField(sensitivePlaintext);
    const tamperedTag = tamperAuthTag(encrypted);

    assert.throws(
      () => cryptoModule.decryptField(tamperedTag),
      /Falha na autenticação do dado cifrado: dado corrompido ou adulterado/,
      'Tampered auth tag must cause decryptField to throw'
    );
  });

  test('P4.3: IV mutation causes decryptField to throw strictly', () => {
    const encrypted = cryptoModule.encryptField(sensitivePlaintext);
    const tamperedIv = tamperIV(encrypted);

    assert.throws(
      () => cryptoModule.decryptField(tamperedIv),
      /Falha na autenticação do dado cifrado: dado corrompido ou adulterado/,
      'Tampered IV must cause decryptField to throw'
    );
  });

  test('P4.4: Truncation of ciphertext / auth tag / IV causes decryptField to throw strictly', () => {
    const encrypted = cryptoModule.encryptField(sensitivePlaintext);
    const parts = encrypted.split(':'); // ['enc', 'v1', iv, tag, cipher]

    // Truncated cipher
    const shortCipher = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:${parts[4].slice(0, -4)}`;
    assert.throws(() => cryptoModule.decryptField(shortCipher), /Falha na autenticação/);

    // Truncated tag
    const shortTag = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3].slice(0, 16)}:${parts[4]}`;
    assert.throws(() => cryptoModule.decryptField(shortTag), /Falha na autenticação/);

    // Truncated IV
    const shortIv = `${parts[0]}:${parts[1]}:${parts[2].slice(0, 10)}:${parts[3]}:${parts[4]}`;
    assert.throws(() => cryptoModule.decryptField(shortIv), /Falha na autenticação/);
  });

  test('P4.5: Malformed payload structure causes decryptField to throw strictly', () => {
    const malformedPayloads = [
      'enc:v1:',
      'enc:v1:notenoughparts',
      'enc:v1:1234:5678:9abc:extra',
      'enc:v1:zzzzzzzzzzzzzzzzzzzzzzzz:00112233445566778899aabbccddeeff:1234', // invalid non-hex IV
      'enc:v1:00112233445566778899aabb:zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz:1234', // invalid non-hex tag
    ];

    for (const payload of malformedPayloads) {
      assert.throws(
        () => cryptoModule.decryptField(payload),
        /Falha na autenticação do dado cifrado: dado corrompido ou adulterado/,
        `Malformed payload "${payload}" must strictly throw`
      );
    }
  });

  test('P4.6: Zero-byte auth tag injection causes decryptField to throw strictly', () => {
    const encrypted = cryptoModule.encryptField(sensitivePlaintext);
    const parts = encrypted.split(':');
    const zeroTagPayload = `${parts[0]}:${parts[1]}:${parts[2]}:${'0'.repeat(32)}:${parts[4]}`;

    assert.throws(
      () => cryptoModule.decryptField(zeroTagPayload),
      /Falha na autenticação do dado cifrado: dado corrompido ou adulterado/
    );
  });
});

// ==============================================================================
// PROBE 5: RANDOM IV & SEMANTIC SECURITY -> DISTINCT CIPHERTEXTS
// ==============================================================================
test.describe('Adversarial Probe 5: Random IV & Semantic Security', () => {
  const commonPlaintext = '123.456.789-99 - Avaliação Física: Hipermobilidade Articular';

  test('P5.1: Encrypting identical plaintext 1,000 times produces 1,000 distinct ciphertexts (0 collisions)', () => {
    const ITERATIONS = 1000;
    const ciphertexts = new Set();
    const ivs = new Set();
    const tags = new Set();

    for (let i = 0; i < ITERATIONS; i++) {
      const encrypted = cryptoModule.encryptField(commonPlaintext);
      assert.ok(isEncryptedFormat(encrypted), 'Must follow enc:v1:<iv>:<tag>:<cipher>');

      const parts = encrypted.split(':');
      const iv = parts[2];
      const tag = parts[3];

      ciphertexts.add(encrypted);
      ivs.add(iv);
      tags.add(tag);
    }

    assert.strictEqual(
      ciphertexts.size,
      ITERATIONS,
      `Expected ${ITERATIONS} distinct ciphertexts, got ${ciphertexts.size} (collision detected!)`
    );
    assert.strictEqual(
      ivs.size,
      ITERATIONS,
      `Expected ${ITERATIONS} distinct IVs, got ${ivs.size} (IV reuse detected!)`
    );
    assert.strictEqual(
      tags.size,
      ITERATIONS,
      `Expected ${ITERATIONS} distinct auth tags, got ${tags.size}`
    );
  });

  test('P5.2: Every generated ciphertext successfully decrypts back to original plaintext', () => {
    for (let i = 0; i < 50; i++) {
      const encrypted = cryptoModule.encryptField(commonPlaintext);
      const decrypted = cryptoModule.decryptField(encrypted);
      assert.strictEqual(decrypted, commonPlaintext);
    }
  });

  test('P5.3: Idempotence of encryptField: already encrypted string is NOT double-encrypted', () => {
    const enc1 = cryptoModule.encryptField(commonPlaintext);
    const enc2 = cryptoModule.encryptField(enc1);
    assert.strictEqual(enc2, enc1, 'encryptField must be idempotent when receiving enc:v1: input');
  });

  test('P5.4: Boundary values for encryptField: null, undefined, empty return unchanged', () => {
    assert.strictEqual(cryptoModule.encryptField(null), null);
    assert.strictEqual(cryptoModule.encryptField(undefined), undefined);
    assert.strictEqual(cryptoModule.encryptField(''), '');
    assert.strictEqual(cryptoModule.encryptField('   '), '   ');
  });
});

// ==============================================================================
// PROBE 6: DATABASE VERIFICATION ON prisma/dev.db -> CONFIRM 62 BCRYPT HASHES
// ==============================================================================
test.describe('Adversarial Probe 6: Database Verification on prisma/dev.db', () => {
  let prisma;

  test.before(async () => {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  });

  test.after(async () => {
    if (prisma?.$disconnect) {
      await prisma.$disconnect();
    }
  });

  test('P6.1: Exactly 62 student accounts exist in prisma/dev.db', async () => {
    const count = await prisma.student.count();
    assert.strictEqual(count, 62, `Expected exactly 62 students in prisma/dev.db, got ${count}`);
  });

  test('P6.2: Exactly 62/62 student passwords are valid 60-character Bcrypt hashes', async () => {
    const students = await prisma.student.findMany({
      select: { id: true, email: true, password: true },
    });

    let validBcryptCount = 0;
    const invalidAccounts = [];

    for (const s of students) {
      const pwd = s.password;
      const isValid = typeof pwd === 'string' &&
        (pwd.startsWith('$2a$') || pwd.startsWith('$2b$')) &&
        pwd.length === 60;

      if (isValid) {
        validBcryptCount++;
      } else {
        invalidAccounts.push({ id: s.id, email: s.email, password: pwd });
      }
    }

    assert.strictEqual(
      invalidAccounts.length,
      0,
      `Found ${invalidAccounts.length} students with non-Bcrypt passwords: ${JSON.stringify(invalidAccounts)}`
    );
    assert.strictEqual(
      validBcryptCount,
      62,
      `Expected 62 valid Bcrypt hashes, got ${validBcryptCount}`
    );
  });

  test('P6.3: Zero plaintext passwords exist in prisma/dev.db', async () => {
    const students = await prisma.student.findMany({
      select: { id: true, email: true, password: true },
    });

    for (const s of students) {
      assert.notStrictEqual(s.password, 'senha123', `Student ${s.email} has plaintext 'senha123'`);
      assert.notStrictEqual(s.password, '123456', `Student ${s.email} has plaintext '123456'`);
      assert.ok(s.password.startsWith('$2'), `Student ${s.email} password does not start with $2`);
    }
  });

  test('P6.4: All 62 Bcrypt hashes use 12-round salt cost factor ($2b$12$ or $2a$12$)', async () => {
    const students = await prisma.student.findMany({
      select: { id: true, email: true, password: true },
    });

    for (const s of students) {
      const parts = s.password.split('$');
      const costFactor = parts[2];
      assert.strictEqual(
        costFactor,
        '12',
        `Student ${s.email} has cost factor ${costFactor}, expected 12`
      );
    }
  });
});
