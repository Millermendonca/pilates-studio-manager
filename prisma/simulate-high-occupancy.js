const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Ana', 'Beatriz', 'Camila', 'Débora', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena',
  'Isabela', 'Juliana', 'Larissa', 'Mariana', 'Natália', 'Patrícia', 'Renata', 'Sofia',
  'Tatiane', 'Vanessa', 'Aline', 'Bruna', 'Carolina', 'Daniela', 'Elisa', 'Flávia',
  'Lucas', 'Gabriel', 'Rodrigo', 'Matheus', 'Felipe', 'Guilherme', 'Bruno', 'Leonardo',
  'Rafael', 'Gustavo', 'Thiago', 'Marcelo', 'Diego', 'André', 'Eduardo', 'Ricardo',
  'Alexandre', 'Caio', 'Vinícius', 'Danilo', 'Henrique', 'Vitor', 'Paulo', 'Fernando'
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos'
];

const NEIGHBORHOODS = [
  { name: 'Jardins', lat: -23.5651, lng: -46.6542, address: 'Alameda Santos' },
  { name: 'Cerqueira César', lat: -23.5583, lng: -46.6621, address: 'Rua Augusta' },
  { name: 'Bela Vista', lat: -23.5616, lng: -46.6559, address: 'Av. Paulista' },
  { name: 'Paraíso', lat: -23.5750, lng: -46.6410, address: 'Rua Vergueiro' },
  { name: 'Consolação', lat: -23.5552, lng: -46.6610, address: 'Rua Bela Cintra' },
  { name: 'Vila Mariana', lat: -23.5820, lng: -46.6380, address: 'Rua Domingos de Morais' },
  { name: 'Pinheiros', lat: -23.5620, lng: -46.6850, address: 'Rua dos Pinheiros' },
  { name: 'Itaim Bibi', lat: -23.5840, lng: -46.6780, address: 'Rua Joaquim Floriano' },
  { name: 'Higienópolis', lat: -23.5450, lng: -46.6580, address: 'Av. Angélica' },
  { name: 'Moema', lat: -23.6020, lng: -46.6610, address: 'Av. Ibirapuera' },
];

const HEALTH_CONDITIONS = [
  { notes: 'Hérnia de disco L4-L5. Evitar hiperflexão com carga.', restrictions: 'Cuidado com flexão lombar em carga.', goals: 'Fortalecimento de core e alívio de dores.' },
  { notes: 'Condromalácia patelar grau II no joelho direito.', restrictions: 'Evitar agachamentos com flexão > 90°.', goals: 'Estabilização de joelho e ganho de força muscular.' },
  { notes: 'Escoliose torácica leve em S. Encurtamento de cadeia posterior.', restrictions: 'Nenhuma restrição grave.', goals: 'Alongamento global e correção postural.' },
  { notes: 'Tendinite no manguito rotador do ombro direito.', restrictions: 'Evitar abdução acima de 90° com mola pesada.', goals: 'Fortalecimento estabilizador de escápulas.' },
  { notes: 'Gestante (24 semanas). Foco em respiração e assoalho pélvico.', restrictions: 'Evitar posição supina prolongada.', goals: 'Preparação para parto e alívio lombar.' },
  { notes: 'Tensão cervical crônica decorrente de trabalho no computador.', restrictions: 'Evitar trações bruscas na cervical.', goals: 'Relaxamento muscular e mobilidade de ombros.' },
  { notes: 'Fascite plantar no pé esquerdo em fase de recuperação.', restrictions: 'Evitar impactos e saltos.', goals: 'Fortalecimento do arco plantar e alinhamento do tornozelo.' },
  { notes: 'Sem lesões. Busca condicionamento físico e flexibilidade.', restrictions: 'Sem restrições.', goals: 'Tonificação muscular, definição e flexibilidade.' },
];

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

