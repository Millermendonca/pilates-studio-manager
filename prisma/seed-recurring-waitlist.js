const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Populando Fila de Espera de Horários Fixos (com Casal e Oferta Pendente)...');

  const students = await prisma.student.findMany({ take: 6 });
  if (students.length < 3) return;

  // 1. Entrada de Casal/Dupla: Aluno 0 e Aluno 1 esperando 2 vagas juntas na Sexta-feira às 18:00
  await prisma.recurringWaitlistEntry.create({
    data: {
      studentId: students[0].id,
      dayOfWeek: 5, // Sexta-feira
      startTime: '18:00',
      endTime: '19:00',
      isCouple: true,
      partnerStudentId: students[1].id,
      partnerName: students[1].name,
      status: 'WAITING',
      notes: 'Casal deseja treinar juntos na sexta à noite',
    },
  });

  // 2. Entrada Individual: Aluno 2 com Oferta Ativa para Quarta às 19:00
  await prisma.recurringWaitlistEntry.create({
    data: {
      studentId: students[2].id,
      dayOfWeek: 3, // Quarta-feira
      startTime: '19:00',
      endTime: '20:00',
      isCouple: false,
      status: 'OFFERED',
      offeredAt: new Date(),
      offerExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas de validade
      notes: 'Vaga liberada por desistência',
    },
  });

  // Mensagem no Chat para o aluno com oferta ativa
  await prisma.chatMessage.create({
    data: {
      studentId: students[2].id,
      sender: 'SYSTEM',
      message: `🎉 VAGA FIXA DISPONÍVEL!\n\nOlá, ${students[2].name.split(' ')[0]}!\nSurgiu 1 vaga fixa definitiva para toda **Quarta-feira às 19:00**!\n\n⚠️ Deseja confirmar a alteração permanente do seu dia e horário padrão? Acesse o app para confirmar ou passar a vez para o próximo aluno da fila.`,
      messageType: 'RECURRING_WAITLIST_OFFER',
    },
  });

  console.log('✅ Fila de Horários Fixos populada com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
