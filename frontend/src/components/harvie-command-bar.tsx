'use client';

import { useState } from 'react';
import { ArrowUp, Mic, Plus } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface HarvieCommandBarProps {
  sending: boolean;
  onSend: (message: string) => void;
  boot?: boolean;
}

export function HarvieCommandBar({ sending, onSend, boot = false }: HarvieCommandBarProps) {
  const [input, setInput] = useState('');
  const setAgentStatus = useWorkspaceStore((state) => state.setAgentStatus);

  const submit = (message = input) => {
    const command = message.trim();
    if (!command || sending) return;
    onSend(command);
    setInput('');
  };

  return (
    <section className={boot ? 'command-area command-area-boot' : 'command-area'} aria-label="Command bar">
      <form
        className="command-bar"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <button type="button" className="command-icon" aria-label="Attach file" title="File upload will be available soon">
          <Plus size={18} strokeWidth={2} />
        </button>
        <label className="sr-only" htmlFor="harvie-command">Talk to Harvie</label>
        <input
          id="harvie-command"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => setAgentStatus('listening')}
          onBlur={() => !sending && setAgentStatus('idle')}
          placeholder="What needs to get done?"
          autoComplete="off"
          disabled={sending}
          autoFocus={boot}
        />
        <div className="command-tools">
          <button type="button" className="command-icon" aria-label="Voice input" title="Voice input will be available soon">
            <Mic size={17} strokeWidth={1.75} />
          </button>
          <button type="submit" className="command-submit" aria-label="Send command" disabled={!input.trim() || sending}>
            <ArrowUp size={17} strokeWidth={2} />
          </button>
        </div>
      </form>
    </section>
  );
}