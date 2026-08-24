"use client";

import { useState, type ReactNode } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { Screen } from "@/components/ui/Screen";
import { sessionHasAccess, useSession } from "@/lib/cloud/session";
import { PARENTS } from "@/lib/routes";

/**
 * The child's side of the parent's account, which is to say: nothing.
 *
 * Wraps the play routes. On a device-only build it is a pass-through. With
 * accounts, it shows the world once the cloud says the parent's KIDDO is
 * open — and then stays open for as long as this layout lives, so an
 * account that lapses mid-session never pulls a game out from under a
 * child. The next visit starts closed again, and the grown-up sorts it out
 * in the parent area.
 *
 * The closed screen is for a child: a friend, a sentence, and a door for
 * a grown-up. Nothing about money, plans or problems.
 */
export function PlayGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const [opened, setOpened] = useState(false);
  const allowed = sessionHasAccess(session);
  /* Derived, not effected: the first render that is allowed latches open. */
  if (allowed && !opened) setOpened(true);

  if (session.status === "unavailable") return <>{children}</>;
  if (opened || allowed) return <>{children}</>;

  if (session.status === "loading" || session.status === "signed-in") {
    /* A beat while Firebase restores the session. Quiet, not a spinner. */
    return <div className="min-h-dvh" aria-busy data-play-gate="loading" />;
  }

  return (
    <Screen width="narrow">
      <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center" data-play-gate="closed">
        <SpeechBubble tail="bottom" className="max-w-md">
          <p className="font-display text-2xl font-semibold sm:text-3xl">Ask a grown-up to open KIDDO!</p>
        </SpeechBubble>
        <CharacterFigure id="kiddo" size="xl" />
        <ButtonLink href={PARENTS} size="lg" variant="soft" data-play-gate-parents>
          For grown-ups
        </ButtonLink>
      </main>
    </Screen>
  );
}
