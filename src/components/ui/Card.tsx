import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The base surface for everything that sits on the cream background:
 * generous radius, warm hairline border, soft shadow. No gradients, no glass.
 */
interface CardProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** `hero` uses the largest radius, for full-width feature panels. */
  radius?: "tile" | "card" | "hero";
  padding?: "none" | "sm" | "md" | "lg";
}

/* Anything else — `aria-labelledby`, `data-*` — goes straight onto the tag,
   so a card can be a labelled `section` without a wrapper around it. */
type CardRest = Omit<ComponentPropsWithoutRef<"div">, keyof CardProps>;

const RADII = {
  tile: "rounded-tile",
  card: "rounded-card",
  hero: "rounded-hero",
} as const;

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

export function Card({
  as: Tag = "div",
  children,
  className,
  radius = "card",
  padding = "md",
  ...rest
}: CardProps & CardRest) {
  return (
    <Tag
      {...rest}
      className={cn(
        "bg-paper border border-edge shadow-soft",
        RADII[radius],
        PADDING[padding],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Small rounded label. Used for age, category and access hints. */
export function Chip({
  children,
  className,
  icon,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "text-sm font-semibold whitespace-nowrap",
        "bg-ink-900/5 text-ink-700",
        className,
      )}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}
