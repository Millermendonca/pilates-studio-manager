import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePixCopiaECola, generatePixQrCodeDataUrl } from '@/lib/pix';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true, photoCompressed: true, planName: true },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Erro ao listar faturas:', error);
    return NextResponse.json({ error: 'Erro ao listar faturas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, title, amount, dueDate, status, paidAt, isRecurring } = body;

    if (!studentId || !amount || !dueDate) {
      return NextResponse.json({ error: 'Dados incompletos para fatura' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    const settings = await prisma.studioSettings.findFirst();
    const pixKey = settings?.pixKey || 'contato@pilatesharmonia.com.br';
    const recipientName = settings?.pixRecipientName || 'Studio Pilates Harmonia';
    const recipientCity = settings?.pixRecipientCity || 'SAO PAULO';

    const cleanAmount = parseFloat(amount);
    const cleanTitle = title || `Mensalidade - ${student.planName}`;

    const copiaECola = generatePixCopiaECola({
      pixKey,
      recipientName,
      recipientCity,
      amount: cleanAmount,
      description: cleanTitle,
    });

    const qrCodeUrl = await generatePixQrCodeDataUrl(copiaECola);

    const invoiceStatus = status === 'PAID' ? 'PAID' : (status || 'PENDING');
    const invoicePaidAt = invoiceStatus === 'PAID' ? (paidAt ? new Date(paidAt) : new Date()) : null;

    const invoice = await prisma.invoice.create({
      data: {
        studentId,
        title: cleanTitle,
        amount: cleanAmount,
        dueDate: new Date(dueDate),
        status: invoiceStatus,
        paidAt: invoicePaidAt,
        pixCopiaECola: copiaECola,
        pixQrCode: qrCodeUrl,
        isRecurring: !!isRecurring,
      },
      include: {
        student: {
          select: { id: true, name: true, nickname: true, email: true, phone: true, avatarUrl: true, photoCompressed: true, planName: true },
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Erro ao gerar fatura PIX:', error);
    return NextResponse.json({ error: 'Erro ao gerar fatura PIX' }, { status: 500 });
  }
}
