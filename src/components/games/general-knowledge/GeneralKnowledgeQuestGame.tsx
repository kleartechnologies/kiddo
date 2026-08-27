"use client";

import { Sparkles } from "lucide-react";

import { GameShell, INTRO_FRIEND_LANDSCAPE } from "@/components/games/GameShell";
import { ChoiceStage } from "@/components/games/engines/ChoiceStage";
import { ConnectStage } from "@/components/games/engines/ConnectStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Button } from "@/components/ui/Button";
import { isKind } from "@/lib/content/engine";
import { useT } from "@/lib/i18n/useLocale";
import { useGeneralKnowledgeQuest } from "@/lib/games/useGeneralKnowledgeQuest";
import type { Game } from "@/lib/games/types";
import { worldOf } from "@/lib/worlds/worlds";

/**
 * General Knowledge Quest.
 *
 * Twenty-eight activities the child never sees named — naming animals and
 * knowing their sounds, babies, food and homes; plants, weather and seasons;
 * alive or not, grown or built, hot or cold; food and where it comes from;
 * the things in a house and what they are for; getting dressed; vehicles and
 * where they travel; the people who help and the places we go; your own body,
 * your senses and looking after yourself; the sky, the seasons of the day, the
 * shape of the land, and staying safe — and one `ChoiceStage` drawing all
 * twenty-eight. There is no `AnimalStage` and no `WorldStage`.
 *
 * What is new here is not a component. It is a picture: `PictureItem`, added
 * to the content layer generically so that any activity in any pack can put a
 * thing from the world on a tile with a name attached. General Knowledge is
 * its first caller, not its owner.
 *
 * ## The one board that is joined up
 *
 * The habitats slot may deal `home-partners`, and that board is drawn by
 * `ConnectStage` — the same component the playground draws, with every prop
 * passed straight through from the hook. It is the one board in the round
 * that asks for `travel`: when a join is right the animal walks to the home
 * it was joined to, because *where something goes* is the thing being
 * learned and is taught by watching it go. No other board moves.
 */

/** The one activity whose left-hand things go somewhere. */
const WALKS_HOME = "general-knowledge.home-partners";

export function GeneralKnowledgeQuestGame({ game }: { game: Game }) {
  const t = useT();
  const quest = useGeneralKnowledgeQuest();
  const { challenge, phase, answerLabel, board } = quest;

  /* Everything KIDDO can say about this question, so the bubble is sized
     to the longest of them once and the board under it never moves while a
     line is landing or an animal is walking home. */
  const lines = challenge
    ? board
      ? [
          quest.question,
          challenge.prompt.speech,
          challenge.hint ?? "",
          challenge.explanation ?? t("game.general-knowledge-quest.joined"),
          t("game.general-knowledge-quest.yesBoard"),
          t("game.general-knowledge-quest.retryBoard"),
        ]
      : [
          quest.question,
          challenge.prompt.speech,
          challenge.hint ?? "",
          challenge.explanation ??
            t("game.general-knowledge-quest.yes", { answer: answerLabel }),
          t("game.general-knowledge-quest.retry"),
        ]
    : [];

  /* Foxy fronts the curious-about-the-world corner on the home screen, but
     KIDDO hosts the round itself — the mascot is the one who reacts, and only
     KIDDO has the poses. */
  const prompt =
    phase === "intro"
      ? t("game.general-knowledge-quest.hello")
      : phase === "correct"
        ? lines[3]
        : board
          ? /* A line landing or letting go is the engine's moment; the
               question — or the hint — comes back when it is over. */
            quest.feedback === "correct"
            ? lines[4]
            : quest.feedback === "retry"
              ? lines[5]
              : quest.question
          : phase === "incorrect"
            ? lines[4]
            : /* The question — or, once one has been missed, where to think.
                 Never the answer, and never the same sentence twice in a row. */
              quest.question;

  /* The same thing in words, for a screen reader, because the bubble above
     lives in a paragraph nobody is focused on. */
  const step = { current: quest.progress.current + 1, total: quest.progress.total };
  const announcement =
    phase === "correct"
      ? board
        ? t("quest.boardAnswered", { said: lines[3], ...step })
        : t("quest.answered", { answer: answerLabel, ...step })
      : board && quest.feedback === "correct"
        ? t("quest.joined", {
            current: board.progress.current,
            total: board.progress.total,
          })
        : phase === "incorrect" || (board && quest.feedback === "retry")
          ? t("quest.notQuite")
          : phase === "awaitingAnswer" && challenge
            ? t("quest.asking", { question: quest.question, ...step })
            : "";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      promptReserve={phase === "intro" ? [] : lines}
      host="kiddo"
      /* No dots until the questions start: there is nothing to be part-way
         through while KIDDO is still saying hello. */
      progress={phase === "intro" ? undefined : quest.progress}
      feedback={quest.feedback}
      status={quest.status}
      celebration={{
        title: t("game.general-knowledge-quest.done.title"),
        message: t("game.general-knowledge-quest.done.message"),
        onPlayAgain: quest.restart,
      }}
      /* Where this question is played. Most are the meadow; counting stands
         in a garden, homes are a journey across a landscape. The shell does
         not know which, and this file only looks it up. */
      world={phase === "intro" ? "meadow" : worldOf(challenge)}
      stageKey={phase === "intro" ? "intro" : challenge?.id}
      announce={announcement}
    >
      {phase === "intro" || !challenge ? (
        <Intro label={t("game.general-knowledge-quest.start")} onStart={quest.begin} />
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
          travel={board.challenge.activityId === WALKS_HOME}
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
