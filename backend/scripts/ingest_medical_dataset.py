"""Ingests the opus5-5 doctor-patient disease dataset into a compact, searchable SQLite clinical knowledge base."""
import json
import os
import sqlite3
import sys
import urllib.request
from pathlib import Path

DATASET_URL = "https://huggingface.co/datasets/nisten/opus5-5-doctor-patient-conversations-all-human-diseases/resolve/main/opus5-5diseaseconversations.jsonl"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "medical"
DB_PATH = OUTPUT_DIR / "clinical_kb.db"
JSONL_CACHE_PATH = OUTPUT_DIR / "opus5-5diseaseconversations.jsonl"


def init_db(db_path: Path) -> sqlite3.Connection:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS diseases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        aliases TEXT,
        icd10 TEXT,
        body_systems TEXT,
        description TEXT,
        patient_scenario TEXT,
        differential_diagnosis TEXT,
        related_drugs TEXT,
        drug_interactions TEXT,
        food_interactions TEXT,
        common_mistakes TEXT,
        executive_summary TEXT,
        sample_conversation TEXT
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_disease_name ON diseases(name);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_disease_icd10 ON diseases(icd10);")
    conn.commit()
    return conn


def download_dataset(url: str, dest_path: Path):
    if dest_path.exists() and dest_path.stat().st_size > 1_000_000:
        print(f"[OK] Cached dataset found at {dest_path} ({dest_path.stat().st_size / (1024*1024):.1f} MB)")
        return

    print(f"[*] Downloading dataset from {url}...")
    headers = {"User-Agent": "Aegis-Command-Center/1.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as out_file:
        total = int(resp.headers.get("content-length", 0))
        downloaded = 0
        chunk_size = 1024 * 1024  # 1MB chunks
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                percent = (downloaded / total) * 100
                sys.stdout.write(f"\rDownloaded {downloaded / (1024*1024):.1f} MB / {total / (1024*1024):.1f} MB ({percent:.1f}%)")
            else:
                sys.stdout.write(f"\rDownloaded {downloaded / (1024*1024):.1f} MB")
            sys.stdout.flush()
    print("\n[OK] Download complete.")


def ingest_data(jsonl_path: Path, conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM diseases;")
    count = cur.fetchone()[0]
    if count >= 2000:
        print(f"[OK] Database already populated with {count} diseases.")
        return

    print(f"[*] Parsing {jsonl_path} and inserting into SQLite...")
    inserted = 0
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except Exception:
                continue

            name = row.get("name") or row.get("disease_name") or ""
            if not name:
                continue

            aliases = json.dumps(row.get("aliases", [])) if isinstance(row.get("aliases"), list) else str(row.get("aliases", ""))
            icd10 = str(row.get("icd10", ""))
            body_systems = json.dumps(row.get("body_systems", [])) if isinstance(row.get("body_systems"), list) else str(row.get("body_systems", ""))
            description = str(row.get("description", ""))
            patient_scenario = str(row.get("patient_scenario", ""))
            differential_diagnosis = str(row.get("differential_diagnosis", ""))
            related_drugs = json.dumps(row.get("related_drugs", [])) if isinstance(row.get("related_drugs"), list) else str(row.get("related_drugs", ""))
            drug_interactions = str(row.get("drug_interactions", ""))
            food_interactions = str(row.get("food_interactions", ""))
            common_mistakes = str(row.get("common_mistakes", ""))
            executive_summary = str(row.get("executive_summary", ""))

            # Extract sample conversation dialog snippet
            conv = row.get("conversation", [])
            sample_conv = ""
            if isinstance(conv, list):
                conv_lines = []
                for msg in conv[:6]:
                    role = msg.get("role", "unknown").upper()
                    content = msg.get("content", "")
                    conv_lines.append(f"{role}: {content[:300]}")
                sample_conv = "\n\n".join(conv_lines)
            elif isinstance(conv, str):
                sample_conv = conv[:1500]

            cur.execute("""
            INSERT OR REPLACE INTO diseases (
                name, aliases, icd10, body_systems, description,
                patient_scenario, differential_diagnosis, related_drugs,
                drug_interactions, food_interactions, common_mistakes,
                executive_summary, sample_conversation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                name, aliases, icd10, body_systems, description,
                patient_scenario, differential_diagnosis, related_drugs,
                drug_interactions, food_interactions, common_mistakes,
                executive_summary, sample_conv
            ))
            inserted += 1

    conn.commit()
    print(f"[OK] Successfully ingested {inserted} diseases into {DB_PATH}.")


def main():
    conn = init_db(DB_PATH)
    download_dataset(DATASET_URL, JSONL_CACHE_PATH)
    ingest_data(JSONL_CACHE_PATH, conn)
    conn.close()


if __name__ == "__main__":
    main()
