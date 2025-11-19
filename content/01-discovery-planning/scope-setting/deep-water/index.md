---
title: "Scope Setting"
phase: "01-discovery-planning"
topic: "scope-setting"
depth: "deep-water"
reading_time: 38
prerequisites: ["job-to-be-done", "requirements-gathering"]
related_topics: ["resource-identification", "concept-of-operations", "threat-modeling"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Scope Setting - Deep Water

Advanced scope management for complex projects.

## Scope Management Using Work Breakdown Structure (WBS)

WBS decomposes project into hierarchical deliverables.

**Example - E-commerce Platform:**
```
1. E-commerce Platform
   1.1 User Management
       1.1.1 Registration
       1.1.2 Authentication
       1.1.3 Profile Management
       1.1.4 Password Reset
   1.2 Product Catalog
       1.2.1 Product Database
       1.2.2 Search & Filter
       1.2.3 Product Detail Pages
       1.2.4 Category Management
   1.3 Shopping Cart
       1.3.1 Add/Remove Items
       1.3.2 Quantity Management
       1.3.3 Cart Persistence
       1.3.4 Promo Code Support
   1.4 Checkout Process
       1.4.1 Shipping Address
       1.4.2 Payment Processing
       1.4.3 Order Confirmation
       1.4.4 Email Receipts
   1.5 Order Management
       1.5.1 Order History
       1.5.2 Order Tracking
       1.5.3 Returns/Refunds
       1.5.4 Admin Order Dashboard
```

**Benefits:**
- Nothing gets forgotten
- Easy to estimate (bottom-up from leaf nodes)
- Clear what's in/out (either it's in the tree or it's not)
- Can identify dependencies (1.4.2 needs 1.1.2 complete)

**Scope decisions:**
- Include entire branch: "1.3 Shopping Cart is in scope"
- Defer branch: "1.5.4 Admin Order Dashboard is phase 2"
- Never build: "1.3.4 Promo Code Support is out of scope permanently"

WBS prevents "we forgot about X" surprises.

## Requirements Baseline and Change Request Workflow

**Requirements baseline:** Frozen snapshot of agreed requirements at project start.

**Baseline process:**
1. Gather requirements
2. Review with stakeholders
3. Approve and freeze baseline (v1.0)
4. All changes go through formal process

**Change request workflow:**
```
New request submitted
    ↓
Change Control Board (CCB) reviews
    ↓
Impact analysis:
    - Effort required
    - Schedule impact
    - Budget impact
    - Risk assessment
    - Dependencies affected
    ↓
CCB decides:
    - Approve (add to scope, adjust timeline/budget)
    - Defer (add to backlog for future phase)
    - Reject (out of alignment with goals)
    ↓
If approved:
    - Update requirements baseline (v1.1, v1.2...)
    - Update project plan
    - Communicate to team
```

**Change Control Board composition:**
- Project manager
- Tech lead
- Product owner
- Key stakeholder representative

**Meeting cadence:** Weekly or bi-weekly

**Why this matters:** Without formal process, every "small" request gets added. With process, team consciously decides what's worth delaying the project for.

**Metrics to track:**
- Number of change requests submitted
- Approval rate
- Average impact on timeline
- Cumulative scope growth

If you're getting 10+ change requests per week with 80% approval, your initial scope was wrong or you're not saying no enough.

## Risk-Based Scope Prioritization

Prioritize scope based on risk reduction, not just value.

**Risk prioritization matrix:**
```
Feature: User Authentication
Value: HIGH (can't function without it)
Risk: HIGH (security-critical, complex)
Priority: BUILD FIRST (high value + high risk)

Feature: Social Sharing
Value: MEDIUM (nice growth mechanism)
Risk: LOW (simple integration)
Priority: BUILD LATE (not risky, validate demand first)

Feature: AI-powered Recommendations
Value: HIGH (key differentiator)
Risk: HIGH (uncertain if we can deliver quality)
Priority: BUILD SECOND (prototype early to de-risk)

Feature: Email Notifications
Value: MEDIUM (users expect it)
Risk: LOW (well-understood, many libraries)
Priority: BUILD MIDDLE (solid value, low risk)
```

**Priority guidelines:**
- **High Value + High Risk:** Build early to learn if it's feasible
- **High Value + Low Risk:** Build when needed (won't be a problem)
- **Low Value + High Risk:** Don't build (all pain, little gain)
- **Low Value + Low Risk:** Build if time permits (easy wins)

Traditional prioritization only considers value. Risk-based prioritization de-risks the project by tackling hard problems early when there's time to pivot.

## Technical Scope Boundaries (Which Layers of Stack You Own)

Define which parts of the technology stack are your responsibility.

**Full stack ownership:**
```
✓ Frontend (React app)
✓ Backend API (Node.js)
✓ Database (PostgreSQL)
✓ Infrastructure (AWS EC2, RDS)
✓ Deployment pipeline (CI/CD)
✓ Monitoring (logging, metrics)
```
**Pros:** Complete control, can optimize entire stack
**Cons:** Large scope, need expertise in all areas

**Platform-as-a-Service model:**
```
✓ Frontend (React app)
✓ Backend API (Node.js)
✓ Database queries (using managed PostgreSQL)
✗ Infrastructure (Heroku manages)
✗ Deployment (git push to deploy)
✗ Base monitoring (platform provides)
```
**Pros:** Smaller scope, focus on business logic
**Cons:** Less control, potential vendor lock-in

**Microservices with clear boundaries:**
```
Your scope:
✓ Order Service (API + database)
✓ Product Catalog Service (API + database)

External scope (other teams):
✗ User Authentication Service (identity team owns)
✗ Payment Processing Service (finance team owns)
✗ Email Service (platform team owns)

Shared scope:
~ Service mesh / API gateway (platform provides, you configure)
~ Monitoring (platform provides, you add custom metrics)
```

**Document responsibilities:**
- Who fixes bugs in each component?
- Who handles scaling?
- Who gets paged when it breaks?
- Who pays for infrastructure costs?

Unclear technical scope boundaries cause "not my problem" finger-pointing during outages.

## Organizational Scope (Which Teams/Departments Affected)

Large projects cross organizational boundaries. Define who's involved and how.

**Example - New CRM Implementation:**
```
Directly affected (primary stakeholders):
✓ Sales team (primary users)
✓ IT team (build and maintain)
✓ Data team (reporting and analytics)

Indirectly affected (need integration):
~ Marketing team (needs lead data from CRM)
~ Finance team (needs sales pipeline for forecasting)
~ Customer success team (needs customer history)

Not affected (but might think they are):
✗ HR team (no impact)
✗ Legal team (consulted for compliance, not users)
```

**Scope decisions:**
- Sales team workflows: FULL REDESIGN (in scope)
- Marketing integration: READ-ONLY ACCESS (in scope, limited)
- Finance integration: MANUAL EXPORT initially (out of scope for v1, auto-sync in v2)
- HR team: NO CHANGES (explicitly out of scope)

**Change management scope:**
- Training: Sales team gets 8 hours training (in scope)
- Training: Marketing team gets 1-hour orientation (in scope)
- Training: Other teams get email announcement only (out of scope)

**Governance:**
- Sales team: Involved in all decisions (steering committee)
- IT team: Builds solution
- Data team: Reviews data model
- Marketing/Finance: Consulted but don't have veto
- HR/Legal: Informed only

Defining organizational scope prevents project from being hijacked by departments that aren't primary stakeholders.

## Compliance Scope (Which Regulations Apply to This System)

Not all compliance requirements apply to all systems. Define which do.

**Example - Healthcare Appointment Scheduling System:**

**In scope regulations:**
```
✓ HIPAA (Protected Health Information)
  - System stores patient names, DOB, contact info, appointment reasons
  - Need: Encryption, access controls, audit logs, BAAs

✓ ADA / WCAG 2.1 AA (Accessibility)
  - Public-facing system must be accessible
  - Need: Screen reader support, keyboard navigation

✓ State telehealth laws (varies by state)
  - Virtual appointments cross state lines
  - Need: Legal review of multi-state practice
```

**Out of scope regulations:**
```
✗ FDA medical device regulations
  - Not diagnosing or treating, just scheduling
  - Rationale: Confirmed with legal team

✗ GDPR (for MVP)
  - Launching in US only
  - Can add GDPR compliance for EU expansion (phase 3)

✗ PCI-DSS
  - Not storing credit cards (Stripe handles payment)
  - Only need PCI-DSS if we stored card numbers
```

**Partially applicable:**
```
~ SOC2 (security controls)
  - Not required by law but needed to sell to enterprise
  - Phase 1: Basic controls
  - Phase 2: Full SOC2 audit
```

**Impact on scope:**
- HIPAA adds 15% to development timeline (encryption, audit logging, security reviews)
- WCAG adds 10% (accessibility testing, remediation)
- Deferring GDPR saves 8 weeks (don't need multi-region data residency yet)

**Validation:** Have legal/compliance team review scope. They might identify regulations you missed.

## Data Scope (Which Data Sources, Which Data Types)

Define what data the system handles and what it doesn't.

**Data sources in scope:**
```
✓ User-entered data (forms, profiles)
✓ Application generated data (logs, analytics)
✓ Integration data from CRM (Salesforce API)
✓ Integration data from payment processor (Stripe webhooks)
```

**Data sources out of scope:**
```
✗ Legacy system data (not migrating, users can export if needed)
✗ Third-party enrichment data (not using data brokers)
✗ Social media data (not scraping or using social APIs)
```

**Data types in scope:**
```
✓ Personally Identifiable Information (PII): name, email, phone
✓ Financial data: transaction amounts, payment methods (tokenized)
✓ Usage data: clicks, page views, session data
✓ Communication data: email contents, support tickets
```

**Data types out of scope:**
```
✗ Biometric data (not collecting fingerprints, facial recognition)
✗ Health information (even though we're adjacent to healthcare)
✗ Geolocation tracking (not tracking user location)
✗ Sensitive personal data (race, religion, political views)
```

**Why this matters:**

**Compliance impact:**
- PII triggers GDPR/CCPA requirements
- Financial data triggers PCI-DSS (if stored)
- Health data triggers HIPAA
- Biometric data has additional regulations

**Technical impact:**
- Each data type needs appropriate security controls
- Different retention policies
- Different deletion procedures

**Example scope decision:**
```
Question: Should we store user's credit card numbers for easier checkout?
Answer: NO - Out of scope
Reasoning:
  - Triggers PCI-DSS compliance (expensive, complex)
  - Security risk (breach liability)
  - Alternative: Use Stripe tokens (same UX, less risk)
Decision: Store payment tokens only, not raw card numbers
```

Explicitly defining data scope prevents accidentally taking on regulatory burdens you don't need.

## Sunset Planning for Deprecated Features/Systems

Scope isn't just what you're building. It's also what you're retiring.

**Deprecation scope:**
```
Systems being replaced:
✓ Legacy PHP admin panel → New React admin UI
✓ Old MySQL schema → New PostgreSQL schema
✓ Manual CSV export process → Automated API export

Timeline:
- Month 1-3: Build new system
- Month 4: Parallel operation (both systems run)
- Month 5: Migration period (move users to new system)
- Month 6: Sunset old system (shut down legacy)
```

**Migration responsibilities:**
```
In scope:
✓ Data migration scripts
✓ User training on new system
✓ Side-by-side comparison guide
✓ Automated testing of migration accuracy

Out of scope:
✗ Perfect 1:1 feature parity (some legacy features won't migrate)
✗ Supporting old system indefinitely (hard cutoff date)
✗ Custom migration for every edge case (migrate 95%, handle exceptions manually)
```

**Deprecated features:**
```
Not carrying forward to new system:
✗ Legacy reporting engine (too complex, rarely used)
  - Alternative: Users export data, build reports in Excel
  - Rationale: Used by <5% of users, not worth rebuild cost

✗ Custom integrations for 3 specific customers
  - Alternative: Provide API, they can rebuild integrations
  - Rationale: Too specific, can't support in new architecture
```

**Communication scope:**
```
✓ Announce deprecation timeline (6 months notice)
✓ Provide migration guide
✓ Offer office hours for questions
✓ Send 3 reminder emails (90 days, 30 days, 7 days before shutdown)

✗ One-on-one handholding for every user
✗ Extending deadline for users who didn't prepare
```

**Sunset criteria:**
- Old system usage drops below 5% of users
- New system proven stable (30 days with <1% bug rate)
- All critical users migrated
- Legal/compliance approval to delete old data

**Risk: What if sunset fails?**
- Contingency: Keep old system in read-only mode for 90 days
- Rollback plan: Can reactivate old system if critical issue found
- Hard deadline: Regardless, old system fully offline by [date]

Planning the sunset prevents maintaining two systems forever.

## Scope Dependencies and External Blockers

Some scope items can't proceed until external dependencies resolve.

**Dependency mapping:**
```
Build shopping cart
  ↓ DEPENDS ON
  ↓
Payment gateway integration
  ↓ DEPENDS ON
  ↓
Merchant account approval (external, 2-4 weeks)
  ↓ DEPENDS ON
  ↓
Business legal entity formation (external, 1-2 weeks)
```

**External blockers:**
```
Blocker: Merchant account approval (not in our control)
Impact: Can't test payment processing
Mitigation: Use Stripe test mode while waiting
Escalation: CEO contacts Stripe relationship manager if delayed
Timeline risk: Could delay launch by 2-4 weeks

Blocker: Third-party API access (partner company needs to provision)
Impact: Can't integrate with their system
Mitigation: Mock their API for development
Escalation: Weekly check-ins with partner PM
Timeline risk: Could delay launch by 1 week per week they're delayed
```

**Scope decisions based on dependencies:**
```
Option 1: Include integration in MVP
  - Pro: Complete solution
  - Con: At mercy of external timeline
  - Decision: Only if external timeline firm

Option 2: Launch without integration, add later
  - Pro: Control our own timeline
  - Con: Incomplete experience initially
  - Decision: Acceptable if integration is nice-to-have

Option 3: Build abstraction layer, stub integration
  - Pro: Can ship without blocker
  - Con: Extra work to abstract
  - Decision: Good if integration is important but timeline uncertain
```

**Managing external dependencies:**
- Identify all external dependencies in planning phase
- Get written commitments with dates
- Have mitigation plan for each
- Update scope if dependencies slip

Don't let external dependencies be the reason you discover scope problems at 90% complete.
