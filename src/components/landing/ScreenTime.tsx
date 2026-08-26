import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/cn";
import { SectionIntro } from "./SectionIntro";

/**
 * The problem, and the alternative — the one section on the page that says
 * what KIDDO is *instead of*.
 *
 * Kept to things a parent has seen for themselves. No statistics, no study,
 * no claim about attention spans or outcomes: two columns of plain
 * observations, one about an endless feed and one about KIDDO, each of
 * which is either obviously true or is something the product actually does
 * and the rest of this page shows.
 */
const FEED = [
  "One video leads into the next, chosen to keep watching.",
  "Nothing is left behind when the tablet goes down.",
  "Adverts and things to buy, aimed straight at your child.",
  "Hard to tell, afterwards, what they actually did.",
];

const KIDDO = [
  "Short rounds with a beginning and an end.",
  "Every finished activity leaves something in its world.",
  "No adverts, nothing to buy, and never a price on a child’s screen.",
  "A parent page that says exactly what was explored.",
];

export function ScreenTime() {
  return (
    <section aria-labelledby="screen-time-heading" id="why-kiddo" className="scroll-mt-24">
      <SectionIntro
        id="screen-time-heading"
        eyebrow="Why KIDDO"
        title="Screen time is going to happen. This is what it could be instead."
      >
        An hour on YouTube or a social feed goes by and leaves nothing behind, and it is
        genuinely hard to tell a video that teaches from one that is only good at holding
        attention. KIDDO is the other thing to hand over when the tablet comes out.
      </SectionIntro>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 md:grid-cols-2 md:gap-6">
        <Column
          title="An endless feed"
          items={FEED}
          tone="bg-ink-900/5 text-ink-500"
          icon={<Minus className="size-4" strokeWidth={3} aria-hidden />}
          muted
        />
        <Column
          title="An afternoon in KIDDO"
          items={KIDDO}
          tone="bg-sage-soft text-sage-ink"
          icon={<Check className="size-4" strokeWidth={3} aria-hidden />}
        />
      </div>
    </section>
  );
}

function Column({
  title,
  items,
  tone,
  icon,
  muted,
}: {
  title: string;
  items: string[];
  tone: string;
  icon: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-5 sm:p-6",
        muted ? "border-edge bg-cream-50/60" : "bg-paper border-edge shadow-soft",
      )}
    >
      <h3 className={cn("font-display text-xl font-semibold", muted && "text-ink-700")}>{title}</h3>
      <ul className="mt-4 flex list-none flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", tone)}>
              {icon}
            </span>
            <span className={cn("text-base leading-snug", muted ? "text-ink-700" : "text-ink-900")}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
