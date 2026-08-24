"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * One place to set the motion rules for the whole product.
 *
 * `reducedMotion="user"` means every animation in KIDDO automatically respects
 * the operating system's reduce-motion setting, without any component having
 * to remember to check.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
