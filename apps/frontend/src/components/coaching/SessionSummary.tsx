"use client";

interface SessionSummaryProps {
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
}: SessionSummaryProps) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-gradient-to-r from-[#BEC2FF]/25 to-[#3D92E8]/15 p-5">
      <h2 className="mb-3 text-lg font-bold text-foreground">
        Session complete 🏆
      </h2>
      <div className="mb-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-3xl font-bold tabular-nums text-[#3D92E8]">
            {overallScore}
          </p>
          <p className="text-xs text-muted-foreground">Overall score</p>
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums text-[#3D92E8]">
            {clipsAnalyzed}
          </p>
          <p className="text-xs text-muted-foreground">Clips analyzed</p>
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums text-[#3D92E8]">
            {drillsApproved}
          </p>
          <p className="text-xs text-muted-foreground">Drills logged</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAnalyzeAnother}
        className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Analyze another clip →
      </button>
    </div>
  );
}
