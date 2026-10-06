'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Brain, CircleDot, Settings2, SunMedium, Workflow } from 'lucide-react';
import { Nucleus, type OrbState } from '@/components/nucleus';

const RAIL = [
  { label: 'Today', icon: SunMedium },
  { label: 'Open loops', icon: CircleDot },
  { label: 'Memory', icon: Brain },
  { label: 'Connections', icon: Workflow },
  { label: 'Settings', icon: Settings2 },
];

const STATES: OrbState[] = ['idle', 'listening', 'thinking', 'acting'];

const STATUS: Record<OrbState, string> = {
  idle: 'Watching 3 open loops',
  listening: 'Listening',
  thinking: "Checking Harbor Creative's thread",
  acting: 'Drafting follow-up · waiting for your OK',
};

const LOOPS = [
  ['Harbor Creative', 'Invoice unpaid · Gmail'],
  ['Kickoff with Rhea', 'Tuesday · Calendar'],
  ['Waiting on Northline', 'Recheck Friday'],
];

export function MeetHarvie() {
  const reduce = useReducedMotion();
  const [state, setState] = useState<OrbState>('idle');
  const [held, setHeld] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0.15 });

  useEffect(() => {
    if (held || reduce) return;
    const id = window.setInterval(() => {
      setState((current) => STATES[(STATES.indexOf(current) + 1) % STATES.length]);
    }, 4000);
    return () => window.clearInterval(id);
  }, [held, reduce]);

  function choose(next: OrbState) {
    setHeld(true);
    setState(next);
  }

  return (
    <div>
      <figure className="relative">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E5B]/10 blur-3xl" aria-hidden="true" />
        <div className="overflow-hidden rounded-[14px] border border-[#24272E] bg-[#0A0B0D] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between border-b border-[#24272E] px-4 py-3">
            <span className="font-mono text-[11px] text-[#6C7079]">harvie / workspace</span>
            <span className="font-mono text-[11px] text-[#6C7079]">Sample workspace</span>
          </div>
          <div className="grid md:grid-cols-[168px_minmax(0,1fr)] xl:grid-cols-[168px_minmax(0,1fr)_280px]">
            <aside className="hidden flex-col gap-1 border-[#24272E] p-3 md:flex md:border-r" aria-hidden="true">
              {RAIL.map((item) => {
                const Icon = item.icon;
                const active = item.label === 'Today';
                return (
                  <span
                    key={item.label}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ${active ? 'bg-[#1E2128] text-[#EDEDEF]' : 'text-[#6C7079]'}`}
                  >
                    <Icon size={15} strokeWidth={1.7} />
                    {item.label}
                  </span>
                );
              })}
            </aside>
            <div
              className="relative flex min-h-[420px] flex-col items-center justify-center px-4 py-10"
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                pointerRef.current = {
                  x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
                  y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
                };
              }}
            >
              <p className="mb-2 text-center text-sm text-[#EDEDEF]">{STATUS[state]}</p>
              <div className="size-[280px] sm:size-[420px]">
                <Nucleus state={state} pointerRef={pointerRef} />
              </div>
              <div className="pointer-events-none absolute bottom-16 h-6 w-40 rounded-full bg-[#F59E5B]/25 blur-xl" aria-hidden="true" />
              <div className="mt-8 flex h-12 w-full max-w-md items-center rounded-full border border-[#24272E] bg-[#171A1F] px-4 text-sm text-[#6C7079]" aria-hidden="true">
                Tell Harvie what you need
              </div>
            </div>
            <aside className="border-t border-[#24272E] p-4 md:col-span-2 xl:col-span-1 xl:border-t-0 xl:border-l" aria-hidden="true">
              <p className="font-mono text-[11px] text-[#6C7079]">Open loops</p>
              <ul className="mt-3 space-y-2">
                {LOOPS.map(([title, detail]) => (
                  <li key={title} className="rounded-xl border border-[#24272E] bg-[#171A1F] px-3 py-2.5">
                    <p className="text-sm text-[#EDEDEF]">{title}</p>
                    <p className="mt-1 text-xs text-[#6C7079]">{detail}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-mono text-[11px] text-[#6C7079]">Memory</p>
              <div className="mt-3 rounded-xl border border-[#24272E] bg-[#171A1F] px-3 py-3">
                <p className="text-sm text-[#EDEDEF]">Harbor Creative</p>
                <p className="mt-1 text-xs leading-5 text-[#A1A4AB]">Rhea prefers email. Proposal accepted. Invoice still open.</p>
              </div>
            </aside>
          </div>
        </div>
        <figcaption className="sr-only">
          Sample workspace. Harvie&apos;s dashboard with the orb in the center. Current state: {STATUS[state]}.
        </figcaption>
      </figure>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Harvie orb state">
        {STATES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={state === item}
            onClick={() => choose(item)}
            className={`rounded-full border px-3 py-1.5 font-mono text-[12.5px] capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F59E5B] ${state === item ? 'border-[#F59E5B] bg-[rgba(245,158,91,0.12)] text-[#F59E5B]' : 'border-[#24272E] text-[#A1A4AB] hover:text-[#EDEDEF]'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-[12px] text-[#6C7079]">
        interactive<span className="hidden md:inline"> · move your cursor</span>
      </p>
    </div>
  );
}
