"use client";

import Confetti from "./Confetti";
import ScoreRing from "./ScoreRing";

interface Props {
  overallScore: number;
  clipsAnalyzed: number;
  drillsApproved: number;
  onAnalyzeAnother: () => void;
}

export default function SessionSummary({
  overallScore,
  clipsAnalyzed,
  drillsApproved,
  onAnalyzeAnother,
}: Props) {
  const celebrate = overallScore >= 75;

  return (
    <div
      className="relative mt-6 rounded-2xl p-px"
      style={{
        background:
          "linear-gradient(135deg, var(--accent-red), var(--accent-amber), var(--accent-green))",
      }}
    >
      <div className="relative overflow-visible rounded-[15px] bg-gradient-to-br from-[#1a1a24] to-[#1e1e2e] p-5">
        {celebrate ? <Confetti /> : null}
        <div className="relative">
          <h2 className="font-coach-heading mb-4 text-lg text-[var(--text-primary)]">
            Round over 🏆
          </h2>
          <div className="mb-6 flex justify-center">
            <ScoreRing
              score={overallScore}
              size={120}
              strokeWidth={7}
              label="Overall score"
            />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="font-coach-heading text-3xl font-bold text-[var(--text-primary)]">
                {clipsAnalyzed}
              </p>
              <p className="font-coach-body text-xs text-[var(--text-secondary)]">
                Clips analyzed
              </p>
            </div>
            <div>
              <p className="font-coach-heading text-3xl font-bold text-[var(--accent-green)]">
                {drillsApproved}
              </p>
              <p className="font-coach-body text-xs text-[var(--text-secondary)]">
                Drills logged
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAnalyzeAnother}
            className="font-coach-body w-full rounded-xl py-3 text-sm font-bold tracking-wide transition-opacity hover:opacity-95"
            style={{
              background: "linear-gradient(135deg, var(--accent-red), #c1121f)",
              color: "#fff",
              boxShadow: "0 4px 15px rgba(230, 57, 70, 0.3)",
            }}
          >
            NEXT ROUND →
          </button>
        </div>
      </div>
    </div>
  );
}
