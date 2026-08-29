import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const classDateStr = searchParams.get('classDate');
    const startTime = searchParams.get('startTime');

    // 1. Fila de um aluno específico (com privacidade: apenas posição e total)
    if (studentId) {
      const myEntries = await prisma.waitlistEntry.findMany({
        where: {
          studentId,
          status: 'WAITING',
        },
        orderBy: { createdAt: 'desc' },
      });

      const enriched = await Promise.all(
        myEntries.map(async (entry) => {
          const allInQueue = await prisma.waitlistEntry.findMany({
            where: {
              classDate: entry.classDate,
              startTime: entry.startTime,
              status: 'WAITING',
            },
            orderBy: { createdAt: 'asc' },
          });

          const position = allInQueue.findIndex((e) => e.id === entry.id) + 1;

          return {
            id: entry.id,
            classDate: entry.classDate,
            startTime: entry.startTime,
            endTime: entry.endTime,
            position,
            totalInQueue: allInQueue.length,
            usedCreditId: entry.usedCreditId,
            createdAt: entry.createdAt,
          };
        })
      );

      return NextResponse.json(enriched);
    }

    // 2. Fila de uma turma específica (para o Administrador do Estúdio)
    if (classDateStr && startTime) {
      const parsedDate = new Date(classDateStr + 'T00:00:00');
      const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

      const entries = await prisma.waitlistEntry.findMany({
        where: {
          classDate: { gte: startOfDay, lte: endOfDay },
          startTime,
          status: 'WAITING',
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
              planName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const listWithPosition = entries.map((entry, index) => ({
        id: entry.id,
        position: index + 1,
        studentId: entry.studentId,
        studentName: entry.student.name,
        avatarUrl: entry.student.avatarUrl,
        phone: entry.student.phone,
        planName: entry.student.planName,
        createdAt: entry.createdAt,
      }));

      return NextResponse.json(listWithPosition);
    }

    // 3. Todas as filas ativas para a grade do estúdio
    const allWaiting = await prisma.waitlistEntry.findMany({
      where: { status: 'WAITING' },
      include: {
        student: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(allWaiting);
  } catch (error) {
    console.error('Erro ao consultar fila de espera:', error);
    return NextResponse.json({ error: 'Erro ao consultar fila de espera' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, classDate, startTime, endTime, usedCreditId, notes } = body;

    if (!studentId || !classDate || !startTime) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const parsedDate = new Date(classDate + 'T00:00:00');
    const startOfDay = new Date(new Date(parsedDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(parsedDate).setHours(23, 59, 59, 999));

    // 1. Verificar se o aluno já está agendado nessa aula
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        classDate: { gte: startOfDay, lte: endOfDay },
        startTime,
        status: { in: ['SCHEDULED', 'CONFIRMED_GPS', 'CONFIRMED_MANUAL'] },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Você já possui agendamento confirmado neste horário!' },
        { status: 400 }
      );
    }

    // 2. Verificar se o aluno já está na fila dessa aula
    const existingWaitlist = await prisma.waitlistEntry.findFirst({
      where: {
        studentId,
        classDate: { gte: startOfDay, lte: endOfDay },
        startTime,
        status: 'WAITING',
      },
    });

    if (existingWaitlist) {
      return NextResponse.json(
        { error: 'Você já está na fila de espera deste horário!' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    // 3. Criar entrada na Fila
    const entry = await prisma.waitlistEntry.create({
      data: {
        studentId,
        classDate: parsedDate,
        startTime,
        endTime: endTime || '09:00',
        usedCreditId: usedCreditId || null,
        notes: notes || null,
        status: 'WAITING',
      },
    });

    // Calcular a posição do aluno
    const totalInQueue = await prisma.waitlistEntry.count({
      where: {
        classDate: { gte: startOfDay, lte: endOfDay },
        startTime,
        status: 'WAITING',
      },
    });

    // 4. Enviar mensagem de confirmação no Chat do WhatsApp
    const dateFormatted = format(parsedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
    await prisma.chatMessage.create({
      data: {
        studentId,
        sender: 'SYSTEM',
        message: `⏳ Olá, ${student.name.split(' ')[0]}!\n\nVocê entrou na **Fila de Espera** para ${dateFormatted} às ${startTime} (${totalInQueue}º lugar na fila).\n\nAssim que outro aluno desmarcar, nosso sistema te agendará automaticamente e te enviará uma notificação por aqui! ✨`,
        messageType: 'TEXT',
      },
    });

    return NextResponse.json({
      success: true,
      entry,
      position: totalInQueue,
      totalInQueue,
      message: `Você entrou na fila de espera! Sua posição: ${totalInQueue}º lugar.`,
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao entrar na fila de espera:', error);
    return NextResponse.json({ error: 'Erro ao entrar na fila' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { waitlistId } = body;

    if (!waitlistId) {
      return NextResponse.json({ error: 'ID da fila é obrigatório' }, { status: 400 });
    }

    await prisma.waitlistEntry.update({
      where: { id: waitlistId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true, message: 'Você saiu da fila de espera.' });
  } catch (error) {
    console.error('Erro ao cancelar fila:', error);
    return NextResponse.json({ error: 'Erro ao sair da fila' }, { status: 500 });
  }
}
