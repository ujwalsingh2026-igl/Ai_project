"""Ingests the Kaggle e-commerce sales and customer analytics dataset into SQLite for real-time querying by Aegis."""
import csv
import os
import sqlite3
from pathlib import Path

KAGGLE_CACHE_DIR = Path(os.environ.get("USERPROFILE", "")) / ".cache" / "kagglehub" / "datasets" / "datascikhan" / "e-commerce-sales-and-customer-analytics" / "versions" / "1"
CSV_FILE = KAGGLE_CACHE_DIR / "ecommerce_sales_customer_analytics_150k.csv"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "analytics"
DB_PATH = OUTPUT_DIR / "ecommerce_analytics.db"


def init_db(db_path: Path) -> sqlite3.Connection:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY,
        order_date TEXT,
        order_status TEXT,
        sales_channel TEXT,
        customer_id TEXT,
        customer_name TEXT,
        customer_segment TEXT,
        customer_city TEXT,
        customer_state TEXT,
        region TEXT,
        payment_method TEXT,
        delivery_status TEXT,
        review_sentiment TEXT,
        net_sales REAL,
        profit REAL,
        profit_margin REAL,
        customer_clv REAL,
        is_repeat INTEGER
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_order_date ON orders(order_date);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_order_region ON orders(region);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_order_segment ON orders(customer_segment);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_order_channel ON orders(sales_channel);")
    conn.commit()
    return conn


def ingest(csv_path: Path, conn: sqlite3.Connection, max_rows: int = 25000):
    if not csv_path.exists():
        print(f"[!] CSV not found at {csv_path}")
        return

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM orders;")
    existing = cur.fetchone()[0]
    if existing >= 10000:
        print(f"[OK] Orders table already contains {existing} records.")
        return

    print(f"[*] Ingesting {max_rows} records from {csv_path.name} into {DB_PATH.name}...")
    inserted = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch = []
        for i, row in enumerate(reader):
            if i >= max_rows:
                break
            batch.append((
                row.get("order_id", ""),
                row.get("order_date", ""),
                row.get("order_status", ""),
                row.get("sales_channel", ""),
                row.get("customer_id", ""),
                row.get("customer_name", ""),
                row.get("customer_segment", ""),
                row.get("customer_city", ""),
                row.get("customer_state", ""),
                row.get("region", ""),
                row.get("payment_method", ""),
                row.get("delivery_status", ""),
                row.get("review_sentiment", ""),
                float(row.get("net_sales", 0.0) or 0.0),
                float(row.get("profit", 0.0) or 0.0),
                float(row.get("profit_margin_percentage", 0.0) or 0.0),
                float(row.get("customer_lifetime_value", 0.0) or 0.0),
                1 if row.get("is_repeat_customer", "").lower() == "true" else 0,
            ))
            if len(batch) >= 2000:
                cur.executemany("""
                INSERT OR REPLACE INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
                """, batch)
                inserted += len(batch)
                batch = []

        if batch:
            cur.executemany("""
            INSERT OR REPLACE INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
            """, batch)
            inserted += len(batch)

    conn.commit()
    print(f"[OK] Successfully indexed {inserted} e-commerce records into {DB_PATH}.")


def main():
    conn = init_db(DB_PATH)
    ingest(CSV_FILE, conn, max_rows=25000)
    conn.close()


if __name__ == "__main__":
    main()
