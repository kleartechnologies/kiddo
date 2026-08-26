import type { Metadata } from "next";

import { Playground } from "@/components/dev/Playground";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/**
 * Internal reference for the KIDDO design system. Deliberately not linked from
 * KIDDO World — it exists so we can review tokens and components directly.
 */
export default function PlaygroundPage() {
  return (
    <Screen>
      <Playground />
    </Screen>
  );
}
