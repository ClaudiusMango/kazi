'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { encodeBrief } from '@/lib/qr-payload';
import type { NurseBrief } from '@/lib/types';

// The QR encodes a link to the static /nurse page with the brief in the URL
// fragment. Fragments are never sent to a server, so the nurse's device loads
// only the page shell — the brief itself goes device-to-device via the camera.

export default function QrHandoff({ brief }: { brief: NurseBrief }) {
  const [url, setUrl] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [tooLarge, setTooLarge] = useState(false);

  useEffect(() => {
    const encoded = encodeBrief(brief);
    setReduced(encoded.reduced);
    setTooLarge(encoded.tooLarge);
    setUrl(`${window.location.origin}/nurse#${encoded.payload}`);
  }, [brief]);

  if (!url || tooLarge) {
    // Silent fallback: the on-screen brief above is the primary handoff and
    // always works. The QR is an accelerator, never a dependency.
    return null;
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <p className="section-label">Scan to open on the nurse’s device</p>
      <div style={{ background: '#fff', padding: 12, display: 'inline-block' }}>
        <QRCodeSVG value={url} size={240} level="L" />
      </div>
      <p className="meta" style={{ marginTop: 12, marginBottom: 0 }}>
        {reduced
          ? 'Standard terms only — the patient’s own words stay on this screen.'
          : 'Opens without a network connection on the nurse’s side.'}
      </p>
    </div>
  );
}
