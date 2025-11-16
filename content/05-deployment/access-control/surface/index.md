---
title: "Access Control"
phase: "05-deployment"
topic: "access-control"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["cicd-pipeline-security", "deployment-strategy"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-16"
---

# Access Control

Who gets to touch your production systems, and what can they do when they get there? That's access control. Get it wrong and you're one compromised password away from someone deleting your production database. Get it right and security becomes nearly invisible.

## Why This Matters

A developer who left your company six months ago still has production access. Your database credentials haven't changed since 2018. Five people share the same admin password. These aren't hypothetical problems - they're how most breaches start.

Access control prevents two types of damage:

1. **External attacks**: If an attacker steals credentials, least privilege limits what they can reach
2. **Internal mistakes**: Even trusted employees make errors. Limited permissions contain the blast radius

When Capital One got breached in 2019, the attacker used a single compromised credential to access 100 million customer records. That credential had more access than it needed. Classic access control failure.

## The Core Principle: Least Privilege

Least privilege means you get access to what you need for your job, nothing more.

- A developer debugging an issue needs read-only database access, not the ability to delete tables
- A deployment pipeline needs to push code, not create new infrastructure
- A service account for your web app needs to query specific tables, not have admin rights

The CIS Critical Security Controls put it this way: "Define and maintain role-based access control through determining and documenting the access rights necessary for each role within the enterprise."

In practice, this means:
- Start with zero access
- Grant specific permissions as needed
- Remove access when it's no longer needed
- Review access regularly (people change roles, leave companies)

## Common Mistakes That Cause Breaches

### 1. Standing Privileges (Always-On Access)

**The problem**: Users have permanent admin access "just in case."

Developer gets production database access during onboarding. Uses it once to debug an issue. Never removed. Three years later, that developer's old laptop gets compromised in a breach. Attacker now has three-year-old credentials that still work.

**Better approach**: Temporary, on-demand access. Request it when needed, expires automatically after the task.

### 2. Shared Credentials

**The problem**: Multiple people share one password.

"The production database password is in Slack." Five developers know it. Someone runs `DELETE FROM customers` without a WHERE clause. 1 million rows gone. Investigation: "Who did it?" Nobody knows.

**Better approach**: Individual accounts for every person. Actions trace to specific humans.

### 3. Root/Admin Access by Default

**The problem**: Everyone starts with maximum permissions.

Junior developer gets admin access on day one. "We can reduce it later." Narrator: They never reduce it. One typo and the entire database is dropped.

**Better approach**: Read-only by default. Escalate specific permissions only when justified.

### 4. Credentials That Never Rotate

**The problem**: Passwords set years ago are still valid.

API key created in 2018, never changed. Leaked in a GitHub commit in 2020. Still valid in 2025. Attacker has had access for years.

**Better approach**: Automatic rotation. Credentials expire every 30-60 days and regenerate automatically.

### 5. No Session Expiration

**The problem**: Once logged in, you stay logged in forever.

Developer SSH to production, walks away from desk. Session stays open. Attacker (or curious coworker) uses the open terminal. Access continues for hours until the developer remembers to log out.

**Better approach**: Sessions auto-expire. Inactive for 15 minutes? Re-authenticate.

## Quick Wins You Can Implement This Week

### Immediate Actions

**List who has production access** (15 minutes)
Run a query: "Who can SSH to production? Who can access the production database?" You'll discover people who left months ago still have access, or contractors who finished projects years ago.

**Require multi-factor authentication** (1 hour)
MFA (password + phone code or hardware key) prevents account takeover even when passwords leak. Takes 15 minutes per person to set up. Stops password-based attacks instantly.

**Create a break-glass account** (30 minutes)
One pre-staged emergency account for critical incidents. Credentials stored securely (not in Slack). Monitored heavily. Used only when standard access methods fail.

### This Month

**Implement temporary credentials** (1-2 days)
Instead of permanent SSH keys that last forever, generate them on-demand with automatic expiration. Developer requests access, gets credentials valid for 8 hours, then they become useless.

**Separate environments completely** (1 week)
Development secrets cannot access production. Production credentials don't work in staging. If dev environment gets compromised, production stays safe.

**Enable audit logging** (2-3 days)
Record who accessed what, when, and what they did. Basic forensics if something goes wrong. Compliance requirement for most industries.

## Human vs Service Account Access

You need different approaches for humans and machines.

### For Human Users

**Individual accounts**: Every person has unique credentials. No sharing.

**Multi-factor authentication**: Password plus second factor (phone, hardware key, biometric).

**Temporary access**: Credentials expire. Request production access for 4 hours, it auto-revokes.

**Read-only default**: Most people don't need write access. Grant it temporarily when needed.

### For Service Accounts (Applications)

**Dedicated accounts**: Each service gets its own credentials. Web app, background worker, scheduled task - all separate.

**Minimal permissions**: Service account accessing a database should only query the specific tables it needs, not have admin rights.

**Short-lived credentials**: Credentials expire and rotate automatically (hours or days, not years).

**No interactive login**: Service accounts can't log in like humans. They authenticate programmatically only.

## When Developers Should/Shouldn't Have Production Access

This is nuanced. DevOps doesn't mean "everyone has root access to everything."

### Developers SHOULD have production access for:

- Investigating incidents (read-only access to start)
- On-call debugging (when they're the on-call engineer)
- Deploying code (through automated pipelines, not SSH)
- Running specific queries for customer issues (with approval and logging)

### Developers SHOULD NOT have production access for:

- Daily development work (that's what dev/staging is for)
- Browsing customer data (that's a privacy violation)
- Direct schema changes (those go through change management)
- "Just in case" access (standing privileges create security risk)

**Better model**:
- Developers deploy through automated pipelines (no direct server access)
- On-call engineers get temporary production access during their rotation
- Access expires when on-call rotation ends
- Database queries require approval and are fully logged

If you have 600 developers, maybe 20 need production access at any given time. The rest work in dev/staging.

## What Good Access Control Looks Like

When you get this right, here's what happens:

1. **New hire**: Gets dev/staging access automatically. Production access requires manager approval and expires after their task.

2. **Deployment**: Automated pipeline deploys to production. No human SSH access needed.

3. **On-call incident**: Engineer requests temporary production access, gets it in minutes, access expires after 8 hours.

4. **Employee leaves**: All access revoked same day. No manual credential changes needed.

5. **Audit**: You can answer "Who had database access on November 15?" in 30 seconds with confidence.

6. **Breach**: If credentials leak, they expire automatically. Attacker's window is hours, not years.

## The Bottom Line

Access control comes down to three questions:

1. **Who** needs access? (Individual accounts, not shared passwords)
2. **To what?** (Specific resources, not everything)
3. **For how long?** (Temporary with automatic expiration, not permanent)

Get those right and you prevent most common security incidents. Everything else is optimization.

## Next Steps

If you're thinking "this sounds like a lot of work," start small:

- **This week**: Enable MFA, list who has production access
- **This month**: Implement temporary credentials for high-risk access
- **This quarter**: Set up quarterly access reviews

The perfect access control system doesn't exist. The one you can actually implement and maintain is better than the perfect system you'll never finish.

For more depth on implementing these patterns, see the mid-depth content on RBAC implementation and just-in-time access strategies.

---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Infrastructure as Code](../../infrastructure-as-code/surface/index.md) - Related deployment considerations
- [CI/CD Pipeline Security](../../cicd-pipeline-security/surface/index.md) - Related deployment considerations
- [Deployment Strategy](../../deployment-strategy/surface/index.md) - Related deployment considerations

### Navigate
- [← Back to Deployment Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
