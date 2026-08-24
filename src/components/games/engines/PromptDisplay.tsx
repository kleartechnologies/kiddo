import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { MagicMotion } from "@/components/kiddo/MagicMotion";
import { Card } from "@/components/ui/Card";
import { spokenOf, SYMBOL_GLYPHS } from "@/lib/content/challenges";
import type {
  ContentItem,
  Prompt,
  PromptPart,
  PromptSymbol,
} from "@/lib/content/types";
import { cn } from "@/lib/cn";
import { ContentItemView } from "./ContentItemView";

/**
 * The big line across the stage.
 *
 * `2 + 3 = ?` and `BLUE PINK BLUE PINK ?` are the same three part kinds in a
 * row, which is why one component draws both and why a spelling activity will
 * need no new one.
 *
 * Everything visible is `aria-hidden` and the line is transcribed once, above,
 * as a sentence. A screen reader that read the parts one at a time would say
 * "two, plus, three, equals" as four separate things to tab through.
 *
 * ## Two layouts
 *
 * `line` is everything above and is what a prompt does unless it asks
 * otherwise. `subject` is the other kind of question a board can ask: not a
 * line to read but **one thing to look at**, drawn large and alone — the animal
 * in "where does this live?", the shape in "which one is a triangle?". Same
 * component, same transcription, same `aria-hidden`; the only difference is the
 * scale the item is handed and the padding around it.
 *
 * A `subject` prompt with more than one part is drawn as a line anyway. Four
 * things at hero size is not a subject, it is a stage with no room left on it,
 * and a rule that silently degrades is better than a rule an activity can break
 * a phone with.
 *
 * ## A group of things arrives one at a time
 *
 * A line made only of pictures is a group to be counted — five apples, seven
 * fish — and it is the one line on the stage that is *about* how many parts it
 * has. So its parts `pop` in one after another, which is the learning moment
 * drawn rather than explained: one, then two, then three. The stagger is short
 * enough that a child who starts counting straight away is never overtaken by
 * an apple that was not there yet. Nothing else changes: the same parts, the
 * same size, the same transcription, the same settled row. A line with a
 * symbol or a numeral in it — `2 + 3 = ?` — is read, not counted, and appears
 * whole; so does a subject, which is one thing simply there to look at.
 *
 * A line that is one group of pips — "how many can you count?" over a block
 * of dots, which is what the shipped counting activity deals — is the same
 * moment with the same answer, so its pips arrive the same way: one, then
 * two, then three, each wrapped in the same `pop` at the same stagger. The
 * grid is drawn by `ContentItemView` exactly as before; this file only hands
 * it the wrapper. A count beside anything else (`3 > ?`) is read, and stays
 * whole.
 */

/** Seconds between one thing appearing and the next. */
const POP_STAGGER = 0.1;

const SYMBOL_WORDS: Record<PromptSymbol, string> = {
  plus: "plus",
  minus: "take away",
  equals: "equals",
  question: "what",
  less: "is less than",
  greater: "is greater than",
  /* Read as the step it is: "1 then 2 then 3, what?" */
  arrow: "then",
};

/**
 * One symbol, drawn.
 *
 * All but one are a character in the display font, which is why they are a
 * table of glyphs rather than a table of components. The arrow is the
 * exception: Fredoka has no arrow, and a fallback font's would arrive in a
 * different weight to everything beside it, so it is drawn instead.
 */
function SymbolPart({ symbol }: { symbol: PromptSymbol }) {
  if (symbol === "arrow") {
    return (
      <ArrowRight
        className="text-ink-500 size-6 sm:size-8"
        strokeWidth={3}
        aria-hidden
      />
    );
  }

  return (
    <span className="font-display text-ink-500 text-3xl leading-none font-bold sm:text-4xl">
      {SYMBOL_GLYPHS[symbol]}
    </span>
  );
}

function spoken(part: PromptPart): string {
  if (part.kind === "blank") return "what?";
  if (part.kind === "symbol") return SYMBOL_WORDS[part.symbol];
  /* A group of dots is described as a group of dots. The count is the whole
     of what is on screen, so leaving it out would not be a fair transcription
     of the question — it would be a harder question. */
  return spokenOf(part.item);
}

