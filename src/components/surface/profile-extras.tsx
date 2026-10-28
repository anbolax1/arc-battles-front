"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, apiFetch, errorText } from "@/lib/api";
import { fmtCount, STAT_KINDS, STAT_LABEL, STAT_LIMIT } from "@/lib/tokens";
import type { FavoriteOptions, MyExtras, PlayerFavorites, StatClaim, StatKind, TeamMember, TokenWallet } from "@/lib/types";

/** Форматы и предел скриншота - те же, что проверяет сервер. */
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_SHOT_MB = 10;
const MAX_TEAMMATES = 5;
/** Сколько держать кнопку сброса: подтверждение, которое не нажать случайно. */
const HOLD_MS = 5000;

const CLAIM_NOTE: Record<StatClaim["status"], string> = {
  pending: "на проверке у модератора - в профиле пока «не подтверждено»",
  approved: "подтверждено модератором",
  rejected: "отклонено",
};

/** Часы в игре или ноки за всё время: число и скриншот из игры, которые сверит модератор. */
function GameStatForm({ kind, claim }: { kind: StatKind; claim?: StatClaim }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const id = `pf-stat-${kind}`;
  const n = Number(value);
  const bad = value !== "" && (!Number.isInteger(n) || n < 0 || n > STAT_LIMIT[kind]);
  const big = !!file && file.size > MAX_SHOT_MB * 1024 * 1024;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === "" || bad || !file || big) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch<StatClaim>(`/me/stat-claims/${kind}?value=${n}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      setValue("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(errorText(err, "Не удалось отправить."));
    } finally {
      setBusy(false);
    }
  }

  const status = claim
    ? `${fmtCount(claim.value)} · ${CLAIM_NOTE[claim.status]}${claim.status === "rejected" && claim.reason ? `: ${claim.reason}` : ""}`
    : "Пока не указано.";

  return (
    <form className="sf-field pf-stat" onSubmit={submit}>
      <label className="sf-field-label" htmlFor={id}>
        {STAT_LABEL[kind]}
      </label>
      <div className="pf-stat-row">
        <input
          id={id}
          className="sf-input"
          inputMode="numeric"
          placeholder={kind === "hours" ? "1240" : "3567"}
          aria-invalid={bad}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        />
        <label className={`sf-btn sf-btn-line sf-btn-sm pf-file ${file ? "on" : ""}`}>
          {file ? "Скриншот ✓" : "Скриншот"}
          <input ref={fileRef} type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button type="submit" className="sf-btn sf-btn-amber sf-btn-sm" disabled={busy || value === "" || bad || !file || big}>
          {busy ? "Отправляем…" : "Отправить"}
        </button>
      </div>
      <p
        className={`sf-field-note ${error || bad || big || claim?.status === "rejected" ? "bad" : claim?.status === "approved" ? "good" : ""}`}
        aria-live="polite"
      >
        {error ||
          (bad ? `Целое число от 0 до ${fmtCount(STAT_LIMIT[kind])}.` : big ? `Скриншот больше ${MAX_SHOT_MB} МБ.` : status)}
      </p>
    </form>
  );
}

/** Выбор до пяти любимых тиммейтов из игроков сайта: поиск по нику и чипы выбранных. */
function TeammatePicker({ value, onChange }: { value: TeamMember[]; onChange: (v: TeamMember[]) => void }) {
  const [q, setQ] = React.useState("");
  const [found, setFound] = React.useState<TeamMember[]>([]);
  const [open, setOpen] = React.useState(false);
  const full = value.length >= MAX_TEAMMATES;

  // Подсказка видна только при непустом запросе, поэтому прежний результат при пустом не сбрасываем.
  React.useEffect(() => {
    const query = q.trim();
    if (!query) return;
    let active = true;
    const t = setTimeout(async () => {
      try {
        const res = await api.get<TeamMember[]>(`/player-search?q=${encodeURIComponent(query)}`);
        if (active) setFound(res);
      } catch {
        if (active) setFound([]);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  const options = found.filter((m) => !value.some((v) => v.userId === m.userId));
  const add = (m: TeamMember) => {
    if (full) return;
    onChange([...value, m]);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="sf-field pf-mates-pick">
      <label className="sf-field-label" htmlFor="pf-mate-q">
        Любимые тиммейты · до {MAX_TEAMMATES}
      </label>
      {value.length > 0 && (
        <ul className="pf-chips">
          {value.map((m) => (
            <li key={m.userId}>
              {m.displayName || m.login}
              <button type="button" aria-label={`Убрать ${m.displayName || m.login}`} onClick={() => onChange(value.filter((v) => v.userId !== m.userId))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="pf-suggest">
        <input
          id="pf-mate-q"
          className="sf-input"
          autoComplete="off"
          placeholder={full ? "Выбрано пять - уберите кого-нибудь" : "Ник игрока"}
          disabled={full}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (options[0]) add(options[0]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && q.trim() !== "" && (
          <ul className="pf-suggest-list" role="listbox">
            {options.length ? (
              options.map((m) => (
                <li key={m.userId}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(m)}>
                    {m.displayName || m.login}
                    {m.displayName && m.displayName !== m.login && <small>@{m.login}</small>}
                  </button>
                </li>
              ))
            ) : (
              <li className="pf-suggest-empty">Никого не нашли</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function Pick({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="sf-field" htmlFor={id}>
      <span className="sf-field-label">{label}</span>
      <select id={id} className="sf-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Не выбрано</option>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Любимое в своём профиле: заполняет подписчик, остальным - подсказка, как его открыть. */
function FavoritesForm({ initial, options, allowed, roleName }: { initial: PlayerFavorites; options: FavoriteOptions | null; allowed: boolean; roleName: string }) {
  const router = useRouter();
  const [f, setF] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);

  if (!allowed) {
    return (
      <div className="sf-field pf-wide">
        <p className="sf-field-label">Любимое</p>
        <p className="sf-field-note">
          Блок «Любимое» - любимые тиммейты, карта, оружие, усилитель и щит - заполняют игроки с ролью «{roleName}».
        </p>
      </div>
    );
  }

  const list = (xs: string[]) => xs.map((x) => ({ v: x, label: x }));
  const set = (patch: Partial<PlayerFavorites>) => {
    setF((x) => ({ ...x, ...patch }));
    setNote(null);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const next = await api.put<PlayerFavorites>("/me/favorites", {
        teammates: f.teammates.map((m) => m.userId),
        mapCode: f.mapCode ?? "",
        weapon: f.weapon ?? "",
        augment: f.augment ?? "",
        shield: f.shield ?? "",
      });
      setF(next);
      setNote({ ok: true, text: "Сохранено" });
      router.refresh();
    } catch (err) {
      setNote({ ok: false, text: errorText(err, "Не удалось сохранить.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="pf-wide pf-fav-form" onSubmit={save}>
      <p className="sf-field-label">Любимое · видно в профиле всем</p>
      <TeammatePicker value={f.teammates} onChange={(teammates) => set({ teammates })} />
      <div className="pf-fav-picks">
        <Pick id="pf-fav-map" label="Карта" value={f.mapCode ?? ""} options={(options?.maps ?? []).map((m) => ({ v: m.code, label: m.name }))} onChange={(mapCode) => set({ mapCode })} />
        <Pick id="pf-fav-weapon" label="Оружие" value={f.weapon ?? ""} options={list(options?.weapons ?? [])} onChange={(weapon) => set({ weapon })} />
        <Pick id="pf-fav-augment" label="Усилитель" value={f.augment ?? ""} options={list(options?.augments ?? [])} onChange={(augment) => set({ augment })} />
        <Pick id="pf-fav-shield" label="Щит" value={f.shield ?? ""} options={list(options?.shields ?? [])} onChange={(shield) => set({ shield })} />
      </div>
      <div className="pf-fav-save">
        <button type="submit" className="sf-btn sf-btn-amber sf-btn-sm" disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить любимое"}
        </button>
        {note && <p className={`sf-field-note ${note.ok ? "good" : "bad"}`}>{note.text}</p>}
      </div>
    </form>
  );
}

/** Кнопка, которая срабатывает, только если держать её HOLD_MS: сброс рейтинга не отменить. */
function HoldButton({ disabled, onDone, children }: { disabled: boolean; onDone: () => void; children: React.ReactNode }) {
  const [p, setP] = React.useState(0);
  const start = React.useRef(0);
  const frame = React.useRef(0);

  const stop = React.useCallback(() => {
    cancelAnimationFrame(frame.current);
    start.current = 0;
    setP(0);
  }, []);

  const begin = () => {
    if (disabled || start.current) return;
    start.current = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start.current) / HOLD_MS);
      setP(k);
      if (k >= 1) {
        start.current = 0;
        onDone();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const left = Math.ceil((HOLD_MS * (1 - p)) / 1000);
  const label = p >= 1 ? "Сбрасываем…" : p > 0 ? `Держите… ${left}` : children;
  return (
    <button
      type="button"
      className="sf-btn sf-btn-line pf-hold"
      style={{ "--p": p } as React.CSSProperties}
      disabled={disabled}
      aria-describedby="pf-reset-note"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        begin();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span>{label}</span>
    </button>
  );
}

/** Сброс рейтинга жетоном: игрок сам, раз в сезон, подтверждает удержанием кнопки. */
function ResetForm({ tokens, blocked, mmr, start }: { tokens: TokenWallet; blocked?: string; mmr: number; start: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function reset() {
    setBusy(true);
    setMsg(null);
    try {
      await api.post<TokenWallet>("/me/reset");
      setMsg({ ok: true, text: `Рейтинг сброшен: MMR снова ${start}.` });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorText(err, "Не удалось сбросить рейтинг.") });
    } finally {
      setBusy(false);
    }
  }

  const note =
    msg?.text ??
    (tokens.reset < 1
      ? "Жетонов полного сброса нет - их выдают модераторы и организатор."
      : blocked
        ? `Сейчас нельзя: ${blocked}.`
        : `MMR 1×1 в этом сезоне станет ${start} вместо ${mmr}. Матчи и нашивки останутся. Удерживайте кнопку 5 секунд.`);
  return (
    <div className="sf-field pf-wide pf-reset">
      <p className="sf-field-label">Сброс рейтинга · жетонов: {tokens.reset}</p>
      <div className="pf-reset-row">
        <HoldButton disabled={busy || !!blocked || msg?.ok === true} onDone={reset}>
          {msg?.ok ? "Рейтинг сброшен" : "Сбросить"}
        </HoldButton>
      </div>
      <p id="pf-reset-note" className={`sf-field-note ${msg ? (msg.ok ? "good" : "bad") : ""}`} aria-live="polite">
        {note}
      </p>
    </div>
  );
}

/** Под настройками своего профиля: часы и ноки со скриншотом, любимое и сброс рейтинга жетоном. */
export function ProfileExtrasDesk({ extras, options, roleName }: { extras: MyExtras; options: FavoriteOptions | null; roleName: string }) {
  const claim = (k: StatKind) => extras.claims.find((c) => c.kind === k);
  return (
    <section className="pf-desk pf-desk-extra" aria-label="Статистика, любимое и жетоны">
      {STAT_KINDS.map((k) => (
        <GameStatForm key={k} kind={k} claim={claim(k)} />
      ))}
      <p className="sf-field-note pf-wide pf-stat-hint">
        Число из профиля в ARC Raiders и скриншот, где его видно. Пока модератор не сверит, в профиле рядом с числом стоит «не подтверждено».
      </p>
      <FavoritesForm initial={extras.favorites} options={options} allowed={extras.canFavorites} roleName={roleName} />
      <ResetForm tokens={extras.tokens} blocked={extras.resetBlocked} mmr={extras.mmr} start={extras.startMmr} />
    </section>
  );
}
