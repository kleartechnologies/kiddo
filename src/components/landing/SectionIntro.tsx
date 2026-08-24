import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * How every section of the landing page introduces itself: a small line
 * that says what kind of thing is coming, a heading, and one sentence more.
 * Sharing it is what keeps the page reading as one voice.
 */
export function SectionIntro({
  id,
  eyebrow,
  title,
  children,
  align = "center",
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl text-left",
      )}
    >
      {eyebrow ? (
        <p className="text-ink-500 font-display text-sm font-semibold tracking-wide uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className="font-display text-3xl leading-tight font-bold text-balance sm:text-4xl lg:text-[2.75rem]"
      >
        {title}
      </h2>
      {children ? (
        <p className="text-ink-700 text-lg leading-relaxed text-pretty sm:text-xl">{children}</p>
      ) : null}
    </div>
  );
}
