import { FloatingCardItem, Integration, MemoryEntry } from '../types/harvie';
export type { MemoryEntry };

// Requests stay same-origin so Clerk identity is attached by the server-side proxy.
const API_BASE_URL = '/api/harvie';

export interface ChatApiResponse {
  answer: string;
  session_id: string;
  cards: FloatingCardItem[];
  has_tool_calls: boolean;
  connection_request?: ConnectionRequest | null;
  session: SessionDetail;
  profile: PersonaProfile;
  response_source: 'onboarding' | 'llm' | 'system';
}

export type Toolkit = 'gmail' | 'googlecalendar';
export type OnboardingStage = 'name' | 'connections' | 'complete';

export interface ConnectionCardData {
  toolkit: Toolkit;
  label: string;
  description: string;
  resume_message?: string | null;
}

export interface ConversationChoice {
  id: string;
  label: string;
  value: string;
  kind: 'onboarding' | 'message';
  stage?: OnboardingStage | null;
}

export interface MessageChoice {
  promptId: string;
  choiceId: string;
}

export interface WorkspaceResponse {
  profile: PersonaProfile;
  session: SessionDetail;
}

export interface ConnectionRequest {
  toolkit: string;
  label: string;
  authorization_url?: string | null;
}

export interface ConversationTurn {
  id?: string | null;
  role: 'assistant' | 'user' | string;
  content: string;
  source?: string | null;
  created_at?: string | null;
  reply_to?: string | null;
  prompt_id?: string | null;
  choice_id?: string | null;
  reveal_on_first_visit?: boolean;
  choices?: ConversationChoice[];
  connections?: ConnectionCardData[];
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
  onboarding_stage?: OnboardingStage | null;
}

export interface MemoryApiResponse {
  memories: MemoryEntry[];
}

export interface OpenLoop {
  id: string;
  title: string;
  details?: string | null;
  type: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  due_at?: string | null;
}

export interface IntegrationsApiResponse {
  integrations: Integration[];
}

export interface GreetingResponse {
  period: string;
  greeting: string;
}

export interface PersonaProfile {
  name: string;
  assistant_name: string;
  fields: Record<string, PersonaField>;
  onboarding_complete: boolean;
  onboarding_step: number;
  updated_at?: string | null;
}

export interface PersonaField {
  value: string | string[] | null;
  status: 'unknown' | 'inferred' | 'confirmed' | string;
  source: string | null;
  confidence: number;
  updated_at: string | null;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readResponse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    const detail = typeof error?.detail === 'string' ? error.detail : `${fallback} (${res.status})`;
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

export const api = {
  async startChat(): Promise<WorkspaceResponse> {
    const res = await fetch(`${API_BASE_URL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null }),
    });
    return readResponse(res, 'Could not open your conversation');
  },

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

  async sendMessage(message: string, sessionId: string, requestId: string, choice?: MessageChoice): Promise<ChatApiResponse> {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        request_id: requestId,
        prompt_id: choice?.promptId,
        choice_id: choice?.choiceId,
      }),
    });

    return readResponse(res, 'Could not send your message');
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

  async getOpenLoops(): Promise<{ open_loops: OpenLoop[] }> {
    const res = await fetch(`${API_BASE_URL}/open-loops`);
    return readResponse(res, 'Could not load follow-ups');
  },

  async completeOpenLoop(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/open-loops/${encodeURIComponent(id)}/complete`, { method: 'POST' });
    if (!res.ok) throw new ApiError('Could not complete this follow-up', res.status);
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

  async getIntegrationStatus(toolkit: Toolkit): Promise<{ toolkit: Toolkit; connected: boolean }> {
    const res = await fetch(`${API_BASE_URL}/integrations/${toolkit}/status`);
    return readResponse(res, 'Could not check this connection');
  },

  async completeConnection(sessionId: string, toolkit: Toolkit): Promise<WorkspaceResponse> {
    const res = await fetch(`${API_BASE_URL}/chat/connections/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, toolkit }),
    });
    return readResponse(res, 'Could not confirm this connection');
  },

  async connectIntegration(toolkit: Toolkit): Promise<{ connected: boolean; authorization_url?: string | null }> {
    const res = await fetch(`${API_BASE_URL}/integrations/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolkit }),
    });
    return readResponse(res, 'Could not start this connection');
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
