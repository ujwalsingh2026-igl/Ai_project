# ADR-012: Threat Detection and Incident Response Engine

## Context
A developer and homelab operator needs host-level defensive threat awareness and containment capabilities on their personal workstation and local network. However, incident response and active defense tools present substantial architectural and safety challenges:

1. **Strictly Defensive Boundaries**: The command center must never include offensive tooling (e.g. exploit delivery, credential dumping, brute-force engines, or remote sniffing). Monitoring and response are strictly limited to the user's own host and locally owned environment.
2. **Zero Autonomous Destruction**: Threat mitigations such as terminating active processes or reconfiguring host firewall rules can cause data loss, crash system services, or lock the user out of network connectivity if automated. The human operator must always retain ultimate decision-making authority.
3. **Safety Guardrails Against Self-Inflicted Outages**:
   - Critical operating system processes (e.g. `System`, `smss.exe`, `csrss.exe`, `wininit.exe`, `services.exe`, `lsass.exe`, `svchost.exe`, and low PIDs 0, 1, 4) must be strictly forbidden from termination.
   - Loopback addresses (`127.0.0.1`, `::1`), default catch-alls (`0.0.0.0`), and local network gateways must never be added to firewall blocklists.
4. **Standardized Threat Triage**: Detections must be structured according to recognized industry taxonomies (such as the MITRE ATT&CK framework) and coupled with actionable, step-by-step response playbooks rather than raw unorganized alert dumps.
5. **Reversibility & Auditability**: All firewall rules and process terminations must generate audit trail entries, preserve incident timelines, and provide exact rollback commands (e.g. PowerShell `Remove-NetFirewallRule`).

## Decision

1. **Pure Python Threat Detection Engine (`core/builtin_tools/incident_response.py`)**:
   - Zero external binary dependencies; operates using standard library inspection and internal audit log correlations.
   - **Brute-Force Authentication Detection**: Analyzes recent audit logs for repeated authentication failures (`/api/auth/token/` or user login attempts exceeding 5 failures in 10 minutes) and flags target source IPs.
   - **Suspicious Process Execution Detection**: Heuristically evaluates running processes for:
     - Typosquatting of critical binaries (e.g., `scvhost.exe`, `lssas.exe`, `svch0st.exe`).
     - Obfuscated command lines (e.g., PowerShell `-enc`, `-encodedcommand`, `bypass`, `downloadstring`, `iex`).
     - Risky parent-child relationships (e.g., Office binaries like `winword.exe` or `excel.exe` spawning `powershell.exe` or `cmd.exe`).
   - **Anomalous Listening Port Detection**: Correlates active listening sockets against standard services, flagging unencrypted or high-risk command-and-control ports (e.g. ports `4444`, `1337`, `6667`, `31337`) exposed on non-loopback interfaces (`0.0.0.0` or public adapters).
   - **Persistence Mechanism Detection**: Inspects startup autorun paths and run keys for suspicious unsigned scripts, hidden directories, or anomalous executable extensions.
   - **Structured Incident Model**: Maps every detection to severity (`critical`, `high`, `medium`, `low`, `info`), MITRE ATT&CK tactics (e.g. *Initial Access*, *Execution*, *Persistence*, *Defense Evasion*, *Credential Access*, *Command and Control*), actionable playbooks, and raw telemetry evidence.

2. **Defensive Response Tools & Permission Engine Guardrails**:
   - `security_run_threat_detection`: Risk Level 2 (`DEVICE_INFO`). Evaluates to `ALLOW`. Collects telemetry and updates incident stores non-destructively.
   - `security_kill_process`: Risk Level 4 (`SECURITY_RESPONSE`). Evaluates to `ASK`. Strictly requires single-use user approval. Enforces hard safety blacklist preventing termination of system processes (`smss.exe`, `csrss.exe`, `lsass.exe`, `svchost.exe`, etc.) or PIDs <= 4.
   - `security_block_ip`: Risk Level 4 (`SECURITY_RESPONSE`). Evaluates to `ASK`. Strictly requires single-use user approval. Enforces IP safety guardrails preventing block of loopback (`127.0.0.1`, `::1`), all-zeros (`0.0.0.0`), or local subnet gateway. Generates exact Windows PowerShell firewall commands (`New-NetFirewallRule` / `Remove-NetFirewallRule`).

3. **Decoupled Store Pattern & Persistence**:
   - Core defines `IncidentStore` and `FirewallStore` abstract protocols and in-memory test stores (`InMemoryIncidentStore`, `InMemoryFirewallStore`) allowing 100% test isolation without database overhead.
   - Django implementation in `apps/security/` provides relational models:
     - `SecurityIncident`: Tracks title, description, severity, status (`open`, `investigating`, `contained`, `resolved`, `false_positive`), MITRE tactic, playbook ID, artifacts, and mitigation details.
     - `IncidentTimeline`: Chronological record of automated findings, user notes, and containment actions.
     - `FirewallRule`: Tracks blocked IP addresses, directional rules, applied timestamp, status (`active`, `revoked`), and PowerShell rollback commands.

4. **REST API Endpoints**:
   - `GET /api/security/incidents/`: List and filter incidents by status, severity, or search query.
   - `GET /api/security/incidents/<id>/` & `PATCH /api/security/incidents/<id>/`: Detail view, status updates, and timeline note attachments.
   - `POST /api/security/threat-detector/run/`: Manually invoke the detection engine.
   - `POST /api/security/incidents/kill-process/` & `POST /api/security/incidents/block-ip/`: Initiate mitigation actions routed through `ToolExecutor`, returning approval tokens on `ASK`.
   - `GET /api/security/firewall/` & `POST /api/security/firewall/<id>/rollback/`: View and revoke active host firewall rules.
   - `GET /api/security/summary/`: Aggregated security posture stats, active threat count, and quarantined item count.

5. **Cockpit UI & Incident Triage Center**:
   - **Incidents & Triage Tab**:
     - Severity breakdown counters (Critical, High, Medium, Low, Info) with quick filters.
     - Interactive incident feed with search and status badges.
     - Full Triage Modal featuring MITRE ATT&CK badges, raw telemetry evidence display, interactive incident response checklist playbooks, and mitigation action triggers.
     - Integrated `ApprovalCard` for inline confirmation of process termination and IP blocking.
   - **Firewall Blocks Tab**:
     - Live table of active and revoked firewall rules with copyable PowerShell rollback commands.
     - Manual IP block utility protected by the same Level 4 approval flow.
   - **Global Status Bar & Navigation**:
     - Cockpit bottom status bar displays live open incident counter (`openAlertsCount`).
     - Command palette (`Ctrl+K`) shortcuts for rapid incident navigation and threat detector execution.

## Consequences
- The system achieves comprehensive, automated threat triage without introducing offensive capabilities or unauthorized network interaction.
- The user is guaranteed to remain in complete control: no processes are killed and no firewall rules are modified without explicit, single-use, owner-verified approval.
- Built-in guardrails eliminate the risk of accidental system bricking or self-lockout.
- High-contrast visual cues, monospace telemetry logs, and step-by-step playbooks empower developers and students to understand security events in depth.
