"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  ChallengeStage,
  type ConnectLook,
} from "@/components/games/engines/ChallengeStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ProgressDots } from "@/components/kiddo/ProgressDots";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { Button, ButtonLink } from "@/components/ui/Button";
import { checkAnswer } from "@/lib/content/challenges";
import { isKind } from "@/lib/content/engine";
import { createRng } from "@/lib/content/rng";
import { drawSession } from "@/lib/content/session";
import type { Challenge, ChallengeOf } from "@/lib/content/types";
import { useConnect } from "@/lib/games/engines/useConnect";
import { useOrder } from "@/lib/games/engines/useOrder";
import type { SessionPlan } from "@/lib/content/session";
import { MIXED_PLAN, MIXED_ROUND, type MixedStep } from "./mixedRound";

/**
 * INTERNAL REFERENCE — not part of the child experience and not linked from it.
 *
 * One round, seven boards, four interactions: choice → connect → order →
 * choice → match → connect → order. It exists to answer one question, which is
 * the question Phase 3 asked — *can a KIDDO round change how the child answers
 * partway through, or only what it asks about?* — and the answer it gives is
 * that nothing had to be built for it to.
 *
 * ## What is actually being proved
 *
 * Look at what this file imports. `drawSession`, which has always been able to
 * deal a plan whose slots name activities of different kinds, because a slot
 * names an `ActivityId` and has never asked what kind that activity is.
 * `useConnect` and `useOrder`, unchanged. `ChallengeStage`, which is the one
 * new thing and is a switch. There is no mixed-round engine, no interaction
 * registry, no per-kind adapter, and no change to any stage.
 *
 * The round in `mixedRound.ts` is therefore not a new capability. It is the existing
 * capability, run — and the reason no game does it yet is that every Quest was
 * *written for* one engine, importing `ChoiceStage` directly. Nothing stops a
 * Quest doing what this page does; the Quests simply predate there being
 * anything else to do.
 *
 * ## Why one component per interaction
 *
 * The three step components below look like the switch `ChallengeStage`
 * already makes, and they are not it. A hook cannot be called conditionally,
 * so *which state machine runs* has to be decided by which component mounted —
 * that is React, not architecture. What the router decides is a different
 * question, *which engine draws*, and it decides it from the payload with no
 * help from the caller. Two switches because there are two questions; neither
 * one holds any rule about connecting or ordering.
 *
 * ## What it is not
 *
 * It is not a game. It is not in `data/games.ts`, it has no route under
 * `/play`, the home screen has never heard of it, and it is not a redesign of
 * the Quest system — no Quest imports anything from here. When a real mixed
 * round is built, it will be a Quest with a session hook, a `GameShell` and a
 * name, and this page will still be here to test the seam against.
 *
 * There is no score, no clock and no lives, the same as everywhere else. A
 * board that is not finished simply is not finished, and the round waits.
 */

/**
 * How long the round waits after a board is finished, in ms.
 *
 * A comprehension timing, not an animation one: it is the beat in which KIDDO
 * says the board is done and the child sees it done, and it is the only clock
 * on the page. Nothing is being timed, nothing expires, and a board that is
 * never finished never advances.
 */
const SETTLE = 1400;

/**
 * Which round this page runs.
 *
 * Defaulted rather than required, so the page that has always been here keeps
 * being the page that has always been here, and a second reference round is a
 * different list of slots rather than a second copy of this file. Nothing here
 * decides anything about content: a round is a plan the content layer deals
 * and a strip of labels for the reviewer above it.
 */
export interface MixedPlaygroundProps {
  /** The slots, in order, as the strip above the board names them. */
  steps?: readonly MixedStep[];
  /** The same slots as `drawSession` reads them. Must match `steps`. */
  plan?: SessionPlan;
  /** What the header calls this round. */
  title?: string;
  /** The line under it. Hidden on a short screen. */
  subtitle?: string;
}

