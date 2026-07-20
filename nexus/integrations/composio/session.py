"""Shared Composio Sessions API manager.

One manager owns one Composio SDK object and caches one session per Nexus user.
Providers call this module for session-scoped execution and authorization.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from langsmith import traceable

from nexus.core.config import settings

logger = logging.getLogger(__name__)

RETRY_DELAYS_SECONDS = (1, 2, 4)


class IntegrationError(Exception):
    """Base exception for Google Workspace integration failures."""


class ConfigurationError(IntegrationError):
    """Required integration configuration is missing."""


class AuthenticationError(IntegrationError):
    """Composio authentication failed."""


class ConnectionRequiredError(IntegrationError):
    """The requested toolkit is not connected for this user."""

    def __init__(self, toolkit: str, auth_url: str | None = None) -> None:
        self.toolkit = toolkit
        self.auth_url = auth_url
        message = f"{toolkit} account is not connected."
        if auth_url:
            message = f"{message} Open the authorization URL and retry."
        super().__init__(message)


class RateLimitError(IntegrationError):
    """Composio or Google returned a rate limit response."""


class TemporaryServiceError(IntegrationError):
    """A retryable network or service failure occurred."""


@dataclass(frozen=True)
class AuthenticationFlow:
    """Result of starting authentication for a toolkit."""

    toolkit: str
    connected: bool
    authorization_url: str | None = None
    connection_request: Any | None = None


class ComposioSessionManager:
    """Owns Composio initialization, cached sessions, auth, and execution."""

    def __init__(
        self,
        user_id: str | None = None,
        api_key: str | None = None,
        cache_dir: str | None = None,
    ) -> None:
        self.user_id = user_id if user_id is not None else settings.COMPOSIO_USER_ID
        self.api_key = api_key if api_key is not None else settings.COMPOSIO_API_KEY
        self.cache_dir = cache_dir if cache_dir is not None else settings.COMPOSIO_CACHE_DIR
        self._composio: Any | None = None
        self._sessions: dict[str, Any] = {}

    def initialize(self) -> Any:
        """Initialize and return the single Composio SDK object."""
        self.validate_environment()
        if self._composio is not None:
            return self._composio

        os.environ.setdefault("COMPOSIO_CACHE_DIR", self.cache_dir)
        os.environ.setdefault("COMPOSIO_API_KEY", self.api_key)
        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)
        try:
            from composio import Composio
        except Exception as exc:
            raise ConfigurationError(
                "Could not import Composio SDK. Install project requirements."
            ) from exc

        try:
            self._composio = Composio(
                api_key=self.api_key,
                timeout=30,
                max_retries=0,
            )
        except Exception as exc:
            raise self._map_exception(exc) from exc
        return self._composio

    def get_session(self, user_id: str | None = None) -> Any:
        """Return a cached Composio session for a Nexus user."""
        uid = user_id or self.user_id
        if uid in self._sessions:
            return self._sessions[uid]

        composio = self.initialize()
        try:
            session = composio.sessions.create(
                user_id=uid,
                toolkits=["gmail", "googlecalendar"],
                tools={
                    "gmail": [
                        "GMAIL_SEND_EMAIL",
                        "GMAIL_CREATE_EMAIL_DRAFT",
                        "GMAIL_REPLY_TO_THREAD",
                        "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
                        "GMAIL_FETCH_EMAILS",
                        "GMAIL_ADD_LABEL_TO_EMAIL",
                    ],
                    "googlecalendar": [
                        "GOOGLECALENDAR_EVENTS_LIST",
                        "GOOGLECALENDAR_EVENTS_GET",
                        "GOOGLECALENDAR_CREATE_EVENT",
                        "GOOGLECALENDAR_PATCH_EVENT",
                        "GOOGLECALENDAR_DELETE_EVENT",
                        "GOOGLECALENDAR_FIND_EVENT",
                    ],
                },
                manage_connections=True,
                sandbox={"enable": False},
                preload={"tools": "all"},
            )
        except Exception as exc:
            raise self._map_exception(exc) from exc

        self._sessions[uid] = session
        return session

    def is_connected(self, toolkit: str, user_id: str | None = None) -> bool:
        """Return whether a toolkit has an active connection in the session."""
        uid = user_id or self.user_id
        logger.debug("is_connected: user_id=%s toolkit=%s", uid, toolkit)
        session = self.get_session(user_id)
        try:
            details = session.toolkits(toolkits=[toolkit], is_connected=True)
        except Exception as exc:
            raise self._map_exception(exc) from exc

        for item in getattr(details, "items", []):
            slug = getattr(item, "slug", None)
            is_no_auth = getattr(item, "is_no_auth", False)
            connection = getattr(item, "connection", None)
            is_active = getattr(connection, "is_active", None) if connection else None
            logger.debug(
                "is_connected: response item slug=%s is_no_auth=%s is_active=%s",
                slug, is_no_auth, is_active,
            )
            if slug != toolkit:
                continue
            if is_no_auth:
                return True
            if connection and is_active:
                return True
        return False

    def _authorize_raw(self, toolkit: str, user_id: str | None = None) -> Any:
        """Create an authorization request and return the raw ConnectionRequest."""
        uid = user_id or self.user_id
        logger.debug("authorize: user_id=%s toolkit=%s", uid, toolkit)
        session = self.get_session(user_id)
        try:
            request = session.authorize(toolkit)
        except Exception as exc:
            raise self._map_exception(exc) from exc
        logger.debug(
            "authorize: redirect_url=%s",
            getattr(request, "redirect_url", None),
        )
        return request

    def authorize(self, toolkit: str, user_id: str | None = None) -> str:
        """Create an authorization request and return its redirect URL."""
        request = self._authorize_raw(toolkit, user_id)
        return str(getattr(request, "redirect_url", ""))

    def start_authentication(
        self, toolkit: str, user_id: str | None = None
    ) -> AuthenticationFlow:
        """Check connection state and start OAuth when the toolkit is disconnected."""
        if self.is_connected(toolkit, user_id):
            return AuthenticationFlow(toolkit=toolkit, connected=True)
        request = self._authorize_raw(toolkit, user_id)
        return AuthenticationFlow(
            toolkit=toolkit,
            connected=False,
            authorization_url=str(getattr(request, "redirect_url", "")),
            connection_request=request,
        )

    def wait_for_connection(
        self, connection_request: Any, timeout: float = 60.0
    ) -> bool:
        """Poll the SDK until the connection becomes active or times out."""
        if connection_request is None:
            return False
        try:
            connection_request.wait_for_connection(timeout=timeout)
            return True
        except Exception as exc:
            logger.info("wait_for_connection: %s", exc)
            return False

    def tools(self, user_id: str | None = None) -> Any:
        """Return provider-wrapped tools for the cached session."""
        return self.get_session(user_id).tools()

    @traceable
    def execute(
        self,
        toolkit: str,
        tool_slug: str,
        arguments: dict[str, Any] | None = None,
        user_id: str | None = None,
        account: str | None = None,
    ) -> str:
        """Execute a session-scoped tool after connection checks and retries."""
        uid = user_id or self.user_id
        logger.debug(
            "execute: user_id=%s toolkit=%s tool=%s", uid, toolkit, tool_slug,
        )
        if not self.is_connected(toolkit, user_id):
            auth_url = self.authorize(toolkit, user_id)
            raise ConnectionRequiredError(toolkit=toolkit, auth_url=auth_url)

        def call() -> Any:
            session = self.get_session(user_id)
            return session.execute(
                tool_slug,
                arguments=arguments or {},
                account=account,
            )

        result = self._with_retries(tool_slug, call)
        return self._serialize_result(result)

    def structured_error(self, exc: IntegrationError, toolkit: str) -> str:
        """Return a stable JSON error string for LangChain tools."""
        payload: dict[str, Any] = {
            "ok": False,
            "error": {
                "type": exc.__class__.__name__,
                "toolkit": toolkit,
                "message": str(exc),
            },
        }
        if isinstance(exc, ConnectionRequiredError) and exc.auth_url:
            payload["error"]["authorization_url"] = exc.auth_url
            command_target = "calendar" if toolkit == "googlecalendar" else toolkit
            payload["error"]["command"] = f"python -m nexus auth {command_target}"
        return json.dumps(payload, indent=2, ensure_ascii=False)

    def validate_environment(self) -> None:
        """Validate required Composio environment settings."""
        missing = []
        if not self.api_key:
            missing.append("COMPOSIO_API_KEY")
        if not self.user_id:
            missing.append("COMPOSIO_USER_ID")
        if missing:
            names = ", ".join(missing)
            raise ConfigurationError(f"Missing {names}. Add it to .env.")

    def _with_retries(self, tool_slug: str, call: Callable[[], Any]) -> Any:
        failures = 0
        start = time.time()
        for attempt in range(len(RETRY_DELAYS_SECONDS) + 1):
            try:
                result = call()
                logger.info(
                    "composio.execute tool=%s duration=%.2fs success=true retries=%s",
                    tool_slug,
                    time.time() - start,
                    failures,
                )
                return result
            except Exception as exc:
                mapped = self._map_exception(exc)
                if not self._is_retryable(mapped) or attempt == len(RETRY_DELAYS_SECONDS):
                    logger.warning(
                        "composio.execute tool=%s duration=%.2fs success=false retries=%s error=%s",
                        tool_slug,
                        time.time() - start,
                        failures,
                        mapped.__class__.__name__,
                    )
                    raise mapped from exc
                delay = RETRY_DELAYS_SECONDS[attempt]
                failures += 1
                logger.info(
                    "composio.execute tool=%s retry=%s delay=%ss error=%s",
                    tool_slug,
                    failures,
                    delay,
                    mapped.__class__.__name__,
                )
                time.sleep(delay)

    def _is_retryable(self, exc: IntegrationError) -> bool:
        return isinstance(exc, (TemporaryServiceError, RateLimitError))

    def _map_exception(self, exc: Exception) -> IntegrationError:
        if isinstance(exc, IntegrationError):
            return exc

        try:
            from composio import exceptions as composio_exceptions
            from composio_client import (
                APIConnectionError,
                APITimeoutError,
                AuthenticationError as SDKAuthenticationError,
                PermissionDeniedError,
                RateLimitError as SDKRateLimitError,
            )
        except Exception:
            composio_exceptions = None
            APIConnectionError = APITimeoutError = SDKRateLimitError = ()  # type: ignore[assignment]
            SDKAuthenticationError = PermissionDeniedError = ()  # type: ignore[assignment]

        if composio_exceptions and isinstance(
            exc, composio_exceptions.ApiKeyNotProvidedError
        ):
            return ConfigurationError("Missing COMPOSIO_API_KEY. Add it to .env.")
        if isinstance(exc, SDKAuthenticationError):
            return AuthenticationError("Composio authentication failed.")
        if isinstance(exc, PermissionDeniedError):
            return AuthenticationError("Composio permissions are missing or expired.")
        if isinstance(exc, SDKRateLimitError):
            return RateLimitError("Composio rate limit reached. Retry later.")
        if isinstance(exc, (APITimeoutError, TimeoutError)):
            return TemporaryServiceError("Composio request timed out.")
        if isinstance(exc, APIConnectionError):
            return TemporaryServiceError("Temporary Composio connection failure.")

        status_code = getattr(exc, "status_code", None)
        if status_code == 401 or status_code == 403:
            return AuthenticationError("Composio authentication failed.")
        if status_code == 429:
            return RateLimitError("Composio rate limit reached. Retry later.")
        if isinstance(status_code, int) and status_code >= 500:
            return TemporaryServiceError("Temporary Composio service failure.")

        message = str(exc)
        lowered = message.lower()
        if "timed out" in lowered or "timeout" in lowered or "connection reset" in lowered:
            return TemporaryServiceError("Temporary Composio connection failure.")
        if "not connected" in lowered or "connected account" in lowered:
            return ConnectionRequiredError(toolkit="google")
        return IntegrationError(f"Integration failed: {message}")

    def _serialize_result(self, result: Any) -> str:
        if isinstance(result, str):
            return result
        if hasattr(result, "data") or hasattr(result, "error"):
            error = getattr(result, "error", None)
            if error:
                raise IntegrationError(str(error))
            return json.dumps(getattr(result, "data", result), indent=2, default=str, ensure_ascii=False)
        if hasattr(result, "model_dump"):
            result = result.model_dump()
        elif hasattr(result, "dict"):
            result = result.dict()

        if isinstance(result, dict):
            if result.get("successful") is False or result.get("success") is False:
                error = result.get("error") or "Tool execution failed."
                raise IntegrationError(str(error))
            data = result.get("data", result)
            return json.dumps(data, indent=2, default=str, ensure_ascii=False)
        return json.dumps(result, indent=2, default=str, ensure_ascii=False)


session_manager = ComposioSessionManager()
