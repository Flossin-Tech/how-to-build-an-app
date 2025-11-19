---
title: "Accessibility Testing"
phase: "04-testing"
topic: "accessibility-testing"
depth: "mid-depth"
reading_time: 25
prerequisites: ["accessibility-testing-surface"]
related_topics: ["ui-ux-design", "semantic-html", "aria-patterns", "compliance-validation"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Accessibility Testing (Mid-Depth)

## What This Builds On

The surface layer covered the essentials: 15-minute accessibility audits, the Big 5 issues (alt text, form labels, color contrast, keyboard access, heading structure), and basic WCAG Level A compliance. That prevents the majority of accessibility lawsuits and serves most users.

This mid-depth layer is about achieving WCAG Level AA compliance for production systems. You're building for enterprise customers who require accessibility compliance, government contracts that mandate Section 508, or simply serving all users well.

What you'll learn:
- Comprehensive WCAG AA testing across all four POUR principles
- Screen reader testing methodology with NVDA and VoiceOver
- ARIA patterns for custom components (and when not to use ARIA)
- Automated accessibility testing in CI/CD pipelines
- User testing with people with disabilities
- What automated tools miss and why manual testing matters

This is the level where you can confidently say "our application meets WCAG 2.1 Level AA."

## The Problems You're Solving

Accessibility compliance is a spectrum. Surface-level testing catches the obvious problems. Production systems face harder challenges:

**The automated testing gap**: Automated tools catch about 57% of accessibility issues. You run Lighthouse, fix everything it flags, feel confident, then a blind user reports your form is unusable with a screen reader. The tool couldn't tell that your error messages aren't announced properly.

**ARIA makes things worse**: You learn ARIA exists and start adding it everywhere. `role="button"` on actual buttons. `aria-label` that contradicts visible text. Custom dropdowns that trap keyboard focus. ARIA used incorrectly is worse than no ARIA - you've broken accessible defaults while trying to improve them.

**Accessibility regressions**: You ship an accessible form. Three months later someone refactors it to use a UI library, and suddenly keyboard navigation breaks. Without accessibility testing in CI/CD, regressions slip through.

**Government and enterprise requirements**: Your customer requires WCAG AA compliance, preferably with a third-party audit. You need to prove compliance systematically, not just claim you tested with a screen reader once.

**Real user experience problems**: Automated tests pass, manual keyboard testing works, but when someone who relies on a screen reader daily tries to use your app, they find it confusing and time-consuming. Meeting technical criteria doesn't guarantee good UX.

This layer addresses all of these.

## WCAG 2.1 AA Comprehensive Testing

WCAG organizes accessibility requirements into four principles: Perceivable, Operable, Understandable, and Robust (POUR). Level AA includes 96 success criteria across these principles.

You don't need to memorize all 96. Understanding the principles and testing systematically catches most issues.

### The Four POUR Principles in Depth

**1. Perceivable - Information Must Be Presentable**

The core question: Can all users perceive your content, regardless of sensory abilities?

**Testing checklist**:
- [ ] All images have meaningful alt text (not just present)
- [ ] Video has synchronized captions
- [ ] Audio-only content has transcripts
- [ ] Video has audio descriptions for visual-only content
- [ ] Color is not the only way information is conveyed
- [ ] Text can be resized to 200% without loss of content or functionality
- [ ] Images of text avoided (use actual text styled with CSS)
- [ ] Audio doesn't play automatically for more than 3 seconds
- [ ] Text has minimum color contrast (4.5:1 normal, 3:1 large)
- [ ] Text can be resized without assistive technology

**Alt text quality testing**:

Automated tools check if alt text exists. They can't judge quality.

```javascript
// Test: Alt text quality (beyond just presence)
import { render, screen } from '@testing-library/react'
import { ProductCard } from './ProductCard'

test('product images have descriptive alt text', () => {
  const product = {
    name: 'Blue Running Shoes',
    image: 'shoes-product-123.jpg'
  }

  render(<ProductCard product={product} />)

  const image = screen.getByRole('img')
  const altText = image.getAttribute('alt')

  // Not just filename or generic text
  expect(altText).not.toMatch(/\.(jpg|png|gif|webp)$/i)
  expect(altText).not.toBe('image')
  expect(altText).not.toBe('product image')
  expect(altText.length).toBeGreaterThan(5)

  // Should describe the product specifically
  expect(altText.toLowerCase()).toContain(product.name.toLowerCase())
})

// Test: Decorative images have empty alt
test('decorative border images have empty alt', () => {
  render(<DecorativeBorder />)

  const decorativeImage = screen.getByRole('img', { hidden: true })
  expect(decorativeImage).toHaveAttribute('alt', '')
})
```

**Color contrast testing**:

WCAG AA requires:
- Normal text (under 18pt): 4.5:1 contrast ratio
- Large text (18pt+ or 14pt+ bold): 3:1 contrast ratio
- UI components and graphics: 3:1 contrast ratio

```javascript
// Test: Color contrast with axe
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('text has sufficient color contrast', async () => {
  const { container } = render(<MyComponent />)

  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: true }
    }
  })

  expect(results.violations.filter(v => v.id === 'color-contrast'))
    .toHaveLength(0)
})
```

Chrome DevTools shows contrast ratios in the color picker. Use this while developing to catch issues early.

**Text resizing testing**:

Users must be able to resize text to 200% without loss of content or functionality.

Manual test:
1. Set browser zoom to 200%
2. Verify all content remains visible
3. Verify no horizontal scrolling required for text
4. Verify interactive elements remain usable

Common failures:
- Fixed width containers that cut off text
- Absolute positioning that overlaps content
- Font sizes set in pixels that don't scale

**2. Operable - Interface Must Be Operable**

The core question: Can all users operate your interface, regardless of physical abilities?

**Testing checklist**:
- [ ] All functionality available via keyboard
- [ ] No keyboard traps (can tab into and out of everything)
- [ ] Skip links to main content present
- [ ] Visible focus indicators on all interactive elements
- [ ] Users have enough time to read and use content
- [ ] No content flashes more than 3 times per second (seizure risk)
- [ ] Page titles are descriptive and unique
- [ ] Focus order follows logical reading sequence
- [ ] Link purpose clear from link text or context
- [ ] Multiple ways to navigate (menu, search, sitemap)
- [ ] Headings and labels describe topic or purpose
- [ ] Current location in navigation indicated

**Keyboard navigation comprehensive testing**:

```javascript
// Test: Modal keyboard interaction
import userEvent from '@testing-library/user-event'

test('modal can be opened and closed with keyboard', async () => {
  const user = userEvent.setup()
  render(<ModalExample />)

  const trigger = screen.getByRole('button', { name: 'Open Modal' })

  // Open with Enter
  trigger.focus()
  await user.keyboard('{Enter}')

  const dialog = screen.getByRole('dialog')
  expect(dialog).toBeInTheDocument()
  expect(dialog).toHaveFocus()

  // Close with Escape
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  // Focus returns to trigger (focus management)
  expect(trigger).toHaveFocus()
})

// Test: Focus trap in modal
test('focus stays within modal when open', async () => {
  const user = userEvent.setup()
  render(<Modal isOpen={true} onClose={() => {}} />)

  const modal = screen.getByRole('dialog')
  const firstButton = within(modal).getByRole('button', { name: 'Action' })
  const lastButton = within(modal).getByRole('button', { name: 'Close' })

  // Focus starts in modal
  expect(document.activeElement).toBeInTheDocument()
  expect(modal).toContainElement(document.activeElement)

  // Tab through modal elements
  firstButton.focus()
  await user.tab()
  await user.tab()
  await user.tab()

  // Eventually cycles back to first focusable element
  expect(modal).toContainElement(document.activeElement)

  // Shift+Tab goes backwards
  await user.tab({ shift: true })
  expect(lastButton).toHaveFocus()
})

// Test: Skip links
test('skip link allows jumping to main content', async () => {
  const user = userEvent.setup()
  render(<PageWithNavigation />)

  // First tab focuses skip link
  await user.tab()
  const skipLink = screen.getByRole('link', { name: /skip to main/i })
  expect(skipLink).toHaveFocus()

  // Activating skip link moves focus to main content
  await user.keyboard('{Enter}')
  const main = screen.getByRole('main')
  expect(main).toHaveFocus()
})
```

**Focus indicator testing**:

All interactive elements need visible focus indicators. Many developers remove default focus styles for aesthetic reasons, breaking keyboard navigation.

```css
/* Bad: removes focus indicator */
button:focus {
  outline: none;
}

/* Good: custom focus indicator */
button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

Test manually by tabbing through your interface. You should always see where focus is.

**3. Understandable - Information Must Be Understandable**

The core question: Can all users understand your content and how to use it?

**Testing checklist**:
- [ ] Page language set (`<html lang="en">`)
- [ ] Language changes in content marked up (`<span lang="es">`)
- [ ] Form labels and instructions clear
- [ ] Error messages helpful and specific
- [ ] Error prevention for important actions (confirmations)
- [ ] Navigation consistent across pages
- [ ] Consistent identification of components
- [ ] Context-sensitive help available
- [ ] Labels for all form inputs

**Error message testing**:

Error messages must be helpful, not just present.

```javascript
// Test: Form shows helpful error messages
test('form shows specific error for invalid email', async () => {
  const user = userEvent.setup()
  render(<SignupForm />)

  const emailInput = screen.getByLabelText('Email address')
  const submitButton = screen.getByRole('button', { name: 'Sign Up' })

  // Submit with invalid email
  await user.type(emailInput, 'notanemail')
  await user.click(submitButton)

  // Error should be specific and helpful
  const error = await screen.findByRole('alert')

  // Not vague
  expect(error.textContent).not.toBe('Error')
  expect(error.textContent).not.toBe('Invalid input')

  // Provides context
  expect(error.textContent).toContain('email')

  // Provides guidance
  expect(error.textContent.toLowerCase()).toMatch(/@|at sign|valid email/)

  // Error associated with field
  expect(emailInput).toHaveAttribute('aria-invalid', 'true')
  expect(emailInput).toHaveAttribute('aria-describedby')

  const errorId = emailInput.getAttribute('aria-describedby')
  expect(error).toHaveAttribute('id', errorId)
})

// Test: Multi-field validation
test('form identifies which fields have errors', async () => {
  const user = userEvent.setup()
  render(<SignupForm />)

  const submitButton = screen.getByRole('button', { name: 'Sign Up' })

  // Submit empty form
  await user.click(submitButton)

  // Each invalid field marked
  const emailInput = screen.getByLabelText('Email address')
  const passwordInput = screen.getByLabelText('Password')

  expect(emailInput).toHaveAttribute('aria-invalid', 'true')
  expect(passwordInput).toHaveAttribute('aria-invalid', 'true')

  // Summary of errors at top (optional but helpful)
  const errorSummary = screen.queryByRole('region', { name: /error/i })
  if (errorSummary) {
    expect(errorSummary).toContainElement(
      screen.getByText(/email/i)
    )
    expect(errorSummary).toContainElement(
      screen.getByText(/password/i)
    )
  }
})
```

**Language attribute testing**:

Screen readers use the language attribute to pronounce words correctly.

```javascript
// Test: Page language is set
test('page has language attribute', () => {
  render(<App />)

  const html = document.documentElement
  expect(html).toHaveAttribute('lang')

  const lang = html.getAttribute('lang')
  expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/) // e.g., "en" or "en-US"
})

