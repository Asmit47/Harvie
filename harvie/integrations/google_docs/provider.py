"""Google Docs operations backed by the shared Composio session."""

from harvie.integrations.composio.session import run_action


class GoogleDocsProvider:
    """Search, read, and create documents. Does not delete or share them."""

    def search_documents(self, query: str | None = None, max_results: int = 8) -> str:
        return run_action(
            "googledocs",
            "GOOGLEDOCS_SEARCH_DOCUMENTS",
            {"query": query, "max_results": max(1, min(max_results, 25)), "order_by": "modifiedTime desc"},
        )

    def read_document(self, document_id: str) -> str:
        return run_action(
            "googledocs",
            "GOOGLEDOCS_GET_DOCUMENT_PLAINTEXT",
            {"document_id": document_id, "include_tables": True},
        )

    def create_document(self, title: str, markdown_text: str | None = None) -> str:
        return run_action(
            "googledocs",
            "GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN",
            {"title": title, "markdown_text": markdown_text},
        )


google_docs_provider = GoogleDocsProvider()
