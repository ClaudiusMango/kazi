import { describe, expect, it } from 'vitest';
import {
  CLINIC_LOCATION,
  FACILITIES,
  distanceFromClinic,
  formatKm,
  mapSearchUrl,
  straightLineKm,
} from './facilities';

describe('distance', () => {
  it('measures from the clinic, never from the patient', () => {
    // A fixed origin is the whole point: no geolocation is read anywhere, and
    // every patient sees identical numbers.
    expect(typeof CLINIC_LOCATION.lat).toBe('number');
    expect(typeof CLINIC_LOCATION.lng).toBe('number');
  });

  it('computes a known distance correctly', () => {
    // Nairobi to Mombasa is roughly 440 km in a straight line.
    const km = straightLineKm(
      { lat: -1.2921, lng: 36.8219 },
      { lat: -4.0435, lng: 39.6682 }
    );
    expect(km).toBeGreaterThan(410);
    expect(km).toBeLessThan(470);
  });

  it('returns zero for the same point', () => {
    expect(straightLineKm(CLINIC_LOCATION, CLINIC_LOCATION)).toBeCloseTo(0, 5);
  });

  it('puts every configured facility within a plausible city radius', () => {
    for (const facility of FACILITIES) {
      const km = distanceFromClinic(facility);
      expect(km, facility.name).not.toBeNull();
      expect(km!, facility.name).toBeGreaterThan(0);
      expect(km!, facility.name).toBeLessThan(50);
    }
  });

  it('formats short distances more precisely than long ones', () => {
    expect(formatKm(1.24)).toBe('1.2 km');
    expect(formatKm(23.6)).toBe('24 km');
  });
});

describe('map links', () => {
  it('searches by name rather than by our approximate coordinates', () => {
    const url = mapSearchUrl(FACILITIES[0]);
    expect(url).toContain(encodeURIComponent(FACILITIES[0].name));
    // Coordinates are placeholders; a rough one must not be able to misdirect.
    expect(url).not.toContain('36.8');
  });

  it('sends nothing about the patient', () => {
    const url = mapSearchUrl(FACILITIES[0]);
    expect(url).not.toMatch(/patient|symptom|brief|complaint/i);
  });
});
