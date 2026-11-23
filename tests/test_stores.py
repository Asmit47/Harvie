"""Feed, pending actions, and the task queue stores against real Postgres."""

import pytest

from harvie.memory.feed import (
    create_feed_item,
    list_feed,
    mark_all_read,
    mark_read,
    unread_count,
)
from harvie.memory.pending_actions import (
    create_pending_action,
    decide_pending_action,
    execute_approved,
    get_pending_action,
    update_pending_action,
)
from harvie.tasks.store import (
    append_progress,
    cancel_task,
    claim_next_task,
    create_task,
    get_task,
    list_tasks,
    update_task,
)


def test_feed_dedup_and_read_lifecycle(as_user):
    item = create_feed_item(as_user, "nudge", "Invoice unpaid", body="check it", dedup_key="inv-1")
    again = create_feed_item(as_user, "nudge", "Invoice unpaid", body="check it", dedup_key="inv-1")
    assert item is not None and again is None
    assert unread_count(as_user) == 1

    marked = mark_read(as_user, item["id"])
    assert marked["read_at"]
    assert unread_count(as_user) == 0
    assert mark_read(as_user, item["id"]) is None  # already read


def test_feed_mark_all_read(as_user):
    create_feed_item(as_user, "update", "one", dedup_key=f"{as_user}-a")
    create_feed_item(as_user, "update", "two", dedup_key=f"{as_user}-b")
    assert unread_count(as_user) >= 2
    assert mark_all_read(as_user) >= 2
    assert unread_count(as_user) == 0


def test_feed_validates_kind_and_priority(as_user):
    with pytest.raises(ValueError):
        create_feed_item(as_user, "spam", "nope")
    with pytest.raises(ValueError):
        create_feed_item(as_user, "nudge", "nope", priority="urgent")


def test_pending_action_decision_flow(as_user):
    action = create_pending_action(
        as_user, kind="Send the reply", app="gmail", tool="GMAIL_SEND_EMAIL",
        arguments={"subject": "hi"}, source="task",
    )
    fetched = get_pending_action(as_user, action["id"])
    assert fetched["status"] == "pending"

    edited = update_pending_action(as_user, action["id"], arguments={"subject": "hello"})
    assert edited["arguments"]["subject"] == "hello"

    rejected = decide_pending_action(as_user, action["id"], "rejected")
    assert rejected["status"] == "rejected"
    # Terminal: second decision cannot flip it back
    assert decide_pending_action(as_user, action["id"], "approved")["status"] == "rejected"


def test_execute_approved_enforces_curated_allowlist(as_user):
    action = create_pending_action(
        as_user, kind="bad", app="stripe", tool="STRIPE_CREATE_CHARGE", arguments={},
    )
    result = execute_approved(action)
    assert "not an allowlisted" in result


def test_execute_approved_enforces_app_prefix(as_user):
    action = create_pending_action(
        as_user, kind="cross-app", app="notion", tool="GMAIL_SEND_EMAIL", arguments={},
    )
    result = execute_approved(action)
    assert "does not belong" in result


def test_task_queue_claim_and_cancel(as_user):
    task = create_task(as_user, "Prepare pricing doc", "research and draft pricing")
    # The queue may hold older rows from earlier runs; ours must surface exactly once.
    claimed_ids = set()
    claimed = None
    for _ in range(20):
        row = claim_next_task()
        if row is None:
            break
        assert row["id"] not in claimed_ids, "SKIP LOCKED/double-claim violated"
        claimed_ids.add(row["id"])
        if row["id"] == task["id"]:
            claimed = row
            break
    assert claimed is not None and claimed["status"] == "running"

    append_progress(task["id"], {"step": "searched sources"})
    assert get_task(task["id"])["progress"][-1]["step"] == "searched sources"

    update_task(task["id"], result_summary="found three data points")
    cancelled = cancel_task(task["id"], as_user)
    assert cancelled["status"] == "cancelled"
    assert cancel_task(task["id"], as_user)["status"] == "cancelled"  # idempotent


def test_task_listing_is_user_scoped(as_user, user_id):
    mine = create_task(as_user, "mine", "objective")
    other = f"{user_id}-other"
    from harvie.core.identity import reset_request_user_id, set_request_user_id

    token = set_request_user_id(other)
    try:
        theirs = create_task(other, "theirs", "objective")
    finally:
        reset_request_user_id(token)

    listed = [task["title"] for task in list_tasks(as_user, include_inactive=True)]
    assert "mine" in listed and "theirs" not in listed

    # Leave nothing queued: the durable worker would pick these up for real.
    cancel_task(mine["id"], as_user)
    cancel_task(theirs["id"], other)
