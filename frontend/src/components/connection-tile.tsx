'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { api, type DirectoryApp } from '@/lib/api';

interface ConnectionTileProps {
  app: Pick<DirectoryApp, 'slug' | 'name' | 'description'>;
  connected: boolean;
  onConnected: (slug: string) => void;
}

const WAIT_LIMIT_MS = 120000;

/** One compact app: name, one sentence, and a single add control. */
export function ConnectionTile({ app, connected, onConnected }: ConnectionTileProps) {
  const [opening, setOpening] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only the tile being approved polls; the rest of the page uses one shared query.
  const status = useQuery({
    queryKey: ['integration-status', app.slug],
    queryFn: () => api.getIntegrationStatus(app.slug),
    enabled: waiting && !connected,
    refetchInterval: 2500,
    retry: 1,
  });

  useEffect(() => {
    if (!status.data?.connected) return;
    setWaiting(false);
    setAuthorizationUrl(null);
    setNotice(null);
    onConnected(app.slug);
  }, [status.data, app.slug, onConnected]);

  useEffect(() => {
    if (!waiting) return;
    const timeout = window.setTimeout(() => {
      setWaiting(false);
      setNotice('Still waiting. Finish in the other tab, then try again.');
    }, WAIT_LIMIT_MS);
    return () => window.clearTimeout(timeout);
  }, [waiting]);

  async function connect() {
    setOpening(true);
    setError(null);
    setNotice(null);
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try {
      const flow = await api.connectIntegration(app.slug);
      if (flow.connected) {
        popup?.close();
        onConnected(app.slug);
      } else if (flow.authorization_url) {
        setAuthorizationUrl(flow.authorization_url);
        if (popup) popup.location.href = flow.authorization_url;
        else setNotice('Open the link to finish connecting.');
        setWaiting(true);
      } else {
        popup?.close();
        setError('No authorization link came back. Try again.');
      }
    } catch (connectError) {
      popup?.close();
      setError(connectError instanceof Error ? connectError.message : 'Could not start this connection.');
    } finally {
      setOpening(false);
    }
  }

  const busy = opening || waiting;
  const label = connected ? `${app.name} is connected` : busy ? `Connecting ${app.name}` : `Connect ${app.name}`;

  return (
    <li className="app-tile" data-connected={connected ? 'true' : 'false'}>
      <div className="app-tile-text">
        <strong>{app.name}</strong>
        <p>{app.description}</p>
      </div>
      <button
        type="button"
        className="app-tile-add"
        aria-label={label}
        title={label}
        disabled={connected || busy}
        onClick={() => void connect()}
      >
        {connected ? <Check size={14} strokeWidth={2.25} /> : busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} strokeWidth={2} />}
      </button>
      {(notice || error || (waiting && authorizationUrl)) && (
        <p className="app-tile-note" data-tone={error ? 'error' : 'info'} role={error ? 'alert' : 'status'}>
          {error ?? notice ?? 'Finish approving in the other tab.'}
          {authorizationUrl && !connected && (
            <> <a href={authorizationUrl} target="_blank" rel="noopener noreferrer">Open link</a></>
          )}
        </p>
      )}
    </li>
  );
}
