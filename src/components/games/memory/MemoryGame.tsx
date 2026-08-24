"use client";

import { GameShell } from "@/components/games/GameShell";
import { getCharacter } from "@/data/characters";
import { FRIENDS_PACK } from "@/lib/games/memory";
import { useMemoryGame } from "@/lib/games/useMemoryGame";
import type { Game } from "@/lib/games/types";
import { MemoryBoard } from "./MemoryBoard";

/**
 * Memory Match.
 *
 * Wires the rules in `useMemoryGame` to the shared chrome in `GameShell`, and
 * owns the one thing neither of them can: what KIDDO says. Nothing here
 * knows how a card is drawn and nothing here decides whether a pair matches.
 *
 * The instruction is one short line in KIDDO's mouth and it changes as the
 * round goes, so a child who cannot read still learns the game from the
 * cards turning over. There is no start screen: the game is playable the
 * moment it appears.
 */
export function MemoryGame({ game }: { game: Game }) {
  const match = useMemoryGame(FRIENDS_PACK);

  const found = match.lastMatch ? getCharacter(match.lastMatch).name : null;
  const finished = match.pairsFound === match.totalPairs;

  /* Never "wrong", never "no". The mismatch line is the one a child hears
     most, so it points at what to do next instead of at what just happened. */
  const prompt =
    match.phase === "matched"
      ? finished
        ? "You found them all!"
        : `Yes! You found ${found}!`
      : match.phase === "checking"
        ? "Ooh, not those two. Try again!"
        : match.phase === "secondCardSelected"
          ? "Let's see..."
          : match.phase === "firstCardSelected"
            ? "Now find the one that matches!"
            : match.pairsFound > 0
              ? "Nice! Find another pair."
              : "Tap two cards to find matching friends!";

  /* The same words again, for a screen reader, because the prompt above sits
     in a heading nobody is focused on. Matching is announced in words as well
     as in colour, and the tally lands here rather than in front of the child. */
  const announcement =
    match.phase === "matched"
      ? finished
        ? `You found all ${match.totalPairs} pairs in ${match.attempts} tries.`
        : `${found} matched. ${match.pairsFound} of ${match.totalPairs} pairs found.`
      : match.phase === "checking"
        ? "Not a pair. Both cards are turning back over."
        : "";

  return (
    <GameShell
      game={game}
      prompt={prompt}
      host="kiddo"
      progress={{ current: match.pairsFound, total: match.totalPairs }}
      feedback={match.feedback}
      status={match.status}
      celebration={{
        title: "Great job!",
        message: "You found all the friends!",
        onPlayAgain: match.restart,
      }}
    >
      <MemoryBoard
        deck={match.deck}
        isFaceUp={match.isFaceUp}
        isMatched={match.isMatched}
        isMissed={match.isMissed}
        accepting={match.accepting}
        onTurn={match.turn}
      />

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </GameShell>
  );
}