// Test: Language changes are marked
test('Spanish quote has lang attribute', () => {
  render(<Article />)

  const quote = screen.getByText(/¿Cómo estás?/)
  const spanishElement = quote.closest('[lang="es"]')

  expect(spanishElement).toBeInTheDocument()
})
```

**4. Robust - Content Must Work with Assistive Technologies**

The core question: Can assistive technologies parse and present your content reliably?

**Testing checklist**:
- [ ] Valid HTML (no syntax errors that break parsing)
- [ ] ARIA used correctly when needed
- [ ] No ARIA where native HTML suffices
- [ ] Name, role, value available for all UI components
- [ ] Status messages announced to screen readers

**Custom component ARIA testing**:

When you build custom widgets, you need ARIA to make them accessible. Native HTML elements have built-in accessibility - custom elements don't.

```javascript
// Test: Custom select has proper combobox role and ARIA
test('custom select is accessible', async () => {
  const user = userEvent.setup()
  const options = ['Small', 'Medium', 'Large']

  render(<CustomSelect options={options} label="Size" />)

  const combobox = screen.getByRole('combobox', { name: 'Size' })

  // Initial state
  expect(combobox).toHaveAttribute('aria-expanded', 'false')
  expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')

  // Has accessible label
  expect(combobox).toHaveAccessibleName('Size')

  // Open dropdown
  await user.click(combobox)
  expect(combobox).toHaveAttribute('aria-expanded', 'true')

  // Controls relationship
  const listboxId = combobox.getAttribute('aria-controls')
  const listbox = document.getElementById(listboxId)
  expect(listbox).toHaveRole('listbox')

  // Options have correct role
  const optionElements = within(listbox).getAllByRole('option')
  expect(optionElements).toHaveLength(3)

  // Can select with keyboard
  await user.keyboard('{ArrowDown}')
  expect(optionElements[0]).toHaveAttribute('aria-selected', 'true')

  await user.keyboard('{Enter}')
  expect(combobox).toHaveAttribute('aria-expanded', 'false')
})
```

**Live region testing**:

When content updates dynamically, screen readers don't notice unless you use ARIA live regions.

```javascript
// Test: Live region announces status updates
test('upload status announced to screen readers', async () => {
  const user = userEvent.setup()
  render(<FileUpload />)

  // Live region exists
  const status = screen.getByRole('status')
  expect(status).toHaveAttribute('aria-live', 'polite')
  expect(status).toHaveAttribute('aria-atomic', 'true')

  // Initially empty or neutral
  expect(status.textContent).toBe('')

  // Upload file
  const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
  const input = screen.getByLabelText('Upload file')
  await user.upload(input, file)

  // Status updated (announced by screen reader)
  await waitFor(() => {
    expect(status).toHaveTextContent(/uploading/i)
  })

  // Completion announced
  await waitFor(() => {
    expect(status).toHaveTextContent(/complete|uploaded/i)
  }, { timeout: 3000 })
})

