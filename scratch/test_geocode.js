async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  console.log('Fetching:', url);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StudioPilatesApp/1.0' }
    });
    const data = await res.json();
    console.log('Result:', data);
    return data;
  } catch (err) {
    console.error('Error:', err);
  }
}

async function run() {
  console.log('1. Full address:');
  await geocode('Rua Sebastião Rangel, Parque Turf Club, Campos dos Goytacazes, RJ, Brasil');
  console.log('2. Street and City:');
  await geocode('Rua Sebastião Rangel, Campos dos Goytacazes, RJ, Brasil');
  console.log('3. Neighborhood and City:');
  await geocode('Parque Turf Club, Campos dos Goytacazes, RJ, Brasil');
  console.log('4. City:');
  await geocode('Campos dos Goytacazes, RJ, Brasil');
}

run();
