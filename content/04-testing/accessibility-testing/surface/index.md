---
title: "Accessibility Testing"
phase: "04-testing"
topic: "accessibility-testing"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["ui-ux-design", "compliance-validation"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Accessibility Testing

## What This Is About

Accessibility testing ensures people with disabilities can use your app. This includes people who are blind, have low vision, can't use a mouse, are colorblind, or have other disabilities that affect how they interact with technology.

The numbers are straightforward: about 1 in 4 adults in the US has a disability. That's 61 million people. If your app isn't accessible, you're excluding 15-20% of potential users.

It's also the law in many contexts. The Americans with Disabilities Act (ADA) applies to websites. Section 508 covers federal government sites. The European Union has the Web Accessibility Directive. These aren't theoretical - companies get sued regularly for inaccessible websites.

Good accessibility also improves usability for everyone. Captions help people in noisy environments. Keyboard navigation helps power users. Clear labels reduce confusion for all users.

The frustrating part is that most accessibility issues are simple to fix if you catch them early. Adding accessibility after you've built everything is maybe 10 times harder than building it in from the start.

## The Problem You're Solving

The consequences of inaccessible apps are real and expensive.

Domino's Pizza got sued because their website and app weren't accessible to blind users. The case went to the Supreme Court. Target paid $6 million in a class-action settlement. Hundreds of thousands of demand letters and lawsuits get filed each year under the ADA.

Beyond lawsuits, there's the business impact. Government contracts require WCAG 2.1 Level AA compliance. Educational institutions have strict accessibility requirements. If your product can't meet these standards, you can't sell to huge market segments.

Then there's the human element. Somewhere, right now, someone is trying to use your app and can't. Maybe they can't see the error message because the color contrast is too low. Maybe they can't submit the form because it doesn't work with their keyboard. Maybe the screen reader just says "button, button, button" with no idea what any button does.

You're not trying to be exclusionary. You just didn't know to test for these things.

## The Minimum You Need to Know

### WCAG Levels - What You're Aiming For

The Web Content Accessibility Guidelines (WCAG) define three conformance levels: A, AA, and AAA.

**Level A** is the minimum. If you don't meet Level A, you have serious accessibility barriers. This includes:
- Keyboard navigation works for all functionality
- All images have alt text
- Form inputs have labels
- Color isn't the only way to convey information
- No content flashes more than 3 times per second (seizure risk)
- Videos have captions

**Level AA** is the realistic target. This is what most laws and contracts require. It includes everything from Level A plus:
- Color contrast ratio of at least 4.5:1 for normal text, 3:1 for large text
- Text can be resized to 200% without breaking the layout
- Multiple ways to navigate (menu, search, sitemap)
- Headings and labels are descriptive
- Focus is visible on interactive elements

**Level AAA** is the gold standard. It's harder to achieve across an entire site, but some pages or features might meet it. Includes even higher contrast ratios, more comprehensive captions, sign language interpretation for videos.

Start with Level AA. It's the industry standard and what you'll need for most compliance requirements.

### The 15-Minute Accessibility Audit

You can catch the majority of accessibility issues with three simple tests that take 15 minutes total.

**Test 1: Keyboard-Only Navigation (5 minutes)**

Unplug your mouse. Actually unplug it.

Press Tab to move forward through interactive elements. Shift+Tab to move backward. Enter or Space to activate buttons. Escape to close dialogs. Arrow keys to navigate menus and radio buttons.

Can you do everything? Here's what you're checking:

- Can you reach all interactive elements (buttons, links, form fields)?
- Can you see where focus is? There should be a visible outline or highlight.
- Can you activate buttons and links?
- Can you fill out and submit forms?
- Can you close modal dialogs?
- Does the tab order make logical sense?
- Can you navigate menus and dropdowns?

Red flags:
- Keyboard trap: you can tab into something but not out of it
- Can't reach important functionality
- No visible focus indicator (you can't tell where you are)
- Tab order jumps around illogically
- Custom components that don't respond to keyboard

**Test 2: Automated Accessibility Scan (5 minutes)**

Open your site in Chrome or Firefox. Right-click anywhere and select "Inspect" to open DevTools. Find the Lighthouse tab. Click "Generate report" and check the Accessibility category.

Or install the axe DevTools browser extension (it's free). Click the extension icon, click "Scan ALL of my page," and review the results.

These tools catch about 57% of accessibility issues automatically. They'll flag things like:
- Missing alt text on images
- Insufficient color contrast
- Missing form labels
- Incorrect heading hierarchy
- Missing ARIA labels on interactive elements

Fix the critical issues (marked in red). The automated tools can't catch everything, but they catch the obvious stuff.

**Test 3: Screen Reader Quick Test (5 minutes)**

On Mac, press Cmd+F5 to turn on VoiceOver (the built-in screen reader). On Windows, download NVDA (it's free) or use the built-in Narrator.

Close your eyes and try to navigate your homepage. Listen to what gets announced. Can you:
- Understand what's on the page?
- Tell what images are (alt text should be read)?
- Identify what form fields are for?
- Understand what buttons do when clicked?
- Navigate through headings to find content?

Red flags:
- Buttons announced as just "button" with no description
- Images announced as just "image" or read as filename
- Links that say "click here" or "read more" with no context
- Form fields with no labels
- Walls of text with no structure

This feels awkward the first time. That's normal. You're learning how a significant portion of users experience your app.

### The Big 5 Accessibility Issues

These five issues account for the majority of accessibility problems. Fix these and you're most of the way there.

**1. Missing Alt Text**

Every meaningful image needs alt text. Screen readers read this text aloud to describe the image.

```html
<!-- Bad: no alt attribute -->
<img src="product.jpg">

<!-- Good: descriptive alt text -->
<img src="product.jpg" alt="Blue running shoes with white laces, side view">

<!-- Decorative images: empty alt, not missing -->
<img src="decorative-divider.png" alt="">
```

The alt text should describe what's in the image and why it matters. "Image of shoes" isn't helpful. "Blue running shoes with white laces, side view" tells someone what they need to know to make a purchase decision.

For decorative images (visual flourishes that don't convey information), use an empty alt attribute (`alt=""`). This tells screen readers to skip the image entirely, which is what you want.

**2. Missing Form Labels**

Every input needs a label that describes what it's for. Using placeholder text isn't enough - placeholders disappear when you start typing, and screen readers don't always announce them.

```html
<!-- Bad: no label, just placeholder -->
<input type="email" placeholder="Email">

<!-- Good: visible label associated with input -->
<label for="email">Email address</label>
<input type="email" id="email" name="email">

<!-- Also good: aria-label for visually hidden labels -->
<input type="search" aria-label="Search products">
```

The `for` attribute on the label must match the `id` on the input. This creates a programmatic association that screen readers can use. It also makes the label clickable - clicking it focuses the input.

**3. Poor Color Contrast**

Low contrast text is hard to read for people with low vision or colorblindness. WCAG Level AA requires a contrast ratio of at least 4.5:1 for normal text, 3:1 for large text.

```css
/* Bad: light gray on white (2.1:1 ratio) */
color: #cccccc;
background: #ffffff;

/* Good: dark gray on white (7.1:1 ratio) */
color: #595959;
background: #ffffff;

/* Large text (18pt+) can be 3:1 */
font-size: 18pt;
color: #767676;  /* 4.5:1 ratio */
background: #ffffff;
```

Use the WebAIM Contrast Checker (webaim.org/resources/contrastchecker/) to check your colors. Automated tools like Lighthouse will also flag contrast issues.

The most common mistake is using light gray text for secondary information. Make it darker.

**4. No Keyboard Access**

If you use `<div>` or `<span>` elements as buttons, they won't be keyboard accessible by default. Use proper HTML elements.

```javascript
// Bad: div doesn't respond to keyboard
<div onClick={handleClick}>Click me</div>

// Good: button is keyboard accessible by default
<button onClick={handleClick}>Click me</button>

// If you absolutely must use div, add keyboard support:
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  Click me
</div>
```

Semantic HTML elements (`<button>`, `<a>`, `<input>`, `<select>`) are accessible by default. They respond to the keyboard, get included in tab order, and have the right roles for screen readers.

When you use generic `<div>` and `<span>` elements for everything, you throw all of that away and have to rebuild it manually.

**5. Missing or Illogical Heading Structure**

Screen reader users navigate by headings. They press a key to jump from heading to heading to find the content they want. If your heading structure is broken, navigation is broken.

```html
<!-- Bad: skips heading levels -->
<h1>Page Title</h1>
<h3>Section Title</h3>  <!-- Skipped h2 -->
<h5>Subsection</h5>     <!-- Skipped h4 -->

<!-- Good: logical hierarchy -->
<h1>Page Title</h1>
<h2>Main Section</h2>
<h3>Subsection</h3>
<h3>Another Subsection</h3>
<h2>Another Main Section</h2>
```

Use one `<h1>` per page (usually the page title). Then `<h2>` for main sections, `<h3>` for subsections of those, and so on. Don't skip levels. Don't choose heading levels based on visual size - use CSS to style them however you want.

### Accessibility Testing Checklist

Before every deployment, verify:

- [ ] All images have meaningful alt text (or empty alt for decorative images)
- [ ] All form inputs have visible labels
- [ ] Color contrast passes WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] Can navigate entire site with keyboard only
- [ ] Focus is visible on all interactive elements
- [ ] Headings are in logical order (h1 → h2 → h3, don't skip levels)
- [ ] Page has a descriptive `<title>` element
- [ ] HTML has lang attribute (`<html lang="en">`)
- [ ] No keyboard traps (can tab into and out of everything)
- [ ] Automated accessibility scan (Lighthouse or axe) shows no critical issues

### Automated Testing in CI/CD

You can add automated accessibility testing to your test suite. It won't catch everything, but it catches regressions.

```javascript
// Using jest-axe with React Testing Library
import { axe, toHaveNoViolations } from 'jest-axe'
import { render } from '@testing-library/react'

expect.extend(toHaveNoViolations)

test('LoginForm has no accessibility violations', async () => {
  const { container } = render(<LoginForm />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

This test will fail if you introduce accessibility issues like missing labels, poor contrast, or invalid ARIA attributes. It runs fast enough to include in every pull request.

## Common Accessibility Mistakes

**Mistake 1: "We'll add accessibility later"**

Retrofitting accessibility is painful. You're changing component APIs, updating design systems, rewriting interaction patterns. It's 10 times harder than building it in from the start.

Also, "later" usually means "when we get sued" or "when we lose a contract." That's expensive.

**Mistake 2: Only testing with a mouse**

Maybe 10% of users navigate primarily with keyboard. Some can't use a mouse at all due to motor disabilities. Others find keyboard navigation faster and prefer it.

If you never test with keyboard, you'll never notice the problems. Unplug your mouse once a week.

**Mistake 3: "Automated tools catch everything"**

Automated tools catch about 57% of accessibility issues. The other 43% require human judgment.

Can an automated tool tell if your alt text is meaningful? No. It can tell if alt text exists, but not if "image123.jpg" is a useful description.

Can it tell if your page makes sense to a screen reader user? No. It can check for missing labels and broken ARIA, but not the overall experience.

You need both automated tools and manual testing.

**Mistake 4: Using `<div>` for everything**

Modern frontend frameworks make it easy to build UIs entirely from `<div>` and `<span>` elements. This is an accessibility disaster.

```html
<!-- Bad: no semantic meaning, not keyboard accessible -->
<div className="button" onClick={handleSubmit}>Submit</div>

<!-- Good: semantic HTML, accessible by default -->
<button type="submit" onClick={handleSubmit}>Submit</button>
```

Semantic HTML (`<button>`, `<nav>`, `<main>`, `<article>`, `<header>`) is accessible by default. It has the right keyboard behavior, focus management, and screen reader announcements built in.

When you use generic elements for everything, you lose all of that and have to rebuild it manually with ARIA attributes and JavaScript. It's more work and you'll probably get it wrong.

**Mistake 5: Relying only on color to convey information**

Colorblind users can't distinguish between certain color combinations. If you use only color to indicate something (like errors or status), some users won't see it.

```html
<!-- Bad: only color indicates error -->
<input style="border-color: red" />

<!-- Good: color + icon + text -->
<input
  aria-invalid="true"
  aria-describedby="email-error"
  style="border-color: red"
/>
<span id="email-error">
  <span aria-hidden="true">❌</span>
  Email address is required
</span>
```

Use color plus text, icons, or other visual indicators. This helps colorblind users and also makes your UI clearer for everyone.

## Tools to Get Started

**Browser DevTools (Free)**
- **Lighthouse**: Built into Chrome DevTools. Run an accessibility audit in seconds.
- **axe DevTools**: Browser extension for Chrome, Firefox, Edge. More comprehensive than Lighthouse.
- **WAVE**: Browser extension that shows visual feedback on the page itself.

Start with Lighthouse because it's already installed. Run an audit, fix the critical issues, then install axe DevTools for deeper analysis.

**Automated Testing Libraries**
- **jest-axe**: Add accessibility testing to Jest tests
- **axe-core**: The core library, works with any testing framework
- **Pa11y**: Command-line tool for CI/CD pipelines
- **Cypress-axe**: Accessibility testing in Cypress end-to-end tests

Pick whichever integrates with your existing test setup.

**Screen Readers**
- **NVDA** (Windows): Free, widely used, sounds like what many users actually use
- **VoiceOver** (Mac): Built-in, press Cmd+F5 to turn on
- **JAWS** (Windows): Industry standard, costs money, most comprehensive
- **Narrator** (Windows): Built-in, less commonly used but free

Start with whatever's built into your OS. VoiceOver if you're on Mac, NVDA if you're on Windows.

**Color Contrast Checkers**
- WebAIM Contrast Checker (website)
- Chrome DevTools (has color contrast info in the color picker)
- Colorblind simulators (Chrome DevTools can simulate different types of colorblindness)

Use the WebAIM checker when choosing colors. Use DevTools to verify while developing.

## Quick Wins - High Impact Accessibility Improvements

Some accessibility improvements take 30 seconds and have huge impact.

**1. Add the lang attribute**

```html
<html lang="en">
```

This tells screen readers what language the page is in so they can pronounce words correctly. Takes 5 seconds to add.

**2. Add a skip link**

```html
<a href="#main-content" className="skip-link">Skip to main content</a>

<!-- Page header, navigation, etc. -->

<main id="main-content">
  <!-- Actual page content -->
</main>
```

Keyboard users can skip past your navigation menu and jump straight to the content. Usually the skip link is visually hidden until focused.

**3. Use semantic HTML**

```html
<!-- Instead of divs for everything: -->
<div class="header">
<div class="nav">
<div class="main">
<div class="sidebar">
<div class="footer">

<!-- Use semantic elements: -->
<header>
<nav>
<main>
<aside>
<footer>
```

Screen readers use these landmarks to help users navigate. "Jump to main content" or "list all navigation regions" becomes possible.

**4. Add ARIA labels to icon-only buttons**

```html
<!-- Bad: screen reader says "button" with no description -->
<button>
  <i className="icon-trash"></i>
</button>

<!-- Good: screen reader says "Delete item, button" -->
<button aria-label="Delete item">
  <i className="icon-trash" aria-hidden="true"></i>
</button>
```

The `aria-label` provides a text description. The `aria-hidden="true"` on the icon tells screen readers to ignore it (since the label already describes the button's purpose).

## Red Flags You Have Accessibility Problems

Warning signs that your app probably has accessibility issues:

- You've never tested with keyboard-only navigation
- You've never tested with a screen reader
- Your Lighthouse accessibility score is below 90
- All your buttons are `<div>` elements
- Images have no alt text or generic alt text like "image"
- Forms use placeholder text instead of labels
- You can't see where keyboard focus is
- Color contrast warnings from automated tools
- Heading hierarchy is based on visual design, not structure
- You use color alone to indicate errors or status

If any of these are true, schedule time to fix accessibility issues. They accumulate fast.

## Real-World Example: Accessible Login Form

Here's what an accessible login form looks like:

```jsx
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // Validation and submission logic
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">
          Email address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={emailError ? 'true' : 'false'}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError && (
          <div id="email-error" role="alert">
            {emailError}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="password">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-invalid={passwordError ? 'true' : 'false'}
          aria-describedby={passwordError ? 'password-error' : undefined}
        />
        {passwordError && (
          <div id="password-error" role="alert">
            {passwordError}
          </div>
        )}
      </div>

      <button type="submit">Log in</button>
    </form>
  )
}
```

What makes this accessible:
- Each input has a visible `<label>` associated via `htmlFor` and `id`
- Error messages are linked via `aria-describedby`
- Errors use `role="alert"` so screen readers announce them
- Semantic HTML: `<form>`, `<button>`, proper input types
- All keyboard accessible by default (no custom widgets)

Testing this:

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('login form is keyboard accessible', async () => {
  render(<LoginForm />)

  const email = screen.getByLabelText('Email address')
  const password = screen.getByLabelText('Password')
  const submit = screen.getByRole('button', { name: 'Log in' })

  // Tab through form
  await userEvent.tab()
  expect(email).toHaveFocus()

  await userEvent.tab()
  expect(password).toHaveFocus()

  await userEvent.tab()
  expect(submit).toHaveFocus()
})

test('login form has no accessibility violations', async () => {
  const { container } = render(<LoginForm />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})

test('error messages are announced to screen readers', () => {
  render(<LoginForm />)

  const email = screen.getByLabelText('Email address')
  // Trigger validation error...

  const error = screen.getByRole('alert')
  expect(error).toBeInTheDocument()
  expect(email).toHaveAttribute('aria-invalid', 'true')
  expect(email).toHaveAttribute('aria-describedby', 'email-error')
})
```

## What's Next

This surface layer covers the essentials - the accessibility issues that affect the most users and carry the most legal risk. You can prevent the majority of accessibility problems with keyboard testing, automated scans, and the Big 5 fixes.

When you're ready to go deeper:
- **Mid-Depth**: Comprehensive WCAG AA compliance, ARIA patterns for complex widgets, advanced screen reader testing, accessibility in CI/CD
- **Deep-Water**: WCAG AAA, specialized disability testing (motor disabilities, cognitive disabilities), enterprise accessibility programs, international compliance

**Related Topics**:
- **UI/UX Design**: Building accessibility in from the design phase
- **Compliance Validation**: Legal and regulatory requirements for accessibility

The best time to add accessibility was when you started building. The second best time is now.
