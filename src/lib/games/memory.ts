import { shuffle } from "./shuffle";
import type { CharacterId } from "./types";

/**
 * Memory Match content.
 *
 * A deck is data, never logic: `useMemoryGame` only ever compares `pairId`,
 * so a future pack can pair two things that do not look alike — a numeral
 * with three dots, a lower-case letter with its capital — without the rules
 * changing at all. The first pack pairs a character with itself.
 */

export interface MemoryCardData {
  /** Unique per card. Two cards of a pair share `pairId`, never `id`. */
  id: string;
  characterId: CharacterId;
  /** The thing being matched. Equal `pairId` means the two cards match. */
  pairId: string;
}

/**
 * The KIDDO & Friends pack: four pairs, eight cards.
 *
 * WALLY is deliberately held back. Adding it here is all it takes to make a
 * ten-card board, and the layout, the rules and the progress dots all follow
 * from the deck length.
 */
export const FRIENDS_PACK: readonly CharacterId[] = [
  "kiddo",
  "foxy",
  "bibi",
  "pip",
] as const;

/** The deck in a fixed order. Deal it through `dealDeck` to play. */
export function buildDeck(characters: readonly CharacterId[]): MemoryCardData[] {
  return characters.flatMap((characterId) => [
    { id: `${characterId}-1`, characterId, pairId: characterId },
    { id: `${characterId}-2`, characterId, pairId: characterId },
  ]);
}

/** A freshly shuffled deck. Every new game gets one. */
export function dealDeck(
  characters: readonly CharacterId[] = FRIENDS_PACK,
): MemoryCardData[] {
  return shuffle(buildDeck(characters));
}
