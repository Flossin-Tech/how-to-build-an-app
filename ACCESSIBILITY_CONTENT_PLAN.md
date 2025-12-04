# Accessibility Content Plan for "How to Build an App"

**Created:** 2025-12-04
**Status:** Proposed
**Phase:** 02-design
**Topic Slug:** `accessible-design`

---

## Executive Summary

This document outlines a comprehensive plan for adding accessibility content to the Design phase of "How to Build an App". Based on extensive research into legal requirements (ADA, Section 508, WCAG 2.1/2.2), implementation patterns, testing tools, and current design phase structure, this plan proposes a new standalone topic called **"Accessible Design"** with strategic integration points across existing design topics.

### Why This Matters

- **Legal Requirement:** WCAG 2.1 Level AA is now legally mandated for US government sites (effective April 2024) and EU digital services (EAA effective June 2025)
- **User Impact:** 71% of users with disabilities will switch to competitors for better accessibility
- **Litigation Risk:** 8,800+ accessibility lawsuits filed in 2024; average costs $50K-$500K
- **Market Reality:** 61% of WCAG violations are preventable with proper design phase planning

---

## Content Structure Overview

### Proposed Topic: `accessible-design`

**Position in Phase:** Between frontend-architecture (#7) and api-design (#1)
**Reading Times:**
- Surface: 8-10 minutes
- Mid-Depth: 20-25 minutes
- Deep Water: 45-60 minutes

**Prerequisites:**
- frontend-architecture (surface)
- job-to-be-done (understanding user needs)

**Related Topics:**
- frontend-architecture
- error-handling-resilience
- state-management-design
- performance-scalability-design
- (Phase 04) security-testing
- (Phase 04) automated-testing

**Target Personas:**
- **Surface:** new-developer, yolo-dev, busy-developer
- **Mid-Depth:** generalist-leveling-up, specialist-expanding
- **Deep Water:** specialist-expanding, compliance teams

---

## Surface Level (8-10 minutes)

### Goals
- Understand why accessibility is non-negotiable
- Know the legal landscape (ADA, Section 508, WCAG)
- Learn the 5 quick wins that prevent 80% of violations
- Recognize when to invest more deeply

### Content Outline

#### 1. What Is Accessibility and Why It Matters (2 min)
- Definition: Building for all users, including those with disabilities
- Legal context: ADA Title II (government), Title III (private), Section 508 (federal), EAA (EU)
- Statistics:
  - 1 in 4 adults in US has a disability
  - 71% will abandon sites with poor accessibility
  - Average lawsuit costs $50K-$500K
- Business case: Accessibility = usability for everyone

#### 2. WCAG 2.1/2.2 Level AA - Your Target (2 min)
- WCAG = Web Content Accessibility Guidelines
- Three levels: A (basic), AA (standard), AAA (enhanced)
- **Level AA is the legal requirement**
- POUR principles overview:
  - **P**erceivable: Can users perceive the content?
  - **O**perable: Can users operate the interface?
  - **U**nderstandable: Is the interface understandable?
  - **R**obust: Works with assistive technologies?

#### 3. The 5 Quick Wins (3 min)
Based on research showing these prevent the most common violations:

**Quick Win #1: Use Semantic HTML**
- Use `<button>` not `<div role="button">`
- Use `<nav>`, `<main>`, `<header>`, `<footer>`
- Use proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`)
- **Why:** 57 errors on pages with ARIA vs 27 without

**Quick Win #2: Label All Form Inputs**
```html
<!-- Good -->
<label for="email">Email Address</label>
<input id="email" type="email" />

<!-- Bad -->
<input placeholder="Email" />
```
- **Why:** #1 most common WCAG violation

**Quick Win #3: Provide Sufficient Color Contrast**
- Normal text: 4.5:1 minimum
- Large text (18pt+ or 14pt+ bold): 3:1 minimum
- Tool: WebAIM Contrast Checker
- **Why:** 86% of homepages fail contrast requirements

**Quick Win #4: Make Everything Keyboard Accessible**
- Test with Tab, Shift+Tab, Enter, Space, Escape
- Ensure focus indicators are visible
- Add skip links: `<a href="#main">Skip to main content</a>`
- **Why:** Mouse-only interfaces exclude keyboard and screen reader users

**Quick Win #5: Write Meaningful Alt Text**
```html
<!-- Good -->
<img src="team.jpg" alt="Engineering team of 8 people at desk" />

<!-- Bad -->
<img src="team.jpg" alt="image" />
<img src="decorative.svg" alt="" /> <!-- Empty is correct for decorative -->
```
- **Why:** Images without alt text are unreadable to screen readers

#### 4. When to Dig Deeper (1 min)
Go to **Mid-Depth** if you:
- Are building user-facing products
- Work in regulated industries (government, healthcare, finance, education)
- Need to pass accessibility audits
- Have users reporting accessibility barriers

Go to **Deep Water** if you:
- Are remediating existing accessibility violations
- Need to create VPATs or ACRs for enterprise clients
- Are implementing complex interactive components
- Need comprehensive WCAG 2.2 AA compliance

#### 5. Common Mistakes to Avoid (1 min)
- ❌ Using `outline: none` without replacement
- ❌ Color as the only indicator (red = error)
- ❌ Placeholder text instead of labels
- ❌ "Click here" link text
- ❌ Modals that trap keyboard focus
- ❌ Auto-playing videos without controls

#### 6. Next Steps
- Install axe DevTools browser extension
- Run it on your homepage
- Fix the 5-10 issues it finds
- Test your site with keyboard only (unplug your mouse!)
- Read **Mid-Depth** for implementation patterns

---

## Mid-Depth Level (20-25 minutes)

### Goals
- Implement accessible patterns for common UI components
- Understand framework-specific accessibility features
- Learn testing methodology (automated + manual)
- Build accessibility into development workflow

### Content Outline

#### 1. WCAG 2.1 Level AA Deep Dive (4 min)

**Perceivable Requirements:**
- 1.1.1: Non-text content has text alternatives
- 1.2.x: Captions for video, audio descriptions
- 1.3.x: Semantic structure (headings, lists, landmarks)
- 1.4.3: Color contrast (4.5:1 normal, 3:1 large text)
- 1.4.4: Text resizable to 200% without loss of function

**Operable Requirements:**
- 2.1.1: All functionality keyboard accessible
- 2.1.2: No keyboard traps
- 2.4.1: Skip links to bypass repetitive content
- 2.4.3: Logical focus order
- 2.4.7: Visible focus indicators

**Understandable Requirements:**
- 3.1.1: Page language specified (`<html lang="en">`)
- 3.2.x: Predictable navigation and behavior
- 3.3.1: Clear error identification
- 3.3.2: Labels for all form inputs
- 3.3.3: Error suggestions provided

**Robust Requirements:**
- 4.1.2: Name, role, value for all UI components
- 4.1.3: Status messages announced to screen readers

**What's New in WCAG 2.2:**
- 2.4.11: Focus not obscured (focus visible when elements receive focus)
- 2.5.7: Dragging alternatives (provide click alternative to drag)
- 2.5.8: Target size minimum 24x24 pixels
- 3.2.6: Consistent help placement
- 3.3.7: No redundant entry (don't ask for same info twice)
- 3.3.8: Accessible authentication (no cognitive function tests)

#### 2. Accessible Component Patterns (8 min)

**Pattern 1: Accessible Modals/Dialogs**
```html
<div
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  aria-modal="true"
>
  <h2 id="modal-title">Confirm Action</h2>
  <p id="modal-description">Are you sure?</p>
  <button>Confirm</button>
  <button>Cancel</button>
</div>
```
Requirements:
- Focus moves to modal when opened
- Tab cycles within modal (focus trap)
- Escape key closes modal
- Focus returns to trigger element on close

**Pattern 2: Accessible Forms**
```html
<form>
  <label for="email">Email Address</label>
  <input
    id="email"
    type="email"
    required
    aria-describedby="email-error"
    aria-invalid="true"
  />
  <div id="email-error" role="alert">
    Email must include @ symbol
  </div>
</form>
```
Requirements:
- Every input has a visible label
- Error messages use `role="alert"`
- Required fields marked with `required` or `aria-required="true"`
- Help text uses `aria-describedby`

**Pattern 3: Accessible Buttons and Links**
```html
<!-- Button for actions -->
<button onclick="saveForm()">Save</button>

<!-- Link for navigation -->
<a href="/profile">View Profile</a>

<!-- Icon button needs accessible name -->
<button aria-label="Close dialog">
  <svg>...</svg>
</button>
```

**Pattern 4: Accessible Accordions**
```html
<h3>
  <button
    aria-expanded="false"
    aria-controls="panel-1"
  >
    Section 1
  </button>
</h3>
<div id="panel-1" hidden>
  Content
</div>
```
Requirements:
- Buttons have `aria-expanded` state
- Content panels have `hidden` attribute when collapsed
- Arrow keys navigate between accordion items

**Pattern 5: Accessible Tabs**
- Tab list has `role="tablist"`
- Each tab has `role="tab"`
- Tab panels have `role="tabpanel"`
- Arrow keys navigate tabs
- Tab key moves to panel content

**Pattern 6: Live Regions for Announcements**
```html
<div aria-live="polite" aria-atomic="true">
  4 items added to cart
</div>

<div role="alert" aria-live="assertive">
  Your session will expire in 5 minutes
</div>
```

#### 3. Framework-Specific Guidance (4 min)

**React Accessibility**
```javascript
import { useRef, useEffect } from 'react';

function AccessibleModal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      modalRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" tabIndex="-1">
      {/* Modal content */}
    </div>
  );
}
```
- Use `useRef` for focus management
- Use `useEffect` for side effects
- Consider React Aria library for complex components

**Vue Accessibility**
```vue
<template>
  <button
    :aria-expanded="isOpen"
    :aria-controls="`panel-${id}`"
    @click="isOpen = !isOpen"
  >
    {{ title }}
  </button>
  <div :id="`panel-${id}`" v-show="isOpen">
    <slot></slot>
  </div>
