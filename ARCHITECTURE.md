# System Architecture & Design — Aegis Command Center

Aegis is a sovereign, defensive personal operating assistant and command center engineered for Windows 11. It pairs a **Django 5.2 + DRF** backend (`http://127.0.0.1:8001`) with a **React 19 + TypeScript + Vite** dark terminal-meets-cockpit frontend (`http://localhost:5173`).

---

## 1. Architectural Philosophy: The "Pure Core" Boundary

The core design principle of Aegis is the strict separation between **Pure Business & Safety Logic** (`backend/core/`) and the **Framework/Persistence Layer** (`backend/apps/`):

```
+-------------------------------------------------------------------------+
|                          Operator / Cockpit UI                          |
|         (React 19 + TypeScript + Vite + Web Speech + Audio Engine)      |
+-------------------------------------------------------------------------+
                                    |
                    REST API (Token Auth, Port 8001)
                                    v
+-------------------------------------------------------------------------+
|                           Django Apps Layer                             |
|  - apps.assistant    - apps.planner     - apps.security                 |
|  - apps.network      - apps.permissions - apps.users                    |
|       (Models, Views, Serializers, Routing, DB Audit Sinks)             |
+-------------------------------------------------------------------------+
                                    |
                    Context & Dependency Inversion
                                    v
+-------------------------------------------------------------------------+
|                           Pure Core Engine                              |
|           (Zero Django dependencies - Pure Python Standard Library)     |
|                                                                         |
|  - permissions.py   : Risk levels 0-5, fail-closed permission engine     |
|  - tools.py         : ToolSpec metadata, ToolRegistry, ToolExecutor     |
|  - orchestrator.py  : Intent router, dynamic memory prompt injection    |
|  - approvals.py     : Single-use, expiring action claim validation      |
|  - providers/       : AIProvider interface (Echo, Ollama, OpenAI)       |
|  - builtin_tools/   :                                                   |
|      * pe_scanner.py         : Static binary & entropy analysis         |
|      * incident_response.py  : Threat heuristics, kill, block IP        |
|      * network_scanner.py    : ARP discovery, OUI resolution            |
|      * memory.py             : MemoryStore protocol & recall engine     |
|      * system_information.py : Read-only host telemetry                 |
+-------------------------------------------------------------------------+
```

### Why This Split Matters
1. **Decoupled Safety**: Security boundaries (Level 5 BLOCK, Level 4 ASK, loopback protections) do not rely on database triggers or HTTP middleware. They are verified in pure Python unit tests (`backend/tests/`).
2. **Framework Agility**: If the database engine, API framework, or AI provider changes tomorrow, the safety rules and tool executors remain 100% untouched.
3. **Deterministic Testing**: Core tools can run against mock contexts and in-memory stores in milliseconds without database setup.

---

## 2. Permission Engine & Defensive Tiers

Aegis implements a formal 6-tier permission system (`backend/core/permissions.py`) with a strict fail-closed policy:

| Level | Name | Classification | Default Policy | Examples |
|---|---|---|---|---|
| **0** | `SAFE` | App-internal state | **ALLOW** | Read tasks, note creation, memory recall, system info |
| **1** | `USER_DATA` | User documents / files | **ALLOW** (if user-selected)<br>**ASK** (otherwise) | Static file scanning, file reading |
| **2** | `DEVICE_INFO` | Local device telemetry | **ALLOW** | Process inspection, listening ports, ARP cache lookup |
| **3** | `EXTERNAL_COMM` | Outbound external traffic | **ASK** (Hard cap: cannot auto-ALLOW) | Future remote API integrations |
| **4** | `SECURITY_RESPONSE` | Modifying system state | **ASK** (Hard cap: cannot auto-ALLOW) | File quarantine, terminate process, firewall IP block |
| **5** | `CRITICAL_RISK` | Unacceptable/Dangerous | **BLOCK** (Always, zero exceptions) | Raw packet sniffing, credential dumping, exploit payloads |

### Hard Safety Invariants
- **Level 5 is Invariant**: Configuration overrides can *never* lower a Level 5 tool to `ALLOW` or `ASK`.
- **Level 3 & 4 Hard Caps**: Runtime configurations can never grant autonomous `ALLOW` to Level 3 or 4 actions.
- **Fail-Closed Execution**: Unknown tools or unrecognized risk levels default to `Decision.BLOCK`.
- **Single-Use Approval Claims**: When a tool requires approval (`ASK`), a cryptographic pending action ID is generated with a 5-minute expiration. The resolution endpoint (`POST /api/assistant/confirm/`) claims the action atomically. Once approved or denied, the token cannot be reused (subsequent requests receive `409 Conflict`).

---

## 3. Tool Architecture & Execution Pipeline

Every tool in Aegis inherits from `ToolSpec` and executes **strictly through `ToolExecutor`**:

```
[Tool Invocation Request]
          |
          v
[1. Permission Engine Evaluation]
     ├─ ALLOW ───────────────────────┐
     ├─ BLOCK ──> AuditLog & Error   |
     └─ ASK   ──> Store PendingApproval & Return action_id
                                     |
                                     v
[2. Schema Validation (Input)]
          |
          v
[3. Execution via tool.run(args, context)]
          |
          v
[4. Schema Validation (Output)]
          |
          v
[5. Audit Sink Persistence]
          |
          v
[Return Sanitized Output]
```

