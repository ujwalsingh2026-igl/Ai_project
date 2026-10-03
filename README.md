# Aegis Command Center — Private AI Personal Operating Assistant

A sovereign, defensive "command center" desktop application built for developers, power users, and security enthusiasts on Windows 11. Powered by a Django 5.2 + DRF backend and a React 19 + TypeScript + Vite terminal-cockpit interface.

---

## Key Highlights

- **100% Local Data Sovereignty**: All data, memories, file scans, sightings, and audit logs remain strictly on your local machine (SQLite/PostgreSQL). Zero third-party cloud leakage.
- **Fail-Closed Permission Engine**: Tiered risk levels (0 to 5) enforce strict access control. High-risk actions (file quarantine, process termination, firewall blocking) require explicit, single-use, cryptographically expiring human confirmation.
- **Defensive Security Center**:
  - **Static File Threat Scanner**: Multi-stage PE header parser, Shannon entropy analysis, UPX/packer detection, script heuristic scanner, and zip-bomb safe decompressor.
  - **Quarantine Vault**: Reversible isolation vault stripping execute permissions (`0400`) with Level 4 approval gates.
  - **Incident Response Engine**: Real-time detection for brute-force attacks, suspicious process execution, unauthorized listening ports, and startup persistence with MITRE ATT&CK mapping and interactive playbooks.
  - **Host Containment**: Protected-process-aware process termination and host firewall blocking with automated rollback scripts.
- **Persistent Network & DNS Inventory**:
  - **Subnet Ownership Confirmation Shield**: Strictly enforces scanning solely on owned subnets.
  - **Local Host ARP Discovery**: Scans local ARP caches, resolves hostnames, and performs offline IEEE OUI vendor lookups.
  - **DNS Query Explorer**: Forward and reverse PTR queries plus local Pi-hole log ingestion and 90-day retention policies.
- **Multimodal Voice Access**:
  - Push-to-talk and toggle speech-to-text, multi-language support (`en-IN`, `en-US`, `hi-IN`), and TTS speech playback.
  - **Hard Safety Rule**: Approvals can *never* be confirmed via speech alone, protecting against acoustic hijacking.
- **Daily Assistant**:
  - Task management, scheduled reminders, split-pane Markdown notes, automated daily brief generation, and focus timer with Web Audio harmonic chimes.
- **Assistant Memory**:
  - Persistent memory store (`preference`, `workflow`, `project`, `security_policy`, `fact`) with dynamic context augmentation into AI prompts.
- **Cockpit Terminal UI**:
  - Keyboard-first navigation, Command Palette (`Ctrl+K`), shortcuts cheat sheet (`?`), live status bar, high-contrast and light theme options, and WCAG AA accessibility.

---

## Quick Start (Windows PowerShell)

### 1. Backend Setup (Port 8001)

```powershell
cd c:\ai-assistant\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements\dev.txt
copy ..\.env.example ..\.env          # verify SECRET_KEY and AI_PROVIDER

# Run pure-Python core tests (117 tests):
python -m unittest discover -s tests -p "test_*.py"

# Apply database migrations:
python manage.py migrate

# Create your operator account:
python manage.py createsuperuser

# Run Django test suite (180 tests):
python manage.py test

# Start the backend server on port 8001:
python manage.py runserver 8001
```

*Note: The backend runs on `http://127.0.0.1:8001` (avoiding port 8000).*

### 2. Frontend Cockpit Setup (Port 5173)

In a second PowerShell terminal:

```powershell
cd c:\ai-assistant\frontend
npm install

# Run frontend test suite (54 tests):
npm test -- --run

# Start Vite development server:
npm run dev
```

Open your browser at **`http://localhost:5173`** and log in with your superuser credentials.

---

## AI Providers

Configure your model provider in `.env`:

| Provider | Setting | Description |
|---|---|---|
| **Echo (Default)** | `AI_PROVIDER=echo` | Fully functional offline development mode. Exercises full tool flow, permission engine, and audit logs without calling an LLM. |
| **Local Ollama** | `AI_PROVIDER=local`<br>`AI_MODEL=llama3.2` | Connects directly to local Ollama on `http://127.0.0.1:11434`. Complete privacy with zero external telemetry. |
| **OpenAI Compatible** | `AI_PROVIDER=openai_compatible`<br>`OPENAI_API_BASE=...` | Compatible with any standard local or remote OpenAI-format endpoint. |

