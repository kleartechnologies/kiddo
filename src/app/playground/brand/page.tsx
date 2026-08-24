import type { Metadata } from "next";

import { BrandSheet } from "@/components/dev/BrandSheet";

export const metadata: Metadata = {
  title: "Brand assets",
  robots: { index: false, follow: false },
};

/**
 * Internal. The app icon and the social card, laid out at exact pixel sizes
 * from the production character and wordmark, so that
 * `scripts/make-brand-assets.mjs` can photograph them into the PNG files the
 * install manifest and link previews need. Not linked from anywhere.
 */
export default function BrandPage() {
  return <BrandSheet />;
}
