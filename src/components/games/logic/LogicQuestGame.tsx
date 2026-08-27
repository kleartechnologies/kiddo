"use client";

import { Sparkles } from "lucide-react";

import { GameShell, INTRO_FRIEND_LANDSCAPE } from "@/components/games/GameShell";
import { ChoiceStage } from "@/components/games/engines/ChoiceStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Button } from "@/components/ui/Button";
import { isKind } from "@/lib/content/engine";
import { useT } from "@/lib/i18n/useLocale";
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
  const t = useT();
  const logic = useLogicQuestGame();
  const { challenge, phase, answerLabel } = logic;

  /* Foxy fronts the thinking world on the home screen, but KIDDO hosts the round
     itself — the mascot is the one who reacts, and only KIDDO has the poses. */
  const prompt =
    phase === "intro"
      ? t("game.logic-quest.hello")
      : phase === "correct"
        ? (challenge?.explanation ?? t("game.logic-quest.yes", { answer: answerLabel }))
        : phase === "incorrect"
          ? t("game.logic-quest.retry")
          : /* The question — or, once one has been missed, where to look.
               Never the answer, and never the same sentence twice in a row. */
            logic.question;

  /* The same thing in words, for a screen reader, because the bubble above
     lives in a paragraph nobody is focused on. */
  const step = { current: logic.progress.current + 1, total: logic.progress.total };
  const announcement =
    phase === "correct"
      ? t("quest.answered", { answer: answerLabel, ...step })
      : phase === "incorrect"
        ? t("quest.notQuite")
        : phase === "awaitingAnswer" && challenge
          ? t("quest.asking", { question: logic.question, ...step })
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
        title: t("game.logic-quest.done.title"),
        message: t("game.logic-quest.done.message"),
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
        <Intro label={t("game.logic-quest.start")} onStart={logic.begin} />
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
function Intro({ label, onStart }: { label: string; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center [@media(max-height:54rem)]:gap-4">
      <CharacterFigure
        id="foxy"
        size="lg"
        pose="wave"
        className={INTRO_FRIEND_LANDSCAPE}
      />
      <Button size="lg" icon={<Sparkles className="size-6" />} onClick={onStart}>
        {label}
      </Button>
    </div>
  );
}
