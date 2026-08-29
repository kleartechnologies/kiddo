"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { reportCta } from "@/lib/analytics/events";
import { planText } from "@/lib/billing/subscription";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/lib/i18n/useLocale";
import { PRICING } from "@/lib/routes";

/**
 * The bar that keeps the way in reachable on a phone.
 *
 * The landing page is long on purpose, and on a phone the hero's button is
 * eight screens above the testimonials. This bar carries the same two facts
 * — the price and the way in — pinned to the bottom edge, so the moment a
 * parent is persuaded is never far from the place they act on it.
 *
 * It knows when to be quiet. Not while the hero is still on screen, because
 * the hero has its own button and two of the same button is a page shouting;
 * not while the pricing section is visible, because a bar pointing at the
 * thing it covers is furniture; and not over the footer, whose links it
 * would otherwise sit on. Three IntersectionObservers, one boolean.
 *
 * Server and client first-paint identically — hidden — and the observers
 * slide it in after hydration, so there is nothing for React to disagree
 * with itself about. The slide is a transition, not an animation, and it
 * respects reduced motion by arriving without travelling.
 */
export function StickyCta() {
  const { locale, t } = useTranslation();
  const monthly = planText("monthly", locale);
  const yearly = planText("yearly", locale);

  const [show, setShow] = useState(false);
  /* What each observer last said, kept between callbacks. */
  const seen = useRef({ heroAbove: false, pricing: false, footer: false });

  useEffect(() => {
    const hero = document.getElementById("hero-heading");
    const pricing = document.getElementById("pricing");
    const footer = document.querySelector("footer");
    if (!hero) return;

    const decide = () => {
      const s = seen.current;
      setShow(s.heroAbove && !s.pricing && !s.footer);
    };

    const observers: IntersectionObserver[] = [];
    const watch = (
      element: Element | null,
      record: (entry: IntersectionObserverEntry) => void,
    ) => {
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          record(entry);
          decide();
        },
        { threshold: 0 },
      );
      observer.observe(element);
      observers.push(observer);
    };

    /* "Past the hero" is the heading being off screen upwards — off screen
       downwards just means the page has not been scrolled yet. */
    watch(hero, (entry) => {
      seen.current.heroAbove = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    });
    watch(pricing, (entry) => {
      seen.current.pricing = entry.isIntersecting;
    });
    watch(footer, (entry) => {
      seen.current.footer = entry.isIntersecting;
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 motion-reduce:transition-none md:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!show}
    >
      <div className="border-edge bg-paper/95 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <p className="text-ink-700 min-w-0 text-sm leading-snug font-medium">
            {t("landing.sticky.price", { monthly: monthly.price, yearly: yearly.price })}
          </p>
          <Link
            href={PRICING}
            aria-label={t("landing.sticky.aria")}
            tabIndex={show ? undefined : -1}
            onClick={() => reportCta("sticky")}
            className="bg-honey-base text-honey-ink font-display flex min-h-12 shrink-0 items-center justify-center rounded-full px-5 text-base font-semibold shadow-[0_4px_0_0_var(--color-honey-deep)]"
          >
            {t("landing.sticky.cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
