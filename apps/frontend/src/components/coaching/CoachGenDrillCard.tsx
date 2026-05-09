"use client";

import { toast } from "sonner";

import DrillCard from "./DrillCard";
import { useCoachRuntime } from "./CoachRuntimeContext";

interface Props {
  name: string;
  reps: number;
  focus: string;
  reason?: string;
}

/**
 * Renders inside `useFrontendTool({ name: "generateDrill" })` so `useCoachRuntime`
 * stays fresh (v2 render closure pattern — same idea as LiveWorkshopDemand).
 */
export default function CoachGenDrillCard({
  name,
  reps,
  focus,
  reason = "",
}: Props) {
  const { state, applyUpdater } = useCoachRuntime();
  const approvedList = state.approved_drills ?? [];
  const done = approvedList.includes(name);

  return (
    <div className="my-2">
      <p className="font-coach-body mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        Agent-generated drill
      </p>
      <DrillCard
        name={name}
        reps={reps}
        focus={focus}
        reason={reason}
        disabled={done}
        onApprove={() => {
          applyUpdater((prev) => {
            const cur = prev.approved_drills ?? [];
            if (cur.includes(name)) return prev;
            return { ...prev, approved_drills: [...cur, name] };
          });
          toast.success(`Logged: ${name}`);
        }}
        onSkip={() => {
          applyUpdater((prev) => {
            const cur = prev.skipped_drills ?? [];
            if (cur.includes(name)) return prev;
            return { ...prev, skipped_drills: [...cur, name] };
          });
          toast.message(`Skipped: ${name}`);
        }}
      />
    </div>
  );
}
