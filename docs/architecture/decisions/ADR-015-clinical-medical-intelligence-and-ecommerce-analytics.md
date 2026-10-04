# ADR-015: Clinical Medical Intelligence (Opus 5.5 & HH-RLHF) and E-Commerce Analytics Integration

## Status
Accepted

## Context
The operator requested integrating three major data sources to expand Aegis's capabilities into clinical decision support, alignment safety, and e-commerce business analytics:
1. `nisten/opus5-5-doctor-patient-conversations-all-human-diseases` (2,194 clinician-verified human diseases with 20 structured clinical fields, ICD-10 codes, and ChatML doctor-patient dialogues).
2. `Anthropic/hh-rlhf` (Helpful & Harmless RLHF alignment dataset containing human preference pairs).
3. `datascikhan/e-commerce-sales-and-customer-analytics` (150k transaction records with revenue, customer segments, profit margins, and Customer Lifetime Value).

Furthermore, the operator noted standard defensive benchmarks in cybersecurity (`CIC-IDS2017`, `UNSW-NB15`, `NSL-KDD`, `EMBER`, `Stratosphere IPS`), confirming that all offensive payloads and unauthorized intrusion behaviors remain strictly blocked under Aegis's immutable Level 5 policy.

Because the local hardware utilizes an integrated Intel Iris Xe GPU (without NVIDIA CUDA hardware required for local 4-bit LoRA training), a hybrid strategy was selected:
- **Local Immediate Intelligence**: Ingest the datasets into compact, fast, local SQLite databases (`clinical_kb.db` and `ecommerce_analytics.db`), build defensive clinical/analytics tools, and create a specialized Ollama agent (`aegis-medical`).
- **Cloud/GPU Training Pipeline**: Provide a standalone fine-tuning pipeline (`scripts/train_medical_model.py` and `scripts/train_medical_llama3.ipynb`) using Hugging Face `trl` (SFTTrainer) + `peft` (LoRA) for free 15-minute training on Google Colab with GGUF export.

## Decision
1. **Clinical Decision Support & Alignment Subsystem (`core/builtin_tools/medical.py`)**:
   - `medical_disease_lookup`: Exact & fuzzy lookup across 2,194 human diseases, aliases, ICD-10 classifications, symptoms, and differential diagnoses.
   - `medical_symptom_triage`: Clinical decision support symptom matching with automatic emergency red-flag detection (FAST stroke protocol, crushing chest pain, acute respiratory distress, self-harm crisis) aligned with Anthropic's Helpful & Harmless safety principles.
   - `medical_drug_interaction`: Queries drug contraindications, food interactions, and DIN identifiers across clinical regimens.
   - Hard Clinical Disclaimer: Every tool output enforces an explicit educational advisory and emergency redirection notice.
2. **E-Commerce & Business Analytics Subsystem (`core/builtin_tools/analytics.py`)**:
   - `ecommerce_sales_summary`: Aggregates total net sales, gross profits, average profit margin percentages, and channel breakdowns (Mobile App, Website, In-Store, Direct) with regional filters.
   - `ecommerce_customer_metrics`: Evaluates customer segmentation (Consumer, Corporate, Home Office), average Customer Lifetime Value (CLV), repeat customer rates, and review sentiment distribution.
   - `ecommerce_order_lookup`: High-speed order and transaction tracker by Order ID (`ORD-301242`) with delivery and payment status.
3. **Custom Ollama Agent (`aegis-medical`)**:
   - Created `backend/data/medical/Modelfile` embedding Opus 5.5 clinical schema and Anthropic HH-RLHF safety guardrails on top of `llama3.2:latest`.
   - Built and verified in local Ollama (`aegis-medical:latest`, 2.0 GB).
4. **Agent Intent Router & Command Palette**:
   - Enhanced `AgentIntentRouter` with semantic patterns for medical lookups, symptom triage, drug interactions, sales summaries, and customer metrics.
   - Added direct action commands to the Cockpit Command Palette (`Ctrl+K`).

## Consequences
- Aegis can now act as a sovereign medical reference assistant and an e-commerce data analyst while preserving its core defensive cybersecurity mission.
- Zero extra heavy dependencies added to the web runtime; SQLite index querying completes in < 5ms.
- 132 core unit tests pass, and frontend production builds cleanly.
