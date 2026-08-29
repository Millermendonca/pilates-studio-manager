import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { student: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pagamento PIX confirmado com sucesso!',
      invoice: updated,
    });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    return NextResponse.json({ error: 'Erro ao confirmar pagamento' }, { status: 500 });
  }
}
