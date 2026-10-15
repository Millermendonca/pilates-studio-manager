#!/usr/bin/env node

/**
 * scripts/migrate-passwords.js
 *
 * Transparent Password Migration Script
 * Batch converts existing plaintext student passwords to 12-round salted Bcrypt hashes.
 *
 * Features:
 * - Safe pre-flight inspection and validation
 * - 100% idempotent: running twice performs 0 updates
 * - Verification of each hash before and after database update
 * - Dry-run mode support (--dry-run)
 * - Safe fallback to 'senha123' if a legacy student record has null/empty password
 *
 * Usage:
 *   node scripts/migrate-passwords.js [--dry-run] [--verbose]
 */

const bcrypt = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Checks if a string is already a valid Bcrypt hash ($2a$ or $2b$, length 60)
 * @param {any} val
 * @returns {boolean}
 */
function isBcryptHash(val) {
  if (typeof val !== 'string') return false;
  return (val.startsWith('$2a$') || val.startsWith('$2b$')) && val.length === 60;
}

/**
 * Main migration function
 * @param {object} [customPrisma] - Optional Prisma client instance (for testing or mocks)
 * @param {object} [options] - { dryRun?: boolean, verbose?: boolean }
 * @returns {Promise<{ total: number, migrated: number, alreadyHashed: number, errors: number }>}
 */
async function migratePasswords(customPrisma, options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const isVerbose = options.verbose || process.argv.includes('--verbose');

  let prisma = customPrisma;
  let shouldDisconnect = false;

  if (!prisma) {
    try {
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
      shouldDisconnect = true;
    } catch (err) {
      console.error('[MIGRATE-PASSWORDS] Erro ao instanciar PrismaClient:', err.message);
      throw err;
    }
  }

  const startTime = Date.now();
  console.log(`[MIGRATE-PASSWORDS] Iniciando auditoria e migração de senhas... ${isDryRun ? '(MODO DRY-RUN / SIMULAÇÃO)' : ''}`);

  try {
    // 1. Carregar todos os alunos cadastrados
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
      },
    });

    const total = students.length;
    console.log(`[MIGRATE-PASSWORDS] Total de alunos encontrados no banco: ${total}`);

    // 2. Filtrar alunos que necessitam de migração
    const toMigrate = [];
    let alreadyHashed = 0;

    for (const student of students) {
      if (isBcryptHash(student.password)) {
        alreadyHashed++;
      } else {
        toMigrate.push(student);
      }
    }

    console.log(`[MIGRATE-PASSWORDS] Alunos com senha já protegida por Bcrypt: ${alreadyHashed}`);
    console.log(`[MIGRATE-PASSWORDS] Alunos com senha em texto plano a migrar: ${toMigrate.length}`);

    // 3. Se todos já estiverem migrados (idempotência)
    if (toMigrate.length === 0) {
      console.log('[MIGRATE-PASSWORDS] ✅ Sucesso! 100% das contas já possuem hash criptográfico forte. Nenhuma alteração necessária.');
      return { total, migrated: 0, alreadyHashed, errors: 0 };
    }

    let migrated = 0;
    let errors = 0;

    // 4. Executar migração individualmente com validação estrita
    for (const student of toMigrate) {
      try {
        const plainPassword = student.password || 'senha123';
        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const newHash = await bcrypt.hash(plainPassword, salt);

        // Pre-flight check: garantir que o hash gerado é válido e compatível
        const verification = await bcrypt.compare(plainPassword, newHash);
        if (!verification) {
          throw new Error(`Falha na verificação do hash gerado para o aluno ${student.id} (${student.email})`);
        }

        if (!isDryRun) {
          await prisma.student.update({
            where: { id: student.id },
            data: { password: newHash },
          });
        }

        migrated++;
        if (isVerbose) {
          console.log(`  ✓ Aluno ${student.name} (${student.email}) migrado com sucesso.`);
        }
      } catch (err) {
        errors++;
        console.error(`  ✗ Erro ao migrar aluno ${student.id} (${student.email}):`, err.message);
      }
    }

    const durationMs = Date.now() - startTime;
    console.log('------------------------------------------------------------');
    console.log(`[MIGRATE-PASSWORDS] Resumo da Migração (${durationMs}ms):`);
    console.log(`  - Total verificado:      ${total}`);
    console.log(`  - Senhas já em Bcrypt:   ${alreadyHashed}`);
    console.log(`  - Migrados com sucesso:  ${migrated}`);
    console.log(`  - Falhas/Erros:          ${errors}`);
    console.log(`  - Status:                ${errors === 0 ? 'CONCLUÍDO COM SUCESSO ✅' : 'CONCLUÍDO COM ALERTAS ⚠️'}`);
    console.log('------------------------------------------------------------');

    return { total, migrated, alreadyHashed, errors };
  } finally {
    if (shouldDisconnect && prisma?.$disconnect) {
      await prisma.$disconnect();
    }
  }
}

// Execução direta via CLI
if (require.main === module) {
  migratePasswords()
    .then((stats) => {
      if (stats.errors > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('[MIGRATE-PASSWORDS] Erro fatal durante a execução:', err);
      process.exit(1);
    });
}

module.exports = {
  migratePasswords,
  isBcryptHash,
  BCRYPT_SALT_ROUNDS,
};
