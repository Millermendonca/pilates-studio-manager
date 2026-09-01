import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        credits: { orderBy: { expiresAt: 'asc' } },
        invoices: { orderBy: { dueDate: 'desc' } },
        evolutions: { orderBy: { date: 'desc' } },
        attendances: {
          orderBy: { classDate: 'desc' },
          take: 20,
        },
        locationPings: {
          orderBy: { recordedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Erro ao obter aluno:', error);
    return NextResponse.json({ error: 'Erro ao obter dados do aluno' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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
      active,
      status,
      isPaused,
      avatarUrl,
      photoCompressed,
      isCorporate,
      corporateProvider,
      isBlocked,
      blockReason,
      contractAccepted,
      contractSignature,
      schedules,
    } = body;

    // Se o status mudar para PAUSED ou isPaused=true, salvar pausedAt
    let pausedAtUpdate: any = undefined;
    if (isPaused !== undefined) {
      pausedAtUpdate = isPaused ? new Date() : null;
    } else if (status === 'PAUSED') {
      pausedAtUpdate = new Date();
    }

    const student = await prisma.student.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(cpf !== undefined && { cpf }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(cep !== undefined && { cep }),
        ...(address !== undefined && { address }),
        ...(neighborhood !== undefined && { neighborhood }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(planName !== undefined && { planName }),
        ...(monthlyFee !== undefined && { monthlyFee: parseFloat(monthlyFee) }),
        ...(isCorporate !== undefined && { isCorporate }),
        ...(corporateProvider !== undefined && { corporateProvider }),
        ...(isBlocked !== undefined && { isBlocked }),
        ...(blockReason !== undefined && { blockReason }),
        ...(status !== undefined && { status }),
        ...(isPaused !== undefined && { isPaused }),
        ...(pausedAtUpdate !== undefined && { pausedAt: pausedAtUpdate }),
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
        ...(physicalAssessment !== undefined && { physicalAssessment }),
        ...(painLevel !== undefined && { painLevel: parseInt(painLevel) || 0 }),
        ...(contractAccepted !== undefined && {
          contractAccepted,
          contractAcceptedAt: contractAccepted ? new Date() : null,
        }),
        ...(contractSignature !== undefined && { contractSignature }),
        ...(photoCompressed !== undefined && { photoCompressed }),
        ...(active !== undefined && { active }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    function getPlanLimit(pName?: string): number {
      if (!pName) return 2;
      const p = pName.toLowerCase();
      if (p.includes('1x')) return 1;
      if (p.includes('2x')) return 2;
      if (p.includes('3x')) return 3;
      if (p.includes('4x')) return 4;
      if (p.includes('livre') || p.includes('diário') || p.includes('diario')) return 6;
      if (p.includes('avulsa') || p.includes('experimental')) return 0;
      if (p.includes('wellhub') || p.includes('totalpass')) return 6;
      return 2;
    }

    if (Array.isArray(schedules)) {
      const targetPlan = planName || student.planName;
      const maxAllowed = getPlanLimit(targetPlan);
      if (schedules.length > maxAllowed) {
        return NextResponse.json({
          error: `O plano '${targetPlan || 'Padrão'}' permite no máximo ${maxAllowed} horário(s) semanal(is). Você tentou salvar ${schedules.length} horários.`,
        }, { status: 400 });
      }

      // Deletar horários anteriores e criar os novos
      await prisma.studentSchedule.deleteMany({
        where: { studentId: params.id },
      });

      if (schedules.length > 0) {
        await prisma.studentSchedule.createMany({
          data: schedules.map((s: any) => ({
            studentId: params.id,
            dayOfWeek: parseInt(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    }

    const updated = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        schedules: true,
        credits: true,
        evolutions: { orderBy: { date: 'desc' } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar aluno:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do aluno' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.student.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir aluno:', error);
    return NextResponse.json({ error: 'Erro ao excluir aluno' }, { status: 500 });
  }
}
