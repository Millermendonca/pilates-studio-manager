/**
 * Gate Challenger 1 - Adversarial Security Verification Suite
 * test/adversarial/gate1_adversarial_security.test.mjs
 * 
 * Verifies 5 Critical Attack Scenarios:
 * 1. Account takeover attempt on student login using `senha123` when a custom password is set -> HTTP 401
 * 2. Session hijacking attempt using forged raw ID cookies (`student_session=<cuid>`) on `/api/auth/me` -> HTTP 401
 * 3. Brute-force threshold: rapid burst of invalid logins on `/api/auth/login` -> HTTP 429
 * 4. Crypto tamper resistance: mutate 1 bit in ciphertext, IV, or tag -> decryptField throws
 * 5. Random IV: encrypt identical plaintext twice -> distinct ciphertexts & IVs & tags (zero collision)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Harness modules
import { testDb } from '../security/harness/db-store.js';
import { invokeApiRoute, setActiveCookies } from '../security/harness/route-invoker.js';
import { loadSourceModule } from '../security/harness/loader.js';
import {
  createStudentJwt,
  createExpiredStudentJwt,
  createStudentJwtWithWrongKey,
  createUnsignedJwt,
} from '../security/harness/crypto-tools.js';

let cryptoModule;
let studentAuthModule;

test.before(async () => {
  cryptoModule = await loadSourceModule('src/lib/crypto.ts');
  studentAuthModule = await loadSourceModule('src/lib/auth/studentAuth.ts');
});

// Helper for single bit flip in hex string
function flipHexBit(hexStr, byteIndex = 0, bitMask = 0x01) {
  const buf = Buffer.from(hexStr, 'hex');
  const targetIdx = Math.min(byteIndex, buf.length - 1);
  buf[targetIdx] ^= bitMask;
  return buf.toString('hex');
}

// ============================================================================
// CHALLENGE 1: Account Takeover via `senha123` Backdoor Rejection
// ============================================================================
test.describe('CHALLENGE 1: Account Takeover Attempt via Default/Backdoor `senha123`', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
    studentAuthModule.resetStudentRateLimits();
  });

  test('1.1: Reject senha123 for existing student with custom hashed password -> HTTP 401', async () => {
    // maria.silva has custom password 'minhaSenhaForte!2026'
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'senha123',
      },
      headers: {
        'x-forwarded-for': '192.168.1.101',
      },
    });

    assert.strictEqual(res.status, 401, `Expected HTTP 401 for backdoor password attempt, got ${res.status}`);
    assert.strictEqual(res.data?.success, undefined, 'Must not return success object');
    assert.match(res.data?.error || '', /incorretos/i, 'Error message must indicate invalid credentials');
    
    // Ensure no session cookie was set
    const sessionCookie = res.cookies?.find(c => c.name === 'student_session');
    assert.strictEqual(sessionCookie, undefined, 'No student_session cookie must be issued on failed takeover');
  });

  test('1.2: Reject senha123 variants (trailing space, uppercase, mixed case, null) -> HTTP 401', async () => {
    const variants = ['senha123 ', ' SENHA123', 'Senha123', 'senha123\n', 'senha123\t'];
    for (const pwd of variants) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: {
          email: 'maria.silva@example.com',
          password: pwd,
        },
        headers: {
          'x-forwarded-for': `192.168.1.${102 + variants.indexOf(pwd)}`,
        },
      });
      assert.strictEqual(res.status, 401, `Variant "${pwd}" must be rejected with 401, got ${res.status}`);
    }
  });

  test('1.3: Reject senha123 for migrated account with custom bcrypt hash -> HTTP 401', async () => {
    // beatriz.almeida has password 'senhaSeguraAluno#2026'
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'beatriz.almeida@example.com',
        password: 'senha123',
      },
      headers: {
        'x-forwarded-for': '192.168.1.110',
      },
    });

    assert.strictEqual(res.status, 401, `Migrated student must reject senha123 with 401, got ${res.status}`);
  });

  test('1.4: Authentic custom password succeeds with HTTP 200 (Account not locked)', async () => {
    const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'minhaSenhaForte!2026',
      },
      headers: {
        'x-forwarded-for': '192.168.1.120',
      },
    });

    assert.strictEqual(res.status, 200, `Legitimate login must succeed with 200, got ${res.status}`);
    assert.strictEqual(res.data?.success, true);
    assert.strictEqual(res.data?.student?.email, 'maria.silva@example.com');
  });
});

// ============================================================================
// CHALLENGE 2: Session Hijacking via Forged Raw ID Cookie Rejection
// ============================================================================
test.describe('CHALLENGE 2: Session Hijacking Attempt via Raw CUID Cookie on /api/auth/me', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('2.1: Reject raw CUID cookie student_session=student_legit_001 -> HTTP 401', async () => {
    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: 'student_legit_001',
      },
    });

    assert.strictEqual(res.status, 401, `Expected HTTP 401 for raw CUID session cookie, got ${res.status}`);
    assert.strictEqual(res.data?.authenticated, false, 'Authenticated must be false');
    assert.strictEqual(res.data?.student, null, 'Student payload must be null');
    assert.match(res.data?.error || '', /Sessão inválida ou expirada/i);
  });

  test('2.2: Reject arbitrary raw cuid formats and strings (e.g., clx9876543210abcdefghijkl) -> HTTP 401', async () => {
    const forgedIds = [
      'clx9876543210abcdefghijkl',
      'cuid_admin_takeover_probe',
      '1',
      'student_migrated_003',
      'undefined',
      'null',
      '{"id":"student_legit_001"}',
    ];

    for (const forgedId of forgedIds) {
      const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
        cookies: {
          student_session: forgedId,
        },
      });

      assert.strictEqual(res.status, 401, `Forged ID "${forgedId}" must be rejected with 401, got ${res.status}`);
      assert.strictEqual(res.data?.authenticated, false);
      assert.strictEqual(res.data?.student, null);
    }
  });

  test('2.3: Reject JWT with tampered signature portion -> HTTP 401', async () => {
    const validJwt = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const parts = validJwt.split('.');
    assert.strictEqual(parts.length, 3, 'Valid JWT must have 3 parts');
    // Tamper signature
    const tamperedSignature = parts[2].slice(0, -4) + 'WXYZ';
    const tamperedJwt = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: tamperedJwt,
      },
    });

    assert.strictEqual(res.status, 401, 'Tampered signature must return 401');
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('2.4: Reject unsigned alg:none JWT -> HTTP 401', async () => {
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

    assert.strictEqual(res.status, 401, 'alg:none token must return 401');
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('2.5: Reject token signed with foreign secret key -> HTTP 401', async () => {
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

    assert.strictEqual(res.status, 401, 'Foreign-signed token must return 401');
    assert.strictEqual(res.data?.authenticated, false);
  });

  test('2.6: Genuine signed JWT returns HTTP 200 and student details', async () => {
    const legitJwt = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const res = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: legitJwt,
      },
    });

    assert.strictEqual(res.status, 200, 'Legitimate token must return 200');
    assert.strictEqual(res.data?.authenticated, true);
    assert.strictEqual(res.data?.student?.id, 'student_legit_001');
    assert.strictEqual(res.data?.student?.email, 'maria.silva@example.com');
  });
});

// ============================================================================
// CHALLENGE 3: Brute-Force Rate Limiting Threshold on `/api/auth/login`
// ============================================================================
test.describe('CHALLENGE 3: Brute-Force Rate Limiting Threshold on /api/auth/login', () => {
  const ATTACKER_IP = '198.51.100.99';
  const INNOCENT_IP = '198.51.100.100';

  test.beforeEach(() => {
    testDb.seedDefaults();
    studentAuthModule.resetStudentRateLimits();
  });

  test('3.1: Burst of invalid logins exceeds threshold and triggers HTTP 429', async () => {
    const responses = [];

    // Send 10 rapid failed login attempts from ATTACKER_IP
    for (let i = 1; i <= 10; i++) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: {
          email: 'maria.silva@example.com',
          password: `wrong_attempt_${i}_#2026`,
        },
        headers: {
          'x-forwarded-for': ATTACKER_IP,
        },
      });
      responses.push({ attempt: i, status: res.status, data: res.data, headers: res.headers });
    }

    // Verify initial attempts (1 to 4) return 401
    for (let i = 0; i < 4; i++) {
      assert.strictEqual(
        responses[i].status,
        401,
        `Attempt ${responses[i].attempt} before lockout should return 401, got ${responses[i].status}`
      );
    }

    // Verify lockout triggers at/after attempt 5 with HTTP 429
    const blockedResponses = responses.slice(4);
    assert.ok(blockedResponses.length > 0, 'Must have recorded blocked responses');

    let hit429 = false;
    for (const item of blockedResponses) {
      if (item.status === 429) {
        hit429 = true;
        assert.match(
          item.data?.error || '',
          /bloqueado temporariamente|Muitas tentativas/i,
          `Attempt ${item.attempt} 429 response must contain lockout message`
        );
        assert.ok(
          item.headers?.['retry-after'] !== undefined || item.data?.retryAfterSeconds !== undefined,
          `Attempt ${item.attempt} must include retry-after information`
        );
      }
    }

    assert.ok(hit429, 'Burst must have triggered HTTP 429 rate limiting');
  });

  test('3.2: Lockout state fails closed even when valid password is supplied', async () => {
    // Trip the rate limit
    for (let i = 0; i < 6; i++) {
      await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: {
          email: 'maria.silva@example.com',
          password: `invalid_${i}`,
        },
        headers: {
          'x-forwarded-for': ATTACKER_IP,
        },
      });
    }

    // Attacker now tries the actual legitimate password while blocked
    const lockedRes = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'minhaSenhaForte!2026',
      },
      headers: {
        'x-forwarded-for': ATTACKER_IP,
      },
    });

    assert.strictEqual(
      lockedRes.status,
      429,
      `Blocked IP must be rejected with 429 even when supplying the correct password`
    );
  });

  test('3.3: Rate limiting is isolated per client IP (no cross-tenant denial of service)', async () => {
    // Exhaust ATTACKER_IP
    for (let i = 0; i < 6; i++) {
      await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        body: {
          email: 'maria.silva@example.com',
          password: `invalid_${i}`,
        },
        headers: {
          'x-forwarded-for': ATTACKER_IP,
        },
      });
    }

    // INNOCENT_IP attempts legitimate login
    const innocentRes = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'minhaSenhaForte!2026',
      },
      headers: {
        'x-forwarded-for': INNOCENT_IP,
      },
    });

    assert.strictEqual(
      innocentRes.status,
      200,
      `Different IP must NOT be blocked by attacker's burst; expected 200, got ${innocentRes.status}`
    );
  });
});

// ============================================================================
// CHALLENGE 4: Crypto Tamper Resistance (Bit Mutation in Ciphertext, IV, Tag)
// ============================================================================
test.describe('CHALLENGE 4: Crypto Tamper Resistance on AES-256-GCM decryptField', () => {
  const originalPlaintext = 'Histórico Clínico Confidencial: Paciente possui hérnia L4-L5 e artrose patelar';

  test('4.1: Single-bit flip in ciphertext payload causes decryptField to throw authentication error', () => {
    const encrypted = cryptoModule.encryptField(originalPlaintext);
    const parts = encrypted.slice('enc:v1:'.length).split(':');
    assert.strictEqual(parts.length, 3, 'Must match enc:v1:<iv>:<tag>:<ciphertext>');

    const [ivHex, tagHex, cipherHex] = parts;

    // Mutate 1 bit in ciphertext (first byte, middle byte, last byte)
    const testOffsets = [0, Math.floor(cipherHex.length / 4), Math.floor(cipherHex.length / 2) - 1];

    for (const offset of testOffsets) {
      const tamperedCipherHex = flipHexBit(cipherHex, offset, 0x01);
      const tamperedPayload = `enc:v1:${ivHex}:${tagHex}:${tamperedCipherHex}`;

      assert.throws(
        () => {
          cryptoModule.decryptField(tamperedPayload);
        },
        /Falha na autenticação|corrompido|adulterado/i,
        `decryptField must throw when ciphertext byte at index ${offset} is mutated`
      );
    }
  });

  test('4.2: Single-bit flip in authentication tag causes decryptField to throw authentication error', () => {
    const encrypted = cryptoModule.encryptField(originalPlaintext);
    const parts = encrypted.slice('enc:v1:'.length).split(':');
    const [ivHex, tagHex, cipherHex] = parts;

    // Mutate 1 bit in auth tag at various positions
    const tagOffsets = [0, 8, 15]; // Tag is 16 bytes

    for (const offset of tagOffsets) {
      const tamperedTagHex = flipHexBit(tagHex, offset, 0x01);
      const tamperedPayload = `enc:v1:${ivHex}:${tamperedTagHex}:${cipherHex}`;

      assert.throws(
        () => {
          cryptoModule.decryptField(tamperedPayload);
        },
        /Falha na autenticação|corrompido|adulterado/i,
        `decryptField must throw when tag byte at index ${offset} is mutated`
      );
    }
  });

  test('4.3: Single-bit flip in IV causes decryptField to throw authentication error', () => {
    const encrypted = cryptoModule.encryptField(originalPlaintext);
    const parts = encrypted.slice('enc:v1:'.length).split(':');
    const [ivHex, tagHex, cipherHex] = parts;

    // Mutate 1 bit in IV at various positions
    const ivOffsets = [0, 5, 11]; // IV is 12 bytes

    for (const offset of ivOffsets) {
      const tamperedIvHex = flipHexBit(ivHex, offset, 0x01);
      const tamperedPayload = `enc:v1:${tamperedIvHex}:${tagHex}:${cipherHex}`;

      assert.throws(
        () => {
          cryptoModule.decryptField(tamperedPayload);
        },
        /Falha na autenticação|corrompido|adulterado/i,
        `decryptField must throw when IV byte at index ${offset} is mutated`
      );
    }
  });

  test('4.4: Truncation attacks (chopped tag or missing colon components) throw authentication error', () => {
    const encrypted = cryptoModule.encryptField(originalPlaintext);
    const parts = encrypted.slice('enc:v1:'.length).split(':');
    const [ivHex, tagHex, cipherHex] = parts;

    const malformedPayloads = [
      `enc:v1:${ivHex}:${tagHex.slice(0, 16)}:${cipherHex}`, // 8-byte tag instead of 16
      `enc:v1:${ivHex.slice(0, 16)}:${tagHex}:${cipherHex}`, // 8-byte IV instead of 12
      `enc:v1:${ivHex}:${tagHex}`,                          // missing ciphertext
      `enc:v1:${ivHex}`,                                    // missing tag and ciphertext
      `enc:v1:::`,                                          // empty parts
      `enc:v1:${ivHex}:${tagHex}:${cipherHex}:extra_part`,  // 4 parts
    ];

    for (const malformed of malformedPayloads) {
      assert.throws(
        () => {
          cryptoModule.decryptField(malformed);
        },
        /Falha na autenticação|corrompido|adulterado/i,
        `Malformed payload "${malformed}" must throw authentication error`
      );
    }
  });

  test('4.5: Untampered payload decrypts with 100% fidelity', () => {
    const encrypted = cryptoModule.encryptField(originalPlaintext);
    const decrypted = cryptoModule.decryptField(encrypted);
    assert.strictEqual(decrypted, originalPlaintext, 'Original plaintext must be restored exactly');
  });
});

// ============================================================================
// CHALLENGE 5: Random IV / CSPRNG Nonce Uniqueness & Semantic Security
// ============================================================================
test.describe('CHALLENGE 5: Randomized IV / CSPRNG Nonce Uniqueness', () => {
  const constantPlaintext = 'CPF_ESTATICO_123.456.789-00';

  test('5.1: Encrypting identical plaintext twice produces distinct ciphertexts', () => {
    const cipher1 = cryptoModule.encryptField(constantPlaintext);
    const cipher2 = cryptoModule.encryptField(constantPlaintext);

    assert.notStrictEqual(
      cipher1,
      cipher2,
      'AES-256-GCM must never produce identical ciphertexts for identical plaintext'
    );
  });

  test('5.2: Distinct ciphertexts have unique IVs and unique authentication tags', () => {
    const cipher1 = cryptoModule.encryptField(constantPlaintext);
    const cipher2 = cryptoModule.encryptField(constantPlaintext);

    const parts1 = cipher1.slice('enc:v1:'.length).split(':');
    const parts2 = cipher2.slice('enc:v1:'.length).split(':');

    const [iv1, tag1, enc1] = parts1;
    const [iv2, tag2, enc2] = parts2;

    assert.notStrictEqual(iv1, iv2, 'IV1 and IV2 must be distinct');
    assert.strictEqual(iv1.length, 24, 'IV must be 24 hex characters (12 bytes)');
    assert.strictEqual(iv2.length, 24);

    assert.notStrictEqual(tag1, tag2, 'Tag1 and Tag2 must be distinct');
    assert.strictEqual(tag1.length, 32, 'Tag must be 32 hex characters (16 bytes)');
    assert.strictEqual(tag2.length, 32);

    assert.notStrictEqual(enc1, enc2, 'Ciphertext payload 1 and 2 must be distinct');
  });

  test('5.3: Statistical Uniqueness: 100 successive encryptions produce 100 distinct ciphertexts (0 collisions)', () => {
    const sampleSize = 100;
    const ciphertexts = new Set();
    const ivs = new Set();

    for (let i = 0; i < sampleSize; i++) {
      const encrypted = cryptoModule.encryptField(constantPlaintext);
      ciphertexts.add(encrypted);

      const iv = encrypted.slice('enc:v1:'.length).split(':')[0];
      ivs.add(iv);
    }

    assert.strictEqual(
      ciphertexts.size,
      sampleSize,
      `Expected ${sampleSize} unique ciphertexts, but got ${ciphertexts.size} (collision detected!)`
    );

    assert.strictEqual(
      ivs.size,
      sampleSize,
      `Expected ${sampleSize} unique IVs, but got ${ivs.size} (IV collision detected!)`
    );
  });

  test('5.4: All randomized ciphertexts decrypt back to identical source plaintext', () => {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const cipher = cryptoModule.encryptField(constantPlaintext);
      const decrypted = cryptoModule.decryptField(cipher);
      assert.strictEqual(decrypted, constantPlaintext);
    }
  });
});
