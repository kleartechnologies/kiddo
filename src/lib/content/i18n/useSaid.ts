"use client";

import { useMemo } from "react";

import { useLocale } from "@/lib/i18n/useLocale";
import type { ChallengeRun } from "../progress";
import type { Challenge } from "../types";
import { localizeChallenge, localizeRound } from ".";

/**
 * A game's state, said in the reader's language.
 *
 * ## Why on the way out, and not on the way in
 *
 * A round could be localized where it is dealt, and on the server — where
 * nothing is ever re-read — that is exactly what happens. In the browser it
 * would be the wrong seam: a parent who changes the language mid-round would
 * then be stuck in the old one until the next round, or the round would have
 * to be dealt again and the child would lose their place. Neither is
 * acceptable.
 *
 * So a game reduces over the English round it was dealt and says it on the
 * way out. Switching language is then an ordinary re-render: the reducer
 * state — which question, what was picked, what was already tried — is not
 * touched at all, because it was never the thing that was translated. The new
 * language is simply what the next paint reads.
 *
 * That is safe only because `localizeChallenge` moves no ids. Every option id,
 * every node id, `answerId` and `answerOrder` cross unchanged, so a `picked`
 * or `tried` id recorded under English still names the same option under
 * Malay, and `checkAnswer` still returns the same verdict. See the notes at
 * the top of this folder's `index.ts`.
 *
 * English returns the state object itself, so the language KIDDO shipped in
 * first pays nothing — not a map, not a new object, not a re-render.
 */
export function useSaid<S extends { run: ChallengeRun }>(state: S): S {
  const locale = useLocale();
  return useMemo(() => {
    if (locale === "en") return state;
    const challenges = localizeRound(locale, state.run.challenges);
    return { ...state, run: { ...state.run, challenges } };
  }, [locale, state]);
}

/** One board, for a game that hands a single challenge to an engine. */
export function useSaidChallenge<C extends Challenge | null>(challenge: C): C {
  const locale = useLocale();
  return useMemo(
    () => (challenge === null ? challenge : (localizeChallenge(locale, challenge) as C)),
    [locale, challenge],
  );
}
