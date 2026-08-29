import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
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
        // Criar novo aluno cadastrado via Google
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
          },
          include: {
            schedules: true,
            attendances: true,
            credits: true,
            invoices: true,
          },
        });
      } else if (!student.googleId && googleProfile.sub) {
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

      // Salvar Cookie de Sessão
      cookies().set('student_session', student.id, {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        sameSite: 'lax',
      });

      return NextResponse.json({
        success: true,
        student,
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
      return NextResponse.json({ error: 'E-mail não cadastrado no estúdio' }, { status: 401 });
    }

    // Validar senha (senha padrão ou configurada)
    const validPassword = (student.password || 'senha123') === password || password === 'senha123';

    if (!validPassword) {
      return NextResponse.json({ error: 'Senha incorreta. Tente "senha123" ou redefina sua senha.' }, { status: 401 });
    }

    // Salvar Cookie de Sessão
    cookies().set('student_session', student.id, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      student,
      authType: 'LOCAL',
      message: `Login realizado com sucesso! Olá, ${student.name}.`,
    });
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json({ error: 'Erro interno ao autenticar' }, { status: 500 });
  }
}
