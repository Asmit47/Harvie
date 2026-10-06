# Harvie brand and landing

Status: source of truth for the landing page and shared UI. Supersedes `design/design.md` where they disagree (lime accent, orb in the hero, Alcor naming).

Prepared from the 6 Oct 2026 content brief, checked against the FastAPI + LangGraph backend and the public repo `Asmit47/Harvie`.

## What Harvie actually is

Harvie is an AI assistant for work that should not fall through the cracks. It is a presence, not a chat box.

- **Memory is layered.** Persona fields (with source, confidence, and status) live in Postgres. The session is a Postgres LangGraph checkpointer. Open loops are a separate operational store so they survive an expired chat. Optional Supermemory tools search and save longer-term facts. Conversation text is not copied into the persona record.
- **Tools are Gmail and Google Calendar**, reached through Composio. The system prompt tells Harvie to confirm before sending mail and to draft first when the user is unsure. No other integrations are claimed.
- **Follow-through is an open loop.** Types are task, commitment, follow-up, waiting, and unresolved question. The agent can list, create, update, complete, and snooze them. Due and overdue loops are returned as attention items. A daily checkup of unread mail and today's calendar runs when the user asks for the day, not as a silent background cron.
- **Stack.** Next.js 15, FastAPI, LangGraph, Postgres, Clerk, optional Supermemory. Live at harvie.me. The GitHub repo is public and has **no LICENSE file**, so the page says the source is available on GitHub. It does not say "open source".

Sample people and companies in mockups (Harbor Creative, Rhea, Northline) are fictional. Every window that uses them is labeled **Sample workspace**.

## Reference study

Fetched and read against Linear, Attio, Granola, Raycast, Vercel, and Resend, plus the brief's notes on Cursor, Lindy, Superhuman, and Dia.

What to borrow:

- **The first screen is the product.** Linear and Attio lead with a real interface, not an illustration. Harvie's hero is a code-built Today view.
- **Show the work as a log.** Linear's activity feed and Resend's response lines. Harvie's hero has a short mono log: observed, remembered, drafted, waiting.
- **One idea per section.** Kicker, short headline, one or two sentences, one proof.
- **Color stays quiet.** The page is ink. Ember is the button, the active step, the focus ring, and the orb.
- **A serif word for warmth.** One Instrument Serif italic per headline at most. Granola already owns paper plus lime, which is why lime is retired.
- **Trust in plain language.** Nothing is sent or booked without an OK. Say that, and do not invent a compliance badge.

What not to copy: logo strips, testimonials, metrics, star counts, purple gradients, a chat transcript as the hero, or any other product's screenshot.

## Palette: Dusk

Dark, because the orb is a light source and the real app is dark. Ember is warm and specific. It is not Linear's indigo, Attio's blue, or Granola's lime.

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0B0D` | Page |
| `surface-1` | `#111317` | Nav when stuck, cards |
| `surface-2` | `#171A1F` | Product panels |
| `surface-3` | `#1E2128` | Inputs, hover |
| `border` | `#24272E` | Hairlines |
| `border-strong` | `#31353D` | Active edges |
| `text` | `#EDEDEF` | Headings and body |
| `text-secondary` | `#A1A4AB` | Supporting copy |
| `text-tertiary` | `#6C7079` | Captions, mono labels |
| `ember` | `#F59E5B` | Primary action, active step, focus |
| `ember-hover` | `#FFB27A` | Button hover |
| `ember-subtle` | `rgba(245,158,91,0.12)` | Tinted chips |
| `on-ember` | `#1A0E05` | Text on ember |
| `orb-core` | `#FFD3A8` | Orb highlight only |
| `orb-rose` | `#E8708F` | Orb mid tone only |
| `orb-iris` | `#8B7CF6` | Orb rim and thinking state only |
| `success` | `#4CC38A` | Closed or sent |
| `danger` | `#F26D6D` | Errors |

Orb gradient, core to rim: `#FFD3A8` → `#F59E5B` → `#E8708F` → `#8B7CF6`, on `#0A0B0D`.

Rose and iris do not appear in marketing chrome. They belong to the orb.

## Type

- **Geist Sans** for UI and headlines. Display tracking `-0.03em`, weight 600. Body 17px, line-height 1.6, weight 400.
- **Instrument Serif italic** for a single emphasis word and for the one philosophy line. Never for paragraphs.
- **Geist Mono** for kickers, tool names, and the activity log. 12–13px.

Scale: H1 64–72px desktop, 40px mobile. H2 40–44px desktop, 30px mobile. H3 20px. Small 14px.

The dashboard already referenced Sora, Manrope, and JetBrains Mono. Those CSS variables now point at Geist and Geist Mono so the app and the landing share one voice.

## Wordmark

Lowercase `harvie` in Geist Sans 600, tracking `-0.02em`. The dot on the i is a tiny orb (radial ember, soft glow), drawn in `HarvieLogo`. The same mark is the favicon and the app icon: the orb dot alone on a `#0A0B0D` rounded square. One component. No "HARVIE AI", no Alcor, no Next or Vercel marks.

Hover breathes the dot once (scale 1 to 1.15, 600ms). Off when reduced motion is requested.

## Voice

Plain words. Short sentences. No em dashes. No hype. No invented numbers. Name the category in the first line so a visitor knows what this is.

Headline: **The AI assistant that *follows through*.**

Subhead: Harvie remembers your work, acts in Gmail and Calendar with your OK, and keeps track of every open loop until it's done.

## Layout spine

