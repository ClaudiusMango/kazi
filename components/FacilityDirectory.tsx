'use client';

import { FACILITIES } from '@/lib/facilities';

// Static, identical for every patient, unrelated to anything they told us.
// The disclaimer is not decoration: a list of hospitals shown at the end of a
// medical intake reads as advice unless it says plainly that it is not.

export default function FacilityDirectory() {
  return (
    <div className="card">
      <p className="section-label">If you are referred onward</p>
      <p style={{ margin: 0 }}>The nurse will tell you where to go.</p>

      {FACILITIES.length > 0 && (
        <>
          <p className="section-label" style={{ marginTop: 20 }}>
            Other facilities in this area
          </p>
          <ul className="facility-list">
            {FACILITIES.map((facility) => (
              <li key={facility.name}>
                <span className="facility-name">{facility.name}</span>
                <span className="facility-meta">
                  {facility.phone ? `${facility.area} · ${facility.phone}` : facility.area}
                </span>
              </li>
            ))}
          </ul>
          <p className="meta" style={{ margin: 0 }}>
            This list is provided by this facility. It is not a recommendation
            and does not reflect anything you told us.
          </p>
        </>
      )}
    </div>
  );
}
