'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Show, SignInButton, SignOutButton, SignUpButton } from '@clerk/nextjs';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  Cloud,
  Code2,
  FileText,
  FolderOpen,
  Globe2,
  HardDrive,
  Layers3,
  LayoutGrid,
  ListChecks,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  Network,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Table2,
  Video,
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
import { MemoryGraph } from './memory-graph';
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

const rollItems = [
  'Plan your day',
  'Track open loops',
  'Remember commitments',
  'Draft the follow-up',
  'Prepare for meetings',
  'Your data stays yours',
  'Acts only with approval',
  'Runs hosted, local, or self-hosted',
];

const toolConnections = [
  { name: 'Email & calendar', note: 'Gmail · Google Calendar', icon: Mail },
  { name: 'Chat, docs & projects', note: 'Slack · Notion · GitHub · and more', icon: Layers3 },
  { name: '250+ work apps', note: 'Everything in your stack', icon: Globe2 },
];

const appRowOne = [
  { name: 'Gmail', icon: Mail },
  { name: 'Google Calendar', icon: CalendarDays },
  { name: 'Slack', icon: MessageSquare },
  { name: 'Notion', icon: FileText },
  { name: 'GitHub', icon: Code2 },
  { name: 'Linear', icon: Layers3 },
  { name: 'Zoom', icon: Video },
  { name: 'Google Drive', icon: HardDrive },
];

const appRowTwo = [
  { name: 'Asana', icon: ListChecks },
  { name: 'HubSpot', icon: Globe2 },
  { name: 'Airtable', icon: Table2 },
  { name: 'Discord', icon: MessageCircle },
  { name: 'Trello', icon: LayoutGrid },
  { name: 'Salesforce', icon: Cloud },
];

const loopSteps = [
  {
    node: 'Understand',
    label: 'OBJECTIVE UNDERSTOOD',
    quote: 'Help me prepare for tomorrow.',
    body: 'Harvie checks your calendar, finds the related emails, and identifies what needs to be ready before the meeting.',
    items: [
      { kicker: 'Calendar', text: 'Maya, 11:00 — proposal review' },
      { kicker: 'Inbox', text: 'Maya requested the proposal on Tuesday' },
      { kicker: 'Note', text: 'The pricing section is still unfinished' },
    ],
  },
  {
    node: 'Remember',
    label: 'CONTEXT CARRIED FORWARD',
    quote: "You don't have to explain it all again.",
    body: 'Harvie brings forward the decisions, preferences, and unfinished work from earlier conversations.',
    items: [
      { kicker: 'Client', text: 'Acme — Maya is waiting for the proposal' },
      { kicker: 'Decision', text: 'Hold pricing until Rahul sends the numbers' },
      { kicker: 'Preference', text: 'Keep updates concise and lead with the decision' },
    ],
  },
  {
    node: 'Anticipate',
    label: 'SPOTTED BEFORE THE MEETING',
    quote: 'Something’s missing before tomorrow’s meeting.',
    body: 'Harvie connects the missing numbers to tomorrow’s review and flags the outdated agenda before it becomes a problem.',
    items: [
      { kicker: 'Mismatch', text: 'The agenda references the old proposal' },
      { kicker: 'Waiting on', text: "Rahul's pricing numbers" },
      { kicker: 'Next step', text: 'Update the agenda when pricing is confirmed' },
    ],
  },
  {
    node: 'Act',
    label: 'PREPARED, AWAITING YOUR APPROVAL',
    quote: 'The brief is ready. One decision remains.',
    body: 'Harvie prepares the updated brief and drafts the follow-up, leaving the pricing decision and external messages under your control.',
    items: [
      { kicker: 'Prepared', text: 'Updated brief based on the latest context' },
      { kicker: 'Drafted', text: 'Follow-up to Rahul, ready for review' },
      { kicker: 'Your decision', text: 'Final pricing approval required' },
    ],
  },
  {
    node: 'Follow through',
    label: 'STILL TRACKED ON FRIDAY',
    quote: 'You closed the chat. The work carried on.',
    body: 'On Friday, Harvie still has the open items in view: the brief awaiting your review, Rahul’s unanswered follow-up, and the proposal deadline.',
    items: [
      { kicker: 'Awaiting you', text: 'Review and approve the brief' },
      { kicker: 'Still open', text: "Rahul's pricing response" },
      { kicker: 'Deadline', text: 'Maya’s proposal is due today' },
    ],
  },
] as const;

