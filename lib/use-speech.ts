'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Voice input via the Web Speech API. Progressive enhancement only — text is
// always the primary path, and the microphone is hidden outright wherever
// speech is unavailable rather than being shown broken.
//
// The transcript lands in the composer for the patient to read and correct.
// Sending stays a separate, deliberate tap, so an uncorrected transcript can
// never reach the model, and the interceptor still runs on send exactly as it
// does for typed text.

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface RecognitionErrorEvent {
  error: string;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

/**
 * Kenyan English first, then the safe universal fallback.
 *
 * Browsers do not reliably report an unsupported locale — several accept it
 * and simply return no result — so a silent empty session also advances this.
 */
const LOCALES = ['en-KE', 'en-US'];

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function detach(instance: RecognitionLike | null) {
  if (!instance) return;
  instance.onresult = null;
  instance.onerror = null;
  instance.onend = null;
}

export interface SpeechInput {
  /** False on unsupported browsers AND on insecure origins. */
  supported: boolean;
  listening: boolean;
  /** Live partial transcript, so it is visibly working before it finishes. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechInput(onTranscript: (text: string) => void): SpeechInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognition = useRef<RecognitionLike | null>(null);
  const localeIndex = useRef(0);
  const gotResult = useRef(false);
  const handler = useRef(onTranscript);

  handler.current = onTranscript;

  useEffect(() => {
    // Web Speech needs a secure context. Over plain http on a LAN address the
    // constructor may exist but never produce a result, so treat an insecure
    // origin as unsupported and hide the button rather than show a dead one.
    setSupported(getCtor() !== null && window.isSecureContext);
  }, []);

  const stop = useCallback(() => {
    // stop() finalises and returns what was heard; abort() would discard it.
    recognition.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;

    // Detach BEFORE aborting. Otherwise the outgoing instance's onend fires
    // after the new session has started and switches listening back off
    // underneath it — which looks exactly like the microphone not working.
    const previous = recognition.current;
    if (previous) {
      detach(previous);
      try {
        previous.abort();
      } catch {
        /* already dead */
      }
    }

    setError(null);
    setInterim('');
    gotResult.current = false;

    const instance = new Ctor();
    instance.lang = LOCALES[localeIndex.current];
    // Hold-to-speak: the patient decides when they have finished, not the
    // recogniser. With continuous off it stops at the first pause, which is
    // most of what "it didn't capture what I said" turns out to be.
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;

    instance.onresult = (event) => {
      let final = '';
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else partial += result[0].transcript;
      }

      if (partial) setInterim(partial);

      const trimmed = final.trim();
      if (trimmed) {
        gotResult.current = true;
        setInterim('');
        handler.current(trimmed);
      }
    };

    instance.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was blocked. You can type instead.');
        gotResult.current = true; // suppress the generic message from onend
      } else if (event.error === 'language-not-supported') {
        if (localeIndex.current < LOCALES.length - 1) localeIndex.current += 1;
      } else if (event.error === 'network') {
        setError('Voice input needs a connection. You can type instead.');
        gotResult.current = true;
      }
    };

    instance.onend = () => {
      setListening(false);
      setInterim('');
      if (gotResult.current) return;

      // Nothing came back. Advance the locale so the next attempt uses the
      // universal fallback, and say so rather than failing silently — the
      // silent version is indistinguishable from a broken microphone.
      if (localeIndex.current < LOCALES.length - 1) localeIndex.current += 1;
      setError('I did not catch that. Tap the microphone and try again, or type instead.');
    };

    recognition.current = instance;
    try {
      instance.start();
      setListening(true);
    } catch {
      setListening(false);
      setError('Voice input could not start. You can type instead.');
    }
  }, []);

  useEffect(
    () => () => {
      detach(recognition.current);
      recognition.current?.abort();
    },
    []
  );

  return { supported, listening, interim, error, start, stop };
}
