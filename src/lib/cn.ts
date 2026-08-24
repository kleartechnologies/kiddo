/**
 * Tiny class-name joiner. Deliberately not `clsx` + `tailwind-merge`: at this
 * stage of the product every variant is authored here, so there is nothing to
 * merge and no reason for the dependency.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