</template>
```

**Angular Accessibility**
```typescript
import { CdkTrapFocus } from '@angular/cdk/a11y';

@Component({
  template: `
    <div cdkTrapFocus role="dialog">
      <h2>Modal Title</h2>
    </div>
  `,
  imports: [CdkTrapFocus]
})
```
- Angular v21+ includes Angular ARIA (headless accessible components)
- Use CDK for focus trapping

#### 4. Testing Your Implementation (4 min)

**Automated Testing (catches ~25-30% of issues)**
- **axe DevTools**: Browser extension, catches 84% of detectable issues
- **WAVE**: Visual accessibility feedback
- **Lighthouse**: Built into Chrome DevTools
- **Pa11y CI**: Automated testing in pipelines

**Manual Testing (required for 30% of WCAG criteria)**
- **Keyboard Navigation:**
  - Unplug mouse, use Tab/Shift+Tab/Enter/Space/Escape
  - Verify focus indicators visible
  - Check logical tab order
  - Test all interactive elements

- **Screen Reader Testing:**
  - Windows: NVDA (free) or JAWS (paid)
  - macOS: VoiceOver (built-in)
  - Mobile: VoiceOver (iOS), TalkBack (Android)
  - Test on real devices, not emulators

- **Zoom Testing:**
  - Zoom to 200% (WCAG AA requirement)
  - Verify no horizontal scroll for text
  - Check all functionality still works

- **Color Contrast:**
  - Use WebAIM Contrast Checker
  - Test all text/background combinations
  - Verify 4.5:1 for normal text, 3:1 for large text

**Hybrid Testing Approach:**
1. Run automated tools first (catch low-hanging fruit)
2. Fix automated findings
3. Manual keyboard/screen reader testing
4. User testing with people with disabilities (ideal)

#### 5. Common Pitfalls (2 min)
- **ARIA Overuse:** Pages with ARIA have 57 errors vs 27 without
  - First Rule of ARIA: Use semantic HTML first
  - Only use ARIA when HTML doesn't provide needed semantics

- **Missing Focus Management:**
  - Modals must trap focus and return it on close
  - Dynamic content needs focus updates

- **Inaccessible Error Messages:**
  - Errors must use `role="alert"`
  - Must be associated with inputs via `aria-describedby`

- **Color-Only Indicators:**
  - Never rely on color alone (add icons, text, patterns)

- **Placeholder as Label:**
  - Placeholders disappear on input, aren't labels
  - Always use explicit `<label>` elements

#### 6. Next Steps
- Run axe DevTools on all pages, fix violations
- Test 3-5 key user flows with keyboard only
- Test 1-2 pages with NVDA or VoiceOver
- Integrate Pa11y into CI/CD pipeline
- Read **Deep Water** for audit preparation and VPAT creation

---

## Deep Water Level (45-60 minutes)

### Goals
- Prepare for comprehensive WCAG audits
- Create VPATs and ACRs for enterprise compliance
- Implement continuous accessibility monitoring
- Understand advanced testing methodologies
- Handle accessibility remediation at scale

### Content Outline

#### 1. Comprehensive WCAG 2.2 AA Compliance (10 min)

**Complete Success Criteria Breakdown:**
- Full listing of all 86 WCAG 2.2 success criteria
- Level A (mandatory baseline): 30 criteria
- Level AA (legal standard): 50 criteria total (A + 20 AA criteria)
- Level AAA (enhanced, aspirational): 86 total criteria

**New in WCAG 2.2 (9 additions, 1 removal):**
- 2.4.11: Focus Not Obscured (Minimum) - Level AA
- 2.4.12: Focus Not Obscured (Enhanced) - Level AAA
- 2.4.13: Focus Appearance - Level AAA
- 2.5.7: Dragging Movements - Level AA
- 2.5.8: Target Size (Minimum) - Level AA (24x24px vs 44x44px for AAA)
- 3.2.6: Consistent Help - Level A
- 3.3.7: Redundant Entry - Level A
- 3.3.8: Accessible Authentication (Minimum) - Level AA
- 3.3.9: Accessible Authentication (Enhanced) - Level AAA
- **Removed:** 4.1.1 Parsing (obsolete due to modern browser capabilities)

**Mapping to POUR Principles:**
- Perceivable: 29 success criteria
- Operable: 30 success criteria
- Understandable: 17 success criteria
- Robust: 3 success criteria (reduced from 4)

#### 2. Legal and Regulatory Landscape (6 min)

**United States:**
- **ADA Title II (State/Local Government):**
  - Standard: WCAG 2.1 Level AA (mandated April 2024)
  - Deadline: April 24, 2026 (large entities), April 26, 2027 (small entities)
  - Scope: All websites, mobile apps, digital services
  - Exceptions: Archived content, pre-existing documents, some third-party content

- **ADA Title III (Private Businesses):**
  - Standard: WCAG 2.1 Level AA (de facto via court precedent)
  - No formal deadline, but 8,800+ lawsuits filed in 2024
  - Average litigation costs: $50K-$500K
  - 48% of 2024 lawsuits against repeat offenders

- **Section 508 (Federal Government):**
  - Standard: WCAG 2.0 Level AA (updated January 2017)
  - Applies to: All federal agencies and contractors
  - Enforcement: Required for federal procurement

**European Union:**
- **European Accessibility Act (EAA):**
  - Standard: WCAG 2.1 Level AA (minimum)
  - Effective: June 28, 2025
  - Scope: Banking, eCommerce, transportation, communications, ebooks
  - Penalties: Up to €100,000 per violation

**International:**
- **Canada:** WCAG 2.0 AA (federal), AODA compliance (Ontario)
- **UK:** EN 301 549 (public sector)
- **Australia:** WCAG 2.1 AA (Disability Discrimination Act)

#### 3. Advanced Testing Methodologies (12 min)

**Phase 1: Pre-Audit Planning**
- Define scope (7-15 representative pages minimum)
- Select WCAG level (2.1 AA vs 2.2 AA)
- Establish testing environments
- Prepare team and tools

**Phase 2: Automated Assessment**
Tools comparison:
- **axe DevTools:** Catches 84% of detectable issues, best for developers
- **WAVE:** Visual feedback, good for quick audits
- **Lighthouse:** Built-in, basic coverage
- **Pa11y CI:** Command-line, CI/CD integration
- **Accessibility Insights:** Microsoft tool, comprehensive WCAG 2.1 coverage

**Phase 3: Manual Expert Testing**
- **Keyboard Navigation:**
  - Tab order matches visual order
  - Focus indicators visible (3:1 contrast minimum)
  - No keyboard traps
  - Skip links functional
  - Modal focus management correct

- **Screen Reader Testing:**
  - Market share (2024 WebAIM data):
    - NVDA: 38-39% primary usage
    - JAWS: 40-41% primary usage
    - VoiceOver: 9.7% desktop, 70.6% mobile
  - Test combinations:
    - NVDA + Chrome (most common)
    - JAWS + Chrome/Edge
    - VoiceOver + Safari (macOS/iOS)
    - TalkBack + Chrome (Android)

- **Mobile Testing:**
  - Real devices only (emulators lack screen reader support)
  - iOS VoiceOver + Android TalkBack
  - Touch targets 44x44px minimum (WCAG 2.5.5 AAA)
  - 24x24px minimum (WCAG 2.2 - 2.5.8 AA)

- **Visual Testing:**
  - Color contrast: 4.5:1 normal, 3:1 large
  - Zoom to 200% (AA) and 400% (AAA)
  - High contrast mode compatibility
  - Focus indicators visible at all zoom levels

**Phase 4: User Testing with People with Disabilities**
- Recruit 3-5 testers per disability category
- Blind/low vision users
- Deaf/hard of hearing users
- Motor disability users
- Cognitive disability users
- Allow use of preferred assistive technologies
- Document unexpected barriers

**Key Insight:**
- Automated tools catch only 20-30% of WCAG failures
- 30% of WCAG criteria require human judgment
- User testing reveals real-world usability issues automated/manual testing miss

#### 4. VPAT and ACR Creation (8 min)

**What is a VPAT?**
- Voluntary Product Accessibility Template
- Free standardized document format
- Translates accessibility requirements to testable criteria
- When completed with test results, becomes an Accessibility Conformance Report (ACR)

**VPAT 2.5 Editions (Current):**
- **VPAT 2.5 WCAG:** WCAG conformance
- **VPAT 2.5 EU:** EN 301 549 (European standard)
- **VPAT 2.5 508:** Section 508 compliance
- **VPAT 2.5 INT:** Combined (all three standards)

**Conformance Statements:**
- **Supports:** Feature fully meets requirement
- **Partially Supports:** Feature partially meets requirement
- **Does Not Support:** Feature does not meet requirement
- **Not Applicable:** Requirement doesn't apply to product

**VPAT Development Process:**
1. Conduct comprehensive accessibility audit
2. Test with assistive technologies (native AT users recommended)
3. Document findings criterion-by-criterion
4. Map each WCAG success criterion to product features
5. Assign conformance level
6. Provide detailed explanations for partial/non-support
7. Expert review (accessibility specialist validation)
8. Maintain annually (VPATs >2 years old considered outdated)

**Business Context:**
- Not legally mandated, but market requirement for B2B
- Government/enterprise clients require VPATs for procurement
- Essential for competitive positioning
- Demonstrates due diligence and transparency

**Download Templates:**
- ITI (Information Technology Industry Council): [itic.org/policy/accessibility/vpat](https://www.itic.org/policy/accessibility/vpat)

#### 5. Accessibility Statements (4 min)

**Required Components:**
1. **Conformance Claim:**
   - "This website conforms to WCAG 2.1 Level AA"
   - Specify partial conformance if applicable
   - Date of claim

2. **Testing and Validation:**
   - Date of last audit
   - Testing methodology (automated + manual + user testing)
   - Tools and standards used
   - Scope of assessment

3. **Known Issues:**
   - Documented non-conformances
   - Workarounds provided
   - Timeline for remediation

4. **Contact Information:**
   - Accessibility contact email/form
   - Response time commitment (e.g., "within 5 business days")
   - Escalation procedures

5. **Feedback Mechanism:**
   - How users can report issues
   - Expected response time
   - Remediation process transparency

6. **Third-Party Content:**
   - Disclosure of inaccessible third-party content
   - Vendor contact information
   - Efforts to address

7. **Assistive Technology Support:**
   - Supported screen readers and browsers
   - Known limitations
   - Recommended configurations

**Placement:**
- Easily discoverable (footer link recommended)
- Include in sitemap
- Accessible format (PDF must be accessible if used)
- Mobile-friendly

#### 6. Continuous Accessibility Monitoring (6 min)

**Problem with Point-in-Time Audits:**
- Captures single-day snapshot
- Organizations spend 80%+ of time below compliance between audits
- Every code change can introduce new violations
- Issues accumulate 12+ months undetected

**Continuous Monitoring Strategy:**
1. **Initial Comprehensive Audit** (Year 1)
   - Catch all existing issues
   - Create baseline
   - Generate VPAT if needed

2. **Automated Weekly Scanning** (Ongoing)
   - Pa11y CI integration
   - Run on staging before production
   - Monitor compliance metrics

3. **CI/CD Integration**
   - Block pull requests with new violations
   - Automated checks on every commit
   - Require accessibility review for UI changes

4. **Regular Re-Audits**
   - Annual comprehensive expert audit
   - Bi-annual spot checks for high-traffic pages
   - After major feature releases

5. **Standards Updates**
   - Plan for WCAG 2.2 migration (if on 2.1)
   - Monitor WCAG 3.0 development
   - Adapt to regulatory changes

**Tools for Continuous Monitoring:**
- Pa11y CI (open source, free)
- axe DevTools Pro (paid, team dashboards)
- Accessibility Insights (free, Microsoft)
- AudioEye Active Monitoring (paid service)

**Implementation Example - Pa11y CI:**
```bash
# Install
npm install -g pa11y-ci

