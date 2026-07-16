import warnings
from langchain_openai import ChatOpenAI
from nexus.core.config import settings

if not settings.OPENROUTER_API_KEY:
    raise EnvironmentError("OPENROUTER_API_KEY is not set. Nexus requires an LLM to run.")


def _build_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.NEXUS_LLM_MODEL,
        temperature=0.2,
        max_tokens=4096,
        api_key=settings.OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )


class _LazyBoundLLM:
    def __init__(self, parent: "_LazyChatOpenAI", tools):
        self._parent = parent
        self._tools = tools
        self._bound = None

    def _get_bound(self):
        if self._bound is None:
            self._bound = self._parent._get_client().bind_tools(self._tools)
        return self._bound

    def invoke(self, *args, **kwargs):
        return self._get_bound().invoke(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._get_bound(), name)


class _LazyChatOpenAI:
    """Delay ChatOpenAI construction until the first real model call."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = _build_llm()
        return self._client

    def bind_tools(self, tools):
        return _LazyBoundLLM(self, tools)

    def invoke(self, *args, **kwargs):
        return self._get_client().invoke(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._get_client(), name)


llm = _LazyChatOpenAI()
