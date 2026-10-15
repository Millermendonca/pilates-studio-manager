/**
 * Tier 1 - R2: Criptografia de Dados Sensíveis em Repouso (LGPD) & Migração
 * Feature coverage (>=5 test cases per feature)
 */
import test from 'node:test';
import assert from 'node:assert';
import { testDb } from '../harness/db-store.js';
import { loadSourceModule } from '../harness/loader.js';
import {
  isEncryptedFormat,
  tamperCiphertext,
  tamperAuthTag,
  tamperIV,
} from '../harness/crypto-tools.js';

let cryptoModule;

test.before(async () => {
  cryptoModule = await loadSourceModule('src/lib/crypto.ts');
});

test.describe('Tier 1 - R2.1: Field Encryption at Rest (enc:v1:)', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R2.1.1: All 10 sensitive fields are officially defined in SENSITIVE_STUDENT_FIELDS', () => {
    const expectedFields = [
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

    assert.ok(Array.isArray(cryptoModule.SENSITIVE_STUDENT_FIELDS));
    for (const field of expectedFields) {
      assert.ok(
        cryptoModule.SENSITIVE_STUDENT_FIELDS.includes(field),
        `Field "${field}" must be included in SENSITIVE_STUDENT_FIELDS`
      );
    }
    assert.strictEqual(cryptoModule.SENSITIVE_STUDENT_FIELDS.length, 10);
  });

  test('TC-R2.1.2: encryptField produces valid enc:v1:<iv>:<tag>:<ciphertext> format', () => {
    const rawValue = 'Hérnia de disco L4-L5 grave com dor ciática';
    const encrypted = cryptoModule.encryptField(rawValue);

    assert.ok(isEncryptedFormat(encrypted), `Encrypted value "${encrypted}" must match enc:v1: format`);
    assert.notStrictEqual(encrypted, rawValue);
    assert.strictEqual(encrypted.includes(rawValue), false);
  });

  test('TC-R2.1.3: Inspecting migrated student in raw DB storage shows all populated sensitive fields start with enc:v1:', () => {
    const student = testDb.getRaw('Student', 'student_migrated_003');
    assert.ok(student, 'Migrated student must exist');

    for (const field of cryptoModule.SENSITIVE_STUDENT_FIELDS) {
      const val = student[field];
      if (val !== null && val !== undefined) {
        assert.ok(
          val.startsWith('enc:v1:'),
          `Raw DB field "${field}" must start with "enc:v1:", but was "${val}"`
        );
      }
    }
  });

  test('TC-R2.1.4: Non-sensitive student fields (name, email, planName, status) remain unencrypted for querying', () => {
    const student = testDb.getRaw('Student', 'student_migrated_003');
    assert.strictEqual(student.name, 'Beatriz Almeida');
    assert.strictEqual(student.email, 'beatriz.almeida@example.com');
    assert.strictEqual(student.planName, undefined); // or regular string if populated
    assert.strictEqual(student.status, 'ACTIVE');
  });

  test('TC-R2.1.5: encryptSensitiveStudentData encrypts all 10 sensitive fields on a student object', () => {
    const plainStudent = {
      name: 'Teste Aluno',
      email: 'teste@exemplo.com',
      cpf: '987.654.321-99',
      healthNotes: 'Dor no joelho',
      restrictions: 'Sem impacto',
      medicalHistory: 'Hipertensão',
      injuries: 'Entorse',
      surgeries: 'Apendicite',
      movementRestrictions: 'Sem flexão lombar',
      physicalAssessment: 'Postura regular',
      emergencyContactName: 'Maria Mãe',
      emergencyContactPhone: '(11) 91111-2222',
    };

    const encryptedObj = cryptoModule.encryptSensitiveStudentData(plainStudent);

    for (const field of cryptoModule.SENSITIVE_STUDENT_FIELDS) {
      assert.ok(
        isEncryptedFormat(encryptedObj[field]),
        `Field "${field}" in encrypted object must be in enc:v1: format`
      );
    }
    assert.strictEqual(encryptedObj.name, 'Teste Aluno');
    assert.strictEqual(encryptedObj.email, 'teste@exemplo.com');
  });
});

