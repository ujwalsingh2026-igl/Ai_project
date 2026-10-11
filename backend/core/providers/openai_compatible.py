"""Provider for any server that speaks the OpenAI-style /chat/completions API.

Ollama, llama.cpp server, LM Studio and many cloud services expose this API,
so ONE class covers local models and several cloud providers. Uses only the
standard library (urllib) so there is no extra dependency.
"""
from __future__ import annotations

import json
import socket
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

    def check_health(self) -> bool:
        """Verifies upstream AI host socket reachability (< 1ms)."""
        parsed = urlparse(self._url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        try:
            with socket.create_connection((host, port), timeout=0.3):
                return True
        except (OSError, socket.timeout):
            return False

    def generate(self, messages: list[ChatMessage], *, system: str | None = None) -> ProviderResponse:
        payload_messages = [{"role": "system", "content": system}] if system else []
        payload_messages += [{"role": m.role, "content": m.content} for m in messages]

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": payload_messages,
            "stream": False,
            "max_tokens": 100,
            "temperature": 0.2,
        }
        effective_timeout = self._timeout
        if "11434" in self._url or "localhost" in self._url or "127.0.0.1" in self._url:
            payload["max_tokens"] = 14
            payload["options"] = {
                "num_predict": 14,
                "num_ctx": 128,
                "temperature": 0.2,
                "top_k": 20,
                "num_thread": 8,
            }
            payload["keep_alive"] = "60m"


        body = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        request = urllib.request.Request(self._url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=effective_timeout) as resp:
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
