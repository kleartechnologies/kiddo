"use client";

import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";

/**
 * How far through a round the child is. Dots rather than a bar or a number,
 * because a four year old can count dots but cannot read "3 / 8".
 */
export function ProgressDots({
  total,
  current,
  className,
}: {
  total: number;
  /** Zero-based index of the step being played. */
  current: number;
  className?: string;
}) {
  const t = useT();

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={t("chrome.step", { current: current + 1, total })}
      className={cn("flex items-center gap-1.5", className)}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "rounded-full transition-all duration-300",
            index < current && "bg-sprout-base size-2.5",
            index === current && "bg-honey-base h-2.5 w-6",
            index > current && "bg-ink-900/12 size-2.5",
          )}
        />
      ))}
    </div>
  );
}
