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

Fill in `NVIDIA_API_KEY` in `.env` when using NVIDIA hosted endpoints. `MEM0_API_KEY` and `SUPERMEMORY_API_KEY` are optional; those tiers are disabled when the keys are missing. The default NVIDIA model is `z-ai/glm-5.2`.

For hosted NVIDIA endpoints, leave `NVIDIA_BASE_URL` empty. For a self-hosted NVIDIA NIM endpoint, set `NVIDIA_BASE_URL` to the OpenAI-compatible root URL; `NVIDIA_API_KEY` is only needed if that endpoint requires bearer auth.

```env
NVIDIA_BASE_URL=http://localhost:8000/v1
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
  tools/        tool registry and MCP placeholders
  api/          FastAPI app and routes
  entrypoints/  CLI entrypoint
```
