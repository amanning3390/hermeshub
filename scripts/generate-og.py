#!/usr/bin/env python3
"""Generate OG image for HermesHub with dynamic skill count.

Usage: python scripts/generate-og.py [skill_count]
If no argument, counts skills/*/SKILL.md directories automatically.
"""
import sys
import os
from pathlib import Path

# Determine skill count
if len(sys.argv) > 1:
    skill_count = sys.argv[1]
else:
    skills_dir = Path(__file__).resolve().parent.parent / "skills"
    count = sum(1 for d in skills_dir.iterdir()
                if d.is_dir() and (d / "SKILL.md").exists())
    skill_count = str(count)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print(f"⚠ Pillow not installed — skipping OG image generation (would show {skill_count} skills)")
    sys.exit(0)

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "client" / "public" / "og-image.png"

W, H = 1200, 630
BG = (10, 14, 26)
ACCENT = (48, 80, 255)
ACCENT2 = (80, 112, 255)
TEXT = (232, 236, 255)
MUTED = (148, 160, 200)

img = Image.new("RGBA", (W, H), BG + (255,))
draw = ImageDraw.Draw(img)

# Background gradient
for y in range(H):
    opacity = int(8 + 4 * abs((y - H/2) / (H/2)))
    draw.line([(0, y), (W, y)], fill=(20, 28, 50, min(opacity, 30)))

# Grid
for x in range(0, W, 60):
    draw.line([(x, 0), (x, H)], fill=(30, 40, 70, 20), width=1)
for y in range(0, H, 60):
    draw.line([(0, y), (W, y)], fill=(30, 40, 70, 20), width=1)

# Glow top-right
for r in range(200, 0, -2):
    alpha = int(12 * (1 - r/200))
    draw.ellipse([W-250-r, -100-r, W-250+r, -100+r], fill=(48, 80, 255, alpha))

# Top/bottom accent bars
draw.rectangle([0, 0, W, 4], fill=ACCENT)
draw.rectangle([0, H-4, W, H], fill=ACCENT)

# Fonts
font_large = font_med = font_small = font_body = None
for fp in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
           "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
    if os.path.exists(fp):
        font_large = ImageFont.truetype(fp, 72)
        font_med = ImageFont.truetype(fp, 32)
        font_small = ImageFont.truetype(fp, 24)
        break
if font_large is None:
    font_large = ImageFont.load_default()
    font_med = font_large
    font_small = font_large

for fp in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
           "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]:
    if os.path.exists(fp):
        font_body = ImageFont.truetype(fp, 28)
        break
if font_body is None:
    font_body = font_med

# Shield icon
sx, sy = 80, 160
shield = [(sx, sy+20), (sx, sy+65), (sx+5, sy+80), (sx+25, sy+95),
          (sx+40, sy+105), (sx+55, sy+95), (sx+75, sy+80),
          (sx+80, sy+65), (sx+80, sy+20), (sx+40, sy)]
draw.polygon(shield, fill=(48, 80, 255, 60), outline=ACCENT)
draw.line([(sx+22, sy+55), (sx+35, sy+70)], fill=ACCENT2, width=4)
draw.line([(sx+35, sy+70), (sx+60, sy+35)], fill=ACCENT2, width=4)

# Title + tagline
draw.text((180, 170), "HermesHub", fill=TEXT, font=font_large)
draw.text((180, 260), "Security-Scanned Skills for Hermes Agent", fill=MUTED, font=font_med)

# Divider
draw.rectangle([80, 320, 1120, 322], fill=(48, 80, 255, 80))

# Stats — skill_count is dynamic
stats = [
    ("65+", "Threat Rules"),
    ("8", "Scan Categories"),
    (skill_count, "Verified Skills"),
    ("100%", "Automated"),
]
stat_x = 80
for num, label in stats:
    draw.text((stat_x, 355), num, fill=ACCENT2, font=font_med)
    draw.text((stat_x, 400), label, fill=MUTED, font=font_small)
    stat_x += 270

# Footer
draw.text((80, 510), "by Nous Research  •  nousresearch.com", fill=(100, 115, 160), font=font_small)
draw.text((80, 550), "hermeshub.xyz", fill=ACCENT, font=font_body)

output = img.convert("RGB")
output.save(str(OUTPUT), "PNG", quality=95)
print(f"📸 Generated OG image: {skill_count} verified skills → {OUTPUT}")
