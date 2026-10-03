'use client';

import { Brain, Cable, ChevronLeft, MessageSquarePlus, PanelLeftClose, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HarvieSidebarProps {
  open: boolean;
  onToggle: () => void;
  onNewChat?: () => void;
  onConnectionsClick?: () => void;
}

export function HarvieSidebar({
  open,
  onToggle,
  onNewChat,
  onConnectionsClick,
}: HarvieSidebarProps) {
  return (
    <aside className={open ? 'harvie-sidebar harvie-sidebar-open' : 'harvie-sidebar'}>
      <div>
        <div className="sidebar-top">
          <div className="harvie-mark" aria-label="Harvie">
            <span />
            {open && <strong>Harvie</strong>}
          </div>
          <Button variant="ghost" size="icon-sm" className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
            {open ? <PanelLeftClose size={17} strokeWidth={1.75} /> : <ChevronLeft size={17} strokeWidth={1.75} />}
          </Button>
        </div>

        <nav className="sidebar-main-nav" aria-label="Harvie navigation">
          <button type="button" className="sidebar-link" title="New chat" onClick={onNewChat}>
            <MessageSquarePlus size={18} strokeWidth={1.75} />
            {open && <span>New Chat</span>}
          </button>
          <button type="button" className="sidebar-link" title="Memory">
            <Brain size={18} strokeWidth={1.75} />
            {open && <span>Memory</span>}
          </button>
          <button type="button" className="sidebar-link" title="Connectors" onClick={onConnectionsClick}>
            <Cable size={18} strokeWidth={1.75} />
            {open && <span>Connectors</span>}
          </button>
          <button type="button" className="sidebar-link" title="Settings">
            <Settings2 size={18} strokeWidth={1.75} />
            {open && <span>Settings</span>}
          </button>
        </nav>
      </div>

      <div className="sidebar-presence">
        <span aria-hidden="true" />
        {open && <small>Connected</small>}
      </div>
    </aside>
  );
}