export function MixedPlayground({
  steps = MIXED_ROUND,
  plan = MIXED_PLAN,
  title = "Mixed round",
  subtitle = "Four interactions, one sequence · internal",
}: MixedPlaygroundProps = {}) {
  /** Bumped to deal another round. */
  const [deal, setDeal] = useState(0);

  const round = useMemo(
    /* Seeded rather than random, so the first paint matches the server's and a
       measurement run over eight viewports is repeatable. Deal 0 takes the
       default seed, which is the fixed round every measurement starts from. */
    () => drawSession(plan, { rng: deal === 0 ? undefined : createRng(deal) }),
    [deal, plan],
  );

  return (
    /* A 360×640 phone is the whole budget: on a screen that short the page
       gives up its own padding before the board gives up a pixel. */
    <div className="flex flex-col gap-4 py-4 sm:gap-6 sm:py-6 [@media(max-height:44rem)]:gap-2 [@media(max-height:44rem)]:py-2">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-display text-ink-900 text-lg font-semibold">
            {title}
          </p>
          <p className="text-ink-500 text-xs [@media(max-height:44rem)]:hidden">
            {subtitle}
          </p>
        </div>
        <ButtonLink href="/playground" variant="soft" size="sm">
          Design system
        </ButtonLink>
      </header>

      <MixedRound
        key={deal}
        round={round}
        steps={steps}
        onDealAgain={() => setDeal((count) => count + 1)}
      />
    </div>
  );
}