Tools never execute raw operating system commands unchecked:
- `security_kill_process`: Enforces protection guards preventing termination of core OS binaries (`smss.exe`, `csrss.exe`, `lsass.exe`, `svchost.exe`, etc.) and PIDs <= 4.
- `security_block_ip`: Enforces loopback protection against `127.0.0.1`, `::1`, and `0.0.0.0` to eliminate self-lockout risk, and generates copyable PowerShell rollback scripts (`Remove-NetFirewallRule`).
- `network_scan_devices`: Enforces an ownership validation shield against `NetworkSubnetConfirmation`. If a subnet is not explicitly confirmed by the operator, execution is rejected with `403 Forbidden`.

---

## 4. Multi-Layer Defensive Security Subsystems

### 4.1 Static File Threat Scanner (`pe_scanner.py`)
- **Zero Execution**: Files are parsed strictly in memory as raw byte streams.
- **Shannon Entropy**: Measures cryptographic randomness across files and individual PE sections to detect packed or encrypted payloads ($0.0 \le H \le 8.0$).
- **Pure-Python PE Header Parsing**: Uses Python's `struct` module to inspect DOS headers, NT headers, optional headers, section table characteristics (`IMAGE_SCN_MEM_WRITE | IMAGE_SCN_MEM_EXECUTE`), UPX packer markers, and dangerous API imports (`VirtualAlloc`, `WriteProcessMemory`, `CreateRemoteThread`).
- **Script & Macro Heuristics**: Regex inspection for obfuscated PowerShell commands (`-EncodedCommand`, `IEX`), Unix shell downloaders (`curl | sh`), and Office VBA auto-executors (`AutoOpen`).
- **Zip-Bomb Mitigation**: Enforces limits of max 500 files, max 100 MB uncompressed, and a 50x expansion ratio threshold.

### 4.2 Quarantine Vault
- Files placed in quarantine are assigned a UUID and moved to `backend/data/quarantine/`.
- File permissions are explicitly set to read-only (`0400`) with execute flags stripped.
- Reversible operations: Files can be restored to their original location or permanently purged, both guarded by Level 4 approval gates.

### 4.3 Incident Response Engine & Playbooks
- **Automated Heuristic Detection**:
  - Brute-force authentication detection via audit logs.
  - Suspicious process execution (typosquatting of system binaries, encoded PowerShell commands, risky parent-child office-to-shell spawns).
  - Anomalous listening ports (detecting unauthorized C2 / raw listening sockets on external interfaces).
  - Startup autorun persistence checks.
- **MITRE ATT&CK Mapping**: Every incident links to formal tactic classifications (Initial Access, Execution, Persistence, Defense Evasion, Credential Access, Command and Control).
- **Interactive Playbooks**: Step-by-step containment checklists with integrated Level 4 approval cards.

---

## 5. Persistent Network & DNS Inventory

- **Subnet Ownership Authorization**: Operates under a strict zero-trust model where subnets must be confirmed by the operator before discovery scans can proceed.
- **Local ARP Table Parsing**: Reads the local host ARP cache (`arp -a` on Windows, `/proc/net/arp` on Linux) to detect active devices without emitting intrusive network probes.
- **Offline OUI Vendor Resolution**: Embedded prefix dictionary (Apple, Intel, Raspberry Pi, Espressif, Cisco, TP-Link, Samsung, Google, etc.) with detection of IEEE 802 randomized MAC addresses.
- **DNS Query Explorer & Pi-hole Integration**: Performs safe forward/reverse PTR lookups and imports Pi-hole query logs with automated 90-day retention pruning.

---

## 6. Assistant Long-Term Memory & Context Augmentation

- **Transparent Sovereign Memory**: Key developer preferences, workflow directives, and security policies are stored in the local database (`AssistantMemory` model).
- **Dynamic Context Injection**: The `Orchestrator` queries active user memories and injects them directly into the AI system prompt:
  ```text
  [OPERATOR ACTIVE MEMORIES & PREFERENCES]
  - (preference) Prefers dark terminal aesthetics and monospace fonts
  - (workflow) Python virtualenv is located at backend/.venv
  - (security_policy) Always enforce Level 4 approval before file operations
  ```
- **Operator Authority**: Memory items can be inspected, filtered by category, searched, edited, or purged in bulk via `MemoryView.tsx`.

---

## 7. Multimodal Voice Architecture & Safety Boundary

The voice engine (`frontend/src/voice/`) abstracts speech recognition and synthesis:
- **Speech Recognition**: Uses browser Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) supporting push-to-talk and toggle modes across `en-IN`, `en-US`, and `hi-IN`.
- **Text-to-Speech**: SpeechSynthesis engine with customizable rate, pitch, and voice picker.
- **Hard Safety Guardrail**:
  ```typescript
  // Approvals are strictly forbidden from speech execution
  if (['approve', 'confirm', 'deny', 'reject'].includes(normalizedCommand)) {
    return {
      type: 'approval_blocked',
      feedback: 'Approvals cannot be completed by voice for security reasons. Please click the approval card.'
    };
  }
  ```

---

## 8. Cockpit Frontend Architecture

Built with **React 19, TypeScript, and Vite**, following a dark "terminal-meets-cockpit" aesthetic (`docs/ui/DESIGN.md`):
- **Command Palette (`Ctrl+K`)**: Rapid navigation across all 7 views, safe action execution, and real-time search.
- **Keyboard Shortcuts (`?`)**: Full shortcut sheet, visible focus rings, and screen-reader accessibility.
- **Live Status Bar**: Continuously displays backend health, active AI provider/model, microphone status, active alerts, and pending approvals.
- **Responsive Layout**: Sidebar navigation, main cockpit workspace, collapsible live activity log, and inline approval cards.
- **Zero Third-Party Cloud Leaks**: Font fallbacks prioritize system monospace (`JetBrains Mono`, `Fira Code`, `Consolas`, `monospace`); zero external tracking scripts.
