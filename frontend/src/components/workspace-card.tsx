'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, CheckSquare2, Lightbulb, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WorkspaceCard as WorkspaceCardType } from '@/stores/workspace-store';

const icons = {
  tasks: CheckSquare2,
  email: Mail,
  calendar: CalendarDays,
  suggestion: Lightbulb,
  reminder: CalendarDays,
};

interface WorkspaceCardProps {
  card: WorkspaceCardType;
  onDismiss: (id: string) => void;
}

export function WorkspaceCard({ card, onDismiss }: WorkspaceCardProps) {
  const reduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const Icon = icons[card.kind];

  return (
    <div
      ref={setNodeRef}
      className="workspace-card-shell"
      style={{
        left: `${card.position.x}%`,
        top: `${card.position.y}%`,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 30 : 10,
      }}
      {...attributes}
      {...listeners}
    >
      <motion.article
        className={cn('workspace-card', isDragging && 'workspace-card-dragging')}
        initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.975 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="workspace-card-header">
          <span className="workspace-card-kind">
            <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
            {card.label}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="workspace-card-dismiss"
            aria-label={`Dismiss ${card.title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDismiss(card.id);
            }}
          >
            <X size={14} strokeWidth={1.75} />
          </Button>
        </header>
        <h2>{card.title}</h2>
        <p>{card.description}</p>
        <footer>
          <span className={card.priority === 'high' ? 'priority-high' : 'priority'}>
            {card.priority === 'high' ? 'Needs attention' : 'Suggested next'}
          </span>
          <button
            type="button"
            className="workspace-card-action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDismiss(card.id);
            }}
          >
            {card.action}
          </button>
        </footer>
      </motion.article>
    </div>
  );
}
