---
title: "Requirements Gathering"
phase: "01-discovery-planning"
topic: "requirements-gathering"
depth: "mid-depth"
reading_time: 22
prerequisites: ["job-to-be-done", "concept-of-operations"]
related_topics: ["scope-setting", "threat-modeling", "resource-identification"]
personas: ["generalist-leveling-up", "busy-developer", "specialist-expanding"]
updated: "2025-11-15"
---

# Requirements Gathering - Mid-Depth

Systematic approach to capturing what needs to be built.

## Functional Requirements: What Features/Behaviors?

Functional requirements describe what the system does. Write them as specific, observable behaviors.

**Good format:**
- "User can [action] by [method] resulting in [outcome]"
- "System shall [behavior] when [condition]"

**Examples:**
- "User can export transaction history as CSV file containing date, amount, description"
- "System shall send email notification within 5 minutes when new message arrives"
- "Admin can deactivate user accounts, which immediately revokes all access tokens"

Avoid implementation details in functional requirements:
- ❌ "System uses Redis cache for session storage"
- ✅ "System maintains user session for 2 hours of inactivity"

You're describing what, not how. The how comes during design.

## Non-Functional Requirements: Performance, Security, Scalability, Reliability, Usability

These define quality attributes. They're often more important than functional requirements because they determine whether the system is actually usable.

**Performance:**
- "API endpoints respond in <200ms at 95th percentile"
- "Dashboard loads in <3s on 3G connection"
- "Video streaming starts within 2s of user clicking play"

**Security:**
- "All passwords hashed with bcrypt, minimum cost factor 12"
- "API requires OAuth 2.0 authentication"
- "Sensitive data encrypted at rest using AES-256"

**Scalability:**
- "System handles 10,000 concurrent users without degradation"
- "Database supports 1M records with <100ms query times"
- "File uploads process 100GB/day peak load"

**Reliability:**
- "99.9% uptime during business hours (8am-8pm Eastern)"
- "Automated backup every 6 hours, retained for 30 days"
- "System recovers from crash without data loss"

**Usability:**
- "New user completes first task within 5 minutes, no training"
- "Critical workflows completable with keyboard only (no mouse)"
- "Error messages explain what went wrong and how to fix it"

## User Stories with Acceptance Criteria

User stories capture requirements from user perspective:

```
As a [role]
I want to [action]
So that [benefit]

Acceptance criteria:
- [Specific testable condition]
- [Specific testable condition]
- [Specific testable condition]
```

**Example:**
```
As a customer
I want to track my order status
So that I know when to expect delivery

Acceptance criteria:
- Order status updates within 30 minutes of status change
- User receives email notification on status change
- Tracking page shows estimated delivery date
- Page accessible without login if user has order number
```

Acceptance criteria make stories testable and define "done."

## API Contracts If Integrating with Other Systems

If your system exposes APIs or integrates with others, document the contract:

**For APIs you provide:**
```
Endpoint: POST /api/orders
Authentication: Bearer token required
Request:
  {
    "items": [{"sku": string, "quantity": number}],
    "shipping_address": {...}
  }
Response 200:
  {
    "order_id": string,
    "total": number,
    "estimated_delivery": ISO8601 date
  }
Response 400: Invalid SKU or quantity
Response 401: Missing or invalid token
```

**For APIs you consume:**
- Document expected response format
- Define error handling (what if it's down?)
- Specify rate limits and how you'll handle them
- Define data mapping (their field names to yours)

## Data Retention and Deletion Requirements

How long do you keep data? When do you delete it?

**Legal requirements:**
- "Transaction records retained for 7 years per tax law"
- "Marketing emails: delete user data within 30 days of unsubscribe per GDPR"

**Business requirements:**
- "User activity logs retained for 90 days for analytics"
- "Deleted user accounts: hard delete all PII after 30-day recovery period"

**Technical requirements:**
- "Failed job logs purged after 14 days to manage disk space"
- "Soft delete: mark as deleted, hard delete after 90 days"

Missing deletion requirements leads to databases growing forever and GDPR violations.

## Common Pitfall: Only Capturing Functional Requirements

Projects fail when they meet functional requirements but miss non-functional ones:
- Built all features but system is too slow
- Works perfectly but crashes under load
- Functional but violates accessibility requirements
- Complete but can't pass security audit

Spend at least as much time on non-functional requirements as functional.

## Prioritization Framework (MoSCoW: Must/Should/Could/Won't)

Not all requirements are equally important. Categorize them:

**Must have:** System is useless without these
- "User authentication"
- "Core checkout flow"
- "Data encrypted in transit"

**Should have:** Important but system could launch without them
- "Password strength meter"
- "Order history export"
- "Email notifications"

**Could have:** Nice to have if time/budget allows
- "Dark mode"
- "Advanced search filters"
- "Social sharing"

**Won't have:** Explicitly out of scope (prevents scope creep)
- "Mobile app (phase 2)"
- "Real-time chat (not needed for MVP)"
- "AI recommendations (future consideration)"

This helps make trade-off decisions: "We're running behind. Drop the Could haves, deliver all Must haves and most Should haves."

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Quick overview and testability basics
- **[Deep Water →](../deep-water/index.md)** Enterprise requirements, compliance, and internationalization

### Related Topics
- [Job to Be Done](../../job-to-be-done/mid-depth/index.md) - User research and switching moments
- [Concept of Operations](../../concept-of-operations/mid-depth/index.md) - Operational model design
- [Scope Setting](../../scope-setting/mid-depth/index.md) - Managing project boundaries

### Navigate
- [← Back to Discovery & Planning](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
