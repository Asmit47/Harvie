'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Nucleus } from './nucleus';

export type NucleusPhase = 'idle' | 'active';

interface NucleusShellProps {
  phase: NucleusPhase;
  onActivate: () => void;
  /** Fires once the shrink-and-move-to-corner animation has finished. */
  onArrive?: () => void;
}

// HIT size = the actual button footprint: this is what can block clicks.
// Keep this small once docked -- it's the only thing that costs you space.
const HIT_IDLE = 240;
const HIT_ACTIVE = 40;

// GLOW size = how big the orb actually LOOKS. Independent of HIT, and
// pointer-events:none, so make this as big as looks good -- it costs
// nothing layout/click-wise. Tune this to taste.
const GLOW_IDLE = 820;
const GLOW_ACTIVE = 520;

const EDGE_MARGIN = 24; // breathing room from the screen edge, measured against the GLOW radius so it never clips off-screen

export function NucleusShell({ phase, onActivate, onArrive }: NucleusShellProps) {
  const [target, setTarget] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const compute = () => {
      const glow = phase === 'idle' ? GLOW_IDLE : GLOW_ACTIVE;
      setTarget(
        phase === 'idle'
          ? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
          : { x: window.innerWidth - EDGE_MARGIN - glow / 2, y: EDGE_MARGIN + glow / 2 }
      );
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [phase]);

  const hitSize = phase === 'idle' ? HIT_IDLE : HIT_ACTIVE;
  const glowSize = phase === 'idle' ? GLOW_IDLE : GLOW_ACTIVE;

  return (
    <motion.button
      type="button"
      onClick={phase === 'idle' ? onActivate : undefined}
      disabled={phase !== 'idle'}
      aria-label={phase === 'idle' ? 'Activate Nexus' : 'Nexus is active'}
      style={{
        position: 'fixed',
        translateX: '-50%',
        translateY: '-50%',
        cursor: phase === 'idle' ? 'pointer' : 'default',
        // Only this box can ever block clicks/space. Small always once docked.
        pointerEvents: phase === 'idle' ? 'auto' : 'none',
      }}
      initial={false}
      animate={{ top: target.y, left: target.x, width: hitSize, height: hitSize }}
      transition={{ type: 'spring', stiffness: 140, damping: 20, mass: 0.9 }}
      onAnimationComplete={() => {
        if (phase === 'active') onArrive?.();
      }}
    >
      {/* Glow layer: centered on the hit box, can be much bigger, never
          intercepts pointer events. This is the actual visible orb. */}
      <motion.div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          translateX: '-50%',
          translateY: '-50%',
          pointerEvents: 'none',
        }}
        animate={{ width: glowSize, height: glowSize }}
        transition={{ type: 'spring', stiffness: 140, damping: 20, mass: 0.9 }}
      >
        <Nucleus />
      </motion.div>
    </motion.button>
  );
}