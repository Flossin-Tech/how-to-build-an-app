---
title: "Accessible Design"
phase: "02-design"
topic: "accessible-design"
depth: "mid-depth"
reading_time: 25
prerequisites: ["frontend-architecture"]
related_topics: ["frontend-architecture", "error-handling-resilience", "state-management-design", "performance-scalability-design"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-12-04"
---

# Accessible Design

## WCAG 2.1 Level AA Deep Dive

WCAG 2.1 Level AA includes 50 success criteria across four principles. Understanding these requirements helps you design accessible interfaces from the start rather than retrofitting them later.

### Perceivable - Can Users Perceive the Content?

**1.1.1 Non-text Content (Level A):** All images, icons, and non-text content need text alternatives. Use `alt` attributes for images, `aria-label` for icon buttons, and text descriptions for complex graphics.

**1.2.x Time-based Media (Level A, AA):** Videos need captions (1.2.2 AA), audio content needs transcripts (1.2.1 A), and pre-recorded video needs audio descriptions (1.2.5 AA) that explain important visual information.

**1.3.x Adaptable (Level A):** Structure matters. Use semantic HTML (`<nav>`, `<main>`, `<article>`) so content can be presented in different ways. Use proper heading hierarchy - don't skip from `<h1>` to `<h3>`. Use `<ul>`/`<ol>` for lists, not `<div>` with bullets in CSS.

**1.4.3 Contrast (Minimum) (Level AA):** Text must have at least 4.5:1 contrast ratio against its background. Large text (18pt+ or 14pt+ bold) needs 3:1 minimum. This is the most commonly failed criterion.

**1.4.4 Resize Text (Level AA):** Users must be able to resize text up to 200% without loss of content or functionality. Don't use fixed pixel sizes that prevent zooming.

**1.4.5 Images of Text (Level AA):** Don't use images that contain text unless it's purely decorative or the visual presentation is essential (like a logo). Use real text styled with CSS instead.

### Operable - Can Users Operate the Interface?

**2.1.1 Keyboard (Level A):** All functionality must be available via keyboard. If users can click it, they must be able to reach it with Tab and activate it with Enter or Space.

**2.1.2 No Keyboard Trap (Level A):** Users must be able to move focus away from any component using only the keyboard. Modals need Escape key handling.

**2.4.1 Bypass Blocks (Level A):** Provide a way to skip repetitive navigation. Add "Skip to main content" links at the top of the page.

**2.4.3 Focus Order (Level A):** Tab order should follow a logical reading order. Don't let CSS positioning create confusing tab sequences.

**2.4.6 Headings and Labels (Level AA):** Headings and labels must be descriptive. "Submit" is better than "OK". "Search the documentation" is better than "Search".

**2.4.7 Focus Visible (Level AA):** Keyboard focus must be clearly visible. The default browser outline works - if you remove it with `outline: none`, provide an equally visible alternative.

### Understandable - Is the Interface Understandable?

**3.1.1 Language of Page (Level A):** Specify the page language: `<html lang="en">`. Specify inline language changes: `<span lang="es">Hola</span>`.

**3.2.1 On Focus (Level A), 3.2.2 On Input (Level A):** Don't trigger unexpected actions when elements receive focus or when users change inputs. Don't auto-submit forms or navigate away when users select options.

**3.3.1 Error Identification (Level A):** When users make errors, clearly identify what went wrong. "Email address is required" is better than "Error in field 2".

**3.3.2 Labels or Instructions (Level A):** Every form input needs a label. Provide instructions for complex inputs. Tell users the required format: "Phone number: (555) 123-4567".

**3.3.3 Error Suggestion (Level AA):** When you detect errors, provide suggestions for fixing them. "Email must include @ symbol" is better than "Invalid email".

**3.3.4 Error Prevention (Level AA):** For legal, financial, or data-modifying submissions, provide confirmation steps or allow users to review and correct before final submission.

### Robust - Does It Work with Assistive Technologies?

**4.1.2 Name, Role, Value (Level A):** All interactive UI components must have programmatically determinable names, roles, and values. Buttons need accessible names, custom controls need ARIA roles.

**4.1.3 Status Messages (Level AA):** Status messages must be announced to screen readers without moving focus. Use `role="alert"` or `aria-live="polite"`.

### What's New in WCAG 2.2

WCAG 2.2 adds 9 new success criteria and removes one obsolete criterion (4.1.1 Parsing). If you're building new products, target 2.2 from the start.

**2.4.11 Focus Not Obscured (Minimum) (Level AA):** When elements receive focus, at least part of the focus indicator must remain visible. Sticky headers and chat widgets can't completely hide focused elements.

**2.5.7 Dragging Movements (Level AA):** All drag-and-drop functionality must have a single-pointer alternative. Provide click-to-select, keyboard arrows, or separate buttons as alternatives.

**2.5.8 Target Size (Minimum) (Level AA):** Interactive targets must be at least 24×24 CSS pixels. Buttons, links, and form controls need adequate click/tap areas. Exceptions exist for inline links in paragraphs.

**3.2.6 Consistent Help (Level A):** If help mechanisms exist (chat, phone, form), they must appear in the same relative position across pages.

**3.3.7 Redundant Entry (Level A):** Don't ask users to enter the same information twice in a single session unless necessary for security or confirmation. Auto-fill previously entered data.

**3.3.8 Accessible Authentication (Minimum) (Level AA):** Don't require cognitive function tests (remembering passwords, solving puzzles, identifying distorted text). Provide alternatives like email magic links, SMS codes, password managers, or biometrics.

## Accessible Component Patterns

These patterns implement WCAG requirements for common UI components. They work across frameworks - adapt the structure to React, Vue, Angular, or vanilla JavaScript.

### Pattern 1: Accessible Modals/Dialogs

Modals are one of the most commonly inaccessible patterns. They need focus management, keyboard support, and proper ARIA attributes.

```html
<div
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  aria-modal="true"
  tabindex="-1"
>
  <h2 id="modal-title">Confirm Deletion</h2>
  <p id="modal-description">
    Are you sure you want to delete this item? This action cannot be undone.
  </p>

  <button onclick="confirmDelete()">Delete</button>
  <button onclick="closeModal()">Cancel</button>
</div>
```

**Requirements:**
- When modal opens, focus moves to the first interactive element (or the modal itself with `tabindex="-1"`)
- Tab key cycles through focusable elements within the modal only (focus trap)
- Escape key closes the modal
- When modal closes, focus returns to the element that triggered it (usually a button)
- Background content is inert (clicking or tabbing doesn't interact with it)

**JavaScript implementation:**

```javascript
class AccessibleModal {
  constructor(modalElement, triggerButton) {
    this.modal = modalElement;
    this.trigger = triggerButton;
    this.previousFocus = null;
    this.focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }

  open() {
    // Save current focus
    this.previousFocus = document.activeElement;

    // Show modal
    this.modal.style.display = 'block';

    // Move focus to first interactive element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    } else {
      this.modal.focus();
    }

    // Add event listeners
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
    // Escape closes modal
    if (event.key === 'Escape') {
      this.close();
      return;
    }

    // Tab key focus trap
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  trapFocus(event) {
    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      // Shift+Tab on first element goes to last
      lastElement.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      // Tab on last element goes to first
      firstElement.focus();
      event.preventDefault();
    }
  }
}
```

### Pattern 2: Accessible Forms

Forms are the most commonly inaccessible component. Every input needs a label, errors need clear identification, and required fields need indication.

```html
<form>
  <!-- Basic labeled input -->
  <div class="form-field">
    <label for="email">Email Address</label>
    <input
      id="email"
      type="email"
      required
      aria-required="true"
      aria-describedby="email-help email-error"
    />
    <div id="email-help" class="help-text">
      We'll never share your email with anyone else.
    </div>
    <div id="email-error" role="alert" class="error-message" hidden>
      Email must include @ symbol
    </div>
  </div>

  <!-- Required field indicator -->
  <div class="form-field">
    <label for="name">
      Full Name
      <abbr title="required" aria-label="required">*</abbr>
    </label>
    <input
      id="name"
      type="text"
      required
      aria-required="true"
    />
  </div>

  <!-- Checkbox with description -->
  <div class="form-field">
    <input
      id="newsletter"
      type="checkbox"
      aria-describedby="newsletter-description"
    />
    <label for="newsletter">Subscribe to newsletter</label>
    <div id="newsletter-description" class="help-text">
      Receive monthly updates about new features
    </div>
  </div>

  <button type="submit">Submit Form</button>
</form>
```

**Requirements:**
- Every input has a visible `<label>` with matching `for`/`id`
- Required fields use `required` attribute or `aria-required="true"`
- Help text uses `aria-describedby` to associate with inputs
- Error messages use `role="alert"` so screen readers announce them
- When errors occur, set `aria-invalid="true"` on the input
- Group related inputs with `<fieldset>` and `<legend>`

**Error handling pattern:**

```javascript
function validateEmail(input) {
  const errorElement = document.getElementById('email-error');
  const isValid = input.value.includes('@');

  if (!isValid) {
    // Show error
    input.setAttribute('aria-invalid', 'true');
    errorElement.hidden = false;

    // Move focus to input
    input.focus();
  } else {
    // Clear error
    input.setAttribute('aria-invalid', 'false');
    errorElement.hidden = true;
  }

  return isValid;
}
```

### Pattern 3: Accessible Buttons and Links

Use the right element for the right purpose. Buttons perform actions, links navigate.

```html
<!-- Button for actions (saves data, opens modal) -->
<button onclick="saveForm()">Save Changes</button>
<button onclick="openModal()">Open Settings</button>

<!-- Link for navigation (goes to new page) -->
<a href="/profile">View Profile</a>
<a href="/settings">Account Settings</a>

<!-- Icon button needs accessible name -->
<button aria-label="Close dialog" onclick="closeModal()">
  <svg aria-hidden="true" focusable="false">
    <!-- Close icon SVG -->
  </svg>
</button>

<!-- Button that looks like link (for actions) -->
<button class="link-button" onclick="expandSection()">
  Show more details
</button>

<!-- Disabled button with explanation -->
<button disabled aria-describedby="save-disabled-reason">
  Save
</button>
<div id="save-disabled-reason" class="help-text">
  Complete all required fields to enable saving
</div>
```

**Guidelines:**
- Use `<button>` for actions that stay on the same page
- Use `<a>` for navigation that loads a new page
- Icon buttons need `aria-label` with the action name
- Mark SVG icons as `aria-hidden="true"` and `focusable="false"`
- Don't use `<div>` or `<span>` styled as buttons
- Explain why buttons are disabled using `aria-describedby`

### Pattern 4: Accessible Accordions

Accordions hide and show content sections. They need clear expanded/collapsed state.

```html
<div class="accordion">
  <h3>
    <button
      aria-expanded="false"
      aria-controls="panel-1"
      id="accordion-button-1"
    >
      Section 1: Getting Started
    </button>
  </h3>
  <div
    id="panel-1"
    role="region"
    aria-labelledby="accordion-button-1"
    hidden
  >
    <p>Content for section 1...</p>
  </div>

  <h3>
    <button
      aria-expanded="false"
      aria-controls="panel-2"
      id="accordion-button-2"
    >
      Section 2: Advanced Topics
    </button>
  </h3>
  <div
    id="panel-2"
    role="region"
    aria-labelledby="accordion-button-2"
    hidden
  >
    <p>Content for section 2...</p>
  </div>
</div>
```

**Requirements:**
- Accordion triggers are `<button>` elements
- Buttons have `aria-expanded` indicating current state
- Panels have `hidden` attribute when collapsed
- Arrow Up/Down keys navigate between accordion items (optional enhancement)
- Heading structure wraps buttons to create logical document outline

**JavaScript toggle:**

```javascript
function toggleAccordion(button) {
  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  const panelId = button.getAttribute('aria-controls');
  const panel = document.getElementById(panelId);

  // Toggle state
  button.setAttribute('aria-expanded', !isExpanded);
  panel.hidden = isExpanded;
}
```

### Pattern 5: Accessible Tabs

Tabs organize content into different views. They need proper ARIA roles and keyboard navigation.

```html
<div class="tabs">
  <div role="tablist" aria-label="Account settings">
    <button role="tab" aria-selected="true" aria-controls="profile-panel" id="profile-tab">
      Profile
    </button>
    <button role="tab" aria-selected="false" aria-controls="security-panel" id="security-tab">
      Security
    </button>
    <button role="tab" aria-selected="false" aria-controls="billing-panel" id="billing-tab">
      Billing
    </button>
  </div>

  <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab">
    <h2>Profile Settings</h2>
    <p>Content for profile tab...</p>
  </div>

  <div role="tabpanel" id="security-panel" aria-labelledby="security-tab" hidden>
    <h2>Security Settings</h2>
    <p>Content for security tab...</p>
  </div>

  <div role="tabpanel" id="billing-panel" aria-labelledby="billing-tab" hidden>
    <h2>Billing Settings</h2>
    <p>Content for billing tab...</p>
  </div>
</div>
```

**Keyboard interaction requirements:**
- Arrow Left/Right navigate between tabs
- Tab key moves from tab list to active panel content
- Home/End keys move to first/last tab (optional)
- Only the selected tab is in tab order (`tabindex="0"` on selected, `-1` on others)

### Pattern 6: Live Regions for Announcements

Dynamic content changes need announcement to screen readers without moving focus.

```html
<!-- Polite announcement (waits for pause) -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  4 items added to cart
</div>

<!-- Assertive announcement (interrupts) -->
<div role="alert" aria-live="assertive" class="sr-only">
  Your session will expire in 5 minutes
</div>

<!-- Status update -->
<div role="status" aria-live="polite" aria-atomic="true">
  Loading results... 45% complete
</div>
```

**Guidelines:**
- `aria-live="polite"` waits for screen reader to finish current announcement
- `aria-live="assertive"` interrupts immediately (use sparingly)
- `role="alert"` is shorthand for `aria-live="assertive"`
- `role="status"` is shorthand for `aria-live="polite"`
- `aria-atomic="true"` announces entire region, not just changed text
- Live regions must exist in DOM before updates occur

## Framework-Specific Guidance

### React Accessibility

React's JSX syntax mostly maps to HTML, but there are a few differences.

```javascript
import { useRef, useEffect } from 'react';

function AccessibleModal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Save focus and move to modal
      previousFocusRef.current = document.activeElement;
      modalRef.current?.focus();
    } else if (previousFocusRef.current) {
      // Return focus when closed
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex="-1"
      className="modal"
    >
      {children}
    </div>
  );
}
```

**React-specific notes:**
- Use `tabIndex` (camelCase) not `tabindex`
- Use `htmlFor` on labels, not `for` (since `for` is a JavaScript keyword)
- Use `aria-*` attributes as-is (kebab-case)
- Consider React Aria library for complex components
- Use Reach UI for accessible primitives

### Vue Accessibility

Vue templates support standard HTML with reactive bindings.

```vue
<template>
  <div class="accordion-item">
    <h3>
      <button
        :aria-expanded="isOpen"
        :aria-controls="`panel-${id}`"
        @click="isOpen = !isOpen"
      >
        {{ title }}
      </button>
    </h3>
    <div
      :id="`panel-${id}`"
      role="region"
      v-show="isOpen"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps(['title', 'id']);
const isOpen = ref(false);
</script>
```

**Vue-specific notes:**
- Use `:aria-expanded` (with colon) for dynamic attributes
- Use `@keydown` for keyboard event handlers
- Consider Headless UI for accessible components
- Use `v-show` instead of `v-if` for content that needs to stay in DOM

### Angular Accessibility

Angular v21+ includes Angular ARIA with headless accessible components. Use CDK for focus management.

```typescript
import { Component } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';

@Component({
  selector: 'app-modal',
  template: `
    <div
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      *ngIf="isOpen"
    >
      <h2 id="modal-title">{{ title }}</h2>
      <div>{{ content }}</div>
      <button (click)="onClose()">Close</button>
    </div>
  `,
  standalone: true,
  imports: [CdkTrapFocus]
})
export class ModalComponent {
  isOpen = false;
  title = '';
  content = '';

  onClose() {
    this.isOpen = false;
  }
}
```

**Angular-specific notes:**
- Use `[attr.aria-expanded]="isOpen"` for boolean ARIA attributes
- Angular CDK provides focus trap directives
- Angular ARIA provides accessible components
- Use LiveAnnouncer service for aria-live regions

## Testing Your Implementation

Automated tools catch roughly 25-30% of accessibility issues. Manual testing is required for the other 70-75%.

### Automated Testing

**axe DevTools (Browser Extension)**
- Catches 84% of automatically detectable issues
- Best-in-class false positive rate
- Clear explanations and remediation guidance
- Free browser extension, paid team version available
- Integrates with Chrome, Firefox, Edge

**WAVE (Web Accessibility Evaluation Tool)**
- Visual feedback with icons overlaid on page
- Good for quick audits
- Shows contrast failures visually
- Free browser extension and online version

**Lighthouse (Built into Chrome DevTools)**
- Basic accessibility audit
- Part of performance/SEO/PWA audit
- Good for CI/CD integration
- Powered by axe-core

**Pa11y CI (Command-line)**
- Automated testing in build pipelines
- Tests multiple URLs from configuration file
- Fails builds on violations
- Free and open source

Install and configure Pa11y:

```bash
npm install -g pa11y-ci

# Create .pa11yci.json
{
  "urls": [
    "http://localhost:3000",
    "http://localhost:3000/about",
    "http://localhost:3000/contact"
  ],
  "standard": "WCAG2AA",
  "timeout": 60000
}

# Run tests
pa11y-ci
```

### Manual Testing

**Keyboard Navigation (Required)**

Unplug your mouse and navigate using only:
- Tab/Shift+Tab to move between elements
- Enter to activate links and buttons
- Space to toggle checkboxes and buttons
- Arrow keys for custom controls
- Escape to close modals

Verify:
- All interactive elements are reachable
- Focus indicators are clearly visible
- Tab order follows logical reading order
- No keyboard traps exist
- Skip links work correctly

**Screen Reader Testing (Required for 30% of WCAG Criteria)**

Windows: NVDA (free) or JAWS (paid, most widely used in enterprise)
- Download NVDA: https://www.nvaccess.org/
- Turn on NVDA, navigate your site
- Listen to what's announced
- Verify forms are understandable
- Check image alt text makes sense

macOS: VoiceOver (built-in)
- Cmd+F5 to enable
- Use VO keys (Control+Option) + arrow keys
- Check rotor navigation (VO+U)
- Test form completion

Mobile: VoiceOver (iOS), TalkBack (Android)
- Test on real devices, not emulators
- Screen readers work differently on mobile
- Touch gestures change interaction patterns

**Screen reader market share (2024 WebAIM survey):**
- JAWS: 40-41% primary usage (enterprise standard)
- NVDA: 38-39% primary usage (growing rapidly, free)
- VoiceOver: 9.7% desktop, 70.6% mobile

Test with at least NVDA on Windows and VoiceOver on macOS/iOS.

**Zoom Testing**

Test at 200% zoom (WCAG AA requirement):
- Use browser zoom (Cmd/Ctrl + "+")
- Verify no horizontal scroll for text
- Check all functionality still works
- Ensure focus indicators remain visible
- Verify sticky elements don't obscure content

**Color Contrast Testing**

Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

Test all text/background combinations:
- Body text on backgrounds
- Link text (default, visited, hover, focus)
- Button text on button backgrounds
- Text over images
- Placeholder text (often fails, use labels instead)

### Hybrid Testing Approach

This is the practical strategy that catches the most issues:

1. **Run automated tools first** - axe DevTools on every page
2. **Fix all automated findings** - these are usually quick wins
3. **Manual keyboard testing** - 10-15 minutes per key user flow
4. **Screen reader spot checks** - Test 1-2 critical pages with NVDA/VoiceOver
5. **User testing with people with disabilities** - Ideal but not always feasible

Automated tools catch low-hanging fruit (missing alt text, contrast failures, missing labels). Manual testing catches interaction problems (keyboard traps, confusing focus order, unclear error messages). User testing reveals real-world usability issues that both approaches miss.

## Common Pitfalls

**ARIA Overuse**

Research shows pages with ARIA have an average of 57 accessibility errors compared to 27 errors on pages using semantic HTML.

First Rule of ARIA: Don't use ARIA. Use semantic HTML elements first. Only add ARIA when HTML doesn't provide the needed semantics.

```html
<!-- Bad: ARIA on div -->
<div role="button" tabindex="0" onclick="save()">Save</div>

<!-- Good: Semantic HTML -->
<button onclick="save()">Save</button>

<!-- Bad: ARIA navigation -->
<div role="navigation">
  <div role="list">
    <div role="listitem"><a href="/">Home</a></div>
  </div>
</div>

<!-- Good: Semantic HTML -->
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>
```

**Missing Focus Management**

Single-page apps that dynamically load content often break screen reader navigation. When content changes:

```javascript
// After loading new content
document.getElementById('main-heading').focus();
document.getElementById('main-heading').scrollIntoView();

// Or announce the change
const announcement = document.createElement('div');
announcement.setAttribute('role', 'status');
announcement.setAttribute('aria-live', 'polite');
announcement.textContent = 'Search results loaded';
document.body.appendChild(announcement);
```

**Inaccessible Error Messages**

Errors that appear but aren't announced to screen readers:

```html
<!-- Bad: Error not announced -->
<div class="error" style="color: red;">Invalid email</div>

<!-- Good: Error announced with role="alert" -->
<div role="alert" class="error">Invalid email address</div>

<!-- Better: Error associated with input -->
<input
  id="email"
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<div id="email-error" role="alert">
  Email must include @ symbol
</div>
```

**Color-Only Indicators**

Never rely on color alone to convey meaning:

```html
<!-- Bad: Color only -->
<span style="color: red;">Required field</span>

<!-- Good: Color + icon + text -->
<span class="required">
  <svg aria-hidden="true"><!-- asterisk icon --></svg>
  Required field
</span>

<!-- Bad: Color-coded status -->
<div class="status-green">Active</div>

<!-- Good: Icon + text + color -->
<div class="status">
  <svg aria-label="Status:"><!-- checkmark icon --></svg>
  Active
</div>
```

**Placeholder as Label**

Placeholders disappear when users start typing and aren't proper labels:

```html
<!-- Bad: Placeholder only -->
<input type="email" placeholder="Enter your email" />

<!-- Good: Label + optional placeholder -->
<label for="email">Email Address</label>
<input id="email" type="email" placeholder="you@example.com" />
```

## Your Next Steps

1. **Run axe DevTools on all pages** - Fix violations it finds
2. **Test 3-5 key user flows with keyboard only** - Sign up, login, checkout, search, etc.
3. **Test 1-2 critical pages with NVDA or VoiceOver** - Homepage and primary conversion page
4. **Integrate Pa11y into CI/CD pipeline** - Catch new violations before production
5. **Create accessibility checklist for code reviews** - Make it part of your process

For preparing for comprehensive audits, creating VPATs/ACRs, implementing continuous monitoring, and handling enterprise-scale remediation, read the **[Deep Water level](../deep-water/)**.

## Related Topics

- **[Frontend Architecture](../../frontend-architecture/mid-depth/)** - Designing component systems with accessibility patterns built in
- **[Error Handling & Resilience](../../error-handling-resilience/mid-depth/)** - Implementing accessible error states and recovery flows
- **[State Management Design](../../state-management-design/mid-depth/)** - Managing accessible form state and dynamic content
- **[Performance & Scalability Design](../../performance-scalability-design/mid-depth/)** - Performance impacts accessibility; slow sites harm users with older devices
