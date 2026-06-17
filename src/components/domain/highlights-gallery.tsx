"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { HighlightsGrid } from "./highlights-grid";
import { HighlightUpload } from "./highlight-upload";
import type { Highlight } from "@/lib/types";

/* Публичная галерея хайлайтов: грид одобренных + «показать ещё» (подгрузка с бэка).
   Для авторизованных — кнопка/форма добавления (ссылка или файл). */
export function HighlightsGallery({
  initialItems,
  initialTotal,
  pageSize,
  tournaments,
}: {
  initialItems: Highlight[];
  initialTotal: number;
  pageSize: number;
  tournaments: { id: string; title: string }[];
}) {
  const { user } = useAuth();
  const [items, setItems] = React.useState<Highlight[]>(initialItems);
  const [total, setTotal] = React.useState(initialTotal);
  const [loading, setLoading] = React.useState(false);
  const [showUpload, setShowUpload] = React.useState(false);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await api.get<{ items: Highlight[]; total: number }>(
        `/highlights?limit=${pageSize}&offset=${items.length}`,
      );
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...res.items.filter((x) => !seen.has(x.id))];
      });
      setTotal(res.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {user && (
        <div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowUpload((s) => !s)}>
            <span>{showUpload ? "Скрыть форму" : "+ Добавить хайлайт"}</span>
          </button>
          {showUpload && (
            <div className="mt-4">
              <HighlightUpload tournaments={tournaments} onDone={() => setShowUpload(false)} />
            </div>
          )}
        </div>
      )}

      <HighlightsGrid items={items} />

      {items.length < total && (
        <div className="flex justify-center">
          <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={loadMore}>
            <span>{loading ? "Загрузка…" : "Показать ещё"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
