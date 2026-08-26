import type { Metadata } from "next";

import { MatchPlayground } from "@/components/dev/MatchPlayground";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "Match engine",
  robots: { index: false, follow: false },
};

/**
 * Internal reference for the `match` board — a second renderer for the
 * `connect` kind. Deliberately not linked from KIDDO World and deliberately
 * not a game: it exists so the engine can be played, measured and reviewed
 * before any Quest uses it.
 */
export default function MatchPlaygroundPage() {
  return (
    <Screen>
      <MatchPlayground />
    </Screen>
  );
}
