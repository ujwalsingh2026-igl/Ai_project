# ADR-009: Defensive Security Center Foundation & Anomaly Lead Model

## Status
Accepted (Phase D)

## Context
Phase D establishes the foundation for the Defensive Security Center. In alignment with Section 3 ("Hard Safety Boundaries"), the system is strictly defensive, operates exclusively on the user's local machine, and does not build or employ payloads, exploits, or network evasion tactics.

Key requirements:
1. **Transparent Posture Scoring**: Replaces opaque "AI risk scores" with an open, benchmarked 100-point checklist (Windows Firewall, Real-Time AV, UAC, Guest Account, BitLocker, Pending Updates/Reboot, Screen Lock, and Listening Sockets).
2. **Informational Lead Model**: Heuristic process anomalies (temp/appdata execution, process typosquatting, abnormal parent-child relationships, unexpected listening sockets) must be presented strictly as **informational leads**, not accusations or false certainty. Every flag must explain *why* it was flagged.
3. **Harmless Self-Test Pipeline**: Verification of the pattern matching and hashing pipeline using the industry-standard benign EICAR 68-byte test string (`EICAR_SIG_001` and SHA-256 validation), ensuring zero real malware is needed to verify detection readiness.
4. **Graceful Privilege Degradation**: Any check requiring administrative elevation (e.g. `manage-bde`) must degrade gracefully to `WARN` with actionable instructions rather than failing or reporting false negatives.

## Decision
1. **Core Tools (`backend/core/builtin_tools/security.py`)**:
   - `security_posture_eval` (RiskLevel.DEVICE_INFO = 2 $\rightarrow$ ALLOW)
   - `security_process_inspect` (RiskLevel.DEVICE_INFO = 2 $\rightarrow$ ALLOW)
   - `security_listening_ports` (RiskLevel.DEVICE_INFO = 2 $\rightarrow$ ALLOW)
   - `security_self_test` (RiskLevel.SAFE = 0 $\rightarrow$ ALLOW)
2. **Deterministic Tool Invocation via API**:
   - Registered tools are invoked directly through `POST /api/tools/<name>/run/`, executing via `ToolExecutor` and logging to the append-only `AuditLog`.
3. **Cockpit UI Integration (`frontend/src/views/SecurityView.tsx`)**:
   - Posture checklist with interactive remediation drawers and one-click command copy.
   - Process inspector with search, anomaly filter, and process telemetry modal.
   - Sockets table distinguishing public (`0.0.0.0`) from local loopback (`127.0.0.1`).
   - Self-test interface with transparent EICAR disclosures and instant verification.
