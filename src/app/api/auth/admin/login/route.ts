import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { signAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth/jwt';
import {
  verifyPassword,
  checkRateLimit,
  recordRateLimitAttempt,
  getOrCreateDefaultAdmin,
  logSecurityEvent,
  getClientIp,
  getClientUserAgent,
} from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    // 1. Verificação de Rate Limit em Memória (Defesa por IP)
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        event: 'UNAUTHORIZED_ACCESS_BLOCKED',
        ipAddress: clientIp,
        userAgent,
        details: `Bloqueio por Rate Limit de IP. Tentativas esgotadas. Tente novamente em ${rateLimit.retryAfterSeconds}s.`,
      });

      return NextResponse.json(
        {
          error: `Muitas tentativas incorretas a partir deste endereço de IP. Por segurança, tente novamente em ${Math.ceil(
            rateLimit.retryAfterSeconds / 60
          )} minutos.`,
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, password, rememberMe } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Informe o usuário e a senha para autenticar.', code: 'INVALID_FIELDS' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();

    // 2. Garantir que o administrador inicial exista
    await getOrCreateDefaultAdmin();

    // 3. Buscar o Administrador no banco de dados
    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanUsername },
        ],
      },
    });

    // Se o usuário não existir no banco de dados
    if (!admin) {
      // Adicionar atraso artificial para evitar timing attack
      await new Promise((resolve) => setTimeout(resolve, 300));
      recordRateLimitAttempt(clientIp, false);

      await logSecurityEvent({
        event: 'LOGIN_FAILED',
        ipAddress: clientIp,
        userAgent,
        details: `Tentativa de login com usuário inexistente: "${cleanUsername}"`,
      });

      return NextResponse.json(
        { error: 'Credenciais de acesso inválidas. Verifique seu usuário e senha.', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // 4. Verificar se a conta está temporariamente bloqueada (Account Lockout)
    const now = new Date();
    if (admin.lockoutUntil && admin.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((admin.lockoutUntil.getTime() - now.getTime()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      await logSecurityEvent({
        adminId: admin.id,
        event: 'ACCOUNT_LOCKED',
        ipAddress: clientIp,
        userAgent,
        details: `Tentativa de login em conta bloqueada. Restam ${remainingMinutes} min.`,
      });

      return NextResponse.json(
        {
          error: `Esta conta foi temporariamente bloqueada por segurança após 5 tentativas consecutivas incorretas. Tente novamente em ${remainingMinutes} minutos.`,
          code: 'ACCOUNT_LOCKED',
          remainingMinutes,
        },
        { status: 423 }
      );
    }

    // 5. Validar a Senha Criptografada (Bcrypt)
    const isPasswordValid = await verifyPassword(password, admin.passwordHash);

    if (!isPasswordValid) {
      const failedAttempts = admin.failedLoginAttempts + 1;
      let lockoutUntil: Date | null = null;
      let eventType: 'LOGIN_FAILED' | 'ACCOUNT_LOCKED' = 'LOGIN_FAILED';

      if (failedAttempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos de bloqueio
        eventType = 'ACCOUNT_LOCKED';
      }

      await prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockoutUntil,
        },
      });

      recordRateLimitAttempt(clientIp, false);

      await logSecurityEvent({
        adminId: admin.id,
        event: eventType,
        ipAddress: clientIp,
        userAgent,
        details:
          failedAttempts >= 5
            ? 'Conta bloqueada por 15 minutos após 5 tentativas consecutivas com senha inválida.'
            : `Senha incorreta informada (Tentativa ${failedAttempts}/5).`,
      });

      if (failedAttempts >= 5) {
        return NextResponse.json(
          {
            error:
              'Você atingiu o limite de 5 tentativas incorretas. Por segurança, o acesso foi bloqueado por 15 minutos.',
            code: 'ACCOUNT_LOCKED',
            remainingMinutes: 15,
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          error: `Credenciais de acesso inválidas. Restam ${5 - failedAttempts} tentativa(s) antes do bloqueio de segurança.`,
          code: 'INVALID_CREDENTIALS',
          remainingAttempts: 5 - failedAttempts,
        },
        { status: 401 }
      );
    }

    // 6. Sucesso na Autenticação!
    // Resetar falhas e atualizar data/IP do último login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
      },
    });

    recordRateLimitAttempt(clientIp, true);

    // 7. Gerar Token JWT Assinado
    const expiresIn = rememberMe ? '7d' : '1d';
    const maxAgeSeconds = rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24;

    const token = await signAdminToken(
      {
        adminId: admin.id,
        username: admin.username,
        role: admin.role,
        sessionVersion: admin.sessionVersion,
      },
      expiresIn
    );

    // 8. Gravar Cookie Seguro HTTP-Only
    cookies().set(ADMIN_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeSeconds,
    });

    // 9. Registrar Log de Auditoria
    await logSecurityEvent({
      adminId: admin.id,
      event: 'LOGIN_SUCCESS',
      ipAddress: clientIp,
      userAgent,
      details: `Login de administrador realizado com sucesso. (Lembrar: ${rememberMe ? 'Sim' : 'Não'})`,
    });

    return NextResponse.json({
      success: true,
      message: `Bem-vindo de volta, ${admin.name}!`,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
        passwordChangedAt: admin.passwordChangedAt,
      },
    });
  } catch (error) {
    console.error('Erro no login do administrador:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao processar a autenticação de segurança.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
