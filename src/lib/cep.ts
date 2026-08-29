/**
 * Utilitário de Busca Automática de CEP e Geocodificação (ViaCEP + Nominatim OpenStreetMap)
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

  // 1. Busca no ViaCEP
  const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
  if (!viaCepRes.ok) {
    throw new Error('Não foi possível consultar o serviço ViaCEP.');
  }

  const viaCepData = await viaCepRes.json();
  if (viaCepData.erro) {
    throw new Error('CEP não encontrado na base de dados.');
  }

  const street = viaCepData.logradouro || '';
  const neighborhood = viaCepData.bairro || '';
  const city = viaCepData.localidade || '';
  const state = viaCepData.uf || '';
  const formattedAddress = `${street ? street + ', ' : ''}${neighborhood ? neighborhood + ' - ' : ''}${city} - ${state}`;

  // 2. Geocodificação OpenStreetMap Nominatim
  let latitude: number | null = null;
  let longitude: number | null = null;

  try {
    const query = `${street} ${neighborhood} ${city} ${state} Brazil`.trim();
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    const geoRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'StudioPilatesManager/1.0',
      },
    });

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (Array.isArray(geoData) && geoData.length > 0) {
        latitude = parseFloat(geoData[0].lat);
        longitude = parseFloat(geoData[0].lon);
      }
    }
  } catch (err) {
    console.warn('Geocodificação via Nominatim falhou, prosseguindo com endereço textual:', err);
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
