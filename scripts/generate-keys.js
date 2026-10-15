const crypto = require('crypto');

console.log('--- CHAVES CRIPTOGRÁFICAS GERADAS COM CSPRNG (256-BIT) ---');
console.log('DATA_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('JWT_ADMIN_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('JWT_STUDENT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('----------------------------------------------------------');
