const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
      },
    });

    console.log('=== DATABASE VERIFICATION (prisma/dev.db) ===');
    console.log(`Total students found: ${students.length}`);

    let bcryptCount = 0;
    let plaintextCount = 0;
    let invalidCount = 0;
    const bcryptRounds = {};

    for (const student of students) {
      const pwd = student.password;
      if (!pwd) {
        console.log(`[ALERT] Student ${student.id} (${student.email}) has NULL/EMPTY password!`);
        invalidCount++;
        continue;
      }

      const isBcrypt = (pwd.startsWith('$2a$') || pwd.startsWith('$2b$')) && pwd.length === 60;
      if (isBcrypt) {
        bcryptCount++;
        const parts = pwd.split('$');
        const rounds = parts[2];
        bcryptRounds[rounds] = (bcryptRounds[rounds] || 0) + 1;
      } else {
        plaintextCount++;
        console.log(`[ALERT] Student ${student.id} (${student.email}) has NON-BCRYPT password: ${pwd}`);
      }
    }

    console.log(`Bcrypt valid hashes: ${bcryptCount} / ${students.length}`);
    console.log(`Plaintext / non-bcrypt passwords: ${plaintextCount}`);
    console.log(`Invalid / empty passwords: ${invalidCount}`);
    console.log('Bcrypt rounds breakdown:', bcryptRounds);

    if (students.length === 62 && bcryptCount === 62 && plaintextCount === 0 && invalidCount === 0) {
      console.log('>>> PROBE 6 RESULT: SUCCESS (Exactly 62/62 valid Bcrypt hashes)');
    } else {
      console.log(`>>> PROBE 6 RESULT: MISMATCH (Expected 62 valid Bcrypt hashes, found ${bcryptCount} out of ${students.length})`);
    }
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
