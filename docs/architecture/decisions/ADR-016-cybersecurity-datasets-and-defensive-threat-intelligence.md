# ADR-016: Cybersecurity Benchmark Datasets & Defensive Threat Intelligence Integration

## Status
Accepted

## Context
The operator requested integrating cybersecurity machine learning datasets from `https://github.com/JunfengGo/Dataset-for-cybersecurity` (an "Awesome Machine Learning for Cyber Security" collection aggregating benchmark datasets, tutorials, and research literature).

### Strict Defensive Policy & Safety Boundary
Aegis adheres to strict non-offensive security policies:
- **Prohibited**: We do NOT provide or train models on weaponized exploit payloads, offensive attack scripts, unauthorized penetration tools, or malicious phishing generators.
- **Defensive Mission**: We ingest, train, and support defensive benchmarks: Network Intrusion Detection Systems (NIDS), Host Intrusion Detection Systems (HIDS), Web Application Firewall (WAF) query classification, static PE malware feature detection (EMBER), botnet network flow modeling (Stratosphere IPS), and MITRE ATT&CK defensive playbooks.

## Decision
1. **Defensive Cybersecurity Knowledge Base (`backend/data/security/cybersecurity_kb.db`)**:
   - `threat_signatures`: Curated high-impact threat profiles (SYN Flood/Neptune, ICMP Smurf, Port Sweeps, SQL Injection, XSS, Path Traversal, Command Injection, C2 Beaconing, Pass-the-Hash, Ransomware PE behaviors) mapped to MITRE ATT&CK techniques and CWEs with actionable mitigation playbooks.
   - `nsl_kdd_samples`: 10,000 labeled network connection records from the NSL-KDD benchmark test set (`KDDTest+`), covering protocols, flags, bytes, connection density, error rates, and attack classes (DoS, Probe, R2L, U2R, Normal).
   - `waf_payload_samples`: 3,000+ labeled malicious and benign HTTP queries from the FWAF machine learning WAF benchmark.
   - `dataset_catalog`: Curated metadata and recommended ML algorithms (Random Forest, LightGBM, SVM, Transformers) for academic benchmarks (NSL-KDD, FWAF, EMBER, Drebin, Stratosphere IPS, CIC-IDS).

2. **Defensive Decision Support Tools (`core/builtin_tools/cybersecurity.py`)**:
   - `cybersecurity_threat_lookup`: High-speed threat profile, MITRE ATT&CK technique, and remediation playbook lookup.
   - `network_anomaly_detector`: Evaluates telemetry (protocol, service, flag, bytes, count, serror_rate, rerror_rate) against NSL-KDD baseline distributions to flag intrusions (DoS, Probe) and provide firewall/IDS mitigation actions.
   - `waf_payload_analyzer`: Multi-pass URL decoding and regex/token inspection against OWASP Top 10 vulnerabilities (SQLi, XSS, LFI, RCE) to recommend WAF blocking rules.
   - `cybersecurity_dataset_catalog`: Searchable catalog of benchmark datasets from `Dataset-for-cybersecurity` with recommended models and evaluation metrics.
   - Every tool enforces the `DEFENSIVE POLICY NOTICE`.

3. **Custom Ollama Agent (`aegis-defense:latest`)**:
   - Created `backend/data/security/Modelfile` embedding NSL-KDD telemetry principles, FWAF query analysis, and MITRE ATT&CK defense postures into `llama3.2:latest`.
   - Built and verified in local Ollama (`aegis-defense:latest`, 2.0 GB).

4. **Turnkey Cloud GPU Fine-Tuning Pipeline**:
   - `scripts/train_cybersecurity_model.py`: Standalone SFTTrainer QLoRA 4-bit fine-tuning script.
   - `scripts/train_cybersecurity_llama3.ipynb`: 1-click Google Colab notebook for free T4 GPU training and GGUF export for local Ollama.

5. **Agent Intent Router & Cockpit Integration**:
   - Registered tools in `backend/apps/assistant/services.py:build_registry()`.
   - Configured semantic triggers in `backend/core/intent.py`.
   - Added 4 quick actions to Cockpit Command Palette (`Ctrl+K`).

## Consequences
- Aegis can now analyze network connection flows, inspect suspicious web queries for OWASP injection patterns, and provide MITRE ATT&CK mitigation guidance backed by academic benchmark datasets.
- 144 backend unit tests pass (12 dedicated to cybersecurity tools).
- 54 frontend Vitest tests pass across 12 suites, and production build succeeds cleanly.
