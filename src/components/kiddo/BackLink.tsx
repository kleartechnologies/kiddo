"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";
import { KIDDO_HOME } from "@/lib/routes";
import { springy } from "@/lib/motion";

/**
 * The way out of any screen. Always top left, always the same shape, so a
 * child only has to learn it once.
 */
export function BackLink({
  href = KIDDO_HOME,
  label,
  className,
}: {
  href?: string;
  /** Already in the reader's language. Defaults to the way back to KIDDO World. */
  label?: string;
  className?: string;
}) {
  const t = useT();

  return (
    /* The span carries the nudge; the link carries the focus. See `GameCard`
       for why the wrapper is not a tab stop of its own. */
    <motion.span
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={springy}
      tabIndex={-1}
    >
      <Link
        href={href}
        aria-label={label ?? t("chrome.back")}
        className={cn(
          "bg-paper border-edge text-ink-700 flex size-14 items-center justify-center",
          "rounded-full border shadow-soft hover:bg-cream-50",
          className,
        )}
      >
        <ArrowLeft className="size-6" strokeWidth={2.5} aria-hidden />
      </Link>
    </motion.span>
  );
}
