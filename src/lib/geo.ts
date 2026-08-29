/**
 * Utilitários de Geolocalização e Cálculo de Distância Haversine
 */

export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calcula a distância em metros entre duas coordenadas geográficas (Lat/Lng)
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Arredonda para 1 casa decimal
}

/**
 * Avalia se o aluno está dentro do raio do estúdio
 */
export function isWithinStudioRadius(
  studentLat: number,
  studentLng: number,
  studioLat: number,
  studioLng: number,
  radiusMeters: number
): { isInside: boolean; distance: number } {
  const distance = calculateDistanceInMeters(
    studentLat,
    studentLng,
    studioLat,
    studioLng
  );
  return {
    isInside: distance <= radiusMeters,
    distance,
  };
}
