# Harvie — Web Design Direction

## Design read

Harvie is a work assistant for people who need important context, commitments, and follow-ups to survive across tools and time. The marketing site should feel calm, capable, and unusually clear: Linear's disciplined hierarchy, Attio's product-led storytelling, and Resend's developer-friendly specificity, interpreted through Harvie's own graphite-and-lime identity. This is a reference-informed direction, not a reproduction of any reference site.

## Product and audience

- **Product:** Harvie, a business assistant that remembers useful context, connects work tools, and follows through on open loops.
- **Audience:** Busy founders and professionals who coordinate work across email, calendars, conversations, and tasks.
- **Primary visitor question:** “Will this remember what matters and help me finish it?”
- **Primary action:** Get started / Open Harvie.
- **Secondary action:** Understand how Harvie works.
- **Voice:** Direct, human, specific, quietly confident. Explain outcomes before technical architecture; avoid claims of autonomous action where a person must review or approve.

## Design principles

1. **Clarity earns attention.** Give each section one job and a strong headline. Keep navigation and decorative details subordinate to the message.
2. **Show the product doing real work.** Use believable examples of memory, connected context, and follow-up. Avoid generic AI imagery and empty dashboard chrome.
3. **Make continuity visible.** The visual story moves from scattered signals to connected context to a thoughtful next action.
4. **Motion explains state.** Every animation must clarify a relationship, transition, or piece of product behavior.
5. **Trust through restraint.** Use calm surfaces, legible type, real details, and clear approval points. Avoid implying Harvie sends or changes things without user intent.

## Visual system

### Color

Keep the established dark Harvie identity and use color with restraint. Treat these values as starting tokens; preserve the existing implementation tokens unless the design is deliberately revised.

| Token | Value | Use |
|---|---|---|
| Graphite / page | `#0A0A0A` | Main background |
| Raised surface | `#18181B` | Product examples and content panels |
| Elevated surface | `#1F1F23` | Popovers and overlays |
| Primary text | `#FFFFFF` | Headlines and high-priority content |
| Secondary text | `#A1A1AA` | Body copy and supporting information |
| Quiet border | `#27272A` | Separation where spacing alone is insufficient |
| Harvie lime | `#A3E635` | Primary action, active state, and meaningful focus |
| Soft lime | `#D9F99D` | Lime hover and restrained emphasis |
| Warm highlight | `#F4C98A` | Rare human/context signal; never a second brand accent |

Do not use lime as a page-wide glow, text decoration, or fill for every control. Avoid purple gradients, glass panels as a default surface, and low-contrast gray-on-gray text.

### Typography

- Preserve the existing Sora display face, Manrope reading face, and JetBrains Mono utility face when they are already loaded.
- Headlines: compact, confident sans-serif; negative tracking used sparingly; keep line lengths readable and breaks intentional.
- Body: plain-language sans-serif, comfortable leading, generally 60–70 characters per line.
- Mono: small labels, timestamps, code, and product metadata only. Do not set long marketing copy in monospace.
- Establish a small, consistent scale for display, section headings, body, small text, and metadata. Never shrink important copy to preserve a decorative composition.

### Layout and surfaces

- Use a centered content frame with generous desktop margins and consistent gutters. Let product scenes and a few key examples span wider than copy blocks.
- Keep the primary navigation to one line on desktop, with a clearly dominant action.
- Alternate section composition for a deliberate scroll rhythm: copy with scene, full-width product evidence, paired explanation, then closing action. Do not repeat the same two-column card pattern in every section.
- Prefer open space and a few distinct surfaces over cards nested inside cards. Use borders only to clarify grouping or interaction.
- Use rounded corners as a supporting detail, not the main visual identity. Buttons may be pill-shaped; product panels should have quieter, more functional radii.
- Responsive layout is intentional: stack content in a logical reading order, keep the core product story visible on small screens, and replace heavy 3D with a lightweight static composition where needed.

## Page narrative

