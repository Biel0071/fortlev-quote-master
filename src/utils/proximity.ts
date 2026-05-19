
export interface Coordinates {
  lat: number;
  lon: number;
}

// Map of Brazilian State UFs to approximate centroids
const UF_COORDINATES: Record<string, Coordinates> = {
  'AC': { lat: -9.02, lon: -70.81 },
  'AL': { lat: -9.57, lon: -36.78 },
  'AP': { lat: 1.41, lon: -51.77 },
  'AM': { lat: -3.41, lon: -64.33 },
  'BA': { lat: -12.97, lon: -38.51 },
  'CE': { lat: -3.71, lon: -38.54 },
  'DF': { lat: -15.79, lon: -47.88 },
  'ES': { lat: -19.19, lon: -40.34 },
  'GO': { lat: -16.68, lon: -49.25 },
  'MA': { lat: -2.53, lon: -44.30 },
  'MT': { lat: -12.64, lon: -55.42 },
  'MS': { lat: -20.44, lon: -54.64 },
  'MG': { lat: -18.51, lon: -44.55 },
  'PA': { lat: -1.45, lon: -48.50 },
  'PB': { lat: -7.11, lon: -34.86 },
  'PR': { lat: -25.42, lon: -49.27 },
  'PE': { lat: -8.05, lon: -34.88 },
  'PI': { lat: -5.09, lon: -42.80 },
  'RJ': { lat: -22.90, lon: -43.17 },
  'RN': { lat: -5.79, lon: -35.20 },
  'RS': { lat: -30.03, lon: -51.23 },
  'RO': { lat: -8.76, lon: -63.90 },
  'RR': { lat: 2.82, lon: -60.67 },
  'SC': { lat: -27.59, lon: -48.54 },
  'SP': { lat: -23.55, lon: -46.63 },
  'SE': { lat: -10.91, lon: -37.07 },
  'TO': { lat: -10.24, lon: -48.35 },
};

/**
 * Calculates the distance between two coordinates using the Haversine formula
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Gets approximate coordinates for a state UF
 */
export function getUFCoordinates(uf: string): Coordinates | null {
  return UF_COORDINATES[uf.toUpperCase()] || null;
}

/**
 * Finds the nearest factory from a list based on target coordinates
 */
export function findNearestFactory<T extends { latitude?: number | null; longitude?: number | null }>(
  target: Coordinates,
  factories: T[]
): T | null {
  if (!factories.length) return null;

  let nearest = factories[0];
  let minDistance = Infinity;

  for (const factory of factories) {
    if (factory.latitude && factory.longitude) {
      const distance = calculateDistance(target, { lat: factory.latitude, lon: factory.longitude });
      if (distance < minDistance) {
        minDistance = distance;
        nearest = factory;
      }
    }
  }

  return nearest;
}
