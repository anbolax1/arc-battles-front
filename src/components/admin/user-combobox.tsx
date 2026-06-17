"use client";

import * as React from "react";
import type { User } from "@/lib/types";

export interface PickedMember {
  name: string;
  userId?: string;
}

/** Поиск-комбобокс участника: печатаешь ник (свободное имя) или выбираешь аккаунт из списка.
    Список свёрнут по умолчанию, открывается по фокусу, закрывается по клику вне/выбору. */
export function UserCombobox({
  users,
  exclude,
  value,
  onChange,
  placeholder,
}: {
  users: User[];
  exclude?: Set<string>;
  value: PickedMember;
  onChange: (m: PickedMember) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = value.name.trim().toLowerCase();
  const avail = users.filter(
    (u) => !exclude?.has(u.id) && (!q || (u.displayName || "").toLowerCase().includes(q) || u.login.toLowerCase().includes(q)),
  );

  return (
    <div className="relative" ref={ref}>
      <input
        className="input"
        autoComplete="off"
        placeholder={placeholder ?? "Ник или аккаунт…"}
        value={value.name}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange({ name: e.target.value, userId: undefined });
          setOpen(true);
        }}
      />
      {value.userId && !open && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ok">✓ аккаунт</span>}
      {open && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_0_0_1px_var(--border)]">
          {avail.slice(0, 50).map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
              onClick={() => {
                onChange({ name: u.displayName || u.login, userId: u.id });
                setOpen(false);
              }}
            >
              <span className="truncate">{u.displayName || u.login}</span>
              <span className="truncate text-xs text-muted">@{u.login}</span>
            </button>
          ))}
          {!avail.length && <div className="px-3 py-3 text-xs text-muted">Аккаунт не найден — имя сохранится как есть.</div>}
        </div>
      )}
    </div>
  );
}
