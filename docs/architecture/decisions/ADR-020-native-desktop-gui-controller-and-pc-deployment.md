# ADR-020: Native Desktop GUI Controller & Standalone PC/Laptop Deployment

## Status
Accepted

## Context
Following the completion of the mobile APK and responsive mobile interface (ADR-019), the operator requested a complete GUI deployment specifically tailored for laptop and desktop PC usage.

Operators using Windows workstations require:
1. A visual graphical control panel rather than pure terminal scripts.
2. Real-time visual monitoring of all 4 system sub-tiers (Django Backend, Vite Cockpit, Ollama LLM Engine, Cloudflare Secure Tunnel).
3. 1-click execution to launch standalone desktop app windows without browser URL bars or navigation clutter.
4. Seamless integration with the Windows Shell (Desktop shortcuts, Start Menu entry, 1-click batch launcher).
5. Quick graphical management of mobile pairing links, QR codes, and Android APK re-compilation.

## Decision

### 1. Cyber-Tactical Desktop Controller (`aegis_gui.py`)
- Engineered a native Windows GUI controller application using Python's standard `tkinter` framework, eliminating external GUI library bloat.
- **Visual Design**: Dark cyber-tactical theme (`#0a0c10` background, `#12171f` card surfaces, `#00f0ff` cyan telemetry accents) reflecting the command center aesthetic.
- **Multithreaded Heartbeat Watchdog**: Continuously verifies port liveness:
  * Port 8001: Django REST Backend
  * Port 5173: Frontend Cockpit UI
  * Port 11434: Ollama AI Engine (3 Models: Defense, Clinical Medical, Llama3.2)
  * Cloud Tunnel: Dynamically resolves active trycloudflare.com HTTPS domain.
- **Control Actions**:
  * 🚀 **Launch Desktop Cockpit**: Opens a borderless, focused desktop window.
  * 🌐 **Open Default Browser**: Opens local cockpit in standard web browser.
  * 📱 **Mobile & APK Access**: Displays LAN Wi-Fi URL, active Cloudflare Tunnel, and direct APK download endpoints.
  * 🔄 **Restart Services**: Triggers clean background restart pass.
  * 🛑 **Stop Services**: Gracefully halts background tasks and server processes.
  * 📦 **Re-compile Android APK**: Triggers the APK compilation pipeline directly within the GUI.
  * 📜 **Open Daemon Logs**: One-click opening of live daemon telemetry logs.
- **Embedded Telemetry Console**: Displays timestamped real-time log entries and background events.

### 2. Standalone Desktop Window App Mode
- Integrated native Microsoft Edge / Chromium Application Mode (`msedge.exe --app=http://localhost:5173 --window-size=1280,820`).
- Provides a distraction-free, dedicated desktop application experience without browser tabs, URL address bars, or extension interference, while preserving full hardware acceleration and Web Audio/Speech API capabilities.

### 3. Windows Shell & Desktop Integration
- **Windows Desktop Shortcut**: Created `Aegis Command Center.lnk` directly on the operator's desktop (`C:\Users\dell\OneDrive\Desktop\Aegis Command Center.lnk`) with custom high-DPI icon branding.
- **1-Click Batch Launcher**: Added `Aegis-Desktop.bat` in the workspace root for instant execution from Windows File Explorer.
- **CLI GUI Command**: Added `aegis gui` (and `python aegis_cli.py gui`) to the unified Aegis command-line tool.

## Consequences
- Operators on laptops or desktop PCs have a complete visual graphical interface for operating, supervising, and launching Aegis.
- Zero terminal friction: operators can launch Aegis with a single double-click on their desktop shortcut.
- Both mobile phones (via Android APK / responsive web) and laptops/PCs (via Desktop GUI and standalone app window) have native, first-class experiences.
- All tests and builds remain verified.
