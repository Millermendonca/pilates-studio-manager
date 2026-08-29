import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAndOfferRecurringWaitlist } from '@/lib/recurringWaitlistHelper';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const dayOfWeekStr = searchParams.get('dayOfWeek');
    const startTime = searchParams.get('startTime');

    // 1. Filas de um aluno específico (com privacidade de posição)
    if (studentId) {
      const myEntries = await prisma.recurringWaitlistEntry.findMany({
        where: {
          OR: [
            { studentId, status: { in: ['WAITING', 'OFFERED'] } },
            { partnerStudentId: studentId, status: { in: ['WAITING', 'OFFERED'] } },
          ],
        },
        include: {
          student: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          partnerStudent: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const enriched = await Promise.all(
        myEntries.map(async (entry) => {
          const allInQueue = await prisma.recurringWaitlistEntry.findMany({
            where: {
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.startTime,
              status: { in: ['WAITING', 'OFFERED'] },
            },
            orderBy: { createdAt: 'asc' },
          });

          const position = allInQueue.findIndex((e) => e.id === entry.id) + 1;

          return {
            id: entry.id,
            dayOfWeek: entry.dayOfWeek,
            dayName: DAY_NAMES[entry.dayOfWeek],
            startTime: entry.startTime,
            endTime: entry.endTime,
            isCouple: entry.isCouple,
            partnerName: entry.partnerStudent?.name || entry.partnerName || null,
            partnerStudentId: entry.partnerStudentId,
            status: entry.status,
            offeredAt: entry.offeredAt,
            offerExpiresAt: entry.offerExpiresAt,
            position,
            totalInQueue: allInQueue.length,
            createdAt: entry.createdAt,
          };
        })
      );

      return NextResponse.json(enriched);
    }

    // 2. Fila de um dia/horário específico (para o Administrador)
    if (dayOfWeekStr && startTime) {
      const dayOfWeek = parseInt(dayOfWeekStr);
      const entries = await prisma.recurringWaitlistEntry.findMany({
        where: {
          dayOfWeek,
          startTime,
          status: { in: ['WAITING', 'OFFERED'] },
        },
        include: {
          student: { select: { id: true, name: true, phone: true, avatarUrl: true, planName: true } },
          partnerStudent: { select: { id: true, name: true, phone: true, avatarUrl: true, planName: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      const listWithPosition = entries.map((entry, index) => ({
        id: entry.id,
        position: index + 1,
        studentId: entry.studentId,
        studentName: entry.student.name,
        avatarUrl: entry.student.avatarUrl,
        isCouple: entry.isCouple,
        partnerName: entry.partnerStudent?.name || entry.partnerName || null,
        partnerAvatar: entry.partnerStudent?.avatarUrl || null,
        status: entry.status,
        offeredAt: entry.offeredAt,
        offerExpiresAt: entry.offerExpiresAt,
        createdAt: entry.createdAt,
      }));

      return NextResponse.json(listWithPosition);
    }

    // 3. Todas as filas de horários fixos
    const all = await prisma.recurringWaitlistEntry.findMany({
      where: { status: { in: ['WAITING', 'OFFERED'] } },
      include: {
        student: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        partnerStudent: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(all);
  } catch (error) {
    console.error('Erro ao consultar fila recorrente:', error);
    return NextResponse.json({ error: 'Erro ao consultar fila recorrente' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, dayOfWeek, startTime, endTime, isCouple, partnerStudentId, partnerName, notes } = body;

    if (!studentId || dayOfWeek === undefined || !startTime) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const dayNum = parseInt(dayOfWeek);
    const calculatedEndTime = endTime || `${(parseInt(startTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00`;

    // 1. Verificar se o aluno já possui esse horário fixo
    const existingSchedule = await prisma.studentSchedule.findFirst({
      where: {
        studentId,
        dayOfWeek: dayNum,
        startTime,
        active: true,
      },
    });

    if (existingSchedule) {
      return NextResponse.json({ error: 'Você já possui este horário fixo cadastrado!' }, { status: 400 });
    }

    // 2. Verificar se já está na fila
    const existingEntry = await prisma.recurringWaitlistEntry.findFirst({
      where: {
        studentId,
        dayOfWeek: dayNum,
        startTime,
        status: { in: ['WAITING', 'OFFERED'] },
      },
    });

    if (existingEntry) {
      return NextResponse.json({ error: 'Você já está na fila de espera deste horário fixo!' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    let resolvedPartnerId = partnerStudentId || null;
    let resolvedPartnerName = partnerName || null;

    if (isCouple && !resolvedPartnerId && resolvedPartnerName) {
      // Tentar encontrar o parceiro pelo nome ou email se informado
      const partner = await prisma.student.findFirst({
        where: {
          OR: [
            { name: { contains: resolvedPartnerName } },
            { email: { equals: resolvedPartnerName } },
          ],
        },
      });
      if (partner) {
        resolvedPartnerId = partner.id;
        resolvedPartnerName = partner.name;
      }
    }

    // 3. Criar entrada na fila recorrente
    const entry = await prisma.recurringWaitlistEntry.create({
      data: {
        studentId,
        dayOfWeek: dayNum,
        startTime,
        endTime: calculatedEndTime,
        isCouple: !!isCouple,
        partnerStudentId: resolvedPartnerId,
        partnerName: resolvedPartnerName,
        notes: notes || null,
        status: 'WAITING',
      },
    });

    // Enviar mensagem de confirmação
    const diaNome = DAY_NAMES[dayNum] || 'Dia';
    const casalTexto = isCouple ? ` (👫 Vaga para Casal / Dupla com ${resolvedPartnerName || 'sua parceria'})` : '';

    await prisma.chatMessage.create({
      data: {
        studentId,
        sender: 'SYSTEM',
        message: `⏳ Olá, ${student.name.split(' ')[0]}!\n\nVocê entrou na **Fila de Espera de Horário Fixo** para toda **${diaNome} às ${startTime}**${casalTexto}.\n\nAssim que houver disponibilidade definitiva, você receberá uma notificação aqui no app para confirmar a troca antes de qualquer alteração definitiva! ✨`,
        messageType: 'TEXT',
      },
    });

    // 4. Executar verificação caso haja vaga disponível de imediato
    await checkAndOfferRecurringWaitlist(dayNum, startTime);

    return NextResponse.json({
      success: true,
      entry,
      message: `Você entrou na fila de espera para toda ${diaNome} às ${startTime}!`,
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar na fila fixa:', error);
    return NextResponse.json({ error: 'Erro ao registrar na fila' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { waitlistId } = body;

    if (!waitlistId) {
      return NextResponse.json({ error: 'ID da fila é obrigatório' }, { status: 400 });
    }

    await prisma.recurringWaitlistEntry.update({
      where: { id: waitlistId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true, message: 'Você saiu da fila de espera de horário fixo.' });
  } catch (error) {
    console.error('Erro ao cancelar fila recorrente:', error);
    return NextResponse.json({ error: 'Erro ao sair da fila' }, { status: 500 });
  }
}
