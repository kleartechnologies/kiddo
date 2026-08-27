import type { Metadata } from "next";

import { ClosingCall } from "@/components/landing/ClosingCall";
import { Faq } from "@/components/landing/Faq";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { MeetKiddo } from "@/components/landing/MeetKiddo";
import { MoreGames } from "@/components/landing/MoreGames";
import { PainPoints } from "@/components/landing/PainPoints";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { TheShift } from "@/components/landing/TheShift";
import { WhyParents } from "@/components/landing/WhyParents";
import { Screen } from "@/components/ui/Screen";
import { GAMES } from "@/data/games";
import { DEFAULT_LOCALE, LOCALE_HTML_LANG } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { PLAYABLE_WORLDS } from "@/lib/worlds/activities";

/**
 * The page's own metadata, read from the default catalogue — which is to say
 * from the Bahasa Melayu one.
 *
 * It is Malay and stays Malay, and that is a decision rather than an
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
    locale: `${LOCALE_HTML_LANG[DEFAULT_LOCALE]}_MY`,
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
 * The order is an argument, not a table of contents. A parent lands here from
 * an advert on a phone, and the page walks the evening they already know:
 * screen time need not be wasted time (the hero), here is your house on a
 * Tuesday night (the four photographs), the problem was never the screen (the
 * turning point), this is what we made instead (KIDDO and its three worlds,
 * and the rest of the shelf beside them), this is what an hour of it looks
 * like (four steps and the child's real doors), this is what it gives you
 * (the parents' half), here are other parents saying it in their own words,
 * and then — only then — what it costs and the way in.
 *
 * The pain points come before the product on purpose. A parent who has not
 * yet agreed there is a problem has no reason to read a feature list, and a
 * page that opens on features is a page they close.
 *
 * Everything pictured after the turning point is the running product — the
 * world scenes, the doors, the screenshots, the parents' space — so the page
 * cannot promise something the app does not do. The four photographs before
 * it are the only images here that are not the product, and they are not
 * pretending to be.
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
        <PainPoints />
        <TheShift />
        <MeetKiddo worlds={PLAYABLE_WORLDS} />
        <MoreGames games={GAMES} />
        <HowItWorks />
        <WhyParents />
        <Testimonials />
        <Pricing />
        <Faq />
        <ClosingCall />
      </main>
      <LandingFooter />
    </Screen>
  );
}
