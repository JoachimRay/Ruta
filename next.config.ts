import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly set Turbopack root to this project directory to avoid "multiple lockfiles" warnings
  // Next.js 15 supports a top-level `turbopack` config with `root`.
  turbopack: {
    // use __dirname so this points to d:/Github_Repository_Files/Type/Ruta at runtime
    root: __dirname,
  },
};

export default nextConfig;
