import type { Metadata } from "next";

import { WorldsPlayground } from "@/components/dev/WorldsPlayground";

export const metadata: Metadata = {
  title: "Game worlds",
  robots: { index: false, follow: false },
};

/**
 * Internal reference for the three game worlds. Deliberately not linked from
 * KIDDO World and deliberately not a game — it exists so a reviewer can stand
 * the Counting Garden, Animal Adventure and Word World side by side and ask
 * one question: would a child know they had entered a different game?
 */
export default function WorldsPlaygroundPage() {
  return <WorldsPlayground />;
}
