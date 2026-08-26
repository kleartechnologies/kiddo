"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { AUDIO_SETTINGS_KEY } from "@/lib/audio/settings";
import { ACCOUNT_HINT_KEY } from "@/lib/cloud/session";
import { FIREBASE_PROJECT_ID } from "@/lib/firebase/config";
import { around, formatDay } from "@/lib/i18n/format";
import { useTranslation } from "@/lib/i18n/useLocale";
import { JOURNEY_KEY } from "@/lib/journey/useJourney";
import { CHILD_NAME_KEY } from "@/lib/profile/child";
import { KIDDO_HOME, PARENTS } from "@/lib/routes";

/**
 * The body of the privacy page, in the reader's language.
 *
 * A client component only so that it can be read in Malay: the page shell
 * around it stays a server component, and its metadata is still built from
 * the English catalogue at build time, so the page is still static HTML.
 *
 * Two rules hold this document together. The storage keys and the Firebase
 * project id are still imported from the modules that own them, so a
 * translation can no more invent a key than the English page could. And the
 * section ids are written down here rather than derived from the headings,
 * so a link to `#privacy-stores` points at the same section in both
 * languages — an anchor that moved when the language changed would be a
 * broken link in every message anyone had ever sent.
 */

/** Reviewed on this day; written out by `Intl` in whichever language reads it. */
const LAST_REVIEWED = Date.UTC(2026, 7, 24);

const SHORT = ["1", "2", "3", "4", "5", "6"] as const;
const CLOUD = ["1", "2", "3", "4", "5"] as const;
const NOT = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
const CONTROLS = ["1", "2", "3", "4", "5", "6"] as const;

export function PrivacyDocument() {
  const { locale, t } = useTranslation();

  /* The two sentences with a value inside them. Both are split at the hole
     the translator left, so the words either side stay theirs. */
  const hint = around(t("privacy.stores.session"), "key");
  const project = around(t("privacy.where.cloud"), "project");

  return (
    <main className="flex flex-col gap-8 py-8 select-text sm:gap-10 sm:py-12">
      <header className="flex flex-col gap-3">
        <p className="text-ink-500 font-display text-sm font-semibold tracking-wide uppercase">
          {t("privacy.eyebrow")}
        </p>
        <h1 className="font-display text-4xl leading-tight font-bold text-balance sm:text-5xl">
          {t("privacy.title")}
        </h1>
        <p className="text-ink-700 text-lg leading-relaxed text-pretty sm:text-xl">
          {t("privacy.lead")}
        </p>
        <p className="text-ink-500 text-sm">
          {t("privacy.reviewed", { date: formatDay(LAST_REVIEWED, locale) })}
        </p>
      </header>

      <Section id="short" title={t("privacy.s.short")}>
        <ul className="flex list-none flex-col gap-2">
          {SHORT.map((n) => (
            <Point key={n}>{t(`privacy.short.${n}`)}</Point>
          ))}
        </ul>
      </Section>

      <Section id="stores" title={t("privacy.s.stores")}>
        <p>{t("privacy.stores.intro")}</p>
        <dl className="mt-4 flex flex-col gap-4">
          <Stored name={t("privacy.stored.name.title")} id={CHILD_NAME_KEY}>
            {t("privacy.stored.name.body")}
          </Stored>
          <Stored name={t("privacy.stored.journey.title")} id={JOURNEY_KEY}>
            {t("privacy.stored.journey.body")}
          </Stored>
          <Stored name={t("privacy.stored.audio.title")} id={AUDIO_SETTINGS_KEY}>
            {t("privacy.stored.audio.body")}
          </Stored>
        </dl>
        <p className="mt-4">
          {hint.before}
          <code className="bg-cream-50 rounded px-1 text-[0.9em]">{ACCOUNT_HINT_KEY}</code>
          {hint.after}
        </p>
        <p className="mt-4">{t("privacy.stores.cloudIntro")}</p>
        <ul className="mt-3 flex list-none flex-col gap-2">
          {CLOUD.map((n) => (
            <Point key={n}>{t(`privacy.cloud.${n}`)}</Point>
          ))}
        </ul>
        <p className="mt-4">{t("privacy.stores.stripe")}</p>
        <p className="mt-4">{t("privacy.stores.noName")}</p>
      </Section>

      <Section id="where" title={t("privacy.s.where")}>
        <p>{t("privacy.where.device")}</p>
        <p>
          {project.before}
          <code className="bg-cream-50 rounded px-1 text-[0.9em]">{FIREBASE_PROJECT_ID}</code>
          {project.after}
        </p>
        <p>{t("privacy.where.rules")}</p>
        <p>{t("privacy.where.billing")}</p>
        <p>{t("privacy.where.noAccount")}</p>
      </Section>

      <Section id="why" title={t("privacy.s.why")}>
        <p>{t("privacy.why.body")}</p>
      </Section>

      <Section id="not" title={t("privacy.s.not")}>
        <ul className="flex list-none flex-col gap-2">
          {NOT.map((n) => (
            <Point key={n}>{t(`privacy.not.${n}`)}</Point>
          ))}
        </ul>
        <p className="text-ink-500 mt-4 text-sm leading-snug">{t("privacy.not.logs")}</p>
      </Section>

      <Section id="controls" title={t("privacy.s.controls")}>
        <p>{t("privacy.controls.intro")}</p>
        <ul className="mt-3 flex list-none flex-col gap-2">
          {CONTROLS.map((n) => (
            <Point key={n}>{t(`privacy.controls.${n}`)}</Point>
          ))}
        </ul>
        <Link
          href={PARENTS}
          className="bg-paper border-edge text-ink-900 hover:bg-cream-50 mt-4 inline-flex min-h-12 items-center rounded-full border px-5 text-base font-semibold shadow-soft transition-colors"
        >
          {t("privacy.controls.cta")}
        </Link>
        <p className="mt-4">{t("privacy.controls.after")}</p>
      </Section>

      <Section id="children" title={t("privacy.s.children")}>
        <p>{t("privacy.children.body")}</p>
      </Section>

      <Section id="changes" title={t("privacy.s.changes")}>
        <p>{t("privacy.changes.body")}</p>
      </Section>

      <Section id="contact" title={t("privacy.s.contact")}>
        <p>
          {t("privacy.contact.body")}{" "}
          <span className="bg-honey-soft text-honey-ink rounded-md px-1.5 py-0.5 font-semibold">
            {t("privacy.contact.todo")}
          </span>
        </p>
      </Section>

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-700 text-base">{t("privacy.done")}</p>
        <Link
          href={KIDDO_HOME}
          className="bg-honey-base text-honey-ink inline-flex min-h-12 items-center justify-center rounded-full px-5 font-display text-base font-semibold shadow-[0_4px_0_0_var(--color-honey-deep)]"
        >
          {t("page.openKiddo")}
        </Link>
      </Card>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const anchor = `privacy-${id}`;
  return (
    <section aria-labelledby={anchor} className="flex flex-col gap-3">
      <h2 id={anchor} className="font-display text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      <div className="text-ink-700 flex flex-col gap-3 text-base leading-relaxed sm:text-lg">
        {children}
      </div>
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
        <code className="bg-cream-100 text-ink-700 rounded-md px-2 py-0.5 font-mono text-sm">
          {id}
        </code>
      </dt>
      <dd className="text-ink-700 mt-2 text-base leading-relaxed">{children}</dd>
    </div>
  );
}
