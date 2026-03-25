---
name: accessibility-auditor
description: Comprehensive accessibility audit for websites (WCAG 2.1, GOST R 52872-2019), GitHub repos, and local projects. Also covers mobile (Android/iOS/Flutter/React Native) and desktop (Electron/PyQt) source code static analysis.
version: "1.0.0"
license: MIT
compatibility: Requires browser tools for website audits, terminal for local projects
metadata:
  author: web3blind
  hermes:
    tags: [accessibility, wcag, gost, a11y, audit, screen-reader, website-audit, mobile-audit]
    category: accessibility
    requires_tools: [browser, terminal, web]
triggers:
  - audit accessibility
  - check accessibility
  - аудит доступности
  - проверить доступность
  - analyse accessibility
  - accessibility audit
  - WCAG audit
  - ГОСТ доступность
  - проверь доступность сайта
  - accessibility check
  - проверить сайт на доступность
---

# Accessibility Auditor Skill

Performs comprehensive accessibility audits on:
- **Websites** — via URL (any public site)
- **GitHub repositories** — source code analysis
- **Local project folders** — source code analysis
- **Mobile apps** — Android/iOS/Flutter/React Native source (static)
- **Desktop apps** — Electron/PyQt/wxWidgets source (static)

## Quick Start

The user provides one of:
- A URL: `https://example.com`
- A GitHub repo: `https://github.com/user/repo`
- A local path: `/home/user/myapp` or `./myapp`
- Multiple targets at once

Then follow the workflow below.

---

## Step 1: Detect Input Type and Gather Data

### Website (URL)
1. Use `web_extract([url])` to get page content
2. If site requires JavaScript, use `browser_navigate` + `browser_snapshot(full=True)`
3. Also check secondary pages: /about, /contact, any linked pages
4. Note: you cannot "run" accessibility scanners — analyze the HTML/CSS yourself

### GitHub Repository
1. Use `web_extract(["https://github.com/user/repo"])` for README and main page
2. Fetch relevant source files:
   - For web projects: look for HTML, CSS, JS/JSX/TSX files
   - For mobile: look for layout XML (Android), Swift/SwiftUI, Dart, JS (React Native)
   - For desktop: look for PyQt, wxWidgets, Electron HTML
3. Use `web_extract` on raw file URLs:
   `https://raw.githubusercontent.com/user/repo/main/path/to/file`
4. Check if there's an existing accessibility statement or docs

### Local Folder
1. Use `search_files(pattern="*.html", path="/path")` to find relevant files
2. Use `read_file` to read source files
3. Prioritize: HTML/JSX/TSX, layout XML (Android), Swift/Dart files
4. Check package.json / pubspec.yaml / build.gradle for accessibility deps

---

## Step 2: Identify Platform and Framework

Determine what you're auditing:
- **Web** → HTML/CSS/JS, check WCAG 2.1 + GOST checklist
- **Android** → layout XML + Kotlin/Java, check mobile checklist
- **iOS** → Swift/SwiftUI/ObjC, check mobile checklist
- **Flutter** → Dart widget files, check mobile checklist
- **React Native** → JS/TSX files, check mobile checklist
- **Electron** → HTML/CSS/JS (same as web + Electron specifics)
- **PyQt/wxWidgets** → Python files, limited static analysis possible
- **WPF/XAML** → XAML files (similar to Android XML, high viability)

Load the appropriate reference files for this platform:
- `references/web-checklist.md` for websites and Electron
- `references/mobile-checklist.md` for Android/iOS/Flutter/React Native
- `references/desktop-checklist.md` for native desktop (PyQt, wxWidgets, WPF)
- `references/gost-checklist.md` for Russian government sites
- `references/wcag-criteria.md` for WCAG 2.1 criterion-level detail
- `references/tools.md` for tooling recommendations

---

## Step 3: Run the Audit

### For Websites — check ALL of the following:

#### A. Perceivable
- [ ] All images have descriptive `alt` text (not empty, not "image", not filename)
- [ ] Decorative images have `alt=""` and `role="presentation"`
- [ ] Videos have captions (`<track kind="captions">`)
- [ ] Audio has transcripts
- [ ] Color is NOT the only way to convey information
- [ ] Text contrast ratio ≥ 4.5:1 (normal), ≥ 3:1 (large text ≥18pt or 14pt bold)
- [ ] Text can be resized to 200% without horizontal scrolling or loss of content
- [ ] Page content reflows at 320px width (mobile responsive)
- [ ] No content flashes more than 3 times per second

#### B. Operable
- [ ] ALL functionality is keyboard-accessible (Tab, Enter, Space, Arrow keys)
- [ ] No keyboard traps (user can always Tab away)
- [ ] Visible focus indicator exists and is clearly visible
- [ ] Skip navigation link exists ("Skip to main content")
- [ ] Page has a meaningful `<title>` tag
- [ ] Focus order is logical (matches visual reading order)
- [ ] No time limits, or user can extend/disable them
- [ ] Moving content can be paused/stopped/hidden
- [ ] No content auto-navigates without user control

#### C. Understandable
- [ ] `<html lang="...">` attribute is set correctly
- [ ] Pages are consistent in navigation and labeling
- [ ] Forms have descriptive labels for all inputs
- [ ] Error messages are specific and describe how to fix the error
- [ ] Instructions don't rely solely on sensory characteristics (color, shape, location)
- [ ] Abbreviations and jargon are explained
- [ ] Input purpose is programmatically determinable (autocomplete attributes)

