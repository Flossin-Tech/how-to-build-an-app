---
title: "Scope Setting"
phase: "01-discovery-planning"
topic: "scope-setting"
depth: "mid-depth"
reading_time: 22
prerequisites: ["job-to-be-done", "requirements-gathering"]
related_topics: ["resource-identification", "concept-of-operations"]
personas: ["generalist-leveling-up", "busy-developer", "specialist-expanding"]
updated: "2025-11-15"
---

# Scope Setting - Mid-Depth

Practical techniques for managing scope boundaries.

## MVP Definition - Minimum Features for Launch

Define the smallest thing you can ship that delivers real value.

**MVP framework:**

**Must ship with:**
- User authentication (login/logout)
- Core workflow (the main thing users came to do)
- Basic error handling (doesn't crash on bad input)
- Minimal viable security (won't get immediately hacked)

**Can wait for v2:**
- Advanced features
- Nice-to-have integrations
- Optimization and polish
- Edge case handling (if rare enough)

**Example - Project management tool:**
```
MVP (v1):
✓ Create projects and tasks
✓ Assign tasks to team members
✓ Mark tasks complete
✓ View all tasks in list
✓ Basic permissions (admin vs member)

Phase 2:
• Calendar view
• File attachments
• Time tracking
• Advanced filters and search
• Custom fields
• Mobile app
```

The MVP should be useful but incomplete. Ship it, get feedback, iterate.

## Phase Planning (What Comes in v1, v2, v3)

Map features to phases based on priority and dependencies.

**Phase 1 (MVP - 3 months):**
- Core features that deliver primary value
- Good enough for early adopters
- Focus on learning what users actually need

**Phase 2 (4-6 months after launch):**
- Features users request most
- Improvements based on usage data
- Address biggest pain points from v1

**Phase 3 (6-12 months after launch):**
- Advanced features for power users
- Integrations with other tools
- Platform expansion (mobile, API)

**Planning criteria:**
- Value: How much does this help users?
- Cost: How long does this take to build?
- Risk: What could go wrong? (Do risky experiments early)
- Dependencies: What must exist before this can work?

## Integration Boundaries - Which Systems Are In/Out of Scope

Define what your system integrates with and what it doesn't.

**In scope integrations:**
```
✓ Google Calendar (sync appointments)
  - Two-way sync: Read and write
  - Required for MVP (main value prop)

✓ Stripe (payment processing)
  - One-way: We send payment requests
  - Required for MVP (how we get paid)
```

**Out of scope integrations:**
```
✗ Slack notifications (phase 2)
  - Nice to have, not critical
  - Can add later without disrupting core functionality

✗ Salesforce CRM sync (phase 3)
  - Only needed by enterprise customers
  - Can build when we have enterprise plan
```

**Explicitly out of scope:**
```
✗ QuickBooks integration
  - Different target market
  - Not our core competency
  - Recommend users export CSV instead
```

Being explicit about what you're NOT integrating prevents scope creep.

## Data Migration Scope If Replacing Existing System

If you're replacing a legacy system, define what data moves and what doesn't.

**In scope:**
- Active user accounts (last login <6 months)
- Transactions from last 2 years
- Current active projects

**Out of scope:**
- Archived/deleted records
- Historical data older than 2 years (export to warehouse instead)
- Abandoned user accounts

**Migration approach:**
```
Phase 1: Import users and core data
Phase 2: Import historical data (read-only, for reference)
Never: Clean up legacy system weirdness (accept some dirty data)
```

**Rationale:** Migrating everything delays launch. Migrate what's needed, provide export for the rest.

## Geographic/Market Scope (US Only? Global?)

Where will this system operate?

**MVP: US market only**
- English language only
- US time zones
- US currency (USD)
- US payment methods
- US compliance (no GDPR initially)

**Phase 2: Canada and UK**
- Add English (UK) localization
- Support GBP and CAD
- Additional time zones
- GDPR compliance

**Phase 3: European expansion**
- Multi-language support (French, German, Spanish)
- GDPR full compliance
- EU data residency requirements
- VAT handling

**Out of scope (for now):**
- Asia-Pacific markets (different requirements, research needed)
- Right-to-left languages (significant UI work)
- Emerging markets (payment processing challenges)

Starting with one market lets you focus. Expanding adds complexity - language, currency, regulations, payment methods, cultural differences.

## Common Pitfall: Scope Creep from "Just One More Small Feature"

**How scope creep happens:**

Week 1: "Can we add a dark mode? It's just CSS, right?"
- Actually: 2 days to implement, test all screens, handle images

Week 3: "Users want to export to Excel, super simple"
- Actually: 3 days for proper formatting, handling edge cases, testing

Week 5: "Just add a quick admin panel for managing users"
- Actually: 1 week for proper RBAC, audit logging, UI

Result: "Small" features add 2 weeks to a 12-week project (17% overhead).

**How to prevent:**
1. When someone says "just add...", estimate the FULL cost (not just coding)
2. Ask: "Is this critical for launch?"
3. If yes: "What should we cut to make room?"
4. If no: "Great idea for v2, I'll add it to the backlog"

## Change Control Process - How to Evaluate New Requests

Don't just reject new ideas. Evaluate them systematically.

**Change request template:**
```
Feature: Dark mode toggle
Requested by: 3 users in beta testing
Estimated effort: 2 days
Impact if we don't build: Minor (nice-to-have)
Impact on timeline: Pushes launch by 2 days
Decision: Defer to phase 2

Reasoning: Not critical for launch. Current focus is core features.
Will revisit after MVP ships.
```

**Decision criteria:**
1. **Critical for launch?** Blocks primary use case? (Yes = consider)
2. **User demand?** Multiple users requesting? (Yes = higher priority)
3. **Effort vs value?** Quick win or months of work? (Quick wins tempting but add up)
4. **Dependencies?** Requires other work first? (Adds complexity)
5. **Timeline impact?** Delays launch? (Usually not worth it)

**Weekly review:** Look at all pending change requests. Accept ones that are truly critical. Defer the rest.

Having a process prevents ad-hoc "sure, we can add that" that derails projects.
