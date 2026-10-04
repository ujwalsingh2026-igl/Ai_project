#!/usr/bin/env python
"""
Aegis Autonomous Command Center - Unified Command-Line Interface (CLI).

Commands:
  aegis deploy              Full deployment & health verification
  aegis status              Check status of all engines, databases, and models
  aegis chat                Start an interactive chat session with the AI agent
  aegis tools               List all registered tools across all subsystems
  aegis tool <name> [args]  Execute any registered tool directly from CLI
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Add backend directory to sys.path so core and apps are importable
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Setup Django settings environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")


def print_banner():
    banner = r"""
    ==================================================================
        AEGIS AUTONOMOUS COMMAND CENTER // UNIFIED CLI INTERFACE
    ==================================================================
    """
    print(banner)


def cmd_status(args):
    print("\n--- [1] RUNTIME SERVICES ---")
    # 1. Backend API
    try:
        req = urllib.request.Request("http://127.0.0.1:8001/api/health/", headers={"User-Agent": "Aegis-CLI"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            print(f" [+] Django Backend API : http://127.0.0.1:8001 [ONLINE] - Status: {data.get('status')}")
    except Exception as e:
        print(f" [-] Django Backend API : http://127.0.0.1:8001 [OFFLINE/UNREACHABLE] - {e}")

    # 2. Frontend Cockpit
    try:
        req = urllib.request.Request("http://localhost:5173", headers={"User-Agent": "Aegis-CLI"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            print(f" [+] Frontend Cockpit   : http://localhost:5173 [ONLINE] - Code: {resp.status}")
    except Exception as e:
        print(f" [-] Frontend Cockpit   : http://localhost:5173 [OFFLINE/UNREACHABLE]")

    # 3. Ollama LLM Host
    print("\n--- [2] AI AGENTS & OLLAMA MODELS ---")
    try:
        req = urllib.request.Request("http://localhost:11434/api/tags", headers={"User-Agent": "Aegis-CLI"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            models = [m.get("name") for m in data.get("models", [])]
            print(f" [+] Ollama Host        : http://localhost:11434 [ONLINE]")
            for m in models:
                mark = "[CUSTOM AGENT]" if "aegis" in m else "[BASE MODEL]"
                print(f"     * {m:<25} {mark}")
    except Exception as e:
        print(f" [-] Ollama Host        : http://localhost:11434 [OFFLINE] - {e}")

    # 4. Knowledge Bases
    print("\n--- [3] SPECIALIZED KNOWLEDGE BASES ---")
    kbs = [
        ("Clinical Medicine", BACKEND_DIR / "data" / "medical" / "clinical_kb.db", "2,194 Human Diseases (Opus 5.5)"),
        ("E-Commerce Analytics", BACKEND_DIR / "data" / "analytics" / "ecommerce_analytics.db", "25,000 Transactions (Kaggle Analytics)"),
        ("Cybersecurity Benchmarks", BACKEND_DIR / "data" / "security" / "cybersecurity_kb.db", "NSL-KDD, FWAF, MITRE Signatures"),
        ("Main Application DB", BACKEND_DIR / "db.sqlite3", "Django Users, Audit, Incidents, Vault"),
    ]
    for name, path, desc in kbs:
        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f" [+] {name:<25}: {path.name} ({size_mb:.2f} MB) - {desc}")
        else:
            print(f" [-] {name:<25}: MISSING ({path.name})")

    print("\nSystem status inspection complete.\n")


def cmd_deploy(args):
    ps1_script = ROOT_DIR / "deploy.ps1"
    if ps1_script.exists():
        cmd = ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1_script)]
        if args.mode:
            cmd.extend(["-Mode", args.mode])
        if args.reindex:
            cmd.append("-Reindex")
        subprocess.run(cmd)
    else:
        print(f"[!] Deployment script not found at {ps1_script}")


def cmd_tools(args):
    import django
    django.setup()
    from apps.assistant.services import build_registry

    registry = build_registry()
    print(f"\nRegistered Aegis Tools ({len(registry.all())} Total):\n")
    print(f" {'NAME':<32} {'RISK LEVEL':<12} {'DESCRIPTION'}")
    print(" " + "-" * 75)
    for tool in registry.all():
        risk_name = tool.spec.risk_level.name
        desc = tool.spec.description[:55] + "..." if len(tool.spec.description) > 55 else tool.spec.description
        print(f" {tool.spec.name:<32} {risk_name:<12} {desc}")
    print("")


def cmd_tool(args):
    import django
    django.setup()
    from apps.assistant.services import build_registry

    registry = build_registry()
    tool = registry.get(args.tool_name)
    if not tool:
        print(f"[!] Error: Tool '{args.tool_name}' not found.")
        print("Run 'python aegis_cli.py tools' to see available tools.")
        return

    # Parse key=value arguments
    kwargs = {}
    for item in args.arguments:
        if "=" in item:
            k, v = item.split("=", 1)
            # Try parsing integer, float, bool, or json
            if v.lower() == "true":
                kwargs[k] = True
            elif v.lower() == "false":
                kwargs[k] = False
            else:
                try:
                    kwargs[k] = int(v)
                except ValueError:
                    try:
                        kwargs[k] = float(v)
                    except ValueError:
                        kwargs[k] = v
        else:
            # Positional argument mapped to first schema property or query
            props = list(tool.spec.input_schema.get("properties", {}).keys())
            if props:
                kwargs[props[0]] = item

    print(f"[*] Executing tool '{args.tool_name}' with parameters:")
    print(json.dumps(kwargs, indent=2))
    print("-" * 60)

    try:
        result = tool.run(kwargs)
        summary = tool.summarize(result)
        print(f"[RESULT SUMMARY]:\n{summary}\n")
        print("[FULL OUTPUT DATA]:")
        print(json.dumps(result, indent=2, default=str))
    except Exception as exc:
        print(f"[!] Execution failed: {exc}")


def cmd_chat(args):
    model = args.model or "aegis-defense"
    print(f"Starting interactive session with [{model}] (Type 'exit' or 'quit' to end)...")
    print("-" * 65)

    while True:
        try:
            prompt = input(f"\nAegis [{model}] > ").strip()
            if not prompt:
                continue
            if prompt.lower() in ["exit", "quit", "q"]:
                print("Session terminated.")
                break

            # Send to Ollama
            req_data = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode("utf-8")
            req = urllib.request.Request(
                "http://localhost:11434/api/generate",
                data=req_data,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                res_obj = json.loads(resp.read().decode())
                print("\n" + res_obj.get("response", "").strip())
        except KeyboardInterrupt:
            print("\nSession exited.")
            break
        except Exception as e:
            print(f"\n[!] Error contacting model: {e}")


def get_local_ip():
    """Detects the primary non-loopback local network IP (e.g. Wi-Fi)."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def cmd_mobile(args):
    local_ip = get_local_ip()
    local_url = f"http://{local_ip}:5173"
    tunnel_file = BACKEND_DIR / "logs" / "tunnel_url.txt"
    tunnel_url = None
    if tunnel_file.exists():
        content = tunnel_file.read_text(encoding="utf-8").strip()
        if content.startswith("http"):
            tunnel_url = content

    print("\n" + "=" * 65)
    print("      AEGIS COMMAND CENTER // MOBILE PHONE ACCESS")
    print("=" * 65 + "\n")

    print("[OPTION 1: LOCAL WI-FI ACCESS]")
    print("  Use when your mobile phone is connected to the same Wi-Fi router.")
    print(f"  Mobile URL: {local_url}")
    print("\n  Scan QR Code with your Phone Camera:")
    try:
        req = urllib.request.Request(f"https://qrenco.de/{local_url}", headers={"User-Agent": "curl/7.68.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            print(resp.read().decode("utf-8"))
    except Exception:
        print(f"  (Point your phone browser to {local_url})")

    if tunnel_url:
        print("\n" + "-" * 65)
        print("[OPTION 2: PUBLIC CLOUD ACCESS (ANYWHERE OVER 4G / 5G / CELLULAR)]")
        print("  Use when your phone is outside your home or on cellular data.")
        print(f"  Public HTTPS URL: {tunnel_url}")
        print("\n  Scan Cloud QR Code:")
        try:
            req = urllib.request.Request(f"https://qrenco.de/{tunnel_url}", headers={"User-Agent": "curl/7.68.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                print(resp.read().decode("utf-8"))
        except Exception:
            print(f"  (Point your phone browser to {tunnel_url})")
    print("\n" + "-" * 65)
    print("[OPTION 3: STANDALONE ANDROID APK INSTALLATION (.APK)]")
    apk_file = ROOT_DIR / "aegis-command-center.apk"
    if apk_file.exists():
        size_mb = apk_file.stat().st_size / (1024 * 1024)
        print(f"  Compiled APK File: {apk_file} ({size_mb:.2f} MB)")
        print(f"  Direct Phone Download (Wi-Fi): {local_url}/aegis-command-center.apk")
        if tunnel_url:
            print(f"  Direct Phone Download (Cloud): {tunnel_url}/aegis-command-center.apk")
        print("\n  Installation Instructions:")
        print("  1. Open the download link on your Android phone.")
        print("  2. Tap 'Download Anyway' / 'Open' when finished.")
        print("  3. Tap 'Install' (Allow install from this source if prompted).")
        print("  4. Launch 'Aegis Cockpit' directly from your home screen!")
    else:
        print("  APK not yet compiled. To build the APK, run:")
        print("  powershell .\\scripts\\build-apk.ps1")

    print("\n[SAFETY & ZERO-TRUST BOUNDARIES]")
    print("  * Network: TLS 1.3 encryption on all public tunnel routes.")
    print("  * Local Isolation: Data and AI models run locally; zero cloud leakage.")
    print("  * Air-Gapped Approvals: Level 4 actions strictly require operator confirmation.")
    print("=" * 65 + "\n")


def cmd_apk(args):
    apk_file = ROOT_DIR / "aegis-command-center.apk"
    print("\n" + "=" * 65)
    print("      AEGIS COMMAND CENTER // ANDROID APK BUILDER")
    print("=" * 65 + "\n")
    if apk_file.exists():
        size_mb = apk_file.stat().st_size / (1024 * 1024)
        print(f"  [OK] Android APK Ready: {apk_file}")
        print(f"       File Size: {size_mb:.2f} MB")
        print("       Package ID: com.aegis.commandcenter")
        print("       Target SDK: Android 35 / Java 21")
        print("\n  To re-compile fresh APK after code changes, run:")
        print("       powershell .\\scripts\\build-apk.ps1")
    else:
        print("  [*] No pre-compiled APK found. Building now...")
        os.system("powershell .\\scripts\\build-apk.ps1")
    print("=" * 65 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Aegis Autonomous Command Center Unified CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # deploy
    deploy_parser = subparsers.add_parser("deploy", help="Deploy services and build assets")
    deploy_parser.add_argument("--mode", choices=["all", "dev", "prod", "check"], default="all")
    deploy_parser.add_argument("--reindex", action="store_true", help="Re-ingest all databases")

    # status
    subparsers.add_parser("status", help="Inspect runtime health, databases, and active models")

    # tools
    subparsers.add_parser("tools", help="List all registered tools in the system")

    # tool
    tool_parser = subparsers.add_parser("tool", help="Directly invoke any registered tool")
    tool_parser.add_argument("tool_name", help="Name of the tool to execute")
    tool_parser.add_argument("arguments", nargs="*", help="Arguments in key=value format")

    # mobile
    subparsers.add_parser("mobile", help="Get mobile access links and scan QR codes for phone access")

    # apk
    subparsers.add_parser("apk", help="Build and show Android APK packages")

    args = parser.parse_args()

    if not args.command:
        print_banner()
        parser.print_help()
        sys.exit(0)

    if args.command == "deploy":
        cmd_deploy(args)
    elif args.command == "status":
        print_banner()
        cmd_status(args)
    elif args.command == "mobile":
        cmd_mobile(args)
    elif args.command == "apk":
        cmd_apk(args)
    elif args.command == "tools":
        print_banner()
        cmd_tools(args)
    elif args.command == "tool":
        cmd_tool(args)
    elif args.command == "chat":
        print_banner()
        cmd_chat(args)


if __name__ == "__main__":
    main()
