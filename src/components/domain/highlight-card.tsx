import { Avatar } from "@/components/ui/avatar";
import { VideoPlayer } from "@/components/domain/video-player";
import { fmtDate } from "@/lib/format";
import { TwitchIcon } from "@/components/icons";
import type { Highlight } from "@/lib/types";

/* Карточка хайлайта: инлайн-плеер (наш файл, range-стрим), автор, турнир, ссылка на оригинал.
   videoUrl/thumbUrl — same-origin пути (/media/…), используем как есть (см. nginx /media). */
export function HighlightCard({ h }: { h: Highlight }) {
  return (
    <article className="panel flex flex-col overflow-hidden">
      <div className="aspect-video bg-black">
        {h.videoUrl ? (
          <VideoPlayer
            className="h-full w-full"
            src={h.videoUrl}
            poster={h.thumbUrl || undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">видео недоступно</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-display text-sm uppercase leading-snug">{h.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Avatar name={h.userName || h.userLogin} src={h.userAvatarUrl} size="sm" />
          <span className="truncate">{h.userName || h.userLogin}</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted">
          {h.tournamentTitle && <span className="font-display uppercase text-primary-2">{h.tournamentTitle}</span>}
          <span>{fmtDate(h.createdAt)}</span>
          {h.sourceUrl && (
            <a
              href={h.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-accent transition hover:underline"
            >
              <TwitchIcon className="h-3.5 w-3.5" />
              оригинал
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
