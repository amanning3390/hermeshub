"""Generate OG image for HermesHub in Nous Research brand colors."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
# Nous Research brand colors
BG = (10, 14, 26)        # #0A0E1A deep navy
ACCENT = (48, 80, 255)   # #3050FF cobalt blue
ACCENT2 = (80, 112, 255) # #5070FF lighter cobalt
TEXT = (232, 236, 255)    # #E8ECFF light text
MUTED = (148, 160, 200)  # muted text
GLOW = (48, 80, 255, 40) # glow overlay

img = Image.new("RGBA", (W, H), BG + (255,))
draw = ImageDraw.Draw(img)

# Background gradient effect - subtle horizontal lines
for y in range(H):
    opacity = int(8 + 4 * abs((y - H/2) / (H/2)))
    draw.line([(0, y), (W, y)], fill=(20, 28, 50, min(opacity, 30)))

# Subtle grid pattern
for x in range(0, W, 60):
    draw.line([(x, 0), (x, H)], fill=(30, 40, 70, 20), width=1)
for y in range(0, H, 60):
    draw.line([(0, y), (W, y)], fill=(30, 40, 70, 20), width=1)

# Accent glow circle in top right
for r in range(200, 0, -2):
    alpha = int(12 * (1 - r/200))
    draw.ellipse([W-250-r, -100-r, W-250+r, -100+r], fill=(48, 80, 255, alpha))

# Accent glow in bottom left (pushed further off-screen)
for r in range(150, 0, -2):
    alpha = int(8 * (1 - r/150))
    draw.ellipse([-80-r, H+30-r, -80+r, H+30+r], fill=(48, 80, 255, alpha))

# Top accent bar
draw.rectangle([0, 0, W, 4], fill=ACCENT)

# Try to load a good font, fall back to default
font_paths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]
font_large = None
font_med = None
font_small = None
for fp in font_paths:
    if os.path.exists(fp):
        font_large = ImageFont.truetype(fp, 72)
        font_med = ImageFont.truetype(fp, 32)
        font_small = ImageFont.truetype(fp, 24)
        break

if font_large is None:
    font_large = ImageFont.load_default()
    font_med = ImageFont.load_default()
    font_small = ImageFont.load_default()

# Also get a regular weight for subtitles
font_reg_paths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]
font_body = font_med
for fp in font_reg_paths:
    if os.path.exists(fp):
        font_body = ImageFont.truetype(fp, 28)
        break

# Shield icon (simple geometric) 
shield_x, shield_y = 80, 160
# Shield outline
shield_points = [
    (shield_x, shield_y + 20),
    (shield_x, shield_y + 65),
    (shield_x + 5, shield_y + 80),
    (shield_x + 25, shield_y + 95),
    (shield_x + 40, shield_y + 105),
    (shield_x + 55, shield_y + 95),
    (shield_x + 75, shield_y + 80),
    (shield_x + 80, shield_y + 65),
    (shield_x + 80, shield_y + 20),
    (shield_x + 40, shield_y),
]
draw.polygon(shield_points, fill=(48, 80, 255, 60), outline=ACCENT)
# Checkmark inside shield
draw.line([(shield_x+22, shield_y+55), (shield_x+35, shield_y+70)], fill=ACCENT2, width=4)
draw.line([(shield_x+35, shield_y+70), (shield_x+60, shield_y+35)], fill=ACCENT2, width=4)

# Main title
title = "HermesHub"
draw.text((180, 170), title, fill=TEXT, font=font_large)

# Tagline
tagline = "Security-Scanned Skills for Hermes Agent"
draw.text((180, 260), tagline, fill=MUTED, font=font_med)

# Divider line
draw.rectangle([80, 320, 1120, 322], fill=(48, 80, 255, 80))

# Stats row
stats = [
    ("65+", "Threat Rules"),
    ("8", "Scan Categories"),
    ("12", "Verified Skills"),
    ("100%", "Automated"),
]

stat_x = 80
for num, label in stats:
    draw.text((stat_x, 355), num, fill=ACCENT2, font=font_med)
    bbox = draw.textbbox((stat_x, 355), num, font=font_med)
    draw.text((stat_x, 400), label, fill=MUTED, font=font_small)
    stat_x += 270

# Bottom text
draw.text((80, 510), "by Nous Research  •  nousresearch.com", fill=(100, 115, 160), font=font_small)
draw.text((80, 550), "hermeshub.xyz", fill=ACCENT, font=font_body)

# Bottom accent bar
draw.rectangle([0, H-4, W, H], fill=ACCENT)

# Save as PNG
output = img.convert("RGB")
output.save("/home/user/workspace/hermeshub/client/public/og-image.png", "PNG", quality=95)
print(f"OG image created: {output.size}")
