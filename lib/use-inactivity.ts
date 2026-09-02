'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INACTIVITY_PURGE_MS, INACTIVITY_WARN_MS } from './constants';

/**
 * Shared-tablet protection: warn at 90s of no interaction, purge at 120s.
 *
 * Deliberately not armed on the RED and AMBER screens. Those exist to be
 * carried across a room and shown to a person, they hold no patient data, and
 * clearing one mid-walk would defeat the point.
 */
export function useInactivityPurge(active: boolean, onPurge: () => void) {
  const [warning, setWarning] = useState(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const purgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (purgeTimer.current) clearTimeout(purgeTimer.current);
    warnTimer.current = null;
    purgeTimer.current = null;
  }, []);

  const reset = useCallback(() => {
    clear();
    setWarning(false);
    if (!active) return;
    warnTimer.current = setTimeout(() => setWarning(true), INACTIVITY_WARN_MS);
    purgeTimer.current = setTimeout(onPurge, INACTIVITY_PURGE_MS);
  }, [active, clear, onPurge]);

  useEffect(() => {
    if (!active) {
      clear();
      setWarning(false);
      return;
    }

    reset();
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    for (const event of events) {
      window.addEventListener(event, reset, { passive: true });
    }

    return () => {
      for (const event of events) window.removeEventListener(event, reset);
      clear();
    };
  }, [active, clear, reset]);

  return { warning, reset };
}
