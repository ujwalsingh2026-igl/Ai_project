"""Sanity checks for the seed dataset. Run: python validate_dataset.py  (exit code 1 if anything is wrong)."""
import collections
import json
import sys
from pathlib import Path

D = Path(__file__).resolve().parent / "data"
errors = []


def load(name):
    return [json.loads(l) for l in (D / name).read_text(encoding="utf-8").splitlines() if l.strip()]


splits = {s: load(f"intents_{s}.jsonl") for s in ("train", "val", "test")}
required = {"id", "group", "text", "variant", "lang", "label", "args", "status", "source"}
labels = set()
for s, rows in splits.items():
    for r in rows:
        if not required <= set(r):
            errors.append(f"{s}:{r.get('id')} missing fields")
        if not r["text"].strip():
            errors.append(f"{s}:{r['id']} empty text")
        labels.add(r["label"])

# 1) no group may appear in two splits (prevents paraphrase leakage)
group_split = collections.defaultdict(set)
for s, rows in splits.items():
    for r in rows:
        group_split[r["group"]].add(s)
leaks = [g for g, ss in group_split.items() if len(ss) > 1]
if leaks:
    errors.append(f"group leakage across splits: {leaks[:5]}")

# 2) identical text must not carry different labels, and must not sit in different splits
text_info = collections.defaultdict(set)
for s, rows in splits.items():
    for r in rows:
        text_info[r["text"].lower()].add((r["label"], s))
for t, info in text_info.items():
    if len({l for l, _ in info}) > 1:
        errors.append(f"conflicting labels for text {t!r}: {sorted(info)}")
    if len({s for _, s in info}) > 1:
        errors.append(f"same text in several splits: {t!r}")

# 3) every label present in every split
for s, rows in splits.items():
    missing = labels - {r["label"] for r in rows}
    if missing:
        errors.append(f"{s} lacks labels: {sorted(missing)}")

# 4) other files parse + SFT targets are valid JSON
for name in ("permission_cases", "approval_scenarios", "injection_cases", "voice_commands", "security_events"):
    if not load(f"{name}.jsonl"):
        errors.append(f"{name} is empty")
for row in load("sft_tool_routing_train.jsonl"):
    try:
        t = json.loads(row["messages"][2]["content"])
        assert t["action"] in ("tool", "chat", "refuse")
    except Exception:
        errors.append(f"bad SFT target {row['meta']['id']}")

# 5) harmless-data guard: events/injection use only reserved IP ranges and .invalid/.test/.example domains
import re
bad_ip = re.compile(r"\b(?!203\.0\.113\.|198\.51\.100\.|192\.0\.2\.|192\.168\.|10\.|127\.)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b")
for name in ("security_events", "injection_cases", "intents_train", "intents_val", "intents_test"):
    blob = (D / f"{name}.jsonl").read_text(encoding="utf-8")
    m = bad_ip.search(blob)
    if m:
        errors.append(f"non-reserved IP in {name}: {m.group(0)}")

# ---- v2 files -------------------------------------------------------------------------------------------
V2_REQUIRED = {
    "cyber_qa": {"id", "topic", "lang", "level", "question", "answer", "reference", "source"},
    "ai_ml_qa": {"id", "topic", "lang", "level", "question", "answer", "reference", "source"},
    "change_requests": {"id", "text", "lang", "structured", "expected_decision", "reason", "source"},
    "memory_decisions": {"id", "text", "expected_verdict", "category", "filter_currently_misses", "source"},
    "search_grounding": {"id", "query", "documents", "answer_parts", "traps", "source"},
    "feedback_events": {"id", "signal", "expected_action", "eligible_for_finetune", "reason", "source"},
    "feedback_log_example": {"id", "user_opted_in", "human_reviewed", "messages", "source"},
}
for name, req in V2_REQUIRED.items():
    try:
        rows = load(f"{name}.jsonl")
    except FileNotFoundError:
        errors.append(f"{name}.jsonl missing (run build_v2_dataset.py)")
        continue
    ids = [r.get("id") for r in rows]
    if len(ids) != len(set(ids)):
        errors.append(f"{name}: duplicate ids")
    for r in rows:
        if not req <= set(r):
            errors.append(f"{name}:{r.get('id')} missing {sorted(req - set(r))}")
    if name in ("cyber_qa", "ai_ml_qa"):
        langs = {r["lang"] for r in rows}
        if langs != {"en", "hinglish"}:
            errors.append(f"{name}: expected both en and hinglish, got {langs}")
        if any(len(r["answer"]) < 40 for r in rows):
            errors.append(f"{name}: suspiciously short answer")
        qs = [r["question"].lower() for r in rows if r["lang"] == "en"]
        if len(qs) != len(set(qs)):
            errors.append(f"{name}: duplicate english questions")
    if name == "search_grounding":
        for r in rows:
            doc_ids = {d["id"] for d in r["documents"]}
            for part in r["answer_parts"]:
                if part["type"] not in ("FACT", "INFERENCE", "UNCERTAINTY"):
                    errors.append(f"{r['id']}: bad answer type {part['type']}")
                if not set(part["sources"]) <= doc_ids:
                    errors.append(f"{r['id']}: cites unknown document")
                if part["type"] == "FACT" and not part["sources"]:
                    errors.append(f"{r['id']}: FACT without a source")
    if name == "change_requests":
        decisions = {r["expected_decision"] for r in rows}
        if decisions != {"allow", "ask", "propose_only", "block"}:
            errors.append(f"change_requests should cover all four decisions, got {decisions}")
    if name == "memory_decisions":
        verdicts = {r["expected_verdict"] for r in rows}
        if verdicts != {"store", "needs_consent", "skip", "refuse"}:
            errors.append(f"memory_decisions should cover all four verdicts, got {verdicts}")
    print(f"v2 {name}: {len(rows)} rows")

counts = {s: collections.Counter(r["label"] for r in rows) for s, rows in splits.items()}
print("rows:", {s: len(r) for s, r in splits.items()}, "| labels:", len(labels))
print("lang:", dict(collections.Counter(r["lang"] for rows in splits.values() for r in rows)))
print("smallest label counts (train):", sorted(counts["train"].items(), key=lambda x: x[1])[:3])
if errors:
    print("FAILED:")
    [print(" -", e) for e in errors]
    sys.exit(1)
print("OK: dataset is consistent")