1. **Hero — Keep work from falling through the cracks.** Say what Harvie does in one headline and one supporting sentence. Give the primary action immediate visibility. Pair the message with the beginning of the 3D story: scattered, distinct work signals.
2. **Scattered work — Context lives in too many places.** Show a small set of recognizable inputs (email, calendar, notes, tasks) with real labels and meaningful differences. The scene begins drawing them into a shared context.
3. **Memory — The relationship survives the conversation.** Show a realistic relationship or project record linking a person, preference, decision, amount, and next commitment. Avoid fake precision or invented performance metrics.
4. **Follow-through — Notice, understand, prepare, ask.** Demonstrate a due item or change becoming a grounded suggestion, with an explicit review/approve action. Keep the example credible and legible.
5. **Tools — Work with the tools people already use.** Describe supported connections only when they are confirmed in the product. Show a concise product view or integration proof instead of a decorative logo wall.
6. **Closing action — Start with the work you already have.** Restate the core benefit and repeat the primary action. Keep the footer compact and useful.

Sections may be reordered to fit the actual product capabilities, but the narrative must remain: scattered input → retained context → useful next step → user-controlled action.

## Three.js experience

### Art direction

Create one continuous, restrained spatial metaphor for Harvie's memory and follow-through: a handful of softly illuminated signal forms begin apart, travel along thin paths, and resolve into a coherent orbit around a stable central point. As the story reaches follow-through, one clear path extends outward as a proposed next action. It should feel like information gaining structure, not a sci-fi brain, chatbot mascot, or generic glowing AI sphere.

The scene should support the page copy rather than compete with it. Use graphite, off-white light, and a small amount of Harvie lime. Keep objects large and few enough to read immediately; no dense particle field, neon tunnel, lens flare, or decorative starfield.

### Scroll choreography

Tie the scene to a single page-level scroll progress from 0 to 1. Scroll progress controls a finite timeline; it must not hijack scrolling or trap the visitor.

| Page progress | Scene state | Narrative purpose |
|---|---|---|
| `0.00–0.18` | Separate signal forms enter a wide, calm field | Establish fragmented work |
| `0.18–0.42` | Forms move along visible paths and gather into a loose cluster | Show connected inputs |
| `0.42–0.66` | The cluster settles into a balanced orbit around a stable center | Show memory and continuity |
| `0.66–0.86` | One path resolves into a single highlighted next-step marker | Show preparation and follow-through |
| `0.86–1.00` | Scene settles; highlight softens and holds | Leave room for the closing action |

Movement should be smooth, slow enough to track with the narrative, and reversible when the user scrolls upward. Use bounded position, scale, opacity, and rotation changes; avoid perpetual motion that distracts from reading. The scene should have a clear resting pose when the visitor stops scrolling.

### Implementation contract

- Build the scene as an isolated client-side Three.js component, loaded lazily after the primary page content. Keep semantic headings, copy, navigation, and calls to action in normal HTML.
- Use the existing motion stack for DOM transitions if useful, and drive the Three.js scene from a shared, normalized scroll-progress value. Do not attach competing page-level scroll loops.
- Update only the scene's necessary transforms per frame; avoid React state updates on every frame. Dispose of geometries, materials, renderers, observers, and listeners on unmount.
- Use a capped device pixel ratio and a modest geometry/material budget. Pause or reduce rendering when the canvas is off-screen or the tab is hidden.
- Provide a meaningful static HTML/CSS fallback while the canvas loads, when WebGL is unavailable, and on constrained/mobile devices. The fallback must communicate the same scattered-to-connected-to-action story.
- Honor `prefers-reduced-motion`: show the settled composition or a short, non-looping transition, with no scroll-linked spatial movement. Never make essential information available only inside the canvas.
- The canvas is decorative: mark it as hidden from assistive technology, avoid focusable objects, and maintain contrast and reading order in surrounding HTML.
- Keep page scroll native. Do not use scroll-jacking, pinned sections that prevent ordinary navigation, or horizontal scrolling as a required interaction.

## Motion beyond Three.js

- Use subtle, short entrance transitions for content as it becomes relevant. Prefer opacity and small positional changes; avoid animating every line independently.
- Use motion to reveal relationships in product examples (for example, a note connecting to a person and a next step), not to add ornamental activity.
- Give buttons and controls clear hover, focus, pressed, and disabled states. Motion must not be the only indication of state.
- Avoid perpetual pulsing, animated gradients, cursor-chasing, excessive parallax, and scroll-triggered text effects that slow reading.
- All motion must respect reduced-motion settings and remain usable with keyboard and touch input.

## Components and content rules

