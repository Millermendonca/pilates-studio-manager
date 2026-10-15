import { NextResponse } from 'next/server.js';
import { prisma } from '../../../../lib/prisma.js';
import { addDays, differenceInMinutes } from 'date-fns';
export async function POST(req) {
    try {
        const body = await req.json();
        const { attendanceId, reason } = body;
        if (!attendanceId) {
            return NextResponse.json({ error: 'ID da aula é obrigatório' }, { status: 400 });
        }
        const txResult = await prisma.$transaction(async (tx) => {
            const attendance = await tx.attendance.findUnique({
                where: { id: attendanceId },
                include: { student: true },
            });
            if (!attendance) {
                throw new Error('ATTENDANCE_NOT_FOUND');
            }
            // Idempotency guard: prevent duplicate cancellation and duplicate credit generation
            if (attendance.status === 'CANCELLED_WITH_CREDIT' || attendance.status === 'CANCELLED_NO_CREDIT') {
                throw new Error('ALREADY_CANCELLED');
            }
            // Obter regras configuráveis do estúdio
            const settings = await tx.studioSettings.findFirst();
            const cancelWindowHours = settings?.cancelWindowHours ?? 2;
            const creditValidityDays = settings?.creditValidityDays ?? 30;
            // Calcular data/hora exata do início da aula
            const classDate = new Date(attendance.classDate);
            const [hours, minutes] = attendance.startTime.split(':').map(Number);
            classDate.setHours(hours, minutes, 0, 0);
            const now = new Date();
            const diffMinutes = differenceInMinutes(classDate, now);
            const diffHours = diffMinutes / 60;
            const qualifiesForCredit = diffHours >= cancelWindowHours;
            const newStatus = qualifiesForCredit ? 'CANCELLED_WITH_CREDIT' : 'CANCELLED_NO_CREDIT';
            let generatedCredit = null;
            if (qualifiesForCredit) {
                const expiresAt = addDays(now, creditValidityDays);
                generatedCredit = await tx.classCredit.create({
                    data: {
                        studentId: attendance.studentId,
                        originReason: `Cancelamento com ${diffHours.toFixed(1)}h de antecedência da aula de ${attendance.startTime} do dia ${classDate.toLocaleDateString('pt-BR')}`,
                        expiresAt,
                        used: false,
                    },
                });
            }
            const updatedAttendance = await tx.attendance.update({
                where: { id: attendanceId },
                data: {
                    status: newStatus,
                    notes: reason || (qualifiesForCredit ? 'Cancelado pelo aluno com crédito' : 'Cancelado com menos de 2h (sem crédito)'),
                },
            });
            // ================= PROMOÇÃO AUTOMÁTICA DA FILA DE ESPERA =================
            let promotedStudentInfo = null;
            const startOfDay = new Date(new Date(attendance.classDate).setHours(0, 0, 0, 0));
            const endOfDay = new Date(new Date(attendance.classDate).setHours(23, 59, 59, 999));
            const nextWaitlisted = await tx.waitlistEntry.findFirst({
                where: {
                    classDate: { gte: startOfDay, lte: endOfDay },
                    startTime: attendance.startTime,
                    status: 'WAITING',
                },
                include: {
                    student: true,
                },
                orderBy: { createdAt: 'asc' },
            });
            if (nextWaitlisted) {
                // 1. Criar novo agendamento para o aluno promovido
                const newAttendance = await tx.attendance.create({
                    data: {
                        studentId: nextWaitlisted.studentId,
                        classDate: attendance.classDate,
                        startTime: attendance.startTime,
                        endTime: attendance.endTime,
                        status: 'SCHEDULED',
                        notes: 'Promovido automaticamente da Fila de Espera',
                    },
                });
                // 2. Se a entrada na fila usava um crédito de reposição, consome o crédito
                if (nextWaitlisted.usedCreditId) {
                    await tx.classCredit.update({
                        where: { id: nextWaitlisted.usedCreditId },
                        data: {
                            used: true,
                            usedAt: new Date(),
                            usedForAttendanceId: newAttendance.id,
                        },
                    });
                }
                // 3. Atualizar status na Fila de Espera para PROMOTED
                await tx.waitlistEntry.update({
                    where: { id: nextWaitlisted.id },
                    data: {
                        status: 'PROMOTED',
                        promotedAt: new Date(),
                    },
                });
                // 4. Enviar mensagem de notificação imediata no WhatsApp/Chat
                const dateFormatted = classDate.toLocaleDateString('pt-BR');
                await tx.chatMessage.create({
                    data: {
                        studentId: nextWaitlisted.studentId,
                        sender: 'SYSTEM',
                        message: `🎉 UMA VAGA ABRIU NO STUDIO PILATES CENTER!\n\nOlá, ${nextWaitlisted.student.name.split(' ')[0]}! Você estava em 1º lugar na fila de espera e foi agendado(a) automaticamente para a aula de ${dateFormatted} às ${attendance.startTime}.\n\nSeu lugar está 100% garantido. Te esperamos no estúdio! ✨🧘‍♀️`,
                        messageType: 'WAITLIST_PROMOTED',
                    },
                });
                promotedStudentInfo = {
                    name: nextWaitlisted.student.name,
                    id: nextWaitlisted.student.id,
                    startTime: attendance.startTime,
                };
            }
            return {
                qualifiesForCredit,
                diffHours,
                cancelWindowHours,
                creditValidityDays,
                generatedCredit,
                promotedStudentInfo,
                updatedAttendance,
            };
        });
        return NextResponse.json({
            success: true,
            qualifiesForCredit: txResult.qualifiesForCredit,
            diffHours: Math.round(txResult.diffHours * 10) / 10,
            requiredHours: txResult.cancelWindowHours,
            creditValidityDays: txResult.creditValidityDays,
            credit: txResult.generatedCredit,
            promotedStudent: txResult.promotedStudentInfo,
            message: txResult.qualifiesForCredit
                ? `Aula desmarcada com sucesso! Você ganhou 1 crédito de reposição válido por ${txResult.creditValidityDays} dias.${txResult.promotedStudentInfo ? ` A vaga aberta foi preenchida automaticamente pelo aluno ${txResult.promotedStudentInfo.name} da fila de espera.` : ''}`
                : `Aula desmarcada. Conforme a regra do estúdio, cancelamentos com menos de ${txResult.cancelWindowHours}h de antecedência não geram crédito de reposição.${txResult.promotedStudentInfo ? ` A vaga aberta foi preenchida automaticamente pelo aluno ${txResult.promotedStudentInfo.name} da fila de espera.` : ''}`,
            attendance: txResult.updatedAttendance,
        });
    }
    catch (error) {
        if (error?.message === 'ATTENDANCE_NOT_FOUND') {
            return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
        }
        if (error?.message === 'ALREADY_CANCELLED') {
            return NextResponse.json({ error: 'Esta aula já foi cancelada previamente' }, { status: 400 });
        }
        console.error('Erro ao cancelar aula:', error);
        return NextResponse.json({ error: 'Erro ao processar cancelamento de aula' }, { status: 500 });
    }
}
