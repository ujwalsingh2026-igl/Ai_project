"""Unit tests for E-Commerce Sales & Customer Analytics tools."""
import tempfile
import unittest
from pathlib import Path
import sqlite3

from core.builtin_tools.analytics import (
    EcommerceSalesSummaryTool,
    EcommerceCustomerMetricsTool,
    EcommerceOrderLookupTool,
)


class AnalyticsToolsTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_analytics.db"
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("""
        CREATE TABLE orders (
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
        cur.execute("""
        INSERT INTO orders VALUES
        ('ORD-1001', '2023-11-01', 'Completed', 'Mobile App', 'CUST-001', 'Alice Smith', 'Consumer', 'Austin', 'Texas', 'South', 'Digital Wallet', 'On Time', 'Positive', 1000.0, 300.0, 30.0, 5000.0, 1),
        ('ORD-1002', '2023-11-02', 'Completed', 'Website', 'CUST-002', 'Bob Jones', 'Corporate', 'Seattle', 'Washington', 'West', 'Credit Card', 'On Time', 'Neutral', 2000.0, 500.0, 25.0, 8000.0, 0);
        """)
        conn.commit()
        conn.close()

        self.sales_tool = EcommerceSalesSummaryTool(self.db_path)
        self.cust_tool = EcommerceCustomerMetricsTool(self.db_path)
        self.order_tool = EcommerceOrderLookupTool(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_sales_summary_aggregation(self):
        res = self.sales_tool.run({})
        self.assertEqual(res["total_orders"], 2)
        self.assertEqual(res["net_sales"], 3000.0)
        self.assertEqual(res["total_profit"], 800.0)
        self.assertEqual(res["average_margin"], 27.5)
        self.assertIn("Mobile App", res["channels"])
        self.assertIn("Website", res["channels"])

    def test_sales_summary_filtered_by_region(self):
        res = self.sales_tool.run({"region": "South"})
        self.assertEqual(res["total_orders"], 1)
        self.assertEqual(res["net_sales"], 1000.0)

    def test_customer_metrics(self):
        res = self.cust_tool.run({})
        self.assertEqual(res["total_customers"], 2)
        self.assertEqual(res["average_clv"], 6500.0)
        self.assertEqual(res["repeat_customer_rate"], 50.0)
        self.assertIn("Consumer", res["segments"])
        self.assertIn("Corporate", res["segments"])

    def test_order_lookup(self):
        res = self.order_tool.run({"order_id": "ORD-1001"})
        self.assertTrue(res["found"])
        self.assertEqual(res["order"]["customer_name"], "Alice Smith")
        self.assertEqual(res["order"]["net_sales"], 1000.0)

        res_missing = self.order_tool.run({"order_id": "ORD-9999"})
        self.assertFalse(res_missing["found"])


if __name__ == "__main__":
    unittest.main()
