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
