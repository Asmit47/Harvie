"""Google Drive search backed by the shared Composio session."""

from harvie.integrations.composio.session import run_action


class GoogleDriveProvider:
    """Find files and folders. Does not delete, move, or change sharing."""

    def find_files(self, query: str, max_results: int = 8) -> str:
        return run_action(
            "googledrive",
            "GOOGLEDRIVE_FIND_FILE",
            {"q": query, "pageSize": max(1, min(max_results, 25))},
        )

    def find_folders(self, name_contains: str, max_results: int = 8) -> str:
        return run_action(
            "googledrive",
            "GOOGLEDRIVE_FIND_FOLDER",
            {"name_contains": name_contains, "page_size": max(1, min(max_results, 25))},
        )


google_drive_provider = GoogleDriveProvider()
