"use client";

import { Sparkles } from "lucide-react";

import { GameShell } from "@/components/games/GameShell";
import { MatchStage } from "@/components/games/engines/MatchStage";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Button } from "@/components/ui/Button";
import { useMatchQuestGame } from "@/lib/games/useMatchQuestGame";
import type { Game } from "@/lib/games/types";
import { worldOf } from "@/lib/worlds/worlds";

/**
 * Match Quest.
 *
 * Ten boards of capitals and their lower case partners, drawn by `MatchStage`
 * — the same component the Connect engine's playground draws, unchanged, with
 * every prop passed straight through. There is no `MatchQuestStage` and no
 * wrapper around the stage: a production game and a reference board are the
 * same board, and the day one of them needs something the other does not is
 * the day the stage has stopped being an engine.
 *
 * What this file adds is the two things a stage is deliberately ignorant of:
 * what KIDDO says about what just happened, and the front door.
 */

/**
 * What KIDDO says when a pair lands, when one does not, and how the round is
 * introduced.
 *
 * Short, and several of each. A child plays around forty pairings in a round;
 * one sentence repeated forty times stops being someone talking to them. None
 * of the nudges names the child's mistake and none of them is louder than the
 * praise — a pair that does not hold costs nothing here, so it is not an
 * event worth a raised voice.
 */
const PRAISE = [
  "Great match!",
  "Those two belong together!",
  "Nice one!",
  "That's the one!",
] as const;

const NUDGES = [
  "Not these two yet.",
  "Have another look.",
  "Who could be its friend?",
] as const;

/**
 * Pick a line from what is on screen rather than from a clock or a die.
 *
 * Render has to be pure — the same board must say the same thing on the server
 * and in the browser — so the line is chosen by summing the situation: how
 * many pairs have landed, and which two cards were just tried. Different
 * moments get different lines, the same moment always gets the same one, and
 * nothing here reaches for `Math.random` in a render.
 */
function rotate(lines: readonly string[], salt: string): string {
  let total = 0;
  for (const character of salt) total += character.codePointAt(0) ?? 0;
  return lines[total % lines.length];
}

export function MatchQuestGame({ game }: { game: Game }) {
  const match = useMatchQuestGame();
  const { challenge, phase, feedback, attempt } = match;

  const salt = `${match.connections.length}|${attempt?.leftId ?? ""}${attempt?.rightId ?? ""}`;

  /* BIBI fronts the letters world on the home screen, but KIDDO hosts the
     round itself — the mascot is the one who reacts, and only KIDDO has the
     poses. */
  const prompt =
    phase === "intro"
      ? "Hello! I'm KIDDO. Shall we find the letters that belong together?"
      : match.solved
        ? (challenge.explanation ?? "You found all the friends!")
        : feedback === "correct"
          ? rotate(PRAISE, salt)
          : feedback === "retry"
            ? rotate(NUDGES, salt)
            : challenge.prompt.speech;

  /* The board carries its own live region for the pairing itself, so this one
     says only what the board cannot: that a whole board is done, and how far
     through the round that leaves the child. Two regions describing the same
     tap would be the same news twice, half a beat apart. */
  const announcement = match.solved
    ? `${challenge.explanation ?? "You found them all."} Board ${match.progress.current + 1} of ${match.progress.total} done.`
    : "";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      host="kiddo"
      /* No dots until the boards start: there is nothing to be part-way
         through while KIDDO is still saying hello. */
      progress={phase === "intro" ? undefined : match.progress}
      feedback={feedback}
      status={match.status}
      celebration={{
        title: "Everyone found a friend!",
        message: "Every big letter found its little friend. Wonderful matching!",
        onPlayAgain: match.restart,
      }}
      /* One board leaves before the next arrives: the stage is keyed on
         the question, so the last question can never linger inside the next
         one. The live region moves up to the shell with it, so it is one
         element for the whole round and never remounts with the board. */
      world={phase === "intro" ? "meadow" : worldOf(challenge)}
      stageKey={phase === "intro" ? "intro" : challenge?.id}
      announce={announcement}
    >
      {phase === "intro" ? (
        <Intro onStart={match.begin} />
      ) : (
        <MatchStage
          challenge={challenge}
          accepting={match.accepting}
          connections={match.connections}
          selectedLeftId={match.selectedLeft}
          selectedRightId={match.selectedRight}
          attempt={attempt}
          onSelectLeft={match.selectLeft}
          onSelectRight={match.selectRight}
          onAnswer={(result) => {
            if (result.answer.kind !== "connect") return;
            const [link] = result.answer.links;
            if (link) match.connect(link);
          }}
        />
      )}
    </GameShell>
  );
}

/**
 * The way in.
 *
 * A four year old should not arrive mid-board. BIBI is standing here because
 * letters are BIBI's world, and there is exactly one thing to press.
 */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center [@media(max-height:54rem)]:gap-4">
      <CharacterFigure id="bibi" size="lg" pose="wave" />
      <Button size="lg" icon={<Sparkles className="size-6" />} onClick={onStart}>
        Let&apos;s match!
      </Button>
    </div>
  );
}
