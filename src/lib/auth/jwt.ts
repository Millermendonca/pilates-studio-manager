import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE_NAME = 'admin_session';

const JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'pilates-studio-super-secure-jwt-secret-key-2026-v1-production';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface AdminJWTPayload {
  adminId: string;
  username: string;
  role: string;
  sessionVersion: number;
}

/**
 * Assina um novo token JWT para a sessão do administrador
 */
export async function signAdminToken(
  payload: AdminJWTPayload,
  expiresIn: string = '1d'
): Promise<string> {
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedSecret);

  return jwt;
}

/**
 * Verifica a assinatura e validade do token JWT do administrador
 */
export async function verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    
    if (!payload.adminId || !payload.username) {
      return null;
    }

    return {
      adminId: payload.adminId as string,
      username: payload.username as string,
      role: (payload.role as string) || 'SUPERADMIN',
      sessionVersion: Number(payload.sessionVersion || 1),
    };
  } catch {
    return null;
  }
}
