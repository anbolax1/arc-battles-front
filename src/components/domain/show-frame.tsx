import type { ReactNode } from "react";
import { TrophyIcon } from "@/components/icons";

// С ником длиннее этого крупный шрифт рядом со счётом уже не помещается.
const LONG_NAME = 8;
const VERY_LONG_NAME = 12;

/** Размер ников в рамке шоу-матча: чем длиннее ник, тем мельче, у обеих сторон одинаково - так оба
    помещаются целиком и стоят ровно. */
export function showNameSize(...names: Array<string | undefined>): string {
  const longest = Math.max(0, ...names.map((n) => n?.length ?? 0));
  if (longest > VERY_LONG_NAME) return "text-xl sm:text-2xl";
  if (longest > LONG_NAME) return "text-2xl sm:text-3xl";
  return "text-3xl sm:text-4xl";
}

/** Оформление шоу-матча на главной: постер слева, под всей карточкой - его размытая копия. Без постера
    остаётся градиент в цветах сторон. */
export function ShowFrame({
  previewUrl,
  title,
  label,
  children,
}: {
  previewUrl?: string;
  title: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="panel relative isolate overflow-hidden" aria-label={label}>
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа
        <img src={previewUrl} alt="" aria-hidden className="absolute inset-0 -z-20 h-full w-full scale-125 object-cover opacity-35 blur-3xl" />
      )}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(255,106,26,0.22),rgba(12,12,16,0.82)_40%,rgba(12,12,16,0.82)_65%,rgba(34,211,238,0.16))]" />

      <div className={`grid ${previewUrl ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""}`}>
        {previewUrl && (
          <div className="relative aspect-[4/3] lg:aspect-auto">
            {/* Постер целиком, без обрезки: края добирает его же размытая копия. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа */}
            <img src={previewUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа */}
            <img
              src={previewUrl}
              alt={`Анонс шоу-матча ${title}`}
              className="absolute inset-0 h-full w-full object-contain p-4 drop-shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
            />
          </div>
        )}
        <div className="space-y-6 p-6 sm:p-8">{children}</div>
      </div>
    </section>
  );
}

/** Приз шоу-матча крупно, золотом. */
export function PrizeBanner({ prize }: { prize: string }) {
  return (
    <div className="flex items-center gap-4 rounded-md bg-[rgba(255,197,61,0.08)] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,197,61,0.4)]">
      <TrophyIcon className="h-9 w-9 flex-none text-gold" />
      <div className="min-w-0">
        <div className="field-label text-gold">Приз</div>
        <div className="font-display text-xl uppercase leading-tight text-gold sm:text-2xl">{prize}</div>
      </div>
    </div>
  );
}
