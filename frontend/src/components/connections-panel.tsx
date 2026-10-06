'use client';

import { X } from 'lucide-react';
import { ConnectionCard } from '@/components/connection-card';

export function ConnectionsPanel({ userId, onClose }: { userId: string; onClose: () => void }) {

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="connections-title" className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-[#F59E5B]">Connections</p><h2 id="connections-title" className="mt-2 text-2xl font-medium text-white">Choose your tools</h2></div>
          <button type="button" onClick={onClose} aria-label="Close connections" className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>
        <div className="mt-6 grid gap-3">
          <ConnectionCard userId={userId} connection={{ toolkit: 'gmail', label: 'Gmail', description: 'Manage your inbox and draft replies' }} />
          <ConnectionCard userId={userId} connection={{ toolkit: 'googlecalendar', label: 'Google Calendar', description: 'Add, update, and reschedule events' }} />
        </div>
        <p className="mt-5 text-xs leading-5 text-zinc-500">Harvie only gets access after you approve it with the provider.</p>
      </section>
    </div>
  );
}
