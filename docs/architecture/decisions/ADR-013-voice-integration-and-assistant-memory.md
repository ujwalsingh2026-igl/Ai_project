# ADR-013: Voice Navigation, Voice Safety Boundaries, and Assistant Long-Term Memory

## Context
A developer command center requires efficient multimodal interaction and long-term context retention across work sessions:
1. **Multimodal Voice Interaction**: Power users benefit from rapid voice commands for navigation and safe tasks ("open security center", "add task buy milk", "what's my brief", "run threat detection").
2. **Hard Safety Boundaries for Voice**: Speech recognition is vulnerable to phonetic misinterpretation, background conversations, and audio spoofing. Critical system actions (killing processes, applying firewall rules, quarantining files) must **never** be executable by voice alone; they strictly require deliberate physical clicks or keypresses.
3. **Voice Privacy & Cloud Disclosures**: In Chromium browsers, the native Web Speech API streams audio to vendor cloud transcription services. The system must disclose this transparently, ensure no audio is ever persisted, and maintain an extensible abstraction (`VoiceInput`, `VoiceOutput`) so private, local offline Whisper and Piper TTS engines can be integrated seamlessly.
4. **Transparent, Sovereign Long-Term Memory**: The assistant needs to retain user context (preferred programming languages, homelab IP subnets, dark theme preferences, custom build workflows). However, traditional AI assistants often store hidden, uneditable user profiles. The command center demands complete data sovereignty: every memory item must be locally stored, visible, searchable, editable, and deletable by the user.

## Decision

1. **Voice Input/Output Subsystem (`frontend/src/voice/` & `frontend/src/context/VoiceContext.tsx`)**:
   - **Trigger Modes**: Push-to-Talk (holding key or button) and Toggle mode with an always-visible pulsing indicator and one-click global "Mic Off" button.
   - **Hard Approval Safety Gate**: `parseVoiceCommand()` intercepts any spoken approval words (`approve`, `confirm`, `deny`, `reject`), halts execution, and responds with audio and visual feedback reminding the user that security rules require a deliberate physical confirmation on the approval card.
   - **Voice Navigation**: Instantly routes speech requests to target views (`assistant`, `daily`, `security`, `network`, `audit`, `memory`, `settings`).
   - **Edit-Before-Send vs. Auto-Send**: Defaults to `autoSend: false`, loading recognized transcripts into the chat prompt for review and manual refinement prior to submission.
   - **Audio Engine Settings**: Supports multi-language recognition (`en-IN`, `en-US`, `hi-IN`), speech synthesis voice picker, speed rate (0.5x - 2.0x), pitch tuning, and read-aloud buttons on every assistant message.

2. **Pure Python Memory Core Tools (`backend/core/builtin_tools/memory.py`)**:
   - Defined `MemoryStore` protocol and `InMemoryMemoryStore` for high-speed, isolated unit tests.
   - `memory_store`: Risk Level 0 (`SAFE` -> `ALLOW`). Stores a key-value developer preference, project fact, or workflow rule.
   - `memory_recall`: Risk Level 0 (`SAFE` -> `ALLOW`). Retrieves active memories filtered by category (`preference`, `workflow`, `project`, `security_policy`, `fact`) or text query.

3. **Django Relational Persistence & Context Injection (`backend/apps/assistant/`)**:
   - Model `AssistantMemory`: Records `user`, `key`, `content`, `category`, `source` (`explicit` vs `chat`), and timestamps.
   - `DjangoMemoryStore`: Database implementation of `MemoryStore`.
   - REST API:
     - `GET /api/assistant/memories/`: List and filter memories by category and query string.
     - `POST /api/assistant/memories/`: Create memory item with validation.
     - `GET|PATCH|DELETE /api/assistant/memories/<id>/`: Detail, update, and deletion endpoints.
     - `POST /api/assistant/memories/clear/`: Bulk purge of user memories.
   - **Context Injection**: `Orchestrator._get_system_prompt()` queries the user's active memories and dynamically augments the system prompt before invoking the local AI provider (Ollama / Echo).

4. **Memory Cockpit Stage (`frontend/src/views/MemoryView.tsx`)**:
   - Replaced placeholder view with full-featured memory management center.
   - Metrics cards: Total Memories, Preferences, Workflow Rules, Security Policies.
   - Quick category pills and live search bar.
   - Comprehensive modals for Adding, Editing, Deleting, and Clearing memories.
   - Prominent local data sovereignty disclosure explaining that context never leaves the host's private database.

## Consequences
- The assistant now retains persistent, actionable developer context across conversations.
- Users have 100% visibility and full CRUD authority over everything the assistant remembers.
- Hands-free voice operation provides rapid navigation and task creation while strictly safeguarding against accidental or unauthorized execution of risky operations.
- The system remains fully compliant with privacy constraints and zero external cloud leakage.
