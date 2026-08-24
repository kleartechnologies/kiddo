"use client";

import { Sparkles } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { GameShell } from "@/components/games/GameShell";
import { ChoiceStage } from "@/components/games/engines/ChoiceStage";
import { ConnectStage } from "@/components/games/engines/ConnectStage";
import { ContentItemView } from "@/components/games/engines/ContentItemView";
import { useGameWorld } from "@/components/games/world/GameWorld";
import type { CelebrationMoment } from "@/components/kiddo/Celebration";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Button } from "@/components/ui/Button";
import type { CharacterId } from "@/lib/games/types";
import { isKind } from "@/lib/content/engine";
import { useGeneralKnowledgeQuest } from "@/lib/games/useGeneralKnowledgeQuest";
import {
  nextActivityIn,
  suggestedTier,
  suggestWorldAfter,
  tierCompleted,
  tierStateOf,
  worldProgress,
  type TierState,
} from "@/lib/journey/journey";
import { recordCompletedAt, recordOpened, useJourney } from "@/lib/journey/useJourney";
import { useChildName } from "@/lib/profile/useChildName";
import { WORLD_REWARDS, type Tier, type WorldActivity } from "@/lib/worlds/activities";
import { introPreviewOf } from "@/lib/worlds/introPreview";
import { activityRoute, WORLD_PLACES, worldGameFor } from "@/lib/worlds/places";
import { TierPicker } from "./TierPicker";
import { WorldKeepsake } from "./WorldKeepsake";

/**
 * One door in a world, opened.
 *
 * This is not a new game. It is General Knowledge Quest's machine — the one
 * KIDDO quest that already mixes tapped boards with joined-up boards — dealt
 * from a five-question plan that belongs to the door, played in the world
 * the door stands in, inside the same `GameShell` every game plays in. What
 * is this file's own is only what a *world* adds to a round: the way in is
 * the world's friend saying hello, the board stays in the world from the
 * first question to the last, and the celebration hands back the world's
 * keepsake and points at the next door.
 *
 * ## How big a challenge
 *
 * A door owns three plans — Easy, Medium, Hard — and this component owns
 * which one is on the table. The tier is chosen once on arrival (the lowest
 * one the journey has not finished, which is always unlocked) and after that
 * only the child changes it, through the `TierPicker` on the way in or the
 * "bigger challenge" invitation on the celebration. It is deliberately *not*
 * derived from the live journey: the journey moves the moment a round is
 * recorded, and the round being celebrated must never change size under the
 * celebration. Handing the quest a different tier's plan is the whole
 * switch — the quest re-deals itself from the new plan and returns to the
 * way in, the same as arriving fresh.
 *
 * The journey is written twice: when the door opens, so "continue" knows
 * which world the child was last in, and when the round ends, so the door
 * is finished at the tier that was played. Nothing is written for a wrong
 * answer, because nothing is counted.
 */
const never = () => () => {};

