import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { signAdminToken, verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth/jwt';
import {
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
  logSecurityEvent,
  getClientIp,
  getClientUserAgent,
} from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    // 1. Validar sessão atual do administrador
    const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const payload = await verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminId },
    });

    if (!admin || admin.sessionVersion !== payload.sessionVersion) {
      return NextResponse.json({ error: 'Sessão revogada. Faça login novamente.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 2. Extrair dados da requisição
    const body = await req.json();
    const { currentPassword, newUsername, newName, newEmail, newPassword } = body;

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Por segurança, informe sua senha atual para confirmar as alterações.', code: 'MISSING_CURRENT_PASSWORD' },
        { status: 400 }
      );
    }

    // 3. Confirmar a Senha Atual
    const isCurrentPasswordValid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!isCurrentPasswordValid) {
      await logSecurityEvent({
        adminId: admin.id,
        event: 'LOGIN_FAILED',
        ipAddress: clientIp,
        userAgent,
        details: 'Tentativa falha de alteração de credenciais com senha atual incorreta.',
      });

      return NextResponse.json(
        { error: 'A senha atual informada está incorreta.', code: 'INVALID_CURRENT_PASSWORD' },
        { status: 401 }
      );
    }

    // 4. Preparar dados a serem atualizados
    const updateData: any = {};
    const auditDetails: string[] = [];

    // A) Alteração de Nome
    if (newName && newName.trim() !== admin.name) {
      updateData.name = newName.trim();
      auditDetails.push(`Nome alterado para "${updateData.name}"`);
    }

    // B) Alteração de E-mail
    if (newEmail !== undefined && newEmail.trim() !== (admin.email || '')) {
      const cleanEmail = newEmail.trim().toLowerCase();
      updateData.email = cleanEmail || null;
      auditDetails.push(`E-mail alterado para "${cleanEmail}"`);
    }

    // C) Alteração de Nome de Usuário (Username)
    let usernameChanged = false;
    if (newUsername && newUsername.trim().toLowerCase() !== admin.username) {
      const cleanUsername = newUsername.trim().toLowerCase();

      // Validar formato de username
      if (cleanUsername.length < 3) {
        return NextResponse.json(
          { error: 'O nome de usuário deve ter no mínimo 3 caracteres.', code: 'INVALID_USERNAME' },
          { status: 400 }
        );
      }

      if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: 'O nome de usuário pode conter apenas letras minúsculas, números, ponto, hífen e sublinhado.', code: 'INVALID_USERNAME' },
          { status: 400 }
        );
      }

      // Verificar unicidade
      const existingUser = await prisma.adminUser.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: admin.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Este nome de usuário já está em uso por outro registro.', code: 'USERNAME_TAKEN' },
          { status: 409 }
        );
      }

      updateData.username = cleanUsername;
      usernameChanged = true;
      auditDetails.push(`Nome de usuário alterado de "${admin.username}" para "${cleanUsername}"`);
    }

    // D) Alteração de Senha
    let passwordChanged = false;
    let newSessionVersion = admin.sessionVersion;

    if (newPassword && newPassword.trim().length > 0) {
      const strength = validatePasswordStrength(newPassword);
      if (!strength.valid) {
        return NextResponse.json(
          {
            error: `Senha fraca: ${strength.errors.join('. ')}`,
            code: 'WEAK_PASSWORD',
            details: strength.errors,
          },
          { status: 400 }
        );
      }

      const newHash = await hashPassword(newPassword);
      updateData.passwordHash = newHash;
      updateData.passwordChangedAt = new Date();
      // Incrementar sessionVersion para invalidar sessões antigas em outros aparelhos
      newSessionVersion = admin.sessionVersion + 1;
      updateData.sessionVersion = newSessionVersion;
      passwordChanged = true;
      auditDetails.push('Senha de acesso alterada com sucesso.');
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'Nenhuma alteração detectada.', admin });
    }

    // 5. Executar atualização atômica no banco de dados
    const updatedAdmin = await prisma.adminUser.update({
      where: { id: admin.id },
      data: updateData,
    });

    // 6. Atualizar Token de Sessão no Cookie para o dispositivo atual
    const newToken = await signAdminToken(
      {
        adminId: updatedAdmin.id,
        username: updatedAdmin.username,
        role: updatedAdmin.role,
        sessionVersion: updatedAdmin.sessionVersion,
      },
      '7d'
    );

    cookies().set(ADMIN_COOKIE_NAME, newToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    // 7. Gravar Log de Auditoria
    await logSecurityEvent({
      adminId: updatedAdmin.id,
      event: passwordChanged ? 'PASSWORD_CHANGED' : usernameChanged ? 'USERNAME_CHANGED' : 'LOGIN_SUCCESS',
      ipAddress: clientIp,
      userAgent,
      details: auditDetails.join(' | '),
    });

    return NextResponse.json({
      success: true,
      message: 'Credenciais de segurança e dados do gestor atualizados com sucesso!',
      admin: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        lastLoginAt: updatedAdmin.lastLoginAt,
        passwordChangedAt: updatedAdmin.passwordChangedAt,
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar credenciais do administrador:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar novas credenciais de segurança.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
