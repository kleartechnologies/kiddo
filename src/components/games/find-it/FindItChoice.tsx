"use client";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ChoiceTile } from "@/components/kiddo/ChoiceTile";
import { useT } from "@/lib/i18n/useLocale";
import type { FindItItem } from "@/lib/games/findIt";

/**
 * One thing the child can tap.
 *
 * Deliberately thin: `ChoiceTile` is the product's one answer surface and
 * this does not fork it, it only translates Find It's state into the tile's
 * vocabulary and drops the artwork in.
 */

export interface FindItChoiceProps {
  item: FindItItem;
  /** The target, after it has been found. */
  found: boolean;
  /** Just tapped and not it — for the length of the nudge. */
  nudged: boolean;
  /** Tried earlier this round. */
  tried: boolean;
  /** False while a round is landing or an answer is being shown. */
  interactive: boolean;
  onPick: () => void;
}

export function FindItChoice({
  item,
  found,
  nudged,
  tried,
  interactive,
  onPick,
}: FindItChoiceProps) {
  const t = useT();
  const state = found ? "correct" : nudged ? "wrong" : tried ? "tried" : "idle";

  /* The visible label is the name; the spoken one is the whole instruction,
     and it carries the state in words so nothing depends on the colour of a
     border a screen reader will never see. */
  const srLabel = t(`stage.choice.${state}`, { name: item.label });

  return (
    <ChoiceTile
      label={item.label}
      srLabel={srLabel}
      state={state}
      disabled={!interactive}
      onSelect={onPick}
    >
      <ItemArt item={item} />
    </ChoiceTile>
  );
}

/**
 * The only place in Find It that knows what a findable thing looks like.
 * An animals, colours or shapes pack adds a branch here and changes nothing
 * else in the game.
 */
function ItemArt({ item }: { item: FindItItem }) {
  if (item.kind === "character") {
    /* `alive={false}`: KIDDO is the only rigged character, so a blinking
       KIDDO among four still friends would quietly draw the eye to one
       answer. In a game about looking, no tile gets an advantage. */
    return <CharacterFigure id={item.characterId} size="tile" alive={false} />;
  }
  return null;
}