#### D. Robust
- [ ] Valid HTML (no broken tags, proper nesting)
- [ ] ARIA roles, states, properties are used correctly
- [ ] `aria-label` / `aria-labelledby` / `aria-describedby` are present where needed
- [ ] No `aria-hidden="true"` on interactive/focusable elements
- [ ] Buttons and links have accessible names
- [ ] Form inputs have associated `<label>` (via `for` attribute or wrapping)
- [ ] `role`, `aria-expanded`, `aria-selected`, `aria-checked` match actual state

#### E. Structure & Landmarks
- [ ] Exactly one `<h1>` per page
- [ ] Heading hierarchy is correct (h1→h2→h3, no skipping levels)
- [ ] ARIA landmarks: `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>` used
- [ ] Links have descriptive text (not "click here", "read more", "link")
- [ ] Tables use `<th>` with `scope` attribute, have `<caption>` if needed
- [ ] Lists use `<ul>`, `<ol>`, `<dl>` semantically

#### F. Special Elements
- [ ] iframes have descriptive `title` attribute
- [ ] PDFs on the site are tagged/accessible (or alt versions provided)
- [ ] CAPTCHA has audio alternative
- [ ] Modals/dialogs trap focus correctly and return focus on close
- [ ] Custom widgets (dropdowns, sliders, tabs) have correct ARIA implementation

### For Mobile App Source Code:

Load `references/mobile-checklist.md` and apply per-platform checks.

Key things to detect statically:
- **Android XML layouts**: Missing `android:contentDescription` on ImageView, ImageButton
- **Android Kotlin/Java**: Missing `setContentDescription()` calls, misuse of `importantForAccessibility`
- **iOS Swift/SwiftUI**: Missing `.accessibilityLabel()`, incorrect `.accessibilityHidden(true)`
- **Flutter**: Images without `semanticLabel` or `Semantics` wrapper, `GestureDetector` without Semantics
- **React Native**: `<Image>` missing `accessibilityLabel`, `<TouchableOpacity>` without label

Hard to check statically (note in report):
- Color contrast (requires rendering)
- Touch target sizes (requires layout computation)
- Focus traversal order (requires runtime)
- Screen reader announcement accuracy (requires device testing)

### For Desktop App Source Code:

Load `references/desktop-checklist.md`.

- **Electron**: Treat as web — check HTML/CSS/JS with web checklist
- **PyQt**: Look for `setAccessibleName()`, `setAccessibleDescription()` calls
- **wxWidgets**: Look for `SetName()`, `SetHelpText()` calls
- **WPF/XAML**: Check `AutomationProperties.Name`, `AutomationProperties.HelpText`

---

## Step 4: Produce the Report

Structure your report as follows:

```
## Accessibility Audit Report

**Target:** [URL / repo / path]
**Date:** [date]
**Platform:** [web / Android / iOS / Flutter / React Native / Electron / etc.]
**Standards checked:** [WCAG 2.1 AA / GOST R 52872-2019 / Mincifry Checklist]

---

### Executive Summary

**Score:** XX/100
**Grade:** [A/B/C/D/F]
**Critical issues:** N
**Warnings:** N
**Informational:** N

Overall assessment: [1-2 sentence summary]

---

### Critical Issues (must fix)

**[Category]**
- Issue: [description]
  Element: [tag/selector/code snippet if found]
  WCAG criterion: [e.g., 1.1.1 Non-text Content]
  Fix: [specific recommendation]

[repeat for each critical issue]

---

### Warnings (should fix)

[same format as above]

---

### Informational (good to know)

[same format as above]

---

### Passed Checks

[List what was checked and found to be OK]

---

### GOST / Mincifry Compliance (if applicable)

[Map findings to the official Russian checklist items from references/gost-checklist.md]

---

### What Cannot Be Checked Statically

[For mobile/desktop: list what requires device/runtime testing]

---

### Recommended Tools for Deeper Testing

[From references/tools.md — platform-appropriate tools]

---

### Next Steps

1. [Prioritized action items]
2. ...
```

---

## Scoring Formula

Calculate score as: `max(0, 100 - deductions)`

| Severity  | Deduction per issue |
|-----------|-------------------|
| Critical  | 10 points         |
| Warning   | 5 points          |
| Info      | 1 point           |

Grade scale:
- 90-100: A (Excellent)
- 80-89: B (Good)
- 70-79: C (Fair)
- 60-69: D (Poor)
- 0-59: F (Fail)

---

## Important Notes

### On Mobile/Desktop Apps — Honesty is Required
Static source code analysis can find ~40-60% of accessibility issues.
The following ALWAYS require running the actual app + screen reader:
- Actual screen reader behavior
- Color contrast (needs rendering)
- Touch target sizes
- Focus traversal order
- Dynamic content announcements
- Custom component behavior

Always state this clearly in the report.

### On Russian Standards
Russian government sites are governed by:
1. GOST R 52872-2019 (based on WCAG 2.1)
2. Mincifry order (Приказ Минцифры) — see `references/gost-checklist.md`

These mostly map to WCAG 2.1 AA requirements with some specific additions.

### On Completeness
If the target is large (many pages/files), focus on:
1. Main page / entry points
2. Key user flows (login, main functionality)
3. Any forms or interactive elements
4. Navigation structure

State what was and wasn't checked.
