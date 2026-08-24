import type { Metadata } from "next";

import { ConnectPlayground } from "@/components/dev/ConnectPlayground";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "Connect engine",
  robots: { index: false, follow: false },
};

/**
 * Internal reference for the `connect` interaction engine. Deliberately not
 * linked from KIDDO World and deliberately not a game — it exists so the
 * engine can be played, measured and reviewed before any Quest uses it.
 */
export default function ConnectPlaygroundPage() {
  return (
    <Screen>
      <ConnectPlayground />
    </Screen>
  );
}
