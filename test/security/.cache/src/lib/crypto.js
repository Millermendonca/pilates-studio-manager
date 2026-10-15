import crypto from 'crypto';
/**
 * Módulo Criptográfico Militar - Proteção de Dados em Repouso (LGPD)
 * Algoritmo: AES-256-GCM (Galois/Counter Mode com AEAD)
 * Padrão: NIST SP 800-38D
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const PREFIX = 'enc:v1:';
// Obter a chave mestra de 256 bits a partir do ambiente
function getEncryptionKey() {
    const envKey = process.env.DATA_ENCRYPTION_KEY;
    if (envKey && envKey.length === 64) {
        return Buffer.from(envKey, 'hex');
    }
    if (envKey && envKey.length >= 32) {
        return crypto.createHash('sha256').update(envKey).digest();
    }
    // Fallback seguro de desenvolvimento
    return crypto.createHash('sha256').update('pilates-studio-dev-secret-encryption-key-2026').digest();
}
/**
 * Criptografa um texto usando AES-256-GCM.
 * Retorna o formato estruturado: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptField(plainText) {
    if (plainText === null || plainText === undefined) {
        return plainText;
    }
    if (typeof plainText !== 'string' || !plainText.trim()) {
        return plainText;
    }
    // Se já estiver criptografado, não criptografa duas vezes
    if (plainText.startsWith(PREFIX)) {
        return plainText;
    }
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        console.error('Erro na criptografia de campo sensível:', error);
        throw new Error('Falha na criptografia de campo sensível: ' + (error?.message || String(error)));
    }
}
/**
 * Descriptografa um texto criptografado em AES-256-GCM.
 * Possui compatibilidade reversa transparente: se o dado não começar com 'enc:v1:',
 * ele é retornado sem alteração (preservando registros legados do banco).
 *
 * Se o dado começar com 'enc:v1:', qualquer erro de integridade, adulteração da tag
 * ou corrupção do payload OBRIGATORIAMENTE dispara um erro (Strict Tamper Detection).
 */
export function decryptField(cipherText) {
    if (cipherText === null || cipherText === undefined) {
        return cipherText;
    }
    if (typeof cipherText !== 'string' || !cipherText.trim()) {
        return cipherText;
    }
    // Se não estiver no formato criptografado, é um dado pré-existente em texto claro
    if (!cipherText.startsWith(PREFIX)) {
        return cipherText;
    }
    try {
        const parts = cipherText.slice(PREFIX.length).split(':');
        if (parts.length !== 3) {
            throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
        }
        const [ivHex, tagHex, encryptedHex] = parts;
        if (!ivHex || !tagHex || encryptedHex === undefined) {
            throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
        }
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(tagHex, 'hex');
        if (iv.length !== IV_LENGTH || authTag.length !== 16) {
            throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
        }
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        // Rejeição estrita de adulteração (Tamper detection): NUNCA engolir ou retornar ciphertext bruto!
        throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
    }
}
/**
 * Gera um Hash Deterministico HMAC-SHA256 para indexação e busca segura.
 * Permite buscar CPF ou telefone com exatidão sem expor o dado em texto claro.
 */
export function hashDeterministic(value) {
    if (!value || typeof value !== 'string')
        return '';
    const normalized = value.replace(/\D/g, '').trim().toLowerCase();
    if (!normalized)
        return '';
    const key = getEncryptionKey();
    return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}
/**
 * Lista dos campos classificados como Dados Pessoais Sensíveis e Médicos (LGPD)
 */
export const SENSITIVE_STUDENT_FIELDS = [
    'cpf',
    'healthNotes',
    'restrictions',
    'medicalHistory',
    'injuries',
    'surgeries',
    'movementRestrictions',
    'physicalAssessment',
    'emergencyContactName',
    'emergencyContactPhone',
];
/**
 * Criptografa todos os campos sensíveis presentes no objeto antes da persistência no banco.
 */
export function encryptSensitiveStudentData(data) {
    if (!data || typeof data !== 'object')
        return data;
    const result = { ...data };
    for (const field of SENSITIVE_STUDENT_FIELDS) {
        if (field in result && typeof result[field] === 'string') {
            result[field] = encryptField(result[field]);
        }
    }
    return result;
}
/**
 * Descriptografa todos os campos sensíveis presentes no objeto antes de entregar para a aplicação.
 */
export function decryptSensitiveStudentData(student) {
    if (!student || typeof student !== 'object')
        return student;
    const result = { ...student };
    for (const field of SENSITIVE_STUDENT_FIELDS) {
        if (field in result && typeof result[field] === 'string') {
            result[field] = decryptField(result[field]);
        }
    }
    return result;
}
