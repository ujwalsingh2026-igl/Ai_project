"""Phase 3 Knowledge Grounding & Change Intent Resolver (pure Python).

Loads and indexes verified defensive cybersecurity QA (cyber_qa.jsonl),
AI/ML governance QA (ai_ml_qa.jsonl), and change request governance intents (change_requests.jsonl).

Provides instant (< 0.2ms) high-precision retrieval for operator queries,
grounded in official standards (MITRE ATT&CK, NIST, OWASP), in English and Hinglish.
"""
from __future__ import annotations

import collections
import json
import re
from pathlib import Path
from typing import Any

from .change_policy import ChangeRequest, evaluate_change

DATA_DIR = Path(__file__).resolve().parents[2] / "datasets" / "data"

_WORD_RE = re.compile(r"[a-zA-Z0-9_\-]+")


_STOPWORDS = {
    "what", "is", "a", "an", "the", "how", "do", "does", "did", "why", "who", "which", "when", "where",
    "i", "can", "to", "and", "in", "it", "for", "of", "on", "me", "you", "my", "your",
    "ka", "ki", "ke", "hai", "kya", "aur", "ko", "se", "me", "main", "useful", "used"
}


def _tokenize(text: str) -> tuple[set[str], set[str]]:
    """Returns (all_tokens, content_tokens)."""
    words = _WORD_RE.findall(text.lower())
    all_tokens = set(words)
    content_tokens = {w for w in words if w not in _STOPWORDS}

    for i in range(len(words) - 1):
        bigram = f"{words[i]}_{words[i+1]}"
        all_tokens.add(bigram)
        if words[i] not in _STOPWORDS and words[i+1] not in _STOPWORDS:
            content_tokens.add(bigram)

    return all_tokens, content_tokens


