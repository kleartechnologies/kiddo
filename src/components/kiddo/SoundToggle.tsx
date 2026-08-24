"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

import { useAudioSettings, useSound } from "@/lib/audio/useAudio";
import { cn } from "@/lib/cn";
import { springy } from "@/lib/motion";

/**
 * The sound switch, as a child would expect to find it.
 *
 * One control, two states, no slider. A four-year-old's entire relationship
 * with sound is "on" and "off", and every extra knob here is a knob they can
 * get lost in — the separate music and effects volumes exist in the engine,
 * where a grown-up screen can reach them later, not on the child's own screen.
 *
 * ## A speaker, not a musical note
 *
 * The switch turns off *everything*: the bed, the cheer at the end, the tap of
 * a card. A note promised only the music, and a child who wanted the room
 * quiet and pressed it would have been told the truth by the icon and lied to
 * by the product. A speaker with waves coming out of it, and a speaker with a
 * cross through it, is the one sound picture every child already knows from
 * every other screen in their house.
 *
 * The two states differ in shape before they differ in anything else — waves
 * against a cross — so the switch still reads with the colour taken out of it.
 * It says "Sound on" and "Sound off" rather than anything about audio or
 * settings, because those are the only two words involved.
 *
 * Same 3.5rem circle as `BackLink`, so the two round controls a child ever
 * meets in the chrome are the same size, in the same places, learned once —
 * and both are comfortably past the tap target a small hand needs.
 *
 * It clicks when it is switched *on*, and never when switched off: a mute
 * button that makes a noise as it mutes is a small betrayal.
 */
export function SoundToggle({ className }: { className?: string }) {
  const { muted, toggleMuted } = useAudioSettings();
  const play = useSound();

  const on = !muted;
  const label = on ? "Sound on" : "Sound off";

  return (
    <motion.button
      type="button"
      onClick={() => {
        toggleMuted();
        if (muted) play("button");
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={springy}
      /* Pressed is sound being on, which is the state the label names. A
         screen reader hears "Sound on, pressed" or "Sound off, not pressed";
         either way the current state is said, not the thing pressing would
         do — the icon is already the instruction. */
      aria-pressed={on}
      aria-label={label}
      /* And the same two words for a grown-up hovering a mouse over it. */
      title={label}
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-full border",
        "border-edge shadow-soft transition-colors",
        on
          ? "bg-paper text-ink-700 hover:bg-cream-50"
          : /* Off is quieter to look at as well as to listen to. */
            "bg-cream-50 text-ink-500 hover:bg-paper",
        className,
      )}
    >
      {on ? (
        <Volume2 className="size-6" strokeWidth={2.5} aria-hidden />
      ) : (
        <VolumeX className="size-6" strokeWidth={2.5} aria-hidden />
      )}
    </motion.button>
  );
}
