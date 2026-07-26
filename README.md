# Nexus

Nexus is a LangGraph business assistant with three memory tiers:

- Tier 1: stable persona from `nexus/memory/persona.json` plus Mem0 learned patterns.
- Tier 2: session working memory through a SQLite LangGraph checkpointer.
- Tier 3: optional Supermemory knowledge search/save tools.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `GROQ_API_KEY` for the primary chat model and `GOOGLE_API_KEY` for the Gemini fallback/small-check model. `MEM0_API_KEY` and `SUPERMEMORY_API_KEY` are optional; those tiers are disabled when the keys are missing. The default chat model is Groq `openai/gpt-oss-120b`; the default fallback model is `gemini-3.5-flash`.

Gmail and Google Calendar tools use Composio direct tool execution. Set
`COMPOSIO_API_KEY` and connect Gmail/Calendar in Composio for `COMPOSIO_USER_ID`.

Authorize Google integrations from the CLI:

```bash
python -m nexus auth gmail
python -m nexus auth calendar
```

## Run The API

```bash
uvicorn nexus.api.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Chat:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hey nexus","session_id":null}'
```

Close and summarize a session:

```bash
curl -X POST http://localhost:8000/session/close \
  -H "Content-Type: application/json" \
  -d '{"session_id":"SESSION_ID_FROM_CHAT"}'
```

#kill the api- lsof -ti :8000 | xargs kill

## Run The CLI

```bash
python -m nexus.entrypoints.cli
```

## Package Layout

```text
nexus/
  core/         config, LLM, state, prompts, graph
  memory/       persona, session, and knowledge memory tiers
  nodes/        one LangGraph node per file
  tools/        tool registry
  api/          FastAPI app and routes
  entrypoints/  CLI entrypoint
```
