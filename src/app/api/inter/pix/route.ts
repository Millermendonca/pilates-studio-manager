import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createInterPixCobranca } from '@/lib/bancoInter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceId, studentId, amount, title } = body;

    const settings = await prisma.studioSettings.findFirst();
    const student = studentId ? await prisma.student.findUnique({ where: { id: studentId } }) : null;

    const interConfig = {
      clientId: settings?.bancoInterClientId || undefined,
      clientSecret: settings?.bancoInterClientSecret || undefined,
      certPath: settings?.bancoInterCertPath || undefined,
      keyPath: settings?.bancoInterKeyPath || undefined,
      ambiente: (settings?.bancoInterAmbiente as 'SANDBOX' | 'PRODUCAO') || 'SANDBOX',
      chavePix: settings?.bancoInterPixChave || settings?.pixKey || 'contato@pilatesharmonia.com.br',
    };

    const valor = parseFloat(amount) || (student?.monthlyFee ? student.monthlyFee : 320.0);

    const pixResult = await createInterPixCobranca(
      {
        valor,
        chavePix: interConfig.chavePix,
        descricao: title || `Mensalidade Pilates - ${student?.name || 'Aluno'}`,
        devedorNome: student?.name,
        devedorCpf: student?.cpf || undefined,
      },
      interConfig
    );

    // Se houver um invoiceId, atualizar a fatura com os dados do Inter
    if (invoiceId) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          interTxId: pixResult.txid,
          pixQrCode: pixResult.qrCodeBase64,
          pixCopiaECola: pixResult.pixCopiaECola,
        },
      });
    }

    return NextResponse.json(pixResult);
  } catch (error: any) {
    console.error('Erro ao gerar cobrança Banco Inter:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar PIX do Banco Inter' }, { status: 500 });
  }
}
