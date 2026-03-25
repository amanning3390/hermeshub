# WCAG 2.1 Criteria Quick Reference

## Level A (Minimum — all websites must meet this)

| # | Criterion | What to Check |
|---|-----------|--------------|
| 1.1.1 | Non-text Content | Alt text for all images, icons, charts |
| 1.2.1 | Audio-only / Video-only | Transcript for audio; description for silent video |
| 1.2.2 | Captions (Prerecorded) | Captions on all recorded video |
| 1.2.3 | Audio Description or Media Alternative | Audio description or full text alt for prerecorded video |
| 1.3.1 | Info and Relationships | Semantic HTML: headings, lists, tables, labels |
| 1.3.2 | Meaningful Sequence | Reading order makes sense without CSS |
| 1.3.3 | Sensory Characteristics | Instructions don't use only "the button on the right" or "the red text" |
| 1.4.1 | Use of Color | Color not the only way to convey info |
| 1.4.2 | Audio Control | Audio that plays >3s can be paused/stopped |
| 2.1.1 | Keyboard | All functionality available by keyboard |
| 2.1.2 | No Keyboard Trap | User can navigate away from any component by keyboard |
| 2.2.1 | Timing Adjustable | Time limits can be turned off, adjusted, or extended |
| 2.2.2 | Pause, Stop, Hide | Moving/blinking/scrolling content can be paused |
| 2.3.1 | Three Flashes or Below Threshold | Nothing flashes more than 3 times per second |
| 2.4.1 | Bypass Blocks | Skip navigation link or landmarks |
| 2.4.2 | Page Titled | `<title>` describes content or purpose |
| 2.4.3 | Focus Order | Focus order preserves meaning |
| 2.4.4 | Link Purpose (in Context) | Link text makes sense alone or with context |
| 3.1.1 | Language of Page | `<html lang="en">` (or correct language) |
| 3.2.1 | On Focus | Focus doesn't trigger unexpected context change |
| 3.2.2 | On Input | Input doesn't trigger unexpected change of context |
| 3.3.1 | Error Identification | Errors described in text |
| 3.3.2 | Labels or Instructions | Form fields have labels |
| 4.1.1 | Parsing | Valid HTML (no duplicate IDs, proper nesting) |
| 4.1.2 | Name, Role, Value | All UI components have accessible name, role, state |

---

## Level AA (Recommended for all public websites — required for gov sites)

| # | Criterion | What to Check |
|---|-----------|--------------|
| 1.2.4 | Captions (Live) | Live video has live captions |
| 1.2.5 | Audio Description (Prerecorded) | Audio description track for video |
| 1.3.4 | Orientation | Content not locked to portrait or landscape |
| 1.3.5 | Identify Input Purpose | Autocomplete attributes on personal data fields |
| 1.4.3 | Contrast (Minimum) | Text ≥4.5:1 ratio; large text ≥3:1 |
| 1.4.4 | Resize Text | Text resizable to 200% without loss of content |
| 1.4.5 | Images of Text | Don't use images of text (except logo) |
| 1.4.10 | Reflow | Content reflows at 320px width (no horizontal scroll) |
| 1.4.11 | Non-text Contrast | UI components and graphics ≥3:1 contrast |
| 1.4.12 | Text Spacing | Content works with custom line/letter spacing |
| 1.4.13 | Content on Hover or Focus | Hoverable/focusable content: dismissible, hoverable, persistent |
| 2.1.4 | Character Key Shortcuts | Single-char shortcuts can be turned off or remapped |
| 2.4.5 | Multiple Ways | More than one way to find a page (search, sitemap) |
| 2.4.6 | Headings and Labels | Headings and labels are descriptive |
| 2.4.7 | Focus Visible | Keyboard focus indicator is visible |
| 2.5.1 | Pointer Gestures | Multi-point gestures have single-pointer alternative |
| 2.5.2 | Pointer Cancellation | Can abort/undo pointer actions |
| 2.5.3 | Label in Name | Visible label is contained in accessible name |
| 2.5.4 | Motion Actuation | Motion-activated features have non-motion alternative |
| 3.1.2 | Language of Parts | Language changes within page are marked |
| 3.2.3 | Consistent Navigation | Navigation is consistent across pages |
| 3.2.4 | Consistent Identification | Components with same function identified consistently |
| 3.3.3 | Error Suggestion | Errors include suggestions for correction |
| 3.3.4 | Error Prevention (Legal, Financial) | Important submissions can be reviewed and corrected |
| 4.1.3 | Status Messages | Status messages are programmatically determinable |

---

## Common WCAG Failures (Most Frequently Found)

1. **1.1.1** — Images missing alt text (very common)
2. **1.3.1** — Forms without proper labels
3. **1.4.3** — Insufficient color contrast (very common)
4. **2.1.1** — Custom components not keyboard accessible
5. **2.4.2** — Missing or non-descriptive page titles
6. **2.4.4** — Vague link text ("click here", "read more")
7. **4.1.2** — Buttons/inputs without accessible names
8. **4.1.3** — Status messages not announced to screen readers

---

## WCAG Mapping to HTML Checks

| WCAG | HTML to Check |
|------|--------------|
| 1.1.1 | `<img>` without `alt`, `<svg>` without `title` or `aria-label` |
| 1.3.1 | `<div>` used as button, missing `<label>`, `<table>` without `<th>` |
| 1.4.3 | CSS color values — contrast ratio calculation |
| 1.4.4 | Use of `px` for fonts (use em/rem), viewport meta |
| 2.1.1 | `onclick` on `<div>/<span>`, no `tabindex`, no `onkeydown` |
| 2.4.1 | Missing `<a href="#main">Skip to content</a>`, no ARIA landmarks |
| 2.4.2 | `<title>` empty or generic ("Home", "Untitled") |
| 2.4.4 | `<a>Click here</a>`, `<a>Read more</a>` |
| 2.4.7 | CSS `outline: none` or `outline: 0` without alternative |
| 3.1.1 | `<html>` without `lang` attribute |
| 3.3.1 | Form errors not associated with inputs via `aria-describedby` |
| 4.1.1 | Duplicate `id` attributes in HTML |
| 4.1.2 | `<button>` with no text and no `aria-label`, `<input>` without label |

---

## WCAG 2.2 New Criteria (note if relevant)

| # | Criterion | What's New |
|---|-----------|-----------|
| 2.4.11 | Focus Not Obscured (Minimum) | Focused element not entirely hidden by sticky headers |
| 2.4.12 | Focus Not Obscured (Enhanced) | Focused element fully visible (AAA) |
| 2.4.13 | Focus Appearance | Focus indicator meets size and contrast requirements |
| 2.5.7 | Dragging Movements | Drag operations have pointer alternatives |
| 2.5.8 | Target Size (Minimum) | Click targets ≥24×24px (excluding inline text) |
| 3.2.6 | Consistent Help | Help mechanisms in consistent location |
| 3.3.7 | Redundant Entry | Don't ask for info already submitted in same session |
| 3.3.8 | Accessible Authentication | CAPTCHA has alternatives |
