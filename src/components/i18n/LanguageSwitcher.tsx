"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";

import { cn } from "@/lib/cn";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from "@/lib/i18n/locale";
import { setLocale, useTranslation } from "@/lib/i18n/useLocale";

/**
 * Choosing the language, from anywhere in KIDDO.
 *
 * A pill that says which language is on, and a short list to change it. It
 * is built out of the same three things every other control in the chrome is
 * built out of — a `bg-paper` surface, an `border-edge` hairline, a
 * `shadow-soft` — so it belongs to KIDDO rather than looking like a widget
 * that was dropped onto it. Nothing here glows, pulses or slides: a menu that
 * animates is a menu a parent has to wait for, twice, every time they use it.
 *
 * ## What is on the button
 *
 * The globe-and-letter mark, two letters, and a chevron. **BM**, not MS —
 * see `lib/i18n/locale.ts`. Two letters rather than "Bahasa Melayu" because
 * this sits in a header beside a wordmark and a sign-in button on a 360px
 * phone, and the full names are in the list one tap away, written in their
 * own language, which is where a person actually reads them.
 *
 * ## Accessibility
 *
 * The current language is said three ways and shown two: the accessible name
 * of the button is "Language: Bahasa Melayu", each option is a
 * `menuitemradio` whose `aria-checked` carries the state, and the chosen row
 * has a tick *and* heavier type — never colour alone (§18). Escape closes and
 * hands focus back to the button; the arrow keys walk the list; a tap or a
 * focus anywhere else closes it. Every target is at least 48px tall.
 */

export function LanguageSwitcher({
  className,
  align = "right",
}: {
  className?: string;
  /** Which edge the list hangs from. Headers want right; forms want left. */
  align?: "left" | "right";
}) {
  const { locale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  /* Outside, and *outside* means outside this whole control — a pointer down
     on the button itself has to reach the button's own handler, or opening
     the menu and closing it would race each other. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (box.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  };

  const choose = (next: Locale) => {
    setLocale(next);
    close(true);
  };

  /* Up and down walk the two options and stop at the ends rather than
     wrapping: with a list this short, wrapping reads as the focus having
     gone nowhere. */
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(
      box.current?.querySelectorAll<HTMLButtonElement>("[data-locale-option]") ?? [],
    );
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? at + 1 : at - 1;
    items[Math.min(Math.max(next, 0), items.length - 1)]?.focus();
  };

  return (
    <div
      ref={box}
      className={cn("relative", className)}
      data-language-switcher
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close(true);
        }
      }}
      /* Tabbing past the last option, or clicking straight into another
         control, both leave the menu open otherwise. */
      onBlur={(event) => {
        if (!box.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("lang.current", { name: LOCALE_LABELS[locale] })}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "bg-paper border-edge text-ink-900 hover:bg-cream-50",
          "inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-full border px-3",
          "text-sm font-semibold shadow-soft transition-colors sm:min-h-14 sm:px-4 sm:text-base",
        )}
        data-locale-trigger={locale}
      >
        <Languages className="size-4 sm:size-5" aria-hidden />
        <span aria-hidden>{LOCALE_SHORT[locale]}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={t("lang.choose")}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "bg-paper border-edge absolute top-full z-50 mt-2 w-56 list-none",
            "overflow-hidden rounded-2xl border p-1 shadow-lift",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {LOCALES.map((option) => {
            const active = option === locale;
            return (
              <li key={option}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  data-locale-option={option}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left",
                    "transition-colors",
                    active
                      ? "bg-cream-50 text-ink-900 font-semibold"
                      : "text-ink-700 hover:bg-cream-50",
                  )}
                >
                  <span className="text-ink-500 w-8 shrink-0 text-sm font-semibold">
                    {LOCALE_SHORT[option]}
                  </span>
                  <span className="flex-1 text-base">{LOCALE_LABELS[option]}</span>
                  {/* A shape, not a colour: the tick is the state. */}
                  <Check
                    className={cn("size-5 shrink-0", active ? "text-sage-ink" : "invisible")}
                    strokeWidth={3}
                    aria-hidden
                  />
                  {active && <span className="sr-only">{t("lang.selected")}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