function MixedRound({
  round,
  steps,
  onDealAgain,
}: {
  round: readonly Challenge[];
  steps: readonly MixedStep[];
  onDealAgain: () => void;
}) {
  const [step, setStep] = useState(0);

  const challenge = round[step];
  const shape = steps[step];
  const done = step >= round.length;

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      {/* The shape of the whole round, always visible. Internal, so it says
          the quiet part out loud: a child would never be shown the word
          "connect", and a reviewer checking that the sequence really does
          change interaction needs to see exactly that.

          Each chip jumps to its board. That is a reviewer's control, not part
          of any activity — it exists so a person (or the measurement script)
          can look at the order board without playing the two before it. It is
          the only reason this page has a control a game would not have, and it
          is why the chips are the one place here that is deliberately smaller
          than a child-sized target. */}
      <ol
        data-round-strip=""
        className="flex list-none flex-wrap items-center justify-center gap-1.5"
      >
        {steps.map((entry, index) => (
          <li key={index}>
            <button
              type="button"
              data-round-step={entry.label}
              aria-current={index === step ? "step" : undefined}
              onClick={() => setStep(index)}
              className={
                index === step
                  ? "bg-tide-soft border-tide-base text-tide-ink rounded-full border-2 px-2.5 py-1 text-xs font-semibold"
                  : index < step
                    ? "border-edge bg-paper text-ink-500 rounded-full border-2 px-2.5 py-1 text-xs font-semibold line-through"
                    : "border-edge bg-paper text-ink-700 rounded-full border-2 px-2.5 py-1 text-xs font-semibold"
              }
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ol>

      <ProgressDots
        total={round.length}
        current={Math.min(step, round.length)}
        className="self-center"
      />

      {done || !challenge || !shape ? (
        <RoundOver
          boards={round.length}
          ways={new Set(steps.map((entry) => entry.label)).size}
          onDealAgain={onDealAgain}
        />
      ) : (
        /* Named for the browser measurement, which has to know which of four
           boards it is looking at before it knows what to click. Nothing in
           the app reads these; `scripts/measure-mixed.mjs` does. */
        <div
          data-round-board={shape.label}
          data-round-activity={challenge.id}
          data-round-index={step}
        >
          <Step
            /* The board's own identity, so the state inside it belongs to it
               and cannot outlive it. `drawSession` already made the id unique
               within the round. */
            key={challenge.id}
            challenge={challenge}
            look={shape.look}
            travel={shape.travel}
            onDone={() => setStep((current) => current + 1)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Which state machine runs.
 *
 * The only switch the caller has to make, and it is made on the same field the
 * router reads. A kind with no renderer falls through to nothing rather than
 * to a crash — the type system already refuses to let one reach
 * `ChallengeStage`, and this is the runtime saying the same thing quietly.
 */
function Step({
  challenge,
  look,
  travel,
  onDone,
}: {
  challenge: Challenge;
  look?: ConnectLook;
  travel?: boolean;
  onDone: () => void;
}) {
  if (isKind(challenge, "choice")) {
    return <ChoiceStep challenge={challenge} onDone={onDone} />;
  }
  if (isKind(challenge, "connect")) {
    return (
      <ConnectStep challenge={challenge} look={look} travel={travel} onDone={onDone} />
    );
  }
  if (isKind(challenge, "order")) {
    return <OrderStep challenge={challenge} onDone={onDone} />;
  }
  return null;
}

/** KIDDO, a sentence, and the board underneath. The same on every step. */
function Board({
  feedback,
  speech,
  reserve,
  children,
  status,
}: {
  feedback: "idle" | "correct" | "retry";
  speech: string;
  /** Everything else the bubble may say on this board, so it never resizes. */
  reserve: readonly string[];
  children: React.ReactNode;
  /** The same thing in words, for a reader who is not watching the board. */
  status: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex items-end gap-2 sm:gap-3">
        <CharacterFigure
          id="kiddo"
          size="sm"
          pose={
            feedback === "correct"
              ? "cheer"
              : feedback === "retry"
                ? "reassure"
                : "point"
          }
        />
        <SpeechBubble
          tone={feedback === "correct" ? "yes" : feedback === "retry" ? "retry" : "default"}
          className="min-w-0 flex-1"
          reserve={reserve}
        >
          {speech}
        </SpeechBubble>
      </div>

      {children}

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}

/**
 * Finish a board, then move on — after a beat, and only once.
 *
 * The whole of "transition between interaction types". There is nothing to
 * tear down between two steps because no step owns anything shared: the next
 * board mounts with its own hook and the old one's timer is cancelled by
 * unmounting, which is what the `key` in `MixedRound` is for.
 */
function useAdvanceWhenDone(complete: boolean, onDone: () => void) {
  useEffect(() => {
    if (!complete) return;
    const timer = setTimeout(onDone, SETTLE);
    return () => clearTimeout(timer);
  }, [complete, onDone]);
}

function ChoiceStep({
  challenge,
  onDone,
}: {
  challenge: ChallengeOf<"choice">;
  onDone: () => void;
}) {
  /* Local, small, and thrown away with the board. A Quest keeps this in a
     reducer because a Quest has a round to keep it for; a reference page has
     one question on screen and nothing to remember afterwards. */
  const [picked, setPicked] = useState<string | null>(null);
  const [tried, setTried] = useState<readonly string[]>([]);
  const [right, setRight] = useState(false);

  /* The nudge clears itself, so a wrong tap costs a beat and nothing else.
     Nothing is taken away, and the option stays tappable. */
  useEffect(() => {
    if (!picked || right) return;
    const timer = setTimeout(() => setPicked(null), 800);
    return () => clearTimeout(timer);
  }, [picked, right]);

  useAdvanceWhenDone(right, onDone);

  const feedback = right ? "correct" : picked ? "retry" : "idle";

  /* Every line this board can say, so the bubble is sized once. */
  const lines = [
    challenge.prompt.speech,
    challenge.explanation ?? "That's the one!",
    "Ooh, not that one. Try again!",
  ];

  return (
    <Board
      feedback={feedback}
      speech={
        right
          ? lines[1]
          : picked
            ? lines[2]
            : lines[0]
      }
      reserve={lines}
      status={right ? "That's the one." : picked ? "Not that one. Try again." : ""}
    >
      <ChallengeStage
        challenge={challenge}
        accepting={!right && !picked}
        onAnswer={(result) => {
          if (result.answer.kind !== "choice") return;
          const { optionId } = result.answer;
          setPicked(optionId);
          if (checkAnswer(challenge, result.answer)) setRight(true);
          else setTried((seen) => (seen.includes(optionId) ? seen : [...seen, optionId]));
        }}
        stateOf={(optionId) =>
          right && optionId === picked
            ? "correct"
            : !right && optionId === picked
              ? "wrong"
              : tried.includes(optionId)
                ? "tried"
                : "idle"
        }
      />
    </Board>
  );
}

function ConnectStep({
  challenge,
  look,
  travel,
  onDone,
}: {
  challenge: ChallengeOf<"connect">;
  look?: ConnectLook;
  travel?: boolean;
  onDone: () => void;
}) {
  const connect = useConnect(challenge);
  useAdvanceWhenDone(connect.status === "complete", onDone);

  const cards = look === "cards";

  /* Every line this board can say, so the bubble is sized once. */
  const lines = [
    challenge.prompt.speech,
    challenge.explanation ?? (cards ? "You found them all!" : "You joined them all up!"),
    cards ? "Yes! Those two belong together." : "Yes! That's the one.",
    cards ? "Not those two. Have another go." : "Ooh, not that one. Have another go.",
  ];

  return (
    <Board
      feedback={connect.feedback}
      speech={
        connect.status === "complete"
          ? lines[1]
          : connect.feedback === "correct"
            ? lines[2]
            : connect.feedback === "retry"
              ? lines[3]
              : lines[0]
      }
      reserve={lines}
      status={
        connect.status === "complete"
          ? "All done."
          : connect.feedback === "correct"
            ? `Yes. ${connect.progress.current} of ${connect.progress.total} joined.`
            : connect.feedback === "retry"
              ? "Not quite. Have another go."
              : ""
      }
    >
      <ProgressDots
        total={connect.progress.total}
        current={connect.progress.current}
        className="self-center"
      />
      <ChallengeStage
        look={look}
        travel={travel}
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
    </Board>
  );
}

function OrderStep({
  challenge,
  onDone,
}: {
  challenge: ChallengeOf<"order">;
  onDone: () => void;
}) {
  const order = useOrder(challenge);
  useAdvanceWhenDone(order.status === "complete", onDone);

  /* Every line this board can say, so the bubble is sized once. */
  const lines = [
    challenge.prompt.speech,
    challenge.explanation ?? "You put them all in order!",
    "Yes! That one goes there.",
    "Ooh, not that one yet. Have another go.",
  ];

  return (
    <Board
      feedback={order.feedback}
      speech={
        order.status === "complete"
          ? lines[1]
          : order.feedback === "correct"
            ? lines[2]
            : order.feedback === "retry"
              ? lines[3]
              : lines[0]
      }
      reserve={lines}
      status={
        order.status === "complete"
          ? "All in order."
          : order.feedback === "correct"
            ? `Yes. ${order.progress.current} of ${order.progress.total} in place.`
            : order.feedback === "retry"
              ? "Not that one yet. Have another go."
              : ""
      }
    >
      <ProgressDots
        total={order.progress.total}
        current={order.progress.current}
        className="self-center"
      />
      <ChallengeStage
        challenge={order.challenge}
        accepting={order.accepting}
        placed={order.placed}
        selectedId={order.selectedId}
        attemptId={order.attemptId}
        onSelect={order.select}
        onAnswer={(result) => {
          if (result.answer.kind !== "order") return;
          order.place(result.answer.itemIds);
        }}
      />
    </Board>
  );
}

function RoundOver({
  boards,
  ways,
  onDealAgain,
}: {
  boards: number;
  ways: number;
  onDealAgain: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <CharacterFigure id="kiddo" size="md" pose="cheer" />
      <SpeechBubble tone="yes">
        {boards} boards, {ways} ways to play. Shall we do another?
      </SpeechBubble>
      <Button
        variant="soft"
        size="sm"
        icon={<RotateCcw className="size-4" />}
        onClick={onDealAgain}
      >
        Deal another round
      </Button>
    </div>
  );
}
