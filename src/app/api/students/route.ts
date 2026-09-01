import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { geocodeAddress } from '@/lib/geocoding';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const active = searchParams.get('active');
    const status = searchParams.get('status');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { neighborhood: { contains: search } },
        { cpf: { contains: search } },
      ];
    }
    if (active !== null && active !== undefined && active !== '') {
      where.active = active === 'true';
    }
    if (status) {
      where.status = status;
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        schedules: {
          where: { active: true },
          orderBy: { dayOfWeek: 'asc' },
        },
        credits: {
          where: { used: false, expiresAt: { gte: new Date() } },
          orderBy: { expiresAt: 'asc' },
        },
        invoices: {
          orderBy: { dueDate: 'desc' },
          take: 3,
        },
        evolutions: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Garantir que alunos sem coordenadas recebam geocodificação
    const studio = await prisma.studioSettings.findFirst();
    const formattedStudents = await Promise.all(
      students.map(async (student) => {
        if (!student.latitude || !student.longitude) {
          const coords = await geocodeAddress(
            student.address,
            student.neighborhood,
            student.city,
            student.state,
            studio
          );
          if (coords) {
            // Atualizar no banco de dados de forma assíncrona
            prisma.student.update({
              where: { id: student.id },
              data: { latitude: coords.latitude, longitude: coords.longitude },
            }).catch(() => {});

            return {
              ...student,
              latitude: coords.latitude,
              longitude: coords.longitude,
            };
          }
        }
        return student;
      })
    );

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error('Erro ao listar alunos:', error);
    return NextResponse.json({ error: 'Erro ao listar alunos' }, { status: 500 });
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
      birthDate,
      cep,
      address,
      neighborhood,
      city,
      state,
      latitude,
      longitude,
      planName,
      monthlyFee,
      healthNotes,
      restrictions,
      goals,
      medicalHistory,
      injuries,
      surgeries,
      movementRestrictions,
      physicalAssessment,
      painLevel,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      avatarUrl,
      photoCompressed,
      isCorporate,
      corporateProvider,
      contractAccepted,
      contractSignature,
      schedules = [], // array of { dayOfWeek: number, startTime: string, endTime: string }
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'O nome do aluno é obrigatório' }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'O telefone/WhatsApp do aluno é obrigatório' }, { status: 400 });
    }

function getPlanLimit(planName?: string): number {
  if (!planName) return 2;
  const p = planName.toLowerCase();
  if (p.includes('1x')) return 1;
  if (p.includes('2x')) return 2;
  if (p.includes('3x')) return 3;
  if (p.includes('4x')) return 4;
  if (p.includes('livre') || p.includes('diário') || p.includes('diario')) return 6;
  if (p.includes('avulsa') || p.includes('experimental')) return 0;
  if (p.includes('wellhub') || p.includes('totalpass')) return 6;
  return 2;
}

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;

    if (cleanEmail) {
      const existingStudent = await prisma.student.findUnique({
        where: { email: cleanEmail },
      });

      if (existingStudent) {
        return NextResponse.json({ error: 'Já existe um aluno cadastrado com este e-mail' }, { status: 400 });
      }
    }

    const maxAllowed = getPlanLimit(planName);
    if (Array.isArray(schedules) && schedules.length > maxAllowed) {
      return NextResponse.json({
        error: `O plano '${planName || 'Padrão'}' permite no máximo ${maxAllowed} horário(s) semanal(is). Você tentou salvar ${schedules.length} horários.`,
      }, { status: 400 });
    }

    let finalLat = latitude ? parseFloat(latitude) : null;
    let finalLon = longitude ? parseFloat(longitude) : null;

    if (!finalLat || !finalLon) {
      const studio = await prisma.studioSettings.findFirst();
      const coords = await geocodeAddress(address, neighborhood, city, state, studio);
      if (coords) {
        finalLat = coords.latitude;
        finalLon = coords.longitude;
      }
    }

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        cpf: cpf || '',
        birthDate: birthDate ? new Date(birthDate) : null,
        cep: cep || '',
        address: address || '',
        neighborhood: neighborhood || '',
        city: city || 'São Paulo',
        state: state || 'SP',
        latitude: finalLat,
        longitude: finalLon,
        planName: planName || '2x por Semana',
        monthlyFee: isCorporate ? 0 : monthlyFee ? parseFloat(monthlyFee) : 320.0,
        isCorporate: !!isCorporate,
        corporateProvider: corporateProvider || null,
        status: 'ACTIVE',
        emergencyContactName: emergencyContactName || '',
        emergencyContactPhone: emergencyContactPhone || '',
        emergencyContactRelation: emergencyContactRelation || '',
        healthNotes: healthNotes || '',
        restrictions: restrictions || '',
        goals: goals || '',
        medicalHistory: medicalHistory || '',
        injuries: injuries || '',
        surgeries: surgeries || '',
        movementRestrictions: movementRestrictions || '',
        physicalAssessment: physicalAssessment || '',
        painLevel: painLevel ? parseInt(painLevel) : 0,
        contractAccepted: !!contractAccepted,
        contractAcceptedAt: contractAccepted ? new Date() : null,
        contractSignature: contractSignature || null,
        photoCompressed: photoCompressed || null,
        avatarUrl:
          avatarUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        schedules: {
          create: schedules.map((s: any) => ({
            dayOfWeek: parseInt(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        },
      },
      include: {
        schedules: true,
        evolutions: true,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Erro ao cadastrar aluno:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar aluno' }, { status: 500 });
  }
}
