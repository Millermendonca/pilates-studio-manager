const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Populando simulação de Fila de Espera...');

  const students = await prisma.student.findMany({ take: 6 });
  if (students.length < 2) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Inserir aluno na fila das 15:00 de hoje
  await prisma.waitlistEntry.create({
    data: {
      studentId: students[0].id,
      classDate: today,
      startTime: '15:00',
      endTime: '16:00',
      status: 'WAITING',
      notes: 'Solicitou reposição de aula',
    },
  });

  if (students[1]) {
    await prisma.waitlistEntry.create({
      data: {
        studentId: students[1].id,
        classDate: today,
        startTime: '15:00',
        endTime: '16:00',
        status: 'WAITING',
        notes: 'Deseja antecipar horário',
      },
    });
  }

  // 2. Inserir aluno na fila das 08:00
  if (students[2]) {
    await prisma.waitlistEntry.create({
      data: {
        studentId: students[2].id,
        classDate: today,
        startTime: '08:00',
        endTime: '09:00',
        status: 'WAITING',
      },
    });
  }

  console.log('✅ Fila de espera populada com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
