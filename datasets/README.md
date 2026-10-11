# datasets/: how to use

Put this folder at `C:\ai-assistant\datasets` (next to `backend`). Open PowerShell:

```powershell
cd C:\ai-assistant\backend
.\.venv\Scripts\Activate.ps1
cd ..\datasets

python build_seed_dataset.py      # (re)generate data/*.jsonl  (no extra libraries needed)
python validate_dataset.py        # consistency checks -> "OK: dataset is consistent"
python build_v2_dataset.py        # (re)generate the v2 files (Q&A, change requests, memory, grounding, feedback)
python eval_router.py             # how good is the CURRENT regex router?  (uses backend/core)
python curate_feedback.py         # consent-gated curation demo on data/feedback_log_example.jsonl

pip install scikit-learn          # only for the next line
python train_baseline.py          # quick ML baseline on intents_train, reports val/test

pip install datasets              # OPTIONAL, needs internet, NOT TESTED
python download_public.py         # downloads MASSIVE / deepset / xLAM into data/public/ (read licences first)
```

Read in this order: `LEARNING_DESIGN.md` (how it learns safely) -> `DATASET_CARD.md` (what and why) -> `SOURCES.md` (public data, verified vs not) -> `eval/BASELINES.md` (measured numbers).

What was actually run when this was built: `build_seed_dataset.py`, `validate_dataset.py`, `eval_router.py`, `train_baseline.py`.
What was NOT run: `download_public.py` (no network in the build sandbox).

Backend tests that use these files (run from `C:\ai-assistant\backend`): `python -m unittest discover -s tests -t . -v`
(`test_change_policy.py`, `test_memory_filter.py` read `datasets/data/*.jsonl` and are skipped if the folder is missing).