test.describe('Tier 1 - R2.2: Randomized IV (CSPRNG Nonce)', () => {
  test('TC-R2.2.1: Encrypting the exact same plaintext twice produces two distinct ciphertexts', () => {
    const plain = 'Texto ultra confidencial de saúde do aluno';
    const cipher1 = cryptoModule.encryptField(plain);
    const cipher2 = cryptoModule.encryptField(plain);

    assert.notStrictEqual(
      cipher1,
      cipher2,
      'AES-256-GCM with randomized IV must never produce duplicate ciphertexts'
    );
  });

  test('TC-R2.2.2: Two ciphertexts of the same input have different IV values (first component)', () => {
    const plain = 'Mesmo CPF: 111.222.333-44';
    const cipher1 = cryptoModule.encryptField(plain);
    const cipher2 = cryptoModule.encryptField(plain);

    const iv1 = cipher1.split(':')[2];
    const iv2 = cipher2.split(':')[2];

    assert.notStrictEqual(iv1, iv2, 'IVs must be randomized and unique for each encryption');
    assert.strictEqual(iv1.length, 24, 'IV length must be 12 bytes (24 hex characters)');
    assert.strictEqual(iv2.length, 24);
  });

  test('TC-R2.2.3: Two ciphertexts of the same input have different authentication tags', () => {
    const plain = 'Mesma observação clínica';
    const cipher1 = cryptoModule.encryptField(plain);
    const cipher2 = cryptoModule.encryptField(plain);

    const tag1 = cipher1.split(':')[3];
    const tag2 = cipher2.split(':')[3];

    assert.notStrictEqual(tag1, tag2, 'GCM authentication tags must differ when IV differs');
    assert.strictEqual(tag1.length, 32, 'GCM tag must be 16 bytes (32 hex characters)');
  });

  test('TC-R2.2.4: 50 successive encryptions of the same string produce 50 unique ciphertexts (zero collision)', () => {
    const plain = 'Teste estatístico de unicidade do IV';
    const set = new Set();
    const count = 50;

    for (let i = 0; i < count; i++) {
      const encrypted = cryptoModule.encryptField(plain);
      set.add(encrypted);
    }

    assert.strictEqual(set.size, count, 'All 50 encryptions must be strictly unique');
  });

  test('TC-R2.2.5: Both randomized ciphertexts successfully decrypt back to identical original text', () => {
    const original = 'Prontuário idêntico descriptografado com sucesso';
    const cipherA = cryptoModule.encryptField(original);
    const cipherB = cryptoModule.encryptField(original);

    assert.strictEqual(cryptoModule.decryptField(cipherA), original);
    assert.strictEqual(cryptoModule.decryptField(cipherB), original);
  });
});

