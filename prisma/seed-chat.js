const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('💬 Populando histórico inicial de mensagens do Chat & Notificações...');

  const students = await prisma.student.findMany({ take: 10 });

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const firstName = s.name.split(' ')[0];

    // 1. Mensagem de Boas-Vindas do Sistema
    await prisma.chatMessage.create({
      data: {
        studentId: s.id,
        sender: 'SYSTEM',
        message: `Bem-vindo(a) ao Studio Pilates Harmonia, ${firstName}! 🌿\nSeu plano "${s.planName}" está ativo. Por aqui você receberá lembretes automáticos de aulas, avisos de reposição e faturas PIX.`,
        messageType: 'TEXT',
        createdAt: new Date(Date.now() - 5 * 86400000),
      },
    });

    // 2. Lembrete de Aula com Confirmação
    if (i % 2 === 0) {
      await prisma.chatMessage.create({
        data: {
          studentId: s.id,
          sender: 'SYSTEM',
          message: `Olá, ${firstName}! 🧘‍♀️\nPassando para lembrar da sua aula de Pilates hoje às 08:00.\n\nCaso precise desmarcar com antecedência para garantir seu crédito de reposição, use o botão no app! Te esperamos. ✨`,
          messageType: 'CLASS_REMINDER',
          createdAt: new Date(Date.now() - 2 * 3600000),
        },
      });

      await prisma.chatMessage.create({
        data: {
          studentId: s.id,
          sender: 'STUDENT',
          message: 'Combinado, estúdio! Já estou a caminho, chego em 10 minutinhos.',
          messageType: 'TEXT',
          createdAt: new Date(Date.now() - 1 * 3600000),
        },
      });
    }

    // 3. Aviso de Mensalidade PIX
    if (i % 3 === 0) {
      await prisma.chatMessage.create({
        data: {
          studentId: s.id,
          sender: 'SYSTEM',
          message: `Olá, ${firstName}! 💳\nLembrete de mensalidade do seu plano de Pilates (${s.planName}) no valor de R$ ${s.monthlyFee.toFixed(2)}.\n\nVocê pode copiar o código PIX ou pagar com 1 clique direto no seu aplicativo!`,
          messageType: 'PAYMENT_REMINDER',
          createdAt: new Date(Date.now() - 1 * 86400000),
        },
      });
    }
  }

  console.log('✅ Mensagens do Chat populadas com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
