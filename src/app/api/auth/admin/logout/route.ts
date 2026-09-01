import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth/jwt';
import { logSecurityEvent, getClientIp, getClientUserAgent } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
    let adminId: string | undefined;

    if (token) {
      const payload = await verifyAdminToken(token);
      if (payload) {
        adminId = payload.adminId;
      }
    }

    // Excluir cookie de sessão do administrador
    cookies().set(ADMIN_COOKIE_NAME, '', {
      path: '/',
      httpOnly: true,
      maxAge: 0,
    });

    if (adminId) {
      await logSecurityEvent({
        adminId,
        event: 'LOGOUT',
        ipAddress: clientIp,
        userAgent,
        details: 'Encerramento de sessão realizado pelo administrador.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sessão encerrada com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao realizar logout do administrador:', error);
    return NextResponse.json({ error: 'Erro ao encerrar sessão.' }, { status: 500 });
  }
}
