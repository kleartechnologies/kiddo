"use client";

import { MagicMotion } from "@/components/kiddo/MagicMotion";
import { GroundThing } from "@/components/kiddo/world/scenery";
import { ACCENT_VARS } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { rewardKey } from "@/lib/i18n/names";
import { useT } from "@/lib/i18n/useLocale";
import { WORLD_REWARDS } from "@/lib/worlds/activities";
import type { WorldPlace } from "@/lib/worlds/places";

/**
 * What a world gives back, drawn as the world would draw it.
 *
 * One small thing per finished door: a flower that has grown in the garden,
 * an animal friend met on the adventure, a page written into the storybook.
 * The unfinished doors are drawn too, faintly, so a child can see there is
 * more to find without being told there is a score. There is no number to
 * beat; the words say "two of three flowers", never "2/3" or "67%".
 */

export function WorldKeepsake({
  place,
  done,
  total,
  size = "md",
  /** Which one has just been earned, so it can arrive rather than be there. */
  justEarned,
  className,
}: {
  place: WorldPlace;
  done: number;
  total: number;
  size?: "sm" | "md";
  justEarned?: boolean;
  className?: string;
}) {
  const t = useT();
  const kind = WORLD_REWARDS[place.id];
  /* Always the plural word, in every one of the three lines — English says
     "no flowers yet" of an empty garden and "2 of 3 flowers" of a half-full
     one, and a language that counts differently gets to say so in its own
     three lines rather than have this file assemble them. */
  const many = t(rewardKey(place.id, "many"));
  const label =
    done === 0
      ? t("worlds.keepsake.none", { many })
      : done === total
        ? t("worlds.keepsake.all", { total, many })
        : /* "1 of 3 flowers": the total is what is being counted. */
          t("worlds.keepsake.some", { done, total, many });

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="img"
      aria-label={t("worlds.keepsake.sr", { name: t(place.name), label })}
    >
      <ul className="flex items-end gap-1" aria-hidden>
        {Array.from({ length: total }, (_, index) => {
          const earned = index < done;
          const arriving = justEarned && index === done - 1;
          return (
            <li
              key={index}
              data-keepsake={earned ? "earned" : "waiting"}
              className={cn(
                size === "sm" ? "size-7" : "size-10",
                !earned && "opacity-30 grayscale",
              )}
            >
              {/* The one just earned pops in — the same `pop` a counting pip
                  arrives with, nothing invented for the occasion. */}
              <MagicMotion motion="pop" playKey={arriving ? 1 : 0} delay={0.6} className="h-full w-full">
                <Mark kind={kind} accent={place.accent} />
              </MagicMotion>
            </li>
          );
        })}
      </ul>
      <span className={cn("text-ink-700 font-semibold", size === "sm" ? "text-sm" : "text-base")}>
        {label}
      </span>
    </div>
  );
}

function Mark({ kind, accent }: { kind: "flower" | "animal" | "page"; accent: WorldPlace["accent"] }) {
  const hue = ACCENT_VARS[accent];
  if (kind === "flower") {
    return <GroundThing cover="flowers" accent="blossom" className="h-full w-full" />;
  }
  if (kind === "animal") {
    /* A paw print: four toes and a pad, the mark an animal leaves behind. */
    return (
      <svg viewBox="0 0 40 48" className="h-full w-full" aria-hidden>
        <g fill={hue.deep}>
          <ellipse cx="11" cy="16" rx="5" ry="6" />
          <ellipse cx="29" cy="16" rx="5" ry="6" />
          <ellipse cx="4.5" cy="27" rx="4" ry="5" />
          <ellipse cx="35.5" cy="27" rx="4" ry="5" />
          <path d="M20,22 C28,22 34,30 34,37 C34,42 30,45 25,43 C22,42 18,42 15,43 C10,45 6,42 6,37 C6,30 12,22 20,22 Z" />
        </g>
      </svg>
    );
  }
  /* A page with a few lines of story on it, one corner turned. */
  return (
    <svg viewBox="0 0 40 48" className="h-full w-full" aria-hidden>
      <path d="M6,3 H26 L34,11 V45 H6 Z" fill="#fffdf7" stroke={hue.deep} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M26,3 V11 H34" fill={hue.soft} stroke={hue.deep} strokeWidth="2.5" strokeLinejoin="round" />
      <g stroke={hue.base} strokeWidth="3" strokeLinecap="round">
        <path d="M12,20 H28" />
        <path d="M12,27 H28" />
        <path d="M12,34 H22" />
      </g>
    </svg>
  );
}