# Configure .pa11yci.json
{
  "urls": [
    "https://example.com",
    "https://example.com/about",
    "https://example.com/contact"
  ],
  "standard": "WCAG2AA",
  "timeout": 60000
}

# Run in CI pipeline
pa11y-ci --json > accessibility-report.json
```

**Benefits:**
- Maintains continuous compliance
- Catches issues within days, not months
- Demonstrates ongoing commitment (regulatory proof)
- Cost-effective (fix issues immediately vs bulk remediation)

#### 7. Remediation at Scale (5 min)

**Prioritization Framework:**

**Critical (Fix within 30 days):**
- Keyboard navigation completely broken
- Forms unusable by screen readers
- Color contrast failures on core content
- Missing skip links
- Focus traps

**Major (Fix within 90 days):**
- Incomplete keyboard support
- Missing ARIA labels on complex components
- Inconsistent focus indicators
- Some form fields without labels
- Missing alt text on informational images

**Minor (Fix within 180 days):**
- Non-critical contrast issues
- Missing alt text on decorative images
- Suboptimal tab order
- Minor ARIA inconsistencies

**Remediation Workflow:**
1. Generate complete issue inventory
2. Categorize by severity and WCAG level
3. Assign ownership to teams
4. Create phased remediation plan
5. Track progress in project management tool
6. Retest after fixes applied
7. Document resolution

**Common Remediation Patterns:**
- **Pattern 1:** Missing form labels → Add `<label>` elements with `for` attribute
- **Pattern 2:** Low contrast → Adjust color palette
- **Pattern 3:** Missing alt text → Add meaningful descriptions
- **Pattern 4:** Inaccessible modals → Implement focus trap and keyboard handlers
- **Pattern 5:** Missing skip links → Add as first focusable element

#### 8. Advanced Topics (4 min)

**Accessible Authentication (WCAG 2.2 - 3.3.8):**
- No cognitive function tests required (e.g., "type these distorted characters")
- Exceptions: Alternative methods available, object recognition, or personal content identification
- Examples of accessible authentication:
  - Email magic links
  - SMS codes
  - Biometric authentication
  - Password managers support
  - Social login (OAuth)

**Focus Not Obscured (WCAG 2.2 - 2.4.11):**
- When element receives focus, at least part remains visible
- Not hidden by sticky headers, chat widgets, cookie banners
- Enhanced version (2.4.12 AAA): Entire focus indicator visible

**Dragging Movements (WCAG 2.2 - 2.5.7):**
- All drag-and-drop functionality has single-pointer alternative
- Examples: Click to select, keyboard arrows, separate delete button

**Target Size Updates (WCAG 2.2 - 2.5.8):**
- AA Level: 24×24 CSS pixels minimum (new in 2.2)
- AAA Level: 44×44 CSS pixels (from 2.1)
- Exceptions: Inline links in paragraphs, user agent controlled, essential presentation

**Voice Control Accessibility:**
- Visible labels match voice command names
- Voice control software: Dragon, Windows Speech, Apple Voice Control
- Test with diverse accents and speech patterns
- Critical for users with motor disabilities

**Switch Devices and Alternative Input:**
- Adaptive switches for limited motor input
- Types: Button switches, sip-and-puff, eye-tracking, specialized switches
- Foundation: Robust keyboard accessibility ensures switch compatibility
- No time limits on interactions

#### 9. Resources and Next Steps (2 min)

**Standards and Guidelines:**
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Section508.gov](https://www.section508.gov/)

**Testing Tools:**
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Pa11y](https://pa11y.org/)
- [Accessibility Insights](https://accessibilityinsights.io/)

**Learning Resources:**
- [WebAIM](https://webaim.org/) - Comprehensive guides
- [The A11Y Project](https://www.a11yproject.com/) - Community resources
- [Inclusive Components](https://inclusive-components.design/) - Pattern library

**Professional Services:**
- Deque Systems - Accessibility audits and training
- Level Access - Compliance and remediation
- AudioEye - Automated monitoring

---

## Integration Strategy

### Primary Integration: New Standalone Topic

**Create:** `content/02-design/accessible-design/`

**Structure:**
```
content/02-design/accessible-design/
  surface/index.md
  mid-depth/index.md
  deep-water/index.md
