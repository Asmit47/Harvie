'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AgentStatus, FloatingCardItem, ModalType, MemoryEntry, Integration } from '../types/nexus';
import { api } from '../lib/api';

interface NexusContextType {
  agentStatus: AgentStatus;
  setAgentStatus: (status: AgentStatus) => void;
  leftZoneItems: FloatingCardItem[];
  rightZoneItems: FloatingCardItem[];
  ephemeralMessage: string | null;
  setEphemeralMessage: (msg: string | null) => void;
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  isContextActive: boolean;
  addCard: (card: Omit<FloatingCardItem, 'id' | 'timestamp'>) => void;
  removeCard: (id: string) => void;
  clearZone: (zone?: 'left' | 'right' | 'all') => void;
  processUserCommand: (command: string) => Promise<void>;
  loadDemoState: () => void;
  memories: MemoryEntry[];
  integrations: Integration[];
  fetchMemories: () => Promise<void>;
  fetchIntegrations: () => Promise<void>;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

export const NexusProvider = ({ children }: { children: ReactNode }) => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [leftZoneItems, setLeftZoneItems] = useState<FloatingCardItem[]>([]);
  const [rightZoneItems, setRightZoneItems] = useState<FloatingCardItem[]>([]);
  const [ephemeralMessage, setEphemeralMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  const isContextActive = leftZoneItems.length > 0 || rightZoneItems.length > 0;

  // Initialize session ID from localStorage or generate new
  useEffect(() => {
    const saved = localStorage.getItem('nexus_session_id');
    if (saved) {
      setSessionId(saved);
    } else {
      const newId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('nexus_session_id', newId);
      setSessionId(newId);
    }
  }, []);

  // Ephemeral message timer auto-clear (8s)
  useEffect(() => {
    if (!ephemeralMessage) return;
    const timer = setTimeout(() => {
      setEphemeralMessage(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [ephemeralMessage]);

  const fetchMemories = async () => {
    try {
      const res = await api.getMemories();
      setMemories(res.memories);
    } catch (err) {
      console.warn('Could not fetch memories from backend:', err);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const res = await api.getIntegrations();
      setIntegrations(res.integrations);
    } catch (err) {
      console.warn('Could not fetch integrations from backend:', err);
    }
  };

  // Fetch memory / integrations when modal opens
  useEffect(() => {
    if (activeModal === 'memory') {
      fetchMemories();
    } else if (activeModal === 'integrations') {
      fetchIntegrations();
    }
  }, [activeModal]);

  const addCard = (cardData: Omit<FloatingCardItem, 'id' | 'timestamp'>) => {
    const newItem: FloatingCardItem = {
      ...cardData,
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (newItem.zone === 'left') {
      setLeftZoneItems((prev) => [newItem, ...prev.slice(0, 3)]); // Keep max 4
    } else {
      setRightZoneItems((prev) => [newItem, ...prev.slice(0, 3)]); // Keep max 4
    }
  };

  const removeCard = (id: string) => {
    setLeftZoneItems((prev) => prev.filter((item) => item.id !== id));
    setRightZoneItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearZone = (zone: 'left' | 'right' | 'all' = 'all') => {
    if (zone === 'left' || zone === 'all') setLeftZoneItems([]);
    if (zone === 'right' || zone === 'all') setRightZoneItems([]);
    
    if (sessionId) {
      api.closeSession(sessionId).catch(() => {});
    }
    
    setEphemeralMessage('Canvas cleared. Session context reset.');
  };

  const loadDemoState = () => {
    setAgentStatus('executing');
    setEphemeralMessage('Materializing active context cards...');
    
    setTimeout(() => {
      setLeftZoneItems([
        {
          id: 'left-1',
          type: 'calendar',
          title: 'Design Review: Orbital UI',
          time: '2:30 PM • 45m',
          context: 'Discussion on Framer Motion spring parameters & Glassmorphism card tokens.',
          badge: 'Upcoming',
          priority: 'high',
          zone: 'left',
          timestamp: '14:30',
        },
        {
          id: 'left-2',
          type: 'reminder',
          title: 'Sync LangGraph MCP Agent',
          time: '4:00 PM',
          context: 'Verify ToolNode execution pipeline and active state transitions.',
          badge: 'Reminder',
          priority: 'medium',
          zone: 'left',
          timestamp: '16:00',
        },
      ]);

      setRightZoneItems([
        {
          id: 'right-1',
          type: 'task',
          title: 'Deploy Next.js AppShell',
          time: 'Due Today',
          context: 'Push Nexus spatial layout components to GitHub staging repo.',
          badge: 'Action Item',
          priority: 'high',
          zone: 'right',
          timestamp: '15:10',
        },
        {
          id: 'right-2',
          type: 'email',
          title: 'Draft to Architecture Lead',
          time: 'Drafted',
          context: 'Summary of spatial interface design specification for personal assistant.',
          badge: 'Email Draft',
          priority: 'medium',
          zone: 'right',
          timestamp: '15:20',
        },
      ]);

      setAgentStatus('idle');
    }, 600);
  };

  const processUserCommand = async (command: string) => {
    const query = command.trim();
    if (!query) return;

    setEphemeralMessage(null);
    setAgentStatus('thinking');

    // Special client-side commands
    if (query.toLowerCase().includes('clear') || query.toLowerCase().includes('reset')) {
      clearZone('all');
      setAgentStatus('idle');
      return;
    }

    try {
      // Send message to real backend FastAPI server
      const response = await api.sendMessage(query, sessionId);

      if (response.session_id) {
        setSessionId(response.session_id);
        localStorage.setItem('nexus_session_id', response.session_id);
      }

      if (response.has_tool_calls) {
        setAgentStatus('executing');
      }

      // Display the final answer from backend
      setEphemeralMessage(response.answer);

      // Add cards returned by backend
      if (response.cards && response.cards.length > 0) {
        response.cards.forEach((card) => {
          addCard({
            type: card.type,
            title: card.title,
            time: card.time,
            context: card.context,
            actionLabel: card.actionLabel,
            actionUrl: card.actionUrl,
            priority: card.priority,
            badge: card.badge,
            zone: card.zone,
          });
        });
      }

      setAgentStatus('idle');
    } catch (err: any) {
      console.error('Error sending query to Nexus backend:', err);
      setAgentStatus('idle');
      setEphemeralMessage(`Nexus Backend: Failed to process query (${err.message || 'Server connection error'}). Make sure FastAPI server is running on port 8000.`);
    }
  };

  return (
    <NexusContext.Provider
      value={{
        agentStatus,
        setAgentStatus,
        leftZoneItems,
        rightZoneItems,
        ephemeralMessage,
        setEphemeralMessage,
        activeModal,
        setActiveModal,
        isContextActive,
        addCard,
        removeCard,
        clearZone,
        processUserCommand,
        loadDemoState,
        memories,
        integrations,
        fetchMemories,
        fetchIntegrations,
      }}
    >
      {children}
    </NexusContext.Provider>
  );
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
};

