import Link from "next/link";

import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { PARENTS, PRICING, PRIVACY } from "@/lib/routes";

/**
 * The bottom of the public pages: the brand again, the three places a
 * grown-up can go, and the one line about data that the privacy page
 * expands on. Nothing here is a form or a feed.
 */
const LINKS = [
  { href: PRICING, label: "Pricing" },
  { href: PARENTS, label: "For parents" },
  { href: PRIVACY, label: "Privacy" },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-edge mt-16 flex flex-col gap-6 border-t pt-8 sm:mt-24 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <KiddoWordmark size="sm" />
        <p className="text-ink-500 max-w-sm text-sm leading-snug">
          A small, safe play world of learning adventures for children aged 4 to 8.
          A parent account, no ads, nothing sold to your child.
        </p>
      </div>
      <nav aria-label="Footer">
        <ul className="flex list-none flex-wrap gap-x-2 gap-y-1">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-ink-700 hover:bg-ink-900/5 -mx-1 inline-flex min-h-12 items-center rounded-full px-3 text-base font-semibold transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
