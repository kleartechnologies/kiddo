import type { Metadata } from "next";

import { MagicPlayground } from "@/components/dev/MagicPlayground";
import { Screen } from "@/components/ui/Screen";

/** Internal reference page for the Magic Motion vocabulary. Never indexed. */
export const metadata: Metadata = {
  title: "Magic Motion",
  robots: { index: false, follow: false },
};

export default function MagicPlaygroundPage() {
  return (
    <Screen>
      <MagicPlayground />
    </Screen>
  );
}
