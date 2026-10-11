"""Scores the project's CURRENT regex intent router on the dataset.

The router only knows one tool today (system_information), so we score the binary question
"did it select system_information?" Everything else (chat, refuse, planned tools) must NOT select it.
Run from datasets/:  python eval_router.py [--show 15]
"""
import argparse
import collections
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))

from core.builtin_tools.system_information import SystemInformationTool  # noqa: E402
from core.intent import RuleBasedIntentRouter  # noqa: E402
from core.tools import ToolRegistry  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--show", type=int, default=15, help="how many mistakes to print per type")
    ap.add_argument("--splits", nargs="+", default=["train", "val", "test"])
    a = ap.parse_args()

    registry = ToolRegistry()
    registry.register(SystemInformationTool())
    router = RuleBasedIntentRouter(registry)

    rows = [json.loads(l) for s in a.splits for l in (HERE / "data" / f"intents_{s}.jsonl").read_text(encoding="utf-8").splitlines()]
    tp = fp = fn = tn = 0
    by = collections.defaultdict(lambda: [0, 0, 0, 0])  # tp fp fn tn per lang
    fps, fns = [], []
    for r in rows:
        want = r["label"] == "system_information"
        got = router.route(r["text"]).tool_name == "system_information"
        i = (0 if want and got else 1 if got and not want else 2 if want and not got else 3)
        by[r["lang"]][i] += 1
        if i == 0: tp += 1
        elif i == 1: fp += 1; fps.append(r)
        elif i == 2: fn += 1; fns.append(r)
        else: tn += 1
    prec = tp / (tp + fp) if tp + fp else 0
    rec = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
    print(f"rows={len(rows)}  TP={tp} FP={fp} FN={fn} TN={tn}")
    print(f"precision={prec:.2f}  recall={rec:.2f}  F1={f1:.2f}  accuracy={(tp+tn)/len(rows):.2f}")
    for lang, (t, f_, n, tn_) in sorted(by.items()):
        print(f"  [{lang}] recall={t/(t+n) if t+n else 0:.2f}  false-positives={f_}")
    print(f"\nFALSE POSITIVES (router ran the tool but should not have) - first {a.show}:")
    for r in fps[:a.show]:
        print(f"  [{r['label']}] {r['text']}")
    print(f"\nFALSE NEGATIVES (router missed a real system question) - first {a.show}:")
    for r in fns[:a.show]:
        print(f"  [{r['lang']}] {r['text']}")


if __name__ == "__main__":
    main()
