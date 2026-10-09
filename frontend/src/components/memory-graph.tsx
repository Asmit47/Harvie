'use client';

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

type MemoryKind = 'Context' | 'Client' | 'Decision' | 'Deadline' | 'Preference' | 'Open loop' | 'Commitment' | 'Fact';

type MemoryNode = {
  id: string;
  cluster: string;
  hub?: boolean;
  x: number;
  y: number;
  kind: MemoryKind;
  title: string;
  body: string;
  when: string;
  source: string;
  warm?: boolean;
  latest?: boolean;
};

type MemoryEdge = {
  a: string;
  b: string;
  cross?: boolean;
};

const NODES: MemoryNode[] = [
  {
    id: 'resume-hub',
    cluster: 'resume',
    hub: true,
    x: 48,
    y: 54,
    kind: 'Context',
    title: 'Friday, 09:12',
    body: 'You opened Harvie Friday morning. Thursday’s open loops were still here.',
    when: 'Fri',
    source: 'Resumed Friday morning',
    latest: true,
  },
  {
    id: 'resume-node',
    cluster: 'resume',
    x: 48,
    y: 40,
    kind: 'Fact',
    title: 'Resumed with context',
    body: 'Maya’s Friday deadline, Rahul’s missing numbers, and the draft waiting on review.',
    when: 'Fri',
    source: 'Resumed Friday morning',
  },
  {
    id: 'acme-hub',
    cluster: 'acme',
    hub: true,
    x: 20,
    y: 32,
    kind: 'Context',
    title: 'Acme proposal',
    body: 'Friday’s proposal ties Maya, the pricing gap, and how you like updates written.',
    when: 'Mon',
    source: 'Monday’s conversation',
  },
  {
    id: 'acme-client',
    cluster: 'acme',
    x: 9,
    y: 20,
    kind: 'Client',
    title: 'Acme · Maya',
    body: 'Maya is the contact on Acme. She asked for the proposal on Monday.',
    when: 'Mon',
    source: 'Monday’s conversation',
  },
  {
    id: 'acme-decision',
    cluster: 'acme',
    x: 34,
    y: 18,
    kind: 'Decision',
    title: 'Wait for Rahul',
    body: 'Hold the pricing section until Rahul sends the numbers. Don’t fill the gap.',
    when: 'Tue',
    source: 'Tuesday’s conversation',
  },
  {
    id: 'acme-deadline',
    cluster: 'acme',
    x: 36,
    y: 34,
    kind: 'Deadline',
    title: 'Proposal · Friday',
    body: 'The proposal goes to Maya on Friday. Everything is drafted except pricing.',
    when: 'Tue',
    source: 'Tuesday’s conversation',
  },
  {
    id: 'acme-pref',
    cluster: 'acme',
    x: 8,
    y: 42,
    kind: 'Preference',
    title: 'Concise updates',
    body: 'Lead with the decision, then the context. Skip the long recap.',
    when: 'Mon',
    source: 'Monday’s conversation',
    warm: true,
  },
  {
    id: 'acme-loop',
    cluster: 'acme',
    x: 22,
    y: 48,
    kind: 'Open loop',
    title: 'Follow up after review',
    body: 'After you review the draft, follow up with Rahul. Nothing sends until you approve it.',
    when: 'Thu',
    source: 'Thursday’s conversation',
    warm: true,
  },
  {
    id: 'tmw-hub',
    cluster: 'tomorrow',
    hub: true,
    x: 74,
    y: 24,
    kind: 'Context',
    title: 'Tomorrow, 11:00',
    body: 'Tomorrow’s meeting is at 11:00. The agenda still points at the old deck.',
    when: 'Fri',
    source: 'This morning',
  },
  {
    id: 'tmw-time',
    cluster: 'tomorrow',
    x: 62,
    y: 12,
    kind: 'Fact',
    title: 'Moved to 11:00',
    body: 'The meeting moved to 11:00. The earlier time is still the one written in the agenda.',
    when: 'Fri',
    source: 'This morning',
  },
  {
    id: 'tmw-deck',
    cluster: 'tomorrow',
    x: 88,
    y: 14,
    kind: 'Fact',
    title: 'Old deck',
    body: 'The agenda still cites the old deck. The current one is not linked yet.',
    when: 'Fri',
    source: 'This morning',
  },
  {
    id: 'tmw-pricing',
    cluster: 'tomorrow',
    x: 88,
    y: 32,
    kind: 'Commitment',
    title: 'Pricing review',
    body: 'The pricing review is the one priority that cannot move today.',
    when: 'Fri',
    source: 'This morning',
  },
  {
    id: 'tmw-agenda',
    cluster: 'tomorrow',
    x: 60,
    y: 30,
    kind: 'Open loop',
    title: 'Fix the agenda',
    body: 'Swap the old deck for the current one before 11:00.',
    when: 'Fri',
    source: 'This morning',
    warm: true,
  },
  {
    id: 'harbor-hub',
    cluster: 'harbor',
    hub: true,
    x: 78,
    y: 80,
    kind: 'Context',
    title: 'Harbor draft',
    body: 'The Harbor brief is drafted. Pricing and the follow-up still need you.',
    when: 'Thu',
    source: 'Thursday’s conversation',
  },
  {
    id: 'harbor-maya',
    cluster: 'harbor',
    x: 66,
    y: 72,
    kind: 'Fact',
    title: 'Maya asked',
    body: 'Maya asked for the proposal on Monday. She expects it Friday.',
    when: 'Mon',
    source: 'Monday’s conversation',
  },
  {
    id: 'harbor-draft',
    cluster: 'harbor',
    x: 91,
    y: 70,
    kind: 'Fact',
    title: 'Draft is ready',
    body: 'The brief is drafted. Only the pricing section is still open.',
    when: 'Thu',
    source: 'Thursday’s conversation',
  },
  {
    id: 'harbor-price',
    cluster: 'harbor',
    x: 91,
    y: 90,
    kind: 'Decision',
    title: 'Use the new pricing',
    body: 'Use the new pricing once Rahul’s numbers land. Leave the old figures out.',
    when: 'Tue',
    source: 'Tuesday’s conversation',
  },
  {
    id: 'harbor-review',
    cluster: 'harbor',
    x: 64,
    y: 90,
    kind: 'Open loop',
    title: 'Review before sending',
    body: 'The follow-up is prepared. It waits for your approval.',
    when: 'Thu',
    source: 'Thursday’s conversation',
    warm: true,
  },
  {
    id: 'style-hub',
    cluster: 'style',
    hub: true,
    x: 18,
    y: 76,
    kind: 'Context',
    title: 'How you work',
    body: 'Mornings stay clear. Updates wait until afternoon, and sending needs you.',
    when: 'Mon',
    source: 'How you work',
  },
  {
    id: 'style-morn',
    cluster: 'style',
    x: 8,
    y: 62,
    kind: 'Preference',
    title: 'Mornings for deep work',
    body: 'Keep mornings free for deep work. Don’t stack meetings before noon.',
    when: 'Mon',
    source: 'How you work',
    warm: true,
  },
  {
    id: 'style-night',
    cluster: 'style',
    x: 32,
    y: 64,
    kind: 'Commitment',
    title: 'Nothing left overnight',
    body: 'Close the day with one decision left, not a pile of open threads.',
    when: 'Thu',
    source: 'Thursday evening',
  },
  {
    id: 'style-ask',
    cluster: 'style',
    x: 8,
    y: 90,
    kind: 'Preference',
    title: 'Ask before sending',
    body: 'Drafts can be prepared ahead of time. Nothing goes out until you review it.',
    when: 'Mon',
    source: 'How you work',
    warm: true,
  },
  {
    id: 'style-short',
    cluster: 'style',
    x: 32,
    y: 90,
    kind: 'Preference',
    title: 'Short status',
    body: 'A short status after noon is enough. No end-of-day writeup.',
    when: 'Tue',
    source: 'How you work',
    warm: true,
  },
  {
    id: 'wrap-hub',
    cluster: 'wrap',
    hub: true,
    x: 44,
    y: 11,
    kind: 'Context',
    title: 'Wrapped Thursday',
    body: 'Thursday closed with the proposal drafted and one decision still open.',
    when: 'Thu',
    source: 'Thursday evening',
  },
  {
    id: 'wrap-left',
    cluster: 'wrap',
    x: 26,
    y: 10,
    kind: 'Decision',
    title: 'One decision left',
    body: 'Pricing is the only decision still open. The rest of the day can stay closed.',
    when: 'Thu',
    source: 'Thursday evening',
  },
];

