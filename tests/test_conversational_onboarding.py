import copy
import json
from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import patch

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.checkpoint.memory import InMemorySaver

from harvie.api.main import app
from harvie.api.routes import chat as chat_routes, profile as profile_routes, session as session_routes
from harvie.core.config import settings
from harvie.core.graph import graph
from harvie.core.onboarding import parse_name
from harvie.integrations.composio.session import ConfigurationError
from harvie.memory import conversation
from harvie.memory.persona import _normalize_profile, persona_values
from harvie.memory.tier1_persona import format_persona
from harvie.memory.tier2_session import get_tier2_context


class TestConversationalOnboarding(TestCase):
    """Exercise real graph checkpoints and API contracts without network services."""

    def setUp(self):
        self.personas = {}
        self.checkpointer = InMemorySaver()
        self.graph = graph.compile(checkpointer=self.checkpointer)
        for module in (conversation, chat_routes, session_routes):
            self.patch(module, "compiled_graph", self.graph)
        self.patch(session_routes, "checkpointer", self.checkpointer)
        self.patch(chat_routes, "conversation_lock", nullcontext)
        self.patch(chat_routes, "get_persona", self.get_persona)
        self.patch(profile_routes, "get_persona", self.get_persona)
        self.patch(conversation, "update_persona", self.update_persona)
        self.learner = self.patch(chat_routes, "learn_persona_from_message")
        self.connected = self.patch(chat_routes.session_manager, "is_connected", return_value=False)
        self.model = self.start_patch(patch("harvie.nodes.generate_answer.llm_with_tools.invoke", return_value=AIMessage(content="I can help with that.")))
        self.context = self.start_patch(patch("harvie.nodes.load_context.build_context", side_effect=self.build_context))
        self.client = TestClient(app, raise_server_exceptions=False)
        self.counter = 0

    def start_patch(self, patcher):
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    def patch(self, target, name, *args, **kwargs):
        return self.start_patch(patch.object(target, name, *args, **kwargs))

    def get_persona(self, user_id=None):
        uid = user_id or settings.HARVIE_USER_ID
        if uid not in self.personas:
            self.personas[uid] = {
                "profile": _normalize_profile({}),
                "onboarding_complete": False,
                "onboarding_step": 0,
                "updated_at": None,
            }
        return copy.deepcopy(self.personas[uid])

    def update_persona(self, changes, user_id=None, **metadata):
        uid = user_id or settings.HARVIE_USER_ID
        current = self.get_persona(uid)
        for key, value in changes.items():
            current["profile"][key] = {
                "value": value, "status": metadata.get("status", "confirmed"),
                "source": metadata.get("source", "manual"), "confidence": 1.0, "updated_at": None,
            }
        for key, argument in (("onboarding_step", "onboarding_step"), ("onboarding_complete", "onboarding_complete")):
            if metadata.get(argument) is not None:
                current[key] = metadata[argument]
        self.personas[uid] = current
        return copy.deepcopy(current)

    def build_context(self, message, state):
        return {
            "mode": "chat", "attention_items": [],
            "response_context": {
                "persona": format_persona(persona_values(self.get_persona()["profile"])),
                "active_session": get_tier2_context(state),
            },
        }

    def headers(self, user="account_one"):
        return {"x-harvie-user-id": user, "x-harvie-proxy-secret": settings.HARVIE_API_PROXY_SECRET}

    def start(self, user="account_one"):
        response = self.client.post("/chat/start", json={"timezone": "Asia/Kolkata"}, headers=self.headers(user))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def send(self, message, user="account_one", request_id=None, session_id="welcome", **selection):
        self.counter += 1
        return self.client.post("/chat", headers=self.headers(user), json={
            "message": message, "session_id": session_id,
            "request_id": request_id or f"request-{self.counter}", **selection,
        })

    def reply(self, message, **kwargs):
        response = self.send(message, **kwargs)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def reach_connections(self):
        self.start()
        return self.reply("Asmit")

    def test_bootstrap_is_idempotent_and_saves_welcome_before_first_user_message(self):
        first, second = self.start(), self.start()
        self.assertEqual(first["session"], second["session"])
        history = first["session"]["conversation_history"]
        self.assertEqual([turn["role"] for turn in history], ["assistant", "assistant"])
        self.assertEqual(first["session"]["onboarding_stage"], "name")
        self.assertEqual(first["profile"]["fields"]["timezone"]["value"], "Asia/Kolkata")
        sessions = self.client.get("/sessions", headers=self.headers()).json()
        self.assertEqual([session["id"] for session in sessions], ["welcome"])
        self.model.assert_not_called()
        self.learner.assert_not_called()

    def test_scripted_flow_and_cards_survive_reload_without_llm_calls(self):
        self.start()
        named = self.reply("My name is Asmit")
        self.assertEqual(named["profile"]["name"], "Asmit")
        card_turn = named["session"]["conversation_history"][-1]
        self.assertEqual([card["toolkit"] for card in card_turn["connections"]], ["gmail", "googlecalendar"])
        completed = self.reply("I'll connect later", prompt_id=card_turn["id"], choice_id="connect-later")
        self.assertTrue(completed["profile"]["onboarding_complete"])
        self.assertEqual(completed["session"]["onboarding_stage"], "complete")
        reloaded = self.start()
        self.assertEqual(reloaded["session"], completed["session"])
        self.assertEqual(reloaded["profile"]["fields"]["name"]["source"], "onboarding")
        self.model.assert_not_called()
        self.learner.assert_not_called()

    def test_off_script_question_uses_llm_and_preserves_unfinished_step(self):
        self.start()
        answered = self.reply("What can you help me with?")
        self.assertEqual(answered["response_source"], "llm")
        self.assertEqual(answered["session"]["onboarding_stage"], "name")
        self.assertEqual(answered["profile"]["name"], "")
        system = self.model.call_args.args[0][0].content
        self.assertIn("waiting for the user's name", system)
        self.assertIn("The optional welcome is waiting for the user's name", system)
        self.reply("Asmit")
        self.assertEqual(self.model.call_count, 1)
        self.learner.assert_called_once_with("What can you help me with?")

    def test_first_task_completes_optional_connection_step(self):
        self.reach_connections()
        response = self.reply("Help me plan my day")
        self.assertEqual(response["response_source"], "llm")
        self.assertTrue(response["profile"]["onboarding_complete"])
        self.assertIn("Asmit", self.model.call_args.args[0][0].content)

    def test_skip_name_and_keep_default_assistant_are_supported(self):
        self.start()
        self.reply("Skip for now")
        completed = self.reply("I'll connect later")
        self.assertEqual(completed["profile"]["name"], "")
        self.assertTrue(completed["profile"]["onboarding_complete"])
        self.model.assert_not_called()

    def test_duplicate_send_is_idempotent_and_stale_choices_are_rejected(self):
        self.start()
        first = self.reply("Asmit", request_id="same-request")
        retry = self.reply("Asmit", request_id="same-request")
        self.assertEqual(first["session"], retry["session"])
        prompt = first["session"]["conversation_history"][-1]
        self.reply("I'll connect later", prompt_id=prompt["id"], choice_id="connect-later")
        stale = self.send("I'll connect later", prompt_id=prompt["id"], choice_id="connect-later")
        self.assertEqual(stale.status_code, 409)
        mismatch = self.send("A different name", request_id="same-request")
        self.assertEqual(mismatch.status_code, 409)
        invalid = self.send("I'll connect later", prompt_id="missing-prompt", choice_id="connect-later")
        self.assertEqual(invalid.status_code, 422)
        self.model.assert_not_called()

    def test_llm_failure_saves_user_message_and_retry_does_not_duplicate_it(self):
        self.start()
        self.model.side_effect = [RuntimeError("temporary failure"), AIMessage(content="Here is the answer.")]
        with self.assertLogs(chat_routes.logger, level="ERROR"):
            failure = self.send("What can you do?", request_id="retryable")
        self.assertEqual(failure.status_code, 503)
        saved = self.client.get("/sessions/welcome", headers=self.headers()).json()
        self.assertEqual(saved["conversation_history"][-1]["content"], "What can you do?")
        retried = self.reply("What can you do?", request_id="retryable")
        replayed = self.reply("What can you do?", request_id="retryable")
        history = retried["session"]["conversation_history"]
        self.assertEqual(sum(turn["id"] == "user:retryable" for turn in history), 1)
        self.assertEqual(sum(turn["reply_to"] == "user:retryable" for turn in history), 1)
        self.assertEqual(retried["session"], replayed["session"])
        self.assertEqual(self.model.call_count, 2)

    def test_retry_resumes_after_tool_checkpoint_instead_of_reexecuting_tool(self):
        self.start()
        self.model.side_effect = [
            AIMessage(content="", tool_calls=[{"id": "tool-1", "name": "test_tool", "args": {}}]),
            RuntimeError("reply failed after tool executed"),
            AIMessage(content="The task is done."),
        ]
        tool = self.start_patch(patch("harvie.nodes.tool_executor._tool_executor.invoke", return_value={
            "messages": [ToolMessage(content="Executed successfully", tool_call_id="tool-1")],
        }))
        with self.assertLogs(chat_routes.logger, level="ERROR"):
            failure = self.send("Help me with this task", request_id="tool-retry")
        self.assertEqual(failure.status_code, 503)
        retried = self.reply("Help me with this task", request_id="tool-retry")
        self.assertEqual(retried["answer"], "The task is done.")
        tool.assert_called_once()
        self.context.assert_called_once()
        self.assertTrue(any(isinstance(message, ToolMessage) for message in self.model.call_args.args[0]))

    def test_interrupted_choice_keeps_its_routing_metadata_on_reload_and_retry(self):
        started = self.start()
        self.graph.update_state(
            {"configurable": {"thread_id": "account_one:welcome"}},
            {"conversation_history": started["session"]["conversation_history"] + [{
                "id": "message-choice", "role": "assistant", "content": "Continue your earlier request?",
                "choices": [{"id": "continue", "label": "Continue", "value": "Elena", "kind": "message"}],
            }]},
            as_node="persist_memory",
        )
        self.model.side_effect = [RuntimeError("model temporarily unavailable"), AIMessage(content="Answered the request.")]
        with self.assertLogs(chat_routes.logger, level="ERROR"):
            failure = self.send("Elena", request_id="interrupted-choice", prompt_id="message-choice", choice_id="continue")
        self.assertEqual(failure.status_code, 503)
        reloaded = self.start()
        pending = reloaded["session"]["conversation_history"][-1]
        self.assertEqual((pending["prompt_id"], pending["choice_id"]), ("message-choice", "continue"))
        retried = self.reply("Elena", request_id="interrupted-choice")
        self.assertEqual(retried["response_source"], "llm")
        self.assertEqual(retried["profile"]["name"], "")
        self.assertEqual(retried["session"]["onboarding_stage"], "name")

    def test_oauth_confirmation_preserves_suspended_tool_loop(self):
        self.reach_connections()
        self.model.side_effect = [
            AIMessage(content="", tool_calls=[{"id": "done-tool", "name": "test_tool", "args": {}}]),
            RuntimeError("reply failed after execution"),
            AIMessage(content="The earlier task is done."),
        ]
        tool = self.start_patch(patch("harvie.nodes.tool_executor._tool_executor.invoke", return_value={
            "messages": [ToolMessage(content="Executed successfully", tool_call_id="done-tool")],
        }))
        with self.assertLogs(chat_routes.logger, level="ERROR"):
            failure = self.send("Help me with this task", request_id="oauth-during-retry")
        self.assertEqual(failure.status_code, 503)
        self.connected.return_value = True
        confirmation = self.client.post("/chat/connections/complete", headers=self.headers(), json={"session_id": "welcome", "toolkit": "gmail"})
        self.assertEqual(confirmation.status_code, 200, confirmation.text)
        self.start()
        retried = self.reply("Help me with this task", request_id="oauth-during-retry")
        self.assertEqual(retried["answer"], "The earlier task is done.")
        tool.assert_called_once()
        self.context.assert_called_once()
        self.assertIn("Verified connection: Gmail", self.model.call_args.args[0][0].content)

    def test_profile_write_failure_is_recovered_from_checkpoint(self):
        self.start()
        with patch.object(conversation, "update_persona", side_effect=RuntimeError("profile temporarily unavailable")):
            failure = self.send("Asmit", request_id="profile-retry")
        self.assertEqual(failure.status_code, 500)
        reloaded = self.start()
        self.assertEqual(reloaded["profile"]["name"], "Asmit")
        retried = self.reply("Asmit", request_id="profile-retry")
        self.assertEqual(retried["session"], reloaded["session"])
        self.model.assert_not_called()

    def test_reply_enrichment_failure_recovers_without_regenerating_answer(self):
        self.reach_connections()
        with patch.object(chat_routes, "_finish_llm_turn", side_effect=RuntimeError("API interrupted")):
            failure = self.send("Help me plan today", request_id="enrichment-retry")
        self.assertEqual(failure.status_code, 500)
        recovered = self.reply("Help me plan today", request_id="enrichment-retry")
        self.assertTrue(recovered["profile"]["onboarding_complete"])
        self.model.assert_called_once()

    def test_connection_completion_is_verified_persisted_and_idempotent(self):
        self.reach_connections()
        payload = {"session_id": "welcome", "toolkit": "gmail"}
        not_connected = self.client.post("/chat/connections/complete", headers=self.headers(), json=payload)
        self.assertEqual(not_connected.status_code, 409)
        self.connected.return_value = True
        first = self.client.post("/chat/connections/complete", headers=self.headers(), json=payload)
        second = self.client.post("/chat/connections/complete", headers=self.headers(), json=payload)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()["session"], second.json()["session"])
        self.assertTrue(first.json()["profile"]["onboarding_complete"])
        history = second.json()["session"]["conversation_history"]
        self.assertEqual(sum(turn["id"] == "connection:gmail" for turn in history), 1)
        self.model.assert_not_called()

    def test_missing_connection_from_tool_becomes_durable_card_and_resumable_request(self):
        self.start()
        self.model.side_effect = [
            AIMessage(content="", tool_calls=[{"id": "mail-1", "name": "test_mail", "args": {}}]),
            AIMessage(content="Connect Gmail and I'll check your inbox."),
            AIMessage(content="Your inbox is ready."),
        ]
        self.start_patch(patch("harvie.nodes.tool_executor._tool_executor.invoke", return_value={"messages": [ToolMessage(
            content=json.dumps({"ok": False, "error": {"type": "ConnectionRequiredError", "toolkit": "gmail", "authorization_url": "https://example.com/auth"}}),
            tool_call_id="mail-1",
        )]}))
        missing = self.reply("Check my inbox")
        self.assertEqual(missing["connection_request"]["toolkit"], "gmail")
        reloaded = self.start()
        card = reloaded["session"]["conversation_history"][-1]["connections"][0]
        self.assertEqual(card["resume_message"], "Check my inbox")
        self.assertNotIn("authorization_url", card)
        self.connected.return_value = True
        connected = self.client.post("/chat/connections/complete", headers=self.headers(), json={"session_id": "welcome", "toolkit": "gmail"})
        self.assertEqual(connected.status_code, 200, connected.text)
        self.assertEqual(connected.json()["session"]["onboarding_stage"], "name")
        prompt = connected.json()["session"]["conversation_history"][-1]
        resumed = self.reply("Check my inbox", prompt_id=prompt["id"], choice_id="resume-request")
        self.assertEqual(resumed["answer"], "Your inbox is ready.")
        self.assertFalse(resumed["connection_request"])
        self.assertFalse(resumed["session"]["conversation_history"][-1]["connections"])

    def test_per_user_welcome_threads_and_profiles_are_isolated(self):
        self.start("account_one")
        self.reply("Asmit", user="account_one")
        hidden = self.client.get("/sessions/welcome", headers=self.headers("account_two"))
        self.assertEqual(hidden.status_code, 404)
        second = self.start("account_two")
        self.assertEqual(second["profile"]["name"], "")
        self.assertEqual(second["session"]["message_count"], 2)
        self.assertEqual(second["session"]["onboarding_stage"], "name")
        self.assertEqual(self.start("account_one")["profile"]["name"], "Asmit")

    def test_existing_partial_and_completed_profiles_are_respected(self):
        self.update_persona({"name": "Existing"}, "account_one", onboarding_step=1)
        resumed = self.start()
        self.assertEqual(resumed["session"]["onboarding_stage"], "connections")
        self.assertTrue(all(turn["role"] == "assistant" for turn in resumed["session"]["conversation_history"]))
        self.update_persona({"name": "Returning"}, "account_two", onboarding_step=3, onboarding_complete=True)
        returning = self.start("account_two")
        self.assertIsNone(returning["session"]["onboarding_stage"])
        self.assertTrue(returning["profile"]["onboarding_complete"])
        self.assertNotEqual(returning["session"]["id"], "welcome")
        self.model.assert_not_called()

    def test_integration_status_uses_user_account_not_presence_of_api_key(self):
        self.connected.side_effect = lambda toolkit: toolkit == "gmail"
        with patch.object(settings, "COMPOSIO_API_KEY", "configured"):
            response = self.client.get("/integrations", headers=self.headers())
        self.assertEqual(response.status_code, 200)
        statuses = {item["toolkit"]: item["status"] for item in response.json()["integrations"] if item["toolkit"]}
        self.assertEqual(statuses, {"gmail": "connected", "googlecalendar": "idle"})
        self.connected.side_effect = ConfigurationError("Integration is unavailable")
        unavailable = self.client.get("/integrations/gmail/status", headers=self.headers())
        self.assertEqual(unavailable.status_code, 503)

    def test_validation_rejects_blank_message_bad_timezone_and_unsupported_connector(self):
        self.assertEqual(self.send("   ").status_code, 422)
        self.assertEqual(self.client.post("/chat/start", json={"timezone": "not/a/timezone"}, headers=self.headers()).status_code, 422)
        self.assertEqual(self.client.post("/integrations/connect", json={"toolkit": "unsupported"}, headers=self.headers()).status_code, 422)

    def test_name_parser_does_not_turn_greetings_questions_or_tasks_into_names(self):
        for text in ("Hey", "Good morning", "What can you do?", "Send email", "Plan my day", "Working on projects", "Something else", "I'm a developer", "Testing stuff", "Weather", "Dashboard design"):
            with self.subTest(text=text):
                self.assertIsNone(parse_name(text))
        self.assertEqual(parse_name("My name is José"), "José")
        self.assertEqual(parse_name("asmit kaushal"), "asmit kaushal")

    def test_only_actual_connection_required_tool_errors_create_cards(self):
        payload = json.dumps({"error": {"type": "ConnectionRequiredError", "toolkit": "gmail"}})
        self.assertIsNone(chat_routes.extract_connection_request({"messages": [HumanMessage(content=payload)]}, []))
        self.assertIsNone(chat_routes.extract_connection_request({}, [json.dumps({"error": {"type": "ConfigurationError", "toolkit": "gmail"}})]))

    def test_long_welcome_thread_gives_model_recent_context_instead_of_oldest_turns(self):
        state = {"conversation_history": [
            {"role": "assistant", "content": "old welcome " * 100},
            {"role": "user", "content": "the latest project request"},
            {"role": "assistant", "content": "the latest project answer"},
        ]}
        with patch.object(settings, "SESSION_CONTEXT_MAX_CHARS", 300):
            context = get_tier2_context(state)
        self.assertLessEqual(len(context), 300)
        self.assertIn("the latest project request", context)
        self.assertIn("the latest project answer", context)
        self.assertNotIn("old welcome", context)
