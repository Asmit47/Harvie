'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Brain,
  CalendarDays,
  CircleDot,
  FileText,
  Inbox,
  Menu,
  Settings2,
  SunMedium,
  Wallet,
  Workflow,
  X,
} from 'lucide-react';
import { HarvieLogo } from '@/components/harvie-logo';
import { BuiltBy } from '@/components/landing/built-by';
import { FollowLoop } from '@/components/landing/follow-loop';
import { GetStarted, SignInLink } from '@/components/landing/auth-cta';
import { MeetHarvie } from '@/components/landing/meet-harvie';

const GITHUB = 'https://github.com/Asmit47/Harvie';

const NAV = [
  { href: '#product', label: 'Product' },
  { href: '#how', label: 'How it works' },
  { href: '#memory', label: 'Memory' },
  { href: '#trust', label: 'Source' },
];

const ATTENTION = [
  {
    title: 'Harbor Creative',
    meta: 'Invoice ₹40,000 unpaid for 12 days.',
    chip: 'Gmail',
    body: 'I drafted a follow-up based on your last email to Rhea.',
    primary: 'Review & send',
    secondary: 'Snooze',
  },
  {
    title: 'Kickoff with Rhea',
    meta: 'Next Tuesday, 11:00.',
    chip: 'Calendar',
    body: 'No agenda yet. Want me to draft one from the proposal thread?',
    primary: 'Draft agenda',
    secondary: 'Skip',
  },
  {
    title: 'Waiting on Northline',
    meta: 'Signed contract, sent 4 days ago.',
    chip: 'Open loop',
    body: "No reply yet. I'll recheck Friday morning.",
    primary: 'Recheck now',
    secondary: 'Close loop',
  },
];

const ACTIVITY = [
  ['observed', 'new email from Rhea'],
  ['remembered', 'prefers email over calls'],
  ['drafted', 'follow-up · waiting for your OK'],
];

const RAIL = [
  { label: 'Today', icon: SunMedium },
  { label: 'Open loops', icon: CircleDot },
  { label: 'Memory', icon: Brain },
  { label: 'Connections', icon: Workflow },
  { label: 'Settings', icon: Settings2 },
];

const SCATTERED = [
  { icon: Inbox, label: 'Gmail', position: 'left-4 top-6' },
  { icon: CalendarDays, label: 'Calendar', position: 'right-4 top-8' },
  { icon: FileText, label: 'Docs', position: 'left-2 top-44' },
  { icon: Wallet, label: 'Payments', position: 'right-3 top-48' },
  { icon: CircleDot, label: 'Tasks', position: 'left-1/2 bottom-6 -translate-x-1/2' },
];

const LAYERS = [
  ['Persona', 'who you are and how you like to work'],
  ['Session', "what you're doing right now (checkpointed)"],
  ['Operational', 'open loops, tasks and their state'],
  ['Long-term', 'facts that matter months later (Supermemory)'],
];

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`landing-rise ${className}`} style={delay ? { animationDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}

function SampleWindow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <figure className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-x-10 -top-8 -z-10 h-40 rounded-full bg-[#F59E5B]/[0.08] blur-3xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-[14px] border border-[#24272E] bg-[#111317] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {children}
      </div>
    </figure>
  );
}

