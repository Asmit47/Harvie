'use client';

import { Brain, Cable, ChevronLeft, MessageSquarePlus, MoreHorizontal, PanelLeftClose, Search, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SessionSummary } from '@/lib/api';

interface HarvieSidebarProps {
  open: boolean;
  onToggle: () => void;
  sessions: SessionSummary[];
  activeSessionId: string | null;
  sessionsLoading: boolean;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export function HarvieSidebar({
  open,
  onToggle,
  sessions,
  activeSessionId,
  sessionsLoading,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
}: HarvieSidebarProps) {
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredSessions = sessions.filter((session) =>
    (session.title || 'Untitled chat').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const renameSession = (session: SessionSummary) => {
    const title = window.prompt('Rename chat', session.title);
    const nextTitle = title?.trim();
    if (!nextTitle || nextTitle === session.title) return;
    onRenameSession(session.id, nextTitle);
  };

  const deleteSession = (session: SessionSummary) => {
    if (!window.confirm(`Delete "${session.title}"?`)) return;
    onDeleteSession(session.id);

  
  };

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
          <button type="button" className="sidebar-link sidebar-link-primary" title="New chat" onClick={onNewChat}>
            <MessageSquarePlus size={18} strokeWidth={1.75} />
            {open && <span>New Chat</span>}
          </button>
          <button type="button" className="sidebar-link" title="Memory">
            <Brain size={18} strokeWidth={1.75} />
            {open && <span>Memory</span>}
          </button>
          <button type="button" className="sidebar-link" title="Connectors">
            <Cable size={18} strokeWidth={1.75} />
            {open && <span>Connectors</span>}
          </button>
          <button type="button" className="sidebar-link" title="Settings">
            <Settings2 size={18} strokeWidth={1.75} />
            {open && <span>Settings</span>}
          </button>
        </nav>

        {open && (
          <div className="sidebar-session-section">
            <div className="sidebar-chats-header">
              <p className="sidebar-section-label">Chats</p>
              <button
                type="button"
                className="sidebar-search-toggle"
                onClick={() => {
                  setSearchOpen((value) => !value);
                  if (searchOpen) setSearchQuery('');
                }}
                aria-label={searchOpen ? 'Close search' : 'Search chats'}
              >
                <Search size={14} strokeWidth={1.75} />
              </button>
            </div>

            {searchOpen && (
              <div className="sidebar-search">
                <Search size={14} strokeWidth={1.75} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chats"
                  aria-label="Search chats"
                  autoFocus
                />
              </div>
            )}
            <div className="sidebar-session-list" aria-label="Chats">
              {sessionsLoading && <p className="sidebar-session-empty">Loading chats...</p>}
              {!sessionsLoading && filteredSessions.length === 0 && (
                <p className="sidebar-session-empty">{searchQuery ? 'No matching chats' : 'No chats yet'}</p>
              )}
              {filteredSessions.map((session) => {
                const active = session.id === activeSessionId;
                return (
                  <div key={session.id} className={active ? 'sidebar-session-row sidebar-session-row-active' : 'sidebar-session-row'}>
                    <button type="button" className="sidebar-session-button" onClick={() => onSelectSession(session.id)}>
                      <span>{session.title || 'Untitled chat'}</span>
                    </button>
                    <button
                      type="button"
                      className="sidebar-session-menu-button"
                      aria-label={`Open actions for ${session.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuSessionId((current) => (current === session.id ? null : session.id));
                      }}
                    >
                      <MoreHorizontal size={16} strokeWidth={1.75} />
                    </button>
                    {menuSessionId === session.id && (
                      <div className="sidebar-session-menu">
                        <button type="button" onClick={() => renameSession(session)}>Rename</button>
                        <button type="button" onClick={() => deleteSession(session)}>Delete</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="sidebar-presence">
        <span aria-hidden="true" />
        {open && <small>Connected</small>}
      </div>
    </aside>
  );
}