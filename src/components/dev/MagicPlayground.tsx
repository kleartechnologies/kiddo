"use client";

import { useState } from "react";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { MagicMotion } from "@/components/kiddo/MagicMotion";
import { Illustration } from "@/components/kiddo/artwork/illustrations";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ArtId } from "@/lib/content/art";
import {
  MAGIC_MOTIONS,
  magicMotion,
  type MagicMotionName,
} from "@/lib/magicMotion";

/**
 * INTERNAL — the Magic Motion lab. Not part of the child experience, not in
 * the catalogue, not linked from the product, and deliberately not dressed
 * like child-facing UI: the controls are the reviewer's, not a game's.
 *
 * Section A shows each behaviour on its own with room to watch it. Section B
 * shows the same behaviours doing real KIDDO work, because a motion that only
 * looks right in a lab card has not been proven yet.
 */

/** One existing illustration per motion. Proving the system, not the library. */
const LAB: Record<MagicMotionName, { art: ArtId; use: string }> = {
  pop: { art: "food.apple", use: "an object appearing" },
  bounce: { art: "animal.dog", use: "a joyful response" },
  float: { art: "nature.star", use: "decoration, barely there" },
  slide: { art: "object.car", use: "moving into place" },
  walk: { art: "animal.cow", use: "travelling somewhere" },
  grow: { art: "nature.flower", use: "small becomes full" },
  sparkle: { art: "nature.star", use: "an important discovery" },
  celebrate: { art: "animal.dog", use: "a learning moment done" },
};

/** Inside a lab card the walk is short, so it stays inside the card. */
const LAB_WALK = 48;
/** The animal-home track: w-64 minus a dog and a house at text-5xl. */
const HOME_WALK = 144;

export function MagicPlayground() {
  const [plays, setPlays] = useState<Record<string, number>>({});
  const play = (id: string) =>
    setPlays((all) => ({ ...all, [id]: (all[id] ?? 0) + 1 }));
  const playsOf = (id: string) => plays[id] ?? 0;

  return (
    <div className="flex flex-col gap-14 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <KiddoWordmark />
          <p className="text-ink-500 mt-1 text-base">
            Magic Motion lab · internal
          </p>
          <p className="text-ink-500 mt-2 max-w-2xl text-sm">
            Every behaviour settles, nothing loops, and under
            prefers-reduced-motion each one becomes its finished state,
            instantly — press play with the OS setting on to check.
          </p>
        </div>
        <ButtonLink href="/playground" variant="soft" size="sm">
          Design system
        </ButtonLink>
      </header>

      <Section title="A · Motion lab">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MAGIC_MOTIONS.map((name) => (
            <Card key={name} padding="md">
              <div
                className="flex h-36 items-center justify-center"
                data-magic-lab={name}
              >
                <MagicMotion
                  motion={name}
                  playKey={playsOf(name)}
                  distance={name === "walk" ? LAB_WALK : undefined}
                  className={name === "walk" ? "-ml-12" : undefined}
                >
                  <Illustration id={LAB[name].art} className="text-5xl" />
                </MagicMotion>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{name}</p>
                  <p className="text-ink-500 text-xs">{LAB[name].use}</p>
                  <p className="text-ink-500 text-xs italic">
                    &ldquo;{magicMotion(name).says}&rdquo;
                  </p>
                </div>
                <PlayControl id={name} onClick={() => play(name)} />
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="B · Real KIDDO examples">
        <div className="grid gap-5 lg:grid-cols-2">
          <Demo
            id="counting"
            title="Counting"
            point="Each pop says: one more object has appeared."
            onPlay={() => play("counting")}
          >
            <div
              className="flex items-center justify-center gap-4"
              data-magic-demo="counting"
            >
              {[0, 1, 2].map((slot) => (
                <span
                  key={slot}
                  className="flex size-16 items-center justify-center"
                >
                  {playsOf("counting") > 0 ? (
                    <MagicMotion
                      key={`${playsOf("counting")}-${slot}`}
                      motion="pop"
                      playKey={1}
                      delay={slot * 0.45}
                    >
                      <Illustration id="food.apple" className="text-5xl" />
                    </MagicMotion>
                  ) : null}
                </span>
              ))}
            </div>
          </Demo>

          <Demo
            id="home"
            title="Animal home"
            point="The walk says: these belong together."
            onPlay={() => play("home")}
          >
            <div
              className="flex h-24 w-64 max-w-full items-end justify-between"
              data-magic-demo="home"
            >
              <MagicMotion
                motion="walk"
                playKey={playsOf("home")}
                distance={HOME_WALK}
              >
                <Illustration id="animal.dog" className="text-5xl" />
              </MagicMotion>
              <Illustration id="place.house" className="text-5xl" />
            </div>
          </Demo>

          <Demo
            id="alphabet"
            title="Alphabet"
            point="A subtle sparkle. The letter carries the meaning, readably."
            onPlay={() => play("alphabet")}
          >
            <div data-magic-demo="alphabet">
              <MagicMotion motion="sparkle" playKey={playsOf("alphabet")}>
                <span className="flex flex-col items-center gap-1">
                  <Illustration id="food.apple" className="text-4xl" />
                  <span className="font-display text-6xl font-bold">A</span>
                </span>
              </MagicMotion>
            </div>
          </Demo>

          <Demo
            id="magic"
            title="Magic celebration"
            point="What finishing something might feel like. Small, then over."
            onPlay={() => play("magic")}
          >
            <div
              className="flex items-end justify-center gap-8"
              data-magic-demo="magic"
            >
              <CharacterFigure
                id="kiddo"
                size="lg"
                pose={playsOf("magic") > 0 ? "celebrate" : "wave"}
              />
              <MagicMotion motion="celebrate" playKey={playsOf("magic")}>
                <Illustration id="nature.star" className="text-6xl" />
              </MagicMotion>
            </div>
          </Demo>
        </div>
      </Section>
    </div>
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

function Demo({
  id,
  title,
  point,
  onPlay,
  children,
}: {
  id: string;
  title: string;
  point: string;
  onPlay: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">{title}</p>
          <p className="text-ink-500 text-sm">{point}</p>
        </div>
        <PlayControl id={id} onClick={onPlay} />
      </div>
      <div className="mt-5 flex min-h-32 items-center justify-center">
        {children}
      </div>
    </Card>
  );
}

/** A reviewer's control: mono, quiet, and still a 48px target. */
function PlayControl({ id, onClick }: { id: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-magic-play={id}
      onClick={onClick}
      className="border-edge bg-paper text-ink-700 hover:bg-cream-50 min-h-12 min-w-12 shrink-0 rounded-full border-2 px-4 font-mono text-xs font-semibold"
    >
      play
    </button>
  );
}
