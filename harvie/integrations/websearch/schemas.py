"""Input schemas for the websearch tools."""

from pydantic import BaseModel, Field


class WebSearchInput(BaseModel):
    query: str = Field(min_length=1, max_length=500, description="What to search the web for.")
    max_results: int = Field(default=5, ge=1, le=10, description="How many results to return.")


class ReadPageInput(BaseModel):
    url: str = Field(min_length=8, max_length=2000, description="The http(s) URL of a page to read.")
    max_chars: int = Field(default=6000, ge=500, le=20000, description="Maximum characters of page text to return.")
