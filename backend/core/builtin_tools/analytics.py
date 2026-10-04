"""E-Commerce Sales & Customer Analytics Tools for Aegis.

Powered by:
- datascikhan/e-commerce-sales-and-customer-analytics (150k transaction records, CLV, profitability, segments)
"""
from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import Any

from core.permissions import RiskLevel
from core.tools import ToolSpec

logger = logging.getLogger("core.builtin_tools.analytics")

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "analytics" / "ecommerce_analytics.db"


class EcommerceSalesSummaryTool:
    """Aggregates sales performance, revenue, profit, and channel metrics."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="ecommerce_sales_summary",
            description="Analyze e-commerce revenue, gross profit, average profit margin, and channel performance.",
            risk_level=RiskLevel.SAFE,
            required_permission="analytics.sales",
            input_schema={
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Optional geographical region filter (e.g. 'South', 'West', 'East', 'Midwest')",
                    },
                    "sales_channel": {
                        "type": "string",
                        "description": "Optional sales channel filter (e.g. 'Mobile App', 'Website', 'Direct', 'In-Store')",
                    },
                },
            },
            output_schema={
                "type": "object",
                "properties": {
                    "total_orders": {"type": "integer"},
                    "net_sales": {"type": "number"},
                    "total_profit": {"type": "number"},
                    "average_margin": {"type": "number"},
                    "channels": {"type": "object"},
                },
                "required": ["total_orders", "net_sales", "total_profit"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^sales\s+(summary|analytics|performance|metrics)",
                r"^revenue\s+(summary|report|metrics)",
                r"^(show|check)\s+sales\s+performance",
                r"^profit\s+margins?",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        lower = message.lower()
        args = {}
        for r in ["south", "west", "east", "midwest", "north"]:
            if r in lower:
                args["region"] = r.title()
                break
        for ch in ["mobile app", "website", "direct", "in-store"]:
            if ch in lower:
                args["sales_channel"] = ch.title()
                break
        return args

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        if not self._db_path.exists():
            return {
                "total_orders": 0,
                "net_sales": 0.0,
                "total_profit": 0.0,
                "average_margin": 0.0,
                "channels": {},
                "message": "E-commerce database not initialized. Run backend/scripts/ingest_ecommerce_dataset.py",
            }

        conn = sqlite3.connect(self._db_path)
        cur = conn.cursor()

        query = "SELECT COUNT(*), SUM(net_sales), SUM(profit), AVG(profit_margin) FROM orders WHERE 1=1"
        params: list[Any] = []
        if args.get("region"):
            query += " AND LOWER(region) = LOWER(?)"
            params.append(args["region"])
        if args.get("sales_channel"):
            query += " AND LOWER(sales_channel) = LOWER(?)"
            params.append(args["sales_channel"])

        cur.execute(query, params)
        total_orders, net_sales, profit, avg_margin = cur.fetchone()
        total_orders = total_orders or 0
        net_sales = round(net_sales or 0.0, 2)
        profit = round(profit or 0.0, 2)
        avg_margin = round(avg_margin or 0.0, 1)

        # Sales channel breakdown
        ch_query = "SELECT sales_channel, COUNT(*), SUM(net_sales) FROM orders WHERE 1=1"
        ch_params: list[Any] = []
        if args.get("region"):
            ch_query += " AND LOWER(region) = LOWER(?)"
            ch_params.append(args["region"])
        ch_query += " GROUP BY sales_channel ORDER BY SUM(net_sales) DESC;"

        cur.execute(ch_query, ch_params)
        channels = {row[0]: {"orders": row[1], "sales": round(row[2], 2)} for row in cur.fetchall()}
        conn.close()

        return {
            "total_orders": total_orders,
            "net_sales": net_sales,
            "total_profit": profit,
            "average_margin": avg_margin,
            "channels": channels,
            "region_filter": args.get("region", "All Regions"),
            "channel_filter": args.get("sales_channel", "All Channels"),
        }


class EcommerceCustomerMetricsTool:
    """Analyzes customer segmentation, Lifetime Value (CLV), and review sentiment."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="ecommerce_customer_metrics",
            description="Analyze customer segments, average Customer Lifetime Value (CLV), repeat rates, and customer sentiment.",
            risk_level=RiskLevel.SAFE,
            required_permission="analytics.customers",
            input_schema={
                "type": "object",
                "properties": {
                    "segment": {
                        "type": "string",
                        "description": "Optional customer segment filter (e.g. 'Consumer', 'Corporate', 'Home Office')",
                    },
                },
            },
            output_schema={
                "type": "object",
                "properties": {
                    "total_customers": {"type": "integer"},
                    "average_clv": {"type": "number"},
                    "repeat_customer_rate": {"type": "number"},
                    "segments": {"type": "object"},
                    "sentiment_distribution": {"type": "object"},
                },
                "required": ["total_customers", "average_clv", "repeat_customer_rate"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^customer\s+(analytics|metrics|segments|clv|lifetime value)",
                r"^repeat\s+customers?",
                r"^sentiment\s+analysis",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        lower = message.lower()
        for seg in ["consumer", "corporate", "home office"]:
            if seg in lower:
                return {"segment": seg.title()}
        return {}

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        if not self._db_path.exists():
            return {
                "total_customers": 0,
                "average_clv": 0.0,
                "repeat_customer_rate": 0.0,
                "segments": {},
                "sentiment_distribution": {},
                "message": "E-commerce database not initialized.",
            }

        conn = sqlite3.connect(self._db_path)
        cur = conn.cursor()

        query = "SELECT COUNT(DISTINCT customer_id), AVG(customer_clv), AVG(is_repeat) FROM orders WHERE 1=1"
        params: list[Any] = []
        if args.get("segment"):
            query += " AND LOWER(customer_segment) = LOWER(?)"
            params.append(args["segment"])

        cur.execute(query, params)
        total_cust, avg_clv, repeat_rate = cur.fetchone()
        total_cust = total_cust or 0
        avg_clv = round(avg_clv or 0.0, 2)
        repeat_rate = round((repeat_rate or 0.0) * 100, 1)

        # Segments breakdown
        cur.execute("SELECT customer_segment, COUNT(DISTINCT customer_id), AVG(customer_clv) FROM orders GROUP BY customer_segment;")
        segments = {r[0]: {"unique_customers": r[1], "avg_clv": round(r[2], 2)} for r in cur.fetchall()}

        # Sentiment breakdown
        cur.execute("SELECT review_sentiment, COUNT(*) FROM orders WHERE review_sentiment != '' GROUP BY review_sentiment;")
        sentiment = {r[0]: r[1] for r in cur.fetchall()}

        conn.close()

        return {
            "total_customers": total_cust,
            "average_clv": avg_clv,
            "repeat_customer_rate": repeat_rate,
            "segments": segments,
            "sentiment_distribution": sentiment,
            "segment_filter": args.get("segment", "All Segments"),
        }


class EcommerceOrderLookupTool:
    """Looks up specific orders or customer transactions by ID."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self._db_path = Path(db_path)
        self.spec = ToolSpec(
            name="ecommerce_order_lookup",
            description="Lookup order details, payment status, delivery status, and profit metrics by order ID (e.g. 'ORD-301242').",
            risk_level=RiskLevel.SAFE,
            required_permission="analytics.orders",
            input_schema={
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "Order ID to look up (e.g. 'ORD-301242')",
                    },
                },
                "required": ["order_id"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "found": {"type": "boolean"},
                    "order": {"type": "object"},
                },
                "required": ["found"],
            },
            allowed_operations=["read"],
            triggers=[
                r"^order\s+(lookup|status|details)\s+(?P<order_id>ORD-[\w\-]+)",
                r"^lookup\s+order\s+(?P<order_id>ORD-[\w\-]+)",
            ],
        )

    def infer_args(self, message: str) -> dict[str, Any]:
        import re
        for p in self.spec.triggers:
            m = re.search(p, message, re.IGNORECASE)
            if m and "order_id" in m.groupdict():
                return {"order_id": m.group("order_id").upper().strip()}
        m = re.search(r"ORD-[\w\-]+", message, re.IGNORECASE)
        if m:
            return {"order_id": m.group(0).upper().strip()}
        return {"order_id": message.strip()}

    def run(self, args: dict[str, Any], context: Any = None) -> dict[str, Any]:
        order_id = args.get("order_id", "").strip().upper()

        if not self._db_path.exists():
            return {"found": False, "message": "Database not found"}

        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute("SELECT * FROM orders WHERE UPPER(order_id) = ? LIMIT 1;", (order_id,))
        row = cur.fetchone()
        conn.close()

        if not row:
            return {"found": False, "order_id": order_id, "message": f"Order '{order_id}' not found."}

        return {
            "found": True,
            "order": {
                "order_id": row["order_id"],
                "order_date": row["order_date"],
                "customer_name": row["customer_name"],
                "customer_segment": row["customer_segment"],
                "region": row["region"],
                "payment_method": row["payment_method"],
                "delivery_status": row["delivery_status"],
                "net_sales": row["net_sales"],
                "profit": row["profit"],
                "profit_margin": row["profit_margin"],
                "review_sentiment": row["review_sentiment"],
            },
        }