---

## REST API Overview

All authenticated endpoints require the `Authorization: Token <token>` header. Errors always adhere to the standard shape: `{"error": {"code": "...", "message": "...", "details": ...}}`.

### Core Assistant & Tools
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health/` | Public | Backend health and liveness check |
| `POST` | `/api/auth/token/` | Public | Acquire token with username/password (throttled) |
| `POST` | `/api/assistant/chat/` | Token | Chat message dispatch, intent routing, and tool invocation |
| `POST` | `/api/assistant/confirm/` | Token | Single-use approval or denial of Level 4 pending actions |
| `GET` | `/api/conversations/` | Token | Conversation history list |
| `GET` | `/api/conversations/<uuid>/` | Token | Retrieve messages for a specific conversation |
| `GET` | `/api/tools/` | Token | List registered tool specifications and permission levels |
| `POST` | `/api/tools/<name>/run/` | Token | Generic direct tool runner through permission engine & audit sink |

### Assistant Memory
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/assistant/memories/` | Token | List and search stored memories and developer preferences |
| `POST` | `/api/assistant/memories/` | Token | Create new memory item |
| `PATCH` | `/api/assistant/memories/<id>/` | Token | Update existing memory |
| `DELETE`| `/api/assistant/memories/<id>/` | Token | Delete specific memory |
| `POST` | `/api/assistant/memories/clear/` | Token | Sovereign bulk memory purge |

### Daily Assistant (Planner)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET`, `POST` | `/api/planner/tasks/` | Token | List and create planner tasks |
| `PATCH`, `DELETE` | `/api/planner/tasks/<id>/` | Token | Update or delete tasks |
| `GET`, `POST` | `/api/planner/reminders/` | Token | List and create scheduled reminders |
| `GET`, `POST` | `/api/planner/notes/` | Token | List and create Markdown notes |
| `GET` | `/api/planner/brief/` | Token | Generate dynamic daily brief |

### Defensive Security Center
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/security/posture/` | Token | Evaluate 100-point host hardening posture |
| `GET` | `/api/security/processes/` | Token | List host processes with heuristic anomaly tags |
| `GET` | `/api/security/ports/` | Token | Enumerate listening sockets (public vs loopback) |
| `POST` | `/api/security/scan/` | Token | Static file analysis (PE headers, entropy, hashes, heuristics) |
| `GET` | `/api/security/quarantine/` | Token | List files in quarantine vault |
| `GET` | `/api/security/incidents/` | Token | Incident response event feed with ATT&CK mappings |
| `POST` | `/api/security/detect/` | Token | Run automated threat detection heuristics |
| `GET` | `/api/security/firewall/` | Token | List active defensive firewall containment rules |

### Persistent Network & DNS Inventory
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET`, `POST` | `/api/network/subnet-confirmations/` | Token | Manage subnet ownership authorizations |
| `GET`, `POST` | `/api/network/devices/` | Token | List inventory devices and update friendly nicknames |
| `POST` | `/api/network/scan/` | Token | Scan local ARP table (gated by subnet ownership) |
| `POST` | `/api/network/dns/` | Token | Safe forward and reverse PTR DNS query resolver |
| `POST` | `/api/network/dns/import-pihole/` | Token | Ingest Pi-hole query logs |
| `POST` | `/api/network/wipe/` | Token | Targeted or total network inventory wipe |

---

## Defensive Boundaries & Safety

Aegis strictly enforces defensive operation:
1. **Never Offensive**: No port flooding, brute forcing, credential harvesting, packet sniffing, or unowned network probing.
2. **Owner-Only Networks**: Subnets must be explicitly confirmed by the operator before any ARP query is performed.
3. **No Autonomous Destruction**: Process termination and firewall rules always require explicit human confirmation.
4. **Isolated Static Analysis**: Scanned files are never executed; binary headers and Shannon entropy are parsed strictly in memory.
5. **Acoustic Defense**: Risky approval actions cannot be resolved via voice commands.

---

## Verification & Test Suites

- **Core Unit Tests**: `117 passed` (`python -m unittest discover -s tests -p "test_*.py"`)
- **Django Test Suite**: `180 passed` (`python manage.py test`)
- **Frontend Test Suite**: `54 passed` across 12 suites (`npm test -- --run`)
- **Production Build**: Clean build in ~3s (`npm run build`)
