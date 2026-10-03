"""Google Gemini API Provider for Aegis.

Uses Google's generative language REST API via Python standard library (urllib).
Zero third-party dependencies required. Supports gemini-2.5-flash, gemini-1.5-flash,
gemini-1.5-pro, etc.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from urllib.parse import quote

from .base import AIProvider, ChatMessage, ProviderConfigError, ProviderError, ProviderResponse

_DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
_MAX_RESPONSE_BYTES = 5_000_000


class GeminiProvider(AIProvider):
    name: str = "gemini"

    def __init__(self, api_key: str, model: str | None = None, timeout: float = 60.0):
        if not api_key:
            raise ProviderConfigError("AI_API_KEY is required for GeminiProvider")
        self._api_key = api_key
        self.model = model or _DEFAULT_GEMINI_MODEL
        self._timeout = timeout

    def generate(self, messages: list[ChatMessage], *, system: str | None = None) -> ProviderResponse:
        encoded_model = quote(self.model, safe="")
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{encoded_model}:generateContent"
            f"?key={self._api_key}"
        )

        contents = []
        for msg in messages:
            # Map "assistant" to "model" for Gemini API convention
            role = "model" if msg.role == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": msg.content}]})

        payload: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 2048,
            },
        }

        if system:
            payload["systemInstruction"] = {
                "parts": [{"text": system}]
            }

        body = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Aegis-Command-Center/1.0",
        }

        request = urllib.request.Request(url, data=body, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as resp:
                raw_data = resp.read(_MAX_RESPONSE_BYTES).decode("utf-8")
                data = json.loads(raw_data)
        except urllib.error.HTTPError as exc:
            # Mask API key in error reporting
            err_body = ""
            try:
                err_body = exc.read().decode("utf-8", errors="replace")[:300]
            except Exception:
                pass
            raise ProviderError(f"Gemini API returned HTTP {exc.code}: {err_body or exc.reason}") from exc
        except (urllib.error.URLError, OSError, ValueError) as exc:
            raise ProviderError(f"Gemini request failed ({type(exc).__name__})") from exc

        try:
            candidates = data.get("candidates", [])
            if not candidates:
                # Handle safety finish reason or empty output
                feedback = data.get("promptFeedback", {})
                block_reason = feedback.get("blockReason", "No candidates returned")
                raise ProviderError(f"Gemini response was blocked: {block_reason}")

            parts = candidates[0].get("content", {}).get("parts", [])
            text_chunks = [p.get("text", "") for p in parts if "text" in p]
            text = "".join(text_chunks).strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError("Gemini returned an unexpected response structure") from exc

        if not text:
            finish_reason = candidates[0].get("finishReason", "EMPTY")
            raise ProviderError(f"Gemini returned empty text (finishReason: {finish_reason})")

        return ProviderResponse(text=text, provider=self.name, model=self.model)
