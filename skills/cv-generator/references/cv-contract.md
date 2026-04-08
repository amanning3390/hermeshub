# CvData Contract Notes

This reference is intentionally short. It is a working checklist for the `cv-generator` skill.

## Required Fields

Top-level:
- `header`
- `profileLabel`
- `profile`
- `skillGroups`
- `highlights`
- `certifications`
- `formations`
- `languages`
- `experiences`
- `mainEducation`
- `render`

## Render Fields

`render` must contain:
- `mode`
- `maxPages`
- `theme`
- `sidebarPosition`

Valid `theme` values:
- `ocean`
- `zen`
- `zen-cream`
- `zen-orange`
- `claude`
- `graphite`
- `cyber`
- `cyber-purple`

Valid `sidebarPosition` values:
- `left`
- `right`

## Example Starting Points

- Minimal fixture: `examples/cv-minimal.json`
- Cloud architect example: `examples/cv-cloud-architect.json`

## Tool Sequence

1. `mcp_cv_generator_get_cv_schema` if the structure is uncertain
2. `mcp_cv_generator_validate_cv` on the finished payload
3. `mcp_cv_generator_generate_cv_html` or `mcp_cv_generator_generate_cv_pdf`

If the payload is too large:
- `mcp_cv_generator_start_cv_chunked_generation`
- `mcp_cv_generator_append_cv_generation_chunk`
