import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, token, notes } = body;

    if (!studentId || !token) {
      return NextResponse.json({ error: 'Informe o ID do aluno e o token/código de check-in' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        pendingCheckinStatus: 'SUBMITTED_FOR_REVIEW',
        pendingCheckinToken: token,
        pendingCheckinDate: new Date(),
      },
    });

    // Enviar mensagem de confirmação no Chat
    await prisma.chatMessage.create({
      data: {
        studentId,
        sender: 'STUDENT',
        message: `Enviei o código de check-in ${student.corporateProvider || 'Wellhub/TotalPass'}: "${token}" para regularização de falta.`,
        messageType: 'TEXT',
      },
    });

    await prisma.chatMessage.create({
      data: {
        studentId,
        sender: 'SYSTEM',
        message: `⏳ Código de check-in "${token}" recebido pelo Studio Pilates Center!\n\nNossa recepção irá validar o check-in no sistema da ${student.corporateProvider || 'sua operadora corporativa'} e seus agendamentos serão liberados em instantes. ✨`,
        messageType: 'TEXT',
      },
    });

    return NextResponse.json({
      success: true,
      student: updated,
      message: 'Check-in de regularização enviado! Aguardando aprovação do estúdio.',
    });
  } catch (error) {
    console.error('Erro ao enviar check-in corporativo:', error);
    return NextResponse.json({ error: 'Erro ao processar check-in' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { studentId, action, blockReason } = body;

    if (!studentId || !action) {
      return NextResponse.json({ error: 'Informe o ID do aluno e a ação' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // Desbloquear aluno
      const updated = await prisma.student.update({
        where: { id: studentId },
        data: {
          isBlocked: false,
          pendingCheckinStatus: 'APPROVED',
          blockReason: null,
        },
      });

      // Enviar notificação de liberação
      await prisma.chatMessage.create({
        data: {
          studentId,
          sender: 'SYSTEM',
          message: `✅ LIBERAÇÃO CONFIRMADA!\n\nOlá, ${student.name.split(' ')[0]}! Seu check-in corporativo foi validado com sucesso pela nossa equipe.\n\nSeus agendamentos e horários de Pilates estão liberados. Te esperamos no estúdio! ✨🧘‍♀️`,
          messageType: 'TEXT',
        },
      });

      return NextResponse.json({
        success: true,
        student: updated,
        message: `Check-in de ${student.name} aprovado e agendamentos liberados com sucesso!`,
      });
    } else if (action === 'BLOCK') {
      // Bloquear aluno por falta sem aviso
      const reason = blockReason || 'Falta sem cancelamento prévio de 2 horas (convênio corporativo)';
      const updated = await prisma.student.update({
        where: { id: studentId },
        data: {
          isBlocked: true,
          pendingCheckinStatus: 'PENDING_STUDENT_ACTION',
          blockReason: reason,
        },
      });

      // Enviar notificação de bloqueio
      await prisma.chatMessage.create({
        data: {
          studentId,
          sender: 'SYSTEM',
          message: `⚠️ ATENÇÃO • REGULARIZAÇÃO NECESSÁRIA\n\nOlá, ${student.name.split(' ')[0]}!\nIdentificamos uma ausência na sua aula de Pilates sem o cancelamento prévio de pelo menos 2 horas.\n\n🔒 Seus próximos agendamentos estão temporariamente bloqueados. Para liberar, por favor abra o aplicativo da sua operadora (${student.corporateProvider || 'Wellhub/TotalPass'}), realize o check-in da aula e envie o código aqui no app do aluno!`,
          messageType: 'TEXT',
        },
      });

      return NextResponse.json({
        success: true,
        student: updated,
        message: `Aluno ${student.name} bloqueado por falta sem aviso prévio. Notificação enviada.`,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Erro na ação corporativa:', error);
    return NextResponse.json({ error: 'Erro ao atualizar status do aluno' }, { status: 500 });
  }
}
