#!/usr/bin/env python3
"""
Photo Suite Generator — Consistent photo set pipeline.

Steps:
  generate        — Call Gemini to create a 2x2 grid image (default 4K, 9:16)
  crop            — Split grid into 4 individual images
  upscale         — Upscale individual images via Gemini (optional)
  finalize        — Move crops to output directory (skip upscale)
  chain           — Generate single image with flexible references (default 2K)
  chain-finalize  — Move chain images to output directory

Usage:
  python generate_suite.py --step generate --model-card ref.jpg --prompt "..." --session-id 20260426_120000
  python generate_suite.py --step crop --session-id 20260426_120000
  python generate_suite.py --step chain --model-card ref.jpg --prompt "..." --session-id 20260426_120000
  python generate_suite.py --step chain-finalize --session-id 20260426_120000
"""

import argparse
import datetime
import glob
import json
import logging
import os
import shutil
import sys

from PIL import Image

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEFAULT_MODEL = "gemini-3.1-flash-image-preview"
DEFAULT_RESOLUTION = "4K"
DEFAULT_ASPECT_RATIO = "9:16"
VALID_RESOLUTIONS = ["512", "1K", "2K", "4K"]
VALID_ASPECT_RATIOS = [
    "1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1",
    "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9",
]

MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}

BASE_DIR = os.path.expanduser("~/.hermes/workspace/consistent-portrait-set")
TMP_DIR = os.path.join(BASE_DIR, "tmp")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
LOG_DIR = os.path.join(BASE_DIR, "logs")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def setup_logging(session_id: str) -> logging.Logger:
    os.makedirs(LOG_DIR, exist_ok=True)
    today = datetime.date.today().isoformat()
    log_file = os.path.join(LOG_DIR, f"{today}.log")

    logger = logging.getLogger("photo-suite")
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        logger.addHandler(fh)

        sh = logging.StreamHandler(sys.stdout)
        sh.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(sh)

    return logger


def get_image_dims(path: str) -> tuple:
    img = Image.open(path)
    return img.size


def make_output_dir(session_id: str) -> str:
    today = datetime.date.today().isoformat()
    out_dir = os.path.join(OUTPUT_DIR, today, session_id)
    os.makedirs(out_dir, exist_ok=True)
    return out_dir


def finalize_files(session_dir: str, source_pattern: str, session_id: str, logger: logging.Logger, step_label: str):
    """Copy source files to output directory as final-N.png."""
    out_dir = make_output_dir(session_id)
    source_files = sorted(glob.glob(os.path.join(session_dir, source_pattern)))

    if not source_files:
        print(f"ERROR: No files matching '{source_pattern}' in session")
        sys.exit(1)

    for i, src in enumerate(source_files, 1):
        dst = os.path.join(out_dir, f"final-{i}.png")
        shutil.copy2(src, dst)
        w, h = get_image_dims(dst)
        logger.info(f"[{step_label}] Copied: {dst} ({w}x{h})")
        print(f"Final image {i}: {dst} ({w}x{h})")

    print(f"\nOutput directory: {out_dir}")
    print(f"Total: {len(source_files)} images")


# ---------------------------------------------------------------------------
# Gemini API via google-genai SDK
# ---------------------------------------------------------------------------

def call_gemini(
    prompt: str,
    reference_images: list[str] = None,
    model: str = None,
    resolution: str = None,
    aspect_ratio: str = None,
) -> dict:
    """Call Gemini API. Returns dict with 'image_data' (bytes or None) and 'text' (str)."""
    from google import genai
    from google.genai import types
    import base64

    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")

    client = genai.Client(api_key=GEMINI_API_KEY)
    model = model or DEFAULT_MODEL

    parts = []

    for img_path in (reference_images or []):
        with open(img_path, "rb") as f:
            data = f.read()
        ext = os.path.splitext(img_path)[1].lower()
        parts.append(types.Part.from_bytes(data=data, mime_type=MIME_MAP.get(ext, "image/jpeg")))

    parts.append(types.Part.from_text(text=prompt))

    image_config_kwargs = {}
    if resolution and resolution in VALID_RESOLUTIONS:
        image_config_kwargs["image_size"] = resolution
    if aspect_ratio and aspect_ratio in VALID_ASPECT_RATIOS:
        image_config_kwargs["aspect_ratio"] = aspect_ratio

    config = types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(**image_config_kwargs) if image_config_kwargs else None,
    )

    response = client.models.generate_content(
        model=model,
        contents=parts,
        config=config,
    )

    if not response.candidates:
        raise RuntimeError("No candidates in Gemini response")

    image_data = None
    text = ""

    for part in response.candidates[0].content.parts:
        if part.inline_data:
            raw = part.inline_data.data
            image_data = base64.b64decode(raw) if isinstance(raw, str) else raw
        elif part.text:
            text += part.text

    return {"image_data": image_data, "text": text}


