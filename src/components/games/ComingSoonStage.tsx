"use client";

import { Lock, Sparkles } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { KIDDO_HOME } from "@/lib/routes";
import { Card, Chip } from "@/components/ui/Card";
import { ACCENTS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { Game } from "@/lib/games/types";
import { useT } from "@/lib/i18n/useLocale";

/**
 * The holding screen for a game that has a card but no playfield yet.
 *
 * Honest with the child ("it isn't ready"), useful to us (it exercises the
 * shell), and it shows the themes already described in `data/games.ts`.
 */
export function ComingSoonStage({ game }: { game: Game }) {
  const t = useT();
  const accent = ACCENTS[game.accent];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card radius="hero" padding="lg" className="text-center">
        <span
          className={cn(
            "mx-auto mb-4 flex size-16 items-center justify-center rounded-full",
            accent.bgSoft,
            accent.text,
          )}
        >
          <Sparkles className="size-8" aria-hidden />
        </span>

        <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("soon.title")}</h2>
        <p className="text-ink-500 mt-2 text-lg text-balance sm:text-xl">
          {t(game.parentSummary)}
        </p>

        <div className="border-edge mt-6 border-t pt-6">
          <p className="text-ink-500 text-sm font-semibold tracking-wide uppercase">
            {t("soon.themes")}
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {game.themes.map((theme) => (
              <li key={theme.id}>
                <Chip
                  className={cn(
                    theme.access === "premium"
                      ? "bg-ink-900/5 text-ink-500"
                      : cn(ACCENTS[theme.accent].bgSoft, ACCENTS[theme.accent].text),
                  )}
                  icon={
                    theme.access === "premium" ? (
                      <Lock className="size-3.5" />
                    ) : null
                  }
                >
                  {t(theme.title)}
                </Chip>
              </li>
            ))}
          </ul>
        </div>

        <ButtonLink href={KIDDO_HOME} size="lg" className="mt-8">
          {t("soon.back")}
        </ButtonLink>
      </Card>
    </div>
  );
}
