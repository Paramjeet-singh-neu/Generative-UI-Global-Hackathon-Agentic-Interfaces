"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

import type { TimestampMarker } from "@/lib/coaching/types";

function isLikelyHlsUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    /\.m3u8(\?|$)/i.test(u) ||
    u.includes("/hls/") ||
    u.includes("mpegurl") ||
    u.includes("master.m3u8")
  );
}

/** Plays MP4 via `src`; HLS via Safari native or hls.js (Chrome/Firefox). */
function HlsAwareVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src.trim()) return;

    const url = src.trim();
    let hls: Hls | null = null;

    const clear = () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.removeAttribute("src");
      video.load();
    };

    if (isLikelyHlsUrl(url)) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else {
        video.src = url;
      }
    } else {
      video.src = url;
    }

    return clear;
  }, [src]);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={ref}
        className={className}
        controls
        playsInline
        preload="metadata"
      />
    </>
  );
}

interface Props {
  timestamps: TimestampMarker[];
  onMarkerClick: (ts: TimestampMarker) => void;
  /** TwelveLabs HLS or other playable URL; shown when set. */
  videoUrl?: string | null;
  /** Seconds; from index metadata — improves scrubber scale vs timestamps-only guess. */
  durationSeconds?: number | null;
}

const colors = {
  high: "var(--accent-red)",
  medium: "var(--accent-amber)",
  low: "var(--accent-green)",
} as const;

export default function CorrectionMarker({
  timestamps,
  onMarkerClick,
  videoUrl,
  durationSeconds,
}: Props) {
  const maxTs = Math.max(
    0,
    ...timestamps.map((t) => (typeof t.time === "number" ? t.time : 0)),
  );
  const duration = Math.max(
    30,
    typeof durationSeconds === "number" && durationSeconds > 0
      ? durationSeconds
      : maxTs,
  );

  const showVideo = typeof videoUrl === "string" && videoUrl.trim().length > 0;

  return (
    <div className="coach-card-surface coach-card-interactive mt-4 p-4">
      <h3 className="font-coach-heading mb-2 text-[var(--text-primary)]">
        Moments on tape
      </h3>
      {showVideo ? (
        <div className="mb-3 overflow-hidden rounded-2xl bg-black">
          <HlsAwareVideo
            src={videoUrl!.trim()}
            className="mx-auto max-h-64 w-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-3 flex min-h-48 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--bg-primary)] px-4 py-6 text-center">
          <span className="font-coach-body text-sm text-[var(--text-secondary)]">
            🎬 No playback URL yet
          </span>
          <span className="font-coach-body max-w-md text-xs text-[var(--text-secondary)]">
            The canvas needs a playable URL (MP4/HLS). With{" "}
            <strong>live</strong> TwelveLabs analysis, enable{" "}
            <strong>video streaming</strong> at upload so{" "}
            <code className="rounded bg-[var(--bg-card)] px-1">hls.video_url</code> is
            returned. With <strong>cache</strong>, set{" "}
            <code className="rounded bg-[var(--bg-card)] px-1">COACHME_DEMO_VIDEO_URL</code>{" "}
            or add <code className="rounded bg-[var(--bg-card)] px-1">video_url</code> in{" "}
            <code className="rounded bg-[var(--bg-card)] px-1">coaching_cache.json</code>.
          </span>
        </div>
      )}
      <div className="relative mb-3 h-5 w-full rounded-full bg-[var(--bg-primary)]">
        {timestamps.map((ts, i) => (
          <button
            key={`${ts.time}-${ts.label}-${i}`}
            type="button"
            onClick={() => onMarkerClick(ts)}
            className="absolute top-0 h-5 w-3 rounded-full transition-transform hover:scale-125"
            style={{
              left: `${(ts.time / duration) * 100}%`,
              backgroundColor: colors[ts.severity],
              transform: "translateX(-50%)",
              boxShadow:
                ts.severity === "high"
                  ? "0 0 16px rgba(230, 57, 70, 0.2)"
                  : undefined,
            }}
            title={ts.label}
          />
        ))}
      </div>
      <div className="space-y-1">
        {timestamps.map((ts, i) => (
          <button
            key={`${ts.time}-${ts.label}-row-${i}`}
            type="button"
            onClick={() => onMarkerClick(ts)}
            className="coach-card-interactive flex w-full items-center gap-2 rounded-xl p-2 text-left text-sm"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: colors[ts.severity],
                boxShadow:
                  ts.severity === "high"
                    ? "0 0 12px rgba(230, 57, 70, 0.25)"
                    : undefined,
              }}
            />
            <span className="w-8 tabular-nums text-[var(--text-secondary)]">
              {ts.time}s
            </span>
            <span className="text-[var(--text-primary)]">{ts.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
