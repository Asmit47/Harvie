import type { WorkspaceCard } from '@/stores/workspace-store';

export const proactiveCards: WorkspaceCard[] = [
  {
    id: 'today-priorities',
    kind: 'tasks',
    label: 'Today',
    title: 'Three tasks need a decision',
    description: 'Ship the dashboard review, reply to Neha, and confirm the research session.',
    action: 'Review tasks',
    priority: 'high',
    position: { x: 18, y: 17 },
  },
  {
    id: 'important-email',
    kind: 'email',
    label: 'Important email',
    title: 'A reply is waiting',
    description: 'Rahul is waiting for your confirmation on the architecture brief.',
    action: 'Open email',
    priority: 'high',
    position: { x: 65, y: 15 },
  },
  {
    id: 'calendar-insight',
    kind: 'calendar',
    label: 'Calendar',
    title: 'Design review in 40 minutes',
    description: 'You have enough time to finish the handoff notes before the meeting.',
    action: 'Prepare',
    priority: 'medium',
    position: { x: 66, y: 54 },
  },
  {
    id: 'focus-reminder',
    kind: 'suggestion',
    label: 'Harvie suggests',
    title: 'Protect your focus block',
    description: 'Your afternoon is clear after 3:30 PM. Reserve it for the dashboard work.',
    action: 'Block time',
    priority: 'medium',
    position: { x: 20, y: 63 },
  },
];

export const cardPositions = [
  { x: 18, y: 17 },
  { x: 65, y: 15 },
  { x: 66, y: 54 },
  { x: 20, y: 63 },
  { x: 43, y: 12 },
  { x: 43, y: 67 },
];
