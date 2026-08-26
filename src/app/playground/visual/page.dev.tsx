import type { Metadata } from "next";

import { MixedPlayground } from "@/components/dev/MixedPlayground";
import { VISUAL_PLAN, VISUAL_ROUND } from "@/components/dev/visualRound";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = {
  title: "Visual round",
  robots: { index: false, follow: false },
};

/**
 * Internal reference for the visual system: the five upgraded activities, each
 * at the level where the picture is doing the most and again at the level where
 * it has gone.
 *
 * It is the mixed round with a different list of slots, because there was
 * nothing about illustrated content that needed a second playground — which is
 * itself part of what the page is showing. Deliberately not linked from KIDDO
 * World and deliberately not a game.
 *
 * `docs/kiddo-visual-system.md` is the written half; this is the half you can
 * play. `scripts/measure-visual.mjs` drives it on eight screens.
 */
export default function VisualPlaygroundPage() {
  return (
    <Screen>
      <MixedPlayground
        steps={VISUAL_ROUND}
        plan={VISUAL_PLAN}
        title="Visual round"
        subtitle="Five upgraded activities, entry level beside the level above · internal"
      />
    </Screen>
  );
}
