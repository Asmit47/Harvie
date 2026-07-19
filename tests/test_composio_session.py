import json
import unittest
from unittest.mock import patch

from nexus.integrations.composio.session import (
    ComposioSessionManager,
    ConfigurationError,
    ConnectionRequiredError,
    TemporaryServiceError,
)


class FakeComposio:
    def __init__(self, session):
        self.sessions = FakeSessions(session)


class FakeSessions:
    def __init__(self, session):
        self.session = session
        self.create_calls = 0

    def create(self, **kwargs):
        self.create_calls += 1
        self.last_create_kwargs = kwargs
        return self.session


class FakeConnection:
    def __init__(self, active):
        self.is_active = active


class FakeToolkit:
    is_no_auth = False

    def __init__(self, active, slug="gmail"):
        self.connection = FakeConnection(active)
        self.slug = slug


class FakeToolkits:
    def __init__(self, active, slug="gmail"):
        self.items = [FakeToolkit(active, slug=slug)] if active is not None else []


class FakeAuthRequest:
    redirect_url = "https://auth.example/redirect"

    def __init__(self, active=True):
        self._active = active

    def wait_for_connection(self, timeout=60.0):
        if not self._active:
            raise TimeoutError("timed out")
        return True


class FakeSession:
    def __init__(self, connected=True, failures=0, auth_will_succeed=True):
        self.connected = connected
        self.failures = failures
        self._auth_will_succeed = auth_will_succeed
        self.execute_calls = 0
        self.authorize_calls = 0

    def toolkits(self, **kwargs):
        self.last_toolkits_kwargs = kwargs
        requested = (kwargs.get("toolkits") or [None])[0]
        slug = requested if requested else "gmail"
        return FakeToolkits(self.connected, slug=slug)

    def authorize(self, toolkit):
        self.authorize_calls += 1
        self.last_authorized_toolkit = toolkit
        return FakeAuthRequest(active=self._auth_will_succeed)

    def execute(self, tool_slug, *, arguments=None, account=None):
        self.execute_calls += 1
        self.last_execute = (tool_slug, arguments, account)
        if self.execute_calls <= self.failures:
            raise TimeoutError("timed out")
        return {"successful": True, "data": {"ok": True, "tool": tool_slug}}


