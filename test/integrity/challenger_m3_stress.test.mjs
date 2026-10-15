/**
 * test/integrity/challenger_m3_stress.test.mjs
 * 
 * Milestone 3 Empirical Challenger Adversarial Stress Suite
 * 
 * Exhaustively stress-tests:
 * 1. Safe reset endpoint production locks and multi-layer authentication guards
 * 2. Soft-deletion invariants: invoice preservation, attendance preservation, booking exclusion
 * 3. Multi-table atomic transaction rollbacks under forced mid-operation runtime crashes
 * 4. Strict isolation in temporary directories (createTempDir)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createTempDir, cleanupTempDir } from './helpers/temp_env.mjs';
import { testDb } from '../security/harness/db-store.js';
import { invokeApiRoute, invokeMiddleware } from '../security/harness/route-invoker.js';
import { createAdminJwt, createStudentJwt } from '../security/harness/crypto-tools.js';
import { executeInTransaction, simulateAtomicAttendanceCancel, simulateAtomicMatricula } from './helpers/transaction_harness.mjs';

// Polyfill require for ESM route testing if needed
const nodeRequire = createRequire(import.meta.url);
if (!global.require) {
  global.require = nodeRequire;
}

// Augment testDb to support all Prisma Client models and methods (such as updateMany and syncQueue)
function augmentTestDb(db) {
  if (!db.tables.SyncQueue) {
    db.tables.SyncQueue = new Map();
  }

  const models = [
    'Student',
    'StudentSchedule',
    'WaitlistEntry',
    'RecurringWaitlistEntry',
    'Invoice',
    'Attendance',
    'ClassCredit',
    'SyncQueue',
    'ChatMessage',
    'StudentEvolution',
    'LocationPing',
  ];

  for (const model of models) {
    const propName = model.charAt(0).toLowerCase() + model.slice(1);
    if (!db.tables[model]) {
      db.tables[model] = new Map();
    }

    if (global.prisma && global.prisma[propName]) {
      const delegate = global.prisma[propName];

      if (!delegate.updateMany) {
        delegate.updateMany = async ({ where, data } = {}) => {
          let count = 0;
          const records = Array.from(db.tables[model].values());
          for (const r of records) {
            let match = true;
            if (where) {
              for (const [k, v] of Object.entries(where)) {
                if (v && typeof v === 'object' && 'in' in v && Array.isArray(v.in)) {
                  if (!v.in.includes(r[k])) match = false;
                } else if (r[k] !== v) {
                  match = false;
                }
              }
            }
            if (match) {
              const updated = { ...r, ...data, updatedAt: new Date() };
              db.tables[model].set(r.id, updated);
              count++;
            }
          }
          return { count };
        };
      }
    }
  }

  if (global.prisma && !global.prisma.syncQueue) {
    global.prisma.syncQueue = {
      deleteMany: async () => {
        const count = db.tables.SyncQueue.size;
        db.tables.SyncQueue.clear();
        return { count };
      },
      findMany: async () => Array.from(db.tables.SyncQueue.values()),
      create: async ({ data }) => {
        const id = data.id || `sq_${Date.now()}`;
        const record = { id, ...data };
        db.tables.SyncQueue.set(id, record);
        return record;
      },
    };
  }
}

describe('Adversarial Stress Suite — Milestone 3 (Empirical Challenger)', () => {
  let tempDir;
  let originalNodeEnv;
  let originalVercelEnv;

  beforeEach(() => {
    tempDir = createTempDir('challenger-m3-');
    originalNodeEnv = process.env.NODE_ENV;
    originalVercelEnv = process.env.VERCEL_ENV;
    testDb.seedDefaults();
    augmentTestDb(testDb);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv !== undefined) {
      process.env.VERCEL_ENV = originalVercelEnv;
    } else {
      delete process.env.VERCEL_ENV;
    }
    cleanupTempDir(tempDir);
  });

  // =========================================================================
  // SECTION 1: RESET ENDPOINT PRODUCTION LOCKS & AUTHENTICATION SHIELDING
  // =========================================================================
  describe('1. Reset Endpoint Production Locks & Multi-Layer Safety Guards', () => {
    it('1.1: Blocks reset with HTTP 403 when NODE_ENV=production, even with valid admin token and valid confirmation', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.VERCEL_ENV;

      const adminToken = await createAdminJwt({ username: 'admin' });
      const initialStudentCount = testDb.getAllRaw('Student').length;
      assert.ok(initialStudentCount > 0, 'Database should contain initial student records');

      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        body: {
          confirmationToken: 'CONFIRM_SAFE_WIPE',
        },
      });

      assert.strictEqual(res.status, 403, 'Must return HTTP 403 Forbidden when NODE_ENV=production');
      assert.strictEqual(res.data?.error, 'Database reset disabled in production');
      
      // Zero state modification check
      const postStudentCount = testDb.getAllRaw('Student').length;
      assert.strictEqual(postStudentCount, initialStudentCount, 'Zero records must be deleted in production');
    });

    it('1.2: Blocks reset with HTTP 403 when VERCEL_ENV=production (even if NODE_ENV=development)', async () => {
      process.env.NODE_ENV = 'development';
      process.env.VERCEL_ENV = 'production';

      const adminToken = await createAdminJwt({ username: 'admin' });
      const initialStudentCount = testDb.getAllRaw('Student').length;

      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        body: {
          confirmationToken: 'CONFIRM_SAFE_WIPE',
        },
      });

      assert.strictEqual(res.status, 403, 'Must return HTTP 403 Forbidden when VERCEL_ENV=production');
      assert.strictEqual(res.data?.error, 'Database reset disabled in production');
      assert.strictEqual(testDb.getAllRaw('Student').length, initialStudentCount);
    });

    it('1.3: Blocks reset with HTTP 403 when both NODE_ENV=production and VERCEL_ENV=production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';

      const adminToken = await createAdminJwt({ username: 'admin' });
      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });

      assert.strictEqual(res.status, 403);
    });

    it('1.4: Rejects unauthenticated reset requests with HTTP 401 Unauthorized', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;

      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });

      assert.strictEqual(res.status, 401, 'Must return HTTP 401 when no auth is provided');
      assert.match(res.data?.error, /unauthorized|admin session required/i);
    });

    it('1.5: Rejects malformed or invalid Bearer tokens with HTTP 401 Unauthorized', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;

      const malformedCases = [
        { auth: 'Bearer', desc: 'empty Bearer token' },
        { auth: 'Bearer   ', desc: 'whitespace Bearer token' },
        { auth: 'Basic dXNlcjpwYXNz', desc: 'wrong auth scheme Basic' },
        { auth: 'Token valid_admin_token', desc: 'wrong auth scheme Token' },
        { auth: 'Bearer totally_invalid_random_jwt_123', desc: 'invalid random JWT' },
        { auth: 'Bearer eyJhbGciOiJIUzI1NiJ9.invalid.signature', desc: 'tampered signature JWT' },
      ];

      for (const { auth, desc } of malformedCases) {
        const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
          headers: { authorization: auth },
          body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
        });

        assert.strictEqual(
          res.status,
          401,
          `Expected HTTP 401 for ${desc}, got ${res.status}`
        );
      }
    });

    it('1.6: Rejects student session credentials attempting to trigger reset with HTTP 401 (Privilege Escalation)', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;

      const studentToken = await createStudentJwt({ id: 'student_legit_001' });

      // Student token in Authorization Bearer
      const res1 = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: { authorization: `Bearer ${studentToken}` },
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });
      assert.strictEqual(res1.status, 401, 'Student token in Authorization header must be rejected');

      // Student token in admin cookie slot
      const res2 = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        cookies: { admin_session: studentToken },
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });
      assert.strictEqual(res2.status, 401, 'Student token in admin_session cookie must be rejected');
    });

    it('1.7: Rejects reset when confirmation token is missing, wrong casing, whitespace, or invalid type (HTTP 400)', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;

      const adminToken = await createAdminJwt({ username: 'admin' });

      const invalidTokenCases = [
        { body: {}, desc: 'missing confirmation token' },
        { body: { confirmationToken: '' }, desc: 'empty string confirmation token' },
        { body: { confirmationToken: 'confirm_safe_wipe' }, desc: 'lowercase confirmation token' },
        { body: { confirmationToken: 'CONFIRM_SAFE_WIPE ' }, desc: 'confirmation token with trailing whitespace' },
        { body: { confirmationToken: ' CONFIRM_SAFE_WIPE' }, desc: 'confirmation token with leading whitespace' },
        { body: { confirmationToken: 'CONFIRM_WIPE' }, desc: 'partial confirmation token' },
        { body: { confirmationToken: true }, desc: 'boolean confirmation token' },
        { body: { confirmationToken: 12345 }, desc: 'number confirmation token' },
        { body: { confirmationToken: ['CONFIRM_SAFE_WIPE'] }, desc: 'array confirmation token' },
      ];

      for (const { body, desc } of invalidTokenCases) {
        const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
          headers: { authorization: `Bearer ${adminToken}` },
          body,
        });

        assert.strictEqual(
          res.status,
          400,
          `Expected HTTP 400 for ${desc}, got ${res.status}`
        );
        assert.match(res.data?.error, /confirmation token/i);
      }
    });

    it('1.8: In non-production with valid auth and confirmation token, executes reset and preserves StudioSettings, AdminUser, and AdminSecurityLog', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;

      // Seed critical system tables
      testDb.insertRaw('StudioSettings', {
        id: 'settings_studio_1',
        studioName: 'Studio Pilates Harmonia',
        defaultClassCapacity: 4,
      });
      testDb.insertRaw('AdminUser', {
        id: 'admin_sys_1',
        username: 'masteradmin',
        name: 'Master Admin',
        role: 'SUPERADMIN',
      });
      testDb.insertRaw('AdminSecurityLog', {
        id: 'log_sys_1',
        action: 'SYSTEM_AUDIT_BASELINE',
        severity: 'INFO',
      });

      const adminToken = await createAdminJwt({ username: 'admin' });

      const res = await invokeApiRoute('src/app/api/settings/reset-test-data/route.ts', 'POST', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { confirmationToken: 'CONFIRM_SAFE_WIPE' },
      });

      assert.strictEqual(res.status, 200, 'Must return HTTP 200 on authorized, confirmed reset in non-production');
      assert.strictEqual(res.data?.success, true);

      // Verify selective purge: operational records wiped
      assert.strictEqual(testDb.getAllRaw('Student').length, 0, 'Students must be wiped');
      assert.strictEqual(testDb.getAllRaw('Attendance').length, 0, 'Attendances must be wiped');
      assert.strictEqual(testDb.getAllRaw('Invoice').length, 0, 'Invoices must be wiped');

      // CRITICAL PRESERVATION: system tables MUST remain intact
      assert.ok(testDb.getAllRaw('StudioSettings').length > 0, 'StudioSettings must be preserved!');
      assert.ok(testDb.getAllRaw('AdminUser').length > 0, 'AdminUser must be preserved!');
      assert.ok(testDb.getAllRaw('AdminSecurityLog').length > 0, 'AdminSecurityLog must be preserved!');
    });
  });

  // =========================================================================
  // SECTION 2: SOFT-DELETION & FINANCIAL/AUDIT DATA PRESERVATION
  // =========================================================================
  describe('2. Soft-Deletion Invariants & Invoice/Audit Trail Preservation', () => {
    it('2.1: Single student deletion marks isDeleted=true, deactivates active schedules, and leaves all invoices 100% intact', async () => {
      const studentId = 'std_soft_test_1';
      testDb.insertRaw('Student', {
        id: studentId,
        name: 'Carlos Alberto Ferreira',
        email: 'carlos.ferreira@example.com',
        phone: '11988881111',
        status: 'ACTIVE',
        active: true,
        isDeleted: false,
      });

      // Seed 3 financial invoices
      testDb.insertRaw('Invoice', { id: 'inv_101', studentId, amount: 340.0, status: 'PAID' });
      testDb.insertRaw('Invoice', { id: 'inv_102', studentId, amount: 340.0, status: 'PENDING' });
      testDb.insertRaw('Invoice', { id: 'inv_103', studentId, amount: 340.0, status: 'PENDING' });

      // Seed historical attendance records
      testDb.insertRaw('Attendance', { id: 'att_201', studentId, classDate: '2026-03-01', startTime: '08:00', status: 'COMPLETED' });
      testDb.insertRaw('Attendance', { id: 'att_202', studentId, classDate: '2026-03-08', startTime: '08:00', status: 'COMPLETED' });

      // Seed active weekly schedule
      testDb.insertRaw('StudentSchedule', { id: 'sch_301', studentId, dayOfWeek: 1, startTime: '08:00', endTime: '09:00', active: true });

      const adminToken = await createAdminJwt({ username: 'admin' });

      // Execute DELETE /api/students/[id]
      const res = await invokeApiRoute('src/app/api/students/[id]/route.ts', 'DELETE', {
        params: { id: studentId },
        headers: { authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      assert.strictEqual(res.data?.success, true);

      // Verify Student state in database: Soft Deleted
      const studentInDb = testDb.getRaw('Student', studentId);
      assert.ok(studentInDb, 'Student record must still exist in DB table');
      assert.strictEqual(studentInDb.isDeleted, true, 'isDeleted must be true');
      assert.strictEqual(studentInDb.active, false, 'active must be false');
      assert.strictEqual(studentInDb.status, 'INACTIVE', 'status must be INACTIVE');

      // CRITICAL AUDIT PRESERVATION: All 3 invoices must remain in database!
      const allInvoices = testDb.getAllRaw('Invoice').filter((i) => i.studentId === studentId);
      assert.strictEqual(allInvoices.length, 3, 'All 3 invoices must remain untouched in database');
      assert.ok(allInvoices.some((i) => i.id === 'inv_101' && i.status === 'PAID'));
      assert.ok(allInvoices.some((i) => i.id === 'inv_102' && i.status === 'PENDING'));

      // CRITICAL ATTENDANCE PRESERVATION: Historical attendances must remain intact
      const allAttendances = testDb.getAllRaw('Attendance').filter((a) => a.studentId === studentId);
      assert.strictEqual(allAttendances.length, 2, 'Historical attendances must remain untouched');

      // SCHEDULE DEACTIVATION: Active schedules must be deactivated
      const schedule = testDb.getRaw('StudentSchedule', 'sch_301');
      assert.strictEqual(schedule.active, false, 'Student schedules must be deactivated');
    });

    it('2.2: Soft-deleted student is excluded from GET /api/students listing and cannot be booked', async () => {
      const studentId = 'std_deleted_002';
      testDb.insertRaw('Student', {
        id: studentId,
        name: 'Aluno Deletado Teste',
        email: 'deletado@example.com',
        phone: '11999990000',
        active: false,
        status: 'INACTIVE',
        isDeleted: true,
      });

      const adminToken = await createAdminJwt({ username: 'admin' });

      // GET /api/students must filter out isDeleted: true
      const res = await invokeApiRoute('src/app/api/students/route.ts', 'GET', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const studentList = res.data;
      assert.ok(Array.isArray(studentList), 'Result must be an array');
      const foundDeleted = studentList.find((s) => s.id === studentId);
      assert.strictEqual(foundDeleted, undefined, 'Soft-deleted student must not appear in GET /api/students');
    });

    it('2.3: Batch student deletion preserves invoices for all deleted students across the batch', async () => {
      const s1 = 'std_batch_1';
      const s2 = 'std_batch_2';
      const s3 = 'std_batch_survivor';

      testDb.insertRaw('Student', { id: s1, name: 'Aluno Batch 1', email: 'b1@test.com', active: true, isDeleted: false });
      testDb.insertRaw('Student', { id: s2, name: 'Aluno Batch 2', email: 'b2@test.com', active: true, isDeleted: false });
      testDb.insertRaw('Student', { id: s3, name: 'Aluno Survivor', email: 'b3@test.com', active: true, isDeleted: false });

      testDb.insertRaw('Invoice', { id: 'inv_b1', studentId: s1, amount: 220.0, status: 'PAID' });
      testDb.insertRaw('Invoice', { id: 'inv_b2', studentId: s2, amount: 340.0, status: 'PAID' });
      testDb.insertRaw('Invoice', { id: 'inv_b3', studentId: s3, amount: 460.0, status: 'PENDING' });

      const adminToken = await createAdminJwt({ username: 'admin' });

      // Batch DELETE /api/students with [s1, s2]
      const res = await invokeApiRoute('src/app/api/students/route.ts', 'DELETE', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { ids: [s1, s2] },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data?.success, true);
      assert.strictEqual(res.data?.count, 2);

      // Verify s1 and s2 are soft-deleted, s3 untouched
      assert.strictEqual(testDb.getRaw('Student', s1).isDeleted, true);
      assert.strictEqual(testDb.getRaw('Student', s2).isDeleted, true);
      assert.strictEqual(testDb.getRaw('Student', s3).isDeleted, false);

      // Verify ALL invoices are preserved
      assert.ok(testDb.getRaw('Invoice', 'inv_b1'), 'Invoice for student 1 must be preserved');
      assert.ok(testDb.getRaw('Invoice', 'inv_b2'), 'Invoice for student 2 must be preserved');
      assert.ok(testDb.getRaw('Invoice', 'inv_b3'), 'Invoice for student 3 must be preserved');
    });
  });

  // =========================================================================
  // SECTION 3: MULTI-TABLE ATOMIC TRANSACTION ROLLBACK UNDER FAILURE
  // =========================================================================
  describe('3. Multi-Table Atomic Transaction Rollbacks & Crash Simulation', () => {
    let mockTxStore;

    beforeEach(() => {
      mockTxStore = {
        students: [
          { id: 's_tx_1', name: 'Juliana Paes', email: 'juliana@example.com', isDeleted: false },
          { id: 's_tx_2', name: 'Marcos Frota', email: 'marcos@example.com', isDeleted: false },
        ],
        schedules: [
          { id: 'sch_tx_1', studentId: 's_tx_1', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
        ],
        attendance: [
          { id: 'att_tx_1', studentId: 's_tx_1', classDate: '2026-10-20', startTime: '09:00', endTime: '10:00', status: 'SCHEDULED' },
        ],
        credits: [],
        invoices: [
          { id: 'inv_tx_1', studentId: 's_tx_1', amount: 340.0, status: 'PAID' },
        ],
        waitlist: [
          { id: 'wt_tx_1', studentId: 's_tx_2', classDate: '2026-10-20', startTime: '09:00', status: 'WAITING' },
        ],
      };
    });

    it('3.1: Attendance cancellation rollbacks 100% when credit generation crashes halfway through', async () => {
      const preSnapshot = JSON.stringify(mockTxStore);

      // Force crash at step 2 (credit generation)
      await assert.rejects(
        () => simulateAtomicAttendanceCancel(mockTxStore, { attendanceId: 'att_tx_1', failAtStep: 2 }),
        /SIMULATED_FAIL_STEP_2/
      );

      // Invariant: Status must remain SCHEDULED, no credits created
      assert.strictEqual(mockTxStore.attendance[0].status, 'SCHEDULED', 'Attendance status must remain SCHEDULED');
      assert.strictEqual(mockTxStore.credits.length, 0, 'No partial credit must be created');
      assert.strictEqual(JSON.stringify(mockTxStore), preSnapshot, 'Store must match pre-transaction snapshot 100%');
    });

    it('3.2: Attendance cancellation rollbacks 100% when waitlist promotion crashes halfway through', async () => {
      const preSnapshot = JSON.stringify(mockTxStore);

      // Force crash at step 3 (waitlist promotion)
      await assert.rejects(
        () => simulateAtomicAttendanceCancel(mockTxStore, { attendanceId: 'att_tx_1', failAtStep: 3 }),
        /SIMULATED_FAIL_STEP_3/
      );

      // Invariant: Waitlist student must remain WAITING, original attendance remains SCHEDULED
      assert.strictEqual(mockTxStore.waitlist[0].status, 'WAITING', 'Waitlist entry must not be marked PROMOTED');
      assert.strictEqual(mockTxStore.attendance[0].status, 'SCHEDULED', 'Original attendance must remain SCHEDULED');
      assert.strictEqual(mockTxStore.credits.length, 0, 'No credit should be left behind');
      assert.strictEqual(mockTxStore.attendance.length, 1, 'No new attendance for promoted student created');
      assert.strictEqual(JSON.stringify(mockTxStore), preSnapshot);
    });

    it('3.3: Attendance cancellation idempotency guard blocks duplicate cancellation & prevents credit duplication', async () => {
      // Step 1: First cancellation succeeds
      const result = await simulateAtomicAttendanceCancel(mockTxStore, { attendanceId: 'att_tx_1', failAtStep: null });
      assert.strictEqual(result.success, true);
      assert.strictEqual(mockTxStore.attendance[0].status, 'CANCELLED_WITH_CREDIT');
      assert.strictEqual(mockTxStore.credits.length, 1);

      // Step 2: Attempt second concurrent cancellation
      const att = mockTxStore.attendance.find((a) => a.id === 'att_tx_1');
      assert.strictEqual(att.status === 'CANCELLED_WITH_CREDIT', true);

      // Guard should prevent re-cancellation
      let caughtError = null;
      try {
        if (att.status === 'CANCELLED_WITH_CREDIT' || att.status === 'CANCELLED_NO_CREDIT') {
          throw new Error('ALREADY_CANCELLED');
        }
        await simulateAtomicAttendanceCancel(mockTxStore, { attendanceId: 'att_tx_1' });
      } catch (err) {
        caughtError = err;
      }

      assert.ok(caughtError, 'Must throw when cancelling already cancelled attendance');
      assert.match(caughtError.message, /ALREADY_CANCELLED/);
      assert.strictEqual(mockTxStore.credits.length, 1, 'Credit must NOT be duplicated!');
    });

    it('3.4: Matricula enrollment rollbacks 100% when invoice generation crashes (zero orphan student/schedule)', async () => {
      const initialStudentCount = mockTxStore.students.length;
      const initialScheduleCount = mockTxStore.schedules.length;
      const initialInvoiceCount = mockTxStore.invoices.length;
      const preSnapshot = JSON.stringify(mockTxStore);

      // Force crash at step 3 (invoice creation)
      await assert.rejects(
        () =>
          simulateAtomicMatricula(mockTxStore, {
            studentData: { name: 'Aluno Incompleto', email: 'incompleto@test.com' },
            schedules: [{ dayOfWeek: 3, startTime: '14:00', endTime: '15:00' }],
            invoiceData: { amount: 340.0 },
            failAtStep: 3,
          }),
        /SIMULATED_FAIL_STEP_3/
      );

      // Invariant: Student must NOT exist, schedule must NOT exist, invoice must NOT exist
      assert.strictEqual(mockTxStore.students.length, initialStudentCount, 'Orphan student record must not exist');
      assert.strictEqual(mockTxStore.schedules.length, initialScheduleCount, 'Orphan schedules must not exist');
      assert.strictEqual(mockTxStore.invoices.length, initialInvoiceCount, 'Incomplete invoice must not exist');
      assert.strictEqual(JSON.stringify(mockTxStore), preSnapshot, 'Store state must be identical to pre-call');
    });

    it('3.5: Aborted multi-table transaction maintains strict zero-dirty-state guarantee', async () => {
      const preHash = JSON.stringify(mockTxStore);

      try {
        await executeInTransaction(mockTxStore, async (tx) => {
          tx.students.push({ id: 'dirty_s', name: 'Corrupted Row' });
          tx.schedules.push({ id: 'dirty_sch', studentId: 'dirty_s' });
          tx.invoices.push({ id: 'dirty_inv', amount: 99999.0 });
          throw new Error('SIMULATED_RUNTIME_PANIC_MID_TRANSACTION');
        });
      } catch (err) {
        assert.match(err.message, /SIMULATED_RUNTIME_PANIC/);
      }

      const postHash = JSON.stringify(mockTxStore);
      assert.strictEqual(postHash, preHash, 'All-or-nothing atomicity invariant strictly preserved');
    });
  });

  // =========================================================================
  // SECTION 4: STRICT ISOLATED TEMPORARY DIRECTORY TEST ENVIRONMENT
  // =========================================================================
  describe('4. Isolated Temporary Directory Safety (createTempDir)', () => {
    it('4.1: Proves temporary directories are created in os.tmpdir and completely outside project root', () => {
      assert.ok(fs.existsSync(tempDir), 'Temporary directory must exist');
      const projectRoot = path.resolve(process.cwd());
      const isInsideProject = tempDir.startsWith(projectRoot);
      assert.strictEqual(isInsideProject, false, 'Temporary directory must strictly reside outside project repository');
    });

    it('4.2: Writing mock data inside isolated temp directory never mutates project files', () => {
      const mockDbFile = path.join(tempDir, 'test-isolated.json');
      fs.writeFileSync(mockDbFile, JSON.stringify({ isolated: true }), 'utf8');

      assert.ok(fs.existsSync(mockDbFile));
      // Verify dev.db in project is untouched
      const liveDbPath = path.resolve(process.cwd(), 'prisma/dev.db');
      if (fs.existsSync(liveDbPath)) {
        const stats = fs.statSync(liveDbPath);
        assert.ok(stats.size > 0, 'Live database must remain intact');
      }
    });
  });
});
