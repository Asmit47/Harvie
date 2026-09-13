import { FloatingCardItem, Integration, MemoryEntry } from '../types/harvie';

// Requests stay same-origin so Clerk identity is attached by the server-side proxy.
const API_BASE_URL = '/api/harvie';

export interface ChatApiResponse {
  answer: string;
  session_id: string;
  cards: FloatingCardItem[];
  has_tool_calls: boolean;
}

export interface ConversationTurn {
  role: 'assistant' | 'user' | string;
  content: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  created_at?: string | null;
  updated_at?: string | null;
  message_count: number;
  preview?: string | null;
}

export interface SessionDetail extends SessionSummary {
  conversation_history: ConversationTurn[];
  current_task?: string | null;
}

export interface MemoryApiResponse {
  memories: MemoryEntry[];
}

export interface IntegrationsApiResponse {
  integrations: Integration[];
}

export interface GreetingResponse {
  period: string;
  greeting: string;
}

export const api = {
  async getGreeting(): Promise<GreetingResponse> {
    const res = await fetch(`${API_BASE_URL}/greeting`);

    if (!res.ok) {
      throw new Error(`Greeting API Error ${res.status}`);
    }

    return res.json();
  },

  async listSessions(): Promise<SessionSummary[]> {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Sessions API Error ${res.status}`);
    }

    return res.json();
  },

  async getSession(sessionId: string): Promise<SessionDetail> {
    const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Session API Error ${res.status}`);
    }

    return res.json();
  },

  async createSession(title?: string): Promise<SessionDetail> {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(title ? { title } : {}),
    });

    if (!res.ok) {
      throw new Error(`Create Session Error ${res.status}`);
    }

    return res.json();
  },

  async renameSession(sessionId: string, title: string): Promise<SessionDetail> {
    const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      throw new Error(`Rename Session Error ${res.status}`);
    }

    return res.json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error(`Delete Session Error ${res.status}`);
    }
  },

  async sendMessage(message: string, sessionId?: string): Promise<ChatApiResponse> {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        session_id: sessionId || null,
      }),
    });

    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }

    return res.json();
  },

  async getMemories(): Promise<MemoryApiResponse> {
    const res = await fetch(`${API_BASE_URL}/memory`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Memory API Error ${res.status}`);
    }

    return res.json();
  },

  async getIntegrations(): Promise<IntegrationsApiResponse> {
    const res = await fetch(`${API_BASE_URL}/integrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Integrations API Error ${res.status}`);
    }

    return res.json();
  },

  async closeSession(sessionId: string): Promise<{ status: string; summary?: string }> {
    const res = await fetch(`${API_BASE_URL}/session/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });

    if (!res.ok) {
      throw new Error(`Session Close Error ${res.status}`);
    }

    return res.json();
  },
};
