# Accessibility Testing Tools Reference

## Web Tools

### Automated Scanners
| Tool | Type | Usage |
|------|------|-------|
| axe-core (Deque) | Browser extension / JS lib | Best-in-class, ~57% issue coverage |
| WAVE (WebAIM) | Browser extension / API | Visual overlay, good for beginners |
| Lighthouse | CLI / Chrome DevTools | Google's built-in, accessibility score |
| pa11y | Node.js CLI | `pa11y https://example.com` |
| IBM Equal Access Checker | Node.js CLI | `accessibility-checker` npm package |

### Browser Extensions
- **axe DevTools** (Chrome/Firefox) — most accurate automated scanner
- **WAVE** (Chrome/Firefox) — visual accessibility overlay
- **Accessibility Insights** (Chrome) — Microsoft, includes guided manual tests
- **HeadingsMap** — visualizes heading structure

### Manual Testing Tools
- **NVDA** (Windows, free) — most popular screen reader for testing
- **JAWS** (Windows, paid) — professional screen reader
- **Narrator** (Windows built-in) — basic screen reader
- **VoiceOver** (macOS/iOS built-in) — native Apple screen reader
- **TalkBack** (Android built-in) — native Android screen reader
- **Orca** (Linux, free) — GNOME screen reader

### Contrast Checkers
- **Colour Contrast Analyser** (TPGi, desktop app, free)
- **WebAIM Contrast Checker** — https://webaim.org/resources/contrastchecker/
- **Accessible Colors** — https://accessible-colors.com/

### Keyboard Testing
- Just a keyboard! Tab through everything manually
- **Accessibility Insights FastPass** — step-by-step keyboard check

---

## Android Tools

| Tool | Type | How to Use |
|------|------|-----------|
| Android Lint | Static analysis (no device) | `./gradlew lint` in project |
| Accessibility Test Framework (ATF) | Unit test integration | Add to Espresso tests |
| Accessibility Scanner (Google) | Device app | Run on physical device or emulator |
| TalkBack | Screen reader | Enable in Android Settings |
| axe DevTools Mobile | Paid tool | Enterprise testing |

### Android Lint Command
```bash
# Run in Android project root:
./gradlew lint

# Or for specific module:
./gradlew :app:lint

# Check HTML report at:
app/build/reports/lint-results.html

# Key lint checks for accessibility:
# ContentDescription, ClickableViewAccessibility, LabelFor,
# KeyboardInaccessibleWidget, GetContentDescriptionOverride
```

### Accessibility Test Framework (ATF) Integration
```kotlin
// In your Espresso test:
@RunWith(AndroidJUnit4::class)
class AccessibilityTest {
    @Rule
    @JvmField
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Before
    fun setup() {
        AccessibilityChecks.enable()
            .setRunChecksFromRootView(true)
    }

    @Test
    fun testMainScreenAccessibility() {
        // ATF runs automatically on all Espresso interactions
        onView(withId(R.id.button)).perform(click())
    }
}
```

---

## iOS Tools

| Tool | Type | How to Use |
|------|------|-----------|
| Accessibility Inspector | Xcode GUI tool | Window > Developer Tools > Accessibility Inspector |
| XCTest performAccessibilityAudit() | Code (Xcode 15+) | See code example below |
| AccessibilitySnapshot (CashApp) | Testing library | Snapshot testing for a11y tree |
| VoiceOver | Screen reader | Settings > Accessibility > VoiceOver |
| SwiftLint | Static analysis | `swiftlint` CLI, add custom rules |

### XCTest Accessibility Audit (Xcode 15+)
```swift
import XCTest

class AccessibilityTests: XCTestCase {
    func testAccessibility() throws {
        let app = XCUIApplication()
        app.launch()

        // Audit entire app:
        try app.performAccessibilityAudit()

        // Audit specific types:
        try app.performAccessibilityAudit(for: [
            .contrast,
            .elementDetection,
            .hitRegion,
            .sufficientElementSize,
            .textClipping
        ])
    }
}
```

---

## Flutter Tools

| Tool | Type | Usage |
|------|------|-------|
| accessibility_lints | pub.dev package | Static analysis in `analysis_options.yaml` |
| flutter_accessibility_checker | pub.dev package | Runtime widget checks |
| SemanticsDebugger | Built-in widget | Visual debug overlay |
| flutter_test semantics | Built-in | Widget tests with semantics |

### Flutter Semantic Testing
```dart
testWidgets('has correct semantics', (WidgetTester tester) async {
  final semantics = tester.getSemantics(find.byType(MyButton));

  expect(semantics.label, 'Submit form');
  expect(semantics.hasTapAction, true);
  expect(semantics.isButton, true);
});
```

---

## React Native Tools

| Tool | Type | Usage |
|------|------|-------|
| eslint-plugin-react-native-a11y | Static analysis | Add to ESLint config |
| eslint-plugin-jsx-a11y | Static analysis | For JSX accessibility |
| React Native Accessibility | Built-in testing | AccessibilityInfo API |
| TalkBack / VoiceOver | Screen readers | Device testing |

### ESLint Setup
```json
// .eslintrc.json
{
  "plugins": ["react-native-a11y"],
  "extends": ["plugin:react-native-a11y/recommended"]
}
```

---

## Windows Desktop Tools

| Tool | Type | Usage |
|------|------|-------|
| axe-windows (Microsoft) | CLI / .NET API | `AxeWindowsCLI.exe --processid <pid>` |
| Accessibility Insights for Windows | GUI + CLI | accessibilityinsights.io |
| Inspect.exe | GUI | Windows SDK, inspects UIA tree |
| AccEvent.exe | GUI | Windows SDK, monitors accessibility events |
| NVDA | Screen reader | Free, download from nvaccess.org |
| Narrator | Screen reader | Built into Windows |

### axe-windows CLI
```powershell
# Install:
dotnet tool install -g AxeWindowsCLI

# Run against running app:
AxeWindowsCLI --processid 1234

# Run and save JSON report:
AxeWindowsCLI --processid 1234 --outputdirectory C:\reports
```

---

## Linux Desktop Tools

| Tool | Type | Usage |
|------|------|-------|
| accerciser | GUI inspector | AT-SPI2 tree inspector, `apt install accerciser` |
| pyatspi | Python library | Programmatic AT-SPI2 inspection |
| dogtail | Python library | UI testing via AT-SPI2 |
| Orca | Screen reader | GNOME screen reader |

---

## CI/CD Integration

### Web
- **Axe GitHub Action**: `dequelabs/axe-core-npm/packages/cli`
- **pa11y-ci**: `pa11y-ci --config pa11y.json`
- **AccessLint**: GitHub App, comments on PRs
- **Lighthouse CI**: `@lhci/cli`

### Android
```yaml
# In GitHub Actions:
- name: Run Lint
  run: ./gradlew lint

- name: Upload Lint Report
  uses: actions/upload-artifact@v3
  with:
    name: lint-report
    path: app/build/reports/lint-results-debug.html
```

### iOS
```yaml
# Run XCTest accessibility audits:
- name: Run Accessibility Tests
  run: xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15'
```
