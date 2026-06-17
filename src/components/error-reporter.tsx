"use client";

import * as React from "react";

/* ВРЕМЕННЫЙ диагностический оверлей: ловит непойманные JS-ошибки и unhandledrejection
   и показывает их прямо на экране (важно для мобилы, где нет консоли). Инлайн-стили —
   чтобы работал даже если CSS/Tailwind не догрузился. Убрать после диагностики. */
export function ErrorReporter() {
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      const where = e.filename ? `${e.filename.split("/").pop()}:${e.lineno}:${e.colno}` : "";
      setErrors((p) => [...p, `${e.message}${where ? " @ " + where : ""}`]);
    };
    const onRej = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string } | undefined;
      setErrors((p) => [...p, `promise: ${r?.message ?? String(e.reason)}`]);
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (!errors.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "#7f1d1d",
        color: "#fff",
        font: "12px/1.45 ui-monospace, monospace",
        padding: "8px 10px",
        maxHeight: "55vh",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      <b>JS-ошибки ({errors.length}):</b>
      {errors.map((e, i) => (
        <div key={i}>• {e}</div>
      ))}
    </div>
  );
}
