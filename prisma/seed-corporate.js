const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🏢 Criando alunos de convênio Wellhub e TotalPass...');

  // 1. Aluno Wellhub Ativo Normal (sem mensalidade local, sem bloqueio)
  const wellhubStudent = await prisma.student.upsert({
    where: { email: 'lucas.wellhub@gympass.com' },
    update: {},
    create: {
      name: 'Lucas Brandão (Wellhub)',
      email: 'lucas.wellhub@gympass.com',
      phone: '(11) 98888-1234',
      cpf: '456.789.123-00',
      address: 'Rua Bela Cintra, 800',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      planName: 'Wellhub (Gympass) Platinum',
      monthlyFee: 0.0,
      isCorporate: true,
      corporateProvider: 'WELLHUB',
      isBlocked: false,
      pendingCheckinStatus: 'NONE',
    },
  });

  // 2. Aluna TotalPass com Bloqueio por Falta sem Aviso & Token aguardando liberação
  const totalpassStudent = await prisma.student.upsert({
    where: { email: 'fernanda.totalpass@empresa.com' },
    update: {
      isBlocked: true,
      pendingCheckinStatus: 'SUBMITTED_FOR_REVIEW',
      pendingCheckinToken: 'TP-849201',
      blockReason: 'Ausência na aula sem cancelamento prévio de 2 horas',
    },
    create: {
      name: 'Fernanda Lima (TotalPass)',
      email: 'fernanda.totalpass@empresa.com',
      phone: '(11) 97777-5678',
      cpf: '321.654.987-11',
      address: 'Av. Brigadeiro Luís Antônio, 2000',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      planName: 'TotalPass TP3',
      monthlyFee: 0.0,
      isCorporate: true,
      corporateProvider: 'TOTALPASS',
      isBlocked: true,
      pendingCheckinStatus: 'SUBMITTED_FOR_REVIEW',
      pendingCheckinToken: 'TP-849201',
      pendingCheckinDate: new Date(),
      blockReason: 'Ausência na aula sem cancelamento prévio de 2 horas',
    },
  });

  // Mensagem inicial de aviso de falta e solicitação de check-in
  await prisma.chatMessage.create({
    data: {
      studentId: totalpassStudent.id,
      sender: 'SYSTEM',
      message: `⚠️ ATENÇÃO • REGULARIZAÇÃO DE FALTA\n\nOlá, Fernanda! Identificamos que você não compareceu à sua aula de Pilates e não desmarcou com a antecedência mínima de 2 horas.\n\n🔒 Seus agendamentos futuros estão temporariamente bloqueados.\nPara liberar seu acesso, realize o check-in no aplicativo da TotalPass e insira o código aqui no app!`,
      messageType: 'TEXT',
    },
  });

  console.log('✅ Alunos corporativos criados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
