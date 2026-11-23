'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CircleCheck, Clock3, Eye, Inbox, X } from 'lucide-react';
import { api, type FeedItem, type WorkTask } from '@/lib/api';

export function FeedPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const feedKey = ['feed', userId];
  const tasksKey = ['tasks', userId];

  const feedQuery = useQuery({
    queryKey: feedKey,
    queryFn: () => api.getFeed(true),
    refetchInterval: 60_000,
  });
  const tasksQuery = useQuery({ queryKey: tasksKey, queryFn: () => api.getTasks(true), refetchInterval: 60_000 });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: feedKey });
    void queryClient.invalidateQueries({ queryKey: ['feed-unread', userId] });
  };

  const readMutation = useMutation({ mutationFn: api.markFeedRead, onSuccess: invalidate });
  const readAllMutation = useMutation({ mutationFn: api.markAllFeedRead, onSuccess: invalidate });
  const cancelTaskMutation = useMutation({ mutationFn: api.cancelTask, onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: tasksKey });
    invalidate();
  } });

  const items = feedQuery.data?.items ?? [];
  const tasks = tasksQuery.data ?? [];
  const unread = feedQuery.data?.unread_count ?? 0;
  const activeTasks = tasks.filter((task) => task.status === 'queued' || task.status === 'running' || task.status === 'waiting_approval');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="feed-title" className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151517] shadow-2xl">
        <header className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">While you were away</p>
            <h2 id="feed-title" className="mt-1 text-xl font-medium text-white">Notices</h2>
            <p className="mt-1 text-xs text-zinc-500">{unread ? `${unread} unread` : 'Nothing new waiting.'}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {unread > 0 && (
              <button type="button" onClick={() => readAllMutation.mutate()} className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white">Mark all read</button>
            )}
            <button type="button" onClick={onClose} aria-label="Close notices" className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-white"><X size={16} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {feedQuery.isPending ? (
            <div className="space-y-2 p-2"><div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" /><div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" /></div>
          ) : feedQuery.isError ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">Notices couldn’t load. Try again later.</p>
          ) : !items.length && !activeTasks.length ? (
            <div className="px-4 py-10 text-center">
              <Bell size={20} className="mx-auto text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-200">All quiet</p>
              <p className="mt-1 text-xs text-zinc-500">Harvie only speaks up when something needs you.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {activeTasks.map((task) => <TaskRow key={task.id} task={task} onCancel={() => cancelTaskMutation.mutate(task.id)} />)}
              {items.map((item) => <FeedRow key={item.id} item={item} onRead={() => readMutation.mutate(item.id)} />)}
            </ul>
          )}
        </div>

        {(readMutation.isError || readAllMutation.isError || cancelTaskMutation.isError) && (
          <p role="alert" className="border-t border-white/[0.07] px-6 py-3 text-xs text-rose-300">That didn’t go through. Try again.</p>
        )}
      </section>
    </div>
  );
}

const KIND_LABELS: Record<string, string> = {
  nudge: 'Noticed',
  briefing: 'Briefing',
  alert: 'Needs you',
  update: 'Update',
  task: 'Background work',
};

function FeedRow({ item, onRead }: { item: FeedItem; onRead: () => void }) {
  const when = item.created_at ? new Date(item.created_at) : null;
  const whenLabel = when && !Number.isNaN(when.getTime())
    ? when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '';
  return (
    <li className={`group rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04] ${item.read ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.priority === 'high' ? 'bg-lime-300' : item.priority === 'medium' ? 'bg-zinc-400' : 'bg-zinc-600'}`} title={`${item.priority} priority`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
            <span>{KIND_LABELS[item.kind] ?? item.kind}</span>
            {whenLabel && <><span>·</span><span className="inline-flex items-center gap-1"><Clock3 size={10} />{whenLabel}</span></>}
          </div>
          <p className="mt-1 text-sm text-zinc-200">{item.title}</p>
          {item.body && <p className="mt-1 whitespace-pre-line text-xs leading-5 text-zinc-500">{item.body}</p>}
        </div>
        {!item.read && (
          <button type="button" onClick={onRead} aria-label="Mark read" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-zinc-500 opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-white group-hover:opacity-100">
            <Check size={13} />
          </button>
        )}
      </div>
    </li>
  );
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  running: 'Working',
  waiting_approval: 'Awaiting your approval',
  completed: 'Done',
  failed: 'Stopped',
  cancelled: 'Cancelled',
};

function TaskRow({ task, onCancel }: { task: WorkTask; onCancel: () => void }) {
  const lastStep = task.progress?.length ? task.progress[task.progress.length - 1].step : null;
  return (
    <li className="group rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <span className="mt-1 grid size-5 shrink-0 place-items-center text-lime-300"><CircleCheck size={15} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
            <span>{STATUS_LABELS[task.status] ?? task.status}</span>
            {(task.status === 'queued' || task.status === 'running') && <span className="inline-flex items-center gap-1"><span className="size-1.5 animate-pulse rounded-full bg-lime-300" /></span>}
          </div>
          <p className="mt-1 truncate text-sm text-zinc-200">{task.title}</p>
          {task.result_summary && <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-5 text-zinc-500">{task.result_summary}</p>}
          {!task.result_summary && lastStep && <p className="mt-1 text-xs text-zinc-500">{lastStep}</p>}
        </div>
        {(task.status === 'queued' || task.status === 'running') && (
          <button type="button" onClick={onCancel} className="mt-0.5 rounded-lg px-2 py-1 text-[11px] text-zinc-500 opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-white group-hover:opacity-100">Cancel</button>
        )}
      </div>
    </li>
  );
}