// Test: Alert role for urgent messages
test('error message uses alert role', async () => {
  const user = userEvent.setup()
  render(<PaymentForm />)

  const submitButton = screen.getByRole('button', { name: 'Submit Payment' })
  await user.click(submitButton)

  // Alert role interrupts screen reader
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent(/required|error/i)
})
```

## Screen Reader Testing

Automated tools can't test screen reader experience. You need to actually use screen readers.

### Screen Reader Testing Strategy

The reality: there are multiple screen readers with different behaviors. You can't test with all of them comprehensively.

**Priority testing matrix**:

| Browser | Screen Reader | OS | Coverage | Priority |
|---------|--------------|-----|----------|----------|
| Chrome | NVDA | Windows | ~40% | High |
| Firefox | NVDA | Windows | ~5% | Medium |
| Safari | VoiceOver | macOS | ~10% | High |
| Safari | VoiceOver | iOS | ~15% | Medium |
| Chrome | TalkBack | Android | ~8% | Low |
| Edge | JAWS | Windows | ~20% | Enterprise |

NVDA and VoiceOver cover roughly 65% of screen reader users. Start there.

**Getting started**:
- **NVDA** (Windows): Free download from nvaccess.org, sounds professional, widely used
- **VoiceOver** (Mac/iOS): Built-in, press Cmd+F5 on Mac
- **JAWS** (Windows): Industry standard, expensive ($95/year), most comprehensive
- **Narrator** (Windows): Built-in, less commonly used for serious testing

### Screen Reader Test Scenarios

**Test 1: Page navigation with landmarks**

```
1. Turn on screen reader
2. Use landmark navigation:
   - NVDA: D key to jump between landmarks
   - VoiceOver: VO + U, then select Landmarks
