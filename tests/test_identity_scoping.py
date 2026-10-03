from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from harvie.api.main import app
from harvie.api.routes import session as session_routes
from harvie.core.config import settings
from harvie.core.identity import reset_request_user_id, set_request_user_id
from harvie.memory.persona import get_persona


class TestIdentityScoping(TestCase):
    def test_session_list_is_scoped_to_authenticated_request_user(self):
        checkpoints = [
            SimpleNamespace(
                config={"configurable": {"thread_id": "account_one:one"}},
                checkpoint={"ts": "2026-01-01T00:00:00+00:00"},
            ),
            SimpleNamespace(
                config={"configurable": {"thread_id": "account_two:two"}},
                checkpoint={"ts": "2026-01-02T00:00:00+00:00"},
            ),
        ]
        client = TestClient(app)
        with (
            patch.object(session_routes.checkpointer, "list", return_value=checkpoints),
            patch.object(session_routes, "_get_state", return_value={}),
        ):
            for user_id, expected in (("account_one", "one"), ("account_two", "two")):
                response = client.get(
                    "/sessions",
                    headers={
                        "x-harvie-user-id": user_id,
                        "x-harvie-proxy-secret": settings.HARVIE_API_PROXY_SECRET,
                    },
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual([item["id"] for item in response.json()], [expected])

    def test_persona_lookup_uses_authenticated_request_user(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value.__enter__.return_value
        cursor.fetchone.return_value = None
        with patch("harvie.memory.persona.get_db_connection") as get_connection:
            get_connection.return_value.__enter__.return_value = connection
            for user_id in ("account_one", "account_two"):
                token = set_request_user_id(user_id)
                try:
                    self.assertFalse(get_persona()["onboarding_complete"])
                finally:
                    reset_request_user_id(token)

        selected_ids = [call.args[1][0] for call in cursor.execute.call_args_list]
        self.assertEqual(selected_ids, ["account_one", "account_two"])
