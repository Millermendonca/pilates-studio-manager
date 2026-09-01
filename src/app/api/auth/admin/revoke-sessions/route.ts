import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { signAdminToken, verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth/jwt';
import { logSecurityEvent, getClientIp, getClientUserAgent } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const clientIp = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const payload = await verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sessão inválida.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminId },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Administrador não encontrado.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Incrementar a versão da sessão para invalidar todos os outros tokens no mundo
    const newVersion = admin.sessionVersion + 1;
    const updatedAdmin = await prisma.adminUser.update({
      where: { id: admin.id },
      data: { sessionVersion: newVersion },
    });

    // Renovar o token exclusivo deste dispositivo atual
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

    await logSecurityEvent({
      adminId: updatedAdmin.id,
      event: 'SESSIONS_REVOKED',
      ipAddress: clientIp,
      userAgent,
      details: 'Todas as outras sessões em outros navegadores e dispositivos foram revogadas.',
    });

    return NextResponse.json({
      success: true,
      message: 'Todas as outras sessões foram desconectadas com sucesso. Apenas este aparelho permanece ativo.',
    });
  } catch (error) {
    console.error('Erro ao revogar sessões:', error);
    return NextResponse.json({ error: 'Erro ao revogar sessões.' }, { status: 500 });
  }
}
