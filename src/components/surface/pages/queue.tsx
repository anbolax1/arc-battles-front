"use client";

import * as React from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  FORMAT_LABEL,
  STATE_LABEL,
  clock,
  dayClock,
  entryStatusLabel,
  entryTone,
  mmss,
  plural,
  todayLabel,
  useQueue,
  useSecondsLeft,
  type UseQueue,
} from "@/lib/queue";
import type { QueueEntry, QueueFormat, QueueMatch, QueueMember, QueueSession, QueueSnapshot } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { SfAvatar } from "@/components/surface/ui";
import "./queue.css";

const W_PEOPLE: [string, string, string] = ["участник", "участника", "участников"];
const W_MATCH: [string, string, string] = ["матч", "матча", "матчей"];

/** Ссылка на игрока или команду. */
function Who({ e }: { e: Pick<QueueEntry, "name" | "teamKey" | "members"> }) {
  const href = e.teamKey ? `/teams/${encodeURIComponent(e.teamKey)}` : e.members[0] ? `/profile/${e.members[0].login}` : "";
  return href ? (
    <Link href={href} className="qu-name">
      {e.name}
    </Link>
  ) : (
    <span className="qu-name">{e.name}</span>
  );
}

function Faces({ members }: { members: QueueMember[] }) {
  return (
    <span className={`qu-faces n${members.length}`} aria-hidden>
      {members.map((m) => (
        <SfAvatar key={m.userId} name={m.displayName || m.login} src={m.avatarUrl} />
      ))}
    </span>
  );
}

function Countdown({ until, serverNow, label }: { until: string; serverNow: () => number; label?: string }) {
  const left = useSecondsLeft(until, serverNow);
  if (left === null) return null;
  return left > 0 ? (
    <span className="qu-timer" role="timer">
      {label}
      {mmss(left)}
    </span>
  ) : (
    <span className="qu-timer late">время вышло</span>
  );
}

/* ---------- Текущий матч ---------- */

const MATCH_STATUS: Record<QueueMatch["status"], string> = {
  preparing: "Подготовка",
  live: "В эфире",
  finished: "Завершён",
  cancelled: "Отменён",
};

function MatchSide({ side, entry, serverNow, match }: { side: number; entry?: QueueEntry; serverNow: () => number; match: QueueMatch }) {
  const info = match.sides.find((s) => s.side === side);
  if (!info) {
    return (
      <div className="qu-side empty">
        <span className="qu-side-tag">{side === 1 ? "A" : "B"}</span>
        <p className="qu-side-name">ждём вызова</p>
      </div>
    );
  }
  const status = entry?.status;
  return (
    <div className={`qu-side ${status ?? ""}`}>
      <span className="qu-side-tag">{side === 1 ? "A" : "B"}</span>
      <Faces members={info.members} />
      <p className="qu-side-name">{info.name}</p>
      <p className="qu-side-meta">
        MMR {info.mmr}
        {match.status === "preparing" && status === "invited" && entry?.inviteExpiresAt && (
          <>
            {" · "}
            <Countdown until={entry.inviteExpiresAt} serverNow={serverNow} label="подтвердить за " />
          </>
        )}
        {match.status === "preparing" && status === "ready" && " · готов"}
        {match.status === "live" && " · выступает"}
      </p>
    </div>
  );
}

