import type { CoachingAgentStatus } from "../coaching/types";
import type { AgentState, LeadFilter } from "./types";

function normalizeCoachingStatus(raw: unknown): CoachingAgentStatus {
  if (
    raw === "idle" ||
    raw === "analyzing" ||
    raw === "complete" ||
    raw === "error"
  ) {
    return raw;
  }
  return "idle";
}

export const emptyFilter: LeadFilter = {
  workshops: [],
  technical_levels: [],
  tools: [],
  opt_in: "any",
  search: "",
};

export const initialState: AgentState = {
  leads: [],
  filter: emptyFilter,
  highlightedLeadIds: [],
  selectedLeadId: null,
  header: {
    title: "Workshop Lead Triage",
    subtitle: "Live from Notion",
  },
  sync: { databaseId: "", databaseTitle: "", syncedAt: null },
  coaching_data: null,
  coaching_status: "idle",
};

/** Normalize LangGraph / CopilotKit agent snapshots into `AgentState`. */
export function mergeAgentState(raw: unknown): AgentState {
  const partial =
    raw && typeof raw === "object" ? (raw as Partial<AgentState>) : {};
  return {
    ...initialState,
    ...partial,
    filter: { ...initialState.filter, ...(partial.filter ?? {}) },
    header: { ...initialState.header, ...(partial.header ?? {}) },
    sync: { ...initialState.sync, ...(partial.sync ?? {}) },
    leads: partial.leads ?? initialState.leads,
    highlightedLeadIds:
      partial.highlightedLeadIds ?? initialState.highlightedLeadIds,
    coaching_data:
      partial.coaching_data !== undefined
        ? partial.coaching_data
        : initialState.coaching_data,
    coaching_status: normalizeCoachingStatus(
      partial.coaching_status ?? initialState.coaching_status,
    ),
  };
}

export function isFilterEmpty(f: LeadFilter): boolean {
  return (
    f.workshops.length === 0 &&
    f.technical_levels.length === 0 &&
    f.tools.length === 0 &&
    f.opt_in === "any" &&
    f.search.trim().length === 0
  );
}

export function filterCount(f: LeadFilter): number {
  let n = 0;
  if (f.workshops.length) n += 1;
  if (f.technical_levels.length) n += 1;
  if (f.tools.length) n += 1;
  if (f.opt_in !== "any") n += 1;
  if (f.search.trim().length) n += 1;
  return n;
}
