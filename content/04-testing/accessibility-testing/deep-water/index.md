---
title: "Accessibility Testing - Deep Water"
phase: "04-testing"
topic: "accessibility-testing"
depth: "deep-water"
reading_time: 50
prerequisites: ["accessibility-testing-mid-depth"]
related_topics: ["wcag-aaa", "cognitive-accessibility", "assistive-technology", "inclusive-design"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-16"
---

# Accessibility Testing - Deep Water

## Who This Is For

You're building accessibility programs at enterprise scale. WCAG AA isn't enough - you need AAA for government contracts. Your users have diverse disabilities beyond blindness and mobility impairments. You need testing that goes beyond compliance to genuine inclusive design.

This deep-water layer covers:
- WCAG AAA criteria: the highest conformance level
- Specialized accessibility: cognitive disabilities, neurodiversity, multiple disabilities
- Advanced assistive technology ecosystem: Dragon, JAWS, ZoomText, switch access
- Accessibility in complex UI: data grids, virtual scrolling, canvas applications, maps
- International standards: EN 301 549, ADA compliance, Section 508 refresh
- Accessibility maturity models: building programs that scale
- Legal considerations: preventing lawsuits, case study analysis
- Building accessibility culture: champions programs, executive buy-in

If you're building consumer apps targeting WCAG AA, the mid-depth layer serves you better. This level is for government contractors, global enterprises, accessibility-focused companies, or anyone committed to serving all users excellently.

## When You Need This Level

Concrete scenarios:

**Government Contract Requirements**: You're bidding on a federal contract. Requirements specify WCAG 2.1 Level AAA and Section 508 compliance. Auditors will test rigorously. Non-compliance means losing million-dollar contracts.

**Cognitive Accessibility Gaps**: Your WCAG AA-compliant application is unusable for people with cognitive disabilities, dyslexia, or ADHD. Automated tools test syntax, not comprehension. You need testing for real cognitive accessibility.

**Global Accessibility Standards**: You operate in Europe (EN 301 549 required), United States (ADA), Canada (AODA), Australia (DDA), and Japan (JIS). Each jurisdiction has different requirements. You need comprehensive international compliance.

**Accessibility as Competitive Advantage**: You're building for education, healthcare, or government - markets where accessibility isn't just compliance, it's core to the mission. Your competitors do the minimum; you want to be the gold standard.

**Post-Lawsuit Reality**: You've been sued under ADA Title III. Legal settlement requires ongoing accessibility monitoring and third-party audits. You need robust accessibility programs to prevent future litigation.

## WCAG 2.1 Level AAA

Level AAA is the highest WCAG conformance level. Not all content can achieve AAA (it's strict), but understanding AAA criteria improves accessibility even when targeting AA.

### AAA Requirements Beyond AA

**Perceivable - Extended Audio Description (1.2.7)**

Standard audio description describes visual content during natural pauses. Extended audio description pauses video to describe complex visual information.

```javascript
// Detecting when extended audio description is needed
function needsExtendedAudioDescription(videoMetadata) {
  const { visualComplexity, naturalPauses, dialogueDensity } = videoMetadata

  // Extended audio needed when:
  // 1. High visual complexity (multiple actions, scene changes)
  // 2. Few natural pauses for standard description
  // 3. Dense dialogue (no room for description)

  const complexityScore = visualComplexity.averageElementsPerScene
  const pauseAvailability = naturalPauses.averageLengthMs
  const dialogueCoverage = dialogueDensity.percentTimeWithSpeech

  if (complexityScore > 5 && pauseAvailability < 2000 && dialogueCoverage > 70) {
    return {
      required: true,
      reason: 'Complex visual content without sufficient natural pauses for standard audio description',
      recommendation: 'Create extended audio description version with pause points'
    }
  }

  return { required: false }
}

// Testing extended audio description
describe('Extended Audio Description', () => {
  test('video player supports extended audio description track', async () => {
    const player = await loadVideoPlayer('complex-training-video.mp4')

    const tracks = player.getTextTracks()
    const extendedAudioDesc = tracks.find(t =>
      t.kind === 'descriptions' && t.label.includes('Extended')
    )

    expect(extendedAudioDesc).toBeDefined()
    expect(extendedAudioDesc.mode).toBe('showing')
  })

  test('extended audio description pauses video at description points', async () => {
    const player = await loadVideoPlayer('complex-training-video.mp4', {
      audioDescription: 'extended'
    })

    let pauseCount = 0
    player.on('pause', () => pauseCount++)

    await player.play()
    await waitForVideoEnd(player)

    // Extended AD should pause multiple times for descriptions
    expect(pauseCount).toBeGreaterThan(5)
  })
})
```

**Perceivable - Enhanced Contrast (1.4.6)**

AAA requires 7:1 contrast for normal text (vs 4.5:1 for AA) and 4.5:1 for large text (vs 3:1 for AA).

```javascript
describe('AAA Contrast Requirements', () => {
  test('all text meets AAA contrast ratios', async () => {
    const { container } = render(<Application />)

    // Get all text elements
    const textElements = container.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, button')

    for (const element of textElements) {
      const styles = window.getComputedStyle(element)
      const fontSize = parseFloat(styles.fontSize)
      const fontWeight = parseInt(styles.fontWeight)

      const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)

      const contrastRatio = await getContrastRatio(element)

      if (isLargeText) {
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5)  // AAA large text
      } else {
        expect(contrastRatio).toBeGreaterThanOrEqual(7)    // AAA normal text
      }
    }
  })

  test('UI components meet AAA contrast', async () => {
    const { container } = render(<Application />)

    const uiElements = container.querySelectorAll('button, input, select, [role="button"], [role="checkbox"]')

    for (const element of uiElements) {
      const contrastRatio = await getContrastRatio(element)

      // UI components need 7:1 for AAA (vs 3:1 for AA)
      expect(contrastRatio).toBeGreaterThanOrEqual(7)
    }
  })
})
```

**Operable - No Timing (2.2.3)**

AAA requires no time limits, or the ability to turn off or extend time limits before encountering them.

```javascript
test('user can disable all time limits', () => {
  render(<Application />)

  // Navigate to settings
  const settingsLink = screen.getByRole('link', { name: /settings/i })
  userEvent.click(settingsLink)

  // Find time limit settings
  const disableTimeLimits = screen.getByRole('checkbox', {
    name: /disable all time limits/i
  })

  expect(disableTimeLimits).toBeInTheDocument()

  // Enable setting
  userEvent.click(disableTimeLimits)

  // Verify no timeouts occur
  const sessionTimeout = getSessionTimeoutDuration()
  expect(sessionTimeout).toBe(null)  // No timeout when disabled

  const formTimeout = getFormTimeoutDuration()
  expect(formTimeout).toBe(null)
})

test('time limits can be extended before expiration', async () => {
  render(<TimedQuiz />)

  // Start quiz with 10-minute time limit
  const startButton = screen.getByRole('button', { name: /start quiz/i })
  userEvent.click(startButton)

  // Fast-forward to 9 minutes (before expiration)
  await advanceTime(9, 'minutes')

  // Should show extension option before timeout
  const extendButton = await screen.findByRole('button', {
    name: /extend time/i
  })
  expect(extendButton).toBeInTheDocument()

  userEvent.click(extendButton)

  // Time limit extended
  await advanceTime(5, 'minutes')  // Total 14 minutes

  // Quiz still active (not timed out)
  expect(screen.getByRole('heading', { name: /question/i })).toBeInTheDocument()
})
```

**Understandable - Reading Level (3.1.5)**

Content should be understandable at lower secondary education level (around 9th grade in US), or provide simplified alternatives.

```javascript
// Testing reading level
const textstat = require('textstat')

describe('AAA Reading Level', () => {
  test('page content at appropriate reading level', () => {
    const pageContent = getMainContent()

    // Flesch-Kincaid Grade Level
    const gradeLevel = textstat.fleschKincaidGrade(pageContent)

    // AAA recommends lower secondary education (grade 7-9)
    expect(gradeLevel).toBeLessThanOrEqual(9)
  })

  test('complex content has simplified alternative', async () => {
    render(<LegalDocument />)

    // Complex legal text present
    const legalText = screen.getByText(/whereas the parties hereto/i)
    expect(legalText).toBeInTheDocument()

    // But simplified version available
    const simplifyButton = screen.getByRole('button', {
      name: /show simplified version/i
    })
    expect(simplifyButton).toBeInTheDocument()

    userEvent.click(simplifyButton)

    // Simplified text displayed
    const simplifiedText = await screen.findByText(/this agreement says/i)
    expect(simplifiedText).toBeInTheDocument()

    const simplifiedGradeLevel = textstat.fleschKincaidGrade(
      simplifiedText.textContent
    )
    expect(simplifiedGradeLevel).toBeLessThanOrEqual(7)
  })

  test('technical documentation has glossary', () => {
    render(<TechnicalDocs />)

    // Technical terms present
    const technicalTerm = screen.getByText(/polymorphism/i)
    expect(technicalTerm).toBeInTheDocument()

    // Glossary linked
    expect(technicalTerm.tagName).toBe('DFN')  // Definition element
    expect(technicalTerm.closest('a')).toHaveAttribute('href', '#glossary-polymorphism')

    // Glossary exists
    const glossary = screen.getByRole('region', { name: /glossary/i })
    expect(glossary).toBeInTheDocument()
  })
})
```

**Understandable - Pronunciation (3.1.6)**

Provide pronunciation for words where meaning is ambiguous without it.

```javascript
test('ambiguous words have pronunciation guide', () => {
  render(<Article />)

  // Word with ambiguous pronunciation
  const word = screen.getByText(/bass/i)  // Fish or music?

  // Ruby annotation for pronunciation
  const ruby = word.closest('ruby')
  expect(ruby).toBeInTheDocument()

  const rt = within(ruby).getByText(/bas/)  // IPA or phonetic spelling
  expect(rt).toBeInTheDocument()
  expect(rt.tagName).toBe('RT')  // Ruby text
})
```

### When AAA Isn't Achievable

Some content can't meet AAA:
- Live video (can't have extended audio description in real-time)
- Maps and diagrams (may not achieve 7:1 contrast and still be readable)
- Historical documents (can't simplify without changing meaning)

In these cases:
1. Document why AAA isn't achievable
2. Provide best alternative (e.g., text description of map)
3. Achieve AAA for everything else

## Cognitive Accessibility

WCAG focuses on perceivable, operable, understandable - but cognitive disabilities need deeper consideration.

### Cognitive Disability Categories

**1. Memory Impairments**

```javascript
// Testing for memory support
describe('Memory Support Features', () => {
  test('form saves progress automatically', async () => {
    render(<MultiStepForm />)

    // Fill first step
    const nameInput = screen.getByLabelText(/name/i)
    await userEvent.type(nameInput, 'Jane Doe')

    const nextButton = screen.getByRole('button', { name: /next/i })
    await userEvent.click(nextButton)

    // Simulate browser close/reload
    await simulatePageReload()

    // Form remembers previous input
    const restoredName = screen.getByLabelText(/name/i)
    expect(restoredName).toHaveValue('Jane Doe')

    // Visual indicator that data was restored
    const restoredNotification = screen.getByText(/your progress has been restored/i)
    expect(restoredNotification).toBeInTheDocument()
  })

  test('multi-step process shows current position', () => {
    render(<MultiStepForm />)

    // Progress indicator visible
    const progressIndicator = screen.getByRole('navigation', {
      name: /form progress/i
    })
    expect(progressIndicator).toBeInTheDocument()

    // Current step highlighted
    const currentStep = within(progressIndicator).getByText('1. Personal Info')
    expect(currentStep).toHaveAttribute('aria-current', 'step')

    // Shows total steps
    expect(progressIndicator).toHaveTextContent(/step 1 of 4/i)
  })

  test('user can review all entries before submission', async () => {
    render(<MultiStepForm />)

    // Complete all steps
    await completeFormSteps()

    // Review page shows all entries
    const reviewHeading = screen.getByRole('heading', { name: /review/i })
    expect(reviewHeading).toBeInTheDocument()

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()

    // Can edit from review page
    const editNameButton = screen.getByRole('button', {
      name: /edit personal info/i
    })
    expect(editNameButton).toBeInTheDocument()
  })
})
```

**2. Attention Deficits (ADHD)**

```javascript
describe('Attention Support Features', () => {
  test('user can disable animations', () => {
    render(<Application />)

    // Animations running by default
    const animatedElement = screen.getByTestId('animated-banner')
    expect(animatedElement).toHaveStyle({ animation: expect.stringMatching(/slide/) })

    // Settings to disable
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    userEvent.click(settingsButton)

    const reduceMotion = screen.getByRole('checkbox', {
      name: /reduce motion/i
    })
    userEvent.click(reduceMotion)

    // Animations removed
    expect(animatedElement).toHaveStyle({ animation: 'none' })
  })

  test('page structure minimizes distractions', () => {
    const { container } = render(<Article />)

    // Single-column layout (not complex multi-column)
    const main = container.querySelector('main')
    const columns = window.getComputedStyle(main).columnCount
    expect(columns).toBe('1')

    // No auto-playing media
    const videos = container.querySelectorAll('video[autoplay]')
    expect(videos).toHaveLength(0)

    const audio = container.querySelectorAll('audio[autoplay]')
    expect(audio).toHaveLength(0)

    // No animated GIFs (or they're paused)
    const images = container.querySelectorAll('img')
    images.forEach(img => {
      if (img.src.endsWith('.gif')) {
        // Should have controls to pause
        const figure = img.closest('figure')
        const pauseButton = within(figure).getByRole('button', {
          name: /pause animation/i
        })
        expect(pauseButton).toBeInTheDocument()
      }
    })
  })

  test('focus mode available to reduce distractions', async () => {
    render(<Article />)

    const focusModeButton = screen.getByRole('button', {
      name: /focus mode/i
    })
    await userEvent.click(focusModeButton)

    // Sidebar hidden
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    // Navigation minimized
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-hidden', 'true')

    // Content centered and larger
    const article = screen.getByRole('article')
    const styles = window.getComputedStyle(article)
    expect(parseInt(styles.fontSize)).toBeGreaterThan(18)
  })
})
```

**3. Processing Difficulties (Dyslexia)**

```javascript
describe('Dyslexia Support Features', () => {
  test('dyslexia-friendly font available', () => {
    render(<Application />)

    const settingsButton = screen.getByRole('button', { name: /settings/i })
    userEvent.click(settingsButton)

    const fontSelector = screen.getByLabelText(/font/i)
    expect(fontSelector).toBeInTheDocument()

    // OpenDyslexic or similar font option
    const dyslexicFont = within(fontSelector).getByText(/dyslexia-friendly/i)
    expect(dyslexicFont).toBeInTheDocument()

    userEvent.selectOptions(fontSelector, 'opendyslexic')

    // Font applied
    const body = document.body
    const computedFont = window.getComputedStyle(body).fontFamily
    expect(computedFont).toContain('OpenDyslexic')
  })

  test('text spacing can be increased', async () => {
    render(<Article />)

    const settingsButton = screen.getByRole('button', { name: /settings/i })
    await userEvent.click(settingsButton)

    const spacingSlider = screen.getByLabelText(/text spacing/i)
    await userEvent.type(spacingSlider, '2')  // Increase spacing

    const paragraph = screen.getByRole('article').querySelector('p')
    const lineHeight = window.getComputedStyle(paragraph).lineHeight
    expect(parseFloat(lineHeight)).toBeGreaterThan(24)  // Increased from default
  })

  test('text-to-speech available for reading assistance', async () => {
    render(<Article />)

    const ttsButton = screen.getByRole('button', {
      name: /read aloud/i
    })
    expect(ttsButton).toBeInTheDocument()

    await userEvent.click(ttsButton)

    // Speech synthesis activated
    expect(window.speechSynthesis.speaking).toBe(true)

    // Can pause/resume
    const pauseButton = screen.getByRole('button', { name: /pause/i })
    expect(pauseButton).toBeInTheDocument()
  })
})
```

**4. Comprehension Support**

```javascript
describe('Comprehension Support', () => {
  test('complex processes have step-by-step guides', () => {
    render(<ComplexWorkflow />)

    // Help button visible
    const helpButton = screen.getByRole('button', {
      name: /how does this work/i
    })
    expect(helpButton).toBeInTheDocument()

    userEvent.click(helpButton)

    // Step-by-step guide modal
    const guide = screen.getByRole('dialog', { name: /guide/i })
    expect(guide).toBeInTheDocument()

    // Numbered steps
    const steps = within(guide).getAllByRole('listitem')
    expect(steps.length).toBeGreaterThan(0)

    steps.forEach((step, i) => {
      expect(step).toHaveTextContent(`${i + 1}.`)
    })
  })

  test('icons have text labels, not just tooltips', () => {
    render(<IconNavigation />)

    const icons = screen.getAllByRole('link')

    icons.forEach(icon => {
      // Each icon has visible text label (not just aria-label)
      const textContent = icon.textContent
      expect(textContent.length).toBeGreaterThan(0)

      // Or has visibly-hidden text for screen readers
      const srOnly = icon.querySelector('.sr-only')
      if (!textContent.trim()) {
        expect(srOnly).toBeInTheDocument()
        expect(srOnly.textContent.length).toBeGreaterThan(0)
      }
    })
  })

  test('errors provide specific remediation steps', async () => {
    render(<SignupForm />)

    const submitButton = screen.getByRole('button', { name: /sign up/i })
    await userEvent.click(submitButton)

    // Error message is specific and actionable
    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent(/password must/i)
    expect(error).toHaveTextContent(/at least 12 characters/i)
    expect(error).toHaveTextContent(/one uppercase letter/i)
    expect(error).toHaveTextContent(/one number/i)

    // Not vague like "Invalid password"
    expect(error.textContent).not.toBe('Invalid password')
  })
})
```

### Cognitive Load Reduction Patterns

**Pattern 1: Progressive Disclosure**

Hide complexity until needed:

```javascript
test('progressive disclosure reduces cognitive load', () => {
  render(<AdvancedSettings />)

  // Basic settings visible
  expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument()

  // Advanced settings hidden initially
  expect(screen.queryByLabelText(/smtp server/i)).not.toBeInTheDocument()

  // Expand when needed
  const advancedToggle = screen.getByRole('button', {
    name: /show advanced settings/i
  })
  userEvent.click(advancedToggle)

  // Now visible
  expect(screen.getByLabelText(/smtp server/i)).toBeInTheDocument()
})
```

**Pattern 2: Chunking Information**

Break complex information into digestible pieces:

```javascript
test('long content is chunked with headings', () => {
  const { container } = render(<LongArticle />)

  const headings = container.querySelectorAll('h2, h3')

  // Article is broken into sections
  expect(headings.length).toBeGreaterThan(5)

  // Each section is reasonably sized (not overwhelming)
  headings.forEach(heading => {
    const section = heading.parentElement
    const paragraphs = section.querySelectorAll('p')

    // Sections have 1-4 paragraphs (not 20)
    expect(paragraphs.length).toBeLessThanOrEqual(4)
  })
})
```

**Pattern 3: Consistent Navigation**

Don't make users relearn interface on each page:

```javascript
test('navigation is consistent across pages', async () => {
  render(<App />)

  // Capture navigation structure
  const nav1 = screen.getByRole('navigation', { name: /main/i })
  const links1 = within(nav1).getAllByRole('link').map(l => l.textContent)

  // Navigate to another page
  await userEvent.click(screen.getByRole('link', { name: /about/i }))

  // Navigation structure identical
  const nav2 = screen.getByRole('navigation', { name: /main/i })
  const links2 = within(nav2).getAllByRole('link').map(l => l.textContent)

  expect(links1).toEqual(links2)
})
```

## Advanced Assistive Technology Testing

Beyond NVDA and VoiceOver, specialized AT serves specific needs.

### Dragon NaturallySpeaking (Speech Recognition)

Testing voice control:

```javascript
describe('Dragon NaturallySpeaking Compatibility', () => {
  test('all interactive elements have accessible names for voice commands', () => {
    render(<Application />)

    const buttons = screen.getAllByRole('button')

    buttons.forEach(button => {
      const accessibleName = button.getAttribute('aria-label') || button.textContent

      // Must have name for voice commands ("Click Save button")
      expect(accessibleName.trim().length).toBeGreaterThan(0)

      // Name should be unique enough for voice targeting
      const duplicates = buttons.filter(b =>
        (b.getAttribute('aria-label') || b.textContent) === accessibleName
      )

      if (duplicates.length > 1) {
        // Multiple buttons with same name need disambiguation
        expect(button.closest('[aria-label]')).toBeInTheDocument()
      }
    })
  })

  test('custom controls respond to click events (not just mousedown)', async () => {
    render(<CustomButton onClick={jest.fn()} />)

    const button = screen.getByRole('button')

    // Dragon triggers click events, not mousedown
    const clickHandler = jest.fn()
    button.addEventListener('click', clickHandler)

    // Simulate Dragon "click" command
    fireEvent.click(button)

    expect(clickHandler).toHaveBeenCalled()
  })

  test('text fields support dictation', () => {
    render(<Form />)

    const input = screen.getByRole('textbox', { name: /email/i })

    // Focus field
    input.focus()

    // Simulate dictation
    fireEvent.input(input, {
      target: { value: 'user at example dot com' }
    })

    expect(input.value).toBe('user at example dot com')

    // Application should not interfere with Dragon's auto-formatting
    // (Dragon converts "at" to "@", "dot" to ".", etc.)
  })
})
```

### JAWS (Comprehensive Screen Reader)

JAWS has features beyond NVDA:

```javascript
describe('JAWS Compatibility', () => {
  test('tables have proper headers for JAWS table navigation', () => {
    render(<DataTable />)

    const table = screen.getByRole('table')

    // Column headers properly marked
    const colHeaders = within(table).getAllByRole('columnheader')
    expect(colHeaders.length).toBeGreaterThan(0)

    colHeaders.forEach(header => {
      expect(header.tagName).toBe('TH')
      expect(header).toHaveAttribute('scope', 'col')
    })

    // Row headers if applicable
    const rowHeaders = within(table).queryAllByRole('rowheader')
    rowHeaders.forEach(header => {
      expect(header.tagName).toBe('TH')
      expect(header).toHaveAttribute('scope', 'row')
    })
  })

  test('forms mode works correctly', () => {
    render(<Form />)

    // JAWS switches to forms mode for form fields
    // All fields must be reachable with Tab
    const fields = [
      screen.getByLabelText(/name/i),
      screen.getByLabelText(/email/i),
      screen.getByLabelText(/message/i)
    ]

    fields.forEach(field => {
      // Must have tabindex 0 or be naturally focusable
      const tabindex = field.getAttribute('tabindex')
      expect(tabindex === null || parseInt(tabindex) >= 0).toBe(true)
    })
  })

  test('JAWS virtual cursor can access all content', () => {
    const { container } = render(<Article />)

    // All content must be accessible via virtual cursor
    // (not absolutely positioned out of flow)
    const allElements = container.querySelectorAll('*')

    allElements.forEach(el => {
      const styles = window.getComputedStyle(el)

      if (styles.position === 'absolute' || styles.position === 'fixed') {
        // Must not be off-screen for screen readers
        expect(styles.left).not.toBe('-9999px')
        expect(styles.clip).not.toBe('rect(0, 0, 0, 0)')
      }
    })
  })
})
```

### ZoomText (Screen Magnification)

Testing for low vision:

```javascript
describe('ZoomText Compatibility', () => {
  test('content remains usable at 400% zoom', async () => {
    render(<Application />)

    // Simulate 400% zoom
    document.body.style.zoom = '4'

    // No horizontal scrolling required
    const bodyWidth = document.body.scrollWidth
    const viewportWidth = window.innerWidth
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)

    // Content still readable (not cut off)
    const heading = screen.getByRole('heading', { level: 1 })
    const headingRect = heading.getBoundingClientRect()
    expect(headingRect.right).toBeLessThanOrEqual(viewportWidth)

    // Interactive elements still reachable
    const button = screen.getByRole('button', { name: /submit/i })
    const buttonRect = button.getBoundingClientRect()
    expect(buttonRect.top).toBeLessThan(window.innerHeight)

    document.body.style.zoom = '1'  // Reset
  })

  test('focus indicators remain visible when magnified', () => {
    render(<Form />)

    document.body.style.zoom = '4'

    const input = screen.getByRole('textbox')
    input.focus()

    const styles = window.getComputedStyle(input)
    const outline = styles.outline

    // Outline must be visible (not 'none')
    expect(outline).not.toBe('none')

    // Outline width sufficient at high zoom
    const outlineWidth = parseInt(styles.outlineWidth)
    expect(outlineWidth).toBeGreaterThanOrEqual(2)

    document.body.style.zoom = '1'
  })
})
```

### Switch Access (Severe Motor Disabilities)

Testing for single-switch users:

```javascript
describe('Switch Access Compatibility', () => {
  test('all functionality available via sequential navigation', async () => {
    render(<Application />)

    const focusableElements = getFocusableElements()

    // User can reach all interactive elements by pressing Tab repeatedly
    expect(focusableElements.length).toBeGreaterThan(0)

    // Verify focus order is logical
    for (let i = 0; i < focusableElements.length; i++) {
      focusableElements[i].focus()
      expect(document.activeElement).toBe(focusableElements[i])

      // No keyboard traps
      await userEvent.tab()
      if (i < focusableElements.length - 1) {
        expect(document.activeElement).not.toBe(focusableElements[i])
      }
    }
  })

  test('scanning mode compatible (sequential focus highlighting)', async () => {
    render(<Menu />)

    const menuItems = screen.getAllByRole('menuitem')

    // Switch scanning highlights items sequentially
    // User activates when desired item is highlighted

    for (const item of menuItems) {
      item.focus()

      // Focus visible
      expect(item).toHaveFocus()

      // Activation works via keyboard (switch triggers Enter)
      const clickHandler = jest.fn()
      item.addEventListener('click', clickHandler)

      await userEvent.keyboard('{Enter}')
      expect(clickHandler).toHaveBeenCalled()
    }
  })

  test('no time-based interactions required', () => {
    const { container } = render(<Application />)

    // No drag-and-drop (requires holding)
    const draggable = container.querySelectorAll('[draggable="true"]')
    draggable.forEach(el => {
      // Must have keyboard alternative
      expect(el.parentElement.querySelector('button')).toBeInTheDocument()
    })

    // No hover-only interactions
    const hoverMenus = container.querySelectorAll('[aria-haspopup="true"]')
    hoverMenus.forEach(trigger => {
      // Must be clickable, not hover-only
      expect(trigger).toHaveAttribute('aria-expanded')
    })
  })
})
```

## Accessibility in Complex UI Patterns

Standard web pages are straightforward. Complex patterns need specialized testing.

### Data Grids (Spreadsheet-like)

```javascript
describe('Accessible Data Grid', () => {
  test('grid has proper ARIA roles', () => {
    render(<DataGrid data={mockData} />)

    // Container has grid role
    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()

    // Rows
    const rows = within(grid).getAllByRole('row')
    expect(rows.length).toBeGreaterThan(0)

    // First row is headers
    const headerCells = within(rows[0]).getAllByRole('columnheader')
    expect(headerCells.length).toBeGreaterThan(0)

    // Data rows have gridcells
    const dataCells = within(rows[1]).getAllByRole('gridcell')
    expect(dataCells.length).toBe(headerCells.length)
  })

  test('keyboard navigation works in grid', async () => {
    render(<DataGrid data={mockData} />)

    const grid = screen.getByRole('grid')
    const rows = within(grid).getAllByRole('row')
    const firstCell = within(rows[1]).getAllByRole('gridcell')[0]

    firstCell.focus()
    expect(document.activeElement).toBe(firstCell)

    // Arrow right moves to next cell
    await userEvent.keyboard('{ArrowRight}')
    const secondCell = within(rows[1]).getAllByRole('gridcell')[1]
    expect(document.activeElement).toBe(secondCell)

    // Arrow down moves to cell below
    await userEvent.keyboard('{ArrowDown}')
    const cellBelow = within(rows[2]).getAllByRole('gridcell')[1]
    expect(document.activeElement).toBe(cellBelow)

    // Arrow up moves back up
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(secondCell)

    // Home goes to first cell in row
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(within(rows[1]).getAllByRole('gridcell')[0])

    // End goes to last cell in row
    await userEvent.keyboard('{End}')
    const lastCell = within(rows[1]).getAllByRole('gridcell')[within(rows[1]).getAllByRole('gridcell').length - 1]
    expect(document.activeElement).toBe(lastCell)
  })

  test('screen reader announces grid dimensions and position', () => {
    render(<DataGrid data={mockData} rows={100} cols={10} />)

    const grid = screen.getByRole('grid')

    // Grid labeled with dimensions
    expect(grid).toHaveAttribute('aria-rowcount', '100')
    expect(grid).toHaveAttribute('aria-colcount', '10')

    // Cells announce position
    const cell = screen.getAllByRole('gridcell')[0]
    expect(cell).toHaveAttribute('aria-colindex', '1')
    expect(cell.closest('[role="row"]')).toHaveAttribute('aria-rowindex', '2')  // Row 1 is header
  })
})
```

### Virtual Scrolling (Large Lists)

```javascript
describe('Accessible Virtual Scrolling', () => {
  test('all items accessible to screen readers', async () => {
    render(<VirtualList items={tenThousandItems} />)

    // Only ~20 items rendered in viewport
    const renderedItems = screen.getAllByRole('listitem')
    expect(renderedItems.length).toBeLessThan(50)

    // But screen reader knows total count
    const list = screen.getByRole('list')
    expect(list).toHaveAttribute('aria-setsize', '10000')

    // Each item knows its position
    expect(renderedItems[0]).toHaveAttribute('aria-posinset', '1')

    // Scrolling loads more items
    await userEvent.keyboard('{PageDown}')

    const newItems = screen.getAllByRole('listitem')
    expect(newItems[0]).toHaveAttribute('aria-posinset', expect.stringMatching(/^[0-9]+$/))
  })

  test('keyboard navigation works with virtual scrolling', async () => {
    render(<VirtualList items={tenThousandItems} />)

    const firstItem = screen.getAllByRole('listitem')[0]
    firstItem.focus()

    // Arrow down navigates to next item
    for (let i = 0; i < 50; i++) {
      await userEvent.keyboard('{ArrowDown}')
    }

    // Scrolled to item 51 (virtual scrolling loaded new items)
    const items = screen.getAllByRole('listitem')
    const focusedIndex = items.findIndex(item => item === document.activeElement)
    expect(focusedIndex).toBeGreaterThan(-1)
  })
})
```

### Canvas-Based Applications

Canvas is bitmap, not DOM - inherently inaccessible. Must provide alternative.

```javascript
describe('Accessible Canvas Application', () => {
  test('canvas has accessible alternative', () => {
    render(<DiagramEditor />)

    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()

    // Canvas has fallback content
    expect(canvas).toHaveAttribute('role', 'img')
    expect(canvas).toHaveAttribute('aria-label')

    // Or has accessible tree
    const accessibleTree = screen.getByRole('tree', { hidden: true })
    expect(accessibleTree).toBeInTheDocument()
  })

  test('canvas interactions accessible via keyboard', async () => {
    render(<DrawingApp />)

    // Tools accessible via keyboard
    const brushTool = screen.getByRole('button', { name: /brush/i })
    await userEvent.click(brushTool)

    // Canvas operations via keyboard shortcuts
    await userEvent.keyboard('{Control>}z')  // Undo
    await userEvent.keyboard('{Control>}y')  // Redo

    // Selection works via keyboard
    await userEvent.keyboard('{Control>}a')  // Select all
  })

  test('canvas content described for screen readers', () => {
    render(<ChartCanvas data={chartData} />)

    // Canvas has detailed description
    const canvas = document.querySelector('canvas')
    const describedBy = canvas.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()

    const description = document.getElementById(describedBy)
    expect(description.textContent).toContain('Bar chart')
    expect(description.textContent).toContain('Sales: $150,000')

    // Or has accessible data table alternative
    const table = screen.getByRole('table', { hidden: true })
    expect(table).toBeInTheDocument()

    const cells = within(table).getAllByRole('cell')
    expect(cells.length).toBeGreaterThan(0)
  })
})
```

## International Accessibility Standards

### EN 301 549 (European Standard)

Harmonized European standard for ICT accessibility:

```javascript
describe('EN 301 549 Compliance', () => {
  // EN 301 549 closely aligns with WCAG 2.1 Level AA
  // Plus additional requirements:

  test('documents are accessible (PDF, DOCX)', async () => {
    render(<DocumentLibrary />)

    const pdfLink = screen.getByRole('link', { name: /annual report/i })
    const pdfUrl = pdfLink.getAttribute('href')

    // PDF must be tagged for accessibility
    const pdfMetadata = await getPDFMetadata(pdfUrl)
    expect(pdfMetadata.tagged).toBe(true)
    expect(pdfMetadata.language).toBeDefined()
    expect(pdfMetadata.title).toBeDefined()
  })

  test('real-time text communication supported', () => {
    // EN 301 549 requires real-time text (RTT) for voice services
    render(<VideoCallApp />)

    const rttButton = screen.getByRole('button', {
      name: /text chat|real-time text/i
    })
    expect(rttButton).toBeInTheDocument()
  })

  test('relay services supported', () => {
    // Must support communication via relay services
    render(<ContactPage />)

    // Text relay service info provided
    const relayInfo = screen.getByText(/text relay|relay service/i)
    expect(relayInfo).toBeInTheDocument()
  })
})
```

### Section 508 Refresh (US Federal)

Updated 2018 to align with WCAG 2.0 Level AA:

```javascript
describe('Section 508 Compliance', () => {
  test('software provides accessibility features info', () => {
    render(<Application />)

    // Accessibility features documented
    const helpMenu = screen.getByRole('button', { name: /help/i })
    userEvent.click(helpMenu)

    const accessibilityHelp = screen.getByRole('link', {
      name: /accessibility features/i
    })
    expect(accessibilityHelp).toBeInTheDocument()
  })

  test('products interoperate with assistive technology', async () => {
    // Section 508 requires testing with actual AT
    // Automated tests verify compatibility prerequisites

    render(<Form />)

    // Proper ARIA for AT compatibility
    const requiredFields = screen.getAllByRole('textbox', { required: true })
    requiredFields.forEach(field => {
      expect(field).toHaveAttribute('aria-required', 'true')
    })

    // Error identification for AT
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitButton)

    const errors = screen.getAllByRole('alert')
    errors.forEach(error => {
      // Errors programmatically associated with fields
      const fieldId = error.getAttribute('id')
      const field = document.querySelector(`[aria-describedby*="${fieldId}"]`)
      expect(field).toBeInTheDocument()
    })
  })
})
```

## Building Accessibility Maturity

Moving from compliance to culture.

### Accessibility Maturity Model

```markdown
# Accessibility Maturity Levels

## Level 0: Ad Hoc
- No systematic accessibility testing
- Issues fixed reactively after complaints
- No accessibility skills on team
- **Risk**: Lawsuits, excluded users

## Level 1: Compliance-Driven
- Run automated tools before release
- Fix critical issues found by scanners
- Legal/compliance drives accessibility
- **Limitation**: Automated tools catch 30-40% of issues

## Level 2: Manual Testing
- Manual testing with keyboard and screen reader
- Accessibility checklist in QA process
- Some team members trained in accessibility
- **Limitation**: Testing happens late, expensive fixes

## Level 3: Shift Left
- Accessibility in design phase
- Developers test during development
- Accessibility acceptance criteria in tickets
- Automated tests in CI/CD
- **Benefit**: Catch issues early when cheap to fix

## Level 4: Inclusive Design
- Accessibility drives design decisions
- User testing with people with disabilities
- Accessibility champions in every team
- Proactive improvement beyond compliance
- **Benefit**: Better products for everyone

## Level 5: Culture & Innovation
- Accessibility is core value
- Competitive advantage from accessibility
- Contributing to accessibility standards
- Accessibility expertise recognized and rewarded
- **Benefit**: Market leader, innovation driver
```

### Building Accessibility Champions Program

```markdown
# Accessibility Champions Program

## Purpose
Create distributed accessibility expertise across the organization

## Structure

### Champion Selection (10-15 per 100 employees)
- Voluntary participation
- Diverse roles: designers, developers, QA, product managers
- Passion for accessibility + willingness to learn

### Training (40 hours over 3 months)
- **Month 1**: WCAG fundamentals, assistive technology basics
- **Month 2**: Testing techniques, ARIA patterns, design integration
- **Month 3**: Advanced topics, user testing, coaching others

### Responsibilities
- **Weekly**: Answer accessibility questions from teammates (30 min)
- **Sprint**: Review designs and code for accessibility (2-3 hours)
- **Monthly**: Attend champion community meeting (1 hour)
- **Quarterly**: Lead accessibility training for team (2 hours)

### Recognition
- Accessibility Champion badge/title
- Performance review credit
- Conference attendance budget
- Priority for accessibility projects

### Support
- Direct access to accessibility specialists
- Testing tools and devices
- Time allocated in sprint for champion work (10%)

## Metrics
- Champion coverage: 1 per team minimum
- Questions answered: Track and publish
- Issues found: Before vs. after program
- Team satisfaction: Quarterly survey
```

## Legal Considerations

### ADA Title III Lawsuits

Web accessibility lawsuits increased 300% from 2017-2021:

```markdown
# Common ADA Lawsuit Triggers

## High-Risk Issues
1. **Missing alt text on critical images**
   - Lawsuit probability: Very High
   - Example: Product images without alt text (e-commerce)

2. **Forms without labels**
   - Lawsuit probability: Very High
   - Example: Search box, newsletter signup

3. **No keyboard access**
   - Lawsuit probability: High
   - Example: Dropdown menus requiring mouse hover

4. **Poor color contrast**
   - Lawsuit probability: Medium
   - Example: Gray text on white background (3:1 ratio)

5. **Missing ARIA labels on icon buttons**
   - Lawsuit probability: Medium
   - Example: Search icon, social media icons

6. **Inaccessible PDFs**
   - Lawsuit probability: High (if critical documents)
   - Example: Untagged PDF menus, forms, reports

## Industries Most Targeted
- E-commerce: 74% of lawsuits
- Food service: 9%
- Entertainment: 6%
- Travel/hospitality: 5%
- Financial: 3%

## Lawsuit Prevention Strategy
1. Conduct annual accessibility audit
2. Fix all critical/high issues immediately
3. Document remediation efforts
4. Ongoing monitoring and testing
5. Train staff on accessibility
6. Provide alternative contact methods
7. Accessibility statement on website
```

### Accessibility Statements

```markdown
# Example Accessibility Statement

**[Company Name] Accessibility Commitment**

**Our Commitment:**
We are committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.

**Conformance Status:**
The Web Content Accessibility Guidelines (WCAG) define requirements for designers and developers to improve accessibility for people with disabilities. We aim to conform to WCAG 2.1 Level AA standards.

**Current Status:**
As of [Date], our website is [partially conformant / fully conformant] with WCAG 2.1 Level AA.
- Partially conformant: Some parts of the content do not fully conform to the accessibility standard.

**Known Limitations:**
Despite our best efforts, some limitations may occur:
- [Specific known issue #1]: We are working to resolve this by [timeline]
- [Specific known issue #2]: Alternative provided via [workaround]

**Feedback:**
We welcome your feedback on the accessibility of [website]. Please contact us:
- Email: accessibility@company.com
- Phone: 1-800-XXX-XXXX
- Mail: Accessibility Coordinator, [Address]

We aim to respond to accessibility feedback within 2 business days.

**Technical Specifications:**
This website is designed to be compatible with:
- Screen readers (JAWS, NVDA, VoiceOver)
- Keyboard navigation
- Screen magnification
- Speech recognition software

**Third-Party Content:**
Some content on our site comes from third parties not under our control. We are working with vendors to improve accessibility.

**Assessments:**
- Internal testing: Ongoing
- External audit: [Auditor Name], [Date]
- User testing: [Date] with [# participants] people with disabilities

**Formal Complaints:**
If you are not satisfied with our response to your accessibility concern, you may file a formal complaint with:
- [Internal process]
- [External regulatory body, if applicable]

Last updated: [Date]
```

## What You've Mastered

You can now:

**Achieve Comprehensive Accessibility**:
- WCAG AAA conformance where applicable
- Cognitive accessibility beyond WCAG
- Compatibility with specialized assistive technology
- Accessible complex UI patterns (grids, canvas, virtual scrolling)

**Build Accessibility Programs**:
- International standards compliance (EN 301 549, Section 508)
- Accessibility maturity progression
- Champions programs scaling expertise
- Legal risk mitigation strategies

**Create Inclusive Experiences**:
- Testing for neurodiversity and cognitive disabilities
- Reducing cognitive load in complex interfaces
- Supporting multiple input methods (keyboard, voice, switch)
- Designing for people with multiple disabilities

## Related Deep-Water Topics

**Within Phase 04-Testing**:
- [Unit & Integration Testing - Deep Water](../../unit-integration-testing/deep-water/index.md): Contract testing, mutation testing, property-based testing
- [Security Testing - Deep Water](../../security-testing/deep-water/index.md): Penetration testing, red team exercises, bug bounty programs
- [Compliance Validation - Deep Water](../../compliance-validation/deep-water/index.md): SOC 2 Type II, FedRAMP, ISO 27001 certification

**Future Topics** (not yet available):
- Inclusive Design Methodology: Designing with people with disabilities from the start
- Assistive Technology Innovation: Understanding emerging AT capabilities
- Accessibility in AI/ML: Making machine learning outputs accessible
- Global Accessibility Regulations: Navigating worldwide compliance requirements

---

Accessibility at this level isn't about compliance checkboxes. It's about genuinely serving all users, understanding diverse human experiences, and building products that work excellently for everyone.

The techniques here are for teams committed to accessibility excellence - going beyond legal minimums to create truly inclusive digital experiences.

If you're just starting accessibility work, the surface and mid-depth layers will serve you better. But when accessibility is part of your mission, these patterns provide the depth needed to serve all users well.
