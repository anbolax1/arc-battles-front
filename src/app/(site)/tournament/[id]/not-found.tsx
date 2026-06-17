import Link from "next/link";

export default function TournamentNotFound() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-4 px-6 py-24 text-center">
      <h1 className="text-3xl">Турнир не найден</h1>
      <p className="text-muted">Возможно, он ещё не создан, удалён или ссылка неверна.</p>
      <div className="pt-2">
        <Link href="/schedule" className="btn btn-primary">
          <span>К расписанию</span>
        </Link>
      </div>
    </div>
  );
}
