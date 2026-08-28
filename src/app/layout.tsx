import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";

import { CloudSession } from "@/components/account/CloudSession";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { HtmlLang } from "@/components/i18n/HtmlLang";
import { MotionProvider } from "@/components/MotionProvider";
import { DEFAULT_LOCALE, LOCALE_HTML_LANG } from "@/lib/i18n/locale";
import "./globals.css";

/** Display face: rounded, friendly, still confident enough for a parent. */
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Reading face: high x-height and open shapes, easy for early readers. */
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

/**
 * TODO(launch): set NEXT_PUBLIC_SITE_URL to the production origin (for example
 * https://kiddo.example) in the hosting environment. Until then Next falls back
 * to localhost for absolute social-image URLs, and no canonical is emitted.
 * The domain is deliberately not hard-coded here: it is not decided yet.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: {
    default: "KIDDO — Main. Belajar. Ketawa.",
    template: "%s · KIDDO",
  },
  description:
    "Dunia permainan kecil yang selamat untuk anak berumur 4 hingga 8 tahun.",
  applicationName: "KIDDO",
};

export const viewport: Viewport = {
  themeColor: "#fff7ec",
  // Children pinch the screen constantly; keep the layout stable but never
  // disable zoom entirely, that would break accessibility for parents.
  maximumScale: 5,
  // `Screen` pads with env(safe-area-inset-*); those are 0 unless the page
  // opts into the full viewport, which matters once KIDDO is installed.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /* The language of the file itself. Every public page is prerendered in
       one language and that language is KIDDO's default, Bahasa Melayu; a
       parent who has chosen English gets both the strings and this attribute
       corrected in the same commit as hydration (see `components/i18n`). */
    <html
      lang={LOCALE_HTML_LANG[DEFAULT_LOCALE]}
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <HtmlLang />
        <CloudSession />
        {/* Parent-facing pages only; a child's screen loads nothing. */}
        <MetaPixel />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
