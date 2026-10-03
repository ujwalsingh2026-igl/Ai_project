"""File threat scanner and quarantine engine (pure Python, defensive only).

Strict defensive boundaries:
- ONLY inspects files explicitly selected by the user (upload or local path).
- Never crawls the disk silently.
- NEVER executes the file.
- Static analysis only: SHA-256/MD5, entropy, PE headers, imports, script heuristics, YARA rules.
- Quarantine strips execute rights and stores metadata for reversible restore.
- Deletion is a separate approved action; never auto-deletes.
- Level 1 (USER_DATA) for read/scan; Level 4 (SECURITY_RESPONSE) for quarantine/restore/delete.
"""
from __future__ import annotations

import datetime
import hashlib
import math
import os
import re
import shutil
import struct
import zipfile
from pathlib import Path
from typing import Any, Protocol

from core.permissions import PermissionContext, RiskLevel
from core.tools import Tool, ToolSpec

# Harmless standard EICAR test string (68 bytes)
EICAR_TEST_STRING = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
EICAR_SHA256 = hashlib.sha256(EICAR_TEST_STRING).hexdigest()

# Dangerous file extensions commonly disguised
EXECUTABLE_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".scr", ".pif", ".hta", ".cpl", ".msi", ".jar",
}

# Suspicious Windows API imports commonly used in process injection and droppers
SUSPICIOUS_PE_IMPORTS = [
    "VirtualAlloc",
    "VirtualProtect",
    "WriteProcessMemory",
    "CreateRemoteThread",
    "QueueUserAPC",
    "SetWindowsHookEx",
    "InternetOpenA",
    "InternetOpenW",
    "URLDownloadToFileA",
    "URLDownloadToFileW",
    "WinExec",
    "ShellExecuteA",
    "ShellExecuteW",
    "IsDebuggerPresent",
    "CheckRemoteDebuggerPresent",
    "RegSetValueExA",
    "RegSetValueExW",
    "OpenProcess",
    "RtlMoveMemory",
    "CreateProcessA",
    "CreateProcessW",
]


def calculate_entropy(data: bytes) -> float:
    """Calculates Shannon entropy on byte sequence (0.0 to 8.0).

    Values > 7.2 typically indicate packing, encryption, or compressed payloads.
    """
    if not data:
        return 0.0

    length = len(data)
    frequencies: dict[int, int] = {}
    for byte in data:
        frequencies[byte] = frequencies.get(byte, 0) + 1

    entropy = 0.0
    for count in frequencies.values():
        p = count / length
        entropy -= p * math.log2(p)

    return round(entropy, 4)


def compute_hashes(data: bytes) -> dict[str, str]:
    """Computes SHA-256 and MD5 cryptographic hashes."""
    return {
        "sha256": hashlib.sha256(data).hexdigest(),
        "md5": hashlib.md5(data).hexdigest(),
        "sha1": hashlib.sha1(data).hexdigest(),
    }


