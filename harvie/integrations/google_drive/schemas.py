"""Pydantic input schemas for Google Drive tools."""

from pydantic import BaseModel, Field


class FindFilesInput(BaseModel):
    """Input for finding Drive files."""

    query: str = Field(description="File name, plain text, or a Drive query such as name contains 'proposal'.")
    max_results: int = Field(default=8, description="Maximum files to return, from 1 to 25.")


class FindFoldersInput(BaseModel):
    """Input for finding Drive folders."""

    name_contains: str = Field(description="Case-insensitive substring of the folder name.")
    max_results: int = Field(default=8, description="Maximum folders to return, from 1 to 25.")
