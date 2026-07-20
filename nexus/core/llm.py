import warnings
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from nexus.core.config import settings

NVIDIA_CATALOG_URL = "https://integrate.api.nvidia.com/v1"


def _build_llm() -> ChatOpenAI | ChatGoogleGenerativeAI:
    if settings.NVIDIA_API_KEY:
        if not settings.NEXUS_LLM_MODEL:
            raise EnvironmentError(
                "NEXUS_LLM_MODEL is not set. Check your .env file."
            )
        base_url = (
            settings.NVIDIA_BASE_URL
            or NVIDIA_CATALOG_URL
        )
        return ChatOpenAI(
            model=settings.NEXUS_LLM_MODEL,
            temperature=0.2,
            max_tokens=4096,
            api_key=settings.NVIDIA_API_KEY,
            base_url=base_url,
        )
    if not settings.GOOGLE_API_KEY:
        raise EnvironmentError(
            "GOOGLE_API_KEY is not set. Set either NVIDIA_API_KEY or GOOGLE_API_KEY."
        )
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

    def _get_bound(self):
        if self._bound is None:
            self._bound = self._parent._get_client().bind_tools(self._tools)
        return self._bound

    def invoke(self, *args, **kwargs):
        return self._get_bound().invoke(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._get_bound(), name)


class _LazyLLM:
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


llm = _LazyLLM()