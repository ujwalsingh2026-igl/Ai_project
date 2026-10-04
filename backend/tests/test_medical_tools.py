"""Unit tests for Medical Clinical Decision Support tools (Opus 5.5 + HH-RLHF)."""
import tempfile
import unittest
from pathlib import Path
import sqlite3

from core.builtin_tools.medical import (
    MedicalDiseaseLookupTool,
    MedicalDrugInteractionTool,
    MedicalSymptomTriageTool,
    CLINICAL_DISCLAIMER,
)


class MedicalToolsTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_clinical.db"
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("""
        CREATE TABLE diseases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            aliases TEXT,
            icd10 TEXT,
            body_systems TEXT,
            description TEXT,
            patient_scenario TEXT,
            differential_diagnosis TEXT,
            related_drugs TEXT,
            drug_interactions TEXT,
            food_interactions TEXT,
            common_mistakes TEXT,
            executive_summary TEXT,
            sample_conversation TEXT
        );
        """)
        cur.execute("""
        INSERT INTO diseases VALUES (
            1, 'Atrial Fibrillation', '["A-Fib", "AF"]', 'I48.91', '["Cardiovascular"]',
            'Atrial fibrillation is a common cardiac arrhythmia characterized by irregular heartbeat.',
            'A 65-year-old male presents with palpitations, fatigue, and lightheadedness.',
            'Atrial flutter, sinus tachycardia, ventricular ectopy',
            '[{"din": "02242531", "brand_name": "Warfarin", "ingredient": "Warfarin Sodium"}]',
            'Increased bleeding risk with NSAIDs and antiplatelet agents.',
            'Maintain consistent vitamin K intake.',
            'Failure to calculate CHA2DS2-VASc score before anticoagulation.',
            'Requires rate control and stroke risk stratification.',
            'PATIENT: My heart feels like it is fluttering.\nDOCTOR: Let us obtain an ECG immediately.'
        );
        """)
        conn.commit()
        conn.close()

        self.lookup_tool = MedicalDiseaseLookupTool(self.db_path)
        self.triage_tool = MedicalSymptomTriageTool(self.db_path)
        self.drug_tool = MedicalDrugInteractionTool(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_disease_lookup_exact_and_alias(self):
        # Exact lookup
        res = self.lookup_tool.run({"disease_name": "Atrial Fibrillation"})
        self.assertTrue(res["found"])
        self.assertEqual(res["disease"]["icd10"], "I48.91")
        self.assertIn("arrhythmia", res["disease"]["description"].lower())
        self.assertEqual(res["disclaimer"], CLINICAL_DISCLAIMER)

        # Alias lookup
        res2 = self.lookup_tool.run({"disease_name": "A-Fib"})
        self.assertTrue(res2["found"])

        # Not found
        res3 = self.lookup_tool.run({"disease_name": "Nonexistent Syndrome"})
        self.assertFalse(res3["found"])

    def test_symptom_triage_and_red_flag_detection(self):
        # Emergency red flag
        res_emergency = self.triage_tool.run({"symptoms": "severe chest pain and shortness of breath"})
        self.assertTrue(res_emergency["emergency_detected"])
        self.assertIn("CRITICAL RED FLAG", res_emergency["emergency_details"])

        # Non-emergency symptom matching
        res_match = self.triage_tool.run({"symptoms": "palpitations and irregular heartbeat"})
        self.assertEqual(len(res_match["matching_diseases"]), 1)
        self.assertEqual(res_match["matching_diseases"][0]["name"], "Atrial Fibrillation")

    def test_drug_interaction_lookup(self):
        res = self.drug_tool.run({"drug_name": "Warfarin"})
        self.assertTrue(res["found"])
        self.assertEqual(res["drug"], "Warfarin")
        self.assertIn("bleeding risk", res["interactions"][0]["drug_interactions"].lower())


if __name__ == "__main__":
    unittest.main()
