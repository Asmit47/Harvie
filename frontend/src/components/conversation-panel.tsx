'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ConversationMessage } from '@/stores/workspace-store';

interface ConversationPanelProps {
  messages: ConversationMessage[];
}

export function ConversationPanel({ messages }: ConversationPanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="conversation-panel" aria-label="Conversation">
      <p className="conversation-kicker">Good morning, Asmit.</p>
      <p className="conversation-intro">I found a few things worth your attention.</p>
      {messages.length > 0 && (
        <div className="conversation-thread" aria-live="polite">
          {messages.map((message) => (
            <motion.article
              key={message.id}
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
      )}
    </section>
  );
}
