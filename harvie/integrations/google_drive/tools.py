"""LangChain tool wrappers for Google Drive."""

from langchain_core.tools import tool

from harvie.integrations.google_drive.provider import google_drive_provider
from harvie.integrations.google_drive.schemas import FindFilesInput, FindFoldersInput


@tool(args_schema=FindFilesInput)
def google_drive_find_files(query: str, max_results: int = 8) -> str:
    """Find files in Google Drive by name or content. Does not download or delete them."""
    return google_drive_provider.find_files(query, max_results)


@tool(args_schema=FindFoldersInput)
def google_drive_find_folders(name_contains: str, max_results: int = 8) -> str:
    """Find Google Drive folders whose names contain the given text."""
    return google_drive_provider.find_folders(name_contains, max_results)


google_drive_tools = [
    google_drive_find_files,
    google_drive_find_folders,
]
