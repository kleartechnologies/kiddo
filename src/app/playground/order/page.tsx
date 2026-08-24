import type { Metadata } from "next";

import { OrderPlayground } from "@/components/dev/OrderPlayground";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "Order engine",
  robots: { index: false, follow: false },
};

/**
 * Internal reference for the `order` interaction engine. Deliberately not
 * linked from KIDDO World and deliberately not a game — it exists so the
 * engine can be played, measured and reviewed before any Quest uses it.
 */
export default function OrderPlaygroundPage() {
  return (
    <Screen>
      <OrderPlayground />
    </Screen>
  );
}
