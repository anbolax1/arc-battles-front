"use client";

import type { Participant } from "@/lib/types";

/** Кто первым ходит в пиках-банах (сторона A): ведущий ставит его по жребию на эфире. Ходы записаны за
    сторонами, поэтому сделанные переходят вместе со стороной. */
export function FirstSide({
  sides,
  busy,
  moved,
  onPick,
}: {
  sides: [Participant | null, Participant | null];
  busy: boolean;
  /** Ходы уже сделаны. */
  moved?: boolean;
  onPick: (participantId: string) => void;
}) {
  const [a, b] = sides;
  if (!a || !b) return null;
  // Кнопки по алфавиту, а не по сторонам: иначе нажатая перепрыгивала бы на место первой.
  const both = [a, b].sort((x, y) => x.name.localeCompare(y.name, "ru"));
  return (
    <div className="space-y-1.5">
      <span className="field-label block">Первым ходит</span>
      <div className="seg flex-wrap">
        {both.map((p) => (
          <button
            key={p.id}
            type="button"
            className="seg-btn"
            aria-pressed={p.id === a.id}
            disabled={busy}
            onClick={() => p.id !== a.id && onPick(p.id)}
          >
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      {moved && <span className="block text-xs text-muted">Сделанные ходы перейдут вместе со стороной</span>}
    </div>
  );
}
