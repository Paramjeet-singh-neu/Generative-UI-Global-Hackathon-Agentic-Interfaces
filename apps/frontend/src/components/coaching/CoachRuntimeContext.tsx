"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAgent } from "@copilotkit/react-core/v2";

import type { AgentState } from "@/lib/leads/types";
import { mergeAgentState } from "@/lib/leads/state";

export type CoachRuntimeValue = {
  state: AgentState;
  applyPatch: (patch: Partial<AgentState>) => void;
  applyUpdater: (updater: (prev: AgentState) => AgentState) => void;
  agentConnected: boolean;
};

const CoachRuntimeContext = createContext<CoachRuntimeValue | null>(null);

export function CoachRuntimeProvider({ children }: { children: ReactNode }) {
  const { agent } = useAgent();
  const [offlineState, setOfflineState] = useState<AgentState>(() =>
    mergeAgentState(null),
  );

  const state = useMemo(() => {
    if (agent) {
      return mergeAgentState(agent.state);
    }
    return mergeAgentState(offlineState);
  }, [agent, agent?.state, offlineState]);

  const applyPatch = useCallback(
    (patch: Partial<AgentState>) => {
      if (agent) {
        agent.setState({ ...mergeAgentState(agent.state), ...patch });
      } else {
        setOfflineState((prev) => ({ ...mergeAgentState(prev), ...patch }));
      }
    },
    [agent],
  );

  const applyUpdater = useCallback(
    (updater: (prev: AgentState) => AgentState) => {
      if (agent) {
        agent.setState(updater(mergeAgentState(agent.state)));
      } else {
        setOfflineState((prev) => updater(mergeAgentState(prev)));
      }
    },
    [agent],
  );

  const value = useMemo(
    () => ({
      state,
      applyPatch,
      applyUpdater,
      agentConnected: !!agent,
    }),
    [state, applyPatch, applyUpdater, agent],
  );

  return (
    <CoachRuntimeContext.Provider value={value}>
      {children}
    </CoachRuntimeContext.Provider>
  );
}

export function useCoachRuntime(): CoachRuntimeValue {
  const ctx = useContext(CoachRuntimeContext);
  if (!ctx) {
    throw new Error("useCoachRuntime must be used within CoachRuntimeProvider");
  }
  return ctx;
}
