#!/usr/bin/env python3
"""
Image Upload & Draft Creation for Nostr (nostr skill v2.1)
- Download/upload image to Blossom servers
- Create unsigned draft with NIP-94 metadata
- NO Telegram credentials access (optional feature removed)
- Output: JSON draft ready for publish.py with NOSTR_APPROVE=1

Usage:
  python3 telegram_to_nostr.py /path/to/image.jpg "Your caption here"

Output: Unsigned draft JSON with NIP-94 image metadata
"""

import os
import sys
import json
import hashlib
import requests
from datetime import datetime

try:
    from PIL import Image
except ImportError:
    Image = None


def validate_image(file_path):
    """
    Validate image before upload.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not os.path.exists(file_path):
        return False, f"File not found: {file_path}"
    
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if file_size_mb > 5:
        return False, f"File too large: {file_size_mb:.1f}MB (max 5MB)"
    
    _, ext = os.path.splitext(file_path.lower())
    valid_formats = {'.jpg', '.jpeg', '.gif', '.png'}
    if ext not in valid_formats:
        return False, f"Invalid format: {ext} (allowed: {', '.join(valid_formats)})"
    
    return True, None


def upload_to_blossom(image_path):
    """
    Upload image to Blossom servers.
    
    Returns:
        tuple: (success, image_url, sha256_hash or error_message)
    """
    # Blossom servers to try
    blossom_servers = [
        "https://blossom.primal.net/upload",
        "https://blossom.nostr.build/upload",
        "https://blossom.nostrcheck.me/upload",
    ]
    
    # Read file
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
    except Exception as e:
        return False, None, f"Cannot read file: {str(e)[:80]}"
    
    # Calculate SHA256
    sha256_hash = hashlib.sha256(image_data).hexdigest()
    
    # Try each server
    for server_url in blossom_servers:
        try:
            print(f"  Uploading to {server_url.split('/')[2]}...")
            response = requests.post(
                server_url,
                files={'file': image_data},
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                # Success - extract URL
                result = response.json()
                image_url = result.get('url')
                if image_url:
                    print(f"  ✅ Uploaded successfully")
                    return True, image_url, sha256_hash
            elif response.status_code == 413:
                print(f"  ⚠️  Server: File too large (413)")
            elif response.status_code == 429:
                print(f"  ⚠️  Server: Rate limited (429)")
            else:
                print(f"  ⚠️  Server returned {response.status_code}")
        except requests.Timeout:
            print(f"  ⚠️  Timeout connecting to server")
        except Exception as e:
            print(f"  ⚠️  Error: {str(e)[:60]}")
    
    return False, None, "All upload servers failed"


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "status": "error",
            "message": "Usage: telegram_to_nostr.py <image_path> <caption>"
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    caption = sys.argv[2]
    
    print("\n=== IMAGE UPLOAD & DRAFT CREATION ===\n")
    
    # 1. Validate image
    print("✓ Validating image...")
    is_valid, error = validate_image(image_path)
    if not is_valid:
        print(json.dumps({
            "status": "error",
            "message": error
        }))
        sys.exit(1)
    
    print(f"  ✅ Valid: {os.path.basename(image_path)}")
    
    # 2. Upload to Blossom
    print("\n✓ Uploading to Blossom servers...")
    success, image_url, result = upload_to_blossom(image_path)
    
    if not success:
        print(json.dumps({
            "status": "error",
            "message": result
        }))
        sys.exit(1)
    
    sha256 = result  # result is sha256_hash on success
    
    # 3. Create Nostr content with NIP-94 metadata
    print("\n✓ Creating Nostr draft...")
    content = f"{caption}\n\n{image_url}"
    
    # Build NIP-94 compliant tags
    tags = [
        ["url", image_url],
        ["m", "image/jpeg"]  # MIME type
    ]
    if sha256:
        tags.append(["x", sha256])  # SHA-256 hash
    
    result = {
        "status": "success",
        "message": "Ready for Nostr publishing",
        "image_url": image_url,
        "caption": caption,
        "content_for_nostr": content,
        "timestamp": datetime.now().isoformat()
    }
    
    print("\n=== FINAL RESULT ===")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Save draft for publishing
    draft_data = {
        "content": content,
        "kind": 1,
        "tags": tags
    }
    
    draft_path = os.path.expanduser("~/.hermes/nostr-last-draft.json")
    with open(draft_path, "w", encoding="utf-8") as f:
        json.dump(draft_data, f, indent=2)
    
    print(f"\n💡 Next step:")
    print(f"   1. Review the draft above")
    print(f"   2. Type YES to approve")
    print(f"   3. Run: NOSTR_APPROVE=1 ~/.hermes/nostr-env/bin/python3 ~/.hermes/skills/nostr/scripts/publish.py {draft_path}")


if __name__ == "__main__":
    main()
