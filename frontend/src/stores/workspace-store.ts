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

export interface ConversationMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

interface WorkspaceState {
  agentStatus: AgentStatus;
  cards: WorkspaceCard[];
  messages: ConversationMessage[];
  hasHydrated: boolean;
  proactiveBriefingSeeded: boolean;
  setAgentStatus: (status: AgentStatus) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  markProactiveBriefingSeeded: () => void;
  addCards: (cards: WorkspaceCard[]) => void;
  dismissCard: (id: string) => void;
  moveCard: (id: string, position: CardPosition) => void;
  addMessage: (message: ConversationMessage) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      agentStatus: 'idle',
      cards: [],
      messages: [],
      hasHydrated: false,
      proactiveBriefingSeeded: false,
      setAgentStatus: (agentStatus) => set({ agentStatus }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      markProactiveBriefingSeeded: () => set({ proactiveBriefingSeeded: true }),
      addCards: (cards) =>
        set((state) => ({
          cards: [...state.cards, ...cards.filter((card) => !state.cards.some((item) => item.id === card.id))],
        })),
      dismissCard: (id) => set((state) => ({ cards: state.cards.filter((card) => card.id !== id) })),
      moveCard: (id, position) =>
        set((state) => ({
          cards: state.cards.map((card) => (card.id === id ? { ...card, position } : card)),
        })),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message].slice(-8) })),
    }),
    {
      name: 'nexus-workspace',
      partialize: (state) => ({
        cards: state.cards,
        messages: state.messages,
        proactiveBriefingSeeded: state.proactiveBriefingSeeded,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
