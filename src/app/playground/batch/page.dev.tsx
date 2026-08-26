import type { Metadata } from "next";

import { BATCH_PLAN, BATCH_ROUND } from "@/components/dev/batchRound";
import { MixedPlayground } from "@/components/dev/MixedPlayground";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "New content round",
  robots: { index: false, follow: false },
};

/**
 * Internal reference for the twenty activities this batch added, across all
 * five subjects and the pairing shelf, dealt into one round by the same
 * `drawSession` and drawn by the same engines as everything else.
 *
 * It is the mixed round with a different list of slots, because there was
 * nothing about the new content that needed a second playground. Deliberately
 * not linked from KIDDO World and deliberately not a game.
 *
 * Every slot is level three — see `batchRound.ts` for why a reference round
 * does not climb.
 */
export default function BatchPlaygroundPage() {
  return (
    <Screen>
      <MixedPlayground
        steps={BATCH_ROUND}
        plan={BATCH_PLAN}
        title="New content round"
        subtitle="Twenty new activities, widest board of each · internal"
      />
    </Screen>
  );
}
