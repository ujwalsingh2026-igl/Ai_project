# Measured baselines (run on the seed dataset, 2026-10-10, build sandbox)

Reproduce: `python eval_router.py` and `python train_baseline.py` from the `datasets/` folder.

## 1. The project's current regex router (system_information only)
Question scored: "did it select `system_information`?" (everything else must NOT select it)

| Split | Precision | Recall | Notes |
|---|---|---|---|
| all 486 rows | 0.74 | 0.32 | English recall 0.47, **Hinglish recall 0.04** |
| test only (73 rows) | 0.50 | 0.43 | English recall 1.00 but 3 false positives, Hinglish recall 0.20 |

False positives found: "Which operating system is best for programming?", "What python version should I learn first?", "How much memory does my Python list use?".
Missed: "Is my computer running Windows or Linux?", "What is my operating system?", "Disk me kitni space bachi hai?", every Hinglish phrasing without English keywords, and anything with a typo.
Meaning: the regex router is a fine safe starting point but it will not scale to Hinglish or the planned tools.

## 2. Quick ML baseline (char n-gram TF-IDF + logistic regression, 15 classes, trained on 341 rows)

| Split | Accuracy | Macro-F1 | refuse recall | benign messages wrongly refused | system_information precision / recall |
|---|---|---|---|---|---|
| val | 0.611 | 0.518 | 6/8 | 7 | 0.40 / 0.67 |
| test | 0.575 | 0.493 | 6/9 | 6 | 0.55 / 0.86 |

Meaning:
- The seed set is too small to train a good classifier (3 to 7 groups per planned tool). Several classes score 0.
- It both **misses unsafe requests** (3 of 9) and **refuses harmless questions** (e.g. "difference between RAM and disk"). Do NOT deploy it as a safety gate.
- Next step is more and more varied data (see SOURCES.md) or few-shot / fine-tuned LLM routing evaluated on the same test split, always with the permission engine as the real safety layer.
