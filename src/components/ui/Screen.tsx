import type { ReactNode } from "react";

import {
  KiddoWorldBackground,
  type KiddoWorldBackgroundProps,
} from "@/components/kiddo/world/KiddoWorldBackground";
import { cn } from "@/lib/cn";

/**
 * How wide the page's content column is allowed to get.
 *
 * `shelf` is the library: a grid of cards rather than a column of prose, so
 * once the screen is wide enough to hold four columns it earns the extra
 * width. Everything inside a screen shares one of these, which is what keeps
 * a section heading on the same left edge as the cards underneath it.
 */
const WIDTHS = {
  wide: "max-w-6xl",
  narrow: "max-w-3xl",
  shelf: "max-w-6xl xl:max-w-[80rem]",
} as const;

/**
 * The responsive page frame every KIDDO screen sits inside.
 *
 * Handles the world behind the page, safe-area insets on phones, and the
 * reading width. Screens compose this rather than re-inventing page padding.
 *
 * The background is here rather than in the pages for the same reason the
 * padding is: there is one KIDDO World, and a screen picks which corner of
 * it it is standing in — it does not get to draw its own.
 */
export function Screen({
  children,
  className,
  width = "wide",
  theme,
  detail,
}: {
  children: ReactNode;
  className?: string;
  width?: keyof typeof WIDTHS;
} & KiddoWorldBackgroundProps) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip">
      <KiddoWorldBackground theme={theme} detail={detail} />
      <div
        className={cn(
          "relative mx-auto flex w-full flex-1 flex-col",
          /* Left and right are the same 20/32px they have always been until
             a notch or a rounded corner claims more — which only happens
             once a page opts into the full viewport, and which is the whole
             difference between an installed KIDDO in landscape on an iPhone
             and one with its first letter under the camera housing. On every
             other screen the insets are zero and these read as px-5 sm:px-8. */
          "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]",
          "sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))]",
          "pt-[max(1.25rem,env(safe-area-inset-top))]",
          "pb-[max(1.75rem,env(safe-area-inset-bottom))]",
          WIDTHS[width],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
