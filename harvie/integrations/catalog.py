"""Connection metadata shared by onboarding, chat cards, sessions, and the API.

Tool slugs are the Composio actions Harvie is allowed to call. The list is
intentionally small: each one is a task the assistant actually performs,
not the full toolkit.
"""

from typing import Literal

Toolkit = Literal[
    "gmail",
    "googlecalendar",
    "googledocs",
    "googledrive",
    "googletasks",
    "slack",
    "stripe",
]

PUBLIC_CARD_FIELDS = ("toolkit", "label", "description")

# Order is the order shown on the connections page.
CONNECTORS = {
    "gmail": {
        "toolkit": "gmail",
        "label": "Gmail",
        "description": "Read, search, draft, and send mail from your inbox.",
        "category": "mail",
        "category_label": "Mail",
        "tools": [
            "GMAIL_SEND_EMAIL",
            "GMAIL_CREATE_EMAIL_DRAFT",
            "GMAIL_REPLY_TO_THREAD",
            "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
            "GMAIL_FETCH_EMAILS",
            "GMAIL_ADD_LABEL_TO_EMAIL",
        ],
    },
    "googlecalendar": {
        "toolkit": "googlecalendar",
        "label": "Google Calendar",
        "description": "See your schedule and add, move, or cancel events.",
        "category": "time",
        "category_label": "Calendar",
        "tools": [
            "GOOGLECALENDAR_EVENTS_LIST",
            "GOOGLECALENDAR_EVENTS_GET",
            "GOOGLECALENDAR_CREATE_EVENT",
            "GOOGLECALENDAR_PATCH_EVENT",
            "GOOGLECALENDAR_DELETE_EVENT",
            "GOOGLECALENDAR_FIND_EVENT",
        ],
    },
    "googledocs": {
        "toolkit": "googledocs",
        "label": "Google Docs",
        "description": "Find a document, read it, or create one from a draft.",
        "category": "documents",
        "category_label": "Documents",
        "tools": [
            "GOOGLEDOCS_SEARCH_DOCUMENTS",
            "GOOGLEDOCS_GET_DOCUMENT_PLAINTEXT",
            "GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN",
        ],
    },
    "googledrive": {
        "toolkit": "googledrive",
        "label": "Google Drive",
        "description": "Find files and folders across My Drive and shared drives.",
        "category": "documents",
        "category_label": "Documents",
        "tools": [
            "GOOGLEDRIVE_FIND_FILE",
            "GOOGLEDRIVE_FIND_FOLDER",
        ],
    },
    "googletasks": {
        "toolkit": "googletasks",
        "label": "Google Tasks",
        "description": "See open tasks, add one, or mark it complete.",
        "category": "tasks",
        "category_label": "Tasks",
        "tools": [
            "GOOGLETASKS_LIST_ALL_TASKS",
            "GOOGLETASKS_LIST_TASK_LISTS",
            "GOOGLETASKS_INSERT_TASK",
            "GOOGLETASKS_PATCH_TASK",
        ],
    },
    "slack": {
        "toolkit": "slack",
        "label": "Slack",
        "description": "Search workspace messages and send one after you confirm it.",
        "category": "conversations",
        "category_label": "Conversations",
        "tools": [
            "SLACK_LIST_ALL_CHANNELS",
            "SLACK_SEARCH_MESSAGES",
            "SLACK_SEND_MESSAGE",
        ],
    },
    "stripe": {
        "toolkit": "stripe",
        "label": "Stripe",
        "description": "Check invoices and customers. Harvie cannot charge or refund.",
        "category": "payments",
        "category_label": "Payments",
        "tools": [
            "STRIPE_LIST_INVOICES",
            "STRIPE_GET_INVOICES_INVOICE",
            "STRIPE_LIST_CUSTOMERS",
        ],
    },
}

AUTH_ALIASES = {
    "calendar": "googlecalendar",
    "google_calendar": "googlecalendar",
    "docs": "googledocs",
    "google_docs": "googledocs",
    "drive": "googledrive",
    "google_drive": "googledrive",
    "tasks": "googletasks",
    "google_tasks": "googletasks",
}


def session_toolkits() -> list[str]:
    """Toolkit slugs passed to a Composio session."""
    return list(CONNECTORS)


def session_tools() -> dict[str, list[str]]:
    """Allowlisted Composio actions for each toolkit."""
    return {slug: list(meta["tools"]) for slug, meta in CONNECTORS.items()}


def connection_card(toolkit: str, resume_message: str | None = None) -> dict:
    """Public card stored in chat. Internal tool slugs stay off the card."""
    source = CONNECTORS[toolkit]
    card = {field: source[field] for field in PUBLIC_CARD_FIELDS}
    if resume_message:
        card["resume_message"] = resume_message
    return card


def cli_name(toolkit: str) -> str:
    """Short name used by `python -m harvie auth`."""
    short = {
        "googlecalendar": "calendar",
        "googledocs": "docs",
        "googledrive": "drive",
        "googletasks": "tasks",
    }
    return short.get(toolkit, toolkit)


def auth_toolkit_name(name: str) -> str | None:
    """Resolve a CLI auth name to a toolkit slug."""
    key = name.strip().lower().replace("-", "_")
    if key in CONNECTORS:
        return key
    compact = key.replace("_", "")
    if compact in CONNECTORS:
        return compact
    return AUTH_ALIASES.get(key)
