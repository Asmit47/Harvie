'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, X } from 'lucide-react';
import { api, type OpenLoop } from '@/lib/api';

export function FollowupsPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const queryKey = ['open-loops', userId];
  const loopsQuery = useQuery({ queryKey, queryFn: api.getOpenLoops });
  const completeMutation = useMutation({
    mutationFn: api.completeOpenLoop,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const loops = loopsQuery.data?.open_loops ?? [];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="followups-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#151517] shadow-2xl">
        <header className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
          <div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Your open loops</p><h2 id="followups-title" className="mt-1 text-xl font-medium text-white">Follow-ups</h2><p className="mt-1 text-xs text-zinc-500">Things Harvie is keeping track of for you.</p></div>
          <button type="button" onClick={onClose} aria-label="Close follow-ups" className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-white"><X size={16} /></button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {loopsQuery.isPending ? <div className="space-y-2 p-2"><div className="h-14 animate-pulse rounded-lg bg-white/[0.04]" /><div className="h-14 animate-pulse rounded-lg bg-white/[0.04]" /></div>
            : loopsQuery.isError ? <p className="px-4 py-8 text-center text-sm text-zinc-400">Follow-ups couldn’t load. Try again later.</p>
              : loops.length ? <ul className="space-y-1">{loops.map((loop) => <FollowupRow key={loop.id} loop={loop} busy={completeMutation.isPending && completeMutation.variables === loop.id} onComplete={() => completeMutation.mutate(loop.id)} />)}</ul>
                : <div className="px-4 py-10 text-center"><Check size={20} className="mx-auto text-zinc-500" /><p className="mt-3 text-sm text-zinc-200">You’re all caught up</p><p className="mt-1 text-xs text-zinc-500">When something needs a follow-up, it’ll show up here.</p></div>}
        </div>
        {completeMutation.isError && <p role="alert" className="border-t border-white/[0.07] px-6 py-3 text-xs text-rose-300">Could not complete that follow-up. Try again.</p>}
      </section>
    </div>
  );
}

function FollowupRow({ loop, busy, onComplete }: { loop: OpenLoop; busy: boolean; onComplete: () => void }) {
  const due = loop.due_at ? new Date(loop.due_at) : null;
  const dueLabel = due && !Number.isNaN(due.getTime()) ? due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
  return (
    <li className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04]">
      <button type="button" onClick={onComplete} disabled={busy || loop.status === 'snoozed'} aria-label={`Complete ${loop.title}`} className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-md border border-white/20 text-transparent transition-colors hover:border-lime-300 hover:bg-lime-300 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"><Check size={12} strokeWidth={2.5} /></button>
      <div className="min-w-0 flex-1"><p className="text-sm text-zinc-200">{loop.title}</p>{loop.details && <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{loop.details}</p>}<div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500"><span className="capitalize">{loop.type.replace('_', ' ')}</span>{dueLabel && <><span>·</span><span className="inline-flex items-center gap-1"><Clock3 size={11} />{dueLabel}</span></>}{loop.status === 'snoozed' && <><span>·</span><span>Snoozed</span></>}</div></div>
      {loop.priority === 'high' && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-lime-300" title="High priority" />}
    </li>
  );
}
