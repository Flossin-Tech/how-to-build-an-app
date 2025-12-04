---
title: "Accessible Design"
phase: "02-design"
topic: "accessible-design"
depth: "deep-water"
reading_time: 55
prerequisites: ["frontend-architecture", "accessible-design-mid-depth"]
related_topics: ["frontend-architecture", "error-handling-resilience", "security-testing", "automated-testing"]
personas: ["specialist-expanding"]
updated: "2025-12-04"
---

# Accessible Design

## Comprehensive WCAG 2.2 AA Compliance

WCAG 2.2 includes 86 success criteria total: 30 at Level A, 20 additional at Level AA (50 total for AA compliance), and 36 additional at Level AAA. This section covers the complete Level AA requirements and how to verify compliance.

### Complete WCAG 2.2 Level AA Criteria

**Perceivable (29 criteria total, 10 at AA)**

Level A:
- 1.1.1: Non-text Content
- 1.2.1: Audio-only and Video-only (Prerecorded)
- 1.2.2: Captions (Prerecorded)
- 1.2.3: Audio Description or Media Alternative (Prerecorded)
- 1.3.1: Info and Relationships
- 1.3.2: Meaningful Sequence
- 1.3.3: Sensory Characteristics
- 1.4.1: Use of Color
- 1.4.2: Audio Control

Level AA:
- 1.2.4: Captions (Live)
- 1.2.5: Audio Description (Prerecorded)
- 1.3.4: Orientation
- 1.3.5: Identify Input Purpose
- 1.4.3: Contrast (Minimum) - 4.5:1 normal, 3:1 large
- 1.4.4: Resize Text - 200% without loss of function
- 1.4.5: Images of Text - Use real text, not images
- 1.4.10: Reflow - 320px viewport without horizontal scroll
- 1.4.11: Non-text Contrast - 3:1 for UI components
- 1.4.12: Text Spacing - User can adjust without loss
- 1.4.13: Content on Hover or Focus - Dismissible, hoverable, persistent

**Operable (30 criteria total, 12 at AA)**

Level A:
- 2.1.1: Keyboard
- 2.1.2: No Keyboard Trap
- 2.1.4: Character Key Shortcuts
- 2.2.1: Timing Adjustable
- 2.2.2: Pause, Stop, Hide (moving content)
- 2.3.1: Three Flashes or Below Threshold
- 2.4.1: Bypass Blocks
- 2.4.2: Page Titled
- 2.4.3: Focus Order
- 2.4.4: Link Purpose (In Context)
- 2.5.1: Pointer Gestures - Single pointer alternative
- 2.5.2: Pointer Cancellation
- 2.5.3: Label in Name
- 2.5.4: Motion Actuation

Level AA:
- 2.4.5: Multiple Ways (to find pages)
- 2.4.6: Headings and Labels
- 2.4.7: Focus Visible
- 2.4.11: Focus Not Obscured (Minimum) - New in 2.2
- 2.5.7: Dragging Movements - New in 2.2
- 2.5.8: Target Size (Minimum) - 24×24px - New in 2.2

**Understandable (17 criteria total, 6 at AA)**

Level A:
- 3.1.1: Language of Page
- 3.2.1: On Focus
- 3.2.2: On Input
- 3.2.6: Consistent Help - New in 2.2
- 3.3.1: Error Identification
- 3.3.2: Labels or Instructions
- 3.3.7: Redundant Entry - New in 2.2

Level AA:
- 3.1.2: Language of Parts
- 3.2.3: Consistent Navigation
- 3.2.4: Consistent Identification
- 3.3.3: Error Suggestion
- 3.3.4: Error Prevention (Legal, Financial, Data)
- 3.3.8: Accessible Authentication (Minimum) - New in 2.2

**Robust (3 criteria, 1 at AA)**

Level A:
- 4.1.2: Name, Role, Value

Level AA:
- 4.1.3: Status Messages

Note: 4.1.1 Parsing was removed in WCAG 2.2 as obsolete due to modern browser capabilities.

### WCAG 2.2 New Success Criteria Deep Dive

**2.4.11: Focus Not Obscured (Minimum) - Level AA**

When a UI component receives keyboard focus, at least part of the focus indicator must remain visible. Sticky headers, chat widgets, cookie banners, and overlays often obscure focused elements.

```css
/* Problem: Sticky header obscures focus */
header {
  position: fixed;
  top: 0;
  z-index: 100;
}

/* Solution: Scroll padding prevents content hiding under header */
html {
  scroll-padding-top: 80px; /* Header height */
}

/* Or: Adjust z-index so focus indicators appear above header */
:focus {
  position: relative;
  z-index: 101; /* Above sticky header */
}
```

Level AAA enhancement (2.4.12): Entire focus indicator must be visible, not just part of it.

**2.5.7: Dragging Movements - Level AA**

All drag-and-drop functionality must have a single-pointer alternative that doesn't require dragging.

```html
<!-- Bad: Drag-only reordering -->
<ul class="sortable-list">
  <li draggable="true">Item 1</li>
  <li draggable="true">Item 2</li>
</ul>

<!-- Good: Drag with keyboard and button alternatives -->
<ul class="sortable-list">
  <li draggable="true">
    <span>Item 1</span>
    <button aria-label="Move item 1 up">↑</button>
    <button aria-label="Move item 1 down">↓</button>
  </li>
  <li draggable="true">
    <span>Item 2</span>
    <button aria-label="Move item 2 up">↑</button>
    <button aria-label="Move item 2 down">↓</button>
  </li>
</ul>
```