3. Verify announcements:
   - "Banner" for <header>
   - "Navigation" for <nav>
   - "Main" for <main>
   - "Complementary" for <aside>
   - "Contentinfo" for <footer>
4. Verify all page sections accessible
5. Verify can jump directly to main content
```

Common issues:
- Using divs instead of semantic HTML (no landmarks)
- Multiple landmarks of same type without labels
- Main content not in `<main>` landmark
- Skip link missing or broken

**Test 2: Form completion**

```
1. Navigate to form with Tab
2. Verify each field announces:
   - Label
   - Field type
   - Current value (if any)
   - Required status
   - Instructions or help text
3. Enter data, verify input echoed
4. Submit with invalid data
5. Verify error announcement:
   - Error message content
   - Which field has error
   - How to fix
6. Verify can navigate back to field
7. Fix error and resubmit
```

Example of good announcement:
> "Email address, edit, required. Enter your email address for account recovery."

Example of bad announcement:
> "Edit text." (No label, no context, not helpful)

**Test 3: Interactive components**

```
1. Navigate to component (button, modal, dropdown, tabs)
2. Verify role announced:
   - "Button" for buttons
   - "Dialog" for modals
   - "Menu" for menus
   - "Tab" for tabs
   - "Combobox" for custom selects
3. Verify name/label announced
4. Verify state announced:
   - "Expanded" or "Collapsed"
   - "Selected" or "Not selected"
   - "Checked" or "Not checked"
5. Activate component
6. Verify state change announced
7. Verify focus management correct
8. Verify can close/deactivate
```

**Test 4: Data tables**

```
1. Navigate to table
2. Verify announced as table
3. Verify row and column count announced
4. Enter table mode (specific to screen reader)
5. Navigate cells
6. Verify headers announced for each cell
7. Verify can navigate by row
8. Verify can navigate by column
```

For a table with headers "Name" and "Price", navigating to a cell should announce:
> "Alice, Name column, row 2 of 5"

Not just:
> "Alice" (Missing context)

### Automated Screen Reader Testing Limitations

You can't fully automate screen reader testing, but you can check prerequisites:

```javascript
// Check accessible name is present
test('icon button has accessible name', () => {
  render(<IconButton icon="trash" onClick={() => {}} />)

  // Should have accessible name even without visible text
  const button = screen.getByRole('button', { name: /delete/i })
  expect(button).toBeInTheDocument()
})

