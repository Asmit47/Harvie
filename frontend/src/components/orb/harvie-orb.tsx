'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { OrbState } from './orb-scene';

type Pointer = { x: number; y: number };

export type { OrbState };

const OrbScene = dynamic(() => import('./orb-scene').then((mod) => mod.OrbScene), { ssr: false });

export function HarvieOrb({
  state,
  interactive = false,
  className,
}: {
  state?: OrbState;
  interactive?: boolean;
  className?: string;
}) {
  const storeStatus = useWorkspaceStore((current) => current.agentStatus);
  const resolved = state ?? storeStatus;
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<Pointer>({ x: 0.12, y: 0.18 });
  const [near, setNear] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 767px)').matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    setWebgl(!narrow && cores > 4 && !reduce);
  }, [reduce]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !webgl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: '600px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [webgl]);

  function trackPointer(event: PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    };
  }

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      aria-hidden="true"
      onPointerMove={trackPointer}
      data-state={resolved}
    >
      <div className="orb-halo" aria-hidden="true" />
      <div className={cn('orb-poster', ready && webgl && near && 'orb-poster-hidden')} data-state={resolved} aria-hidden="true" />
      {webgl && near && (
        <div className="absolute inset-0">
          <OrbScene state={resolved} interactive={interactive} pointer={pointer} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
