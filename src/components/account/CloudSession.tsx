"use client";

import { useEffect } from "react";

import { previewEnabled } from "@/lib/cloud/preview";
import { configureSession } from "@/lib/cloud/session";
import { CLOUD_CONFIGURED } from "@/lib/firebase/config";

/**
 * Wires the session store to Firebase once per page load. Renders nothing.
 *
 * The real backend is a dynamic import so the SDK is not in any page's
 * bundle; the session store only calls the loader when a parent has signed
 * in on this device before, or signs in now.
 *
 * An unconfigured build stays device-only — unless this device has opted
 * into the pretend cloud (see `@/lib/cloud/preview`), which the browser
 * measurements use to walk the account screens without credentials.
 */
export function CloudSession() {
  useEffect(() => {
    configureSession(
      CLOUD_CONFIGURED
        ? () => import("@/lib/firebase/backend").then((m) => m.firebaseBackend)
        : previewEnabled()
          ? () => import("@/lib/cloud/preview").then((m) => m.previewBackend)
          : null,
    );
  }, []);
  return null;
}
