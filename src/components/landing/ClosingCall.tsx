import { ArrowRight } from "lucide-react";

import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { ButtonLink } from "@/components/ui/Button";
import { PRICING } from "@/lib/routes";

/** The last thing on the page says the first thing again, with KIDDO next to it. */
export function ClosingCall() {
  return (
    <section
      aria-labelledby="closing-heading"
      className="bg-paper border-edge flex flex-col items-center gap-6 rounded-hero border p-8 text-center shadow-soft sm:flex-row sm:p-10 sm:text-left"
    >
      <CharacterFigure id="kiddo" size="lg" pose="point" />
      <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
        <h2 id="closing-heading" className="font-display text-3xl font-bold text-balance sm:text-4xl">
          Ready when you are.
        </h2>
        <p className="text-ink-700 max-w-xl text-lg leading-relaxed text-pretty">
          Choose a plan, create your account, and hand over the tablet. Three worlds and
          nine doors are open today, and more are on the way.
        </p>
        <ButtonLink
          href={PRICING}
          data-landing-closing-cta
          size="lg"
          iconRight
          icon={<ArrowRight className="size-6" aria-hidden />}
        >
          Start KIDDO
        </ButtonLink>
      </div>
    </section>
  );
}
