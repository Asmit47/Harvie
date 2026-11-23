"""Jev gate: fallback behavior, decision parsing, and tool subsetting."""

from harvie.core.jev import JevTurnDecision, _fallback_decision, gate_turn
from harvie.tools import ALL_TOOLS, APP_GROUPS, tools_for_decision


def test_fallback_without_key_is_keyword_based(monkeypatch):
    monkeypatch.setattr("harvie.core.jev.jev_enabled", lambda: False)
    decision = gate_turn("what's due today?")
    assert decision.source == "fallback"
    assert decision.mode in ("status", "answer")
    assert decision.needs_loops == "all"  # status-style questions load loops


def test_fallback_maps_apps_from_keywords():
    decision = _fallback_decision("search my email from alice about the invoice")
    assert "gmail" in decision.relevant_apps
    assert "stripe" in decision.relevant_apps
    assert "calendar" not in decision.relevant_apps


def test_fallback_marks_checkup_phrase():
    decision = _fallback_decision("give me the daily briefing")
    assert decision.checkup is True


def test_fallback_detects_commitments():
    decision = _fallback_decision("I'll send the report by tomorrow, remind me")
    assert decision.has_commitment is True


def test_fallback_does_not_flag_preference_for_hello():
    decision = _fallback_decision("hello")
    assert decision.has_preference_signal is False
    assert decision.has_commitment is False


def test_fallback_flags_stated_preferences():
    decision = _fallback_decision("I prefer short replies from now on")
    assert decision.has_preference_signal is True


def test_gate_turn_fallback_does_not_learn_from_hello(monkeypatch):
    monkeypatch.setattr("harvie.core.jev.jev_enabled", lambda: False)
    decision = gate_turn("hello")
    assert decision.source == "fallback"
    assert decision.has_preference_signal is False


def test_gate_turn_degrades_when_jev_fails(monkeypatch):
    monkeypatch.setattr("harvie.core.jev.jev_evaluate", lambda state, questions: None)
    decision = gate_turn("draft an email to the team")
    assert decision.source == "fallback"


def test_gate_turn_parses_jev_answers(monkeypatch):
    def fake_answers(state, questions):
        assert "turn_kind" in questions and "app_gmail" in questions
        return {
            "turn_kind": {"choice": "work"},
            "mode": {"choice": "action"},
            "checkup": {"noul": 0.0},
            "needs_knowledge": {"noul": 1.0},
            "needs_loops": {"choice": "none"},
            "needs_persona": {"noul": 0.0},
            "model_tier": {"choice": "quick"},
            "has_preference_signal": {"noul": 1.0},
            "has_commitment": {"noul": 0.0},
            "urgency": {"score": 3.0},
            "app_gmail": {"noul": 1.0},
            "app_calendar": {"noul": 0.0},
        }

    monkeypatch.setattr("harvie.core.jev.jev_evaluate", fake_answers)
    decision = gate_turn("email alice the pricing")
    assert decision.source == "jev"
    assert decision.turn_kind == "work"
    assert decision.mode == "action"
    assert decision.needs_loops == "none"
    assert decision.needs_persona is False
    assert decision.model_tier == "quick"
    assert decision.urgency == 3
    assert decision.relevant_apps == {"gmail"}


def test_gate_turn_ignores_malformed_answers(monkeypatch):
    monkeypatch.setattr("harvie.core.jev.jev_evaluate", lambda state, questions: {"turn_kind": {"choice": "hacker"}, "urgency": {"score": "nine"}})
    decision = gate_turn("hello")
    assert decision.turn_kind == "chat"
    assert decision.urgency == 1


def test_decision_to_state_roundtrip():
    decision = JevTurnDecision(relevant_apps={"gmail"}, checkup=True)
    state = decision.to_state()
    assert state["relevant_apps"] == ["gmail"]
    assert state["checkup"] is True


def test_tools_for_decision_without_jev_returns_all():
    assert tools_for_decision({"source": "fallback"}) is ALL_TOOLS
    assert tools_for_decision(None) is ALL_TOOLS


def test_tools_for_decision_subsets_by_apps():
    tools = tools_for_decision({"source": "jev", "relevant_apps": ["gmail"]})
    names = {tool.name for tool in tools}
    assert names  # core apps always included
    assert all(name.startswith(("gmail", "search_knowledge", "save_knowledge", "list_open_loops", "create_open_loop", "update_open_loop", "complete_open_loop", "snooze_open_loop")) for name in names)
    assert "google_calendar_create_event" not in names


def test_every_group_resolves_to_registered_tools():
    all_names = {tool.name for tool in ALL_TOOLS}
    for app, tools in APP_GROUPS.items():
        for tool in tools:
            assert tool.name in all_names, f"{app} group has unregistered tool {tool.name}"
