import { Loader2, Play } from "lucide-react";
import type { Video } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { optimizedStorageImageUrl } from "@shared/optimizedStorageUrl";

/** Delay before the registration modal opens (matches progress animation on the card). */
export const THUMBNAIL_WARMUP_BEFORE_MODAL_MS = 500;

/** Matches catalog grid thumbnail frame (native banner slots reuse this sizing). */
export const CATALOG_THUMBNAIL_FRAME_CLASS =
  "rounded-lg bg-secondary border border-border h-64";

interface VideoCardProps {
  video: Video;
  onClick: () => void;
  /** Fake “playback starting” overlay before the access modal */
  isWarmupPlaying?: boolean;
  /** Direct-link mode: thumbnail stays loading; clicks reopen the affiliate link */
  isDirectLinkWaiting?: boolean;
  warmupHint?: string;
}

export function VideoCard({
  video,
  onClick,
  isWarmupPlaying = false,
  isDirectLinkWaiting = false,
  warmupHint,
}: VideoCardProps) {
  const warmupBlocksClick = isWarmupPlaying && !isDirectLinkWaiting;
  const { title, duration, thumbnail } = video;
  const thumbnailSrc = optimizedStorageImageUrl(thumbnail, { width: 640 });
  return (
    <div
      role="button"
      tabIndex={warmupBlocksClick ? -1 : 0}
      {...(isWarmupPlaying ? { "data-video-warmup-card": true } : {})}
      onClick={() => {
        if (warmupBlocksClick) return;
        onClick();
      }}
      onKeyDown={(e) => {
        if (warmupBlocksClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-busy={isWarmupPlaying}
      className={cn(
        "group relative overflow-hidden hover:border-primary transition-all duration-300",
        isWarmupPlaying
          ? isDirectLinkWaiting
            ? "cursor-pointer border-primary"
            : "cursor-wait border-primary"
          : "cursor-pointer",
        CATALOG_THUMBNAIL_FRAME_CLASS,
      )}
    >
      <img
        src={thumbnailSrc}
        alt={title}
        loading="lazy"
        decoding="async"
        className={cn(
          "w-full h-full object-cover transition-transform ease-out",
          isWarmupPlaying ? "scale-110 brightness-90" : "duration-300 group-hover:scale-110",
        )}
        style={
          isWarmupPlaying
            ? { transitionDuration: `${THUMBNAIL_WARMUP_BEFORE_MODAL_MS}ms` }
            : undefined
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-between p-4">
        <div className="flex justify-end">
          <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-white">
            {duration}
          </div>
        </div>
        <div className="flex items-end">
          <h3 className="font-bold text-white leading-tight text-sm line-clamp-2 pr-2">
            {title}
          </h3>
        </div>
      </div>
      {isWarmupPlaying ? (
        <div
          className="pointer-events-none absolute inset-0 z-[34] bg-gradient-to-t from-black/60 via-transparent to-black/35"
          aria-hidden
        />
      ) : null}

      {/* Play button — warmup swaps in ring + spinner on the same spot */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center pointer-events-none",
          isWarmupPlaying ? "z-[40]" : "z-20",
        )}
        aria-hidden
      >
        {isWarmupPlaying ? (
          <>
            <div className="relative grid h-[5.75rem] w-[5.75rem] shrink-0 place-items-center drop-shadow-xl">
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="fill-none stroke-white/25"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="fill-none stroke-primary"
                  strokeWidth="6"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1}
                  style={{
                    animation: `thumbnail-warmup-ring-fill ${THUMBNAIL_WARMUP_BEFORE_MODAL_MS}ms linear forwards`,
                  }}
                />
              </svg>
              <div className="relative flex items-center justify-center rounded-full bg-primary/95 p-4 text-primary-foreground shadow-lg ring-2 ring-black/35">
                <Loader2
                  size={26}
                  strokeWidth={2.5}
                  className="animate-spin opacity-95"
                />
              </div>
            </div>
            {warmupHint ? (
              <p className="max-w-[14rem] text-[11px] font-medium leading-snug text-white/90 drop-shadow-md">
                {warmupHint}
              </p>
            ) : null}
          </>
        ) : (
          <div className="bg-primary/95 text-primary-foreground rounded-full p-4 shadow-lg ring-2 ring-black/20 group-hover:scale-105 transition-transform duration-300">
            <Play size={28} fill="currentColor" className="ml-0.5" />
          </div>
        )}
      </div>
      {/* Duration bottom-right when not hovering (hidden on hover — shown in overlay above) */}
      <div className="absolute bottom-3 right-3 z-10 group-hover:hidden bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold pointer-events-none">
        {duration}
      </div>

    </div>
  );
}
