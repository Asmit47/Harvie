'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface HarvieCommandBarProps {
  sending: boolean;
  onSend: (message: string) => void;
  boot?: boolean;
  placeholder?: string;
}

export function HarvieCommandBar({ sending, onSend, boot = false, placeholder = 'What are we working on?' }: HarvieCommandBarProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const setAgentStatus = useWorkspaceStore((state) => state.setAgentStatus);

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden';
  }, [input]);

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
        <label className="sr-only" htmlFor="harvie-command">Talk to Harvie</label>
        <textarea
          ref={inputRef}
          id="harvie-command"
          rows={1}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          onFocus={() => setAgentStatus('listening')}
          onBlur={() => !sending && setAgentStatus('idle')}
          placeholder={placeholder}
          maxLength={20000}
          autoComplete="off"
          disabled={sending}
          autoFocus={boot}
        />
        <div className="command-tools">
          <button type="submit" className="command-submit" aria-label="Send command" disabled={!input.trim() || sending}>
            <ArrowUp size={19} strokeWidth={2} />
          </button>
        </div>
      </form>
    </section>
  );
}
