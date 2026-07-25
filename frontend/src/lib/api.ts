import { FloatingCardItem, Integration, MemoryEntry } from '../types/nexus';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatApiResponse {
  answer: string;
  session_id: string;
  cards: FloatingCardItem[];
  has_tool_calls: boolean;
}

export interface MemoryApiResponse {
  memories: MemoryEntry[];
}

export interface IntegrationsApiResponse {
  integrations: Integration[];
}

export const api = {
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
