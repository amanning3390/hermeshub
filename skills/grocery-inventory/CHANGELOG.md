# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0] - 2026-05-01
### Added
- Initial implementation of the grocery inventory tracker CLI (`scripts/run.py`).
- Vision analyzer integration via `hermes.vision_analyze`.
- User confirmation flow and date collection.
- JSON inventory persistence at `~/.hermes/data/grocery_inventory.json`.
- Unit test suite (`tests/test_run.py`) covering detection, confirmation, and inventory updates.
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) to run tests on push.
- CONTRIBUTING.md for contribution guidelines.
- README updated with checklist and architecture mermaid diagram.

### Changed
- Updated `scripts/run.py` import path to `from hermes import vision_analyze`.
- Added atomic file writes in `save_inventory`.
- Improved error handling and logging in CLI.

### Fixed
- Resolved `ImportError: No module named 'hermes'` by ensuring the `hermes` package is installed in the virtual environment and import path is correctly set.
- Fixed test assertion mismatch by adjusting `detect_items` mock expectations.

### Deprecated
- None.

### Removed
- None.