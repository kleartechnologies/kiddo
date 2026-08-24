import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { AUDIO_SETTINGS_KEY } from "@/lib/audio/settings";
import { ACCOUNT_HINT_KEY } from "@/lib/cloud/session";
import { FIREBASE_PROJECT_ID } from "@/lib/firebase/config";
import { JOURNEY_KEY } from "@/lib/journey/useJourney";
import { CHILD_NAME_KEY } from "@/lib/profile/child";
import { KIDDO_HOME, PARENTS, PRIVACY } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What KIDDO stores on your device and in a parent account, why, and what it does not collect.",
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
 * this page changes in the same commit.
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
const LAST_REVIEWED = "24 August 2026";

export default function PrivacyPage() {
  return (
    <Screen width="narrow" detail="quiet">
      <LandingHeader />
      <main className="flex flex-col gap-8 py-8 select-text sm:gap-10 sm:py-12">
        <header className="flex flex-col gap-3">
          <p className="text-ink-500 font-display text-sm font-semibold tracking-wide uppercase">
            Privacy
          </p>
          <h1 className="font-display text-4xl leading-tight font-bold text-balance sm:text-5xl">
            What KIDDO stores, and what it doesn’t.
          </h1>
          <p className="text-ink-700 text-lg leading-relaxed text-pretty sm:text-xl">
            KIDDO is built so that there is almost nothing to tell you. This page describes
            exactly what the current version keeps, where, and why — in the words a parent
            would use, not a lawyer.
          </p>
          <p className="text-ink-500 text-sm">Last reviewed {LAST_REVIEWED}. Reflects the version of KIDDO you are using now.</p>
        </header>

        <Section title="The short version">
          <ul className="flex list-none flex-col gap-2">
            <Point>Your child never has an account and is never asked to sign in. KIDDO does not know who your child is.</Point>
            <Point>
              Without a parent account, your child’s progress and first name stay in this
              browser, on this device. They are not sent to KIDDO or to anyone else.
            </Point>
            <Point>
              A grown-up can create a parent account — an email address and a password — so
              progress follows the child between devices. Then the first name and the journey
              are also kept under that account, and nothing else is.
            </Point>
            <Point>
              KIDDO is a subscription paid by the parent. The payment is taken by Stripe, which
              keeps the card details; KIDDO never sees or stores a card number.
            </Point>
            <Point>KIDDO has no ads, no analytics and no tracking, and nothing is ever sold or shown to your child.</Point>
            <Point>You can change or erase everything KIDDO keeps, and cancel the subscription, from the parent area at any time.</Point>
          </ul>
        </Section>

        <Section title="What KIDDO stores">
          <p>
            On the device, KIDDO keeps three small things using your browser’s local storage.
            Each is listed with the exact name it is stored under, so you can check for
            yourself.
          </p>
          <dl className="mt-4 flex flex-col gap-4">
            <Stored name="A first name" id={CHILD_NAME_KEY}>
              Typed by a grown-up in the parent area so KIDDO can say “Hi, Noah!”. Only the
              first word is kept; a surname typed into the box is thrown away before saving.
              Leaving the box empty is fine — KIDDO simply says “Hi!”.
            </Stored>
            <Stored name="The journey" id={JOURNEY_KEY}>
              The list of activities your child has finished, and which world they were last
              in. This is what draws the keepsakes on the doors, powers “Continue your
              adventure”, and fills the parent dashboard. It contains no answers, no timings,
              and no scores — only which doors have been opened.
            </Stored>
            <Stored name="The sound setting" id={AUDIO_SETTINGS_KEY}>
              Whether sound is on, and how loud the music and the effects are.
            </Stored>
          </dl>
          <p className="mt-4">
            A fourth value, a random number for the current tab, decides which of KIDDO’s
            greetings is shown. It lives in session storage and disappears when the tab is
            closed. When a parent has signed in on this device, a fifth value named{" "}
            <code className="bg-cream-50 rounded px-1 text-[0.9em]">{ACCOUNT_HINT_KEY}</code>{" "}
            holds a single “yes” so KIDDO knows to restore the sign-in; it contains no
            personal information. The sign-in itself is kept by Firebase Authentication in
            the same browser storage, as any signed-in website does.
          </p>
          <p className="mt-4">
            With a parent account, KIDDO also keeps in the cloud, under your account:
          </p>
          <ul className="mt-3 flex list-none flex-col gap-2">
            <Point>Your email address and password, held by Firebase Authentication. KIDDO never sees the password; it is stored as a hash by the sign-in service.</Point>
            <Point>Your child’s first name — the same word as above, and nothing more. No surname, date of birth, photo or gender is ever asked for.</Point>
            <Point>Your child’s journey — the same list of finished activities as above.</Point>
            <Point>
              The state of your subscription: whether it is active, which plan (monthly or
              yearly), when the current period ends, and the identifiers Stripe gives your
              customer record and subscription so the two services can refer to the same
              thing. These are written only by KIDDO’s server when Stripe reports a change;
              the app in your browser can read them but never change them.
            </Point>
            <Point>The dates these records were created and last changed.</Point>
          </ul>
          <p className="mt-4">
            Your payment details are held by Stripe, not by KIDDO. When you subscribe you are
            taken to a page served by Stripe, where you enter your card; Stripe keeps your
            email address, the card, and the history of payments and invoices for that
            subscription, under its own privacy policy. KIDDO tags the Stripe record with your
            account’s identifier so the payment can be matched to your account, and nothing
            else about you or your child.
          </p>
          <p className="mt-4">
            There is no field for your own name, and no profile of you beyond the email
            address you sign in with.
          </p>
        </Section>

        <Section title="Where it is stored">
          <p>
            On your device, always — in the browser you opened KIDDO in, under the address
            you opened it at. If you install KIDDO to your home screen, it uses that same
            local storage, so progress carries across between the installed app and the
            browser it was installed from on the same device.
          </p>
          <p>
            With a parent account, the first name, the journey and the subscription state are also stored in Google’s
            Firebase — specifically Firebase Authentication for the sign-in and Cloud
            Firestore for the child profile and journey — in a project that belongs to KIDDO
            (its identifier is <code className="bg-cream-50 rounded px-1 text-[0.9em]">{FIREBASE_PROJECT_ID}</code>).
            The device keeps a copy of the journey so a return visit opens instantly; while
            you are signed in, the cloud copy is the one that counts, and the device copy is
            refreshed from it.
          </p>
          <p>
            Access rules enforced by Firestore itself — not only by the app — mean that an
            account can read and write only its own record, its own child profile, and that
            child’s journey. Nobody who is not signed in can read anything, and no account
            can list or look up another account’s child. TODO(launch): state the Firestore
            region (where Google stores the data) here once the project’s location is
            confirmed.
          </p>
          <p>
            Billing records — card, payments, invoices, receipts — are stored by Stripe, in
            Stripe’s systems, under the same email address you use for your account.
          </p>
          <p>
            Without an account, KIDDO has nowhere else to keep anything: opening KIDDO in a
            different browser, or on a different device, starts with a fresh, empty journey.
          </p>
        </Section>

        <Section title="Why it is stored">
          <p>
            So that a return visit feels like a return: KIDDO remembers where your child was,
            what they have found, and what to call them. A parent account exists for one
            reason more — so that the same journey is there on the tablet at home and the
            phone in the car. The subscription state is kept so KIDDO knows whether to open
            for your child, and so the parent area can show you your plan and renewal date.
            Nothing is kept for marketing, for measurement, or for building a profile. Your
            email address is used to sign you in, to send password-reset and verification
            emails, and — by Stripe — to send receipts for your subscription.
          </p>
        </Section>

        <Section title="What is not stored or collected">
          <ul className="flex list-none flex-col gap-2">
            <Point>No child account, child email, child password or child login of any kind.</Point>
            <Point>No date of birth, photo, surname, school, or anything about your child beyond an optional first name.</Point>
            <Point>No record of individual answers, right or wrong, or how long a round took.</Point>
            <Point>No location, contacts, camera or microphone access. KIDDO never asks for them.</Point>
            <Point>No cookies set by KIDDO, and no third-party scripts for analytics, advertising or social plugins.</Point>
            <Point>No card numbers, expiry dates or security codes. These are entered on Stripe’s page and held by Stripe.</Point>
            <Point>No prices, payment screens, upgrade prompts or billing messages on any of your child’s screens. All of that lives in the parent area.</Point>
            <Point>
              Without a parent account, no requests to any service other than the one that
              serves KIDDO itself. With an account, the other services contacted are Firebase
              (sign-in and storage) and Stripe (checkout and billing), and only from the
              parent area or to save the journey.
            </Point>
          </ul>
          <p className="text-ink-500 mt-4 text-sm leading-snug">
            Like any website, the hosting service that delivers KIDDO, and Firebase when an
            account is used, may keep ordinary access logs (for example, the address and time
            of a request) for security and reliability. TODO(launch): name the hosting
            provider and its log retention here before going live.
          </p>
        </Section>

        <Section title="Parent controls">
          <p>Everything above is in your hands from the parent area:</p>
          <ul className="mt-3 flex list-none flex-col gap-2">
            <Point>Add, change or remove the first name. With an account, the change is saved to the account too.</Point>
            <Point>“Start the adventure over” erases every finished activity and keepsake — on this device and, with an account, in the cloud. The name and the account are kept.</Point>
            <Point>“Sign out” ends the sign-in on this device and clears the cached name and journey from it. The account and its cloud copy are untouched.</Point>
            <Point>“Manage subscription” opens Stripe’s billing page for your account, where you can change the card, see invoices, or cancel. A cancelled subscription keeps KIDDO open until the end of the period already paid for, and is not charged again.</Point>
            <Point>“Delete account” first cancels any subscription still running, removes your Stripe customer record, then removes the sign-in, the child profile and the journey from Firebase, and the cached copies from this device. It cannot be undone. For safety, you will be asked to sign in again first if your sign-in is old. Stripe keeps records of past payments as its own rules require.</Point>
            <Point>Without an account, clearing this site’s data in your browser settings removes everything at once.</Point>
          </ul>
          <Link
            href={PARENTS}
            className="bg-paper border-edge text-ink-900 hover:bg-cream-50 mt-4 inline-flex min-h-12 items-center rounded-full border px-5 text-base font-semibold shadow-soft transition-colors"
          >
            Open the parent area
          </Link>
          <p className="mt-4">
            The parent area is reached by a “For grown-ups” button. With an account, it is
            behind your sign-in; without one, it is simply set apart from the child’s screens.
            The child’s screens never show a sign-in, an email address or an account setting.
          </p>
        </Section>

        <Section title="Children">
          <p>
            KIDDO is made for children aged 4 to 8 to use with a grown-up nearby. The account,
            when there is one, belongs to the parent; a child is a profile inside it holding
            an optional first name and a list of opened doors, and nothing else. KIDDO does
            not share or sell this information. We have not yet had this statement reviewed
            by a lawyer against any specific children’s-privacy law; we will say so here when
            we have.
          </p>
        </Section>

        <Section title="When this changes">
          <p>
            If a future version of KIDDO keeps anything more than what is listed here, this
            page will change first, and it will say plainly what is kept and where. Nothing
            leaves your device unless a grown-up has chosen to create an account.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this page are welcome.{" "}
            <span className="bg-honey-soft text-honey-ink rounded-md px-1.5 py-0.5 font-semibold">
              TODO(launch): add a support email address and the name of the company or person
              responsible for KIDDO.
            </span>
          </p>
        </Section>

        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-700 text-base">Done reading? KIDDO is waiting.</p>
          <Link
            href={KIDDO_HOME}
            className="bg-honey-base text-honey-ink inline-flex min-h-12 items-center justify-center rounded-full px-5 font-display text-base font-semibold shadow-[0_4px_0_0_var(--color-honey-deep)]"
          >
            Open KIDDO
          </Link>
        </Card>
      </main>
      <LandingFooter />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={slug(title)} className="flex flex-col gap-3">
      <h2 id={slug(title)} className="font-display text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      <div className="text-ink-700 flex flex-col gap-3 text-base leading-relaxed sm:text-lg">{children}</div>
    </section>
  );
}

function Point({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className="bg-sage-base mt-[0.7em] size-2 shrink-0 rounded-full" />
      <span>{children}</span>
    </li>
  );
}

function Stored({ name, id, children }: { name: string; id: string; children: ReactNode }) {
  return (
    <div className="bg-paper border-edge rounded-card border p-5 shadow-soft">
      <dt className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-display text-ink-900 text-xl font-semibold">{name}</span>
        <code className="bg-cream-100 text-ink-700 rounded-md px-2 py-0.5 font-mono text-sm">{id}</code>
      </dt>
      <dd className="text-ink-700 mt-2 text-base leading-relaxed">{children}</dd>
    </div>
  );
}

function slug(title: string): string {
  return `privacy-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
}