const TOUR = [
  'resume-hub',
  'resume-node',
  'acme-hub',
  'acme-client',
  'acme-decision',
  'acme-deadline',
  'acme-pref',
  'acme-loop',
  'tmw-hub',
  'tmw-time',
  'tmw-deck',
  'tmw-pricing',
  'tmw-agenda',
  'harbor-hub',
  'harbor-maya',
  'harbor-draft',
  'harbor-price',
  'harbor-review',
  'style-hub',
  'style-morn',
  'style-night',
  'style-ask',
  'style-short',
  'wrap-hub',
  'wrap-left',
];

const CROSS_EDGES: MemoryEdge[] = [
  { a: 'acme-pref', b: 'style-morn', cross: true },
  { a: 'wrap-hub', b: 'tmw-time', cross: true },
  { a: 'acme-loop', b: 'style-night', cross: true },
  { a: 'harbor-review', b: 'style-short', cross: true },
];

const EDGES: MemoryEdge[] = [
  ...CROSS_EDGES,
  ...NODES.flatMap((node) => {
    if (node.hub) return [];
    const hub = NODES.find((item) => item.hub && item.cluster === node.cluster);
    return hub ? [{ a: hub.id, b: node.id }] : [];
  }),
];

const NODE_BY_ID = new Map(NODES.map((node) => [node.id, node]));
const DEFAULT_ID = 'resume-hub';

function segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const cross = (px: number, py: number, qx: number, qy: number) => px * qy - py * qx;
  const denom = cross(bx - ax, by - ay, dx - cx, dy - cy);
  if (Math.abs(denom) < 0.001) return false;
  const t = cross(cx - ax, cy - ay, dx - cx, dy - cy) / denom;
  const u = cross(cx - ax, cy - ay, bx - ax, by - ay) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentHitsRect(x1: number, y1: number, x2: number, y2: number, left: number, top: number, right: number, bottom: number) {
  const inside = (x: number, y: number) => x >= left && x <= right && y >= top && y <= bottom;
  if (inside(x1, y1) || inside(x2, y2)) return true;
  return (
    segmentsIntersect(x1, y1, x2, y2, left, top, right, top) ||
    segmentsIntersect(x1, y1, x2, y2, right, top, right, bottom) ||
    segmentsIntersect(x1, y1, x2, y2, right, bottom, left, bottom) ||
    segmentsIntersect(x1, y1, x2, y2, left, bottom, left, top)
  );
}

function placeCard(node: MemoryNode, width: number, height: number) {
  const cardWidth = Math.min(252, width - 20);
  const cardHeight = 136;
  const px = (node.x / 100) * width;
  const py = (node.y / 100) * height;
  const offsets = [
    { left: px + 22, top: py - cardHeight / 2 },
    { left: px - cardWidth - 22, top: py - cardHeight / 2 },
    { left: px + 22, top: py + 20 },
    { left: px + 22, top: py - cardHeight - 20 },
    { left: px - cardWidth - 22, top: py + 20 },
    { left: px - cardWidth - 22, top: py - cardHeight - 20 },
    { left: px - cardWidth / 2, top: py + 24 },
    { left: px - cardWidth / 2, top: py - cardHeight - 24 },
  ];

  const clamped = offsets.map((offset) => ({
    left: Math.max(10, Math.min(offset.left, width - cardWidth - 10)),
    top: Math.max(10, Math.min(offset.top, height - cardHeight - 10)),
  }));

  const gaps = [0, 1, 2].flatMap((row) =>
    [0, 1, 2, 3].map((column) => ({
      left: 10 + column * ((width - cardWidth - 20) / 3),
      top: 10 + row * ((height - cardHeight - 20) / 2),
    })),
  );

  const candidates = [...clamped, ...gaps];

  function score(candidate: { left: number; top: number }) {
    let penalty = 0;
    const coversPoint = (x: number, y: number, pad: number) =>
      x > candidate.left - pad &&
      x < candidate.left + cardWidth + pad &&
      y > candidate.top - pad &&
      y < candidate.top + cardHeight + pad;

    if (coversPoint(px, py, 14)) penalty += 8000;

    for (const other of NODES) {
      if (other.id === node.id) continue;
      const ox = (other.x / 100) * width;
      const oy = (other.y / 100) * height;
      if (coversPoint(ox, oy, 10)) penalty += 1200;
    }

    for (const edge of EDGES) {
      if (edge.cross) continue;
      const from = NODE_BY_ID.get(edge.a);
      const to = NODE_BY_ID.get(edge.b);
      if (!from || !to || from.cluster !== node.cluster || to.cluster !== node.cluster) continue;
      const hits = segmentHitsRect(
        (from.x / 100) * width,
        (from.y / 100) * height,
        (to.x / 100) * width,
        (to.y / 100) * height,
        candidate.left,
        candidate.top,
        candidate.left + cardWidth,
        candidate.top + cardHeight,
      );
      if (hits) penalty += 650;
    }

    const centerX = candidate.left + cardWidth / 2;
    const centerY = candidate.top + cardHeight / 2;
    penalty += Math.hypot(centerX - px, centerY - py) * 0.2;
    return penalty;
  }

  const best = candidates.reduce((winner, candidate) => (score(candidate) < score(winner) ? candidate : winner));
  return { ...best, width: cardWidth };
}

