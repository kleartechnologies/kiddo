"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Pause, Play } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { reportCta } from "@/lib/analytics/events";
import { followHashLink } from "@/lib/hashLink";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/useLocale";
import { PRICING } from "@/lib/routes";
import { SectionIntro } from "./SectionIntro";

/**
 * The product, playing itself, straight after the hero.
 *
 * A parent one tap off a cold advert has heard every claim an app can make;
 * what they have not seen is the thing itself. So the second screen of the
 * page is half a minute of KIDDO being played on a phone — cut from three
 * real recordings in `assets/`, not staged, not mocked — and the four stills
 * beside it are frames from the same recordings. The faint grey bubble in
 * the corner is iOS's own screen recorder, left in on purpose: it is what
 * honesty looks like at this resolution.
 *
 * The video autoplays muted only while it is actually on screen, courtesy of
 * an IntersectionObserver, and never autoplays for someone who asked for
 * reduced motion — that preference is read inside the effect, not through
 * `useReducedMotion`, so the first paint is the same on the server and the
 * client. The button in the corner keeps the person in charge either way:
 * once they pause, the observer stops arguing.
 *
 * At 480×960 and 1.3MB the clip costs less than most hero images; the poster
 * is its own first frame, so nothing flashes when it loads.
 */

/** What a child does in KIDDO, in the child's order: play first. */
const CAN_DO: { id: string; emoji: string; title: MessageKey; body: MessageKey; alt: MessageKey }[] = [
  {
    id: "bermain",
    emoji: "🎮",
    title: "landing.showcase.bermain.title",
    body: "landing.showcase.bermain.body",
    alt: "landing.showcase.bermain.alt",
  },
  {
    id: "belajar",
    emoji: "🧠",
    title: "landing.showcase.belajar.title",
    body: "landing.showcase.belajar.body",
    alt: "landing.showcase.belajar.alt",
  },
  {
    id: "meneroka",
    emoji: "🌎",
    title: "landing.showcase.meneroka.title",
    body: "landing.showcase.meneroka.body",
    alt: "landing.showcase.meneroka.alt",
  },
  {
    id: "menemui",
    emoji: "🔤",
    title: "landing.showcase.menemui.title",
    body: "landing.showcase.menemui.body",
    alt: "landing.showcase.menemui.alt",
  },
];

export function GameplayShowcase() {
  const t = useT();
  return (
    <section aria-labelledby="gameplay-heading" id="gameplay" className="scroll-mt-24">
      <SectionIntro
        id="gameplay-heading"
        eyebrow={t("landing.showcase.eyebrow")}
        title={t("landing.showcase.title")}
      >
        {t("landing.showcase.body")}
      </SectionIntro>

      <div className="mt-10 grid grid-cols-1 items-center gap-10 sm:mt-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14">
        <ShowcaseVideo />

        <div className="flex flex-col gap-6">
          <h3 className="font-display text-center text-2xl leading-snug font-bold text-balance sm:text-3xl lg:text-left">
            {t("landing.showcase.canDo")}
          </h3>
          <ul className="grid list-none grid-cols-2 gap-4 sm:gap-5">
            {CAN_DO.map((item) => (
              <li
                key={item.id}
                className="bg-paper border-edge rounded-card flex flex-col overflow-hidden border shadow-soft"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={`/illustrations/landing/cando/${item.id}.webp`}
                    alt={t(item.alt)}
                    fill
                    sizes="(min-width: 1024px) 220px, 45vw"
                    loading="lazy"
                    className="object-cover object-top"
                  />
                </div>
                <div className="flex flex-col gap-1 p-3 sm:p-4">
                  <h4 className="font-display text-base leading-snug font-semibold sm:text-lg">
                    <span aria-hidden>{item.emoji} </span>
                    {t(item.title)}
                  </h4>
                  <p className="text-ink-700 text-sm leading-snug text-pretty sm:text-base">
                    {t(item.body)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 flex justify-center sm:mt-12">
        <ButtonLink
          href={PRICING}
          size="lg"
          iconRight
          icon={<ArrowRight className="size-6" aria-hidden />}
          onClick={(event) => {
            reportCta("showcase");
            followHashLink(event, "pricing");
          }}
        >
          {t("landing.hero.cta")}
        </ButtonLink>
      </div>
    </section>
  );
}

/**
 * The reel in a phone-shaped frame, the same dark bezel `MeetKiddo` draws
 * around its screenshots, so a recording and a screenshot read as the same
 * device.
 */
function ShowcaseVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  /* The person's word beats the observer's. Once they pause, staying paused
     is the point; once they press play, the observer may pause it again only
     when the video has actually left the screen. */
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const t = useT();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    /* Read here, not through `useReducedMotion`: the first paint must be the
       same on the server and in the browser, and a preference only matters
       once there is a browser to ask. */
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && !still && !userPaused.current) {
          /* Autoplay can be refused (data-saver, unusual browsers); a poster
             and a play button are the whole fallback, so refusal is fine. */
          video.play().catch(() => {});
        } else if (!entry.isIntersecting) {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
    } else {
      userPaused.current = true;
      video.pause();
    }
  };

  return (
    <div className="mx-auto w-full max-w-[16rem] sm:max-w-[17rem]">
      <div className="bg-ink-900 relative rounded-[2.25rem] p-2 shadow-lift">
        <video
          ref={videoRef}
          data-landing-video
          src="/videos/kiddo-showcase.mp4"
          poster="/videos/kiddo-showcase-poster.webp"
          className="aspect-[1/2] w-full rounded-[1.75rem] object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={t("landing.showcase.videoAria")}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t("landing.showcase.pause") : t("landing.showcase.play")}
          className="bg-ink-900/70 text-cream-50 absolute right-4 bottom-4 flex size-12 items-center justify-center rounded-full backdrop-blur-sm"
        >
          {playing ? (
            <Pause className="size-5" aria-hidden />
          ) : (
            <Play className="size-5 translate-x-0.5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