def parse_pe_headers(data: bytes) -> dict[str, Any]:
    """Pure-Python Portable Executable (PE) header parser using struct.

    Extracts:
    - Architecture (x86 vs x64)
    - Section count and names
    - Section entropy (identifies packed sections like UPX)
    - Discrepancy between VirtualSize and SizeOfRawData
    - Security directory (digital signature presence)
    - Suspicious imported functions via string search
    """
    if len(data) < 64:
        return {"is_pe": False, "reason": "File too small for PE header"}

    # 1. DOS Header check (MZ = 0x5A4D)
    if data[:2] != b"MZ":
        return {"is_pe": False, "reason": "Missing MZ header signature"}

    # e_lfanew at offset 0x3C (4 bytes, little-endian)
    e_lfanew = struct.unpack("<I", data[0x3C:0x40])[0]
    if e_lfanew + 24 > len(data):
        return {"is_pe": False, "reason": "Invalid e_lfanew pointer"}

    # 2. PE Signature check (PE\0\0 = 0x00004550)
    pe_sig = data[e_lfanew : e_lfanew + 4]
    if pe_sig != b"PE\0\0":
        return {"is_pe": False, "reason": "Missing PE00 signature"}

    # 3. COFF File Header (20 bytes following PE signature)
    coff_offset = e_lfanew + 4
    machine, num_sections, timedatestamp, _, _, opt_hdr_size, characteristics = struct.unpack(
        "<HHIIIHH", data[coff_offset : coff_offset + 20]
    )

    machine_name = "x86 (32-bit)" if machine == 0x14C else "x64 (64-bit)" if machine == 0x8664 else f"Unknown (0x{machine:X})"
    is_dll = bool(characteristics & 0x2000)

    # 4. Optional Header (magic at beginning: 0x10B = PE32, 0x20B = PE32+)
    opt_offset = coff_offset + 20
    is_pe32_plus = False
    has_signature = False

    if opt_hdr_size >= 2:
        opt_magic = struct.unpack("<H", data[opt_offset : opt_offset + 2])[0]
        is_pe32_plus = opt_magic == 0x20B

        # In Optional Header, DataDirectories start at offset 96 for PE32, offset 112 for PE32+
        dd_start = opt_offset + (112 if is_pe32_plus else 96)
        # Certificate Table / Security Directory is index 4 (each entry is 8 bytes: VirtualAddress, Size)
        sec_dir_offset = dd_start + (4 * 8)
        if sec_dir_offset + 8 <= opt_offset + opt_hdr_size and sec_dir_offset + 8 <= len(data):
            _, sec_size = struct.unpack("<II", data[sec_dir_offset : sec_dir_offset + 8])
            has_signature = sec_size > 0

    # 5. Section Headers (40 bytes per section)
    sections_offset = opt_offset + opt_hdr_size
    sections: list[dict[str, Any]] = []
    has_packed_section = False
    max_section_entropy = 0.0

    for i in range(num_sections):
        sec_start = sections_offset + (i * 40)
        if sec_start + 40 > len(data):
            break

        name_raw = data[sec_start : sec_start + 8].rstrip(b"\x00")
        name = name_raw.decode("ascii", errors="replace").strip()

        v_size, _, raw_size, raw_ptr = struct.unpack("<IIII", data[sec_start + 8 : sec_start + 24])

        # Extract section data to calculate entropy
        sec_data = b""
        if raw_ptr + raw_size <= len(data):
            sec_data = data[raw_ptr : raw_ptr + raw_size]
        sec_entropy = calculate_entropy(sec_data) if sec_data else 0.0

        if sec_entropy > max_section_entropy:
            max_section_entropy = sec_entropy

        # Check for UPX or known packer names
        if "UPX" in name.upper() or "ASPACK" in name.upper() or "MPRESS" in name.upper():
            has_packed_section = True

        sections.append({
            "name": name,
            "virtual_size": v_size,
            "raw_size": raw_size,
            "entropy": sec_entropy,
            "is_high_entropy": sec_entropy > 7.2,
        })

    # 6. Search for suspicious imported API function strings
    suspicious_imports_found: list[str] = []
    data_lower = data.lower()
    for imp in SUSPICIOUS_PE_IMPORTS:
        if imp.lower().encode("ascii") in data_lower:
            suspicious_imports_found.append(imp)

    return {
        "is_pe": True,
        "machine": machine_name,
        "is_dll": is_dll,
        "has_digital_signature": has_signature,
        "has_packed_section": has_packed_section,
        "num_sections": len(sections),
        "sections": sections,
        "max_section_entropy": max_section_entropy,
        "suspicious_imports_found": suspicious_imports_found,
    }


def inspect_archive(filepath: str) -> dict[str, Any]:
    """Safely inspects zip archives with decompression ratio protection against zip bombs."""
    if not zipfile.is_zipfile(filepath):
        return {"is_archive": False}

    compressed_size = os.path.getsize(filepath)
    uncompressed_total = 0
    members: list[dict[str, Any]] = []
    has_executable = False

    try:
        with zipfile.ZipFile(filepath, "r") as zf:
            infolist = zf.infolist()
            # Limit entry count
            if len(infolist) > 10000:
                return {
                    "is_archive": True,
                    "is_suspicious": True,
                    "reason": f"Excessive file count inside archive ({len(infolist)} files)",
                }

            for info in infolist:
                uncompressed_total += info.file_size
                ext = Path(info.filename).suffix.lower()
                if ext in EXECUTABLE_EXTENSIONS:
                    has_executable = True
                members.append({
                    "filename": info.filename,
                    "file_size": info.file_size,
                    "compressed_size": info.compress_size,
                })

        ratio = (uncompressed_total / compressed_size) if compressed_size > 0 else 0
        is_zip_bomb = ratio > 100.0 and uncompressed_total > 50 * 1024 * 1024  # >100:1 ratio & >50MB

        return {
            "is_archive": True,
            "member_count": len(members),
            "uncompressed_size": uncompressed_total,
            "compression_ratio": round(ratio, 2),
            "is_zip_bomb": is_zip_bomb,
            "has_executable_inside": has_executable,
            "sample_files": [m["filename"] for m in members[:10]],
        }
    except Exception as e:
        return {"is_archive": True, "error": f"Corrupted or invalid zip: {e}"}