def generate_and_save(
    args,
    logger: logging.Logger,
    refs: list[str],
    output_path: str,
    step_label: str,
    default_resolution: str = DEFAULT_RESOLUTION,
):
    """Shared logic for generate and chain steps: call API, save image, log."""
    if not args.prompt:
        print(f"ERROR: --prompt required for {step_label} step")
        sys.exit(1)

    resolution = args.resolution or default_resolution
    aspect_ratio = args.aspect_ratio or DEFAULT_ASPECT_RATIO

    logger.info(f"[{step_label}] session={args.session_id} refs={len(refs)} resolution={resolution} ar={aspect_ratio} prompt={args.prompt[:80]}...")

    start = datetime.datetime.now()
    result = call_gemini(
        args.prompt,
        reference_images=refs,
        model=args.model,
        resolution=resolution,
        aspect_ratio=aspect_ratio,
    )
    elapsed = (datetime.datetime.now() - start).total_seconds()

    if not result["image_data"]:
        logger.error(f"[{step_label}] No image returned from Gemini")
        print("ERROR: No image returned from Gemini")
        if result["text"]:
            print(f"Model response: {result['text']}")
        sys.exit(1)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(result["image_data"])

    w, h = get_image_dims(output_path)

    logger.info(f"[{step_label}] Saved: {output_path} ({w}x{h}, {elapsed:.1f}s)")
    if result["text"]:
        logger.info(f"[{step_label}] Model text: {result['text'][:200]}")

    print(f"Image saved: {output_path}")
    print(f"Resolution: {w}x{h}")
    print(f"Time: {elapsed:.1f}s")


# ---------------------------------------------------------------------------
# Grid Mode steps
# ---------------------------------------------------------------------------

def step_generate(args, logger):
    session_dir = os.path.join(TMP_DIR, args.session_id)
    refs = []
    if args.model_card:
        refs.append(args.model_card)
    if args.env_ref:
        refs.append(args.env_ref)
    if args.outfit_ref:
        refs.append(args.outfit_ref)
    if args.accessory_ref:
        refs.append(args.accessory_ref)

    generate_and_save(args, logger, refs, os.path.join(session_dir, "grid.png"), "generate")


def step_crop(args, logger):
    session_dir = os.path.join(TMP_DIR, args.session_id)
    grid_path = os.path.join(session_dir, "grid.png")

    if not os.path.exists(grid_path):
        print(f"ERROR: Grid not found at {grid_path}")
        sys.exit(1)

    img = Image.open(grid_path)
    w, h = img.size
    half_w, half_h = w // 2, h // 2

    crops = {
        "crop-1.png": (0, 0, half_w, half_h),
        "crop-2.png": (half_w, 0, w, half_h),
        "crop-3.png": (0, half_h, half_w, h),
        "crop-4.png": (half_w, half_h, w, h),
    }

    logger.info(f"[crop] session={args.session_id} grid={w}x{h} each={half_w}x{half_h}")

    paths = []
    for name, box in crops.items():
        cropped = img.crop(box)
        path = os.path.join(session_dir, name)
        cropped.save(path, quality=95)
        paths.append(path)
        logger.info(f"[crop] Saved: {path} ({half_w}x{half_h})")

    print(f"Cropped 4 images from {w}x{h} grid (each {half_w}x{half_h}):")
    for p in paths:
        print(f"  {p}")


def step_upscale(args, logger):
    session_dir = os.path.join(TMP_DIR, args.session_id)
    out_dir = make_output_dir(args.session_id)

    if args.image_index:
        indices = [args.image_index]
    else:
        indices = [1, 2, 3, 4]

    resolution = args.resolution or "4K"
    prompt = args.upscale_prompt or "Upscale this image to high resolution. Preserve all details faithfully. Maintain exact facial features, hand proportions (5 fingers each), clothing texture, and background details."

    for idx in indices:
        crop_path = os.path.join(session_dir, f"crop-{idx}.png")
        if not os.path.exists(crop_path):
            print(f"ERROR: crop-{idx}.png not found")
            continue

        refs = [crop_path]
        if args.upscale_ref:
            refs.append(args.upscale_ref)

        logger.info(f"[upscale] image={idx} refs={len(refs)} resolution={resolution} prompt={prompt[:60]}...")

        start = datetime.datetime.now()
        result = call_gemini(prompt, reference_images=refs, model=args.model, resolution=resolution)
        elapsed = (datetime.datetime.now() - start).total_seconds()

        if result["image_data"]:
            final_path = os.path.join(out_dir, f"final-{idx}.png")
            with open(final_path, "wb") as f:
                f.write(result["image_data"])
            w, h = get_image_dims(final_path)
            logger.info(f"[upscale] Saved: {final_path} ({w}x{h}, {elapsed:.1f}s)")
            print(f"Upscaled image {idx}: {final_path} ({w}x{h}, {elapsed:.1f}s)")
        else:
            logger.error(f"[upscale] No image returned for crop-{idx}")
            print(f"ERROR: No image returned for crop-{idx}")
            if result["text"]:
                print(f"Model response: {result['text'][:200]}")

    print(f"\nOutput directory: {out_dir}")


