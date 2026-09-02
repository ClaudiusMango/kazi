// Facility directory shown to the NURSE on the handoff screen.
//
// THIS IS A REFERRAL AID, NOT A RECOMMENDATION. It is deliberately static: the
// same list in the same order every time, with no geolocation, no distance
// ranking, and no relationship to anything the patient typed. It is read by
// the person who decides referrals; the system itself still cannot route,
// refer, or prioritise, and this list must not become a way for it to start.
//
// CONFIGURATION. The deploying facility owns this list and should replace it
// entirely. The entries below are real Nairobi public hospitals, included so
// the screen is not empty during development.
//
// COORDINATES ARE APPROXIMATE and drive only the schematic map, which shows
// relative position and is explicitly not to scale. The "open in maps" link
// searches by name rather than by these coordinates, so a rough value here
// cannot send anyone to the wrong place.
//
// PHONE NUMBERS ARE DELIBERATELY ABSENT. A wrong number in front of someone
// who needs it is worse than no number, and these have not been verified.
// Add them only once someone has dialled them.

export interface Facility {
  name: string;
  area: string;
  /** Add only after verifying the number is current. */
  phone?: string;
  /** Approximate. Schematic map only. */
  lat?: number;
  lng?: number;
}

export const FACILITIES: Facility[] = [
  { name: 'Kenyatta National Hospital', area: 'Upper Hill', lat: -1.3013, lng: 36.8073 },
  { name: 'Mbagathi County Hospital', area: 'Mbagathi', lat: -1.3095, lng: 36.7889 },
  { name: 'Mama Lucy Kibaki Hospital', area: 'Embakasi', lat: -1.2833, lng: 36.8908 },
];

/**
 * Where this deployment is. Distances are measured from here, NOT from the
 * patient — a fixed origin means no geolocation is ever read, and every
 * patient sees exactly the same numbers.
 *
 * Replace with the deploying facility's own coordinates.
 */
export const CLINIC_LOCATION = {
  label: 'This facility',
  lat: -1.2921,
  lng: 36.8219,
};

/**
 * Straight-line distance. NOT travel distance — Nairobi traffic makes those
 * two very different numbers, which is why the UI says "straight line" rather
 * than letting anyone read it as a journey.
 */
export function straightLineKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance from the clinic, or null where coordinates are not configured. */
export function distanceFromClinic(facility: Facility): number | null {
  if (typeof facility.lat !== 'number' || typeof facility.lng !== 'number') return null;
  return straightLineKm(CLINIC_LOCATION, { lat: facility.lat, lng: facility.lng });
}

export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/** Hands off to whatever map app the device already has. */
export function mapSearchUrl(facility: Facility): string {
  const query = encodeURIComponent(`${facility.name}, ${facility.area}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
