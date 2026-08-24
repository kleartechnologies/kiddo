"use client";

import { Sparkles } from "lucide-react";

import { GameShell } from "@/components/games/GameShell";
import { ChoiceStage } from "@/components/games/engines/ChoiceStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Button } from "@/components/ui/Button";
import { isKind } from "@/lib/content/engine";
import { useLogicQuestGame } from "@/lib/games/useLogicQuestGame";
import type { Game } from "@/lib/games/types";
import { worldOf } from "@/lib/worlds/worlds";

/**
 * Logic Quest.
 *
 * Four activities the child never sees named — patterns, odd one out, sorting
 * and sequences — and one `ChoiceStage` drawing all four. There is no
 * `PatternStage`, no `SortingStage`, no `LogicChoiceStage`: a pattern with a
 * gap at the end and a sum with a gap at the end are the same gesture wearing
 * different content, and the engine was built not to know the difference.
 *
 * What is new here is not a component. It is a shape: `ShapeItem`, added to
 * the content layer generically so that any activity in any pack can put a
 * circle on a tile. Logic Quest is its first caller, not its owner.
 */
export function LogicQuestGame({ game }: { game: Game }) {
  const logic = useLogicQuestGame();
  const { challenge, phase, answerLabel } = logic;

  /* Foxy fronts the thinking world on the home screen, but KIDDO hosts the round
     itself — the mascot is the one who reacts, and only KIDDO has the poses. */
  const prompt =
    phase === "intro"
      ? "Hello! I'm KIDDO. Shall we do some thinking together?"
      : phase === "correct"
        ? (challenge?.explanation ?? `Yes! It's ${answerLabel}.`)
        : phase === "incorrect"
          ? "Almost! Let's take another look."
          : /* The question — or, once one has been missed, where to look.
               Never the answer, and never the same sentence twice in a row. */
            logic.question;

  /* The same thing in words, for a screen reader, because the bubble above
     lives in a paragraph nobody is focused on. */
  const step = `Question ${logic.progress.current + 1} of ${logic.progress.total}`;
  const announcement =
    phase === "correct"
      ? `Yes, the answer is ${answerLabel}. ${step} done.`
      : phase === "incorrect"
        ? "Not quite. Have another go."
        : phase === "awaitingAnswer" && challenge
          ? `${step}. ${logic.question}`
          : "";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      host="kiddo"
      /* No dots until the questions start: there is nothing to be part-way
         through while KIDDO is still saying hello. */
      progress={phase === "intro" ? undefined : logic.progress}
      feedback={logic.feedback}
      status={logic.status}
      celebration={{
        title: "You worked it all out!",
        message:
          "Ten puzzles, all the way to the end. That was some very good thinking.",
        onPlayAgain: logic.restart,
      }}
      /* One board leaves before the next arrives: the stage is keyed on
         the question, so the last question can never linger inside the next
         one. The live region moves up to the shell with it, so it is one
         element for the whole round and never remounts with the board. */
      world={phase === "intro" ? "meadow" : worldOf(challenge)}
      stageKey={phase === "intro" ? "intro" : challenge?.id}
      announce={announcement}
    >
      {phase === "intro" || !challenge ? (
        <Intro onStart={logic.begin} />
      ) : isKind(challenge, "choice") ? (
        <ChoiceStage
          challenge={challenge}
          accepting={logic.accepting}
          onAnswer={(result) => {
            if (result.answer.kind === "choice") logic.answer(result.answer.optionId);
          }}
          stateOf={(optionId) =>
            logic.isCorrect(optionId)
              ? "correct"
              : logic.isNudged(optionId)
                ? "wrong"
                : logic.isTried(optionId)
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
 * A four year old should not arrive mid-question. Foxy is standing here
 * because this is their world, and there is exactly one thing to press.
 */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center [@media(max-height:54rem)]:gap-4">
      <CharacterFigure id="foxy" size="lg" pose="wave" />
      <Button size="lg" icon={<Sparkles className="size-6" />} onClick={onStart}>
        Let&apos;s think!
      </Button>
    </div>
  );
}
