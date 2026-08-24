import { Compass, ShieldCheck, Star } from "lucide-react";
import type { ReactNode } from "react";

import { WorldDoor } from "@/components/worlds/WorldDoor";
import type { WorldProgress } from "@/lib/journey/journey";
import type { PlayableWorldId } from "@/lib/worlds/activities";
import { doorsOf, WORLD_PLACES } from "@/lib/worlds/places";
import { SectionIntro } from "./SectionIntro";

/**
 * What happens after a round ends — shown with the product's own doors.
 *
 * The three cards below are the real `WorldDoor` the child's home screen is
 * built from, handed an example journey: one world untouched, one half
 * found, one finished. A parent sees exactly what their child will see after
 * a few visits, and the caption says it is an example so the page makes no
 * claim about any particular child.
 */
const EXAMPLE: Record<PlayableWorldId, number> = { counting: 3, animals: 1, words: 0 };

function exampleProgress(world: PlayableWorldId): WorldProgress {
  const total = doorsOf(world);
  const done = Math.min(EXAMPLE[world], total);
  return { done, total, complete: done === total };
}

const AFTER: { title: string; detail: string; icon: ReactNode; tone: string }[] = [
  {
    title: "Keepsakes, not scores",
    detail:
      "Each finished activity becomes something that stays in its world — a flower in the garden, an animal met, a page in the book. There are no points and no streaks.",
    icon: <Star className="size-6 fill-honey-base" aria-hidden />,
    tone: "bg-honey-soft text-honey-ink",
  },
  {
    title: "Continue the adventure",
    detail:
      "The home screen remembers where your child was and offers the next door, so a return visit picks up where the last one stopped.",
    icon: <Compass className="size-6" aria-hidden />,
    tone: "bg-tide-soft text-tide-ink",
  },
  {
    title: "A quiet page for grown-ups",
    detail:
      "The parent area shows the same journey in plain words: what was explored, what is next, and what it was practising.",
    icon: <ShieldCheck className="size-6" aria-hidden />,
    tone: "bg-sage-soft text-sage-ink",
  },
];

export function Progression() {
  return (
    <section aria-labelledby="progress-heading" className="scroll-mt-24">
      <SectionIntro
        id="progress-heading"
        eyebrow="After the round"
        title="Little discoveries become a bigger adventure."
      >
        KIDDO isn’t a pile of quizzes. Every world keeps what a child has found in it,
        and the doors on the home screen show it — in the world’s own things.
      </SectionIntro>

      <div className="mt-10 sm:mt-12">
        <ul
          className="grid list-none grid-cols-1 gap-5 [grid-auto-rows:1fr] sm:gap-6 md:grid-cols-3"
          aria-label="Example world doors after a few visits"
          data-landing-doors
        >
          {(Object.keys(EXAMPLE) as PlayableWorldId[]).map((id) => (
            <li key={id} className="flex min-w-0">
              <WorldDoor
                place={WORLD_PLACES[id]}
                progress={exampleProgress(id)}
                suggested={id === "animals"}
              />
            </li>
          ))}
        </ul>
        <p className="text-ink-500 mt-4 text-center text-sm">
          An example after a few visits: one world finished, one part-way, one still new.
          The ringed door is the one KIDDO would suggest next.
        </p>
      </div>

      <ul className="mt-10 grid list-none grid-cols-1 gap-4 sm:mt-12 md:grid-cols-3 md:gap-6">
        {AFTER.map((item) => (
          <li key={item.title} className="flex flex-col gap-3">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
              {item.icon}
            </span>
            <h3 className="font-display text-xl font-semibold">{item.title}</h3>
            <p className="text-ink-700 text-base leading-relaxed">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
