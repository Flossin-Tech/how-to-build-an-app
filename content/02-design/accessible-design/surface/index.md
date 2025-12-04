---
title: "Accessible Design"
phase: "02-design"
topic: "accessible-design"
depth: "surface"
reading_time: 10
prerequisites: []
related_topics: ["frontend-architecture", "error-handling-resilience", "job-to-be-done"]
personas: ["new-developer", "yolo-dev", "busy-developer"]
updated: "2025-12-04"
---

# Accessible Design

## What Is Accessibility and Why It Matters

Building accessible software means building for everyone, including people with disabilities. That includes blind or low vision users, deaf or hard of hearing users, people with motor disabilities who can't use a mouse, and people with cognitive disabilities who need clear, predictable interfaces.

Here's the thing: accessibility isn't optional anymore. It's legally required for most websites and apps.

### The Legal Reality

In the United States, the Americans with Disabilities Act (ADA) applies to both government websites (Title II) and private businesses (Title III). As of April 2024, federal regulations mandate **WCAG 2.1 Level AA compliance** for state and local government sites, with deadlines in 2026-2027. Private businesses face the same standard through court precedent.

In 2024 alone, over 8,800 accessibility lawsuits were filed in the US. Average litigation costs range from $50,000 to $500,000. Nearly half of those lawsuits were against repeat offenders who hadn't fixed their accessibility issues.

If you're selling to enterprise or government clients, they'll require proof of compliance. That usually means a VPAT (Voluntary Product Accessibility Template), which documents how your product meets accessibility standards.

The European Union's European Accessibility Act becomes effective June 28, 2025, requiring WCAG 2.1 Level AA compliance for banking, eCommerce, transportation, communications, and ebooks. Penalties can reach €100,000 per violation.

### The Business Case

Beyond legal compliance, accessibility is good business:

- **1 in 4 adults** in the US has a disability
- **71% of users with disabilities** will abandon websites with poor accessibility and switch to competitors
- **86% of homepages** fail basic color contrast requirements
- **Accessible design helps everyone** - clear labels, keyboard navigation, and proper contrast improve usability for all users

Think about it: when you add captions to videos, you help people in noisy environments, people learning the language, and people who prefer reading to listening. When you make forms keyboard-accessible, you help power users who prefer keyboards, people with temporary injuries, and people using assistive technology.

## WCAG 2.1 Level AA - Your Target

WCAG stands for Web Content Accessibility Guidelines. It's the international standard for web accessibility, developed by the W3C (World Wide Web Consortium).

WCAG has three conformance levels:
- **Level A** - Basic accessibility (minimum requirement)
- **Level AA** - Standard accessibility (legal requirement, your target)
- **Level AAA** - Enhanced accessibility (aspirational, not always practical)

**Level AA is what you need to meet.** It's the legal standard across most jurisdictions and the benchmark for enterprise procurement.

WCAG organizes requirements around four principles, known as **POUR**:

### Perceivable
Can users perceive the content? This includes providing text alternatives for images, captions for videos, semantic structure, and sufficient color contrast.

### Operable
Can users operate the interface? This means everything must work with a keyboard, users shouldn't get trapped, and there should be clear navigation landmarks.

### Understandable
Is the interface understandable? Content should be readable, behavior should be predictable, and errors should be clearly explained with suggestions for fixing them.

### Robust
Does it work with assistive technologies? Your HTML should be valid, interactive components should have proper names and roles, and status messages should announce to screen readers.

WCAG 2.1 Level AA includes 50 success criteria across these four principles. That sounds overwhelming, but most issues come from a handful of common mistakes.

## The 5 Quick Wins

Research shows that 61% of WCAG violations are preventable with proper design phase planning. These five patterns prevent the most common violations.

### Quick Win #1: Use Semantic HTML

Use the right HTML elements for their intended purpose. Browsers and assistive technologies know how to handle them correctly.

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
    <p>Content goes here.</p>
  </section>
</main>

<footer>
  <p>&copy; 2025 Company Name</p>
</footer>

<!-- Bad: Div soup that looks the same but means nothing -->
<div class="nav">
  <div class="link"><a href="/">Home</a></div>
  <div class="link"><a href="/about">About</a></div>
</div>

<div class="content">
  <div class="title">Page Title</div>
  <div class="section">
    <div class="subtitle">Section Title</div>
    <div>Content goes here.</div>
  </div>
</div>
```

Why this matters: Research shows pages using ARIA attributes have an average of 57 accessibility errors, compared to 27 errors on pages using semantic HTML. Use `<button>` for buttons, not `<div role="button">`. Use `<nav>`, `<main>`, `<header>`, and `<footer>` for page structure. Use proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`) - don't skip levels.

### Quick Win #2: Label All Form Inputs

Every form input needs a visible label explicitly associated with it. Placeholder text doesn't count.

```html
<!-- Good: Visible label with explicit association -->
<label for="email">Email Address</label>
<input id="email" type="email" required />

<label for="password">Password</label>
<input id="password" type="password" required />

<!-- Bad: Placeholder instead of label -->
<input placeholder="Email" type="email" />
<input placeholder="Password" type="password" />

<!-- Bad: Visual label without explicit association -->
<div>Email Address</div>
<input type="email" />
```

Missing or improper form labels are the #1 most common WCAG violation. Screen reader users can't tell what a field is for without a label. The `for` attribute on the label must match the `id` on the input.

### Quick Win #3: Provide Sufficient Color Contrast

Text needs enough contrast against its background to be readable by people with low vision or color blindness.

