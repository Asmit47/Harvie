"""Structured-output fallback stays off the success path and on for auth errors."""

import urllib.request

from harvie.core.llm import _LazyLLM, check_groq_api_key


class _AuthError(Exception):
    pass


def test_structured_output_does_not_call_fallback_on_success():
    def fallback_builder():
        raise AssertionError("fallback builder should not run")

    class Primary:
        model = "primary-model"

        def with_structured_output(self, schema, **kwargs):
            class Runner:
                def invoke(self, *args, **invoke_kwargs):
                    return {"ok": True}
            return Runner()

    llm = _LazyLLM(lambda: Primary(), fallback_builder)
    assert llm.with_structured_output(dict).invoke("hello") == {"ok": True}


def test_structured_output_falls_back_on_auth_error():
    calls = {"fallback": 0}

    class Primary:
        model = "groq-model"

        def with_structured_output(self, schema, **kwargs):
            class Runner:
                def invoke(self, *args, **invoke_kwargs):
                    raise _AuthError("invalid_api_key")
            return Runner()

    class Fallback:
        model = "gemini-model"

        def with_structured_output(self, schema, **kwargs):
            calls["fallback"] += 1

            class Runner:
                def invoke(self, *args, **invoke_kwargs):
                    return {"ok": True}
            return Runner()

    llm = _LazyLLM(lambda: Primary(), lambda: Fallback())
    assert llm.with_structured_output(dict).invoke("hello") == {"ok": True}
    assert calls["fallback"] == 1


def test_groq_startup_check_is_skipped_during_pytest(monkeypatch):
    def fail(*args, **kwargs):
        raise AssertionError("startup check should not reach Groq from tests")

    monkeypatch.setattr(urllib.request, "urlopen", fail)
    check_groq_api_key()
