# ADR-008: Daily Assistant Architecture & Generic Tool Execution Endpoint

## Status
Accepted (Phase C)

## Context
The Aegis Command Center requires a dedicated Daily Assistant module (tasks, reminders, markdown notes, daily brief, and focus timer), along with AI agent tools to interact with tasks and read the brief.

Key architectural considerations:
1. **Separation of Concerns**: In accordance with ADR-002, business logic for tools must remain pure Python in `backend/core/` without direct Django dependencies, while database storage resides in Django models (`backend/apps/planner/`).
2. **Context Propagation & User Scoping**: Tools must operate strictly on the authenticated user's private records without allowing spoofed `user_id` arguments in user requests.
3. **Generic Tool Execution Endpoint**: Rather than relying purely on regex-based intent classification in chat, UI cockpit pages (and external integrations) require a deterministic endpoint `POST /api/tools/<name>/run/` that routes through the exact same `PermissionEngine`, `ToolExecutor`, and `AuditSink` pipeline.
4. **Offline Synth Audio**: The focus timer requires audio completion cues without bundled MP3/WAV assets or external CDNs.

## Decision
1. **PlannerStore Protocol (`core/builtin_tools/planner.py`)**:
   - Defined `PlannerStore` Protocol in `core/` specifying `list_tasks`, `add_task`, and `get_daily_brief`.
   - Built `InMemoryPlannerStore` for isolated pure-Python unit testing.
   - Built `DjangoPlannerStore` in `apps/planner/store.py` querying Django models (`Task`, `Reminder`, `Note`).
2. **Safe Tools Registered at RiskLevel.SAFE (0)**:
   - `planner_task_list` (`planner.read`, Level 0) -> ALLOW
   - `planner_task_add` (`planner.write`, Level 0) -> ALLOW
   - `planner_daily_brief` (`planner.read`, Level 0) -> ALLOW
   - Registered exclusively in `apps/assistant/services.py:build_registry()`.
3. **Context-Aware Tool Invocation**:
   - `ToolExecutor` passes `PermissionContext` to `Tool.run(args, context=context)` if accepted by the tool's signature, securely exposing `context.user_id` without polluting user input schemas.
4. **Generic Tool Endpoint (`POST /api/tools/<name>/run/`)**:
   - Executes any registered tool through `ToolExecutor`.
   - If decision is `ALLOW`, executes and returns `{status: "executed", result, summary}`.
   - If decision is `ASK`, creates a single-use `PendingApproval` record and returns `{status: "needs_approval", pending_action_id, ...}`.
   - If decision is `BLOCK`, returns HTTP 403 Forbidden with reasons.
5. **Daily Assistant App (`apps/planner/`)**:
   - Isolated tables: `Task` (priority, status, due_date, tags), `Reminder` (time, message, delivered), and `Note` (title, markdown content).
   - Strict `user` foreign key on every model. User isolation verified by unit/API tests.
   - Local JSON export (`GET /api/planner/export/`) and wipe controls (`POST /api/planner/clear/`).
6. **Focus Timer with Web Audio API**:
   - Generates multi-tone harmonic sine chime (523.25 Hz -> 783.99 Hz) with smooth exponential decay. Completely offline, zero dependencies.