// Check reading order matches visual order
test('content reading order is logical', () => {
  const { container } = render(<ProductCard />)

  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const paragraphs = container.querySelectorAll('p')
  const buttons = container.querySelectorAll('button')

  const allElements = [...headings, ...paragraphs, ...buttons]

  // Order should be: title, description, price, button
  // This is brittle but catches major reordering issues
  expect(allElements[0].textContent).toContain('Product')
  expect(allElements[allElements.length - 1].tagName).toBe('BUTTON')
})

// Check ARIA relationships are valid
test('combobox controls relationship is correct', () => {
  render(<CustomSelect options={['A', 'B', 'C']} />)

  const combobox = screen.getByRole('combobox')
  const controlsId = combobox.getAttribute('aria-controls')

  expect(controlsId).toBeTruthy()

  const listbox = document.getElementById(controlsId)
  expect(listbox).toBeInTheDocument()
  expect(listbox).toHaveRole('listbox')
})
```

## ARIA Patterns and Common Mistakes

ARIA (Accessible Rich Internet Applications) lets you make custom widgets accessible. It also lets you make accessible things inaccessible if used incorrectly.

### The Five Rules of ARIA

From the W3C ARIA spec:

**Rule 1: Don't use ARIA if you can use native HTML**

```html
<!-- Bad: unnecessary ARIA -->
<div role="button" tabindex="0" onclick="submit()">Submit</div>

<!-- Good: native HTML -->
<button onclick="submit()">Submit</button>
```

Native HTML elements have accessibility built in. They work with keyboard, have correct roles, manage focus properly. ARIA requires you to rebuild all of that manually.

**Rule 2: Don't change native semantics unless absolutely necessary**

```html
<!-- Bad: breaks native button semantics -->
<button role="link" onclick="navigate()">Next Page</button>

<!-- Good: use correct element -->
<a href="/next">Next Page</a>
```

If you need a link, use `<a>`. If you need a button, use `<button>`. Don't fight the browser.

**Rule 3: All interactive ARIA controls must be keyboard usable**

```html
<!-- Bad: clickable but not keyboard accessible -->
<div role="button" onclick="submit()">Submit</div>

<!-- Good: keyboard accessible -->
<div
  role="button"
  tabindex="0"
  onclick="submit()"
  onkeydown="(e) => (e.key === 'Enter' || e.key === ' ') && submit()"
>
  Submit
</div>

<!-- Better: use native button -->
<button onclick="submit()">Submit</button>
```

**Rule 4: Don't use `role="presentation"` or `aria-hidden="true"` on focusable elements**

```html
<!-- Bad: button is focusable but hidden from screen readers -->
<button aria-hidden="true">Click me</button>

<!-- Bad: focusable but role removed -->
<button role="presentation">Click me</button>
```

This creates keyboard traps. Users can focus elements they can't see or understand.

**Rule 5: All interactive elements must have an accessible name**

```html
<!-- Bad: no accessible name -->
<button><i class="icon-trash"></i></button>

<!-- Good: aria-label provides name -->
<button aria-label="Delete item">
  <i class="icon-trash" aria-hidden="true"></i>
</button>
```

### Common ARIA Patterns with Tests

**Tabs pattern**:

```javascript
// Implementation and test for accessible tabs
test('tabs work with keyboard and screen reader', async () => {
  const user = userEvent.setup()

  render(
    <Tabs>
      <TabList aria-label="Content sections">
        <Tab>Overview</Tab>
        <Tab>Details</Tab>
        <Tab>Reviews</Tab>
      </TabList>
      <TabPanel>Overview content</TabPanel>
      <TabPanel>Details content</TabPanel>
      <TabPanel>Reviews content</TabPanel>
    </Tabs>
  )

  const tabs = screen.getAllByRole('tab')
  const tablist = screen.getByRole('tablist', { name: 'Content sections' })
  const panels = screen.getAllByRole('tabpanel', { hidden: true })

  // First tab selected by default
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
  expect(tabs[2]).toHaveAttribute('aria-selected', 'false')

  // Only selected panel visible
  expect(panels[0]).toBeVisible()
  expect(panels[1]).not.toBeVisible()
  expect(panels[2]).not.toBeVisible()

  // Tabs control panels via aria-controls
  const panelId = tabs[0].getAttribute('aria-controls')
  expect(panels[0]).toHaveAttribute('id', panelId)

  // Arrow key navigation
  tabs[0].focus()
  await user.keyboard('{ArrowRight}')

  expect(tabs[1]).toHaveFocus()
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
  expect(panels[1]).toBeVisible()

  // Wraps around at end
  tabs[2].focus()
  await user.keyboard('{ArrowRight}')
  expect(tabs[0]).toHaveFocus()

  // Home/End keys
  await user.keyboard('{End}')
  expect(tabs[2]).toHaveFocus()

  await user.keyboard('{Home}')
  expect(tabs[0]).toHaveFocus()
})
```

**Modal dialog pattern**:

```javascript
test('modal dialog is accessible', async () => {
  const user = userEvent.setup()
  const onClose = jest.fn()

  render(<Modal isOpen={true} onClose={onClose} title="Confirm Action" />)

  const dialog = screen.getByRole('dialog', { name: 'Confirm Action' })

  // Dialog has accessible name
  expect(dialog).toHaveAttribute('aria-labelledby')

  // Dialog is modal
  expect(dialog).toHaveAttribute('aria-modal', 'true')

  // Focus moved to dialog
  expect(dialog).toContainElement(document.activeElement)

  // Escape key closes
  await user.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})
