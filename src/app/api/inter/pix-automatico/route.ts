import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createInterPixAutomaticoAdesao } from '@/lib/bancoInter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, diaVencimento = 10 } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId é obrigatório' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    const settings = await prisma.studioSettings.findFirst();

    const interConfig = {
      clientId: settings?.bancoInterClientId || undefined,
      clientSecret: settings?.bancoInterClientSecret || undefined,
      certPath: settings?.bancoInterCertPath || undefined,
      keyPath: settings?.bancoInterKeyPath || undefined,
      ambiente: (settings?.bancoInterAmbiente as 'SANDBOX' | 'PRODUCAO') || 'SANDBOX',
      chavePix: settings?.bancoInterPixChave || settings?.pixKey || 'contato@pilatesharmonia.com.br',
    };

    const result = await createInterPixAutomaticoAdesao(
      {
        studentId: student.id,
        studentName: student.name,
        studentCpf: student.cpf || undefined,
        valorMensal: student.monthlyFee || 320.0,
        diaVencimento: parseInt(diaVencimento) || 10,
        planoNome: student.planName || '2x por Semana',
      },
      interConfig
    );

    // Salvar o ID de adesão e status no cadastro do aluno
    await prisma.student.update({
      where: { id: student.id },
      data: {
        interPixAutomaticoAdesaoId: result.adesaoId,
        interPixAutomaticoStatus: result.status,
      },
    });

    // Enviar mensagem informativa no chat do aluno
    await prisma.chatMessage.create({
      data: {
        studentId: student.id,
        sender: 'STUDIO',
        messageType: 'PAYMENT_REMINDER',
        message: `✨ Seu PIX Automático do Banco Inter foi configurado com sucesso! A cobrança da mensalidade (R$ ${student.monthlyFee.toFixed(2)}) ocorrerá todo dia ${diaVencimento} automaticamente.`,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao configurar PIX Automático:', error);
    return NextResponse.json({ error: error.message || 'Erro ao configurar PIX Automático' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId é obrigatório' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        monthlyFee: true,
        interPixAutomaticoAdesaoId: true,
        interPixAutomaticoStatus: true,
      },
    });

    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao consultar PIX Automático' }, { status: 500 });
  }
}
