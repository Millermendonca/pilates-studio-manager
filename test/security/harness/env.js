/**
 * Test Environment Setup & Configuration
 * Provides deterministic test secrets, keys, and paths for security tests.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// Standard 256-bit AES key (64 hex characters) for deterministic test encryption
export const TEST_ENCRYPTION_KEY = '367c6de582028f885135ef65404f5422b1e1ad779b332e0a70d740ede7be456c';

// Test secrets for JWT HMAC-SHA256 signing
export const TEST_JWT_ADMIN_SECRET = 'test-admin-secret-super-secure-key-2026-very-long-and-random-123456';
export const TEST_JWT_STUDENT_SECRET = 'test-student-secret-super-secure-key-2026-very-long-and-random-654321';

// Set environment variables if not present
if (!process.env.DATA_ENCRYPTION_KEY) {
  process.env.DATA_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
}
if (!process.env.JWT_ADMIN_SECRET) {
  process.env.JWT_ADMIN_SECRET = TEST_JWT_ADMIN_SECRET;
}
if (!process.env.JWT_STUDENT_SECRET) {
  process.env.JWT_STUDENT_SECRET = TEST_JWT_STUDENT_SECRET;
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
