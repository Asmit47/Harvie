"""LangSmith run-config labels for each Harvie lane."""

from harvie.core.tracing import build_run_config


def test_build_run_config_tags_and_metadata():
    decision = {
        "turn_kind": "chat",
        "model_tier": "deep",
        "source": "jev",
        "mode": "answer",
    }
    config = build_run_config(
        "user-1:sess-9",
        lane="chat",
        user_id="user-1",
        session_id="sess-9",
        request_id="req-3",
        jev_decision=decision,
    )
    assert config["configurable"]["thread_id"] == "user-1:sess-9"
    assert config["run_name"] == "harvie:chat"
    assert config["tags"] == ["chat", "chat", "deep"]
    assert config["metadata"]["user_id"] == "user-1"
    assert config["metadata"]["session_id"] == "sess-9"
    assert config["metadata"]["request_id"] == "req-3"
    assert config["metadata"]["task_id"] is None
    assert config["metadata"]["jev_source"] == "jev"
    assert config["metadata"]["jev_decision"] == decision
    decision["turn_kind"] = "work"
    assert config["metadata"]["jev_decision"]["turn_kind"] == "chat"


def test_build_run_config_handles_missing_jev_decision():
    config = build_run_config(
        "user-1:task-abc",
        lane="work",
        user_id="user-1",
        task_id="abc",
    )
    assert config["run_name"] == "harvie:work"
    assert config["tags"] == ["work"]
    assert config["metadata"]["task_id"] == "abc"
    assert config["metadata"]["session_id"] is None
    assert config["metadata"]["request_id"] is None
    assert config["metadata"]["jev_source"] is None
    assert config["metadata"]["jev_decision"] == {}
    assert None not in config["tags"]


def test_build_run_config_accepts_explicit_none_jev_decision():
    config = build_run_config(
        "tid",
        lane="cli",
        user_id="u",
        jev_decision=None,
    )
    assert config["run_name"] == "harvie:cli"
    assert config["tags"] == ["cli"]
    assert config["metadata"]["jev_decision"] == {}
    assert config["metadata"]["jev_source"] is None
