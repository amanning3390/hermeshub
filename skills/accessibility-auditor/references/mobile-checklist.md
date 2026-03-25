# Mobile App Accessibility Checklist

## Important Note on Static vs Runtime Analysis

Static source code analysis (without running the app) can catch ~40-60% of issues.
The following ALWAYS require running the app + screen reader (TalkBack/VoiceOver):
- Actual screen reader announcement accuracy
- Color contrast (requires rendering)
- Touch target size in dp (requires layout computation)
- Focus traversal order
- Dynamic content announcements
- Custom component behavior
- Gesture conflicts

Always state clearly in the report what was and wasn't testable.

---

## Android (XML Layouts + Kotlin/Java)

### Static Analysis — XML Layouts

Search for these patterns in `res/layout/*.xml` files:

**Critical**
- [ ] `<ImageView>` without `android:contentDescription` attribute
- [ ] `<ImageButton>` without `android:contentDescription`
- [ ] `android:contentDescription=""` (empty = decorative, verify intent)
- [ ] `android:importantForAccessibility="no"` on interactive elements
- [ ] `android:importantForAccessibility="noHideDescendants"` hiding UI sections
- [ ] `<EditText>` / `<TextInputEditText>` without `android:hint` or `android:labelFor`
- [ ] `android:focusable="false"` on elements that should be focused
- [ ] Clickable views (`android:clickable="true"`) without content description

**Warning**
- [ ] Custom views without `android:contentDescription`
- [ ] `<TextView>` with image content but no text alternative
- [ ] Missing `android:accessibilityLiveRegion` on dynamic content areas
- [ ] `<WebView>` without accessible content description

**Code to look for in Kotlin/Java**
```
# Good patterns (should exist):
setContentDescription("...")
ViewCompat.setAccessibilityHeading(view, true)
setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_YES)
AccessibilityNodeInfoCompat.setRoleDescription(...)

# Bad patterns (flag these):
setContentDescription(null)
setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO)
setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS)
```

### Key Android Accessibility Attributes

| Attribute | Purpose | Equivalent |
|-----------|---------|-----------|
| `android:contentDescription` | Primary spoken text | alt text in HTML |
| `android:labelFor` | Links label to input field | `<label for>` in HTML |
| `android:hint` | Placeholder for EditText | placeholder in HTML |
| `android:focusable` | Can receive keyboard/D-pad focus | tabindex in HTML |
| `android:importantForAccessibility` | Include/exclude from accessibility | aria-hidden |
| `android:accessibilityLiveRegion` | Dynamic content announcements | aria-live |

### Android Lint Checks (run in CI)
```bash
./gradlew lint
# Key rules that check accessibility:
# - ContentDescription (ImageView missing desc)
# - ClickableViewAccessibility
# - LabelFor (EditText without label)
# - KeyboardInaccessibleWidget
```

---

## iOS (Swift / SwiftUI / Objective-C)

### Static Analysis — Swift/SwiftUI

**Critical patterns to find:**

```swift
# Bad — image without accessibility:
Image("icon")
UIImageView(image: UIImage(named: "icon"))  # without accessibilityLabel

# Good:
Image("icon").accessibilityLabel("Description of what icon does")
imageView.accessibilityLabel = "Description"

# Bad — interactive element hidden from VoiceOver:
Button { action() } label: { ... }
    .accessibilityHidden(true)   # CRITICAL if button is interactive

# Bad — generic interactive element without label:
Button { action() } label: { Image(systemName: "plus") }
# Missing: .accessibilityLabel("Add item")

# Good patterns to look for:
.accessibilityLabel(Text("..."))
.accessibilityHint(Text("..."))
.accessibilityValue(Text("..."))
.accessibilityRole(.button)
.accessibilityElement(children: .combine)
.accessibilityAddTraits(.isHeader)
```

**Check for these SwiftUI accessibility modifiers:**
- `.accessibilityLabel()` — primary spoken text
- `.accessibilityHint()` — describes what will happen
- `.accessibilityValue()` — current value (sliders, etc.)
- `.accessibilityRole()` — semantic role
- `.accessibilityHidden()` — use carefully, only for decorative
- `.accessibilityElement(children:)` — group children

