"""Defensive Clinical Decision Support & Medical Alignment Tools.

Powered by:
1. nisten/opus5-5-doctor-patient-conversations-all-human-diseases (2,194 clinician-verified diseases)
2. Anthropic/hh-rlhf (Helpful and Harmless alignment principles)
"""
from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any

from core.permissions import RiskLevel
from core.tools import ToolSpec

logger = logging.getLogger("core.builtin_tools.medical")

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "medical" / "clinical_kb.db"

CLINICAL_DISCLAIMER = (
    "DISCLAIMER: Aegis Clinical Decision Support is an educational and clinical reference tool, "
    "NOT a substitute for professional medical judgment. In case of medical emergencies (e.g. chest pain, "
    "stroke symptoms, respiratory arrest, severe trauma), immediately call local emergency services (e.g. 911 / 112)."
)

EMERGENCY_RED_FLAGS = [
    ("chest pain", "crushing substernal pressure, suspected acute coronary syndrome / myocardial infarction"),
    ("shortness of breath", "acute respiratory distress / pulmonary embolism / anaphylaxis"),
    ("face drooping", "suspected acute stroke (FAST protocol: Face, Arm, Speech, Time)"),
    ("arm weakness", "suspected acute stroke (FAST protocol)"),
    ("slurred speech", "suspected acute stroke (FAST protocol)"),
    ("suicide", "acute self-harm or psychiatric crisis"),
    ("overdose", "acute toxic ingestion or drug overdose"),
    ("severe bleeding", "uncontrolled arterial or massive hemorrhage"),
]


