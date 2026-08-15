'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Nucleus } from './nucleus';
import { api } from '@/lib/api';

export type NucleusPhase = 'idle' | 'active';

interface NucleusShellProps {
  phase: NucleusPhase;
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
const GLOW_IDLE = 620;
const GLOW_ACTIVE = 520;

const EDGE_MARGIN = 24; // breathing room from the screen edge, measured against the GLOW radius so it never clips off-screen

const getInitialTarget = () => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
};

export function NucleusShell({ phase, onArrive }: NucleusShellProps) {
  const [target, setTarget] = useState(getInitialTarget);
  const [greeting, setGreeting] = useState('Hey boss.');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    api
      .getGreeting()
      .then((response) => setGreeting(response.greeting))
      .catch(() => {
        // Keep the default greeting if the API is unreachable.
      });
  }, []);

  useEffect(() => {
    const compute = () => {
      const glow = phase === 'idle' ? GLOW_IDLE : GLOW_ACTIVE;
      setTarget(
        phase === 'idle'
          ? { x: window.innerWidth / 2, y: window.innerHeight * 0.42 }
          : { x: window.innerWidth - EDGE_MARGIN - glow / 2, y: EDGE_MARGIN + glow / 2 }
      );
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [phase]);

  const hitSize = phase === 'idle' ? HIT_IDLE : HIT_ACTIVE;
  const glowSize = phase === 'idle' ? GLOW_IDLE : GLOW_ACTIVE;
  const bootVisible = phase === 'idle';

  return (
    <motion.div
      aria-label={phase === 'idle' ? 'Nexus startup' : 'Nexus is active'}
      style={{
        position: 'fixed',
        translateX: '-50%',
        translateY: '-50%',
        pointerEvents: 'none',
      }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ top: target.y, left: target.x, width: hitSize, height: hitSize, opacity: 1, scale: 1 }}
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
      {bootVisible && (
        <motion.p
          className="nucleus-boot-greeting"
          initial={reduceMotion ? false : { opacity: 0, y: 8, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -8, x: '-50%' }}
          transition={{ duration: 0.36, delay: reduceMotion ? 0 : 0.22 }}
        >
          {greeting}
        </motion.p>
      )}
    </motion.div>
  );
}
