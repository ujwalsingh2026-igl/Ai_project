"""Turns a feedback LOG into training data, but only the rows that are allowed.

A row is used ONLY if ALL are true:
  1. the user opted in            (user_opted_in = true)
  2. a human reviewed it          (human_reviewed = true)
  3. no message contains a secret, ID number, card number (REFUSE) or a sensitive topic needing consent
Everything else is rejected with a reason and counted. Nothing is ever uploaded; this runs on your machine.

Run from datasets/:  python curate_feedback.py [input.jsonl] [output.jsonl]
Default input: data/feedback_log_example.jsonl   Default output: data/curated_sft_example.jsonl
"""
import collections
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
from core.memory_filter import MemoryVerdict, check_memory_candidate  # noqa: E402


def curate(rows):
    kept, rejected = [], collections.Counter()
    for r in rows:
        if not r.get("user_opted_in"):
            rejected["no_opt_in"] += 1
            continue
        if not r.get("human_reviewed"):
            rejected["not_reviewed"] += 1
            continue
        verdicts = [check_memory_candidate(m["content"]).verdict for m in r["messages"]]
        if MemoryVerdict.REFUSE in verdicts:
            rejected["contains_secret_or_id"] += 1
            continue
        if MemoryVerdict.NEEDS_CONSENT in verdicts:
            rejected["sensitive_topic"] += 1
            continue
        kept.append({"messages": r["messages"], "meta": {"id": r["id"], "curated": True}})
    return kept, rejected


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "data" / "feedback_log_example.jsonl"
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "data" / "curated_sft_example.jsonl"
    rows = [json.loads(l) for l in src.read_text(encoding="utf-8").splitlines() if l.strip()]
    kept, rejected = curate(rows)
    with dst.open("w", encoding="utf-8", newline="\n") as f:
        for k in kept:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")
    print(f"input={len(rows)} kept={len(kept)} rejected={sum(rejected.values())} -> {dict(rejected)}")
    print(f"wrote {dst}")
    print("kept ids:", [k["meta"]["id"] for k in kept])


if __name__ == "__main__":
    main()