def inspect_script_content(data: bytes) -> dict[str, Any]:
    """Inspects text scripts (PowerShell, VBS, Bash, batch) for obfuscation and dropper patterns."""
    try:
        text = data.decode("utf-8", errors="ignore")
    except Exception:
        return {"has_suspicious_script": False}

    findings: list[str] = []

    # PowerShell obfuscation
    if re.search(r"powershell.*(-enc|-encodedcommand|downloadstring|invoke-expression|bypass|hidden)", text, re.I):
        findings.append("Obfuscated or hidden PowerShell invocation pattern")
    if re.search(r"\[System\.Convert\]::FromBase64String", text, re.I):
        findings.append("Base64 decoding in script")

    # Office macro / VBA dropper patterns
    if re.search(r"(AutoOpen|Workbook_Open|Document_Open)\s*\(", text, re.I):
        findings.append("VBA Auto-Execution entrypoint (AutoOpen)")
    if re.search(r"WScript\.Shell|Shell\.Application", text, re.I):
        findings.append("WScript.Shell system execution object")

    # Recon / discovery commands
    if re.search(r"(whoami|net user|nltest|vssadmin delete shadows)", text, re.I):
        findings.append("Suspicious credential or shadow copy deletion command")

    return {
        "has_suspicious_script": len(findings) > 0,
        "script_signals": findings,
    }


# -----------------------------------------------------------------------------
# Pure-Python YARA / Signature Rule Engine
# -----------------------------------------------------------------------------


class RuleMatch:
    def __init__(self, rule_id: str, title: str, severity: str, description: str):
        self.rule_id = rule_id
        self.title = title
        self.severity = severity
        self.description = description

    def to_dict(self) -> dict[str, str]:
        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "severity": self.severity,
            "description": self.description,
        }


def match_yara_rules(data: bytes, filename: str) -> list[RuleMatch]:
    """Evaluates standard signature rules against file data and filename."""
    matches: list[RuleMatch] = []

    # Rule 1: EICAR Standard Antivirus Test String
    if EICAR_TEST_STRING in data:
        matches.append(
            RuleMatch(
                rule_id="RULE_EICAR_STANDARD_TEST",
                title="EICAR Standard Test File",
                severity="high",
                description="Matched 68-byte European Institute for Computer Antivirus Research harmless test signature.",
            )
        )

    # Rule 2: Double Extension Executable
    clean_name = filename.lower()
    for ext in EXECUTABLE_EXTENSIONS:
        if clean_name.endswith(ext):
            base = clean_name[: -len(ext)]
            for fake_ext in [".pdf", ".docx", ".xlsx", ".png", ".jpg", ".txt", ".mp4", ".zip"]:
                if base.endswith(fake_ext):
                    matches.append(
                        RuleMatch(
                            rule_id="RULE_DOUBLE_EXTENSION_DECEPTION",
                            title="Double Extension Deception",
                            severity="high",
                            description=f"File disguise detected: '{fake_ext}{ext}' masquerades as a document.",
                        )
                    )
                    break

    # Rule 3: Hidden Executable (Magic bytes MZ with non-executable extension)
    if data[:2] == b"MZ":
        ext = Path(filename).suffix.lower()
        if ext in [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".txt", ".csv", ".mp3"]:
            matches.append(
                RuleMatch(
                    rule_id="RULE_MAGIC_BYTE_MISMATCH",
                    title="Executable Masquerading as Document/Image",
                    severity="high",
                    description=f"File extension is '{ext}' but binary contains Windows PE 'MZ' executable magic header.",
                )
            )

    # Rule 4: Ransomware Note Indicators
    ransom_patterns = [
        b"your personal files are encrypted",
        b"all your files have been encrypted",
        b"decrypt_instruction",
        b"restore your data",
    ]
    for p in ransom_patterns:
        if p in data.lower():
            matches.append(
                RuleMatch(
                    rule_id="RULE_RANSOM_NOTE_INDICATOR",
                    title="Ransomware Note Text Found",
                    severity="high",
                    description="Matched characteristic ransom demand phrasing.",
                )
            )
            break

    # Rule 5: LSASS / Mimikatz Memory Dump Signature
    if b"sekurlsa" in data.lower() or b"logonpasswords" in data.lower():
        matches.append(
            RuleMatch(
                rule_id="RULE_CREDENTIAL_DUMP_STRING",
                title="Credential Dumping Strings",
                severity="high",
                description="Contains known memory dump/credential harvesting function identifiers.",
            )
        )

    return matches


