"""Generate a simple favicon for HermesHub."""
from PIL import Image, ImageDraw

size = 64
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Shield shape
cx, cy = 32, 30
shield = [
    (cx, 4),
    (cx + 26, 14),
    (cx + 26, 36),
    (cx + 20, 48),
    (cx, 58),
    (cx - 20, 48),
    (cx - 26, 36),
    (cx - 26, 14),
]
draw.polygon(shield, fill=(48, 80, 255))

# Checkmark
draw.line([(20, 32), (28, 42)], fill=(232, 236, 255), width=5)
draw.line([(28, 42), (44, 22)], fill=(232, 236, 255), width=5)

img.save("/home/user/workspace/hermeshub/client/public/favicon.png", "PNG")
print("Favicon created")
