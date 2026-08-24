import Image from "next/image";

import { getCharacter } from "@/data/characters";
import type { CharacterId } from "@/lib/games/types";
import { cn } from "@/lib/cn";
import { Kiddo } from "@/components/character/Kiddo";
import { Friend, type FriendId } from "@/components/character/Friend";
import type { Expression } from "@/components/character/expressions";
import type { Pose } from "@/components/character/poses";

/**
 * Draws a member of the cast.
 *
 * The one place that decides how a character is rendered. By default that is
 * the vector rig in `components/character`, which is the production artwork.
 * If a character ever gets a hand-drawn illustration that the rig cannot
 * express, filling in `art.src` in `data/characters.ts` swaps it everywhere.
 *
 * KIDDO takes a pose and an expression; the friends have one canonical face.
 */

const SIZES = {
  /**
   * A character standing in a row of other things — a pattern on a game's
   * stage, where five of them plus a gap have to fit across a small phone.
   */
  xs: { className: "size-11 sm:size-14", variant: "compact" as const },
  /** Icon scale. Limbs drop away and the head mark carries the identity. */
  sm: { className: "size-14", variant: "compact" as const },
  md: { className: "size-20 sm:size-24", variant: "full" as const },
  /**
   * Game choice tiles. Keyed to viewport *height*, not width, because the one
   * place a tile gets tight is a phone on its side: plenty of room across for
   * a row of five, almost none down. Where there is height, the art is the
   * same size as `md`.
   *
   * The sizes are a ceiling, not a floor: `max-h-full` lets a small phone's
   * tile scale the drawing down to whatever room it actually has instead of
   * growing the tile to fit the drawing. The rig keeps its proportions and
   * centres itself, so it goes smaller, never squashed.
   */
  tile: {
    className:
      "size-16 max-h-full max-w-full [@media(min-height:34rem)]:size-20 [@media(min-height:44rem)]:size-24",
    variant: "full" as const,
  },
  lg: { className: "size-28 sm:size-36", variant: "full" as const },
  xl: { className: "size-40 sm:size-52", variant: "full" as const },
};

export function CharacterFigure({
  id,
  size = "md",
  className,
  pose,
  expression,
  alive = true,
  /** Characters are decorative unless they carry meaning ("find FOXY"). */
  label,
}: {
  id: CharacterId;
  size?: keyof typeof SIZES;
  className?: string;
  /** KIDDO only. Ignored by the friends, which have a single canonical pose. */
  pose?: Pose;
  expression?: Expression;
  alive?: boolean;
  label?: string;
}) {
  const character = getCharacter(id);
  const { className: sizeClass, variant } = SIZES[size];
  const shared = cn(sizeClass, "shrink-0", className);

  if (character.art.src) {
    return (
      <Image
        src={character.art.src}
        alt={label ?? character.name}
        width={character.art.width ?? 320}
        height={character.art.height ?? 320}
        className={cn(shared, "object-contain")}
        priority={size === "xl"}
      />
    );
  }

  if (id === "kiddo") {
    return (
      <Kiddo
        pose={pose}
        expression={expression}
        variant={variant}
        alive={alive}
        label={label}
        className={shared}
      />
    );
  }

  return <Friend id={id as FriendId} variant={variant} label={label} className={shared} />;
}
