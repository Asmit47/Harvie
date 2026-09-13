'use client';

import Link from 'next/link';
import { Show, SignInButton, SignUpButton } from '@clerk/nextjs';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  FileText,
  Mail,
  ReceiptIndianRupee,
  Send,
  Sparkles,
  TimerReset,
  ListTodo,
} from 'lucide-react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { FormEvent, useState } from 'react';

const workflow = ['Observe', 'Understand', 'Remember', 'Check state', 'Decide', 'Act', 'Wait', 'Recheck'];

function HarvieOrb() {
  const [active, setActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 110, damping: 22 });
  const y = useSpring(pointerY, { stiffness: 110, damping: 22 });

  function followPointer(event: React.PointerEvent<HTMLButtonElement>) {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 16);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 16);
  }

  function resetPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="relative mx-auto flex w-full max-w-[35rem] flex-col items-center">
      <motion.button
        type="button"
        aria-pressed={active}
        aria-label={active ? 'Harvie is ready for your request' : 'Activate Harvie'}
        className={`alcor-orb ${active ? 'alcor-orb-active' : ''}`}
        style={reduceMotion ? undefined : { x, y }}
        onPointerMove={followPointer}
        onPointerLeave={resetPointer}
        onClick={() => {
          setActive(true);
          setSubmitted(false);
        }}
        animate={reduceMotion ? undefined : { scale: active ? 1.03 : [1, 1.018, 1] }}
        transition={active ? { type: 'spring', stiffness: 180, damping: 18 } : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="alcor-orb-core" />
        <span className="alcor-orb-ring alcor-orb-ring-one" />
        <span className="alcor-orb-ring alcor-orb-ring-two" />
        <span className="relative z-10 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-lime-100/90">
          {active ? 'Listening' : 'Harvie'}
        </span>
      </motion.button>

      <motion.div
        initial={false}
        animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }}
        className={`mt-8 w-full max-w-md ${active ? '' : 'pointer-events-none'}`}
      >
        <form onSubmit={submitPrompt} className="alcor-command-shell">
          <label htmlFor="harvie-landing-prompt" className="sr-only">Tell Harvie what you need</label>
          <input id="harvie-landing-prompt" name="prompt" placeholder="Tell Harvie what you need..." />
          <button type="submit" aria-label="Continue with Harvie"><ArrowUpRight size={18} strokeWidth={1.75} /></button>
        </form>
        {submitted && <p className="mt-3 text-center text-sm text-zinc-400">Continue in Harvie to turn that into action.</p>}
      </motion.div>
    </div>
  );
}

