import type { Metadata } from "next";

import { CharacterSpec } from "@/components/dev/CharacterSpec";
import { Screen } from "@/components/ui/Screen";

/**
 * Internal character specification. Deliberately not linked from KIDDO World
 * and not indexed: it is a reference for whoever touches the mascot next.
 */
export const metadata: Metadata = {
  title: "Character system",
  robots: { index: false, follow: false },
};

export default function CharacterPage() {
  return (
    <Screen>
      <CharacterSpec />
    </Screen>
  );
}
