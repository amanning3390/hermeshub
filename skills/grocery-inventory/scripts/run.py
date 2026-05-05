#!/usr/bin/env python3
""" 
run.py - Grocery Inventory Tracker 

CLI entry point for the grocery inventory skill. 
Designed for Hermes Agent integration with zero external dependencies.
""" 

import argparse 
import json
import os
import sys
from datetime import date
from pathlib import Path

# Add project root to sys.path to ensure we can import hermes_grocery
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from hermes_grocery import InventoryManager

def list_inventory(manager: InventoryManager) -> None: 
    """Query the database and display all items in a formatted table.""" 
    rows = manager.get_inventory()

    if not rows: 
        print("\nInventory is empty.") 
        return 

    print(f"\nCurrent Grocery Inventory ({manager.db_path}):") 
    print("-" * 80) 
    print(f"{'Item':<25} | {'Qty':<5} | {'Added':<12} | {'Expires':<12}") 
    print("-" * 80) 
    for item, qty, added, expires in rows: 
        expires_str = expires if expires else "N/A" 
        print(f"{item.title():<25} | {qty:<5} | {added:<12} | {expires_str:<12}") 
    print("-" * 80) 

def main() -> None: 
    parser = argparse.ArgumentParser(description="Grocery Inventory Tracker") 
    subparsers = parser.add_subparsers(dest="command", help="Commands") 

    # Add command
    add_parser = subparsers.add_parser("add", help="Add items to inventory via JSON")
    add_parser.add_argument("data", help="JSON string of items to add")

    # List command 
    subparsers.add_parser("list", help="List current inventory") 

    # Check command
    check_parser = subparsers.add_parser("check", help="Check if items exist in inventory")
    check_parser.add_argument("items", help="JSON list of item names to check")

    # Price command
    price_parser = subparsers.add_parser("price", help="Record price for an item")
    price_parser.add_argument("data", help="JSON object with item, price, and optional store")

    # Cleanup command
    subparsers.add_parser("cleanup", help="Remove expired items")

    # Reset command
    reset_parser = subparsers.add_parser("reset", help="Reset inventory based on fresh photos")
    reset_parser.add_argument("data", help="JSON list of items found in photos")

    args = parser.parse_args() 
    
    manager = InventoryManager()

    if args.command == "add":
        try:
            data = json.loads(args.data)
            if not isinstance(data, list):
                data = [data]
            
            entries = []
            today = date.today().isoformat()
            for entry in data:
                item = entry.get("item")
                qty = entry.get("quantity") or entry.get("count") or 1
                date_added = entry.get("date_added") or today
                expiration = entry.get("expiration")
                if item:
                    entries.append((item.lower(), int(qty), date_added, expiration))
            
            if entries:
                manager.update_items(entries)
                print(json.dumps({"status": "success", "count": len(entries)}))
            else:
                print(json.dumps({"status": "error", "message": "No valid items found in input"}))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
            sys.exit(1)

    elif args.command == "list": 
        list_inventory(manager) 

    elif args.command == "check":
        try:
            items = json.loads(args.items)
            results = manager.check_items(items)
            # Format results for the agent
            output = []
            found_items = {row[0]: {"quantity": row[1], "expiration": row[2]} for row in results}
            for item in items:
                info = found_items.get(item.lower())
                if info:
                    output.append({"item": item, "status": "in_stock", "quantity": info["quantity"], "expiration": info["expiration"]})
                else:
                    output.append({"item": item, "status": "not_in_stock"})
            print(json.dumps(output))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
            sys.exit(1)

    elif args.command == "price":
        try:
            data = json.loads(args.data)
            item = data.get("item")
            price = data.get("price")
            store = data.get("store")
            if item and price:
                manager.record_price(item, price, store)
                print(json.dumps({"status": "success", "item": item, "price": price}))
            else:
                print(json.dumps({"status": "error", "message": "Missing item or price"}))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
            sys.exit(1)

    elif args.command == "cleanup":
        try:
            count = manager.cleanup_expired()
            print(json.dumps({"status": "success", "removed_count": count}))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
            sys.exit(1)

    elif args.command == "reset":
        try:
            data = json.loads(args.data)
            if not isinstance(data, list):
                data = [data]
            
            entries = []
            today = date.today().isoformat()
            for entry in data:
                item = entry.get("item")
                qty = entry.get("quantity") or entry.get("count") or 1
                date_added = entry.get("date_added") or today
                expiration = entry.get("expiration")
                if item:
                    entries.append((item.lower(), int(qty), date_added, expiration))
            
            manager.reset_inventory(entries)
            print(json.dumps({"status": "success", "new_count": len(entries)}))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
            sys.exit(1)

    else: 
        parser.print_help() 

if __name__ == "__main__": 
    main()