/**
 * Utilitário de Busca Automática de CEP e Geocodificação Robusta (AwesomeAPI + ViaCEP + OpenStreetMap Nominatim)
 */

export interface AddressData {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
}

export async function fetchAddressByCep(rawCep: string): Promise<AddressData | null> {
  const cleaned = rawCep.replace(/\D/g, '');
  if (cleaned.length !== 8) {
    throw new Error('CEP deve conter exatamente 8 dígitos numéricos.');
  }

  let street = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let latitude: number | null = null;
  let longitude: number | null = null;

  // 1. Tentar AwesomeAPI (retorna logradouro, bairro, cidade, estado e coordenadas precisas lat/lng direto no CEP)
  try {
    const awesomeRes = await fetch(`https://cep.awesomeapi.com.br/json/${cleaned}`, {
      headers: { 'User-Agent': 'StudioPilatesManager/1.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (awesomeRes.ok) {
      const awesomeData = await awesomeRes.json();
      if (awesomeData && awesomeData.city) {
        street = awesomeData.address || '';
        neighborhood = awesomeData.district || '';
        city = awesomeData.city || '';
        state = awesomeData.state || '';
        if (awesomeData.lat && awesomeData.lng) {
          const latNum = parseFloat(awesomeData.lat);
          const lngNum = parseFloat(awesomeData.lng);
          if (!isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0) {
            latitude = latNum;
            longitude = lngNum;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[CEP] AwesomeAPI falhou ou timeout, tentando ViaCEP:', err);
  }

  // 2. Se logradouro/bairro ainda vazios, consultar ViaCEP
  if (!street || !city) {
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`, {
        signal: AbortSignal.timeout(3000),
      });
      if (viaCepRes.ok) {
        const viaCepData = await viaCepRes.json();
        if (!viaCepData.erro) {
          street = viaCepData.logradouro || street;
          neighborhood = viaCepData.bairro || neighborhood;
          city = viaCepData.localidade || city;
          state = viaCepData.uf || state;
        }
      }
    } catch (err) {
      console.warn('[CEP] ViaCEP falhou:', err);
    }
  }

  if (!city && !street) {
    throw new Error('CEP não encontrado na base de dados.');
  }

  const formattedAddress = `${street ? street + ', ' : ''}${neighborhood ? neighborhood + ' - ' : ''}${city} - ${state}`;

  // 3. Se ainda não temos latitude/longitude, consultar Nominatim OpenStreetMap com consultas em cascata
  if (!latitude || !longitude) {
    const queries: string[] = [];
    if (street && city) queries.push(`${street}, ${city}, ${state}, Brasil`);
    if (neighborhood && city) queries.push(`${neighborhood}, ${city}, ${state}, Brasil`);
    if (city) queries.push(`${city}, ${state}, Brasil`);

    for (const query of queries) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        const geoRes = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'StudioPilatesManager/1.0 (contato@studiopilates.com)',
          },
          signal: AbortSignal.timeout(2500),
        });

        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (Array.isArray(geoData) && geoData.length > 0) {
            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
              latitude = lat;
              longitude = lon;
              break;
            }
          }
        }
      } catch {
        // Continua para próxima tentativa
      }
    }
  }

  return {
    cep: `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`,
    street,
    neighborhood,
    city,
    state,
    latitude,
    longitude,
    formattedAddress,
  };
}
