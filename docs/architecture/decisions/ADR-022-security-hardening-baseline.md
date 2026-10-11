# ADR-022: Security Hardening Baseline, Threat Modeling & Tooling (Phase S0)

## Status
Accepted

## Context
Aegis Command Center has evolved into a feature-complete system with multi-modal voice interaction, static threat scanning, network inventory discovery, and cross-platform desktop/mobile deployments. 

To transition from a feature-complete prototype to a hardened, defensive security platform, we must establish a formal security engineering baseline (Phase S0). This requires:
1. Establishing a measurable threat model grounded in industry-standard frameworks (STRIDE, OWASP Top 10 for LLM Applications 2025, and OWASP ASVS v4.0.3).
2. Implementing automated security scanners (`pip-audit` for dependency CVEs, `bandit` for AST static analysis).
3. Verifying all existing unit tests and production deployment checks (`check --deploy`).
4. Establishing a living controls catalog (`CONTROLS.md`), scorecard (`SCORECARD.md`), and dependency governance policy (`DEPENDENCIES.md`).
5. Fixing any critical bugs discovered during baseline verification.

## Decisions

### 1. Threat Modeling Methodology
We adopt a hybrid threat modeling framework:
- **STRIDE per Component**: Every architectural layer (Browser UI, REST API, Identity, AI Orchestrator, AI Providers, Pure-Core Tool Executor, Database, Audit Sink, Approvals, Ollama Host, Build Pipeline) is evaluated across Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.
- **OWASP Top 10 for LLM Applications (2025 Checklist)**: Specific analysis of prompt injection (direct and indirect), excessive agency, insecure output handling, sensitive data leakage, model DoS, and confused-deputy scenarios.
- **Document Artifacts**: Authored `docs/security/THREAT_MODEL.md`, `docs/security/CONTROLS.md`, and `docs/security/SCORECARD.md`.

### 2. Developer Security Tooling
- **`pip-audit`**: Selected for Python dependency vulnerability scanning against the PyPI / OSV vulnerability database. Added to `requirements/dev.txt`.
- **`bandit`**: Selected for static AST security analysis. Added to `requirements/dev.txt`.
- **Secret Scanning**: Executed repository pattern scanning to ensure zero hardcoded secrets exist in tracked git history.

### 3. Immediate Bug Fix in Tool Safety Guardrails
During S0 unit test execution, an intermittent race condition was discovered in `SecurityKillProcessTool` (`backend/core/builtin_tools/incident_response.py`):
- When a target PID was inspected via `psutil`, `actual_name = proc.name()` replaced `expected_name`. If `expected_name` was a protected OS binary (e.g. `csrss.exe`), but the runtime PID on the machine was a non-protected binary, the protection check was bypassed.
- **Resolution**: Hardened the check to validate *both* `expected_name` and `actual_name` against `PROTECTED_PROCESS_NAMES`.

## Consequences
- The project has a rigorous, measurable security baseline with 0 dependency vulnerabilities and 35 cataloged controls.
- All 144 pure-Python core unit tests, 207 Django integration tests, and 54 Vitest frontend tests pass cleanly.
- SAST findings (Bandit: 3 High, 10 Medium) are triaged and prioritized for phased remediation.
- The project is prepared for Phase S1 (Expiring & Revocable Authentication).
