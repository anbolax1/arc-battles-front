import { TwitchIcon, YouTubeIcon } from "@/components/icons";
import { STREAM_URL, YOUTUBE_URL } from "@/lib/links";

/** Кнопки эфира ведущего: Twitch и рядом YouTube. */
export function StreamButtons({ small = false }: { small?: boolean }) {
  const size = small ? " btn-sm" : "";
  return (
    <>
      <a href={STREAM_URL} target="_blank" rel="noreferrer" className={`btn btn-twitch${size}`}>
        <TwitchIcon />
        <span>Смотреть эфир</span>
      </a>
      <a href={YOUTUBE_URL} target="_blank" rel="noreferrer" className={`btn btn-youtube${size}`}>
        <YouTubeIcon />
        <span>YouTube</span>
      </a>
    </>
  );
}