const moments = [
  {
    time: '07:30',
    label: 'Planned',
    node: 'is-lime',
    text: 'Four priorities today. The pricing review is the one that can’t move.',
    tag: 'Morning planned around it',
  },
  {
    time: '10:14',
    label: 'Noticed',
    node: 'is-lime',
    text: 'Tomorrow’s meeting moved to 11:00. The agenda still references the old deck.',
    tag: 'Mismatch caught early',
  },
  {
    time: '14:20',
    label: 'Caught',
    node: 'is-warm',
    text: 'Still waiting on Rahul for the numbers. I can draft the follow-up.',
    actions: true,
  },
  {
    time: '18:15',
    label: 'Wrapped',
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

const pageLinks = [
  { href: '#work-between-the-work', label: 'Product' },
  { href: '#loop', label: 'How it works' },
  { href: '#memory', label: 'Memory' },
  { href: '#tools', label: 'Connections' },
  { href: '#control', label: 'Privacy' },
] as const;

const navigationLinks = pageLinks.filter((link) => link.label !== 'Connections');

const footerLinkGroups = [
  { label: 'Explore', links: pageLinks.slice(0, 3) },
  { label: 'Resources', links: pageLinks.slice(3) },
];

function GetStartedButton() {
  return (
    <>
      <Show when="signed-out">
        <SignUpButton forceRedirectUrl="/app">
          <button type="button" className="landing-button landing-button-primary">
            Try Beta <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link href="/app" className="landing-button landing-button-primary">
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

function RollingWord({ words }: { words: string[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [reduceMotion, words.length]);

  if (reduceMotion) {
    return <span className="rolling-static">{words.join(' Your ')}</span>;
  }

  return (
    <span className="rolling-word-wrap">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          className="rolling-word"
          initial={{ y: '72%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-72%', opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function LoopVignette({ step, index }: { step: (typeof loopSteps)[number]; index: number }) {
  return (
    <>
      <div className="loop-vignette-copy">
        <span className="loop-vignette-label">{String(index + 1).padStart(2, '0')} · {step.label}</span>
        <p className="loop-vignette-quote">“{step.quote}”</p>
        <p className="loop-vignette-note">{step.body}</p>
      </div>
      <div className="loop-vignette-evidence">
        {step.items.map((item) => (
          <div key={item.kicker} className={item.kicker === 'Your decision' ? 'is-gated' : undefined}>
            <small>{item.kicker}</small>
            <strong>{item.text}</strong>
          </div>
        ))}
      </div>
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
        {loopSteps.map((step, index) => (
          <div key={step.node} className="loop-static-row">
            <strong>{step.node}</strong>
            <div className="loop-vignette">
              <LoopVignette step={step} index={index} />
            </div>
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
              key={step.node}
              className={`loop-node${index < active ? ' is-past' : ''}${index === active ? ' is-active' : ''}`}
            >
              <span className="loop-node-dot"><i /></span>
              <span>{step.node}</span>
            </div>
          ))}
        </div>
        <div className="loop-vignette-stage">
          <p className="loop-scene">One thread · tomorrow’s review with Maya</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              className="loop-vignette"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <LoopVignette step={loopSteps[active]} index={active} />
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
      <div className="preview-memory-heading"><FolderOpen size={14} strokeWidth={1.8} /><span>Project / Harbor</span></div>
      <div className="preview-memory-graph">
        <svg className="preview-memory-connectors" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="memory-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M1 1 L6 4 L1 7" />
            </marker>
          </defs>
          <path className="preview-memory-path" d="M230 150 C260 150 295 150 325 150" markerEnd="url(#memory-arrow)" />
          <path className="preview-memory-path" d="M620 150 C660 150 675 83 715 83" markerEnd="url(#memory-arrow)" />
          <path className="preview-memory-path" d="M620 150 C660 150 675 217 715 217" markerEnd="url(#memory-arrow)" />
          <circle className="preview-memory-path-dot" cx="278" cy="150" r="3" />
          <circle className="preview-memory-path-dot" cx="670" cy="117" r="3" />
          <circle className="preview-memory-path-dot" cx="670" cy="183" r="3" />
        </svg>
        <div className="preview-memory-node preview-memory-node-one">
          <span className="preview-memory-node-icon"><FileText size={15} /></span>
          <span className="preview-memory-node-copy"><strong>Preference</strong><small>Concise updates</small></span>
        </div>
        <div className="preview-memory-node preview-memory-node-main">
          <span className="preview-memory-node-icon"><Layers3 size={17} /></span>
          <span className="preview-memory-node-copy"><strong>Project context</strong><small>All your work in one place</small></span>
        </div>
        <div className="preview-memory-node-group">
          <div className="preview-memory-node preview-memory-node-two">
            <span className="preview-memory-node-icon"><CheckCircle2 size={15} /></span>
            <span className="preview-memory-node-copy"><strong>Decision</strong><small>Use the new pricing</small></span>
          </div>
          <div className="preview-memory-node preview-memory-node-three">
            <span className="preview-memory-node-icon"><Send size={15} /></span>
            <span className="preview-memory-node-copy"><strong>Next step</strong><small>Follow up with Rahul</small></span>
          </div>
        </div>
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
            {navigationLinks.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
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
          {navigationLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={closeMenu}>{link.label} <ArrowUpRight aria-hidden="true" size={16} /></a>
          ))}
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
            <div className="noticed-card" aria-hidden="true">
              <div className="noticed-head">
                <span className="noticed-label"><BellRing size={13} /> Noticed</span>
                <span className="noticed-time">2m ago</span>
              </div>
              <p className="noticed-title">The client moved tomorrow’s review to 11:00.</p>
              <p className="noticed-body">The proposal is still missing pricing. I can add a note and remind you before the meeting.</p>
              <div className="noticed-actions">
                <span className="noticed-action-primary"><Check size={12} /> Flag it for me</span>
                <span className="noticed-action-ghost">Later</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Rolling strip */}
      <section className="roll-strip" aria-hidden="true">
        <div className="roll-track">
          {[0, 1].map((copy) => (
            <div className="roll-group" key={copy}>
              {rollItems.map((item) => (
                <span className="roll-item" key={`${copy}-${item}`}>{item}</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 2 — The problem */}
      <section id="problem" className="landing-section landing-problem-section">
        <div className="landing-container landing-problem-layout">
          <Reveal className="landing-problem-copy">
            <p className="landing-kicker">The problem</p>
            <h2>The conversation ends. The work doesn’t.</h2>
            <p>A deadline buried in an email. A promise made in a chat. A number you’re still waiting on. The work between the work is scattered across tools, threads, and days.</p>
            <p>Most AI sees the message in front of it — then forgets everything when the chat closes.</p>
          </Reveal>
          <Reveal className="scatter-board" delay={0.08}>
            <div className="scatter-grid" aria-hidden="true">
              <div className="scatter-fragment">
                <span className="scatter-fragment-head"><Mail size={13} /> Email</span>
                <div><strong>Forward the updated proposal</strong><small>Maya · Tue 17:42</small></div>
              </div>
              <div className="scatter-fragment">
                <span className="scatter-fragment-head"><MessageCircle size={13} /> Chat</span>
                <div><strong>“Can you send the numbers today?”</strong><small>Rahul · thread</small></div>
              </div>
              <div className="scatter-fragment">
                <span className="scatter-fragment-head"><StickyNote size={13} /> Note</span>
                <div><strong>Pricing section — TBD</strong><small>Half-written note</small></div>
              </div>
            </div>
            <div className="scatter-end" aria-hidden="true"><span>Ask</span><i>→</i><span>Answer</span><i>→</i><span>Forget</span></div>
          </Reveal>
        </div>
      </section>

      {/* 3 — The loop */}
      <section id="loop" className="landing-section landing-loop-section">
        <div className="landing-container">
          <Reveal className="landing-section-intro">
            <p className="landing-kicker">What makes Harvie different</p>
            <h2>Harvie works in a loop.</h2>
            <p>Most AI waits to be asked. Harvie builds context, carries it forward, watches for what needs attention, and keeps commitments moving after the conversation ends.</p>
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
            <h2>Harvie speaks up. Only when it matters.</h2>
            <p>A missing detail before a meeting. A commitment you made last week. A reply you’re still waiting on. Harvie surfaces what needs your attention — and stays quiet when it doesn’t.</p>
            <p className="landing-moments-foot"><span className="landing-eyebrow-dot" /> No pings for the sake of pinging.</p>
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
                    <span className="moment-card-label"><BellRing size={12} /> {moment.label}</span>
                    <strong>{moment.text}</strong>
                    {moment.actions ? (
                      <div className="moment-actions">
                        <span className="moment-action moment-action-primary"><Check size={11} /> Approve draft</span>
                        <span className="moment-action">Edit first</span>
                      </div>
                    ) : (
                      <span className="moment-tag">{moment.tag}</span>
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
            <p>Give Harvie the outcome. It brings together the context, works through the steps, and surfaces what needs your decision.</p>
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

      {/* 7 — Memory graph */}
      <section id="memory" className="landing-section landing-memory-section">
        <div className="landing-container landing-memory-layout">
          <Reveal className="landing-memory-copy">
            <p className="landing-kicker">Memory &amp; continuity</p>
            <h2>Remember once. Never repeat.</h2>
            <p>Every conversation becomes a living memory graph — people, decisions, deadlines, and preferences, connected and carried forward. Come back days later, and Harvie still knows where things stand.</p>
            <p className="landing-highlight-line">No starting from zero.</p>
          </Reveal>
          <Reveal delay={0.08}>
            <MemoryGraph />
          </Reveal>
        </div>
      </section>

      {/* 8 — Connected context */}
      <section id="tools" className="landing-section landing-tools-section">
        <div className="landing-container landing-tools-layout">
          <Reveal className="landing-tools-copy">
            <p className="landing-kicker">Connected context</p>
            <h2>One assistant. Every tool you use.</h2>
            <p>Connect your email, calendar, chat, docs, and the rest of your stack. Harvie brings the relevant context together — with your permission.</p>
            <div className="tool-connection-list">
              {toolConnections.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.name}>
                    <span className="tool-connection-icon"><Icon aria-hidden="true" size={16} /></span>
                    <span className="tool-connection-copy"><strong>{tool.name}</strong><small>{tool.note}</small></span>
                    <ArrowUpRight aria-hidden="true" size={14} />
                  </div>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="tools-marquee-panel" aria-hidden="true">
              <div className="tools-panel-heading"><span className="tools-panel-kicker"><span /> Connected context</span><span>250+ apps</span></div>
              <div className="tools-marquee-body">
                <div className="tools-marquee-row">
                  <div className="tools-marquee-track">
                    {[0, 1].map((copy) => (
                      <div className="tools-marquee-group" key={copy}>
                        {appRowOne.map((app) => {
                          const Icon = app.icon;
                          return <span className="app-chip" key={`${copy}-${app.name}`}><Icon size={13} /> {app.name}</span>;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="tools-marquee-row tools-marquee-row-reverse">
                  <div className="tools-marquee-track tools-marquee-track-reverse">
                    {[0, 1].map((copy) => (
                      <div className="tools-marquee-group" key={copy}>
                        {appRowTwo.map((app) => {
                          const Icon = app.icon;
                          return <span className="app-chip" key={`${copy}-${app.name}`}><Icon size={13} /> {app.name}</span>;
                        })}
                        <span className="app-chip app-chip-more"><Plus size={13} /> 250+ more</span>
                      </div>
                    ))}
                  </div>
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
            <p className="control-statement">
              <span className="control-statement-fixed">Your</span>
              <RollingWord words={['AI assistant.', 'machine.', 'data.']} />
            </p>
            <p>Choose what Harvie can access, which actions require your approval, which models it uses, and where it runs.</p>
            <p>Helpful by design. Under your control.</p>
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
          <div className="landing-footer-brand">
            <Link href="/" className="landing-footer-wordmark" aria-label="Harvie home">harvie</Link>
            <p>Remembers what matters. Thinks ahead.</p>
          </div>
          <nav className="landing-footer-links" aria-label="Footer">
            {footerLinkGroups.map((group) => (
              <div className="landing-footer-link-group" key={group.label}>
                <h2>{group.label}</h2>
                {group.links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
              </div>
            ))}
          </nav>
        </div>
        <div className="landing-container landing-footer-bar">
          <span>© {new Date().getFullYear()} Harvie</span>
          <span>Built for follow-through.</span>
        </div>
      </footer>
    </main>
  );
}
