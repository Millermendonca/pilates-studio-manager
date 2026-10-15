/**
 * In-Memory Test Database Store & Prisma Mock
 * Provides an isolated, predictable DB environment with raw inspection capabilities.
 */
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { TEST_ENCRYPTION_KEY } from './env.js';

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
const SENSITIVE_FIELDS_SET = new Set(SENSITIVE_STUDENT_FIELDS);

function getEncryptionKey() {
  const envKey = process.env.DATA_ENCRYPTION_KEY || TEST_ENCRYPTION_KEY;
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
  if (typeof plainText !== 'string' || !plainText.trim() || plainText.startsWith('enc:v1:')) return plainText;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptField(cipherText) {
  if (cipherText === null || cipherText === undefined) return cipherText;
  if (typeof cipherText !== 'string' || !cipherText.trim() || !cipherText.startsWith('enc:v1:')) return cipherText;

  try {
    const parts = cipherText.slice('enc:v1:'.length).split(':');
    if (parts.length !== 3) return cipherText;
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return cipherText;
  }
}

function encryptRecord(modelName, data) {
  if (!data || typeof data !== 'object') return data;
  const res = { ...data };
  if (modelName === 'Student') {
    for (const field of SENSITIVE_STUDENT_FIELDS) {
      if (typeof res[field] === 'string') {
        res[field] = encryptField(res[field]);
      }
    }
  }
  return res;
}

function decryptRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const res = { ...record };
  for (const key of Object.keys(res)) {
    if (SENSITIVE_FIELDS_SET.has(key) && typeof res[key] === 'string') {
      res[key] = decryptField(res[key]);
    } else if (res[key] && typeof res[key] === 'object' && !(res[key] instanceof Date)) {
      if (Array.isArray(res[key])) {
        res[key] = res[key].map(decryptRecord);
      } else {
        res[key] = decryptRecord(res[key]);
      }
    }
  }
  return res;
}

export class InMemoryDbStore {
  constructor() {
    this.tables = {
      Student: new Map(),
      AdminUser: new Map(),
      AdminSecurityLog: new Map(),
      Invoice: new Map(),
      Attendance: new Map(),
      StudentSchedule: new Map(),
      ClassCredit: new Map(),
      StudioSettings: new Map(),
      ChatMessage: new Map(),
      WaitlistEntry: new Map(),
      RecurringWaitlistEntry: new Map(),
      StudentEvolution: new Map(),
      LocationPing: new Map(),
    };
    this.seedDefaults();
  }

