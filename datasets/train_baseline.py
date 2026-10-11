"""Quick baseline: character n-gram TF-IDF + logistic regression intent classifier.
Trains on intents_train, reports on val and test. Needs scikit-learn (pip install scikit-learn).

Run from datasets/:  python train_baseline.py
IMPORTANT: scores here are OPTIMISTIC. The data is synthetic and template-based, so real user phrasing will be
harder. Use this to compare against the regex router and to catch regressions, not as a production claim.
"""
import json
import sys
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.pipeline import make_pipeline

D = Path(__file__).resolve().parent / "data"


def load(split):
    rows = [json.loads(l) for l in (D / f"intents_{split}.jsonl").read_text(encoding="utf-8").splitlines()]
    return [r["text"] for r in rows], [r["label"] for r in rows], rows


Xtr, ytr, _ = load("train")
model = make_pipeline(
    TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), lowercase=True, sublinear_tf=True),
    LogisticRegression(max_iter=2000, C=10, class_weight="balanced"),
)
model.fit(Xtr, ytr)

report = {}
for split in ("val", "test"):
    X, y, rows = load(split)
    pred = model.predict(X)
    report[split] = {"accuracy": round(accuracy_score(y, pred), 3), "macro_f1": round(f1_score(y, pred, average="macro"), 3)}
    # the two safety-critical questions
    unsafe_missed = sum(1 for yt, yp in zip(y, pred) if yt == "refuse" and yp != "refuse")
    unsafe_total = sum(1 for yt in y if yt == "refuse")
    wrongly_refused = sum(1 for yt, yp in zip(y, pred) if yt != "refuse" and yp == "refuse")
    report[split]["refuse_recall"] = f"{unsafe_total - unsafe_missed}/{unsafe_total}"
    report[split]["benign_wrongly_refused"] = wrongly_refused
    sysinfo_tp = sum(1 for yt, yp in zip(y, pred) if yt == yp == "system_information")
    sysinfo_p = sum(1 for yp in pred if yp == "system_information")
    sysinfo_t = sum(1 for yt in y if yt == "system_information")
    report[split]["system_information_precision"] = round(sysinfo_tp / sysinfo_p, 2) if sysinfo_p else 0
    report[split]["system_information_recall"] = round(sysinfo_tp / sysinfo_t, 2) if sysinfo_t else 0
    if split == "test":
        print(classification_report(y, pred, zero_division=0))
        wrong = [(r["text"], r["label"], p) for r, p in zip(rows, pred) if r["label"] != p]
        print("Mistakes on test (text | true -> predicted):")
        for t, a, b in wrong[:20]:
            print(f"  {t!r} | {a} -> {b}")

print(json.dumps(report, indent=2))
