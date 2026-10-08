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
  Inbox,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  Network,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';
import { useState, type ReactNode } from 'react';
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

const useCases = [
  { title: 'Plan your day', prompt: 'What should I focus on today?', icon: CalendarDays },
  { title: 'Manage your inbox', prompt: 'Find the emails I need to respond to.', icon: Inbox },
  { title: 'Prepare for meetings', prompt: 'Prepare me for my 2 PM meeting.', icon: FileText },
  { title: 'Stay on top of tasks', prompt: "What am I forgetting this week?", icon: CheckCircle2 },
  { title: 'Research', prompt: 'Research these companies and summarize what matters.', icon: Search },
  { title: 'Follow up', prompt: "Who haven't I followed up with this week?", icon: Send },
  { title: 'Personal organization', prompt: 'I have a lot going on. Help me organize it.', icon: Layers3 },
];

const toolConnections = [
  { name: 'Gmail', icon: Mail },
  { name: 'Google Calendar', icon: CalendarDays },
  { name: 'Work tools', icon: Layers3 },
  { name: 'Your data', icon: FileText },
  { name: 'APIs & services', icon: Globe2 },
];

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
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

function CapabilityPreview({ type }: { type: string }) {
  if (type === 'day') {
    return (
      <div className="capability-preview capability-preview-day" aria-hidden="true">
        <div className="preview-day-head"><span>Today</span><span>3 priorities</span></div>
        <div className="preview-day-row preview-day-row-active"><span className="preview-check" />Prepare for the product review<span>09:30</span></div>
        <div className="preview-day-row"><span className="preview-check" />Reply to the open thread<span>11:45</span></div>
        <div className="preview-day-row"><span className="preview-check" />Decide what moves to tomorrow<span>16:00</span></div>
      </div>
    );
  }

  if (type === 'loops') {
    return (
      <div className="capability-preview capability-preview-loops" aria-hidden="true">
        <div className="preview-loop-row"><span className="preview-loop-dot preview-loop-dot-lime" /><span>Reply to Maya</span><small>Yesterday</small></div>
        <div className="preview-loop-row"><span className="preview-loop-dot" /><span>Confirm the next check-in</span><small>2 days</small></div>
        <div className="preview-loop-row"><span className="preview-loop-dot preview-loop-dot-warm" /><span>Review the open decision</span><small>Friday</small></div>
      </div>
    );
  }

  if (type === 'actions') {
    return (
      <div className="capability-preview capability-preview-actions" aria-hidden="true">
        <div className="preview-action-heading"><span className="preview-action-icon"><Send size={13} /></span><span>Objective in progress</span><span className="preview-action-status">3 / 4</span></div>
        <div className="preview-action-line"><Check size={13} /> Gather the latest context</div>
        <div className="preview-action-line"><Check size={13} /> Draft the follow-up</div>
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
        <i className="preview-memory-link preview-memory-link-one" />
        <i className="preview-memory-link preview-memory-link-two" />
        <i className="preview-memory-link preview-memory-link-three" />
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
            <a href="#what-is-harvie">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#privacy">Privacy</a>
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
          <a href="#what-is-harvie" onClick={closeMenu}>Product <ArrowUpRight aria-hidden="true" size={16} /></a>
          <a href="#how-it-works" onClick={closeMenu}>How it works <ArrowUpRight aria-hidden="true" size={16} /></a>
          <a href="#privacy" onClick={closeMenu}>Privacy <ArrowUpRight aria-hidden="true" size={16} /></a>
          <div className="landing-mobile-actions">
            <LandingAuthButton />
          </div>
        </div>
      </motion.nav>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-container landing-wide-container landing-hero-grid">
          <Reveal className="landing-hero-copy">
            <h1 id="hero-title">Meet Harvie</h1>
            <p className="landing-hero-lede">Your personal work agent.</p>
            <p className="landing-hero-lede landing-hero-lede-soft">An agent that stays one step ahead.</p>
            <p className="landing-hero-description">
              Harvie remembers what matters, keeps track of your work, and reaches out when something needs your attention — without waiting for you to ask.
            </p>
            <div className="landing-hero-actions">
              <GetStartedButton />
              <a href="#how-it-works" className="landing-button landing-button-secondary">See how it works <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} /></a>
            </div>
          </Reveal>
        </div>
        <Reveal className="landing-hero-visual" delay={0.1}>
          <HeroOrb />
        </Reveal>
      </section>

      <section className="landing-proof-line" aria-label="Harvie principles">
        <div className="landing-container landing-proof-grid">
          <div><span>01</span><strong>Context that carries forward</strong></div>
          <div><span>02</span><strong>Actions you can review</strong></div>
          <div><span>03</span><strong>Control over your data</strong></div>
        </div>
      </section>

      <section id="what-is-harvie" className="landing-section landing-intro-section">
        <div className="landing-container landing-intro-layout">
          <Reveal className="landing-intro-copy">
            <h2>An AI assistant that actually works alongside you.</h2>
            <p>Most AI assistants wait for a question. Harvie understands your context, remembers what matters, works with the tools you already use, and helps move things forward.</p>
            <p>Think of it as an assistant that is always available, without needing to explain everything again.</p>
          </Reveal>
          <Reveal className="landing-context-panel" delay={0.08}>
            <div className="context-panel-top"><span className="context-panel-label">Harvie’s working context</span><span className="context-panel-state"><span /> Ready</span></div>
            <div className="context-panel-list">
              <div><span className="context-panel-icon"><Network size={16} /></span><span><strong>Understands the work around your request</strong><small>Not just the last message.</small></span><CheckCircle2 aria-hidden="true" size={17} /></div>
              <div><span className="context-panel-icon"><StickyNote size={16} /></span><span><strong>Remembers useful context and preferences</strong><small>So you can continue where you left off.</small></span><CheckCircle2 aria-hidden="true" size={17} /></div>
              <div><span className="context-panel-icon"><Send size={16} /></span><span><strong>Turns objectives into next steps</strong><small>With review points when they matter.</small></span><CheckCircle2 aria-hidden="true" size={17} /></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="landing-section landing-manifesto-section">
        <div className="landing-container landing-manifesto-layout">
          <Reveal className="landing-manifesto-copy">
            <h2>More than a chatbot.</h2>
            <p>Harvie isn&apos;t designed around endless conversations. It&apos;s designed around getting things done.</p>
          </Reveal>
          <Reveal className="landing-manifesto-steps" delay={0.08}>
            <div><span>01</span><strong>You tell Harvie what matters.</strong></div>
            <div><span>02</span><strong>Harvie understands the context.</strong></div>
            <div><span>03</span><strong>It figures out what needs to happen.</strong></div>
            <div className="landing-manifesto-step-active"><span>04</span><strong>Then it helps make it happen.</strong><ArrowRight aria-hidden="true" size={18} /></div>
          </Reveal>
        </div>
      </section>

      <section id="capabilities" className="landing-section landing-capabilities-section">
        <div className="landing-container">
          <Reveal className="landing-section-intro">
            <h2>Built for the work between the work.</h2>
            <p>Harvie keeps the small commitments, decisions, and follow-ups moving so they don&apos;t disappear between tools and sessions.</p>
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

      <section id="proactive" className="landing-section landing-delegation-section">
        <div className="landing-container">
          <Reveal className="landing-section-intro landing-section-intro-narrow">
            <h2>Don&apos;t just ask. Delegate.</h2>
            <p>The goal isn&apos;t to spend more time talking to AI. Give Harvie an objective, then spend less time managing the work around it.</p>
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
              <p>“Help me prepare for tomorrow.”</p>
              <div className="delegation-objective-status"><Sparkles size={15} /><span>Objective understood</span><Check size={15} /></div>
            </div>
            <div className="delegation-result">
              <div className="delegation-result-heading"><span className="delegation-label">Harvie works through the context</span><span className="delegation-progress">Ready for review</span></div>
              <div className="delegation-result-steps">
                <span><Check size={14} /> Checks your calendar</span>
                <span><Check size={14} /> Finds the related conversation</span>
                <span><CircleDot size={14} /> Prepares a focused brief</span>
              </div>
              <button type="button" className="delegation-review-button">Review the plan <ArrowUpRight aria-hidden="true" size={15} /></button>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="memory" className="landing-section landing-memory-section">
        <div className="landing-container landing-memory-layout">
          <Reveal className="memory-record" delay={0.05}>
            <div className="memory-record-top"><span><StickyNote size={15} /> Example memory</span><span className="memory-record-menu">•••</span></div>
            <h3>Keep the relationship in view.</h3>
            <p className="memory-record-subtitle">Useful context stays connected across conversations.</p>
            <div className="memory-record-items">
              <div><span>Working preference</span><strong>Concise updates with a clear next step</strong></div>
              <div><span>Open commitment</span><strong>Follow up after the proposal review</strong></div>
              <div><span>Previous context</span><strong>The decision is waiting on one detail</strong></div>
              <div><span>Next check-in</span><strong>Bring the unresolved question forward</strong></div>
            </div>
            <div className="memory-record-footer"><span className="memory-record-dot" /> Continues across sessions</div>
          </Reveal>
          <Reveal className="landing-memory-copy">
            <h2>It remembers the context you shouldn&apos;t have to repeat.</h2>
            <p>Your work doesn&apos;t reset every morning. Neither should your assistant. Harvie can remember useful information about how you work, your ongoing tasks, important context, and previous interactions.</p>
            <p className="landing-highlight-line">No starting from zero.</p>
          </Reveal>
        </div>
      </section>

      <section id="tools" className="landing-section landing-tools-section">
        <div className="landing-container landing-tools-layout">
          <Reveal className="landing-tools-copy">
            <h2>One assistant. The tools you already use.</h2>
            <p>Instead of jumping between tools, give Harvie the objective and let it coordinate the work across your everyday workflow.</p>
            <div className="tool-connection-list">
              {toolConnections.map((tool) => {
                const Icon = tool.icon;
                return <div key={tool.name}><span><Icon aria-hidden="true" size={16} /></span>{tool.name}<ArrowUpRight aria-hidden="true" size={14} /></div>;
              })}
            </div>
          </Reveal>
          <Reveal className="tools-coordination-panel" delay={0.08}>
            <div className="tools-panel-heading"><span className="tools-panel-kicker"><span /> Connected context</span><span>5 sources</span></div>
            <div className="tools-panel-center"><span className="tools-panel-core"><Sparkles aria-hidden="true" size={20} /></span><span>Harvie</span></div>
            <div className="tools-panel-lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <div className="tools-panel-sources">
              <span><Mail size={14} /> Inbox</span>
              <span><CalendarDays size={14} /> Calendar</span>
              <span><FileText size={14} /> Notes</span>
              <span><CheckCircle2 size={14} /> Tasks</span>
              <span><Globe2 size={14} /> APIs</span>
            </div>
            <div className="tools-panel-footer"><span>Objective</span><strong>Prepare this week</strong><ArrowRight aria-hidden="true" size={15} /></div>
          </Reveal>
        </div>
      </section>

      <section id="privacy" className="landing-section landing-privacy-section">
        <div className="landing-container landing-privacy-layout">
          <Reveal className="landing-privacy-copy">
            <div className="privacy-lock-mark"><LockKeyhole aria-hidden="true" size={18} /></div>
            <h2>Your AI assistant. Your machine. Your data.</h2>
            <p>Your personal assistant should feel personal. Harvie is built around giving you control over your data, your connections, and your AI environment.</p>
            <p>Private by design. Your information isn&apos;t just another dataset for a generic chatbot.</p>
          </Reveal>
          <Reveal className="control-panel" delay={0.08}>
            <div className="control-panel-heading"><ShieldCheck aria-hidden="true" size={18} /><span>Keep the control</span><span className="control-panel-state">Your rules</span></div>
            <p>Harvie only becomes useful when it can work with your tools. Access should never mean giving up control.</p>
            <ul>
              <li><Check aria-hidden="true" size={15} /> What Harvie can access</li>
              <li><Check aria-hidden="true" size={15} /> Which tools it can use</li>
              <li><Check aria-hidden="true" size={15} /> What it can do and when it should act</li>
              <li><Check aria-hidden="true" size={15} /> What stays private</li>
            </ul>
            <div className="control-panel-footer"><span className="control-panel-signal" /> You stay in control <ArrowRight aria-hidden="true" size={15} /></div>
          </Reveal>
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-process-section">
        <div className="landing-container">
          <Reveal className="landing-section-intro landing-section-intro-narrow">
            <h2>Tell Harvie what you need.</h2>
            <p>Harvie understands the goal, uses the context it has access to, and keeps you informed about what happens next.</p>
          </Reveal>
          <div className="process-list">
            <Reveal className="process-row" delay={0.02}>
              <span className="process-number">01</span><div><h3>Tell it</h3><p>Give Harvie a goal, task, question, or problem.</p></div><span className="process-example">“Help me plan my week.”</span>
            </Reveal>
            <Reveal className="process-row" delay={0.07}>
              <span className="process-number">02</span><div><h3>Harvie understands</h3><p>It uses your context, memory, and connected tools to understand what needs to happen.</p></div><span className="process-example">Context + memory</span>
            </Reveal>
            <Reveal className="process-row" delay={0.12}>
              <span className="process-number">03</span><div><h3>Harvie acts</h3><p>It can research, organize, draft, coordinate, and perform actions through your connected tools.</p></div><span className="process-example">Research → organize → act</span>
            </Reveal>
            <Reveal className="process-row process-row-final" delay={0.17}>
              <span className="process-number">04</span><div><h3>You stay in control</h3><p>Harvie keeps you informed and lets you decide what happens next.</p></div><span className="process-example">Review before action</span>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="use-cases" className="landing-section landing-use-cases-section">
        <div className="landing-container">
          <Reveal className="landing-section-intro">
            <h2>Built for the work between the work.</h2>
            <p>From a clear morning plan to the follow-up you almost forgot, Harvie helps keep the important things moving.</p>
          </Reveal>
          <div className="use-case-grid">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Reveal key={useCase.title} className="use-case-item" delay={index * 0.035}>
                  <span className="use-case-icon"><Icon aria-hidden="true" size={17} /></span>
                  <div><h3>{useCase.title}</h3><p>{useCase.prompt}</p></div>
                  <ArrowUpRight aria-hidden="true" className="use-case-arrow" size={16} />
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section landing-difference-section">
        <div className="landing-container landing-difference-layout">
          <Reveal className="landing-difference-copy">
            <h2>AI that knows more than your last message.</h2>
            <p>Useful assistance isn&apos;t just about producing a good answer. It&apos;s about knowing what happens next.</p>
          </Reveal>
          <Reveal className="difference-compare" delay={0.08}>
            <div className="difference-compare-row difference-compare-muted"><span>Traditional AI</span><strong>Ask <i>→</i> Answer <i>→</i> Forget</strong></div>
            <div className="difference-compare-row difference-compare-active"><span>Harvie</span><strong>Understand <i>→</i> Remember <i>→</i> Act <i>→</i> Follow through</strong></div>
          </Reveal>
        </div>
      </section>

      <section id="get-started" className="landing-final-section">
        <div className="landing-container landing-final-inner">
          <Reveal className="landing-final-copy">
            <p className="landing-final-kicker"><span className="landing-eyebrow-dot" /> A better way to work with AI</p>
            <h2>Let your AI do more than answer.</h2>
            <p>Give your work a memory. Give your tasks a follow-through. Give yourself an assistant.</p>
            <div className="landing-final-action"><GetStartedButton /></div>
          </Reveal>
          <Reveal className="landing-final-tagline" delay={0.08}>
            <Sparkles aria-hidden="true" size={19} />
            <span>Your AI assistant.<br />Your machine.<br />Your data.</span>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Link href="/" className="landing-brand"><span className="landing-brand-mark" aria-hidden="true"><span /></span><span>harvie</span></Link>
          <div className="landing-footer-links">
            <a href="#what-is-harvie">Product</a>
            <a href="#use-cases">Use cases</a>
            <a href="#privacy">Privacy</a>
            <a href="#how-it-works">How it works</a>
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
