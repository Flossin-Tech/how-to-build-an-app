---
title: "Requirements Gathering"
phase: "01-discovery-planning"
topic: "requirements-gathering"
depth: "deep-water"
reading_time: 45
prerequisites: ["job-to-be-done", "concept-of-operations"]
related_topics: ["scope-setting", "threat-modeling", "resource-identification"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Requirements Gathering - Deep Water

Advanced requirements engineering for complex systems.

## Requirements Traceability Matrix

A traceability matrix links requirements to their source, design, implementation, and tests. This becomes critical for:
- Compliance audits (prove you implemented what you said you would)
- Change impact analysis (what breaks if we change this requirement?)
- Test coverage (are all requirements tested?)

**Structure:**
```
Req ID | Source | Requirement | Design Doc | Code Module | Test Cases | Status
-------|--------|-------------|------------|-------------|------------|-------
R-001  | GDPR   | User data   | auth-design| auth.py     | test_auth  | Complete
       |        | deletion    | .md        | gdpr.py     | test_gdpr  |
R-002  | Client | Export to   | export-    | export.py   | test_expor | In Dev
       | email  | PDF         | design.md  |             | t          |
```

**Benefits:**
- Know which requirements aren't implemented yet
- Find orphaned code (not tied to any requirement)
- Identify missing tests
- Support compliance evidence

**Tools:** JIRA, Azure DevOps, specialized requirements management tools (DOORS, Jama)

## Compliance Requirements Mapping (GDPR, HIPAA, SOC2, etc.)

Different regulations impose specific requirements. Map them explicitly:

**GDPR requirements:**
- Right to access: "Provide all user data in machine-readable format within 30 days"
- Right to erasure: "Delete all user PII within 30 days of request, log deletion"
- Breach notification: "Detect and report breaches within 72 hours"
- Consent: "Obtain explicit consent for each data processing purpose, track consent version"
- Data portability: "Export user data in JSON or CSV format"

**HIPAA requirements (healthcare):**
- Access controls: "Implement role-based access, log all PHI access with user ID and timestamp"
- Encryption: "Encrypt PHI at rest (AES-256) and in transit (TLS 1.3+)"
- Audit trails: "Retain access logs for 7 years, protect from modification"
- Business associate agreements: "All vendors with PHI access must sign BAA"

**SOC2 requirements (SaaS trust):**
- Availability: "99.9% uptime, documented incident response"
- Security: "MFA for all accounts, annual penetration testing"
- Confidentiality: "Data classification and handling procedures"
- Processing integrity: "Automated testing, code review for all changes"

For each requirement, document:
- Where it's implemented (code, process, policy)
- How it's verified (automated test, manual audit)
- Who's responsible
- Evidence for auditors

## Accessibility Standards (WCAG level, screen reader support)

Accessibility isn't optional for many systems. Document specific requirements:

**WCAG 2.1 Level AA (minimum for many regulations):**
- "All images have alt text describing content"
- "Color contrast ratio minimum 4.5:1 for normal text, 3:1 for large text"
- "All functionality available via keyboard (no mouse required)"
- "Form errors identified and described in text, not just red color"
- "Video content has captions and audio descriptions"

**Screen reader requirements:**
- "Proper heading hierarchy (h1, h2, h3) for navigation"
- "ARIA labels for interactive elements"
- "Focus indicators visible when tabbing through page"
- "Semantic HTML (nav, main, article, aside)"

**Testing requirements:**
- "Test with NVDA and JAWS screen readers"
- "Keyboard-only navigation testing"
- "Automated accessibility scanning with axe or WAVE"
- "User testing with disabled users"

Accessibility requirements should be testable and specific, not just "make it accessible."

## Internationalization/Localization Needs

If your app will support multiple languages/regions:

**Internationalization (i18n) - technical requirements:**
- "All user-facing text externalized to translation files"
- "Support for right-to-left languages (Arabic, Hebrew)"
- "Unicode UTF-8 encoding throughout"
- "Date/time formatting per locale (MM/DD vs DD/MM)"
- "Currency formatting with correct symbols and decimal places"
- "No hardcoded strings in code or images"

**Localization (l10n) - language/region requirements:**
- "Initial launch: English (US), Spanish (Latin America), French (Canada)"
- "Phase 2: German, Japanese, Simplified Chinese"
- "Legal text reviewed by local counsel for each region"
- "Customer support available in all supported languages"

**Technical considerations:**
- "UI accommodates 30% text expansion (German text often longer than English)"
- "Images with embedded text available in all languages"
- "Number formatting: 1,000.00 (US) vs 1.000,00 (Germany) vs 1 000,00 (France)"

## Disaster Recovery Time Objectives (RTO/RPO)

Critical for systems that can't afford extended downtime:

**RTO (Recovery Time Objective):** How long can the system be down?
- Tier 1 (Critical): RTO = 1 hour (financial trading, emergency services)
- Tier 2 (Important): RTO = 4 hours (e-commerce, business applications)
- Tier 3 (Standard): RTO = 24 hours (internal tools, reporting)

**RPO (Recovery Point Objective):** How much data can you afford to lose?
- Tier 1: RPO = 0 (zero data loss, requires synchronous replication)
- Tier 2: RPO = 15 minutes (can lose small amount of recent data)
- Tier 3: RPO = 24 hours (daily backups acceptable)

**Requirements documentation:**
```
System: Payment processing
RTO: 30 minutes
RPO: 0 (zero data loss)
Requirements:
- Active-active deployment across 2 regions
- Synchronous database replication
- Automated failover with health checks every 60s
- Runbook for manual failover if automated fails
- Monthly DR drills with documented results
```

Different components can have different RTO/RPO:
- User authentication: RTO 15 min, RPO 0
- Analytics dashboard: RTO 4 hours, RPO 1 hour
- Marketing website: RTO 1 hour, RPO 24 hours

## Service Level Agreements (SLAs) and Operational Level Agreements (OLAs)

**SLA (Service Level Agreement):** Contract with customers
```
Uptime SLA: 99.9% per month
- Downtime allowance: 43 minutes/month
- Measurement: HTTP 200 response from /health endpoint
- Exclusions: Scheduled maintenance (announced 72 hours prior)
- Credits: 10% monthly fee for each 0.1% below 99.9%
- Support response: Critical issues within 1 hour
```

**OLA (Operational Level Agreement):** Internal targets (tighter than SLA)
```
Internal uptime target: 99.95% (more headroom than SLA)
Response times (internal targets):
- P0 (system down): 15 minutes acknowledgment, 1 hour resolution start
- P1 (degraded): 30 minutes acknowledgment, 4 hours resolution
- P2 (minor issue): 4 hours acknowledgment, 24 hours resolution
```

Requirements should support these targets:
- "Monitoring detects outages within 60 seconds"
- "Automated alerts to on-call engineer via PagerDuty"
- "Runbooks for common incidents accessible from mobile device"

## Audit Trail and Forensic Requirements

For regulated industries or high-security systems:

**What to log:**
- Authentication events (login, logout, failed attempts)
- Authorization decisions (user tried to access X, was allowed/denied)
- Data modifications (who changed what, when, old value → new value)
- Administrative actions (user role changes, configuration changes)
- Deletion events (what was deleted, by whom, can it be recovered?)

**Log requirements:**
```
Required fields:
- Timestamp (UTC, millisecond precision)
- User ID (authenticated user or "anonymous")
- Action performed
- Resource affected
- Result (success/failure)
- Source IP address
- Session ID

Example:
2025-11-15T14:23:45.123Z | user:12345 | UPDATE | patient:789 |
SUCCESS | 192.168.1.50 | session:abc-def | Changed diagnosis from
"flu" to "pneumonia"
```

**Log protection:**
- "Logs written to append-only storage (can't be modified)"
- "Logs encrypted at rest"
- "Log tampering detection via cryptographic hashing"
- "Logs retained for [7 years for HIPAA, varies by regulation]"

**Forensic requirements:**
- "Able to reconstruct user's actions for any 24-hour period"
- "Search logs by user, resource, time range within 5 minutes"
- "Export logs for legal/compliance requests in standard format"

## Data Sovereignty and Residency Constraints

Where data can physically be stored and processed:

**EU data (GDPR):**
- "EU citizen personal data stored only in EU data centers"
- "No transfer to US without adequate safeguards (SCCs, DPF)"
- "Data processing logs include geographic location"

**China data (PIPL - Personal Information Protection Law):**
- "Critical information infrastructure: all data stored in China"
- "Cross-border data transfer requires security assessment"

**Healthcare data (various countries):**
- "Patient health records must remain in country of origin"
- "Telemedicine consultations: data stored where patient is located"

**Requirements:**
```
Requirement: Geographic data isolation
Implementation:
- Database clusters per region (us-east, eu-west, ap-southeast)
- User data routing based on registration country
- Admin viewing European user: read-only access, no export
- Data residency tag on all records
- Quarterly audit of data location compliance
```

**Technical implications:**
- Multi-region deployment complexity
- Cross-region queries prohibited
- Backup and DR within same region
- Higher costs (can't consolidate infrastructure)

## Backward Compatibility Requirements

When replacing existing systems or evolving APIs:

**API versioning:**
- "Support previous API version for 12 months after new version released"
- "Deprecation warnings in HTTP headers 6 months before end-of-life"
- "Documentation for migration path from v1 to v2"

**Data migration:**
- "Import all existing records without data loss"
- "Legacy data format supported for 6 months post-migration"
- "Rollback plan if migration fails"

**Browser support:**
- "Support last 2 versions of Chrome, Firefox, Safari, Edge"
- "Graceful degradation for older browsers (core features work, nice-to-haves disabled)"
- "Explicit notification if browser unsupported"

**Mobile OS:**
- "iOS: support current version and previous 2 major versions"
- "Android: support API level 26+ (Android 8.0, October 2017+)"

Document what won't be backward compatible and why:
- "Breaking change: Authentication API endpoint changing /auth/login → /v2/auth/login"
- "Rationale: Security improvement requires incompatible token format"
- "Migration: Old tokens valid until March 1, new tokens required after"

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Quick overview and testability basics
- **[← Mid-Depth](../mid-depth/index.md)** User stories, API contracts, and prioritization

### Related Topics
- [Job to Be Done](../../job-to-be-done/deep-water/index.md) - Advanced Jobs-to-be-Done framework
- [Concept of Operations](../../concept-of-operations/deep-water/index.md) - Mission threads and compliance workflows
- [Scope Setting](../../scope-setting/deep-water/index.md) - Complex scope management

### Navigate
- [← Back to Discovery & Planning](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
