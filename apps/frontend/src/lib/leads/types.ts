import type { CoachingAgentStatus, CoachingData } from "../coaching/types";

export type TechLevel =
  | "Non-technical"
  | "Some technical"
  | "Developer"
  | "Advanced / expert";

export type Workshop =
  | "Agentic UI (AG-UI)"
  | "MCP Apps / Tooling"
  | "RAG & Data Chat"
  | "Evaluations & Guardrails"
  | "Deploying Agents (prod)"
  | "Not sure yet";

export type Source =
  | "Website"
  | "Referral"
  | "LinkedIn"
  | "X/Twitter"
  | "Event"
  | "Other";

export type LeadStatus = "Not started" | "In progress" | "Done";

export const STATUSES: readonly LeadStatus[] = [
  "Not started",
  "In progress",
  "Done",
] as const;

export const WORKSHOPS: readonly Workshop[] = [
  "Agentic UI (AG-UI)",
  "MCP Apps / Tooling",
  "RAG & Data Chat",
  "Evaluations & Guardrails",
  "Deploying Agents (prod)",
  "Not sure yet",
] as const;

export const TECH_LEVELS: readonly TechLevel[] = [
  "Non-technical",
  "Some technical",
  "Developer",
  "Advanced / expert",
] as const;

export interface Lead {
  id: string;
  url?: string;
  name: string;
  company: string;
  email: string;
  role: string;
  phone?: string;
  source?: string;
  technical_level: string;
  interested_in: string[];
  tools: string[];
  workshop: string;
  status: string;
  opt_in: boolean;
  message: string;
  submitted_at: string;
}

export interface LeadFilter {
  workshops: string[];
  technical_levels: string[];
  tools: string[];
  opt_in: "any" | "yes" | "no";
  search: string;
}

export interface SyncMeta {
  databaseId: string;
  databaseTitle: string;
  syncedAt: string | null;
}

export interface AgentState {
  leads: Lead[];
  filter: LeadFilter;
  highlightedLeadIds: string[];
  selectedLeadId: string | null;
  header: { title: string; subtitle: string };
  sync: SyncMeta;
  /** CoachMe+ session payload; set by `analyze_boxing_clip` Command(update=). */
  coaching_data: CoachingData | null;
  coaching_status: CoachingAgentStatus;
  /** Drill names the athlete approved this thread (frontend + agent tools). */
  approved_drills: string[];
  /** Skipped drills persist for the session; next `analyze_boxing_clip` omits them. */
  skipped_drills: string[];
  /** Incremented on each successful `analyze_boxing_clip`. */
  clips_analyzed: number;
}

// Mirrors the Python `NotionHealth` TypedDict in
// agent/src/notion_integration.py. Returned by the agent's
// `notion_health_check` tool when the user pings the Notion DB.
export interface NotionHealth {
  user_id: string;
  db_title: string;
  row_count: number;
  expected_props: string[];
  actual_props: string[];
  missing_props: string[];
  error: string | null;
}
