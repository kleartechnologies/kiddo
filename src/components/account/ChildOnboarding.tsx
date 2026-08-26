"use client";

import { ArrowRight, Smile } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createChildProfile, suggestedChildName } from "@/lib/cloud/session";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { MAX_CHILD_NAME_LENGTH } from "@/lib/profile/child";

/**
 * The one question after creating an account: who is playing?
 *
 * A first name, nothing else — the same rule as the device-only name box,
 * so "Noah Whitfield" is still kept as "Noah". If a name was already typed
 * on this device it is offered back, and any progress already on the
 * device is carried into the new profile by the journey store when the
 * profile is created (see `bindJourneyToCloud`).
 */
export function ChildOnboarding({
  heading: Heading = "h1",
  title = "onboarding.title",
}: {
  /** `h2` where the page already has its own heading — see `/welcome`. */
  heading?: "h1" | "h2";
  /** A catalogue key rather than a sentence, so `/welcome` cannot hand this
   *  card an English heading above a Malay question. */
  title?: MessageKey;
} = {}) {
  const [name, setName] = useState(() => suggestedChildName() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const t = useT();
  const id = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const kept = await createChildProfile(name);
      if (!kept) setError("onboarding.error.empty");
    } catch {
      setError("onboarding.error.save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section" aria-labelledby={`${id}-title`} padding="lg" radius="hero" className="flex flex-col gap-6" data-onboarding>
      <div className="flex items-start gap-4">
        <span className="bg-sage-soft text-sage-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Smile className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <Heading id={`${id}-title`} className="font-display text-2xl font-semibold sm:text-3xl">
            {t(title)}
          </Heading>
          <p className="text-ink-700 text-base leading-snug">
            {t("onboarding.blurb")}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-name`} className="text-ink-700 text-base font-semibold">
            {t("onboarding.field")}
          </label>
          <input
            id={`${id}-name`}
            type="text"
            name="childName"
            autoComplete="off"
            autoCapitalize="words"
            maxLength={MAX_CHILD_NAME_LENGTH * 2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="bg-paper border-edge text-ink-900 placeholder:text-ink-300 min-h-14 rounded-tile border-2 px-4 text-lg"
            data-onboarding-name
          />
        </div>
        <p aria-live="polite" role="status" className="text-apricot-ink min-h-5 text-sm font-semibold" data-onboarding-error>
          {error ? t(error) : ""}
        </p>
        <Button type="submit" size="md" icon={<ArrowRight className="size-5" aria-hidden />} iconRight className="self-start" aria-busy={busy} data-onboarding-submit>
          {t(busy ? "common.oneMoment" : "sub.start")}
        </Button>
      </form>
    </Card>
  );
}
