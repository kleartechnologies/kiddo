import type { Metadata } from "next";

import { ClosingCall } from "@/components/landing/ClosingCall";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { JoinNotices } from "@/components/landing/JoinNotices";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { ParentSection } from "@/components/landing/ParentSection";
import { Pricing } from "@/components/landing/Pricing";
import { Progression } from "@/components/landing/Progression";
import { ScreenTime } from "@/components/landing/ScreenTime";
import { WorldShowcase } from "@/components/landing/WorldShowcase";
import { Screen } from "@/components/ui/Screen";
import { PLAYABLE_WORLDS } from "@/lib/worlds/activities";

export const metadata: Metadata = {
  title: { absolute: "KIDDO — Learning should feel like an adventure" },
  description:
    "KIDDO turns early learning into playful little worlds for children aged 4 to 8: a garden to count in, animals to guide home, and a storybook full of words. One subscription for the parent; no ads, nothing to buy inside.",
  /* The canonical resolves against `metadataBase` in `app/layout.tsx`, which
     is only set when NEXT_PUBLIC_SITE_URL is configured (TODO(launch)). Without
     it, no canonical is emitted rather than an invented domain. */
  alternates: process.env.NEXT_PUBLIC_SITE_URL ? { canonical: "/" } : {},
  openGraph: {
    title: "KIDDO — Learning should feel like an adventure",
    description:
      "Playful little worlds for early learning. Children count in a garden, help animals home and discover words in a storybook.",
    type: "website",
    siteName: "KIDDO",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "KIDDO — Learning should feel like an adventure",
    description:
      "Playful little worlds for early learning, for children aged 4 to 8.",
  },
};

/**
 * The public front door. A parent arrives here; a child lives at `/play`.
 *
 * Read top to bottom the way a parent reads it in the thirty seconds they
 * give a new product: what it believes, what it is instead of, what is in
 * it, how one visit goes, what stays behind, what the grown-up gets, what
 * it costs, and the way in. Everything pictured is the running product —
 * the world scenes, the doors, the screenshots — so the page cannot promise
 * something the app does not do.
 *
 * The way in is `#pricing`, not `/play`. KIDDO is a subscription: a parent
 * chooses a plan, makes an account and pays before there is anything for a
 * child to open, and the page says so rather than dropping them into a
 * product they cannot use.
 */
export default function LandingPage() {
  return (
    <Screen width="wide" detail="quiet">
      <LandingHeader />
      <main className="flex flex-col gap-20 select-text sm:gap-28">
        <LandingHero />
        <ScreenTime />
        <WorldShowcase worlds={PLAYABLE_WORLDS} />
        <HowItWorks />
        <Progression />
        <ParentSection />
        <Pricing />
        <ClosingCall />
      </main>
      <LandingFooter />
      <JoinNotices />
    </Screen>
  );
}
