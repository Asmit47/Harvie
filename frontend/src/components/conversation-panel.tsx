'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ConversationTurn, MessageChoice, SessionDetail, WorkspaceResponse } from '@/lib/api';
import { ConnectionCard } from '@/components/connection-card';

interface ConversationPanelProps {
  userId: string;
  session?: SessionDetail;
  loading?: boolean;
  error?: string | null;
  notice?: string | null;
  pendingUserMessage?: string | null;
  isThinking?: boolean;
  onSend: (message: string, choice?: MessageChoice) => void;
  onConnectionComplete: (workspace: WorkspaceResponse) => void;
  onRetry?: () => void;
}

export function ConversationPanel({
  userId,
  session,
  loading = false,
  error = null,
  notice = null,
  pendingUserMessage = null,
  isThinking = false,
  onSend,
  onConnectionComplete,
  onRetry,
}: ConversationPanelProps) {
  const reduceMotion = useReducedMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeRevealRef = useRef<boolean | null>(null);
  const [revealWelcome, setRevealWelcome] = useState<boolean | null>(null);
  const history = session?.conversation_history ?? [];

  useEffect(() => {
    if (!session || welcomeRevealRef.current !== null) return;
    if (!history.some((turn) => turn.reveal_on_first_visit)) {
      welcomeRevealRef.current = false;
      setRevealWelcome(false);
      return;
    }
    const key = `harvie:welcome-revealed:${userId}`;
    try {
      const firstVisit = window.localStorage.getItem(key) !== '1';
      window.localStorage.setItem(key, '1');
      welcomeRevealRef.current = firstVisit;
      setRevealWelcome(firstVisit);
    } catch {
      welcomeRevealRef.current = false;
      setRevealWelcome(false);
    }
  }, [history, session, userId]);

  // Determine if pendingUserMessage needs to be displayed explicitly
  const lastMsg = history[history.length - 1];
  const showPendingUser =
    Boolean(pendingUserMessage) &&
    (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== pendingUserMessage);

  const displayMessages: ConversationTurn[] = useMemo(() => [
    ...history,
    ...(showPendingUser ? [{ role: 'user', content: pendingUserMessage! }] : []),
  ], [history, pendingUserMessage, showPendingUser]);

  // ── Progressive reveal ──────────────────────────────────────────────
  const [revealedCount, setRevealedCount] = useState(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (revealWelcome === null) return;
    if (!revealWelcome) {
      if (revealedCount !== displayMessages.length) setRevealedCount(displayMessages.length);
      return;
    }
    // Nothing left to reveal → bail out.
    if (revealedCount >= displayMessages.length) return;

    const next = displayMessages[revealedCount];

    // User messages appear instantly (no delay).
    if (next?.role === 'user' || !revealWelcome || next?.source !== 'onboarding') {
      setRevealedCount((c) => c + 1);
      return;
    }

    // Let the reader finish each first-run welcome message before continuing.
    const words = next.content.trim().split(/\s+/).length;
    const delay = Math.min(2800, Math.max(1200, Math.ceil(words / 5) * 1000));
    revealTimerRef.current = setTimeout(() => {
      setRevealedCount((c) => c + 1);
    }, delay);

    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, [revealedCount, displayMessages, revealWelcome]);

  const visibleMessages = displayMessages.slice(0, revealedCount);
  const lastVisibleMessage = visibleMessages[visibleMessages.length - 1];
  /** True while an assistant message is queued but not yet shown. */
  const isRevealing =
    revealedCount < displayMessages.length &&
    displayMessages[revealedCount]?.role === 'assistant';

  useEffect(() => {
    // Keep the opening welcome in view while its messages reveal one by one.
    // Normal chat turns still follow the newest message.
    if (revealWelcome && (isRevealing || lastVisibleMessage?.reveal_on_first_visit)) return;
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [visibleMessages.length, isThinking, isRevealing, lastVisibleMessage?.reveal_on_first_visit, reduceMotion, revealWelcome]);

  return (
    <section className="conversation-panel" aria-label="Conversation">
      <div className="conversation-thread" aria-live="polite">
        {loading && <p className="conversation-status" role="status">Opening your conversation…</p>}
        {visibleMessages.map((message, index) => (
          <motion.article
            key={message.id ?? `${message.role}-${index}`}
            className={
              message.role === 'user'
                ? 'conversation-message conversation-message-user'
                : 'conversation-message conversation-message-assistant'
            }
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            <p>{message.content}</p>
            {!!message.connections?.length && (
              <div className="connection-card-group" aria-label="Connect your apps">
                {message.connections.length > 1 && <h3>Connect your apps</h3>}
                {message.connections.map((connection) => (
                  <ConnectionCard
                    key={connection.toolkit}
                    connection={connection}
                    userId={userId}
                    sessionId={session?.id}
                    confirmationRecorded={session?.onboarding_stage !== 'connections' && history.some((turn) => turn.id === `connection:${connection.toolkit}`)}
                    onComplete={onConnectionComplete}
                  />
                ))}
              </div>
            )}
            {!!message.choices?.length && (
              <div className="conversation-choices" aria-label="Suggested replies">
                {message.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isThinking || !message.id || (choice.kind === 'onboarding' && choice.stage !== session?.onboarding_stage)}
                    onClick={() => onSend(choice.value, { promptId: message.id!, choiceId: choice.id })}
                  >{choice.label}</button>
                ))}
              </div>
            )}
          </motion.article>
        ))}
        {(isThinking || isRevealing) && (
          <motion.article
            className="conversation-message conversation-message-assistant conversation-message-thinking"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            <div className="thinking-dots" aria-label="Harvie is thinking">
              <span />
              <span />
              <span />
            </div>
          </motion.article>
        )}
        <div ref={messagesEndRef} className="conversation-end" />
      </div>
      {history[history.length - 1]?.source === 'llm' && session?.onboarding_stage === 'name' && (
        <p className="conversation-status">You can return to the welcome anytime—tell me what to call you here.</p>
      )}
      {error && <p role="alert" className="conversation-status conversation-status-error">{error}</p>}
      {notice && <p role="alert" className="conversation-status conversation-status-error">{notice}</p>}
      {onRetry && <button className="conversation-retry" type="button" disabled={isThinking} onClick={onRetry}>Try again</button>}
    </section>
  );
}
