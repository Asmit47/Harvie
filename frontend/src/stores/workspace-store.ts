'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentStatus = 'idle' | 'listening' | 'thinking' | 'acting';
export type CardKind = 'tasks' | 'email' | 'calendar' | 'suggestion' | 'reminder';

export interface CardPosition {
  x: number;
  y: number;
}

export interface WorkspaceCard {
  id: string;
  kind: CardKind;
  label: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  position: CardPosition;
}

type ThemePreference = 'dark' | 'light' | 'system';
type LayoutMode = 'orbital';

interface WorkspaceState {
  theme: ThemePreference;
  layout: LayoutMode;
  sidebarOpen: boolean;
  activeSessionId: string | null;
  agentStatus: AgentStatus;
  setTheme: (theme: ThemePreference) => void;
  setLayout: (layout: LayoutMode) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  setAgentStatus: (status: AgentStatus) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      theme: 'dark',
      layout: 'orbital',
      sidebarOpen: true,
      activeSessionId: null,
      agentStatus: 'idle',
      setTheme: (theme) => set({ theme }),
      setLayout: (layout) => set({ layout }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
      setAgentStatus: (agentStatus) => set({ agentStatus }),
    }),
    {
      name: 'harvie-workspace',
      partialize: (state) => ({
        theme: state.theme,
        layout: state.layout,
        sidebarOpen: state.sidebarOpen,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<WorkspaceState> | undefined;
        return {
          ...currentState,
          theme: persisted?.theme ?? currentState.theme,
          layout: persisted?.layout ?? currentState.layout,
          sidebarOpen: persisted?.sidebarOpen ?? currentState.sidebarOpen,
        };
      },
    },
  ),
);
