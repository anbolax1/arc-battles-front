"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";

/** Стилизованное окно подтверждения (в духе сайта) вместо window.confirm. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  danger = true,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>
            <span>{cancelLabel}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${danger ? "btn-danger" : "btn-primary"}`}
            disabled={busy}
            onClick={onConfirm}
          >
            <span>{busy ? "…" : confirmLabel}</span>
          </button>
        </>
      }
    >
      <p className="text-sm text-muted">{message}</p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </Modal>
  );
}
