---
title: "Access Control"
phase: "05-deployment"
topic: "access-control"
depth: "mid-depth"
reading_time: 25
prerequisites: []
related_topics: ["cicd-pipeline-security", "deployment-strategy", "infrastructure-as-code"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-16"
---

# Access Control: Implementation Patterns

Once you understand why access control matters, the question becomes: how do you actually implement it? This gets into role-based access control (RBAC), just-in-time access, credential management, and the difference between traditional VPN-based access and modern zero-trust approaches.

## RBAC Implementation Patterns

Role-Based Access Control assigns permissions based on job function. You create roles, define permissions for each role, then assign users to roles.

### Pattern 1: Environment-Based Roles

The simplest approach - permissions based on what environment you're working in.

```
Role: Development Access
Permissions: Full access to dev and staging environments
             No production access

Role: Production Read-Only
Permissions: View production logs and metrics
             Query production database (SELECT only)
             No write/delete capabilities

Role: Production Admin
Permissions: Full production access
             Limited to on-call engineers
             Time-restricted (only during on-call rotation)
```

This works well for small teams (5-20 people) but breaks down as you scale. You end up with dozens of environment-specific roles.

### Pattern 2: Function-Based Roles

Permissions based on what you do, not where you work.

```
Role: Backend Developer
Permissions:
  - Deploy to staging/production via CI/CD
  - View production logs
  - Query production database (read-only)
  - Approve code reviews

Role: Database Administrator
Permissions:
  - Modify database schema (with approval)
  - View all database audit logs
  - Create/remove database users
  - Backup/restore databases
  - Performance tuning

Role: On-Call Engineer
Permissions:
  - Read-write production access (temporary)
  - Kill database connections
  - Restart services
  - Access break-glass procedures
```

This scales better but requires clear job function definitions. Works for teams of 20-200.

### Pattern 3: Composed Roles (Best for Scale)

Create small base roles and compose them. Prevents "role explosion."

```
Base roles:
  - Developer (can write code, run tests)
  - DevOps (can deploy, configure infrastructure)
  - DBA (can manage databases)

Environment modifiers:
  - Dev-Only (development environment)
  - Dev+Staging (development and staging)
  - Prod-ReadOnly (production read-only)
  - Prod-Full (full production - rare)

Time modifiers:
  - Business-Hours (9 AM - 6 PM only)
  - On-Call-Rotation (active on-call period)
  - 24/7 (no time restrictions - very rare)

Composition:
  - Junior Developer = Developer + Dev-Only + Business-Hours
  - Senior Developer = Developer + Dev+Staging + Prod-ReadOnly + Business-Hours
  - On-Call Lead = DevOps + Prod-Full + On-Call-Rotation
```

This scales to hundreds of people with only 10-15 base roles. AWS and Google Cloud both use variations of this pattern.

## Just-In-Time (JIT) Access: Standing vs. Temporary

Traditional access control grants permissions indefinitely. Modern approaches grant temporary access on-demand.

### The Problem with Standing Privileges

Standing access means you always have permissions, even when you don't need them.

**Comparison**:

| Aspect | Standing Access | JIT Access |
|--------|----------------|------------|
| Activation | Always on | Requested when needed |
| Duration | Indefinite | Hours/days |
| Revocation | Manual (often forgotten) | Automatic expiration |
| Audit Trail | "Why does Bob have admin access?" | "Bob requested admin for incident #1234" |
| Attack Window | Entire credential lifetime | Only while active |
| Friction | Zero | Medium (approval needed) |

**Research from CyberArk**: Organizations implementing JIT access reduce privileged credential abuse risk by up to 70%. The key is that credentials don't exist until they're needed, and they disappear when the task completes.

### JIT Implementation Approaches

**Approach 1: Broker and Remove**

User has zero standing privileges. Request access when needed.

```
1. Developer: "I need production database access to debug customer issue"
2. Request submitted to approval system (Slack bot, web portal, CLI)
3. Approval workflow:
   - Is user on approved list? (policy check)
   - Is request during business hours?
   - How long is needed? (limit: 8 hours)
4. If approved → temporary credentials generated
5. User connects using temporary credentials
6. Credentials expire after time limit
```

**Approach 2: Ephemeral Accounts**

System creates temporary accounts that self-destruct.

```
1. User authenticates to gateway (Teleport, Boundary)
2. Gateway creates temporary database user: prod_alice_a7x2k
3. Credentials valid for session only (30 minutes to 8 hours)
4. User connects, does work
5. Time expires → account deleted automatically
```

This is what Teleport uses for SSH certificates. Each session gets a unique certificate that expires.

**Approach 3: Temporary Elevation**

User has baseline permissions. Can request elevated access for specific operations.

```
Normal state:
  DBA has: Read-only production database access

During schema change:
  DBA requests: Temporary write permissions for 2 hours
  Approval: Automatic (trusted user, documented change)
  Elevation: ALTER TABLE permissions granted
  Work: Schema change completed in 45 minutes
  Expiration: Write permissions auto-revoked after 2 hours
```

### Reducing JIT Friction

The concern with JIT is approval overhead. "I need access NOW, not in 3 hours."

**Solution: Automated approval for low-risk requests**

```
Auto-approve if:
  - Requesting user is on pre-approved list for this resource
  - Request is during business hours
  - Request is for read-only access
  - Duration is 4 hours or less
  - User has passed security training (within last year)

Manual approval if:
  - First-time requestor for this resource
  - Weekend/after-hours access
  - Write/delete permissions
  - Production database modification
  - Duration exceeds 4 hours
```

Gartner research shows well-tuned JIT systems approve 80% of requests automatically within seconds while maintaining strong security on sensitive operations.

## Temporary Credential Generation

Traditional approach: Admin creates a user account, emails password, user changes it, password exists for months.

Modern approach: System generates credentials on-demand that automatically expire.

### HashiCorp Vault Implementation

Vault can generate temporary database credentials dynamically:

```
Request: "I need MySQL access for 2 hours"

Vault response:
  Username: app_prod_a7x2k (unique per session)
  Password: [randomly generated, 32 characters]
  Expires: 2025-11-16 18:00 UTC

Process:
  1. Vault receives request
  2. Vault creates database user with generated credentials
  3. Vault returns credentials to requester
  4. Requester uses credentials
  5. Lease expires
  6. Vault deletes database user automatically
```

**Benefits**:
- No credential sharing (every instance gets unique credentials)
- Immediate revocation capability (kill one instance, revoke its credentials only)
- Perfect audit trail (each credential tied to specific session)
- Automatic cleanup (no stale credentials)

This works for:
- Database credentials (PostgreSQL, MySQL, MongoDB)
- Cloud provider access (AWS temporary keys)
- SSH access (temporary user accounts)
- API tokens (time-limited tokens)

## Zero-Trust Architecture Overview

Traditional security model: "Trust but verify" - if you're inside the network (via VPN), you're trusted.

Zero-trust model: "Never trust, always verify" - verify every access attempt regardless of location.

### Traditional (Perimeter-Based) Model

```
Workflow:
  1. User connects to VPN
  2. VPN checks: Is your password correct? Is your MFA valid?
  3. If yes → Access to entire corporate network
  4. User can reach any server on the network
  5. No further authentication needed

Problem:
  - Attacker gets VPN credentials
  - Attacker has access to everything on the network
  - Can scan for vulnerabilities, pivot between systems
  - "Inside the perimeter" = trusted
```

This is how the Target breach happened in 2013. Attackers compromised an HVAC vendor's VPN credentials and gained access to the entire network, eventually reaching payment systems.

### Zero-Trust (Identity-Based) Model

```
Workflow:
  1. User requests SSH access to prod-server-01
  2. Identity broker verifies:
     - Who are you? (MFA authentication)
     - What device? (Is laptop patched? OS up-to-date?)
     - Where are you? (Approved network/location?)
     - What time? (During approved hours?)
  3. If all checks pass → Temporary certificate for this specific server
  4. Certificate valid for 1 hour only
  5. Attempting to access prod-server-02 requires separate authentication
```

**Key differences**:

| Aspect | VPN Model | Zero-Trust Model |
|--------|-----------|------------------|
| Trust model | Network location | User + device identity |
| Authentication | Once (VPN login) | Per resource |
| Lateral movement | Possible (network access granted) | Prevented (each resource gated) |
| Credential lifetime | Long (session lasts hours) | Short (per-access, minutes to hours) |
| Audit trail | Weak (network logs only) | Strong (per-resource logs) |
| Device compliance | Limited checks | Ongoing verification |

**NIST SP 800-207 definition**: "Zero trust assumes there is no implicit trust granted to assets or user accounts based solely on their physical or network location."

### Modern Tools: Teleport vs HashiCorp Boundary

**Teleport** - Zero standing privileges for infrastructure

- Focus: SSH, Kubernetes, databases, applications
- Certificate-based authentication (short-lived certificates)
- Session recording (full terminal recording for audit)
- Moderated sessions (approver watches in real-time for sensitive operations)
- Open-source with enterprise features

**HashiCorp Boundary** - Identity-aware access without VPN

- Focus: Databases, SSH, any TCP/TLS service
- Credential injection (user never sees passwords)
- Integration with Vault (dynamic credential generation)
- Works across cloud providers (AWS, Azure, GCP, on-prem)

Both eliminate VPNs for production access. Users authenticate to the gateway, gateway brokers access to specific resources.

## Service Account Best Practices

Service accounts (for applications, CI/CD, background jobs) are often the weakest link.

### The Seven Critical Practices

**1. Dedicated Service Accounts**

```
Bad: One "app_prod" account shared by all services

Good:
  - api_service_prod (web API)
  - worker_service_prod (background jobs)
  - cronjob_service_prod (scheduled tasks)

Benefit: Compromise of one doesn't affect others
```

**2. Minimal Permissions**

```
Bad: Service account has admin access "just in case"

Good: Service account has access only to resources it actually uses

Example (Database):
  Allowed: SELECT on users, orders, products tables
  Allowed: INSERT into orders, audit_logs
  Allowed: UPDATE orders (status only)
  Denied: DELETE
  Denied: CREATE/DROP tables
  Denied: Access to payments, internal_logs tables
```

**3. Avoid Privileged Groups**

Never add service accounts to "Administrators," "Domain Admins," or equivalent. Grant specific permissions at resource level instead.

**4. Short-Lived Credentials**

```
Bad: API key generated once, valid for 3 years

Good:
  - Credentials expire every 60 days
  - Automatic rotation (no manual intervention)
  - New credentials generated before old ones expire
  - Zero downtime during rotation
```

**5. No Interactive Login**

```
Bad: Service account can SSH/RDP like a human

Good:
  - Account restricted to programmatic access only
  - Attempting interactive login returns "access denied"
  - Forces automation, prevents manual tinkering
```

**6. Separate Credentials per Environment**

```
Bad: Same credentials in dev/staging/prod

Good:
  - Production credentials cannot access dev
  - Staging credentials cannot access production
  - Compromise of dev doesn't risk production
```

**7. Automated Key Rotation**

```
Static secrets (passwords):
  - Rotate every 30-60 days
  - Automated with zero downtime
  - Old key deactivated after grace period

Long-lived tokens:
  - Rotate every 90 days minimum
  - Or if accessed frequently, every 30 days
  - Build rotation into deployment procedures
```

Google Cloud Best Practices: "Create dedicated service accounts for each part of the application and only grant the service account access to the necessary resources."

## Audit Logging Requirements

Comprehensive audit logging is required for:
- **Compliance**: SOC2, HIPAA, PCI-DSS all mandate it
- **Forensics**: When breaches occur, logs answer "who did what, when?"
- **Accountability**: Actions traced to individuals
- **Anomaly detection**: Unusual patterns trigger alerts

### Minimum Data Points

Log these for every access event:

1. **User/Principal Identification** - Unique ID, username, service account name
2. **Timestamp** - When it occurred (UTC)
3. **Resource** - What was accessed (database, server, API)
4. **Action** - What operation (SELECT, UPDATE, DELETE, SSH login)
5. **Success/Failure** - Did it work? If not, why?
6. **Origination** - Where from? (IP address, geographic location)
7. **Affected Data** - What data was touched (for regulated data)

**Example audit entries**:

```
2025-11-16 14:23:45 UTC | user: alice@company.com | resource: prod-db-01 |
  action: SELECT * FROM users | success: true | source: 203.0.113.42

2025-11-16 14:24:12 UTC | user: alice@company.com | resource: prod-db-01 |
  action: UPDATE users SET email=? | success: true | rows: 1 | source: 203.0.113.42

2025-11-16 14:25:00 UTC | service: ci-deploy | resource: prod-k8s |
  action: apply deployment | success: true | config_hash: a7x2k | source: 10.0.0.5
```

### Retention Requirements

| Framework | Minimum Retention | Immediately Accessible |
|-----------|-------------------|------------------------|
| PCI-DSS | 1 year | 3 months |
| HIPAA | 6 years | Varies |
| SOC2 | 1-2 years (varies) | Recent period |
| SOX | 7 years | N/A |

**Storage strategy**:

```
Recent logs (30 days): Database (fast, searchable)
Intermediate (90 days): Local storage or cheap cloud storage
Long-term (years): Archive (S3 Glacier, Azure Cool Storage)
```

## Access Review Processes

People change roles, leave companies, get promoted. Without regular reviews, permissions accumulate ("privilege creep").

### Recommended Schedule

| Privilege Level | Review Frequency | Owner |
|----------------|------------------|-------|
| Production admin | Quarterly | Security + Manager |
| Production read/write | Semi-annually | Manager + Resource owner |
| Standard user | Annually | Manager |
| Service accounts | Semi-annually | DevOps/Platform team |
| Third-party/contractor | Quarterly | Security team |

### Review Process

**1. Preparation** (Manager):
- List all users with access to systems
- List current permissions for each user

**2. Review** (Manager + Resource Owner):
- For each user: "Do they still need this access?"
- Options: Approve, Remove, Modify (reduce scope)
- Document decisions and rationale

**3. Remediation** (IT/Security):
- Remove access for "disapprove" decisions
- Update permissions for "modify" decisions
- Notify users about changes

**4. Attestation** (Manager):
- Sign off: "I have reviewed and verified access"
- Document attestation in audit trail

**5. Audit** (Security/Compliance):
- Verify all changes completed
- Check for missed accounts
- Ensure documented evidence exists

**Compliance requirements**:
- **SOX**: Quarterly reviews (public companies)
- **SOC2**: Quarterly minimum
- **PCI-DSS**: Annual minimum
- **HIPAA**: Annual (typically)

## Emergency Access ("Break Glass") Procedures

Break glass is controlled emergency access when standard methods fail or are too slow.

### When to Use

- Production database down, need immediate restoration
- Security incident requiring rapid account disabling
- Application cascading failures needing emergency intervention
- Critical infrastructure failure

**Key principles**:
- **Fast**: Activate in minutes
- **Audited**: Every use logged and reviewed
- **Rare**: True emergencies only
- **Limited**: Minimum permissions for emergencies, not full admin

### Implementation Pattern

**1. Pre-Stage Accounts**

```
Create before emergencies occur:
  - breakglass01 (Primary)
  - breakglass02 (Backup)

Credentials stored:
  - Encrypted vault with Shamir's secret sharing (requires 2+ people)
  - OR hardware token (YubiKey) in secure location
  - Never in email, Slack, shared passwords
```

**2. Limited Permissions**

```
Bad: Break glass has full admin rights

Good: Minimum permissions for emergencies

Example (database):
  Allowed: KILL connections, RESTORE backups, DISABLE users
  Denied: CREATE users, ALTER schemas, EXPORT data
```

**3. Time-Limited Activation**

```
Option A: Manual activation
  - Account disabled normally
  - During emergency, manager/security enables it
  - Auto-disables after 1 hour

Option B: Standing but heavily monitored
  - Account always enabled
  - Any login triggers immediate alert
  - Unused for 6+ months triggers audit
```

**4. Strong Audit Trail**

```
Every break glass use must log:
  - Who requested access?
  - What was the incident ID/justification?
  - When was it accessed?
  - What actions were taken?
  - Who validated post-incident?

Process:
  1. Incident occurs
  2. On-call lead requests break glass
  3. Credentials provided (multi-party unsealing if needed)
  4. Access used (15-60 minutes)
  5. Incident resolved
  6. Post-incident review: Was use justified?
  7. Credentials rotated
```

**5. Regular Testing**

```
Quarterly: Test break glass procedures
  - Activate account
  - Verify expected permissions
  - Simulate recovery action
  - Verify audit logging
  - Disable account
  - Review audit trail

Annual: Full incident simulation
  - Simulate actual emergency
  - Use break glass access
  - Measure time to resolution
  - Identify procedure gaps
```

StrongDM: "Every break glass event must be logged, monitored, and reviewed post-incident, and procedures should be tested on a scheduled cadence."

## Putting It Together: A Practical Implementation

Here's what this looks like in practice for a mid-sized engineering team (50-100 people):

**Access Structure**:
- Base roles: Developer, DevOps, DBA, Security (4 roles)
- Environment modifiers: Dev, Staging, Prod-RO, Prod-RW (4 modifiers)
- Composed as needed (16 possible combinations, use 8-10 actively)

**JIT Access**:
- Production read-only: Auto-approved during business hours
- Production write: Manual approval (5-minute SLA)
- Break glass: Pre-staged, multi-party activation

**Service Accounts**:
- One per service (20 services = 20 accounts)
- Credentials rotated every 60 days automatically
- Minimal permissions per service
- Monitored for unusual activity

**Audit Logging**:
- All production access logged
- 30 days immediately searchable
- 1 year retained for compliance
- Monthly anomaly review

**Access Reviews**:
- Quarterly for production access
- Automated reminders to managers
- Results documented for auditors

**Time to implement**: 1-2 quarters with dedicated effort.

## Next Steps

If you're implementing this from scratch:

1. **Month 1**: Implement RBAC with 3-5 base roles
2. **Month 2**: Add JIT access for high-risk resources
3. **Month 3**: Enable comprehensive audit logging
4. **Month 4**: Quarterly access review process
5. **Quarter 2**: Service account automation
6. **Quarter 3**: Session recording for sensitive operations

For deeper implementation details on zero-trust architecture, certificate-based authentication, and compliance automation, see the deep-water content.
