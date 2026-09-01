const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function geocodeAddress(address, neighborhood, city, state, studioFallback) {
  const queriesToTry = [];
  const cleanCity = (city || '').trim();
  const cleanState = (state || '').trim();
  const cleanAddress = (address || '').trim();
  const cleanNeighborhood = (neighborhood || '').trim();

  if (cleanAddress && cleanCity) {
    const streetOnly = cleanAddress.replace(/,\s*\d+.*$/, '').replace(/\s+\d+.*$/, '');
    queriesToTry.push(`${cleanAddress}, ${cleanCity}, ${cleanState}, Brasil`);
    if (streetOnly && streetOnly !== cleanAddress) {
      queriesToTry.push(`${streetOnly}, ${cleanCity}, ${cleanState}, Brasil`);
    }
  }

  if (cleanNeighborhood && cleanCity) {
    queriesToTry.push(`${cleanNeighborhood}, ${cleanCity}, ${cleanState}, Brasil`);
  }

  if (cleanCity) {
    queriesToTry.push(`${cleanCity}, ${cleanState || 'Brasil'}, Brasil`);
  }

  for (const query of queriesToTry) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'StudioPilatesGeocoding/1.0 (contato@studiopilates.com)' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            const isBroad = !query.includes(cleanAddress);
            const jitter = isBroad ? (Math.random() - 0.5) * 0.005 : 0;
            return { latitude: lat + jitter, longitude: lon + jitter };
          }
        }
      }
    } catch (e) {
      console.warn(`Tentativa falhou para "${query}":`, e.message);
    }
  }

  if (studioFallback && studioFallback.latitude && studioFallback.longitude) {
    const latOffset = (Math.random() - 0.5) * 0.015;
    const lonOffset = (Math.random() - 0.5) * 0.015;
    return {
      latitude: studioFallback.latitude + latOffset,
      longitude: studioFallback.longitude + lonOffset,
    };
  }

  return {
    latitude: -21.7792589 + (Math.random() - 0.5) * 0.01,
    longitude: -41.3293574 + (Math.random() - 0.5) * 0.01,
  };
}

async function main() {
  const settings = await prisma.studioSettings.findFirst();
  const studentsWithoutCoords = await prisma.student.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null }
      ]
    }
  });

  console.log(`Encontrados ${studentsWithoutCoords.length} alunos sem coordenadas GPS.`);

  for (const student of studentsWithoutCoords) {
    console.log(`Geocodificando: ${student.name} (${student.address}, ${student.neighborhood}, ${student.city})...`);
    const coords = await geocodeAddress(
      student.address,
      student.neighborhood,
      student.city,
      student.state,
      settings
    );

    if (coords) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          latitude: coords.latitude,
          longitude: coords.longitude
        }
      });
      console.log(`✓ Atualizado: ${student.name} -> Lat: ${coords.latitude}, Lon: ${coords.longitude}`);
    }
  }

  console.log('Todos os alunos foram geocodificados com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
