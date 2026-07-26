'use client';

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ConversationPanel } from '@/components/conversation-panel';
import { NexusCommandBar } from '@/components/nexus-command-bar';
import { Nucleus } from '@/components/nucleus';
import { NexusSidebar } from '@/components/nexus-sidebar';
import { WorkspaceCard } from '@/components/workspace-card';
import { proactiveCards } from '@/lib/workspace-data';
import { useWorkspaceStore } from '@/stores/workspace-store';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function NexusDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const cards = useWorkspaceStore((state) => state.cards);
  const messages = useWorkspaceStore((state) => state.messages);
  const hasHydrated = useWorkspaceStore((state) => state.hasHydrated);
  const proactiveBriefingSeeded = useWorkspaceStore((state) => state.proactiveBriefingSeeded);
  const addCards = useWorkspaceStore((state) => state.addCards);
  const dismissCard = useWorkspaceStore((state) => state.dismissCard);
  const moveCard = useWorkspaceStore((state) => state.moveCard);
  const markProactiveBriefingSeeded = useWorkspaceStore((state) => state.markProactiveBriefingSeeded);
  const briefing = useQuery({
    queryKey: ['nexus-proactive-briefing'],
    queryFn: async () => proactiveCards,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!hasHydrated || !briefing.data || proactiveBriefingSeeded) return;
    const nextCard = briefing.data.find((card) => !cards.some((item) => item.id === card.id));
    if (!nextCard) {
      markProactiveBriefingSeeded();
      return;
    }
    const timer = window.setTimeout(() => addCards([nextCard]), 750);
    return () => window.clearTimeout(timer);
  }, [addCards, briefing.data, cards, hasHydrated, markProactiveBriefingSeeded, proactiveBriefingSeeded]);

  const handleDragEnd = ({ active, delta }: DragEndEvent) => {
    const card = cards.find((item) => item.id === active.id);
    if (!card) return;
    moveCard(card.id, {
      x: clamp(card.position.x + (delta.x / window.innerWidth) * 100, 7, 70),
      y: clamp(card.position.y + (delta.y / window.innerHeight) * 100, 10, 69),
    });
  };

  return (
    <main className="nexus-workspace">
      <NexusSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} />
      <ConversationPanel messages={messages} />
      <Nucleus />
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <section className="workspace-cards" aria-label="Nexus workspace cards">
          <AnimatePresence>
            {cards.map((card) => <WorkspaceCard key={card.id} card={card} onDismiss={dismissCard} />)}
          </AnimatePresence>
        </section>
      </DndContext>
      <NexusCommandBar />
    </main>
  );
}
