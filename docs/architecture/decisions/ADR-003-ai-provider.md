# ADR-003 AI provider abstraction
**Decision:** `AIProvider` interface; implementations: echo (offline), openai_compatible (covers Ollama/llama.cpp/LM Studio/cloud), `local` alias; chosen by `AI_PROVIDER` env.
**Reason:** no provider or model name hard-coded in app code; works with no API key.
**Alternatives:** SDK per vendor now (more dependencies, premature).
**Advantages:** swap models via `.env`; stdlib only. **Disadvantages:** no streaming/tool-calling yet; GeminiProvider is PLANNED and must follow Google's current official docs.
**Future impact:** add a provider = one new class + one line in the factory.