class ComposioSessionManagerTests(unittest.TestCase):
    def test_missing_api_key(self):
        manager = ComposioSessionManager(user_id="user", api_key="")
        with self.assertRaises(ConfigurationError):
            manager.initialize()

    def test_missing_user_id(self):
        manager = ComposioSessionManager(user_id="", api_key="key")
        with self.assertRaises(ConfigurationError):
            manager.initialize()

    def test_session_creation_and_caching(self):
        session = FakeSession()
        composio = FakeComposio(session)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = composio

        first = manager.get_session()
        second = manager.get_session()

        self.assertIs(first, session)
        self.assertIs(second, session)
        self.assertEqual(composio.sessions.create_calls, 1)
        self.assertEqual(composio.sessions.last_create_kwargs["user_id"], "user")
        self.assertTrue(composio.sessions.last_create_kwargs["manage_connections"])
        self.assertIn("gmail", composio.sessions.last_create_kwargs["tools"])
        self.assertIn("googlecalendar", composio.sessions.last_create_kwargs["tools"])

    def test_gmail_authorization(self):
        session = FakeSession(connected=False)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        flow = manager.start_authentication("gmail")

        self.assertFalse(flow.connected)
        self.assertEqual(flow.authorization_url, "https://auth.example/redirect")
        self.assertEqual(session.last_authorized_toolkit, "gmail")
        self.assertEqual(session.execute_calls, 0)
        self.assertIsNotNone(flow.connection_request)

    def test_calendar_authorization(self):
        session = FakeSession(connected=False)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        flow = manager.start_authentication("googlecalendar")

        self.assertFalse(flow.connected)
        self.assertEqual(flow.authorization_url, "https://auth.example/redirect")
        self.assertEqual(session.last_authorized_toolkit, "googlecalendar")
        self.assertEqual(session.execute_calls, 0)
        self.assertIsNotNone(flow.connection_request)

    def test_authorization_returns_success_when_connected(self):
        session = FakeSession(connected=True)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        flow = manager.start_authentication("gmail")

        self.assertTrue(flow.connected)
        self.assertIsNone(flow.authorization_url)
        self.assertEqual(session.authorize_calls, 0)
        self.assertEqual(session.execute_calls, 0)

    def test_connection_missing(self):
        session = FakeSession(connected=False)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        with self.assertRaises(ConnectionRequiredError) as raised:
            manager.execute("gmail", "GMAIL_FETCH_EMAILS", {})

        self.assertEqual(raised.exception.auth_url, "https://auth.example/redirect")

    def test_retry_works(self):
        session = FakeSession(connected=True, failures=2)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        with patch("nexus.integrations.composio.session.time.sleep"):
            result = manager.execute("gmail", "GMAIL_FETCH_EMAILS", {})

        self.assertEqual(session.execute_calls, 3)
        self.assertEqual(json.loads(result)["ok"], True)

    def test_exceptions_mapped(self):
        manager = ComposioSessionManager(user_id="user", api_key="key")
        mapped = manager._map_exception(TimeoutError("timed out"))
        self.assertIsInstance(mapped, TemporaryServiceError)

    def test_provider_returns_expected_schema_for_missing_connection(self):
        from nexus.integrations.gmail import provider as gmail_provider_module

        session = FakeSession(connected=False)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        with patch.object(gmail_provider_module, "session_manager", manager):
            output = gmail_provider_module.GmailProvider().search_emails("is:unread")

        payload = json.loads(output)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["error"]["type"], "ConnectionRequiredError")

    def test_wait_for_connection_success(self):
        session = FakeSession(connected=False, auth_will_succeed=True)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        flow = manager.start_authentication("gmail")
        self.assertFalse(flow.connected)

        result = manager.wait_for_connection(flow.connection_request)
        self.assertTrue(result)

    def test_wait_for_connection_timeout(self):
        session = FakeSession(connected=False, auth_will_succeed=False)
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        flow = manager.start_authentication("gmail")
        self.assertFalse(flow.connected)

        result = manager.wait_for_connection(flow.connection_request)
        self.assertFalse(result)

    def test_wait_for_connection_none_request(self):
        manager = ComposioSessionManager(user_id="user", api_key="key")
        result = manager.wait_for_connection(None)
        self.assertFalse(result)

    def test_structured_error_handles_unicode(self):
        """Non-ASCII characters in error messages should not crash json serialization."""
        from nexus.integrations.composio.session import IntegrationError
        manager = ComposioSessionManager(user_id="user", api_key="key")
        exc = IntegrationError("Price is \u20b9100")
        output = manager.structured_error(exc, "gmail")
        payload = json.loads(output)
        self.assertIn("\u20b9", payload["error"]["message"])

    def test_is_connected_rejects_wrong_slug(self):
        """is_connected must return False when the API returns a different toolkit."""
        # Simulate the real bug: ask for googlecalendar but the API returns gmail
        session = FakeSession(connected=True)  # will create FakeToolkit with is_active=True
        manager = ComposioSessionManager(user_id="user", api_key="key")
        manager._composio = FakeComposio(session)

        # Override toolkits() to return gmail when googlecalendar is requested
        original_toolkits = session.toolkits

        def toolkits_returns_gmail(**kwargs):
            original_toolkits(**kwargs)
            # Return gmail (active) even though googlecalendar was requested
            return FakeToolkits(True, slug="gmail")

        session.toolkits = toolkits_returns_gmail

        # This must return False — gmail is connected, but googlecalendar is not
        result = manager.is_connected("googlecalendar")
        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
