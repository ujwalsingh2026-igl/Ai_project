"""OPTIONAL helper: downloads a few public datasets into data/public/ (needs internet + `pip install datasets`).

STATUS: NOT TESTED (the build sandbox had no network). If it fails, read the message; some Hugging Face datasets
changed how they are stored, and the alternative is to download the files by hand from the URLs in SOURCES.md.
Always read each dataset's licence page BEFORE using it (SOURCES.md lists what was verified and what was not).
"""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent / "data" / "public"
OUT.mkdir(parents=True, exist_ok=True)

try:
    from datasets import load_dataset
except ImportError:
    sys.exit("Run: pip install datasets")


def dump(name, rows):
    path = OUT / f"{name}.jsonl"
    with path.open("w", encoding="utf-8", newline="\n") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"wrote {path} ({path.stat().st_size // 1024} KB)")


def try_get(name, *args, **kw):
    try:
        return load_dataset(*args, **kw)
    except Exception as exc:   # noqa: BLE001 - we want a readable message, not a stack trace
        print(f"SKIPPED {name}: {type(exc).__name__}: {str(exc)[:200]}")
        return None


# 1) MASSIVE (intent classification). Use only the TRAIN split for training; keep val/test for evaluation.
lang = sys.argv[1] if len(sys.argv) > 1 else "en-US"
ds = try_get("massive", "AmazonScience/massive", lang, split="train")
if ds is not None:
    dump(f"massive_{lang}_train", ({"text": r["utt"], "intent": ds.features["intent"].int2str(r["intent"]), "scenario": r["scenario"]} for r in ds))

# 2) deepset prompt-injections (label 1 = injection)
ds = try_get("deepset", "deepset/prompt-injections")
if ds is not None:
    for split in ds:
        dump(f"deepset_prompt_injections_{split}", ({"text": r["text"], "label": r["label"]} for r in ds[split]))

# 3) xLAM function-calling 60k: GATED (log in to Hugging Face and accept the terms first: `huggingface-cli login`)
ds = try_get("xlam", "Salesforce/xlam-function-calling-60k", split="train")
if ds is not None:
    dump("xlam_function_calling_60k", ({"query": r["query"], "tools": r["tools"], "answers": r["answers"]} for r in ds))
