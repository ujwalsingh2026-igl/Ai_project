"""Memory filter (pure Python): decides what the assistant may remember from what the user writes.

Rule-based and deliberately conservative. LIMITATION: regex cannot catch every secret; it is a safety net,
not a guarantee. Secrets/IDs are never stored even if the user asks.

Verdicts:
  STORE          durable, harmless preference or fact
  NEEDS_CONSENT  sensitive category (health, money, religion...): store only after explicit yes
  SKIP           transient ("right now", "today") - not worth remembering
  REFUSE         secret / ID number / card number: never stored
"""
from __future__ import annotations

import enum
import re
from dataclasses import dataclass


class MemoryVerdict(str, enum.Enum):
    STORE = "store"
    NEEDS_CONSENT = "needs_consent"
    SKIP = "skip"
    REFUSE = "refuse"


@dataclass(frozen=True)
class MemoryDecision:
    verdict: MemoryVerdict
    category: str
    reason: str


_SECRET_PATTERNS = [
    ("private_key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("api_key", re.compile(r"\b(sk|pk|rk)[-_][A-Za-z0-9_\-]{16,}\b|\bAKIA[0-9A-Z]{16}\b|\bghp_[A-Za-z0-9]{20,}\b|\bAIza[0-9A-Za-z_\-]{20,}\b")),
    ("password", re.compile(r"\b(password|passwd|pwd|passcode|pin)\b\s*(is|=|:)\s*\S+", re.I)),
    ("password", re.compile(r"\b(mera|my)\s+(password|pin)\s+(hai|is)\s+\S+", re.I)),
    ("token", re.compile(r"\b(token|secret|api[ _-]?key)\b\s*(is|=|:)\s*\S{8,}", re.I)),
    ("otp", re.compile(r"\b(otp|verification code|one[- ]time (code|password))\b\D{0,15}\d{4,8}\b", re.I)),
]
_AADHAAR = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
_PAN = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
_SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_PASSPORT_CTX = re.compile(r"\b(passport|driving licen[cs]e|aadhaar|aadhar|pan card|ssn|social security)\b[^.\n]{0,25}\b[A-Z0-9]{6,12}\b", re.I)
_CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")
_SENSITIVE = re.compile(r"\b(diagnos\w+|medicat\w+|therap\w+|depress\w+|anxiety|salary|income|debt|loan|religio\w+|caste|sexual|pregnan\w+|disabilit\w+|immigration|visa status|political)\b", re.I)
_TRANSIENT = re.compile(r"\b(right now|today|tonight|this morning|this evening|currently at|at the moment|abhi|aaj raat|is waqt)\b", re.I)


def _luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for ch in reversed(digits):
        d = int(ch)
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        alt = not alt
    return total % 10 == 0


def check_memory_candidate(text: str) -> MemoryDecision:
    for category, pattern in _SECRET_PATTERNS:
        if pattern.search(text):
            return MemoryDecision(MemoryVerdict.REFUSE, category, "Secrets are never stored.")
    for m in _CARD.finditer(text):
        digits = re.sub(r"\D", "", m.group(0))
        if 13 <= len(digits) <= 19 and _luhn_ok(digits):
            return MemoryDecision(MemoryVerdict.REFUSE, "card_number", "Card numbers are never stored.")
    if _AADHAAR.search(text) or _PAN.search(text) or _SSN.search(text) or _PASSPORT_CTX.search(text):
        return MemoryDecision(MemoryVerdict.REFUSE, "id_number", "Government ID numbers are never stored.")
    if _SENSITIVE.search(text):
        return MemoryDecision(MemoryVerdict.NEEDS_CONSENT, "sensitive", "Sensitive topic: ask before storing.")
    if _TRANSIENT.search(text):
        return MemoryDecision(MemoryVerdict.SKIP, "transient", "Short-lived; not worth remembering.")
    return MemoryDecision(MemoryVerdict.STORE, "general", "Durable and harmless.")
