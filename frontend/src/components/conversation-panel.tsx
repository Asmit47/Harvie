'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { SessionDetail } from '@/lib/api';

interface ConversationPanelProps {
  session?: SessionDetail;
  error?: string | null;
  notice?: string | null;
  pendingUserMessage?: string | null;
  isThinking?: boolean;
}

export function ConversationPanel({
  session,
  error = null,
  notice = null,
  pendingUserMessage = null,
  isThinking = false,
}: ConversationPanelProps) {
  const reduceMotion = useReducedMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const history = session?.conversation_history ?? [];

  // Determine if pendingUserMessage needs to be displayed explicitly
  const lastMsg = history[history.length - 1];
  const showPendingUser =
    Boolean(pendingUserMessage) &&
    (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== pendingUserMessage);

  const displayMessages = [
    ...history,
    ...(showPendingUser ? [{ role: 'user', content: pendingUserMessage! }] : []),
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length, isThinking]);

  return (
    <section className="conversation-panel" aria-label="Conversation">
      <div className="conversation-thread" aria-live="polite">
        {displayMessages.map((message, index) => (
          <motion.article
            key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
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
          </motion.article>
        ))}
        {isThinking && (
          <motion.article
            className="conversation-message conversation-message-assistant conversation-message-thinking"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            <div className="thinking-dots" aria-label="Nexus is thinking">
              <span />
              <span />
              <span />
            </div>
          </motion.article>
        )}
        <div ref={messagesEndRef} />
      </div>
      {error && <p className="conversation-status conversation-status-error">{error}</p>}
      {notice && <p className="conversation-status conversation-status-error">{notice}</p>}
    </section>
  );
}