export function PromptDisplay({
  parts,
  layout = "line",
  anchor,
  surface = "card",
  className,
}: {
  parts: readonly PromptPart[];
  layout?: Prompt["layout"];
  /**
   * The thing the line is about — the sun above `S _ N`. Drawn hero-sized
   * over the row, spoken once at the front of the transcription, and skipped
   * for a `subject`, which is already one big thing. See `Prompt.anchor`.
   */
  anchor?: ContentItem;
  /**
   * `card` is the line in its own card, as always. `open` is the same line
   * with nothing around it, for a world that stands the things on its own
   * ground instead. Same parts, same transcription, same `pop`.
   */
  surface?: "card" | "open";
  className?: string;
}) {
  /* One part, and only one part. See the block above. */
  const subject = layout === "subject" && parts.length === 1;
  /* A subject is already one big thing to look at; never draw two. */
  const shownAnchor = subject ? undefined : anchor;
  /* A group of things, and nothing but things. See the block above. */
  const group =
    !subject &&
    parts.length > 0 &&
    parts.every((part) => part.kind === "item" && part.item.kind === "picture");
  /* One block of pips, alone on the line: a group drawn as dots. */
  const pips =
    !subject &&
    parts.length === 1 &&
    parts[0].kind === "item" &&
    parts[0].item.kind === "count";

  /* The one way anything on this line arrives. `playKey` is always 1: the
     row is remounted for each new board by whoever draws it, so a freshly
     dealt group is a fresh entrance and the same group re-rendered stays put. */
  const arrive = (member: ReactNode, index: number) => (
    <MagicMotion motion="pop" playKey={1} delay={index * POP_STAGGER}>
      {member}
    </MagicMotion>
  );

  const Surface = surface === "card" ? Card : Open;

  return (
    <Surface
      radius="hero"
      padding="none"
      className={cn(
        "mx-auto max-w-full",
        surface === "card" &&
          (subject ? "px-4 py-3 sm:px-8 sm:py-4" : "px-3 py-4 sm:px-6 sm:py-5"),
        className,
      )}
    >
      <p className="sr-only">
        {(shownAnchor ? `${spokenOf(shownAnchor)}. ` : "") +
          parts.map(spoken).join(" ")}
      </p>

      {/* The anchor is simply there, like a subject: `pop` is the group's
          arrival — a thing to be counted — and the anchor is context, not a
          thing arriving to be counted, so it does not animate. Decorative to
          a screen reader because the transcription above already names it.
          `data-prompt-anchor` is the measurement hook
          `scripts/measure-visual.mjs` reads. */}
      {shownAnchor ? (
        <div
          aria-hidden
          data-prompt-anchor
          className="flex items-center justify-center pb-1.5 sm:pb-2"
        >
          <ContentItemView item={shownAnchor} scale="hero" />
        </div>
      ) : null}

      {/* Wraps rather than overflows: on the narrowest phone a long pattern
          takes a second line, which still reads in order. A row that scrolled
          sideways would hide half the question.

          `data-prompt` is a measurement hook. `scripts/measure-visual.mjs` has
          to be able to ask a real 360x640 phone how much height a subject is
          taking out of the board below it. It is on the row rather than on the
          card because the row is the part that grows, and because `Card` takes
          named props rather than spreading unknown ones — worth leaving alone
          for one attribute. Read by nothing else. */}
      <div
        aria-hidden
        data-prompt={subject ? "subject" : "line"}
        className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 sm:gap-x-3"
      >
        {parts.map((part, index) => (
          <span key={index} className="flex items-center justify-center">
            {part.kind === "item" ? (
              group ? (
                arrive(<ContentItemView item={part.item} scale="stage" />, index)
              ) : (
                <ContentItemView
                  item={part.item}
                  scale={subject ? "hero" : "stage"}
                  eachOf={pips ? arrive : undefined}
                />
              )
            ) : part.kind === "symbol" ? (
              <SymbolPart symbol={part.symbol} />
            ) : (
              <span className="font-display text-ink-500 border-ink-900/20 flex size-12 items-center justify-center rounded-2xl border-[3px] border-dashed text-3xl leading-none font-bold sm:size-14 sm:text-4xl">
                ?
              </span>
            )}
          </span>
        ))}
      </div>
    </Surface>
  );
}

/** The `open` surface: a plain block, taking `Card`'s props so one JSX fits both. */
function Open({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  radius?: string;
  padding?: string;
}) {
  return <div className={className}>{children}</div>;
}
