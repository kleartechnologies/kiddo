"use client";

import { Sparkles } from "lucide-react";

import { GameShell } from "@/components/games/GameShell";
import { ChoiceStage } from "@/components/games/engines/ChoiceStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Button } from "@/components/ui/Button";
import { isKind } from "@/lib/content/engine";
import { useMathQuestGame } from "@/lib/games/useMathQuestGame";
import type { Game } from "@/lib/games/types";
import { worldOf } from "@/lib/worlds/worlds";

/**
 * Math Quest.
 *
 * The thinnest file in the game. It owns what KIDDO says and nothing else:
 * the ten questions come from `drawSession` over the Math pack, the marking
 * comes from `checkAnswer`, the chrome comes from `GameShell` and the tiles
 * come from `ChoiceStage`, which has never heard of arithmetic.
 *
 * That is the whole point of the content architecture. Adding a ninth math
 * activity, or a whole English pack, does not bring anyone back to this file.
 */
export function MathQuestGame({ game }: { game: Game }) {
  const math = useMathQuestGame();
  const { challenge, phase, answerLabel } = math;

  /* The game's lead is Wally, who owns the numbers world on the home screen,
     but KIDDO hosts the round — the mascot is the one who reacts, and only
     KIDDO has the poses for it. */
  /* Everything KIDDO can say about this question, so the bubble is sized
     to the longest of them once and the board under it never moves while
     the answer is being shown. */
  const lines = challenge
    ? [
        challenge.prompt.speech,
        challenge.explanation ?? `Yes! It's ${answerLabel}.`,
        "Ooh, so close! Have another go.",
      ]
    : [];

  const prompt =
    phase === "intro"
      ? "Hello! I'm KIDDO. Shall we play with some numbers?"
      : phase === "correct"
        ? lines[1]
        : phase === "incorrect"
          ? lines[2]
          : (lines[0] ?? "");

  /* The same thing in words, for a screen reader, because the bubble above
     lives in a paragraph nobody is focused on. */
  const step = `Question ${math.progress.current + 1} of ${math.progress.total}`;
  const announcement =
    phase === "correct"
      ? `Yes, the answer is ${answerLabel}. ${step} done.`
      : phase === "incorrect"
        ? "Not quite. Have another go."
        : phase === "awaitingAnswer" && challenge
          ? `${step}. ${challenge.prompt.speech}`
          : "";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      promptReserve={phase === "intro" ? [] : lines}
      host="kiddo"
      /* No dots until the questions start: there is nothing to be part-way
         through while KIDDO is still saying hello. */
      progress={phase === "intro" ? undefined : math.progress}
      feedback={math.feedback}
      status={math.status}
      celebration={{
        title: "You did the whole quest!",
        message: "Ten questions, all the way to the end. Brilliant thinking!",
        onPlayAgain: math.restart,
      }}
      /* Where this question is played. Most are the meadow; counting stands
         in a garden, homes are a journey across a landscape. The shell does
         not know which, and this file only looks it up. */
      world={phase === "intro" ? "meadow" : worldOf(challenge)}
      stageKey={phase === "intro" ? "intro" : challenge?.id}
      announce={announcement}
    >
      {phase === "intro" || !challenge ? (
        <Intro onStart={math.begin} />
      ) : isKind(challenge, "choice") ? (
        <ChoiceStage
          challenge={challenge}
          accepting={math.accepting}
          onAnswer={(result) => {
            if (result.answer.kind === "choice") math.answer(result.answer.optionId);
          }}
          stateOf={(optionId) =>
            math.isCorrect(optionId)
              ? "correct"
              : math.isNudged(optionId)
                ? "wrong"
                : math.isTried(optionId)
                  ? "tried"
                  : "idle"
          }
        />
      ) : null}
    </GameShell>
  );
}

/**
 * The way in.
 *
 * A four year old should not arrive mid-question. Wally is standing here
 * because this is his world, and there is exactly one thing to press.
 */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center [@media(max-height:54rem)]:gap-4">
      <CharacterFigure id="wally" size="lg" pose="wave" />
      <Button size="lg" icon={<Sparkles className="size-6" />} onClick={onStart}>
        Let&apos;s play!
      </Button>
    </div>
  );
}
