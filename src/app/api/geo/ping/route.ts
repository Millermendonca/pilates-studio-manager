import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDistanceInMeters } from '@/lib/geo';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, latitude, longitude, accuracy, simulatedDwellMinutes } = body;

    if (!studentId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Parâmetros de geolocalização incompletos' }, { status: 400 });
    }

    const settings = await prisma.studioSettings.findFirst();
    const studioLat = settings?.latitude || -23.561684;
    const studioLng = settings?.longitude || -46.655981;
    const allowedRadius = settings?.checkinRadiusMeters || 60.0;
    const requiredDwell = settings?.checkinDwellMinutes || 30;

    const distance = calculateDistanceInMeters(
      parseFloat(latitude),
      parseFloat(longitude),
      studioLat,
      studioLng
    );

    const isInside = distance <= allowedRadius;

    // Registrar ping
    await prisma.locationPing.create({
      data: {
        studentId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracyMeters: accuracy ? parseFloat(accuracy) : 10,
        distanceToStudio: distance,
      },
    });

    // Verificar se o aluno tem aula marcada hoje
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        classDate: { gte: todayStart, lte: todayEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED_GPS', 'CONFIRMED_MANUAL'] },
      },
    });

    let autoCheckinTriggered = false;
    let dwell = simulatedDwellMinutes !== undefined ? simulatedDwellMinutes : 0;

    // Se estiver dentro do raio e tiver permanecido pelo menos 30 min (ou dwell simulação)
    if (isInside && todayAttendance) {
      if (dwell >= requiredDwell && todayAttendance.status === 'SCHEDULED') {
        await prisma.attendance.update({
          where: { id: todayAttendance.id },
          data: {
            status: 'CONFIRMED_GPS',
            checkinTime: now,
            gpsDwellMinutes: dwell,
          },
        });
        autoCheckinTriggered = true;
      }
    }

    return NextResponse.json({
      studentId,
      distanceToStudioMeters: distance,
      allowedRadiusMeters: allowedRadius,
      isInsideGeofence: isInside,
      dwellMinutes: dwell,
      requiredDwellMinutes: requiredDwell,
      autoCheckinTriggered,
      attendance: todayAttendance,
      message: isInside
        ? (autoCheckinTriggered
            ? `Presença confirmada automaticamente por GPS! Aluno permaneceu ${dwell}min no estúdio.`
            : `Aluno detectado a ${distance}m do estúdio. Permanência atual: ${dwell}min (necessário ${requiredDwell}min para check-in automático).`)
        : `Aluno fora do raio do estúdio (${distance}m de distância).`,
    });
  } catch (error) {
    console.error('Erro ao processar ping de geolocalização:', error);
    return NextResponse.json({ error: 'Erro ao processar geolocalização' }, { status: 500 });
  }
}
