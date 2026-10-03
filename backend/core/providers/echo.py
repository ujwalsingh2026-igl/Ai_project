"""EchoProvider: no AI at all. Lets the whole system run and be tested offline."""
from __future__ import annotations

from .base import AIProvider, ChatMessage, ProviderResponse


class EchoProvider(AIProvider):
    name = "echo"

    def generate(self, messages: list[ChatMessage], *, system: str | None = None) -> ProviderResponse:
        last = messages[-1].content if messages else ""
        text = "[EchoProvider - no real AI model is configured]\n" + last
        return ProviderResponse(text=text, provider=self.name, model=None)
