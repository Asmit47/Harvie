'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Show, SignInButton, SignOutButton, SignUpButton } from '@clerk/nextjs';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Globe2,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Network,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Nucleus } from './nucleus';

const capabilities = [
  {
    title: 'Start your day with clarity.',
    description: 'Bring your schedule, tasks, priorities, and unfinished work into one view.',
    prompt: 'What does my day look like?',
    icon: CalendarDays,
    className: 'capability-card-wide capability-card-lime',
    preview: 'day',
  },
  {
    title: 'Keep your work moving.',
    description: 'Open loops stay visible, even when the original conversation is days behind you.',
    prompt: 'What am I forgetting this week?',
    icon: Clock3,
    className: 'capability-card-tall capability-card-quiet',
    preview: 'loops',
  },
  {
    title: 'Get things done for you.',
    description: 'Research, draft, organize, and coordinate across the tools you already use.',
    prompt: 'Help me prepare for tomorrow.',
    icon: Send,
    className: 'capability-card-tall capability-card-warm',
    preview: 'actions',
  },
  {
    title: 'Remember what matters.',
    description: 'Keep useful context and preferences close, so every session can continue where you left off.',
    prompt: 'Continue from where we left off.',
    icon: Network,
    className: 'capability-card-wide capability-card-deep',
    preview: 'memory',
  },
];

const toolConnections = [
  { name: 'Gmail', icon: Mail },
  { name: 'Google Calendar', icon: CalendarDays },
  { name: 'Work tools', icon: Layers3 },
  { name: 'Your data', icon: FileText },
  { name: 'APIs & services', icon: Globe2 },
];

const loopSteps = [
  { node: 'Understand', label: 'Objective understood', kind: 'understand' },
  { node: 'Remember', label: 'Saved to memory', kind: 'remember' },
  { node: 'Anticipate', label: 'Surfaced at the right time', kind: 'anticipate' },
  { node: 'Act', label: 'Working, with review points', kind: 'act' },
  { node: 'Follow through', label: 'After the conversation ends', kind: 'follow' },
] as const;

type LoopKind = (typeof loopSteps)[number]['kind'];

const moments = [
  {
    time: '07:30',
    node: 'is-lime',
    text: 'Four priorities today. The pricing review is the one that can’t move.',
    tag: 'Morning planned around it',
  },
  {
    time: '10:14',
    node: 'is-lime',
    text: 'Tomorrow’s meeting moved to 11:00. The agenda still references the old deck.',
    tag: 'Mismatch caught early',
  },
  {
    time: '14:20',
    node: 'is-warm',
    text: 'Still waiting on Rahul for the numbers. I can draft the follow-up.',
    actions: true,
  },
  {
    time: '18:15',
    node: '',
    text: 'Wrapped for today. The proposal is drafted — one decision left for tomorrow.',
    tag: 'Nothing left overnight',
  },
];

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function GetStartedButton({ compact = false }: { compact?: boolean }) {
  const className = compact
    ? 'landing-button landing-button-primary landing-button-small'
    : 'landing-button landing-button-primary';

  return (
    <>
      <Show when="signed-out">
        <SignUpButton forceRedirectUrl="/app">
          <button type="button" className={className}>
            Try Beta <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link href="/app" className={className}>
          Open Harvie <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </Show>
    </>
  );
}

function LandingAuthButton() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton forceRedirectUrl="/app">
          <button type="button" className="landing-auth-button landing-auth-button-primary">
            Sign in <ArrowUpRight aria-hidden="true" size={15} strokeWidth={2} />
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <SignOutButton>
          <button type="button" className="landing-auth-button">Sign out</button>
        </SignOutButton>
      </Show>
    </>
  );
}

function HeroOrb() {
  return (
    <div
      className="hero-orb"
      role="img"
      aria-label="A flowing lime-green Harvie orb"
    >
      <div className="hero-orb-crop" aria-hidden="true">
        <div className="hero-orb-render">
          <Nucleus />
        </div>
      </div>
    </div>
  );
}

function FinalOrb() {
  return (
    <div className="final-orb" role="img" aria-label="The Harvie orb, calm and steady">
      <div className="final-orb-crop" aria-hidden="true">
        <div className="final-orb-render">
          <Nucleus />
        </div>
      </div>
    </div>
  );
}

