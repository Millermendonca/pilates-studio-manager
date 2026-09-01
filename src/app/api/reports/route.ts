import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { differenceInDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  OperatingDayConfig,
  DEFAULT_OPERATING_HOURS,
  generateSlotsForDay,
  getUnifiedTimeSlots,
  getOperatingDaysList,
} from '@/lib/operatingHours';

export async function GET() {
  try {
    const settings = await prisma.studioSettings.findFirst();
    const capacityPerSlot = Number(settings?.defaultClassCapacity) || 8;

    let operatingHours: OperatingDayConfig[] = DEFAULT_OPERATING_HOURS;
    if (settings?.operatingHoursJson) {
      try {
        const parsed = JSON.parse(settings.operatingHoursJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          operatingHours = parsed;
        }
      } catch (e) {
        console.error('Erro ao ler operatingHoursJson:', e);
      }
    }

    const operatingDays = getOperatingDaysList(operatingHours);
    const unifiedTimeSlots = getUnifiedTimeSlots(operatingHours);

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
        where: { active: true, student: { isDeleted: false } },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
              photoCompressed: true,
              planName: true,
              status: true,
              active: true,
            },
          },
        },
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

    // 1. Matriz de Ocupação da Grade (Heatmap Cruzado)
    const occupancyMatrix: any[] = [];
    let totalSlotsAvailable = 0;
    let totalSlotsOccupied = 0;

    // Métricas agregadas por Dia da Semana
    const dayStatsMap = new Map<number, { dayOfWeek: number; dayName: string; occupied: number; capacity: number; slots: any[] }>();
    operatingDays.forEach((d) => {
      dayStatsMap.set(d.id, { dayOfWeek: d.id, dayName: d.name, occupied: 0, capacity: 0, slots: [] });
    });

    // Métricas agregadas por Faixa de Horário
    const timeStatsMap = new Map<string, { time: string; occupied: number; capacity: number; slots: any[] }>();
    unifiedTimeSlots.forEach((t) => {
      timeStatsMap.set(t, { time: t, occupied: 0, capacity: 0, slots: [] });
    });

    operatingDays.forEach((day) => {
      const dayConfig = operatingHours.find((d) => d.dayOfWeek === day.id);
      const dayValidSlots = generateSlotsForDay(dayConfig);

      unifiedTimeSlots.forEach((time) => {
        const isSlotInDay = dayValidSlots.includes(time);
        const matchingSchedules = schedules.filter(
          (s) => s.dayOfWeek === day.id && s.startTime === time
        );
        const count = matchingSchedules.length;

        // Se o estúdio não abre nesse horário específico desse dia (ex: sáb à tarde), capacidade é 0
        const currentSlotCapacity = isSlotInDay ? capacityPerSlot : 0;
        const occupancyRate = currentSlotCapacity > 0
          ? Math.min(100, Math.round((count / currentSlotCapacity) * 100))
          : 0;

        if (isSlotInDay) {
          totalSlotsAvailable += currentSlotCapacity;
          totalSlotsOccupied += count;
        }

        const slotInfo = {
          dayOfWeek: day.id,
          dayName: day.name,
          time,
          isOpen: isSlotInDay,
          occupied: count,
          capacity: currentSlotCapacity,
          occupancyRate,
          isPeak: occupancyRate >= 75 && isSlotInDay,
          isIdle: occupancyRate <= 25 && isSlotInDay,
          students: matchingSchedules.map((ms) => ({
            id: ms.student.id,
            name: ms.student.name,
            phone: ms.student.phone,
            avatarUrl: ms.student.avatarUrl,
            photoCompressed: ms.student.photoCompressed,
            planName: ms.student.planName,
          })),
        };

        occupancyMatrix.push(slotInfo);

        if (isSlotInDay) {
          // Agregação por Dia
          const dStat = dayStatsMap.get(day.id);
          if (dStat) {
            dStat.occupied += count;
            dStat.capacity += currentSlotCapacity;
            dStat.slots.push(slotInfo);
          }

          // Agregação por Horário
          const tStat = timeStatsMap.get(time);
          if (tStat) {
            tStat.occupied += count;
            tStat.capacity += currentSlotCapacity;
            tStat.slots.push(slotInfo);
          }
        }
      });
    });

    const averageOccupancyRate = totalSlotsAvailable > 0
      ? Math.round((totalSlotsOccupied / totalSlotsAvailable) * 100)
      : 0;

    // Formatar Relatório por Dia da Semana
    const occupancyByDay = Array.from(dayStatsMap.values()).map((d) => {
      const rate = d.capacity > 0 ? Math.round((d.occupied / d.capacity) * 100) : 0;
      const sortedSlots = [...d.slots].sort((a, b) => b.occupied - a.occupied);
      const peakSlot = sortedSlots[0];
      const idleSlot = sortedSlots[sortedSlots.length - 1];

      return {
        dayOfWeek: d.dayOfWeek,
        dayName: d.dayName,
        occupied: d.occupied,
        capacity: d.capacity,
        rate,
        peakTime: peakSlot ? `${peakSlot.time} (${peakSlot.occupancyRate}%)` : '-',
        idleTime: idleSlot ? `${idleSlot.time} (${idleSlot.occupancyRate}%)` : '-',
        status: rate >= 80 ? 'PEAK' : rate >= 55 ? 'HEALTHY' : rate >= 30 ? 'MODERATE' : 'IDLE',
      };
    });

    // Formatar Relatório por Faixa de Horário
    const occupancyByTimeSlot = Array.from(timeStatsMap.values()).map((t) => {
      const rate = t.capacity > 0 ? Math.round((t.occupied / t.capacity) * 100) : 0;
      const hourNum = parseInt(t.time.split(':')[0]);
      const period = hourNum < 12 ? 'MANHA' : hourNum < 18 ? 'TARDE' : 'NOITE';

      return {
        time: t.time,
        occupied: t.occupied,
        capacity: t.capacity,
        rate,
        period,
        status: rate >= 80 ? 'PEAK' : rate >= 55 ? 'HEALTHY' : rate >= 30 ? 'MODERATE' : 'IDLE',
      };
    });

    // Agrupamento por Turnos (Manhã / Tarde / Noite)
    const manhaSlots = occupancyByTimeSlot.filter((s) => s.period === 'MANHA');
    const tardeSlots = occupancyByTimeSlot.filter((s) => s.period === 'TARDE');
    const noiteSlots = occupancyByTimeSlot.filter((s) => s.period === 'NOITE');

    const getPeriodTotals = (slotsArr: typeof occupancyByTimeSlot) => {
      const occ = slotsArr.reduce((acc, s) => acc + s.occupied, 0);
      const cap = slotsArr.reduce((acc, s) => acc + s.capacity, 0);
      const rate = cap > 0 ? Math.round((occ / cap) * 100) : 0;
      return { occupied: occ, capacity: cap, rate };
    };

    const occupancyByPeriod = {
      manha: getPeriodTotals(manhaSlots),
      tarde: getPeriodTotals(tardeSlots),
      noite: getPeriodTotals(noiteSlots),
    };

    // Top 5 Horários Mais Concorridos (Picos) vs. Top 5 Mais Ociosos (Oportunidades)
    const sortedMatrixByOccupancy = [...occupancyMatrix].sort((a, b) => b.occupancyRate - a.occupancyRate);
    const topPeakSlots = sortedMatrixByOccupancy.slice(0, 5);
    const topIdleSlots = [...sortedMatrixByOccupancy].reverse().slice(0, 5);

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
      avatarUrl: s.avatarUrl,
      photoCompressed: s.photoCompressed,
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
      avatarUrl: s.avatarUrl,
      photoCompressed: s.photoCompressed,
      isPaused: s.isPaused,
      schedulesCount: s.schedules.length,
    }));

    const averageTicket = activeStudents.length > 0
      ? Math.round((expectedMonthlyRevenue / activeStudents.length) * 100) / 100
      : 0;

    // Oportunidade Financeira: Vagas Livres na Grade * Preço Médio
    const idleSlotsCount = totalSlotsAvailable - totalSlotsOccupied;
    // Considerando plano 2x (2 aulas/semana = 1 aluno consome 2 vagas semanais)
    const potentialNewStudents = Math.floor(idleSlotsCount / 2);
    const potentialMonthlyRevenueGain = Math.round(potentialNewStudents * (averageTicket || 340));

    return NextResponse.json({
      occupancy: {
        matrix: occupancyMatrix,
        averageRate: averageOccupancyRate,
        totalSlotsOccupied,
        totalSlotsAvailable,
        idleSlotsCount,
        occupancyByDay,
        occupancyByTimeSlot,
        occupancyByPeriod,
        topPeakSlots,
        topIdleSlots,
        potentialNewStudents,
        potentialMonthlyRevenueGain,
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
        capacityPerSlot,
        monthlyRescheduleLimit: settings?.monthlyRescheduleLimit || 2,
        maxOverdueDaysBeforeSlotRelease: overdueLimitDays,
        operatingDays,
        unifiedTimeSlots,
        operatingHours,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatórios:', error);
    return NextResponse.json({ error: 'Erro ao gerar dados do relatório' }, { status: 500 });
  }
}
