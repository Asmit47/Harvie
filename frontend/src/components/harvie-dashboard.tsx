'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ConversationPanel } from '@/components/conversation-panel';
import { HarvieCommandBar } from '@/components/harvie-command-bar';
import { NucleusShell } from './nucleus-shell';
import { HarvieSidebar } from '@/components/harvie-sidebar';
import { api, type ChatApiResponse, type SessionDetail, type SessionSummary } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function HarvieDashboard() {
  const queryClient = useQueryClient();
  const [conversationNotice, setConversationNotice] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore((state) => state.setSidebarOpen);
  const activeSessionId = useWorkspaceStore((state) => state.activeSessionId);
  const setActiveSessionId = useWorkspaceStore((state) => state.setActiveSessionId);
  const setAgentStatus = useWorkspaceStore((state) => state.setAgentStatus);
  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: api.listSessions,
    retry: 1,
  });
  const activeSessionQuery = useQuery({
    queryKey: ['session', activeSessionId],
    queryFn: () => api.getSession(activeSessionId as string),
    enabled: Boolean(activeSessionId),
    retry: 1,
  });

  const activateSession = useCallback(
    (sessionId: string) => {
      setActivated(true);
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

  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, sessionId }: { message: string; sessionId: string | null }) => api.sendMessage(message, sessionId || undefined),
    onMutate: async ({ message, sessionId }) => {
      setAgentStatus('thinking');
      setConversationNotice(null);
      setPendingMessage(message);

      if (sessionId) {
        await queryClient.cancelQueries({ queryKey: ['session', sessionId] });
        const previousSession = queryClient.getQueryData<SessionDetail>(['session', sessionId]);

        if (previousSession) {
          queryClient.setQueryData<SessionDetail>(['session', sessionId], {
            ...previousSession,
            conversation_history: [
              ...previousSession.conversation_history,
              { role: 'user', content: message },
            ],
          });
        }

        return { previousSession };
      }
    },
    onSuccess: async (response) => {
      await handleSendComplete(response);
    },
    onError: (error, variables, context) => {
      setConversationNotice(error instanceof Error ? error.message : 'I could not reach the agent service.');
      if (variables.sessionId && context?.previousSession) {
        queryClient.setQueryData(['session', variables.sessionId], context.previousSession);
      }
    },
    onSettled: () => {
      setAgentStatus('idle');
      setPendingMessage(null);
    },
  });

  const sendMessage = useCallback(
    (message: string) => {
      const command = message.trim();
      if (!command || sendMessageMutation.isPending) return;
      setActivated(true);
      setPendingMessage(command);
      sendMessageMutation.mutate({ message: command, sessionId: activeSessionId });
    },
    [activeSessionId, sendMessageMutation],
  );

  return (
    <main className="harvie-workspace">
      <HarvieSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessionsQuery.data ?? []}
        activeSessionId={activeSessionId}
        sessionsLoading={sessionsQuery.isLoading}
        onNewChat={() => newChatMutation.mutate()}
        onSelectSession={activateSession}
        onRenameSession={(sessionId, title) => renameSessionMutation.mutate({ sessionId, title })}
        onDeleteSession={(sessionId) => deleteSessionMutation.mutate(sessionId)}
      />
      {activated && <ConversationPanel
        session={activeSessionQuery.data}
        error={activeSessionQuery.isError ? 'Could not load this session.' : null}
        notice={conversationNotice}
        pendingUserMessage={pendingMessage}
        isThinking={sendMessageMutation.isPending}
      />}
      <NucleusShell
        phase={activated ? 'active' : 'idle'}
      />
      <HarvieCommandBar
        sending={sendMessageMutation.isPending}
        onSend={sendMessage}
        boot={!activated}
      />
    </main>
  );
}
