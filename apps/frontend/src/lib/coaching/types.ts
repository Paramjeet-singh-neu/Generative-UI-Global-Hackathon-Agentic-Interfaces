export type CorrectionSeverity = "high" | "medium" | "low";

export interface TechniqueScore {
  name: string;
  score: number;
  correction: string;
}

export interface TimestampMarker {
  time: number;
  label: string;
  severity: CorrectionSeverity;
}

export interface Drill {
  name: string;
  reps: number;
  focus: string;
  /** Optional coach rationale (e.g. from `generateDrill`). */
  reason?: string;
}

export interface CoachingData {
  session_id: string;
  clip_name: string;
  overall_score: number;
  techniques: TechniqueScore[];
  timestamps: TimestampMarker[];
  drills: Drill[];
}

export type CoachingSessionStatus =
  | "idle"
  | "analyzing"
  | "complete"
  | "error";

/** Mirrors `coaching_status` on LangGraph agent state (LeadCanvasState). */
export type CoachingAgentStatus = CoachingSessionStatus;
