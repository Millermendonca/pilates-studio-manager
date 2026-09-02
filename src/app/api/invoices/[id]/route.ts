import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePixCopiaECola, generatePixQrCodeDataUrl } from '@/lib/pix';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: { id: true, name: true, nickname: true, email: true, phone: true, avatarUrl: true, photoCompressed: true, planName: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Erro ao buscar fatura:', error);
    return NextResponse.json({ error: 'Erro ao buscar fatura' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { title, amount, dueDate, status, paidAt, isRecurring } = body;

    const existing = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { student: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    const newAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    const newTitle = title !== undefined ? title : existing.title;
    const newDueDate = dueDate !== undefined ? new Date(dueDate) : existing.dueDate;
    
    // Tratamento de Status e Data de Pagamento:
    // Se status fornecido for 'PENDING', paidAt deve ser null
    // Se status for 'PAID', paidAt é preenchido com a data informada ou a data atual
    let newStatus = status !== undefined ? status : existing.status;
    let newPaidAt = existing.paidAt;

    if (status === 'PENDING') {
      newPaidAt = null;
    } else if (status === 'PAID') {
      newPaidAt = paidAt ? new Date(paidAt) : (existing.paidAt || new Date());
    } else if (paidAt !== undefined) {
      newPaidAt = paidAt ? new Date(paidAt) : null;
    }

    // Se o valor ou título mudou, regenerar PIX copia e cola e QR code
    let copiaECola = existing.pixCopiaECola;
    let qrCodeUrl = existing.pixQrCode;

    if (amount !== undefined || title !== undefined) {
      const settings = await prisma.studioSettings.findFirst();
      const pixKey = settings?.pixKey || 'contato@pilatesharmonia.com.br';
      const recipientName = settings?.pixRecipientName || 'Studio Pilates Harmonia';
      const recipientCity = settings?.pixRecipientCity || 'SAO PAULO';

      copiaECola = generatePixCopiaECola({
        pixKey,
        recipientName,
        recipientCity,
        amount: newAmount,
        description: newTitle || `Mensalidade ${existing.student?.name || ''}`,
      });

      qrCodeUrl = await generatePixQrCodeDataUrl(copiaECola);
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        title: newTitle,
        amount: newAmount,
        dueDate: newDueDate,
        status: newStatus,
        paidAt: newPaidAt,
        ...(isRecurring !== undefined && { isRecurring: !!isRecurring }),
        pixCopiaECola: copiaECola,
        pixQrCode: qrCodeUrl,
      },
      include: {
        student: {
          select: { id: true, name: true, nickname: true, email: true, phone: true, avatarUrl: true, photoCompressed: true, planName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Fatura atualizada com sucesso!',
      invoice: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar fatura:', error);
    return NextResponse.json({ error: 'Erro ao atualizar fatura' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return PUT(req, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    await prisma.invoice.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Fatura excluída com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao excluir fatura:', error);
    return NextResponse.json({ error: 'Erro ao excluir fatura' }, { status: 500 });
  }
}
