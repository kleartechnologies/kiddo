"use client";

import { useEffect, useState } from "react";

import { TIMING } from "./canon";

/**
 * Blink timer.
 *
 * Returns true for the 90ms the eyes are shut, on a random 3-7s interval.
 * Random rather than fixed, because a metronome blink reads as a machine.
 */
export function useBlink(active: boolean): boolean {
  const [shut, setShut] = useState(false);

  useEffect(() => {
    if (!active) return;

    let open: ReturnType<typeof setTimeout>;
    let close: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const gap = TIMING.blinkMinGap + Math.random() * (TIMING.blinkMaxGap - TIMING.blinkMinGap);
      close = setTimeout(() => {
        setShut(true);
        open = setTimeout(() => {
          setShut(false);
          schedule();
        }, TIMING.blinkSeconds * 1000);
      }, gap * 1000);
    };

    schedule();
    return () => {
      clearTimeout(close);
      clearTimeout(open);
    };
  }, [active]);

  /* Derived rather than reset in the effect, so turning the character off
     never schedules an extra render. */
  return active && shut;
}
