import os
import sys
import tempfile
import json
from pathlib import Path
import sqlite3
import pytest

# Ensure the project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from hermes_grocery import InventoryManager

# ----------------------------------------------------------------------
# Core Logic Tests
# ----------------------------------------------------------------------


def test_inventory_manager_init_and_update(monkeypatch):
    with tempfile.NamedTemporaryFile(suffix=".db") as tmp_db:
        db_path = Path(tmp_db.name)
        manager = InventoryManager(db_path=db_path)
        
        manager.update_items([("milk", 2, "2025-01-01", None)])
        
        rows = manager.get_inventory()
        assert len(rows) == 1
        assert rows[0][0] == "milk"
        assert rows[0][1] == 2

# ----------------------------------------------------------------------
# CLI Script Tests
# ----------------------------------------------------------------------
from scripts.run import main

def test_cli_list_empty(monkeypatch, capsys):
    with tempfile.NamedTemporaryFile(suffix=".db") as tmp_db:
        db_path = Path(tmp_db.name)
        # Patch the default DB_PATH in InventoryManager
        monkeypatch.setattr('hermes_grocery.core.InventoryManager.__init__', 
                           lambda self, db_path=db_path: setattr(self, 'db_path', db_path))
        
        sys.argv = ["run.py", "list"]
        main()
        
        captured = capsys.readouterr()
        assert "Inventory is empty" in captured.out


def test_cli_add_json(monkeypatch, capsys):
    with tempfile.NamedTemporaryFile(suffix=".db") as tmp_db:
        db_path = Path(tmp_db.name)
        monkeypatch.setattr('hermes_grocery.core.InventoryManager.__init__', 
                           lambda self, db_path=db_path: setattr(self, 'db_path', db_path))
        
        data = json.dumps([{"item": "banana", "quantity": 5, "expiration": "2026-01-01"}])
        sys.argv = ["run.py", "add", data]
        main()
        
        captured = capsys.readouterr()
        assert "success" in captured.out
        
        # Verify in DB
        manager = InventoryManager(db_path=db_path)
        rows = manager.get_inventory()
        assert rows[0][0] == "banana"
        assert rows[0][1] == 5