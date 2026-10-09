'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { ConnectionTile } from '@/components/connection-tile';
import { api, type DirectoryApp } from '@/lib/api';

type View = 'popular' | 'connected' | 'all' | (string & {});

function rank(app: DirectoryApp, term: string): number {
  const name = app.name.toLowerCase();
  if (name === term) return 0;
  if (name.startsWith(term)) return 1;
  if (name.includes(term) || app.slug.includes(term)) return 2;
  if (app.description.toLowerCase().includes(term) || app.category_label.toLowerCase().includes(term)) return 3;
  return -1;
}

export function ConnectionsPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('popular');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const term = deferredSearch.toLowerCase();

  const directory = useQuery({ queryKey: ['integration-directory'], queryFn: api.getDirectory, staleTime: 60 * 60 * 1000, retry: 1 });
  const connectedKey = ['integrations-connected', userId];
  const connectedQuery = useQuery({ queryKey: connectedKey, queryFn: api.getConnectedApps, staleTime: 15000, retry: 1 });

  const connected = useMemo(() => new Set(connectedQuery.data?.toolkits ?? []), [connectedQuery.data]);
  const apps = useMemo(() => directory.data?.apps ?? [], [directory.data]);
  const bySlug = useMemo(() => new Map(apps.map((app) => [app.slug, app])), [apps]);

  const markConnected = useCallback((slug: string) => {
    queryClient.setQueryData<{ toolkits: string[] }>(['integrations-connected', userId], (old) => ({
      toolkits: Array.from(new Set([...(old?.toolkits ?? []), slug])),
    }));
    void queryClient.invalidateQueries({ queryKey: ['integrations-connected', userId] });
  }, [queryClient, userId]);

  const connectedApps = useMemo<DirectoryApp[]>(
    () => Array.from(connected).map((slug) => bySlug.get(slug) ?? {
      slug,
      name: slug.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      description: 'Connected to Harvie.',
      category: 'other',
      category_label: 'Other',
    }),
    [connected, bySlug],
  );

  const searching = term.length > 0;
  const { title, items } = useMemo(() => {
    if (searching) {
      const matches = apps
        .map((app) => ({ app, score: rank(app, term) }))
        .filter((entry) => entry.score >= 0)
        .sort((a, b) => a.score - b.score);
      return { title: `Results for “${deferredSearch}”`, items: matches.map((entry) => entry.app) };
    }
    if (view === 'connected') return { title: 'Connected', items: connectedApps };
    if (view === 'all') return { title: 'All apps', items: apps };
    if (view === 'popular') {
      return { title: 'Popular', items: (directory.data?.popular ?? []).map((slug) => bySlug.get(slug)).filter((app): app is DirectoryApp => Boolean(app)) };
    }
    const category = directory.data?.categories.find((entry) => entry.id === view);
    return { title: category?.label ?? 'Apps', items: apps.filter((app) => app.category === view) };
  }, [searching, term, deferredSearch, view, apps, connectedApps, directory.data, bySlug]);

  const railItem = (id: View, label: string, count?: number) => (
    <button
      key={id}
      type="button"
      className="connections-rail-item"
      aria-current={!searching && view === id ? 'page' : undefined}
      onClick={() => { setSearch(''); setView(id); }}
    >
      <span>{label}</span>
      {count !== undefined && <small>{count}</small>}
    </button>
  );

  return (
    <section className="connections-stage" aria-labelledby="connections-title">
      <header className="connections-header">
        <div>
          <h2 id="connections-title">Connections</h2>
          <p>
            {directory.data ? `${apps.length} apps` : 'Apps Harvie can use'}
            {connected.size > 0 && ` · ${connected.size} connected`}
          </p>
        </div>
        <label className="connections-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search apps</span>
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') setSearch(''); }}
            placeholder="Search apps"
            autoComplete="off"
            spellCheck={false}
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => { setSearch(''); searchRef.current?.focus(); }}>
              <X size={14} />
            </button>
          )}
        </label>
        <button type="button" onClick={onClose} className="connections-back">
          <ArrowLeft size={14} aria-hidden="true" />
          Workspace
        </button>
      </header>

      <div className="connections-body">
        <nav className="connections-rail" aria-label="Connection categories">
          {railItem('popular', 'Popular')}
          {railItem('connected', 'Connected', connected.size)}
          {railItem('all', 'All apps', apps.length || undefined)}
          <span className="connections-rail-label">Categories</span>
          {(directory.data?.categories ?? []).map((category) => railItem(category.id, category.label, category.count))}
        </nav>

        <div className="connections-pane">
          <div className="connections-pane-head">
            <h3>{title}</h3>
            <span aria-live="polite">{directory.data ? `${items.length} ${items.length === 1 ? 'app' : 'apps'}` : ''}</span>
          </div>
          <div className="connections-scroll">
            {directory.isPending ? (
              <ul className="connections-grid" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => <li key={index} className="app-tile app-tile-skeleton animate-pulse" />)}
              </ul>
            ) : directory.isError ? (
              <div className="connections-empty">
                <p>Apps couldn’t load.</p>
                <button type="button" onClick={() => void directory.refetch()}>Try again</button>
              </div>
            ) : items.length === 0 ? (
              <div className="connections-empty">
                <p>{searching ? 'No apps match that search.' : view === 'connected' ? 'Nothing connected yet.' : 'No apps here.'}</p>
                {!searching && view === 'connected' && <button type="button" onClick={() => setView('popular')}>Browse popular apps</button>}
                {searching && <button type="button" onClick={() => setSearch('')}>Clear search</button>}
              </div>
            ) : (
              <ul className="connections-grid">
                {items.map((app) => (
                  <ConnectionTile key={app.slug} app={app} connected={connected.has(app.slug)} onConnected={markConnected} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
