"""PostgreSQL connection pool lifecycle and schema management."""

from contextlib import contextmanager
import logging
from typing import Generator

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from harvie.core.config import settings

logger = logging.getLogger(__name__)

# Pool initialized with open=False so no connections or worker threads leak at import time
pool = ConnectionPool(
    conninfo=settings.NORMALIZED_DATABASE_URL,
    min_size=1,
    max_size=10,
    open=False,
    kwargs={"autocommit": True, "row_factory": dict_row},
)


def open_pool(conninfo: str | None = None) -> None:
    """Open the connection pool if not already open."""
    if conninfo and conninfo != pool.conninfo:
        if not pool.closed:
            pool.close()
        pool.conninfo = conninfo

    if pool.closed:
        if not pool.conninfo:
            raise RuntimeError("DATABASE_URL is not configured. PostgreSQL connection required.")
        logger.info("Opening PostgreSQL connection pool...")
        pool.open()


def close_pool() -> None:
    """Gracefully close and drain the connection pool."""
    if not pool.closed:
        logger.info("Closing PostgreSQL connection pool...")
        pool.close()


def is_pool_open() -> bool:
    """Return True if the connection pool is currently open."""
    return not pool.closed


@contextmanager
def get_db_connection() -> Generator[Connection, None, None]:
    """Yield a connection from the pool, ensuring the pool is open."""
    open_pool()
    with pool.connection() as conn:
        yield conn


def init_db(conninfo: str | None = None) -> None:
    """Initialize PostgreSQL database tables, indices, and LangGraph checkpointer schema."""
    open_pool(conninfo)

    # 1. Operational memory schema
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS open_loops (
                    id VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(128) NOT NULL,
                    type VARCHAR(64) NOT NULL,
                    title TEXT NOT NULL,
                    details TEXT NOT NULL DEFAULT '',
                    status VARCHAR(32) NOT NULL DEFAULT 'open',
                    priority VARCHAR(32) NOT NULL DEFAULT 'medium',
                    due_at TEXT,
                    snoozed_until TEXT,
                    source_type VARCHAR(64),
                    source_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    completed_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_open_loops_active ON open_loops(user_id, status, due_at);

                CREATE TABLE IF NOT EXISTS task_refs (
                    id VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(128) NOT NULL,
                    provider VARCHAR(64) NOT NULL,
                    external_id VARCHAR(255) NOT NULL,
                    open_loop_id VARCHAR(64),
                    url TEXT,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    UNIQUE(user_id, provider, external_id)
                );

                CREATE TABLE IF NOT EXISTS agent_state (
                    key VARCHAR(255) PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS persona_profiles (
                    user_id VARCHAR(128) PRIMARY KEY,
                    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
                    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
                    onboarding_step SMALLINT NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                ALTER TABLE persona_profiles
                    ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT NOT NULL DEFAULT 0;

                CREATE TABLE IF NOT EXISTS event_snapshots (
                    id VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(128) NOT NULL,
                    provider VARCHAR(64) NOT NULL,
                    external_id VARCHAR(255) NOT NULL,
                    payload TEXT NOT NULL,
                    observed_at TEXT NOT NULL,
                    expires_at TEXT,
                    UNIQUE(user_id, provider, external_id)
                );
                """
            )

    # 2. LangGraph checkpointer schema
    from harvie.memory.tier2_session import checkpointer

    checkpointer.setup()
    logger.info("Database schema and LangGraph checkpointer initialized successfully.")