export function MemoryGraph() {
  const detailId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [pinnedId, setPinnedId] = useState(DEFAULT_ID);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [roaming, setRoaming] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setBox({ w: stage.clientWidth, h: stage.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const shownId = hoveredId ?? pinnedId;
  const shown = NODE_BY_ID.get(shownId) ?? NODE_BY_ID.get(DEFAULT_ID)!;
  const dimming = hoveredId != null || roaming;
  const docked = box.w > 0 && box.w < 520;

  const cardStyle = useMemo(() => {
    if (box.w === 0) return undefined;
    const place = placeCard(shown, box.w, box.h);
    return { left: place.left, top: place.top, width: place.width };
  }, [box.h, box.w, shown]);

  function focusMemory(id: string) {
    setPinnedId(id);
    setHoveredId(null);
    setRoaming(true);
    requestAnimationFrame(() => {
      stageRef.current?.querySelector<HTMLButtonElement>(`[data-memory-id="${id}"]`)?.focus({ preventScroll: true });
    });
  }

  function step(direction: 1 | -1) {
    const current = TOUR.indexOf(hoveredId ?? pinnedId);
    const next = (current + direction + TOUR.length) % TOUR.length;
    focusMemory(TOUR[next]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'Escape') {
      setPinnedId(DEFAULT_ID);
      setHoveredId(null);
      setRoaming(false);
    }
  }

  return (
    <div className="memory-graph" onKeyDown={onKeyDown}>
      <div className="graph-head">
        <span className="graph-title"><span className="graph-live" /> Memory graph</span>
        <div className="graph-head-aside">
          <span className="graph-head-note">Built from your conversations</span>
          <div className="memory-graph-nav">
            <button type="button" onClick={() => step(-1)}>
              <ChevronLeft aria-hidden="true" size={13} />
              Prev
            </button>
            <button type="button" onClick={() => step(1)}>
              Next
              <ChevronRight aria-hidden="true" size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className={`memory-stage${docked ? ' is-docked' : ''}`}>
      <div
        ref={stageRef}
        className="memory-constellation"
        role="group"
        aria-label="Memories from this week. Hover, or use the arrow keys."
      >
        <svg className="memory-constellation-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {EDGES.map((edge) => {
            const from = NODE_BY_ID.get(edge.a);
            const to = NODE_BY_ID.get(edge.b);
            if (!from || !to) return null;
            const touches = from.cluster === shown.cluster || to.cluster === shown.cluster;
            const lit = !edge.cross && (from.cluster === shown.cluster && to.cluster === shown.cluster);
            const crossLit = Boolean(edge.cross) && touches && dimming;
            const dim = dimming && !touches;
            const className = [
              'memory-edge',
              edge.cross ? 'is-cross' : '',
              lit || crossLit ? 'is-lit' : '',
              dim ? 'is-dim' : '',
            ].filter(Boolean).join(' ');
            return (
              <line
                key={`${edge.a}-${edge.b}`}
                className={className}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              />
            );
          })}
        </svg>

        {NODES.map((node) => {
          const active = node.id === shown.id;
          const related = dimming && node.cluster === shown.cluster;
          const dim = dimming && node.cluster !== shown.cluster;
          const className = [
            'memory-node',
            node.hub ? 'is-hub' : '',
            node.warm ? 'is-warm' : '',
            node.latest ? 'is-latest' : '',
            active ? 'is-active' : '',
            related && !active ? 'is-related' : '',
            dim ? 'is-dim' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={node.id}
              type="button"
              className={className}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              data-memory-id={node.id}
              tabIndex={node.id === pinnedId ? 0 : -1}
              aria-pressed={node.id === pinnedId}
              aria-label={`${node.kind}, ${node.when}. ${node.title}. ${node.body}`}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setHoveredId(node.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setHoveredId((current) => (current === node.id ? null : current));
              }}
              onFocus={() => {
                setPinnedId(node.id);
              }}
              onClick={() => {
                setPinnedId(node.id);
                setRoaming(true);
              }}
            >
              <span className="memory-node-mark" />
            </button>
          );
        })}

      </div>
        {(docked || cardStyle) ? (
          <div id={detailId} className="memory-card" style={docked ? undefined : cardStyle} aria-hidden="true">
            <div className="memory-card-kicker">
              <span>{shown.kind}</span>
              <span>{shown.when}</span>
            </div>
            <strong>{shown.title}</strong>
            <p>{shown.body}</p>
            <div className="memory-card-meta">
              {shown.latest ? <span className="memory-card-latest">Latest</span> : null}
              <span>{shown.source}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="graph-strip">
        <span className="graph-strip-chip">Tue 16:40 · conversation</span>
        <ArrowRight size={13} aria-hidden="true" />
        <span className="graph-strip-chip is-saved">Saved to memory</span>
        <ArrowRight size={13} aria-hidden="true" />
        <span className="graph-strip-chip is-resumed">Fri 09:12 · resumed with context</span>
      </div>
    </div>
  );
}
