from harvie.core.context import build_context
from harvie.core.jev import gate_turn
from harvie.core.prompts import build_system_prompt
from harvie.core.state import HarvieState, _matches_any
from harvie.core.config import settings
from harvie.core.onboarding import llm_guidance
from harvie.core.turns import user_turn


def load_context(state: HarvieState) -> HarvieState:
    """Build the system prompt and set routing flags for the current turn."""
    user_input = state["user_input"]

    history = list(state.get("conversation_history", []))
    request_id = state.get("chat_request_id")
    turn = user_turn(user_input, request_id) if request_id else {"role": "user", "content": user_input}
    if not request_id or not any(item.get("id") == turn["id"] for item in history):
        history.append(turn)

    # The chat route gates the turn before invoking the graph (it needs the
    # decision to branch between chat, work, and status); reuse it here.
    decision = state.get("jev_decision")
    if not decision:
        recent = [t.get("content", "") for t in history[-6:]]
        decision = gate_turn(
            user_input,
            session_summary="\n".join(recent[:5]),
        ).to_state()

    context = build_context(user_input, {**state, "conversation_history": history}, decision)
    guidance = llm_guidance(state.get("onboarding_stage"))
    if guidance:
        context["response_context"]["conversational_welcome"] = guidance
    prompt = build_system_prompt({**state, "conversation_history": history}, context)

    return {
        **state,
        "system_prompt": prompt,
        "conversation_history": history,
        "request_mode": context["mode"],
        "response_context": context["response_context"],
        "attention_items": context["attention_items"],
        "jev_decision": decision,
        "messages": [],
        "tool_results": [],
        "answer": "",
        "final_answer": "",
        "daily_checkup_needed": decision.get("checkup") or _matches_any(user_input, settings.DAILY_CHECKUP_PHRASES),
    }
