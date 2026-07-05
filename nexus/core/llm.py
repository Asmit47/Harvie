import warnings

from langchain_nvidia_ai_endpoints import ChatNVIDIA

from nexus.core.config import settings

if not settings.NVIDIA_API_KEY:
    raise EnvironmentError("NVIDIA_API_KEY is not set. Nexus requires an LLM to run.")


_NVIDIA_WARNING_PATTERNS = (
    r"Found .* in available_models, but type is unknown and inference may fail\.",
    r"Model '.*' is not known to support tools\. Your tool binding may fail at inference time\.",
)


def _suppress_nvidia_model_warnings():
    return warnings.catch_warnings()


def _build_llm() -> ChatNVIDIA:
    kwargs = {
        "model": settings.NEXUS_LLM_MODEL,
        "temperature": 0.2,
    }
    if settings.NVIDIA_BASE_URL:
        kwargs["base_url"] = settings.NVIDIA_BASE_URL
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        for pattern in _NVIDIA_WARNING_PATTERNS:
            warnings.filterwarnings("ignore", message=pattern, category=UserWarning)
        return ChatNVIDIA(**kwargs)


class _LazyBoundLLM:
    def __init__(self, parent: "_LazyChatNVIDIA", tools):
        self._parent = parent
        self._tools = tools
        self._bound = None

    def _get_bound(self):
        if self._bound is None:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                for pattern in _NVIDIA_WARNING_PATTERNS:
                    warnings.filterwarnings("ignore", message=pattern, category=UserWarning)
                self._bound = self._parent._get_client().bind_tools(self._tools)
        return self._bound

    def invoke(self, *args, **kwargs):
        return self._get_bound().invoke(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._get_bound(), name)


class _LazyChatNVIDIA:
    """Delay ChatNVIDIA construction until the first real model call."""

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


llm = _LazyChatNVIDIA()
