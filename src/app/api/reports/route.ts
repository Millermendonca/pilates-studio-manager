import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { differenceInDays, subDays } from 'date-fns';

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda' },
  { id: 2, name: 'Terça' },
  { id: 3, name: 'Quarta' },
  { id: 4, name: 'Quinta' },
  { id: 5, name: 'Sexta' },
  { id: 6, name: 'Sábado' },
];

export async function GET() {
  try {
    const settings = await prisma.studioSettings.findFirst();
    const capacityPerSlot = settings?.defaultClassCapacity || 4;

    const [students, schedules, invoices, attendances] = await Promise.all([
      prisma.student.findMany({
        where: { isDeleted: false },
        include: {
          schedules: { where: { active: true } },
          invoices: { orderBy: { dueDate: 'desc' }, take: 5 },
          attendances: { orderBy: { classDate: 'desc' }, take: 5 },
        },
      }),
      prisma.studentSchedule.findMany({
        where: { active: true, student: { isDeleted: false, active: true, status: 'ACTIVE' } },
      }),
      prisma.invoice.findMany({
        where: {
          dueDate: {
            gte: subDays(new Date(), 60),
          },
        },
      }),
      prisma.attendance.findMany({
        where: {
          classDate: {
            gte: subDays(new Date(), 30),
          },
        },
      }),
    ]);

    // 1. Matriz de Ocupação da Grade (Heatmap)
    const occupancyMatrix: any[] = [];
    let totalSlotsAvailable = 0;
    let totalSlotsOccupied = 0;

    DAYS_OF_WEEK.forEach((day) => {
      TIME_SLOTS.forEach((time) => {
        const count = schedules.filter(
          (s) => s.dayOfWeek === day.id && s.startTime === time
        ).length;

        const occupancyRate = Math.min(100, Math.round((count / capacityPerSlot) * 100));
        totalSlotsAvailable += capacityPerSlot;
        totalSlotsOccupied += count;

        occupancyMatrix.push({
          dayOfWeek: day.id,
          dayName: day.name,
          time,
          occupied: count,
          capacity: capacityPerSlot,
          occupancyRate,
          isPeak: occupancyRate >= 75,
          isIdle: occupancyRate <= 25,
        });
      });
    });

    const averageOccupancyRate = totalSlotsAvailable > 0
      ? Math.round((totalSlotsOccupied / totalSlotsAvailable) * 100)
      : 0;

    // 2. Análise de Alunos & Churn / Retenção
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.active && s.status === 'ACTIVE' && !s.isPaused);
    const pausedStudents = students.filter((s) => s.isPaused || s.status === 'PAUSED');
    const inactiveStudents = students.filter((s) => !s.active || s.status === 'INACTIVE');
    const corporateStudents = students.filter((s) => s.isCorporate);

    // Identificação de Ausentes Recentes (Anti-Churn)
    const tenDaysAgo = subDays(new Date(), 10);
    const absentAlertStudents = activeStudents.filter((s) => {
      const lastAttendance = s.attendances && s.attendances[0];
      if (!lastAttendance) return true; // Nunca compareceu
      return new Date(lastAttendance.classDate) < tenDaysAgo;
    }).map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      planName: s.planName,
      lastSeen: s.attendances[0]?.classDate || null,
      daysSinceLastClass: s.attendances[0]
        ? differenceInDays(new Date(), new Date(s.attendances[0].classDate))
        : 99,
    }));

    const retentionRate = totalStudents > 0
      ? Math.round((activeStudents.length / totalStudents) * 100)
      : 100;
    const churnRate = 100 - retentionRate;

    // 3. Métricas Financeiras & Faturamento
    const expectedMonthlyRevenue = activeStudents.reduce((acc, s) => acc + (s.monthlyFee || 0), 0);
    const paidRevenue = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((acc, inv) => acc + inv.amount, 0);

    const now = new Date();
    const overdueInvoices = invoices.filter(
      (inv) => inv.status === 'PENDING' && new Date(inv.dueDate) < now
    );
    const overdueRevenue = overdueInvoices.reduce((acc, inv) => acc + inv.amount, 0);

    // Alunos com atraso > 5 dias (candidatos à liberação de vaga fixa)
    const overdueLimitDays = settings?.maxOverdueDaysBeforeSlotRelease || 5;
    const studentsAtRiskOfSlotLoss = students.filter((s) => {
      const overdueInv = s.invoices.find((inv) => {
        if (inv.status !== 'PAID' && new Date(inv.dueDate) < now) {
          const daysOverdue = differenceInDays(now, new Date(inv.dueDate));
          return daysOverdue >= overdueLimitDays;
        }
        return false;
      });
      return !!overdueInv || s.isPaused;
    }).map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      isPaused: s.isPaused,
      schedulesCount: s.schedules.length,
    }));

    const averageTicket = activeStudents.length > 0
      ? Math.round((expectedMonthlyRevenue / activeStudents.length) * 100) / 100
      : 0;

    return NextResponse.json({
      occupancy: {
        matrix: occupancyMatrix,
        averageRate: averageOccupancyRate,
        totalSlotsOccupied,
        totalSlotsAvailable,
      },
      students: {
        total: totalStudents,
        active: activeStudents.length,
        paused: pausedStudents.length,
        inactive: inactiveStudents.length,
        corporate: corporateStudents.length,
        retentionRate,
        churnRate,
        absentAlerts: absentAlertStudents,
        studentsAtRiskOfSlotLoss,
      },
      financial: {
        expectedMonthlyRevenue,
        paidRevenue,
        overdueRevenue,
        overdueCount: overdueInvoices.length,
        averageTicket,
      },
      rules: {
        monthlyRescheduleLimit: settings?.monthlyRescheduleLimit || 2,
        maxOverdueDaysBeforeSlotRelease: overdueLimitDays,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatórios:', error);
    return NextResponse.json({ error: 'Erro ao gerar dados do relatório' }, { status: 500 });
  }
}
