"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";

import { useSound } from "@/lib/audio/useAudio";
import { cn } from "@/lib/cn";
import { springy } from "@/lib/motion";

/**
 * The KIDDO button.
 *
 * A solid bottom edge makes it read as a physical toy button; pressing sinks
 * it into that edge. Sizes start large because the primary user is four.
 *
 * It clicks when it is pressed — the soft `button` reply, not a game sound.
 * Every real button in the product is this component, so "Play again" and
 * "Let's play!" are heard as well as felt without either of them asking for
 * it. `ButtonLink` is deliberately silent: it is navigation, and the screen
 * it arrives at is the feedback.
 */

export type ButtonVariant = "primary" | "soft" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fill the width of the parent. Common on mobile. */
  block?: boolean;
  icon?: ReactNode;
  /** Place the icon after the label instead of before. */
  iconRight?: boolean;
  children: ReactNode;
  className?: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-honey-base text-honey-ink shadow-[0_5px_0_0_var(--color-honey-deep)] hover:bg-honey-base/95",
  soft: "bg-paper text-ink-900 border-2 border-edge shadow-[0_5px_0_0_var(--color-edge)] hover:bg-cream-50",
  quiet: "bg-transparent text-ink-700 hover:bg-ink-900/5",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-base gap-1.5",
  md: "min-h-14 px-6 text-lg gap-2",
  lg: "min-h-16 px-8 text-xl gap-2.5 sm:min-h-[4.5rem] sm:text-2xl",
};

type StyleProps = Pick<BaseProps, "variant" | "size" | "block" | "className">;

function buttonClasses({
  variant = "primary",
  size = "md",
  block,
  className,
}: StyleProps): string {
  return cn(
    "inline-flex items-center justify-center rounded-full font-display font-semibold",
    "whitespace-nowrap",
    "select-none transition-colors",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}

/** Press feedback: sink onto the solid edge, then spring back. */
const press = {
  whileHover: { y: -2 },
  whileTap: { y: 3 },
  transition: springy,
} as const;

type ButtonProps = BaseProps &
  Omit<HTMLMotionProps<"button">, keyof BaseProps | "ref">;

export function Button({
  variant,
  size,
  block,
  icon,
  iconRight,
  children,
  className,
  onClick,
  ...rest
}: ButtonProps) {
  const play = useSound();

  const content = (
    <>
      {icon && !iconRight ? <span aria-hidden>{icon}</span> : null}
      {children}
      {icon && iconRight ? <span aria-hidden>{icon}</span> : null}
    </>
  );

  return (
    <motion.button
      type="button"
      {...press}
      /* The sound is a property of pressing the button, so it happens whether
         or not this particular one was given something to do. */
      onClick={(event) => {
        play("button");
        onClick?.(event);
      }}
      className={buttonClasses({ variant, size, block, className })}
      {...rest}
    >
      {content}
    </motion.button>
  );
}

type ButtonLinkProps = BaseProps & { href: string } & Omit<
    ComponentProps<typeof Link>,
    "children" | "className" | "href"
  >;

/** Same button, rendered as a link. Used for navigation, never for actions. */
export function ButtonLink({
  variant,
  size,
  block,
  icon,
  iconRight,
  children,
  className,
  href,
  ...rest
}: ButtonLinkProps) {
  return (
    <motion.span {...press} className={cn("inline-flex", block && "w-full")}>
      <Link
        href={href}
        className={buttonClasses({ variant, size, block, className })}
        {...rest}
      >
        {icon && !iconRight ? <span aria-hidden>{icon}</span> : null}
        {children}
        {icon && iconRight ? <span aria-hidden>{icon}</span> : null}
      </Link>
    </motion.span>
  );
}
