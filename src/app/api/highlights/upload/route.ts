/* Прокси загрузки видео-файла хайлайта на Go-бэкенд.
   Зачем отдельный route-handler, а не общий /api-rewrite: dev-rewrite Next плохо
   проксирует потоковое тело multipart (POST зависает). Здесь мы стримим тело запроса
   напрямую на бэкенд (duplex: "half") с пробросом cookie сессии — работает и в dev,
   и в prod (фронт-standalone ходит на INTERNAL_API_URL). Путь перекрывает rewrite. */

export const runtime = "nodejs";

const INTERNAL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8080";

export async function POST(req: Request): Promise<Response> {
  const res = await fetch(`${INTERNAL}/api/highlights`, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/octet-stream",
      ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie") as string } : {}),
    },
    body: req.body,
    // duplex обязателен для стриминга тела запроса в undici/Node fetch (нет в типах RequestInit).
    duplex: "half",
    cache: "no-store",
  } as RequestInit & { duplex: "half" });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
