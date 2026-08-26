"use client";

import { GameShell } from "@/components/games/GameShell";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { around } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/useLocale";
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
  const t = useT();
  const find = useFindItGame();
  const { target, picked } = find;

  /* KIDDO hosts every game and is also one of the five, so once a round the
     question is about the character standing right there asking it. Saying
     "me" is the only honest way to phrase that, and it stops the child
     hunting for a second KIDDO. */
  const isHost = target.id === "kiddo";

  /* One whole sentence, split either side of the thing being named, so the
     picture can ride inside it. A language that puts the name first gets
     that for free: `around` hands back an empty `before` and the chip leads
     the line. See `lib/i18n/format`. */
  const line = around(
    find.phase === "correct"
      ? t("game.find-it.yes", { name: target.label })
      : find.phase === "incorrect" && picked
        ? /* Never "wrong", never "no". The child is told what they did find —
             which is worth knowing — and then pointed back at the question. */
          t("game.find-it.wrong", { picked: picked.label, name: target.label })
        : isHost
          ? t("game.find-it.askMe", { name: target.label })
          : t("game.find-it.ask", { name: target.label }),
    "name",
  );

  const prompt = (
    <PromptLine before={line.before} item={target} name={target.label} after={line.after} />
  );

  /* The same thing again in words, for a screen reader, because the prompt
     above lives in a paragraph nobody is focused on. */
  const round = { current: find.roundIndex + 1, total: find.totalRounds };
  const announcement =
    find.phase === "correct"
      ? t("game.find-it.saidYes", { name: target.label, ...round })
      : find.phase === "incorrect" && picked
        ? t("game.find-it.saidWrong", { picked: picked.label, name: target.label })
        : find.phase === "awaitingChoice"
          ? t("game.find-it.saidAsking", { name: target.label, ...round })
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
        title: t("game.find-it.done.title"),
        message: t("game.find-it.done.message"),
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
  before,
  item,
  name,
  after,
}: {
  /** The sentence up to the thing being named. */
  before: string;
  item: FindItItem;
  /** What the thing is called. */
  name: string;
  /** The rest of the sentence — in every line KIDDO has, its punctuation. */
  after: string;
}) {
  const accent = ACCENTS[item.accent];

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{before.trimEnd()}</span>
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
        <span className={accent.text}>{`${name}${after}`}</span>
      </span>
    </span>
  );
}
