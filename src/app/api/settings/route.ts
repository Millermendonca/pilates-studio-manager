import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_OPERATING_HOURS } from '@/lib/operatingHours';

export async function GET() {
  try {
    let settings = await prisma.studioSettings.findFirst();
    if (!settings) {
      settings = await prisma.studioSettings.create({
        data: {
          studioName: 'Studio Pilates Center',
          cep: '28026-110',
          address: 'Avenida Mário Manhães de Andrade',
          neighborhood: 'Parque Aurora',
          city: 'Campos dos Goytacazes',
          state: 'RJ',
          latitude: -21.7792589,
          longitude: -41.3293574,
          cancelWindowHours: 2,
          creditValidityDays: 30,
          defaultClassCapacity: 8,
          checkinRadiusMeters: 70.0,
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
    let settings = await prisma.studioSettings.findFirst();

    const updateData: any = {
      ...(data.studioName !== undefined && { studioName: data.studioName }),
      ...(data.cep !== undefined && { cep: data.cep }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.neighborhood !== undefined && { neighborhood: data.neighborhood }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.latitude !== undefined && { latitude: parseFloat(data.latitude) }),
      ...(data.longitude !== undefined && { longitude: parseFloat(data.longitude) }),
      ...(data.cancelWindowHours !== undefined && { cancelWindowHours: parseInt(data.cancelWindowHours) }),
      ...(data.creditValidityDays !== undefined && { creditValidityDays: parseInt(data.creditValidityDays) }),
      ...(data.defaultClassCapacity !== undefined && { defaultClassCapacity: parseInt(data.defaultClassCapacity) }),
      ...(data.checkinRadiusMeters !== undefined && { checkinRadiusMeters: parseFloat(data.checkinRadiusMeters) }),
      ...(data.checkinDwellMinutes !== undefined && { checkinDwellMinutes: parseInt(data.checkinDwellMinutes) }),
      ...(data.monthlyRescheduleLimit !== undefined && { monthlyRescheduleLimit: parseInt(data.monthlyRescheduleLimit) }),
      ...(data.maxOverdueDaysBeforeSlotRelease !== undefined && { maxOverdueDaysBeforeSlotRelease: parseInt(data.maxOverdueDaysBeforeSlotRelease) }),
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
      ...(data.plansJson !== undefined && { plansJson: data.plansJson }),
      ...(data.operatingHoursJson !== undefined && { operatingHoursJson: data.operatingHoursJson }),
    };

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
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