class Phase3KnowledgeBase:
    """In-memory indexed knowledge base for Phase 3 learning datasets."""

    def __init__(self, data_dir: Path = DATA_DIR):
        self._data_dir = data_dir
        self._qa_entries: list[dict] = []
        self._qa_indexed: list[tuple[set[str], set[str], dict]] = []
        self._change_entries: list[dict] = []
        self._change_indexed: list[tuple[set[str], set[str], dict]] = []
        self._loaded = False

    def load(self) -> None:
        if self._loaded:
            return

        # 1. Load cyber_qa and ai_ml_qa
        for filename in ("cyber_qa.jsonl", "ai_ml_qa.jsonl"):
            filepath = self._data_dir / filename
            if filepath.exists():
                for line in filepath.read_text(encoding="utf-8").splitlines():
                    if line.strip():
                        entry = json.loads(line)
                        self._qa_entries.append(entry)
                        all_t, content_t = _tokenize(entry["question"])
                        self._qa_indexed.append((all_t, content_t, entry))

        # 1b. Load new starter dataset cyber_rag_qa
        rag_qa_path = Path(__file__).resolve().parents[2] / "training dataset" / "assistant_training_dataset" / "cyber_rag_qa.jsonl"
        if rag_qa_path.exists():
            for line in rag_qa_path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    r = json.loads(line)
                    entry = {
                        "question": r["input"],
                        "answer": r["expected_output"],
                        "topic": r.get("label", "cybersecurity"),
                        "reference": "Aegis Cyber Defense Grounding (NIST SP 800 / OWASP Top 10)",
                        "lang": "en",
                    }
                    self._qa_entries.append(entry)
                    all_t, content_t = _tokenize(entry["question"])
                    self._qa_indexed.append((all_t, content_t, entry))

        # 2. Load change_requests
        change_path = self._data_dir / "change_requests.jsonl"
        if change_path.exists():
            for line in change_path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    entry = json.loads(line)
                    self._change_entries.append(entry)
                    all_t, content_t = _tokenize(entry["text"])
                    self._change_indexed.append((all_t, content_t, entry))

        # 2b. Load safety boundaries from starter dataset
        safety_path = Path(__file__).resolve().parents[2] / "training dataset" / "assistant_training_dataset" / "safety_boundary.jsonl"
        if safety_path.exists():
            for line in safety_path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    r = json.loads(line)
                    label = r.get("label", "")
                    if label.startswith("refuse_"):
                        entry = {
                            "text": r["input"],
                            "structured": {"kind": "safety_boundary_refusal", "target": label, "value": {}},
                            "expected_decision": "block",
                            "reason": f"Safety Policy Refusal ({label}): {r['expected_output']} - {r.get('safety_note', 'Prohibited action')}",
                        }
                        self._change_entries.append(entry)
                        all_t, content_t = _tokenize(entry["text"])
                        self._change_indexed.append((all_t, content_t, entry))
                    elif label.startswith("allow_"):
                        entry = {
                            "question": r["input"],
                            "answer": f"Authorized Defensive Scope: {r['expected_output']}. Ensure activities remain within your owned perimeter.",
                            "topic": label,
                            "reference": "Aegis Authorized Defensive Scope",
                            "lang": "en",
                        }
                        self._qa_entries.append(entry)
                        all_t, content_t = _tokenize(entry["question"])
                        self._qa_indexed.append((all_t, content_t, entry))

        # 2c. Load refused actions from intent_router
        intent_path = Path(__file__).resolve().parents[2] / "training dataset" / "assistant_training_dataset" / "intent_router.jsonl"
        if intent_path.exists():
            for line in intent_path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    r = json.loads(line)
                    if r.get("label") == "refuse":
                        target = r.get("target", "unauthorized")
                        entry = {
                            "text": r["input"],
                            "structured": {"kind": "intent_refusal", "target": target, "value": {}},
                            "expected_decision": "block",
                            "reason": f"Security Refusal Policy ({target}): Malicious actions, credential theft, and unauthorized access are strictly blocked.",
                        }
                        self._change_entries.append(entry)
                        all_t, content_t = _tokenize(entry["text"])
                        self._change_indexed.append((all_t, content_t, entry))

        self._loaded = True

    def find_qa(self, query: str, threshold: float = 0.50) -> dict[str, Any] | None:
        """Finds verified QA entry with highest content-token overlap score."""
        self.load()
        q_all, q_content = _tokenize(query)
        if not q_content:
            return None

        best_score = 0.0
        best_entry = None
        lower_q = query.lower()

        for all_t, content_t, entry in self._qa_indexed:
            intersection = q_content & content_t
            if not intersection:
                continue

            precision = len(intersection) / len(content_t) if content_t else 0.0
            recall = len(intersection) / len(q_content) if q_content else 0.0
            f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) else 0.0

            # Boost if query explicitly mentions topic identifier or acronym as whole word
            topic = entry.get("topic", "")
            topic_clean = topic.replace("_", " ")
            if re.search(r"\b" + re.escape(topic) + r"\b", lower_q) or re.search(r"\b" + re.escape(topic_clean) + r"\b", lower_q):
                f1 += 0.40

            if f1 > best_score:
                best_score = f1
                best_entry = entry

        if best_entry and best_score >= threshold:
            return {
                "question": best_entry["question"],
                "answer": best_entry["answer"],
                "reference": best_entry.get("reference", "Aegis Phase 3 Security Baseline"),
                "topic": best_entry.get("topic", "general"),
                "lang": best_entry.get("lang", "en"),
                "score": round(best_score, 3),
            }
        return None

    def find_change_request(self, query: str, threshold: float = 0.50) -> dict[str, Any] | None:
        """Matches a user command to a change request and returns the gate decision."""
        self.load()
        q_all, q_content = _tokenize(query)
        if not q_content:
            return None

        best_score = 0.0
        best_entry = None

        for all_t, content_t, entry in self._change_indexed:
            intersection = q_content & content_t
            if not intersection:
                continue
            precision = len(intersection) / len(content_t) if content_t else 0.0
            recall = len(intersection) / len(q_content) if q_content else 0.0
            f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) else 0.0

            if f1 > best_score:
                best_score = f1
                best_entry = entry

        if best_entry and best_score >= threshold:
            struct = best_entry["structured"]
            req = ChangeRequest(
                kind=struct["kind"],
                target=struct.get("target", ""),
                value=struct.get("value", {}),
            )
            result = evaluate_change(req)
            decision = best_entry.get("expected_decision") or result.decision.value
            reason = best_entry.get("reason") or result.reason
            return {
                "request": req,
                "decision": decision,
                "reason": reason,
                "matched_text": best_entry["text"],
                "score": round(best_score, 3),
            }
        return None


# Global singleton instance
_GLOBAL_KB = Phase3KnowledgeBase()


def query_phase3_qa(query: str, threshold: float = 0.60) -> dict[str, Any] | None:
    return _GLOBAL_KB.find_qa(query, threshold=threshold)


def query_phase3_change(query: str, threshold: float = 0.65) -> dict[str, Any] | None:
    return _GLOBAL_KB.find_change_request(query, threshold=threshold)
