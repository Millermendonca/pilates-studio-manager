import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePixCopiaECola, generatePixQrCodeDataUrl } from '@/lib/pix';
import { cookies } from 'next/headers';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkAdminAuth(req?: Request) {
  let token: string | undefined;
  try {
    token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  } catch {}
  if (!token && req) {
    if ('cookies' in req && typeof (req as any).cookies?.get === 'function') {
      token = (req as any).cookies.get(ADMIN_COOKIE_NAME)?.value;
    }
    if (!token && req.headers) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]*)`));
      if (match) token = decodeURIComponent(match[1]);
    }
  }
  if (!token) return null;
  return await verifyAdminToken(token);
}

export async function GET(req: Request) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 401 });
    }

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
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 401 });
    }

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
