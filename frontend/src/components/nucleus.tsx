'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AudioLines, BrainCircuit, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';

const statusCopy = {
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  acting: 'Working',
};

export function Nucleus() {
  const status = useWorkspaceStore((state) => state.agentStatus);
  const setStatus = useWorkspaceStore((state) => state.setAgentStatus);
  const reduceMotion = useReducedMotion();

  const isActive = status !== 'idle';
  const icon = status === 'listening' ? <AudioLines /> : status === 'thinking' ? <BrainCircuit /> : <Sparkles />;

  return (
    <section className="nucleus-wrap" aria-label={`Nexus is ${statusCopy[status].toLowerCase()}`}>
      <motion.button
        type="button"
        className="nucleus"
        aria-label="Activate Nexus listening mode"
        onClick={() => setStatus(status === 'listening' ? 'idle' : 'listening')}
        animate={
          reduceMotion
            ? { scale: 1 }
            : status === 'thinking'
              ? { scale: [1, 1.09, 1.03] }
              : status === 'listening'
                ? { scale: [1, 1.055, 1] }
                : { scale: [1, 1.028, 1] }
        }
        transition={{ duration: status === 'thinking' ? 1.8 : 4.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {status === 'thinking' && !reduceMotion && <span className="nucleus-ring nucleus-ring-thinking" />}
        {status === 'listening' && !reduceMotion && <span className="nucleus-ring nucleus-ring-listening" />}
        <span className="nucleus-surface" />
        <span className="nucleus-icon">{icon}</span>
      </motion.button>
      <p className="nucleus-status">
        <span className={isActive ? 'status-signal status-signal-active' : 'status-signal'} />
        Nexus is {statusCopy[status].toLowerCase()}
      </p>
    </section>
  );
}
