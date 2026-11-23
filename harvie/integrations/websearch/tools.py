"""LangChain tools for web search and page reading."""

from langchain_core.tools import tool

from harvie.integrations.websearch.provider import websearch_provider
from harvie.integrations.websearch.schemas import ReadPageInput, WebSearchInput


@tool(args_schema=WebSearchInput)
def web_search(query: str, max_results: int = 5) -> str:
    """Search the web for current information. Returns titles, links, and snippets."""
    return websearch_provider.search(query, max_results)


@tool(args_schema=ReadPageInput)
def read_page(url: str, max_chars: int = 6000) -> str:
    """Fetch a web page and return its readable text. Read-only."""
    return websearch_provider.read_page(url, max_chars)


websearch_tools = [web_search, read_page]
