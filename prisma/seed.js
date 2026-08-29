const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do Estúdio de Pilates...');

  // 1. Limpar banco existente
  await prisma.locationPing.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.classCredit.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.studentSchedule.deleteMany();
  await prisma.student.deleteMany();
  await prisma.studioSettings.deleteMany();

  // 2. Configurações do Estúdio
  const studio = await prisma.studioSettings.create({
    data: {
      studioName: 'Studio Pilates & Bem-Estar Harmonia',
      latitude: -23.561684,
      longitude: -46.655981,
      address: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
      cancelWindowHours: 2,
      creditValidityDays: 30,
      defaultClassCapacity: 4,
      checkinRadiusMeters: 70.0,
      checkinDwellMinutes: 30,
      pixKey: 'contato@pilatesharmonia.com.br',
      pixKeyType: 'EMAIL',
      pixRecipientName: 'Studio Pilates Harmonia Ltda',
      pixRecipientCity: 'SAO PAULO'
    }
  });

  console.log('✅ Configurações do estúdio criadas:', studio.studioName);

  // 3. Alunos com dados de geolocalização e saúde realistas
  const studentsData = [
    {
      name: 'Camila Rodrigues',
      email: 'camila.rodrigues@email.com',
      phone: '(11) 98765-4321',
      cpf: '123.456.789-00',
      address: 'Alameda Santos, 1200',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      latitude: -23.565100,
      longitude: -46.654200,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      planName: '3x por Semana',
      monthlyFee: 420.00,
      healthNotes: 'Hérnia de disco L4-L5 diagnosticada em 2024. Evitar flexão lombar excessiva com carga.',
      restrictions: 'Não realizar hiperflexão de tronco com resistência pesada.',
      goals: 'Alívio de dores lombares e fortalecimento de core e glúteos.',
      schedules: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' }, // Segunda
        { dayOfWeek: 3, startTime: '08:00', endTime: '09:00' }, // Quarta
        { dayOfWeek: 5, startTime: '08:00', endTime: '09:00' }, // Sexta
      ]
    },
    {
      name: 'Rodrigo Mendonça',
      email: 'rodrigo.mendonca@email.com',
      phone: '(11) 97654-3210',
      cpf: '234.567.890-11',
      address: 'Rua Augusta, 2100',
      neighborhood: 'Cerqueira César',
      city: 'São Paulo',
      latitude: -23.558300,
      longitude: -46.662100,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      planName: '2x por Semana',
      monthlyFee: 320.00,
      healthNotes: 'Condromalácia patelar no joelho direito (Grau II). Fortalecimento de quadríceps e estabilização de pelve.',
      restrictions: 'Evitar agachamentos profundos com ângulo superior a 90 graus.',
      goals: 'Melhora da postura de trabalho e reabilitação do joelho.',
      schedules: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
        { dayOfWeek: 3, startTime: '08:00', endTime: '09:00' },
      ]
    },
    {
      name: 'Mariana Silva Alencar',
      email: 'mariana.alencar@email.com',
      phone: '(11) 96543-2109',
      cpf: '345.678.901-22',
      address: 'Rua Bela Cintra, 1800',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      latitude: -23.555200,
      longitude: -46.661000,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      planName: '2x por Semana',
      monthlyFee: 320.00,
      healthNotes: 'Gestante (22 semanas). Foco em trabalho respiratório, assoalho pélvico e mobilidade torácica.',
      restrictions: 'Posição supina prolongada contraindicada após o 2º trimestre.',
      goals: 'Preparação para parto normal e manutenção da estabilidade postural.',
      schedules: [
        { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '10:00' },
      ]
    },
    {
      name: 'Beatriz Costa',
      email: 'beatriz.costa@email.com',
      phone: '(11) 95432-1098',
      cpf: '456.789.012-33',
      address: 'Rua Pamplona, 900',
      neighborhood: 'Jardim Paulista',
      city: 'São Paulo',
      latitude: -23.567800,
      longitude: -46.653400,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      planName: '2x por Semana',
      monthlyFee: 320.00,
      healthNotes: 'Escoliose torácica em S leve. Encurtamento de cadeia posterior.',
      restrictions: 'Nenhuma contraindicação severa.',
      goals: 'Alongamento global, flexibilidade e consciência corporal.',
      schedules: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '10:00' },
      ]
    },
    {
      name: 'Lucas Ferreira',
      email: 'lucas.ferreira@email.com',
      phone: '(11) 94321-0987',
      cpf: '567.890.123-44',
      address: 'Rua Vergueiro, 1400',
      neighborhood: 'Paraíso',
      city: 'São Paulo',
      latitude: -23.575000,
      longitude: -46.641000,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      planName: '2x por Semana',
      monthlyFee: 320.00,
      healthNotes: 'Tendinite no manguito rotador direito em fase crônica.',
      restrictions: 'Cuidado com abdução de ombro acima de 90° com carga pesada.',
      goals: 'Fortalecimento estabilizador escapular e postura para home office.',
      schedules: [
        { dayOfWeek: 2, startTime: '18:00', endTime: '19:00' },
        { dayOfWeek: 4, startTime: '18:00', endTime: '19:00' },
      ]
    },
    {
      name: 'Juliana Paes Fontes',
      email: 'juliana.fontes@email.com',
      phone: '(11) 93210-9876',
      cpf: '678.901.234-55',
      address: 'Rua Oscar Freire, 850',
      neighborhood: 'Cerqueira César',
      city: 'São Paulo',
      latitude: -23.563000,
      longitude: -46.669000,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      planName: '3x por Semana',
      monthlyFee: 420.00,
      healthNotes: 'Dores crônicas na cervical devido a estresse e postura no computador.',
      restrictions: 'Evitar tração brusca no pescoço.',
      goals: 'Descompressão cervical, relaxamento muscular e condicionamento.',
      schedules: [
        { dayOfWeek: 1, startTime: '18:00', endTime: '19:00' },
        { dayOfWeek: 3, startTime: '18:00', endTime: '19:00' },
        { dayOfWeek: 5, startTime: '18:00', endTime: '19:00' },
      ]
    },
    {
      name: 'Gabriel Siqueira',
      email: 'gabriel.siqueira@email.com',
      phone: '(11) 92109-8765',
      cpf: '789.012.345-66',
      address: 'Av. Brigadeiro Luís Antônio, 2500',
      neighborhood: 'Jardim Paulista',
      city: 'São Paulo',
      latitude: -23.571000,
      longitude: -46.650000,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      planName: '2x por Semana',
      monthlyFee: 320.00,
      healthNotes: 'Praticante de corrida (meia-maratona). Encurtamento de isquiotibiais e banda iliotibial.',
      restrictions: 'Nenhuma contraindicação.',
      goals: 'Prevenção de lesões na corrida e aumento de amplitude de movimento.',
      schedules: [
        { dayOfWeek: 2, startTime: '07:00', endTime: '08:00' },
        { dayOfWeek: 4, startTime: '07:00', endTime: '08:00' },
      ]
    },
    {
      name: 'Fernanda Lima Castro',
      email: 'fernanda.castro@email.com',
      phone: '(11) 91098-7654',
      cpf: '890.123.456-77',
      address: 'Rua Domingos de Morais, 800',
      neighborhood: 'Vila Mariana',
      city: 'São Paulo',
      latitude: -23.582000,
      longitude: -46.638000,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      planName: '1x por Semana',
      monthlyFee: 200.00,
      healthNotes: 'Histórico de fascite plantar no pé esquerdo.',
      restrictions: 'Exercícios com salto ou impacto repetitivo.',
      goals: 'Fortalecimento do arco plantar e alinhamento biomecânico.',
      schedules: [
        { dayOfWeek: 5, startTime: '10:00', endTime: '11:00' },
      ]
    }
  ];

  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0-6

  for (const s of studentsData) {
    const { schedules, ...studentInfo } = s;
    const createdStudent = await prisma.student.create({
      data: studentInfo
    });

    // Criar horários fixos
    for (const sch of schedules) {
      await prisma.studentSchedule.create({
        data: {
          studentId: createdStudent.id,
          dayOfWeek: sch.dayOfWeek,
          startTime: sch.startTime,
          endTime: sch.endTime,
        }
      });
    }

    // Criar Fatura PIX
    const isPaid = Math.random() > 0.3;
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + (isPaid ? -5 : 5));

    await prisma.invoice.create({
      data: {
        studentId: createdStudent.id,
        title: `Mensalidade Pilates - ${createdStudent.planName}`,
        amount: createdStudent.monthlyFee,
        dueDate: dueDate,
        status: isPaid ? 'PAID' : 'PENDING',
        paidAt: isPaid ? new Date() : null,
        isRecurring: true,
        pixCopiaECola: '00020126580014br.gov.bcb.pix0136contato@pilatesharmonia.com.br520400005303986540' + createdStudent.monthlyFee.toFixed(2) + '5802BR5925Studio Pilates Harmonia6009SAO PAULO62070503***6304ABCD',
      }
    });

    // Se Camila ou Beatriz, criar um crédito de reposição ativo
    if (createdStudent.name.includes('Camila') || createdStudent.name.includes('Beatriz')) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 20); // Válido por mais 20 dias
      await prisma.classCredit.create({
        data: {
          studentId: createdStudent.id,
          originReason: 'Cancelamento com >2h de antecedência da aula do dia 12/08',
          expiresAt: expDate,
          used: false,
        }
      });
    }

    // Criar aulas de hoje e da semana
    for (const sch of schedules) {
      // Criar aula de hoje se coincidir o dia da semana ou para demonstrar a turma atual
      const classDate = new Date(today);
      const diff = sch.dayOfWeek - todayDayOfWeek;
      classDate.setDate(today.getDate() + diff);

      const isToday = diff === 0;
      let status = 'SCHEDULED';
      let checkinTime = null;
      let gpsDwell = null;

      if (isToday) {
        if (createdStudent.name.includes('Camila')) {
          status = 'CONFIRMED_GPS';
          checkinTime = new Date();
          gpsDwell = 35; // Permaneceu 35 min no raio do estúdio
        } else if (createdStudent.name.includes('Rodrigo')) {
          status = 'CONFIRMED_MANUAL';
          checkinTime = new Date();
        }
      }

      await prisma.attendance.create({
        data: {
          studentId: createdStudent.id,
          classDate: classDate,
          startTime: sch.startTime,
          endTime: sch.endTime,
          status: status,
          checkinTime: checkinTime,
          gpsDwellMinutes: gpsDwell,
        }
      });
    }

    // Registrar um ping de GPS de demonstração próximo ao estúdio
    await prisma.locationPing.create({
      data: {
        studentId: createdStudent.id,
        latitude: createdStudent.latitude || studio.latitude,
        longitude: createdStudent.longitude || studio.longitude,
        accuracyMeters: 10,
        distanceToStudio: 25.4,
      }
    });
  }

  console.log('🎉 Seed finalizado com sucesso! Todos os alunos, regras e dados foram populados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
