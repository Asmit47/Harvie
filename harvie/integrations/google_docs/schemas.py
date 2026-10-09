"""Pydantic input schemas for Google Docs tools."""

from pydantic import BaseModel, Field


class SearchDocumentsInput(BaseModel):
    """Input for searching Google Docs."""

    query: str | None = Field(default=None, description="Plain text or Drive query. Omit to list recent docs.")
    max_results: int = Field(default=8, description="Maximum documents to return, from 1 to 25.")


class ReadDocumentInput(BaseModel):
    """Input for reading a Google Doc as plain text."""

    document_id: str = Field(description="Google Doc ID or a full docs.google.com URL.")


class CreateDocumentInput(BaseModel):
    """Input for creating a Google Doc from markdown."""

    title: str = Field(description="Document title, used as the Drive filename.")
    markdown_text: str | None = Field(default=None, description="Optional markdown body. Omit for a titled empty doc.")
