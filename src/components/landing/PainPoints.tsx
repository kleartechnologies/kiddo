"use client";

import Image from "next/image";

import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { SectionIntro } from "./SectionIntro";

/**
 * The four moments a parent recognises before they have read a word about
 * the product.
 *
 * This section is the page's opening argument and it is made of photographs,
 * not of copy. Each one is an ordinary evening in an ordinary Malaysian home
 * — the phone asked for again, the video that became ten, the parent caught
 * between letting and stopping, the crying when the screen goes off — and
 * the words underneath only name what the picture already shows.
 *
 * Three rules the layout keeps, because breaking any of them turns a real
 * photograph back into stock:
 *
 * - Nothing is written over an image. The caption sits below it, on paper,
 *   where it is legible at any size and to a screen reader in order.
 * - No overlay, no gradient wash, no duotone. A thin edge and a rounded
 *   corner are the whole treatment.
 * - The four are not four identical cards. On a wide screen the right-hand
 *   column drops half a step so the eye travels down the page instead of
 *   scanning a grid; on a phone they stack and each one gets the full width,
 *   which is where most parents will meet them.
 *
 * `alt` describes the scene rather than repeating the heading, because a
 * parent using a screen reader should get the photograph, not an echo.
 */

/** The four moments, in the order they happen on an ordinary evening. */
const MOMENTS: {
  id: string;
  src: string;
  /** The image's own pixels, so the browser reserves the space before it loads. */
  width: number;
  height: number;
  title: MessageKey;
  body: MessageKey;
  alt: MessageKey;
}[] = [
  {
    id: "phone",
    src: "/illustrations/landing/pain/asks-for-phone.webp",
    width: 1200,
    height: 960,
    title: "landing.pain.phone.title",
    body: "landing.pain.phone.body",
    alt: "landing.pain.phone.alt",
  },
  {
    id: "videos",
    src: "/illustrations/landing/pain/endless-videos.webp",
    width: 1200,
    height: 960,
    title: "landing.pain.videos.title",
    body: "landing.pain.videos.body",
    alt: "landing.pain.videos.alt",
  },
  {
    id: "torn",
    src: "/illustrations/landing/pain/parent-torn.webp",
    width: 1200,
    height: 949,
    title: "landing.pain.torn.title",
    body: "landing.pain.torn.body",
    alt: "landing.pain.torn.alt",
  },
  {
    id: "stop",
    src: "/illustrations/landing/pain/hard-to-stop.webp",
    width: 1200,
    height: 952,
    title: "landing.pain.stop.title",
    body: "landing.pain.stop.body",
    alt: "landing.pain.stop.alt",
  },
];

export function PainPoints() {
  const t = useT();
  return (
    <section aria-labelledby="pain-heading" id="the-evening" className="scroll-mt-24">
      <SectionIntro
        id="pain-heading"
        eyebrow={t("landing.pain.eyebrow")}
        title={t("landing.pain.title")}
      >
        {t("landing.pain.body")}
      </SectionIntro>

      {/* Two columns on a wide screen, with the second staggered downwards —
          an editorial column rather than a four-up grid of cards. */}
      <ul className="mx-auto mt-10 grid max-w-5xl list-none grid-cols-1 gap-10 sm:mt-14 sm:gap-12 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-16">
        {MOMENTS.map((moment, index) => (
          <li
            key={moment.id}
            className={cn("flex flex-col", index % 2 === 1 && "lg:mt-16")}
          >
            <figure className="flex flex-col gap-5">
              <Image
                src={moment.src}
                alt={t(moment.alt)}
                width={moment.width}
                height={moment.height}
                sizes="(min-width: 1024px) 544px, (min-width: 640px) 90vw, 100vw"
                /* The first photograph is the one a parent scrolls to within
                   a second of landing; the rest can wait. */
                loading={index === 0 ? "eager" : "lazy"}
                className="border-edge bg-cream-100 rounded-hero block h-auto w-full border object-cover shadow-soft"
              />
              <figcaption className="flex flex-col gap-2">
                <h3 className="font-display text-2xl leading-tight font-semibold text-balance sm:text-[1.75rem]">
                  {t(moment.title)}
                </h3>
                <p className="text-ink-700 text-lg leading-relaxed text-pretty">
                  {t(moment.body)}
                </p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
