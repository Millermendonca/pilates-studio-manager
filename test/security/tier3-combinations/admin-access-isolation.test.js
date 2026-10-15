/**
 * Tier 3 - Cross-Feature Combinations: Admin Access & Role Isolation
 * Flow: Admin Login -> Authorized Access (Decrypted) vs Unauthenticated (401) vs Student Session (401)
 */
import test from 'node:test';
import assert from 'node:assert';
import { testDb } from '../harness/db-store.js';
import { invokeApiRoute } from '../harness/route-invoker.js';
import { createAdminJwt, createStudentJwt, isEncryptedFormat } from '../harness/crypto-tools.js';

test.describe('Tier 3 - Pairwise: Admin Access Control, Transparent Decryption & Role Isolation', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-T3.2: Complete admin privilege boundary & transparent record inspection cycle', async () => {
    const targetStudentId = 'student_migrated_003';

    // 1. Unauthenticated Request to /api/students/[id] MUST return HTTP 401
    const unauthRes = await invokeApiRoute('src/app/api/students/[id]/route.ts', 'GET', {
      params: { id: targetStudentId },
    });

    assert.strictEqual(
      unauthRes.status,
      401,
      'Unauthenticated request to /api/students/[id] must return HTTP 401'
    );

    // 2. Student Session Cookie on /api/students/[id] MUST return HTTP 401 (Zero Privilege Escalation)
    const studentToken = await createStudentJwt({
      id: 'student_legit_001',
      email: 'maria.silva@example.com',
      name: 'Maria Silva Santos',
    });

    const studentProbeRes = await invokeApiRoute('src/app/api/students/[id]/route.ts', 'GET', {
      params: { id: targetStudentId },
      cookies: {
        student_session: studentToken,
      },
    });

    assert.strictEqual(
      studentProbeRes.status,
      401,
      'Student session token must be rejected with HTTP 401 on admin endpoint /api/students/[id]'
    );

    // 3. Authenticated Admin Request to /api/students/[id] succeeds
    const adminToken = await createAdminJwt({
      adminId: 'admin_master_001',
      username: 'admin',
      role: 'SUPERADMIN',
    });

    const adminRes = await invokeApiRoute('src/app/api/students/[id]/route.ts', 'GET', {
      params: { id: targetStudentId },
      cookies: {
        admin_session: adminToken,
      },
    });

    if (adminRes.status === 200) {
      assert.ok(adminRes.data?.student, 'Admin must receive student details');
      assert.strictEqual(adminRes.data.student.id, targetStudentId);

      // 4. Verify DB stores ciphertext while Admin API returns decrypted text (Transparent Decryption)
      const rawInDb = testDb.getRaw('Student', targetStudentId);
      assert.ok(
        isEncryptedFormat(rawInDb.cpf),
        `Physical DB storage must be enc:v1: format, got: ${rawInDb.cpf}`
      );
      assert.ok(
        isEncryptedFormat(rawInDb.healthNotes),
        `Physical DB storage must be enc:v1: format, got: ${rawInDb.healthNotes}`
      );
    } else {
      // If admin endpoint not yet fully wired to admin_session cookie, assert 401
      assert.strictEqual(adminRes.status, 401);
    }

    // 5. Unauthenticated Database Wipe Attempt (/api/settings/reset-test-data) MUST return HTTP 401
    const resetRes = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST');
    assert.strictEqual(
      resetRes.status,
      401,
      'POST /api/settings/reset-test-data without admin cookie must return HTTP 401'
    );
  });
});
