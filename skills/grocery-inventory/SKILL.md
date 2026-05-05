---
name: grocery-inventory
description: "Track grocery items, quantities, and expirations using SQLite. Requires vision capabilities from the Agent."
version: 1.2.0
author: dkoh
license: MIT
metadata:
  hermes:
    tags: [Grocery, Inventory, Vision, SQLite, Home-Automation, Price-Tracking]
    related_skills: [note-taking, productivity]
---

# Grocery Inventory Tracker

This skill manages a grocery inventory database. It relies on the Hermes Agent's built-in `vision_analyze` tool to identify items from photos and then stores them in a local SQLite database.

## Integration Strategy

The Hermes Agent should follow these workflows:

### Adding Items via Photo
1.  **Analyze Image**: Call `vision_analyze` on the image.
2.  **Confirm**: Show the detected list to the user.
3.  **Update**: Call `add_grocery_items`.

### Checking Stock via Photo
1.  **Analyze Image**: Call `vision_analyze` to list items in the photo.
2.  **Check**: Call `check_grocery_items` with the list of items.
3.  **Respond**: Tell the user which items they already have and in what quantity.

### Resetting Inventory via Photo
1.  **Analyze Images**: Call `vision_analyze` on photos of fridge/pantry.
2.  **Reset**: Call `reset_grocery_inventory` with the combined list of all visible items.

## Tools

### 1. add_grocery_items
Add or update items in the inventory database.
**Usage:** `python scripts/run.py add '<json_data>'`

### 2. list_grocery_inventory
Display the current inventory.
**Usage:** `python scripts/run.py list`

### 3. check_grocery_items
Check if specific items exist in the inventory.
**Usage:** `python scripts/run.py check '<json_list>'`
**Example:** `python scripts/run.py check '["apple", "milk"]'`

### 4. record_item_price
Keep track of item prices for price matching.
**Usage:** `python scripts/run.py price '<json_data>'`
**Example:** `python scripts/run.py price '{"item": "milk", "price": 4.99, "store": "Costco"}'`

### 5. cleanup_expired_items
Remove items that have passed their expiration date.
**Usage:** `python scripts/run.py cleanup`

### 6. reset_grocery_inventory
Wipe and replace inventory based on a fresh scan (e.g., full fridge photo).
**Usage:** `python scripts/run.py reset '<json_data>'`

## Notes
- Database location: `~/.hermes/data/grocery_inventory.db`
- Zero external Python dependencies.
