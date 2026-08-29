import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    // 1. Histórico de mensagens de um aluno específico
    if (studentId) {
      const messages = await prisma.chatMessage.findMany({
        where: { studentId },
        orderBy: { createdAt: 'asc' },
      });

      // Marcar mensagens recebidas como lidas
      await prisma.chatMessage.updateMany({
        where: { studentId, read: false },
        data: { read: true },
      });

      return NextResponse.json(messages);
    }

    // 2. Lista de conversas para o Painel do Estúdio
    const students = await prisma.student.findMany({
      where: { active: true, isDeleted: false },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        attendances: {
          orderBy: { classDate: 'desc' },
          take: 1,
        },
        invoices: {
          where: { status: 'PENDING' },
          take: 1,
        },
      },
    });

    // Contagem de não lidas e última mensagem
    const threads = await Promise.all(
      students.map(async (std) => {
        const unreadCount = await prisma.chatMessage.count({
          where: { studentId: std.id, sender: 'STUDENT', read: false },
        });

        const lastMessage = std.messages[0] || null;

        return {
          studentId: std.id,
          studentName: std.name,
          avatarUrl: std.avatarUrl,
          phone: std.phone,
          planName: std.planName,
          unreadCount,
          lastMessage: lastMessage
            ? {
                text: lastMessage.message,
                sender: lastMessage.sender,
                type: lastMessage.messageType,
                createdAt: lastMessage.createdAt,
              }
            : null,
          hasPendingInvoice: std.invoices.length > 0,
        };
      })
    );

    // Ordenar threads com mensagens mais recentes no topo
    threads.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json(threads);
  } catch (error) {
    console.error('Erro ao carregar chat:', error);
    return NextResponse.json({ error: 'Erro ao carregar mensagens' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, sender, message, messageType, action, payload } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'ID do aluno é obrigatório' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        attendances: {
          where: { status: 'SCHEDULED' },
          orderBy: { classDate: 'asc' },
          take: 1,
        },
        invoices: {
          where: { status: 'PENDING' },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
        credits: {
          where: { used: false },
          orderBy: { expiresAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    let finalMessage = message || '';
    let finalType = messageType || 'TEXT';
    let finalSender = sender || 'STUDIO';

    // 1. Disparos Automáticos de Templates
    if (action === 'SEND_CLASS_REMINDER') {
      finalSender = 'SYSTEM';
      finalType = 'CLASS_REMINDER';
      const nextClass = student.attendances[0];
      const classInfo = nextClass
        ? `${format(new Date(nextClass.classDate), "EEEE 'às' ", { locale: ptBR })}${nextClass.startTime}`
        : 'hoje no seu horário padrão';

      finalMessage = `Olá, ${student.name.split(' ')[0]}! 🧘‍♀️\nPassando para lembrar da sua aula de Pilates marcada para ${classInfo}.\n\nCaso precise desmarcar com antecedência para garantir seu crédito de reposição, use o botão no app! Te esperamos. ✨`;
    } else if (action === 'SEND_PAYMENT_REMINDER') {
      finalSender = 'SYSTEM';
      finalType = 'PAYMENT_REMINDER';
      const invoice = student.invoices[0];
      const amountStr = invoice ? `R$ ${invoice.amount.toFixed(2)}` : `R$ ${student.monthlyFee.toFixed(2)}`;
      const dueDateStr = invoice
        ? format(new Date(invoice.dueDate), 'dd/MM/yyyy')
        : 'nos próximos dias';

      finalMessage = `Olá, ${student.name.split(' ')[0]}! 💳\nLembrete de mensalidade do seu plano de Pilates (${student.planName}) no valor de ${amountStr} com vencimento em ${dueDateStr}.\n\nVocê pode copiar o código PIX ou pagar com 1 clique direto no seu aplicativo!`;
    } else if (action === 'SEND_CREDIT_ALERT') {
      finalSender = 'SYSTEM';
      finalType = 'CREDIT_ALERT';
      const credit = student.credits[0];
      const daysLeft = credit
        ? differenceInDays(new Date(credit.expiresAt), new Date())
        : 30;

      finalMessage = `Oi, ${student.name.split(' ')[0]}! 🟣\nVocê tem 1 crédito de reposição de aula disponível que expira em ${daysLeft} dias.\n\nAcesse a aba de Créditos no seu app para escolher uma data e agendar sua reposição!`;
    }

    const created = await prisma.chatMessage.create({
      data: {
        studentId,
        sender: finalSender,
        message: finalMessage,
        messageType: finalType,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Erro ao enviar mensagem no chat:', error);
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 });
  }
}
