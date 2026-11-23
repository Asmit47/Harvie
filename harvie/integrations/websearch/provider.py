"""Read-only web search and page extraction via Tavily."""

import json
import logging
import urllib.parse
import urllib.request

from harvie.core.config import settings

logger = logging.getLogger(__name__)

SEARCH_ENDPOINT = "https://api.tavily.com/search"
EXTRACT_ENDPOINT = "https://api.tavily.com/extract"


def _error(message: str) -> str:
    return json.dumps({"ok": False, "error": {"message": message}})


class WebSearchProvider:
    """Search the web and read pages. No write actions exist here."""

    @property
    def enabled(self) -> bool:
        return bool(settings.TAVILY_API_KEY)

    def _post(self, endpoint: str, payload: dict) -> dict:
        request = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.TAVILY_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))

    def search(self, query: str, max_results: int = 5) -> str:
        if not self.enabled:
            return _error("Web search is not configured. Add TAVILY_API_KEY.")
        try:
            body = self._post(SEARCH_ENDPOINT, {
                "query": query,
                "search_depth": "basic",
                "max_results": max(1, min(max_results, 10)),
            })
        except Exception as exc:
            logger.info("websearch.search failed: %s", exc)
            return _error(f"Web search failed: {exc}")

        results = []
        for item in (body.get("results") or [])[: max(1, min(max_results, 10))]:
            results.append(
                {
                    "title": item.get("title", ""),
                    "link": item.get("url", ""),
                    "snippet": item.get("content", ""),
                    "published_date": item.get("published_date"),
                }
            )
        if not results:
            return json.dumps({"results": [], "note": "No results found."})
        return json.dumps({"results": results}, indent=2, ensure_ascii=False)

    def read_page(self, url: str, max_chars: int = 6000) -> str:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return _error("Only http(s) URLs can be read.")
        if not self.enabled:
            return _error("Page extraction is not configured. Add TAVILY_API_KEY.")
        try:
            body = self._post(EXTRACT_ENDPOINT, {"urls": url, "format": "markdown"})
        except Exception as exc:
            logger.info("websearch.read_page failed: %s", exc)
            return _error(f"Could not read the page: {exc}")

        results = body.get("results") or []
        text = str(results[0].get("raw_content") or "").strip() if results else ""
        if not text:
            failures = body.get("failed_results") or []
            detail = failures[0].get("error") if failures else "The page had no readable text."
            return _error(str(detail))
        return text[: max(500, min(max_chars, 20000))]


websearch_provider = WebSearchProvider()
