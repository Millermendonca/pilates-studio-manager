import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_OPERATING_HOURS } from '@/lib/operatingHours';

export async function GET() {
  try {
    let settings = await prisma.studioSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!settings) {
      settings = await prisma.studioSettings.create({
        data: {
          studioName: 'Studio Pilates Harmonia',
          cep: '01310-100',
          address: 'Av. Paulista, 1500',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          latitude: -23.561684,
          longitude: -46.655981,
          cancelWindowHours: 2,
          creditValidityDays: 30,
          defaultClassCapacity: 4,
          checkinRadiusMeters: 60.0,
          checkinDwellMinutes: 30,
          monthlyRescheduleLimit: 2,
          maxOverdueDaysBeforeSlotRelease: 5,
          operatingHoursJson: JSON.stringify(DEFAULT_OPERATING_HOURS),
        },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();

    const safeFloat = (val: any) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
      return isNaN(num) ? undefined : num;
    };

    const safeInt = (val: any) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'number' ? val : parseInt(String(val), 10);
      return isNaN(num) ? undefined : num;
    };

    const safeString = (val: any) => {
      if (val === undefined || val === null) return undefined;
      return typeof val === 'string' ? val : JSON.stringify(val);
    };

    const updateData: any = {
      ...(data.studioName !== undefined && { studioName: String(data.studioName) }),
      ...(data.cep !== undefined && { cep: String(data.cep) }),
      ...(data.address !== undefined && { address: String(data.address) }),
      ...(data.neighborhood !== undefined && { neighborhood: String(data.neighborhood) }),
      ...(data.city !== undefined && { city: String(data.city) }),
      ...(data.state !== undefined && { state: String(data.state) }),
      ...(safeFloat(data.latitude) !== undefined && { latitude: safeFloat(data.latitude) }),
      ...(safeFloat(data.longitude) !== undefined && { longitude: safeFloat(data.longitude) }),
      ...(safeInt(data.cancelWindowHours) !== undefined && { cancelWindowHours: safeInt(data.cancelWindowHours) }),
      ...(safeInt(data.creditValidityDays) !== undefined && { creditValidityDays: safeInt(data.creditValidityDays) }),
      ...(safeInt(data.defaultClassCapacity) !== undefined && { defaultClassCapacity: safeInt(data.defaultClassCapacity) }),
      ...(safeFloat(data.checkinRadiusMeters) !== undefined && { checkinRadiusMeters: safeFloat(data.checkinRadiusMeters) }),
      ...(safeInt(data.checkinDwellMinutes) !== undefined && { checkinDwellMinutes: safeInt(data.checkinDwellMinutes) }),
      ...(safeInt(data.monthlyRescheduleLimit) !== undefined && { monthlyRescheduleLimit: safeInt(data.monthlyRescheduleLimit) }),
      ...(safeInt(data.maxOverdueDaysBeforeSlotRelease) !== undefined && { maxOverdueDaysBeforeSlotRelease: safeInt(data.maxOverdueDaysBeforeSlotRelease) }),
      ...(data.contractTermsText !== undefined && { contractTermsText: data.contractTermsText }),
      ...(data.pixKey !== undefined && { pixKey: data.pixKey }),
      ...(data.pixKeyType !== undefined && { pixKeyType: data.pixKeyType }),
      ...(data.pixRecipientName !== undefined && { pixRecipientName: data.pixRecipientName }),
      ...(data.pixRecipientCity !== undefined && { pixRecipientCity: data.pixRecipientCity }),
      ...(data.bancoInterClientId !== undefined && { bancoInterClientId: data.bancoInterClientId }),
      ...(data.bancoInterClientSecret !== undefined && { bancoInterClientSecret: data.bancoInterClientSecret }),
      ...(data.bancoInterCertPath !== undefined && { bancoInterCertPath: data.bancoInterCertPath }),
      ...(data.bancoInterKeyPath !== undefined && { bancoInterKeyPath: data.bancoInterKeyPath }),
      ...(data.bancoInterContaCorrente !== undefined && { bancoInterContaCorrente: data.bancoInterContaCorrente }),
      ...(data.bancoInterAmbiente !== undefined && { bancoInterAmbiente: data.bancoInterAmbiente }),
      ...(data.bancoInterPixChave !== undefined && { bancoInterPixChave: data.bancoInterPixChave }),
      ...(data.billingReminderSchedule !== undefined && { billingReminderSchedule: data.billingReminderSchedule }),
      ...(data.googleReviewUrl !== undefined && { googleReviewUrl: data.googleReviewUrl }),
      ...(data.instagram !== undefined && { instagram: data.instagram }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
      ...(data.whatsappInviteTemplate !== undefined && { whatsappInviteTemplate: data.whatsappInviteTemplate }),
      ...(data.plansJson !== undefined && { plansJson: safeString(data.plansJson) }),
      ...(data.operatingHoursJson !== undefined && { operatingHoursJson: safeString(data.operatingHoursJson) }),
    };

    let settings = await prisma.studioSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings) {
      settings = await prisma.studioSettings.create({
        data: {
          studioName: 'Studio Pilates Harmonia',
          ...updateData,
        },
      });
    } else {
      settings = await prisma.studioSettings.update({
        where: { id: settings.id },
        data: updateData,
      });

      // Garante consistência caso existam registros duplicados no banco
      await prisma.studioSettings.updateMany({
        where: { id: { not: settings.id } },
        data: updateData,
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
