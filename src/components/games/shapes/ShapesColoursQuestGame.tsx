"use client";

import { Sparkles } from "lucide-react";

import { GameShell } from "@/components/games/GameShell";
import { ChoiceStage } from "@/components/games/engines/ChoiceStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Button } from "@/components/ui/Button";
import { isKind } from "@/lib/content/engine";
import { useT } from "@/lib/i18n/useLocale";
import { useShapesColoursQuest } from "@/lib/games/useShapesColoursQuest";
import type { Game } from "@/lib/games/types";
import { worldOf } from "@/lib/worlds/worlds";

/**
 * Shapes & Colours Quest.
 *
 * Eleven activities the child never sees named — naming shapes and colours,
 * matching one property while ignoring another, same or different, big and
 * small, counting by shape or by colour, sorting by both at once, corners and
 * sides, where one thing is in relation to another, mirror symmetry, and
 * patterns that change colour or size — and one `ChoiceStage` drawing all
 * eleven. There is no `ShapeStage`, no `ColourStage`, no `SceneStage`.
 *
 * What is new here is not a component. It is a picture: `SceneItem`, added to
 * the content layer generically so that any activity in any pack can put one
 * thing above, inside or beside another. Shapes & Colours is its first caller,
 * not its owner.
 */
export function ShapesColoursQuestGame({ game }: { game: Game }) {
  const t = useT();
  const quest = useShapesColoursQuest();
  const { challenge, phase, answerLabel } = quest;

  /* Pip fronts the looking-closely world on the home screen, but KIDDO hosts
     the round itself — the mascot is the one who reacts, and only KIDDO has
     the poses. */
  const prompt =
    phase === "intro"
      ? t("game.shapes-colours-quest.hello")
      : phase === "correct"
        ? (challenge?.explanation ??
          t("game.shapes-colours-quest.yes", { answer: answerLabel }))
        : phase === "incorrect"
          ? t("game.shapes-colours-quest.retry")
          : /* The question — or, once one has been missed, where to look.
               Never the answer, and never the same sentence twice in a row. */
            quest.question;

  /* The same thing in words, for a screen reader, because the bubble above
     lives in a paragraph nobody is focused on. */
  const step = { current: quest.progress.current + 1, total: quest.progress.total };
  const announcement =
    phase === "correct"
      ? t("quest.answered", { answer: answerLabel, ...step })
      : phase === "incorrect"
        ? t("quest.notQuite")
        : phase === "awaitingAnswer" && challenge
          ? t("quest.asking", { question: quest.question, ...step })
          : "";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      host="kiddo"
      /* No dots until the questions start: there is nothing to be part-way
         through while KIDDO is still saying hello. */
      progress={phase === "intro" ? undefined : quest.progress}
      feedback={quest.feedback}
      status={quest.status}
      celebration={{
        title: t("game.shapes-colours-quest.done.title"),
        message: t("game.shapes-colours-quest.done.message"),
        onPlayAgain: quest.restart,
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
        <Intro label={t("game.shapes-colours-quest.start")} onStart={quest.begin} />
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
      ) : null}
    </GameShell>
  );
}

/**
 * The way in.
 *
 * A four year old should not arrive mid-question. Pip is standing here because
 * this is their world, and there is exactly one thing to press.
 */
function Intro({ label, onStart }: { label: string; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center [@media(max-height:54rem)]:gap-4">
      <CharacterFigure id="pip" size="lg" pose="wave" />
      <Button size="lg" icon={<Sparkles className="size-6" />} onClick={onStart}>
        {label}
      </Button>
    </div>
  );
}
