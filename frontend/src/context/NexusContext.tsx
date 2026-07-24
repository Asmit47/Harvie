'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AgentStatus, FloatingCardItem, ModalType } from '../types/nexus';

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
  processUserCommand: (command: string) => void;
  loadDemoState: () => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

export const NexusProvider = ({ children }: { children: ReactNode }) => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [leftZoneItems, setLeftZoneItems] = useState<FloatingCardItem[]>([]);
  const [rightZoneItems, setRightZoneItems] = useState<FloatingCardItem[]>([]);
  const [ephemeralMessage, setEphemeralMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const isContextActive = leftZoneItems.length > 0 || rightZoneItems.length > 0;

  // Ephemeral message timer auto-clear (6s)
  useEffect(() => {
    if (!ephemeralMessage) return;
    const timer = setTimeout(() => {
      setEphemeralMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [ephemeralMessage]);

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
    setEphemeralMessage('Canvas cleared. Orbit reset.');
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
    }, 800);
  };

  const processUserCommand = (command: string) => {
    const query = command.trim().toLowerCase();
    setEphemeralMessage(null); // Clear previous ephemeral message
    setAgentStatus('thinking');

    // Simulate intelligent spatial responses
    setTimeout(() => {
      if (query.includes('clear') || query.includes('reset')) {
        clearZone('all');
        setAgentStatus('idle');
        return;
      }

      if (query.includes('demo') || query.includes('cards') || query.includes('test')) {
        loadDemoState();
        return;
      }

      if (query.includes('meeting') || query.includes('calendar') || query.includes('schedule')) {
        addCard({
          type: 'calendar',
          title: 'Team Architecture Sync',
          time: 'Tomorrow, 10:00 AM',
          context: 'Reviewing LangGraph state persistence schema with dev team.',
          badge: 'Calendar',
          priority: 'high',
          zone: 'left',
        });
        setEphemeralMessage('Scheduled team meeting and added to your schedule.');
        setAgentStatus('idle');
        return;
      }

      if (query.includes('task') || query.includes('todo') || query.includes('remind')) {
        addCard({
          type: 'task',
          title: 'Review PR #42: Framer Physics',
          time: 'Today',
          context: 'Ensure spring stiffness (100) and damping (20) match design spec.',
          badge: 'Task',
          priority: 'medium',
          zone: 'right',
        });
        setEphemeralMessage('Task created and added to your action cards.');
        setAgentStatus('idle');
        return;
      }

      if (query.includes('email') || query.includes('mail') || query.includes('draft')) {
        addCard({
          type: 'email',
          title: 'Re: Nexus Release Candidate',
          time: 'Just Now',
          context: 'Drafted update email to engineering team outlining Orbital UI specs.',
          badge: 'Email Draft',
          priority: 'high',
          zone: 'right',
        });
        setEphemeralMessage('Draft email generated in right action zone.');
        setAgentStatus('idle');
        return;
      }

      if (query.includes('mcp') || query.includes('tool') || query.includes('run')) {
        setAgentStatus('executing');
        setTimeout(() => {
          addCard({
            type: 'mcp',
            title: 'MCP: Search Vector Memory',
            time: 'Completed • 42ms',
            context: 'Retrieved 3 user preferences from persistent vector store.',
            badge: 'MCP Output',
            priority: 'medium',
            zone: 'right',
          });
          setEphemeralMessage('MCP tool execution successful.');
          setAgentStatus('idle');
        }, 1000);
        return;
      }

      // Default plain text response (ephemeral)
      setAgentStatus('idle');
      setEphemeralMessage(`Nexus: I processed your query "${command}". Ready for next instruction.`);
    }, 1200);
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
