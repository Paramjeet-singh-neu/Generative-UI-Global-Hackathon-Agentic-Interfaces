"use client";

import { useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  yEnd: number;
  rotation: number;
  duration: number;
  delay: number;
  size: number;
  color: string;
}

const COLORS = [
  "var(--accent-red)",
  "var(--accent-amber)",
  "var(--accent-green)",
  "#ffffff",
] as const;

function randomParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 300,
    y: -(Math.random() * 60 + 40),
    yEnd: Math.random() * 150 + 100,
    rotation: Math.random() * 540 + 180,
    duration: 1.2 + Math.random() * 0.6,
    delay: Math.random() * 0.3,
    size: 4 + Math.random() * 4,
    color: COLORS[i % 4]!,
  }));
}

/** Lightweight CSS-only burst — plays once on mount, no dependencies. */
export default function Confetti() {
  const particles = useMemo(() => randomParticles(18), []);

  const keyframesCss = particles
    .map(
      (p) => `
      @keyframes coach-confetti-${p.id} {
        0% { transform: translate(-50%, -50%) translate(0px, 0px) rotate(0deg); opacity: 1; }
        40% { transform: translate(-50%, -50%) translate(${p.x * 0.5}px, ${p.y}px) rotate(${p.rotation * 0.4}deg); opacity: 1; }
        100% { transform: translate(-50%, -50%) translate(${p.x}px, ${p.yEnd}px) rotate(${p.rotation}deg); opacity: 0; }
      }
    `,
    )
    .join("");

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{keyframesCss}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute left-1/2 top-1/2"
          style={{
            width: p.size,
            height: p.size,
            borderRadius: p.id % 3 === 0 ? "50%" : "2px",
            backgroundColor: p.color,
            animation: `coach-confetti-${p.id} ${p.duration}s ${p.delay}s ease-out forwards`,
            animationFillMode: "forwards",
          }}
        />
      ))}
    </div>
  );
}
