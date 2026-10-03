"""system_information: read-only OS / Python / CPU / RAM / disk info.

Privacy: deliberately does NOT return hostname, username, IP/MAC addresses
or file paths. Only what is needed to answer "what system am I running?".
"""
from __future__ import annotations

import os
import platform
import re
import shutil

from ..permissions import RiskLevel
from ..tools import Tool, ToolSpec

try:  # psutil gives cross-platform RAM/CPU numbers; tool still works without it
    import psutil
except ImportError:  # pragma: no cover
    psutil = None

SECTIONS = ("os", "python", "cpu", "memory", "disk")
_GB = 1024 ** 3


def _gb(n: int | float) -> float:
    return round(n / _GB, 2)


class SystemInformationTool(Tool):
    spec = ToolSpec(
        name="system_information",
        description="Read-only information about the machine the assistant runs on: OS, Python, CPU, RAM, disk.",
        risk_level=RiskLevel.DEVICE_INFO,
        required_permission="device.read",
        input_schema={
            "type": "object",
            "properties": {"sections": {"type": "array", "maxItems": 5,
                                        "items": {"type": "string", "enum": list(SECTIONS)}}},
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {s: {"type": "object"} for s in SECTIONS},
            "additionalProperties": False,
        },
        allowed_operations=("read",),
        triggers=(
            r"\bwhat\s+(system|os|operating system)\b.{0,30}\b(running|using|have)\b",
            r"\bwhich\s+(os|operating system)\b",
            r"\bsystem\s+(info|information|specs?|details)\b",
            r"\b(my|this)\s+(laptop|computer|pc|machine|system|device)\b.{0,20}\b(specs?|configuration|info|information|details)\b",
            r"\bhow\s+much\s+(ram|memory|disk(\s+space)?|storage)\b.*\b(i|my|this|laptop|computer|pc|machine)\b",
            r"\bwhat\s+python\s+version\b",
        ),
    )

    def run(self, args: dict) -> dict:
        wanted = list(dict.fromkeys(args.get("sections") or SECTIONS))  # dedupe, keep order
        return {name: getattr(self, f"_collect_{name}")() for name in wanted}

    def infer_args(self, message: str) -> dict:
        m = message.lower()
        found = []
        if re.search(r"\b(ram|memory)\b", m): found.append("memory")
        if re.search(r"\b(disk|storage|space)\b", m): found.append("disk")
        if re.search(r"\b(cpu|processor|cores)\b", m): found.append("cpu")
        if re.search(r"\bpython\b", m): found.append("python")
        if re.search(r"\b(os|operating system|windows|linux|macos)\b", m): found.append("os")
        return {"sections": found} if found else {}

    # ---- collectors -------------------------------------------------
    def _collect_os(self) -> dict:
        return {"system": platform.system(), "release": platform.release(),
                "version": platform.version(), "machine": platform.machine()}

    def _collect_python(self) -> dict:
        return {"version": platform.python_version(), "implementation": platform.python_implementation()}

    def _collect_cpu(self) -> dict:
        info = {"logical_cores": os.cpu_count(), "physical_cores": None, "usage_percent": None}
        if psutil:
            info["physical_cores"] = psutil.cpu_count(logical=False)
            info["usage_percent"] = psutil.cpu_percent(interval=0.1)
        return info

    def _collect_memory(self) -> dict:
        if not psutil:
            return {"total_gb": None, "available_gb": None, "used_percent": None}
        vm = psutil.virtual_memory()
        return {"total_gb": _gb(vm.total), "available_gb": _gb(vm.available), "used_percent": vm.percent}

    def _collect_disk(self) -> dict:
        usage = shutil.disk_usage(os.path.abspath(os.sep))  # system drive only
        return {"total_gb": _gb(usage.total), "free_gb": _gb(usage.free),
                "used_percent": round(usage.used / usage.total * 100, 1)}

    # ---- human-readable ---------------------------------------------
    def summarize(self, result: dict) -> str:
        lines = []
        if "os" in result:
            o = result["os"]; lines.append(f"OS: {o['system']} {o['release']} ({o['machine']})")
        if "python" in result:
            p = result["python"]; lines.append(f"Python: {p['version']} ({p['implementation']})")
        if "cpu" in result:
            c = result["cpu"]
            lines.append(f"CPU: {c['logical_cores']} logical cores, {c['physical_cores']} physical, usage {c['usage_percent']}%")
        if "memory" in result:
            m = result["memory"]
            lines.append(f"RAM: {m['total_gb']} GB total, {m['available_gb']} GB available ({m['used_percent']}% used)")
        if "disk" in result:
            d = result["disk"]
            lines.append(f"Disk: {d['total_gb']} GB total, {d['free_gb']} GB free ({d['used_percent']}% used)")
        return "\n".join(lines)