- **Navigation:** Brand mark/name, a small set of useful destinations, sign-in when relevant, and one primary action. No competing CTA cluster.
- **Primary button:** High contrast, concise action label, visible keyboard focus, generous touch target. Use Harvie lime only for the most important action.
- **Secondary action:** Quiet outline or text treatment, subordinate to the primary action.
- **Product example:** Show a believable, legible state with enough context to explain why it matters. Do not invent customer names, testimonials, integrations, metrics, or capabilities.
- **Trust evidence:** Use verifiable product behavior and supported integrations. Do not add fake logos or fictional usage numbers.
- **Copy:** Prefer concrete verbs (“remembers”, “connects”, “prepares”, “asks you to review”) over vague AI claims. Keep paragraphs short and explain what the user gains.

## Accessibility and responsive behavior

- Use semantic landmarks, a logical heading hierarchy, descriptive link/button names, visible focus, and keyboard-operable controls.
- Meet WCAG AA contrast for text and interactive states; do not rely on the lime glow, color alone, or the Three.js canvas to convey meaning.
- Keep body and control text comfortably readable at mobile sizes. Preserve source order when columns collapse and prevent horizontal overflow.
- Honor reduced motion, browser zoom, and touch input. Provide a static equivalent for every meaningful canvas state.
- Keep CTAs and core copy usable before JavaScript and WebGL finish loading.

## Quality bar

- A visitor can explain what Harvie does and what happens after clicking the primary action from the first screen.
- Every section advances the same product story; no section exists only to add length or motion.
- The Three.js scene is coherent with the page narrative, light enough to be progressive enhancement, and never blocks access to content.
- Motion is reversible, purposeful, and comfortable at normal scroll speed.
- The design feels specific to Harvie through its context-and-follow-through story, even when the reference brands are removed.

## Reference study

