'use client';

import { Brain, Cable, ChevronLeft, House, MessageSquareText, PanelLeftClose, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { label: 'Home', icon: House, active: true },
  { label: 'Chats', icon: MessageSquareText },
  { label: 'Memory', icon: Brain },
  { label: 'Connectors', icon: Cable },
  { label: 'Settings', icon: Settings2 },
];

interface NexusSidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function NexusSidebar({ open, onToggle }: NexusSidebarProps) {
  return (
    <aside className={open ? 'nexus-sidebar nexus-sidebar-open' : 'nexus-sidebar'}>
      <div className="sidebar-top">
        <div className="nexus-mark" aria-label="Nexus">
          <span />
          {open && <strong>Nexus</strong>}
        </div>
        <Button variant="ghost" size="icon-sm" className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          {open ? <PanelLeftClose size={17} strokeWidth={1.75} /> : <ChevronLeft size={17} strokeWidth={1.75} />}
        </Button>
      </div>
      <nav aria-label="Primary navigation">
        {navigation.map(({ label, icon: Icon, active }) => (
          <button key={label} type="button" className={active ? 'sidebar-link sidebar-link-active' : 'sidebar-link'} title={label}>
            <Icon size={18} strokeWidth={1.75} />
            {open && <span>{label}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-presence">
        <span aria-hidden="true" />
        {open && <small>Connected</small>}
      </div>
    </aside>
  );
}