**WCAG 2.1 Level AA requirements:**
- Normal text (under 18pt or under 14pt bold): **4.5:1 contrast ratio minimum**
- Large text (18pt+ or 14pt+ bold): **3:1 contrast ratio minimum**

Common failures:
- Light gray text on white backgrounds
- Yellow text on white backgrounds
- Blue links on dark blue backgrounds
- Text over images without sufficient contrast

Use the WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/) to test your color combinations. Many design tools now include built-in contrast checkers.

Why this matters: 86% of homepages fail color contrast requirements. This is an easy fix during design that's harder to remediate later.

### Quick Win #4: Make Everything Keyboard Accessible

Not everyone can use a mouse. Some users navigate entirely with a keyboard, some use switch devices, some use voice control. All of these rely on proper keyboard support.

**Test your interface with these keys:**
- **Tab** - Move forward through interactive elements
- **Shift+Tab** - Move backward
- **Enter** - Activate links and buttons
- **Space** - Toggle checkboxes and buttons
- **Escape** - Close modals and dismiss overlays
- **Arrow keys** - Navigate menus, tabs, and custom controls

Requirements:
- Every interactive element must be reachable via Tab key
- Focus indicator must be clearly visible (don't use `outline: none` without a replacement)
- Tab order should follow logical reading order
- Users shouldn't get trapped in any component (keyboard trap)

Add skip links at the top of the page so keyboard users can jump past repetitive navigation:

```html
<a href="#main" class="skip-link">Skip to main content</a>

<!-- Navigation here -->

<main id="main">
  <!-- Main content here -->
</main>
```

Style skip links to be visible when focused:

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Quick Win #5: Write Meaningful Alt Text

Images need text alternatives so screen reader users know what they convey. But "image" or "photo" isn't helpful - describe what the image shows or what it's for.

```html
<!-- Good: Descriptive alt text -->
<img src="team.jpg" alt="Engineering team of 8 people collaborating at standing desks" />

<button aria-label="Close dialog">
  <img src="close-icon.svg" alt="" />
</button>

<!-- Bad: Generic or redundant alt text -->
<img src="team.jpg" alt="image" />
<img src="team.jpg" alt="team.jpg" />
<img src="team.jpg" />

<!-- Good: Decorative images use empty alt -->
<img src="decorative-flourish.svg" alt="" />
```

Guidelines:
- Describe what's in the image and its purpose
- Keep it concise (under 150 characters)
- Don't say "image of" or "picture of"
- For decorative images (purely visual), use `alt=""`
- For functional images (buttons, links), describe the function not the image
- For complex images (charts, diagrams), provide a longer description nearby

## When to Dig Deeper

You should read the **Mid-Depth** level if you:
- Are building user-facing products that need to meet compliance standards
- Work in regulated industries (government, healthcare, finance, education)
- Need to pass accessibility audits or provide VPATs to clients
- Have users reporting accessibility barriers
- Want to implement accessible patterns for complex components like modals, accordions, or custom form controls

You should read the **Deep Water** level if you:
- Are remediating existing accessibility violations at scale
- Need to create VPATs or ACRs for enterprise client procurement
- Are implementing complex interactive components with custom behavior
- Need comprehensive WCAG 2.2 AA compliance across a large application
- Are responsible for maintaining ongoing compliance through audits and monitoring

## Common Mistakes to Avoid

**Don't remove focus indicators without replacement.** Many developers use `outline: none` for aesthetic reasons without providing an alternative focus style. This makes keyboard navigation impossible to follow.

**Don't use color as the only indicator.** Red text for errors, green for success - these are invisible to colorblind users. Always pair color with icons, text labels, or other visual cues.

**Don't use placeholder text instead of labels.** Placeholders disappear when users start typing and aren't announced by screen readers. Use proper `<label>` elements.

**Don't write vague link text.** "Click here" and "Read more" don't tell users where they're going. Use descriptive link text: "Read our accessibility policy" or "Download the annual report (PDF, 2.3MB)".

**Don't trap keyboard focus.** Modals and overlays must let users tab through the modal content and then return to where they were. Users should be able to press Escape to close modals.

**Don't auto-play videos without controls.** Videos that auto-play with sound are disruptive. Always provide play/pause controls and captions.

## Your Next Steps

1. **Install axe DevTools browser extension** (Chrome, Firefox, Edge) - it's free and catches most common issues
2. **Run it on your homepage or main app page** - see what violations exist
3. **Fix the issues it finds** - most will be missing labels, contrast problems, or missing alt text
4. **Test with keyboard only** - unplug your mouse and try to complete a task using only Tab, Enter, and arrow keys
5. **Fix the 5 quick wins** on your most important pages

That'll get you from "inaccessible" to "baseline accessible" in a few hours. It won't make you fully WCAG 2.1 Level AA compliant, but it'll prevent the most common lawsuits and make your site usable for most people with disabilities.

For implementing accessible component patterns, testing strategies, and framework-specific guidance, read the **[Mid-Depth level](../mid-depth/)**.

For preparing for comprehensive audits, creating VPATs, and maintaining continuous compliance, read the **[Deep Water level](../deep-water/)**.

## Related Topics

- **[Frontend Architecture](../../frontend-architecture/surface/)** - Designing component architecture with accessibility built in
- **[Error Handling & Resilience](../../error-handling-resilience/surface/)** - Creating accessible error messages that screen readers announce
- **[Job to Be Done](../../../01-discovery-planning/job-to-be-done/surface/)** - Understanding accessibility as a core user need, not an afterthought
