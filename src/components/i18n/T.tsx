"use client";

import type { MessageKey, Vars } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/useLocale";

/**
 * One translated sentence, for the places a server component still owns.
 *
 * Most of KIDDO's chrome is client-rendered and simply calls `useT()`. A few
 * page shells are not: `/join` reads its plan from `searchParams` on the
 * server, `/parents` and `/welcome` are plain layouts around a gate, and
 * turning any of them into a client component to translate a badge would
 * move work into the browser for no reason. This is the small seam instead —
 * a client leaf that renders one key, dropped into a server tree.
 *
 * It is deliberately not general. There is no `as`, no `className`, no
 * children: anything that wants those wants a component of its own, and a
 * `<T>` that could style itself would quickly become the way every string on
 * the site is written, which is exactly the scattering the catalogue exists
 * to prevent. Attribute text — an `aria-label`, a `placeholder`, an `alt` —
 * cannot come from here at all, because it has to be a string; those live in
 * client components that hold the whole element.
 */
export function T({ k, vars }: { k: MessageKey; vars?: Vars }) {
  return <>{useT()(k, vars)}</>;
}