  seedDefaults() {
    this.clearAll();

    // 1. Legitimate Student with custom password (hashed with Bcrypt 12 rounds)
    const legitSalt = bcrypt.genSaltSync(12);
    const legitHash = bcrypt.hashSync('minhaSenhaForte!2026', legitSalt);
    this.insertRaw('Student', {
      id: 'student_legit_001',
      name: 'Maria Silva Santos',
      email: 'maria.silva@example.com',
      phone: '(11) 98765-4321',
      cpf: '123.456.789-00',
      password: legitHash,
      healthNotes: 'Hérnia de disco L4-L5',
      restrictions: 'Evitar flexão lombar excessiva',
      medicalHistory: 'Cirurgia no joelho esquerdo em 2021',
      injuries: 'Condromalácia patelar grau II',
      surgeries: 'Artroscopia joelho esquerdo',
      movementRestrictions: 'Sem salto e sem agachamento profundo',
      physicalAssessment: 'Escoliose postural leve em C',
      emergencyContactName: 'Carlos Santos (Marido)',
      emergencyContactPhone: '(11) 98888-7777',
      address: 'Rua das Flores, 123, Apto 45',
      cep: '01234-567',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      state: 'SP',
      status: 'ACTIVE',
      active: true,
      isDeleted: false,
      planName: '2x por Semana',
      monthlyFee: 340.0,
      createdAt: new Date('2026-01-10T10:00:00Z'),
      updatedAt: new Date('2026-01-10T10:00:00Z'),
    });

    // 2. Student with default password "senha123"
    this.insertRaw('Student', {
      id: 'student_default_002',
      name: 'João Oliveira',
      email: 'joao.oliveira@example.com',
      phone: '(11) 97777-6666',
      cpf: '234.567.890-11',
      password: 'senha123',
      healthNotes: 'Sem restrições',
      restrictions: 'Nenhuma',
      medicalHistory: 'Nenhum',
      injuries: null,
      surgeries: null,
      movementRestrictions: null,
      physicalAssessment: 'Apto para atividades',
      emergencyContactName: 'Ana Oliveira',
      emergencyContactPhone: '(11) 97777-5555',
      address: 'Av Paulista 1000',
      status: 'ACTIVE',
      active: true,
      isDeleted: false,
      createdAt: new Date('2026-02-01T10:00:00Z'),
      updatedAt: new Date('2026-02-01T10:00:00Z'),
    });

    // 3. Pre-migrated student (with Bcrypt hash and enc:v1: fields)
    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync('senhaSeguraAluno#2026', salt);
    this.insertRaw('Student', {
      id: 'student_migrated_003',
      name: 'Beatriz Almeida',
      email: 'beatriz.almeida@example.com',
      phone: '(11) 96666-5555',
      cpf: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:c91823ab45ef',
      password: hash,
      healthNotes: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:d02934bc56fa',
      restrictions: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:e13045cd67fb',
      medicalHistory: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:f24156de78fc',
      injuries: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:a35267ef89fd',
      surgeries: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:b46378fa90fe',
      movementRestrictions: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:c57489ab01ff',
      physicalAssessment: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:d68590bc1200',
      emergencyContactName: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:e79601cd2311',
      emergencyContactPhone: 'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:f80712de3422',
      address: 'Rua Oscar Freire 500',
      status: 'ACTIVE',
      active: true,
      isDeleted: false,
      createdAt: new Date('2026-03-01T10:00:00Z'),
      updatedAt: new Date('2026-03-01T10:00:00Z'),
    });

    // 4. Default Admin User
    const adminSalt = bcrypt.genSaltSync(12);
    const adminHash = bcrypt.hashSync('adminMaster#2026', adminSalt);
    this.insertRaw('AdminUser', {
      id: 'admin_master_001',
      username: 'admin',
      passwordHash: adminHash,
      name: 'Gestor Administrativo',
      role: 'SUPERADMIN',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      sessionVersion: 1,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    // 5. Default Studio Settings
    this.insertRaw('StudioSettings', {
      id: 'settings_default_001',
      studioName: 'Studio Pilates Harmonia',
      cep: '01310-100',
      address: 'Av. Paulista, 1500',
      city: 'São Paulo',
      state: 'SP',
      defaultClassCapacity: 4,
      pixKey: 'contato@pilatesharmonia.com.br',
    });

    // 6. Seed Invoices for R3 financial check
    this.insertRaw('Invoice', {
      id: 'inv_001',
      studentId: 'student_legit_001',
      title: 'Mensalidade Março/2026',
      amount: 340.0,
      dueDate: new Date('2026-03-10'),
      status: 'PAID',
    });
  }

  clearAll() {
    for (const key of Object.keys(this.tables)) {
      this.tables[key].clear();
    }
  }

  insertRaw(table, record) {
    if (!record.id) {
      record.id = 'id_' + Math.random().toString(36).substring(2, 10);
    }
    this.tables[table].set(record.id, { ...record });
    return this.tables[table].get(record.id);
  }

  getRaw(table, id) {
    const rec = this.tables[table].get(id);
    return rec ? { ...rec } : null;
  }

  getAllRaw(table) {
    return Array.from(this.tables[table].values()).map((r) => ({ ...r }));
  }

  /**
   * Builds a Prisma-compatible API client backed by this in-memory store
   */
  createPrismaClient() {
    const store = this;

    const createModelDelegate = (modelName) => ({
      findUnique: async ({ where }) => {
        if (!where) return null;
        const records = Array.from(store.tables[modelName].values());
        const match = records.find((r) => {
          for (const [k, v] of Object.entries(where)) {
            if (r[k] !== v) return false;
          }
          return true;
        });
        return match ? decryptRecord(match) : null;
      },

      findFirst: async ({ where } = {}) => {
        const records = Array.from(store.tables[modelName].values());
        if (!where) return records[0] ? decryptRecord(records[0]) : null;

        const match = records.find((r) => {
          for (const [k, v] of Object.entries(where)) {
            if (k === 'OR' && Array.isArray(v)) {
              return v.some((cond) => {
                for (const [ck, cv] of Object.entries(cond)) {
                  if (typeof cv === 'object' && cv !== null && 'contains' in cv) {
                    if (typeof r[ck] !== 'string') return false;
                    return r[ck].toLowerCase().includes(cv.contains.toLowerCase());
                  }
                  if (r[ck] !== cv) return false;
                }
                return true;
              });
            }
            if (k === 'email' && typeof v === 'string') {
              if (r.email?.toLowerCase() !== v.toLowerCase()) return false;
              continue;
            }
            if (r[k] !== v) return false;
          }
          return true;
        });
        return match ? decryptRecord(match) : null;
      },

      findMany: async ({ where, select } = {}) => {
        let records = Array.from(store.tables[modelName].values());
        if (where) {
          records = records.filter((r) => {
            for (const [k, v] of Object.entries(where)) {
              if (k === 'isDeleted' && r.isDeleted !== v) return false;
              if (k === 'active' && r.active !== v) return false;
              if (k === 'status' && r.status !== v) return false;
              if (k === 'OR' && Array.isArray(v)) {
                return v.some((cond) => {
                  for (const [ck, cv] of Object.entries(cond)) {
                    if (typeof cv === 'object' && cv !== null && 'contains' in cv) {
                      if (typeof r[ck] !== 'string') return false;
                      return r[ck].toLowerCase().includes(cv.contains.toLowerCase());
                    }
                    if (r[ck] !== cv) return false;
                  }
                  return true;
                });
              }
            }
            return true;
          });
        }
        if (select) {
          return records.map((r) => {
            const dec = decryptRecord(r);
            const res = {};
            for (const k of Object.keys(select)) {
              if (select[k]) res[k] = dec[k];
            }
            return res;
          });
        }
        return records.map((r) => decryptRecord(r));
      },

      create: async ({ data, select }) => {
        const id = data.id || `cuid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const encryptedData = encryptRecord(modelName, data);
        const record = { ...encryptedData, id, createdAt: new Date(), updatedAt: new Date() };
        store.tables[modelName].set(id, record);

        const decrypted = decryptRecord(record);
        if (select) {
          const res = {};
          for (const k of Object.keys(select)) {
            if (select[k]) res[k] = decrypted[k];
          }
          return res;
        }
        return { ...decrypted };
      },

      update: async ({ where, data }) => {
        const target = await store.tables[modelName].get(where.id);
        if (!target) throw new Error(`Record to update not found in ${modelName}`);
        const encryptedData = encryptRecord(modelName, data);
        const updated = { ...target, ...encryptedData, updatedAt: new Date() };
        store.tables[modelName].set(where.id, updated);
        return decryptRecord(updated);
      },

      delete: async ({ where }) => {
        const target = store.tables[modelName].get(where.id);
        if (!target) throw new Error(`Record to delete not found in ${modelName}`);
        store.tables[modelName].delete(where.id);
        return { ...target };
      },

      deleteMany: async ({ where } = {}) => {
        let count = 0;
        if (!where) {
          count = store.tables[modelName].size;
          store.tables[modelName].clear();
          return { count };
        }
        for (const [id, r] of Array.from(store.tables[modelName].entries())) {
          let match = true;
          for (const [k, v] of Object.entries(where)) {
            if (r[k] !== v) match = false;
          }
          if (match) {
            store.tables[modelName].delete(id);
            count++;
          }
        }
        return { count };
      },

      count: async () => store.tables[modelName].size,
    });

    const client = {
      student: createModelDelegate('Student'),
      adminUser: createModelDelegate('AdminUser'),
      adminSecurityLog: createModelDelegate('AdminSecurityLog'),
      invoice: createModelDelegate('Invoice'),
      attendance: createModelDelegate('Attendance'),
      studentSchedule: createModelDelegate('StudentSchedule'),
      classCredit: createModelDelegate('ClassCredit'),
      studioSettings: createModelDelegate('StudioSettings'),
      chatMessage: createModelDelegate('ChatMessage'),
      waitlistEntry: createModelDelegate('WaitlistEntry'),
      recurringWaitlistEntry: createModelDelegate('RecurringWaitlistEntry'),
      studentEvolution: createModelDelegate('StudentEvolution'),
      locationPing: createModelDelegate('LocationPing'),

      $transaction: async (queries) => {
        if (Array.isArray(queries)) {
          return Promise.all(queries);
        }
        if (typeof queries === 'function') {
          return queries(client);
        }
        return [];
      },
      $disconnect: async () => {},
    };

    return client;
  }
}

// Global singleton instance for easy cross-file test harness sharing
export const testDb = new InMemoryDbStore();
