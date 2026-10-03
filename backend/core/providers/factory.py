"""Builds the provider from ONE central config object (no model names elsewhere)."""
from __future__ import annotations

from dataclasses import dataclass, field

from .base import AIProvider, ProviderConfigError
from .echo import EchoProvider
from .gemini import GeminiProvider
from .openai_compatible import OpenAICompatibleProvider

OLLAMA_DEFAULT_URL = "http://localhost:11434/v1"
DEFAULT_LOCAL_MODEL = "llama3.2:latest"


@dataclass(frozen=True)
class ProviderConfig:
    provider: str = "echo"             # echo | local | openai_compatible | gemini
    base_url: str | None = None
    model: str | None = None
    api_key: str | None = field(default=None, repr=False)   # repr=False: never printed in logs
    timeout: float = 60.0


def create_provider(config: ProviderConfig) -> AIProvider:
    kind = (config.provider or "echo").lower()
    if kind == "echo":
        return EchoProvider()
    if kind == "local":
        if not config.model:
            raise ProviderConfigError("AI_MODEL is required for local provider")
        return OpenAICompatibleProvider(
            config.base_url or OLLAMA_DEFAULT_URL,
            config.model,
            config.api_key,
            config.timeout,
            name="local",
        )
    if kind == "openai_compatible":
        if not config.base_url:
            raise ProviderConfigError("AI_BASE_URL is required for openai_compatible")
        return OpenAICompatibleProvider(config.base_url, config.model or "", config.api_key, config.timeout)
    if kind == "gemini":
        if not config.api_key:
            raise ProviderConfigError("AI_API_KEY is required for GeminiProvider")
        return GeminiProvider(config.api_key, config.model, config.timeout)
    raise ProviderConfigError(f"Unknown AI_PROVIDER: {kind!r}")