```

**Metadata:** `metadata/topics/accessible-design.json`

### Secondary Integration: Cross-References in Existing Topics

**Frontend Architecture:**
- **Surface:** Add subsection "Accessible Components Quick Reference" linking to accessible-design
- **Mid-Depth:** Add subsection "Component Accessibility Patterns" with direct examples
- Reference accessible-design for comprehensive coverage

**Error Handling & Resilience:**
- Add subsection "Accessible Error Messages" in surface/mid-depth
- Link to accessible-design for complete error handling patterns

**State Management Design:**
- Add subsection "Accessible Form State" in mid-depth
- Link to accessible-design for comprehensive form patterns

**API Design:**
- Add note in documentation section about accessible error response formats
- Link to accessible-design for user-facing error presentation

**Performance & Scalability Design:**
- Add note about performance impact on accessibility (slow sites harm users with older devices)
- Link to accessible-design

### Learning Path Integration

**Add to:**
- `learning-paths/personas/new-developer.json` - In "Designing for Success" milestone
- `learning-paths/personas/generalist-leveling-up.json` - As frontend development requirement
- `learning-paths/tracks/production-ready.json` - As quality/compliance requirement

**Example Learning Path Entry:**
```json
{
  "phase": "02-design",
  "topic": "accessible-design",
  "depth": "surface",
  "required": true,
  "estimated_minutes": 10,
  "why": "Accessibility is a legal requirement and prevents 61% of WCAG violations when addressed in design phase"
}
```

---

## Example Code Snippets for Content

### Surface Level Examples

**Semantic HTML Example:**
```html
<!-- Good: Semantic HTML -->
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<main>
  <h1>Page Title</h1>
  <section>
    <h2>Section Title</h2>
    <p>Content...</p>
  </section>