function Rail({ active = 'Today' }: { active?: string }) {
  return (
    <aside className="hidden w-[176px] shrink-0 flex-col gap-1 border-r border-[#24272E] p-3 md:flex" aria-hidden="true">
      {RAIL.map((item) => {
        const Icon = item.icon;
        const on = item.label === active;
        return (
          <span key={item.label} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ${on ? 'bg-[#1E2128] text-[#EDEDEF]' : 'text-[#6C7079]'}`}>
            <Icon size={15} strokeWidth={1.7} />
            {item.label}
          </span>
        );
      })}
    </aside>
  );
}

function ActivityLog() {
  return (
    <div className="border-t border-[#24272E] p-4 xl:border-t-0 xl:border-l" aria-hidden="true">
      <p className="font-mono text-[11px] text-[#6C7079]">Recent activity</p>
      <ul className="mt-3 space-y-3">
        {ACTIVITY.map(([verb, detail]) => (
          <li key={verb} className="font-mono text-[12px] leading-5 text-[#A1A4AB]">
            <span className="text-[#F59E5B]">{verb}</span>
            <span className="mt-0.5 block text-[#EDEDEF]">{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroToday() {
  return (
    <SampleWindow>
      <div className="flex items-center justify-between border-b border-[#24272E] px-4 py-3">
        <span className="font-mono text-[11px] text-[#6C7079]">harvie / today</span>
        <span className="font-mono text-[11px] text-[#6C7079]">Sample workspace</span>
      </div>
      <div className="flex">
        <Rail />
        <div className="min-w-0 flex-1">
          <div className="flex items-end justify-between gap-4 px-5 pb-2 pt-5">
            <div>
              <p className="font-sans text-2xl font-semibold tracking-[-0.03em] text-[#EDEDEF]">Today</p>
              <p className="mt-1 text-sm text-[#A1A4AB]">Tue 6 Oct</p>
            </div>
            <p className="font-mono text-[12px] text-[#F59E5B]">3 open loops need you</p>
          </div>
          <div className="grid xl:grid-cols-[minmax(0,1fr)_230px]">
            <div className="space-y-3 px-4 py-4" aria-hidden="true">
              {ATTENTION.map((card, index) => (
                <article
                  key={card.title}
                  className="landing-rise rounded-xl border border-[#24272E] bg-[#171A1F] p-4"
                  style={{ animationDelay: `${0.12 + index * 0.08}s` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-medium text-[#EDEDEF]">{card.title}</h3>
                    <span className="rounded-full bg-[rgba(245,158,91,0.12)] px-2 py-0.5 font-mono text-[11px] text-[#F59E5B]">{card.chip}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#A1A4AB]">{card.meta}</p>
                  <p className="mt-2 text-sm leading-6 text-[#EDEDEF]">{card.body}</p>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-[#F59E5B] px-3 py-1.5 text-[12px] font-semibold text-[#1A0E05]">{card.primary}</span>
                    <span className="rounded-full border border-[#31353D] px-3 py-1.5 text-[12px] text-[#A1A4AB]">{card.secondary}</span>
                  </div>
                </article>
              ))}
            </div>
            <ActivityLog />
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        Sample workspace. A Today view with three open loops: an unpaid Harbor Creative invoice, a kickoff with Rhea, and a contract waiting on Northline.
      </figcaption>
    </SampleWindow>
  );
}

function MemoryLayers() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="grid gap-3" onMouseLeave={() => setActive(null)}>
      {LAYERS.map(([name, detail], index) => {
        const on = active === index;
        const dim = active !== null && !on;
        return (
          <motion.button
            key={name}
            type="button"
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            animate={reduce ? undefined : { y: on ? -6 : 0, opacity: dim ? 0.5 : 1 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-[#24272E] bg-[#171A1F]/90 px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F59E5B]"
            style={{ marginLeft: index * 12 }}
          >
            <span className="block text-sm font-medium text-[#EDEDEF]">{name}</span>
            <span className="mt-1 block text-sm text-[#A1A4AB]">{detail}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function LandingPage() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#EDEDEF]">
      <header className={`sticky top-0 z-40 transition-colors ${scrolled ? 'border-b border-[#24272E] bg-[#111317]/80 backdrop-blur-md' : 'bg-transparent'}`}>
        <nav className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-6" aria-label="Primary">
          <Link href="/" className="group shrink-0" aria-label="harvie, home">
            <HarvieLogo />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-[#A1A4AB] transition-colors hover:text-[#EDEDEF]">
                {item.label}
              </a>
            ))}
          </div>
          <div className="ml-auto hidden items-center gap-4 md:flex">
            <a href={GITHUB} className="font-mono text-[12.5px] text-[#6C7079] transition-colors hover:text-[#EDEDEF]" rel="noreferrer" target="_blank">
              GitHub
            </a>
            <SignInLink />
            <GetStarted compact />
          </div>
          <button
            type="button"
            className="ml-auto grid size-9 place-items-center rounded-lg border border-[#24272E] text-[#EDEDEF] md:hidden"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>
        {open && (
          <div className="border-t border-[#24272E] bg-[#111317] px-6 py-4 md:hidden">
            <div className="grid gap-3">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="text-sm text-[#EDEDEF]">
                  {item.label}
                </a>
              ))}
              <a href={GITHUB} className="font-mono text-[12.5px] text-[#6C7079]" rel="noreferrer" target="_blank">
                GitHub
              </a>
              <div className="mt-2 flex items-center justify-between">
                <SignInLink />
                <GetStarted compact />
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="px-6 pb-16 pt-16 md:pb-24 md:pt-24" aria-labelledby="hero-title">
          <div className="mx-auto max-w-[760px] text-center">
            <p className="inline-flex rounded-full border border-[#24272E] bg-[#111317] px-3 py-1 font-mono text-[12px] text-[#A1A4AB]">
              Source on GitHub · Your data stays yours
            </p>
            <h1 id="hero-title" className="landing-rise mt-6 font-sans text-[clamp(2.5rem,6.4vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              The AI assistant that <em className="font-serif font-normal italic">follows through.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-[46rem] text-[17px] leading-[1.6] text-[#A1A4AB]">
              Harvie remembers your work, acts in Gmail and Calendar with your OK, and keeps track of every open loop until it&apos;s done.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <GetStarted />
              <a href="#how" className="inline-flex h-11 items-center rounded-full border border-[#31353D] px-5 text-sm text-[#EDEDEF] transition-colors hover:border-[#F59E5B]/40">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-[#6C7079]">Live at harvie.me. Built with Next.js, LangGraph and FastAPI.</p>
          </div>
          <div className="landing-rise mx-auto mt-14 max-w-[1080px]" style={{ animationDelay: '0.08s' }}>
            <HeroToday />
          </div>
        </section>

        <section id="problem" className="scroll-mt-20 mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
          <Reveal>
            <p className="font-mono text-[12.5px] text-[#6C7079]">01 · The problem</p>
            <h2 className="mt-4 max-w-[14ch] text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">Work is everywhere. Context is nowhere.</h2>
            <p className="mt-4 max-w-[46ch] text-[17px] leading-[1.6] text-[#A1A4AB]">
              Your emails, meetings, docs and payments live in different tools. You are the only one holding it together, and things slip.
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <SampleWindow>
              <div className="flex items-center justify-between border-b border-[#24272E] px-4 py-3">
                <span className="font-mono text-[11px] text-[#6C7079]">scattered work</span>
                <span className="font-mono text-[11px] text-[#6C7079]">Sample workspace</span>
              </div>
              <div className="relative min-h-0 p-4 md:min-h-[380px] md:p-6" aria-hidden="true">
                <div className="mb-4 flex flex-wrap gap-2 md:hidden">
                  {SCATTERED.map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-2 rounded-full border border-[#24272E] bg-[#171A1F] px-3 py-2 text-sm">
                      <Icon size={14} className="text-[#A1A4AB]" />
                      {label}
                    </span>
                  ))}
                </div>
                <svg className="absolute inset-8 hidden h-[calc(100%-4rem)] w-[calc(100%-4rem)] md:block" viewBox="0 0 400 280" fill="none">
                  <path d="M40 40 C 140 40, 180 130, 200 150" stroke="#31353D" strokeDasharray="4 5" />
                  <path d="M360 36 C 280 50, 240 120, 210 146" stroke="#31353D" strokeDasharray="4 5" />
                  <path d="M24 200 C 90 180, 140 160, 190 156" stroke="#31353D" strokeDasharray="4 5" />
                  <path d="M370 210 C 300 190, 250 170, 214 160" stroke="#31353D" strokeDasharray="4 5" />
                  <path d="M200 250 C 200 210, 204 180, 204 168" stroke="#31353D" strokeDasharray="4 5" />
                </svg>
                {SCATTERED.map(({ icon: Icon, label, position }) => (
                  <span key={label} className={`absolute hidden items-center gap-2 rounded-full border border-[#24272E] bg-[#171A1F] px-3 py-2 text-sm text-[#EDEDEF] md:inline-flex ${position}`}>
                    <Icon size={14} className="text-[#A1A4AB]" />
                    {label}
                  </span>
                ))}
                <div className="relative mx-auto w-[min(100%,240px)] rounded-2xl border border-[#31353D] bg-[#1E2128] px-4 py-4 text-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
                  <p className="text-sm font-medium text-[#EDEDEF]">Harbor Creative</p>
                  <p className="mt-1 font-mono text-[12px] text-[#F59E5B]">3 things connected</p>
                </div>
              </div>
            </SampleWindow>
          </Reveal>
        </section>

        <section id="product" className="scroll-mt-20 mx-auto max-w-[1200px] px-6 py-20 md:py-32">
          <Reveal>
            <p className="font-mono text-[12.5px] text-[#6C7079]">02 · What Harvie is</p>
            <h2 className="mt-4 max-w-[16ch] text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">Not a chat box. An assistant that keeps going.</h2>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-[1.6] text-[#A1A4AB]">
              You give Harvie the outcome. It remembers the context, does the work in your tools, and comes back when something changes.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              ['Remembers', 'People, preferences and decisions stay connected across every conversation.'],
              ['Acts', 'Drafts emails and handles your calendar through Gmail and Calendar, with your OK first.'],
              ['Follows through', 'Tracks open loops and rechecks them, so nothing waits on your memory.'],
            ].map(([title, copy], index) => (
              <Reveal key={title} delay={index * 0.06} className="rounded-2xl border border-[#24272E] bg-[#111317] p-6">
                <h3 className="text-xl font-semibold tracking-[-0.03em]">{title}</h3>
                <p className="mt-3 text-[15px] leading-6 text-[#A1A4AB]">{copy}</p>
              </Reveal>
            ))}
          </div>
          <p className="mx-auto mt-16 max-w-[36rem] text-center font-serif text-[clamp(1.7rem,3vw,2.5rem)] italic leading-[1.25] text-[#EDEDEF]">
            Give Harvie the outcome. Keep your attention for the work that matters.
          </p>
        </section>

        <section id="memory" className="scroll-mt-20 mx-auto grid max-w-[1200px] items-center gap-14 px-6 py-20 md:grid-cols-2 md:py-32">
          <Reveal>
            <p className="font-mono text-[12.5px] text-[#6C7079]">03 · Memory</p>
            <h2 className="mt-4 max-w-[14ch] text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">Harvie remembers the relationship, not just the chat.</h2>
            <p className="mt-4 max-w-[48ch] text-[17px] leading-[1.6] text-[#A1A4AB]">
              Every next step starts with context, not a blank page. Memory is layered, so Harvie knows who you are, what you&apos;re doing now, and what happened before.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Persona', 'Session checkpointer', 'Operational memory', 'Supermemory'].map((chip) => (
                <span key={chip} className="rounded-full border border-[#24272E] px-3 py-1 font-mono text-[12px] text-[#A1A4AB]">{chip}</span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <SampleWindow>
              <div className="flex items-center justify-between border-b border-[#24272E] px-4 py-3">
                <span className="font-mono text-[11px] text-[#6C7079]">memory</span>
                <span className="font-mono text-[11px] text-[#6C7079]">Sample workspace</span>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[#24272E] bg-[#171A1F] p-4" aria-hidden="true">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium">Harbor Creative</h3>
                    <span className="font-mono text-[11px] text-[#4CC38A]">Active</span>
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    {[
                      ['Person', 'Rhea, decision maker'],
                      ['Preference', 'Prefers email'],
                      ['Decision', 'Proposal accepted'],
                      ['Invoice', '₹40,000'],
                      ['Last contact', '3 days ago'],
                      ['Next', 'Kickoff next week'],
                    ].map(([term, value]) => (
                      <div key={term} className="flex justify-between gap-3 border-t border-[#24272E] pt-2">
                        <dt className="text-[#6C7079]">{term}</dt>
                        <dd className="text-right text-[#EDEDEF]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <MemoryLayers />
              </div>
            </SampleWindow>
          </Reveal>
        </section>

        <section id="how" className="scroll-mt-20 mx-auto max-w-[1200px] px-6 py-20 md:py-32">
          <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <p className="font-mono text-[12.5px] text-[#6C7079]">04 · Follow through</p>
              <h2 className="mt-4 max-w-[14ch] text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">Harvie doesn&apos;t wait to be asked.</h2>
              <p className="mt-4 max-w-[42ch] text-[17px] leading-[1.6] text-[#A1A4AB]">
                It watches for change, checks the state of every open loop, and brings the right moment back to you.
              </p>
              <article className="mt-8 rounded-2xl border border-[#24272E] bg-[#171A1F] p-5" aria-hidden="true">
                <p className="font-mono text-[11px] text-[#6C7079]">Sample workspace</p>
                <h3 className="mt-3 text-lg font-medium leading-snug">Harbor Creative&apos;s ₹40,000 invoice is still unpaid.</h3>
                <p className="mt-2 text-sm leading-6 text-[#A1A4AB]">I drafted a follow-up based on your previous emails.</p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-[#F59E5B] px-3 py-1.5 text-[12px] font-semibold text-[#1A0E05]">Review & send</span>
                  <span className="rounded-full border border-[#31353D] px-3 py-1.5 text-[12px] text-[#A1A4AB]">Remind me Friday</span>
                </div>
              </article>
            </Reveal>
            <Reveal delay={0.06}>
              <FollowLoop />
            </Reveal>
          </div>
        </section>

        <section id="actions" className="scroll-mt-20 mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
          <Reveal className="md:order-2">
            <p className="font-mono text-[12.5px] text-[#6C7079]">05 · Actions</p>
            <h2 className="mt-4 max-w-[14ch] text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">It does the work. You stay in control.</h2>
            <p className="mt-4 max-w-[46ch] text-[17px] leading-[1.6] text-[#A1A4AB]">
              Harvie can send email and manage your calendar. Before anything goes out, it shows you exactly what it will do and waits for your OK.
            </p>
            <p className="mt-4 text-sm text-[#6C7079]">Connections are scoped to your account. Harvie only sees what you connect.</p>
          </Reveal>
          <Reveal delay={0.06} className="md:order-1">
            <div className="relative">
              <div className="absolute inset-x-6 top-4 rounded-2xl border border-[#24272E] bg-[#171A1F] px-4 py-3" aria-hidden="true">
                <p className="font-mono text-[12px] text-[#6C7079]">calendar.create_event</p>
                <p className="mt-1 text-sm text-[#A1A4AB]">Kickoff with Rhea · Tue 11:00</p>
              </div>
              <article className="relative mt-16 rounded-2xl border border-[#31353D] bg-[#111317] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[13px] text-[#EDEDEF]">gmail.send</p>
                  <p className="font-mono text-[12px] text-[#E9C46A]">Needs your OK</p>
                </div>
                <p className="mt-1 font-mono text-[11px] text-[#6C7079]">Sample workspace</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex gap-3"><dt className="w-16 text-[#6C7079]">To</dt><dd>rhea@harborcreative.example</dd></div>
                  <div className="flex gap-3"><dt className="w-16 text-[#6C7079]">Subject</dt><dd>Invoice for the brand project</dd></div>
                </dl>
                <p className="mt-4 text-sm leading-6 text-[#A1A4AB]">
                  Rhea, the Harbor Creative invoice for ₹40,000 is still open. This is the follow-up from our last thread. Nothing sends until you confirm.
                </p>
                <div className="relative mt-5 flex gap-2">
                  <span className="relative rounded-full bg-[#F59E5B] px-4 py-2 text-sm font-semibold text-[#1A0E05]">
                    Send
                    <span aria-hidden="true" className="send-ring pointer-events-none absolute -inset-1 rounded-full ring-1 ring-[#F59E5B]" />
                  </span>
                  <span className="rounded-full border border-[#31353D] px-4 py-2 text-sm text-[#A1A4AB]">Edit</span>
                  <span className="rounded-full border border-[#31353D] px-4 py-2 text-sm text-[#A1A4AB]">Cancel</span>
                </div>
              </article>
            </div>
          </Reveal>
        </section>

        <section id="meet" className="scroll-mt-20 mx-auto max-w-[1200px] px-6 py-20 md:py-32">
          <Reveal className="mx-auto max-w-[680px] text-center">
            <p className="font-mono text-[12.5px] text-[#6C7079]">06 · Meet Harvie</p>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">
              Harvie is a <em className="font-serif font-normal italic">presence</em>, not a prompt.
            </h2>
            <p className="mt-4 text-[17px] leading-[1.6] text-[#A1A4AB]">
              The orb is Harvie. It listens, thinks and acts, and you can see which one it&apos;s doing. Talk to it, or just let it work.
            </p>
          </Reveal>
          <div className="mt-12">
            <MeetHarvie />
          </div>
        </section>

        <section id="trust" className="scroll-mt-20 mx-auto max-w-[1200px] px-6 py-20 md:py-32">
          <Reveal>
            <p className="font-mono text-[12.5px] text-[#6C7079]">07 · Trust</p>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">Your work stays yours.</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              ['Source available', 'The code is public on GitHub. Read what Harvie does with your data.'],
              ['Asks before acting', 'Nothing is sent or booked without your OK.'],
              ['Scoped access', 'Gmail and Calendar connections are scoped to your account only.'],
              ['Local-first records', 'Persona, session, and open loops live in your Postgres. You can run the API yourself. Model calls use the providers you configure.'],
            ].map(([title, copy], index) => (
              <Reveal key={title} delay={index * 0.05} className="rounded-2xl border border-[#24272E] bg-[#111317] p-6">
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-[#A1A4AB]">{copy}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#6C7079]">
            Secure sign-in with Clerk.{' '}
            <a className="text-[#A1A4AB] underline decoration-[#31353D] underline-offset-4 hover:text-[#EDEDEF]" href={GITHUB} rel="noreferrer" target="_blank">
              Read the source
            </a>
          </p>
        </section>

        <section id="stack" className="scroll-mt-20 mx-auto max-w-[1200px] px-6 py-20 md:py-32">
          <Reveal>
            <p className="font-mono text-[12.5px] text-[#6C7079]">08 · Under the hood</p>
            <h2 className="mt-4 max-w-[16ch] text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">Built on tools you can trust and inspect.</h2>
            <p className="mt-4 max-w-[48ch] text-[17px] leading-[1.6] text-[#A1A4AB]">
              A LangGraph agent with a FastAPI backend, Postgres for open loops, and a Next.js 15 app.
            </p>
          </Reveal>
          <ul className="mt-8 flex flex-wrap gap-2">
            {['next.js 15', 'fastapi', 'langgraph', 'postgres', 'supermemory', 'composio', 'mcp', 'clerk'].map((item) => (
              <li key={item} className="rounded-full border border-[#24272E] bg-[#111317] px-3 py-1.5 font-mono text-[12.5px] text-[#A1A4AB]">{item}</li>
            ))}
          </ul>
          <p className="mt-8 font-mono text-[12.5px] leading-6 text-[#6C7079]">
            Orb and UI → LangGraph agent → memory layers + Gmail and Calendar (Composio) → open loops in Postgres → back to you
          </p>
        </section>

        <BuiltBy />

        <section id="start" className="relative scroll-mt-20 overflow-hidden px-6 py-24 text-center md:py-32">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E5B]/10 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-[640px]">
            <h2 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[44px]">Hand off the follow-through.</h2>
            <p className="mt-4 text-[17px] leading-[1.6] text-[#A1A4AB]">Connect Gmail and Calendar, tell Harvie what matters, and let it keep track.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <GetStarted />
              <a href="#how" className="inline-flex h-11 items-center rounded-full border border-[#31353D] px-5 text-sm text-[#EDEDEF]">See how it works</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#24272E]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="group" aria-label="harvie, home">
              <HarvieLogo />
            </Link>
            <p className="mt-2 text-sm text-[#6C7079]">The AI assistant that follows through.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#A1A4AB]">
            <a href="#product" className="hover:text-[#EDEDEF]">Product</a>
            <a href="#how" className="hover:text-[#EDEDEF]">How it works</a>
            <a href={GITHUB} className="hover:text-[#EDEDEF]" rel="noreferrer" target="_blank">Source</a>
            <SignInLink />
          </div>
          <p className="text-sm text-[#6C7079]">© {new Date().getFullYear()} Harvie · harvie.me</p>
        </div>
      </footer>
    </div>
  );
}