# -----------------------------------------------------------------------------
# Main Analysis Orchestrator
# -----------------------------------------------------------------------------


def analyze_file(filepath: str | Path) -> dict[str, Any]:
    """Performs comprehensive static defensive file threat analysis.

    NEVER executes the file.
    Returns structured Finding with verdict, score, evidence, and check limits.
    """
    path = Path(filepath)
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {filepath}")

    file_size = path.stat().st_size
    filename = path.name

    with open(path, "rb") as f:
        data = f.read()

    # 1. Cryptographic hashes & basic entropy
    hashes = compute_hashes(data)
    overall_entropy = calculate_entropy(data)

    # 2. Heuristic inspections
    pe_info = parse_pe_headers(data)
    archive_info = inspect_archive(str(path))
    script_info = inspect_script_content(data)
    yara_matches = match_yara_rules(data, filename)

    # 3. Evidence accumulation
    evidence: list[dict[str, Any]] = []
    threat_score = 0

    # Evidence: EICAR Match
    eicar_found = any(m.rule_id == "RULE_EICAR_STANDARD_TEST" for m in yara_matches)
    if eicar_found:
        threat_score = 100
        evidence.append({
            "fact": "File matches exact EICAR 68-byte standard antivirus test signature.",
            "source": "Signature Pattern Matcher",
            "inference": "Standard AV test sample (harmless, intended for pipeline verification).",
            "confidence": "certain",
            "severity": "high",
        })

    # Evidence: YARA Rules
    for m in yara_matches:
        if m.rule_id != "RULE_EICAR_STANDARD_TEST":
            threat_score = min(100, threat_score + 40)
            evidence.append({
                "fact": f"Matched signature rule: {m.title}",
                "source": "YARA Heuristic Rule Engine",
                "inference": m.description,
                "confidence": "high",
                "severity": m.severity,
            })

    # Evidence: High Entropy
    if overall_entropy > 7.2:
        threat_score = min(100, threat_score + 25)
        evidence.append({
            "fact": f"High Shannon entropy: {overall_entropy:.2f} / 8.0",
            "source": "Entropy Calculator",
            "inference": "File content shows high randomness, strongly indicating packing, compression, or encrypted payload.",
            "confidence": "medium",
            "severity": "medium",
        })

    # Evidence: PE Analysis
    if pe_info.get("is_pe"):
        if pe_info.get("has_packed_section"):
            threat_score = min(100, threat_score + 35)
            evidence.append({
                "fact": "PE section headers identify known packer (e.g. UPX/ASPack).",
                "source": "PE Header Parser",
                "inference": "Binary is compressed with an executable packer to obscure code.",
                "confidence": "high",
                "severity": "medium",
            })
        if pe_info.get("max_section_entropy", 0) > 7.3:
            threat_score = min(100, threat_score + 20)
            evidence.append({
                "fact": f"High section entropy ({pe_info['max_section_entropy']:.2f}) in executable code section.",
                "source": "PE Section Inspector",
                "inference": "Section contains encrypted or packed executable instructions.",
                "confidence": "medium",
                "severity": "medium",
            })
        if pe_info.get("suspicious_imports_found"):
            imp_count = len(pe_info["suspicious_imports_found"])
            threat_score = min(100, threat_score + min(30, imp_count * 10))
            evidence.append({
                "fact": f"Found {imp_count} suspicious API imports: {', '.join(pe_info['suspicious_imports_found'][:5])}",
                "source": "PE Import Table",
                "inference": "Binary references APIs commonly used in memory injection, network droppers, or process tampering.",
                "confidence": "medium",
                "severity": "medium",
            })
        if not pe_info.get("has_digital_signature"):
            evidence.append({
                "fact": "No digital certificate table found in PE Security Directory.",
                "source": "PE Authenticode Check",
                "inference": "Binary is unsigned.",
                "confidence": "high",
                "severity": "low",
            })

    # Evidence: Script / Macro
    if script_info.get("has_suspicious_script"):
        threat_score = min(100, threat_score + 30)
        for sig in script_info.get("script_signals", []):
            evidence.append({
                "fact": f"Script inspection finding: {sig}",
                "source": "Script Heuristics",
                "inference": "Script contains command execution or downloader patterns.",
                "confidence": "medium",
                "severity": "medium",
            })

    # Evidence: Zip Bomb
    if archive_info.get("is_archive") and archive_info.get("is_zip_bomb"):
        threat_score = min(100, threat_score + 50)
        evidence.append({
            "fact": f"Excessive decompression ratio ({archive_info.get('compression_ratio')}:1) detected.",
            "source": "Archive Inspector",
            "inference": "Possible zip bomb designed to cause denial of service via storage exhaustion.",
            "confidence": "high",
            "severity": "high",
        })

    # 4. Verdict Assignment
    if threat_score == 0:
        verdict = "clean"
    elif threat_score < 40:
        verdict = "suspicious"
    elif threat_score < 80:
        verdict = "suspicious"
    else:
        verdict = "likely_malicious"

    return {
        "file_name": filename,
        "file_path": str(path.resolve()),
        "file_size": file_size,
        "hashes": hashes,
        "entropy": overall_entropy,
        "verdict": verdict,
        "threat_score": threat_score,
        "evidence": evidence,
        "pe_info": pe_info,
        "archive_info": archive_info,
        "script_info": script_info,
        "yara_matches": [m.to_dict() for m in yara_matches],
        "scanned_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "limitations": "Heuristic static analysis only. Does not execute code. Not a substitute for certified endpoint antivirus.",
    }


