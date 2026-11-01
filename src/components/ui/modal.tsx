"use client";

import * as React from "react";
import { CloseIcon } from "@/components/icons";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** lg и xl - для форм с большим числом настроек. */
  size?: "md" | "lg" | "xl";
}

/** Простая модалка: скрим + панель. Esc и клик по фону — закрывают. */
export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`panel glow-edge max-h-[92vh] w-full overflow-y-auto ${size === "xl" ? "max-w-6xl" : size === "lg" ? "max-w-3xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-display text-lg uppercase">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="text-muted transition hover:text-fg">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-[var(--border)] px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