</main>

<!-- Bad: Div soup -->
<div class="nav">
  <div class="link"><a href="/">Home</a></div>
  <div class="link"><a href="/about">About</a></div>
</div>

<div class="content">
  <div class="title">Page Title</div>
  <div class="section">
    <div class="subtitle">Section Title</div>
    <div>Content...</div>
  </div>
</div>
```

### Mid-Depth Level Examples

**Accessible Modal Implementation:**
```javascript
class AccessibleModal {
  constructor(modalElement, triggerButton) {
    this.modal = modalElement;
    this.trigger = triggerButton;
    this.previousFocus = null;
  }

  open() {
    // Save current focus
    this.previousFocus = document.activeElement;

    // Show modal
    this.modal.style.display = 'block';

    // Move focus to modal
    const firstButton = this.modal.querySelector('button');
    firstButton.focus();

    // Trap focus
    this.modal.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  close() {
    this.modal.style.display = 'none';
    this.modal.removeEventListener('keydown', this.handleKeydown.bind(this));

    // Return focus to trigger
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      this.close();
    }

    // Tab key focus trap implementation
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  trapFocus(event) {
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }
}
```

### Deep Water Level Examples

**Pa11y CI Configuration:**
```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 60000,
    "wait": 1000,
    "chromeLaunchConfig": {
      "args": ["--no-sandbox"]
    }
  },
  "urls": [
    "https://example.com",
    "https://example.com/about",
    "https://example.com/products",
    "https://example.com/contact"
  ]
}
```

**Accessibility Testing in CI/CD:**
```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [pull_request]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Pa11y CI
        run: npm install -g pa11y-ci
      - name: Run accessibility tests
        run: pa11y-ci --json > accessibility-report.json
      - name: Upload report
        uses: actions/upload-artifact@v2
        with:
          name: accessibility-report
          path: accessibility-report.json
      - name: Fail on violations
        run: |
          if [ $(jq 'length' accessibility-report.json) -gt 0 ]; then
            echo "Accessibility violations found"
            exit 1
          fi
