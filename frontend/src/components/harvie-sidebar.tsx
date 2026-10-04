'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Blocks, Brain, Check, Clock3, Home, LogOut, Settings2, Workflow, X } from 'lucide-react';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { api, type MemoryEntry } from '@/lib/api';

export interface HarvieSidebarProps {
  onNewChat?: () => void;
  onConnectionsClick?: () => void;
  onFollowupsClick?: () => void;
}

const NAV_ITEMS = [
  { label: 'Home', icon: Home, action: 'chat' },
  { label: 'Tasks', icon: Clock3, action: 'followups' },
  { label: 'Connections', icon: Workflow, action: 'connections' },
] as const;

export function HarvieSidebar({ onNewChat, onConnectionsClick, onFollowupsClick }: HarvieSidebarProps) {
  const [activeAction, setActiveAction] = useState('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!settingsOpen && !memoryOpen) return;
    function dismiss(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setMemoryOpen(false);
        setSettingsOpen(false);
      } else if (event instanceof MouseEvent && settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [settingsOpen, memoryOpen]);

  const actions = {
    chat: onNewChat,
    followups: onFollowupsClick,
    connections: onConnectionsClick,
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[60px] flex-col items-center border-r border-white/[0.07] bg-[#101012] py-5 select-none max-md:inset-x-3 max-md:top-3 max-md:bottom-auto max-md:h-14 max-md:w-auto max-md:flex-row max-md:rounded-xl max-md:border max-md:bg-[#101012]/95 max-md:px-2 max-md:py-1" aria-label="Sidebar navigation">
      <nav className="mt-[22vh] flex w-full flex-col items-center gap-5 pt-1 max-md:mt-0 max-md:w-auto max-md:flex-row max-md:gap-1 max-md:pt-0" aria-label="Main navigation">
        {NAV_ITEMS.map(({ label, icon: Icon, action }) => (
          <button
            key={action}
            type="button"
            onClick={() => { setActiveAction(action); actions[action]?.(); }}
            aria-label={label}
            title={label}
            aria-current={activeAction === action ? 'page' : undefined}
            className={`group relative grid size-11 place-items-center rounded-[16px] border transition-[color,background,border-color,transform] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60 ${activeAction === action ? 'border-white/[0.04] bg-white/[0.09] text-zinc-100' : 'border-transparent text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200'}`}
          >
            <Icon size={21} strokeWidth={1.65} />
            <span className="pointer-events-none absolute left-[52px] z-[60] translate-x-1 rounded-md border border-white/10 bg-[#1b1b1f] px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-xl transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
              {label}
            </span>
          </button>
        ))}
      </nav>

      <div ref={settingsRef} className="relative mt-auto max-md:ml-auto max-md:mt-0">
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-label="Settings"
          aria-expanded={settingsOpen}
          title="Settings"
          className={`group grid size-10 place-items-center rounded-xl transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60 ${settingsOpen ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:bg-white/[0.07] hover:text-white'}`}
        >
          <Settings2 size={18} strokeWidth={1.7} />
          {!settingsOpen && <span className="pointer-events-none absolute left-[52px] z-[60] translate-x-1 rounded-md border border-white/10 bg-[#1b1b1f] px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-xl transition duration-150 group-hover:translate-x-0 group-hover:opacity-100">Settings</span>}
        </button>

        <AnimatePresence>
          {settingsOpen && (
            <motion.section
              aria-label="Settings menu"
              initial={{ opacity: 0, x: -5, y: 5, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -5, y: 5, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute bottom-0 left-[52px] z-[70] w-[260px] overflow-hidden rounded-xl border border-white/10 bg-[#171719] p-2 text-white shadow-2xl shadow-black/50"
            >
              <div className="flex items-center gap-3 rounded-lg px-2.5 py-2.5">
                <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] text-xs text-zinc-300">
                  {isLoaded && user?.imageUrl ? <img src={user.imageUrl} alt="" className="size-full object-cover" /> : (user?.firstName?.[0] ?? 'U').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-100">{isLoaded ? (user?.fullName ?? user?.firstName ?? 'Your account') : 'Loading account…'}</p>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">{user?.primaryEmailAddress?.emailAddress ?? ''}</p>
                </div>
              </div>
              <div className="my-1 border-t border-white/[0.07]" />
              <button type="button" onClick={() => { setSettingsOpen(false); setMemoryOpen(true); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white">
                <Brain size={15} strokeWidth={1.7} /> Memory <span className="ml-auto text-[10px] text-zinc-600">Saved facts</span>
              </button>
              <button type="button" onClick={() => { setSettingsOpen(false); onConnectionsClick?.(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white">
                <Blocks size={15} strokeWidth={1.7} /> Connections
              </button>
              <div className="my-1 border-t border-white/[0.07]" />
              <SignOutButton>
                <button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white">
                  <LogOut size={15} strokeWidth={1.7} /> Sign out
                </button>
              </SignOutButton>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <MemoryDialog open={memoryOpen} onClose={() => setMemoryOpen(false)} />
    </aside>
  );
}

function MemoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [memories, setMemories] = useState<MemoryEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(false);
    setMemories(null);
    api.getMemories()
      .then(({ memories: entries }) => { if (!cancelled) setMemories(entries); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="memory-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#151517] shadow-2xl" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}>
            <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Personal context</p><h2 id="memory-title" className="mt-1 text-base font-medium text-white">Memory</h2></div>
              <button type="button" onClick={onClose} aria-label="Close memory" className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-white"><X size={16} /></button>
            </header>
            <div className="max-h-[55vh] overflow-y-auto p-5">
              {error ? <p className="text-sm text-zinc-400">Memory couldn’t load. Try again later.</p> : memories === null ? <div className="h-12 animate-pulse rounded-lg bg-white/[0.04]" /> : memories.length ? (
                <ul className="space-y-1">
                  {memories.map((entry) => <li key={entry.id} className="rounded-lg px-3 py-3 hover:bg-white/[0.035]"><p className="text-[10px] uppercase tracking-wide text-zinc-500">{entry.category}</p><p className="mt-1 text-sm leading-5 text-zinc-200">{entry.fact}</p></li>)}
                </ul>
              ) : <div className="py-6 text-center"><Brain size={20} className="mx-auto text-zinc-600" /><p className="mt-3 text-sm text-zinc-300">Nothing saved yet</p><p className="mt-1 text-xs text-zinc-500">As Harvie learns your preferences, they’ll appear here.</p></div>}
            </div>
            <footer className="flex items-center gap-2 border-t border-white/[0.07] px-5 py-3 text-[11px] text-zinc-500"><Check size={13} /> You can ask Harvie to update or forget a saved fact.</footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
