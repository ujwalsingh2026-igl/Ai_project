# ADR-019: Mobile-First Responsive Architecture, Standalone Android APK & Universal Safety Protocol

## Status
Accepted

## Context
Following the mobile deployment enablement (ADR-018), the operator requested:
1. Full mobile responsiveness and ergonomics across iOS and Android smartphones and tablets.
2. Direct compilation and deployment of the application into a standalone Android APK (`.apk`) for native phone installation.
3. Strict, end-to-end security and safety hardening ("safety from everywhere") across local networks, public cellular internet, and on-device execution.

## Decision

### 1. Mobile-First Responsive Ergonomics
- **Responsive Layout Shell (`frontend/src/App.tsx`)**:
  - Replaced fixed desktop rail sidebar with adaptive layouts: desktop (`md:flex`) retains the sidebar, while mobile devices render a dedicated mobile top bar and bottom navigation system.
- **Mobile Header (`frontend/src/components/MobileHeader.tsx`)**:
  - Displays the active section title, real-time backend connection status dot, pending approval alerts badge, and one-tap Tactical Panel toggle.
- **Mobile Bottom Navigation Bar (`frontend/src/components/MobileNavBar.tsx`)**:
  - Provides 5 primary thumb-accessible navigation tabs with minimum 48px touch targets: Chat, Daily, Security, Network, and More.
  - Formatted with `pb-[env(safe-area-inset-bottom)]` for hardware notch and gesture pill compatibility.
- **Mobile Slide-Out Drawer (`frontend/src/components/MobileNavDrawer.tsx`)**:
  - Houses secondary views (Activity & Audit, Assistant Memory, Settings), theme toggle (Dark/Light), operator credentials, and zero-trust session logout.
- **Touch & Accessibility Optimization**:
  - All interactive elements, inputs, and form controls calibrated to minimum 44px–48px hit areas.
  - Added Web App Manifest (`frontend/public/manifest.json`) and viewport meta tags (`viewport-fit=cover`) for native full-screen PWA capabilities.

### 2. Standalone Android APK Pipeline
- **Capacitor Integration (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)**:
  - Configured `frontend/capacitor.config.ts` targeting app ID `com.aegis.commandcenter`.
  - Configured automated Gradle compilation pipeline in `scripts/build-apk.ps1` utilizing Microsoft OpenJDK 21, Gradle 8.14.3, and Android SDK Build Tools 35.
- **Distribution Output**:
  - Compiled debug APK generated at `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (4.11 MB).
  - Automatically copied to root workspace `aegis-command-center.apk` and served via static web routes (`/aegis-command-center.apk`) over both LAN Wi-Fi and public Cloudflare Tunnel.

### 3. Multi-Tiered "Safety From Everywhere" Security Protocol
- **Android Network Security Configuration (`network_security_config.xml`)**:
  - Enforces strict TLS / HTTPS encryption with system trust anchors for all public remote internet connections.
  - Blocks cleartext traffic across all public routes, preventing man-in-the-middle interception or data tampering on public Wi-Fi or cellular networks.
  - Allows local loopback and private LAN subnet traversal (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`) exclusively for verified home network communication.
- **Minimal Android Permissions**:
  - Strictly limited to `android.permission.INTERNET` and `android.permission.ACCESS_NETWORK_STATE`.
  - Zero unnecessary permissions: no contact scraping, no camera access, no telephony, no location tracking.
- **Cryptographic Action Gating**:
  - Critical defensive operations (terminating processes, quarantining files, changing network posture) are strictly gated by the Level 4 Approval Card system requiring explicit operator credentials.
- **Dynamic Server Endpoint Switcher (`frontend/src/views/LoginView.tsx` & `frontend/src/api/client.ts`)**:
  - Native APK includes a built-in server switcher on the login screen, allowing operators to toggle between Cloud Tunnel (4G/5G) and Local Wi-Fi with persistent storage in `localStorage`.

## Consequences
- Operators can install the native Android APK (`aegis-command-center.apk`) directly onto Android phones, or install as a progressive web app (PWA) on iOS/Android.
- The interface is fully thumb-navigable and responsive.
- Security boundaries are maintained across cellular networks and local Wi-Fi.
- All 54 automated unit and integration tests pass without regressions.
