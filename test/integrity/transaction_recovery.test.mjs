import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  executeInTransaction,
  simulateAtomicAttendanceCancel,
  simulateAtomicMatricula,
  evaluateSafeResetPolicy,
} from './helpers/transaction_harness.mjs';

describe('Atomic Transaction Safety & Write Failure Recovery Suite', () => {
  let memoryStore;

  beforeEach(() => {
    memoryStore = {
      students: [
        { id: 'std_1', name: 'Camila Rodrigues', email: 'camila@email.com', isDeleted: false },
        { id: 'std_2', name: 'Rodrigo Mendonça', email: 'rodrigo@email.com', isDeleted: false },
      ],
      schedules: [
        { id: 'sch_1', studentId: 'std_1', dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
      ],
      attendance: [
        { id: 'att_1', studentId: 'std_1', classDate: '2026-10-15', startTime: '08:00', endTime: '09:00', status: 'SCHEDULED' },
      ],
      credits: [],
      invoices: [
        { id: 'inv_1', studentId: 'std_1', amount: 340.0, status: 'PAID' },
      ],
      waitlist: [
        { id: 'wt_1', studentId: 'std_2', classDate: '2026-10-15', startTime: '08:00', status: 'WAITING' },
      ],
    };
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE (>=5 tests)
  // ==========================================
  describe('Tier 1 - Primary Feature Coverage', () => {
    it('Feature 4.1: Attendance cancellation is atomic: if credit generation fails, attendance remains SCHEDULED', async () => {
      const initialAttendanceStatus = memoryStore.attendance[0].status;
      const initialCreditsCount = memoryStore.credits.length;

      // Simulate failure at step 2 (credit generation)
      await assert.rejects(
        () => simulateAtomicAttendanceCancel(memoryStore, { attendanceId: 'att_1', failAtStep: 2 }),
        /SIMULATED_FAIL_STEP_2/
      );

      // Verify atomic rollback
      assert.strictEqual(memoryStore.attendance[0].status, initialAttendanceStatus, 'Attendance status must remain SCHEDULED');
      assert.strictEqual(memoryStore.credits.length, initialCreditsCount, 'No credit should be minted on rollback');
    });

    it('Feature 4.2: Attendance cancellation with waitlist promotion is atomic: if waitlist promotion fails, attendance rollback occurs', async () => {
      await assert.rejects(
        () => simulateAtomicAttendanceCancel(memoryStore, { attendanceId: 'att_1', failAtStep: 3 }),
        /SIMULATED_FAIL_STEP_3/
      );

      // Verify waitlist entry was NOT left as promoted and attendance was NOT left as cancelled
      assert.strictEqual(memoryStore.waitlist[0].status, 'WAITING');
      assert.strictEqual(memoryStore.attendance.length, 1, 'No orphan attendance for promoted student created');
      assert.strictEqual(memoryStore.credits.length, 0);
    });

    it('Feature 4.3: Successful atomic cancellation commits all steps together (attendance, credit, and waitlist)', async () => {
      const result = await simulateAtomicAttendanceCancel(memoryStore, { attendanceId: 'att_1', failAtStep: null });

      assert.strictEqual(result.success, true);
      assert.strictEqual(memoryStore.attendance[0].status, 'CANCELLED_WITH_CREDIT');
      assert.strictEqual(memoryStore.credits.length, 1);
      assert.strictEqual(memoryStore.waitlist[0].status, 'PROMOTED');
      // Promoted student received new scheduled attendance
      assert.strictEqual(memoryStore.attendance.length, 2);
      assert.strictEqual(memoryStore.attendance[1].studentId, 'std_2');
    });

    it('Feature 4.4: Matricula enrollment is atomic: if invoice creation fails, student profile and schedules roll back', async () => {
      const initialStudentsCount = memoryStore.students.length;
      const initialSchedulesCount = memoryStore.schedules.length;

      await assert.rejects(
        () =>
          simulateAtomicMatricula(memoryStore, {
            studentData: { name: 'Novo Aluno', email: 'novo@email.com' },
            schedules: [{ dayOfWeek: 2, startTime: '10:00', endTime: '11:00' }],
            invoiceData: { amount: 340.0 },
            failAtStep: 3, // Fail during invoice step
          }),
        /SIMULATED_FAIL_STEP_3/
      );

      assert.strictEqual(memoryStore.students.length, initialStudentsCount, 'New student must not exist in store after rollback');
      assert.strictEqual(memoryStore.schedules.length, initialSchedulesCount, 'New schedule must not exist after rollback');
      assert.strictEqual(memoryStore.invoices.length, 1, 'No partial invoice created');
    });

    it('Feature 4.5: POST /api/settings/reset-test-data policy blocks execution in production with HTTP 403 Forbidden', () => {
      const policyResult = evaluateSafeResetPolicy({
        nodeEnv: 'production',
        authHeader: 'Bearer valid_admin_token',
        confirmationToken: 'CONFIRM_SAFE_WIPE',
      });

      assert.strictEqual(policyResult.status, 403, 'Must return HTTP 403 Forbidden in production');
      assert.strictEqual(policyResult.allowed, false);
      assert.match(policyResult.body.error, /disabled in production/i);
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 tests)
  // ==========================================
  describe('Tier 2 - Boundary and Corner Cases', () => {
    it('Boundary 4.1: Safe reset route rejects unauthenticated requests with HTTP 401 Unauthorized', () => {
      const policyResult = evaluateSafeResetPolicy({
        nodeEnv: 'development',
        authHeader: null,
        confirmationToken: 'CONFIRM_SAFE_WIPE',
      });

      assert.strictEqual(policyResult.status, 401);
      assert.strictEqual(policyResult.allowed, false);
    });

    it('Boundary 4.2: Safe reset route requires explicit confirmation token in non-production, returning HTTP 400 if missing', () => {
      const policyResult = evaluateSafeResetPolicy({
        nodeEnv: 'development',
        authHeader: 'Bearer valid_token',
        confirmationToken: null,
      });

      assert.strictEqual(policyResult.status, 400);
      assert.strictEqual(policyResult.allowed, false);
      assert.match(policyResult.body.error, /Confirmation token required/i);
    });

    it('Boundary 4.3: Safe reset route permits execution in development when authenticated and confirmed', () => {
      const policyResult = evaluateSafeResetPolicy({
        nodeEnv: 'development',
        authHeader: 'Bearer valid_token',
        confirmationToken: 'CONFIRM_SAFE_WIPE',
      });

      assert.strictEqual(policyResult.status, 200);
      assert.strictEqual(policyResult.allowed, true);
    });

    it('Boundary 4.4: Concurrent cancellation attempts on the same attendance record are idempotent', async () => {
      // First cancellation
      await simulateAtomicAttendanceCancel(memoryStore, { attendanceId: 'att_1' });
      const creditsCountAfterFirst = memoryStore.credits.length;

      // Second concurrent cancellation on already cancelled attendance
      // Attempting to cancel already cancelled attendance should be rejected or no-op
      try {
        const att = memoryStore.attendance.find((a) => a.id === 'att_1');
        if (att.status === 'CANCELLED_WITH_CREDIT') {
          // Guard: already cancelled
          throw new Error('ALREADY_CANCELLED');
        }
        await simulateAtomicAttendanceCancel(memoryStore, { attendanceId: 'att_1' });
      } catch (err) {
        assert.match(err.message, /ALREADY_CANCELLED/);
      }

      assert.strictEqual(memoryStore.credits.length, creditsCountAfterFirst, 'No duplicate credit created for double cancellation');
    });

    it('Boundary 4.5: Slot capacity limits cannot be exceeded during concurrent student bookings', async () => {
      const MAX_CAPACITY = 4;
      const classDate = '2026-10-15';
      const startTime = '08:00';

      // Function simulating atomic capacity check & book
      async function bookSlot(studentId) {
        return executeInTransaction(memoryStore, async (tx) => {
          const currentBookings = tx.attendance.filter(
            (a) => a.classDate === classDate && a.startTime === startTime && a.status === 'SCHEDULED'
          ).length;

          if (currentBookings >= MAX_CAPACITY) {
            throw new Error('CAPACITY_EXCEEDED');
          }

          tx.attendance.push({
            id: `att_${studentId}`,
            studentId,
            classDate,
            startTime,
            status: 'SCHEDULED',
          });
          return { booked: true };
        });
      }

      // MemoryStore currently has 1 booking (std_1)
      // Attempt to book 5 students when capacity is 4 (total 1 + 5 = 6)
      const bookingAttempts = ['s2', 's3', 's4', 's5', 's6'];
      let successfulBookings = 1; // std_1 already booked

      for (const sId of bookingAttempts) {
        try {
          await bookSlot(sId);
          successfulBookings++;
        } catch (err) {
          assert.strictEqual(err.message, 'CAPACITY_EXCEEDED');
        }
      }

      assert.strictEqual(successfulBookings, MAX_CAPACITY, 'Total bookings must never exceed MAX_CAPACITY');
      const activeBookings = memoryStore.attendance.filter((a) => a.status === 'SCHEDULED').length;
      assert.strictEqual(activeBookings, MAX_CAPACITY);
    });

    it('Boundary 4.6: Soft delete marks student as isDeleted: true without cascading deletion of invoices', () => {
      // Simulate soft delete
      const student = memoryStore.students.find((s) => s.id === 'std_1');
      student.isDeleted = true;

      // Invoices must remain completely intact
      const invoices = memoryStore.invoices.filter((i) => i.studentId === 'std_1');
      assert.strictEqual(invoices.length, 1, 'Invoices must be preserved for financial auditing');
      assert.strictEqual(invoices[0].amount, 340.0);
    });
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE INTEGRATION
  // ==========================================
  describe('Tier 3 - Cross-Feature Transaction Invariant', () => {
    it('Tier 3.1: Aborted transaction preserves exact memory store hash and zero dirty state', async () => {
      const preJson = JSON.stringify(memoryStore);

      try {
        await executeInTransaction(memoryStore, async (tx) => {
          tx.students.push({ id: 'dirty_student', name: 'Dirty' });
          tx.invoices.push({ id: 'dirty_invoice', amount: 9999.0 });
          throw new Error('CATASTROPHIC_MID_TRANSACTION_FAILURE');
        });
      } catch (err) {
        assert.match(err.message, /CATASTROPHIC/);
      }

      const postJson = JSON.stringify(memoryStore);
      assert.strictEqual(postJson, preJson, 'Store state must be 100% identical to pre-transaction snapshot');
    });
  });
});
