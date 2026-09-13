from langsmith import traceable

@traceable
def build_system_prompt(state: dict, context: dict) -> str:
    """Render only information selected for the current response."""
    sections = []
    for label, value in context["response_context"].items():
        if not value:
            continue
        if isinstance(value, list):
            value = "\n".join(f"- {item.get('content', item)}" if isinstance(item, dict) else f"- {item}" for item in value)
        sections.append(f"## {label.replace('_', ' ').title()}\n{value}")
    return "\n\n".join(sections) or "No additional context."
