"""Pydantic input schemas for Slack tools."""

from pydantic import BaseModel, Field


class ListChannelsInput(BaseModel):
    """Input for listing Slack channels the user can see."""

    limit: int = Field(default=40, description="Maximum channels to return, from 1 to 100.")


class SearchSlackMessagesInput(BaseModel):
    """Input for searching Slack messages."""

    query: str = Field(description="Slack search query. Modifiers like in:#channel, from:@name, and after:YYYY-MM-DD are allowed.")
    count: int = Field(default=10, description="Maximum messages to return, from 1 to 20.")


class SendSlackMessageInput(BaseModel):
    """Input for posting a Slack message."""

    channel: str = Field(description="Channel ID such as C0123, or a channel name without a leading #.")
    markdown_text: str = Field(description="Message body in Slack markdown.")
    thread_ts: str | None = Field(default=None, description="Parent message timestamp when this should be a thread reply.")
