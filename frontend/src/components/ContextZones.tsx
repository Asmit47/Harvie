'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNexus } from '../context/NexusContext';
import { FloatingCard } from './FloatingCard';
import { Clock, Zap, Trash2 } from 'lucide-react';

export const ContextZones: React.FC = () => {
  const { leftZoneItems, rightZoneItems, clearZone } = useNexus();

  return (
    <>
      {/* DESKTOP LEFT ZONE - Time & Context (Calendar, Reminders) */}
      <div className="hidden md:flex fixed left-10 top-1/2 -translate-y-1/2 z-20 w-80 max-h-[70vh] flex-col gap-3 overflow-y-auto no-scrollbar pointer-events-auto">
        {leftZoneItems.length > 0 && (
          <div className="flex items-center justify-between px-1 mb-1 text-[11px] font-mono tracking-wider uppercase text-zinc-500">
            <span className="flex items-center gap-1.5 text-cyan-400/90 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Time & Context ({leftZoneItems.length})</span>
            </span>
            <button
              onClick={() => clearZone('left')}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Clear Left Zone"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {leftZoneItems.map((item) => (
            <FloatingCard key={item.id} card={item} />
          ))}
        </AnimatePresence>
      </div>

      {/* DESKTOP RIGHT ZONE - Actions & Tasks (Tasks, Emails, MCP) */}
      <div className="hidden md:flex fixed right-10 top-1/2 -translate-y-1/2 z-20 w-80 max-h-[70vh] flex-col gap-3 overflow-y-auto no-scrollbar pointer-events-auto">
        {rightZoneItems.length > 0 && (
          <div className="flex items-center justify-between px-1 mb-1 text-[11px] font-mono tracking-wider uppercase text-zinc-500">
            <span className="flex items-center gap-1.5 text-indigo-400/90 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>Actions & Tasks ({rightZoneItems.length})</span>
            </span>
            <button
              onClick={() => clearZone('right')}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Clear Right Zone"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {rightZoneItems.map((item) => (
            <FloatingCard key={item.id} card={item} />
          ))}
        </AnimatePresence>
      </div>

      {/* MOBILE ADAPTATION - Stacked Carousel/Sheet below Nucleus */}
      <div className="flex md:hidden fixed left-4 right-4 top-[32%] bottom-28 z-20 flex-col gap-3 overflow-y-auto no-scrollbar pointer-events-auto px-1">
        <AnimatePresence mode="popLayout">
          {leftZoneItems.map((item) => (
            <FloatingCard key={item.id} card={item} />
          ))}
          {rightZoneItems.map((item) => (
            <FloatingCard key={item.id} card={item} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};
