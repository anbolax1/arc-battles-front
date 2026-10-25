import Link from "next/link";
import type { Belt } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Panel } from "@/components/ui/card";
import { BeltArt } from "@/components/surface/belt-art";
import { W_DEF, W_GAMEDAY, holderName } from "@/components/surface/belt-lib";
import { plural } from "@/components/surface/season-lib";

/** Осталось столько игровых дней без матча - карточка подсвечивает, что носителю пора дать матч. */
const RUST_WARN = 2;

/** Пояс лиги в кабинете: у кого он и сколько игровых дней носитель может не играть, пока пояс не выпал. */
export function BeltAdminCard({ belt }: { belt: Belt | null }) {
  if (!belt || !belt.reigns.length) return null;
  const left = belt.rustLimit - belt.rust;
  const hot = !!belt.holder && left <= RUST_WARN;
  const leaders = belt.leaders ?? [];

  return (
    <Panel className={`flex flex-wrap items-center gap-x-6 gap-y-4 p-5 ${hot ? "shadow-[inset_0_0_0_1px_var(--danger)]" : ""}`}>
      <div className="w-44 flex-none rounded-md bg-[#130918] px-3 py-2">
        <BeltArt
          id="admin-belt"
          name={belt.holder ? holderName(belt.holder) : undefined}
          stars={belt.defenses}
          rust={belt.holder ? belt.rust / belt.rustLimit : 0}
          vacant={!belt.holder}
          className="block h-auto w-full"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg uppercase">Пояс лиги</h3>
          {belt.holder ? (
            <span className="badge badge-champ">
              <span>
                у {holderName(belt.holder)} с {fmtDate(belt.since)} · {belt.defenses} {plural(belt.defenses, W_DEF)}
              </span>
            </span>
          ) : (
            <span className="badge badge-official">
              <span>ничей с {fmtDate(belt.droppedAt)}</span>
            </span>
          )}
        </div>
        {belt.holder ? (
          <>
            <div className="flex max-w-md items-center gap-3">
              <span className="field-label flex-none">
                Ржавчина {belt.rust} из {belt.rustLimit}
              </span>
              <span className="flex flex-1 gap-1" aria-hidden>
                {Array.from({ length: belt.rustLimit }, (_, i) => (
                  <i
                    key={i}
                    className={`h-2 flex-1 rounded-sm ${i < belt.rust ? (i >= belt.rustLimit - RUST_WARN ? "bg-danger" : "bg-[#b0582c]") : "bg-[var(--surface-2)]"}`}
                  />
                ))}
              </span>
            </div>
            <p className={`text-sm ${hot ? "text-danger" : "text-muted"}`}>
              {belt.rust === 0
                ? `Ржавчины нет. Пояс выпадет, если носитель пропустит ${belt.rustLimit} ${plural(belt.rustLimit, W_GAMEDAY)} подряд.`
                : `Ещё ${left} ${plural(left, W_GAMEDAY)} без матча носителя — и пояс выпадет.`}
              {hot && " Поставьте ему регулярный матч."}
            </p>
            <p className="text-xs text-muted">Игровой день — день, когда в лиге был хотя бы один регулярный матч 1×1. Шоу-матчи пояс не разыгрывают.</p>
          </>
        ) : (
          <p className="text-sm text-muted">
            {leaders.length
              ? `Ничей пояс разыграет ближайший регулярный матч лидера таблицы: ${leaders.map(holderName).join(" или ")}. Победитель заберёт пояс.`
              : "Ничей пояс разыграет первый регулярный матч сезона: победитель заберёт пояс."}
          </p>
        )}
      </div>
      <Link href="/belt" target="_blank" className="btn btn-ghost btn-sm">
        <span>Страница пояса →</span>
      </Link>
    </Panel>
  );
}
