import crypto from 'node:crypto';

/**
 * Simulates atomic transaction execution with snapshot rollback.
 * Demonstrates and verifies all-or-nothing atomicity guarantees.
 */
export async function executeInTransaction(store, operations) {
  // Snapshot deep clone for rollback
  const snapshot = JSON.parse(JSON.stringify(store));
  try {
    const result = await operations(store);
    return { success: true, result };
  } catch (err) {
    // Immediate atomic rollback
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    Object.assign(store, snapshot);
    throw err;
  }
}

/**
 * Simulates attendance cancellation workflow with credit generation and waitlist promotion.
 */
export async function simulateAtomicAttendanceCancel(store, { attendanceId, failAtStep = null }) {
  return executeInTransaction(store, async (tx) => {
    const attIndex = tx.attendance.findIndex((a) => a.id === attendanceId);
    if (attIndex === -1) throw new Error('Attendance record not found');

    // Step 1: Update attendance status
    tx.attendance[attIndex].status = 'CANCELLED_WITH_CREDIT';
    tx.attendance[attIndex].updatedAt = new Date().toISOString();

    if (failAtStep === 1) throw new Error('SIMULATED_FAIL_STEP_1: Failed while writing attendance update');

    // Step 2: Generate class credit
    const creditId = `crd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    tx.credits.push({
      id: creditId,
      studentId: tx.attendance[attIndex].studentId,
      originReason: 'Cancelled with credit',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      used: false,
    });

    if (failAtStep === 2) throw new Error('SIMULATED_FAIL_STEP_2: Network timeout while minting credit');

    // Step 3: Promote next waitlisted student
    const waitlisted = tx.waitlist.find((w) => w.status === 'WAITING');
    if (waitlisted) {
      waitlisted.status = 'PROMOTED';
      waitlisted.promotedAt = new Date().toISOString();

      if (failAtStep === 3) throw new Error('SIMULATED_FAIL_STEP_3: Deadlock while promoting waitlist entry');

      // Create new attendance for promoted student
      tx.attendance.push({
        id: `att_promoted_${Date.now()}`,
        studentId: waitlisted.studentId,
        status: 'SCHEDULED',
        notes: 'Promoted from waitlist',
      });
    }

    return {
      cancelledAttendanceId: attendanceId,
      creditId,
      promotedStudentId: waitlisted?.studentId || null,
    };
  });
}

/**
 * Simulates matricula multi-entity enrollment workflow.
 */
export async function simulateAtomicMatricula(store, { studentData, schedules, invoiceData, failAtStep = null }) {
  return executeInTransaction(store, async (tx) => {
    // Step 1: Create/update student
    const existingIndex = tx.students.findIndex((s) => s.email === studentData.email);
    let studentId;
    if (existingIndex !== -1) {
      Object.assign(tx.students[existingIndex], studentData);
      studentId = tx.students[existingIndex].id;
    } else {
      studentId = `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      tx.students.push({ id: studentId, ...studentData });
    }

    if (failAtStep === 1) throw new Error('SIMULATED_FAIL_STEP_1: Failed creating student record');

    // Step 2: Clear old schedules and create new schedules
    tx.schedules = tx.schedules.filter((s) => s.studentId !== studentId);
    for (const sch of schedules) {
      tx.schedules.push({
        id: `sch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        studentId,
        ...sch,
      });
    }

    if (failAtStep === 2) throw new Error('SIMULATED_FAIL_STEP_2: Conflict while allocating schedules');

    // Step 3: Create invoice
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    tx.invoices.push({
      id: invoiceId,
      studentId,
      ...invoiceData,
    });

    if (failAtStep === 3) throw new Error('SIMULATED_FAIL_STEP_3: Gateway communication error generating invoice');

    return { studentId, invoiceId };
  });
}

/**
 * Evaluates safe reset endpoint requirements per PROJECT.md interface contract.
 */
export function evaluateSafeResetPolicy({ nodeEnv, authHeader, confirmationToken }) {
  if (nodeEnv === 'production') {
    return {
      status: 403,
      allowed: false,
      body: { error: 'Database reset disabled in production' },
    };
  }

  if (!authHeader || !authHeader.includes('Bearer ')) {
    return {
      status: 401,
      allowed: false,
      body: { error: 'Unauthorized: Admin session required' },
    };
  }

  if (!confirmationToken || confirmationToken !== 'CONFIRM_SAFE_WIPE') {
    return {
      status: 400,
      allowed: false,
      body: { error: 'Confirmation token required to wipe test data' },
    };
  }

  return {
    status: 200,
    allowed: true,
    body: { success: true, message: 'Test data reset safely in non-production environment' },
  };
}
