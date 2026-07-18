"""LangChain tool wrappers for Gmail.

Each tool validates input via Pydantic schemas, calls the provider,
and returns a formatted string. Transport and authentication stay below the
provider layer.
"""

from langchain_core.tools import tool

from nexus.integrations.gmail.provider import gmail_provider
from nexus.integrations.gmail.schemas import (
    DraftEmailInput,
    ListRecentEmailsInput,
    ModifyEmailInput,
    ReadEmailInput,
    ReplyToEmailInput,
    SearchEmailsInput,
    SendEmailInput,
)


@tool(args_schema=SendEmailInput)
def gmail_send_email(
    to: list[str],
    subject: str,
    body: str,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
) -> str:
    """Send an email via Gmail. Provide recipients, subject, and body."""
    return gmail_provider.send_email(to, subject, body, cc, bcc)


@tool(args_schema=SearchEmailsInput)
def gmail_search_emails(query: str, max_results: int = 10) -> str:
    """Search Gmail using Gmail search syntax (e.g. 'from:alice is:unread newer_than:1d')."""
    return gmail_provider.search_emails(query, max_results)


@tool(args_schema=ListRecentEmailsInput)
def gmail_list_recent_emails(max_results: int = 10) -> str:
    """List recent Gmail messages."""
    return gmail_provider.list_recent_emails(max_results)


@tool(args_schema=ReadEmailInput)
def gmail_read_email(message_id: str) -> str:
    """Read a specific email by its Gmail message ID."""
    return gmail_provider.read_email(message_id)


@tool(args_schema=DraftEmailInput)
def gmail_draft_email(
    to: list[str],
    subject: str,
    body: str,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
) -> str:
    """Create a draft email without sending it."""
    return gmail_provider.draft_email(to, subject, body, cc, bcc)


@tool(args_schema=ReplyToEmailInput)
def gmail_reply_to_email(
    thread_id: str,
    recipient_email: str,
    body: str,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
) -> str:
    """Reply to an existing Gmail thread."""
    return gmail_provider.reply_to_email(thread_id, recipient_email, body, cc, bcc)


@tool(args_schema=ModifyEmailInput)
def gmail_modify_email(
    message_id: str,
    add_labels: list[str] | None = None,
    remove_labels: list[str] | None = None,
) -> str:
    """Modify email labels — archive, mark as read, star, etc."""
    return gmail_provider.modify_email(message_id, add_labels, remove_labels)


# Exported list for registration
gmail_tools = [
    gmail_send_email,
    gmail_search_emails,
    gmail_list_recent_emails,
    gmail_read_email,
    gmail_draft_email,
    gmail_reply_to_email,
    gmail_modify_email,
]
