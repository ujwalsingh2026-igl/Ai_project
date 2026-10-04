"""Defensive Cybersecurity Decision Support & Benchmark Analysis Tools.

Grounding datasets & benchmarks:
1. JunfengGo/Dataset-for-cybersecurity (curated benchmark collection)
2. NSL-KDD Network Intrusion Detection benchmark (10,000+ labeled connection records)
3. FWAF (Machine Learning Web Application Firewall) malicious & benign query dataset
4. MITRE ATT&CK & CWE Defensive Mapping
"""
from __future__ import annotations

import logging
import re
import sqlite3
import urllib.parse
from pathlib import Path
from typing import Any

from core.permissions import RiskLevel
from core.tools import Tool, ToolSpec

logger = logging.getLogger("core.builtin_tools.cybersecurity")

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "security" / "cybersecurity_kb.db"

DEFENSIVE_DISCLAIMER = (
    "DEFENSIVE POLICY NOTICE: Aegis Defensive Intelligence provides threat analysis, intrusion detection, "
    "and defensive hardening guidance strictly for authorized systems administration and incident response. "
    "Offensive exploitation, weaponized scanning, and unauthorized access are strictly prohibited."
)


def _connect_db(db_path: Path) -> sqlite3.Connection | None:
    if not db_path.exists():
        logger.warning(f"Cybersecurity knowledge base not found at {db_path}")
        return None
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as exc:
        logger.error(f"Error opening cybersecurity DB: {exc}")
        return None