function Typewriter({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);
  const done = count >= text.length;

  useEffect(() => {
    if (!inView) {
      return;
    }
    if (reduceMotion) {
      setCount(text.length);
      return;
    }
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) {
        window.clearInterval(timer);
      }
    }, 34);
    return () => window.clearInterval(timer);
  }, [inView, reduceMotion, text]);

  return (
    <span ref={ref}>
      {text.slice(0, count)}
      {!done && count > 0 ? <span className="type-caret" aria-hidden="true" /> : null}
    </span>
  );
}

function LoopVignette({ kind }: { kind: LoopKind }) {
  if (kind === 'understand') {
    return (
      <>
        <p className="loop-vignette-quote">“Help me prepare for tomorrow.”</p>
        <div className="loop-vignette-chips">
          <span><Check size={12} /> Calendar gathered</span>
          <span><Check size={12} /> Inbox gathered</span>
          <span><Check size={12} /> Notes gathered</span>
        </div>
      </>
    );
  }

  if (kind === 'remember') {
    return (
      <>
        <p className="loop-vignette-note">The details that matter are kept for next time — not lost when the chat closes.</p>
        <div className="loop-vignette-chips">
          <span><StickyNote size={12} /> Client · Acme</span>
          <span><Clock3 size={12} /> Due · Friday</span>
          <span><StickyNote size={12} /> Waiting on · Rahul</span>
        </div>
      </>
    );
  }

  if (kind === 'anticipate') {
    return (
      <>
        <p className="loop-vignette-note">“Tomorrow’s agenda still references the old pricing.”</p>
        <span className="loop-vignette-tag">One heads-up, not a feed of noise</span>
      </>
    );
  }

  if (kind === 'act') {
    return (
      <div className="loop-vignette-list">
        <span><Check size={13} /> Gathers the latest context</span>
        <span><Check size={13} /> Drafts the updated brief</span>
        <span className="is-gated"><CircleDot size={13} /> Final pricing decision <em>Needs your approval</em></span>
      </div>
    );
  }

  return (
    <>
      <p className="loop-vignette-note">“Recap drafted. Tuesday’s check-in is on the calendar.”</p>
      <span className="loop-vignette-tag">Ready for your review</span>
    </>
  );
}

function LoopRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: railRef, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const next = Math.min(loopSteps.length - 1, Math.floor(value * loopSteps.length));
    setActive((current) => (current === next ? current : next));
  });

  const pulseLeft = useTransform(scrollYProgress, (value) => `calc(${10 + value * 80}% + ${16 - value * 32}px)`);
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  if (reduceMotion) {
    return (
      <div className="loop-static">
        {loopSteps.map((step) => (
          <div key={step.kind} className="loop-static-row">
            <strong>{step.node}</strong>
            <LoopVignette kind={step.kind} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="loop-rail-wrap" ref={railRef}>
      <div className="loop-rail-sticky">
        <div className="loop-rail">
          <i className="loop-rail-line" aria-hidden="true" />
          <motion.i className="loop-rail-progress" style={{ scaleX: progressScale }} aria-hidden="true" />
          <motion.i className="loop-pulse" style={{ left: pulseLeft }} aria-hidden="true" />
          {loopSteps.map((step, index) => (
            <div
              key={step.kind}
              className={`loop-node${index < active ? ' is-past' : ''}${index === active ? ' is-active' : ''}`}
            >
              <span className="loop-node-dot"><i /></span>
              <span>{step.node}</span>
            </div>
          ))}
        </div>
        <div className="loop-vignette-stage">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              className="loop-vignette"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="loop-vignette-label">{loopSteps[active].label}</span>
              <LoopVignette kind={loopSteps[active].kind} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CapabilityPreview({ type }: { type: string }) {
  const reduceMotion = useReducedMotion();
  const spring = { type: 'spring', stiffness: 300, damping: 16 } as const;

  if (type === 'day') {
    return (
      <div className="capability-preview capability-preview-day" aria-hidden="true">
        <div className="preview-day-head"><span>Today</span><span>3 priorities</span></div>
        <div className="preview-day-row preview-day-row-active">
          <motion.span
            className="preview-check"
            initial={reduceMotion ? false : { scale: 0 }}
            whileInView={reduceMotion ? undefined : { scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.35 }}
          />
          Prepare for the product review<span>09:30</span>
        </div>
        <div className="preview-day-row"><span className="preview-check" />Reply to the open thread<span>11:45</span></div>
        <div className="preview-day-row"><span className="preview-check" />Decide what moves to tomorrow<span>16:00</span></div>
      </div>
    );
  }

  if (type === 'loops') {
    return (
      <div className="capability-preview capability-preview-loops" aria-hidden="true">
        <div className="preview-loop-row">
          <motion.span
            className="preview-loop-dot preview-loop-dot-lime"
            initial={reduceMotion ? false : { scale: 0 }}
            whileInView={reduceMotion ? undefined : { scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.3 }}
          />
          <span>Reply to Maya</span><small>Yesterday</small>
        </div>
        <div className="preview-loop-row"><span className="preview-loop-dot" /><span>Confirm the next check-in</span><small>2 days</small></div>
        <div className="preview-loop-row"><span className="preview-loop-dot preview-loop-dot-warm" /><span>Review the open decision</span><small>Friday</small></div>
      </div>
    );
  }

  if (type === 'actions') {
    return (
      <div className="capability-preview capability-preview-actions" aria-hidden="true">
        <div className="preview-action-heading"><span className="preview-action-icon"><Send size={13} /></span><span>Objective in progress</span><span className="preview-action-status">3 / 4</span></div>
        <div className="preview-action-line">
          <motion.span
            initial={reduceMotion ? false : { scale: 0 }}
            whileInView={reduceMotion ? undefined : { scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.25 }}
            style={{ display: 'inline-flex' }}
          >
            <Check size={13} />
          </motion.span>
          Gather the latest context
        </div>
        <div className="preview-action-line">
          <motion.span
            initial={reduceMotion ? false : { scale: 0 }}
            whileInView={reduceMotion ? undefined : { scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.5 }}
            style={{ display: 'inline-flex' }}
          >
            <Check size={13} />
          </motion.span>
          Draft the follow-up
        </div>
        <div className="preview-action-line"><CircleDot size={13} /> Review before sending</div>
      </div>
    );
  }

  return (
    <div className="capability-preview capability-preview-memory" aria-hidden="true">
      <span>project / Harbor</span>
      <div className="preview-memory-graph">
        <span className="preview-memory-node preview-memory-node-main">Context</span>
        <span className="preview-memory-node preview-memory-node-one">Preference</span>
        <span className="preview-memory-node preview-memory-node-two">Decision</span>
        <span className="preview-memory-node preview-memory-node-three">Next step</span>
        <motion.i
          className="preview-memory-link preview-memory-link-one"
          initial={reduceMotion ? false : { scaleX: 0, rotate: 22 }}
          whileInView={reduceMotion ? undefined : { scaleX: 1, rotate: 22 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.i
          className="preview-memory-link preview-memory-link-two"
          initial={reduceMotion ? false : { scaleX: 0, rotate: -21 }}
          whileInView={reduceMotion ? undefined : { scaleX: 1, rotate: -21 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.i
          className="preview-memory-link preview-memory-link-three"
          initial={reduceMotion ? false : { scaleX: 0, rotate: 27 }}
          whileInView={reduceMotion ? undefined : { scaleX: 1, rotate: 27 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navElevated, setNavElevated] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const shouldElevate = latest > 56;
    setNavElevated((current) => current === shouldElevate ? current : shouldElevate);
  });

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <main className="harvie-landing">
      <div className="landing-noise" aria-hidden="true" />
      <motion.nav
        className={`landing-nav ${navElevated ? 'landing-nav-elevated' : ''}`}
        aria-label="Primary navigation"
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="landing-container landing-wide-container landing-nav-inner">
          <Link href="/" className="landing-brand" onClick={closeMenu} aria-label="Harvie home">
            <Image src="/harvie-logo.svg" alt="" width={20} height={28} priority />
          </Link>
          <div className="landing-nav-links">
            <a href="#work-between-the-work">Product</a>
            <a href="#loop">How it works</a>
            <a href="#control">Privacy</a>
          </div>

          <div className="landing-nav-actions">
            <LandingAuthButton />
          </div>

          <button
            type="button"
            className="landing-menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
        <div className={`landing-mobile-menu ${menuOpen ? 'landing-mobile-menu-open' : ''}`}>
          <a href="#work-between-the-work" onClick={closeMenu}>Product <ArrowUpRight aria-hidden="true" size={16} /></a>
          <a href="#loop" onClick={closeMenu}>How it works <ArrowUpRight aria-hidden="true" size={16} /></a>
          <a href="#control" onClick={closeMenu}>Privacy <ArrowUpRight aria-hidden="true" size={16} /></a>
          <div className="landing-mobile-actions">
            <LandingAuthButton />
          </div>
        </div>
      </motion.nav>

      {/* 1 — Hero */}
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-container landing-wide-container landing-hero-grid">
          <Reveal className="landing-hero-copy">
            <h1 id="hero-title">Meet Harvie</h1>
            <p className="landing-hero-lede">Your personal work agent.</p>
            <p className="landing-hero-lede landing-hero-lede-soft">The AI that stays one step ahead.</p>
            <p className="landing-hero-description">
              Harvie remembers what matters, keeps track of your work, and reaches out when something needs your attention — without waiting for you to ask.
            </p>
            <div className="landing-hero-actions">
              <GetStartedButton />
              <a href="#loop" className="landing-button landing-button-secondary">See how it works <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} /></a>
            </div>
          </Reveal>
        </div>
        <div className="landing-hero-visual">
          <HeroOrb />
          <Reveal className="hero-moment-wrap" delay={0.45}>
            <div className="hero-moment" aria-hidden="true">
              <div className="hero-moment-head">
                <span className="hero-moment-source"><Mail size={12} /> Inbox · Calendar</span>
                <span>9:02</span>
              </div>
              <p>The client moved tomorrow’s review to 11:00. The proposal is still missing pricing — want me to flag it?</p>
              <div className="hero-moment-actions">
                <span className="is-approve"><Check size={11} /> Yes, flag it</span>
                <span>Later</span>
              </div>
            </div>
          </Reveal>
          <span className="hero-chip hero-chip-mail" aria-hidden="true"><Mail size={12} /> Email</span>
          <span className="hero-chip hero-chip-task" aria-hidden="true"><CheckCircle2 size={12} /> Tasks</span>
          <i className="hero-trail hero-trail-one" aria-hidden="true" />
          <i className="hero-trail hero-trail-three" aria-hidden="true" />
        </div>
      </section>

      {/* 2 — The problem */}
      <section id="problem" className="landing-section landing-problem-section">
        <div className="landing-container landing-problem-layout">
          <Reveal className="landing-problem-copy">
            <p className="landing-kicker">The problem</p>
            <h2>Your work doesn’t live in one place. Your agent only sees one.</h2>
            <p>A deadline buried in an email. A promise made in a conversation. A number you’re still waiting on. The work between the work is scattered across tools, threads, and days — and it’s usually the work that matters most.</p>
            <p>Most AI sees the message in front of it. When the conversation ends, everything you explained leaves with it.</p>
          </Reveal>
          <Reveal className="scatter-board" delay={0.08}>
            <div className="scatter-field" aria-hidden="true">
              <div className="scatter-fragment scatter-fragment-mail">
                <span className="scatter-fragment-head"><Mail size={13} /></span>
                <div><strong>Forward the updated proposal</strong><small>Maya · Tue 17:42</small></div>
              </div>
              <div className="scatter-fragment scatter-fragment-cal">
                <span className="scatter-fragment-head"><CalendarDays size={13} /></span>
                <div><strong>Client review — moved to 11:00</strong><small>Friday</small></div>
              </div>
              <div className="scatter-fragment scatter-fragment-chat">
                <span className="scatter-fragment-head"><MessageCircle size={13} /></span>
                <div><strong>“Can you send the numbers today?”</strong><small>Rahul · thread</small></div>
              </div>
              <div className="scatter-fragment scatter-fragment-note">
                <span className="scatter-fragment-head"><StickyNote size={13} /></span>
                <div><strong>Pricing section — TBD</strong><small>Half-written note</small></div>
              </div>
              <div className="scatter-fragment scatter-fragment-task">
                <span className="scatter-fragment-head"><CheckCircle2 size={13} /></span>
                <div><strong>Follow up after the review</strong><small>No due date</small></div>
              </div>
            </div>
            <div className="scatter-thread" aria-hidden="true">Harvie holds the thread</div>
            <div className="scatter-transcript" aria-hidden="true">
              <div className="scatter-transcript-line is-old"><span>You</span><p>Here’s all the context on the Acme proposal…</p></div>
              <div className="scatter-transcript-line"><span>Assistant</span><p>Got it — here’s a summary.</p></div>
              <div className="scatter-transcript-end"><span>Ask</span><i>→</i><span>Answer</span><i>→</i><span>Forget</span></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 — The loop */}
      <section id="loop" className="landing-section landing-loop-section">
        <div className="landing-container">
          <Reveal className="landing-section-intro">
            <p className="landing-kicker">What makes Harvie different</p>
            <h2>Most AI waits to be asked. Harvie works in a loop.</h2>
            <p>Harvie isn’t organized around conversations. It’s organized around your work — building context, carrying it forward, watching for what needs attention, and keeping commitments moving after the conversation ends.</p>
          </Reveal>
          <Reveal className="loop-compare" delay={0.05}>
            <div className="difference-compare-row difference-compare-muted">
              <span>Typical assistant</span>
              <strong>Ask <i>→</i> Answer <i>→</i> Start over</strong>
            </div>
            <div className="difference-compare-row difference-compare-active">
              <span>Harvie</span>
              <strong>Understand <i>→</i> Remember <i>→</i> Anticipate <i>→</i> Act <i>→</i> Follow through</strong>
            </div>
          </Reveal>
          <LoopRail />
        </div>
      </section>

      {/* 4 — Harvie notices */}
      <section id="moments" className="landing-section landing-moments-section">
        <div className="landing-container landing-moments-layout">
          <Reveal className="landing-moments-copy">
            <p className="landing-kicker">One step ahead</p>
            <h2>The right thing, at the right time. Not a feed of noise.</h2>
            <p>Harvie speaks up when something actually needs you — a missing piece before a meeting, a commitment you made last week, a number you’re still waiting on. And it stays quiet when everything is on track.</p>
            <p className="landing-moments-foot"><span className="landing-eyebrow-dot" /> No pings for the sake of pinging. Harvie surfaces what matters.</p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="moments-day" aria-hidden="true">
              <div className="moments-day-head">
                <span>Today</span>
                <span className="moments-day-state"><i /> 4 surfaced · nothing forced</span>
              </div>
              {moments.map((moment) => (
                <div key={moment.time} className="moment-row">
                  <span className="moment-time">{moment.time}</span>
                  <span className="moment-rail">
                    <i className={`moment-node ${moment.node}`.trim()} />
                    <i className="moment-line" />
                  </span>
                  <div className="moment-card">
                    <strong>{moment.text}</strong>
                    {moment.actions ? (
                      <div className="moment-actions">
                        <span className="moment-action moment-action-primary"><Check size={11} /> Approve draft</span>
                        <span className="moment-action">Edit first</span>
                      </div>
                    ) : (
                      <span className={`moment-tag${moment.tag?.startsWith('Morning') ? ' moment-tag-lime' : ''}`}>{moment.tag}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 — The work between the work */}
      <section id="work-between-the-work" className="landing-section landing-capabilities-section">
        <div className="landing-container">
          <Reveal className="landing-section-intro">
            <p className="landing-kicker">What Harvie does</p>
            <h2>Built for the work between the work.</h2>
            <p>The small commitments, decisions, and follow-ups that fall between emails, meetings, and projects — kept visible and moved along, so they don’t disappear between tools and sessions.</p>
          </Reveal>
          <div className="capability-grid">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <Reveal key={capability.title} className={`capability-card ${capability.className}`} delay={index * 0.05}>
                  <div className="capability-card-heading">
                    <span className="capability-icon"><Icon aria-hidden="true" size={17} strokeWidth={1.7} /></span>
                    <span className="capability-card-index">0{index + 1}</span>
                  </div>
                  <div className="capability-card-copy">
                    <h3>{capability.title}</h3>
                    <p>{capability.description}</p>
                    <span className="capability-prompt">{capability.prompt}</span>
                  </div>
                  <CapabilityPreview type={capability.preview} />
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6 — Delegation */}
      <section id="delegate" className="landing-section landing-delegation-section">
        <div className="landing-container">
          <Reveal className="landing-section-intro landing-section-intro-narrow">
            <p className="landing-kicker">Delegation</p>
            <h2>Don’t just ask. Delegate.</h2>
            <p>Give Harvie the outcome, not the instructions. It works through the context it has, organizes the steps, prepares the result, and brings you the decisions that deserve your attention.</p>
          </Reveal>
          <Reveal className="delegation-board" delay={0.08}>
            <div className="delegation-column delegation-column-instructions">
              <span className="delegation-label">Instead of</span>
              <p>“Check my calendar, look at my emails, figure out what I need to prepare for tomorrow, and remind me about the meeting.”</p>
              <div className="delegation-friction"><span /><span /><span /><span /></div>
            </div>
            <div className="delegation-arrow" aria-hidden="true"><ArrowRight size={20} /></div>
            <div className="delegation-column delegation-column-objective">
              <span className="delegation-label">Tell Harvie</span>
              <p>“<Typewriter text="Help me prepare for tomorrow." />”</p>
              <div className="delegation-objective-status"><Sparkles size={15} /><span>Objective understood</span><Check size={15} /></div>
            </div>
            <div className="delegation-result">
              <div className="delegation-result-heading"><span className="delegation-label">Harvie works through the context</span><span className="delegation-progress">Ready for review</span></div>
              <div className="delegation-result-steps">
                <span><Check size={14} /> Checks your calendar</span>
                <span><Check size={14} /> Finds the related conversation</span>
                <span><Check size={14} /> Drafts the updated brief</span>
                <span className="is-gated"><CircleDot size={14} /> Adds the missing pricing <em className="delegation-step-gate">Needs your approval</em></span>
                <span className="is-gated"><CircleDot size={14} /> Prepares the follow-up <em className="delegation-step-gate">Review before sending</em></span>
              </div>
              <button type="button" className="delegation-review-button">Review the plan <ArrowUpRight aria-hidden="true" size={15} /></button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7 — Memory & continuity */}
      <section id="memory" className="landing-section landing-memory-section">
        <div className="landing-container landing-memory-layout">
          <Reveal className="landing-memory-copy">
            <p className="landing-kicker">Memory &amp; continuity</p>
            <h2>It remembers the context you shouldn’t have to repeat.</h2>
            <p>Your work doesn’t reset every morning. Neither should your assistant. Preferences, decisions, commitments, open threads — Harvie carries them forward, so every session continues where the last one ended.</p>
            <p className="landing-highlight-line">No starting from zero.</p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="memory-thread" aria-hidden="true">
              <div className="memory-thread-card">
                <div className="memory-thread-card-head"><span>Tue · 16:40</span><span>Conversation</span></div>
                <p>“We’ll wait for Rahul’s numbers before sending the proposal.”</p>
                <div className="memory-thread-kept">
                  <span><StickyNote size={11} /> Decision saved</span>
                  <span><Clock3 size={11} /> Waiting on Rahul</span>
                </div>
              </div>
              <div className="memory-thread-line">
                <i />
                <div className="memory-thread-chips">
                  <span>Client · Acme</span>
                  <span>Due · Friday</span>
                  <span>Waiting · Rahul</span>
                </div>
                <i />
              </div>
              <div className="memory-thread-card">
                <div className="memory-thread-card-head"><span>Fri · 09:12</span><span className="is-resumed">Resumed</span></div>
                <p>“Picking up where you left off — the proposal is one decision away.”</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8 — Connected context */}
      <section id="tools" className="landing-section landing-tools-section">
        <div className="landing-container landing-tools-layout">
          <Reveal className="landing-tools-copy">
            <p className="landing-kicker">Connected context</p>
            <h2>One assistant. The tools you already use.</h2>
            <p>The context you need is scattered across Gmail, Google Calendar, and the tools you work in. Connect them once, and Harvie brings the relevant pieces together — when you allow it.</p>
            <div className="tool-connection-list">
              {toolConnections.map((tool) => {
                const Icon = tool.icon;
                return <div key={tool.name}><span><Icon aria-hidden="true" size={16} /></span>{tool.name}<ArrowUpRight aria-hidden="true" size={14} /></div>;
              })}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="tools-coordination-panel" aria-hidden="true">
              <div className="tools-panel-heading"><span className="tools-panel-kicker"><span /> Connected context</span><span>5 sources</span></div>
              <div className="tools-panel-stage">
                <div className="tools-panel-center"><span className="tools-panel-core"><Sparkles aria-hidden="true" size={20} /></span><span>Harvie</span></div>
                <div className="tools-panel-lines"><i /><i /><i /><i /><i /></div>
                <div className="tools-panel-sources">
                  <span><Mail size={14} /> Inbox</span>
                  <span><CalendarDays size={14} /> Calendar</span>
                  <span><FileText size={14} /> Notes</span>
                  <span><CheckCircle2 size={14} /> Tasks</span>
                  <span><Globe2 size={14} /> APIs</span>
                </div>
              </div>
              <div className="tools-panel-footer"><span>Objective</span><strong>Prepare this week</strong><ArrowRight aria-hidden="true" size={15} /></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 9 — Control */}
      <section id="control" className="landing-section landing-control-section">
        <div className="landing-container landing-control-layout">
          <Reveal className="landing-control-copy">
            <p className="landing-kicker">Control &amp; privacy</p>
            <h2>Your AI assistant. Your machine. Your data.</h2>
            <p>You decide which tools Harvie can reach, which actions need your approval, which models it uses, and where it runs — hosted, on your machine, or self-hosted.</p>
            <p>Helpful, not reckless. Harvie works for your benefit and stays under your control.</p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="settings-panel" aria-hidden="true">
              <div className="settings-row">
                <div className="settings-row-head">
                  <span className="settings-row-icon"><LockKeyhole size={14} /></span>
                  <div><strong>Permissions</strong><small>Choose which tools Harvie can access</small></div>
                </div>
                <div className="settings-chips">
                  <span className="settings-chip is-on"><Check size={11} /> Gmail</span>
                  <span className="settings-chip is-on"><Check size={11} /> Google Calendar</span>
                  <span className="settings-chip">Notes</span>
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-row-head">
                  <span className="settings-row-icon"><ShieldCheck size={14} /></span>
                  <div><strong>Approvals</strong><small>Decide when Harvie checks with you first</small></div>
                </div>
                <div className="settings-approval">
                  <span className="settings-toggle"><i /></span>
                  <span>Ask before sending anything</span>
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-row-head">
                  <span className="settings-row-icon"><Sparkles size={14} /></span>
                  <div><strong>Models</strong><small>Bring your own providers — Harvie picks per task</small></div>
                </div>
                <div className="settings-route">
                  <div><b>Deep reasoning</b><span>your strongest model</span><ArrowRight size={12} /></div>
                  <div><b>Quick tasks</b><span>a lighter, faster one</span><ArrowRight size={12} /></div>
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-row-head">
                  <span className="settings-row-icon"><Network size={14} /></span>
                  <div><strong>Deployment</strong><small>Runs where you’re comfortable</small></div>
                </div>
                <div className="settings-segmented">
                  <span className="is-active">Hosted</span>
                  <span>Local</span>
                  <span>Self-hosted</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10 — Closing invitation */}
      <section id="get-started" className="landing-final-section">
        <div className="landing-container landing-final-inner">
          <Reveal>
            <FinalOrb />
          </Reveal>
          <Reveal className="landing-final-copy" delay={0.08}>
            <p className="landing-final-kicker"><span className="landing-eyebrow-dot" /> The invitation</p>
            <h2>You focus. Harvie thinks ahead.</h2>
            <p>Stop remembering everything. Hand Harvie the follow-ups, the deadlines, and the details — and get back to the work only you can do.</p>
            <div className="landing-final-action"><GetStartedButton /></div>
            <p className="landing-final-tag">Your AI assistant · Your machine · Your data</p>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Link href="/" className="landing-brand"><span className="landing-brand-mark" aria-hidden="true"><span /></span><span>harvie</span></Link>
          <div className="landing-footer-links">
            <a href="#work-between-the-work">Product</a>
            <a href="#loop">How it works</a>
            <a href="#memory">Memory</a>
            <a href="#control">Privacy</a>
          </div>
          <div className="landing-footer-end">
            <GetStartedButton compact />
            <span>© {new Date().getFullYear()} Harvie</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
