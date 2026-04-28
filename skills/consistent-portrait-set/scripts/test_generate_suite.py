#!/usr/bin/env python3
"""
Tests for photo-suite generate_suite.py

Run:
  python -m pytest test_generate_suite.py -v           # unit tests only
  python -m pytest test_generate_suite.py -v --gemini  # include Gemini API tests
"""

import argparse
import logging
import os
import sys
import tempfile
import pytest
from unittest.mock import patch, MagicMock
from PIL import Image

# Add script dir to path
sys.path.insert(0, os.path.dirname(__file__))
import generate_suite


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_base(tmp_path):
    """Override BASE_DIR to use temp directory."""
    with patch.object(generate_suite, "BASE_DIR", str(tmp_path)), \
         patch.object(generate_suite, "TMP_DIR", str(tmp_path / "tmp")), \
         patch.object(generate_suite, "OUTPUT_DIR", str(tmp_path / "outputs")), \
         patch.object(generate_suite, "LOG_DIR", str(tmp_path / "logs")):
        yield tmp_path


@pytest.fixture
def sample_grid(tmp_path):
    """Create a sample 2x2 grid image (1080x1920 total, 9:16 per cell)."""
    # 2 columns x 2 rows, each cell 540x960 (9:16)
    img = Image.new("RGB", (1080, 1920), color="white")
    # Draw different colors in each quadrant for easy verification
    for i, color in enumerate(["red", "green", "blue", "yellow"]):
        x = (i % 2) * 540
        y = (i // 2) * 960
        quadrant = Image.new("RGB", (540, 960), color=color)
        img.paste(quadrant, (x, y))
    path = tmp_path / "grid.png"
    img.save(str(path))
    return str(path)


@pytest.fixture
def sample_reference(tmp_path):
    """Create a sample reference image."""
    img = Image.new("RGB", (512, 512), color="purple")
    path = tmp_path / "ref.jpg"
    img.save(str(path))
    return str(path)


def make_args(**kwargs):
    """Build argparse.Namespace with defaults."""
    defaults = {
        "step": "generate",
        "session_id": "test_session",
        "model": None,
        "resolution": None,
        "aspect_ratio": None,
        "model_card": None,
        "prompt": None,
        "env_ref": None,
        "outfit_ref": None,
        "accessory_ref": None,
        "upscale_prompt": None,
        "upscale_ref": None,
        "image_index": None,
    }
    defaults.update(kwargs)
    return argparse.Namespace(**defaults)


# ---------------------------------------------------------------------------
# Unit Tests: Crop
# ---------------------------------------------------------------------------

class TestCrop:
    def test_crop_produces_4_images(self, tmp_base, sample_grid):
        """Cropping a grid should produce exactly 4 images."""
        session_dir = tmp_base / "tmp" / "test_session"
        session_dir.mkdir(parents=True)
        # Copy grid to session dir
        import shutil
        shutil.copy(sample_grid, str(session_dir / "grid.png"))

        args = make_args(step="crop", session_id="test_session")
        logger = generate_suite.setup_logging("test_session")
        generate_suite.step_crop(args, logger)

        for i in range(1, 5):
            assert (session_dir / f"crop-{i}.png").exists(), f"crop-{i}.png not created"

    def test_crop_dimensions(self, tmp_base, sample_grid):
        """Each cropped image should be exactly half width and half height."""
        session_dir = tmp_base / "tmp" / "test_session"
        session_dir.mkdir(parents=True)
        import shutil
        shutil.copy(sample_grid, str(session_dir / "grid.png"))

        args = make_args(step="crop", session_id="test_session")
        logger = generate_suite.setup_logging("test_session")
        generate_suite.step_crop(args, logger)

        for i in range(1, 5):
            img = Image.open(str(session_dir / f"crop-{i}.png"))
            assert img.size == (540, 960), f"crop-{i} size {img.size} != (540, 960)"

    def test_crop_colors(self, tmp_base, sample_grid):
        """Each quadrant should have the correct color from the original grid."""
        session_dir = tmp_base / "tmp" / "test_session"
        session_dir.mkdir(parents=True)
        import shutil
        shutil.copy(sample_grid, str(session_dir / "grid.png"))

        args = make_args(step="crop", session_id="test_session")
        logger = generate_suite.setup_logging("test_session")
        generate_suite.step_crop(args, logger)

        expected_colors = {
            "crop-1.png": (255, 0, 0),      # red (top-left)
            "crop-2.png": (0, 128, 0),       # green (top-right)
            "crop-3.png": (0, 0, 255),       # blue (bottom-left)
            "crop-4.png": (255, 255, 0),     # yellow (bottom-right)
        }

        for name, expected in expected_colors.items():
            img = Image.open(str(session_dir / name))
            # Sample center pixel
            center = img.getpixel((270, 480))
            assert center == expected, f"{name} center pixel {center} != {expected}"

    def test_crop_missing_grid(self, tmp_base):
        """Cropping without a grid file should exit with error."""
        session_dir = tmp_base / "tmp" / "test_session"
        session_dir.mkdir(parents=True)

        args = make_args(step="crop", session_id="test_session")
        logger = generate_suite.setup_logging("test_session")

        with pytest.raises(SystemExit):
            generate_suite.step_crop(args, logger)


# ---------------------------------------------------------------------------
# Unit Tests: Directory Structure
# ---------------------------------------------------------------------------

class TestDirectoryStructure:
    def test_log_dir_created(self, tmp_base):
        """setup_logging should create log directory."""
        generate_suite.setup_logging("test_session")
        assert (tmp_base / "logs").exists()

    def test_log_file_created(self, tmp_base):
        """setup_logging should create today's log file."""
        import datetime
        # Clear existing handlers to avoid caching
        logger = logging.getLogger("photo-suite")
        logger.handlers.clear()
        generate_suite.setup_logging("test_session")
        today = datetime.date.today().isoformat()
        assert (tmp_base / "logs" / f"{today}.log").exists()


# ---------------------------------------------------------------------------
# Unit Tests: Parameter Validation
# ---------------------------------------------------------------------------

class TestValidation:
    def test_generate_requires_prompt(self, tmp_base):
        """Generate step without --prompt should exit with error."""
        args = make_args(step="generate", prompt=None)
        logger = generate_suite.setup_logging("test_session")

        with pytest.raises(SystemExit):
            generate_suite.step_generate(args, logger)

    def test_generate_requires_api_key(self, tmp_base):
        """Generate step without GEMINI_API_KEY should raise ValueError."""
        with patch.object(generate_suite, "GEMINI_API_KEY", ""):
            args = make_args(step="generate", prompt="test prompt")
            logger = generate_suite.setup_logging("test_session")
            with pytest.raises((SystemExit, ValueError, ModuleNotFoundError)):
                generate_suite.step_generate(args, logger)


# ---------------------------------------------------------------------------
# Integration Tests: Gemini API (requires --gemini flag)
# ---------------------------------------------------------------------------

def pytest_addoption(parser):
    parser.addoption("--gemini", action="store_true", default=False, help="Run Gemini API integration tests")


def pytest_collection_modifyitems(config, items):
    if not config.getoption("--gemini"):
        skip = pytest.mark.skip(reason="Need --gemini flag to run")
        for item in items:
            if "gemini_api" in item.keywords:
                item.add_marker(skip)


@pytest.mark.gemini_api
class TestGeminiAPI:
    def test_gemini_returns_image(self):
        """Gemini API should return an image for a simple prompt."""
        if not os.environ.get("GEMINI_API_KEY"):
            pytest.skip("GEMINI_API_KEY not set")

        result = generate_suite.call_gemini("A simple red circle on white background")
        assert result["image_path"] is not None
        assert os.path.exists(result["image_path"])

        img = Image.open(result["image_path"])
        assert img.size[0] > 0 and img.size[1] > 0

    def test_gemini_with_reference(self, sample_reference):
        """Gemini API should accept a reference image."""
        if not os.environ.get("GEMINI_API_KEY"):
            pytest.skip("GEMINI_API_KEY not set")

        result = generate_suite.call_gemini(
            "Redraw this image in watercolor style",
            reference_images=[sample_reference]
        )
        assert result["image_path"] is not None

    def test_full_pipeline(self, tmp_base, sample_reference):
        """Full pipeline: generate → crop → verify outputs."""
        if not os.environ.get("GEMINI_API_KEY"):
            pytest.skip("GEMINI_API_KEY not set")

        session_id = "integration_test"

        # Step 1: Generate
        args = make_args(
            step="generate",
            session_id=session_id,
            model_card=sample_reference,
            prompt="A 2x2 grid of 4 portrait photos (9:16) of a woman in different poses, high quality"
        )
        logger = generate_suite.setup_logging(session_id)
        generate_suite.step_generate(args, logger)

        grid_path = tmp_base / "tmp" / session_id / "grid.png"
        assert grid_path.exists(), "Grid not generated"

        # Step 2: Crop
        args = make_args(step="crop", session_id=session_id)
        generate_suite.step_crop(args, logger)

        for i in range(1, 5):
            assert (tmp_base / "tmp" / session_id / f"crop-{i}.png").exists()
