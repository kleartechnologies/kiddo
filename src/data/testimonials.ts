/**
 * What parents said about KIDDO, in the words they said it in.
 *
 * These are quotations, so they are data rather than interface copy: they do
 * not live in the catalogue and they are never translated. A Malay parent's
 * sentence stays Malay when an English-reading parent visits, and an English
 * parent's sentence stays English when a Malay-reading parent visits, because
 * translating a quotation makes it something the person did not say. The
 * headings around this section are what change language.
 *
 * `voice` carries the language of the quotation itself so the markup can put
 * a truthful `lang` on the blockquote — which is the difference between a
 * screen reader pronouncing "seronok" and spelling it. The tags are regional
 * (`ms-MY`, `en-MY`) because that is what these voices are: Malaysian Malay
 * and Malaysian English, not the generic languages the interface is written
 * in.
 *
 * Nothing here is a photograph. KIDDO has no picture of these families and
 * will not invent one, so the section shows initials on a coloured disc; a
 * stock photograph beside a real quotation would make the real thing look
 * fake.
 */

import type { Accent } from "@/lib/games/types";

export interface Testimonial {
  /** Stable key for React, and for finding a quotation again in a review. */
  id: string;
  /** The name as the parent gave it. */
  name: string;
  /** The language of the quotation, as a BCP 47 tag for `lang`. */
  voice: "ms-MY" | "en-MY";
  /** The quotation, exactly as it was written. */
  quote: string;
  /** Which of the product's accents the initials disc is drawn in. */
  accent: Accent;
}

/**
 * The quotations, in reading order.
 *
 * Malay and English voices are interleaved rather than grouped, because a
 * Malaysian household reads both and a page that sorts parents by language
 * says something about them that KIDDO does not mean to say.
 */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "anis",
    name: "Anis",
    voice: "ms-MY",
    accent: "sage",
    quote:
      "Sejak guna KIDDO, anak saya dah tak asyik minta YouTube macam dulu. Yang saya suka, dia masih seronok dengan screen time tapi sekarang sambil belajar dan buat aktiviti yang lebih berfaedah.",
  },
  {
    id: "joyce-lin",
    name: "Joyce Lin",
    voice: "en-MY",
    accent: "tide",
    quote:
      "With two children, choosing what to watch was always a battle. One wanted cartoons, the other wanted YouTube. KIDDO gave them something they could both enjoy, while still learning at their own pace.",
  },
  {
    id: "aini",
    name: "Aini",
    voice: "ms-MY",
    accent: "blossom",
    quote:
      "Saya paling suka konsep KIDDO sebab anak saya rasa macam sedang bermain, tapi sebenarnya dia sedang belajar. Sebagai ibu, saya rasa lebih tenang bila bagi dia screen time.",
  },
  {
    id: "allan",
    name: "Allan",
    voice: "en-MY",
    accent: "apricot",
    quote:
      "I used to think screen time was either something I had to allow or something I had to restrict. KIDDO showed me there’s another option. The screen can actually be part of a healthy learning experience when the content is designed well.",
  },
  {
    id: "razif",
    name: "Razif",
    voice: "ms-MY",
    accent: "sprout",
    quote:
      "Dulu bila suruh berhenti YouTube memang susah. Sekarang anak saya sendiri yang excited nak buka KIDDO dan cuba adventure yang baru. Memang nampak perbezaan.",
  },
  {
    id: "lim-mei-ling",
    name: "Lim Mei Ling",
    voice: "en-MY",
    accent: "honey",
    quote:
      "I originally thought KIDDO would just be something my daughter uses on her own. Instead, she often asks me to join her and help with an activity. It’s become a really nice little bonding time for both of us.",
  },
  {
    id: "halim",
    name: "Halim",
    voice: "ms-MY",
    accent: "tide",
    quote:
      "KIDDO sangat membantu saya jadikan screen time lebih teratur. Anak masih boleh guna tablet dan telefon, tetapi bukan sekadar tengok video tanpa henti. Ada aktiviti, cabaran dan pembelajaran.",
  },
  {
    id: "ahmad-fauzul",
    name: "Ahmad Fauzul",
    voice: "en-MY",
    accent: "sage",
    quote:
      "My son usually doesn’t want to talk about school when he gets home. But with KIDDO, he loves telling us about the challenges he completed. He gets genuinely excited when he figures something out by himself.",
  },
  {
    id: "jannah",
    name: "Jannah",
    voice: "ms-MY",
    accent: "blossom",
    quote:
      "Anak-anak sekarang memang susah nak jauh daripada skrin. Jadi daripada kita lawan screen time setiap hari, saya rasa lebih baik jadikan screen time sesuatu yang lebih positif. Itu yang saya suka tentang KIDDO.",
  },
];

/**
 * The one or two letters on the disc beside a quotation.
 *
 * First letters of the first two words, so "Lim Mei Ling" is LM and "Anis"
 * is A. Deliberately not three: at this size a third letter is a smudge.
 */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}
