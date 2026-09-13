from typing import Callable

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from harvie.core.config import settings


def _build_chat_llm() -> ChatGroq:
    if not settings.GROQ_API_KEY:
        raise EnvironmentError("GROQ_API_KEY is not set. Check your .env file.")
    if not settings.GROQ_LLM_MODEL:
        raise EnvironmentError("GROQ_LLM_MODEL is not set. Check your .env file.")
    return ChatGroq(
        model=settings.GROQ_LLM_MODEL,
        temperature=0.2,
        max_tokens=4096,
        groq_api_key=settings.GROQ_API_KEY,
    )


def _build_fallback_llm() -> ChatGoogleGenerativeAI:
    if not settings.GOOGLE_API_KEY:
        raise EnvironmentError("GOOGLE_API_KEY is not set. Check your .env file.")
    if not settings.GOOGLE_LLM_MODEL:
        raise EnvironmentError(
            "GOOGLE_LLM_MODEL is not set. Check your .env file."
        )
    return ChatGoogleGenerativeAI(
        model=settings.GOOGLE_LLM_MODEL,
        temperature=0.2,
        max_output_tokens=4096,
        google_api_key=settings.GOOGLE_API_KEY,
    )


class _LazyBoundLLM:
    def __init__(self, parent: "_LazyLLM", tools):
        self._parent = parent
        self._tools = tools
        self._bound = None
        self._fallback_bound = None

    def _get_bound(self):
        if self._bound is None:
            self._bound = self._parent._get_client().bind_tools(self._tools)
        return self._bound

    def _get_fallback_bound(self):
        if self._fallback_bound is None:
            fb = self._parent._get_fallback_client()
            if fb is not None:
                self._fallback_bound = fb.bind_tools(self._tools)
        return self._fallback_bound

    def invoke(self, *args, **kwargs):
        try:
            return self._get_bound().invoke(*args, **kwargs)
        except Exception:
            fb = self._get_fallback_bound()
            if fb is not None:
                return fb.invoke(*args, **kwargs)
            raise

    def __getattr__(self, name):
        return getattr(self._get_bound(), name)


class _LazyLLM:
    def __init__(
        self,
        builder: Callable[[], ChatGroq | ChatGoogleGenerativeAI],
        fallback_builder: Callable[[], ChatGoogleGenerativeAI] | None = None,
    ):
        self._builder = builder
        self._fallback_builder = fallback_builder
        self._client = None
        self._fallback_client = None

    def _get_client(self):
        if self._client is None:
            self._client = self._builder()
        return self._client

    def _get_fallback_client(self):
        if self._fallback_client is None and self._fallback_builder is not None:
            try:
                self._fallback_client = self._fallback_builder()
            except Exception:
                pass
        return self._fallback_client

    def bind_tools(self, tools):
        return _LazyBoundLLM(self, tools)

    def invoke(self, *args, **kwargs):
        try:
            return self._get_client().invoke(*args, **kwargs)
        except Exception:
            fb = self._get_fallback_client()
            if fb is not None:
                return fb.invoke(*args, **kwargs)
            raise

    def __getattr__(self, name):
        return getattr(self._get_client(), name)


chat_llm = _LazyLLM(_build_chat_llm, _build_fallback_llm)
fallback_llm = _LazyLLM(_build_fallback_llm)

# Keep the original import path for chat generation and tool binding.
llm = chat_llm
