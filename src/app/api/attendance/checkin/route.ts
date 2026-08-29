import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { attendanceId, studentId, type, dwellMinutes } = body; // type: 'MANUAL' | 'GPS'

    if (!attendanceId && !studentId) {
      return NextResponse.json({ error: 'Identificador de presença ou aluno é obrigatório' }, { status: 400 });
    }

    let targetAttendanceId = attendanceId;

    // Se passou apenas studentId, procurar aula de hoje desse aluno
    if (!targetAttendanceId && studentId) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const attendance = await prisma.attendance.findFirst({
        where: {
          studentId,
          classDate: { gte: todayStart, lte: todayEnd },
        },
      });

      if (!attendance) {
        return NextResponse.json({ error: 'Nenhuma aula agendada para hoje para este aluno' }, { status: 404 });
      }
      targetAttendanceId = attendance.id;
    }

    const updated = await prisma.attendance.update({
      where: { id: targetAttendanceId },
      data: {
        status: type === 'GPS' ? 'CONFIRMED_GPS' : 'CONFIRMED_MANUAL',
        checkinTime: new Date(),
        gpsDwellMinutes: type === 'GPS' ? (dwellMinutes || 30) : null,
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: type === 'GPS' ? 'Check-in por GPS confirmado com sucesso!' : 'Presença confirmada manualmente!',
      attendance: updated,
    });
  } catch (error) {
    console.error('Erro no check-in:', error);
    return NextResponse.json({ error: 'Erro ao realizar check-in' }, { status: 500 });
  }
}
