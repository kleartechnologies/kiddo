"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { MatchStage } from "@/components/games/engines/MatchStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ProgressDots } from "@/components/kiddo/ProgressDots";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { Button, ButtonLink } from "@/components/ui/Button";
import { drawChallenges } from "@/lib/content/challenges";
import type { Level } from "@/lib/content/difficulty";
import { isKind } from "@/lib/content/engine";
import { matchReferenceActivity } from "@/lib/content/reference/match";
import { createRng } from "@/lib/content/rng";
import type { ChallengeOf } from "@/lib/content/types";
import { cn } from "@/lib/cn";
import { useConnect } from "@/lib/games/engines/useConnect";

/**
 * INTERNAL REFERENCE — not part of the child experience and not linked from it.
 *
 * The `match` board, on its own, with the reference activity in it. It is here
 * for the same reason `ConnectPlayground` is: so the engine can be played,
 * measured and reviewed before a Quest exists to hold it.
 *
 * Note what it imports: `MatchStage`, and `useConnect`. There is no match
 * reducer and no match hook, because pairing two cards and joining two nodes
 * are the same answer and the reducer already knows how to run it — including
 * the wrong ones. A second copy of that logic would be a second place for it
 * to be wrong.
 *
 * It is deliberately not a game. It is not in `data/games.ts`, it has no route
 * under `/play`, and the home screen has never heard of it.
 */

const LEVELS: readonly Level[] = [1, 2, 3];

export function MatchPlayground() {
  const [level, setLevel] = useState<Level>(2);
  /** Bumped to deal another board. */
  const [deal, setDeal] = useState(0);

  const challenge = useMemo(() => {
    /* Seeded rather than random, so the first paint matches the server's and
       a measurement run over eight viewports is repeatable. Deal 0 has no
       seed at all, which is the fixed board every measurement starts from. */
    const [board] = drawChallenges(matchReferenceActivity, {
      level,
      count: 1,
      rng: deal === 0 ? undefined : createRng(deal),
    });
    return board;
  }, [level, deal]);

  return (
    /* A 360×640 phone is the whole budget: on a screen that short the page
       gives up its own padding before the board gives up a pixel. */
    <div className="flex flex-col gap-4 py-4 sm:gap-6 sm:py-6 [@media(max-height:44rem)]:gap-2 [@media(max-height:44rem)]:py-2">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-display text-ink-900 text-lg font-semibold">
            Match engine
          </p>
          <p className="text-ink-500 text-xs [@media(max-height:44rem)]:hidden">
            Interaction engine reference · internal
          </p>
        </div>
        <ButtonLink href="/playground" variant="soft" size="sm">
          Design system
        </ButtonLink>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-500 text-sm font-semibold">Level</span>
        {LEVELS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setLevel(option);
              setDeal(0);
            }}
            aria-pressed={level === option}
            aria-label={`Level ${option}`}
            className={cn(
              "font-display min-h-11 min-w-11 rounded-full border-2 px-3 font-semibold",
              level === option
                ? "bg-tide-soft border-tide-base text-tide-ink"
                : "bg-paper border-edge text-ink-700",
            )}
          >
            {option}
          </button>
        ))}
        <Button
          size="sm"
          variant="soft"
          icon={<RotateCcw className="size-4" />}
          onClick={() => setDeal((count) => count + 1)}
        >
          Deal another
        </Button>
      </div>

      {challenge && isKind(challenge, "connect") ? (
        <MatchBoard key={`${challenge.id}#${deal}`} challenge={challenge} />
      ) : null}
    </div>
  );
}

/** Split out so the hook below always has a board to run on. */
function MatchBoard({ challenge }: { challenge: ChallengeOf<"connect"> }) {
  const match = useConnect(challenge);

  const prompt =
    match.status === "complete"
      ? (challenge.explanation ?? "You found them all!")
      : match.feedback === "correct"
        ? "Yes! Those two belong together."
        : match.feedback === "retry"
          ? "Not those two. Have another go."
          : challenge.prompt.speech;

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex items-end gap-2 sm:gap-3">
        <CharacterFigure
          id="kiddo"
          size="sm"
          pose={
            match.feedback === "correct"
              ? "cheer"
              : match.feedback === "retry"
                ? "reassure"
                : "point"
          }
        />
        <SpeechBubble
          tone={
            match.feedback === "correct"
              ? "yes"
              : match.feedback === "retry"
                ? "retry"
                : "default"
          }
          className="min-w-0 flex-1"
        >
          {prompt}
        </SpeechBubble>
      </div>

      <ProgressDots
        total={match.progress.total}
        current={match.progress.current}
        className="self-center"
      />

      {/* The board carries its own `aria-live` status, so there is not a
          second one here saying the same thing half a beat later. */}
      <MatchStage
        challenge={match.challenge}
        accepting={match.accepting}
        connections={match.connections}
        selectedLeftId={match.selectedLeft}
        selectedRightId={match.selectedRight}
        attempt={match.attempt}
        onSelectLeft={match.selectLeft}
        onSelectRight={match.selectRight}
        onAnswer={(result) => {
          if (result.answer.kind !== "connect") return;
          const [link] = result.answer.links;
          if (link) match.connect(link);
        }}
      />

      <Button
        variant="soft"
        size="sm"
        className="self-center"
        icon={<RotateCcw className="size-4" />}
        onClick={() => match.reset()}
      >
        Start again
      </Button>
    </div>
  );
}