# -----------------------------------------------------------------------------
# Quarantine Storage Protocol & Filesystem Operations
# -----------------------------------------------------------------------------


class QuarantineStore(Protocol):
    """Protocol for recording quarantined file items in the database."""

    def record_quarantine(
        self,
        user_id: Any,
        original_path: str,
        quarantine_path: str,
        sha256: str,
        file_size: int,
        verdict: str,
    ) -> dict: ...

    def get_quarantine_item(self, item_id: Any, user_id: Any) -> dict | None: ...

    def list_quarantine_items(self, user_id: Any) -> list[dict]: ...

    def mark_restored(self, item_id: Any, user_id: Any) -> None: ...

    def mark_deleted(self, item_id: Any, user_id: Any) -> None: ...


class InMemoryQuarantineStore:
    """In-memory quarantine store for pure Python testing."""

    def __init__(self):
        self.items: dict[int, dict] = {}
        self._next_id = 1

    def record_quarantine(
        self,
        user_id: Any,
        original_path: str,
        quarantine_path: str,
        sha256: str,
        file_size: int,
        verdict: str,
    ) -> dict:
        item = {
            "id": self._next_id,
            "user_id": user_id,
            "original_path": original_path,
            "quarantine_path": quarantine_path,
            "sha256": sha256,
            "file_size": file_size,
            "verdict": verdict,
            "status": "quarantined",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        self.items[self._next_id] = item
        self._next_id += 1
        return item

    def get_quarantine_item(self, item_id: Any, user_id: Any) -> dict | None:
        item = self.items.get(int(item_id))
        if item and item.get("user_id") == user_id:
            return item
        return None

    def list_quarantine_items(self, user_id: Any) -> list[dict]:
        return [i for i in self.items.values() if i.get("user_id") == user_id]

    def mark_restored(self, item_id: Any, user_id: Any) -> None:
        item = self.get_quarantine_item(item_id, user_id)
        if item:
            item["status"] = "restored"

    def mark_deleted(self, item_id: Any, user_id: Any) -> None:
        item = self.get_quarantine_item(item_id, user_id)
        if item:
            item["status"] = "deleted"


def quarantine_file_on_disk(
    filepath: str,
    quarantine_dir: str | Path,
) -> tuple[Path, str, int]:
    """Moves a file into quarantine directory, strips execute rights, and renames with .quarantine."""
    src = Path(filepath)
    if not src.is_file():
        raise FileNotFoundError(f"File to quarantine not found: {filepath}")

    qdir = Path(quarantine_dir)
    qdir.mkdir(parents=True, exist_ok=True)

    with open(src, "rb") as f:
        data = f.read()
    sha256 = hashlib.sha256(data).hexdigest()
    file_size = len(data)

    target_name = f"{sha256[:16]}_{src.name}.quarantine"
    dst = qdir / target_name

    # Move file
    shutil.move(str(src), str(dst))

    # Strip execute rights (chmod 0400 / read-only)
    try:
        os.chmod(dst, 0o400)
    except Exception:
        pass

    return dst, sha256, file_size


def restore_file_from_disk(quarantine_path: str, original_path: str) -> None:
    """Restores a quarantined file back to its original path."""
    src = Path(quarantine_path)
    if not src.is_file():
        raise FileNotFoundError(f"Quarantined file not found: {quarantine_path}")

    dst = Path(original_path)
    dst.parent.mkdir(parents=True, exist_ok=True)

    # Restore read/write permissions before moving
    try:
        os.chmod(src, 0o600)
    except Exception:
        pass

    shutil.move(str(src), str(dst))


# -----------------------------------------------------------------------------
# Core Tools
# -----------------------------------------------------------------------------


class SecurityFileScanTool(Tool):
    """Inspects a user-selected file for threats (hashes, entropy, PE, YARA)."""

    spec = ToolSpec(
        name="security_file_scan",
        description="Performs non-executing static defensive threat analysis on a user-selected file.",
        risk_level=RiskLevel.USER_DATA,
        required_permission="security.scan",
        input_schema={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Absolute path to the user-selected file to inspect",
                },
            },
            "required": ["path"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "file_name": {"type": "string"},
                "file_path": {"type": "string"},
                "file_size": {"type": "integer"},
                "hashes": {"type": "object"},
                "entropy": {"type": "number"},
                "verdict": {"type": "string"},
                "threat_score": {"type": "integer"},
                "evidence": {"type": "array"},
                "limitations": {"type": "string"},
            },
            "required": ["status", "verdict", "threat_score", "hashes"],
        },
        allowed_operations=["file_read", "hash_compute", "pe_parse"],
    )

    def run(self, args: dict[str, Any], context: PermissionContext | None = None) -> dict[str, Any]:
        path_str = args.get("path", "").strip()
        if not path_str:
            return {
                "status": "error",
                "verdict": "unknown",
                "threat_score": 0,
                "hashes": {},
                "message": "File path cannot be empty.",
            }

        try:
            analysis = analyze_file(path_str)
            analysis["status"] = "success"
            return analysis
        except Exception as e:
            return {
                "status": "error",
                "verdict": "unknown",
                "threat_score": 0,
                "hashes": {},
                "message": f"Scan failed: {e}",
            }

    def summarize(self, result: dict) -> str:
        verdict = result.get("verdict", "unknown").upper()
        score = result.get("threat_score", 0)
        return f"File Threat Scan: {verdict} (Score: {score}/100, SHA-256: {result.get('hashes', {}).get('sha256', 'N/A')[:12]}...)"


