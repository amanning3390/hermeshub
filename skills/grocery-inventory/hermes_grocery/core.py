import sqlite3 
import os 
from datetime import datetime, date 
from pathlib import Path 
import json

class InventoryManager:
    """Handles the SQLite database for grocery inventory."""
    
    def __init__(self, db_path=None):
        if db_path:
            self.db_path = Path(db_path)
        else:
            self.db_path = Path(os.getenv("HOME")) / ".hermes" / "data" / "grocery_inventory.db"
            
    def init_db(self):
        """Initialize the database and create tables if they don't exist."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # Inventory table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item TEXT NOT NULL UNIQUE,
                quantity INTEGER NOT NULL DEFAULT 0,
                date_added TEXT NOT NULL,
                expiration TEXT
            )
        """)
        # Price history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item TEXT NOT NULL,
                price REAL NOT NULL,
                store TEXT,
                date_recorded TEXT NOT NULL
            )
        """)
        conn.commit()
        return conn

    def update_items(self, items_with_dates):
        """
        Update the database with the new items and dates using UPSERT logic.
        items_with_dates: list of tuples (item, qty, date_added, expiration)
        """
        conn = self.init_db()
        cursor = conn.cursor()
        for item, qty, date_added, expiration in items_with_dates:
            cursor.execute("""
                INSERT INTO inventory (item, quantity, date_added, expiration)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(item) DO UPDATE SET
                    quantity = inventory.quantity + excluded.quantity,
                    date_added = excluded.date_added,
                    expiration = excluded.expiration
            """, (item, qty, date_added, expiration))
        conn.commit()
        conn.close()

    def get_inventory(self):
        """Returns all items in the inventory."""
        conn = self.init_db()
        cursor = conn.cursor()
        cursor.execute("SELECT item, quantity, date_added, expiration FROM inventory WHERE quantity > 0 ORDER BY item ASC")
        rows = cursor.fetchall()
        conn.close()
        return rows

    def check_items(self, item_names):
        """Check if a list of items exists in the inventory."""
        conn = self.init_db()
        cursor = conn.cursor()
        # Handle empty list
        if not item_names:
            return []
        placeholders = ','.join(['?'] * len(item_names))
        cursor.execute(f"SELECT item, quantity, expiration FROM inventory WHERE item IN ({placeholders})", [i.lower() for i in item_names])
        rows = cursor.fetchall()
        conn.close()
        return rows

    def record_price(self, item, price, store=None):
        """Record the price of an item."""
        conn = self.init_db()
        cursor = conn.cursor()
        today = date.today().isoformat()
        cursor.execute("""
            INSERT INTO price_history (item, price, store, date_recorded)
            VALUES (?, ?, ?, ?)
        """, (item.lower(), float(price), store, today))
        conn.commit()
        conn.close()

    def cleanup_expired(self):
        """Remove items that have expired."""
        conn = self.init_db()
        cursor = conn.cursor()
        today = date.today().isoformat()
        cursor.execute("DELETE FROM inventory WHERE expiration IS NOT NULL AND expiration < ?", (today,))
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        return deleted_count

    def reset_inventory(self, items_with_dates):
        """
        Reset inventory based on a new set of items. 
        Items not in the new set will have their quantity set to 0.
        """
        conn = self.init_db()
        cursor = conn.cursor()
        
        # 1. Set all existing quantities to 0
        cursor.execute("UPDATE inventory SET quantity = 0")
        
        # 2. Update with new items
        today = date.today().isoformat()
        for item, qty, date_added, expiration in items_with_dates:
            cursor.execute("""
                INSERT INTO inventory (item, quantity, date_added, expiration)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(item) DO UPDATE SET
                    quantity = excluded.quantity,
                    date_added = excluded.date_added,
                    expiration = excluded.expiration
            """, (item, qty, date_added or today, expiration))
            
        conn.commit()
        conn.close()
