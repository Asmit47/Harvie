"""LangChain tool wrappers for Google Docs."""

from langchain_core.tools import tool

from harvie.integrations.google_docs.provider import google_docs_provider
from harvie.integrations.google_docs.schemas import (
    CreateDocumentInput,
    ReadDocumentInput,
    SearchDocumentsInput,
)


@tool(args_schema=SearchDocumentsInput)
def google_docs_search_documents(query: str | None = None, max_results: int = 8) -> str:
    """Search the user's Google Docs by name or content. Returns titles and document IDs."""
    return google_docs_provider.search_documents(query, max_results)


@tool(args_schema=ReadDocumentInput)
def google_docs_read_document(document_id: str) -> str:
    """Read a Google Doc as plain text. Accepts a document ID or a Docs URL."""
    return google_docs_provider.read_document(document_id)


@tool(args_schema=CreateDocumentInput)
def google_docs_create_document(title: str, markdown_text: str | None = None) -> str:
    """Create a Google Doc. Use markdown for headings, lists, and links. Confirm the title before creating."""
    return google_docs_provider.create_document(title, markdown_text)


google_docs_tools = [
    google_docs_search_documents,
    google_docs_read_document,
    google_docs_create_document,
]
