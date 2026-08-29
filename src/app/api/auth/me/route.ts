import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionId = cookies().get('student_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ authenticated: false, student: null });
    }

    const student = await prisma.student.findUnique({
      where: { id: sessionId },
      include: {
        schedules: true,
        attendances: { orderBy: { classDate: 'desc' }, take: 10 },
        credits: { where: { used: false } },
        invoices: { orderBy: { dueDate: 'desc' }, take: 5 },
        messages: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!student) {
      return NextResponse.json({ authenticated: false, student: null });
    }

    return NextResponse.json({
      authenticated: true,
      student,
    });
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return NextResponse.json({ authenticated: false, student: null });
  }
}
