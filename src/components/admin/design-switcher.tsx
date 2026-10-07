"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { DESIGN_COOKIE, DESIGN_LABEL, type Design } from "@/lib/design-shared";

const OPTIONS: Array<{ id: Design; title: string; text: string }> = [
  {
    id: "classic",
    title: "Классический",
    text: "Тёмная тема с оранжево-фиолетовыми акцентами и скошенными кнопками — прежний вид сайта.",
  },
  {
    id: "surface",
    title: "Новый, в стиле ARC Raiders",
    text: "Кремовая бумага и сливовая ночь полосами, ленты 70-х, анимации, счётчики и плакат шоу-матча.",
  },
];

const PREVIEW_DAYS = 30;

function setPreviewCookie(d: Design | null) {
  document.cookie = d
    ? `${DESIGN_COOKIE}=${d}; path=/; max-age=${PREVIEW_DAYS * 86400}; samesite=lax`
    : `${DESIGN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Миниатюра дизайна: цвета и характерный мотив. */
function Thumb({ id }: { id: Design }) {
  if (id === "classic") {
    return (
      <div className="relative h-28 overflow-hidden rounded-md" style={{ background: "#09090c" }} aria-hidden>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 0% 0%, rgba(255,106,26,.35), transparent 60%)" }} />
        <div className="absolute left-4 top-4 h-3 w-24 rounded-sm" style={{ background: "linear-gradient(100deg,#ff6a1a,#c026d3)" }} />
        <div className="absolute left-4 top-10 h-2 w-36 rounded-sm bg-white/20" />
        <div className="absolute left-4 top-14 h-2 w-28 rounded-sm bg-white/10" />
        <div className="absolute bottom-4 left-4 h-7 w-24 -skew-x-12" style={{ background: "linear-gradient(100deg,#ff8a3d,#ff6a1a)" }} />
      </div>
    );
  }
  return (
    <div className="relative h-28 overflow-hidden rounded-md" style={{ background: "#130918" }} aria-hidden>
      <div className="absolute inset-x-0 top-0 h-5" style={{ background: "#ece2d0" }} />
      <div className="absolute inset-x-0 bottom-0 h-6" style={{ background: "#ece2d0" }} />
      <div className="absolute left-4 top-7 text-xl font-black lowercase leading-none" style={{ color: "#ece2d0", fontFamily: "var(--font-sofia), sans-serif" }}>
        рейд<span style={{ color: "#f1aa1c" }}>.</span> респект<span style={{ color: "#f1aa1c" }}>.</span>
      </div>
      <div className="absolute left-4 top-[60px] h-4 w-20 rounded-[3px]" style={{ background: "#f1aa1c" }} />
      <div
        className="absolute -right-6 -top-4 h-40 w-24 rotate-[28deg]"
        style={{ background: "linear-gradient(90deg,#1440a8 0 40%,#7fede6 0 55%,#2bef83 0 70%,#f9cf0a 0 85%,#f2271c 0)" }}
      />
    </div>
  );
}

/** Переключатель дизайна сайта: для всех посетителей сразу или только в своём браузере. */
export function DesignSwitcher({ current, preview }: { current: Design; preview: Design | null }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<Design | null>(null);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState("");
  const [myPreview, setMyPreview] = React.useState<Design | null>(preview);

  async function enable(d: Design) {
    setBusy(d);
    setError("");
    setDone("");
    try {
      await api.put("/site/design", { design: d });
      setDone(`${DESIGN_LABEL[d]} дизайн включён для всех посетителей.`);
      router.refresh();
    } catch (e) {
      setError(errorText(e, "Не получилось переключить дизайн. Попробуйте ещё раз."));
    } finally {
      setBusy(null);
    }
  }

  function previewOnly(d: Design) {
    setPreviewCookie(d);
    setMyPreview(d);
    window.open("/", "_blank", "noopener");
  }

  function stopPreview() {
    setPreviewCookie(null);
    setMyPreview(null);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl">Дизайн сайта</h1>
        <p className="max-w-2xl text-sm text-muted">
          Переключает вид публичных страниц для всех посетителей сразу. Кабинет и оверлей для OBS не меняются. Вернуть прежний дизайн можно тем же
          одним нажатием.
        </p>
      </div>

      {myPreview && myPreview !== current && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="text-sm">
            В этом браузере включён предпросмотр: <b>{DESIGN_LABEL[myPreview]}</b>. Остальные посетители видят <b>{DESIGN_LABEL[current]}</b>.
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={stopPreview}>
            <span>Выключить предпросмотр</span>
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {OPTIONS.map((o) => {
          const on = current === o.id;
          return (
            <section key={o.id} className={`panel space-y-4 p-5 ${on ? "glow-edge" : ""}`} aria-labelledby={`design-${o.id}`}>
              <Thumb id={o.id} />
              <div className="flex flex-wrap items-center gap-3">
                <h2 id={`design-${o.id}`} className="text-lg">
                  {o.title}
                </h2>
                {on && (
                  <span className="pill pill-ok">
                    <span>Включён для всех</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-muted">{o.text}</p>
              <div className="flex flex-wrap gap-3">
                {!on && (
                  <button type="button" className="btn btn-primary" onClick={() => enable(o.id)} disabled={busy !== null}>
                    <span>{busy === o.id ? "Включаю…" : "Включить для всех"}</span>
                  </button>
                )}
                {!on && (
                  <button type="button" className="btn btn-ghost" onClick={() => previewOnly(o.id)}>
                    <span>Посмотреть только мне</span>
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {done && (
        <p className="text-sm text-ok" role="status">
          {done}
        </p>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
