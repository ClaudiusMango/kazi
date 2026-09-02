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
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
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

/** Kenyan English first, then the safe universal fallback. */
const LOCALES = ['en-KE', 'en-US'];

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechInput {
  /** False on unsupported browsers AND on insecure origins. */
  supported: boolean;
  listening: boolean;
  /** Set when speech failed in a way the patient should be told about. */
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechInput(onTranscript: (text: string) => void): SpeechInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<RecognitionLike | null>(null);
  const localeIndex = useRef(0);
  const handler = useRef(onTranscript);

  handler.current = onTranscript;

  useEffect(() => {
    // Web Speech needs a secure context. Over plain http on a LAN address the
    // constructor may exist but never produce a result, so treat an insecure
    // origin as unsupported and hide the button.
    setSupported(getCtor() !== null && window.isSecureContext);
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;

    recognition.current?.abort();
    setError(null);

    const instance = new Ctor();
    instance.lang = LOCALES[localeIndex.current];
    instance.continuous = false;
    instance.interimResults = false;
    instance.maxAlternatives = 1;

    instance.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) text += result[0].transcript;
      }
      const trimmed = text.trim();
      if (trimmed) handler.current(trimmed);
    };

    instance.onerror = (event) => {
      if (event.error === 'language-not-supported' && localeIndex.current < LOCALES.length - 1) {
        // Retry once on the fallback locale rather than failing outright.
        localeIndex.current += 1;
        setListening(false);
        start();
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was blocked. You can type instead.');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError('Voice input did not work. You can type instead.');
      }
      setListening(false);
    };

    instance.onend = () => setListening(false);

    recognition.current = instance;
    try {
      instance.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(() => () => recognition.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