async function main() {
  console.log('🚀 Iniciando Simulação de Alta Ocupação (Maioria das turmas 7/8 e 8/8)...');

  // 1. Garantir configurações com capacidade = 8
  await prisma.studioSettings.updateMany({
    data: {
      defaultClassCapacity: 8,
    }
  });

  // 2. Limpar dados anteriores para construir a simulação perfeita
  await prisma.locationPing.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.classCredit.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.studentSchedule.deleteMany();
  await prisma.student.deleteMany();

  const createdStudents = [];
  const totalStudentsToGenerate = 58; // 58 alunos ativos para lotar as turmas de 8

  for (let i = 0; i < totalStudentsToGenerate; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3 + 7) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`;
    const phone = `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const neigh = NEIGHBORHOODS[i % NEIGHBORHOODS.length];
    const health = HEALTH_CONDITIONS[i % HEALTH_CONDITIONS.length];
    
    // Pequena variação geográfica aleatória (±100m)
    const lat = neigh.lat + (Math.random() - 0.5) * 0.008;
    const lng = neigh.lng + (Math.random() - 0.5) * 0.008;

    const planType = i % 4 === 0 ? '3x por Semana' : i % 5 === 0 ? '1x por Semana' : '2x por Semana';
    const fee = planType === '3x por Semana' ? 420.0 : planType === '1x por Semana' ? 220.0 : 320.0;

    const student = await prisma.student.create({
      data: {
        name,
        email,
        phone,
        cpf: `${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}`,
        address: `${neigh.address}, ${100 + i * 15}`,
        neighborhood: neigh.name,
        city: 'São Paulo',
        latitude: lat,
        longitude: lng,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        planName: planType,
        monthlyFee: fee,
        healthNotes: health.notes,
        restrictions: health.restrictions,
        goals: health.goals,
        active: true,
      }
    });

    createdStudents.push(student);

    // Criar fatura PIX
    const isPaid = Math.random() > 0.15;
    await prisma.invoice.create({
      data: {
        studentId: student.id,
        title: `Mensalidade Pilates - ${student.planName}`,
        amount: fee,
        dueDate: new Date(Date.now() + (isPaid ? -2 : 7) * 86400000),
        status: isPaid ? 'PAID' : 'PENDING',
        paidAt: isPaid ? new Date() : null,
        isRecurring: true,
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136contato@pilatesharmonia.com.br520400005303986540${fee.toFixed(2)}5802BR5925Studio Pilates Harmonia6009SAO PAULO62070503***6304ABCD`,
      }
    });
  }

  console.log(`✅ ${createdStudents.length} alunos cadastrados com sucesso.`);

  // 3. Distribuir alunos nos horários com ALTA OCUPAÇÃO (7 a 8 alunos na maioria dos slots)
  // Horários de Segunda a Sexta
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0 a 6

  let studentIndex = 0;

  // Grade semanal por horário
  // Para cada horário, alocar entre 7 e 8 alunos
  for (let slotIndex = 0; slotIndex < TIME_SLOTS.length; slotIndex++) {
    const time = TIME_SLOTS[slotIndex];
    const endHour = (parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0') + ':00';
    
    // Alocar 7 ou 8 alunos por turma (lotadas!)
    const targetOccupancy = (slotIndex === 4 || slotIndex === 5) ? 6 : (slotIndex % 2 === 0 ? 8 : 7);

    for (let o = 0; o < targetOccupancy; o++) {
      const student = createdStudents[studentIndex % createdStudents.length];
      studentIndex++;

      // Criar horários fixos Seg/Qua/Sex ou Ter/Qui
      const days = slotIndex % 2 === 0 ? [1, 3, 5] : [2, 4];
      for (const d of days) {
        await prisma.studentSchedule.create({
          data: {
            studentId: student.id,
            dayOfWeek: d,
            startTime: time,
            endTime: endHour,
          }
        });
      }

      // Criar aulas de hoje e da semana
      for (let dayOffset = -2; dayOffset <= 4; dayOffset++) {
        const classDate = new Date(today);
        classDate.setDate(today.getDate() + dayOffset);
        const dayOfWeek = classDate.getDay();

        if (days.includes(dayOfWeek)) {
          const isToday = dayOffset === 0;
          let status = 'SCHEDULED';
          let checkinTime = null;
          let gpsDwell = null;

          if (isToday) {
            const isPresent = Math.random() > 0.3;
            if (isPresent) {
              const isGps = Math.random() > 0.5;
              status = isGps ? 'CONFIRMED_GPS' : 'CONFIRMED_MANUAL';
              checkinTime = new Date();
              gpsDwell = isGps ? 35 : null;
            }
          }

          await prisma.attendance.create({
            data: {
              studentId: student.id,
              classDate,
              startTime: time,
              endTime: endHour,
              status,
              checkinTime,
              gpsDwellMinutes: gpsDwell,
            }
          });
        }
      }
    }
  }

  // 4. Criar alguns créditos de reposição ativos
  for (let c = 0; c < 8; c++) {
    const s = createdStudents[c];
    await prisma.classCredit.create({
      data: {
        studentId: s.id,
        originReason: 'Cancelamento com >2h de antecedência da aula anterior',
        expiresAt: new Date(Date.now() + 25 * 86400000),
        used: false,
      }
    });
  }

  console.log('🎉 Simulação de ALTA OCUPAÇÃO concluída com sucesso!');
  console.log('📊 Turmas agora operando com 7/8 e 8/8 alunos (lotação máxima).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
