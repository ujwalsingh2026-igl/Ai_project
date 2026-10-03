# ADR-014: Autonomous Agent Architecture & Gemini Provider Integration

## Status
Accepted

## Context
In previous phases (Phases A through H), the system relied on `EchoProvider` by default and a 1-turn `RuleBasedIntentRouter` that matched hardcoded regex triggers. If a user asked a natural language question (e.g. "What listening ports are currently open on my machine?" or "Can you evaluate my security posture?"), the regex router failed to identify the tool, falling back to chat. Furthermore, with `AI_PROVIDER=echo`, responses were verbatim echoes rather than intelligent agent syntheses.

The operator requested transitioning from a dummy/echo setup into a real, sovereign AI Agent tailored to the Aegis Command Center concept. The host environment already has Ollama running with `llama3.2:latest`, and Google Gemini is a high-performance alternative for cloud-assisted operations.

## Decision
1. **Autonomous Agent Intent Router (`AgentIntentRouter`)**:
   - Replaced single-regex routing with a tiered agent decision pipeline:
     1. **Fast Direct Triggers**: Sub-millisecond regex matching for standard commands (`daily brief`, `system info`) ensuring zero latency and deterministic test execution.
     2. **LLM Function Calling & Tool Selection**: When an active AI model (local Ollama or cloud Gemini) is connected, the router formats the entire registry's tool catalog (`name`, `description`, `input_schema`) and prompts the model to choose either a tool with extracted JSON arguments or conversational chat.
     3. **Semantic Keyword Heuristics**: If the LLM is busy, offline, or returns malformed output, high-precision keyword patterns match natural requests (e.g., "open ports", "connected devices", "process anomalies", "intrusions") without crashing.
2. **Gemini API Provider (`GeminiProvider`)**:
   - Implemented standard-library `urllib` integration for Google's Gemini REST API (`gemini-2.5-flash`, `gemini-1.5-flash`, etc.).
   - Zero third-party dependencies required. Supports system instructions, chat history, and automatic candidate error handling.
3. **Local Ollama Integration**:
   - Pre-configured `.env` with `AI_PROVIDER=local`, `AI_BASE_URL=http://localhost:11434/v1`, and `AI_MODEL=llama3.2:latest`.
   - Verified sub-second local inference with Ollama's active `llama3.2` model.
4. **Agent Persona & Synthesis Prompting**:
   - Upgraded `SYSTEM_PROMPT` to define Aegis's identity as a vigilant, defensive cybersecurity and personal operating assistant.
   - Enhanced `_handle_tool_outcome` so that whenever a tool executes, the raw output is sent to the LLM with context, prompting it to explain the telemetry, highlight security risks, and advise on next steps.
5. **Preserved Safety Invariants**:
   - All tool calls chosen by the LLM MUST pass through `ToolExecutor`.
   - Level 4 actions (quarantine, process termination, firewall IP blocks) still strictly require cryptographic single-use approvals.
   - Level 5 actions remain strictly blocked.

## Consequences
- The assistant is now a fully functional, autonomous AI Agent that understands natural queries, selects tools dynamically, and explains findings.
- Zero extra pip dependencies were introduced; pure standard library `urllib` and `json` were used throughout.
- All 125 core unit tests pass, and all Django tests pass cleanly.
