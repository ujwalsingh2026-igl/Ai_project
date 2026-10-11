# Dependency Inventory & Security Governance

Every dependency in Aegis Command Center is tracked with its operational rationale, security audit status, license, and architectural justification.

## Governance Principles

1. **Minimalist Surface**: Never add a third-party dependency if the standard library or Django/DRF core can handle the task cleanly.
2. **Version Age & Provenance**: Prefer versions at least two weeks old to reduce exposure to immediate supply-chain package takeovers.
3. **Official Documentation Alignment**: Inspect current official documentation and compatibility with Django 5.2 (LTS) and Python 3.12+.
4. **ADR Requirement**: Every runtime dependency addition requires an Architectural Decision Record (ADR) justifying the choice over alternatives.

---

## Production / Base Dependencies (`backend/requirements/base.txt`)

| Package | Version Installed | License | Purpose / Rationale | Security Notes & Review | ADR Reference |
|---|---|---|---|---|---|
| `Django` | `5.2.17` | BSD-3-Clause | Web framework, ORM, security middleware, password hashing. | LTS release branch. Automatic SQL escaping, CSRF protection, PBKDF2 password hashing. | ADR-001 |
| `djangorestframework` | `3.18.1` | BSD-3-Clause | REST API serializers, viewsets, authentication, throttling. | Serializer input validation, permission classes, ScopedRateThrottle. | ADR-001 |
| `django-cors-headers` | `4.9.0` | MIT | Cross-Origin Resource Sharing middleware for frontend cockpit. | Strictly restricts allowed origins to localhost:5173 / 127.0.0.1:5173. No wildcards with credentials. | ADR-005 |
| `psutil` | `7.2.2` | BSD-3-Clause | Cross-platform host hardware, process, and socket telemetry. | Read-only inspection; used in `system_information`, `security_process_inspect`, and `security_listening_ports`. | ADR-009 |
| `psycopg` | `3.3.6` | LGPL-3.0 | Modern PostgreSQL database adapter (when `DB_NAME` is configured). | Pure Python + binary wheel; parameterized queries eliminate SQL injection. | ADR-001 |
| `psycopg-binary` | `3.3.6` | LGPL-3.0 | Precompiled C extensions for psycopg3. | Standard production driver binary. | ADR-001 |

---

## Development & Security Audit Tools (`backend/requirements/dev.txt`)

| Package | Version Installed | License | Purpose / Rationale | Security Notes & Review | ADR Reference |
|---|---|---|---|---|---|
| `pip-audit` | `2.10.1` | Apache-2.0 | Scans installed Python packages against PyPI / OSV vulnerability database. | Development/CI audit tool. Zero known vulnerabilities found on 2026-10-10. | ADR-022 |
| `bandit` | `1.9.4` | Apache-2.0 | Static Application Security Testing (SAST) for Python codebases. | Development/CI AST parser. Identifies insecure subprocess calls, weak crypto, and binding issues. | ADR-022 |

---

## Frontend Dependencies (`frontend/package.json`)

| Package | Version Installed | License | Purpose / Rationale | Security Notes & Review |
|---|---|---|---|---|
| `react` | `19.0.0` | MIT | UI component library. | Automatic JSX escaping prevents reflected Cross-Site Scripting (XSS). |
| `react-dom` | `19.0.0` | MIT | DOM renderer. | Modern DOM reconciliation. |
| `@tanstack/react-query` | `5.64.2` | MIT | Async state management & HTTP caching. | Structured background refetching and error boundaries. |
| `lucide-react` | `0.473.0` | ISC | Terminal & cockpit interface icons. | Tree-shakeable SVG icon components; zero runtime network requests. |
| `vite` | `6.0.7` | MIT | Development server and bundle optimizer. | Hardened dev server; zero production telemetry. |
| `vitest` | `3.2.7` | MIT | Unit and component testing framework. | Isolated jsdom test environment. 54 tests verified. |
