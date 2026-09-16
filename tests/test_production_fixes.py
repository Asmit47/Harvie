import os
import unittest
from fastapi.testclient import TestClient

# Ensure test secret is set for testing
TEST_SECRET = "test_proxy_secret_1234567890"
os.environ["HARVIE_API_PROXY_SECRET"] = TEST_SECRET

from harvie.core.config import settings
settings.HARVIE_API_PROXY_SECRET = TEST_SECRET

from harvie.api.main import app

client = TestClient(app)


class TestProductionFixes(unittest.TestCase):
    def test_health_check_publicly_accessible_without_auth(self):
        """GET /health must be accessible without any credentials."""
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_unauthenticated_request_rejected(self):
        """Requests without x-harvie-user-id must be rejected with 401."""
        response = client.get("/greeting")
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertIn("Missing authenticated user identity", data.get("detail", ""))

    def test_invalid_proxy_secret_rejected(self):
        """Requests with invalid proxy secret must be rejected with 401."""
        response = client.get(
            "/greeting",
            headers={
                "x-harvie-user-id": "user_123",
                "x-harvie-proxy-secret": "wrong_secret",
            },
        )
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertIn("Invalid authenticated proxy", data.get("detail", ""))

    def test_invalid_user_id_rejected(self):
        """Requests with invalid user ID format must be rejected with 400."""
        response = client.get(
            "/greeting",
            headers={
                "x-harvie-user-id": "user!@#$%",
                "x-harvie-proxy-secret": TEST_SECRET,
            },
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("Invalid user identity", data.get("detail", ""))

    def test_authenticated_request_succeeds(self):
        """Requests with valid user ID and proxy secret must succeed."""
        response = client.get(
            "/greeting",
            headers={
                "x-harvie-user-id": "user_123",
                "x-harvie-proxy-secret": TEST_SECRET,
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("greeting", data)
        self.assertIn("period", data)

    def test_no_wildcard_cors(self):
        """Wildcard CORS headers must not be returned for arbitrary origins."""
        response = client.get(
            "/health",
            headers={"Origin": "https://random-site.com"},
        )
        self.assertNotIn("access-control-allow-origin", response.headers)


if __name__ == "__main__":
    unittest.main()