class SecurityFileQuarantineTool(Tool):
    """Moves a suspicious file into isolated quarantine with stripped permissions.

    RISK LEVEL 4: Always triggers user approval (single-use token).
    """

    spec = ToolSpec(
        name="security_file_quarantine",
        description="Moves a suspicious or malicious file into isolated quarantine storage. Requires explicit approval.",
        risk_level=RiskLevel.SECURITY_RESPONSE,
        required_permission="security.quarantine",
        input_schema={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Absolute path to the file to quarantine",
                },
                "notes": {
                    "type": "string",
                    "description": "Optional user notes explaining the quarantine reason",
                },
            },
            "required": ["path"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "original_path": {"type": "string"},
                "quarantine_path": {"type": "string"},
                "sha256": {"type": "string"},
                "file_size": {"type": "integer"},
                "message": {"type": "string"},
            },
            "required": ["status", "original_path", "quarantine_path"],
        },
        allowed_operations=["file_move", "permission_strip", "quarantine_record"],
    )

    def __init__(self, store: QuarantineStore | None = None, quarantine_dir: str | Path = "data/quarantine"):
        self.store = store
        self.quarantine_dir = Path(quarantine_dir)

    def run(self, args: dict[str, Any], context: PermissionContext | None = None) -> dict[str, Any]:
        user_id = context.user_id if context else 1
        path_str = args.get("path", "").strip()

        try:
            dst_path, sha256, file_size = quarantine_file_on_disk(path_str, self.quarantine_dir)
            if self.store:
                self.store.record_quarantine(
                    user_id=user_id,
                    original_path=path_str,
                    quarantine_path=str(dst_path),
                    sha256=sha256,
                    file_size=file_size,
                    verdict="quarantined",
                )

            return {
                "status": "success",
                "original_path": path_str,
                "quarantine_path": str(dst_path),
                "sha256": sha256,
                "file_size": file_size,
                "message": f"Successfully quarantined file into {dst_path.name} (execution rights stripped).",
            }
        except Exception as e:
            return {
                "status": "error",
                "original_path": path_str,
                "quarantine_path": "",
                "message": f"Quarantine failed: {e}",
            }

    def summarize(self, result: dict) -> str:
        return result.get("message", "Quarantine action completed.")


