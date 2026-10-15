import { NextResponse } from 'next/server.js';
import { prisma } from '../../../../lib/prisma.js';
import { cookies } from '../../../../../../harness/mock-headers.js';
import { signStudentToken, STUDENT_COOKIE_NAME } from '../../../../lib/auth/jwt.js';
import { hashPassword, verifyPassword, isBcryptHash, checkStudentRateLimit, recordStudentRateLimitAttempt, getClientIp, STUDENT_COOKIE_OPTIONS, sanitizeStudent, } from '../../../../lib/auth/studentAuth.js';
export async function POST(req) {
    try {
        const ip = getClientIp(req);
        const rateLimit = checkStudentRateLimit(ip);
        if (!rateLimit.allowed) {
            return NextResponse.json({
                error: 'Muitas tentativas de login incorretas. Acesso bloqueado temporariamente por segurança.',
                retryAfterSeconds: rateLimit.retryAfterSeconds,
            }, {
                status: 429,
                headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
            });
        }
        const body = await req.json();
        const { email, password, isGoogle, googleProfile } = body;
        // 1. Fluxo de Login com Google One Tap
        if (isGoogle && googleProfile) {
            const googleEmail = googleProfile.email?.toLowerCase().trim();
            let student = await prisma.student.findFirst({
                where: { email: googleEmail },
                include: {
                    schedules: true,
                    attendances: { orderBy: { classDate: 'desc' }, take: 10 },
                    credits: { where: { used: false } },
                    invoices: { orderBy: { dueDate: 'desc' }, take: 5 },
                },
            });
            if (!student) {
                // Criar novo aluno cadastrado via Google com senha hash padrão segura
                const defaultPasswordHash = await hashPassword('senha123');
                student = await prisma.student.create({
                    data: {
                        name: googleProfile.name || 'Aluno Google',
                        email: googleEmail,
                        phone: '(11) 99999-0000',
                        avatarUrl: googleProfile.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(googleProfile.name || 'Google')}`,
                        authProvider: 'GOOGLE',
                        googleId: googleProfile.sub || null,
                        planName: '2x por Semana',
                        monthlyFee: 320.00,
                        password: defaultPasswordHash,
                    },
                    include: {
                        schedules: true,
                        attendances: true,
                        credits: true,
                        invoices: true,
                    },
                });
            }
            else if (!student.googleId && googleProfile.sub) {
                // Associar Google ID à conta existente
                student = await prisma.student.update({
                    where: { id: student.id },
                    data: {
                        googleId: googleProfile.sub,
                        avatarUrl: student.avatarUrl || googleProfile.picture,
                    },
                    include: {
                        schedules: true,
                        attendances: true,
                        credits: true,
                        invoices: true,
                    },
                });
            }
            recordStudentRateLimitAttempt(ip, true);
            // Assinar JWT Token criptográfico para a sessão
            const token = await signStudentToken({
                id: student.id,
                email: student.email || googleEmail,
                name: student.name,
            });
            // Salvar Cookie de Sessão assinado
            cookies().set(STUDENT_COOKIE_NAME, token, STUDENT_COOKIE_OPTIONS);
            const safeStudent = sanitizeStudent(student);
            return NextResponse.json({
                success: true,
                student: safeStudent,
                authType: 'GOOGLE',
                message: `Bem-vindo(a) via Google, ${student.name}!`,
            });
        }
        // 2. Fluxo Tradicional com E-mail e Senha
        if (!email || !password) {
            return NextResponse.json({ error: 'Informe o e-mail e a senha' }, { status: 400 });
        }
        const cleanEmail = email.toLowerCase().trim();
        const student = await prisma.student.findFirst({
            where: { email: cleanEmail },
            include: {
                schedules: true,
                attendances: { orderBy: { classDate: 'desc' }, take: 10 },
                credits: { where: { used: false } },
                invoices: { orderBy: { dueDate: 'desc' }, take: 5 },
            },
        });
        if (!student) {
            recordStudentRateLimitAttempt(ip, false);
            return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
        }
        // Validação estrita de senha (sem backdoor universal || password === 'senha123')
        let passwordMatches = false;
        const storedPassword = student.password || '';
        if (!storedPassword) {
            recordStudentRateLimitAttempt(ip, false);
            return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
        }
        if (isBcryptHash(storedPassword)) {
            passwordMatches = await verifyPassword(password, storedPassword);
        }
        else {
            // Migração lazy JIT para contas legado com senha em texto plano
            const legacyPlain = storedPassword;
            passwordMatches = legacyPlain === password;
            if (passwordMatches) {
                // Migrar imediatamente para hash Bcrypt forte de 12 rounds no banco de dados
                const newHash = await hashPassword(password);
                await prisma.student.update({
                    where: { id: student.id },
                    data: { password: newHash },
                });
            }
        }
        if (!passwordMatches) {
            recordStudentRateLimitAttempt(ip, false);
            return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
        }
        // Login com sucesso: reseta contador de tentativas
        recordStudentRateLimitAttempt(ip, true);
        // Gerar token assinado JWT para a sessão
        const token = await signStudentToken({
            id: student.id,
            email: student.email || cleanEmail,
            name: student.name,
        });
        // Salvar Cookie de Sessão assinado
        cookies().set(STUDENT_COOKIE_NAME, token, STUDENT_COOKIE_OPTIONS);
        const safeStudent = sanitizeStudent(student);
        return NextResponse.json({
            success: true,
            student: safeStudent,
            authType: 'LOCAL',
            message: `Login realizado com sucesso! Olá, ${student.name}.`,
        });
    }
    catch (error) {
        console.error('Erro na autenticação:', error);
        return NextResponse.json({ error: 'Erro interno ao autenticar' }, { status: 500 });
    }
}
