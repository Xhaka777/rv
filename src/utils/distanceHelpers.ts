/**
 * Calculate distance between two coordinates in kilometers
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point  
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
}

/**
 * Check if a threat is within the specified radius of user's location
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param threatLat - Threat's latitude
 * @param threatLng - Threat's longitude
 * @param radiusKm - Radius in kilometers
 * @returns boolean - true if threat is within radius
 */
export function isThreatWithinRadius(
  userLat: number, 
  userLng: number, 
  threatLat: number, 
  threatLng: number, 
  radiusKm: number
): boolean {
  const distance = calculateDistanceKm(userLat, userLng, threatLat, threatLng);
  return distance <= radiusKm;
}