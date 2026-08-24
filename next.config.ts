import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The measurement scripts (`scripts/measure-*.mjs`) drive a headless Chrome
     at `http://127.0.0.1:4310`, and this Next.js blocks dev-only assets for
     any origin other than the one the server booted with (`localhost`) — the
     page then serves but never hydrates, which a script sees as a strip whose
     chips do nothing. Same machine, same interface; only the spelling of the
     host differs. Development-only setting; production ignores it. */
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
