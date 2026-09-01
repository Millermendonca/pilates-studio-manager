import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { addDays, format } from 'date-fns';
import { geocodeAddress } from '@/lib/geocoding';

export const dynamic = 'force-dynamic';

const PLANS = [
  {
    id: 'plan_1x',
    name: '1x por Semana',
    price: 220.0,
    timesPerWeek: 1,
    description: 'Ideal para manutenção postural, relaxamento e iniciantes.',
    features: [
      '1 aula semanal com horário fixo garantido',
      'Crédito de reposição com cancelamento até 2h antes',
      'Check-in automático por GPS no app',
      'Acesso total ao chat e notificações WhatsApp',
    ],
    popular: false,
    badge: 'Iniciante',
  },
  {
    id: 'plan_2x',
    name: '2x por Semana',
    price: 340.0,
    timesPerWeek: 2,
    description: 'O mais recomendado para fortalecimento, alívio de dores e flexibilidade.',
    features: [
      '2 aulas semanais em turmas de até 8 alunos',
      'Atendimento personalizado focado na sua coluna',
      'Direito a reposições de aulas desmarcadas',
      'Check-in inteligente por aproximação GPS',
      'Suporte direto via WhatsApp no app',
    ],
    popular: true,
    badge: 'Mais Escolhido ⭐',
  },
  {
    id: 'plan_3x',
    name: '3x por Semana',
    price: 460.0,
    timesPerWeek: 3,
    description: 'Reabilitação acelerada, alta performance e condicionamento completo.',
    features: [
      '3 aulas semanais (Seg/Qua/Sex ou Ter/Qui/Sáb)',
      'Acompanhamento intensivo e evolução postural rápida',
      'Reposições flexíveis com validade de 30 dias',
      'Faturas e pagamento 100% via PIX com 1 clique',
    ],
    popular: false,
    badge: 'Alta Performance',
  },
  {
    id: 'plan_livre',
    name: 'Plano Livre / Diário',
    price: 590.0,
    timesPerWeek: 5,
    description: 'Acesso total de segunda a sexta para quem busca máxima dedicação.',
    features: [
      'Até 5 aulas por semana de Segunda a Sexta',
      'Maior flexibilidade de horários da grade',
      'Acompanhamento postural e fisioterapêutico contínuo',
      'Prioridade máxima em trocas de turmas',
    ],
    popular: false,
    badge: 'VIP Ilimitado',
  },
];