Examples of compliant alternatives:
- Click to select, click destination to move
- Arrow keys for keyboard reordering
- Up/down buttons for list reordering
- Number input to specify position

**2.5.8: Target Size (Minimum) - Level AA**

Interactive targets must be at least 24×24 CSS pixels. Previous AAA requirement was 44×44px (2.5.5).

```css
/* Minimum target size */
button,
a,
input,
select {
  min-width: 24px;
  min-height: 24px;
}

/* Recommended: Larger for better usability */
button,
a.button {
  min-width: 44px;
  min-height: 44px;
}

/* Exception: Inline links in paragraphs don't need minimum size */
p a {
  /* No minimum size required */
}
```

Exceptions exist for inline text links, equivalent alternatives, user agent controlled elements, and when presentation is essential.

**3.2.6: Consistent Help - Level A**

If help mechanisms appear (contact, chat, FAQ, phone), they must be in the same relative order on every page.

```html
<!-- Good: Footer appears consistently across site -->
<footer>
  <nav aria-label="Help resources">
    <a href="/help">Help Center</a>
    <a href="/contact">Contact Us</a>
    <a href="/faq">FAQ</a>
  </nav>
</footer>
```

**3.3.7: Redundant Entry - Level A**

Don't ask users to enter the same information twice in a single process unless necessary for security or confirmation.

```html
<!-- Bad: Re-entering shipping address for billing -->
<input name="shipping-address" />
<!-- Later in form -->
<input name="billing-address" />

<!-- Good: Checkbox to copy address -->
<input name="shipping-address" />
<label>
  <input type="checkbox" onchange="copyAddress()">
  Billing address same as shipping
</label>
<input name="billing-address" />
```

Auto-fill previously entered information. Provide checkboxes to copy data. Use browser autocomplete attributes.

**3.3.8: Accessible Authentication (Minimum) - Level AA**

Don't require cognitive function tests for authentication. CAPTCHAs with distorted text, memory tests, and puzzle-solving fail this criterion.

```html
<!-- Bad: Cognitive function test -->
<label>Type the characters you see:</label>
<img src="distorted-captcha.png" alt="CAPTCHA">
<input type="text">

<!-- Good: Alternatives -->
<!-- 1. Email magic link -->
<p>We've sent a login link to your email</p>

<!-- 2. SMS code -->
<label>Enter code sent to your phone:</label>
<input type="text" autocomplete="one-time-code">

<!-- 3. Biometric authentication -->
<button onclick="authenticateWithBiometric()">
  Use Face ID / Touch ID
</button>

<!-- 4. Password manager support -->
<input type="password" autocomplete="current-password">

<!-- 5. Object recognition (simpler than distorted text) -->
<p>Select all images containing traffic lights</p>
```

## Legal and Regulatory Landscape

Understanding legal requirements helps prioritize accessibility work and prepare for audits.

### United States

**ADA Title II (State and Local Government) - Final Rule April 2024**

Standard: WCAG 2.1 Level AA mandatory

Deadlines:
- April 24, 2026: Large entities (50+ employees or 50,000+ population)
- April 26, 2027: Small entities (under 50 employees or under 50,000 population)

Scope: All public-facing websites, mobile apps, and digital services

