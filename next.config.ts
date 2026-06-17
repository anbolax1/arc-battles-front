import type { NextConfig } from "next";

// Go-бэкенд (отдельный проект). В dev фронт проксирует /api на него,
// чтобы запросы были same-origin и работала cookie-сессия.
// В prod /api и /api/ws разводит nginx — там этот rewrite не нужен.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:8080";

const nextConfig: NextConfig = {
  output: "standalone", // для деплоя: сборка локально, на сервер кладём .next/standalone
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
      // Медиа хайлайтов отдаём с того же origin (/media), а не с api-поддомена —
      // иначе iOS/блокеры режут кросс-доменные подзапросы. В prod это делает nginx.
      { source: "/media/:path*", destination: `${BACKEND_ORIGIN}/api/media/:path*` },
    ];
  },
};

export default nextConfig;