function NowPanel({ snap, serverNow }: { snap: QueueSnapshot; serverNow: () => number }) {
  const s = snap.session!;
  const match = snap.match ?? null;
  const shown = match ?? snap.last ?? null;
  const next = snap.entries.find((e) => e.isNext);
  const upcoming = snap.entries.filter((e) => e.status === "waiting" || e.status === "skipped").slice(0, 3);
  const byId = new Map(snap.entries.map((e) => [e.id, e]));

  return (
    <div className="qu-now" aria-live="polite">
      <div className="qu-now-head">
        <p className="sf-eyebrow">Текущий матч · {FORMAT_LABEL[s.format]}</p>
        {shown && (
          <span className={`qu-pill ${shown.status}`}>
            {shown.status === "live" && <i />}
            {MATCH_STATUS[shown.status]}
            {shown.status !== "finished" && ` · №${shown.number}`}
          </span>
        )}
      </div>
      {shown ? (
        <div className="qu-vs">
          {[1, 2].map((n, i) => (
            <React.Fragment key={n}>
              {i > 0 && <span className="qu-vs-mid">vs</span>}
              <MatchSide
                side={n}
                match={shown}
                serverNow={serverNow}
                entry={byId.get(shown.sides.find((x) => x.side === n)?.entryId ?? "")}
              />
            </React.Fragment>
          ))}
        </div>
      ) : (
        <p className="qu-now-empty">Матч пока не начался.{next ? " Следующим вызовут " : ""}{next && <strong>{next.name}</strong>}</p>
      )}
      {!match && snap.last && <p className="qu-now-note">Последний сыгранный матч №{snap.last.number}</p>}
      {match?.status === "live" && match.tournamentId && (
        <p className="qu-now-note">
          <Link href={`/tournament/${match.tournamentId}`}>Смотреть матч →</Link>
        </p>
      )}
      {upcoming.length > 0 && (
        <div className="qu-upnext">
          <span>Дальше</span>
          <ol>
            {upcoming.map((e) => (
              <li key={e.id} className={e.isNext ? "next" : ""}>
                <b>{e.position}</b> {e.name}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------- Личный блок игрока ---------- */

function MePanel({ q, onChanged }: { q: UseQueue; onChanged: () => void }) {
  const { user } = useAuth();
  const snap = q.snap!;
  const s = snap.session!;
  const me = snap.me;
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [team, setTeam] = React.useState("");
  const [sure, setSure] = React.useState(false);

  async function act(action: "join" | "leave" | "confirm", body?: unknown) {
    setBusy(true);
    setErr("");
    try {
      q.apply(await api.post<QueueSnapshot>(`/queue/sessions/${s.id}/${action}`, body));
      setSure(false);
      onChanged();
    } catch (e) {
      setErr(errorText(e));
      void q.reload();
    } finally {
      setBusy(false);
    }
  }

  const mine = snap.entries.find((e) => e.id === me?.entryId);

  if (!user) {
    return (
      <aside className="qu-me">
        <p className="qu-me-title">Хочешь выступить?</p>
        <p className="qu-me-text">
          {s.state === "finished" ? "Сессия завершена, запись закрыта." : s.state === "paused" ? "Очередь на паузе, запись откроется после неё." : s.state === "closed" ? "Запись закрыта организатором." : "Войди в аккаунт, чтобы встать в очередь."}
        </p>
        {s.state === "open" && (
          <Link href="/login?redirect=/queue" className="sf-btn sf-btn-amber">
            Войти
          </Link>
        )}
      </aside>
    );
  }

  if (me?.entryId && mine) {
    const before = me.before;
    return (
      <aside className={`qu-me in ${mine.status}`}>
        <p className="qu-me-title">Твоё место</p>
        <div className="qu-me-pos">
          <b>{me.position}</b>
          <span>
            {me.ahead === 0 ? (mine.status === "performing" ? "ты в эфире" : "первый в очереди") : `перед тобой ${me.ahead} ${plural(me.ahead, W_PEOPLE)}`}
          </span>
        </div>
        <p className="qu-me-text">
          <span className={`qu-badge ${entryTone(mine)}`}>{entryStatusLabel(mine)}</span>
          {before && (
            <>
              {" "}
              Перед тобой выступит <strong>{before.name}</strong>.
            </>
          )}
        </p>
        {mine.teamKey && (
          <p className="qu-me-text">
            Команда «{mine.name}»: {mine.members.map((m) => m.displayName || m.login).join(" и ")}
            {mine.members.length > 0 && s.state !== "finished" && mine.status === "invited" && ` · подтвердили ${mine.members.filter((m) => m.ready).length} из ${mine.members.length}`}
          </p>
        )}
        {me.needsConfirm && (
          <div className="qu-call">
            <p>
              Тебя вызвали!{" "}
              {mine.inviteExpiresAt && <Countdown until={mine.inviteExpiresAt} serverNow={q.serverNow} label="Осталось " />}
            </p>
            <button type="button" className="sf-btn sf-btn-amber" disabled={busy} onClick={() => act("confirm")}>
              Я готов
            </button>
          </div>
        )}
        {me.confirmed && mine.status === "invited" && <p className="qu-me-text">Ты подтвердил. Ждём напарника.</p>}
        {me.canLeave && s.state !== "finished" && (
          <div className="qu-me-actions">
            {sure ? (
              <>
                <button type="button" className="sf-btn sf-btn-line sf-btn-sm" disabled={busy} onClick={() => act("leave")}>
                  Да, выйти
                </button>
                <button type="button" className="sf-btn sf-btn-line sf-btn-sm" onClick={() => setSure(false)}>
                  Остаться
                </button>
              </>
            ) : (
              <button type="button" className="sf-btn sf-btn-line sf-btn-sm" disabled={busy} onClick={() => setSure(true)}>
                Выйти из очереди
              </button>
            )}
          </div>
        )}
        {err && <p className="qu-err" role="alert">{err}</p>}
      </aside>
    );
  }

  const teams = me?.teams ?? [];
  const pick = team || teams.find((t) => !t.blocked)?.teamKey || "";
  return (
    <aside className="qu-me">
      <p className="qu-me-title">{s.format === "2x2" ? "Записать команду" : "Встать в очередь"}</p>
      {s.format === "2x2" && teams.length > 0 && (
        <fieldset className="qu-teams" disabled={busy}>
          <legend className="sr-only">Твоя команда</legend>
          {teams.map((t) => (
            <label key={t.teamKey} className={t.blocked ? "off" : ""}>
              <input type="radio" name="qu-team" value={t.teamKey} checked={pick === t.teamKey} disabled={!!t.blocked} onChange={() => setTeam(t.teamKey)} />
              <span>
                <b>{t.name}</b>
                <small>{t.blocked ?? t.members.map((m) => m.displayName || m.login).join(" и ")}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <p className="qu-me-text">
        {me?.canJoin
          ? "Запись займёт место в очереди перед теми, кто сегодня уже играл."
          : (me?.joinBlocked ?? "Записаться сейчас нельзя.")}
      </p>
      {me?.needsStats && (
        <Link href="/profile" className="sf-btn sf-btn-amber">
          Заполнить профиль
        </Link>
      )}
      <button
        type="button"
        className="sf-btn sf-btn-amber"
        disabled={busy || !me?.canJoin || (s.format === "2x2" && !pick)}
        onClick={() => act("join", s.format === "2x2" ? { teamKey: pick } : undefined)}
      >
        {s.format === "2x2" ? "Записать команду" : "Встать в очередь"}
      </button>
      {err && <p className="qu-err" role="alert">{err}</p>}
    </aside>
  );
}

/* ---------- Список очереди ---------- */

function Row({ e, mine, serverNow }: { e: QueueEntry; mine: boolean; serverNow: () => number }) {
  return (
    <li className={`qu-row ${entryTone(e)} ${mine ? "mine" : ""}`} aria-current={mine ? "true" : undefined}>
      <span className="qu-pos">{e.position}</span>
      <Faces members={e.members} />
      <span className="qu-who">
        <Who e={e} />
        {e.members.length > 1 && <small>{e.members.map((m) => m.displayName || m.login).join(" · ")}</small>}
        {mine && <em className="qu-you">это ты</em>}
        {e.priority && <em className="qu-prio">без очереди</em>}
      </span>
      <span className="qu-mmr">
        <small>MMR</small> {e.mmr}
      </span>
      <span className="qu-time">
        <small>в очереди с</small> {clock(e.joinedAt)}
      </span>
      <span className={`qu-today ${e.todayMatches > 0 ? "has" : ""}`}>
        <small>сегодня</small> {todayLabel(e.todayMatches)}
      </span>
      <span className="qu-state">
        <span className={`qu-badge ${entryTone(e)}`}>{entryStatusLabel(e)}</span>
        {e.status === "invited" && e.inviteExpiresAt && <Countdown until={e.inviteExpiresAt} serverNow={serverNow} />}
      </span>
    </li>
  );
}

function EntryList({ snap, serverNow }: { snap: QueueSnapshot; serverNow: () => number }) {
  const mineId = snap.me?.entryId;
  if (snap.entries.length === 0) {
    return <p className="qu-empty">В очереди пока никого. Запишись первым!</p>;
  }
  return (
    <ol className="qu-list">
      {snap.entries.map((e) => (
        <Row key={e.id} e={e} mine={e.id === mineId} serverNow={serverNow} />
      ))}
    </ol>
  );
}

/* ---------- История ---------- */

function MatchLine({ m }: { m: QueueMatch }) {
  return (
    <li className={m.status}>
      <b>№{m.number}</b>
      <span>{m.sides.map((s) => s.name).join(" vs ") || "без участников"}</span>
      <small>
        {m.status === "cancelled" ? "отменён" : "сыгран"} · {dayClock(m.finishedAt ?? m.createdAt)}
      </small>
    </li>
  );
}

function History({ snap }: { snap: QueueSnapshot }) {
  if (snap.history.length === 0) return null;
  const played = snap.history.filter((m) => m.status === "finished").length;
  return (
    <details className="qu-history" open={snap.session?.state === "finished"}>
      <summary>
        Сыгранные матчи сессии · {played}
      </summary>
      <ul>
        {snap.history.map((m) => (
          <MatchLine key={m.id} m={m} />
        ))}
      </ul>
    </details>
  );
}

function PastSessions({ currentId }: { currentId?: string }) {
  const [list, setList] = React.useState<QueueSession[] | null>(null);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open || list) return;
    api.get<QueueSession[]>("/queue/sessions").then(setList).catch(() => setList([]));
  }, [open, list]);
  return (
    <details className="qu-history" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Все сессии очереди</summary>
      {list && list.length === 0 && <p className="qu-empty">Сессий пока не было.</p>}
      {list && list.length > 0 && (
        <ul className="qu-sessions">
          {list.map((s) => (
            <li key={s.id} className={s.id === currentId ? "cur" : ""}>
              <Link href={s.state === "finished" ? `/queue?session=${s.id}` : `/queue?format=${s.format}`}>{s.title}</Link>
              <small>
                {FORMAT_LABEL[s.format]} · {STATE_LABEL[s.state]} · {s.played} {plural(s.played, W_MATCH)} · {dayClock(s.createdAt)}
              </small>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

/* ---------- Страница ---------- */

export function SurfaceQueue({ initial, format, sessionId }: { initial: QueueSnapshot | null; format?: QueueFormat; sessionId?: string }) {
  const q = useQueue({ format, sessionId, initial });
  const snap = q.snap;
  const s = snap?.session ?? null;
  const formats = new Set((snap?.active ?? []).map((a) => a.format));

  return (
    <>
      <section className="sf-page-head sf-night sf-grain qu-head">
        <Stripes shape="corner" draw className="corner" />
        <div className="sf-wrap">
          <p className="sf-eyebrow">{s ? s.title : "Очередь выступлений"}</p>
          <h1 className="sf-h-big">
            очередь<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead">
            Записывайся на выступление во время стрима, следи за местом и выходи в эфир, когда дойдёт очередь. Порядок один для всех: первым выступает тот, кто записался раньше, а кто уже играл сегодня, пропускает вперёд тех, кто ещё не играл.
          </p>

          <div className="qu-bar">
            {!sessionId && formats.size > 0 && (
              <nav className="qu-tabs" aria-label="Формат очереди">
                {(["1x1", "2x2"] as QueueFormat[]).map((f) => (
                  <Link
                    key={f}
                    href={`/queue?format=${f}`}
                    scroll={false}
                    aria-current={s?.format === f ? "page" : undefined}
                    className={formats.has(f) ? "" : "off"}
                  >
                    {FORMAT_LABEL[f]}
                  </Link>
                ))}
              </nav>
            )}
            {s && (
              <>
                <span className={`qu-state-chip ${s.state}`}>{STATE_LABEL[s.state]}</span>
                <span className="qu-count">
                  {s.state === "finished" ? `сыграно ${s.played} ${plural(s.played, W_MATCH)}` : `в очереди ${snap!.entries.length} ${plural(snap!.entries.length, W_PEOPLE)}`}
                </span>
                {s.state !== "finished" && (
                  <span className={`qu-live ${q.live ? "on" : ""}`} title={q.live ? "Обновляется сразу" : "Обновляется раз в несколько секунд"}>
                    <i /> {q.live ? "онлайн" : "обновление"}
                  </span>
                )}
              </>
            )}
          </div>

          {snap && s && <NowPanel snap={snap} serverNow={q.serverNow} />}
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain qu-sec" aria-labelledby="qu-list-t">
        <div className="sf-wrap">
          {q.error && !snap && <p className="qu-err">{q.error}</p>}
          {snap && !s && (
            <div className="qu-none">
              <h2 className="sf-h-mid">очередь не открыта</h2>
              <p className="sf-lead">Сейчас никто не записывается. Организатор откроет очередь перед стримом, обычно она появляется здесь заранее.</p>
              <PastSessions />
            </div>
          )}
          {snap && s && (
            <div className="qu-layout">
              <div className="qu-main">
                <h2 className="qu-h" id="qu-list-t">
                  {s.state === "finished" ? "Итоговый порядок" : "Кто за кем"}
                </h2>
                <EntryList snap={snap} serverNow={q.serverNow} />
                <History snap={snap} />
                <PastSessions currentId={s.id} />
              </div>
              {s.state !== "finished" ? (
                <MePanel q={q} onChanged={() => undefined} />
              ) : (
                <aside className="qu-me">
                  <p className="qu-me-title">Сессия завершена</p>
                  <p className="qu-me-text">Запись закрыта. Следующая очередь начнётся с нуля, а эта останется здесь как история.</p>
                  <Link href="/queue" className="sf-btn sf-btn-line sf-btn-sm">
                    К текущей очереди
                  </Link>
                </aside>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
