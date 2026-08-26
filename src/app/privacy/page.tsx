import type { Metadata } from "next";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PrivacyDocument } from "@/components/privacy/PrivacyDocument";
import { Screen } from "@/components/ui/Screen";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { PRIVACY } from "@/lib/routes";

export const metadata: Metadata = {
  title: translate(DEFAULT_LOCALE, "meta.privacy.title"),
  description: translate(DEFAULT_LOCALE, "meta.privacy.description"),
  /* A page to be read by someone who is already here, not found from a
     search result. Indexable but not promoted. */
  robots: { index: true, follow: true },
  alternates: process.env.NEXT_PUBLIC_SITE_URL ? { canonical: PRIVACY } : {},
};

/**
 * What KIDDO stores, in plain words.
 *
 * Every sentence on this page is checked against the code it describes: the
 * storage keys are imported from the modules that own them, so the page
 * cannot name a key that no longer exists. The account section describes
 * `src/lib/firebase/backend.ts` and `firestore.rules`; when those change,
 * this page changes in the same commit — and, now, in both catalogues.
 *
 * The words themselves live in `PrivacyDocument`, which reads them from the
 * message catalogue so that a parent who chose Malay is told about their
 * child's data in Malay. This shell stays on the server so the page keeps
 * its metadata and its static HTML.
 *
 * The facts, as of this build:
 *   - a child never has an account and never signs in
 *   - without a parent account, everything stays in the browser's
 *     localStorage on the device KIDDO is opened on
 *   - a parent may create an account (email + password, Firebase
 *     Authentication); then the child's first name and journey are kept in
 *     Cloud Firestore under that account, and cached on the device
 *   - KIDDO is a paid subscription for parents; Stripe takes the payment
 *     and holds the card, KIDDO keeps only the subscription's state and
 *     Stripe's identifiers, written by the server from Stripe's webhook
 *   - there is no analytics script, no tracking pixel, no advertising
 */
export default function PrivacyPage() {
  return (
    <Screen width="narrow" detail="quiet">
      <LandingHeader />
      <PrivacyDocument />
      <LandingFooter />
    </Screen>
  );
}
