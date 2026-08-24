import type { ReactNode } from "react";

import { PlayGate } from "@/components/account/PlayGate";

/** Every child screen under /play opens only once the parent's KIDDO is open. */
export default function PlayLayout({ children }: { children: ReactNode }) {
  return <PlayGate>{children}</PlayGate>;
}
