import Link from "next/link";
import { getDesign } from "@/lib/design";
import { SurfaceMissing } from "@/components/surface/missing";

export default async function TournamentNotFound() {
  if ((await getDesign()) === "surface") {
    return (
      <SurfaceMissing eyebrow="Матч" title="матч не найден" lead="Возможно, он ещё не создан, удалён или ссылка неверна.">
        <Link className="sf-btn sf-btn-amber" href="/schedule">
          К расписанию
        </Link>
        <Link className="sf-btn sf-btn-line" href="/archive">
          Архив матчей
        </Link>
      </SurfaceMissing>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-4 px-6 py-24 text-center">
      <h1 className="text-3xl">Матч не найден</h1>
      <p className="text-muted">Возможно, он ещё не создан, удалён или ссылка неверна.</p>
      <div className="pt-2">
        <Link href="/schedule" className="btn btn-primary">
          <span>К расписанию</span>
        </Link>
      </div>
    </div>
  );
}
