import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const payload = await verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sessão inválida.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const logs = await prisma.adminSecurityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        event: true,
        ipAddress: true,
        userAgent: true,
        details: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Erro ao buscar logs de segurança:', error);
    return NextResponse.json({ error: 'Erro ao consultar auditoria de segurança.' }, { status: 500 });
  }
}
