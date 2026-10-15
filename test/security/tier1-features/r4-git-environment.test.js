/**
 * Tier 1 - R4: Segurança de Repositório, Banco de Dados e Variáveis de Ambiente
 * Feature coverage (>=5 test cases per feature)
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PROJECT_ROOT } from '../harness/env.js';

test.describe('Tier 1 - R4.1: Git Tracking Exclusions (git ls-files check)', () => {
  let trackedFiles = [];

  test.before(() => {
    try {
      const output = execSync('git ls-files', { cwd: PROJECT_ROOT, encoding: 'utf8' });
      trackedFiles = output.split('\n').map((f) => f.trim()).filter(Boolean);
    } catch (err) {
      assert.fail(`Failed to execute git ls-files: ${err.message}`);
    }
  });

  test('TC-R4.1.1: Confirm zero .env files are tracked by Git (except .env.example)', () => {
    const envFiles = trackedFiles.filter((f) => {
      const base = path.basename(f);
      return base.startsWith('.env') && base !== '.env.example';
    });

    assert.strictEqual(
      envFiles.length,
      0,
      `Git must not track live environment files! Found: ${envFiles.join(', ')}`
    );
  });

  test('TC-R4.1.2: Confirm zero .db or .sqlite database files are tracked by Git', () => {
    const dbFiles = trackedFiles.filter((f) => {
      const lower = f.toLowerCase();
      return (
        lower.endsWith('.db') ||
        lower.endsWith('.sqlite') ||
        lower.endsWith('.sqlite3') ||
        lower.includes('prisma/dev.db')
      );
    });

    assert.strictEqual(
      dbFiles.length,
      0,
      `Git must not track SQLite database files! Found: ${dbFiles.join(', ')}`
    );
  });

  test('TC-R4.1.3: Confirm zero .pem certificate or private key files are tracked by Git', () => {
    const pemFiles = trackedFiles.filter((f) => f.toLowerCase().endsWith('.pem'));
    assert.strictEqual(
      pemFiles.length,
      0,
      `Git must not track .pem private certificates! Found: ${pemFiles.join(', ')}`
    );
  });

  test('TC-R4.1.4: Confirm zero .key private encryption key files are tracked by Git', () => {
    const keyFiles = trackedFiles.filter((f) => f.toLowerCase().endsWith('.key'));
    assert.strictEqual(
      keyFiles.length,
      0,
      `Git must not track .key private cryptographic keys! Found: ${keyFiles.join(', ')}`
    );
  });

  test('TC-R4.1.5: .gitignore contains rules ignoring .env, *.db, and credentials', () => {
    const gitignorePath = path.resolve(PROJECT_ROOT, '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), '.gitignore file must exist');

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    assert.ok(gitignoreContent.includes('.env'), '.gitignore must ignore .env');
    assert.ok(gitignoreContent.includes('*.db') || gitignoreContent.includes('dev.db'), '.gitignore must ignore database files');
  });
});

test.describe('Tier 1 - R4.2: Environment Variables Documentation (.env.example)', () => {
  const envExamplePath = path.resolve(PROJECT_ROOT, '.env.example');
  let envExampleContent = '';

  test.before(() => {
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist at project root');
    envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  });

  test('TC-R4.2.1: .env.example documents DATA_ENCRYPTION_KEY', () => {
    assert.ok(
      envExampleContent.includes('DATA_ENCRYPTION_KEY'),
      '.env.example must document DATA_ENCRYPTION_KEY'
    );
  });

  test('TC-R4.2.2: .env.example documents JWT_ADMIN_SECRET', () => {
    assert.ok(
      envExampleContent.includes('JWT_ADMIN_SECRET'),
      '.env.example must document JWT_ADMIN_SECRET'
    );
  });

  test('TC-R4.2.3: .env.example documents JWT_STUDENT_SECRET', () => {
    assert.ok(
      envExampleContent.includes('JWT_STUDENT_SECRET'),
      '.env.example must document JWT_STUDENT_SECRET'
    );
  });

  test('TC-R4.2.4: .env.example documents DATABASE_URL', () => {
    assert.ok(
      envExampleContent.includes('DATABASE_URL'),
      '.env.example must document DATABASE_URL'
    );
  });

  test('TC-R4.2.5: .env.example contains safe placeholder values rather than real production secrets', () => {
    // Should not contain live secrets, e.g. should have comments or instructions
    assert.ok(
      envExampleContent.includes('adicione') ||
        envExampleContent.includes('chave') ||
        envExampleContent.includes('host:5432') ||
        envExampleContent.includes('usuario:senha'),
      '.env.example should use instructional placeholders, not live credentials'
    );
  });
});
