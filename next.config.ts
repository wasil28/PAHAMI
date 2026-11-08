import type { NextConfig } from "next";

// cacheComponents sengaja tidak diaktifkan: hampir semua halaman bergantung pada sesi login
// (cookie Supabase), jadi rendering dinamis per permintaan lebih sederhana dan aman.
const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
