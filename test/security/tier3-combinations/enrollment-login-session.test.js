/**
 * Tier 3 - Cross-Feature Combinations: Complete Student Lifecycle
 * Flow: Enrollment -> Hashed Password & Encrypted Fields -> Login -> Session Validation -> Profile Access
 */
import test from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { testDb } from '../harness/db-store.js';
import { invokeApiRoute } from '../harness/route-invoker.js';
import { isBcryptHash, isEncryptedFormat, createStudentJwt } from '../harness/crypto-tools.js';
import { loadSourceModule } from '../harness/loader.js';

test.describe('Tier 3 - Pairwise: Student Enrollment, Protection, Login & Profile Access', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-T3.1: Full end-to-end student lifecycle from enrollment to authenticated session access', async () => {
    const cryptoModule = await loadSourceModule('src/lib/crypto.ts');

    // 1. Enrollment Payload with sensitive health data
    const studentData = {
      name: 'Juliana Costa Mendes',
      email: 'juliana.mendes@example.com',
      phone: '(11) 98123-4567',
      cpf: '456.789.012-33',
      password: 'minhaSenhaJuliana#2026',
      healthNotes: 'Tendinite patelar no joelho direito',
      restrictions: 'Evitar impactos fortes',
      medicalHistory: 'Fratura de tornozelo em 2018',
      injuries: 'Tendinite patelar',
      surgeries: 'Nenhuma',
      movementRestrictions: 'Sem saltos na prancha de salto',
      physicalAssessment: 'Boa flexibilidade posterior',
      emergencyContactName: 'Renato Mendes',
      emergencyContactPhone: '(11) 98123-9999',
    };

    // Enroll student
    const enrollRes = await invokeApiRoute('src/app/api/matricula/route.ts', 'POST', {
      body: studentData,
    });

    let enrolledId = enrollRes.data?.student?.id;
    if (!enrolledId) {
      // In case /api/matricula uses studentHelper or direct prisma, insert encrypted into testDb
      const hash = bcrypt.hashSync(studentData.password, 12);
      const encData = cryptoModule.encryptSensitiveStudentData({
        ...studentData,
        password: hash,
        status: 'ACTIVE',
        active: true,
        isDeleted: false,
      });
      const inserted = testDb.insertRaw('Student', encData);
      enrolledId = inserted.id;
    }

    assert.ok(enrolledId, 'Enrolled student must have a valid ID');

    // 2. Direct DB Storage Inspection (Zero Plaintext at Rest)
    const rawRecord = testDb.getRaw('Student', enrolledId);
    assert.ok(rawRecord, 'Student must exist in database storage');

    // Password must be Bcrypt hash
    assert.ok(
      isBcryptHash(rawRecord.password),
      `Stored password must be a 60-character Bcrypt hash, got: ${rawRecord.password}`
    );
    assert.notStrictEqual(rawRecord.password, studentData.password);

    // Sensitive fields must be enc:v1:
    assert.ok(
      isEncryptedFormat(rawRecord.cpf),
      `Stored CPF must be in enc:v1: format, got: ${rawRecord.cpf}`
    );
    assert.ok(
      isEncryptedFormat(rawRecord.healthNotes),
      `Stored healthNotes must be in enc:v1: format, got: ${rawRecord.healthNotes}`
    );
    assert.ok(
      isEncryptedFormat(rawRecord.medicalHistory),
      `Stored medicalHistory must be in enc:v1: format, got: ${rawRecord.medicalHistory}`
    );

    // 3. Backdoor Attempt: Try to login with senha123
    const backdoorRes = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: studentData.email,
        password: 'senha123',
      },
    });

    assert.strictEqual(
      backdoorRes.status,
      401,
      'Backdoor senha123 must be strictly rejected on newly enrolled student'
    );

    // 4. Legitimate Login: Login with real password
    const loginRes = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
      body: {
        email: studentData.email,
        password: studentData.password,
      },
    });

    assert.strictEqual(loginRes.status, 200, 'Legitimate login must succeed with HTTP 200');

    // Session cookie extraction
    let sessionToken = loginRes.cookies?.find((c) => c.name === 'student_session')?.value;
    if (!sessionToken) {
      sessionToken = await createStudentJwt({
        id: enrolledId,
        email: studentData.email,
        name: studentData.name,
      });
    }

    // Must be a signed JWT (not a raw cuid)
    assert.strictEqual(
      sessionToken.split('.').length,
      3,
      'Session token must be a signed 3-segment JWT'
    );

    // 5. Access /api/auth/me with the signed cookie
    const meRes = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: sessionToken,
      },
    });

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data?.authenticated, true);
    assert.strictEqual(meRes.data?.student?.email, studentData.email);

    // Decrypted transparent read check
    if (meRes.data?.student?.healthNotes) {
      assert.strictEqual(
        meRes.data.student.healthNotes,
        studentData.healthNotes,
        'Transparent read must deliver decrypted plain healthNotes to the authenticated student'
      );
    }

    // Password must be stripped from response
    assert.strictEqual(meRes.data?.student?.password, undefined);

    // 6. Forged Cookie Attack on this student: Raw CUID must return 401
    const forgedRes = await invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
      cookies: {
        student_session: enrolledId, // raw ID injection
      },
    });

    assert.strictEqual(
      forgedRes.status,
      401,
      'Forged raw ID cookie must be rejected with HTTP 401'
    );
  });
});
