import type { Character, CharacterId } from "@/lib/games/types";

/**
 * KIDDO & Friends.
 *
 * A family of five original characters built from one shape vocabulary: every
 * form is a circle, a capsule or a soft ellipse. KIDDO is the only non-animal
 * in the cast, which is why it stays the brand mark while the four friends
 * carry the game worlds.
 *
 * The drawings live in `components/character`. This file is the bible: who
 * they are, what hue they own, and what they sound like.
 */
export const CHARACTERS: Record<CharacterId, Character> = {
  kiddo: {
    id: "kiddo",
    name: "KIDDO",
    blurb: "A round, big-eared creature that belongs to no species.",
    traits: ["curious", "positive", "playful", "encouraging"],
    accent: "sage",
    art: {},
  },
  foxy: {
    id: "foxy",
    name: "FOXY",
    blurb: "A clever, curious fox.",
    traits: ["clever", "observant", "adventurous"],
    accent: "apricot",
    art: {},
  },
  bibi: {
    id: "bibi",
    name: "BIBI",
    blurb: "A cheerful rabbit.",
    traits: ["energetic", "enthusiastic", "playful"],
    accent: "blossom",
    art: {},
  },
  pip: {
    id: "pip",
    name: "PIP",
    blurb: "A funny little frog.",
    traits: ["silly", "mischievous", "cheerful"],
    accent: "sprout",
    art: {},
  },
  wally: {
    id: "wally",
    name: "WALLY",
    blurb: "A friendly little whale.",
    traits: ["calm", "gentle", "adventurous"],
    accent: "tide",
    art: {},
  },
};

export const CHARACTER_LIST: Character[] = Object.values(CHARACTERS);

export function getCharacter(id: CharacterId): Character {
  return CHARACTERS[id];
}
