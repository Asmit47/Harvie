'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNexus } from '../context/NexusContext';
import { Brain, Settings, Layers, Sparkles, Orbit } from 'lucide-react';
import { ModalType } from '../types/nexus';

export const GhostSidebar: React.FC = () => {
  const { activeModal, setActiveModal } = useNexus();
  const [isHovered, setIsHovered] = useState(false);

  const navItems: { id: ModalType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'memory',
      label: 'Memory Log',
      icon: <Brain className="w-5 h-5" />,
    },
    {
      id: 'integrations',
      label: 'MCP & Tools',
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <motion.aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col items-center justify-between py-6 group pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ width: 4 }}
      animate={{ width: isHovered ? 56 : 4 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{
        background: isHovered ? 'rgba(17, 17, 20, 0.95)' : 'rgba(255, 255, 255, 0.08)',
        backdropFilter: isHovered ? 'blur(16px)' : 'none',
        borderRight: isHovered ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        boxShadow: isHovered ? '0 8px 32px rgba(0, 0, 0, 0.5)' : 'none',
      }}
    >
      {/* Top Logo / Brand Indicator */}
      <div className="flex flex-col items-center">
        {isHovered ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6"
          >
            <Orbit className="w-5 h-5 animate-spin-slow" />
          </motion.div>
        ) : (
          <div className="w-1 h-8 rounded-full bg-indigo-500/40 my-4" />
        )}
      </div>

      {/* Nav Icons */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {isHovered &&
          navItems.map((item) => {
            const isActive = activeModal === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setActiveModal(isActive ? null : item.id)}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#818CF8]/20 border border-[#818CF8]/40 text-[#818CF8] shadow-md shadow-indigo-500/20'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] border border-transparent'
                }`}
                title={item.label}
              >
                {item.icon}
                {isActive && (
                  <span className="absolute left-0 w-1 h-4 bg-[#818CF8] rounded-r-full" />
                )}
              </motion.button>
            );
          })}
      </div>

      {/* Bottom Status Dot */}
      <div className="flex flex-col items-center">
        {isHovered ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/[0.04] text-[10px] font-mono text-zinc-500"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>v1.0</span>
          </motion.div>
        ) : (
          <div className="w-1 h-3 rounded-full bg-zinc-700 mb-2" />
        )}
      </div>
    </motion.aside>
  );
};
