# Harvie

Harvie is a LangGraph business assistant with three memory tiers:

- Tier 1: per-user persona fields with source, confidence, and status metadata in PostgreSQL.
- Tier 2: session working memory through a PostgreSQL LangGraph checkpointer.
- Tier 3: optional Supermemory knowledge search/save tools.

Open loops (tasks, commitments, follow-ups, waiting items, and unresolved questions)
are stored separately in PostgreSQL, so they survive expired chat sessions. The API exposes
them at `GET/POST /open-loops`, with `PATCH /open-loops/{id}`, and complete/snooze actions.
Chat responses include separate `attention_items` for deterministic overdue or due-soon loops.

## Agent architecture (v2)

- **Jev gatekeeper** (`harvie/core/jev.py`): every chat turn is gated by the
  TypeSafe AI System One SDK in one batched call — `openjev-latest` is tried
  first, then `laya-1.0` if unavailable, followed by deterministic keyword
  routing if both fail. The gate decides turn kind (chat / background
  work / status check), intent mode, which app tool groups are relevant, which
  context sources to load, the model tier (quick vs deep), and whether the turn
  carries learnable preferences or commitments. Without `TYPESAFE_API_KEY`
  (or `JEV_ENABLED=false`) Harvie falls back to deterministic keyword gating.
- **Dual-lane chat/work**: `turn_kind=work` queues a durable `task_runs` row and
  replies instantly; a background worker executes the objective on its own
  checkpointer thread while the user keeps chatting. Outbound actions proposed
  by a task become `pending_actions` and wait for approval — never auto-executed.
- **Post-turn learning** (`harvie/memory/learning_worker.py`): runs after the
  response, only when Jev flags a preference signal or commitment. Learns the
  fixed persona fields, free-form preferences (stored in
  `persona_profiles.profile.preferences`), and commitments (auto-created open
  loops), all with the same confirmed/inferred + confidence provenance rules.
- **Proactive loops** (`harvie/loops/`): an APScheduler heartbeat observes
  Jev-selected connected sources every `LOOP_HEARTBEAT_MINUTES` (default 30),
  diffs against `event_snapshots`, and triages with Jev — Harvie's own records
  (open loops) update automatically; anything touching the outside world
  becomes a pending action in the feed. Quiet hours and nudge preferences are
  respected. A daily morning briefing lands in the feed at `LOOP_BRIEFING_HOUR`.
- **Feed** (`harvie/memory/feed.py`, `/feed`, `/pending-actions`, `/tasks`):
  the in-app surface for everything proactive — nudges, briefings, task
  progress, and approval requests with unread badge in the sidebar.
- **Web search**: `web_search` and `read_page` tools backed by Tavily
  (`TAVILY_API_KEY`), gated by Jev like every other tool group.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

You also need a running PostgreSQL instance. For local development:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb harvie
```
# Stop PostgreSQL (frees up port 5432, saves RAM)
brew services stop postgresql@16
# Start it again
brew services start postgresql@16
# Restart
brew services restart postgresql@16
# Check status
brew services list | grep postgres


Fill in `GROQ_API_KEY` for the primary chat model and `GOOGLE_API_KEY` for the Gemini fallback/small-check model. `SUPERMEMORY_API_KEY` is optional; Harvie continues with persona and session memory when it is missing. The default chat model is Groq `openai/gpt-oss-120b`; the default fallback model is `gemini-3.5-flash`.

Set `TYPESAFE_API_KEY` to enable Jev routing (`TYPESAFE_BASE_URL` defaults to `https://api.codiv.ai`) and `TAVILY_API_KEY` to enable web search and page extraction. Both keys are optional; without them Harvie continues without those provider-backed features.

Set `DATABASE_URL` in `.env` to the PostgreSQL database created above:

```bash
DATABASE_URL=postgresql://localhost:5432/harvie
```

Gmail, Google Calendar, Google Docs, Google Drive, Google Tasks, Slack, and
read-only Stripe tools use Composio. Set `COMPOSIO_API_KEY`; production
connections are scoped to the authenticated Clerk user ID. `COMPOSIO_USER_ID`
is only an optional local CLI fallback.

