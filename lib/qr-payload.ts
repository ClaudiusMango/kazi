// QR payload encoding.
//
// The brief travels in the URL *fragment*, which browsers never transmit to a
// server. The nurse's device loads the static /nurse page and decodes locally;
// the brief content itself never reaches any host.
//
// lz-string rather than base64: base64 inflates by ~33%, compression shrinks
// this shape by roughly half, and QR capacity is the binding constraint.

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import type { BriefItem, Confidence, NurseBrief } from './types';

/** Comfortably inside QR version 40 at error correction level L. */
export const MAX_PAYLOAD_CHARS = 1800;

const CONFIDENCE_ORDER: Confidence[] = ['clear', 'uncertain', 'sijui'];

/** [verbatim, standardised, confidenceIndex] — tuples beat objects here. */
type CompactItem = [string, string | null, number];

interface CompactBrief {
  v: 1;
  /** Present when verbatim was dropped to fit. */
  r?: 1;
  cc: CompactItem[];
  od: CompactItem[];
  ce: CompactItem[];
  pc: CompactItem[];
  na: string[];
}

function compactItems(items: BriefItem[], dropVerbatim: boolean): CompactItem[] {
  return items.map((item) => [
    dropVerbatim ? '' : item.verbatim,
    item.standardised,
    Math.max(0, CONFIDENCE_ORDER.indexOf(item.confidence)),
  ]);
}

function compact(brief: NurseBrief, dropVerbatim: boolean): CompactBrief {
  const out: CompactBrief = {
    v: 1,
    cc: compactItems(brief.chief_complaint, dropVerbatim),
    od: compactItems(brief.onset_duration, dropVerbatim),
    ce: compactItems(brief.context_exposures, dropVerbatim),
    pc: compactItems(brief.patient_concerns, dropVerbatim),
    na: brief.not_asked_about,
  };
  if (dropVerbatim) out.r = 1;
  return out;
}

export interface EncodedBrief {
  payload: string;
  /** True when verbatim had to be dropped to fit inside the QR. */
  reduced: boolean;
  /** True when even the reduced form is too large to encode. */
  tooLarge: boolean;
}

export function encodeBrief(brief: NurseBrief): EncodedBrief {
  const full = compressToEncodedURIComponent(JSON.stringify(compact(brief, false)));
  if (full.length <= MAX_PAYLOAD_CHARS) {
    return { payload: full, reduced: false, tooLarge: false };
  }

  // Standardised terms plus "not asked about" are what the nurse scans first;
  // the verbatim column stays available on the patient's own screen.
  const reduced = compressToEncodedURIComponent(JSON.stringify(compact(brief, true)));
  return {
    payload: reduced,
    reduced: true,
    tooLarge: reduced.length > MAX_PAYLOAD_CHARS,
  };
}

export interface DecodedBrief {
  brief: NurseBrief;
  reduced: boolean;
}

export function decodeBrief(payload: string): DecodedBrief | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;

    const data = JSON.parse(json) as Partial<CompactBrief>;
    if (data.v !== 1) return null;

    const expand = (items: CompactItem[] | undefined): BriefItem[] =>
      (items ?? []).map(([verbatim, standardised, confidence]) => ({
        verbatim,
        standardised,
        confidence: CONFIDENCE_ORDER[confidence] ?? 'uncertain',
      }));

    return {
      reduced: data.r === 1,
      brief: {
        chief_complaint: expand(data.cc),
        onset_duration: expand(data.od),
        context_exposures: expand(data.ce),
        patient_concerns: expand(data.pc),
        not_asked_about: Array.isArray(data.na) ? data.na : [],
      },
    };
  } catch {
    return null;
  }
}
