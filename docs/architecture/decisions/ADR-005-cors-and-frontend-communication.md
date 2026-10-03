# ADR-005: CORS Policy and Frontend-Backend Communication

## Status
Accepted (Phase A)

## Context
The project architecture separates the Django 5.2 REST backend (running on `http://127.0.0.1:8001`) from the React + TypeScript frontend (Vite dev server running on `http://localhost:5173`).
Because the browser enforces the Same-Origin Policy (SOP), cross-origin HTTP requests between port 5173 and port 8001 are blocked by default unless CORS headers are explicitly sent by the backend.

## Decision
1. **Middleware Integration**: Added `django-cors-headers` to the backend. `corsheaders.middleware.CorsMiddleware` is positioned at the top of Django's middleware chain (before `CommonMiddleware`) to ensure appropriate response headers are attached to all requests, including preflight `OPTIONS` requests.
2. **Origin Restriction**:
   - In development: allowed origins are strictly pinned to `http://localhost:5173` and `http://127.0.0.1:5173`.
   - In production: `CORS_ALLOWED_ORIGINS` is configured via environment variable and wildcard origins (`*`) are prohibited.
3. **Allowed Headers**: Standard headers plus custom `X-Request-ID` for end-to-end tracing between frontend and backend audit logs.
4. **Token Handling**:
   - Authentication tokens are transmitted strictly via HTTP header: `Authorization: Token <token>`.
   - Frontend stores the token strictly in memory and `sessionStorage` (scoped to the browser tab session, cleared upon logout or tab closure). `localStorage` is explicitly forbidden to reduce XSS blast radius.
   - Tokens are never written to logs or telemetry.
