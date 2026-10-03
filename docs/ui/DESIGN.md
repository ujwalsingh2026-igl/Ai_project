# UI / UX Design Specification: Aegis Terminal-Cockpit

## 1. Aesthetic Direction: Dark Terminal-Meets-Cockpit

The interface is built for coders, power users, and security-conscious operators who appreciate the density, speed, and precision of a command-line interface, combined with the clarity and ergonomics of an aerospace cockpit glass instrument panel.

### Core Visual Principles
- **Density & Precision**: High data-ink ratio. Information is structured in crisp grid cells, with visible boundaries, subtle divider lines, and monospaced telemetry data.
- **Multi-channel Signaling**: Information severity is never communicated through color alone. Every warning, risk level, or status has an explicit text label and distinctive iconography alongside its color code (WCAG 2.1 AA compliant).
- **Tactile Feedback**: Subtle glowing indicators, interactive focus rings, active states, and snappy keyboard navigation convey instant responsiveness.
- **Respect for User Motion Preferences**: All transitions and pulses strictly honor `prefers-reduced-motion: reduce`.

---

## 2. Color System & Themes

Three core theme modes are supported via CSS custom properties on `data-theme` attribute:

### Dark Cockpit (Default)
- **Background Root**: `#0a0d12` (Deep Obsidian Void)
- **Surface Layer 1 (Sidebar / Cards)**: `#111620` (Cockpit Slate)
- **Surface Layer 2 (Elevated / Modals)**: `#182030` (Tactical Elevation)
- **Border / Grid Lines**: `#232e42` (Subtle Wireframe)
- **Text Primary**: `#e6edf3` (High-contrast Off-White)
- **Text Muted**: `#8b949e` (Telemetry Gray)
- **Accent Primary**: `#00e5a3` (Radar Emerald / Cyan-Green)
- **Accent Glow**: `rgba(0, 229, 163, 0.15)`

### Light Terminal (Day Operations)
- **Background Root**: `#f4f6f9`
- **Surface Layer 1**: `#ffffff`
- **Surface Layer 2**: `#eef2f6`
- **Border / Grid Lines**: `#d0d7de`
- **Text Primary**: `#1f2328`
- **Text Muted**: `#57606a`
- **Accent Primary**: `#0969da` (Cobalt Precision)

### High-Contrast Matrix (Accessibility Focus)
- **Background Root**: `#000000`
- **Surface Layer 1**: `#050505`
- **Surface Layer 2**: `#101010`
- **Border / Grid Lines**: `#ffffff` (Solid 2px borders)
- **Text Primary**: `#ffffff`
- **Text Muted**: `#e0e0e0`
- **Accent Primary**: `#00ff66` (Phosphor Green)

### Severity Scale (Always Color + Label + Icon)
| Level | Label | Dark Cockpit Color | Icon | Semantic Meaning |
|---|---|---|---|---|
| Info | `[INFO]` | `#58a6ff` (Cobalt) | `Info` | Informational telemetry, normal system events |
| Low | `[LOW]` | `#3fb950` (Green) | `CheckCircle2` | Read-only operations, safe system checks |
| Medium | `[MED]` | `#d29922` (Amber) | `AlertCircle` | External calls, config changes, elevated read |
| High | `[HIGH]` | `#f85149` (Coral Red) | `AlertTriangle` | Quarantine, process termination, firewall rules |
| Critical | `[CRIT]` | `#ff0055` (Crimson Neon)| `ShieldAlert` | Blocked exploits, unauthorized access attempts |

---

## 3. Typography & Scale

- **Prose Font**: System Sans (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif)
- **Telemetry / Monospace Font**: `JetBrains Mono`, `Fira Code`, `ui-monospace`, `SFMono-Regular`, `Menlo`, `Consolas`, monospace

### Scale
- **Display / Header**: `1.25rem` (20px), bold, tracked uppercase
- **Section Title**: `1.0rem` (16px), semibold
- **Body / Chat Text**: `0.875rem` (14px), regular, 1.5 line-height
- **Telemetry / Badges / Logs**: `0.75rem` (12px), monospace, tabular numerals (`font-variant-numeric: tabular-nums`)
- **Micro Labels**: `0.6875rem` (11px), uppercase monospace, letter-spacing `0.05em`

---

## 4. Spacing & Cockpit Grid Layout

- **8pt Grid Foundation**: Spacing uses 4px (`space-1`), 8px (`space-2`), 12px (`space-3`), 16px (`space-4`), 24px (`space-6`).
- **Cockpit Layout**:
  - **Left Rail**: 240px fixed width collapsible sidebar (Navigation, quick status, system mode).
  - **Main Cockpit Viewport**: Flexible center stage with maximum readability width (up to 1200px) or full telemetry stretch.
  - **Right Tactical Drawer**: 360px collapsible panel for active Pending Approvals and real-time Audit Log stream.
  - **Bottom Status Bar**: 32px persistent instrument bar showing Backend status, AI provider/model, Mic state, Alerts count, Pending approvals count.

---

## 5. Keyboard Navigation & Accessibility

- **Keyboard First**:
  - `Ctrl + K` or `Cmd + K`: Global Command Palette.
  - `?`: Keyboard Shortcuts Cheat Sheet modal.
  - `Ctrl + /`: Toggle Right Tactical Activity Panel.
  - `Esc`: Close modals, drawers, command palette.
- **Focus Rings**: Highly visible 2px outline in Accent Primary (`#00e5a3`) with 2px offset.
- **ARIA & Screen Readers**: All icons accompanied by `aria-label` or `sr-only` text; alert banners use `role="alert"`; live updates use `aria-live="polite"`.
- **Motion Controls**: All keyframe animations (blinking indicators, panel slides) disabled or replaced with instant opacity switches under `@media (prefers-reduced-motion: reduce)`.
