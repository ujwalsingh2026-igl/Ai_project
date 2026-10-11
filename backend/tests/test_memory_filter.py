import json
import unittest
from pathlib import Path

from core.memory_filter import MemoryVerdict, check_memory_candidate

V = MemoryVerdict
DATA = Path(__file__).resolve().parents[2] / "datasets" / "data"


class MemoryFilterTests(unittest.TestCase):
    def test_secrets_refused(self):
        for text in ["my password is abc12345", "api key = sk-test-1234567890abcdefghijkl",
                     "-----BEGIN PRIVATE KEY-----", "the otp is 123456 for login"]:
            self.assertEqual(check_memory_candidate(text).verdict, V.REFUSE, text)

    def test_card_number_needs_valid_luhn(self):
        self.assertEqual(check_memory_candidate("card 4111 1111 1111 1111").verdict, V.REFUSE)
        self.assertEqual(check_memory_candidate("order 1234567890123 delivered").verdict, V.STORE)

    def test_ids_refused(self):
        for text in ["aadhaar 2345 6789 0123", "PAN ABCDE1234F", "ssn 123-45-6789"]:
            self.assertEqual(check_memory_candidate(text).verdict, V.REFUSE, text)

    def test_sensitive_needs_consent_and_transient_skipped(self):
        self.assertEqual(check_memory_candidate("my salary is 40000").verdict, V.NEEDS_CONSENT)
        self.assertEqual(check_memory_candidate("I am tired right now").verdict, V.SKIP)

    def test_normal_preference_stored(self):
        self.assertEqual(check_memory_candidate("I prefer short answers").verdict, V.STORE)

    @unittest.skipUnless((DATA / "memory_decisions.jsonl").exists(), "dataset not present")
    def test_dataset_agreement_and_known_gaps(self):
        rows = [json.loads(l) for l in (DATA / "memory_decisions.jsonl").read_text(encoding="utf-8").splitlines()]
        for r in rows:
            got = check_memory_candidate(r["text"]).verdict.value
            if r["filter_currently_misses"]:
                # documented weakness: if the filter gets better this fails, which is the cue to update the dataset flag
                self.assertNotEqual(got, r["expected_verdict"], f"gap fixed? {r['text']}")
            else:
                self.assertEqual(got, r["expected_verdict"], r["text"])


if __name__ == "__main__":
    unittest.main()
