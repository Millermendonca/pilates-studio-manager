const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany();
  console.log(students.map(s => ({
    id: s.id,
    name: s.name,
    address: s.address,
    neighborhood: s.neighborhood,
    city: s.city,
    latitude: s.latitude,
    longitude: s.longitude
  })));
  const settings = await prisma.studioSettings.findFirst();
  console.log('Settings:', settings ? { name: settings.studioName, lat: settings.latitude, lon: settings.longitude } : null);
}

main().catch(console.error).finally(() => prisma.$disconnect());
