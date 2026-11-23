"""Shared fixtures: a real local Postgres schema, an isolated user, auth headers."""

import os
import uuid

import pytest

os.environ.setdefault("HARVIE_USER_ID", "")


@pytest.fixture(scope="session", autouse=True)
def database():
    from harvie.core.db import close_pool, init_db

    init_db()
    yield
    close_pool()


@pytest.fixture()
def user_id():
    return f"test-{uuid.uuid4().hex[:10]}"


@pytest.fixture()
def as_user(user_id):
    """Set the request identity ContextVar for the duration of a test."""
    from harvie.core.identity import reset_request_user_id, set_request_user_id

    token = set_request_user_id(user_id)
    yield user_id
    reset_request_user_id(token)


@pytest.fixture()
def api_client(as_user):
    """FastAPI TestClient pre-authenticated as the isolated test user.

    Deliberately not used as a context manager: entering one runs the app
    lifespan, which closes the shared connection pool on exit. The session
    `database` fixture has already initialized the schema.
    """
    from fastapi.testclient import TestClient

    from harvie.api.main import app
    from harvie.core.config import settings

    client = TestClient(app)
    client.headers.update({
        "x-harvie-user-id": as_user,
        "x-harvie-proxy-secret": settings.HARVIE_API_PROXY_SECRET or "test-secret",
    })
    yield client