Exceptions:
- Archived content (not updated since compliance date)
- Pre-existing documents (created before compliance date)
- Some third-party content (if entity doesn't control it)
- Content that would fundamentally alter the service

Penalties: No private right of action for money damages, but DOJ enforcement possible, consent decrees, and monitoring requirements.

**ADA Title III (Private Businesses) - No Final Rule Yet**

Standard: WCAG 2.1 Level AA (de facto via court precedent)

Status: DOJ withdrew proposed Title III rulemaking in 2024. Courts apply WCAG 2.1 AA as the standard through case law. No federal deadline, but 8,800+ lawsuits filed in 2024 establish ongoing risk.

Industries most targeted:
- Retail and eCommerce
- Food service and restaurants
- Hotels and hospitality
- Healthcare
- Financial services
- Entertainment and media

Litigation costs: $50,000-$500,000 on average. 48% of 2024 lawsuits were against repeat offenders who hadn't remediated from previous suits.

**Section 508 (Federal Government) - Revised January 2017**

Standard: WCAG 2.0 Level AA (harmonized with international standards)

Applies to: All federal agencies, contractors providing digital services to federal agencies

Enforcement: Required for federal procurement. Non-compliant vendors excluded from contracts.

Note: Many agencies are moving to WCAG 2.1 voluntarily. Future updates expected to mandate 2.1 or 2.2.

### European Union

**European Accessibility Act (EAA) - Effective June 28, 2025**

Standard: WCAG 2.1 Level AA minimum (EN 301 549 standard incorporates WCAG)

Scope:
- Banking and financial services
- eCommerce platforms
- Telecommunication services
- Transportation booking systems
- eBooks and reading apps
- Audiovisual media services

Enforcement: Member states implement national enforcement. Penalties up to €100,000 per violation in some jurisdictions.

Timeline:
- June 28, 2025: Compliance deadline for new products/services
- June 28, 2030: Grace period for some existing services

Exemptions: Microenterprises (under 10 employees, under €2M annual revenue) may claim disproportionate burden exemption with justification.

### International

**Canada**

- Federal: Accessible Canada Act (ACA), WCAG 2.0 AA standard
- Provincial: AODA (Ontario) requires WCAG 2.0 AA for public and large private sector

**United Kingdom**

- Public Sector: EN 301 549 (incorporates WCAG 2.1 AA) required since 2020
- Private Sector: Equality Act 2010 applies but no specific digital standard mandated

**Australia**

- Disability Discrimination Act 1992 applies
- WCAG 2.1 AA is the referenced standard
- Government sites must comply under Digital Service Standard

## Advanced Testing Methodologies

Point-in-time audits provide a snapshot but organizations spend 80%+ of time below compliance between audits. Comprehensive testing requires automation, manual expert testing, and user testing.

### Phase 1: Pre-Audit Planning

**Scope Definition**

Select representative pages covering all templates and patterns:
- Homepage
- Main navigation pages (about, contact, services)
- Interactive features (forms, search, checkout)
- Content pages (articles, documentation)
- Account flows (signup, login, profile)
- Error states and edge cases

Minimum: 7-15 pages for small sites, 20-30 for large applications

**Standard Selection**

Choose WCAG version:
- WCAG 2.1 AA: Current legal standard (US government, most courts)
- WCAG 2.2 AA: Future-proof, adds 9 criteria, slight overhead
- Recommendation: Target 2.2 for new development

**Environment Setup**

- Test on staging/production-like environment
- Ensure representative content (not lorem ipsum)
- Test with real user data where possible
- Document browser/assistive technology combinations

### Phase 2: Automated Assessment

Automated tools catch 20-30% of WCAG issues. They're fast and catch low-hanging fruit.

**Tool Comparison**

| Tool | Coverage | False Positives | Integration | Cost |
|------|----------|-----------------|-------------|------|
| axe DevTools | 84% of detectable issues | Very low | Browser extension, CLI | Free extension, paid Pro |
| WAVE | ~50 checks | Low | Browser extension, API | Free extension, paid API |
| Lighthouse | Basic (~30 checks) | Low | Chrome DevTools | Free |
| Pa11y CI | Configurable (axe-core) | Low | CLI, CI/CD | Free |
| Accessibility Insights | Comprehensive WCAG 2.1 | Low | Desktop app, extension | Free |

**Pa11y CI Integration**

```bash
# Install
npm install -g pa11y-ci

# Create .pa11yci.json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 60000,
    "wait": 1000,
    "chromeLaunchConfig": {
      "args": ["--no-sandbox"]
    },
    "ignore": [
      "warning",
      "notice"
    ]
  },
  "urls": [
    "https://example.com",
    "https://example.com/about",
    "https://example.com/products",
    "https://example.com/contact",
    "https://example.com/signup"
  ]
}

# Run in CI pipeline
pa11y-ci --json > accessibility-report.json

# Fail build on violations
if [ $(jq 'length' accessibility-report.json) -gt 0 ]; then
  echo "Accessibility violations found"
  exit 1
fi
```

**GitHub Actions Example**

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [pull_request]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm start &

      - name: Wait for application
        run: npx wait-on http://localhost:3000

      - name: Install Pa11y CI
        run: npm install -g pa11y-ci

      - name: Run accessibility tests
        run: pa11y-ci --json > accessibility-report.json

      - name: Upload report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-report
          path: accessibility-report.json

      - name: Fail on violations
        run: |
          violations=$(jq 'length' accessibility-report.json)
          if [ $violations -gt 0 ]; then
            echo "$violations accessibility violations found"
            jq '.' accessibility-report.json
            exit 1
          fi
```

### Phase 3: Manual Expert Testing

Manual testing is required for 30% of WCAG criteria that can't be automated. This includes context-dependent checks and subjective evaluation.

**Keyboard Navigation Testing**

Systematic testing of all interactive patterns:

1. **Tab Order**
   - Tab through entire page
   - Verify order matches visual layout
   - Check for unexpected jumps
   - Document any illogical sequences

2. **Focus Indicators**
   - Verify visible on all elements (3:1 contrast minimum)
   - Check visibility at 200% zoom
   - Test in high contrast mode
   - Verify not obscured by sticky elements

3. **Keyboard Traps**
   - Test all modals/dialogs
   - Test all custom controls
   - Verify Escape key closes dismissible elements
   - Check focus returns correctly

4. **Skip Links**
   - Tab to skip link as first focusable element
   - Activate and verify focus moves to main content
   - Check skip link visibility when focused

5. **Interactive Components**
   - Forms: Tab through, submit with Enter
   - Buttons: Activate with Enter and Space
   - Links: Activate with Enter only
   - Custom controls: Arrow keys, Home, End, etc.

**Screen Reader Testing**

Screen readers are how blind users access the web. Testing requires learning basic commands.

**NVDA (Windows) Basic Commands:**
- NVDA key: Insert or Caps Lock
- Start reading: NVDA+Down Arrow
- Stop reading: Control
- Next item: Down Arrow
- Previous item: Up Arrow
- Next heading: H
- Next landmark: D
- Forms mode: Automatically enters on form fields
- Navigate by element type: NVDA+F7 (elements list)

**VoiceOver (macOS) Basic Commands:**
- VO key: Control+Option
- Start reading: VO+A
- Stop reading: Control
- Next item: VO+Right Arrow
- Previous item: VO+Left Arrow
- Rotor (element navigation): VO+U
- Web rotor headings: VO+Command+H

**Testing Checklist:**

1. **Page Structure**
   - Headings logical and descriptive
   - Landmarks announced correctly (<nav>, <main>, etc.)
   - Skip links announce and function
   - Language specified and announced

2. **Forms**
   - All fields have clear labels
   - Required fields announced
   - Field purpose clear without seeing screen
   - Error messages announced immediately
   - Error suggestions provided

3. **Interactive Elements**
   - Buttons announce role and name
   - Links announce destination
   - Current page marked in navigation
   - Expanded/collapsed states announced
   - Dynamic content changes announced

4. **Images and Media**
   - Alt text conveys image purpose
   - Decorative images ignored
   - Charts/graphs have long descriptions
   - Video captions available

5. **Dynamic Content**
   - Loading states announced
   - Success/error messages announced
   - Content updates don't lose context
   - Focus management on view changes

**Screen Reader Market Share (WebAIM 2024 Survey):**
- JAWS: 40.5% primary desktop usage (enterprise standard)
- NVDA: 38.2% primary desktop usage (free, growing)
- VoiceOver: 9.7% desktop, 70.6% mobile
- TalkBack: Primary on Android (no specific percentage)

Priority: Test with NVDA on Windows (Chrome browser) and VoiceOver on macOS (Safari browser). Mobile testing requires real devices.

**Mobile Testing**

Mobile screen readers work differently than desktop versions. Test on actual devices, not emulators.

iOS VoiceOver:
- Enable: Settings > Accessibility > VoiceOver
- Navigate: Swipe right/left
- Activate: Double-tap
- Rotor: Rotate two fingers
- Test portrait and landscape orientations

Android TalkBack:
- Enable: Settings > Accessibility > TalkBack
- Navigate: Swipe right/left
- Activate: Double-tap
- Global context menu: Swipe down then right
- Test on different Android versions (varies by manufacturer)

**Visual Testing**

1. **Zoom Testing**
   - Browser zoom to 200% (WCAG 2.1 AA)
   - Verify no horizontal scroll
   - Check functionality intact
   - Test at 400% (AAA aspirational)

2. **Color Contrast**
   - Use WebAIM Contrast Checker
   - Test all text/background combinations
   - Include hover/focus/active states
   - Verify 4.5:1 normal, 3:1 large
   - Check non-text contrast (UI elements) 3:1

3. **High Contrast Mode**
   - Windows: Settings > Ease of Access > High Contrast
   - macOS: Settings > Accessibility > Display > Increase Contrast
   - Verify all content visible
   - Check custom colors don't break layout

4. **Color Blindness Simulation**
   - Use browser DevTools (Chrome: Rendering tab)
   - Test protanopia (red-blind)
   - Test deuteranopia (green-blind)
   - Test tritanopia (blue-blind)
   - Verify meaning not lost without color

### Phase 4: User Testing with People with Disabilities

User testing reveals issues automated and manual testing miss. Real users uncover unexpected barriers.

**Recruitment**

Recruit 3-5 testers per disability category:
- Blind or low vision users (screen reader users)
- Deaf or hard of hearing users (caption users)
- Motor disability users (keyboard-only, switch users)
- Cognitive disability users (need for clarity)

Compensation: Pay participants fairly ($75-150/hour typical)

Platforms: Access Works, Fable, User Testing (accessibility panel)

**Testing Protocol**

1. **Allow participants to use their own assistive technology**
   - Don't prescribe specific tools
   - Let them use familiar configurations
   - Observe real-world usage patterns

2. **Task-based testing**
   - Define 3-5 realistic tasks
   - Example: "Create an account and add an item to cart"
   - Don't provide step-by-step instructions
   - Let participants struggle (reveals real issues)

3. **Think-aloud protocol**
   - Ask participants to narrate their experience
   - "What do you expect to happen?"
   - "What's confusing about this?"
   - "What would make this easier?"

4. **Document barriers**
   - Note where participants get stuck
   - Record unexpected navigation patterns
   - Identify workarounds they use
   - Ask about severity (annoying vs. blocking)

**Key Insight:** Users with disabilities often develop sophisticated workarounds for inaccessible patterns. Just because they complete a task doesn't mean it was accessible - ask about friction points.

## VPAT and ACR Creation

VPATs (Voluntary Product Accessibility Templates) document how products meet accessibility standards. When completed with test results, they become ACRs (Accessibility Conformance Reports).

### What Is a VPAT?

Created by the Information Technology Industry Council (ITI), VPATs are free standardized templates that translate accessibility requirements into testable criteria. They're market requirements for B2B sales to enterprise and government.

**VPAT 2.5 Editions (Current as of 2024):**

- **VPAT 2.5 WCAG:** WCAG 2.x conformance (most common)
- **VPAT 2.5 EU:** EN 301 549 European standard
- **VPAT 2.5 508:** Section 508 US federal compliance
- **VPAT 2.5 INT:** Combined (all three standards)

Download templates: https://www.itic.org/policy/accessibility/vpat

### VPAT Structure

**Section 1: Product Information**
- Product name and version
- Report date and version
- Product description
- Contact information
- Evaluation methods (automated tools, manual testing, user testing)
- Standards and guidelines (WCAG 2.1 AA, WCAG 2.2 AA, etc.)

**Section 2: Conformance Summary**

Overall conformance claim:
- **Supports:** All criteria fully met
- **Supports with Exceptions:** Some criteria have minor issues
- **Partially Supports:** Some criteria have significant issues
- **Does Not Support:** Criteria not met
- **Not Applicable:** Criteria don't apply to product

Example:
```
WCAG 2.1 Level A: Supports with Exceptions
WCAG 2.1 Level AA: Partially Supports
```

**Section 3: Criterion-by-Criterion Evaluation**

For each WCAG success criterion:
- Conformance level (Supports, Partially Supports, Does Not Support, N/A)
- Remarks and explanations (detailed findings)

Example entry:
```
1.4.3 Contrast (Minimum) - Level AA

Conformance Level: Partially Supports

Remarks: Most text meets 4.5:1 contrast ratio. Two exceptions:
1. Placeholder text in forms uses #999 on white background (2.8:1) - fails
2. Success notification uses #4CAF50 on white background (2.1:1) - fails

Remediation planned for Q2 2025 release.
```

### VPAT Development Process

**Step 1: Conduct Comprehensive Audit**

Use all three testing phases:
- Automated testing across all pages
- Manual keyboard and screen reader testing
- Visual testing (contrast, zoom, color blindness)
- User testing with people with disabilities (ideal but not always feasible)

**Step 2: Document Findings Systematically**

Create spreadsheet mapping:
- WCAG criterion number and name
- Conformance level for your product
- Specific pages/features tested
- Pass/fail for each criterion
- Evidence (screenshots, screen reader output)
- Notes for remediation

**Step 3: Assign Conformance Levels**

Criterion-level guidance:
- **Supports:** Criterion fully met across entire product
- **Partially Supports:** Some instances pass, some fail
- **Does Not Support:** Criterion consistently fails
- **Not Applicable:** Product doesn't have relevant functionality (e.g., no video = 1.2.x N/A)

Be honest. "Partially Supports" is common and expected. Claiming full support when issues exist damages credibility and creates legal risk.

**Step 4: Write Clear Explanations**

Good remarks:
- Specific about what works and what doesn't
- Reference concrete examples
- Explain impact on users
- Provide remediation timelines when possible

```
Good:
"Forms on checkout page have properly associated labels. Contact form
labels use placeholder attribute instead of <label> element, causing
screen readers not to announce field purpose. Will fix in next sprint."

Bad:
"Some forms have issues."
```

**Step 5: Expert Review**

Have accessibility specialist review before publication:
- Verify conformance levels accurate
- Check for misunderstandings of criteria
- Ensure remarks are clear and complete
- Validate remediation plans are realistic

**Step 6: Maintain Annually**

VPATs older than 2 years are considered outdated by enterprise procurement. Update after:
- Major feature releases
- Significant UI changes
- Accessibility remediation efforts
- WCAG version changes

### Business Context

**Why VPATs Matter:**

Enterprise and government procurement requires VPATs to evaluate vendor accessibility. No VPAT = no consideration in many RFPs.

VPATs demonstrate:
- Due diligence and transparency
- Commitment to accessibility
- Understanding of standards
- Professional maturity

**Cost Considerations:**

Creating a VPAT internally: 40-80 hours for comprehensive audit and documentation

Third-party VPAT creation: $5,000-25,000 depending on product complexity and testing depth

Annual updates: 20-40 hours for re-testing and documentation

**Common Mistakes:**

❌ Claiming full support without thorough testing
❌ Copying conformance levels from component libraries without testing actual implementation
❌ Providing vague remarks ("Generally accessible")
❌ Not updating VPATs after major changes
❌ Confusing VPAT (template) with ACR (completed report)

## Accessibility Statements

Public-facing accessibility statements document your commitment and provide users with information about accessibility support.

### Required Components

**1. Conformance Claim**

```
This website conforms to WCAG 2.1 Level AA as of [Date].

Partial conformance: This website partially conforms to WCAG 2.2 Level AA.
The following WCAG 2.2 criteria are not yet supported:
- 2.5.8 Target Size (Minimum) - Some buttons under 24px
- 3.3.8 Accessible Authentication - Login still requires CAPTCHA

Full conformance planned for Q3 2025.
```

Be specific about conformance level and date. Disclose known issues honestly.

**2. Testing and Validation**

```
Last evaluation: January 2025

Evaluation methods:
- Automated testing with axe DevTools
- Manual keyboard navigation testing
- Screen reader testing with NVDA and VoiceOver
- User testing with 5 people with disabilities
- Color contrast analysis

Standards: WCAG 2.1 Level AA, Section 508 (US), EN 301 549 (EU)
```

**3. Known Issues and Workarounds**

```
Known accessibility issues:

1. PDF documents (uploaded before January 2024) may not be fully accessible
   Workaround: Request alternative format via accessibility@example.com

2. Third-party chat widget (lower right corner) has keyboard navigation issues
   Workaround: Email support@example.com for assistance

3. Video content added before June 2024 lacks captions
   Workaround: Transcripts available on video description pages

We are working to remediate these issues by Q2 2025.
```

**4. Contact Information**

```
Accessibility feedback and assistance:

Email: accessibility@example.com
Phone: 1-800-555-0123 (Mon-Fri, 9am-5pm ET)
Response time: Within 5 business days

For urgent accessibility barriers, call our main support line 24/7.
```

**5. Feedback Mechanism**

```
How to report accessibility issues:

1. Email accessibility@example.com with:
   - Description of the issue
   - Page URL where you encountered it
   - Assistive technology you're using (if applicable)

2. We will respond within 5 business days with:
   - Confirmation we received your report
   - Initial assessment of the issue
   - Expected timeline for resolution

3. We will notify you when the issue is resolved.
```

**6. Third-Party Content**

```
Third-party content on this site:

- Embedded social media feeds may not be fully accessible
  (Contact: Twitter, Facebook, Instagram accessibility teams)
- Payment processing provided by Stripe (WCAG 2.1 AA conformant)
- Mapping provided by Google Maps (see Google Maps accessibility features)

We are committed to working with vendors to improve accessibility.
```

**7. Assistive Technology Support**

```
Supported assistive technologies:

This website has been tested with:
- Screen readers: NVDA, JAWS, VoiceOver, TalkBack
- Browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Operating systems: Windows 10+, macOS 11+, iOS 15+, Android 10+

Recommended configuration:
- NVDA with Chrome on Windows
- VoiceOver with Safari on macOS/iOS
- TalkBack with Chrome on Android

Known limitations: Internet Explorer 11 is not supported.
```

### Placement and Format

- Link in footer ("Accessibility" or "Accessibility Statement")
- Include in sitemap
- Provide HTML format (not PDF only)
- Ensure accessibility statement itself is accessible
- Make available offline (users with connection issues)

## Continuous Accessibility Monitoring

Point-in-time audits provide a snapshot, but every code change can introduce new violations. Continuous monitoring maintains compliance over time.

### The Problem with Annual Audits

Research shows organizations spend 80%+ of time below compliance between annual audits:

1. **Compliance at audit:** 100% (just fixed everything)
2. **3 months later:** 85% (new features added)
3. **6 months later:** 70% (accumulated changes)
4. **9 months later:** 60% (more features, staff turnover)
5. **12 months later:** 50% (next audit finds many issues)

This creates a "sawtooth" compliance pattern: high after audits, declining between them.

### Continuous Monitoring Strategy

**Year 1: Baseline**

1. **Initial Comprehensive Audit**
   - Catch all existing issues
   - Create remediation plan
   - Generate VPAT if needed
   - Establish baseline metrics

2. **Remediation Phase**
   - Fix critical issues (within 30 days)
   - Fix major issues (within 90 days)
   - Fix minor issues (within 180 days)
   - Document resolved issues

3. **Process Integration**
   - Add accessibility to code review checklist
   - Train development team
   - Integrate automated testing in CI/CD
   - Establish accessibility champion role

**Ongoing: Continuous Compliance**

1. **Automated Testing on Every Deploy**

```yaml
# CI/CD Integration
.gitlab-ci.yml:

stages:
  - build
  - test
  - accessibility
  - deploy

accessibility:
  stage: accessibility
  script:
    - npm install -g pa11y-ci
    - pa11y-ci --threshold 0
  only:
    - merge_requests
    - main
```

2. **Weekly Automated Scans**

```bash
#!/bin/bash
# weekly-a11y-scan.sh

# Run comprehensive scan
pa11y-ci --json > reports/accessibility-$(date +%Y%m%d).json

# Compare to baseline
violations=$(jq 'length' reports/accessibility-$(date +%Y%m%d).json)
baseline=$(jq 'length' reports/baseline.json)

if [ $violations -gt $baseline ]; then
  echo "New accessibility violations introduced: $(($violations - $baseline))"
  # Send alert to team
  slack-notify "Accessibility violations increased"
fi
```

3. **Quarterly Manual Spot Checks**

- Test 3-5 high-traffic pages manually
- Keyboard navigation testing
- Screen reader spot checks
- Review user-reported issues

4. **Annual Comprehensive Re-Audit**

- Expert manual testing
- User testing with people with disabilities
- Update VPAT/ACR
- Update accessibility statement

### Monitoring Tools

**Pa11y CI (Open Source)**

Free, integrates with CI/CD, configurable standards

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe", "htmlcs"],
    "timeout": 60000
  },
  "urls": [
    "https://example.com",
    "https://example.com/about"
  ]
}
```

**axe DevTools Pro (Paid)**

Team dashboards, historical tracking, Jira integration, $49-99/user/month

**Accessibility Insights (Free)**

Microsoft tool, comprehensive WCAG 2.1 coverage, guided manual tests

**Deque axe Monitor (Paid)**

Continuous monitoring service, scheduled scans, alerting, enterprise pricing

### Implementation Metrics

Track these metrics over time:

- **Violation count:** Total accessibility violations detected
- **Violation severity:** Critical, major, minor breakdown
- **Time to remediation:** Average days from detection to fix
- **New violations per sprint:** Trend showing quality of new code
- **Pages tested:** Coverage percentage
- **User-reported issues:** Accessibility feedback from real users

**Example Dashboard:**

```
Accessibility Health Dashboard - Q1 2025

Total Violations: 12 (↓ from 45 in Q4 2024)
  Critical: 0 (↓ from 8)
  Major: 3 (↓ from 15)
  Minor: 9 (↓ from 22)

Average Remediation Time: 4.5 days (↓ from 12 days)

New Violations This Quarter: 3 (2 already fixed)

Pages Tested: 47 / 50 (94% coverage)

User-Reported Issues: 2 (both resolved)

WCAG 2.1 AA Conformance: 98% (target: 100% by Q2)
```

### Benefits of Continuous Monitoring

- Maintains compliance between audits (no "sawtooth" pattern)
- Catches issues within days, not months
- Demonstrates ongoing commitment (regulatory proof)
- Cost-effective (fix immediately vs. bulk remediation)
- Reduces litigation risk (shows due diligence)
- Improves team skills (constant accessibility awareness)

## Remediation at Scale

Remediating accessibility issues across large applications requires prioritization, workflow, and sustained effort.

### Prioritization Framework

**Critical (Fix within 30 days):**
- Keyboard navigation completely broken (can't access core functionality)
- Forms unusable by screen readers (missing labels, no error announcements)
- Color contrast failures on primary content or CTAs
- Missing skip links (forces keyboard users through repetitive navigation)
- Keyboard traps in modals or overlays
- Missing captions on required video content

**Major (Fix within 90 days):**
- Incomplete keyboard support (some features keyboard-inaccessible)
- Missing ARIA labels on complex components (unclear purpose)
- Inconsistent focus indicators (sometimes visible, sometimes not)
- Some form fields without proper labels
- Missing alt text on informational images
- Inaccessible error messages (not announced to screen readers)

**Minor (Fix within 180 days):**
- Non-critical contrast issues (secondary content slightly below ratio)
- Missing alt text on decorative images (should use alt="")
- Suboptimal tab order (functional but illogical)
- Minor ARIA inconsistencies (technically incorrect but functionally works)
- Missing language attributes on inline foreign language text

### Remediation Workflow

**Step 1: Generate Complete Inventory**

Run comprehensive audit documenting:
- Page/component affected
- WCAG criterion violated
- Severity (critical, major, minor)
- Current state (description and screenshot)
- Expected outcome (what should happen)

Export to project management tool (Jira, Linear, Asana)

**Step 2: Categorize and Assign Ownership**

Group by:
- Component type (all form issues together)
- Responsible team (frontend, design, content)
- Fix complexity (quick wins vs. architectural changes)

Assign to team members with appropriate expertise

**Step 3: Create Phased Remediation Plan**

```
Phase 1 (Sprint 1-2): Critical Issues
- Fix all keyboard navigation blocks
- Add labels to all form inputs
- Fix high-priority contrast failures
- Add skip links

Phase 2 (Sprint 3-5): Major Issues
- Implement accessible modal patterns
- Add ARIA labels to custom components
- Improve focus indicators across site
- Fix remaining contrast issues

Phase 3 (Sprint 6-8): Minor Issues
- Clean up alt text across site
- Optimize tab order
- Add language attributes
- Fix ARIA inconsistencies
```

**Step 4: Track Progress**

Use project management board with columns:
- Backlog (all identified issues)
- In Progress (actively being fixed)
- Needs Testing (fix complete, needs verification)
- Done (verified with automated and manual testing)

**Step 5: Retest After Fixes**

Don't assume fixes work:
- Run automated tools on fixed pages
- Manual keyboard testing
- Screen reader spot check
- User testing for complex components

Document resolution:
- Before/after screenshots
- WCAG criterion now satisfied
- Testing method used to verify

### Common Remediation Patterns

**Pattern 1: Missing Form Labels**

Before:
```html
<input type="email" placeholder="Email address" />
```

After:
```html
<label for="email">Email Address</label>
<input id="email" type="email" placeholder="you@example.com" />
```

Scale: Find all form inputs, add proper labels. Usually 50-200 instances in large application.

**Pattern 2: Low Contrast**

Before:
```css
.text-muted {
  color: #999;  /* 2.8:1 on white - fails */
}
```

After:
```css
.text-muted {
  color: #757575;  /* 4.6:1 on white - passes */
}
```

Scale: Update design system color palette, propagate to all components.

**Pattern 3: Missing Alt Text**

Before:
```html
<img src="product.jpg" />
```

After:
```html
<img src="product.jpg" alt="Wireless headphones with noise cancellation" />
```

Scale: Audit all images, add meaningful descriptions. Consider CMS workflow for content team.

**Pattern 4: Inaccessible Modals**

Before:
```javascript
function openModal() {
  document.getElementById('modal').style.display = 'block';
}
```

After:
```javascript
function openModal() {
  const modal = document.getElementById('modal');
  previousFocus = document.activeElement;
  modal.style.display = 'block';
  modal.querySelector('button').focus();
  modal.addEventListener('keydown', handleModalKeydown);
}
```

Scale: Create reusable accessible modal component, refactor all instances to use it.

**Pattern 5: Missing Skip Links**

Before:
```html
<nav><!-- lots of links --></nav>
<main><!-- content --></main>
```

After:
```html
<a href="#main" class="skip-link">Skip to main content</a>
<nav><!-- lots of links --></nav>
<main id="main"><!-- content --></main>
```

Scale: Add to template header, appears on all pages automatically.

## Advanced Topics

### Voice Control Accessibility

Voice control software allows users to navigate and operate interfaces using spoken commands. Primary users are people with motor disabilities who can't use keyboards or mice.

**Common Voice Control Software:**
- Dragon NaturallySpeaking (Windows, most popular)
- Windows Speech Recognition (built into Windows)
- Apple Voice Control (macOS, iOS)
- Voice Access (Android)

**Key Requirement:** Visible labels must match voice command names.

```html
<!-- Good: Label matches command -->
<button>Submit Form</button>
<!-- User says: "Click Submit Form" - works -->

<!-- Bad: Mismatch between visual and accessible name -->
<button aria-label="Send">Submit</button>
<!-- User sees "Submit" but says "Click Submit" - doesn't work -->
<!-- User must say "Click Send" - confusing -->
```

**Best Practices:**
- Keep button text concise but descriptive
- Don't hide text with `aria-label` unless necessary
- Avoid icons-only buttons (or ensure `aria-label` matches tooltip)
- Test with voice control if targeting users with motor disabilities

### Switch Devices and Alternative Input

Switch devices allow users with very limited motor control to interact with computers. A switch is typically a large button that can be pressed with minimal movement.

**Types of Switches:**
- Button switches (hand, foot, head-activated)
- Sip-and-puff switches (breath control)
- Eye-gaze switches (tracks eye movement)
- Specialized switches for individual needs

**How Switches Work:**
Switches simulate keyboard input. Users typically scan through options (highlighting each in sequence) and activate their switch when desired option is highlighted.

**Accessibility Foundation:**
Robust keyboard accessibility ensures switch compatibility. If interface works with keyboard alone, switches work too.

**Additional Considerations:**
- No time limits on interactions (WCAG 2.2.1)
- Large target sizes helpful (easier to hit during scanning)
- Clear focus indicators (show what's currently selected)
- Logical navigation order (reduces scanning time)

**Testing:** Most developers won't have access to switch devices. Thorough keyboard testing provides most coverage. User testing with switch users is ideal but rare.

## Resources and Next Steps

### Standards and Guidelines

**WCAG 2.2:** https://www.w3.org/TR/WCAG22/
Complete specification with understanding documents

**WAI-ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
Patterns and examples for accessible components

**Section 508:** https://www.section508.gov/
US federal accessibility requirements and guidance

**EN 301 549:** https://www.etsi.org/deliver/etsi_en/301500_301599/301549/
European harmonized standard (incorporates WCAG)

### Testing Tools

**axe DevTools:** https://www.deque.com/axe/devtools/
Browser extension and Pro version with team features

**WAVE:** https://wave.webaim.org/
Visual feedback tool, free extension

**Pa11y:** https://pa11y.org/
Open source CLI testing suite

**Accessibility Insights:** https://accessibilityinsights.io/
Free Microsoft tool, comprehensive WCAG coverage

**WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
Simple color contrast verification

### Learning Resources

**WebAIM:** https://webaim.org/
Comprehensive guides, articles, training

**The A11Y Project:** https://www.a11yproject.com/
Community-driven accessibility resources

**Inclusive Components:** https://inclusive-components.design/
Pattern library by Heydon Pickering

**Deque University:** https://dequeuniversity.com/
Comprehensive accessibility training courses (paid)

### Professional Services

**Deque Systems:** Accessibility audits, remediation, training
Enterprise-focused, WCAG expertise

**Level Access:** Compliance monitoring, testing services
Large-scale remediation, ongoing support

**TPGi (The Paciello Group):** Accessibility consulting
Deep technical expertise, user testing services

**AudioEye:** Automated monitoring and remediation service
Continuous monitoring, managed service model

### VPAT Templates

**ITI VPAT Templates:** https://www.itic.org/policy/accessibility/vpat
Free downloads, all editions (WCAG, EU, 508, INT)

## Summary

Comprehensive accessibility compliance requires:

1. **Understanding WCAG 2.2 Level AA:** 50 success criteria across 4 principles (POUR)

2. **Legal Awareness:** ADA Title II (US government), Title III (private), Section 508 (federal), EAA (EU) all require WCAG compliance with real penalties

3. **Multi-Phase Testing:** Automated tools catch 25-30%, manual testing required for 30% of criteria, user testing reveals real-world barriers

4. **VPATs for B2B:** Enterprise and government sales require documented conformance reports updated annually

5. **Continuous Monitoring:** Point-in-time audits leave 80% of time below compliance; CI/CD integration and regular scans maintain standards

6. **Prioritized Remediation:** Critical issues (blocking access) within 30 days, major within 90 days, minor within 180 days

7. **Process Integration:** Accessibility must be part of design, development, code review, and QA - not an afterthought

The difference between accessibility compliance and accessibility maturity is whether you're catching up or staying ahead. Continuous monitoring, automated testing in pipelines, and educated development teams create sustainable accessibility.

## Related Topics

- **[Frontend Architecture](../../frontend-architecture/deep-water/)** - Architecting design systems with accessible component patterns
- **[Security Testing](../../../04-testing/security-testing/deep-water/)** - Automated testing strategies applicable to accessibility
- **[Automated Testing](../../../04-testing/automated-testing/deep-water/)** - CI/CD integration patterns for continuous compliance
- **[Error Handling & Resilience](../../error-handling-resilience/deep-water/)** - Designing accessible error states that screen readers announce correctly
