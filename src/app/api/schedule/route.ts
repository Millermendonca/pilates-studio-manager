import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  parseISO,
  isSameDay,
  isSameMonth,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { checkAndOfferRecurringWaitlist } from '@/lib/recurringWaitlistHelper';
import {
  OperatingDayConfig,
  DEFAULT_OPERATING_HOURS,
  generateSlotsForDay,
  getUnifiedTimeSlots,
  getOperatingDaysList,
} from '@/lib/operatingHours';

function getPlanLimit(planName?: string): number {
  if (!planName) return 2;
  const p = planName.toLowerCase();
  if (p.includes('1x')) return 1;
  if (p.includes('2x')) return 2;
  if (p.includes('3x')) return 3;
  if (p.includes('4x')) return 4;
  if (p.includes('livre') || p.includes('diário') || p.includes('diario')) return 6;
  if (p.includes('avulsa') || p.includes('experimental')) return 0;
  if (p.includes('wellhub') || p.includes('totalpass')) return 6;
  return 2;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const view = searchParams.get('view') || 'day'; // 'day', 'week', 'month', 'live'

    const targetDate = parseISO(dateStr);
    const settings = await prisma.studioSettings.findFirst();
    const capacity = Number(settings?.defaultClassCapacity) || 8;

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

    if (view === 'live') {
      const now = new Date();
      const currentHour = now.getHours();
      const formattedCurrentTime = `${currentHour.toString().padStart(2, '0')}:00`;
      const formattedNextHour1 = `${(currentHour + 1).toString().padStart(2, '0')}:00`;
      const formattedNextHour2 = `${(currentHour + 2).toString().padStart(2, '0')}:00`;

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const todayDayOfWeek = now.getDay();

      const attendancesToday = await prisma.attendance.findMany({
        where: {
          classDate: { gte: todayStart, lte: todayEnd },
        },
        include: {
          student: true,
        },
      });

      const recurringToday = await prisma.studentSchedule.findMany({
        where: {
          dayOfWeek: todayDayOfWeek,
          active: true,
        },
        include: {
          student: true,
        },
      });

      return NextResponse.json({
        currentTime: format(now, 'HH:mm'),
        currentHour: formattedCurrentTime,
        nextHours: [formattedNextHour1, formattedNextHour2],
        capacity,
        attendancesToday,
        recurringToday,
        settings,
      });
    }

    if (view === 'availability') {
      // Visão de Disponibilidade de Horários Fixos (Permanentes)
      const recurringAll = await prisma.studentSchedule.findMany({
        where: { active: true },
        include: { student: true },
      });

      const dayNames = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const timeSlots = [
        '07:00', '08:00', '09:00', '10:00', '11:00',
        '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
      ];

      // Matriz de dias e horários
      const slotsAvailability: any[] = [];

      for (let day = 1; day <= 6; day++) {
        for (const time of timeSlots) {
          const enrolled = recurringAll.filter(
            (r) => r.dayOfWeek === day && r.startTime === time
          );
          const occupied = enrolled.length;
          const availableSeats = Math.max(0, capacity - occupied);

          slotsAvailability.push({
            dayOfWeek: day,
            dayName: dayNames[day],
            startTime: time,
            endTime: `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`,
            capacity,
            occupied,
            availableSeats,
            isAvailable: availableSeats > 0,
            enrolledStudents: enrolled.map((e) => ({
              id: e.student.id,
              name: e.student.name,
              avatarUrl: e.student.avatarUrl,
              photoCompressed: e.student.photoCompressed,
            })),
          });
        }
      }

      // Sugestões inteligentes para planos comuns
      const suggestions2x: any[] = [];
      const suggestions3x: any[] = [];
      const suggestions1x: any[] = [];

      // Sugestões 2x (Seg/Qua ou Ter/Qui)
      for (const time of timeSlots) {
        // Seg/Qua
        const seg = slotsAvailability.find((s) => s.dayOfWeek === 1 && s.startTime === time);
        const qua = slotsAvailability.find((s) => s.dayOfWeek === 3 && s.startTime === time);
        if (seg && qua && seg.isAvailable && qua.isAvailable) {
          const minSeats = Math.min(seg.availableSeats, qua.availableSeats);
          suggestions2x.push({
            title: `Segundas e Quartas às ${time}`,
            days: [1, 3],
            daysText: 'Segunda e Quarta',
            time,
            availableSeats: minSeats,
          });
        }

        // Ter/Qui
        const ter = slotsAvailability.find((s) => s.dayOfWeek === 2 && s.startTime === time);
        const qui = slotsAvailability.find((s) => s.dayOfWeek === 4 && s.startTime === time);
        if (ter && qui && ter.isAvailable && qui.isAvailable) {
          const minSeats = Math.min(ter.availableSeats, qui.availableSeats);
          suggestions2x.push({
            title: `Terças e Quintas às ${time}`,
            days: [2, 4],
            daysText: 'Terça e Quinta',
            time,
            availableSeats: minSeats,
          });
        }

        // Seg/Qua/Sex (3x)
        const sex = slotsAvailability.find((s) => s.dayOfWeek === 5 && s.startTime === time);
        if (seg && qua && sex && seg.isAvailable && qua.isAvailable && sex.isAvailable) {
          const minSeats = Math.min(seg.availableSeats, qua.availableSeats, sex.availableSeats);
          suggestions3x.push({
            title: `Segundas, Quartas e Sextas às ${time}`,
            days: [1, 3, 5],
            daysText: 'Seg, Qua e Sex',
            time,
            availableSeats: minSeats,
          });
        }
      }

      // Sugestões 1x (Sábados ou Avulsos)
      const sabSlots = slotsAvailability.filter((s) => s.dayOfWeek === 6 && s.isAvailable);
      sabSlots.forEach((s) => {
        suggestions1x.push({
          title: `Sábados às ${s.startTime}`,
          days: [6],
          daysText: 'Sábado',
          time: s.startTime,
          availableSeats: s.availableSeats,
        });
      });

      return NextResponse.json({
        capacity,
        slots: slotsAvailability,
        suggestions: {
          twoTimesWeek: suggestions2x,
          threeTimesWeek: suggestions3x,
          oneTimeWeek: suggestions1x,
        },
      });
    }

    if (view === 'month') {
      // Visão Mensal
      const monthStart = startOfMonth(targetDate);
      const monthEnd = endOfMonth(targetDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

      // Buscar presenças marcadas no período do mês
      const attendancesMonth = await prisma.attendance.findMany({
        where: {
          classDate: { gte: calendarStart, lte: calendarEnd },
        },
        include: { student: true },
      });

      // Buscar recorrências padrão
      const recurringAll = await prisma.studentSchedule.findMany({
        where: { active: true },
        include: { student: true },
      });

      const daysData = allDays.map((dayDate) => {
        const dayOfWeek = dayDate.getDay();
        const dateKey = format(dayDate, 'yyyy-MM-dd');
        const isCurrentMonth = isSameMonth(dayDate, targetDate);

        // Aulas na data específica
        const dayAttendances = attendancesMonth.filter((a) =>
          isSameDay(new Date(a.classDate), dayDate)
        );

        // Recorrências que acontecem nesse dia da semana
        const dayRecurring = recurringAll.filter((r) => r.dayOfWeek === dayOfWeek);

        // Combinar alunos do dia
        const studentIds = new Set();
        const studentSummaries: any[] = [];

        dayAttendances.forEach((a) => {
          if (!studentIds.has(a.studentId)) {
            studentIds.add(a.studentId);
            studentSummaries.push({
              id: a.student.id,
              name: a.student.name,
              avatarUrl: a.student.avatarUrl,
              photoCompressed: a.student.photoCompressed,
              startTime: a.startTime,
              status: a.status,
              isReplacement: a.isReplacement,
            });
          }
        });

        dayRecurring.forEach((r) => {
          if (!studentIds.has(r.studentId)) {
            studentIds.add(r.studentId);
            studentSummaries.push({
              id: r.student.id,
              name: r.student.name,
              avatarUrl: r.student.avatarUrl,
              photoCompressed: r.student.photoCompressed,
              startTime: r.startTime,
              status: 'SCHEDULED',
              isReplacement: false,
            });
          }
        });

        return {
          date: dateKey,
          dayNumber: format(dayDate, 'd'),
          dayOfWeek,
          isCurrentMonth,
          isToday: isSameDay(dayDate, new Date()),
          totalClasses: studentSummaries.length,
          students: studentSummaries,
        };
      });

      return NextResponse.json({
        view: 'month',
        monthName: format(targetDate, "MMMM 'de' yyyy", { locale: ptBR }),
        days: daysData,
        capacity,
        settings,
      });
    }

    if (view === 'week') {
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Começa na segunda
      const days = [];
      const unifiedSlots = getUnifiedTimeSlots(operatingHours);

      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i);
        const dayOfWeek = dayDate.getDay();
        const dayConfig = operatingHours.find((d) => d.dayOfWeek === dayOfWeek);

        // Se o dia não estiver aberto e for domingo, podemos pular ou marcar como fechado
        if (dayOfWeek === 0 && !dayConfig?.isOpen) {
          continue;
        }

        const dayStart = new Date(dayDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Aulas agendadas no banco para esta data
        const attendances = await prisma.attendance.findMany({
          where: {
            classDate: { gte: dayStart, lte: dayEnd },
          },
          include: { student: true },
        });

        // Recorrências daquele dia da semana
        const recurring = await prisma.studentSchedule.findMany({
          where: {
            dayOfWeek: dayOfWeek,
            active: true,
          },
          include: { student: true },
        });

        // Fila de espera para o dia da semana
        const waitlists = await prisma.waitlistEntry.findMany({
          where: {
            classDate: { gte: dayStart, lte: dayEnd },
            status: 'WAITING',
          },
          include: { student: true },
          orderBy: { createdAt: 'asc' },
        });

        days.push({
          date: format(dayDate, 'yyyy-MM-dd'),
          dayName: format(dayDate, 'EEEE', { locale: ptBR }),
          dayNumber: format(dayDate, 'dd/MM'),
          dayOfWeek,
          isOpen: dayConfig ? dayConfig.isOpen : true,
          openTime: dayConfig?.openTime,
          closeTime: dayConfig?.closeTime,
          isToday: isSameDay(dayDate, new Date()),
          attendances,
          recurring,
          waitlists,
        });
      }

      return NextResponse.json({
        view: 'week',
        days,
        timeSlots: unifiedSlots,
        capacity,
        operatingHours,
        settings,
      });
    }

    // View = 'day'
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    const targetDayOfWeek = targetDate.getDay();

    const targetDayConfig = operatingHours.find((d) => d.dayOfWeek === targetDayOfWeek) || {
      dayOfWeek: targetDayOfWeek,
      dayName: '',
      isOpen: true,
      openTime: '05:00',
      closeTime: '22:00',
    };

    const timeSlots = targetDayConfig.isOpen
      ? generateSlotsForDay(targetDayConfig)
      : [];

    const attendances = await prisma.attendance.findMany({
      where: {
        classDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        student: true,
      },
    });

    const recurring = await prisma.studentSchedule.findMany({
      where: {
        dayOfWeek: targetDayOfWeek,
        active: true,
      },
      include: {
        student: true,
      },
    });

    const waitlists = await prisma.waitlistEntry.findMany({
      where: {
        classDate: { gte: dayStart, lte: dayEnd },
        status: 'WAITING',
      },
      include: {
        student: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const slots = timeSlots.map((time) => {
      const rec = recurring.filter((r) => r.startTime === time);
      const att = attendances.filter((a) => a.startTime === time && !a.status.includes('CANCELLED'));

      const enrolledMap = new Map();
      rec.forEach((r) => enrolledMap.set(r.studentId, r.student));
      att.forEach((a) => enrolledMap.set(a.studentId, a.student));

      const occupied = enrolledMap.size;
      const availableSeats = Math.max(0, capacity - occupied);
      const isFull = occupied >= capacity;

      const waitlist = waitlists.filter((w) => w.startTime === time);

      return {
        startTime: time,
        endTime: `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`,
        capacity,
        occupied,
        availableSeats,
        isFull,
        waitlistCount: waitlist.length,
        enrolledStudents: Array.from(enrolledMap.values()).map((s: any) => ({
          id: s.id,
          name: s.name,
          avatarUrl: s.avatarUrl,
          photoCompressed: s.photoCompressed,
        })),
      };
    });

    return NextResponse.json({
      view: 'day',
      date: dateStr,
      dayOfWeek: targetDayOfWeek,
      isOpen: targetDayConfig.isOpen,
      timeSlots,
      capacity,
      attendances,
      recurring,
      waitlists,
      slots,
      operatingHours,
      settings,
    });
  } catch (error) {
    console.error('Erro ao buscar grade:', error);
    return NextResponse.json({ error: 'Erro ao buscar grade de aulas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, classDate, startTime, endTime, isReplacement, usedCreditId, notes } = body;

    if (!studentId || !classDate || !startTime) {
      return NextResponse.json({ error: 'Dados incompletos para agendamento' }, { status: 400 });
    }

    // Verificar se o aluno está bloqueado por falta sem cancelamento prévio (Wellhub / TotalPass)
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student?.isBlocked) {
      return NextResponse.json({
        error: '🔒 Seus agendamentos estão temporariamente bloqueados devido a falta sem cancelamento prévio no convênio (Wellhub/TotalPass). Envie seu check-in no aplicativo para liberação.',
      }, { status: 403 });
    }

    const targetDate = parseISO(classDate);

    if (isReplacement && usedCreditId) {
      const credit = await prisma.classCredit.findUnique({
        where: { id: usedCreditId },
      });

      if (!credit || credit.used || credit.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Crédito de reposição inválido ou expirado' }, { status: 400 });
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        classDate: targetDate,
        startTime,
        endTime: endTime || `${(parseInt(startTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00`,
        status: 'SCHEDULED',
        isReplacement: !!isReplacement,
        usedCreditId: usedCreditId || null,
        notes: notes || null,
      },
      include: {
        student: true,
      },
    });

    if (isReplacement && usedCreditId) {
      await prisma.classCredit.update({
        where: { id: usedCreditId },
        data: {
          used: true,
          usedAt: new Date(),
          usedForAttendanceId: attendance.id,
        },
      });
    }

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    console.error('Erro ao agendar aula:', error);
    return NextResponse.json({ error: 'Erro ao agendar aula' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      studentId,
      attendanceId,
      scheduleId,
      currentDate,
      newDate,
      newStartTime,
      newEndTime,
      scope,
    } = body;

    if (!studentId || !newDate || !newStartTime) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 });
    }

    // Verificar se o aluno está bloqueado por falta sem cancelamento prévio
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student?.isBlocked) {
      return NextResponse.json({
        error: '🔒 Seus agendamentos estão temporariamente bloqueados devido a falta sem cancelamento prévio no convênio (Wellhub/TotalPass). Envie seu check-in no aplicativo para liberação.',
      }, { status: 403 });
    }

    const parsedNewDate = parseISO(newDate);
    const calculatedEndTime = newEndTime || `${(parseInt(newStartTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;

    if (scope === 'RECURRING_FUTURE') {
      const newDayOfWeek = parsedNewDate.getDay();
      const sourceDayOfWeek = currentDate ? parseISO(currentDate).getDay() : null;

      let targetScheduleId = scheduleId;

      const activeSchedules = await prisma.studentSchedule.findMany({
        where: {
          studentId,
          active: true,
        },
      });

      // Se não veio scheduleId, tentar encontrar pelo dia de origem
      if (!targetScheduleId && sourceDayOfWeek !== null) {
        const matchingSchedule = activeSchedules.find((s) => s.dayOfWeek === sourceDayOfWeek);
        if (matchingSchedule) {
          targetScheduleId = matchingSchedule.id;
        }
      }

      if (targetScheduleId) {
        await prisma.studentSchedule.update({
          where: { id: targetScheduleId },
          data: {
            dayOfWeek: newDayOfWeek,
            startTime: newStartTime,
            endTime: calculatedEndTime,
          },
        });
      } else {
        const maxLimit = getPlanLimit(student?.planName);
        const existingSameSlot = activeSchedules.find(
          (s) => s.dayOfWeek === newDayOfWeek && s.startTime === newStartTime
        );

        if (!existingSameSlot) {
          if (activeSchedules.length >= maxLimit && activeSchedules.length > 0) {
            // Substituir o primeiro horário fixo existente
            await prisma.studentSchedule.update({
              where: { id: activeSchedules[0].id },
              data: {
                dayOfWeek: newDayOfWeek,
                startTime: newStartTime,
                endTime: calculatedEndTime,
              },
            });
          } else {
            await prisma.studentSchedule.create({
              data: {
                studentId,
                dayOfWeek: newDayOfWeek,
                startTime: newStartTime,
                endTime: calculatedEndTime,
                active: true,
              },
            });
          }
        }
      }

      if (attendanceId) {
        await prisma.attendance.update({
          where: { id: attendanceId },
          data: {
            classDate: parsedNewDate,
            startTime: newStartTime,
            endTime: calculatedEndTime,
          },
        });
      } else if (currentDate) {
        const sourceAtt = await prisma.attendance.findFirst({
          where: {
            studentId,
            classDate: parseISO(currentDate),
          },
        });
        if (sourceAtt) {
          await prisma.attendance.update({
            where: { id: sourceAtt.id },
            data: {
              classDate: parsedNewDate,
              startTime: newStartTime,
              endTime: calculatedEndTime,
            },
          });
        } else {
          await prisma.attendance.create({
            data: {
              studentId,
              classDate: parsedNewDate,
              startTime: newStartTime,
              endTime: calculatedEndTime,
              status: 'SCHEDULED',
            },
          });
        }
      } else {
        const existingAtt = await prisma.attendance.findFirst({
          where: {
            studentId,
            classDate: parsedNewDate,
            startTime: newStartTime,
          },
        });

        if (!existingAtt) {
          await prisma.attendance.create({
            data: {
              studentId,
              classDate: parsedNewDate,
              startTime: newStartTime,
              endTime: calculatedEndTime,
              status: 'SCHEDULED',
            },
          });
        }
      }

      // Disparar motor de fila de espera fixa para preencher vagas abertas
      await checkAndOfferRecurringWaitlist(newDayOfWeek, newStartTime);

      return NextResponse.json({
        success: true,
        message: `Horário semanal de ${student?.name || 'aluno'} alterado com sucesso para toda ${['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][newDayOfWeek]} às ${newStartTime}!`,
      });
    }

    if (attendanceId) {
      const updated = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          classDate: parsedNewDate,
          startTime: newStartTime,
          endTime: calculatedEndTime,
          notes: 'Remarcação pontual de aula',
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Aula remarcada apenas para esta data específica.',
        attendance: updated,
      });
    } else {
      const created = await prisma.attendance.create({
        data: {
          studentId,
          classDate: parsedNewDate,
          startTime: newStartTime,
          endTime: calculatedEndTime,
          status: 'SCHEDULED',
          notes: 'Remarcação pontual de aula',
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Aula criada apenas para esta data específica.',
        attendance: created,
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar horário:', error);
    return NextResponse.json({ error: 'Erro ao alterar horário do aluno' }, { status: 500 });
  }
}
