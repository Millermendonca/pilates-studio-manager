import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });
    }

    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length < 8) {
      return NextResponse.json({ error: 'Telefone inválido (mínimo 8 dígitos)' }, { status: 400 });
    }

    // Buscar por correspondência parcial ou total no telefone
    const allStudents = await prisma.student.findMany({
      include: {
        schedules: {
          where: { active: true },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    // Comparar dígitos limpos para encontrar com ou sem DDD / formatação
    const foundStudent = allStudents.find((s) => {
      const studentDigits = (s.phone || '').replace(/\D/g, '');
      return (
        studentDigits === rawDigits ||
        studentDigits.endsWith(rawDigits) ||
        rawDigits.endsWith(studentDigits)
      );
    });

    if (!foundStudent) {
      return NextResponse.json({
        found: false,
        message: 'Nenhum aluno encontrado com este telefone. Você pode iniciar um novo cadastro!',
      });
    }

    return NextResponse.json({
      found: true,
      student: foundStudent,
      message: `Olá, ${foundStudent.name}! Encontramos seu cadastro. Complete seus dados a seguir.`,
    });
  } catch (error: any) {
    console.error('Erro na busca de aluno por telefone:', error);
    return NextResponse.json({ error: 'Erro ao buscar cadastro' }, { status: 500 });
  }
}
