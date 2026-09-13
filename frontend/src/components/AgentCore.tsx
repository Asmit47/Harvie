'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useHarvie } from '../context/HarvieContext';
import { Sparkles, Activity, Cpu } from 'lucide-react';

export const AgentCore: React.FC = () => {
  const { isContextActive, agentStatus, setAgentStatus } = useHarvie();

  // Color mappings based on status
  const getBaseColor = () => {
    switch (agentStatus) {
      case 'thinking':
        return 'from-cyan-500 via-sky-400 to-indigo-600';
      case 'executing':
        return 'from-emerald-500 via-teal-400 to-emerald-700';
      case 'idle':
      default:
        return 'from-[#4F46E5] via-[#6366F1] to-[#818CF8]';
    }
  };

  const getGlowColor = () => {
    switch (agentStatus) {
      case 'thinking':
        return 'rgba(6, 182, 212, 0.45)';
      case 'executing':
        return 'rgba(16, 185, 129, 0.5)';
      case 'idle':
      default:
        return 'rgba(79, 70, 229, 0.45)';
    }
  };

  return (
    <motion.div
      className="fixed left-1/2 z-30 transform -translate-x-1/2 flex flex-col items-center justify-center cursor-pointer select-none"
      initial={{ top: '50%', scale: 1, y: '-50%' }}
      animate={{
        top: isContextActive ? '15%' : '50%',
        scale: isContextActive ? 0.68 : 1,
        y: '-50%',
      }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        mass: 1,
      }}
      onClick={() => {
        // Toggle status on click for interactive testing
        if (agentStatus === 'idle') setAgentStatus('thinking');
        else if (agentStatus === 'thinking') setAgentStatus('executing');
        else setAgentStatus('idle');
      }}
    >
      {/* Container with relative sizing */}
      <div className="relative w-[120px] h-[120px] flex items-center justify-center">
        {/* State 2: THINKING - Spinning gradient ring wrapping around the core */}
        {agentStatus === 'thinking' && (
          <motion.div
            className="absolute -inset-4 rounded-full p-[2px] bg-conic-gradient from-cyan-400 via-indigo-500 to-cyan-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{
              background: 'conic-gradient(from 0deg, #06B6D4, #818CF8, #3B82F6, #06B6D4)',
              borderRadius: '9999px',
              filter: 'blur(1px)',
            }}
          />
        )}

        {/* State 3: EXECUTING - Expanding ripple waves */}
        {agentStatus === 'executing' && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-emerald-400/80"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-emerald-500/60"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2.3, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.4, repeat: Infinity, ease: 'easeOut' }}
            />
          </>
        )}

        {/* Ambient Soft Outer Glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl transition-all duration-700"
          style={{
            background: getGlowColor(),
            boxShadow: `0 0 60px ${getGlowColor()}, 0 0 100px ${getGlowColor()}`,
          }}
          animate={{
            scale: agentStatus === 'idle' ? [1, 1.15, 1] : [1, 1.05, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Core Sphere (The Nucleus) */}
        <motion.div
          className={`relative w-full h-full rounded-full bg-gradient-to-br ${getBaseColor()} shadow-2xl flex items-center justify-center overflow-hidden border border-white/20`}
          animate={{
            scale: agentStatus === 'idle' ? [1, 1.04, 1] : 1,
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Internal Shimmer / 3D Specular Highlight */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/40 via-transparent to-black/30 pointer-events-none" />

          {/* Internal Core Symbol / Pulse Indicator */}
          <div className="relative z-10 text-white/90 drop-shadow-md">
            {agentStatus === 'thinking' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-8 h-8 text-cyan-200" />
              </motion.div>
            ) : agentStatus === 'executing' ? (
              <motion.div
                animate={{ scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Cpu className="w-8 h-8 text-emerald-100" />
              </motion.div>
            ) : (
              <Activity className="w-8 h-8 text-indigo-100/90" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Nucleus Label / Status indicator */}
      <motion.div
        className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-medium tracking-wide uppercase text-zinc-400"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            agentStatus === 'thinking'
              ? 'bg-cyan-400 animate-ping'
              : agentStatus === 'executing'
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-indigo-400'
          }`}
        />
        <span>Harvie {agentStatus}</span>
      </motion.div>
    </motion.div>
  );
};
