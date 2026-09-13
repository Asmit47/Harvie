'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FloatingCardItem } from '../types/harvie';
import { Calendar, Clock, CheckSquare, Mail, Cpu, X, ArrowUpRight } from 'lucide-react';
import { useHarvie } from '../context/HarvieContext';

interface FloatingCardProps {
  card: FloatingCardItem;
}

export const FloatingCard: React.FC<FloatingCardProps> = ({ card }) => {
  const { removeCard } = useHarvie();

  const getCardIcon = () => {
    switch (card.type) {
      case 'calendar':
        return <Calendar className="w-4 h-4 text-cyan-400" />;
      case 'reminder':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-indigo-400" />;
      case 'mcp':
        return <Cpu className="w-4 h-4 text-[#818CF8]" />;
      default:
        return <Calendar className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getPriorityBorder = () => {
    if (card.priority === 'high') return 'hover:border-indigo-400/40';
    return 'hover:border-white/20';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1], // Custom slow out, fast in spring-like curve
      }}
      className={`group relative w-full bg-[#111114]/60 backdrop-blur-2xl border border-white/[0.08] ${getPriorityBorder()} shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden`}
    >
      {/* Subtle Specular Ambient Shimmer */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Header: Icon + Badge/Time + Dismiss Button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            {getCardIcon()}
          </div>
          {card.badge && (
            <span className="text-[11px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[#A1A1AA]">
              {card.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {card.time && (
            <span className="text-xs text-[#A1A1AA] font-mono">{card.time}</span>
          )}

          <button
            onClick={() => removeCard(card.id)}
            className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Dismiss card"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-[#F4F4F5] tracking-tight mb-1 group-hover:text-white transition-colors">
        {card.title}
      </h3>

      {/* Context Description */}
      <p className="text-xs text-[#A1A1AA] leading-relaxed mb-3 line-clamp-2">
        {card.context}
      </p>

      {/* Card Action Link / Tag */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-[#71717A]">
        <span>{card.timestamp}</span>
        <button
          onClick={() => removeCard(card.id)}
          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          <span>Complete</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};
