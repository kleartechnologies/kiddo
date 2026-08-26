import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { cn } from "@/lib/cn";
import { LANDING, PARENTS, PRICING, PRIVACY } from "@/lib/routes";

/**
 * The public header: the brand, three quiet links and one door into KIDDO.
 *
 * Deliberately the same shape as the child's `WorldHeader` — wordmark on the
 * left, one round button on the right — so walking from the landing page
 * into the product does not feel like changing websites. The difference is
 * who it speaks to: the links are for a grown-up reading, and on a phone
 * they fold away so the one thing left is the way back in.
 *
 * That one thing is "Sign in", not "Open KIDDO": a parent who arrives here
 * has either not paid yet — in which case the page below is what they came
 * for — or has an account, and the parent area is where it lives.
 */
const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: PRICING, label: "Pricing" },
  { href: PARENTS, label: "For parents" },
  { href: PRIVACY, label: "Privacy" },
] as const;

export function LandingHeader({ className }: { className?: string }) {
  return (
    <header className={cn("flex items-center justify-between gap-3 sm:gap-6", className)}>
      <Link
        href={LANDING}
        aria-label="KIDDO home"
        className="-mx-2 flex min-h-14 items-center rounded-2xl px-2"
      >
        <KiddoWordmark />
      </Link>

      <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
        <ul className="hidden list-none items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-ink-700 hover:bg-ink-900/5 inline-flex min-h-12 items-center rounded-full px-4 text-base font-semibold transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={PARENTS}
          data-landing-signin
          className="bg-paper border-edge text-ink-900 hover:bg-cream-50 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-soft transition-colors sm:min-h-14 sm:px-5 sm:text-base"
        >
          Sign in
          <ArrowRight className="size-4 sm:size-5" aria-hidden />
        </Link>
      </nav>
    </header>
  );
}
