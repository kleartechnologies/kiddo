"use client";

import { CHARACTER_LIST } from "@/data/characters";
import { UPCOMING_THEMES } from "@/data/games";
import { CharacterFigure } from "./CharacterFigure";
import { Chip } from "@/components/ui/Card";
import { useT } from "@/lib/i18n/useLocale";

/**
 * A quiet promise that the world keeps growing, plus a first introduction to
 * the friends the child will meet in later games.
 */
export function UpcomingRow() {
  const t = useT();

  return (
    <section className="border-edge mt-auto border-t pt-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            {t("upcoming.title")}
          </h2>
          <p className="text-ink-500 mt-1 text-base sm:text-lg">{t("upcoming.body")}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {UPCOMING_THEMES.map((theme) => (
              <li key={theme}>
                <Chip>{t(theme)}</Chip>
              </li>
            ))}
          </ul>
        </div>

        <ul className="flex shrink-0 justify-center -space-x-3 sm:-space-x-2">
          {CHARACTER_LIST.map((character) => (
            <li key={character.id} title={character.name}>
              <CharacterFigure id={character.id} size="sm" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
