"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { ConnectStage } from "@/components/games/engines/ConnectStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ProgressDots } from "@/components/kiddo/ProgressDots";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { Button, ButtonLink } from "@/components/ui/Button";
import { drawChallenges } from "@/lib/content/challenges";
import type { Level } from "@/lib/content/difficulty";
import { isKind } from "@/lib/content/engine";
import { connectReferenceActivity } from "@/lib/content/reference/connect";
import { createRng } from "@/lib/content/rng";
import type { ChallengeOf } from "@/lib/content/types";
import { cn } from "@/lib/cn";
import { useConnect } from "@/lib/games/engines/useConnect";

/**
 * INTERNAL REFERENCE — not part of the child experience and not linked from it.
 *
 * The `connect` engine, on its own, with the reference activity in it. It is
 * here for the same reason `Playground` is: so the engine can be played,
 * measured and reviewed before a Quest exists to hold it.
 *
 * It is deliberately not a game. It is not in `data/games.ts`, it has no route
 * under `/play`, and the home screen has never heard of it. When Connect
 * content arrives in a real pack, that Quest will render this same
 * `ConnectStage` with this same hook, and this page will still be here to test
 * the engine against.
 *
 * The chrome around the board is kept deliberately small, because the point of
 * the page is to measure the board: a 360×640 phone has to hold the whole
 * thing without scrolling, and a header that takes a third of it would be
 * measuring the header.
 */

const LEVELS: readonly Level[] = [1, 2, 3];

export function ConnectPlayground() {
  const [level, setLevel] = useState<Level>(2);
  /** Bumped to deal another board. */
  const [deal, setDeal] = useState(0);

  const challenge = useMemo(() => {
    /* Seeded rather than random, so the first paint matches the server's and
       a measurement run over eight viewports is repeatable. Deal 0 has no
       seed at all, which is the fixed board every measurement starts from. */
    const [board] = drawChallenges(connectReferenceActivity, {
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
            Connect engine
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
        <ConnectBoard key={`${challenge.id}#${deal}`} challenge={challenge} />
      ) : null}
    </div>
  );
}

/** Split out so the hook below always has a `connect` challenge to run on. */
function ConnectBoard({ challenge }: { challenge: ChallengeOf<"connect"> }) {
  const connect = useConnect(challenge);

  const prompt =
    connect.status === "complete"
      ? (challenge.explanation ?? "You joined them all up!")
      : connect.feedback === "correct"
        ? "Yes! That's the one."
        : connect.feedback === "retry"
          ? "Ooh, not that one. Have another go."
          : challenge.prompt.speech;

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex items-end gap-2 sm:gap-3">
        <CharacterFigure
          id="kiddo"
          size="sm"
          pose={
            connect.feedback === "correct"
              ? "cheer"
              : connect.feedback === "retry"
                ? "reassure"
                : "point"
          }
        />
        <SpeechBubble
          tone={
            connect.feedback === "correct"
              ? "yes"
              : connect.feedback === "retry"
                ? "retry"
                : "default"
          }
          className="min-w-0 flex-1"
        >
          {prompt}
        </SpeechBubble>
      </div>

      <ProgressDots
        total={connect.progress.total}
        current={connect.progress.current}
        className="self-center"
      />

      <ConnectStage
        challenge={connect.challenge}
        accepting={connect.accepting}
        connections={connect.connections}
        selectedLeftId={connect.selectedLeft}
        selectedRightId={connect.selectedRight}
        attempt={connect.attempt}
        onSelectLeft={connect.selectLeft}
        onSelectRight={connect.selectRight}
        onAnswer={(result) => {
          if (result.answer.kind !== "connect") return;
          const [link] = result.answer.links;
          if (link) connect.connect(link);
        }}
      />

      <Button
        variant="soft"
        size="sm"
        className="self-center"
        icon={<RotateCcw className="size-4" />}
        onClick={() => connect.reset()}
      >
        Start again
      </Button>

      {/* The same thing in words, because the board's own state lives in
          labels nobody is focused on while a line is being drawn. */}
      <p role="status" aria-live="polite" className="sr-only">
        {connect.status === "complete"
          ? "All joined up."
          : connect.feedback === "correct"
            ? `Yes. ${connect.progress.current} of ${connect.progress.total} joined.`
            : connect.feedback === "retry"
              ? "Not quite. Have another go."
              : ""}
      </p>
    </div>
  );
}