class CybersecurityThreatLookupTool(Tool):
    """Queries curated threat signatures, MITRE ATT&CK techniques, and defensive mitigation playbooks."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="cybersecurity_threat_lookup",
            description="Look up threat signatures, MITRE ATT&CK techniques, CVE/CWE classifications, indicators of compromise, and defensive mitigation playbooks.",
            risk_level=RiskLevel.SAFE,
            required_permission="security.threat_lookup",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Name, MITRE technique ID, or keyword to search (e.g. 'SYN Flood', 'SQL Injection', 'T1498', 'Neptune', 'Ransomware')",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter: 'DoS', 'Probe', 'Web Attack', 'C2', 'Malware', 'R2L', 'U2R'",
                    },
                },
                "required": ["query"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "count": {"type": "integer"},
                    "results": {"type": "array"},
                    "disclaimer": {"type": "string"},
                },
                "required": ["count", "disclaimer"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^threat\s+(signature|lookup|profile)\s+(?P<query>.+)$",
                r"^explain\s+(threat|attack)\s+(?P<query>.+)$",
                r"^mitre\s+(technique|attack)\s+(?P<query>.+)$",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        for pattern in self.spec.triggers:
            m = re.search(pattern, message, re.IGNORECASE)
            if m and "query" in m.groupdict():
                return {"query": m.group("query").strip()}
        return {"query": message.strip()}

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        clean_q = str(args.get("query", "")).strip()
        category = args.get("category")
        if not clean_q:
            return {
                "count": 0,
                "results": [],
                "error": "A search query is required (e.g. 'SYN Flood', 'SQL Injection', 'T1190').",
                "disclaimer": DEFENSIVE_DISCLAIMER,
            }

        conn = _connect_db(self._db_path)
        if conn is None:
            return {
                "count": 0,
                "results": [],
                "error": "Cybersecurity knowledge base is not initialized.",
                "disclaimer": DEFENSIVE_DISCLAIMER,
            }

        try:
            cur = conn.cursor()
            sql = """
                SELECT name, category, mitre_attack_id, cve_cwe, description,
                       indicators_of_compromise, severity, defensive_mitigation, example_pattern
                FROM threat_signatures
                WHERE (name LIKE ? OR description LIKE ? OR mitre_attack_id LIKE ? OR indicators_of_compromise LIKE ?)
            """
            params: list[Any] = [f"%{clean_q}%", f"%{clean_q}%", f"%{clean_q}%", f"%{clean_q}%"]
            if category:
                sql += " AND category = ?"
                params.append(category)

            sql += " LIMIT 5"
            cur.execute(sql, params)
            rows = cur.fetchall()

            if not rows:
                return {
                    "query": clean_q,
                    "count": 0,
                    "results": [],
                    "message": f"No threat signatures found matching '{clean_q}'.",
                    "disclaimer": DEFENSIVE_DISCLAIMER,
                }

            results = []
            for r in rows:
                results.append({
                    "name": r["name"],
                    "category": r["category"],
                    "mitre_attack_id": r["mitre_attack_id"],
                    "cve_cwe": r["cve_cwe"],
                    "severity": r["severity"],
                    "description": r["description"],
                    "indicators_of_compromise": r["indicators_of_compromise"],
                    "defensive_mitigation": r["defensive_mitigation"],
                    "example_pattern": r["example_pattern"],
                })

            return {
                "query": clean_q,
                "count": len(results),
                "results": results,
                "disclaimer": DEFENSIVE_DISCLAIMER,
            }
        finally:
            conn.close()

    def execute(self, **kwargs: Any) -> dict[str, Any]:
        return self.run(kwargs)

    def summarize(self, result: dict[str, Any]) -> str:
        count = result.get("count", 0)
        if count == 0:
            return result.get("message", "No threat signatures found.")
        first = result.get("results", [{}])[0]
        return (
            f"Threat Signature [{first.get('name')}]: Category={first.get('category')}, "
            f"MITRE={first.get('mitre_attack_id')}, Severity={first.get('severity')}. "
            f"Mitigation: {first.get('defensive_mitigation', '')[:100]}..."
        )


class NetworkAnomalyDetectorTool(Tool):
    """Evaluates network connection telemetry against NSL-KDD benchmark distributions to detect intrusions."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="network_anomaly_detector",
            description="Analyze network connection telemetry against NSL-KDD benchmark distributions to detect intrusions (DoS, Probe, R2L, U2R) and recommend defensive firewall actions.",
            risk_level=RiskLevel.DEVICE_INFO,
            required_permission="security.network_analysis",
            input_schema={
                "type": "object",
                "properties": {
                    "protocol": {
                        "type": "string",
                        "description": "Network transport protocol ('tcp', 'udp', 'icmp')",
                        "default": "tcp",
                    },
                    "service": {
                        "type": "string",
                        "description": "Target service ('http', 'smtp', 'ftp', 'dns', 'private', 'telnet', etc.)",
                        "default": "http",
                    },
                    "flag": {
                        "type": "string",
                        "description": "TCP connection status flag ('SF', 'REJ', 'S0', 'RSTO', 'SH')",
                        "default": "SF",
                    },
                    "src_bytes": {
                        "type": "integer",
                        "description": "Bytes transmitted from source host",
                        "default": 0,
                    },
                    "dst_bytes": {
                        "type": "integer",
                        "description": "Bytes transmitted from destination host",
                        "default": 0,
                    },
                    "count": {
                        "type": "integer",
                        "description": "Number of connections to same destination in past 2 seconds",
                        "default": 1,
                    },
                    "serror_rate": {
                        "type": "number",
                        "description": "Percentage of connections with SYN errors (0.0 to 1.0)",
                        "default": 0.0,
                    },
                    "rerror_rate": {
                        "type": "number",
                        "description": "Percentage of connections with REJ errors (0.0 to 1.0)",
                        "default": 0.0,
                    },
                },
            },
            output_schema={
                "type": "object",
                "properties": {
                    "classification": {"type": "object"},
                    "indicators": {"type": "array"},
                    "recommended_mitigation": {"type": "string"},
                    "disclaimer": {"type": "string"},
                },
                "required": ["classification", "recommended_mitigation", "disclaimer"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^detect\s+network\s+anomaly",
                r"^analyze\s+network\s+(telemetry|traffic|flow)",
                r"^check\s+intrusion",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        args: dict[str, Any] = {"protocol": "tcp", "service": "http", "flag": "SF"}
        lower = message.lower()
        if "udp" in lower:
            args["protocol"] = "udp"
        elif "icmp" in lower:
            args["protocol"] = "icmp"
        if "s0" in lower:
            args["flag"] = "S0"
            args["serror_rate"] = 1.0
            args["count"] = 100
        elif "rej" in lower:
            args["flag"] = "REJ"
            args["rerror_rate"] = 0.8
            args["count"] = 50
        return args

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        proto_clean = str(args.get("protocol", "tcp")).lower().strip()
        srv_clean = str(args.get("service", "http")).lower().strip()
        flag_clean = str(args.get("flag", "SF")).upper().strip()
        src_bytes = int(args.get("src_bytes", 0))
        dst_bytes = int(args.get("dst_bytes", 0))
        count = int(args.get("count", 1))
        serror_rate = float(args.get("serror_rate", 0.0))
        rerror_rate = float(args.get("rerror_rate", 0.0))

        anomaly_detected = False
        attack_class = "Normal"
        attack_label = "normal"
        severity = "LOW"
        confidence = 0.95
        indicators = []
        mitigation = "Telemetry within normal operating parameters. Standard monitoring."

        # Heuristic rules derived from NSL-KDD benchmark feature distributions
        if proto_clean == "icmp" and srv_clean in ["eco_i", "ecr_i"] and count >= 15:
            anomaly_detected = True
            attack_class = "DoS"
            attack_label = "smurf"
            severity = "HIGH"
            confidence = 0.96
            indicators.append(f"Elevated ICMP Echo volume ({count} bursts) on service '{srv_clean}' indicative of broadcast flood.")
            mitigation = "Drop ICMP echo packets at the boundary router, disable directed broadcasts, verify uRPF."

        elif serror_rate >= 0.70 and flag_clean in ["S0", "REJ"] and count >= 30:
            anomaly_detected = True
            attack_class = "DoS"
            attack_label = "neptune"
            severity = "HIGH"
            confidence = 0.98
            indicators.append(f"Severe SYN error rate ({serror_rate * 100:.1f}%) with incomplete flag '{flag_clean}' and {count} rapid attempts.")
            mitigation = "Activate TCP SYN Cookies, lower synack retry threshold, and enable rate-limiting iptables rules."

        elif rerror_rate >= 0.50 or (flag_clean in ["REJ", "RSTO"] and count >= 15 and dst_bytes == 0):
            anomaly_detected = True
            attack_class = "Probe"
            attack_label = "portsweep"
            severity = "MEDIUM"
            confidence = 0.92
            indicators.append(f"High rejection error rate ({rerror_rate * 100:.1f}%) on {count} connection attempts with zero response payload.")
            mitigation = "Temporarily shun source IP via Fail2Ban / perimeter ACL, alert SOC of active port reconnaissance."

        elif src_bytes > 10000 and dst_bytes == 0 and count >= 50:
            anomaly_detected = True
            attack_class = "DoS"
            attack_label = "back / buffer surge"
            severity = "HIGH"
            confidence = 0.88
            indicators.append(f"Asymmetric byte transfer (src={src_bytes}, dst=0) with high concurrency ({count}).")
            mitigation = "Inspect application web server logs for request smuggling or large payload exhaustion attacks."

        elif flag_clean == "SF" and serror_rate < 0.15 and rerror_rate < 0.15:
            indicators.append("Three-way handshake completed successfully (flag SF) with healthy error tolerance.")

        # Query benchmark frequency from NSL-KDD database
        benchmark_matches = 0
        conn = _connect_db(self._db_path)
        if conn is not None:
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT COUNT(*) FROM nsl_kdd_samples
                    WHERE protocol_type = ? AND flag = ? AND attack_class = ?
                """, (proto_clean, flag_clean, attack_class))
                benchmark_matches = cur.fetchone()[0]
            finally:
                conn.close()

        return {
            "telemetry": {
                "protocol": proto_clean,
                "service": srv_clean,
                "flag": flag_clean,
                "src_bytes": src_bytes,
                "dst_bytes": dst_bytes,
                "connection_count": count,
                "serror_rate": serror_rate,
                "rerror_rate": rerror_rate,
            },
            "classification": {
                "is_anomaly": anomaly_detected,
                "attack_class": attack_class,
                "attack_label": attack_label,
                "severity": severity,
                "confidence": confidence,
            },
            "indicators": indicators,
            "recommended_mitigation": mitigation,
            "benchmark_context": {
                "dataset": "NSL-KDD Benchmark Testset",
                "matching_baseline_records": benchmark_matches,
            },
            "disclaimer": DEFENSIVE_DISCLAIMER,
        }

    def execute(self, **kwargs: Any) -> dict[str, Any]:
        return self.run(kwargs)

    def summarize(self, result: dict[str, Any]) -> str:
        cls = result.get("classification", {})
        if cls.get("is_anomaly"):
            return (
                f"NETWORK ANOMALY DETECTED [{cls.get('attack_class')} / {cls.get('attack_label')}]: "
                f"Severity={cls.get('severity')}, Confidence={cls.get('confidence') * 100:.0f}%. "
                f"Action: {result.get('recommended_mitigation')}"
            )
        return "Network connection telemetry matches normal operating baseline."


class WafPayloadAnalyzerTool(Tool):
    """Inspects web queries and parameters for OWASP Top 10 vulnerabilities (SQLi, XSS, LFI, RCE)."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="waf_payload_analyzer",
            description="Inspect HTTP queries, headers, or parameters against FWAF / OWASP attack vectors (SQL Injection, XSS, Path Traversal, Command Injection) to assess risk and generate defensive WAF rules.",
            risk_level=RiskLevel.SAFE,
            required_permission="security.waf_analysis",
            input_schema={
                "type": "object",
                "properties": {
                    "payload": {
                        "type": "string",
                        "description": "HTTP request snippet, parameter, or query string to inspect (e.g. \"' UNION SELECT username, password FROM users--\")",
                    },
                },
                "required": ["payload"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "is_malicious": {"type": "boolean"},
                    "primary_threat_type": {"type": "string"},
                    "risk_level": {"type": "string"},
                    "recommended_waf_action": {"type": "string"},
                    "detected_signatures": {"type": "array"},
                    "disclaimer": {"type": "string"},
                },
                "required": ["is_malicious", "primary_threat_type", "risk_level", "recommended_waf_action", "disclaimer"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^check\s+(payload|query|parameter)\s+(?P<payload>.+)$",
                r"^waf\s+(inspect|analyze)\s+(?P<payload>.+)$",
                r"^test\s+(sqli|xss)\s+(?P<payload>.+)$",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        for pattern in self.spec.triggers:
            m = re.search(pattern, message, re.IGNORECASE)
            if m and "payload" in m.groupdict():
                return {"payload": m.group("payload").strip()}
        return {"payload": message.strip()}

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        payload = str(args.get("payload", "")).strip()
        if not payload:
            return {
                "is_malicious": False,
                "primary_threat_type": "None",
                "risk_level": "LOW",
                "recommended_waf_action": "ALLOW",
                "error": "A payload string is required for analysis.",
                "disclaimer": DEFENSIVE_DISCLAIMER,
            }

        # Multi-pass URL decode to catch obfuscated/double-encoded attacks
        current = payload
        for _ in range(2):
            decoded = urllib.parse.unquote(current)
            if decoded == current:
                break
            current = decoded

        clean_text = current
        lower = clean_text.lower()

        detected_threats = []
        recommended_rules = []
        is_malicious = False
        primary_type = "Benign"
        risk_level = "LOW"

        # 1. SQL Injection Detection
        sqli_patterns = [
            (r"union\s+select", "SQLi: UNION SELECT data exfiltration"),
            (r"(\bor\b|\band\b)\s+['\"0-9a-z]+\s*=\s*['\"0-9a-z]+", "SQLi: Boolean tautology bypass (e.g. OR 1=1)"),
            (r"(drop|alter|truncate)\s+table", "SQLi: Destructive DDL command"),
            (r"sleep\s*\(\s*\d+\s*\)", "SQLi: Time-based blind delay"),
            (r"information_schema\.", "SQLi: Database schema enumeration"),
            (r"--\s*$|/\*.*?\*/", "SQLi: Inline comment injection"),
        ]
        for pattern, desc in sqli_patterns:
            if re.search(pattern, lower):
                detected_threats.append(desc)
                is_malicious = True
                primary_type = "SQL Injection (SQLi)"
                risk_level = "CRITICAL"
                recommended_rules.append("Enforce parameterized queries (Prepared Statements). Deny requests matching SQL metacharacters in parameter values.")

        # 2. Cross-Site Scripting (XSS) Detection
        xss_patterns = [
            (r"<\s*script[^>]*>", "XSS: Inline executable script tag"),
            (r"javascript\s*:", "XSS: Pseudo-protocol URI execution"),
            (r"on\w+\s*=", "XSS: Event handler injection (e.g. onerror=, onload=)"),
            (r"document\.cookie", "XSS: Session cookie access attempt"),
            (r"alert\s*\(", "XSS: Diagnostic alert payload execution"),
        ]
        for pattern, desc in xss_patterns:
            if re.search(pattern, lower):
                detected_threats.append(desc)
                is_malicious = True
                if primary_type == "Benign":
                    primary_type = "Cross-Site Scripting (XSS)"
                risk_level = "HIGH" if risk_level != "CRITICAL" else risk_level
                recommended_rules.append("Apply context-sensitive output encoding. Implement strict Content-Security-Policy (CSP) headers.")

        # 3. Path Traversal / LFI Detection
        traversal_patterns = [
            (r"\.\./|\.\.\\", "Path Traversal: Relative directory navigation"),
            (r"/etc/passwd|/etc/shadow", "LFI: Unix credential / system file access"),
            (r"c:\\windows|win\.ini", "LFI: Windows system directory traversal"),
        ]
        for pattern, desc in traversal_patterns:
            if re.search(pattern, lower):
                detected_threats.append(desc)
                is_malicious = True
                if primary_type == "Benign":
                    primary_type = "Path Traversal / LFI"
                risk_level = "HIGH" if risk_level != "CRITICAL" else risk_level
                recommended_rules.append("Sanitize path parameters with Path.resolve() / os.path.realpath() and verify path stays within allowed base directory.")

        # 4. Command Injection Detection
        cmd_patterns = [
            (r"[;&|`]\s*(whoami|id|cat\s+/|dir|powershell|bin/sh)", "Command Injection: Shell command delimiter execution"),
            (r"\$\(.*?\)", "Command Injection: Subshell command substitution"),
        ]
        for pattern, desc in cmd_patterns:
            if re.search(pattern, lower):
                detected_threats.append(desc)
                is_malicious = True
                primary_type = "Remote Command Execution (RCE)"
                risk_level = "CRITICAL"
                recommended_rules.append("Do not pass unsanitized strings to shell interpreters. Use subprocess with argument vectors and shell=False.")

        # Check FWAF benchmark similarity in database
        benchmark_match = None
        conn = _connect_db(self._db_path)
        if conn is not None:
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT payload, label, confidence_risk, detection_tokens
                    FROM waf_payload_samples
                    WHERE ? LIKE '%' || payload || '%' OR payload LIKE '%' || ? || '%'
                    LIMIT 1
                """, (clean_text[:60], clean_text[:60]))
                row = cur.fetchone()
                if row:
                    benchmark_match = {
                        "matching_benchmark_label": row["label"],
                        "risk": row["confidence_risk"],
                        "tokens": row["detection_tokens"],
                    }
            finally:
                conn.close()

        waf_action = "BLOCK" if is_malicious else "ALLOW"

        return {
            "input_payload": payload,
            "decoded_payload": clean_text if clean_text != payload else None,
            "is_malicious": is_malicious,
            "primary_threat_type": primary_type,
            "risk_level": risk_level,
            "recommended_waf_action": waf_action,
            "detected_signatures": detected_threats,
            "remediation_guidelines": list(set(recommended_rules)),
            "benchmark_correlation": benchmark_match,
            "disclaimer": DEFENSIVE_DISCLAIMER,
        }

    def execute(self, **kwargs: Any) -> dict[str, Any]:
        return self.run(kwargs)

    def summarize(self, result: dict[str, Any]) -> str:
        if result.get("is_malicious"):
            return (
                f"WAF MALICIOUS PAYLOAD [{result.get('primary_threat_type')}]: "
                f"Risk={result.get('risk_level')}, Action={result.get('recommended_waf_action')}. "
                f"Detected: {', '.join(result.get('detected_signatures', []))}"
            )
        return "WAF Payload Inspection: Benign request. Recommended action: ALLOW."


class CybersecurityDatasetCatalogTool(Tool):
    """Explores curated machine learning cybersecurity datasets from the JunfengGo benchmark collection."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="cybersecurity_dataset_catalog",
            description="Explore curated machine learning cybersecurity datasets (NSL-KDD, EMBER, Drebin, Stratosphere IPS, CIC-IDS) from the JunfengGo benchmark collection with recommended ML models and metrics.",
            risk_level=RiskLevel.SAFE,
            required_permission="security.dataset_info",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional search term for dataset name or domain (e.g. 'EMBER', 'NIDS', 'Malware', 'WAF')",
                    },
                },
            },
            output_schema={
                "type": "object",
                "properties": {
                    "count": {"type": "integer"},
                    "datasets": {"type": "array"},
                    "disclaimer": {"type": "string"},
                },
                "required": ["count", "datasets", "disclaimer"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^cybersecurity\s+(dataset|benchmark)\s*(?P<query>.*)$",
                r"^list\s+security\s+datasets",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        for pattern in self.spec.triggers:
            m = re.search(pattern, message, re.IGNORECASE)
            if m and "query" in m.groupdict():
                return {"query": m.group("query").strip()}
        return {"query": message.strip()}

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        clean_q = str(args.get("query", "")).strip()
        conn = _connect_db(self._db_path)
        if conn is None:
            return {
                "count": 0,
                "datasets": [],
                "error": "Cybersecurity knowledge base is not initialized.",
                "disclaimer": DEFENSIVE_DISCLAIMER,
            }

        try:
            cur = conn.cursor()
            if clean_q:
                cur.execute("""
                    SELECT name, category, source_url, feature_count, sample_types,
                           recommended_models, evaluation_metrics, description
                    FROM dataset_catalog
                    WHERE name LIKE ? OR category LIKE ? OR description LIKE ?
                """, (f"%{clean_q}%", f"%{clean_q}%", f"%{clean_q}%"))
            else:
                cur.execute("""
                    SELECT name, category, source_url, feature_count, sample_types,
                           recommended_models, evaluation_metrics, description
                    FROM dataset_catalog
                """)
            rows = cur.fetchall()

            datasets = []
            for r in rows:
                datasets.append({
                    "name": r["name"],
                    "category": r["category"],
                    "source_url": r["source_url"],
                    "feature_count": r["feature_count"],
                    "sample_types": r["sample_types"],
                    "recommended_models": r["recommended_models"],
                    "evaluation_metrics": r["evaluation_metrics"],
                    "description": r["description"],
                })

            return {
                "query": clean_q or "all",
                "count": len(datasets),
                "datasets": datasets,
                "disclaimer": DEFENSIVE_DISCLAIMER,
            }
        finally:
            conn.close()

    def execute(self, **kwargs: Any) -> dict[str, Any]:
        return self.run(kwargs)

    def summarize(self, result: dict[str, Any]) -> str:
        count = result.get("count", 0)
        return f"Found {count} cybersecurity benchmark datasets in catalog."
