'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { ConversationPanel } from '@/components/conversation-panel';
import { HarvieCommandBar } from '@/components/harvie-command-bar';
import { NucleusShell } from './nucleus-shell';
import { HarvieSidebar } from '@/components/harvie-sidebar';
import { api, ApiError, type MessageChoice, type SessionDetail, type WorkspaceResponse } from '@/lib/api';
import { ConnectionsPanel } from '@/components/connections-panel';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function HarvieDashboard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [conversationNotice, setConversationNotice] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [failedSend, setFailedSend] = useState<{ message: string; sessionId: string; requestId: string; choice?: MessageChoice } | null>(null);
  const sendingRef = useRef(false);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const setSidebarOpen = useWorkspaceStore((state) => state.setSidebarOpen);
  const setAgentStatus = useWorkspaceStore((state) => state.setAgentStatus);

  const workspaceQuery = useQuery({
    queryKey: ['workspace', userId],
    queryFn: api.startChat,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const sessionId = workspaceQuery.data?.session.id;

  const activeSessionQuery = useQuery({
    queryKey: ['session', userId, sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: Boolean(sessionId),
    initialData: () => workspaceQuery.data?.session,
    initialDataUpdatedAt: workspaceQuery.dataUpdatedAt,
    retry: 1,
  });

  const acceptWorkspace = useCallback((workspace: WorkspaceResponse) => {
    queryClient.setQueryData(['workspace', userId], workspace);
    queryClient.setQueryData(['session', userId, workspace.session.id], workspace.session);
  }, [queryClient, userId]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, sessionId, requestId, choice }: { message: string; sessionId: string; requestId: string; choice?: MessageChoice }) => api.sendMessage(message, sessionId, requestId, choice),
    onMutate: async ({ message, sessionId, requestId }) => {
      setAgentStatus('thinking');
      setConversationNotice(null);
      setFailedSend(null);
      setPendingMessage(message);
      await queryClient.cancelQueries({ queryKey: ['session', userId, sessionId] });
      queryClient.setQueryData<SessionDetail>(['session', userId, sessionId], (previous) => {
        if (!previous || previous.conversation_history.some((turn) => turn.id === `user:${requestId}`)) return previous;
        return {
          ...previous,
          conversation_history: [...previous.conversation_history, { id: `user:${requestId}`, role: 'user', content: message, source: 'user' }],
        };
      });
    },
    onSuccess: (response) => {
      acceptWorkspace(response);
      void queryClient.invalidateQueries({ queryKey: ['sessions', userId] });
    },
    onError: async (error, variables) => {
      setConversationNotice(error instanceof Error ? error.message : 'I could not reach the agent service.');
      setFailedSend(error instanceof ApiError && error.status >= 400 && error.status < 500 ? null : variables);
      await queryClient.invalidateQueries({ queryKey: ['session', userId, variables.sessionId] });
    },
    onSettled: () => {
      sendingRef.current = false;
      setAgentStatus('idle');
      setPendingMessage(null);
    },
  });

  const sendMessage = useCallback(
    (message: string, choice?: MessageChoice) => {
      const command = message.trim();
      if (!command || !sessionId || sendingRef.current) return;
      sendingRef.current = true;
      sendMessageMutation.mutate({ message: command, sessionId, requestId: crypto.randomUUID(), choice });
    },
    [sessionId, sendMessageMutation],
  );

  const session = activeSessionQuery.data ?? workspaceQuery.data?.session;
  const loading = workspaceQuery.isPending || !session;
  const loadError = workspaceQuery.isError || activeSessionQuery.isError;
  const lastUserTurn = [...(session?.conversation_history ?? [])].reverse().find((turn) => turn.role === 'user');
  const interruptedSend = !sendMessageMutation.isPending && lastUserTurn?.id?.startsWith('user:') && session && !session.conversation_history.some((turn) => turn.reply_to === lastUserTurn.id) ? {
    message: lastUserTurn.content,
    sessionId: session.id,
    requestId: lastUserTurn.id.slice('user:'.length),
    choice: lastUserTurn.prompt_id && lastUserTurn.choice_id ? { promptId: lastUserTurn.prompt_id, choiceId: lastUserTurn.choice_id } : undefined,
  } : null;
  const retryableSend = failedSend ?? interruptedSend;
  const placeholder = session?.onboarding_stage === 'name' ? 'Your name, or ask me anything' : 'What are we working on?';

  return (
    <main className="harvie-workspace">
      <HarvieSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onConnectionsClick={() => setShowConnections(true)}
      />
      {showConnections && <ConnectionsPanel userId={userId} onClose={() => setShowConnections(false)} />}
      <ConversationPanel
        userId={userId}
        session={session}
        loading={loading && !loadError}
        error={loadError ? 'Could not open your conversation. Try again.' : null}
        notice={conversationNotice ?? (interruptedSend ? 'Your last message is saved without a reply. Try again to continue.' : null)}
        pendingUserMessage={pendingMessage}
        isThinking={sendMessageMutation.isPending}
        onSend={sendMessage}
        onConnectionComplete={acceptWorkspace}
        onRetry={loadError ? () => { void workspaceQuery.refetch(); if (sessionId) void activeSessionQuery.refetch(); } : retryableSend ? () => {
          if (sendingRef.current) return;
          sendingRef.current = true;
          sendMessageMutation.mutate(retryableSend);
        } : undefined}
      />
      <NucleusShell
        phase="active"
      />
      <HarvieCommandBar
        sending={sendMessageMutation.isPending || loading || loadError}
        onSend={sendMessage}
        placeholder={placeholder}
      />
    </main>
  );
}
