'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowUp, Command, Mic, Paperclip, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface NexusCommandBarProps {
  sessionId: string | null;
  onSendComplete: (response: Awaited<ReturnType<typeof api.sendMessage>>) => Promise<void> | void;
  onSendError: (message: string) => void;
}

export function NexusCommandBar({ sessionId, onSendComplete, onSendError }: NexusCommandBarProps) {
  const [input, setInput] = useState('');
  const setAgentStatus = useWorkspaceStore((state) => state.setAgentStatus);

  const commandMutation = useMutation({
    mutationFn: (message: string) => {
      if (!sessionId) {
        throw new Error('No active session is available yet.');
      }
      return api.sendMessage(message, sessionId);
    },
    onMutate: () => {
      setAgentStatus('thinking');
      onSendError('');
    },
    onSuccess: async (response) => {
      await onSendComplete(response);
    },
    onError: (error) => {
      onSendError(error instanceof Error ? error.message : 'I could not reach the agent service.');
    },
    onSettled: () => setAgentStatus('idle'),
  });

  const submit = (message = input) => {
    const command = message.trim();
    if (!command || commandMutation.isPending || !sessionId) return;
    commandMutation.mutate(command);
    setInput('');
  };

  return (
    <section className="command-area" aria-label="Command bar">
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
          disabled={!sessionId || commandMutation.isPending}
        />
        <div className="command-tools">
          <button type="button" className="command-icon" aria-label="Attach file" title="File upload will be available soon">
            <Paperclip size={17} strokeWidth={1.75} />
          </button>
          <button type="button" className="command-icon" aria-label="Voice input" title="Voice input will be available soon">
            <Mic size={17} strokeWidth={1.75} />
          </button>
          <span className="command-key"><Command size={13} strokeWidth={1.75} /> K</span>
          <button type="submit" className="command-submit" aria-label="Send command" disabled={!input.trim() || commandMutation.isPending || !sessionId}>
            <ArrowUp size={17} strokeWidth={2} />
          </button>
        </div>
      </form>
    </section>
  );
}
