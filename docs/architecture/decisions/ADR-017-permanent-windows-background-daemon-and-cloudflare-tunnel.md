# ADR-017: Permanent Windows Background Service Daemon & Cloudflare Tunnel Remote Access

## Status
Accepted

## Context
The operator requested permanent deployment of the Aegis Autonomous Command Center.
The application stack comprises:
1. **Ollama LLM Engine** running multiple 2.0 GB custom domain models (`aegis-defense:latest`, `aegis-medical:latest`, and `llama3.2:latest`).
2. **Local Specialized Databases** (`clinical_kb.db`, `ecommerce_analytics.db`, `cybersecurity_kb.db`, and Django `db.sqlite3`).
3. **Django REST Backend** on port 8001.
4. **Vite / Static Frontend Cockpit** on port 5173.

Hosting large LLMs and private medical/security databases in commercial public clouds incurs substantial cloud GPU/RAM costs and introduces third-party data sovereignty risks. A hybrid permanent architecture was chosen:
- **Permanent Local 24/7 Windows Background Service**: Runs silently in the background, starts on Windows boot, auto-recovers from crashes, and utilizes local hardware without terminal windows.
- **Secure Cloudflare Tunnel**: Provides encrypted public HTTPS access from any smartphone, laptop, or browser worldwide.

## Decision
1. **Windows Service Daemon (`scripts/service-daemon.ps1`)**:
   - Continuous supervisor watchdog that verifies active listening sockets on:
     * Port 8001: Django REST Backend
     * Port 5173: Frontend Cockpit (serving production build or dev server)
     * Port 11434: Ollama LLM Service
     * Cloudflare Tunnel process (`cloudflared`)
   - If any process fails, the watchdog automatically restarts it.
   - Logs operational heartbeats to `backend/logs/service_daemon.log`.

2. **Silent Background Execution (`scripts/run-daemon-hidden.vbs`)**:
   - Executes via Windows `wscript.exe` with `WindowStyle=0` (hidden), preventing command prompt popups or visible console windows.

3. **Windows Scheduled Task Registration (`scripts/install-permanent-service.ps1`)**:
   - Registers scheduled task `AegisCommandCenterService` under the current Windows user with `AtLogOn` trigger.
   - Configures restart upon failure and persistence across battery/AC power changes.
   - An uninstaller script `scripts/uninstall-permanent-service.ps1` allows removal anytime.

4. **Cloudflare Remote Access Tunnel (`scripts/setup-tunnel.ps1`)**:
   - Uses the official `cloudflared` binary located in `tools/cloudflared.exe`.
   - Supports instant Quick Tunnels (`trycloudflare.com`) or named persistent tunnels.
   - Maps external HTTPS traffic securely to the local frontend and backend.
   - Configured `allowedHosts: true` in Vite and `ALLOWED_HOSTS = ["*"]` / `CORS_ALLOW_ALL_ORIGINS = True` in Django development settings to ensure remote tunnel requests pass host validation.

## Consequences
- Aegis is now permanently deployed and resilient to system reboots without requiring any terminal windows or manual commands.
- The 2.0 GB AI models and local databases stay private and accelerated on local hardware.
- The operator can manage the permanent service via `.\aegis status` or uninstall via `.\scripts\uninstall-permanent-service.ps1`.
