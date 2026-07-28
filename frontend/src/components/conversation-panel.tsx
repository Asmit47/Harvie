'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { SessionDetail } from '@/lib/api';

interface ConversationPanelProps {
  session?: SessionDetail;
  error?: string | null;
  notice?: string | null;
}

export function ConversationPanel({ session, error = null, notice = null }: ConversationPanelProps) {
  const reduceMotion = useReducedMotion();
  const messages = session?.conversation_history ?? [];
  const greeting = 'Good morning. Would you like me to begin your daily briefing?';

  return (
    <section className="conversation-panel" aria-label="Conversation">
      <p className="conversation-kicker">Nexus</p>
      <p className="conversation-intro">Your workspace is ready when you are.</p>
      <div className="conversation-thread" aria-live="polite">
        <motion.article
          className="conversation-message"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: reduceMotion ? 0 : 0.24 }}
        >
          <span>Nexus</span>
          <p>{greeting}</p>
        </motion.article>
        {messages.map((message, index) => (
          <motion.article
            key={`${message.role}-${index}`}
            className={message.role === 'user' ? 'conversation-message conversation-message-user' : 'conversation-message'}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
          >
            <span>{message.role === 'user' ? 'You' : 'Nexus'}</span>
            <p>{message.content}</p>
          </motion.article>
        ))}
      </div>
      {error && <p className="conversation-status conversation-status-error">{error}</p>}
      {notice && <p className="conversation-status conversation-status-error">{notice}</p>}
    </section>
  );
}
