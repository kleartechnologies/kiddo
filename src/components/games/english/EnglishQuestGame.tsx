"use client";

import { Sparkles } from "lucide-react";

import { GameShell } from "@/components/games/GameShell";
import { ChoiceStage } from "@/components/games/engines/ChoiceStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Button } from "@/components/ui/Button";
import { isKind } from "@/lib/content/engine";
import { useT } from "@/lib/i18n/useLocale";
import { useEnglishQuest } from "@/lib/games/useEnglishQuest";
import type { Game } from "@/lib/games/types";
import { worldOf } from "@/lib/worlds/worlds";

/**
 * English Quest.
 *
 * Compare this file to `MathQuestGame` and the architecture is the argument:
 * a whole different subject, and the only things that changed are the hook,
 * the words KIDDO says and which friend waves hello. The tiles are the same
 * `ChoiceStage`, which has never heard of letters any more than it had heard
 * of arithmetic — it renders `choice` challenges, and a letter and a sum are
 * the same gesture wearing different content.
 *
 * There is no `EnglishChoiceStage`, and there was never a reason for one.
 */
export function EnglishQuestGame({ game }: { game: Game }) {
  const t = useT();
  const english = useEnglishQuest();
  const { challenge, phase, answerLabel } = english;

  /* Bibi owns the letters world on the home screen, but KIDDO hosts the round
     itself — the mascot is the one who reacts, and only KIDDO has the poses. */
  const prompt =
    phase === "intro"
      ? t("game.english-quest.hello")
      : phase === "correct"
        ? (challenge?.explanation ??
          t("game.english-quest.yes", { answer: answerLabel }))
        : phase === "incorrect"
          ? t("game.english-quest.retry")
          : (challenge?.prompt.speech ?? "");

  /* The same thing in words, for a screen reader, because the bubble above
     lives in a paragraph nobody is focused on. */
  const step = { current: english.progress.current + 1, total: english.progress.total };
  const announcement =
    phase === "correct"
      ? t("quest.answered", { answer: answerLabel, ...step })
      : phase === "incorrect"
        ? t("quest.notQuite")
        : phase === "awaitingAnswer" && challenge
          ? t("quest.asking", { question: challenge.prompt.speech, ...step })
          : "";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      host="kiddo"
      /* No dots until the questions start: there is nothing to be part-way
         through while KIDDO is still saying hello. */
      progress={phase === "intro" ? undefined : english.progress}
      feedback={english.feedback}
      status={english.status}
      celebration={{
        title: t("game.english-quest.done.title"),
        message: t("game.english-quest.done.message"),
        onPlayAgain: english.restart,
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
        <Intro label={t("game.english-quest.start")} onStart={english.begin} />
      ) : isKind(challenge, "choice") ? (
        <ChoiceStage
          challenge={challenge}
          accepting={english.accepting}
          onAnswer={(result) => {
            if (result.answer.kind === "choice") english.answer(result.answer.optionId);
          }}
          stateOf={(optionId) =>
            english.isCorrect(optionId)
              ? "correct"
              : english.isNudged(optionId)
                ? "wrong"
                : english.isTried(optionId)
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
 * A four year old should not arrive mid-question. Bibi is standing here
 * because this is her world, and there is exactly one thing to press.
 */
function Intro({ label, onStart }: { label: string; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center [@media(max-height:54rem)]:gap-4">
      <CharacterFigure id="bibi" size="lg" pose="wave" />
      <Button size="lg" icon={<Sparkles className="size-6" />} onClick={onStart}>
        {label}
      </Button>
    </div>
  );
}
