import { NextResponse } from 'next/server.js';
import { prisma } from '../../../../lib/prisma.js';
import { cookies } from '../../../../../../harness/mock-headers.js';
import { verifyStudentToken, STUDENT_COOKIE_NAME } from '../../../../lib/auth/jwt.js';
import { sanitizeStudentKeepMedical } from '../../../../lib/auth/studentAuth.js';
export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const sessionToken = cookies().get(STUDENT_COOKIE_NAME)?.value;
        if (!sessionToken) {
            return NextResponse.json({ authenticated: false, error: 'Sessão não informada', student: null }, { status: 401 });
        }
        // Validar assinatura criptográfica do token JWT
        const payload = await verifyStudentToken(sessionToken);
        // Se o cookie for um ID puro (ex: cuid forjado) ou tiver assinatura inválida
        if (!payload || !payload.id) {
            return NextResponse.json({ authenticated: false, error: 'Sessão inválida ou expirada', student: null }, { status: 401 });
        }
        const student = await prisma.student.findUnique({
            where: { id: payload.id },
            include: {
                schedules: true,
                attendances: { orderBy: { classDate: 'desc' }, take: 10 },
                credits: { where: { used: false } },
                invoices: { orderBy: { dueDate: 'desc' }, take: 5 },
                messages: { orderBy: { createdAt: 'desc' }, take: 20 },
            },
        });
        if (!student || !student.active) {
            return NextResponse.json({ authenticated: false, error: 'Aluno não encontrado ou inativo', student: null }, { status: 401 });
        }
        // Remover senha do objeto retornado
        const safeStudent = sanitizeStudentKeepMedical(student);
        return NextResponse.json({
            authenticated: true,
            student: safeStudent,
        });
    }
    catch (error) {
        console.error('Erro ao verificar sessão:', error);
        return NextResponse.json({ authenticated: false, error: 'Erro interno ao validar sessão', student: null }, { status: 401 });
    }
}