class MedicalDiseaseLookupTool:
    """Queries 2,194 clinician-verified diseases for pathology, ICD-10, and differential diagnosis."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="medical_disease_lookup",
            description="Look up pathology, ICD-10 codes, symptoms, differential diagnoses, and treatment protocols across 2,194 human diseases.",
            risk_level=RiskLevel.SAFE,
            required_permission="medical.lookup",
            input_schema={
                "type": "object",
                "properties": {
                    "disease_name": {
                        "type": "string",
                        "description": "Name or alias of the disease to look up (e.g. 'Atrial fibrillation', 'Asthma', 'Crohn disease')",
                    },
                    "icd10": {
                        "type": "string",
                        "description": "Optional ICD-10 code (e.g. 'I48.91')",
                    },
                },
                "required": ["disease_name"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "found": {"type": "boolean"},
                    "disease": {"type": "object"},
                    "disclaimer": {"type": "string"},
                },
                "required": ["found", "disclaimer"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^medical\s+lookup\s+(?P<disease_name>.+)$",
                r"^disease\s+(info|lookup|details)\s+(?P<disease_name>.+)$",
                r"^(what is|tell me about)\s+(?P<disease_name>.+?)\s+(disease|syndrome|condition)$",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        import re
        for pattern in self.spec.triggers:
            m = re.search(pattern, message, re.IGNORECASE)
            if m and "disease_name" in m.groupdict():
                return {"disease_name": m.group("disease_name").strip()}
        return {"disease_name": message.strip()}

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        target = args.get("disease_name", "").strip()
        icd = args.get("icd10", "").strip()

        if not self._db_path.exists():
            return {
                "found": False,
                "error": "Clinical database not initialized. Run backend/scripts/ingest_medical_dataset.py",
                "disclaimer": CLINICAL_DISCLAIMER,
            }

        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        row = None
        if icd:
            cur.execute("SELECT * FROM diseases WHERE icd10 LIKE ? LIMIT 1;", (f"%{icd}%",))
            row = cur.fetchone()

        if not row and target:
            # Exact match
            cur.execute("SELECT * FROM diseases WHERE LOWER(name) = LOWER(?);", (target,))
            row = cur.fetchone()

        if not row and target:
            # Fuzzy match on name or aliases
            cur.execute("SELECT * FROM diseases WHERE name LIKE ? OR aliases LIKE ? LIMIT 1;", (f"%{target}%", f"%{target}%"))
            row = cur.fetchone()

        if not row:
            conn.close()
            return {
                "found": False,
                "query": target,
                "message": f"No disease record found matching '{target}'.",
                "disclaimer": CLINICAL_DISCLAIMER,
            }

        data = {
            "name": row["name"],
            "icd10": row["icd10"],
            "body_systems": json.loads(row["body_systems"]) if row["body_systems"].startswith("[") else row["body_systems"],
            "aliases": json.loads(row["aliases"]) if row["aliases"].startswith("[") else row["aliases"],
            "description": row["description"][:600],
            "differential_diagnosis": row["differential_diagnosis"][:500],
            "common_mistakes": row["common_mistakes"][:400],
            "executive_summary": row["executive_summary"][:400],
            "patient_scenario": row["patient_scenario"][:500],
        }
        conn.close()

        return {
            "found": True,
            "disease": data,
            "disclaimer": CLINICAL_DISCLAIMER,
        }


class MedicalSymptomTriageTool:
    """Assists in differential diagnosis and clinical triage matching patient symptoms."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="medical_symptom_triage",
            description="Clinical decision support symptom triage. Identifies potential differential diagnoses, red flags, and key doctor questions.",
            risk_level=RiskLevel.SAFE,
            required_permission="medical.triage",
            input_schema={
                "type": "object",
                "properties": {
                    "symptoms": {
                        "type": "string",
                        "description": "Patient reported symptoms (e.g. 'fever, shortness of breath, cough')",
                    },
                },
                "required": ["symptoms"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "emergency_detected": {"type": "boolean"},
                    "emergency_details": {"type": "string"},
                    "matching_diseases": {"type": "array"},
                    "disclaimer": {"type": "string"},
                },
                "required": ["emergency_detected", "disclaimer"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^medical\s+triage\s+(?P<symptoms>.+)$",
                r"^symptoms\s+of\s+(?P<symptoms>.+)$",
                r"^patient\s+presents\s+with\s+(?P<symptoms>.+)$",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        import re
        for pattern in self.spec.triggers:
            m = re.search(pattern, message, re.IGNORECASE)
            if m and "symptoms" in m.groupdict():
                return {"symptoms": m.group("symptoms").strip()}
        return {"symptoms": message.strip()}

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        symptoms = args.get("symptoms", "").lower().strip()

        # 1. Anthropic HH-RLHF emergency red-flag scan
        emergency_detected = False
        emergency_details = ""
        for flag, description in EMERGENCY_RED_FLAGS:
            if flag in symptoms:
                emergency_detected = True
                emergency_details = (
                    f"CRITICAL RED FLAG DETECTED: '{flag}' ({description}). "
                    "IMMEDIATE ACTION: Direct the patient to emergency medical evaluation or 911 / 112 immediately."
                )
                break

        if not self._db_path.exists():
            return {
                "emergency_detected": emergency_detected,
                "emergency_details": emergency_details,
                "matching_diseases": [],
                "disclaimer": CLINICAL_DISCLAIMER,
            }

        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Tokenize main symptoms
        tokens = [t.strip() for t in symptoms.replace(",", " ").split() if len(t.strip()) > 3][:4]
        matches = []
        if tokens:
            query_conds = " OR ".join(["description LIKE ? OR patient_scenario LIKE ?" for _ in tokens])
            query_params = []
            for t in tokens:
                query_params.extend([f"%{t}%", f"%{t}%"])

            cur.execute(f"SELECT name, icd10, executive_summary, differential_diagnosis FROM diseases WHERE {query_conds} LIMIT 4;", query_params)
            for r in cur.fetchall():
                matches.append({
                    "name": r["name"],
                    "icd10": r["icd10"],
                    "summary": r["executive_summary"][:200] if r["executive_summary"] else "",
                    "differential": r["differential_diagnosis"][:200] if r["differential_diagnosis"] else "",
                })

        conn.close()

        return {
            "emergency_detected": emergency_detected,
            "emergency_details": emergency_details,
            "matching_diseases": matches,
            "disclaimer": CLINICAL_DISCLAIMER,
        }


class MedicalDrugInteractionTool:
    """Inspects drug interactions and contraindications from the clinical database."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="medical_drug_interaction",
            description="Check drug interactions, contraindications, and food warnings across disease treatments.",
            risk_level=RiskLevel.SAFE,
            required_permission="medical.drugs",
            input_schema={
                "type": "object",
                "properties": {
                    "drug_name": {
                        "type": "string",
                        "description": "Name of the medication or ingredient to check",
                    },
                },
                "required": ["drug_name"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "found": {"type": "boolean"},
                    "drug": {"type": "string"},
                    "interactions": {"type": "array"},
                    "disclaimer": {"type": "string"},
                },
                "required": ["found", "disclaimer"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^drug\s+interaction\s+(?P<drug_name>.+)$",
                r"^contraindication\s+(?P<drug_name>.+)$",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        import re
        for pattern in self.spec.triggers:
            m = re.search(pattern, message, re.IGNORECASE)
            if m and "drug_name" in m.groupdict():
                return {"drug_name": m.group("drug_name").strip()}
        return {"drug_name": message.strip()}

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        drug = args.get("drug_name", "").strip()

        if not self._db_path.exists():
            return {
                "found": False,
                "drug": drug,
                "interactions": [],
                "disclaimer": CLINICAL_DISCLAIMER,
            }

        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute(
            "SELECT name, related_drugs, drug_interactions, food_interactions FROM diseases WHERE related_drugs LIKE ? OR drug_interactions LIKE ? LIMIT 3;",
            (f"%{drug}%", f"%{drug}%")
        )
        rows = cur.fetchall()
        interactions = []
        for r in rows:
            interactions.append({
                "disease": r["name"],
                "drug_interactions": r["drug_interactions"][:300] if r["drug_interactions"] else "None documented",
                "food_interactions": r["food_interactions"][:200] if r["food_interactions"] else "None documented",
            })
        conn.close()

        return {
            "found": len(interactions) > 0,
            "drug": drug,
            "interactions": interactions,
            "disclaimer": CLINICAL_DISCLAIMER,
        }
