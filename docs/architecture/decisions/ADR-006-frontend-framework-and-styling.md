# ADR-006: Frontend Framework, State Architecture, and Styling System

## Status
Accepted (Phase A)

## Context
The application is a private "command center" for power users and coders, featuring assistant chat, inline security approval cards, daily planning, defensive cybersecurity monitoring, and voice commands. The UI must be fast, keyboard-driven, accessible (WCAG AA), responsive, and support multiple distinct themes (Dark Cockpit, Light Terminal, High Contrast).

## Decision
1. **Framework**: React 19 + TypeScript + Vite.
   - Vite provides instant HMR, fast builds, and native ES modules.
   - TypeScript guarantees end-to-end type safety between the Django REST endpoints and UI components, catching data contract discrepancies at compile time.
2. **Server State Management**: `@tanstack/react-query`.
   - Replaces custom `useEffect` fetch loops.
   - Automates background polling, query deduplication, optimistic updates, and cache invalidation (crucial for keeping pending approvals and live audit logs in sync with user actions).
3. **Styling Strategy**: Tailwind CSS + CSS Custom Properties (Variables).
   - *Why Tailwind over CSS Modules*: Tailwind eliminates dead CSS, enforces a disciplined token scale for spacing and colors, provides instant responsive utility classes, and keeps styles co-located with components.
   - *Theme Switching*: Implemented via semantic CSS variables mapped to `data-theme` on the root document element. This avoids CSS bundle duplication across themes and allows dynamic switching without flash-of-unstyled-content.
   - *Motion Respect*: All animations are wrapped in `motion-safe:` or CSS media queries respecting `prefers-reduced-motion`.
4. **Architectural Safety**:
   - The frontend communicates with the backend solely via the typed REST API client in `frontend/src/api/client.ts`.
   - No direct database access, no mock fake data disguised as real, and strict error handling for 401 (redirect to login) and 429 (throttling backoff banner).
