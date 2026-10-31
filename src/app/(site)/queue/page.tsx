import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDesign } from "@/lib/design";
import { serverGetOptional } from "@/lib/server-api";
import type { QueueFormat, QueueSnapshot } from "@/lib/types";
import { SurfaceQueue } from "@/components/surface/pages/queue";

export const metadata: Metadata = {
  title: "Очередь выступлений — GOARC.PRO",
  description: "Запишись на выступление во время стрима, следи за своим местом и смотри, кто выходит в эфир следующим.",
};

type Props = { searchParams: Promise<{ format?: string; session?: string }> };

/** Очередь выступлений есть только в новом дизайне. Начальное состояние берём на сервере, дальше страница живёт по WebSocket. */
export default async function QueuePage({ searchParams }: Props) {
  if ((await getDesign()) !== "surface") notFound();
  const sp = await searchParams;
  const format: QueueFormat | undefined = sp.format === "1x1" || sp.format === "2x2" ? sp.format : undefined;
  const sessionId = sp.session && /^[\w-]{1,64}$/.test(sp.session) ? sp.session : undefined;
  const path = sessionId ? `/queue/sessions/${sessionId}` : `/queue${format ? `?format=${format}` : ""}`;
  const initial = await serverGetOptional<QueueSnapshot>(path, { auth: true }).catch(() => null);
  // key: смена формата или сессии пересоздаёт подключения страницы
  return <SurfaceQueue key={sessionId ?? format ?? "live"} initial={initial} format={format} sessionId={sessionId} />;
}
