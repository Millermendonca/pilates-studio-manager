import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE_NAME = 'admin_session';
export const STUDENT_COOKIE_NAME = 'student_session';

const DEFAULT_ADMIN_SECRET = 'pilates-studio-super-secure-jwt-secret-key-2026-v1-production';
const DEFAULT_STUDENT_SECRET = 'pilates-studio-super-secure-student-jwt-secret-key-2026-v1';

function getAdminSecret(): Uint8Array {
  const secret = process.env.JWT_ADMIN_SECRET || DEFAULT_ADMIN_SECRET;
  return new TextEncoder().encode(secret);
}

function getStudentSecret(): Uint8Array {
  const secret = process.env.JWT_STUDENT_SECRET || DEFAULT_STUDENT_SECRET;
  return new TextEncoder().encode(secret);
}

export interface AdminJWTPayload {
  adminId: string;
  username: string;
  role: string;
  sessionVersion: number;
}

export interface StudentJWTPayload {
  id: string;
  email: string;
  name: string;
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
    .sign(getAdminSecret());

  return jwt;
}

/**
 * Verifica a assinatura e validade do token JWT do administrador
 */
export async function verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, getAdminSecret());
    
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

/**
 * Assina um novo token JWT para a sessão do aluno
 */
export async function signStudentToken(
  student: StudentJWTPayload,
  expiresIn: string = '30d'
): Promise<string> {
  const jwt = await new SignJWT({
    id: student.id,
    email: student.email,
    name: student.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getStudentSecret());

  return jwt;
}

/**
 * Verifica a assinatura e validade do token JWT do aluno
 */
export async function verifyStudentToken(token: string): Promise<StudentJWTPayload | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, getStudentSecret());

    if (!payload.id || !payload.email) {
      return null;
    }

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: (payload.name as string) || '',
    };
  } catch {
    return null;
  }
}
