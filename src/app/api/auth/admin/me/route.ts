import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth/jwt';
import {
  verifyPassword,
  DEFAULT_ADMIN_INITIAL_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
} from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = cookies().get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, admin: null });
    }

    const payload = await verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, admin: null });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        sessionVersion: true,
        lastLoginAt: true,
        lastLoginIp: true,
        passwordChangedAt: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ authenticated: false, admin: null });
    }

    // Se a versão da sessão no token for anterior à versão no banco (ex: sessões revogadas ou senha alterada)
    if (payload.sessionVersion !== admin.sessionVersion) {
      return NextResponse.json({ authenticated: false, admin: null, reason: 'SESSION_EXPIRED' });
    }

    // Verificar se o usuário ainda está usando as credenciais de fábrica para alertar no dashboard
    const isDefaultPassword =
      admin.username === DEFAULT_ADMIN_USERNAME &&
      (await verifyPassword(DEFAULT_ADMIN_INITIAL_PASSWORD, admin.passwordHash));

    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
        lastLoginIp: admin.lastLoginIp,
        passwordChangedAt: admin.passwordChangedAt,
        createdAt: admin.createdAt,
        isDefaultPassword,
      },
    });
  } catch (error) {
    console.error('Erro ao verificar sessão do administrador:', error);
    return NextResponse.json({ authenticated: false, admin: null });
  }
}
