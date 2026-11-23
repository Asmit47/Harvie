'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationPanel, type OutboundMessage } from '@/components/conversation-panel';
import { HarvieCommandBar } from '@/components/harvie-command-bar';
import { NucleusShell } from './nucleus-shell';
import { HarvieSidebar } from '@/components/harvie-sidebar';
import { FollowupsPanel } from '@/components/followups-panel';
import { FeedPanel } from '@/components/feed-panel';
import { api, ApiError, type MessageChoice, type SessionDetail, type WorkspaceResponse } from '@/lib/api';
import { ConnectionsPanel } from '@/components/connections-panel';
import { useWorkspaceStore } from '@/stores/workspace-store';

type QueuedSend = {
  localId: string;
  message: string;
  sessionId: string | null;
  requestId: string;
  choice?: MessageChoice;
  status: 'queued' | 'sending' | 'failed';
};

export function HarvieDashboard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [conversationNotice, setConversationNotice] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [showFollowups, setShowFollowups] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [failedSend, setFailedSend] = useState<{ message: string; sessionId: string; requestId: string; choice?: MessageChoice } | null>(null);
  const [queue, setQueue] = useState<QueuedSend[]>([]);
  const queueRef = useRef<QueuedSend[]>([]);
  const inFlightRef = useRef(false);
  const dispatchedRef = useRef(new Set<string>());
  const sessionIdRef = useRef<string | undefined>(undefined);
  const setAgentStatus = useWorkspaceStore((state) => state.setAgentStatus);

  const workspaceQuery = useQuery({
    queryKey: ['workspace', userId],
    queryFn: api.startChat,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const sessionId = workspaceQuery.data?.session.id;
  sessionIdRef.current = sessionId;

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

  const createNewChat = useCallback(async () => {
    const profile = queryClient.getQueryData<WorkspaceResponse>(['workspace', userId])?.profile;
    if (!profile) {
      setConversationNotice('Your workspace is still loading. Try again in a moment.');
      return;
    }
    try {
      const nextSession = await api.createSession();
      acceptWorkspace({ profile, session: nextSession });
      void queryClient.invalidateQueries({ queryKey: ['sessions', userId] });
    } catch {
      setConversationNotice('Could not start a new conversation. Try again.');
    }
  }, [acceptWorkspace, queryClient, userId]);

  const syncQueue = useCallback((next: QueuedSend[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);
  const pumpRef = useRef<() => void>(() => {});

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, sessionId, requestId, choice }: QueuedSend) => api.sendMessage(message, sessionId || '', requestId, choice),
    onMutate: async ({ message, sessionId, requestId }) => {
      setAgentStatus('thinking');
      setConversationNotice(null);
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
    onSuccess: (response, variables) => {
      acceptWorkspace(response);
      const nextSessionId = response.session_id;
      syncQueue(queueRef.current
        .filter((item) => item.localId !== variables.localId)
        .map((item) => (
          nextSessionId && (item.sessionId === variables.sessionId || item.sessionId === 'welcome')
            ? { ...item, sessionId: nextSessionId }
            : item
        )));
      setFailedSend((current) => current?.requestId === variables.requestId ? null : current);
      void queryClient.invalidateQueries({ queryKey: ['sessions', userId] });
      void queryClient.invalidateQueries({ queryKey: ['feed-unread'] });
    },
    onError: async (error, variables) => {
      syncQueue(queueRef.current.map((item) => item.localId === variables.localId ? { ...item, status: 'failed' } : item));
      setConversationNotice(error instanceof Error ? error.message : 'I could not reach the agent service.');
      setFailedSend(error instanceof ApiError && error.status >= 400 && error.status < 500 ? null : {
        message: variables.message,
        sessionId: variables.sessionId || '',
        requestId: variables.requestId,
        choice: variables.choice,
      });
      await queryClient.invalidateQueries({ queryKey: ['session', userId, variables.sessionId] });
    },
    onSettled: () => {
      inFlightRef.current = false;
      setAgentStatus('idle');
      setPendingMessage(null);
      pumpRef.current();
    },
  });

  const pump = useCallback(() => {
    if (inFlightRef.current) return;
    const next = queueRef.current.find((item) => item.status === 'queued' && !dispatchedRef.current.has(item.requestId));
    if (!next) return;
    const sid = next.sessionId ?? sessionIdRef.current;
    if (!sid) return;
    dispatchedRef.current.add(next.requestId);
    inFlightRef.current = true;
    const sending = { ...next, sessionId: sid, status: 'sending' as const };
    syncQueue(queueRef.current.map((item) => item.localId === next.localId ? sending : item));
    sendMessageMutation.mutate(sending);
  }, [sendMessageMutation, syncQueue]);
  pumpRef.current = pump;

  useEffect(() => {
    sessionIdRef.current = sessionId;
    pump();
  }, [pump, sessionId]);

  const enqueue = useCallback((message: string, choice?: MessageChoice, existing?: { requestId: string; sessionId?: string }) => {
    const command = message.trim();
    if (!command) return;
    if (existing?.requestId) dispatchedRef.current.delete(existing.requestId);
    const item: QueuedSend = {
      localId: crypto.randomUUID(),
      message: command,
      sessionId: existing?.sessionId ?? sessionIdRef.current ?? null,
      requestId: existing?.requestId ?? crypto.randomUUID(),
      choice,
      status: 'queued',
    };
    syncQueue([...queueRef.current, item]);
    pump();
  }, [pump, syncQueue]);

  const removeQueued = useCallback((localId: string) => {
    const item = queueRef.current.find((entry) => entry.localId === localId);
    if (!item || item.status === 'sending') return;
    dispatchedRef.current.delete(item.requestId);
    syncQueue(queueRef.current.filter((entry) => entry.localId !== localId));
  }, [syncQueue]);

  const retryQueued = useCallback((localId: string) => {
    const item = queueRef.current.find((entry) => entry.localId === localId);
    if (!item) return;
    dispatchedRef.current.delete(item.requestId);
    syncQueue(queueRef.current.map((entry) => entry.localId === localId ? { ...entry, status: 'queued' } : entry));
    pump();
  }, [pump, syncQueue]);

  const sendMessage = useCallback((message: string, choice?: MessageChoice) => {
    enqueue(message, choice);
  }, [enqueue]);

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
        activeView={showFeed ? 'feed' : showFollowups ? 'followups' : showConnections ? 'connections' : 'chat'}
        onNewChat={() => { if (showConnections) { setShowConnections(false); return; } void createNewChat(); }}
        onConnectionsClick={() => { setShowFollowups(false); setShowFeed(false); setShowConnections(true); }}
        onFollowupsClick={() => { setShowConnections(false); setShowFeed(false); setShowFollowups(true); }}
        onFeedClick={() => { setShowConnections(false); setShowFollowups(false); setShowFeed(true); }}
      />
      {showFollowups && <FollowupsPanel userId={userId} onClose={() => setShowFollowups(false)} />}
      {showFeed && <FeedPanel userId={userId} onClose={() => setShowFeed(false)} />}
      {showConnections ? <ConnectionsPanel userId={userId} onClose={() => setShowConnections(false)} /> : <>
      <ConversationPanel
        userId={userId}
        session={session}
        loading={loading && !loadError}
        error={loadError ? 'Could not open your conversation. Try again.' : null}
        notice={conversationNotice ?? (interruptedSend ? 'Your last message is saved without a reply. Try again to continue.' : null)}
        pendingUserMessage={pendingMessage}
        outbound={queue.filter((item): item is QueuedSend & { status: 'queued' | 'failed' } => item.status !== 'sending').map((item): OutboundMessage => ({
          localId: item.localId,
          content: item.message,
          requestId: item.requestId,
          status: item.status,
        }))}
        isThinking={sendMessageMutation.isPending}
        onSend={sendMessage}
        onConnectionComplete={acceptWorkspace}
        onRemoveOutbound={removeQueued}
        onRetryOutbound={retryQueued}
        onRetry={loadError ? () => { void workspaceQuery.refetch(); if (sessionId) void activeSessionQuery.refetch(); } : retryableSend ? () => {
          enqueue(retryableSend.message, retryableSend.choice, { requestId: retryableSend.requestId, sessionId: retryableSend.sessionId });
        } : undefined}
      />
      <NucleusShell
        phase="active"
      />
      <HarvieCommandBar
        sending={sendMessageMutation.isPending}
        onSend={sendMessage}
        placeholder={placeholder}
      />
      </>}
    </main>
  );
}
