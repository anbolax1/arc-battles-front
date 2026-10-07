import { getLeaderboard, getSeasons, getTeamLeaderboard } from "@/lib/queries";
import { Stripes } from "@/components/surface/stripes";
import { RatingBoard } from "@/components/surface/rating-board";
import "./rating.css";

/** Рейтинг в новом дизайне: по умолчанию - активный сезон. */
export async function SurfaceRating() {
  const [seasons, solo, duo] = await Promise.all([getSeasons(), getLeaderboard("1x1"), getTeamLeaderboard()]);
  return <RatingBoard seasons={seasons} initialSolo={solo} initialDuo={duo} decor={<Stripes shape="head" draw />} />;
}
