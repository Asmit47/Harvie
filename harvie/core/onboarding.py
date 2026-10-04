"""Deterministic conversational welcome. Unrecognized input belongs to the LLM."""

import re

from harvie.integrations.catalog import connection_card
from harvie.core.turns import assistant_turn, now_iso

WELCOME_SESSION_ID = "welcome"
STAGE_STEPS = {"name": 0, "connections": 1, "complete": 2}


def normalize_onboarding_stage(stage: str | None) -> str | None:
    """Map the old welcome-step name onto the current public stage."""
    return "name" if stage == "assistant_name" else stage


_NON_NAMES = {
    "hi", "hey", "hello", "yo", "yes", "no", "ok", "okay", "sure", "thanks", "thank",
    "skip", "later", "continue", "done", "next", "help", "what", "who", "why", "how",
    "when", "where", "can", "could", "would", "should", "please", "tell", "show",
    "explain", "find", "search", "research", "summarize", "write", "draft", "send",
    "read", "check", "connect", "schedule", "plan", "create", "add", "remind", "remember",
    "update", "delete", "change", "work", "do", "something", "anything", "nothing",
    "a", "an", "the", "you", "your", "me", "my", "i", "we", "need", "want", "not",
    "is", "are", "am", "and", "to", "for", "on", "in", "with", "but", "about",
    "good", "morning", "evening", "afternoon", "night", "working", "thinking", "looking",
    "test", "testing", "stuff", "code", "coding", "debug", "weather", "time", "date",
    "inbox", "email", "emails", "calendar", "task", "tasks", "project", "projects",
    "dashboard", "design", "feature", "features",
    "nope", "nah", "yeah", "yep", "yup", "hmm", "huh", "maybe", "back", "again", "soon",
}
_DEFER = {
    "skip", "skip for now", "later", "maybe later", "not now", "no thanks", "continue",
    "let's get started", "lets get started", "get started", "let's start", "lets start",
    "i'd rather not say", "i would rather not say", "prefer not to say",
}


def _normalized(text: str) -> str:
    return " ".join(text.lower().replace("’", "'").strip().rstrip(".! ").split())


def parse_name(text: str) -> str | None:
    """Accept short names and explicit naming phrases, never a question or task."""
    candidate = text.strip().replace("’", "'").rstrip(".! ")
    prefix = r"(?:my name is|you can call me|call me|i am|i'm|it's|it is)\s+"
    match = re.match(prefix, candidate, re.I)
    if match:
        candidate = candidate[match.end():].strip()
    words = candidate.split()
    if not 1 <= len(candidate) <= 100 or not 1 <= len(words) <= 4:
        return None
    if any(word.lower().strip("-'\"") in _NON_NAMES for word in words):
        return None
    allowed = lambda char: char.isalpha() or char in " -'"
    if not all(allowed(char) for char in candidate) or not any(char.isalpha() for char in candidate):
        return None
    return candidate


def _choice(choice_id: str, label: str, value: str, stage: str) -> dict:
    return {"id": choice_id, "label": label, "value": value, "kind": "onboarding", "stage": stage}


def name_prompt() -> dict:
    return assistant_turn(
        "Before we get started, what should I call you?",
        choices=[_choice("skip-name", "Skip for now", "Skip for now", "name")],
    )


def connection_prompt() -> dict:
    return assistant_turn(
        "Would you like to connect Gmail or Google Calendar?",
        connections=[connection_card("gmail"), connection_card("googlecalendar")],
        choices=[_choice("connect-later", "I'll connect later", "I'll connect later", "connections")],
    )


def intro_turns() -> list[dict]:
    return [
        assistant_turn("You don't need to figure out how to use me yet. We’ll figure that out as we go."),
        assistant_turn("My job is pretty simple: remember what matters, notice what gets left behind, and help move things forward."),
        assistant_turn("And when you give me access to the tools you already use, I can do more than just remind you about things."),
    ]


def initial_state(persona: dict, timezone: str | None = None) -> dict:
    fields = persona["profile"]
    name = fields["name"]["value"]
    step = persona["onboarding_step"]
    stage = "connections" if name or step >= 1 else "name"
    turns = [assistant_turn(
        "Hey, I’m Harvie. I’ll learn how you work and help keep things moving"
    )]
    if stage == "name":
        turns.append(name_prompt())
    else:
        if name:
            turns.append(assistant_turn(f"Good to meet you, {name}. Let's get started."))
        turns.extend(intro_turns())
        turns.append(connection_prompt())
    for turn in turns:
        turn["reveal_on_first_visit"] = True
    return {
        "session_title": "Getting started with Harvie",
        "session_created_at": now_iso(),
        "conversation_history": turns,
        "onboarding_stage": stage,
        "pending_profile_update": {
            "changes": {"timezone": timezone} if timezone and not fields["timezone"]["value"] else {},
            "step": STAGE_STEPS[stage],
        },
    }


def plan_reply(state: dict, message: str, choice: dict | None = None) -> dict | None:
    stage = state.get("onboarding_stage")
    if stage not in STAGE_STEPS or stage == "complete" or (choice and choice["kind"] == "message"):
        return None
    value = _normalized(message)
    defer = value in _DEFER or value in {"i'll connect later", "ill connect later"}
    if stage == "name":
        name = None if defer else parse_name(message)
        if not defer and not name:
            return None
        welcome_turn = (
            assistant_turn(f"Good to meet you, {name}. Let's get started.")
            if name
            else assistant_turn("No problem—we can add that later. Let's get started.")
        )
        return {
            "onboarding_stage": "connections",
            "turns": [
                welcome_turn,
                *intro_turns(),
                connection_prompt(),
            ],
            "pending_profile_update": {"changes": {"name": name} if name else {}, "step": 1},
        }
    if defer or value in {"no", "nope", "done", "all set", "i'm done", "im done"}:
        return {
            **completion_update(),
            "turns": [assistant_turn("No problem. You can connect your apps here whenever you need them. What should we tackle first?")],
        }
    toolkit = {
        "gmail": "gmail", "connect gmail": "gmail", "connect my gmail": "gmail",
        "google calendar": "googlecalendar", "calendar": "googlecalendar",
        "connect google calendar": "googlecalendar", "connect calendar": "googlecalendar",
    }.get(value)
    if toolkit:
        return {
            "onboarding_stage": "connections",
            "turns": [assistant_turn("Use the Connect button below to approve access.", connections=[connection_card(toolkit)])],
        }
    if value in {"yes", "sure", "ok", "okay", "let's connect", "lets connect"}:
        return {"onboarding_stage": "connections", "turns": [connection_prompt()]}
    return None


def completion_update() -> dict:
    return {
        "onboarding_stage": "complete",
        "pending_profile_update": {"changes": {}, "step": 2, "complete": True},
    }


def llm_guidance(stage: str | None) -> str:
    prompts = {
        "name": "The optional welcome is waiting for the user's name.",
        "connections": "The welcome has offered optional Gmail and Google Calendar connections. The user can start a task instead.",
    }
    if stage not in prompts:
        return ""
    return (
        f"{prompts[stage]} Answer their actual question or help with their task first. "
        "Do not treat unrelated input as a name, force setup, claim the welcome is completed, "
        "or claim an app is connected without a successful tool result. "
        "If useful, briefly mention that they can return to the pending welcome question."
    )
