export type AgentStatus = 'idle' | 'thinking' | 'executing';

export type CardType = 'calendar' | 'reminder' | 'task' | 'email' | 'mcp';

export type CardPriority = 'low' | 'medium' | 'high';

export interface FloatingCardItem {
  id: string;
  type: CardType;
  title: string;
  time?: string;
  context: string;
  actionLabel?: string;
  actionUrl?: string;
  priority?: CardPriority;
  badge?: string;
  iconName?: string;
  zone: 'left' | 'right';
  timestamp: string;
}

export type ModalType = 'memory' | 'settings' | 'integrations' | null;

export interface MemoryEntry {
  id: string;
  category: string;
  fact: string;
  timestamp: string;
}

export interface Integration {
  id: string;
  name: string;
  type: 'MCP' | 'API' | 'Tool';
  status: 'connected' | 'idle' | 'error';
  icon: string;
  description: string;
}
