'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Nucleus } from './nucleus';
import { api } from '@/lib/api';

export type NucleusPhase = 'idle' | 'active';

interface NucleusShellProps {
  phase: NucleusPhase;
  /** Fires once the orb has loaded in place. */
  onArrive?: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface DragSession {
  pointerId: number;
  offset: Position;
}

// Keep the interaction box compact. The visible canvas may extend beyond it,
// but it must not create a second circular focus surface.
const HIT_IDLE = 240;
const HIT_ACTIVE = 100;
const GLOW_IDLE = 620;
const GLOW_ACTIVE = 520;
const EDGE_MARGIN = 16;
const POSITION_STORAGE_KEY = 'harvie:orb-position';

function clampPosition(position: Position, size: number): Position {
  const clampAxis = (value: number, viewportSize: number) => {
    const inset = Math.min(EDGE_MARGIN + size / 2, viewportSize / 2);
    return Math.min(Math.max(value, inset), viewportSize - inset);
  };

  return {
    x: clampAxis(position.x, window.innerWidth),
    y: clampAxis(position.y, window.innerHeight),
  };
}

function defaultPosition(phase: NucleusPhase, size: number): Position {
  const topInset = window.innerWidth < 768 ? 76 : EDGE_MARGIN;
  return clampPosition(
    phase === 'idle'
      ? { x: window.innerWidth / 2, y: window.innerHeight * 0.42 }
      : { x: window.innerWidth - EDGE_MARGIN - size / 2, y: topInset + size / 2 },
    size,
  );
}

function readPosition(): Position | null {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(POSITION_STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object' || !('x' in saved) || !('y' in saved)) return null;
    if (typeof saved.x !== 'number' || typeof saved.y !== 'number' || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return null;
    return { x: saved.x, y: saved.y };
  } catch {
    return null;
  }
}

function savePosition(position: Position) {
  try {
    window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Dragging still works when browser storage is unavailable.
  }
}

export function NucleusShell({ phase, onArrive }: NucleusShellProps) {
  const [target, setTarget] = useState<Position | null>(null);
  const [greeting, setGreeting] = useState('Hey boss.');
  const [isDragging, setIsDragging] = useState(false);
  const targetRef = useRef<Position | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const reduceMotion = useReducedMotion();
  const hitSize = phase === 'idle' ? HIT_IDLE : HIT_ACTIVE;
  const glowSize = phase === 'idle' ? GLOW_IDLE : GLOW_ACTIVE;
  // Clamp based on the interactive hit area, not the decorative glow —
  // the aura can safely bleed off-screen.
  const boundsSize = hitSize;

  useEffect(() => {
    if (phase !== 'idle') return;
    api
      .getGreeting()
      .then((response) => setGreeting(response.greeting))
      .catch(() => {
        // Keep the default greeting if the API is unreachable.
      });
  }, [phase]);

  // Resolve persisted coordinates before paint. Position is a direct style,
  // not an animated target, so neither hydration nor dragging causes travel.
  useLayoutEffect(() => {
    const saved = phase === 'active' ? readPosition() : null;
    const initial = saved ? clampPosition(saved, boundsSize) : defaultPosition(phase, boundsSize);
    targetRef.current = initial;
    setTarget(initial);

    const compute = () => {
      const next = phase === 'active' && targetRef.current
        ? clampPosition(targetRef.current, boundsSize)
        : defaultPosition(phase, boundsSize);
      targetRef.current = next;
      setTarget(next);
    };
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [phase, boundsSize]);

  function moveTo(position: Position) {
    const next = clampPosition(position, boundsSize);
    targetRef.current = next;
    setTarget(next);
    return next;
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (phase !== 'active' || !event.isPrimary || event.button !== 0 || !targetRef.current || dragRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      offset: { x: event.clientX - targetRef.current.x, y: event.clientY - targetRef.current.y },
    };
    setIsDragging(true);
  }

  function drag(event: PointerEvent<HTMLButtonElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    moveTo({ x: event.clientX - session.offset.x, y: event.clientY - session.offset.y });
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (targetRef.current) savePosition(targetRef.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (phase !== 'active' || !targetRef.current) return;
    const step = event.shiftKey ? 32 : 8;
    const directions: Record<string, Position> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const direction = directions[event.key];
    if (!direction && event.key !== 'Home') return;
    event.preventDefault();
    const next = moveTo(event.key === 'Home'
      ? defaultPosition(phase, boundsSize)
      : { x: targetRef.current.x + direction.x, y: targetRef.current.y + direction.y });
    savePosition(next);
  }

  return (
    <motion.button
      type="button"
      className="nucleus-shell"
      data-phase={phase}
      data-dragging={isDragging}
      aria-label={phase === 'idle' ? 'Harvie startup' : 'Move Harvie orb'}
      aria-describedby={phase === 'active' ? 'nucleus-drag-help' : undefined}
      tabIndex={phase === 'active' ? 0 : -1}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={moveWithKeyboard}
      style={{
        position: 'fixed',
        left: target?.x ?? (phase === 'idle' ? '50vw' : `calc(100vw - ${EDGE_MARGIN + boundsSize / 2}px)`),
        top: target?.y ?? (phase === 'idle' ? '42vh' : `calc(var(--nucleus-top-inset) + ${boundsSize / 2}px)`),
        width: hitSize,
        height: hitSize,
        translateX: '-50%',
        translateY: '-50%',
        pointerEvents: phase === 'active' ? 'auto' : 'none',
      }}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      onAnimationComplete={() => {
        if (phase === 'active') onArrive?.();
      }}
    >
      {/* The canvas stays centered on the drag target and never intercepts
          pointer events. */}
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          width: glowSize,
          height: glowSize,
        }}
      >
        <Nucleus />
      </span>
      {phase === 'active' && (
        <span id="nucleus-drag-help" className="sr-only">
          Drag to move Harvie. Use the arrow keys to move, Shift for larger steps, or Home to reset the position.
        </span>
      )}
      {phase === 'idle' && (
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
    </motion.button>
  );
}
