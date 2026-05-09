"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { toast } from "sonner";

import { mergeAgentState } from "@/lib/leads/state";
import DrillCard from "./DrillCard";

interface Props {
  name: string;
  reps: number;
  focus: string;
  reason?: string;
}

/**
 * Renders inside `useFrontendTool({ name: "generateDrill" })` so `useAgent`
 * stays fresh (v2 render closure pattern — same idea as LiveWorkshopDemand).
 */
export default function CoachGenDrillCard({
  name,
  reps,
  focus,
  reason = "",
}: Props) {
  const { agent } = useAgent();
  const merged = mergeAgentState(agent?.state);
  const approvedList = merged.approved_drills ?? [];
  const done = approvedList.includes(name);

  const push = (patch: Partial<typeof merged>) => {
    if (!agent) return;
    agent.setState({ ...mergeAgentState(agent.state), ...patch });
  };

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
          const s = mergeAgentState(agent?.state);
          const cur = s.approved_drills ?? [];
          if (cur.includes(name)) return;
          push({
            approved_drills: [...cur, name],
          });
          toast.success(`Logged: ${name}`);
        }}
        onSkip={() => {
          const s = mergeAgentState(agent?.state);
          const cur = s.skipped_drills ?? [];
          if (cur.includes(name)) return;
          push({
            skipped_drills: [...cur, name],
          });
          toast.message(`Skipped: ${name}`);
        }}
      />
    </div>
  );
}