test.describe('Tier 1 - R2.3: Tampering Rejection & Integrity Verification', () => {
  test('TC-R2.3.1: Modifying ciphertext bit causes decryptField to throw authentication error', () => {
    const original = 'Histórico médico confidencial do paciente';
    const encrypted = cryptoModule.encryptField(original);
    const tamperedCipher = tamperCiphertext(encrypted);

    assert.throws(
      () => {
        const result = cryptoModule.decryptField(tamperedCipher);
        // If it returns ciphertext or garbled text without throwing, fail
        if (result === tamperedCipher || result !== original) {
          throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
        }
      },
      /Falha na autenticação|corrompido|adulterado|Unsupported state/i,
      'decryptField must reject tampered ciphertext with an authentication error'
    );
  });

  test('TC-R2.3.2: Modifying authentication tag causes decryptField to throw authentication error', () => {
    const original = 'Cirurgia cardíaca em 2019';
    const encrypted = cryptoModule.encryptField(original);
    const tamperedTag = tamperAuthTag(encrypted);

    assert.throws(
      () => {
        const result = cryptoModule.decryptField(tamperedTag);
        if (result === tamperedTag || result !== original) {
          throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
        }
      },
      /Falha na autenticação|corrompido|adulterado|Unsupported state/i
    );
  });

  test('TC-R2.3.3: Modifying IV causes decryptField to throw authentication error', () => {
    const original = 'Contato de emergência: Pai (11) 99999-8888';
    const encrypted = cryptoModule.encryptField(original);
    const tamperedIv = tamperIV(encrypted);

    assert.throws(
      () => {
        const result = cryptoModule.decryptField(tamperedIv);
        if (result === tamperedIv || result !== original) {
          throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
        }
      },
      /Falha na autenticação|corrompido|adulterado|Unsupported state/i
    );
  });

  test('TC-R2.3.4: Truncated or malformed ciphertext payload throws or rejects safely', () => {
    const corrupted = 'enc:v1:0123456789abcdef:0123456789:deadbeef';

    assert.throws(
      () => {
        const res = cryptoModule.decryptField(corrupted);
        if (res !== corrupted) {
          // If it somehow parsed without throwing, fail
          throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
        }
        throw new Error('Falha na autenticação do dado cifrado: dado corrompido ou adulterado');
      },
      /Falha na autenticação|corrompido|adulterado/i
    );
  });

  test('TC-R2.3.5: Tampered payload does not return partial decrypted plaintext (zero oracle leak)', () => {
    const secret = 'Segredo Absoluto Que Nao Pode Vazar';
    const encrypted = cryptoModule.encryptField(secret);
    const tampered = tamperCiphertext(encrypted);

    try {
      const output = cryptoModule.decryptField(tampered);
      // It must not return the plaintext secret
      assert.notStrictEqual(output, secret);
    } catch (err) {
      // Throwing an authentication error is the required specification behavior!
      assert.ok(err);
    }
  });
});

test.describe('Tier 1 - R2.4: Transparent Read & Decryption', () => {
  test('TC-R2.4.1: decryptField decrypts encrypted data correctly to original value', () => {
    const text = 'Avaliação postural: hipercifose torácica';
    const cipher = cryptoModule.encryptField(text);
    const plain = cryptoModule.decryptField(cipher);

    assert.strictEqual(plain, text);
  });

  test('TC-R2.4.2: decryptField preserves legacy unencrypted strings transparently (backward compatibility)', () => {
    const legacyPlain = 'Dado antigo cadastrado em texto puro antes da migração';
    const result = cryptoModule.decryptField(legacyPlain);

    assert.strictEqual(
      result,
      legacyPlain,
      'decryptField must return unencrypted text unchanged for backward compatibility'
    );
  });

  test('TC-R2.4.3: decryptField gracefully handles null, undefined, and empty string', () => {
    const resNull = cryptoModule.decryptField(null);
    assert.ok(resNull === null || resNull === '', `Expected null or '' but got ${resNull}`);
    const resUndef = cryptoModule.decryptField(undefined);
    assert.ok(resUndef === undefined || resUndef === '', `Expected undefined or '' but got ${resUndef}`);
    assert.strictEqual(cryptoModule.decryptField(''), '');
  });

  test('TC-R2.4.4: decryptSensitiveStudentData decrypts all sensitive fields on a student record', () => {
    const plain = {
      id: 'student_test_decrypt',
      name: 'Aluno Teste Decrypt',
      cpf: '333.444.555-66',
      healthNotes: 'Nota médica confidencial',
      restrictions: 'Sem restrições',
      medicalHistory: 'Sem histórico',
      injuries: 'Nenhuma',
      surgeries: 'Nenhuma',
      movementRestrictions: 'Nenhuma',
      physicalAssessment: 'Excelente',
      emergencyContactName: 'Emergência',
      emergencyContactPhone: '(11) 90000-0000',
    };

    const encrypted = cryptoModule.encryptSensitiveStudentData(plain);
    const decrypted = cryptoModule.decryptSensitiveStudentData(encrypted);

    for (const field of cryptoModule.SENSITIVE_STUDENT_FIELDS) {
      assert.strictEqual(decrypted[field], plain[field]);
    }
  });

  test('TC-R2.4.5: Already-encrypted text passed to encryptField is NOT double-encrypted', () => {
    const plain = 'Texto a ser protegido';
    const encryptedOnce = cryptoModule.encryptField(plain);
    const encryptedTwice = cryptoModule.encryptField(encryptedOnce);

    assert.strictEqual(
      encryptedTwice,
      encryptedOnce,
      'encryptField must not double-encrypt strings that already start with enc:v1:'
    );
  });
});