export async function GET() {
  try {
    const settings = await prisma.studioSettings.findFirst();
    return NextResponse.json({
      plans: PLANS,
      studio: {
        name: settings?.studioName || 'Studio Pilates Center',
        address: settings?.address,
        capacity: settings?.defaultClassCapacity || 8,
        whatsapp: settings?.whatsapp || '22999623247',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao carregar planos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      cpf,
      cep,
      address,
      neighborhood,
      city,
      state,
      photoCompressed,
      healthNotes,
      injuries,
      surgeries,
      movementRestrictions,
      emergencyContactName,
      emergencyContactPhone,
      contractAccepted,
      contractSignature,
      planId,
      selectedDays, // Array de { dayOfWeek: number, startTime: string }
      password,
    } = body;

    if (!name || !email || !phone || !planId) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const selectedPlan = PLANS.find((p) => p.id === planId) || PLANS[1];

    // Verificar se aluno já existe
    let student = await prisma.student.findUnique({
      where: { email: cleanEmail },
    });

    const targetAddress = address || student?.address || '';
    const targetNeighborhood = neighborhood || student?.neighborhood || '';
    const targetCity = city || student?.city || '';
    const targetState = state || student?.state || '';

    let studentLat = student?.latitude || null;
    let studentLon = student?.longitude || null;

    if (!studentLat || !studentLon) {
      const studio = await prisma.studioSettings.findFirst();
      const coords = await geocodeAddress(targetAddress, targetNeighborhood, targetCity, targetState, studio);
      if (coords) {
        studentLat = coords.latitude;
        studentLon = coords.longitude;
      }
    }

    const studentDataPayload: any = {
      name,
      phone,
      cpf: cpf || student?.cpf || null,
      cep: cep || student?.cep || null,
      address: targetAddress || 'Endereço não informado',
      neighborhood: targetNeighborhood || 'Centro',
      city: targetCity || 'São Paulo',
      state: targetState || 'SP',
      latitude: studentLat,
      longitude: studentLon,
      photoCompressed: photoCompressed || student?.photoCompressed || null,
      healthNotes: healthNotes || student?.healthNotes || null,
      medicalHistory: healthNotes || student?.medicalHistory || null,
      injuries: injuries || student?.injuries || null,
      surgeries: surgeries || student?.surgeries || null,
      movementRestrictions: movementRestrictions || student?.movementRestrictions || null,
      emergencyContactName: emergencyContactName || student?.emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || student?.emergencyContactPhone || null,
      contractAccepted: contractAccepted !== undefined ? contractAccepted : true,
      contractAcceptedAt: contractAccepted ? new Date() : undefined,
      contractSignature: contractSignature || name,
      planName: selectedPlan.name,
      monthlyFee: selectedPlan.price,
      active: true,
      status: 'ACTIVE',
      password: password || student?.password || 'senha123',
      avatarUrl: photoCompressed || student?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    };

    if (student) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: studentDataPayload,
      });
    } else {
      student = await prisma.student.create({
        data: {
          email: cleanEmail,
          ...studentDataPayload,
        },
      });
    }

    // Criar/Substituir horários fixos semanais do aluno
    if (selectedDays && Array.isArray(selectedDays) && selectedDays.length > 0) {
      await prisma.studentSchedule.deleteMany({
        where: { studentId: student.id },
      });

      for (const slot of selectedDays) {
        const startHour = parseInt(slot.startTime.split(':')[0]);
        const endHour = (startHour + 1).toString().padStart(2, '0') + ':00';

        await prisma.studentSchedule.create({
          data: {
            studentId: student.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: endHour,
          },
        });
      }
    }

    // Gerar a primeira Fatura PIX de Matrícula
    const dueDate = addDays(new Date(), 3);
    const pixCode = `00020126580014br.gov.bcb.pix0136contato@pilatescenter.com.br520400005303986540${selectedPlan.price.toFixed(2)}5802BR5921Studio Pilates Center6009SAO PAULO62070503***6304${Math.floor(1000 + Math.random() * 9000)}`;

    const invoice = await prisma.invoice.create({
      data: {
        studentId: student.id,
        title: `Mensalidade Inicial • ${selectedPlan.name}`,
        amount: selectedPlan.price,
        dueDate,
        status: 'PENDING',
        pixQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`,
        pixCopiaECola: pixCode,
      },
    });

    // Enviar mensagem automática de boas-vindas no Chat do Aluno
    await prisma.chatMessage.create({
      data: {
        studentId: student.id,
        sender: 'SYSTEM',
        message: `🎉 Seja muito bem-vindo(a) ao Studio Pilates Harmonia, ${name.split(' ')[0]}!\n\nSua contratação do plano "${selectedPlan.name}" foi concluída com sucesso. Seu horário fixo semanal já está reservado na nossa grade.\n\nQualquer dúvida, estamos à disposição aqui pelo chat ou no WhatsApp! ✨🧘‍♀️`,
        messageType: 'TEXT',
      },
    });

    // Salvar Cookie de Sessão para login automático
    cookies().set('student_session', student.id, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      message: 'Matrícula e contratação realizadas com sucesso!',
      student,
      invoice,
    }, { status: 201 });
  } catch (error) {
    console.error('Erro na contratação/matrícula:', error);
    return NextResponse.json({ error: 'Erro ao processar matrícula' }, { status: 500 });
  }
}
