"""Slack operations backed by the shared Composio session."""

from harvie.integrations.composio.session import run_action


class SlackProvider:
    """Search Slack and send a confirmed message. Does not delete or administer the workspace."""

    def list_channels(self, limit: int = 40) -> str:
        return run_action(
            "slack",
            "SLACK_LIST_ALL_CHANNELS",
            {
                "limit": max(1, min(limit, 100)),
                "types": "public_channel,private_channel",
                "exclude_archived": True,
            },
        )

    def search_messages(self, query: str, count: int = 10) -> str:
        return run_action(
            "slack",
            "SLACK_SEARCH_MESSAGES",
            {"query": query, "count": max(1, min(count, 20)), "sort": "timestamp", "sort_dir": "desc"},
        )

    def send_message(self, channel: str, markdown_text: str, thread_ts: str | None = None) -> str:
        return run_action(
            "slack",
            "SLACK_SEND_MESSAGE",
            {"channel": channel.lstrip("#"), "markdown_text": markdown_text, "thread_ts": thread_ts},
        )


slack_provider = SlackProvider()
