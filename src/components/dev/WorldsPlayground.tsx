"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ChoiceStage } from "@/components/games/engines/ChoiceStage";
import { ConnectStage } from "@/components/games/engines/ConnectStage";
import { GameWorld } from "@/components/games/world/GameWorld";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { checkAnswer, drawChallenges } from "@/lib/content/challenges";
import { getActivity } from "@/lib/content/registry";
import { createRng } from "@/lib/content/rng";
import type { ActivityId, ChallengeOf } from "@/lib/content/types";
import { cn } from "@/lib/cn";
import { useConnect } from "@/lib/games/engines/useConnect";
import { MATH_QUEST_TIMING } from "@/lib/games/mathQuest";
import type { GameCategory } from "@/lib/games/types";
import { GAME_WORLDS, worldOf, type GameWorldId } from "@/lib/worlds/worlds";

/**
 * The three worlds side by side, for one question: would a child know they
 * had walked into a different game?
 *
 * Each world here is the real thing — the real activity, dealt by the real
 * `drawChallenges`, played by the real engine, framed by the real
 * `GameWorld` — with only the round around it missing. The counting board
 * runs a small choice round of its own with Math Quest's own timings; the
 * two joined-up boards run `useConnect`, exactly as a Quest would. Nothing is
 * mocked and nothing here is a game: it is deliberately not linked from
 * KIDDO World.
 */

interface Stop {
  world: GameWorldId;
  activity: ActivityId;
  /** The sky the world's own Quest plays under. */
  theme: GameCategory;
  /** The entry level: the one whose words still come with their pictures. */
  level: 1;
  intro: string;
}

const STOPS: readonly Stop[] = [
  {
    world: "counting",
    activity: "math.counting-objects",
    theme: "numbers",
    level: 1,
    intro: "Let's count in the garden!",
  },
  {
    world: "animals",
    activity: "general-knowledge.home-partners",
    theme: "discovery",
    level: 1,
    intro: "Help each animal find its way home!",
  },
  {
    world: "words",
    activity: "english.rhyming-partners",
    theme: "letters",
    level: 1,
    intro: "Let's open the word book!",
  },
];

/**
 * One board from an activity, and one whose pictures are all drawn — the
 * same boards a Quest would deal, only chosen so the reference is at its
 * best. Deal 0 is unseeded and fixed, so a measurement is repeatable.
 */
function dealFor(stop: Stop, deal: number) {
  const activity = getActivity(stop.activity);
  if (!activity) return null;
  for (let seed = deal * 17; seed < deal * 17 + 40; seed += 1) {
    const [challenge] = drawChallenges(activity, {
      level: stop.level,
      count: 1,
      rng: createRng(seed),
    });
    if (!challenge) continue;
    const drawn =
      challenge.payload.kind === "connect"
        ? [...challenge.payload.left, ...challenge.payload.right].every(
            (node) =>
              (node.item.kind === "picture" || node.item.kind === "text") &&
              node.item.art !== undefined,
          )
        : (challenge.prompt.display ?? []).every(
            (part) =>
              part.kind === "item" &&
              part.item.kind === "picture" &&
              part.item.art !== undefined,
          );
    if (drawn) return challenge;
  }
  return null;
}

