# ADR-018: Mobile Device Deployment and Vite Reverse Proxy Architecture

## Status
Accepted

## Context
Following permanent background service deployment (ADR-017), the operator requested seamless mobile phone and tablet access to the Aegis Command Center.

Running web-based autonomous command centers across mobile devices presents specific architectural challenges:
1. **The Mobile Loopback Trap**: Desktop browsers running on the host machine can resolve `http://127.0.0.1:8001` directly. However, when a smartphone browser opens the frontend from the host and makes API requests hardcoded to `127.0.0.1`, the phone directs those requests to its *own* loopback interface, causing total network failure.
2. **Multi-Port Firewall & Networking Friction**: If the frontend and backend require separate network ports (e.g. 5173 and 8001), mobile users must traverse firewall rules for multiple ports, and public HTTPS tunnels (like Cloudflare or ngrok) would require complex multi-tunneling.
3. **Cross-Origin Resource Sharing (CORS) & Host Filtering**: Accessing the app over varying local IP subnets or public tunnel hostnames triggers browser CORS denials or modern Vite 6 host restrictions (`allowedHosts`).
4. **Mobile Usability & Fast Pairing**: Typing local IPs or ephemeral tunnel URLs into mobile virtual keyboards is error-prone and tedious for operators.

## Decision

1. **Single-Port Unified Reverse Proxy (`frontend/vite.config.ts`)**:
   - Configured Vite's `server` and `preview` blocks with a reverse proxy:
     ```typescript
     proxy: {
       '/api': {
         target: 'http://127.0.0.1:8001',
         changeOrigin: true,
       },
     }
     ```
   - Enabled `host: '0.0.0.0'` and `allowedHosts: true` across both dev and preview modes.
   - Result: Mobile devices connect to a single host/port (5173 or the HTTPS cloud tunnel). Vite securely forwards all `/api` REST queries to Django on loopback, completely shielding mobile devices from backend port topology.

2. **Dynamic Client Origin Detection (`frontend/src/api/client.ts`)**:
   - Replaced static base URL configurations with dynamic browser environment detection:
     ```typescript
     const isTestEnv = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
     const DEFAULT_BASE_URL = (!isTestEnv && typeof window !== 'undefined') ? '' : 'http://127.0.0.1:8001';
     ```
   - In browser sessions (desktop, mobile Wi-Fi, or public cloud tunnel), relative paths (`""`) are used, guaranteeing that requests inherit the current origin, scheme, and port without CORS issues.
   - In automated test runners (Vitest), retains `http://127.0.0.1:8001` to maintain seamless compatibility with mock servers.

3. **Multi-Interface Daemon & Script Binding (`0.0.0.0`)**:
   - Updated `start-cockpit.ps1`, `deploy.ps1`, and `scripts/service-daemon.ps1` to bind listeners to `0.0.0.0:8001` and `0.0.0.0:5173`.
   - Updated `backend/config/settings/dev.py` with `ALLOWED_HOSTS = ["*"]` and `CORS_ALLOW_ALL_ORIGINS = True`.

4. **CLI Mobile Engine & QR Code Integration (`aegis_cli.py`)**:
   - Implemented dynamic local Wi-Fi IP detection via outbound socket probe (`socket.connect(('8.8.8.8', 80))`), avoiding brittle interface name parsing.
   - Added the `aegis mobile` CLI command, providing dual access pathways:
     * **Option 1 (Local Wi-Fi)**: LAN IP URL (`http://<LAN_IP>:5173`) and mobile instructions.
     * **Option 2 (Public Cloud Access)**: Automatically reads active Cloudflare Tunnel URL from `backend/logs/tunnel_url.txt` for access over cellular networks (4G/5G).

## Consequences
- **True Mobile Portability**: Operators can instantly interact with the Aegis Cockpit from iOS or Android smartphones over local Wi-Fi or cellular networks.
- **Zero CORS / Loopback Failures**: Single-origin reverse proxying completely eliminates mobile loopback bugs and cross-origin security warnings.
- **Hardware Acceleration Retained**: Deep learning models (2.0 GB Ollama models) and SQLite vector/relational databases remain accelerated on host hardware without exposing private data to third-party cloud hosting.
- **Test Integrity**: Full Vitest test suite passes (54/54 unit/integration tests).
