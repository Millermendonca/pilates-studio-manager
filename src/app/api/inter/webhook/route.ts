import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Banco Inter Webhook] Notificação recebida:', JSON.stringify(body));

    // Formato padrão do webhook PIX Banco Inter: array de pix recebidos
    const pixList = body.pix || (Array.isArray(body) ? body : [body]);

    for (const pixItem of pixList) {
      const txid = pixItem.txid;
      const endToEndId = pixItem.endToEndId;
      const valor = parseFloat(pixItem.valor || 0);

      if (txid) {
        // Encontrar fatura pelo txid
        const invoice = await prisma.invoice.findFirst({
          where: { interTxId: txid },
          include: { student: true },
        });

        if (invoice && invoice.status !== 'PAID') {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: 'PAID',
              paidAt: new Date(),
              interEndToEndId: endToEndId || null,
            },
          });

          // Notificar o aluno no chat
          await prisma.chatMessage.create({
            data: {
              studentId: invoice.studentId,
              sender: 'STUDIO',
              messageType: 'PAYMENT_REMINDER',
              message: `✅ Pagamento de R$ ${invoice.amount.toFixed(2)} confirmado via PIX Banco Inter! Obrigado.`,
            },
          });
        }
      }
    }

    return NextResponse.json({ status: 'OK', processed: pixList.length });
  } catch (error: any) {
    console.error('[Banco Inter Webhook] Erro ao processar webhook:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}