export function WorldsPlayground() {
  const [index, setIndex] = useState(0);
  const [deal, setDeal] = useState(0);
  const stop = STOPS[index];

  const challenge = useMemo(() => dealFor(stop, deal), [stop, deal]);

  return (
    <Screen theme={stop.theme} detail="quiet">
      <div className="flex flex-1 flex-col gap-4 py-4 sm:gap-6 sm:py-6 [@media(max-height:44rem)]:gap-2 [@media(max-height:44rem)]:py-2">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="font-display text-ink-900 text-lg font-semibold">
              Game worlds
            </p>
            <p className="text-ink-500 text-xs [@media(max-height:44rem)]:hidden">
              Three worlds, one engine each · internal
            </p>
          </div>
          <ButtonLink href="/playground" variant="soft" size="sm">
            Design system
          </ButtonLink>
        </header>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="World"
        >
          {STOPS.map((option, at) => (
            <button
              key={option.world}
              type="button"
              data-world-pick={option.world}
              onClick={() => {
                setIndex(at);
                setDeal(0);
              }}
              aria-pressed={index === at}
              className={cn(
                "font-display min-h-12 rounded-full border-2 px-4 font-semibold",
                index === at
                  ? "bg-tide-soft border-tide-base text-tide-ink"
                  : "bg-paper border-edge text-ink-700",
              )}
            >
              {GAME_WORLDS[option.world].name}
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

        {challenge ? (
          challenge.payload.kind === "choice" ? (
            <CountingRound
              key={`${challenge.id}#${deal}`}
              challenge={challenge as ChallengeOf<"choice">}
              intro={stop.intro}
            />
          ) : (
            <JoinedRound
              key={`${challenge.id}#${deal}`}
              challenge={challenge as ChallengeOf<"connect">}
              intro={stop.intro}
              travel={stop.activity === "general-knowledge.home-partners"}
            />
          )
        ) : null}
      </div>
    </Screen>
  );
}

/** KIDDO's row above a world: the same figure and bubble every Quest uses. */
function Host({
  feedback,
  children,
}: {
  feedback: "idle" | "correct" | "retry";
  children: string;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <CharacterFigure
        id="kiddo"
        size="md"
        pose={
          feedback === "correct"
            ? "cheer"
            : feedback === "retry"
              ? "reassure"
              : "point"
        }
      />
      <SpeechBubble className="max-w-2xl flex-1" tail="left">
        <p className="font-display text-xl leading-snug font-semibold sm:text-2xl">
          {children}
        </p>
      </SpeechBubble>
    </div>
  );
}

/**
 * A choice board with Math Quest's own beats — ready, correct, retry — and
 * nothing else of Math Quest. One question, then "again".
 */
function CountingRound({
  challenge,
  intro,
}: {
  challenge: ChallengeOf<"choice">;
  intro: string;
}) {
  const [phase, setPhase] = useState<
    "ready" | "awaiting" | "correct" | "incorrect" | "done"
  >("ready");
  const [picked, setPicked] = useState<string | null>(null);
  const [tried, setTried] = useState<readonly string[]>([]);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (phase === "ready") {
      const timer = setTimeout(
        () => setPhase("awaiting"),
        MATH_QUEST_TIMING.ready,
      );
      return () => clearTimeout(timer);
    }
    if (phase === "correct") {
      const timer = setTimeout(
        () => setPhase("done"),
        MATH_QUEST_TIMING.correct,
      );
      return () => clearTimeout(timer);
    }
    if (phase === "incorrect") {
      const timer = setTimeout(() => {
        setPicked(null);
        setPhase("awaiting");
      }, MATH_QUEST_TIMING.retry);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const answer = (optionId: string) => {
    if (phase !== "awaiting") return;
    setPicked(optionId);
    if (checkAnswer(challenge, { kind: "choice", optionId })) {
      setPhase("correct");
    } else {
      setTried((list) =>
        list.includes(optionId) ? list : [...list, optionId],
      );
      setPhase("incorrect");
    }
  };

  const feedback =
    phase === "correct" || phase === "done"
      ? "correct"
      : phase === "incorrect"
        ? "retry"
        : "idle";
  const line =
    phase === "correct" || phase === "done"
      ? (challenge.explanation ?? "Yes! That's how many.")
      : phase === "incorrect"
        ? "Ooh, so close! Have another go."
        : round === 0 && phase === "ready"
          ? intro
          : challenge.prompt.speech;

  return (
    <div className="flex flex-1 flex-col gap-6 [@media(max-height:54rem)]:gap-4">
      <Host feedback={feedback}>{line}</Host>

      <GameWorld id={worldOf(challenge)} stageKey={`${challenge.id}#${round}`}>
        <ChoiceStage
          challenge={challenge}
          accepting={phase === "awaiting"}
          onAnswer={(result) => {
            if (result.answer.kind === "choice") answer(result.answer.optionId);
          }}
          stateOf={(optionId) =>
            (phase === "correct" || phase === "done") && optionId === picked
              ? "correct"
              : phase === "incorrect" && optionId === picked
                ? "wrong"
                : tried.includes(optionId)
                  ? "tried"
                  : "idle"
          }
        />
      </GameWorld>

      <Button
        variant="soft"
        size="sm"
        className="self-center"
        icon={<RotateCcw className="size-4" />}
        onClick={() => {
          setPicked(null);
          setTried([]);
          setRound((count) => count + 1);
          setPhase("ready");
        }}
      >
        Start again
      </Button>

      <p role="status" aria-live="polite" className="sr-only">
        {phase === "correct" || phase === "done"
          ? "Yes. That's how many."
          : phase === "incorrect"
            ? "Not quite. Have another go."
            : phase === "awaiting"
              ? challenge.prompt.speech
              : ""}
      </p>
    </div>
  );
}

/** A joined-up board, run by `useConnect` exactly as General Knowledge runs one. */
function JoinedRound({
  challenge,
  intro,
  travel,
}: {
  challenge: ChallengeOf<"connect">;
  intro: string;
  travel: boolean;
}) {
  const connect = useConnect(challenge);
  const [round, setRound] = useState(0);
  const fresh = connect.connections.length === 0 && connect.feedback === "idle";

  const line =
    connect.status === "complete"
      ? (challenge.explanation ?? "You joined them all up!")
      : connect.feedback === "correct"
        ? "Yes! That's the one."
        : connect.feedback === "retry"
          ? "Ooh, not that one. Have another go."
          : fresh && round === 0
            ? intro
            : challenge.prompt.speech;

  return (
    <div className="flex flex-1 flex-col gap-6 [@media(max-height:54rem)]:gap-4">
      <Host feedback={connect.feedback}>{line}</Host>

      <GameWorld id={worldOf(challenge)} stageKey={`${challenge.id}#${round}`}>
        <ConnectStage
          challenge={connect.challenge}
          travel={travel}
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
      </GameWorld>

      <Button
        variant="soft"
        size="sm"
        className="self-center"
        icon={<RotateCcw className="size-4" />}
        onClick={() => {
          connect.reset();
          setRound((count) => count + 1);
        }}
      >
        Start again
      </Button>

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
