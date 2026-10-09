"""LangChain tool wrappers for Slack."""

from langchain_core.tools import tool

from harvie.integrations.slack.provider import slack_provider
from harvie.integrations.slack.schemas import ListChannelsInput, SearchSlackMessagesInput, SendSlackMessageInput


@tool(args_schema=ListChannelsInput)
def slack_list_channels(limit: int = 40) -> str:
    """List Slack channels the connected user can see. Use a returned channel ID before sending."""
    return slack_provider.list_channels(limit)


@tool(args_schema=SearchSlackMessagesInput)
def slack_search_messages(query: str, count: int = 10) -> str:
    """Search Slack messages. Use Slack modifiers such as in:#channel, from:@name, and after:YYYY-MM-DD."""
    return slack_provider.search_messages(query, count)


@tool(args_schema=SendSlackMessageInput)
def slack_send_message(channel: str, markdown_text: str, thread_ts: str | None = None) -> str:
    """Post a Slack message. Only call this after the user has confirmed the channel and the exact text."""
    return slack_provider.send_message(channel, markdown_text, thread_ts)


slack_tools = [
    slack_list_channels,
    slack_search_messages,
    slack_send_message,
]
