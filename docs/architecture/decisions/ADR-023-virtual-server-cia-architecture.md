# ADR-023: Hardened Virtual Server Host Architecture & CIA Triad Enforcement

## Status
Accepted

## Context
The operator requested hosting the Aegis Command Center server through an isolated virtual server architecture specifically engineered to guarantee the **CIA Triad** (Confidentiality, Integrity, and Availability).

Prior to this architecture:
1. Services could inadvertently bind to `0.0.0.0`, exposing unencrypted HTTP endpoints to any device on the local Wi-Fi / LAN.
2. Inter-device or remote communication without TLS termination could be susceptible to packet sniffing or man-in-the-middle tampering.
3. Unmonitored background tasks lacked automated health checking and self-healing resilience if a process died or crashed.

## Decisions

### 1. Confidentiality (C) Controls
- **Loopback Isolation**: Core upstream microservices (Django REST API on `127.0.0.1:8001`, Vite Cockpit on `127.0.0.1:5173`, Ollama Engine on `127.0.0.1:11434`) are strictly constrained to loopback interfaces (`127.0.0.1`). Zero raw unauthenticated ports are exposed to `0.0.0.0` or local network subnets.
- **End-to-End TLS 1.3 Encryption**: All external ingress, remote client communication, and cross-device mobile traffic are routed through an encrypted Zero-Trust Virtual Gateway via Cloudflare Edge TLS, eliminating local Wi-Fi sniffing and ARP interception risks.
- **Data Minimization & Credential Shielding**: Secrets and authorization tokens are scrubbed from object representations, logs, and error responses.

### 2. Integrity (I) Controls
- **Security Response Headers**: The virtual server enforces strict security headers:
  * `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing).
  * `X-Frame-Options: DENY` (prevents clickjacking attacks).
  * `Referrer-Policy: strict-origin-when-cross-origin` / `same-origin`.
  * `Cross-Origin-Opener-Policy: same-origin`.
- **Fail-Closed Permission Verification**: Every tool invocation must be verified by `PermissionEngine` before execution.
- **Single-Use Cryptographic Approval Tokens**: Sensitive actions (Level 4 quarantine, process kill, firewall block) require explicit human confirmation with single-use tokens expiring in 300 seconds.

### 3. Availability (A) Controls
- **Autonomous Watchdog Supervisor (`infrastructure/virtual_server.py`)**: A multi-threaded supervisor process probes backend health (`/api/health/`), frontend HTTP response, and Ollama connectivity every 10 seconds.
- **Self-Healing Recovery**: If any component process crashes or exits unexpectedly, the watchdog automatically restarts the service within seconds without manual human intervention.
- **Circuit Breakers & Rate Limiting**: Multi-tiered rate throttling (`ScopedRateThrottle`) prevents resource exhaustion and connection flooding.

## Verification
- Virtual Server Audit (`python infrastructure/virtual_server.py --audit-only`): Confirms loopback binding, active TLS tunnel, security headers, and operational health.
- Verified live end-to-end HTTPS endpoint: `https://ribbon-raw-strap-rfc.trycloudflare.com/api/health/` returning `{"status": "ok"}` with verified security headers.