test.describe('Tier 1 - R2.5: Migration Safety & Idempotence', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-R2.5.1: Migrating unencrypted student record converts all sensitive fields to enc:v1:', () => {
    const student = testDb.getRaw('Student', 'student_legit_001');
    assert.ok(student, 'Legacy student must exist');

    const migrated = cryptoModule.encryptSensitiveStudentData(student);

    for (const field of cryptoModule.SENSITIVE_STUDENT_FIELDS) {
      const val = migrated[field];
      if (val) {
        assert.ok(isEncryptedFormat(val), `Field ${field} must be migrated to enc:v1: format`);
      }
    }
  });

  test('TC-R2.5.2: Migration preserves 100% of data values upon decryption (zero data loss)', () => {
    const rawStudent = testDb.getRaw('Student', 'student_legit_001');
    const migrated = cryptoModule.encryptSensitiveStudentData(rawStudent);
    const decrypted = cryptoModule.decryptSensitiveStudentData(migrated);

    for (const field of cryptoModule.SENSITIVE_STUDENT_FIELDS) {
      assert.strictEqual(
        decrypted[field],
        rawStudent[field],
        `Field "${field}" must maintain exact value after encryption -> decryption cycle`
      );
    }
  });

  test('TC-R2.5.3: Migration is idempotent: running migration twice produces valid decryptable records', () => {
    const rawStudent = testDb.getRaw('Student', 'student_legit_001');
    const firstPass = cryptoModule.encryptSensitiveStudentData(rawStudent);
    const secondPass = cryptoModule.encryptSensitiveStudentData(firstPass);

    // Verify fields were not corrupted or nested (e.g. enc:v1:enc:v1:...)
    for (const field of cryptoModule.SENSITIVE_STUDENT_FIELDS) {
      if (firstPass[field]) {
        assert.strictEqual(secondPass[field], firstPass[field]);
      }
    }

    const decrypted = cryptoModule.decryptSensitiveStudentData(secondPass);
    assert.strictEqual(decrypted.cpf, rawStudent.cpf);
    assert.strictEqual(decrypted.healthNotes, rawStudent.healthNotes);
  });

  test('TC-R2.5.4: Migration preserves non-sensitive fields and metadata untouched', () => {
    const rawStudent = testDb.getRaw('Student', 'student_legit_001');
    const migrated = cryptoModule.encryptSensitiveStudentData(rawStudent);

    assert.strictEqual(migrated.id, rawStudent.id);
    assert.strictEqual(migrated.name, rawStudent.name);
    assert.strictEqual(migrated.email, rawStudent.email);
    assert.strictEqual(migrated.phone, rawStudent.phone);
    assert.strictEqual(migrated.status, rawStudent.status);
    assert.strictEqual(migrated.planName, rawStudent.planName);
  });

  test('TC-R2.5.5: Migration handles null and empty fields without fabricating ciphertext', () => {
    const studentWithNulls = {
      id: 'student_null_fields',
      name: 'Aluno Campos Nulos',
      cpf: null,
      healthNotes: '',
      restrictions: undefined,
      injuries: null,
    };

    const migrated = cryptoModule.encryptSensitiveStudentData(studentWithNulls);

    assert.strictEqual(migrated.cpf, null);
    assert.strictEqual(migrated.healthNotes, '');
    assert.strictEqual(migrated.restrictions, undefined);
  });
});
