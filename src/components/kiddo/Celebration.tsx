"use client";

import { motion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { CharacterFigure } from "./CharacterFigure";
import { MagicMotion } from "./MagicMotion";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";
import { KIDDO_HOME } from "@/lib/routes";
import { springBouncy, springSoft, staggerChildren } from "@/lib/motion";
import type { CharacterId } from "@/lib/games/types";

/**
 * The reward at the end of a round.
 *
 * This is the one screen allowed to be loud, and the character carries it:
 * the celebrate pose is the biggest in the library and brings its own three
 * confetti marks. Nothing else on the screen throws particles, because two
 * competing celebrations is how a premium product starts to look generated.
 *
 * The child is praised for finishing, never scored on how many they got right.
 *
 * ## The one lift
 *
 * The character arrives the way it always has, and then — once it is there —
 * does the `celebrate` motion from the Magic Motion vocabulary: one lift, one
 * small swell, three marks, and still. That is the whole of "you did it" said
 * with the body, and it plays once. Nothing about the moment changes: the
 * same pose, the same words, the same two ways out, and under reduced motion
 * the character is simply there, celebrating, with no marks thrown.
 *
 * ## How big the moment is
 *
 * A harder round earns a warmer finish — but the character never lifts
 * higher and nothing is counted. What grows is the light: a bigger finish
 * puts a glow behind the character, a bigger one still adds rays of sun, and
 * finishing everything a world holds earns the one finish with a golden ring
 * round it. All of it is drawn still and arrives with the entrance; the lift
 * stays the only thing that moves.
 */

/**
 * How big the finish was. `1` is a round finished — the celebration as it has
 * always been. `2` and `3` are harder rounds, and the warmth spreads a
 * little further. `"world"` is the last door of a world: the ring. Never a
 * number on screen — the child feels the difference, they are not shown it.
 */
export type CelebrationMoment = 1 | 2 | 3 | "world";

/** Sunlight, standing still: drawn once behind the character, never thrown. */
function Rays({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden className={className}>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index + 0.5) * (Math.PI / 4);
        const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
        return (
          <line
            key={index}
            x1={50 + 38 * dx}
            y1={50 + 38 * dy}
            x2={50 + 46 * dx}
            y2={50 + 46 * dy}
            stroke="currentColor"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** After the entrance has landed, not during it: two springs at once is a wobble. */
const LIFT_AFTER = 0.35;

/**
 * Played from the first frame on screen, never from the server: a page that
 * rendered this with the lift already underway would disagree with a client
 * that prefers reduced motion about what it sent, and React would say so.
 * The server snapshot is "not yet"; the client's is "now" — the one idiom
 * React offers for a value that is allowed to differ between the two.
 */
const never = () => () => {};
function usePlayOnMount(): number {
  return useSyncExternalStore(
    never,
    () => 1,
    () => 0,
  );
}

export function Celebration({
  character = "kiddo",
  title,
  message,
  onPlayAgain,
  /** The way out. Worded exactly like every other exit in the product. */
  backLabel,
  backHref = KIDDO_HOME,
  reward,
  next,
  moment = 1,
  className,
}: {
  character?: CharacterId;
  /**
   * The words themselves, already in the reader's language — a game reads
   * them from the catalogue and hands them in. Not a message key, because
   * several of these carry a place or a door's name inside them and a key
   * cannot hold a value. Defaults are the celebration's own two lines.
   */
  title?: string;
  message?: string;
  onPlayAgain?: () => void;
  backLabel?: string;
  backHref?: string;
  /** How big the finish was. The default is the celebration as it has always been. */
  moment?: CelebrationMoment;
  /**
   * What the world gave back — a flower, an animal, a page — drawn by the
   * world and handed in here, so the celebration stays the one screen it has
   * always been and only gains a line. Nothing here is scored.
   */
  reward?: ReactNode;
  /** Where to go after: the next door in the world, or the next world. */
  next?: { href: string; label: string };
  className?: string;
}) {
  const t = useT();
  const lift = usePlayOnMount();

  return (
    <motion.div
      variants={staggerChildren(0.1)}
      initial="hidden"
      animate="show"
      className={cn(
        "flex flex-col items-center gap-6 text-center",
        className,
      )}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springBouncy}
        className="relative"
      >
        {moment !== 1 ? (
          <div
            aria-hidden
            className={cn(
              "bg-honey-soft absolute rounded-full",
              moment === 2 ? "-inset-3" : "-inset-5",
            )}
          />
        ) : null}
        {moment === "world" ? (
          <div
            aria-hidden
            className="border-honey-base/60 absolute -inset-8 rounded-full border-4"
          />
        ) : null}
        {moment === 3 || moment === "world" ? (
          <Rays
            className={cn(
              "absolute",
              moment === "world"
                ? "text-honey-deep/70 -inset-12"
                : "text-honey-base/70 -inset-10",
            )}
          />
        ) : null}
        <div className="relative">
          <MagicMotion motion="celebrate" playKey={lift} delay={LIFT_AFTER}>
            <CharacterFigure id={character} size="xl" pose="celebrate" />
          </MagicMotion>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSoft, delay: 0.15 }}
        className="space-y-1"
      >
        <h2 className="font-display text-4xl font-bold sm:text-5xl">
          {title ?? t("celebrate.title")}
        </h2>
        {message ? (
          <p className="text-ink-500 text-lg sm:text-xl">{message}</p>
        ) : null}
      </motion.div>

      {reward ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSoft, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          {reward}
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSoft, delay: 0.25 }}
        className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center"
      >
        {next ? (
          <ButtonLink href={next.href} size="lg" block>
            {next.label}
          </ButtonLink>
        ) : null}
        {onPlayAgain ? (
          <Button size="lg" onClick={onPlayAgain} block variant={next ? "soft" : "primary"}>
            {t("celebrate.playAgain")}
          </Button>
        ) : null}
        <ButtonLink href={backHref} variant="soft" size="lg" block>
          {backLabel ?? t("chrome.back")}
        </ButtonLink>
      </motion.div>
    </motion.div>
  );
}
