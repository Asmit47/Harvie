import logging
import os
import sys
import urllib.error
import urllib.request
from typing import Callable

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from harvie.core.config import settings

logger = logging.getLogger(__name__)


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


def _build_quick_llm() -> ChatGroq:
    """Light tier for turns Jev marks as quick: fast and cheap on the same key."""
    if not settings.GROQ_API_KEY:
        raise EnvironmentError("GROQ_API_KEY is not set. Check your .env file.")
    return ChatGroq(
        model=settings.GROQ_QUICK_LLM_MODEL,
        temperature=0.2,
        max_tokens=2048,
        groq_api_key=settings.GROQ_API_KEY,
    )


def _model_label(model) -> str:
    for attr in ("model_name", "model"):
        value = getattr(model, attr, None)
        if isinstance(value, str) and value:
            return value
    return type(model).__name__


def _note_llm_fallback(primary, fallback, exc: BaseException) -> None:
    """Log a model switch and tag the active LangSmith run. Never include secrets."""
    logger.warning(
        "LLM fallback: primary %s failed (%s); using %s",
        _model_label(primary),
        type(exc).__name__,
        _model_label(fallback),
    )
    try:
        from harvie.core.tracing import annotate_current_run
        annotate_current_run(llm_fallback_used=True)
    except Exception:
        logger.debug("Could not mark LangSmith fallback metadata", exc_info=True)


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
        except Exception as exc:
            fb = self._get_fallback_bound()
            if fb is None:
                raise
            _note_llm_fallback(self._parent._get_client(), self._parent._get_fallback_client(), exc)
            return fb.invoke(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._get_bound(), name)


class _StructuredFallback:
    """Try the primary structured model, then the fallback model on any error."""

    def __init__(self, parent: "_LazyLLM", schema, kwargs):
        self._parent = parent
        self._schema = schema
        self._kwargs = kwargs

    def invoke(self, *args, **kwargs):
        primary_client = self._parent._get_client()
        try:
            return primary_client.with_structured_output(self._schema, **self._kwargs).invoke(*args, **kwargs)
        except Exception as exc:
            fallback_client = self._parent._get_fallback_client()
            if fallback_client is None:
                raise
            _note_llm_fallback(primary_client, fallback_client, exc)
            return fallback_client.with_structured_output(self._schema, **self._kwargs).invoke(*args, **kwargs)


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

    def with_structured_output(self, schema, **kwargs):
        return _StructuredFallback(self, schema, kwargs)

    def invoke(self, *args, **kwargs):
        primary = self._get_client()
        try:
            return primary.invoke(*args, **kwargs)
        except Exception as exc:
            fb = self._get_fallback_client()
            if fb is None:
                raise
            _note_llm_fallback(primary, fb, exc)
            return fb.invoke(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._get_client(), name)


def check_groq_api_key() -> None:
    """Validate the primary Groq key once at startup. Never raises and never logs the key."""
    if "pytest" in sys.modules or os.getenv("PYTEST_CURRENT_TEST"):
        return
    if not settings.GROQ_API_KEY:
        logger.error("Groq API key invalid - running on Gemini fallback")
        return
    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/models",
        headers={
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Accept": "application/json",
            "User-Agent": "harvie/0.1",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            status = getattr(response, "status", 200)
            if status in (401, 403):
                logger.error("Groq API key invalid - running on Gemini fallback")
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            logger.error("Groq API key invalid - running on Gemini fallback")
        else:
            logger.warning("Groq startup check failed (%s)", type(exc).__name__)
    except Exception as exc:
        logger.warning("Groq startup check failed (%s)", type(exc).__name__)


chat_llm = _LazyLLM(_build_chat_llm, _build_fallback_llm)
quick_llm = _LazyLLM(_build_quick_llm, _build_fallback_llm)
fallback_llm = _LazyLLM(_build_fallback_llm)

# Keep the original import path for chat generation and tool binding.
llm = chat_llm
