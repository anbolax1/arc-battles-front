import { StatusPill } from "@/components/ui/pill";
import { tournamentPill } from "@/lib/display";

/** Статус-пилл турнира по бэкенд-статусу (draft|upcoming|live|finished). */
export function TournamentStatusPill({ status }: { status: string }) {
  const { status: pill, label } = tournamentPill(status);
  return <StatusPill status={pill}>{label}</StatusPill>;
}
