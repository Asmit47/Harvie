from langchain_core.messages import HumanMessage, SystemMessage

from nexus.core.llm import llm
from nexus.core.state import NexusState


def check_relevance(state: NexusState) -> NexusState:
    """Quality gate: ask the LLM if the answer addresses the request."""
    messages = [
        SystemMessage(
            content=(
                "You are a strict relevance grader. Reply only with PASS or FAIL, "
                "followed by a short reason. PASS means the answer directly "
                "addresses the user's request."
            )
        ),
        HumanMessage(
            content=(
                f"User request:\n{state['user_input']}\n\n"
                f"Answer:\n{state.get('answer', '')}"
            )
        ),
    ]
    result = llm.invoke(messages).content.strip()
    return {
        **state,
        "relevance_passed": result.upper().startswith("PASS"),
        "relevance_reason": result,
    }


def repair_answer(state: NexusState) -> NexusState:
    """Rewrite an answer that failed the relevance check."""
    messages = [
        SystemMessage(content="Rewrite the answer so it directly satisfies the user's request."),
        HumanMessage(
            content=(
                f"User request:\n{state['user_input']}\n\n"
                f"Previous answer:\n{state.get('answer', '')}\n\n"
                f"Relevance issue:\n{state.get('relevance_reason', '')}"
            )
        ),
    ]
    response = llm.invoke(messages)
    return {**state, "final_answer": response.content}

