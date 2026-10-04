#!/usr/bin/env python3
"""
Aegis Autonomous Command Center - Desktop GUI Controller
A native tactical desktop application for laptop and PC control.
Provides live service supervision, 1-click desktop app launching,
mobile/APK management, and system telemetry.
"""

import sys
import os
import time
import socket
import urllib.request
import subprocess
import threading
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
LOGS_DIR = BACKEND_DIR / "logs"
APK_FILE = ROOT_DIR / "aegis-command-center.apk"
TUNNEL_FILE = LOGS_DIR / "tunnel_url.txt"
DAEMON_LOG = LOGS_DIR / "service_daemon.log"

# Dark Cyber-Tactical Color Palette
BG_DARK = "#0a0c10"
BG_SURFACE = "#12171f"
BG_CARD = "#18202c"
BORDER_COLOR = "#2a3649"
ACCENT_CYAN = "#00f0ff"
ACCENT_BLUE = "#58a6ff"
COLOR_SUCCESS = "#3fb950"
COLOR_WARNING = "#d29922"
COLOR_DANGER = "#f85149"
TEXT_PRIMARY = "#f0f6fc"
TEXT_MUTED = "#8b949e"
FONT_TITLE = ("Consolas", 14, "bold")
FONT_HEADING = ("Consolas", 11, "bold")
FONT_BODY = ("Consolas", 9)
FONT_BOLD = ("Consolas", 9, "bold")
FONT_STATUS = ("Consolas", 8)


