---
title: "Concept of Operations (ConOps)"
phase: "01-discovery-planning"
topic: "concept-of-operations"
depth: "deep-water"
reading_time: 40
prerequisites: ["job-to-be-done"]
related_topics: ["requirements-gathering", "threat-modeling", "scope-setting", "resource-identification"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Concept of Operations (ConOps) - Deep Water

Advanced operational modeling for complex systems.

## Operational Context Diagrams (Users, Systems, Data Flows)

Create visual diagrams showing:
- All user types and their roles
- All systems that interact with yours
- Data flows between components
- Trust boundaries and security zones

This becomes the authoritative reference for how everything fits together. When someone asks "where does customer data come from?", you point to the diagram.

**What to include:**
- External systems (with ownership/contact info)
- Data stores (with classification levels)
- Network boundaries (DMZ, internal, external)
- User interaction points
- Automated processes and scheduled jobs

## Mission Thread Analysis for Critical Paths

A mission thread is an end-to-end critical workflow that must work reliably.

**Example - Healthcare system:**
```
Emergency medication order thread:
1. Doctor searches for medication (must complete <2s)
2. System checks patient allergies (must be real-time, no cached data)
3. Doctor confirms order (must work even if billing system is down)
4. Order appears in pharmacy queue (must not be lost, even if network hiccups)
5. Pharmacist verifies and dispenses
```

For each mission thread:
- Identify every component involved
- Document failure modes at each step
- Define recovery procedures
- Specify performance requirements
- Determine acceptable degraded operation

Mission-critical threads get extra scrutiny, redundancy, monitoring.

## Error Recovery and Exception Handling Scenarios

Don't just document happy path. Document what happens when things break:

**Data entry errors:**
- User enters invalid date format
- User submits form with missing required field
- User uploads file that's too large

**System errors:**
- Database connection timeout
- External API returns 500 error
- Disk space runs out mid-operation

**Business logic errors:**
- User tries to approve their own request
- Conflicting concurrent edits
- Stale data from caching

For each error scenario:
- What does the user see?
- What gets logged?
- Can the user retry or recover?
- Who gets notified?

## Handoff Points Between Human and Automated Processes

Map where automation starts and stops:

**Example - Invoice processing:**
```
Human: Uploads scanned invoice PDF
→ Automated: OCR extracts text, identifies vendor, amount, date
→ Automated: Checks if amount exceeds approval threshold
→ Human (if over threshold): Reviews and approves
→ Automated: Routes to accounting system
→ Automated: Schedules payment
→ Human: Receives confirmation email
```

At each handoff:
- What information transfers?
- What if automation fails partway through?
- Can human override or intervene?
- How does human know it's their turn?

Poor handoff design causes work to fall through cracks.

## Regulatory/Compliance Workflow Requirements

Some workflows have regulatory requirements:

**Healthcare (HIPAA):**
- Audit every access to patient records
- Require reason for access
- Alert patient of emergency access overrides
- Retain audit logs for 7 years

**Finance (SOX):**
- Segregation of duties (creator can't be approver)
- Multi-level approval for high-value transactions
- Immutable audit trail

**Privacy (GDPR):**
- User can request all their data
- User can request deletion
- Track consent for each data processing purpose

Document these requirements in ConOps so they're baked into workflows, not bolted on later.

## Multi-Tenant or Multi-Organization Scenarios

If your system serves multiple customers/organizations:

**Data isolation:**
- Can users from Org A see Org B's data? (Should be never)
- Can admin user see across orgs? (Maybe, depends on your model)
- What happens when user belongs to multiple orgs?

**Configuration:**
- Does each org have different approval workflows?
- Different integration endpoints?
- Different branding/customization?

**Operations:**
- Can you deploy updates to one org at a time?
- Do you need per-org rate limiting?
- How do you handle org-specific bugs?

Multi-tenancy sounds simple until you map all the scenarios where "tenant X" and "tenant Y" interact differently with the same code.

## Disaster Recovery and Business Continuity Operations

What happens in truly bad scenarios?

**Data center outage:**
- How do users fail over to backup region?
- Automatic or manual failover?
- How do you prevent split-brain scenarios?
- What's the recovery point objective (how much data loss is acceptable)?

**Security breach:**
- Who has authority to take system offline?
- How do you notify users?
- What's the procedure for forensic analysis?
- How do you restore from clean backup?

**Major bug in production:**
- Can you roll back? How quickly?
- What's the procedure for emergency hotfix?
- Who must approve emergency change?

Document these scenarios. In a crisis, nobody can think clearly. Having a documented procedure means people follow the plan instead of making it up under pressure.

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Quick overview and scenario writing basics
- **[← Mid-Depth](../mid-depth/index.md)** User roles, integration points, and degraded operations

### Related Topics
- [Job to Be Done](../../job-to-be-done/deep-water/index.md) - Advanced Jobs-to-be-Done framework
- [Requirements Gathering](../../requirements-gathering/deep-water/index.md) - Enterprise requirements management
- [Threat Modeling](../../threat-modeling/deep-water/index.md) - Advanced threat modeling techniques
- [Scope Setting](../../scope-setting/deep-water/index.md) - Complex scope management
- [Resource Identification](../../resource-identification/deep-water/index.md) - Strategic resource planning

### Navigate
- [← Back to Discovery & Planning](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
