#!/usr/bin/env node

/**
 * scripts/migrate-encryption.js
 *
 * Transparent LGPD Field-Level Data Migration Script
 * Batch encrypts existing plaintext sensitive student fields using AES-256-GCM.
 *
 * Features:
 * - Pre-flight database backup creation and integrity verification
 * - 100% idempotent: skips fields already starting with 'enc:v1:'
 * - Strict verification: immediate decryption check before database persist
 * - Supports --dry-run mode for simulation without writing to database
 * - Zero data loss: 100% of student records preserved
 *
 * Usage:
 *   node scripts/migrate-encryption.js [--dry-run] [--verbose]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const PREFIX = 'enc:v1:';

const SENSITIVE_STUDENT_FIELDS = [
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

function getEncryptionKey() {
  const envKey = process.env.DATA_ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  if (envKey && envKey.length >= 32) {
    return crypto.createHash('sha256').update(envKey).digest();
  }
  return crypto.createHash('sha256').update('pilates-studio-dev-secret-encryption-key-2026').digest();
}

function encryptField(plainText) {
  if (plainText === null || plainText === undefined) return plainText;
  if (typeof plainText !== 'string' || !plainText.trim() || plainText.startsWith(PREFIX)) return plainText;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptField(cipherText) {
  if (cipherText === null || cipherText === undefined) return cipherText;
  if (typeof cipherText !== 'string' || !cipherText.trim() || !cipherText.startsWith(PREFIX)) return cipherText;

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
  } catch (error) {
    throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
  }
}

/**
 * Cria um backup íntegro do banco de dados antes da migração.
 */
function createPreflightBackup() {
  const dbPath = path.resolve(__dirname, '../prisma/dev.db');
  if (fs.existsSync(dbPath)) {
    const backupDir = path.resolve(__dirname, '../prisma/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `dev.db.backup-${timestamp}`);
    fs.copyFileSync(dbPath, backupPath);

    const originalStats = fs.statSync(dbPath);
    const backupStats = fs.statSync(backupPath);
    if (backupStats.size !== originalStats.size) {
      throw new Error(`[MIGRATE-ENCRYPTION] Falha crítica no backup: tamanho inconsistente (${backupStats.size} vs ${originalStats.size})`);
    }
    console.log(`[MIGRATE-ENCRYPTION] 🛡️ Backup pré-voo criado com sucesso: ${backupPath} (${backupStats.size} bytes)`);
    return backupPath;
  }
  console.log('[MIGRATE-ENCRYPTION] Nenhum arquivo dev.db local encontrado para backup (ambiente gerenciado ou remoto).');
  return null;
}

/**
 * Função principal de migração de criptografia LGPD
 * @param {object} [customPrisma] - Instância opcional de PrismaClient ou mock para testes
 * @param {object} [options] - Opções de execução ({ dryRun?: boolean, verbose?: boolean })
 */
async function migrateEncryption(customPrisma, options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const isVerbose = options.verbose || process.argv.includes('--verbose');

  let prisma = customPrisma;
  let shouldDisconnect = false;

  if (!isDryRun) {
    createPreflightBackup();
  } else {
    console.log('[MIGRATE-ENCRYPTION] Modo --dry-run ativo: simulação de migração sem persistência.');
  }

  if (!prisma) {
    try {
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
      shouldDisconnect = true;
    } catch (err) {
      console.error('[MIGRATE-ENCRYPTION] Erro ao instanciar PrismaClient:', err.message);
      throw err;
    }
  }

  const startTime = Date.now();
  console.log(`[MIGRATE-ENCRYPTION] Iniciando auditoria e migração de criptografia em repouso (LGPD)... ${isDryRun ? '(DRY-RUN)' : ''}`);

  try {
    const students = await prisma.student.findMany();
    const total = students.length;
    console.log(`[MIGRATE-ENCRYPTION] Total de alunos encontrados: ${total}`);

    let studentsUpdated = 0;
    let fieldsEncrypted = 0;
    let fieldsAlreadyEncrypted = 0;
    let errors = 0;

    for (const student of students) {
      try {
        const updatePayload = {};
        let needsUpdate = false;

        for (const field of SENSITIVE_STUDENT_FIELDS) {
          const val = student[field];
          if (typeof val === 'string' && val.trim().length > 0) {
            if (val.startsWith(PREFIX)) {
              fieldsAlreadyEncrypted++;
            } else {
              const cipherText = encryptField(val);
              // Validação estrita de auto-recuperação antes de persistir no banco
              const verified = decryptField(cipherText);
              if (verified !== val) {
                throw new Error(`Falha de integridade: descriptografia não bateu com o texto puro no aluno ${student.id}, campo ${field}`);
              }
              updatePayload[field] = cipherText;
              needsUpdate = true;
              fieldsEncrypted++;
            }
          }
        }

        if (needsUpdate) {
          studentsUpdated++;
          if (!isDryRun) {
            await prisma.student.update({
              where: { id: student.id },
              data: updatePayload,
            });
          }
          if (isVerbose) {
            console.log(`  ✓ Aluno ${student.name} (${student.id}): ${Object.keys(updatePayload).length} campos sensíveis criptografados.`);
          }
        }
      } catch (err) {
        errors++;
        console.error(`  ✗ Erro ao processar aluno ${student.id}:`, err.message);
      }
    }

    const durationMs = Date.now() - startTime;
    console.log('------------------------------------------------------------');
    console.log(`[MIGRATE-ENCRYPTION] Resumo da Migração (${durationMs}ms):`);
    console.log(`  - Total de alunos:                 ${total}`);
    console.log(`  - Alunos que precisavam migração:  ${studentsUpdated}`);
    console.log(`  - Campos recém-criptografados:     ${fieldsEncrypted}`);
    console.log(`  - Campos já criptografados (pulo): ${fieldsAlreadyEncrypted}`);
    console.log(`  - Falhas/Erros:                    ${errors}`);
    console.log(`  - Status:                          ${errors === 0 ? 'CONCLUÍDO COM SUCESSO ✅' : 'CONCLUÍDO COM ALERTAS ⚠️'}`);
    console.log('------------------------------------------------------------');

    return {
      total,
      studentsUpdated,
      fieldsEncrypted,
      fieldsAlreadyEncrypted,
      errors,
    };
  } finally {
    if (shouldDisconnect && prisma?.$disconnect) {
      await prisma.$disconnect();
    }
  }
}

// Execução direta via CLI
if (require.main === module) {
  migrateEncryption()
    .then((stats) => {
      if (stats.errors > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('[MIGRATE-ENCRYPTION] Erro fatal durante a execução:', err);
      process.exit(1);
    });
}

module.exports = {
  migrateEncryption,
  encryptField,
  decryptField,
  createPreflightBackup,
  SENSITIVE_STUDENT_FIELDS,
  PREFIX,
  ALGORITHM,
};
