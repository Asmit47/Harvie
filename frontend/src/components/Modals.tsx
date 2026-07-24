'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNexus } from '../context/NexusContext';
import { X, Brain, Settings, Layers, CheckCircle2, Sliders, Shield, Database } from 'lucide-react';
import { Integration, MemoryEntry } from '../types/nexus';

export const Modals: React.FC = () => {
  const { activeModal, setActiveModal } = useNexus();

  const dummyMemories: MemoryEntry[] = [
    {
      id: 'm1',
      category: 'Preferences',
      fact: 'User prefers concise technical summaries over verbose chat.',
      timestamp: 'Today, 11:20 AM',
    },
    {
      id: 'm2',
      category: 'Work context',
      fact: 'Project "Nexus" uses LangGraph for backend agent orchestration & Next.js for spatial frontend.',
      timestamp: 'Yesterday, 4:15 PM',
    },
    {
      id: 'm3',
      category: 'Schedule',
      fact: 'Prefers focus time blocks in the morning before 11:00 AM.',
      timestamp: '3 days ago',
    },
  ];

  const dummyIntegrations: Integration[] = [
    {
      id: 'i1',
      name: 'Google Calendar MCP',
      type: 'MCP',
      status: 'connected',
      icon: '📅',
      description: 'Fetches events & schedules time blocks automatically.',
    },
    {
      id: 'i2',
      name: 'Gmail MCP Tool',
      type: 'MCP',
      status: 'connected',
      icon: '✉️',
      description: 'Drafts emails & summarizes priority threads.',
    },
    {
      id: 'i3',
      name: 'Vector Store (ChromaDB)',
      type: 'Tool',
      status: 'connected',
      icon: '🧠',
      description: 'Long-term semantic memory storage for agent state.',
    },
    {
      id: 'i4',
      name: 'Slack Integration',
      type: 'API',
      status: 'idle',
      icon: '💬',
      description: 'Send notifications & auto-respond to mentions.',
    },
  ];

  if (!activeModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-[#111114] border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden p-6 text-[#F4F4F5]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[#818CF8]">
                {activeModal === 'memory' && <Brain className="w-5 h-5" />}
                {activeModal === 'integrations' && <Layers className="w-5 h-5" />}
                {activeModal === 'settings' && <Settings className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {activeModal === 'memory' && 'Agent Memory Log'}
                  {activeModal === 'integrations' && 'MCP & Integrations'}
                  {activeModal === 'settings' && 'Orbital Settings'}
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  {activeModal === 'memory' && 'Semantic facts stored in Nexus vector memory'}
                  {activeModal === 'integrations' && 'Connected Model Context Protocol tools'}
                  {activeModal === 'settings' && 'Spatial parameters & Framer motion physics'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="max-h-[60vh] overflow-y-auto no-scrollbar space-y-4 pr-1">
            {/* MEMORY LOG MODAL */}
            {activeModal === 'memory' && (
              <div className="space-y-3">
                {dummyMemories.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400">
                        {m.category}
                      </span>
                      <span className="text-[11px] text-[#71717A]">{m.timestamp}</span>
                    </div>
                    <p className="text-sm text-[#F4F4F5] leading-relaxed">{m.fact}</p>
                  </div>
                ))}
              </div>
            )}

            {/* INTEGRATIONS / MCP MODAL */}
            {activeModal === 'integrations' && (
              <div className="grid grid-cols-1 gap-3">
                {dummyIntegrations.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#F4F4F5]">{item.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-[#A1A1AA] mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        item.status === 'connected'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* SETTINGS MODAL */}
            {activeModal === 'settings' && (
              <div className="space-y-4 text-sm text-[#A1A1AA]">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Spring Stiffness</span>
                    <span className="font-mono text-xs text-indigo-400">100 (Default)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Spring Damping</span>
                    <span className="font-mono text-xs text-indigo-400">20 (Smooth)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Nucleus Idle Diameter</span>
                    <span className="font-mono text-xs text-indigo-400">120px</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Nucleus Active Scale</span>
                    <span className="font-mono text-xs text-indigo-400">65% (80px)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium text-sm">Theme Mode</h4>
                    <p className="text-xs text-[#71717A]">Deep Space (#09090B Rich Black)</p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    Active
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-end">
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
