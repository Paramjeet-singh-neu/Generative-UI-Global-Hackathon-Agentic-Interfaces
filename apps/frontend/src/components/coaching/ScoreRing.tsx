"use client";

import { useEffect, useRef, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function strokeColorForScore(score: number): string {
  if (score < 40) return "var(--accent-red)";
  if (score <= 70) return "var(--accent-amber)";
  return "var(--accent-green)";
}

export default function ScoreRing({
  score,
  size = 140,
  strokeWidth = 8,
  label,
}: ScoreRingProps) {
  const safe = Math.min(100, Math.max(0, score));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const [draw, setDraw] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDraw(true), 50);
    return () => clearTimeout(t);
  }, [safe]);

  useEffect(() => {
    startRef.current = null;
    setDisplayScore(0);
    const duration = 1000;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      setDisplayScore(Math.round(safe * t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [safe]);

  const offset = draw ? (1 - safe / 100) * circumference : circumference;
  const stroke = strokeColorForScore(safe);
  const numClass = size >= 120 ? "text-4xl" : "text-lg";

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ width: size }}
    >
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block"
          aria-hidden={label ? undefined : true}
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--coach-ring-track, #2a2a36)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: "stroke-dashoffset 1.2s ease-out",
            }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className={`font-coach-heading font-bold tabular-nums text-[var(--text-primary)] ${numClass}`}
          >
            {displayScore}
          </span>
        </div>
      </div>
      {label ? (
        <p className="font-coach-body mt-2 text-center text-xs text-[var(--text-secondary)]">
          {label}
        </p>
      ) : null}
    </div>
  );
}
