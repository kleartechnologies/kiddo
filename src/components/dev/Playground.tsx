"use client";

import { useState } from "react";

import { Celebration } from "@/components/kiddo/Celebration";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ChoiceTile } from "@/components/kiddo/ChoiceTile";
import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { ProgressDots } from "@/components/kiddo/ProgressDots";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { Illustration } from "@/components/kiddo/artwork/illustrations";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { ACCENTS } from "@/lib/accents";
import { ART_IDS, artCategoryOf } from "@/lib/content/art";
import { CHARACTER_LIST } from "@/data/characters";
import { cn } from "@/lib/cn";
import { KIDDO_HOME } from "@/lib/routes";
import type { Accent } from "@/lib/games/types";

/**
 * INTERNAL REFERENCE — not part of the child experience and not linked from it.
 *
 * Every piece of the design system on one page, so a change to a token or a
 * component can be judged in one glance instead of by clicking through games.
 */

const ACCENT_NAMES: Accent[] = [
  "sage",
  "apricot",
  "blossom",
  "sprout",
  "tide",
  "honey",
];

export function Playground() {
  return (
    <div className="flex flex-col gap-14 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <KiddoWordmark />
          <p className="text-ink-500 mt-1 text-base">
            Design system reference · internal
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* The interaction engines get their own reference pages: a board of
              lines cannot be judged from a swatch of tokens. */}
          <ButtonLink href="/playground/connect" variant="soft" size="sm">
            Connect engine
          </ButtonLink>
          <ButtonLink href="/playground/order" variant="soft" size="sm">
            Order engine
          </ButtonLink>
          <ButtonLink href="/playground/match" variant="soft" size="sm">
            Match engine
          </ButtonLink>
          {/* And one page that is not an engine: the four of them in a row,
              which is what a round of more than one interaction looks like. */}
          <ButtonLink href="/playground/mixed" variant="soft" size="sm">
            Mixed round
          </ButtonLink>
          {/* The same page with the newest content in it, so a reviewer can
              see what was just authored without hunting for the level it
              appears at. */}
          <ButtonLink href="/playground/batch" variant="soft" size="sm">
            New content
          </ButtonLink>
          <ButtonLink href={KIDDO_HOME} variant="soft" size="sm">
            KIDDO World
          </ButtonLink>
        </div>
      </header>

      <Section title="Colour">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACCENT_NAMES.map((accent) => (
            <Card key={accent} padding="sm">
              <p className="font-display mb-3 text-lg font-semibold capitalize">
                {accent}
              </p>
              <div className="flex gap-2">
                {(["bgSoft", "bgBase", "bgDeep"] as const).map((step) => (
                  <span
                    key={step}
                    className={cn(
                      "border-edge h-12 flex-1 rounded-xl border",
                      ACCENTS[accent][step],
                    )}
                  />
                ))}
              </div>
              <p className={cn("mt-3 text-sm font-semibold", ACCENTS[accent].text)}>
                Text on cream
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <Card padding="lg" className="space-y-3">
          <h1 className="font-display text-5xl font-bold">Hi! Let&apos;s play</h1>
          <h2 className="font-display text-3xl font-semibold">Choose a game</h2>
          <h3 className="font-display text-2xl font-semibold">Memory Match</h3>
          <p className="text-lg">
            Body copy is Nunito. It stays readable at large sizes for early
            readers, and small for the grown-up screens.
          </p>
          <p className="text-ink-500 text-base">Secondary copy sits in ink-500.</p>
        </Card>
      </Section>

      <Section title="Buttons">
        <Card padding="lg" className="flex flex-wrap items-center gap-4">
          <Button size="lg">Play</Button>
          <Button size="md">Play again</Button>
          <Button size="sm">Small</Button>
          <Button variant="soft" size="md">
            Soft
          </Button>
          <Button variant="quiet" size="md">
            Quiet
          </Button>
        </Card>
      </Section>

      <Section title="Cards, chips and speech">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Chip>Ages 4-8</Chip>
              <Chip className="bg-sprout-soft text-sprout-ink">Free</Chip>
              <Chip className="bg-sage-soft text-sage-ink">Memory</Chip>
            </div>
            <p className="text-ink-500">
              Cards are the only surface. Radius, border and shadow never vary
              between screens.
            </p>
          </Card>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CharacterFigure id="foxy" size="md" />
              <SpeechBubble className="flex-1">
                <p className="font-display text-xl font-semibold">
                  Can you find BIBI?
                </p>
              </SpeechBubble>
            </div>
            <SpeechBubble tone="yes" tail="none">
              <p className="font-display text-lg font-semibold">That&apos;s it!</p>
            </SpeechBubble>
            <SpeechBubble tone="retry" tail="none">
              <p className="font-display text-lg font-semibold">
                Nearly! Try another one.
              </p>
            </SpeechBubble>
          </div>
        </div>
      </Section>

      <Section title="Illustration library">
        <ArtSheet />
      </Section>

      <Section title="Choice tiles">
        <ChoiceTileDemo />
      </Section>

      <Section title="Progress">
        <ProgressDemo />
      </Section>

      <Section title="Characters">
        <Card padding="lg">
          <ul className="flex flex-wrap items-end justify-center gap-8">
            {CHARACTER_LIST.map((character) => (
              <li key={character.id} className="text-center">
                <CharacterFigure id={character.id} size="lg" />
                <p className="font-display mt-2 font-semibold">{character.name}</p>
                <p className="text-ink-500 text-sm">{character.blurb}</p>
              </li>
            ))}
          </ul>
          <p className="text-ink-500 mt-6 text-center text-sm">
            Production artwork. The cast is drawn by the vector rig in{" "}
            <code>components/character</code> — see <code>/character</code> for
            the full system.
          </p>
        </Card>
      </Section>

      <Section title="Celebration">
        <Card padding="lg">
          <Celebration
            character="pip"
            message="You found every friend."
            onPlayAgain={() => undefined}
          />
        </Card>
      </Section>
    </div>
  );
}

/**
 * Every illustration in the library, at the three sizes a board draws them.
 *
 * A reference sheet rather than a gallery. The three columns are the whole
 * point: an illustration has to survive being a 48px answer tile, and the only
 * honest way to know whether a shark still reads as a shark down there is to
 * put it next to the same shark on a stage. Anything that only works in the
 * left-hand column does not work.
 *
 * Sized by font size, exactly as a board sizes them — `Illustration` is
 * `1.15em` square — so what is on this page is what is on a tile and not an
 * approximation of it.
 */
function ArtSheet() {
  const shelves = ART_IDS.reduce<Record<string, string[]>>((acc, id) => {
    const category = artCategoryOf(id);
    (acc[category] ??= []).push(id);
    return acc;
  }, {});

  return (
    <Card padding="lg">
      <div className="space-y-8">
        {Object.entries(shelves).map(([category, ids]) => (
          <div key={category}>
            <h3 className="text-ink-500 mb-3 text-xs font-bold tracking-widest uppercase">
              {category} · {ids.length}
            </h3>
            <ul className="flex flex-wrap gap-6">
              {ids.map((id) => (
                <li key={id} className="w-28 text-center">
                  <span className="flex items-end justify-center gap-2">
                    <Illustration
                      id={id as (typeof ART_IDS)[number]}
                      className="text-5xl"
                    />
                    <Illustration
                      id={id as (typeof ART_IDS)[number]}
                      className="text-3xl"
                    />
                    <Illustration
                      id={id as (typeof ART_IDS)[number]}
                      className="text-base"
                    />
                  </span>
                  <p className="text-ink-500 mt-2 font-mono text-[0.7rem] break-all">
                    {id}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-ink-500 mt-8 text-center text-sm">
        Every drawing is flat token fills in a 100-unit box, with no gradient,
        no outer stroke and no motion — see{" "}
        <code>components/kiddo/artwork/illustrations</code> and{" "}
        <code>docs/kiddo-visual-system.md</code>. A thing the library has not
        drawn is still drawn, as its glyph.
      </p>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-ink-500 text-sm font-bold tracking-widest uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Tap a tile to see the feedback states a game will drive. */
function ChoiceTileDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  const options = [
    { id: "bibi", label: "BIBI", correct: true },
    { id: "pip", label: "PIP", correct: false },
    { id: "wally", label: "WALLY", correct: false },
    { id: "foxy", label: "FOXY", correct: false },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {options.map((option) => (
        <ChoiceTile
          key={option.id}
          label={option.label}
          state={
            picked === null
              ? "idle"
              : picked === option.id
                ? option.correct
                  ? "correct"
                  : "wrong"
                : "dimmed"
          }
          onSelect={() => setPicked(picked === option.id ? null : option.id)}
        >
          <CharacterFigure id={option.id} size="md" />
        </ChoiceTile>
      ))}
    </div>
  );
}

function ProgressDemo() {
  const [step, setStep] = useState(2);
  return (
    <Card padding="lg" className="flex flex-wrap items-center gap-6">
      <ProgressDots total={6} current={step} />
      <Button variant="soft" size="sm" onClick={() => setStep((s) => (s + 1) % 6)}>
        Next step
      </Button>
    </Card>
  );
}
