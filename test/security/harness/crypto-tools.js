/**
 * Cryptographic & Token Utilities for Security Tests
 * Provides token creation, tampering, validation, and ciphertext manipulation.
 */
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';
import { TEST_JWT_ADMIN_SECRET, TEST_JWT_STUDENT_SECRET, TEST_ENCRYPTION_KEY } from './env.js';

const studentSecretKey = new TextEncoder().encode(TEST_JWT_STUDENT_SECRET);
const adminSecretKey = new TextEncoder().encode(TEST_JWT_ADMIN_SECRET);

/**
 * Sign a legitimate student JWT
 */
export async function createStudentJwt(payload, expiresIn = '30d') {
  return new SignJWT({
    id: payload.id || 'student_test_1',
    email: payload.email || 'student@test.com',
    name: payload.name || 'Aluno Teste',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(studentSecretKey);
}

/**
 * Sign an expired student JWT
 */
export async function createExpiredStudentJwt(payload) {
  return new SignJWT({
    id: payload.id || 'student_test_1',
    email: payload.email || 'student@test.com',
    name: payload.name || 'Aluno Teste',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(studentSecretKey);
}

/**
 * Sign a student JWT with the wrong secret key
 */
export async function createStudentJwtWithWrongKey(payload) {
  const wrongKey = new TextEncoder().encode('completely-wrong-key-that-should-fail-verification-1234567890');
  return new SignJWT({
    id: payload.id || 'student_test_1',
    email: payload.email || 'student@test.com',
    name: payload.name || 'Aluno Teste',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(wrongKey);
}

/**
 * Sign a student JWT with "none" algorithm (security evasion test)
 */
export function createUnsignedJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `${header}.${body}.`;
}

/**
 * Sign a legitimate admin JWT
 */
export async function createAdminJwt(payload = {}, expiresIn = '1d') {
  return new SignJWT({
    adminId: payload.adminId || 'admin_master_001',
    username: payload.username || 'admin',
    role: payload.role || 'SUPERADMIN',
    sessionVersion: payload.sessionVersion || 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(adminSecretKey);
}

/**
 * Validates if a string is a standard 12-round Bcrypt hash
 * Must start with $2a$ or $2b$ and have length 60
 */
export function isBcryptHash(value) {
  if (!value || typeof value !== 'string') return false;
  const regex = /^\$2[ab]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/;
  return regex.test(value) && value.length === 60;
}

/**
 * Validates if a string follows AES-256-GCM format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function isEncryptedFormat(value) {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('enc:v1:')) return false;
  const parts = value.slice('enc:v1:'.length).split(':');
  if (parts.length !== 3) return false;
  const [iv, tag, cipher] = parts;
  // IV: 12 bytes = 24 hex
  // Tag: 16 bytes = 32 hex
  // Ciphertext: non-empty hex
  return /^[0-9a-f]{24}$/i.test(iv) && /^[0-9a-f]{32}$/i.test(tag) && /^[0-9a-f]+$/i.test(cipher);
}

/**
 * Tamper with the ciphertext component of an enc:v1:... string
 */
export function tamperCiphertext(encString) {
  if (!isEncryptedFormat(encString)) {
    throw new Error('Input is not in enc:v1: format');
  }
  const parts = encString.split(':');
  // parts: ['enc', 'v1', iv, tag, ciphertext]
  const lastHex = parts[4];
  // Flip the last character
  const tamperedHex = lastHex.slice(0, -1) + (lastHex.endsWith('a') ? 'b' : 'a');
  parts[4] = tamperedHex;
  return parts.join(':');
}

/**
 * Tamper with the auth tag component of an enc:v1:... string
 */
export function tamperAuthTag(encString) {
  if (!isEncryptedFormat(encString)) {
    throw new Error('Input is not in enc:v1: format');
  }
  const parts = encString.split(':');
  const tag = parts[3];
  const tamperedTag = tag.slice(0, -2) + (tag.endsWith('00') ? 'ff' : '00');
  parts[3] = tamperedTag;
  return parts.join(':');
}

/**
 * Tamper with the IV component of an enc:v1:... string
 */
export function tamperIV(encString) {
  if (!isEncryptedFormat(encString)) {
    throw new Error('Input is not in enc:v1: format');
  }
  const parts = encString.split(':');
  const iv = parts[2];
  const tamperedIv = iv.slice(0, -2) + (iv.endsWith('aa') ? 'bb' : 'aa');
  parts[2] = tamperedIv;
  return parts.join(':');
}
