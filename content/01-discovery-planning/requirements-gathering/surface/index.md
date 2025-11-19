---
title: "Requirements Gathering"
phase: "01-discovery-planning"
topic: "requirements-gathering"
depth: "surface"
reading_time: 7
prerequisites: ["job-to-be-done", "concept-of-operations"]
related_topics: ["scope-setting", "threat-modeling", "resource-identification"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Requirements Gathering

Document functional and non-functional needs.

## What This Is

Write down what the system must do and how well it must do it. Requirements are your contract with stakeholders about what you're building.

## Minimum Viable Requirements

List "Must have" vs "Nice to have" features. Include:
- What features the system needs
- Performance targets (how fast, how many users)
- Who can access what
- Any compliance/legal requirements

**Red flag:** Vague requirements = endless scope creep and missed expectations.

## Good vs Bad Requirements

**Bad examples:**
- ❌ "Fast and secure"
- ❌ "User-friendly interface"
- ❌ "Handle lots of users"

These are too vague to verify or build.

**Good examples:**
- ✅ "Page load <2s on 4G connection"
- ✅ "MFA required for all user accounts"
- ✅ "Handle 1000 concurrent users without degradation"
- ✅ "WCAG 2.1 AA compliant for accessibility"

Notice how good requirements are specific and testable.

## Two Types of Requirements

**Functional requirements:** What features does it have?
- "Users can reset forgotten passwords via email"
- "System generates monthly invoice PDFs"
- "Search results filter by date range"

**Non-functional requirements:** How well does it work?
- "Login completes within 3 seconds"
- "99.9% uptime during business hours"
- "Supports English, Spanish, and French"

You need both. A feature that technically works but takes 30 seconds isn't actually working.

## The Testability Check

Every requirement should be testable. Ask: "How will I know when this is done?"

- "Fast search" - Can't test this
- "Search returns results in <500ms for 90% of queries" - Can test this

If you can't test it, you can't verify it. If you can't verify it, you can't commit to it.
