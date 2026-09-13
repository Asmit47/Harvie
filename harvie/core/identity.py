"""Request-scoped identities supplied by the authenticated frontend proxy."""

from contextvars import ContextVar, Token

_request_user_id: ContextVar[str | None] = ContextVar("harvie_request_user_id", default=None)


def set_request_user_id(user_id: str) -> Token[str | None]:
    return _request_user_id.set(user_id)


def reset_request_user_id(token: Token[str | None]) -> None:
    _request_user_id.reset(token)


def get_request_user_id() -> str | None:
    return _request_user_id.get()
