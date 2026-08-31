import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, data } = body;

    if (!data) {
      return NextResponse.json({ error: 'Dados não fornecidos' }, { status: 400 });
    }

    const {
      name,
      phone,
      email,
      cpf,
      birthDate,
      cep,
      address,
      neighborhood,
      city,
      state,
      latitude,
      longitude,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      healthNotes,
      restrictions,
      goals,
      medicalHistory,
      injuries,
      surgeries,
      movementRestrictions,
      painLevel,
      avatarUrl,
      photoCompressed,
      contractAccepted,
      contractSignature,
      planName,
      monthlyFee,
    } = data;

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : undefined;

    // Se já temos um studentId, atualizar o registro existente
    if (studentId) {
      const existing = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
      }

      // Verificar duplicação de e-mail com outro aluno
      if (cleanEmail && cleanEmail !== existing.email) {
        const emailInUse = await prisma.student.findUnique({
          where: { email: cleanEmail },
        });
        if (emailInUse && emailInUse.id !== studentId) {
          return NextResponse.json(
            { error: 'Este e-mail já está sendo utilizado por outro cadastro' },
            { status: 400 }
          );
        }
      }

      const updated = await prisma.student.update({
        where: { id: studentId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(phone !== undefined && { phone: phone.trim() }),
          ...(cleanEmail !== undefined && { email: cleanEmail }),
          ...(cpf !== undefined && { cpf: cpf.trim() }),
          ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
          ...(cep !== undefined && { cep }),
          ...(address !== undefined && { address }),
          ...(neighborhood !== undefined && { neighborhood }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
          ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
          ...(emergencyContactName !== undefined && { emergencyContactName }),
          ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
          ...(emergencyContactRelation !== undefined && { emergencyContactRelation }),
          ...(healthNotes !== undefined && { healthNotes }),
          ...(restrictions !== undefined && { restrictions }),
          ...(goals !== undefined && { goals }),
          ...(medicalHistory !== undefined && { medicalHistory }),
          ...(injuries !== undefined && { injuries }),
          ...(surgeries !== undefined && { surgeries }),
          ...(movementRestrictions !== undefined && { movementRestrictions }),
          ...(painLevel !== undefined && { painLevel: parseInt(painLevel) || 0 }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          ...(photoCompressed !== undefined && { photoCompressed }),
          ...(contractAccepted !== undefined && {
            contractAccepted: !!contractAccepted,
            contractAcceptedAt: contractAccepted ? new Date() : null,
          }),
          ...(contractSignature !== undefined && { contractSignature }),
          ...(planName !== undefined && { planName }),
          ...(monthlyFee !== undefined && { monthlyFee: parseFloat(monthlyFee) }),
        },
      });

      return NextResponse.json({
        success: true,
        student: updated,
        studentId: updated.id,
        message: 'Progresso salvo com sucesso em tempo real.',
      });
    }

    // Se for um novo aluno iniciando o cadastro
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'O nome é obrigatório para iniciar o cadastro' }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'O telefone é obrigatório para iniciar o cadastro' }, { status: 400 });
    }

    // Verificar se já existe um aluno com esse e-mail (se fornecido)
    if (cleanEmail) {
      const existingEmail = await prisma.student.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Já existe um aluno cadastrado com este e-mail' },
          { status: 400 }
        );
      }
    }

    const newStudent = await prisma.student.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: cleanEmail || null,
        cpf: cpf ? cpf.trim() : '',
        birthDate: birthDate ? new Date(birthDate) : null,
        cep: cep || '',
        address: address || '',
        neighborhood: neighborhood || '',
        city: city || 'São Paulo',
        state: state || 'SP',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        planName: planName || '2x por Semana',
        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 340.0,
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
        painLevel: painLevel ? parseInt(painLevel) : 0,
        avatarUrl: avatarUrl || null,
        photoCompressed: photoCompressed || null,
        contractAccepted: !!contractAccepted,
        contractAcceptedAt: contractAccepted ? new Date() : null,
        contractSignature: contractSignature || '',
      },
    });

    return NextResponse.json({
      success: true,
      student: newStudent,
      studentId: newStudent.id,
      message: 'Cadastro iniciado e salvo com sucesso em tempo real.',
    });
  } catch (error: any) {
    console.error('Erro no salvamento automático da etapa:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar etapa do cadastro' },
      { status: 500 }
    );
  }
}
