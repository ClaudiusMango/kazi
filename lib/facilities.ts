// Facility directory shown on the patient's completion screen.
//
// THIS IS A DIRECTORY, NOT A RECOMMENDATION. It is deliberately static: the
// same list for every patient, in a fixed order, with no geolocation, no
// distance ranking, and no relationship to anything the patient typed. The
// system cannot route, refer, or prioritise, and this list must not become a
// way for it to start.
//
// CONFIGURATION. The deploying facility owns this list and should replace it
// entirely. The entries below are real Nairobi public hospitals, included so
// the screen is not empty during development.
//
// PHONE NUMBERS ARE DELIBERATELY ABSENT. A wrong number printed on a screen a
// frightened person is reading is worse than no number, and these have not
// been verified. Add them only once someone has dialled them.

export interface Facility {
  name: string;
  area: string;
  /** Add only after verifying the number is current. */
  phone?: string;
}

export const FACILITIES: Facility[] = [
  { name: 'Kenyatta National Hospital', area: 'Upper Hill' },
  { name: 'Mbagathi County Hospital', area: 'Mbagathi' },
  { name: 'Mama Lucy Kibaki Hospital', area: 'Embakasi' },
];