```

**Autocomplete/combobox pattern**:

```javascript
test('autocomplete announces results', async () => {
  const user = userEvent.setup()

  render(<Autocomplete label="Search products" />)

  const combobox = screen.getByRole('combobox', { name: 'Search products' })

  // Initial state
  expect(combobox).toHaveAttribute('aria-expanded', 'false')
  expect(combobox).toHaveAttribute('aria-autocomplete', 'list')

  // Type to trigger search
  await user.type(combobox, 'shoe')

  // Results appear
  await waitFor(() => {
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
  })

  const listbox = screen.getByRole('listbox')
  const options = within(listbox).getAllByRole('option')

  expect(options.length).toBeGreaterThan(0)

  // Active descendant for keyboard navigation
  await user.keyboard('{ArrowDown}')

  const activeDescendantId = combobox.getAttribute('aria-activedescendant')
  expect(activeDescendantId).toBeTruthy()
  expect(document.getElementById(activeDescendantId)).toHaveAttribute('role', 'option')
})
```

### Common ARIA Mistakes

**Mistake 1: Redundant ARIA**

```html
<!-- Bad: role="button" is implicit on <button> -->
<button role="button">Click me</button>

<!-- Bad: role="link" is implicit on <a> -->
<a href="/page" role="link">Next page</a>

<!-- Good: use implicit roles -->
<button>Click me</button>
<a href="/page">Next page</a>
```

**Mistake 2: Missing required ARIA attributes**

Each ARIA role has required attributes.

```javascript
test('combobox has required ARIA attributes', () => {
  render(<Autocomplete />)

  const combobox = screen.getByRole('combobox')

  // All required for combobox role
  expect(combobox).toHaveAttribute('aria-expanded')
  expect(combobox).toHaveAttribute('aria-controls')
  expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')

  // aria-autocomplete required if it autocompletes
  expect(combobox).toHaveAttribute('aria-autocomplete')
})
```

**Mistake 3: Incorrect state management**

ARIA states must reflect actual UI state.

```javascript
// Bad: aria-expanded doesn't match visual state
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        aria-expanded="false" // Always false! Bug!
        onClick={() => setIsOpen(!isOpen)}
      >
        Menu
      </button>
      {isOpen && <div role="menu">...</div>}
    </>
  )
}

// Good: aria-expanded matches state
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        aria-expanded={isOpen} // Correctly reflects state
        onClick={() => setIsOpen(!isOpen)}
      >
        Menu
      </button>
      {isOpen && <div role="menu">...</div>}
    </>
  )
}
```

**Mistake 4: `aria-label` overriding visible text**

`aria-label` completely replaces visible text for screen reader users. If they don't match, sighted screen reader users get confused.

```html
<!-- Bad: aria-label doesn't match visible text -->
<button aria-label="Save document">Submit</button>

<!-- Good: aria-label matches -->
<button aria-label="Submit">Submit</button>

