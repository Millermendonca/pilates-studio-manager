import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAndOfferRecurringWaitlist } from '@/lib/recurringWaitlistHelper';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entryId, action } = body; // action: 'ACCEPT' | 'DECLINE'

    if (!entryId || !action) {
      return NextResponse.json({ error: 'ID da entrada e ação são obrigatórios' }, { status: 400 });
    }

    const entry = await prisma.recurringWaitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        student: true,
        partnerStudent: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Oferta de fila não encontrada' }, { status: 404 });
    }

    if (entry.status !== 'OFFERED') {
      return NextResponse.json({
        error: `Esta oferta não está mais disponível (Status atual: ${entry.status})`,
      }, { status: 400 });
    }

    const diaNome = DAY_NAMES[entry.dayOfWeek] || 'Dia';

    if (action === 'ACCEPT') {
      // 1. Atualizar status da oferta para ACCEPTED
      await prisma.recurringWaitlistEntry.update({
        where: { id: entryId },
        data: { status: 'ACCEPTED' },
      });

      // 2. Atualizar ou criar o horário fixo do aluno titular
      const existingSchedule = await prisma.studentSchedule.findFirst({
        where: { studentId: entry.studentId },
      });

      if (existingSchedule) {
        await prisma.studentSchedule.update({
          where: { id: existingSchedule.id },
          data: {
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            active: true,
          },
        });
      } else {
        await prisma.studentSchedule.create({
          data: {
            studentId: entry.studentId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            active: true,
          },
        });
      }

      // 3. Se for vaga em dupla/casal com parceiro cadastrado, atualiza o parceiro também
      if (entry.isCouple && entry.partnerStudentId) {
        const partnerSchedule = await prisma.studentSchedule.findFirst({
          where: { studentId: entry.partnerStudentId },
        });

        if (partnerSchedule) {
          await prisma.studentSchedule.update({
            where: { id: partnerSchedule.id },
            data: {
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.startTime,
              endTime: entry.endTime,
              active: true,
            },
          });
        } else {
          await prisma.studentSchedule.create({
            data: {
              studentId: entry.partnerStudentId,
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.startTime,
              endTime: entry.endTime,
              active: true,
            },
          });
        }

        // Mensagem para o parceiro
        await prisma.chatMessage.create({
          data: {
            studentId: entry.partnerStudentId,
            sender: 'SYSTEM',
            message: `🎉 HORÁRIO FIXO CONFIRMADO EM DUPLA!\n\nOlá, ${entry.partnerStudent?.name.split(' ')[0]}!\n${entry.student.name} confirmou a vaga para vocês. Seu horário semanal foi alterado para toda **${diaNome} às ${entry.startTime}**.\n\nNos vemos nas aulas! ✨🧘‍♀️`,
            messageType: 'TEXT',
          },
        });
      }

      // Mensagem de sucesso para o titular
      await prisma.chatMessage.create({
        data: {
          studentId: entry.studentId,
          sender: 'SYSTEM',
          message: `🎉 PARABÉNS! TROCA DE HORÁRIO FIXO CONCLUÍDA!\n\nOlá, ${entry.student.name.split(' ')[0]}!\nSeu horário padrão semanal foi atualizado com sucesso para toda **${diaNome} às ${entry.startTime}**${entry.isCouple ? ' (Vaga para Casal/Dupla)' : ''}.\n\nTodas as suas próximas semanas foram ajustadas automaticamente. Te esperamos no estúdio! ✨🧘‍♀️`,
          messageType: 'TEXT',
        },
      });

      return NextResponse.json({
        success: true,
        action: 'ACCEPTED',
        message: `Parabéns! Seu horário fixo foi alterado com sucesso para toda ${diaNome} às ${entry.startTime}!`,
      });
    } else if (action === 'DECLINE') {
      // 1. Atualizar status para DECLINED
      await prisma.recurringWaitlistEntry.update({
        where: { id: entryId },
        data: { status: 'DECLINED' },
      });

      // 2. Mensagem no Chat
      await prisma.chatMessage.create({
        data: {
          studentId: entry.studentId,
          sender: 'SYSTEM',
          message: `Você optou por não aceitar a vaga fixa para toda ${diaNome} às ${entry.startTime}. Sua participação nesta fila foi encerrada e a oportunidade foi oferecida para o próximo aluno da fila.`,
          messageType: 'TEXT',
        },
      });

      // 3. Notificar o próximo da fila imediatamente
      await checkAndOfferRecurringWaitlist(entry.dayOfWeek, entry.startTime);

      return NextResponse.json({
        success: true,
        action: 'DECLINED',
        message: 'Oferta recusada. A vaga foi repassada para o próximo aluno da fila.',
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao responder oferta de fila fixa:', error);
    return NextResponse.json({ error: 'Erro ao processar resposta' }, { status: 500 });
  }
}
