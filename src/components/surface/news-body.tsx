"use client";

import * as React from "react";

/** Текст новости из редактора (HTML очищен сервером). Спойлер открывается нажатием или клавишей, как в Телеграме. */
export function NewsBody({ html, className = "" }: { html: string; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>(".tg-spoiler").forEach((s) => {
      s.tabIndex = 0;
      s.setAttribute("role", "button");
      s.setAttribute("aria-label", "Спойлер: нажмите, чтобы показать");
    });
    // Первое нажатие только открывает спойлер: ссылка под ним не должна сработать вслепую.
    const open = (target: EventTarget | null) => {
      const s = target instanceof Element ? target.closest<HTMLElement>(".tg-spoiler:not(.is-open)") : null;
      if (!s) return false;
      s.classList.add("is-open");
      s.removeAttribute("tabindex");
      s.removeAttribute("role");
      s.removeAttribute("aria-label");
      return true;
    };
    const onClick = (e: MouseEvent) => {
      if (open(e.target)) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && open(e.target)) e.preventDefault();
    };
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKey);
    };
  }, [html]);

  if (!html) return null;
  return <div ref={ref} className={`nw-body ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