Each authenticated account has its own persona profile in PostgreSQL. New
accounts open directly in the dashboard: Harvie messages first, asks for a name,
and offers Gmail and Calendar connection cards inside the conversation. The
Connections view lists 580+ Composio apps with search, Popular, Connected, and
category sections. Docs, Drive, Tasks, Slack, and Stripe have dedicated tools;
other connected apps are reached through generic find-then-run tools. The app
directory is cached for a day under `COMPOSIO_CACHE_DIR`. Welcome
replies are scripted; unrelated questions and
tasks use the normal LLM/tool flow. Progress, suggestions, and cards survive reloads
in the user's welcome thread. Other
persona fields start as unknown placeholders and can be filled or updated from
relevant user messages over time. Conversation text itself is not copied into
the persona record.

Authorize Google integrations from the CLI:

```bash
python -m harvie auth gmail
python -m harvie auth calendar
python -m harvie auth docs
python -m harvie auth drive
python -m harvie auth tasks
python -m harvie auth slack
python -m harvie auth stripe
```

## Run The API

```bash
uvicorn harvie.api.main:app --reload --port 8000
```

## Run The Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Configure Clerk keys and the backend
proxy settings in the frontend environment before signing in.

Health check:

```bash
curl http://localhost:8000/health
```

Chat:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "x-harvie-user-id: local_user" \
  -H "x-harvie-proxy-secret: YOUR_HARVIE_API_PROXY_SECRET" \
  -d '{"message":"hey harvie","session_id":null}'
```

Close and summarize a session:

```bash
curl -X POST http://localhost:8000/session/close \
  -H "Content-Type: application/json" \
  -H "x-harvie-user-id: local_user" \
  -H "x-harvie-proxy-secret: YOUR_HARVIE_API_PROXY_SECRET" \
  -d '{"session_id":"SESSION_ID_FROM_CHAT"}'
```

The direct API endpoints require these proxy headers. The browser UI supplies them through the same-origin Next.js proxy.

## Run Tests

With the project virtual environment activated:

```bash
python -m pytest tests/ -v
```

The suite covers the Jev gate (fallback, parsing, tool subsetting), feed and
pending-action stores, the durable task queue, API authentication and identity
scoping, preference learning rules, and the learning dedup guard. Tests use a
real local PostgreSQL; start it first.

#kill the api- lsof -ti :8000 | xargs kill

## Production Deployment (Render + Vercel)

Harvie is designed to run the FastAPI service on **Render** and the Next.js frontend on **Vercel**.

### Backend on Render
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn harvie.api.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `PORT`: Automatically provided by Render.
  - `DATABASE_URL`: Automatically provided by the Render PostgreSQL add-on (configured in `render.yaml`).
  - `HARVIE_API_PROXY_SECRET`: Shared secret used to authenticate requests forwarded from the Next.js proxy.
  - `GROQ_API_KEY`: Groq API key for the primary LLM.
  - `GOOGLE_API_KEY`: Google Gemini API key for fallback.
  - `COMPOSIO_API_KEY`, `SUPERMEMORY_API_KEY`: As needed.
  - `HARVIE_ALLOWED_ORIGINS`: (Optional) Comma-separated allowed origins if direct browser CORS is needed.

A [`render.yaml`](render.yaml) Blueprint is included in the repository root.

### Frontend on Vercel
- **Root Directory**: `frontend`
- **Environment Variables**:
  - `HARVIE_API_URL`: **Required in production.** The public HTTPS URL of your Render backend (e.g., `https://harvie-api.onrender.com`), without trailing slash.
  - `HARVIE_API_PROXY_SECRET`: Identical to the secret configured on Render.
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key.
  - `CLERK_SECRET_KEY`: Clerk secret key.


## Run The CLI

```bash
python -m harvie.entrypoints.cli
```

## Package Layout

```text
harvie/
  core/          config, LLM, state, prompts, graph, Jev gatekeeper
  memory/        persona, session, knowledge tiers; feed, pending actions, learning worker
  nodes/         one LangGraph node per file
  tools/         tool registry and Jev-driven per-turn tool subsetting
  tasks/         durable background work queue and runner (the work lane)
  loops/         heartbeat observer, morning briefing, scheduler
  integrations/  Composio-backed connectors plus Tavily web search
  api/           FastAPI app and routes
  entrypoints/   CLI entrypoint
```
