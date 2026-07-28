'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ConversationPanel } from '@/components/conversation-panel';
import { NexusCommandBar } from '@/components/nexus-command-bar';
import { NucleusShell } from './nucleus-shell';
import { NexusSidebar } from '@/components/nexus-sidebar';
import { api, type ChatApiResponse, type SessionSummary } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function NexusDashboard() {
  const queryClient = useQueryClient();
  const [conversationNotice, setConversationNotice] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore((state) => state.setSidebarOpen);
  const activeSessionId = useWorkspaceStore((state) => state.activeSessionId);
  const setActiveSessionId = useWorkspaceStore((state) => state.setActiveSessionId);
  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: api.listSessions,
    retry: 1,
    enabled: activated,
  });
  const activeSessionQuery = useQuery({
    queryKey: ['session', activeSessionId],
    queryFn: () => api.getSession(activeSessionId as string),
    enabled: Boolean(activeSessionId),
    retry: 1,
  });

  const activateSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setConversationNotice(null);
    },
    [setActiveSessionId],
  );

  const newChatMutation = useMutation({
    mutationFn: () => api.createSession(),
    onSuccess: async (session) => {
      queryClient.setQueryData(['session', session.id], session);
      activateSession(session.id);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const renameSessionMutation = useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) => api.renameSession(sessionId, title),
    onSuccess: async (session) => {
      queryClient.setQueryData(['session', session.id], session);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => api.deleteSession(sessionId),
    onSuccess: async (_result, deletedSessionId) => {
      queryClient.removeQueries({ queryKey: ['session', deletedSessionId] });
      const currentSessions = queryClient.getQueryData<SessionSummary[]>(['sessions']) ?? [];
      const remainingSessions = currentSessions.filter((session) => session.id !== deletedSessionId);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });

      if (activeSessionId !== deletedSessionId) return;

      const nextSession = remainingSessions[0];
      if (nextSession) {
        activateSession(nextSession.id);
        return;
      }

      const session = await api.createSession();
      queryClient.setQueryData(['session', session.id], session);
      activateSession(session.id);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const handleSendComplete = useCallback(
    async (response: ChatApiResponse) => {
      if (response.session_id) {
        activateSession(response.session_id);
      }

      await queryClient.invalidateQueries({ queryKey: ['session', response.session_id] });
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    [activateSession, queryClient],
  );

  const activateNexus = () => {
    if (activated) return;
    setActivated(true);
    newChatMutation.mutate();
  };

  return (
    <main className="nexus-workspace">
      {activated && <NexusSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessionsQuery.data ?? []}
        activeSessionId={activeSessionId}
        sessionsLoading={sessionsQuery.isLoading}
        onNewChat={() => newChatMutation.mutate()}
        onSelectSession={activateSession}
        onRenameSession={(sessionId, title) => renameSessionMutation.mutate({ sessionId, title })}
        onDeleteSession={(sessionId) => deleteSessionMutation.mutate(sessionId)}
      />}
      {activated && <ConversationPanel
        session={activeSessionQuery.data}
        error={activeSessionQuery.isError ? 'Could not load this session.' : null}
        notice={conversationNotice}
      />}
      <NucleusShell phase={activated ? 'active' : 'idle'} onActivate={activateNexus} />
      {activated && <NexusCommandBar
        sessionId={activeSessionId}
        onSendComplete={handleSendComplete}
        onSendError={(message) => setConversationNotice(message || null)}
      />}
    </main>
  );
}