<!-- Better: let visible text be the accessible name -->
<button>Submit</button>
```

Use `aria-label` when there's no visible text (icon buttons). Otherwise, use visible text.

## Automated Accessibility Testing in CI/CD

Automated testing catches regressions and makes accessibility testing systematic rather than ad-hoc.

### Component-Level Testing

Add accessibility testing to every component test:

```javascript
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('LoginForm', () => {
  test('has no accessibility violations', async () => {
    const { container } = render(<LoginForm />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('has no violations with errors shown', async () => {
    const { container } = render(
      <LoginForm
        errors={{ email: 'Invalid email', password: 'Required' }}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('has no violations in loading state', async () => {
    const { container } = render(<LoginForm isLoading={true} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

Test all component states: default, loading, error, empty, full.

### Page-Level Testing

Use tools like Pa11y or Lighthouse CI for deployed pages:

```javascript
// pa11y-ci configuration (.pa11yci.json)
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe", "htmlcs"],
    "chromeLaunchConfig": {
      "args": ["--no-sandbox"]
    }
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/signup",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/settings"
  ]
}
```

```bash
# Run in CI/CD
npx pa11y-ci --sitemap https://staging.example.com/sitemap.xml
```

### CI/CD Pipeline Integration

```yaml
# GitHub Actions example
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Component-level tests with jest-axe
      - name: Run accessibility unit tests
        run: npm run test:a11y

      # Build and deploy to preview
      - name: Build application
        run: npm run build

      - name: Deploy to preview
        run: npm run deploy:preview
        env:
          PREVIEW_URL: ${{ secrets.PREVIEW_URL }}

      # Page-level tests with Pa11y CI
      - name: Run Pa11y CI
        run: |
          npx wait-on ${{ secrets.PREVIEW_URL }}
          npx pa11y-ci --sitemap ${{ secrets.PREVIEW_URL }}/sitemap.xml

      # Lighthouse audit
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            ${{ secrets.PREVIEW_URL }}
            ${{ secrets.PREVIEW_URL }}/login
            ${{ secrets.PREVIEW_URL }}/dashboard
          runs: 3
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Accessibility Regression Prevention

Use snapshot testing for accessibility trees:

```javascript
// Snapshot testing for accessibility structure
test('navigation accessibility tree matches snapshot', () => {
  const { container } = render(<Navigation />)

  const accessibilityTree = extractAccessibilityTree(container)
  expect(accessibilityTree).toMatchSnapshot()
})

// Helper function
function extractAccessibilityTree(container) {
  const elements = Array.from(container.querySelectorAll('*'))

  return elements
    .filter(el => {
      // Only elements with semantic meaning
      return (
        el.getAttribute('role') ||
        isSemanticElement(el) ||
        el.hasAttribute('aria-label') ||
        el.hasAttribute('aria-labelledby')
      )
    })
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || getImplicitRole(el),
      name: getAccessibleName(el),
      expanded: el.getAttribute('aria-expanded'),
      selected: el.getAttribute('aria-selected'),
      checked: el.getAttribute('aria-checked'),
      level: el.getAttribute('aria-level'),
      controls: el.getAttribute('aria-controls'),
      describedBy: el.getAttribute('aria-describedby')
    }))
}

function isSemanticElement(el) {
  const semanticTags = [
    'header', 'nav', 'main', 'aside', 'footer', 'article', 'section',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'button', 'a', 'input', 'select', 'textarea'
  ]
  return semanticTags.includes(el.tagName.toLowerCase())
}

function getAccessibleName(el) {
  return (
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    el.textContent?.trim() ||
    ''
  )
}

function getImplicitRole(el) {
  const roleMap = {
    'button': 'button',
    'a': 'link',
    'nav': 'navigation',
    'main': 'main',
    'header': 'banner',
    'footer': 'contentinfo',
    'aside': 'complementary',
    'h1': 'heading',
    'h2': 'heading',
    'h3': 'heading'
  }
  return roleMap[el.tagName.toLowerCase()] || null
}
```

When the structure changes unexpectedly, the snapshot fails and you investigate.

## User Testing with People with Disabilities

Automated tools catch 57% of issues. Manual testing catches maybe 80%. User testing catches real usability problems that technical compliance misses.

### What User Testing Reveals

Technical compliance doesn't guarantee usable experience.

Example: Your form is technically accessible - all labels present, error messages announced, keyboard navigable. But the form has 47 fields, errors appear below the viewport, and fixing one error clears the entire form. Technically accessible, practically unusable.

User testing reveals:
- Is the experience actually usable or just technically compliant?
- Are workarounds too complex?
- Is the content understandable?
- Are there unexpected barriers?
- What takes longer than it should?

### Recruiting Participants

**Where to find participants**:
- **Accessibility testing services**: Fable, Access Works (matchmaking between companies and testers)
- **Disability advocacy organizations**: National Federation of the Blind, local centers for independent living
- **User testing platforms**: UserTesting.com has accessibility testing options
- **Universities**: Accessibility labs and student organizations
- **Online communities**: WebAIM discussion lists, Reddit accessibility forums

**Compensation**:
- Pay the same rate as other user testing ($75-150/hour typical)
- Provide multiple payment options (some participants can't use PayPal, Venmo, etc.)
- Reimburse for assistive technology if they're testing on your equipment (they shouldn't be)
- Pay for a test session even if you have technical problems

**Recruiting criteria**:
- Use their assistive technology daily (not "I tried it once")
- Comfortable thinking aloud during testing
- Diverse disabilities (blind, low vision, motor disabilities, cognitive disabilities)
- Mix of experience levels (novice and expert screen reader users)

### Conducting Accessibility User Tests

**Before the test**:
- Let participants use their own equipment and assistive technology
- Don't make them come to your office if remote testing works
- Test your screen sharing software with their setup ahead of time
- Prepare specific tasks, not "explore the site"
- Have someone who understands accessibility observing

**Test protocol**:

```
Introduction (5 min)
- Explain purpose of test
- Emphasize testing the product, not them
- Get consent to record (if recording)
- Ask about their assistive technology setup

Task-based testing (30-40 min)
- Give realistic scenarios
- Ask them to think aloud
- Don't help unless they're completely stuck
- Note where they struggle
- Ask clarifying questions

Debrief (10-15 min)
- What was hardest?
- What worked well?
- What would make it better?
- Compared to other sites, how was this?
- Any accessibility features they particularly liked or missed?
```

**Sample tasks**:

Don't say: "Navigate to the product page"
Say: "You want to buy running shoes. Find the product category and filter by your size."

Don't say: "Fill out the form"
Say: "Create an account so you can save your preferences for next time."

Don't say: "Can you use the search feature?"
Say: "You're looking for information about return policies. Find that information."

**What to observe**:
- Where do they slow down?
- Where do they backtrack?
- What do they verbally express frustration about?
- What workarounds do they use?
- What do they expect that doesn't happen?
- What keyboard shortcuts or screen reader features do they use?

**Example findings**:

From actual user testing:
- "The error message says 'email required' but I don't know which field that is. I have to navigate back through all 12 fields to find it."
- "This button says 'more' but more what? I have to read the previous paragraph again to understand context."
- "I can't tell if my filter is active. The page reloaded but nothing was announced."
- "The form cleared when I hit back button. I'm not re-entering all that."

These are accessibility problems automated tools can't find.

### After Testing

**What to do with findings**:
1. Categorize by severity (blocking vs frustrating vs minor)
2. Distinguish between bugs and design issues
3. Share video clips with team (powerful for building empathy)
4. Prioritize fixes based on impact
5. Test fixes with same participants if possible

**Sharing results**:
- Show, don't just tell (video clips more effective than written reports)
- Frame as opportunities, not failures
- Connect findings to business impact (completion rates, support costs)
- Celebrate what worked well

## Testing Checklist for WCAG AA Compliance

Before claiming WCAG AA compliance:

**Automated testing**:
- [ ] Run axe DevTools on all pages
- [ ] Run Lighthouse accessibility audit
- [ ] Fix all high and medium severity issues
- [ ] Verify color contrast passes (4.5:1 normal, 3:1 large)
- [ ] Verify all images have alt text
- [ ] Verify all form inputs have labels
- [ ] Verify heading hierarchy is correct
- [ ] Verify ARIA is valid where used

**Manual keyboard testing**:
- [ ] Can access all functionality with keyboard only
- [ ] Focus indicators visible on all interactive elements
- [ ] No keyboard traps
- [ ] Tab order is logical
- [ ] Skip links work
- [ ] Modal dialogs trap focus and return focus on close
- [ ] Dropdown menus work with arrow keys
- [ ] Can close all popups with Escape

**Screen reader testing**:
- [ ] Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] Navigate by landmarks
- [ ] Navigate by headings
- [ ] Complete all forms
- [ ] Verify error messages are announced
- [ ] Verify status updates are announced
- [ ] Verify dynamic content is accessible
- [ ] Test all interactive components

**Content review**:
- [ ] Page language set (`<html lang="en">`)
- [ ] Page titles are unique and descriptive
- [ ] Error messages are helpful and specific
- [ ] Link text is descriptive (not "click here")
- [ ] Text can be resized to 200% without breaking
- [ ] Content doesn't rely on color alone
- [ ] No content flashes more than 3 times per second
- [ ] Video has captions

**User testing**:
- [ ] Test with at least 3 people with disabilities
- [ ] Include at least one screen reader user
- [ ] Include at least one keyboard-only user
- [ ] Test critical user journeys
- [ ] Document and fix blockers

## What's Next

This mid-depth layer achieves WCAG AA compliance - the standard most laws and contracts require. You can test comprehensively, catch regressions in CI/CD, and verify with real users.

When you need more:
- **Deep-Water**: WCAG AAA compliance, specialized testing for cognitive and motor disabilities, preparing for third-party audits, enterprise accessibility programs, international compliance (EN 301 549)
- **Surface**: Review basics if you need a quick reference for the Big 5 issues

**Related topics**:
- **UI/UX Design**: Building accessibility in from design, not retrofitting
- **Semantic HTML**: The foundation of accessible web development
- **ARIA Patterns**: Deep dive into complex widget patterns
- **Compliance Validation**: Legal and regulatory accessibility requirements

Accessibility testing isn't a one-time checklist. It's part of your development workflow - automated tests in CI/CD, manual testing for new features, user testing for major changes. Build it in from the start and it's straightforward. Retrofit it later and it's painful.