**iOS Accessibility Properties (UIKit):**
- `accessibilityLabel: String?` — what VoiceOver reads
- `accessibilityHint: String?` — action description
- `accessibilityTraits: UIAccessibilityTraits` — .button, .header, .link, .image
- `isAccessibilityElement: Bool` — include/exclude from VoiceOver
- `accessibilityViewIsModal: Bool` — for modal dialogs

### Xcode XCTest Audit (Xcode 15+)
```swift
func testAccessibility() throws {
    let app = XCUIApplication()
    app.launch()
    try app.performAccessibilityAudit()
}
// Checks: missing labels, contrast, hit region size, element detection
```

---

## Flutter (Dart)

### Static Analysis — Dart/Flutter

**Critical patterns to detect:**

```dart
# Bad — image without semantics:
Image.asset('assets/icon.png')
Image.network('https://example.com/icon.png')
# Should have semanticLabel or Semantics wrapper

# Good:
Image.asset('assets/icon.png', semanticLabel: 'App logo')
Semantics(
  label: 'Profile picture of John Doe',
  child: Image.asset('assets/profile.png'),
)

# Bad — gesture without accessible label:
GestureDetector(
  onTap: () { ... },
  child: Icon(Icons.add),
)
# Missing Semantics wrapper

# Good:
Semantics(
  label: 'Add item',
  button: true,
  child: GestureDetector(
    onTap: () { ... },
    child: Icon(Icons.add),
  ),
)

# Bad — hiding important content:
ExcludeSemantics(child: importantWidget)

# Check for missing semanticLabel on:
Icon(Icons.close)  # needs Semantics or Tooltip
```

**Flutter Semantics properties:**
- `label` — spoken text
- `hint` — action description
- `value` — current value
- `button` / `header` / `image` / `link` — semantic role flags
- `enabled` / `checked` / `selected` — state
- `onTap` / `onLongPress` — accessible actions
- `excludeSemantics` — use carefully

**Search patterns:**
```
Image.asset( → check for semanticLabel or Semantics wrapper
Image.network( → check for semanticLabel or Semantics wrapper
GestureDetector( → check for Semantics wrapper
Icon( → check for Semantics or Tooltip
ExcludeSemantics( → verify it's only used for decorative content
```

---

## React Native (JavaScript/TypeScript)

### Static Analysis — JS/TSX Files

**Critical patterns:**

```jsx
# Bad — image without label:
<Image source={{uri: 'https://...'}} />

# Good:
<Image
  source={{uri: 'https://...'}}
  accessible={true}
  accessibilityLabel="Description of the image"
/>

# Bad — touchable without label:
<TouchableOpacity onPress={handlePress}>
  <Image source={icon} />
</TouchableOpacity>

# Good:
<TouchableOpacity
  onPress={handlePress}
  accessible={true}
  accessibilityLabel="Open settings"
  accessibilityRole="button"
>
  <Image source={icon} />
</TouchableOpacity>

# Bad — wrong role:
<View accessibilityRole="button" onPress={handlePress}>

# Bad — nested touchables (accessibility trap):
<TouchableOpacity>
  <TouchableOpacity>  ← problematic nesting
  </TouchableOpacity>
</TouchableOpacity>
```

**React Native accessibility props:**
- `accessible` — marks element as accessible unit
- `accessibilityLabel` — spoken text
- `accessibilityHint` — action description
- `accessibilityRole` — button, header, image, link, text, etc.
- `accessibilityState` — {disabled, selected, checked, busy, expanded}
- `accessibilityValue` — {min, max, now, text}
- `accessibilityLiveRegion` — none, polite, assertive
- `importantForAccessibility` — Android only: yes, no, no-hide-descendants

**ESLint plugin to recommend:**
`eslint-plugin-react-native-a11y` — catches many of these statically

---

## What Always Requires Runtime Testing

For ALL mobile platforms, state in the report:

1. **Screen reader testing** — TalkBack (Android) or VoiceOver (iOS)
   - Actual announcement text
   - Reading order
   - Swipe gesture navigation
   - Announcement of dynamic changes

2. **Color contrast** — cannot be determined from source code alone
   - Use Android Accessibility Scanner or iOS Color Contrast Calculator

3. **Touch target sizes**
   - Android: minimum 48x48dp
   - iOS: minimum 44x44pt
   - Flutter: check MediaQuery but layout math needed

4. **Custom component behavior** — runtime only
5. **Animation and motion** — runtime only
6. **Localization of accessibility strings** — verify in strings.xml / Localizable.strings
