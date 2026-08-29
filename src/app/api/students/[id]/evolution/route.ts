import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const evolutions = await prisma.studentEvolution.findMany({
      where: { studentId: params.id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(evolutions);
  } catch (error) {
    console.error('Erro ao listar evoluções do aluno:', error);
    return NextResponse.json({ error: 'Erro ao obter histórico de evolução' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      date,
      type,
      notes,
      exercisesPerformed,
      painLevel,
      authorName,
    } = body;

    if (!notes) {
      return NextResponse.json({ error: 'O campo de anotações é obrigatório' }, { status: 400 });
    }

    const evolution = await prisma.studentEvolution.create({
      data: {
        studentId: params.id,
        date: date ? new Date(date) : new Date(),
        type: type || 'CLASS_NOTE',
        notes,
        exercisesPerformed: exercisesPerformed || '',
        painLevel: painLevel !== undefined ? parseInt(painLevel) : 0,
        authorName: authorName || 'Instrutor',
      },
    });

    return NextResponse.json(evolution, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar evolução:', error);
    return NextResponse.json({ error: 'Erro ao registrar evolução do aluno' }, { status: 500 });
  }
}