```

---

## Metadata File Template

**File:** `metadata/topics/accessible-design.json`

```json
{
  "id": "accessible-design",
  "title": "Accessible Design",
  "order_in_phase": 8,
  "phase": "02-design",
  "description": "Design interfaces that work for everyone, including people with disabilities. Learn WCAG compliance, accessible patterns, and testing strategies.",
  "depth_levels": {
    "surface": {
      "objectives": [
        "Understand why accessibility is legally required and business-critical",
        "Learn the 5 quick wins that prevent 80% of WCAG violations",
        "Know when to invest in deeper accessibility work"
      ],
      "key_takeaways": [
        "WCAG 2.1 Level AA is the legal standard",
        "Semantic HTML prevents most violations",
        "Keyboard accessibility is non-negotiable",
        "Form labels and color contrast are most common failures"
      ],
      "estimated_time_minutes": 10
    },
    "mid_depth": {
      "objectives": [
        "Implement accessible patterns for common UI components",
        "Integrate accessibility into framework-specific development",
        "Conduct hybrid testing (automated + manual)",
        "Build accessibility into CI/CD workflows"
      ],
      "key_takeaways": [
        "WCAG has 86 success criteria across 4 principles (POUR)",
        "Modals, forms, and accordions have specific accessible patterns",
        "Automated tools catch only 25-30% of issues",
        "Screen reader testing is essential for compliance"
      ],
      "estimated_time_minutes": 25
    },
    "deep_water": {
      "objectives": [
        "Prepare for comprehensive WCAG audits and create VPATs",
        "Implement continuous accessibility monitoring",
        "Handle accessibility remediation at enterprise scale",
        "Navigate complex regulatory requirements (ADA, Section 508, EAA)"
      ],
      "key_takeaways": [
        "30% of WCAG criteria require human judgment testing",
        "VPATs are market requirements for B2B sales",
        "Continuous monitoring beats point-in-time audits",
        "User testing reveals issues automated/manual testing miss"
      ],
      "estimated_time_minutes": 55
    }
  },
  "prerequisites": ["frontend-architecture", "job-to-be-done"],
  "related_topics": [
    "frontend-architecture",
    "error-handling-resilience",
    "state-management-design",
    "performance-scalability-design"
  ],
  "personas": {
    "surface": ["new-developer", "yolo-dev", "busy-developer"],
    "mid_depth": ["generalist-leveling-up", "specialist-expanding"],
    "deep_water": ["specialist-expanding"]
  },
  "tools": [
    "axe DevTools",
    "WAVE",
    "Lighthouse",
    "Pa11y CI",
    "Accessibility Insights",
    "NVDA",
    "JAWS",
    "VoiceOver",
    "TalkBack",
    "WebAIM Contrast Checker"
  ],
  "frameworks_and_concepts": [
    "WCAG 2.1",
    "WCAG 2.2",
    "POUR principles",
    "ARIA",
    "Semantic HTML",
    "Screen readers",
    "Keyboard navigation",
    "Focus management"
  ],
  "compliance_relevance": [
    "ADA Title II (US government)",
    "ADA Title III (US private sector)",
    "Section 508 (US federal)",
    "European Accessibility Act (EU)",
    "EN 301 549 (EU)",
    "AODA (Canada)",
    "Disability Discrimination Act (Australia)"
  ],
  "common_mistakes": [
    "Using ARIA instead of semantic HTML (57 errors vs 27)",
    "Missing form labels (most common WCAG violation)",
    "Insufficient color contrast (86% of homepages fail)",
    "Inaccessible modals without focus traps",
    "Using outline: none without replacement",
    "Placeholder text instead of labels",
    "Color as sole indicator",
    "Testing only with automated tools (catches 20-30% only)"
  ],
  "success_metrics": [
    "Zero critical accessibility violations",
    "WCAG 2.1 Level AA conformance",
    "All pages keyboard navigable",
    "100% form fields properly labeled",
    "All color contrast ratios meet 4.5:1 minimum",
    "Pa11y CI passing in all builds",
    "VPAT/ACR available for enterprise clients"
  ],
  "when_to_prioritize": [
    "Building user-facing products",
    "Regulated industries (government, healthcare, finance, education)",
    "International markets (EU requires EAA compliance June 2025)",
    "Enterprise B2B sales (clients require VPATs)",
    "High lawsuit risk (eCommerce, public accommodations)"
  ],
  "when_to_deprioritize": [
    "Internal tools with no disabled users (still recommended)",
    "Early prototypes (but design patterns accessibly from start)",
    "Backend-only services with no UI"
  ]
}
```

---

## Implementation Timeline

### Phase 1: Content Creation (2-3 weeks)
- Week 1: Write surface level content
- Week 2: Write mid-depth content
- Week 3: Write deep-water content
- Review and edit all three levels

### Phase 2: Metadata and Integration (1 week)
- Create `accessible-design.json` metadata
- Update cross-references in related topics
- Add to learning paths
- Create example code repository

### Phase 3: Review and Validation (1 week)
- Accessibility expert review
- Technical accuracy review
- User persona alignment check
- Ensure depth progression is clear

### Phase 4: Publication (1 week)
- Final edits based on feedback
- Add to site navigation
- Update STRUCTURE_SUMMARY.md
- Announce to users

**Total Timeline:** 5-6 weeks from start to publication

---

## Success Criteria

This content will be successful if:

1. **Accuracy:** All WCAG criteria, legal requirements, and technical guidance are current and accurate
2. **Actionability:** Users can implement quick wins from surface level immediately
3. **Progression:** Clear value progression from surface → mid-depth → deep-water
4. **Integration:** Strong connections to existing design topics (frontend-architecture, error-handling, etc.)
5. **Compliance Support:** Deep-water level enables users to prepare for audits and create VPATs
6. **Testing Focus:** Emphasizes that accessibility requires testing beyond automated tools
7. **Framework Agnostic:** Patterns work across React, Vue, Angular, vanilla JS
8. **Real-World:** Based on actual WCAG violations, litigation trends, and user needs

---

## Research Sources Summary

This plan is based on comprehensive research from:

### Legal Requirements
- W3C WCAG 2.1 and 2.2 specifications
- US Department of Justice ADA guidance
- Section508.gov federal requirements
- European Accessibility Act documentation
- 2024 WebAIM Screen Reader User Survey #10

### Implementation Patterns
- WAI-ARIA Authoring Practices Guide
- MDN Accessibility Documentation
- React/Vue/Angular official accessibility guides
- Deque accessibility patterns
- WebAIM implementation guides

### Testing Tools and Methodologies
- axe DevTools documentation
- Pa11y testing framework
- Accessibility Insights guides
- WAVE evaluation methodology
- Screen reader testing best practices

### Industry Standards
- ITI VPAT templates and guidance
- Level Access ACR creation guides
- Accessibility audit methodologies from Deque, TPGi, WebAIM
- 2024-2025 accessibility litigation statistics

All sources are documented in detail in the research reports generated by specialized agents.

---

## Next Steps

1. **Review this plan** - Ensure alignment with project goals and structure
2. **Approve content outline** - Confirm depth-level breakdowns are appropriate
3. **Begin content creation** - Start with surface level, progress to deeper levels
4. **Engage accessibility expert** - Technical review of all content before publication
5. **Create code examples** - Develop reusable accessible component examples
6. **Test content flow** - Ensure progression and cross-references work well
7. **Publish and iterate** - Release content, gather feedback, refine over time

---

**Document Status:** Draft for Review
**Last Updated:** 2025-12-04
**Author:** Research conducted by specialized agents (legal requirements, implementation patterns, testing tools, codebase structure analysis)
