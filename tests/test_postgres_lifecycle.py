import asyncio
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from unittest import TestCase
from unittest.mock import MagicMock, patch


class TestPostgresLifecycle(TestCase):
    def test_pool_uses_postgres_safe_connection_options(self):
        from harvie.core import db

        self.assertEqual(db.pool.min_size, 1)
        self.assertEqual(db.pool.max_size, 10)
        self.assertTrue(db.pool.kwargs["autocommit"])
        self.assertIsNotNone(db.pool.kwargs["row_factory"])

    def test_init_db_sets_up_application_and_checkpoint_schema(self):
        from harvie.core import db

        connection = MagicMock()

        @contextmanager
        def connection_context():
            yield connection

        checkpointer = MagicMock()
        with (
            patch.object(db, "open_pool") as open_pool,
            patch.object(db, "get_db_connection", connection_context),
            patch("harvie.memory.tier2_session.checkpointer", checkpointer),
        ):
            db.init_db("postgresql://localhost/harvie")

        open_pool.assert_called_once_with("postgresql://localhost/harvie")
        connection.cursor.assert_called()
        checkpointer.setup.assert_called_once_with()

    def test_fastapi_lifespan_initializes_cleans_and_closes(self):
        from harvie.api.main import app, lifespan

        async def exercise():
            with (
                patch("harvie.core.db.init_db") as init_db,
                patch("harvie.core.db.close_pool") as close_pool,
                patch("harvie.memory.tier2_session.cleanup_expired_sessions") as cleanup,
                patch("harvie.api.main.session_manager.validate_environment") as validate,
            ):
                async with lifespan(app):
                    init_db.assert_called_once_with()
                    cleanup.assert_called_once_with()
                    validate.assert_called_once_with()
                close_pool.assert_called_once_with()

        asyncio.run(exercise())

    def test_expired_threads_are_removed_from_postgres_checkpointer(self):
        from harvie.memory import tier2_session

        old = (datetime.now(timezone.utc) - timedelta(hours=49)).isoformat()
        checkpoint = MagicMock()
        checkpoint.checkpoint = {"ts": old}
        checkpoint.config = {"configurable": {"thread_id": "user:expired"}}
        with patch.object(tier2_session.checkpointer, "list", return_value=[checkpoint]), patch.object(
            tier2_session.checkpointer, "delete_thread"
        ) as delete_thread:
            tier2_session.cleanup_expired_sessions()

        delete_thread.assert_called_once_with("user:expired")
