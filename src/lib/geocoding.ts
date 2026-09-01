import { prisma } from './prisma';

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(
  address?: string | null,
  neighborhood?: string | null,
  city?: string | null,
  state?: string | null,
  studioFallback?: { latitude: number; longitude: number } | null
): Promise<GeocodeResult | null> {
  const queriesToTry: string[] = [];

  const cleanCity = (city || '').trim();
  const cleanState = (state || '').trim();
  const cleanAddress = (address || '').trim();
  const cleanNeighborhood = (neighborhood || '').trim();

  // 1. Endereço + Cidade + Estado
  if (cleanAddress && cleanCity) {
    // Remover número de casa para aumentar precisão no OpenStreetMap se necessário
    const streetOnly = cleanAddress.replace(/,\s*\d+.*$/, '').replace(/\s+\d+.*$/, '');
    queriesToTry.push(`${cleanAddress}, ${cleanCity}, ${cleanState}, Brasil`);
    if (streetOnly && streetOnly !== cleanAddress) {
      queriesToTry.push(`${streetOnly}, ${cleanCity}, ${cleanState}, Brasil`);
    }
  }

  // 2. Bairro + Cidade + Estado
  if (cleanNeighborhood && cleanCity) {
    queriesToTry.push(`${cleanNeighborhood}, ${cleanCity}, ${cleanState}, Brasil`);
  }

  // 3. Cidade + Estado
  if (cleanCity) {
    queriesToTry.push(`${cleanCity}, ${cleanState || 'Brasil'}, Brasil`);
  }

  for (const query of queriesToTry) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'StudioPilatesGeocoding/1.0 (contato@studiopilates.com)',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            // Adicionar uma variação minúscula (jitter de 50-100m) se for apenas cidade/bairro para evitar sobreposição exata
            const isBroadLocation = !query.includes(cleanAddress);
            const jitter = isBroadLocation ? (Math.random() - 0.5) * 0.005 : 0;
            return {
              latitude: lat + jitter,
              longitude: lon + jitter,
            };
          }
        }
      }
    } catch (err) {
      console.warn(`[Geocoding] Tentativa falhou para query: "${query}"`, err);
    }
  }

  // Se não encontrou no OpenStreetMap ou sem rede, usar a localização do estúdio com um raio natural próximo
  if (studioFallback && studioFallback.latitude && studioFallback.longitude) {
    const latOffset = (Math.random() - 0.5) * 0.015; // ~800m
    const lonOffset = (Math.random() - 0.5) * 0.015;
    return {
      latitude: studioFallback.latitude + latOffset,
      longitude: studioFallback.longitude + lonOffset,
    };
  }

  // Fallback padrão se nem estúdio estiver cadastrado
  return {
    latitude: -21.7792589 + (Math.random() - 0.5) * 0.01,
    longitude: -41.3293574 + (Math.random() - 0.5) * 0.01,
  };
}
