'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNexus } from '../context/NexusContext';
import { ArrowUpRight, Sparkles, Calendar, CheckSquare, Trash2, Cpu } from 'lucide-react';

export const CommandBar: React.FC = () => {
  const { processUserCommand, loadDemoState, clearZone, setEphemeralMessage, isContextActive } = useNexus();
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea logic up to 120px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    processUserCommand(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setEphemeralMessage(null); // Fades out ephemeral message on user typing as specified
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 flex flex-col items-center gap-3">
      {/* Quick Action Suggestion Chips for Easy Interactive Testing */}
      <motion.div
        className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar pb-1 px-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={loadDemoState}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-indigo-300 transition-all hover:scale-105 active:scale-95 shadow-sm whitespace-nowrap"
        >
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Demo Cards</span>
        </button>

        <button
          onClick={() => processUserCommand('schedule meeting')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          <Calendar className="w-3 h-3 text-cyan-400" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => processUserCommand('draft task')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          <CheckSquare className="w-3 h-3 text-emerald-400" />
          <span>Task</span>
        </button>

        <button
          onClick={() => processUserCommand('run mcp tool')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          <Cpu className="w-3 h-3 text-amber-400" />
          <span>MCP</span>
        </button>

        {isContextActive && (
          <button
            onClick={() => clearZone('all')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-mono text-rose-400 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Orbit</span>
          </button>
        )}
      </motion.div>

      {/* Main Glass Command Bar */}
      <motion.form
        onSubmit={handleSubmit}
        className={`relative w-full transition-all duration-300 ${
          isFocused ? 'ring-1 ring-[#818CF8]/40 shadow-[0_0_40px_rgba(129,140,248,0.15)]' : ''
        }`}
        animate={{
          borderRadius: input.length > 40 || input.includes('\n') ? '24px' : '9999px',
        }}
        style={{
          borderRadius: '9999px',
        }}
      >
        <div className="relative flex items-center bg-[#111114]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden rounded-[inherit] px-4 py-2.5">
          {/* Monospace Input Field */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Talk to Nexus... (e.g. 'Show tasks', 'Schedule sync')"
            className="w-full bg-transparent text-[#F4F4F5] placeholder-[#71717A] font-mono text-sm leading-relaxed resize-none outline-none pr-12 py-1 max-h-[120px] scrollbar-none"
          />

          {/* Send Accessory Button inside Pill */}
          <button
            type="submit"
            disabled={!input.trim()}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
              input.trim()
                ? 'bg-[#818CF8] text-black shadow-md shadow-indigo-500/30 scale-100 opacity-100 cursor-pointer hover:bg-indigo-300 active:scale-95'
                : 'text-zinc-600 bg-white/[0.04] opacity-50 cursor-not-allowed scale-90'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </motion.form>
    </div>
  );
};
