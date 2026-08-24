import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";

import { CloudSession } from "@/components/account/CloudSession";
import { MotionProvider } from "@/components/MotionProvider";
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
    default: "KIDDO — Play. Learn. Smile.",
    template: "%s · KIDDO",
  },
  description:
    "A small, safe play world of bite-sized games for children aged 4 to 8.",
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
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <CloudSession />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
