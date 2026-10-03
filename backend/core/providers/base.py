"""AI provider abstraction. The rest of the app only knows THIS interface."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


class ProviderError(Exception):
    """The AI provider failed (network, bad response, ...). Never contains secrets."""


class ProviderConfigError(ValueError):
    """AI settings are wrong or incomplete."""


@dataclass(frozen=True)
class ChatMessage:
    role: str      # "user" or "assistant"
    content: str


@dataclass(frozen=True)
class ProviderResponse:
    text: str
    provider: str
    model: str | None = None


class AIProvider(ABC):
    name: str = "base"

    @abstractmethod
    def generate(self, messages: list[ChatMessage], *, system: str | None = None) -> ProviderResponse: ...
