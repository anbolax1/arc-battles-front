import type { ReactNode } from "react";
import { Stripes } from "@/components/surface/stripes";

/** Страница «не найдено» в новом дизайне: заголовок, пояснение и куда идти дальше. */
export function SurfaceMissing({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="sf-page-head sf-night sf-grain sf-missing">
      <Stripes shape="corner" className="corner" draw />
      <div className="sf-wrap">
        <p className="sf-eyebrow">{eyebrow}</p>
        <h1 className="sf-h-big">
          {title}
          <span className="sf-dot">.</span>
        </h1>
        <p className="sf-lead">{lead}</p>
        <div className="sf-controls">{children}</div>
      </div>
    </section>
  );
}