function LandingActions() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Show when="signed-out">
        <SignUpButton forceRedirectUrl="/app">
          <button className="alcor-button alcor-button-primary">Get started <ArrowUpRight size={16} strokeWidth={1.75} /></button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link href="/app" className="alcor-button alcor-button-primary">Open Harvie <ArrowUpRight size={16} strokeWidth={1.75} /></Link>
      </Show>
      <a href="#how-it-works" className="alcor-button alcor-button-quiet">See how it works <ArrowRight size={16} strokeWidth={1.75} /></a>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="alcor-landing">
      <nav className="alcor-nav" aria-label="Primary navigation">
        <Link href="/" className="flex items-center gap-3 font-heading text-sm font-semibold tracking-[-0.03em]">
          <span className="h-3 w-3 rounded-full bg-lime-300 shadow-[0_0_24px_rgba(163,230,53,0.45)]" />
          HARVIE AI
        </Link>
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton forceRedirectUrl="/app">
              <button className="hidden text-sm text-zinc-300 transition hover:text-white sm:inline-flex">Sign in</button>
            </SignInButton>
            <SignUpButton forceRedirectUrl="/app">
              <button className="alcor-button alcor-button-primary alcor-nav-cta">Get started</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/app" className="alcor-button alcor-button-primary alcor-nav-cta">Open app</Link>
          </Show>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[100dvh] max-w-7xl items-center gap-12 px-6 pb-16 pt-28 lg:grid-cols-[0.84fr_1.16fr] lg:px-10">
        <div className="relative z-10 max-w-xl">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-lime-300">HARVIE AI</p>
          <h1 className="font-heading text-5xl font-medium leading-[1.03] tracking-[-0.06em] text-white sm:text-6xl">
            Your AI assistant for work that shouldn&apos;t fall through the cracks.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-zinc-400">
            Harvie remembers your work, acts across your tools, and follows through.
          </p>
          <div className="mt-9"><LandingActions /></div>
        </div>
        <div className="relative flex min-h-[30rem] items-center justify-center lg:min-h-[42rem]">
          <div className="absolute h-[70%] w-[70%] rounded-full bg-lime-300/5 blur-[110px]" />
          <HarvieOrb />
          <p className="absolute bottom-0 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-zinc-600">A place for work to come together</p>
        </div>
      </section>

      <section className="alcor-section alcor-problem-section">
        <div>
          <p className="alcor-kicker">The problem</p>
          <h2>Work is everywhere. Context is nowhere.</h2>
          <p className="alcor-section-copy">Harvie turns scattered signals into a shared picture of what needs attention next.</p>
        </div>
        <div className="alcor-fragment-map" aria-label="Harvie connects your work tools">
          <div className="alcor-fragment alcor-fragment-gmail"><Mail size={17} /> Gmail</div>
          <div className="alcor-fragment alcor-fragment-calendar"><CalendarDays size={17} /> Calendar</div>
          <div className="alcor-fragment alcor-fragment-docs"><FileText size={17} /> Documents</div>
          <div className="alcor-fragment alcor-fragment-payments"><ReceiptIndianRupee size={17} /> Payments</div>
          <div className="alcor-fragment alcor-fragment-tasks"><ListTodo size={17} /> Tasks</div>
          <div className="alcor-fragment-core"><Sparkles size={24} strokeWidth={1.6} /><span>Harvie</span></div>
        </div>
      </section>

      <section className="alcor-section alcor-memory-section">
        <div className="alcor-relationship-card">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-zinc-500">Relationship memory</p><h3>Harbor Creative</h3></div>
            <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs text-lime-200">Active</span>
          </div>
          <div className="alcor-memory-nodes">
            {['Rhea, decision maker', 'Prefers email', 'Proposal accepted', '₹40,000 invoice', 'Last contacted, 3 days ago', 'Kickoff next week'].map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <div>
          <p className="alcor-kicker">Memory</p>
          <h2>Harvie remembers the relationship, not just the conversation.</h2>
          <p className="alcor-section-copy">Important details stay connected, so every next step begins with context instead of a blank page.</p>
        </div>
      </section>

      <section id="how-it-works" className="alcor-section alcor-loop-section">
        <div className="max-w-2xl">
          <p className="alcor-kicker">Proactive loop</p>
          <h2>Harvie doesn&apos;t wait for you to ask.</h2>
          <p className="alcor-section-copy">It watches for change, connects it to what matters, and brings the right moment back to you.</p>
        </div>
        <div className="alcor-loop" aria-label="Harvie operational loop">
          {workflow.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <span>{step}</span>{index < workflow.length - 1 && <ArrowRight className="text-zinc-700" size={16} strokeWidth={1.4} />}
            </div>
          ))}
        </div>
        <div className="alcor-attention-card">
          <div className="flex gap-3"><TimerReset className="mt-0.5 text-lime-300" size={19} strokeWidth={1.75} /><div><p className="font-medium text-white">Harbor Creative&apos;s ₹40,000 invoice is still unpaid.</p><p className="mt-1 text-sm leading-6 text-zinc-400">I drafted a follow-up based on your previous communication.</p></div></div>
          <button className="alcor-button alcor-button-outline">Review &amp; send <Send size={15} strokeWidth={1.75} /></button>
        </div>
      </section>

      <section className="alcor-section alcor-feel-section">
        <div><p className="alcor-kicker">How it feels</p><h2>Give Harvie the outcome. Keep the attention for the work that matters.</h2></div>
        <div className="alcor-contrast-grid">
          <div className="alcor-before"><p>Before Harvie</p>{['Remember everything yourself', 'Check multiple tools', 'Figure out what changed', 'Decide what to do', 'Follow up manually'].map((item) => <span key={item}>{item}</span>)}</div>
          <div className="alcor-after"><p>With Harvie</p>{['Give Harvie the outcome', 'Harvie understands context', 'Harvie acts', 'Harvie follows through'].map((item) => <span key={item}><Check size={16} strokeWidth={2} />{item}</span>)}</div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-white/8 px-6 py-10 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <span>HARVIE AI</span>
        <Show when="signed-out"><SignInButton forceRedirectUrl="/app"><button className="text-zinc-300 transition hover:text-lime-200">Sign in to continue</button></SignInButton></Show>
        <Show when="signed-in"><Link href="/app" className="text-zinc-300 transition hover:text-lime-200">Open your workspace</Link></Show>
      </footer>
    </main>
  );
}
