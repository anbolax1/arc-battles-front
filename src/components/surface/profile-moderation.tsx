"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { fmtCount, STAT_LABEL, TOKEN_KINDS, TOKEN_LABEL, tokensWord } from "@/lib/tokens";
import { fullDate, hhmm, shortDate } from "@/components/surface/fmt";
import type { MatchState, PlayerModeration, StatClaim, TokenKind, TokenWallet } from "@/lib/types";

// За что выдан жетон - одной строкой в журнале, как и на сервере.
const MAX_NOTE = 120;
// Причина отказа стоит в профиле игрока одной строкой - как и на сервере.
const MAX_REASON = 160;

const CLAIM_STATUS: Record<StatClaim["status"], string> = {
  pending: "на проверке",
  approved: "подтверждено",
  rejected: "отклонено",
};

/** Модерация на странице игрока: выдача жетонов, «Без очереди» на сегодня, жетон ×2 на матч до его начала
    и скриншоты с часами и ноками. */
export function ProfileModeration({
  userId,
  name,
  wallet,
  initial,
}: {
  userId: string;
  name: string;
  wallet: TokenWallet;
  initial: PlayerModeration;
}) {
  const router = useRouter();
  const [w, setW] = React.useState(wallet);
  const [mod, setMod] = React.useState(initial);
  const [busy, setBusy] = React.useState("");
  const [err, setErr] = React.useState("");
  const [note, setNote] = React.useState("");
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [log, setLog] = React.useState(false);

  // Пропуск, баланс и журнал на странице перерисовываются вместе с панелью.
  async function run(key: string, task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(key);
    setErr("");
    try {
      await task();
      setMod(await api.get<PlayerModeration>(`/users/${userId}/moderation`));
      router.refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy("");
    }
  }

  const grant = (kind: TokenKind, delta: number) =>
    run(`grant:${kind}:${delta}`, async () => {
      setW(await api.post<TokenWallet>(`/users/${userId}/tokens`, { kind, delta, note: note.trim() }));
      setNote("");
    });
  const priority = (on: boolean) =>
    run("priority", async () =>
      setW(on ? await api.post<TokenWallet>(`/users/${userId}/tokens/priority`) : await api.del<TokenWallet>(`/users/${userId}/tokens/priority`)),
    );
  const double = (tournamentId: string, on: boolean) =>
    run(`double:${tournamentId}`, async () => {
      await api.post<MatchState>(`/tournaments/${tournamentId}/double`, { userId, on });
      setW((x) => ({ ...x, double: x.double + (on ? -1 : 1) }));
    });
  const decide = (c: StatClaim, approve: boolean, why = "") =>
    run(`claim:${c.id}`, () => api.post<StatClaim>(`/stat-claims/${c.id}/decide`, { approve, reason: why }));

  const count: Record<TokenKind, number> = { double: w.double, priority: w.priority, reset: w.reset };
  const pending = mod.claims.filter((c) => c.status === "pending");
  const decided = mod.claims.filter((c) => c.status !== "pending").slice(0, 4);

  return (
    <section className="pf-desk pf-mod" aria-label={`Модерация: ${name}`}>
      <header className="pf-mod-head">
        <p className="sf-field-label">Модерация · жетоны и скриншоты игрока</p>
        {err && (
          <p className="sf-field-note bad" role="alert">
            {err}
          </p>
        )}
      </header>

      <div className="pf-mod-tokens">
        <label className="sf-field">
          <span className="sf-field-label">За что выдаёте (необязательно, для журнала)</span>
          <input className="sf-input" maxLength={MAX_NOTE} placeholder="Например: приз шоу-матча" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {TOKEN_KINDS.map((k) => (
          <div key={k} className="pf-mod-token">
            <div className="pf-mod-row">
              <span className="pf-mod-name">{TOKEN_LABEL[k]}</span>
              <b className="pf-mod-count">{count[k]}</b>
              <span className="pf-mod-step">
                <button type="button" className="sf-btn sf-btn-line sf-btn-sm" disabled={!!busy || count[k] < 1} onClick={() => grant(k, -1)} aria-label={`Забрать жетон: ${TOKEN_LABEL[k]}`}>
                  −1
                </button>
                <button type="button" className="sf-btn sf-btn-amber sf-btn-sm" disabled={!!busy} onClick={() => grant(k, 1)} aria-label={`Выдать жетон: ${TOKEN_LABEL[k]}`}>
                  +1
                </button>
              </span>
            </div>

            {k === "double" &&
              (mod.matches.length ? (
                mod.matches.map((m) => (
                  <div key={m.tournamentId} className="pf-mod-sub">
                    <Link href={`/tournament/${m.tournamentId}`}>{m.title}</Link>
                    <small>{m.mode === "2x2" ? "2×2 - удвоит MMR команды" : m.startsAt ? `${shortDate(m.startsAt)} · ${hhmm(m.startsAt)}` : "не начался"}</small>
                    {m.active ? (
                      <button type="button" className="sf-btn sf-btn-line sf-btn-sm" disabled={!!busy} onClick={() => double(m.tournamentId, false)}>
                        Снять ×2
                      </button>
                    ) : m.blocked ? (
                      <small className="pf-mod-warn">{m.blocked}</small>
                    ) : (
                      <button type="button" className="sf-btn sf-btn-amber sf-btn-sm" disabled={!!busy || w.double < 1} onClick={() => double(m.tournamentId, true)}>
                        Поставить ×2
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="sf-field-note">Ставится на матч до его начала. Сейчас у игрока нет матча, который ещё не начался.</p>
              ))}

            {k === "priority" && (
              <div className="pf-mod-sub">
                {w.priorityUntil ? (
                  <>
                    <small className="pf-mod-on">Активен до конца игрового дня</small>
                    <button type="button" className="sf-btn sf-btn-line sf-btn-sm" disabled={!!busy} onClick={() => priority(false)}>
                      Отменить
                    </button>
                  </>
                ) : w.priorityNext ? (
                  <small>
                    Перезарядка: снова можно с {shortDate(w.priorityNext)} {hhmm(w.priorityNext)}
                  </small>
                ) : (
                  <button type="button" className="sf-btn sf-btn-amber sf-btn-sm" disabled={!!busy || w.priority < 1} onClick={() => priority(true)}>
                    Активировать на сегодня
                  </button>
                )}
              </div>
            )}

            {k === "reset" && (
              <p className="sf-field-note">
                Активирует сам игрок в личном кабинете{w.lastReset ? ` · последний сброс ${fullDate(w.lastReset)}` : ""}.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="pf-mod-claims">
        <p className="sf-field-label">Скриншоты · часы и ноки</p>
        {pending.length ? (
          pending.map((c) => (
            <div key={c.id} className="pf-mod-claim">
              <a href={c.screenshotUrl} target="_blank" rel="noopener noreferrer" className="pf-mod-shot" aria-label="Скриншот в полном размере">
                {/* eslint-disable-next-line @next/next/no-img-element -- скриншот из хранилища медиа */}
                <img src={c.screenshotUrl} alt="" />
              </a>
              <div className="pf-mod-claim-body">
                <span>
                  {STAT_LABEL[c.kind]} <b>{fmtCount(c.value)}</b>
                </span>
                <small>
                  {c.previous != null ? `было подтверждено ${fmtCount(c.previous)} · ` : ""}
                  {fullDate(c.createdAt)}
                </small>
                {rejecting === c.id ? (
                  <form
                    className="pf-mod-reject"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setRejecting(null);
                      void decide(c, false, reason.trim());
                    }}
                  >
                    <input className="sf-input" maxLength={MAX_REASON} placeholder="Причина - её увидит игрок" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
                    <button type="submit" className="sf-btn sf-btn-line sf-btn-sm" disabled={!!busy}>
                      Отклонить
                    </button>
                  </form>
                ) : (
                  <span className="pf-mod-step">
                    <button type="button" className="sf-btn sf-btn-amber sf-btn-sm" disabled={!!busy} onClick={() => decide(c, true)}>
                      Подтвердить
                    </button>
                    <button
                      type="button"
                      className="sf-btn sf-btn-line sf-btn-sm"
                      disabled={!!busy}
                      onClick={() => {
                        setReason("");
                        setRejecting(c.id);
                      }}
                    >
                      Отклонить
                    </button>
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="sf-field-note">На проверке ничего нет.</p>
        )}
        {decided.length > 0 && (
          <ul className="pf-mod-done">
            {decided.map((c) => (
              <li key={c.id}>
                {STAT_LABEL[c.kind]} {fmtCount(c.value)} · {CLAIM_STATUS[c.status]}
                {c.reason ? ` · ${c.reason}` : ""}
                {c.status === "approved" ? (
                  <button type="button" disabled={!!busy} onClick={() => decide(c, false)}>
                    отклонить
                  </button>
                ) : (
                  <button type="button" disabled={!!busy} onClick={() => decide(c, true)}>
                    подтвердить
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pf-mod-log">
        <button type="button" className="pf-mod-toggle" aria-expanded={log} onClick={() => setLog((x) => !x)}>
          Журнал жетонов {log ? "▴" : "▾"}
        </button>
        {log &&
          (mod.ledger.length ? (
            <ul>
              {mod.ledger.map((e) => (
                <li key={e.id}>
                  <span>{fullDate(e.createdAt)}</span>
                  <b className={e.delta > 0 ? "up" : "down"}>
                    {e.delta > 0 ? "+" : "−"}
                    {Math.abs(e.delta)} {tokensWord(e.delta)}
                  </b>
                  <span>
                    {TOKEN_LABEL[e.kind]}
                    {e.match ? ` · ${e.match}` : ""}
                    {e.note ? ` · ${e.note}` : ""}
                    {e.by ? ` · ${e.by}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sf-field-note">Жетонов игроку ещё не выдавали.</p>
          ))}
      </div>
    </section>
  );
}
