'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHarvie } from '../context/HarvieContext';

export const EphemeralReply: React.FC = () => {
  const { ephemeralMessage, isContextActive } = useHarvie();

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-500 text-center px-4 w-full max-w-lg ${
        isContextActive ? 'top-[28%]' : 'top-[62%]'
      }`}
    >
      <AnimatePresence>
        {ephemeralMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="inline-block px-5 py-2.5 rounded-2xl bg-[#111114]/90 backdrop-blur-xl border border-white/[0.08] shadow-lg text-sm text-[#71717A] leading-relaxed tracking-wide font-normal"
          >
            {ephemeralMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
