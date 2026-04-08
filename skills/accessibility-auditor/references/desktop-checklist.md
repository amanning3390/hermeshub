# Desktop App Accessibility Checklist

## Platform Overview

| Framework | Static Analysis | Key API | Screen Reader |
|-----------|----------------|---------|---------------|
| Electron | HIGH — HTML/CSS/JS | Chromium AX API | NVDA, JAWS, Narrator |
| WPF/XAML | HIGH — XML-based | UI Automation (UIA) | Narrator, JAWS |
| PyQt/PySide | MEDIUM — imperative | QAccessible | NVDA, Narrator (Win), Orca (Linux) |
| wxWidgets/wxPython | MEDIUM — imperative | MSAAAccessible/AT-SPI2 | Platform-specific |
| GTK (Python) | MEDIUM | AT-SPI2 | Orca (Linux) |
| JavaFX | HIGH — FXML | Java Accessibility API | NVDA, Narrator |

---

## Electron Apps

**Treat as a web application.** Use the full web checklist from SKILL.md.

Additional Electron-specific checks:
- [ ] `app.setAccessibilitySupportEnabled(true)` is called (enables Chromium accessibility)
- [ ] Keyboard shortcuts don't conflict with screen reader shortcuts
- [ ] Native menus (`Menu.buildFromTemplate`) have proper labels
- [ ] Window titles are descriptive
- [ ] Custom titlebar (if used) has accessible controls

```javascript
# In main.js — check for this:
app.on('ready', () => {
  // Should have: accessibility support
})

# Bad — disabling accessibility:
app.commandLine.appendSwitch('disable-features', 'Accessibility')
```

**Key HTML/CSS checks for Electron (same as web):**
All WCAG 2.1 AA criteria apply. Focus on:
- All interactive elements keyboard-accessible
- ARIA attributes used correctly
- Focus management when opening modals/drawers
- Window focus when new windows open

---

## WPF / XAML (Windows)

XAML is declarative like Android XML — good viability for static analysis.

### Static Analysis — XAML Files

**Critical patterns:**

```xml
<!-- Bad — image without name -->
<Image Source="icon.png" />

<!-- Good -->
<Image Source="icon.png"
       AutomationProperties.Name="Settings icon"
       AutomationProperties.HelpText="Opens the settings dialog" />

<!-- Bad — button without name (relies only on visual) -->
<Button>
  <Image Source="close.png" />
</Button>

<!-- Good -->
<Button AutomationProperties.Name="Close window">
  <Image Source="close.png" />
</Button>

<!-- Bad — custom control without automation peer -->
<Canvas MouseLeftButtonDown="HandleClick" />

<!-- Good — use Button or add AutomationProperties -->
<Button Click="HandleClick" AutomationProperties.Name="Submit">
  <Canvas />
</Button>
```

**WPF AutomationProperties to check:**
- `AutomationProperties.Name` — accessible name (required for controls)
- `AutomationProperties.HelpText` — additional description
- `AutomationProperties.AcceleratorKey` — keyboard shortcut
- `AutomationProperties.AccessKey` — access key letter
- `AutomationProperties.AutomationId` — unique ID for automation
- `AutomationProperties.IsDialog` — marks dialog windows
- `AutomationProperties.LabeledBy` — associates label with control

---

## PyQt / PySide (Python)

Limited static analysis possible — code is imperative.

### Patterns to Search in Python Source

```python
# Check if accessibility names are set:
grep -r "setAccessibleName" src/
grep -r "setAccessibleDescription" src/
grep -r "setToolTip" src/

# These SHOULD exist for interactive widgets:
widget.setAccessibleName("Button label")
widget.setAccessibleDescription("Detailed description of what this does")
widget.setToolTip("Tooltip text")  # also used by screen readers

# Check for custom widgets implementing QAccessibleInterface:
# Look for classes inheriting QAccessibleWidget or QAccessibleInterface

# Bad — creating many widgets without labels:
button = QPushButton()  # no text, no accessible name
button.setIcon(QIcon("icon.png"))  # icon only, no label

# Good:
button = QPushButton("Submit")  # text serves as label
# OR:
button = QPushButton()
button.setIcon(QIcon("icon.png"))
button.setAccessibleName("Submit form")

# Check QLabel.setBuddy() for form fields:
label = QLabel("&Name:")
label.setBuddy(nameInput)  # links label to input — like <label for>
```

**PyQt accessible property methods:**
- `setAccessibleName(str)` — primary label (like aria-label)
- `setAccessibleDescription(str)` — longer description
- `setToolTip(str)` — tooltip (also read by some screen readers)
- `QLabel.setBuddy(widget)` — associates label with input

**Hard to detect statically in PyQt:**
- Tab order (set via `setTabOrder()`)
- Focus visibility (requires visual testing)
- Color contrast (requires rendering)

---

## wxWidgets / wxPython (Python)

Similar to PyQt — imperative, limited static analysis.

```python
# Search for:
grep -r "SetName\|SetHelpText\|wxAccessible" src/

# Good patterns:
control.SetName("Button label")
control.SetHelpText("Description of what this button does")

# Custom accessibility — look for wxAccessible subclass:
class MyAccessible(wx.Accessible):
    def GetName(self, childId):
        return (wx.ACC_OK, "Custom control name")

# For bitmap buttons (icon-only):
bmp_button = wx.BitmapButton(parent, bitmap=bmp)
bmp_button.SetName("Save file")  # required!
bmp_button.SetHelpText("Saves the current document")
```

---

## GTK (Python with PyGObject)

```python
# Check for:
widget.set_name("accessible-name")  # note: this is CSS name, not accessible name
# Proper accessible name in GTK:
atk_object = widget.get_accessible()
atk_object.set_name("Accessible label")
atk_object.set_description("Longer description")

# In Glade XML (.glade / .ui files):
# Check <accessibility> sections:
# <a11y:accessible-name>Button label</a11y:accessible-name>
```

---

## General Desktop Accessibility Principles

Regardless of framework, check:

1. **Keyboard navigation**
   - All interactive elements reachable by Tab key
   - Logical focus order (left-to-right, top-to-bottom or as makes sense)
   - Visible focus indicator (not just OS default which may be very subtle)
   - Keyboard shortcuts documented and conflict-free

2. **Labels and descriptions**
   - Every interactive widget has an accessible name
   - Icon-only buttons have text labels
   - Form fields have associated labels

3. **Screen reader compatibility**
   - Custom controls implement platform accessibility API
   - Status messages announced (live regions)
   - Dialog boxes announce their title when opened

4. **Visual requirements**
   - Text at least 12pt (ideally 14pt+)
   - Sufficient contrast (4.5:1 for normal text)
   - No color-only information
   - Scalable UI (high DPI support)

5. **Motion and timing**
   - No auto-advancing content without user control
   - Animations can be disabled (respect OS "reduce motion" settings)

---

## What Cannot Be Checked Statically for Desktop Apps

Always note in the report:
- Actual screen reader output (NVDA/JAWS/Narrator/Orca)
- Focus order in complex layouts
- Tab stop completeness
- Keyboard shortcut conflicts with screen readers
- Color contrast (requires visual rendering)
- Custom widget accessibility tree exposure
- High DPI scaling behavior