12 columns, max width 1200px, 24px gutters. Section padding 128px desktop, 80px mobile. Product windows: 14px radius, 1px border, top highlight `rgba(255,255,255,0.04)`.

| # | Section | Anchor | Proof | Orb |
|---|---|---|---|---|
| 0 | Nav | | Wordmark, Product, How it works, Memory, Source, GitHub, Sign in, Get started | Dot in the wordmark only |
| 1 | Hero | | Today view. Three attention cards and a mono activity log | No |
| 2 | Problem | `#problem` | Five tool chips drawn into one card | No |
| 3 | What Harvie is | `#product` | Remembers, Acts, Follows through, then the philosophy line | No |
| 4 | Memory | `#memory` | Harbor Creative record and four layers | No |
| 5 | Follow through | `#how` | Eight-step loop and the card it produces | No |
| 6 | Actions | `#actions` | `gmail.send` waiting for an OK, calendar create behind it | No |
| 7 | Meet Harvie | `#meet` | Dashboard window, orb in the center, state chips | Yes. The only place on the landing page |
| 8 | Trust | `#trust` | Four plain statements | No |
| 9 | Under the hood | `#stack` | Mono stack labels and a one-line diagram | No |
| 10 | Built by | | One isolated component | No |
| 11 | Close | `#start` | Hand off the follow-through | CSS glow only |
| 12 | Footer | | Wordmark and links | Dot in the wordmark only |

Nav is 56px, sticky. Transparent at the top. After 8px of scroll it becomes `surface-1` at 80% opacity, with blur and a bottom border.

Primary action goes to `/app` through Clerk when keys are present, and to `/sign-up` when they are not, so the page still renders in local review. Sign in stays on the Clerk route.

## Section copy

Hero kicker: `Source on GitHub · Your data stays yours`. Microline: `Live at harvie.me. Built with Next.js, LangGraph and FastAPI.`

Philosophy line, serif italic, centered: *Give Harvie the outcome. Keep your attention for the work that matters.*

Follow-through caption, corrected from the brief: `open loops live in postgres, separate from the chat, and come back when they are due`. The brief said "rechecked on schedule". The code surfaces due loops as attention items and runs the mail and calendar checkup when the user asks. It does not run a silent cron. The caption matches the code.

Trust cards:

- **Source available.** The code is public on GitHub. Read what Harvie does with your data.
- **Asks before acting.** Nothing is sent or booked without your OK.
- **Scoped access.** Gmail and Calendar connections are scoped to your account only.
- **Local-first records.** Persona, session, and open loops live in your Postgres. You can run the API yourself. Model calls use the providers you configure.

The fourth card does not say the model runs on the laptop. That would be false: chat uses Groq, with Gemini as fallback.

Built by, in `built-by.tsx` only: "Built by Asmit Kaushal, an AI builder in India." Links to harvie.me and the GitHub repo. No photo. No LinkedIn, because that link was not approved.

## Motion

- **Reveals.** A CSS translate, 500ms, ease `[0.22, 1, 0.36, 1]`. Opacity stays 1. Sections are visible with no JavaScript, with `prefers-reduced-motion`, and if IntersectionObserver or GSAP never runs. Framer Motion still owns the memory-layer hover.
- **Hero.** The window and the three cards are in the first paint. Activity lines are present immediately. The rise is transform only.
- **GSAP** owns the follow-through loop and nothing else. One step lit at a time, 1.4s, by fading an ember overlay (opacity, not a color tween). ScrollTrigger pauses the timeline when the section is off screen. No scrub, no pin.
- **Memory layers.** Hover or focus lifts the active plate 6px and drops the others to 50% opacity. Framer owns both.
- **Send ring.** One opacity and scale pulse when the confirmation card enters. It does not loop.
- **Orb.** The hand-tuned Nucleus shader is the orb, on the landing page and in the dashboard. The plasma math stays. Ember replaces lime. Idle keeps the original slow drift. Listening adds a small pointer ripple. Thinking speeds the same field and tints it toward iris. Acting brightens the ember and adds one pulse ring. State blends in the draw loop, so the WebGL context is not rebuilt. The canvas pauses when it is off screen. Phones use the same shader. There is no second orb. On the landing page the transparent margin around the blob is cropped so the same orb fills the Meet Harvie stage, and the drawing buffer matches that size once so it stays sharp.
- **Phones and reduced motion.** Phones use the same Nucleus shader. When `prefers-reduced-motion: reduce` is set, the shader draws one still frame at the selected state and the loop shows the Act step lit. No entrance motion.

One owner per animated property. Do not animate layout, color, or filter on the same node from two libraries.

## Dashboard

The real `/app` shell uses the same ink, surfaces, and ember accent. The draggable orb is the same `Nucleus` shader. Its state follows the workspace store: idle, listening (command field focused), thinking (a message is in flight), and acting (the user confirms a suggested reply). The landing Meet Harvie section uses that same component and can hold any of the four states.

Do not change Clerk routes, the command bar contract, open loops, connections, or memory dialogs beyond color and the orb.

## Do / don't

Do

- Build every visual in code, from real Harvie behavior.
- Label sample data "Sample workspace".
- Keep one `HarvieLogo`.
- Keep focus visible in ember.
- Keep the orb below the hero, inside the product window.

Don't

- Don't show another product's screenshot, logo, or the words "HARVIE AI", "Nexus", or "Alcor".
- Don't invent customers, quotes, metrics, pricing, Slack, Notion, voice, or a mobile app.
- Don't put the WebGL orb in the hero.
- Don't use lime as the brand accent.
- Don't call the project open source until a license file exists.
