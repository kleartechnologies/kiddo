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
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { PLAYABLE_WORLDS } from "@/lib/worlds/activities";

/**
 * The page's own metadata, read from the English catalogue.
 *
 * It is English and stays English, and that is a decision rather than an
 * omission. `metadata` is evaluated when the page is built, long before any
 * browser has said which language it wants; making it follow the reader
 * would mean rendering this page per request — the one thing `next.config.ts`
 * refuses on purpose, so that the landing page stays a static file a CDN can
 * hand out. What a person actually reads is translated the moment the page
 * hydrates, and `<html lang>` follows them (see `components/i18n/HtmlLang`).
 *
 * There are no `alternates.languages` entries because there is no second URL
 * to point at: KIDDO has one address per page and carries the preference with
 * the reader (§15). Inventing `/ms` here would advertise a page that does not
 * exist.
 */
const meta = (key: Parameters<typeof translate>[1]) => translate(DEFAULT_LOCALE, key);

export const metadata: Metadata = {
  title: { absolute: meta("landing.meta.title") },
  description: meta("landing.meta.description"),
  /* The canonical resolves against `metadataBase` in `app/layout.tsx`, which
     is only set when NEXT_PUBLIC_SITE_URL is configured (TODO(launch)). Without
     it, no canonical is emitted rather than an invented domain. */
  alternates: process.env.NEXT_PUBLIC_SITE_URL ? { canonical: "/" } : {},
  openGraph: {
    title: meta("landing.meta.title"),
    description: meta("landing.meta.ogDescription"),
    type: "website",
    siteName: "KIDDO",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: meta("landing.meta.title"),
    description: meta("landing.meta.twitterDescription"),
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