class SecurityFileRestoreTool(Tool):
    """Restores a quarantined file back to its original location.

    RISK LEVEL 4: Requires user approval.
    """

    spec = ToolSpec(
        name="security_file_restore",
        description="Restores a previously quarantined file to its original location. Requires explicit approval.",
        risk_level=RiskLevel.SECURITY_RESPONSE,
        required_permission="security.restore",
        input_schema={
            "type": "object",
            "properties": {
                "quarantine_id": {
                    "type": "integer",
                    "description": "ID of the quarantine record to restore",
                },
            },
            "required": ["quarantine_id"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "restored_path": {"type": "string"},
                "message": {"type": "string"},
            },
            "required": ["status"],
        },
        allowed_operations=["file_restore"],
    )

    def __init__(self, store: QuarantineStore | None = None):
        self.store = store

    def run(self, args: dict[str, Any], context: PermissionContext | None = None) -> dict[str, Any]:
        user_id = context.user_id if context else 1
        item_id = args.get("quarantine_id")

        if not self.store:
            return {"status": "error", "message": "Quarantine store not configured."}

        item = self.store.get_quarantine_item(item_id, user_id)
        if not item:
            return {"status": "error", "message": f"Quarantine item {item_id} not found."}

        try:
            restore_file_from_disk(item["quarantine_path"], item["original_path"])
            self.store.mark_restored(item_id, user_id)
            return {
                "status": "success",
                "restored_path": item["original_path"],
                "message": f"Restored file back to {item['original_path']}.",
            }
        except Exception as e:
            return {"status": "error", "message": f"Restore failed: {e}"}

    def summarize(self, result: dict) -> str:
        return result.get("message", "File restore completed.")


class SecurityFileDeleteTool(Tool):
    """Permanently deletes a quarantined file.

    RISK LEVEL 4: Second, separate approved step. Never auto-deletes.
    """

    spec = ToolSpec(
        name="security_file_delete",
        description="Permanently deletes a quarantined file. This action cannot be undone and requires explicit approval.",
        risk_level=RiskLevel.SECURITY_RESPONSE,
        required_permission="security.delete",
        input_schema={
            "type": "object",
            "properties": {
                "quarantine_id": {
                    "type": "integer",
                    "description": "ID of the quarantine record to delete permanently",
                },
            },
            "required": ["quarantine_id"],
            "additionalProperties": False,
        },
        output_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "message": {"type": "string"},
            },
            "required": ["status"],
        },
        allowed_operations=["file_delete"],
    )

    def __init__(self, store: QuarantineStore | None = None):
        self.store = store

    def run(self, args: dict[str, Any], context: PermissionContext | None = None) -> dict[str, Any]:
        user_id = context.user_id if context else 1
        item_id = args.get("quarantine_id")

        if not self.store:
            return {"status": "error", "message": "Quarantine store not configured."}

        item = self.store.get_quarantine_item(item_id, user_id)
        if not item:
            return {"status": "error", "message": f"Quarantine item {item_id} not found."}

        try:
            qpath = Path(item["quarantine_path"])
            if qpath.is_file():
                # Make writable to delete
                try:
                    os.chmod(qpath, 0o600)
                except Exception:
                    pass
                qpath.unlink()

            self.store.mark_deleted(item_id, user_id)
            return {
                "status": "success",
                "message": f"Permanently deleted quarantined file {qpath.name}.",
            }
        except Exception as e:
            return {"status": "error", "message": f"Delete failed: {e}"}

    def summarize(self, result: dict) -> str:
        return result.get("message", "File delete completed.")
