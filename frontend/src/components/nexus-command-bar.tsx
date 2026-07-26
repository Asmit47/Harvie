'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowUp, Command, Mic, Paperclip, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { cardPositions } from '@/lib/workspace-data';
import { useWorkspaceStore, type CardKind, type WorkspaceCard } from '@/stores/workspace-store';

const typeMap: Record<string, CardKind> = {
  task: 'tasks',
  email: 'email',
  calendar: 'calendar',
  reminder: 'reminder',
  mcp: 'suggestion',
};

function messageId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function NexusCommandBar() {
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>();
  const addCards = useWorkspaceStore((state) => state.addCards);
  const addMessage = useWorkspaceStore((state) => state.addMessage);
  const setAgentStatus = useWorkspaceStore((state) => state.setAgentStatus);

  useEffect(() => {
    const saved = window.localStorage.getItem('nexus-session-id');
    if (saved) {
      setSessionId(saved);
      return;
    }
    const nextSession = messageId();
    window.localStorage.setItem('nexus-session-id', nextSession);
    setSessionId(nextSession);
  }, []);

  const commandMutation = useMutation({
    mutationFn: (message: string) => api.sendMessage(message, sessionId),
    onMutate: (message) => {
      setAgentStatus('thinking');
      addMessage({ id: messageId(), role: 'user', content: message });
    },
    onSuccess: (response) => {
      if (response.session_id) {
        window.localStorage.setItem('nexus-session-id', response.session_id);
        setSessionId(response.session_id);
      }
      addMessage({ id: messageId(), role: 'assistant', content: response.answer });
      const responseCards: WorkspaceCard[] = response.cards.slice(0, 2).map((card, index) => ({
        id: card.id || `agent-card-${Date.now()}-${index}`,
        kind: typeMap[card.type] ?? 'suggestion',
        label: card.badge || 'Nexus update',
        title: card.title,
        description: card.context,
        action: card.actionLabel || 'Review',
        priority: card.priority || 'medium',
        position: cardPositions[(index + 4) % cardPositions.length],
      }));
      addCards(responseCards);
    },
    onError: () => {
      addMessage({
        id: messageId(),
        role: 'assistant',
        content: 'I could not reach the agent service. Your workspace is still available while it reconnects.',
      });
    },
    onSettled: () => setAgentStatus('idle'),
  });

  const submit = (message = input) => {
    const command = message.trim();
    if (!command || commandMutation.isPending) return;
    commandMutation.mutate(command);
    setInput('');
  };

  return (
    <section className="command-area" aria-label="Command bar">
      <div className="command-suggestions" aria-label="Suggested commands">
        <button type="button" onClick={() => submit('Show today\'s priorities')}>Today&apos;s priorities</button>
        <button type="button" onClick={() => submit('What needs a reply?')}>What needs a reply?</button>
        <button type="button" onClick={() => submit('Help me plan this afternoon')}>Plan my afternoon</button>
      </div>
      <form
        className="command-bar"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />
        <label className="sr-only" htmlFor="nexus-command">Talk to Nexus</label>
        <input
          id="nexus-command"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => setAgentStatus('listening')}
          onBlur={() => !commandMutation.isPending && setAgentStatus('idle')}
          placeholder="Ask Nexus anything, or type / for commands"
          autoComplete="off"
        />
        <div className="command-tools">
          <button type="button" className="command-icon" aria-label="Attach file" title="File upload will be available soon">
            <Paperclip size={17} strokeWidth={1.75} />
          </button>
          <button type="button" className="command-icon" aria-label="Voice input" title="Voice input will be available soon">
            <Mic size={17} strokeWidth={1.75} />
          </button>
          <span className="command-key"><Command size={13} strokeWidth={1.75} /> K</span>
          <button type="submit" className="command-submit" aria-label="Send command" disabled={!input.trim() || commandMutation.isPending}>
            <ArrowUp size={17} strokeWidth={2} />
          </button>
        </div>
      </form>
    </section>
  );
}
