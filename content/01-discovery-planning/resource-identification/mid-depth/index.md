---
title: "Resource Identification"
phase: "01-discovery-planning"
topic: "resource-identification"
depth: "mid-depth"
reading_time: 20
prerequisites: ["job-to-be-done", "requirements-gathering"]
related_topics: ["scope-setting", "threat-modeling"]
personas: ["generalist-leveling-up", "busy-developer", "specialist-expanding"]
updated: "2025-11-15"
---

# Resource Identification - Mid-Depth

Systematic resource planning and gap analysis.

## Skills Gap Analysis - What Expertise Is Missing?

Map required skills against your team's capabilities:

**Example:**
```
Required Skills:
- Backend API development (Python/FastAPI) → Have: 2 devs ✓
- Frontend (React) → Have: 1 dev ✓
- Database design (PostgreSQL) → Have: Backend devs can handle ✓
- DevOps (Docker, Kubernetes) → Have: None ✗ GAP
- Security testing (OWASP) → Have: None ✗ GAP
- UI/UX design → Have: None ✗ GAP
```

**Closing the gaps:**
- Hire: Bring on DevOps contractor for 2 months
- Train: Send backend dev to Kubernetes workshop
- Buy: Use managed Kubernetes service to reduce DevOps needs
- Outsource: Contract UI/UX agency for design work
- Accept risk: Skip advanced security testing for MVP, add later

Document which gaps you're closing and how. Document which gaps you're accepting.

## Tool Selection Criteria (Build vs Buy, Open Source vs Commercial)

For each major component, decide: build, buy, or use open source?

**Decision framework:**
```
Component: User authentication

Build it yourself:
+ Pros: Full control, no recurring costs, exact fit
- Cons: Security risk, takes time, ongoing maintenance

Buy (Auth0, Okta):
+ Pros: Battle-tested, maintained, quick integration
- Cons: $$$, vendor lock-in, less customization

Open source (Keycloak, Ory):
+ Pros: Free, customizable, no lock-in
- Cons: You maintain it, support yourself, learning curve
```

**Decision factors:**
- Is this core to your business? (Build)
- Is this commodity/common need? (Buy or open source)
- Do you have expertise? (affects build vs buy)
- What's the ongoing maintenance cost?
- What happens if vendor disappears?

Document your decision and reasoning for later reference.

## Infrastructure Needs (Compute, Storage, Networking)

Estimate your infrastructure requirements:

**Compute:**
- How many servers/containers?
- CPU/memory requirements per instance
- Auto-scaling parameters (scale from 2 to 10 instances under load)
- Geographic distribution (single region or multi-region?)

**Storage:**
- Database size estimate (start with 100GB, grow to 1TB in year 1)
- File storage (user uploads: 50GB/month growth)
- Backup storage (retain 30 days of daily backups)
- CDN for static assets

**Networking:**
- Bandwidth estimate (1TB/month outbound)
- Need for VPN or private networking?
- Load balancer requirements
- Geographic latency requirements

## Third-Party Service Dependencies (Auth, Payments, Email)

List external services you depend on:

**Authentication:**
- Service: Auth0
- Plan: Professional ($240/month)
- Risk: If Auth0 is down, users can't log in
- Mitigation: Their SLA is 99.9%, acceptable for our needs

**Payments:**
- Service: Stripe
- Cost: 2.9% + $0.30 per transaction
- Risk: Vendor lock-in (hard to switch payment processors)
- Mitigation: Abstract behind payment interface, could swap if needed

**Email:**
- Service: SendGrid
- Plan: $19.95/month for 50K emails
- Risk: Emails might go to spam
- Mitigation: Proper SPF/DKIM configuration, warm up IP

**Monitoring:**
- Service: Datadog
- Cost: ~$200/month estimated
- Risk: Could get expensive as we scale
- Mitigation: Start with cheaper tier, evaluate alternatives if costs spike

For each dependency:
- What happens if it's unavailable?
- What's the exit strategy if you need to switch?
- What's the cost trajectory as you scale?

## Training or Onboarding Time Required

Account for ramp-up time:

**New team members:**
- Codebase familiarization: 1-2 weeks
- Domain knowledge: 2-4 weeks for complex domains
- Full productivity: 4-8 weeks

**New technologies:**
- Learning Kubernetes: 2-3 weeks to basic competency
- Learning new language: 4-6 weeks to productivity
- Learning new framework: 1-2 weeks if similar to existing knowledge

**Budget this time.** A 3-month project with 2 weeks onboarding is really 2.5 months of productive work.

## Common Pitfall: Underestimating Operational Overhead

Development is only part of the cost. Who handles:

- Server maintenance and updates
- Database backups and restores
- Security patches
- Monitoring and alerts
- On-call rotation
- User support
- Documentation updates

If you have 2 developers, one might spend 20% time on operations. That's 0.4 developer less for feature work.

**Options:**
- Managed services reduce ops burden (RDS vs raw PostgreSQL)
- DevOps hire or contractor
- Rotate ops duties among team
- Accept slower feature development

## Budget for Security Tools

Security isn't free. Budget for:

**SAST/DAST scanners:**
- Static analysis (Snyk, SonarQube): $0-500/month
- Dynamic scanning (OWASP ZAP free, Burp Suite Pro $400/year)

**Secret management:**
- HashiCorp Vault, AWS Secrets Manager: $0-200/month

**Dependency scanning:**
- Dependabot (free with GitHub)
- Snyk (free tier available, paid for advanced features)

**Monitoring/logging:**
- Security event logging and retention
- SIEM if needed (can get expensive fast)

**Penetration testing:**
- Annual pen test: $5K-50K depending on scope
- Bug bounty program: Variable cost

Even small projects should budget $100-500/month for basic security tools.

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Quick overview of people, tools, and budget
- **[Deep Water →](../deep-water/index.md)** Build vs buy, capacity planning, compliance tools, and DR costs

### Related Topics
- [Scope Setting](../../scope-setting/mid-depth/index.md) - Managing project boundaries
- [Requirements Gathering](../../requirements-gathering/mid-depth/index.md) - Functional and non-functional requirements
- [Threat Modeling](../../threat-modeling/mid-depth/index.md) - Security resource planning

### Navigate
- [← Back to Discovery & Planning](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
