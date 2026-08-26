import type { Metadata } from "next";

import { MixedPlayground } from "@/components/dev/MixedPlayground";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "Mixed round",
  robots: { index: false, follow: false },
};

/**
 * Internal reference for a round that changes interaction partway through —
 * choice, connect, order, choice, match, connect, order. Deliberately not
 * linked from KIDDO World and deliberately not a game: it exists so the seam
 * between the engines can be played and measured before a Quest uses it.
 */
export default function MixedPlaygroundPage() {
  return (
    <Screen>
      <MixedPlayground />
    </Screen>
  );
}
