'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

const STEPS = ['Observe', 'Understand', 'Remember', 'Check state', 'Decide', 'Act', 'Wait', 'Recheck'];

export function FollowLoop() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce !== false || !rootRef.current) return;
    const root = rootRef.current;
    let alive = true;
    let revert = () => {};

    void (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (!alive) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const steps = gsap.utils.toArray<HTMLElement>('.loop-step', root);
        const timeline = gsap.timeline({
          repeat: -1,
          paused: true,
          scrollTrigger: {
            trigger: root,
            start: 'top 80%',
            end: 'bottom 20%',
            onToggle: (self) => {
              if (self.isActive) timeline.play();
              else timeline.pause();
            },
          },
        });
        steps.forEach((step, index) => {
          const hot = step.querySelectorAll('.loop-hot');
          timeline.to(hot, { opacity: 1, duration: 0.28, ease: 'power1.out' }, index * 1.4);
          timeline.to(hot, { opacity: 0, duration: 0.25, ease: 'power1.in' }, index * 1.4 + 1.08);
        });
      }, root);
      revert = () => ctx.revert();
    })();

    return () => {
      alive = false;
      revert();
    };
  }, [reduce]);

  return (
    <div ref={rootRef}>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="loop-step relative min-h-[76px] overflow-hidden rounded-xl border border-[#24272E] bg-[#111317] px-3 py-3"
            data-static={reduce && step === 'Act' ? 'true' : undefined}
          >
            <span className="loop-hot absolute inset-0 bg-[rgba(245,158,91,0.12)] opacity-0" />
            <span className="relative block font-mono text-[11px] text-[#6C7079]">0{index + 1}</span>
            <span className="relative mt-1 block text-[13px] text-[#A1A4AB]">
              {step}
              <span className="loop-hot absolute inset-0 text-[#F59E5B] opacity-0" aria-hidden="true">{step}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-mono text-[12.5px] text-[#6C7079]">
        open loops live in postgres, separate from the chat, and come back when they are due
      </p>
    </div>
  );
}
