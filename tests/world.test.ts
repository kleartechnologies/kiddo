import assert from "node:assert/strict";
import { test } from "node:test";

import { GAMES } from "@/data/games";
import { ACCENTS } from "@/lib/accents";
import type { Accent } from "@/lib/games/types";
import {
  DEFAULT_WORLD_THEME,
  WORLD_THEMES,
  getWorldTheme,
  type WorldThemeId,
} from "@/lib/world/themes";

/**
 * KIDDO World, checked as a place rather than as code.
 *
 * The background is data now, which means it can go wrong the way data goes
 * wrong: a game standing somewhere that does not exist, a hill painted in a
 * colour the rest of the product has never heard of, or one corner of the
 * world quietly turning into a different product. These are the four things
 * that would actually show up on a child's screen.
 */

const ACCENT_NAMES = new Set(Object.keys(ACCENTS) as Accent[]);
const THEMES = Object.entries(WORLD_THEMES) as [WorldThemeId, (typeof WORLD_THEMES)[WorldThemeId]][];

test("every game in the catalogue has a corner of the world to stand in", () => {
  for (const game of GAMES) {
    assert.ok(
      WORLD_THEMES[game.category],
      `${game.title} is a ${game.category} game and there is no ${game.category} theme`,
    );
  }
});

test("there is a default, and an unknown corner falls back to it", () => {
  assert.ok(WORLD_THEMES[DEFAULT_WORLD_THEME]);
  assert.equal(getWorldTheme(), WORLD_THEMES[DEFAULT_WORLD_THEME]);
  assert.equal(
    getWorldTheme("nowhere" as WorldThemeId),
    WORLD_THEMES[DEFAULT_WORLD_THEME],
  );
});

test("the whole world is painted from the character palette", () => {
  for (const [id, theme] of THEMES) {
    for (const accent of [theme.sky, theme.glow, ...theme.hills]) {
      assert.ok(ACCENT_NAMES.has(accent), `${id} uses a hue named ${accent}`);
    }
  }
});

test("no sky is crowded", () => {
  for (const [id, theme] of THEMES) {
    /* Four is every cloud the scene knows how to place, and the brief for
       this background was explicitly "not excessive floating objects". */
    assert.ok(
      theme.clouds >= 0 && theme.clouds <= 4,
      `${id} asks for ${theme.clouds} clouds`,
    );
    assert.equal(theme.hills.length, 3, `${id} does not have three hills`);
  }
});
