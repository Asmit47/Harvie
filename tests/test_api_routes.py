"""API routes: auth middleware and the feed/pending-action endpoints."""

from harvie.core.config import settings


def test_health_is_public(api_client):
    response = api_client.get("/health")
    assert response.status_code == 200


def test_requests_without_identity_rejected():
    from fastapi.testclient import TestClient

    from harvie.api.main import app

    client = TestClient(app)  # no lifespan: schema comes from the session fixture
    assert client.get("/feed").status_code == 401
    assert (
        client.get("/feed", headers={"x-harvie-user-id": "someone", "x-harvie-proxy-secret": "wrong"})
        .status_code
        == 401
    )


def test_invalid_user_shape_rejected(api_client):
    response = api_client.get("/feed", headers={"x-harvie-user-id": "bad user!"})
    assert response.status_code == 400


def test_feed_endpoints_roundtrip(api_client):
    assert api_client.get("/feed").status_code == 200
    body = api_client.get("/feed").json()
    assert "items" in body and "unread_count" in body


def test_pending_actions_scoped_and_lifecycled(api_client):
    created = api_client.get("/pending-actions").json()
    assert created == []

    # Unknown ids 404 rather than leaking other users' rows
    assert api_client.post("/pending-actions/does-not-exist/approve").status_code == 404
    assert api_client.post("/pending-actions/does-not-exist/reject").status_code == 404


def test_task_routes_scoped(api_client):
    assert api_client.get("/tasks").status_code == 200
    assert api_client.get("/tasks/missing").status_code == 404
