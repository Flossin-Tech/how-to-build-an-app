---
title: "Resource Identification"
phase: "01-discovery-planning"
topic: "resource-identification"
depth: "deep-water"
reading_time: 40
prerequisites: ["job-to-be-done", "requirements-gathering"]
related_topics: ["scope-setting", "threat-modeling"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Resource Identification - Deep Water

Advanced resource planning and cost modeling.

## Total Cost of Ownership (TCO) Modeling

TCO includes all costs over the system's lifetime, not just initial development.

**TCO components:**

**1. Development costs (Year 0):**
- Salaries: $200K (2 devs × $100K × 1 year)
- Contractors: $40K (UI/UX, security consultant)
- Tools/licenses: $10K (JetBrains, CI/CD, etc.)
- **Subtotal: $250K**

**2. Infrastructure (ongoing):**
- Cloud hosting: $2K/month = $24K/year
- Third-party services: $500/month = $6K/year
- CDN: $200/month = $2.4K/year
- **Subtotal: $32.4K/year**

**3. Operational costs (ongoing):**
- Maintenance: 20% of dev time = $40K/year
- Monitoring/on-call: $15K/year (PagerDuty, etc.)
- Security tools: $6K/year
- **Subtotal: $61K/year**

**4. Support costs (ongoing):**
- Customer support: 1 FTE = $60K/year
- Documentation maintenance: $10K/year
- Training materials: $5K/year
- **Subtotal: $75K/year**

**5-year TCO: $250K + ($32.4K + $61K + $75K) × 5 = $1,092K**

This shows the real cost is 4× the initial development. Use this for:
- Build vs buy decisions (buying $500K software might be cheaper than building $250K if TCO is considered)
- Budgeting for ongoing costs
- ROI calculations

## Vendor Lock-In Risk Assessment

Evaluate how trapped you are with each vendor choice:

**Assessment framework:**
```
Service: AWS RDS (Managed PostgreSQL)
Lock-in risk: MEDIUM

Exit barriers:
- Data export: Easy (standard PostgreSQL dump)
- Proprietary features used: RDS-specific monitoring, automated backups
- Migration complexity: Medium (need to set up own PostgreSQL server)
- Migration time: 2-3 days
- Data transfer cost: $500 (egress fees)
- Opportunity cost: 1 week of dev time

Mitigation:
- Use standard PostgreSQL features only
- Keep infrastructure-as-code for easy redeployment
- Quarterly review: could we switch if needed?
```

**High lock-in example:**
```
Service: Salesforce
Lock-in risk: HIGH

Exit barriers:
- Data export: Difficult (proprietary format)
- Custom code: Apex code doesn't run elsewhere
- Integration depth: 50+ integrated systems
- Migration complexity: High (6-12 month project)
- Migration cost: $500K+ (replatforming, data migration, reintegration)

Mitigation:
- Accept lock-in (switching cost too high anyway)
- Negotiate multi-year contract for price stability
- Maintain data warehouse with external copy for analytics
```

**Decision criteria:**
- Can you export your data easily?
- Are you using proprietary features or standards?
- How many integrations would break?
- What's the switching cost vs annual spend?

High lock-in isn't always bad, but know what you're signing up for.

## Staffing Models (In-House, Contractors, Offshore, Hybrid)

Different staffing approaches have trade-offs:

**In-house full-time:**
- **Pros:** Full commitment, domain knowledge builds up, team cohesion
- **Cons:** Fixed cost, hard to scale up/down, limited skill diversity
- **Best for:** Core long-term systems, sensitive IP
- **Cost:** $100-200K/year per developer (US, including benefits)

**Contractors/freelancers:**
- **Pros:** Flexible, fill skill gaps, scale up/down easily
- **Cons:** Less committed, knowledge loss when they leave, higher hourly rate
- **Best for:** Short-term projects, specialized skills
- **Cost:** $100-300/hour (US), 3-6 month engagements

**Offshore teams:**
- **Pros:** Lower cost, access to global talent
- **Cons:** Time zone challenges, communication overhead, cultural differences
- **Best for:** Well-defined work, non-core features
- **Cost:** $25-75/hour (Eastern Europe, Latin America, India)

**Hybrid model:**
```
Core team (in-house):
- Tech lead / architect (in-house)
- 2 senior developers (in-house)
- Product manager (in-house)

Augmentation:
- UI/UX designer (contractor, as needed)
- QA engineers (offshore team, ongoing)
- DevOps (contractor, 20 hours/week)
- Feature development (mix of in-house + offshore)
```

**Management overhead:** Offshore/contractor-heavy teams need more coordination. Budget 10-20% management overhead.

## Knowledge Transfer and Documentation Requirements

People leave. Knowledge must stay.

**Critical documentation:**
- Architecture decision records (ADRs): Why you made key decisions
- System architecture diagrams: How components fit together
- Runbooks: How to handle common operational issues
- Developer onboarding guide: How to set up environment, contribute code
- API documentation: How to use your APIs
- Database schema documentation: What tables mean, relationships

**Knowledge transfer timeline:**
```
When someone leaves (2-week notice):
- Week 1: Document tribal knowledge, record walkthrough videos
- Week 2: Pair with replacement, answer questions, final handoff
```

Better: Continuous documentation so departure isn't a crisis.

**Documentation budget:** Plan 5-10% of development time for documentation. Undocumented system becomes unmaintainable when original developers leave.

## Capacity Planning and Scalability Economics

Model how costs change with growth:

**Current state (1,000 users):**
- 2 small app servers: $200/month
- Database: $150/month
- Bandwidth: $50/month
- **Total: $400/month**

**Growth scenario (10,000 users):**
- 5 medium app servers: $750/month
- Database (larger instance): $500/month
- Bandwidth: $300/month
- CDN: $200/month
- **Total: $1,750/month**

**Growth scenario (100,000 users):**
- 20 large app servers: $4,000/month
- Database (multi-region): $2,000/month
- Bandwidth: $2,000/month
- CDN: $800/month
- **Total: $8,800/month**

**Economics:**
- Cost per user at 1K users: $0.40/month
- Cost per user at 10K users: $0.175/month (better unit economics)
- Cost per user at 100K users: $0.088/month (economies of scale)

**But watch for:**
- Breakpoints where you need architectural changes (e.g., sharding at 1M users)
- Services with sudden cost jumps (moving to enterprise tier)
- Fixed costs that don't scale down (minimum instance sizes)

Plan for 10× growth: What breaks? What costs spike? What needs redesign?

## Compliance Tool Requirements

Regulated industries need specific tools:

**Audit logging:**
- Centralized logging (Splunk, ELK): $500-5K/month depending on volume
- Tamper-proof storage
- Retention per regulation (7 years for some healthcare, finance)

**Encryption key management:**
- Hardware Security Module (HSM) or cloud KMS
- AWS KMS: $1/key/month + $0.03 per 10K API requests
- Key rotation automation
- Separation of duties for key access

**Compliance scanning:**
- HIPAA compliance scanning: Secureframe, Vanta ($500-2K/month)
- PCI-DSS scanning: Required quarterly scans ($2K-10K/year)
- SOC2 audit preparation: $15K-50K annually

**Encryption requirements:**
- SSL/TLS certificates (free with Let's Encrypt or $100-500/year)
- Database encryption at rest (often free, but performance cost)
- Encrypted backups

**Access controls:**
- SSO/SAML (Okta, Auth0 enterprise): $2-8 per user/month
- Privileged access management (PAM): $10-50 per user/month
- Multi-factor authentication (MFA)

Budget heavily for compliance. Healthcare system with HIPAA? Add $50K-200K/year for compliance tools and audits.

## Disaster Recovery Infrastructure Costs

DR isn't free. Different tiers:

**Tier 1: Backup and restore (RTO: 24 hours, RPO: 24 hours):**
- Daily database backups: $100/month (storage)
- Application code in version control: Free
- Recovery process: Manual, documented runbook
- **Cost: ~$100/month**
- **Use case:** Internal tools, low-criticality systems

**Tier 2: Warm standby (RTO: 4 hours, RPO: 1 hour):**
- Secondary database replica (different region): $500/month
- Inactive application servers (can start quickly): $50/month (stopped instances)
- Automated failover scripts
- **Cost: ~$600/month + $2K setup**
- **Use case:** Business applications, e-commerce

**Tier 3: Active-active (RTO: minutes, RPO: 0):**
- Full duplicate environment in second region: 2× infrastructure cost
- Load balancer across regions: $200/month
- Synchronous replication: Included or slight performance penalty
- **Cost: 2.1-2.5× single region cost**
- **Use case:** Financial systems, healthcare, always-on SaaS

**DR drill costs:**
- Quarterly drills: 1 day team time ($2K in salaries)
- Actual failover test: May incur double infrastructure costs for test period

Budget for DR based on RTO/RPO requirements. Can't have 99.99% uptime without spending for it.

## Technical Debt Budget Allocation

Not all development time goes to features. Budget for:

**Refactoring and cleanup:**
- 10-20% of sprint capacity
- Pay down debt before it compounds
- Example: 2-week sprint = 2-4 days for technical improvements

**Dependency updates:**
- Monthly: Update patch versions
- Quarterly: Update minor versions
- Yearly: Update major versions
- Budget 1-2 days/month for this

**Performance optimization:**
- After every major feature: Profile and optimize
- Budget 10% of feature development time

**Security updates:**
- Critical CVEs: Drop everything, patch immediately
- High severity: Patch within 1 week
- Medium/low: Include in regular update cycle
- Budget 5-10% time for security work

**Infrastructure upgrades:**
- Database version upgrades: 1-2 weeks/year
- Kubernetes/platform upgrades: 3-4 days/quarter
- SSL certificate renewal: Automated, but test failover

**The 80/20 rule:**
- 80% time on features/new development
- 20% time on maintenance, refactoring, updates, security

Teams that spend 100% time on features accumulate debt that eventually slows them to 50% productivity.

## On-Call and Support Resource Planning

Someone needs to respond when things break.

**On-call rotation:**
- Primary and secondary on-call
- Rotate weekly (less frequent = burn out)
- Minimum 3 people for sustainable rotation
- Compensation: $500-1000/week on-call pay + overtime for incidents

**On-call costs:**
```
Team of 5 engineers:
- Each on-call 1 week per month
- On-call pay: $800/week
- Average incidents: 2 per week @ 2 hours each
- Overtime: 4 hours × $75/hour = $300

Per engineer: ($800 + $300) × 12/year = $13.2K/year
Team cost: $66K/year for on-call
```

**Support tiers:**

**Tier 1 (Customer support):**
- Handle common questions, password resets
- Escalate technical issues
- Cost: $40-60K per support rep

**Tier 2 (Engineering on-call):**
- Handle escalated technical issues
- Fix bugs, deploy hotfixes
- Cost: Developer salary + on-call premium

**Tier 3 (Specialized support):**
- Database expert, security specialist
- Major incidents only
- Cost: Senior developer rates

**Tool costs:**
- PagerDuty or similar: $20-50/user/month
- Status page (StatusPage.io): $29-99/month
- Incident management (Incident.io): $15-50/user/month

Budget for support from day one. Systems without on-call support respond slowly to outages, losing customer trust.

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Quick overview of people, tools, and budget
- **[← Mid-Depth](../mid-depth/index.md)** Infrastructure, third-party services, and security tools

### Related Topics
- [Scope Setting](../../scope-setting/deep-water/index.md) - Complex scope management
- [Requirements Gathering](../../requirements-gathering/deep-water/index.md) - Enterprise requirements and SLAs
- [Concept of Operations](../../concept-of-operations/deep-water/index.md) - Disaster recovery operations
- [Threat Modeling](../../threat-modeling/deep-water/index.md) - Advanced security planning

### Navigate
- [← Back to Discovery & Planning](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
