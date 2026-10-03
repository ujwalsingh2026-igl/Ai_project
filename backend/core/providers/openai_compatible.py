"""Provider for any server that speaks the OpenAI-style /chat/completions API.

Ollama, llama.cpp server, LM Studio and many cloud services expose this API,
so ONE class covers local models and several cloud providers. Uses only the
standard library (urllib) so there is no extra dependency.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from urllib.parse import urlparse

from .base import AIProvider, ChatMessage, ProviderConfigError, ProviderError, ProviderResponse

_MAX_RESPONSE_BYTES = 5_000_000


class OpenAICompatibleProvider(AIProvider):
    def __init__(self, base_url: str, model: str, api_key: str | None = None, timeout: float = 60.0, name: str = "openai_compatible"):
        if urlparse(base_url).scheme not in ("http", "https"):
            raise ProviderConfigError("AI_BASE_URL must start with http:// or https://")
        if not model:
            raise ProviderConfigError("AI_MODEL is required")
        self.name = name
        self.model = model
        self._url = base_url.rstrip("/") + "/chat/completions"
        self._api_key = api_key
        self._timeout = timeout

    def generate(self, messages: list[ChatMessage], *, system: str | None = None) -> ProviderResponse:
        payload_messages = [{"role": "system", "content": system}] if system else []
        payload_messages += [{"role": m.role, "content": m.content} for m in messages]
        body = json.dumps({"model": self.model, "messages": payload_messages, "stream": False}).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        request = urllib.request.Request(self._url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as resp:
                data = json.loads(resp.read(_MAX_RESPONSE_BYTES).decode("utf-8"))
        except (urllib.error.URLError, OSError, ValueError) as exc:
            # Only the exception TYPE is reported: messages could contain URLs/keys.
            raise ProviderError(f"{self.name} request failed ({type(exc).__name__})") from exc
        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError(f"{self.name} returned an unexpected response") from exc
        if not isinstance(text, str):
            raise ProviderError(f"{self.name} returned an unexpected response")
        return ProviderResponse(text=text, provider=self.name, model=self.model)