- [Linear](https://linear.app/) — restrained visual hierarchy, product craft, and clear feature narrative.
- [Attio](https://attio.com/) — product shown in realistic, interactive-looking states and a connected story across workflows.
- [Resend](https://resend.com/) — direct developer-oriented language, concrete product evidence, and approachable technical detail.

These are reference observations for direction only. Do not copy their layouts, wording, brand marks, product UI, or animations.

## Product UI guide

The sections above describe the public site. This guide covers the signed-in workspace (dashboard, conversation, follow-ups, Connections). The workspace is quieter than the site: one dark canvas, a few translucent surfaces, small type, and lime used only to say "active" or "done". Dashboards are not decoration. If a piece of chrome does not help someone read, choose, or act, remove it.

Where the site guidance above says to avoid glass as a default surface, the workspace is the exception: translucent surfaces are its standard because they let the Nucleus and canvas stay present behind the content. Everything else in that guidance still applies.

### Tokens

These are defined in `frontend/src/app/globals.css`. Use the variables, not literals.

| Token | Value | Use |
|---|---|---|
| `--ui-radius-chip` | 8px | Tags, badges, keyboard hints |
| `--ui-radius-control` | 12px | Inputs, small cards, list tiles, menus |
| `--ui-radius-card` | 16px | Standalone cards (workspace card, chat connection card) |
| `--ui-radius-shell` | 18px | Large containers that hold other surfaces (sidebar, Connections pane) |
| `--ui-radius-pill` | 999px | Buttons, the command bar, round icon buttons |
| `--ui-glass-border` | `rgba(255,255,255,.08)` | 1px edge on every translucent surface |
| `--ui-glass-fill` | `rgba(255,255,255,.035)` | Surface that sits on top of another surface |
| `--ui-glass-shell` | `rgba(24,24,27,.6)` | Container that sits on the canvas |

### Curves

- **Nested curves match.** An inner surface's radius is its container's radius minus the gap between them. A 6px inset inside an 18px shell gives 12px tiles. Never put a larger radius inside a smaller one.
- Buttons and the command bar are pills. Containers are not. Do not mix pill and 16px+ radii on the same row.
- One radius per level. A list of tiles uses a single radius, not a mix.
- Avatars and status dots are circles. Nothing else is.

### Translucent surface recipe

1. **Shell** (sits on the canvas): `--ui-glass-shell` fill, 1px `--ui-glass-border`, `backdrop-filter: blur(16px)`, and `inset 0 1px 0 rgba(255,255,255,.05)` for a faint top edge. No drop shadow.
2. **Tile** (sits on a shell): `--ui-glass-fill` fill, 1px `--ui-glass-border`, same inset highlight at .04. On hover raise the border to `rgba(255,255,255,.14)` and the fill to about .055. Never blur a tile inside a blurred shell.
3. Never place a third translucent layer on a tile. If something needs to stand out inside a tile, use text weight or a lime state, not another box.
4. Under `prefers-reduced-transparency` every shell becomes solid `#18181B` with no blur.

### Typography

- The workspace uses **Inter** (`--font-inter`) everywhere. Sora, Manrope, and mono belong to the public site.
- Page title 20px / 500 / -0.02em. Pane or section title 14px / 500. Tile name 14px / 500. Body and descriptions 12–13px with 1.45–1.5 leading. Meta and counts 11–12px with tabular numerals. Uppercase labels 11px / 600 / 0.12em, used once per group at most.
- Text colors: `#FAFAFA` for names and titles, `#A1A1AA` for descriptions and controls at rest, `#71717A` for counts, hints, and labels. Do not go darker than `#71717A` for readable text.
- Descriptions are one sentence and clamp at two lines. Names truncate on one line.

### Color and state

- Surfaces are neutral. Color appears only as state.
- Lime has two meanings: the next action on hover (`#D9F99D` text on a lime wash `rgba(163,230,53,.1)` with a `.45` border), and a completed or connected state (same wash with a `.28` border). It is never a fill for resting controls.
- Errors use `#FDA4AF` text with no box. Waiting states use `#A1A1AA` text and a spinner.

### Spacing

- 4px base. Common steps: 4, 6, 8, 12, 16, 24. Gaps between tiles are 6px (the same as the shell inset, so the rhythm is continuous). Between page regions use 16px.
- Tiles are 12–14px inside. Shell headers get 14px 18px 10px.
- The workspace content area keeps 92px on the left for the sidebar, 36px on the right, and 28px on top. On small screens the sidebar becomes a top bar and these collapse.

### Controls

- Round icon button: 28px, 1px `rgba(255,255,255,.12)` border, `rgba(255,255,255,.04)` fill, 14–15px icon. Hover applies the lime action state.
- Pill button: 36px high, 14px side padding, 13px / 500.
- Search field: 36px high, `--ui-radius-control`, same border and fill as a tile, a leading 15px icon, and a clear button once it has text. Focus raises the border to lime `.45`; do not add a glow.
- Rail item (side list): 32px high, 10px radius, transparent at rest, `rgba(255,255,255,.04)` on hover, `rgba(255,255,255,.08)` and white text when current. Counts sit right-aligned.

### Motion

- 150ms ease for color, border, and fill changes. No movement on hover.
- Loading uses a quiet pulse on placeholder tiles and a spinning icon inside the control that triggered the work.
- Respect `prefers-reduced-motion`.

### Connections view

The Connections view replaces the conversation inside the same workspace frame, with the sidebar still in place. It is not a dialog and the page itself never scrolls. Only the list inside the pane scrolls.

- **Header:** title with a quiet count line ("584 apps · 3 connected"), search, and a pill "Workspace" button that returns to the conversation.
- **Rail** (176px): Popular, Connected, All apps, then the categories with counts. Choosing one swaps the pane. Searching overrides the rail and searches every app by name first, then description and category.
- **Pane:** one shell containing a title row ("Popular", "Developer tools", or "Results for…") with a result count, and a scrolling grid of tiles.
- **Tile:** name, one-sentence description, and a single round "+" control. No logos, icons, or illustrations; the name carries the identity. Once connected the "+" becomes a lime check and the tile stops responding. Waiting and error notes appear in the tile under the description.
- **Grid:** `repeat(auto-fill, minmax(230px, 1fr))` with 6px gaps. On narrow screens it is one column and the rail becomes a horizontal strip.
- **Content:** Popular is the top apps by Composio usage. Categories group Composio's 80 fine-grained labels into 12 (Communication, Productivity, Project management, Developer tools, AI, Sales & CRM, Marketing, Commerce, Finance, Analytics, Design & media, People & learning). Only apps with at least 20 actions are listed so every entry is useful to an assistant. Harvie's curated apps (Gmail, Calendar, Docs, Drive, Tasks, Slack, Stripe) use dedicated tools; the rest use the generic find-then-run tools and always confirm before changing anything.
