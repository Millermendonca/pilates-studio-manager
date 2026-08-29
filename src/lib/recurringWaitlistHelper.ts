import { prisma } from '@/lib/prisma';
import { addHours } from 'date-fns';

const DAY_NAMES = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export async function checkAndOfferRecurringWaitlist(dayOfWeek: number, startTime: string) {
  try {
    const settings = await prisma.studioSettings.findFirst();
    const capacity = settings?.defaultClassCapacity || 8;

    // 1. Contar alunos fixos atuais neste dia e horário
    const activeRecurring = await prisma.studentSchedule.count({
      where: {
        dayOfWeek,
        startTime,
        active: true,
      },
    });

    // 2. Contar ofertas já pendentes de resposta
    const activeOffers = await prisma.recurringWaitlistEntry.findMany({
      where: {
        dayOfWeek,
        startTime,
        status: 'OFFERED',
      },
    });

    let seatsAllocatedToOffers = 0;
    activeOffers.forEach((entry) => {
      seatsAllocatedToOffers += entry.isCouple ? 2 : 1;
    });

    let availableSeats = capacity - (activeRecurring + seatsAllocatedToOffers);
    if (availableSeats <= 0) return { offered: 0, availableSeats: 0 };

    // 3. Buscar fila de espera ordenada por ordem de chegada
    const waitingQueue = await prisma.recurringWaitlistEntry.findMany({
      where: {
        dayOfWeek,
        startTime,
        status: 'WAITING',
      },
      include: {
        student: true,
        partnerStudent: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let offeredCount = 0;
    const diaNome = DAY_NAMES[dayOfWeek] || 'Dia';

    for (const entry of waitingQueue) {
      if (availableSeats <= 0) break;

      // Se for CASAL / DUPLA, precisa de exatamente 2 vagas
      if (entry.isCouple) {
        if (availableSeats >= 2) {
          await prisma.recurringWaitlistEntry.update({
            where: { id: entry.id },
            data: {
              status: 'OFFERED',
              offeredAt: new Date(),
              offerExpiresAt: addHours(new Date(), 2),
            },
          });

          const partnerDisplay = entry.partnerStudent?.name || entry.partnerName || 'sua dupla';

          // Mensagem para o aluno titular
          await prisma.chatMessage.create({
            data: {
              studentId: entry.studentId,
              sender: 'SYSTEM',
              message: `🎉 VAGA DUPLA DISPONÍVEL!\n\nOlá, ${entry.student.name.split(' ')[0]}!\nSurgiram 2 vagas fixas para toda **${diaNome} às ${startTime}** para você e ${partnerDisplay}!\n\n⚠️ Deseja confirmar a troca permanente do seu horário padrão? Acesse o app para confirmar ou passar a vez para o próximo da fila.`,
              messageType: 'RECURRING_WAITLIST_OFFER',
            },
          });

          // Se tiver parceiro cadastrado, envia também
          if (entry.partnerStudentId) {
            await prisma.chatMessage.create({
              data: {
                studentId: entry.partnerStudentId,
                sender: 'SYSTEM',
                message: `🎉 VAGA DUPLA DISPONÍVEL!\n\nOlá, ${partnerDisplay.split(' ')[0]}!\nSurgiram 2 vagas fixas para toda **${diaNome} às ${startTime}** para você e ${entry.student.name}!\n\n⚠️ Acesse o app para confirmar a troca definitiva do seu horário fixo.`,
                messageType: 'RECURRING_WAITLIST_OFFER',
              },
            });
          }

          availableSeats -= 2;
          offeredCount += 2;
        } else {
          // Se só tem 1 vaga e a entrada precisa de 2, pula para o próximo aluno individual
          continue;
        }
      } else {
        // Entrada individual (1 vaga)
        await prisma.recurringWaitlistEntry.update({
          where: { id: entry.id },
          data: {
            status: 'OFFERED',
            offeredAt: new Date(),
            offerExpiresAt: addHours(new Date(), 2),
          },
        });

        await prisma.chatMessage.create({
          data: {
            studentId: entry.studentId,
            sender: 'SYSTEM',
            message: `🎉 VAGA FIXA DISPONÍVEL!\n\nOlá, ${entry.student.name.split(' ')[0]}!\nSurgiu 1 vaga fixa definitiva para toda **${diaNome} às ${startTime}**!\n\n⚠️ Deseja confirmar a alteração permanente do seu dia e horário padrão? Acesse o app para confirmar ou passar a vez para o próximo aluno da fila.`,
            messageType: 'RECURRING_WAITLIST_OFFER',
          },
        });

        availableSeats -= 1;
        offeredCount += 1;
      }
    }

    return { offered: offeredCount, availableSeats };
  } catch (error) {
    console.error('Erro no motor de oferta de fila fixa:', error);
    return { error };
  }
}
