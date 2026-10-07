import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components fica desligado: todo o app é autenticado e por
  // organização, então nada é pré-renderável de forma estática.
  // Ver CLAUDE.md > Decisões tomadas durante a construção.
  cacheComponents: false,
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
