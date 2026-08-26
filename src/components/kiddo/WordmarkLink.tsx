"use client";

import Link from "next/link";

import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { useT } from "@/lib/i18n/useLocale";
import { LANDING } from "@/lib/routes";

/**
 * The wordmark, as the way back to the landing page.
 *
 * A client component because of one string: the link has no visible text, so
 * "KIDDO home" is an `aria-label`, and an attribute cannot be filled by a
 * `<T>` leaf. Shared by `/join`, `/welcome` and the account pages rather than
 * repeated in each, so the label is translated in one place.
 */
export function WordmarkLink({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const t = useT();
  return (
    <Link
      href={LANDING}
      aria-label={t("landing.nav.home")}
      className="-mx-2 flex min-h-14 items-center rounded-2xl px-2"
    >
      <KiddoWordmark size={size} />
    </Link>
  );
}
