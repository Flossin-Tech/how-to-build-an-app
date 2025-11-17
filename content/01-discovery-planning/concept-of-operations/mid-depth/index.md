---
title: "Concept of Operations (ConOps)"
phase: "01-discovery-planning"
topic: "concept-of-operations"
depth: "mid-depth"
reading_time: 20
prerequisites: ["job-to-be-done"]
related_topics: ["requirements-gathering", "threat-modeling", "scope-setting"]
personas: ["generalist-leveling-up", "busy-developer", "specialist-expanding"]
updated: "2025-11-15"
---

# Concept of Operations (ConOps) - Mid-Depth

Practical guidance for mapping real-world usage.

## Map User Roles and Their Different Workflows

Different users interact with the same system in different ways. Document each role's workflow separately.

**Example:**
- Admin: Manages user accounts, reviews audit logs, configures system settings
- End user: Searches for information, submits requests, tracks status
- Approver: Reviews pending requests, approves/rejects, adds comments

Each role has different needs, different entry points, different success criteria.

## Identify Integration Points with Existing Systems

Your system probably doesn't exist in isolation. Document where it connects to other systems:

- Authentication (SSO with company directory?)
- Data imports (from legacy system?)
- Notifications (email service, Slack?)
- External APIs (payment processing, maps?)

For each integration, describe the interaction:
- When does it happen?
- What triggers it?
- What data gets exchanged?
- What happens if it fails?

## Define Success Criteria for Each Scenario

For each workflow, specify what "working correctly" means:

- "Request submitted successfully" - user sees confirmation, request appears in admin queue within 30 seconds
- "Approval notification sent" - requester receives email within 5 minutes, can click link to view details

Without clear success criteria, you can't verify the ConOps actually works.

## Consider Offline/Degraded Mode Operations

What happens when things aren't perfect?

- Slow network connection
- Third-party API is down
- User loses connection mid-operation
- External system returns partial data

Document how the system behaves in degraded conditions:
- Does it queue operations for later?
- Show cached data with a warning?
- Block certain features?
- Fail gracefully with clear error messages?

## Common Pitfall: Writing from System's Perspective Instead of User's

**Wrong approach:**
- "System validates input, calls authentication service, queries database, renders response"

**Right approach:**
- "User enters credentials, sees loading indicator for 1-2 seconds, then sees their dashboard with recent activity"

Write from the user's point of view. What they see, what they do, what happens next.

## Document Assumptions About User Environment

Your ConOps makes assumptions. State them explicitly:

- Network: Broadband connection, <100ms latency expected
- Devices: Desktop browsers, 1920x1080 minimum resolution
- Skills: Users familiar with basic spreadsheet concepts
- Access: Users have company email, can receive 2FA codes

When assumptions are explicit, you can validate them early instead of discovering incompatibilities at launch.

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Quick overview and scenario writing basics
- **[Deep Water →](../deep-water/index.md)** Operational context diagrams, mission threads, and compliance

### Related Topics
- [Job to Be Done](../../job-to-be-done/mid-depth/index.md) - User research and switching moments
- [Requirements Gathering](../../requirements-gathering/mid-depth/index.md) - Structured requirements elicitation
- [Threat Modeling](../../threat-modeling/mid-depth/index.md) - Security analysis frameworks
- [Scope Setting](../../scope-setting/mid-depth/index.md) - Managing project boundaries

### Navigate
- [← Back to Discovery & Planning](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
