import { NextResponse } from 'next/server.js';
import { prisma } from '../../../lib/prisma.js';
import { cookies } from '../../../../../harness/mock-headers.js';
import { addDays } from 'date-fns';
import { geocodeAddress } from '../../../lib/geocoding.js';
import { signStudentToken, STUDENT_COOKIE_NAME } from '../../../lib/auth/jwt.js';
import { hashPassword, isBcryptHash, STUDENT_COOKIE_OPTIONS, sanitizeStudent, } from '../../../lib/auth/studentAuth.js';
import { encryptSensitiveStudentData } from '../../../lib/crypto.js';
export const dynamic = 'force-dynamic';
const PLANS = [
    {
        id: 'plan_1x',
        name: '1x por Semana',
        price: 220.0,
        timesPerWeek: 1,
        description: 'Ideal para manutenção postural, relaxamento e iniciantes.',
        features: [
            '1 aula semanal com horário fixo garantido',
            'Crédito de reposição com cancelamento até 2h antes',
            'Check-in automático por GPS no app',
            'Acesso total ao chat e notificações WhatsApp',
        ],
        popular: false,
        badge: 'Iniciante',
    },
    {
        id: 'plan_2x',
        name: '2x por Semana',
        price: 340.0,
        timesPerWeek: 2,
        description: 'O mais recomendado para fortalecimento, alívio de dores e flexibilidade.',
        features: [
            '2 aulas semanais em turmas de até 8 alunos',
            'Atendimento personalizado focado na sua coluna',
            'Direito a reposições de aulas desmarcadas',
            'Check-in inteligente por aproximação GPS',
            'Suporte direto via WhatsApp no app',
        ],
        popular: true,
        badge: 'Mais Escolhido ⭐',
    },
    {
        id: 'plan_3x',
        name: '3x por Semana',
        price: 460.0,
        timesPerWeek: 3,
        description: 'Reabilitação acelerada, alta performance e condicionamento completo.',
        features: [
            '3 aulas semanais (Seg/Qua/Sex ou Ter/Qui/Sáb)',
            'Acompanhamento intensivo e evolução postural rápida',
            'Reposições flexíveis com validade de 30 dias',
            'Faturas e pagamento 100% via PIX com 1 clique',
        ],
        popular: false,
        badge: 'Alta Performance',
    },
    {
        id: 'plan_livre',
        name: 'Plano Livre / Diário',
        price: 590.0,
        timesPerWeek: 5,
        description: 'Acesso total de segunda a sexta para quem busca máxima dedicação.',
        features: [
            'Até 5 aulas por semana de Segunda a Sexta',
            'Maior flexibilidade de horários da grade',
            'Acompanhamento postural e fisioterapêutico contínuo',
            'Prioridade máxima em trocas de turmas',
        ],
        popular: false,
        badge: 'VIP Ilimitado',
    },
];
export async function GET() {
    try {
        const settings = await prisma.studioSettings.findFirst();
        let dynamicPlans = PLANS;
        if (settings?.plansJson) {
            try {
                const parsed = JSON.parse(settings.plansJson);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    dynamicPlans = parsed.map((p, idx) => ({
                        id: p.id || `plan_${idx}`,
                        name: p.name,
                        price: typeof p.price === 'number' ? p.price : (parseFloat(String(p.price).replace(',', '.')) || 0),
                        timesPerWeek: p.weeklyDays !== undefined ? Number(p.weeklyDays) : 2,
                        description: p.description || '',
                        features: [
                            `${p.weeklyDays || 2} aula(s) por semana com horário fixo`,
                            'Crédito de reposição com cancelamento até 2h antes',
                            'Check-in inteligente por aproximação GPS',
                            'Acesso total ao chat e suporte via WhatsApp',
                        ],
                        popular: idx === 1,
                        badge: idx === 1 ? 'Mais Escolhido ⭐' : undefined,
                    }));
                }
            }
            catch (e) { }
        }
        return NextResponse.json({
            plans: dynamicPlans,
            studio: {
                name: settings?.studioName || 'Studio Pilates Center',
                address: settings?.address,
                capacity: settings?.defaultClassCapacity || 8,
                whatsapp: settings?.whatsapp || '22999623247',
            },
        });
    }
    catch (error) {
        return NextResponse.json({ error: 'Erro ao carregar planos' }, { status: 500 });
    }
}
export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, phone, cpf, cep, address, neighborhood, city, state, photoCompressed, healthNotes, injuries, surgeries, movementRestrictions, emergencyContactName, emergencyContactPhone, contractAccepted, contractSignature, planId, selectedDays, // Array de { dayOfWeek: number, startTime: string }
        password, } = body;
        if (!name || !email || !phone || !planId) {
            return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
        }
        const studio = await prisma.studioSettings.findFirst();
        let currentPlans = PLANS;
        if (studio?.plansJson) {
            try {
                const parsed = JSON.parse(studio.plansJson);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    currentPlans = parsed.map((p, idx) => ({
                        id: p.id || `plan_${idx}`,
                        name: p.name,
                        price: typeof p.price === 'number' ? p.price : (parseFloat(String(p.price).replace(',', '.')) || 0),
                        timesPerWeek: p.weeklyDays !== undefined ? Number(p.weeklyDays) : 2,
                        description: p.description || '',
                        features: [],
                        popular: idx === 1,
                        badge: undefined,
                    }));
                }
            }
            catch (e) { }
        }
        const cleanEmail = email.toLowerCase().trim();
        const selectedPlan = currentPlans.find((p) => p.id === planId || p.name === planId) || currentPlans[1] || currentPlans[0];
        // Verificar se aluno já existe
        let student = await prisma.student.findUnique({
            where: { email: cleanEmail },
        });
        const targetAddress = address || student?.address || '';
        const targetNeighborhood = neighborhood || student?.neighborhood || '';
        const targetCity = city || student?.city || '';
        const targetState = state || student?.state || '';
        let studentLat = student?.latitude || null;
        let studentLon = student?.longitude || null;
        if (!studentLat || !studentLon) {
            const studio = await prisma.studioSettings.findFirst();
            const coords = await geocodeAddress(targetAddress, targetNeighborhood, targetCity, targetState, studio);
            if (coords) {
                studentLat = coords.latitude;
                studentLon = coords.longitude;
            }
        }
        let studentPasswordHash;
        if (password) {
            studentPasswordHash = await hashPassword(password);
        }
        else if (student?.password && isBcryptHash(student.password)) {
            studentPasswordHash = student.password;
        }
        else if (student?.password) {
            studentPasswordHash = await hashPassword(student.password);
        }
        else {
            studentPasswordHash = await hashPassword('senha123');
        }
        const studentDataPayload = {
            name,
            phone,
            cpf: cpf || student?.cpf || null,
            cep: cep || student?.cep || null,
            address: targetAddress || 'Endereço não informado',
            neighborhood: targetNeighborhood || 'Centro',
            city: targetCity || 'São Paulo',
            state: targetState || 'SP',
            latitude: studentLat,
            longitude: studentLon,
            photoCompressed: photoCompressed || student?.photoCompressed || null,
            healthNotes: healthNotes || student?.healthNotes || null,
            medicalHistory: healthNotes || student?.medicalHistory || null,
            injuries: injuries || student?.injuries || null,
            surgeries: surgeries || student?.surgeries || null,
            movementRestrictions: movementRestrictions || student?.movementRestrictions || null,
            emergencyContactName: emergencyContactName || student?.emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || student?.emergencyContactPhone || null,
            contractAccepted: contractAccepted !== undefined ? contractAccepted : true,
            contractAcceptedAt: contractAccepted ? new Date() : undefined,
            contractSignature: contractSignature || name,
            planName: selectedPlan.name,
            monthlyFee: selectedPlan.price,
            active: true,
            status: 'ACTIVE',
            password: studentPasswordHash,
            avatarUrl: photoCompressed || student?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        };
        const encryptedPayload = encryptSensitiveStudentData(studentDataPayload);
        const { finalStudent, invoice } = await prisma.$transaction(async (tx) => {
            let savedStudent;
            if (student) {
                savedStudent = await tx.student.update({
                    where: { id: student.id },
                    data: encryptedPayload,
                });
            }
            else {
                savedStudent = await tx.student.create({
                    data: {
                        email: cleanEmail,
                        ...encryptedPayload,
                    },
                });
            }
            // Criar/Substituir horários fixos semanais do aluno
            if (selectedDays && Array.isArray(selectedDays) && selectedDays.length > 0) {
                await tx.studentSchedule.deleteMany({
                    where: { studentId: savedStudent.id },
                });
                for (const slot of selectedDays) {
                    const startHour = parseInt(slot.startTime.split(':')[0]);
                    const endHour = (startHour + 1).toString().padStart(2, '0') + ':00';
                    await tx.studentSchedule.create({
                        data: {
                            studentId: savedStudent.id,
                            dayOfWeek: slot.dayOfWeek,
                            startTime: slot.startTime,
                            endTime: endHour,
                        },
                    });
                }
            }
            // Gerar a primeira Fatura PIX de Matrícula
            const dueDate = addDays(new Date(), 3);
            const pixCode = `00020126580014br.gov.bcb.pix0136contato@pilatescenter.com.br520400005303986540${selectedPlan.price.toFixed(2)}5802BR5921Studio Pilates Center6009SAO PAULO62070503***6304${Math.floor(1000 + Math.random() * 9000)}`;
            const inv = await tx.invoice.create({
                data: {
                    studentId: savedStudent.id,
                    title: `Mensalidade Inicial • ${selectedPlan.name}`,
                    amount: selectedPlan.price,
                    dueDate,
                    status: 'PENDING',
                    pixQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`,
                    pixCopiaECola: pixCode,
                },
            });
            // Enviar mensagem automática de boas-vindas no Chat do Aluno
            await tx.chatMessage.create({
                data: {
                    studentId: savedStudent.id,
                    sender: 'SYSTEM',
                    message: `🎉 Seja muito bem-vindo(a) ao Studio Pilates Harmonia, ${name.split(' ')[0]}!\n\nSua contratação do plano "${selectedPlan.name}" foi concluída com sucesso. Seu horário fixo semanal já está reservado na nossa grade.\n\nQualquer dúvida, estamos à disposição aqui pelo chat ou no WhatsApp! ✨🧘‍♀️`,
                    messageType: 'TEXT',
                },
            });
            return { finalStudent: savedStudent, invoice: inv };
        });
        // Salvar Cookie de Sessão assinado para login automático
        const token = await signStudentToken({
            id: finalStudent.id,
            email: finalStudent.email || cleanEmail,
            name: finalStudent.name,
        });
        cookies().set(STUDENT_COOKIE_NAME, token, STUDENT_COOKIE_OPTIONS);
        const safeStudent = sanitizeStudent(finalStudent);
        return NextResponse.json({
            success: true,
            message: 'Matrícula e contratação realizadas com sucesso!',
            student: safeStudent,
            invoice,
        }, { status: 201 });
    }
    catch (error) {
        console.error('Erro na contratação/matrícula:', error);
        return NextResponse.json({ error: 'Erro ao processar matrícula' }, { status: 500 });
    }
}
