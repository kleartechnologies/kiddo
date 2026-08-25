import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * How KIDDO and friends talk to the child. Every instruction in the product
 * comes through one of these, so the voice always has a face attached.
 *
 * ## `reserve`: a bubble that does not change size mid-sentence
 *
 * On a board KIDDO says several things in a row from the same bubble — the
 * question, then "Yes!", then the question again — and a two-line question
 * swapping for a one-line cheer makes the bubble shorter for a beat and
 * everything under it jump up to fill the gap. Measured on a 360px phone that
 * was 24px, right while an animal was walking home. So a caller hands over
 * the *other* lines the bubble may say in this place, and the bubble is as
 * tall as the tallest of them from the start. They are laid on top of one
 * another in a single grid cell, invisible and `aria-hidden`, so the height is
 * whatever the longest line wraps to *at this width* — no number, no
 * breakpoint, and nothing a screen reader meets twice.
 *
 * What a caller reserves is what the bubble costs. The height is the tallest
 * thing in `reserve`, so one long line — a hint written as a sentence — sizes
 * every board it is reserved on, whether or not it is ever said. That is the
 * bargain and it is not negotiable from this end: a caller that reserves less
 * than it can say gets a bubble that changes height mid-round, which is the
 * one thing this grid exists to prevent. Reserve every line that can be said,
 * in full, and shorten the words themselves if the bubble is too tall.
 */
export function SpeechBubble({
  children,
  className,
  /** Which side the character stands on. */
  tail = "left",
  tone = "default",
  reserve = [],
}: {
  children: ReactNode;
  className?: string;
  tail?: "left" | "bottom" | "none";
  tone?: "default" | "yes" | "retry";
  /** Other things this bubble may say here, in the same type as `children`. */
  reserve?: readonly ReactNode[];
}) {
  const tones = {
    default: "bg-paper text-ink-900 border-edge",
    yes: "bg-yes-soft text-sprout-ink border-sprout-base/40",
    retry: "bg-retry-soft text-apricot-ink border-apricot-base/40",
  } as const;

  const tailColour = {
    default: "bg-paper border-edge",
    yes: "bg-yes-soft border-sprout-base/40",
    retry: "bg-retry-soft border-apricot-base/40",
  } as const;

  return (
    <div
      className={cn(
        "relative rounded-card border px-5 py-4 shadow-soft sm:px-6 sm:py-5",
        tones[tone],
        className,
      )}
    >
      {tail !== "none" && (
        <span
          aria-hidden
          className={cn(
            "absolute size-4 rotate-45 border",
            tailColour[tone],
            tail === "left"
              ? "top-8 -left-2 border-t-0 border-r-0"
              : "-bottom-2 left-10 border-t-0 border-l-0",
          )}
        />
      )}
      <div className="relative grid">
        <div className="[grid-area:1/1]">{children}</div>
        {reserve.map((line, index) => (
          <div key={index} aria-hidden className="invisible [grid-area:1/1]">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