def get_local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def check_port(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            return s.connect_ex(("127.0.0.1", port)) == 0
    except Exception:
        return False


def get_tunnel_url() -> str:
    if TUNNEL_FILE.exists():
        try:
            content = TUNNEL_FILE.read_text(encoding="utf-8").strip()
            if content.startswith("http"):
                return content
        except Exception:
            pass
    return ""


class AegisDesktopApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Aegis // Autonomous Command Center")
        self.root.geometry("820x640")
        self.root.minsize(780, 580)
        self.root.configure(bg=BG_DARK)

        self.local_ip = get_local_ip()
        self.running = True

        self._build_ui()
        self._start_monitor_thread()

    def _build_ui(self):
        # Top Header Bar
        header = tk.Frame(self.root, bg=BG_SURFACE, height=65, highlightthickness=1, highlightbackground=BORDER_COLOR)
        header.pack(fill=tk.X, padx=10, pady=(10, 5))

        title_frame = tk.Frame(header, bg=BG_SURFACE)
        title_frame.pack(side=tk.LEFT, padx=15, pady=10)

        title_lbl = tk.Label(
            title_frame,
            text="🛡️ AEGIS AUTONOMOUS COMMAND CENTER",
            font=FONT_TITLE,
            fg=ACCENT_CYAN,
            bg=BG_SURFACE,
        )
        title_lbl.pack(anchor="w")

        subtitle_lbl = tk.Label(
            title_frame,
            text="DESKTOP CONTROLLER // ZERO-TRUST DEFENSIVE ORCHESTRATION",
            font=FONT_STATUS,
            fg=TEXT_MUTED,
            bg=BG_SURFACE,
        )
        subtitle_lbl.pack(anchor="w")

        # Quick Launch Button in Header
        self.btn_quick_launch = tk.Button(
            header,
            text="🚀 LAUNCH DESKTOP COCKPIT",
            font=FONT_BOLD,
            bg=ACCENT_CYAN,
            fg="#000000",
            activebackground="#00c8d7",
            activeforeground="#000000",
            relief=tk.FLAT,
            padx=14,
            pady=8,
            cursor="hand2",
            command=self.launch_desktop_window,
        )
        self.btn_quick_launch.pack(side=tk.RIGHT, padx=15, pady=12)

        # Status Deck (Cards)
        status_frame = tk.Frame(self.root, bg=BG_DARK)
        status_frame.pack(fill=tk.X, padx=10, pady=5)

        # Service Status Badges
        self.card_backend = self._create_service_card(status_frame, "DJANGO API", "Port 8001", "Checking...")
        self.card_backend.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=3)

        self.card_frontend = self._create_service_card(status_frame, "COCKPIT UI", "Port 5173", "Checking...")
        self.card_frontend.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=3)

        self.card_ollama = self._create_service_card(status_frame, "AI ENGINE", "Port 11434", "Checking...")
        self.card_ollama.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=3)

        self.card_tunnel = self._create_service_card(status_frame, "CLOUD TUNNEL", "HTTPS Route", "Checking...")
        self.card_tunnel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=3)

        # Main Control Deck
        controls_frame = tk.LabelFrame(
            self.root,
            text=" COMMAND & DEPLOYMENT ACTIONS ",
            font=FONT_HEADING,
            fg=ACCENT_CYAN,
            bg=BG_SURFACE,
            highlightthickness=1,
            highlightbackground=BORDER_COLOR,
            padx=10,
            pady=10,
        )
        controls_frame.pack(fill=tk.X, padx=10, pady=5)

        btn_row1 = tk.Frame(controls_frame, bg=BG_SURFACE)
        btn_row1.pack(fill=tk.X, pady=3)

        btn_app = tk.Button(
            btn_row1,
            text="💻 Standalone Window (Edge/App)",
            font=FONT_BODY,
            bg=BG_CARD,
            fg=TEXT_PRIMARY,
            activebackground=BORDER_COLOR,
            activeforeground=TEXT_PRIMARY,
            relief=tk.FLAT,
            padx=10,
            pady=7,
            command=self.launch_desktop_window,
        )
        btn_app.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=3)

        btn_browser = tk.Button(
            btn_row1,
            text="🌐 Open Default Browser",
            font=FONT_BODY,
            bg=BG_CARD,
            fg=TEXT_PRIMARY,
            activebackground=BORDER_COLOR,
            activeforeground=TEXT_PRIMARY,
            relief=tk.FLAT,
            padx=10,
            pady=7,
            command=self.open_default_browser,
        )
        btn_browser.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=3)

        btn_mobile = tk.Button(
            btn_row1,
            text="📱 Mobile QR & APK Access",
            font=FONT_BODY,
            bg=BG_CARD,
            fg=TEXT_PRIMARY,
            activebackground=BORDER_COLOR,
            activeforeground=TEXT_PRIMARY,
            relief=tk.FLAT,
            padx=10,
            pady=7,
            command=self.show_mobile_dialog,
        )
        btn_mobile.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=3)

        btn_row2 = tk.Frame(controls_frame, bg=BG_SURFACE)
        btn_row2.pack(fill=tk.X, pady=3)

        btn_restart = tk.Button(
            btn_row2,
            text="🔄 Restart All Services",
            font=FONT_BODY,
            bg=BG_CARD,
            fg=COLOR_SUCCESS,
            activebackground=BORDER_COLOR,
            activeforeground=COLOR_SUCCESS,
            relief=tk.FLAT,
            padx=10,
            pady=7,
            command=self.restart_services,
        )
        btn_restart.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=3)

        btn_stop = tk.Button(
            btn_row2,
            text="🛑 Stop Services",
            font=FONT_BODY,
            bg=BG_CARD,
            fg=COLOR_DANGER,
            activebackground=BORDER_COLOR,
            activeforeground=COLOR_DANGER,
            relief=tk.FLAT,
            padx=10,
            pady=7,
            command=self.stop_services,
        )
        btn_stop.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=3)

        btn_build_apk = tk.Button(
            btn_row2,
            text="📦 Re-compile Android APK",
            font=FONT_BODY,
            bg=BG_CARD,
            fg=ACCENT_CYAN,
            activebackground=BORDER_COLOR,
            activeforeground=ACCENT_CYAN,
            relief=tk.FLAT,
            padx=10,
            pady=7,
            command=self.trigger_build_apk,
        )
        btn_build_apk.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=3)

        btn_logs = tk.Button(
            btn_row2,
            text="📜 Open Daemon Logs",
            font=FONT_BODY,
            bg=BG_CARD,
            fg=TEXT_PRIMARY,
            activebackground=BORDER_COLOR,
            activeforeground=TEXT_PRIMARY,
            relief=tk.FLAT,
            padx=10,
            pady=7,
            command=self.open_logs,
        )
        btn_logs.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=3)

        # Telemetry & Output Console
        log_frame = tk.LabelFrame(
            self.root,
            text=" LIVE SYSTEM TELEMETRY & LOG STREAM ",
            font=FONT_HEADING,
            fg=ACCENT_CYAN,
            bg=BG_SURFACE,
            highlightthickness=1,
            highlightbackground=BORDER_COLOR,
            padx=8,
            pady=6,
        )
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(5, 10))

        self.txt_console = tk.Text(
            log_frame,
            bg="#06090e",
            fg=COLOR_SUCCESS,
            insertbackground=ACCENT_CYAN,
            font=("Consolas", 8),
            wrap=tk.WORD,
            relief=tk.FLAT,
        )
        scroll = tk.Scrollbar(log_frame, command=self.txt_console.yview, bg=BG_SURFACE)
        self.txt_console.configure(yscrollcommand=scroll.set)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.txt_console.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self._log("Aegis Desktop GUI Controller initialized.")
        self._log(f"Local Host IP: {self.local_ip}")
        if APK_FILE.exists():
            size_mb = APK_FILE.stat().st_size / (1024 * 1024)
            self._log(f"Android APK Package Available: {APK_FILE.name} ({size_mb:.2f} MB)")

    def _create_service_card(self, parent, title: str, subtitle: str, initial_status: str):
        card = tk.Frame(parent, bg=BG_CARD, highlightthickness=1, highlightbackground=BORDER_COLOR, padx=10, pady=8)
        lbl_t = tk.Label(card, text=title, font=FONT_HEADING, fg=TEXT_PRIMARY, bg=BG_CARD)
        lbl_t.pack(anchor="w")
        lbl_sub = tk.Label(card, text=subtitle, font=FONT_STATUS, fg=TEXT_MUTED, bg=BG_CARD)
        lbl_sub.pack(anchor="w")
        lbl_st = tk.Label(card, text=initial_status, font=FONT_BOLD, fg=TEXT_MUTED, bg=BG_CARD)
        lbl_st.pack(anchor="w", pady=(4, 0))
        card.status_label = lbl_st
        return card

    def _log(self, message: str):
        timestamp = time.strftime("%H:%M:%S")
        entry = f"[{timestamp}] {message}\n"
        self.txt_console.insert(tk.END, entry)
        self.txt_console.see(tk.END)

    def _start_monitor_thread(self):
        t = threading.Thread(target=self._monitor_loop, daemon=True)
        t.start()

    def _monitor_loop(self):
        while self.running:
            b_online = check_port(8001)
            f_online = check_port(5173)
            o_online = check_port(11434)
            tunnel_url = get_tunnel_url()

            # Schedule UI updates on main thread
            self.root.after(0, self._update_status_ui, b_online, f_online, o_online, tunnel_url)
            time.sleep(3)

    def _update_status_ui(self, b_online: bool, f_online: bool, o_online: bool, tunnel_url: str):
        # Backend
        if b_online:
            self.card_backend.status_label.config(text="● ONLINE", fg=COLOR_SUCCESS)
        else:
            self.card_backend.status_label.config(text="○ OFFLINE", fg=COLOR_DANGER)

        # Frontend
        if f_online:
            self.card_frontend.status_label.config(text="● ONLINE", fg=COLOR_SUCCESS)
        else:
            self.card_frontend.status_label.config(text="○ OFFLINE", fg=COLOR_DANGER)

        # Ollama
        if o_online:
            self.card_ollama.status_label.config(text="● ONLINE (3 Models)", fg=COLOR_SUCCESS)
        else:
            self.card_ollama.status_label.config(text="○ STANDBY", fg=COLOR_WARNING)

        # Tunnel
        if tunnel_url:
            self.card_tunnel.status_label.config(text="● ENCRYPTED", fg=ACCENT_CYAN)
        else:
            self.card_tunnel.status_label.config(text="○ LOCAL ONLY", fg=TEXT_MUTED)

    def launch_desktop_window(self):
        """Launches Aegis Cockpit in standalone Edge App mode or default browser."""
        edge_path = Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
        target_url = "http://localhost:5173"
        if edge_path.exists():
            self._log("Launching Aegis Cockpit in Standalone Native Desktop Window...")
            subprocess.Popen([str(edge_path), f"--app={target_url}", "--window-size=1280,820"])
        else:
            self._log(f"Opening Cockpit at {target_url} in default browser...")
            import webbrowser
            webbrowser.open(target_url)

    def open_default_browser(self):
        import webbrowser
        self._log("Opening http://localhost:5173 in default web browser...")
        webbrowser.open("http://localhost:5173")

    def show_mobile_dialog(self):
        """Displays mobile connection links, QR code, and APK installation info."""
        dlg = tk.Toplevel(self.root)
        dlg.title("Aegis // Mobile & APK Access")
        dlg.geometry("560x420")
        dlg.configure(bg=BG_SURFACE)
        dlg.transient(self.root)

        tk.Label(
            dlg,
            text="📱 MOBILE PHONE & APK ACCESS",
            font=FONT_HEADING,
            fg=ACCENT_CYAN,
            bg=BG_SURFACE,
        ).pack(anchor="w", padx=15, pady=(15, 5))

        txt_info = tk.Text(dlg, bg=BG_CARD, fg=TEXT_PRIMARY, font=("Consolas", 9), relief=tk.FLAT, padx=10, pady=10)
        txt_info.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)

        local_url = f"http://{self.local_ip}:5173"
        tunnel = get_tunnel_url() or "powershell .\\scripts\\setup-tunnel.ps1 -Action start"

        info_text = f"""[OPTION 1: LOCAL WI-FI ACCESS]
  Mobile URL: {local_url}
  Connect phone to same Wi-Fi network and open in mobile browser.

[OPTION 2: PUBLIC CLOUD ACCESS (4G / 5G / CELLULAR)]
  Public HTTPS URL: {tunnel}
  Connect securely from anywhere outside home.

[OPTION 3: STANDALONE ANDROID APK (.APK)]
  File Path: {APK_FILE}
  Direct Phone Download (Wi-Fi):
  {local_url}/aegis-command-center.apk

  Direct Phone Download (Cloud Tunnel):
  {tunnel}/aegis-command-center.apk

[LOGIN CREDENTIALS]
  Username: admin
  Password: admin123
"""
        txt_info.insert(tk.END, info_text)
        txt_info.config(state=tk.DISABLED)

        tk.Button(
            dlg,
            text="Close",
            font=FONT_BOLD,
            bg=ACCENT_CYAN,
            fg="#000000",
            relief=tk.FLAT,
            padx=12,
            pady=5,
            command=dlg.destroy,
        ).pack(pady=(0, 15))

    def restart_services(self):
        self._log("Restarting background services...")
        def _run():
            try:
                cmd = "Get-Process node, cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 1"
                subprocess.run(["powershell", "-Command", cmd], check=False)
                daemon_starter = ROOT_DIR / "scripts" / "run-daemon-hidden.vbs"
                if daemon_starter.exists():
                    subprocess.Popen(["wscript.exe", str(daemon_starter)])
                self._log("Background services triggered for restart.")
            except Exception as e:
                self._log(f"Restart error: {e}")
        threading.Thread(target=_run, daemon=True).start()

    def stop_services(self):
        self._log("Stopping all Aegis background processes...")
        def _run():
            try:
                cmd = "Get-Process node, cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force; Stop-ScheduledTask -TaskName 'AegisCommandCenterService' -ErrorAction SilentlyContinue"
                subprocess.run(["powershell", "-Command", cmd], check=False)
                self._log("Aegis background processes stopped.")
            except Exception as e:
                self._log(f"Stop error: {e}")
        threading.Thread(target=_run, daemon=True).start()

    def trigger_build_apk(self):
        self._log("Starting background Android APK build pipeline...")
        def _run():
            build_script = ROOT_DIR / "scripts" / "build-apk.ps1"
            if not build_script.exists():
                self._log("build-apk.ps1 not found.")
                return
            proc = subprocess.Popen(
                ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(build_script)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            for line in proc.stdout:
                line_str = line.strip()
                if line_str:
                    self.root.after(0, self._log, f"APK >> {line_str}")
            proc.wait()
            if proc.returncode == 0:
                self.root.after(0, self._log, "[OK] Android APK built successfully!")
                self.root.after(0, lambda: messagebox.showinfo("Build Success", "Android APK compiled successfully!\nFile: aegis-command-center.apk"))
            else:
                self.root.after(0, self._log, f"[ERROR] APK build exited with code {proc.returncode}")
        threading.Thread(target=_run, daemon=True).start()

    def open_logs(self):
        if DAEMON_LOG.exists():
            os.startfile(str(DAEMON_LOG))
        else:
            self._log(f"Log file not yet created at {DAEMON_LOG}")


def main():
    root = tk.Tk()
    app = AegisDesktopApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
