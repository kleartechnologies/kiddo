"use client";

import { GameShell } from "@/components/games/GameShell";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { useFindItGame } from "@/lib/games/useFindItGame";
import type { FindItItem } from "@/lib/games/findIt";
import type { Game } from "@/lib/games/types";
import { FindItBoard } from "./FindItBoard";

/**
 * Find It.
 *
 * Wires the rules in `useFindItGame` to the shared chrome in `GameShell` and
 * owns the one thing neither of them can: what KIDDO says.
 *
 * The instruction always has the same shape — a few words and then a picture
 * of who to look for — so a child who cannot read yet still sees the answer
 * to the question at the top of the screen and goes hunting for its twin.
 * That picture is the game; the words are the reinforcement, not the other
 * way round.
 */
export function FindItGame({ game }: { game: Game }) {
  const find = useFindItGame();
  const { target, picked } = find;

  /* KIDDO hosts every game and is also one of the five, so once a round the
     question is about the character standing right there asking it. Saying
     "me" is the only honest way to phrase that, and it stops the child
     hunting for a second KIDDO. */
  const isHost = target.id === "kiddo";

  const prompt =
    find.phase === "correct" ? (
      <PromptLine lead="Yes! That's" item={target} text={`${target.label}!`} />
    ) : find.phase === "incorrect" && picked ? (
      /* Never "wrong", never "no". The child is told what they did find —
         which is worth knowing — and then pointed back at the question. */
      <PromptLine
        lead={`That's ${picked.label}! Can you find`}
        item={target}
        text={`${target.label}?`}
      />
    ) : (
      <PromptLine
        lead={isHost ? "Can you find me," : "Can you find"}
        item={target}
        text={`${target.label}?`}
      />
    );

  /* The same thing again in words, for a screen reader, because the prompt
     above lives in a paragraph nobody is focused on. */
  const round = `Round ${find.roundIndex + 1} of ${find.totalRounds}`;
  const announcement =
    find.phase === "correct"
      ? `Yes, that is ${target.label}. ${round} done.`
      : find.phase === "incorrect" && picked
        ? `That is ${picked.label}. Keep looking for ${target.label}.`
        : find.phase === "awaitingChoice"
          ? `${round}. Find ${target.label}.`
          : "";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      host="kiddo"
      progress={{ current: find.roundIndex, total: find.totalRounds }}
      feedback={find.feedback}
      status={find.status}
      celebration={{
        title: "You found them all!",
        message: "Every single friend. Great looking!",
        onPlayAgain: find.restart,
      }}
    >
      <FindItBoard
        roundId={find.round.id}
        choices={find.round.choices}
        isFound={find.isFound}
        isNudged={find.isNudged}
        isTried={find.isTried}
        accepting={find.accepting}
        onPick={find.pick}
      />

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </GameShell>
  );
}

/** A few words, then the thing itself. The picture never leaves the screen. */
function PromptLine({
  lead,
  item,
  text,
}: {
  lead: string;
  item: FindItItem;
  text: string;
}) {
  const accent = ACCENTS[item.accent];

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{lead}</span>
      {/* The name rides inside the chip, punctuation and all, so it can never
          wrap away from the picture it belongs to. */}
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 py-1 pr-3 pl-1",
          accent.bgSoft,
          accent.border,
        )}
      >
        {item.kind === "character" ? (
          <CharacterFigure id={item.characterId} size="sm" alive={false} />
        ) : null}
        <span className={accent.text}>{text}</span>
      </span>
    </span>
  );
}