def step_finalize(args, logger):
    session_dir = os.path.join(TMP_DIR, args.session_id)
    finalize_files(session_dir, "crop-*.png", args.session_id, logger, "finalize")


# ---------------------------------------------------------------------------
# Chain Mode steps
# ---------------------------------------------------------------------------

def step_chain(args, logger):
    session_dir = os.path.join(TMP_DIR, args.session_id)
    os.makedirs(session_dir, exist_ok=True)

    existing = glob.glob(os.path.join(session_dir, "chain-*.png"))
    next_idx = len(existing) + 1

    refs = []
    if args.model_card:
        refs.append(args.model_card)
    if args.ref_images:
        for p in args.ref_images.split(","):
            p = p.strip()
            if p and os.path.exists(p):
                refs.append(p)
            elif p:
                print(f"WARNING: ref image not found: {p}")

    generate_and_save(
        args, logger, refs,
        os.path.join(session_dir, f"chain-{next_idx}.png"),
        "chain",
        default_resolution="2K",
    )


def step_chain_finalize(args, logger):
    session_dir = os.path.join(TMP_DIR, args.session_id)
    finalize_files(session_dir, "chain-*.png", args.session_id, logger, "chain-finalize")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Photo Suite Generator")
    parser.add_argument("--step", required=True, choices=["generate", "crop", "upscale", "finalize", "chain", "chain-finalize"])
    parser.add_argument("--session-id", required=True, help="Session identifier for file organization")
    parser.add_argument("--model", default=None, help=f"Gemini model (default: {DEFAULT_MODEL})")
    parser.add_argument("--resolution", default=None, help=f"Output resolution: {', '.join(VALID_RESOLUTIONS)} (default: {DEFAULT_RESOLUTION})")
    parser.add_argument("--aspect-ratio", default=None, help=f"Aspect ratio (default: {DEFAULT_ASPECT_RATIO}). Valid: {', '.join(VALID_ASPECT_RATIOS)}")

    # Generate args
    parser.add_argument("--model-card", default=None, help="Path to model card (face reference)")
    parser.add_argument("--prompt", default=None, help="Generation prompt")
    parser.add_argument("--env-ref", default=None, help="Environment reference image (optional)")
    parser.add_argument("--outfit-ref", default=None, help="Outfit reference image (optional)")
    parser.add_argument("--accessory-ref", default=None, help="Accessory reference image (optional)")

    # Chain args
    parser.add_argument("--ref-images", default=None, help="Comma-separated paths to reference images for chain mode")

    # Upscale args
    parser.add_argument("--upscale-prompt", default=None, help="Custom upscale prompt")
    parser.add_argument("--upscale-ref", default=None, help="Additional reference image for upscale (optional)")
    parser.add_argument("--image-index", type=int, default=None, help="Upscale specific image (1-4), omit for all")

    args = parser.parse_args()

    if not GEMINI_API_KEY and args.step not in ("crop", "finalize", "chain-finalize"):
        print("ERROR: GEMINI_API_KEY not set")
        sys.exit(1)

    if args.resolution and args.resolution not in VALID_RESOLUTIONS:
        print(f"ERROR: Invalid resolution '{args.resolution}'. Valid: {', '.join(VALID_RESOLUTIONS)}")
        sys.exit(1)

    if args.aspect_ratio and args.aspect_ratio not in VALID_ASPECT_RATIOS:
        print(f"ERROR: Invalid aspect ratio '{args.aspect_ratio}'. Valid: {', '.join(VALID_ASPECT_RATIOS)}")
        sys.exit(1)

    logger = setup_logging(args.session_id)

    steps = {
        "generate": step_generate,
        "crop": step_crop,
        "upscale": step_upscale,
        "finalize": step_finalize,
        "chain": step_chain,
        "chain-finalize": step_chain_finalize,
    }
    steps[args.step](args, logger)


if __name__ == "__main__":
    main()
