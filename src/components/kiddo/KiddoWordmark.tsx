import { cn } from "@/lib/cn";

/**
 * The KIDDO wordmark. Letters alternate through the accent families so the
 * brand reads as the same family of colours the games use.
 */
const LETTERS = [
  { char: "K", className: "text-honey-deep" },
  { char: "I", className: "text-apricot-base" },
  { char: "D", className: "text-sprout-deep" },
  { char: "D", className: "text-tide-base" },
  { char: "O", className: "text-sage-base" },
];

export function KiddoWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-2xl",
    md: "text-3xl sm:text-4xl",
    lg: "text-5xl sm:text-6xl",
  } as const;

  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight",
        sizes[size],
        className,
      )}
      aria-label="KIDDO"
    >
      {LETTERS.map((letter, index) => (
        <span key={index} aria-hidden className={letter.className}>
          {letter.char}
        </span>
      ))}
    </span>
  );
}
