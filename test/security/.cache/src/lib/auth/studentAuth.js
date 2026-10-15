import bcrypt from 'bcryptjs';
// ==============================================================================
// 1. CRIPTOGRAFIA & VALIDAÇÃO DE SENHA DO ALUNO (BCRYPT 12 ROUNDS)
// ==============================================================================
export const STUDENT_SALT_ROUNDS = 12;
/**
 * Criptografa a senha do aluno usando Bcrypt com 12 rounds de salt
 */
export async function hashPassword(password) {
    return await bcrypt.hash(password, STUDENT_SALT_ROUNDS);
}
/**
 * Compara a senha informada com o hash salvo no banco de dados de forma segura
 */
export async function verifyPassword(password, hash) {
    if (!password || !hash)
        return false;
    return await bcrypt.compare(password, hash);
}
/**
 * Verifica se uma string possui o formato de um hash Bcrypt válido ($2a$ ou $2b$ com 60 caracteres)
 */
export function isBcryptHash(value) {
    if (typeof value !== 'string')
        return false;
    return (value.startsWith('$2a$') || value.startsWith('$2b$')) && value.length === 60;
}
const rateLimitMap = new Map();
const MAX_ATTEMPTS_PER_WINDOW = 5;
const WINDOW_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos
/**
 * Verifica se o IP está bloqueado temporariamente por excesso de tentativas
 */
export function checkStudentRateLimit(ip) {
    const now = Date.now();
    let record = rateLimitMap.get(ip);
    // Se a janela expirou, limpa o registro
    if (record && now - record.firstAttemptAt > WINDOW_DURATION_MS) {
        rateLimitMap.delete(ip);
        record = undefined;
    }
    // Se estiver em período de bloqueio ativo
    if (record?.blockedUntil && record.blockedUntil > now) {
        const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
        return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }
    // Se já atingiu o máximo de tentativas
    if (record && record.attempts >= MAX_ATTEMPTS_PER_WINDOW) {
        record.blockedUntil = now + BLOCK_DURATION_MS;
        const retryAfterSeconds = Math.ceil(BLOCK_DURATION_MS / 1000);
        return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }
    // Registra a tentativa imediatamente no portão para impedir bypass sob concorrência
    if (!record) {
        record = { attempts: 1, firstAttemptAt: now };
    }
    else {
        record.attempts += 1;
        if (record.attempts >= MAX_ATTEMPTS_PER_WINDOW) {
            record.blockedUntil = now + BLOCK_DURATION_MS;
        }
    }
    rateLimitMap.set(ip, record);
    const remainingAttempts = Math.max(0, MAX_ATTEMPTS_PER_WINDOW - record.attempts);
    return { allowed: true, remainingAttempts, retryAfterSeconds: 0 };
}
/**
 * Registra o desfecho da tentativa de login (sucesso limpa o contador; falha confirma bloqueio)
 */
export function recordStudentRateLimitAttempt(ip, success) {
    const now = Date.now();
    if (success) {
        rateLimitMap.delete(ip);
        return;
    }
    let record = rateLimitMap.get(ip);
    if (!record || now - record.firstAttemptAt > WINDOW_DURATION_MS) {
        record = { attempts: 1, firstAttemptAt: now };
    }
    if (record.attempts >= MAX_ATTEMPTS_PER_WINDOW) {
        record.blockedUntil = now + BLOCK_DURATION_MS;
    }
    rateLimitMap.set(ip, record);
}
/**
 * Limpa todos os limites de taxa em memória (útil para testes)
 */
export function resetStudentRateLimits() {
    rateLimitMap.clear();
}
// ==============================================================================
// 3. COOKIES & REQUISIÇÃO
// ==============================================================================
export const STUDENT_COOKIE_NAME = 'student_session';
export const STUDENT_COOKIE_OPTIONS = {
    path: '/',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
};
/**
 * Extrai o IP real do cliente a partir dos cabeçalhos HTTP
 */
export function getClientIp(req) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.headers.get('x-real-ip') || '127.0.0.1';
}
// ==============================================================================
// 4. SANITIZAÇÃO DE DADOS DE ALUNO (PREVENÇÃO DE VAZAMENTO)
// ==============================================================================
/**
 * Remove senha e dados sensíveis de saúde/pessoais do aluno para retornos públicos ou de login
 */
export function sanitizeStudent(student) {
    if (!student)
        return null;
    const { password, cpf, healthNotes, medicalHistory, injuries, surgeries, movementRestrictions, physicalAssessment, emergencyContactName, emergencyContactPhone, ...safeStudent } = student;
    return safeStudent;
}
/**
 * Sanitiza apenas credenciais (remove exclusivamente a senha) para endpoints autenticados do próprio aluno
 */
export function sanitizeStudentKeepMedical(student) {
    if (!student)
        return null;
    const { password, ...safeStudent } = student;
    return safeStudent;
}
