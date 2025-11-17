---
title: "Software Design Documentation Essentials"
phase: "02-design"
topic: "software-design-document"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["architecture-design", "api-design", "database-design"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Software Design Documentation Essentials

You don't need a 50-page specification document. You need to write down the decisions that will haunt you in six months when nobody remembers why you chose PostgreSQL over MongoDB, or why you split that service into three parts.

Design documentation is cheap insurance. Spending two hours writing down your thinking before you spend two weeks writing code prevents the question "wait, why are we building it this way again?" after you're halfway done.

## What You Actually Need to Document

The point of a design doc isn't to create a comprehensive record of every possible detail. It's to:

**Force yourself to think through the hard parts before you code them.** Writing "we'll handle authentication somehow" in a doc feels obviously incomplete. You have to actually decide.

**Create a shared understanding.** If three people are building this, they need to be building the same thing. The design doc is where you discover that Sarah thinks "real-time updates" means polling every 30 seconds and Mike thinks it means WebSockets.

**Capture decisions so you don't relitigate them later.** When someone asks "why didn't we use Redis for this?" six months from now, you can point to the doc that explains you chose to minimize moving parts for the MVP.

**Give reviewers something concrete to critique.** It's easier to spot a flawed approach in a two-page doc than in 1,000 lines of code.

You don't need to document how to write a for-loop. You need to document the stuff that's not obvious, not reversible, or not cheap to change.

## The One-Page Design Doc Template

Here's a template that fits on one page. If your design can't fit on one page, you're either building something genuinely complex (in which case you need more than surface-level guidance) or you're over-documenting.

```markdown
# [Feature/Component Name]

## Problem
What are we solving? What's broken or missing right now?
(2-3 sentences max)

## Solution
What are we building? High-level approach.
(3-5 sentences)

## Key Decisions
1. [Decision]: [What we chose and why]
2. [Decision]: [What we chose and why]
3. [Decision]: [What we chose and why]

## What We're NOT Building
What's out of scope for this iteration?
(Prevents scope creep)

## Data Model
Core entities and relationships.
(Sketch or bullet points, not full schema)

## API/Interface
Key endpoints or public methods.
(Just the signatures, not full specs)

## Dependencies
What external services, libraries, or other teams do we need?

## Risks & Unknowns
What could go wrong? What don't we know yet?

## Success Criteria
How do we know this works and solves the problem?
```

This template takes 30-90 minutes to fill out. If it's taking longer, you're either tackling something genuinely complex or overthinking it.

## Document the WHY, Not Just the WHAT

Bad design docs read like instruction manuals. Good design docs read like decision logs.

**Bad documentation:**
> We will use PostgreSQL for data storage. The users table has columns for id, email, password_hash, created_at, and updated_at.

This tells you what you're building but not why. In six months, someone will ask "why not MongoDB?" and nobody will remember.

**Good documentation:**
> We're using PostgreSQL because we need ACID transactions for payment processing and we have complex relationships between users, organizations, and permissions. We considered MongoDB for flexibility but the relational structure fits our domain better and the team has PostgreSQL experience. Trade-off: Less flexible schema, but we don't expect the core user model to change drastically.

This explains:
- The constraint that drove the decision (ACID transactions)
- What you considered (MongoDB)
- Why you rejected it (relational fit, team experience)
- The trade-off you're accepting (schema rigidity)

Future you will thank past you for writing this down.

## Architecture Decision Records (ADRs)

For decisions that really matter, use Architecture Decision Records. An ADR is a lightweight format that captures a single significant decision.

**ADR Format:**
```markdown
# ADR 001: Use PostgreSQL for Primary Database

## Status
Accepted (2025-11-15)

## Context
We need to store user accounts, organizations, permissions, and billing
information. We have complex relationships (users belong to orgs, orgs
have subscriptions, permissions are role-based). We need ACID guarantees
for payment transactions. The team has 3 developers with PostgreSQL
experience and 1 with MongoDB experience.

## Decision
We will use PostgreSQL as our primary database.

## Consequences

**Positive:**
- Strong consistency for financial data
- Well-understood relational model fits our domain
- Team expertise reduces risk
- Excellent tooling and operational maturity

**Negative:**
- Schema changes require migrations
- Less flexibility for rapidly evolving data structures
- Horizontal scaling is harder than with some NoSQL options

**Neutral:**
- Need to set up connection pooling (PgBouncer)
- Need backup and replication strategy

## Alternatives Considered

**MongoDB:**
- Pro: Flexible schema, easier horizontal scaling
- Con: Weaker consistency guarantees, less team experience
- Rejected because ACID guarantees matter more than schema flexibility

**MySQL:**
- Pro: Team has some experience
- Con: PostgreSQL has better JSON support and more advanced features
- Rejected because PostgreSQL is strictly better for our use case
```

This takes maybe 15 minutes to write but saves hours of "wait, why did we..." conversations.

**When to write an ADR:**
- Choosing a database, framework, or major library
- Picking an architecture pattern (monolith vs services, sync vs async)
- Making a security or compliance decision
- Deciding on deployment strategy
- Any decision that's expensive to reverse

You don't need an ADR for "which date formatting library should we use." You do need one for "should we split this into microservices."

## When the Design Doc Is "Good Enough" to Start Coding

You don't need perfect documentation. You need enough clarity that you won't waste time building the wrong thing.

**You're ready to code when:**
- You can explain the approach to someone else and they understand it
- Major technical decisions are made and documented
- You know what you're building for the first iteration
- You know what you're explicitly NOT building
- You've identified the biggest risks
- Data structures and interfaces are sketched out

**You're NOT ready to code when:**
- The solution is still vague ("we'll figure it out as we go")
- Multiple people have different mental models of what you're building
- You haven't considered alternatives
- You don't know what success looks like

The design doc doesn't need to be polished. It needs to be clear enough that you won't have to throw away a week of work because you misunderstood the problem.

Think of it like planning a road trip. You don't need turn-by-turn directions before you leave, but you should probably know what city you're driving to and roughly which highways you'll take. "We'll just drive west and see what happens" works poorly.

## Common Mistakes

**Over-documenting:** Writing 30 pages of UML diagrams and sequence charts before writing a line of code. The design will change when it meets reality. Write enough to start, not enough to cover every possible scenario.

**Under-documenting:** "The code is the documentation." This works great until you need to explain to a new teammate why you made a particular choice, and the code just shows what you built, not why you built it that way.

**Writing for an audience that doesn't exist:** You're not writing a textbook. You're writing for your team (including future you). Skip the introductory paragraphs explaining what a REST API is.

**Treating it like a contract:** The design doc is a snapshot of your thinking at a point in time. It will get outdated. That's fine. When you make a different decision during implementation, update the doc or write a new ADR. Don't feel bound to a bad decision because you wrote it down.

**Documenting the obvious:** "The login button will submit the login form." Everyone knows this. Document the stuff that's not obvious, like "We're storing sessions in Redis instead of the database because we need sub-10ms read times."

**Skipping the "What We're NOT Building" section:** This is the most valuable section for preventing scope creep. Writing "We are NOT building user profile customization in v1" prevents three weeks of feature drift.

## Practical Examples

**Example: Simple Feature**
You're adding a password reset flow. Your design doc might be:

```markdown
# Password Reset Flow

## Problem
Users can't reset their passwords if they forget them.

## Solution
Email-based password reset with time-limited tokens.

## Key Decisions
- Tokens expire after 1 hour (balance between security and UX)
- Tokens are single-use (prevent replay attacks)
- Use existing email service (SendGrid already configured)

## What We're NOT Building
- SMS-based reset
- Security questions
- Admin-initiated password reset

## Flow
1. User requests reset → we email token
2. User clicks link → validates token
3. User sets new password → invalidates token

## Risks
- Email delivery failures (log attempts, show user "check spam")
- Token timing attacks (constant-time comparison)
```

This took 10 minutes to write and prevents several days of back-and-forth about requirements.

**Example: Larger System**
You're building a job queue system. Your design doc captures:

- Why you need async processing (API timeout issues)
- Why you chose Redis over AWS SQS (cost, simplicity for MVP)
- What retry logic looks like
- How you'll monitor it
- What happens when it fails

You write one ADR for "Redis vs SQS" and another for "At-least-once vs exactly-once delivery." These take 30 minutes total and prevent a week of architectural indecision.

## Key Takeaways

**Write just enough documentation to think clearly and align with your team.** Not more.

**Document decisions and trade-offs, not implementation details.** The code shows the implementation. The doc shows why you chose that implementation.

**Use a simple template that fits on one page.** If it doesn't fit, you're either building something genuinely complex or you're over-documenting.

**Write Architecture Decision Records for decisions that matter.** Database choice, framework choice, architectural patterns. Not "which HTTP library to use."

**Update docs when reality diverges from the plan.** A slightly outdated doc that acknowledges it's outdated is better than a perfectly formatted doc that's completely wrong.

**The design doc is done when you can start coding without wasting time.** Not when it's comprehensive. You'll learn things during implementation that will change your design. That's expected.

A good design doc takes 30 minutes to 2 hours to write and saves days or weeks of rework. That's a trade worth making.

Start simple. Write down your thinking. Ship the thing. Come back and write more detailed design docs when you're tackling genuinely complex problems that justify the overhead.
---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Architecture Design](../../architecture-design/surface/index.md) - Related design considerations
- [Dependency Review](../../dependency-review/surface/index.md) - Related design considerations
- [Data Flow Mapping](../../data-flow-mapping/surface/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
