'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, FileText, FolderOpen, Hash, ListTodo, Mail, Receipt, type LucideIcon } from 'lucide-react';
import { api, type ConnectionCardData, type Toolkit, type WorkspaceResponse } from '@/lib/api';

interface ConnectionCardProps {
  connection: ConnectionCardData;
  userId: string;
  sessionId?: string;
  confirmationRecorded?: boolean;
  onComplete?: (workspace: WorkspaceResponse) => void;
}

const CONNECTOR_ICONS: Record<Toolkit, LucideIcon> = {
  gmail: Mail,
  googlecalendar: CalendarDays,
  googledocs: FileText,
  googledrive: FolderOpen,
  googletasks: ListTodo,
  slack: Hash,
  stripe: Receipt,
};

function ConnectorIcon({ toolkit }: { toolkit: Toolkit }) {
  const Icon = CONNECTOR_ICONS[toolkit] ?? Mail;
  return (
    <span className="connection-card-icon" aria-hidden="true">
      <Icon size={18} strokeWidth={1.75} />
    </span>
  );
}

export function ConnectionCard({ connection, userId, sessionId, confirmationRecorded = false, onComplete }: ConnectionCardProps) {
  const queryClient = useQueryClient();
  const [opening, setOpening] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmationAttempted = useRef(false);
  const statusKey = ['integration-status', userId, connection.toolkit];
  const statusQuery = useQuery({
    queryKey: statusKey,
    queryFn: () => api.getIntegrationStatus(connection.toolkit),
    staleTime: 10000,
    retry: 1,
    refetchInterval: waiting ? 2500 : false,
  });
  const confirmMutation = useMutation({
    mutationFn: () => api.completeConnection(sessionId!, connection.toolkit),
    onSuccess: (workspace) => {
      setError(null);
      onComplete?.(workspace);
    },
    onError: (confirmError) => {
      setError(confirmError instanceof Error ? confirmError.message : 'Could not save the connection confirmation.');
    },
  });
  const confirm = confirmMutation.mutate;
  const connected = statusQuery.data?.connected === true;

  useEffect(() => {
    if (!connected) return;
    setWaiting(false);
    setAuthorizationUrl(null);
    setNotice(null);
    if (sessionId && !confirmationRecorded && !confirmationAttempted.current) {
      confirmationAttempted.current = true;
      confirm();
    }
  }, [connected, sessionId, confirmationRecorded, confirm]);

  useEffect(() => {
    if (!waiting) return;
    const timeout = window.setTimeout(() => {
      setWaiting(false);
      setNotice('Still waiting for approval. Finish in the provider tab, then check the connection.');
    }, 120000);
    return () => window.clearTimeout(timeout);
  }, [waiting]);

  async function connect(restart = false) {
    if (connected && error && sessionId) {
      setError(null);
      confirm();
      return;
    }
    if (authorizationUrl && !restart) {
      setError(null);
      setWaiting(true);
      await statusQuery.refetch();
      return;
    }
    setOpening(true);
    setWaiting(false);
    setAuthorizationUrl(null);
    setError(null);
    setNotice(null);
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try {
      const flow = await api.connectIntegration(connection.toolkit);
      if (flow.connected) {
        popup?.close();
        queryClient.setQueryData(statusKey, { toolkit: connection.toolkit, connected: true });
      } else if (flow.authorization_url) {
        setAuthorizationUrl(flow.authorization_url);
        if (popup) {
          popup.location.href = flow.authorization_url;
          setWaiting(true);
          setNotice('Finish approving access in the provider tab.');
        } else {
          setNotice('Open the authorization link below to finish connecting.');
        }
      } else {
        popup?.close();
        setError('No authorization link was returned. Try again.');
      }
    } catch (connectError) {
      popup?.close();
      setError(connectError instanceof Error ? connectError.message : 'Could not start this connection.');
    } finally {
      setOpening(false);
    }
  }

  const busy = opening || confirmMutation.isPending;
  const isConnected = connected && !error;
  return (
    <section className="connection-card" aria-label={`${connection.label} connection`}>
      <div className="connection-card-main">
        <div className="connection-card-heading">
          <ConnectorIcon toolkit={connection.toolkit} />
          <div>
            <strong>{connection.label}</strong>
            <span>{connection.description}</span>
          </div>
        </div>
        <button
          type="button"
          className="connection-card-action"
          data-connected={isConnected ? 'true' : 'false'}
          onClick={() => void connect()}
          disabled={busy || isConnected}
        >
          {isConnected ? <><Check size={15} />Connected</> : busy ? 'Connecting…' : error && connected ? 'Retry confirmation' : authorizationUrl ? 'Check connection' : 'Connect'}
        </button>
      </div>
      {authorizationUrl && !connected && (
        <div className="flex flex-wrap gap-x-4">
          <a href={authorizationUrl} target="_blank" rel="noopener noreferrer" className="connection-card-link" onClick={() => setWaiting(true)}>Open authorization</a>
          {!waiting && <button type="button" className="connection-card-link" disabled={busy} onClick={() => void connect(true)}>Start a new connection</button>}
        </div>
      )}
      {notice && <p className="connection-card-notice" role="status">{notice}</p>}
      {error && <p className="connection-card-error" role="alert">{error}</p>}
    </section>
  );
}
