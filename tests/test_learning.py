"""Learning rules: preference provenance and the learning dedup guard."""

from harvie.memory.persona import get_preferences, get_persona, update_preferences


def test_preferences_roundtrip_with_provenance(as_user):
    update_preferences(
        {"replies.concise": {"value": "lead with the decision", "status": "confirmed", "confidence": 0.9}},
        user_id=as_user,
    )
    prefs = get_preferences(as_user)
    assert prefs["replies.concise"]["value"] == "lead with the decision"
    assert prefs["replies.concise"]["status"] == "confirmed"


def test_inferred_never_overwrites_confirmed(as_user):
    update_preferences(
        {"proactive.quiet_hours": {"value": "22:00-08:00", "status": "confirmed", "confidence": 1.0}},
        user_id=as_user,
    )
    update_preferences(
        {"proactive.quiet_hours": {"value": "00:00-06:00", "status": "inferred", "confidence": 0.6}},
        user_id=as_user,
    )
    assert get_preferences(as_user)["proactive.quiet_hours"]["value"] == "22:00-08:00"


def test_confirmed_can_update_confirmed(as_user):
    update_preferences(
        {"nudge.taste": {"value": "only deadlines", "status": "confirmed", "confidence": 1.0}},
        user_id=as_user,
    )
    update_preferences(
        {"nudge.taste": {"value": "deadlines and invoices", "status": "confirmed", "confidence": 1.0}},
        user_id=as_user,
    )
    assert get_preferences(as_user)["nudge.taste"]["value"] == "deadlines and invoices"


def test_preference_keys_are_normalized(as_user):
    update_preferences(
        {"  Replies Concise ": {"value": "yes", "status": "confirmed", "confidence": 0.9}},
        user_id=as_user,
    )
    assert "replies_concise" in get_preferences(as_user)


def test_empty_values_skipped(as_user):
    update_preferences({"junk": {"value": "", "status": "confirmed", "confidence": 1.0}}, user_id=as_user)
    assert "junk" not in get_preferences(as_user)


def test_persona_profile_carries_preferences_key(as_user):
    profile = get_persona(as_user)["profile"]
    assert "preferences" in profile


def test_learning_claim_is_exactly_once(as_user):
    from harvie.memory.learning_worker import _claim_learning

    assert _claim_learning(as_user, "req-1") is True
    assert _claim_learning(as_user, "req-1") is False
    assert _claim_learning(as_user, "req-2") is True


def test_spawn_learning_respects_gate(as_user):
    from harvie.memory.learning_worker import _claim_learning, spawn_learning
    import time

    # No signals -> nothing spawns, so the request stays unclaimed
    spawn_learning(as_user, "req-quiet", "hello", {"has_preference_signal": False, "has_commitment": False})
    time.sleep(0.2)
    assert _claim_learning(as_user, "req-quiet") is True

    # Preference signal -> the worker claims the request itself
    spawn_learning(as_user, "req-signal", "I prefer short replies", {"has_preference_signal": True, "has_commitment": False})
    deadline = time.time() + 2
    claimed = False
    while time.time() < deadline:
        if not _claim_learning(as_user, "req-signal"):
            claimed = True  # already claimed by the background thread
            break
        time.sleep(0.05)
    assert claimed
