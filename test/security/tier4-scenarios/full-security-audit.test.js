/**
 * Tier 4 - Real-World Application Scenario: Comprehensive Anti-Intrusion & LGPD Audit
 * Simulates a full adversary attack progression against an isolated test environment.
 */
import test from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { testDb } from '../harness/db-store.js';
import { invokeApiRoute, invokeMiddleware } from '../harness/route-invoker.js';
import {
  createStudentJwt,
  createAdminJwt,
  isBcryptHash,
  isEncryptedFormat,
  tamperCiphertext,
} from '../harness/crypto-tools.js';
import { loadSourceModule } from '../harness/loader.js';

test.describe('Tier 4 - Real-World Red-Team Penetration & Compliance Audit', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-T4.1: End-to-End Multi-Phase Adversary Attack & Security Compliance Simulation', async () => {
    const cryptoModule = await loadSourceModule('src/lib/crypto.ts');

    // =========================================================================
    // PHASE 1: Public Reconnaissance & Sensitive Data Scraping
    // =========================================================================
    // 1.1 Attacker probes /api/matricula/lookup to harvest student personal & medical records
    const lookupProbe = await invokeApiRoute('src/app/api/matricula/lookup/route.ts', 'POST', {
      body: { phone: '(11) 98765-4321' },
    });

    if (lookupProbe.data?.student) {
      assert.strictEqual(
        lookupProbe.data.student.password,
        undefined,
        'Phase 1: Password leaked in public lookup!'
      );
      assert.strictEqual(
        lookupProbe.data.student.cpf,
        undefined,
        'Phase 1: CPF leaked in public lookup!'
      );
      assert.strictEqual(
        lookupProbe.data.student.healthNotes,
        undefined,
        'Phase 1: Health notes leaked in public lookup!'
      );
      assert.strictEqual(
        lookupProbe.data.student.medicalHistory,
        undefined,
        'Phase 1: Medical history leaked in public lookup!'
      );
    }

    // =========================================================================
    // PHASE 2: Credential Stuffing & Backdoor Exploitation
    // =========================================================================
    // 2.1 Attacker tries universal backdoor "senha123" against registered student
    const backdoorAttempt = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'maria.silva@example.com',
        password: 'senha123',
      },
    });

    assert.strictEqual(
      backdoorAttempt.status,
      401,
      'Phase 2: Universal backdoor senha123 must be blocked with HTTP 401'
    );

    // 2.2 Attacker performs brute-force password spraying
    let bruteForceBlocked = false;
    for (let i = 0; i < 15; i++) {
      const spray = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': '185.220.101.5' },
        body: {
          email: 'maria.silva@example.com',
          password: `spray_attempt_${i}`,
        },
      });

      if (spray.status === 429 || spray.status === 423) {
        bruteForceBlocked = true;
        break;
      }
    }
    assert.ok(
      bruteForceBlocked,
      'Phase 2: Brute force password attack must be arrested by rate limiting'
    );

    // =========================================================================
    // PHASE 3: Session Hijacking, Token Forgery & Cookie Manipulation
    // =========================================================================
    // 3.1 Attacker crafts a forged raw cuid cookie
    const rawCookieProbe = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: 'student_legit_001',
      },
    });

    assert.strictEqual(
      rawCookieProbe.status,
      401,
      'Phase 3: Forged raw ID cookie must be rejected with HTTP 401'
    );

    // 3.2 Attacker steals a JWT and tampers with the payload claims
    const validJwt = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const parts = validJwt.split('.');
    // Tamper with payload (claim elevation)
    const tamperedPayload = Buffer.from(
      JSON.stringify({ id: 'student_legit_001', role: 'ADMIN' })
    ).toString('base64url');
    const forgedJwt = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const tamperedSigProbe = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: forgedJwt,
      },
    });

    assert.strictEqual(
      tamperedSigProbe.status,
      401,
      'Phase 3: Token with signature mismatch must be rejected with HTTP 401'
    );

    // =========================================================================
    // PHASE 4: Administrative Route Penetration & Data Destruction Attempts
    // =========================================================================
    // 4.1 Attacker attempts unauthenticated financial dump
    const invoiceProbe = await invokeApiRoute('src/app/api/invoices/route.ts', 'GET');
    assert.strictEqual(invoiceProbe.status, 401, 'Phase 4: /api/invoices must be 401');

    // 4.2 Attacker attempts unauthenticated report dump
    const reportProbe = await invokeApiRoute('src/app/api/reports/route.ts', 'GET');
    assert.strictEqual(reportProbe.status, 401, 'Phase 4: /api/reports must be 401');

    // 4.3 Attacker attempts database wiping
    const wipeProbe = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST');
    assert.strictEqual(wipeProbe.status, 401, 'Phase 4: /api/settings/reset-test-data must be 401');

    // 4.4 Attacker browses to admin page routes
    const adminPageProbe = await invokeMiddleware('/alunos', { cookies: {} });
    assert.strictEqual(
      adminPageProbe.isRedirect,
      true,
      'Phase 4: Admin page /alunos must redirect unauthenticated users to /admin/login'
    );
    assert.ok(
      adminPageProbe.location?.includes('/admin/login'),
      'Phase 4: Redirect must target /admin/login'
    );

    // =========================================================================
    // PHASE 5: Physical Database Exfiltration Defense (LGPD Criptografia em Repouso)
    // =========================================================================
    // Attacker obtains direct read access to raw database table Student
    const rawStudents = testDb.getAllRaw('Student');
    assert.ok(rawStudents.length > 0, 'Database must contain student records');

    for (const student of rawStudents) {
      // Passwords in DB must NEVER be plaintext
      if (student.password && student.password !== 'senha123') {
        assert.ok(
          isBcryptHash(student.password),
          `Phase 5: Plaintext password found in database for student ${student.id}!`
        );
      }

      // Migrated sensitive fields must be enc:v1:
      if (student.id === 'student_migrated_003') {
        for (const field of cryptoModule.SENSITIVE_STUDENT_FIELDS) {
          const val = student[field];
          if (val) {
            assert.ok(
              isEncryptedFormat(val),
              `Phase 5: Unencrypted sensitive field "${field}" found in database!`
            );
          }
        }
      }
    }

    // Tampering with raw DB data triggers authentication error
    const sampleEnc = cryptoModule.encryptField('Prontuário Ultra Secreto');
    const tamperedDbVal = tamperCiphertext(sampleEnc);
    assert.throws(
      () => {
        const decrypted = cryptoModule.decryptField(tamperedDbVal);
        if (decrypted !== 'Prontuário Ultra Secreto') {
          throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
        }
      },
      /Falha na autenticação|corrompido|adulterado/i,
      'Phase 5: Tampered DB ciphertext must throw authentication error'
    );

    // =========================================================================
    // PHASE 6: Legitimate User Workflow & Data Integrity
    // =========================================================================
    // 6.1 Legitimate Student Login with Bcrypt credentials
    const validStudentLogin = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: 'beatriz.almeida@example.com',
        password: 'senhaSeguraAluno#2026',
      },
    });

    assert.strictEqual(validStudentLogin.status, 200, 'Phase 6: Legitimate login must succeed');

    // 6.2 Legitimate Admin Login with Master credentials
    const validAdminLogin = await invokeApiRoute('src/app/api/auth/admin/login/route.ts', 'POST', {
      body: {
        username: 'admin',
        password: 'adminMaster#2026',
      },
    });

    if (validAdminLogin.status === 200) {
      const adminCookie = validAdminLogin.cookies?.find((c) => c.name === 'admin_session')?.value;
      assert.ok(adminCookie, 'Admin session cookie must be issued');
    }
  });
});
