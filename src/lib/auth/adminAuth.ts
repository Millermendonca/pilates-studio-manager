import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// ==============================================================================
// 1. CRIPTOGRAFIA & VALIDAÇÃO DE FORÇA DE SENHA
// ==============================================================================

const SALT_ROUNDS = 12;

/**
 * Criptografa uma senha em texto puro usando Bcrypt com 12 rounds de salt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara a senha informada com o hash salvo no banco de dados de forma segura
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export interface PasswordStrengthResult {
  valid: boolean;
  score: number; // 0 a 4
  level: 'MUITO_FRACA' | 'FRACA' | 'MEDIA' | 'FORTE' | 'EXCELENTE';
  errors: string[];
  rules: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Validação rigorosa de política de senha
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const errors: string[] = [];
  if (!minLength) errors.push('A senha deve ter no mínimo 8 caracteres');
  if (!hasUppercase) errors.push('Inclua pelo menos uma letra maiúscula (A-Z)');
  if (!hasLowercase) errors.push('Inclua pelo menos uma letra minúscula (a-z)');
  if (!hasNumber) errors.push('Inclua pelo menos um número (0-9)');
  if (!hasSpecial) errors.push('Inclua pelo menos um caractere especial (!@#$%^&*...)');

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (hasUppercase && hasLowercase) score++;
  if (hasNumber && hasSpecial) score++;

  let level: PasswordStrengthResult['level'] = 'MUITO_FRACA';
  if (score === 1) level = 'FRACA';
  else if (score === 2) level = 'MEDIA';
  else if (score === 3) level = 'FORTE';
  else if (score >= 4) level = 'EXCELENTE';

  return {
    valid: errors.length === 0,
    score,
    level,
    errors,
    rules: {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
    },
  };
}

// ==============================================================================
// 2. IN-MEMORY RATE LIMITING (DEFESA CONTRA FORÇA BRUTA)
// ==============================================================================

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS_PER_WINDOW = 5;
const WINDOW_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Verifica se o IP está bloqueado temporariamente por excesso de tentativas
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS_PER_WINDOW, retryAfterSeconds: 0 };
  }

  // Se estiver em período de bloqueio
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Se a janela expirou, limpa o registro
  if (now - record.firstAttemptAt > WINDOW_DURATION_MS) {
    rateLimitMap.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS_PER_WINDOW, retryAfterSeconds: 0 };
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS_PER_WINDOW - record.attempts);
  return { allowed: remainingAttempts > 0, remainingAttempts, retryAfterSeconds: 0 };
}

/**
 * Registra uma tentativa de login no Rate Limiter em memória
 */
export function recordRateLimitAttempt(ip: string, success: boolean): void {
  const now = Date.now();
  if (success) {
    rateLimitMap.delete(ip);
    return;
  }

  let record = rateLimitMap.get(ip);
  if (!record || now - record.firstAttemptAt > WINDOW_DURATION_MS) {
    record = { attempts: 1, firstAttemptAt: now };
  } else {
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS_PER_WINDOW) {
      record.blockedUntil = now + BLOCK_DURATION_MS;
    }
  }

  rateLimitMap.set(ip, record);
}

// ==============================================================================
// 3. AUTO-BOOTSTRAP & GESTÃO DO ADMINISTRADOR ÚNICO
// ==============================================================================

export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_INITIAL_PASSWORD = 'Admin@Pilates2026!';

/**
 * Garante a existência do usuário administrador padrão caso a tabela esteja vazia
 */
export async function getOrCreateDefaultAdmin() {
  let admin = await prisma.adminUser.findFirst();

  if (!admin) {
    const passwordHash = await hashPassword(DEFAULT_ADMIN_INITIAL_PASSWORD);
    admin = await prisma.adminUser.create({
      data: {
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash,
        name: 'Gestor do Estúdio',
        email: 'contato@pilatesharmonia.com.br',
        role: 'SUPERADMIN',
        sessionVersion: 1,
      },
    });

    await logSecurityEvent({
      adminId: admin.id,
      event: 'LOGIN_SUCCESS',
      details: 'Administrador padrão inicializado pelo sistema com credenciais seguras.',
      ipAddress: '127.0.0.1',
      userAgent: 'SYSTEM_BOOTSTRAP',
    });
  }

  return admin;
}

// ==============================================================================
// 4. LOGS DE AUDITORIA & REGISTRO DE SEGURANÇA
// ==============================================================================

export interface SecurityEventData {
  adminId?: string;
  event:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'ACCOUNT_LOCKED'
    | 'PASSWORD_CHANGED'
    | 'USERNAME_CHANGED'
    | 'LOGOUT'
    | 'SESSIONS_REVOKED'
    | 'UNAUTHORIZED_ACCESS_BLOCKED';
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

/**
 * Grava um evento de segurança estruturado no banco de dados
 */
export async function logSecurityEvent(data: SecurityEventData) {
  try {
    return await prisma.adminSecurityLog.create({
      data: {
        adminId: data.adminId || null,
        event: data.event,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent?.substring(0, 500) || null,
        details: data.details || null,
      },
    });
  } catch (err) {
    console.error('Falha ao registrar log de auditoria de segurança:', err);
    return null;
  }
}

/**
 * Extrai o IP real do cliente a partir dos cabeçalhos HTTP
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Extrai o User-Agent da requisição
 */
export function getClientUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'Desconhecido';
}
