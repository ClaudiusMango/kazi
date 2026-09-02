# Kazi

A patient intake assistant for outpatient triage in Kenyan health facilities.

A patient waiting to be seen describes what they feel, in their own words, on a
shared tablet. Kazi translates that into a structured intake sheet and hands it
to the triage nurse. It records; the nurse decides.

> **Kazi does not diagnose, advise, prioritise, or triage.** It is a language
> translator and a form filler. Every clinical judgement belongs to the nurse
> who reads its output. See [Safety boundaries](#safety-boundaries) — they are
> the point of the project, not a disclaimer bolted onto it.

---

## Why

Triage intake loses information at the language boundary. A patient explains
themselves in the words they have; those words get compressed, guessed at, or
skipped under queue pressure, and the nurse receives less than the patient
actually said.

Kazi keeps the patient's own words attached to every standardised term, and
marks the things it did not understand as **not understood** rather than
guessing. A nurse can trust a sheet that admits its gaps. They cannot trust one
that quietly fills them in.

## What the patient sees

1. **Consent** — what this is, what it is not, what happens to their words.
2. **Chat** — up to 8 turns, typed or spoken (hold-to-speak). The assistant
   asks about symptoms and nothing else.
3. **Brief** — the structured sheet, shown to the patient first so they can
   confirm it before the nurse ever sees it.
4. **Handoff** — a QR code the nurse scans, plus a printable version.
5. **Done** — the session ends and its contents are gone.

At any point, a danger sign in what they typed replaces the screen with an
alert that sends them to a person immediately.

## The four buckets

Every brief is exactly these, and nothing else:

| Bucket | Holds |
| --- | --- |
| `chief_complaint` | What they feel |
| `onset_duration` | When it started, how it changed |
| `context_exposures` | Travel, medications, allergies, relevant recent events |
| `patient_concerns` | What **they** say they are worried about |
| `not_asked_about` | Buckets with nothing in them |

Each item carries the patient's `verbatim` words, a `standardised` term, and a
`confidence` of `clear`, `uncertain`, or `sijui`.

`not_asked_about` exists because silence is not a negative finding. A bucket
with no information says so out loud, so the nurse never reads an empty field
as "asked and denied".

## Safety boundaries

These are enforced in four independent places, so that no single failure —
including the model simply not complying — removes them.

**1. The danger-sign interceptor** — [`lib/interceptor.ts`](lib/interceptor.ts)

Pure, deterministic, offline. No network, no state, no imports beyond types. It
runs on the patient's text before anything is sent anywhere, and it works with
the network unplugged. 27 rules across word, phrase, and proximity matching, so
that "my chest hurts" and "pain in my chest" both fire where no fixed phrase
list would.

Two outcomes: **RED** (get to a person now — chest pain, breathing difficulty,
one-sided weakness, obstetric danger signs, a child not feeding) and **AMBER**
(self-harm disclosure). Every path out of it leads to a human faster. No path
reduces urgency or reassures.

It is *not clinically validated*. It was assembled from published danger signs
by non-clinicians and it will have gaps. It is built so that its gaps fail
toward a person rather than away from one.

**2. The sijui protocol** — the most important instruction in the prompt

*Sijui* is Kiswahili for "I don't know". If a phrase is ambiguous or its
medical meaning is not certain, the model sets `confidence: "sijui"`, keeps the
patient's exact words, and leaves `standardised` null. It does not guess and it
does not approximate. An unclear item honestly flagged is more useful to a
nurse than a confident wrong one.

**3. The no-embellishment rule**

Severity, laterality, acuity, and frequency are never introduced. "My head is
pounding" becomes "throbbing headache", never "*severe* throbbing headache" —
`severe` is a clinical grading the patient never gave. Self-asserted diagnoses
("I have malaria") are recorded verbatim as a *concern*, never repeated as
established, and never corrected either — the model is in no position to do
either, and the nurse is.

**4. The schema**

The brief is produced by a forced tool call
([`lib/tool-schema.ts`](lib/tool-schema.ts)) — the model has no prose path out.
Diagnostic requests are caught by a client-side pre-filter
([`lib/sijui-filter.ts`](lib/sijui-filter.ts)) that renders fixed application
text, so the refusal cannot be softened, qualified, or continued by the model.
`flag_diagnostic_request` has no free-text field, by design.

Rendered briefs carry a non-removable footer stating that the sheet is not an
assessment and rules nothing in or out.

## Privacy

The patient is using someone else's tablet. The design follows from that.

- **No persistence anywhere.** No database, no localStorage, no
  sessionStorage, no IndexedDB, no cookies, no disk writes, no logging of
  patient text. Session state lives in React state and nowhere else.
- **The brief travels in a URL fragment.** Fragments are never transmitted to
  a server, so the nurse's device decodes the brief locally and the content
  reaches no host. Compressed with lz-string to fit QR capacity.
- **Inactivity purge.** A warning at 90s, a full purge at 120s. The purge is a
  document replace, so the JS heap goes with the state and the back button
  cannot recover anything.
- **`noindex, nofollow` and `no-referrer`** on every route.
- The API key is read server-side only, in the two route handlers.

## Running it

Requires Node and an Anthropic API key.

```bash
npm install
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. The nurse-side viewer is at `/nurse`.

| Script | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run dev:lan` | Dev server on `0.0.0.0`, for scanning the QR from a phone |
| `npm run dev:https` | Same, over HTTPS — speech input needs a secure origin |
| `npm test` | Vitest suite |
| `npm run build` | Production build |

For a local demo where a phone scans the QR, set `NEXT_PUBLIC_HANDOFF_ORIGIN`
to your machine's LAN address. A QR encoding `localhost` resolves to the
scanning phone, not to you.

## Layout

```
app/
  page.tsx              Patient flow — all session state lives here
  nurse/page.tsx        Nurse viewer: decode-and-render, zero API calls
  api/chat/route.ts     Conversation turn
  api/brief/route.ts    Final brief, forced tool call
lib/
  interceptor.ts        Danger signs. Pure, offline, no imports
  system-prompt.ts      Safety core + one output instruction per mode
  tool-schema.ts        emit_nurse_brief, ask_next_question, close_intake,
                        flag_diagnostic_request
  sijui-filter.ts       Client-side diagnostic-request pre-filter
  qr-payload.ts         Fragment encoding for the handoff
  facilities.ts         Static referral directory (replace before deploying)
  constants.ts          Models, limits, timeouts, screen copy
components/             One per screen, plus the brief renderers
```

Models: `claude-haiku-4-5` primary, `claude-sonnet-5` fallback.

## Before deploying this anywhere real

This is a working prototype, not a cleared medical product.

- **Have a clinician review the interceptor rules.** They have not been
  clinically validated.
- **Replace [`lib/facilities.ts`](lib/facilities.ts) entirely.** The Nairobi
  hospitals listed are placeholders so the screen is not empty in development.
- **Verify every phone number on the day.** `CRISIS_HELPLINE` ships as `null`
  on purpose: a dead number shown to someone disclosing self-harm is the worst
  failure this product can produce, so no number is the safe default.
- **Put authentication in front of the API routes.** They hold the key and
  currently have only same-origin and input-size guards.
- Confirm your obligations under the Kenya Data Protection Act 2019 and the
  facility's own policy.
