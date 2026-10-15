import { PrismaClient } from '@prisma/client';
import { encryptField, decryptField, SENSITIVE_STUDENT_FIELDS, } from './crypto.js';
const SENSITIVE_FIELDS_SET = new Set(SENSITIVE_STUDENT_FIELDS);
/**
 * Criptografa campos sensíveis de aluno em um objeto de dados (em mutação ou cópia).
 */
export function encryptSensitiveData(data) {
    if (!data || typeof data !== 'object')
        return data;
    for (const field of SENSITIVE_STUDENT_FIELDS) {
        if (field in data) {
            const val = data[field];
            if (typeof val === 'string') {
                data[field] = encryptField(val);
            }
            else if (val && typeof val === 'object' && typeof val.set === 'string') {
                data[field].set = encryptField(val.set);
            }
        }
    }
    return data;
}
/**
 * Criptografa dados aninhados de Student em outros modelos (ex: create/update relacional).
 */
export function deepEncryptNestedStudent(obj, visited = new WeakSet()) {
    if (!obj || typeof obj !== 'object' || visited.has(obj))
        return obj;
    if (obj instanceof Date || Buffer.isBuffer(obj))
        return obj;
    visited.add(obj);
    if (Array.isArray(obj)) {
        for (const item of obj) {
            deepEncryptNestedStudent(item, visited);
        }
        return obj;
    }
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (key === 'student' && val && typeof val === 'object') {
            if (val.create)
                encryptSensitiveData(val.create);
            if (val.update)
                encryptSensitiveData(val.update);
            if (val.upsert) {
                if (val.upsert.create)
                    encryptSensitiveData(val.upsert.create);
                if (val.upsert.update)
                    encryptSensitiveData(val.upsert.update);
            }
        }
        else if (val && typeof val === 'object') {
            deepEncryptNestedStudent(val, visited);
        }
    }
    return obj;
}
/**
 * Descriptografa recursivamente qualquer objeto retornado pelo Prisma contendo campos sensíveis.
 * Funciona de forma transparente tanto para consultas diretas em Student quanto para includes relacionais.
 */
export function deepDecryptObject(obj, visited = new WeakSet()) {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) {
        return obj;
    }
    if (obj instanceof Date || Buffer.isBuffer(obj)) {
        return obj;
    }
    visited.add(obj);
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            obj[i] = deepDecryptObject(obj[i], visited);
        }
        return obj;
    }
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (SENSITIVE_FIELDS_SET.has(key) && typeof val === 'string') {
            obj[key] = decryptField(val);
        }
        else if (val && typeof val === 'object') {
            obj[key] = deepDecryptObject(val, visited);
        }
    }
    return obj;
}
function createPrismaClient() {
    const basePrisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    return basePrisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const a = args;
                    if (model === 'Student') {
                        if (operation === 'create' || operation === 'update') {
                            if (a?.data)
                                encryptSensitiveData(a.data);
                        }
                        else if (operation === 'upsert') {
                            if (a?.create)
                                encryptSensitiveData(a.create);
                            if (a?.update)
                                encryptSensitiveData(a.update);
                        }
                        else if (operation === 'createMany' || operation === 'updateMany') {
                            if (Array.isArray(a?.data)) {
                                a.data.forEach((item) => encryptSensitiveData(item));
                            }
                            else if (a?.data) {
                                encryptSensitiveData(a.data);
                            }
                        }
                    }
                    else {
                        if (a?.data) {
                            deepEncryptNestedStudent(a.data);
                        }
                    }
                    const result = await query(args);
                    return deepDecryptObject(result);
                },
            },
        },
    });
}
const globalForPrisma = global;
export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