export function WorldActivityGame({ activity }: { activity: WorldActivity }) {
  const place = WORLD_PLACES[activity.world];
  const game = useMemo(() => worldGameFor(activity), [activity]);

  const journey = useJourney();

  /* Which plan is on the table. Until the child says otherwise the door
     offers the lowest tier the journey has not finished — *derived*, so the
     server and the first client paint (which only ever see an empty journey)
     agree on Easy, and the real answer settles in with the journey itself.
     The moment the child commits — starting the round, or picking a size —
     the choice becomes state, and from then on nothing that happens to the
     journey can change the round under them. */
  const [chosen, setChosen] = useState<Tier | null>(null);
  const activeTier: Tier = chosen ?? suggestedTier(journey, activity.id);

  const quest = useGeneralKnowledgeQuest(activity.plans[activeTier]);
  const { challenge, phase, answerLabel, board } = quest;
  const name = useChildName();

  const begin = () => {
    setChosen(activeTier);
    quest.begin();
  };

  useEffect(() => {
    recordOpened(activity.id);
  }, [activity.id]);

  /* Finished: written to the journey once, when the round completes. Guarded
     by a ref rather than by deps on purpose: choosing the next tier from the
     celebration changes `activeTier` while the finished round is still on
     screen, and that must never record a finish for a tier that was not
     played. `firstFinish` remembers that it was this round — at this tier —
     that put the finish there; a replay earns its own cheer but not a second
     keepsake. */
  const complete = quest.status === "complete";
  const recorded = useRef(false);
  const [firstFinish, setFirstFinish] = useState<{ id: WorldActivity["id"]; tier: Tier } | null>(
    null,
  );
  useEffect(() => {
    if (!complete) {
      recorded.current = false;
      return;
    }
    if (recorded.current) return;
    recorded.current = true;
    const tier = activeTier;
    /* Deferred a tick so the celebration's first paint still reads the
       journey from *before* this finish — that is how it knows the finish
       was a first. The write and `firstFinish` then land together. */
    const timer = setTimeout(() => {
      if (recordCompletedAt(activity.id, tier)) setFirstFinish({ id: activity.id, tier });
    }, 0);
    return () => clearTimeout(timer);
  }, [complete, activity.id, activeTier]);

  /* The tier the finished round was actually played at — `firstFinish` when
     this round was a first, the current tier otherwise. */
  const finishedTier: Tier = firstFinish?.id === activity.id ? firstFinish.tier : activeTier;
  const earned: "first" | "again" | null = !complete
    ? null
    : firstFinish?.id === activity.id || !tierCompleted(journey, activity.id, finishedTier)
      ? "first"
      : "again";

  const tierStates: Readonly<Record<Tier, TierState>> = {
    1: tierStateOf(journey, activity.id, 1),
    2: tierStateOf(journey, activity.id, 2),
    3: tierStateOf(journey, activity.id, 3),
  };
  const chooseTier = (next: Tier) => {
    if (tierStates[next] === "locked") return;
    if (next === activeTier) {
      if (complete) quest.restart();
      return;
    }
    setFirstFinish(null);
    setChosen(next);
  };
  /* The picker appears once there is a choice to make — before Medium is
     unlocked, Easy is simply what the door is. */
  const showPicker = tierStates[2] !== "locked";

  const lines = challenge
    ? board
      ? [
          quest.question,
          challenge.prompt.speech,
          challenge.hint ?? "",
          challenge.explanation ?? "You joined them all up!",
          "Yes! That's the one.",
          "Ooh, not that one. Have another go.",
        ]
      : [
          quest.question,
          challenge.prompt.speech,
          challenge.hint ?? "",
          challenge.explanation ?? `Great thinking! It's ${answerLabel}.`,
          "Ooh, not that one. Try again!",
        ]
    : [];

  const hello = name ? `Hi, ${name}! ${activity.intro}` : activity.intro;

  /* The glimpse waits for the mount: before it, the quest's deal is a
     placeholder the seeded deal replaces, and a glimpse of the wrong board
     would flicker into the right one. */
  const mounted = useSyncExternalStore(never, () => true, () => false);
  const glimpse = mounted && phase === "intro" ? introPreviewOf(challenge) : [];

  const prompt =
    phase === "intro"
      ? hello
      : phase === "correct"
        ? lines[3]
        : board
          ? quest.feedback === "correct"
            ? lines[4]
            : quest.feedback === "retry"
              ? lines[5]
              : quest.question
          : phase === "incorrect"
            ? lines[4]
            : quest.question;

  const step = `Question ${quest.progress.current + 1} of ${quest.progress.total}`;
  const announcement =
    phase === "correct"
      ? board
        ? `${lines[3]} ${step} done.`
        : `Yes, the answer is ${answerLabel}. ${step} done.`
      : board && quest.feedback === "correct"
        ? `Yes. ${board.progress.current} of ${board.progress.total} joined.`
        : phase === "incorrect" || (board && quest.feedback === "retry")
          ? "Not quite. Have another go."
          : phase === "awaitingAnswer" && challenge
            ? `${step}. ${quest.question}`
            : "";

  /* What comes after: the next unfinished door here, or — when the world is
     finished — another world with something still to find. */
  const progress = worldProgress(journey, activity.world);
  const nextHere = nextActivityIn(journey, activity.world);
  const elsewhere = suggestWorldAfter(journey, activity.world);
  const next = nextHere
    ? { href: activityRoute(nextHere), label: `Next: ${nextHere.title}` }
    : elsewhere
      ? { href: WORLD_PLACES[elsewhere].route, label: `Visit ${WORLD_PLACES[elsewhere].name}` }
      : undefined;

  const reward = WORLD_REWARDS[activity.world];
  const message =
    progress.complete && earned === "first"
      ? `Wonderful! You discovered everything in ${place.name}!`
      : earned === "first"
        ? finishedTier === 1
          ? reward.earned
          : finishedTier === 2
            ? "That was tricky — and you did it!"
            : "Wow! You figured it out!"
        : progress.complete
          ? `Wonderful! You discovered everything in ${place.name}.`
          : "Still brilliant. Every time counts!";

  /* How big the moment is: the tier the round was played at — or, when this
     finish was the last thing the world had to find, the world's own. */
  const moment: CelebrationMoment =
    progress.complete && earned === "first" ? "world" : finishedTier;

  /* "Ready for a bigger challenge?" — only when the round just opened one:
     the tier above the one played is unlocked and still unfinished. */
  const higher: Tier | null = finishedTier < 3 ? ((finishedTier + 1) as Tier) : null;
  const invite = complete && higher !== null && tierStates[higher] === "ready";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      promptReserve={phase === "intro" ? [] : lines}
      host="kiddo"
      progress={phase === "intro" ? undefined : quest.progress}
      feedback={quest.feedback}
      status={quest.status}
      celebration={{
        title: activity.done,
        message,
        moment,
        onPlayAgain: () => {
          setFirstFinish(null);
          quest.restart();
        },
        reward: (
          <div className="flex flex-col items-center gap-4">
            <WorldKeepsake
              place={place}
              done={progress.done}
              total={progress.total}
              justEarned={earned === "first" && finishedTier === 1}
              className="justify-center"
            />
            {invite ? (
              <div
                data-tier-invite
                className="border-edge bg-paper flex flex-col items-center gap-3 rounded-card border p-4"
              >
                <p className="font-display text-lg leading-snug font-semibold">
                  Ready for a bigger challenge?
                </p>
                <TierPicker states={tierStates} selected={finishedTier} onSelect={chooseTier} />
              </div>
            ) : null}
          </div>
        ),
        next,
      }}
      exit={{ href: place.route, label: `Back to ${place.name}` }}
      /* The whole round is played in this world — the way in, every board,
         and the way out — so the child never leaves the place they chose. */
      world={activity.world}
      stageKey={phase === "intro" ? "intro" : challenge?.id}
      announce={announcement}
    >
      {phase === "intro" || !challenge ? (
        <Intro
          friend={place.friend}
          preview={
            glimpse.length > 0 ? (
              <div
                aria-hidden
                className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
              >
                {glimpse.map((item, index) => (
                  <ContentItemView key={index} item={item} scale="stage" />
                ))}
              </div>
            ) : null
          }
          onStart={begin}
          picker={
            showPicker ? (
              <div data-tier-choice className="flex flex-col items-center gap-2">
                <p className="text-ink-700 text-base font-semibold">How big a challenge?</p>
                <TierPicker states={tierStates} selected={activeTier} onSelect={chooseTier} />
              </div>
            ) : undefined
          }
        />
      ) : isKind(challenge, "choice") ? (
        <ChoiceStage
          challenge={challenge}
          accepting={quest.accepting}
          onAnswer={(result) => {
            if (result.answer.kind === "choice") quest.answer(result.answer.optionId);
          }}
          stateOf={(optionId) =>
            quest.isCorrect(optionId)
              ? "correct"
              : quest.isNudged(optionId)
                ? "wrong"
                : quest.isTried(optionId)
                  ? "tried"
                  : "idle"
          }
        />
      ) : board ? (
        <ConnectStage
          challenge={board.challenge}
          travel={activity.travel === true}
          accepting={quest.accepting}
          connections={board.connections}
          selectedLeftId={board.selectedLeft}
          selectedRightId={board.selectedRight}
          attempt={board.attempt}
          onSelectLeft={board.selectLeft}
          onSelectRight={board.selectRight}
          onAnswer={(result) => {
            if (result.answer.kind !== "connect") return;
            const [link] = result.answer.links;
            if (link) board.connect(link);
          }}
        />
      ) : null}
    </GameShell>
  );
}

/**
 * The way in: the world's friend, a glimpse of what the round is about, one
 * thing to press — and, once Easy has been finished, the choice of how big a
 * challenge to take. The parts are built here; where they stand and what is
 * painted around them is the world's `composeIntro`, so the way into the
 * garden looks like the garden and the way into the book looks like the book.
 */
function Intro({
  friend,
  preview,
  onStart,
  picker,
}: {
  friend: CharacterId;
  preview?: ReactNode;
  onStart: () => void;
  picker?: ReactNode;
}) {
  const { composeIntro } = useGameWorld();
  return composeIntro({
    friend: <CharacterFigure id={friend} size="lg" pose="wave" />,
    preview,
    begin: (
      <div className="flex flex-col items-center gap-6 [@media(max-height:54rem)]:gap-4">
        <Button size="lg" icon={<Sparkles className="size-6" />} onClick={onStart}>
          Let&apos;s go!
        </Button>
        {picker}
      </div>
    ),
  });
}
