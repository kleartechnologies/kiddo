"use client";

import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/useLocale";

/**
 * The launch offer, drawn once and shown three times.
 *
 * The page says its price at the hero, at the pricing card and at the close,
 * and it must be the same object each time — the "Harga Pelancaran" ribbon,
 * the old price struck through, the launch price much larger than anything
 * near it, and the two sentences that make the number make sense: paid once,
 * kept for good. Sharing the component is what keeps the three tellings from
 * drifting apart, in copy or in shape.
 *
 * It is dressed in honey on purpose. Honey is the reward colour everywhere
 * else in KIDDO — stars, confetti, the buy button — so the offer reads as a
 * prize from the same world, not a sale sticker pasted on from someone
 * else's shop. One soft gradient, one glow behind the number, and nothing
 * that moves: the treatment is a composition, so there is nothing for
 * reduced motion to reduce.
 *
 * The figures arrive as props rather than being imported here, so this one
 * component never decides what KIDDO costs — its callers read
 * `LIFETIME_PRICE` and `ORIGINAL_PRICE` from `lib/billing/access`, the same
 * module the server bills from. The struck price is decoration to a screen
 * reader; the sr-only sentence says the same thing in words.
 *
 * `framed` is whether it brings its own card. The hero and the close stand
 * it on the page, so it wears the card itself and the ribbon sits astride
 * the card's top edge; the pricing section already is a card, and there it
 * renders bare inside it with the ribbon in flow.
 */

type OfferScale = "hero" | "focal" | "compact";

/** How large the launch price is, per telling. Focal is the pricing card. */
const PRICE_SIZE: Record<OfferScale, string> = {
  hero: "text-5xl min-[380px]:text-6xl",
  focal: "text-6xl sm:text-7xl",
  compact: "text-4xl sm:text-5xl",
};

const WAS_SIZE: Record<OfferScale, string> = {
  hero: "text-lg min-[380px]:text-xl",
  focal: "text-xl sm:text-2xl",
  compact: "text-base sm:text-lg",
};

export function LaunchOffer({
  scale = "hero",
  framed = true,
  price,
  was,
  className,
}: {
  scale?: OfferScale;
  framed?: boolean;
  /** Today's price, already formatted: the caller's `LIFETIME_PRICE`. */
  price: string;
  /** The pre-launch price, struck through: the caller's `ORIGINAL_PRICE`. */
  was: string;
  className?: string;
}) {
  const t = useT();

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 text-center",
        framed &&
          "rounded-card border-honey-base/60 from-honey-soft via-paper to-honey-soft shadow-lift mt-4 border-2 bg-gradient-to-b px-6 pt-7 pb-6",
        className,
      )}
    >
      {/* A soft honey glow under the number. Decoration, and nothing else. */}
      <div
        aria-hidden
        className="bg-honey-base/25 absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-[50%] blur-2xl"
      />

      <span
        data-pricing-note
        className={cn(
          "bg-honey-base text-honey-ink font-display rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.14em] whitespace-nowrap uppercase sm:text-sm",
          framed ? "border-paper shadow-soft absolute -top-4 border-2" : "relative",
        )}
      >
        ⭐ {t("offer.note")}
      </span>

      <p className="relative flex flex-wrap items-baseline justify-center gap-x-3">
        <s className={cn("text-ink-500 line-through", WAS_SIZE[scale])} data-pricing-was aria-hidden>
          {was}
        </s>
        <span className="sr-only">{t("offer.was", { price: was })}</span>
        <span
          data-pricing-price
          className={cn("font-display text-ink-900 leading-none font-bold", PRICE_SIZE[scale])}
        >
          {price}
        </span>
      </p>

      <p className="font-display text-ink-900 relative text-base leading-snug font-semibold sm:text-lg">
        {t("offer.payOnce")}
        <br />
        <span className="text-ink-700 font-medium">{t("offer.lifetimeLine")}</span>
      </p>
    </div>
  );
}
