'use client';

import { FACILITIES, mapSearchUrl, type Facility } from '@/lib/facilities';

// Static, identical every time, unrelated to anything the patient told us.
// Read by the nurse, who is the one who decides referrals.

/**
 * Schematic map. Drawn inline from the configured coordinates — no tiles, no
 * geolocation, no third-party request, and it works with the network down.
 * It shows relative position, which is what a referral glance needs; anything
 * more precise is what the maps link is for.
 */
function SchematicMap({ facilities }: { facilities: Facility[] }) {
  const placed = facilities.filter(
    (f): f is Facility & { lat: number; lng: number } =>
      typeof f.lat === 'number' && typeof f.lng === 'number'
  );
  if (placed.length < 2) return null;

  const W = 320;
  const H = 190;
  const PAD = 34;

  const lats = placed.map((f) => f.lat);
  const lngs = placed.map((f) => f.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;

  const px = (lng: number) => PAD + ((lng - minLng) / spanLng) * (W - 2 * PAD);
  // North up: higher latitude sits nearer the top.
  const py = (lat: number) => PAD + ((maxLat - lat) / spanLat) * (H - 2 * PAD);

  return (
    <figure className="schematic">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Relative positions of the listed facilities">
        <rect x="0" y="0" width={W} height={H} rx="10" fill="var(--surface)" />

        {/* North marker — the only orientation cue a schematic can honestly give. */}
        <text x={W - 14} y="20" textAnchor="end" fontSize="11" fill="var(--text-muted)">
          N ↑
        </text>

        {placed.map((facility) => {
          const x = px(facility.lng);
          const y = py(facility.lat);
          const flip = x > W / 2;
          return (
            <g key={facility.name}>
              <circle cx={x} cy={y} r="6" fill="var(--accent)" />
              <text
                x={flip ? x - 11 : x + 11}
                y={y + 4}
                textAnchor={flip ? 'end' : 'start'}
                fontSize="11"
                fill="var(--text)"
              >
                {facility.name.replace(/ (County )?Hospital$/, '')}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="meta">
        Relative positions only — not to scale, and no route is implied.
      </figcaption>
    </figure>
  );
}

export default function FacilityDirectory() {
  if (FACILITIES.length === 0) return null;

  return (
    <div className="card">
      <p className="section-label">If you refer this patient onward</p>

      <SchematicMap facilities={FACILITIES} />

      <ul className="facility-list">
        {FACILITIES.map((facility) => (
          <li key={facility.name}>
            <span className="facility-name">{facility.name}</span>
            <span className="facility-meta">
              {facility.phone ? `${facility.area} · ${facility.phone}` : facility.area}
            </span>
            <a
              className="facility-link no-print"
              href={mapSearchUrl(facility)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in maps
            </a>
          </li>
        ))}
      </ul>

      <p className="meta" style={{ margin: 0 }}>
        A fixed list provided by this facility. It is not a recommendation, it
        is not ranked, and it does not reflect anything the patient told us.
        Opening a map sends only the facility name — never anything about the
        patient.
      </p>
    </div>
  );
}
