---
title: "Security Posture Reviews"
phase: "07-iteration"
topic: "security-posture-reviews"
depth: "mid-depth"
reading_time: 28
prerequisites: ["threat-modeling", "secure-coding-practices", "deployment", "monitoring-logging"]
related_topics: ["incident-response", "access-control", "retrospectives"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-16"
---

# Security Posture Reviews

Security posture reviews are systematic assessments of whether your security controls are working and whether your threat model is still accurate. The goal isn't perfection - it's knowing where you're vulnerable and making conscious decisions about risk.

## The Core Problem

Your threat landscape evolves continuously:
- **New vulnerabilities**: Zero-days, CVEs in dependencies, novel attack techniques
- **System changes**: New features, architectural shifts, infrastructure changes
- **Organizational changes**: Team growth, access creep, knowledge loss
- **Attacker evolution**: Techniques that didn't exist when you designed your defenses

Static security gets worse over time. Continuous review is how you adapt.

## Review Frameworks and When to Use Them

Different frameworks work for different contexts. Pick based on your risk profile and resources.

### CIS Critical Security Controls (Center for Internet Security)

**What it is**: 18 prioritized security controls, grouped by implementation groups (IG1, IG2, IG3).

**Best for**: Small to medium teams without dedicated security staff. Practical, actionable.

**Key controls** (IG1 - foundational):
1. Inventory and control of enterprise assets
2. Inventory and control of software assets
3. Data protection
4. Secure configuration of enterprise assets and software
5. Account management
6. Access control management

**How to use**: Start with IG1. Assess current state against each control. Prioritize gaps.

**Review frequency**: Quarterly for IG1, bi-annually for IG2/IG3.

**Trade-off**: Very comprehensive (can feel overwhelming). Strong compliance alignment.

### OWASP Top 10

**What it is**: Ten most critical web application security risks, updated every 3-4 years.

**Best for**: Web applications, developer-focused teams.

**2021 Top 10**:
1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

**How to use**: Map your application to each risk category. Test for presence. Review after major changes.

**Review frequency**: After new features, quarterly minimum.

**Trade-off**: Web-focused (doesn't cover infrastructure/cloud). Well-known, easy to communicate.

### MITRE ATT&CK Framework

**What it is**: Knowledge base of adversary tactics and techniques based on real-world observations.

**Best for**: Understanding how attackers operate, threat modeling, detection engineering.

**Structure**: 14 tactics (what attackers want to do) containing 191+ techniques (how they do it).

**Example tactics**:
- Initial Access (how attackers get in)
- Persistence (how they maintain access)
- Privilege Escalation (how they get more power)
- Exfiltration (how they steal data)

**How to use**:
1. Map your defenses to ATT&CK techniques
2. Identify gaps in coverage
3. Prioritize based on threat intelligence (what's being actively exploited)

**Review frequency**: Quarterly threat landscape review, after incidents.

**Trade-off**: Comprehensive but complex. Requires security expertise to use effectively.

### NIST Cybersecurity Framework

**What it is**: Risk-based framework with five functions: Identify, Protect, Detect, Respond, Recover.

**Best for**: Organizations needing compliance, formal risk management.

**How to use**: Assess maturity across each function. Create roadmap to target maturity level.

**Review frequency**: Annually, or when risk landscape changes significantly.

**Trade-off**: Strategic rather than tactical. Good for governance, less actionable for individual contributors.

## Structured Review Process

A repeatable process prevents security drift.

### Quarterly Security Posture Review (2-4 hours)

**Participants**: Engineering lead, DevOps/SRE, product owner. Include security specialist if available.

**Agenda**:

#### 1. Review Threat Model (30 min)
**Questions**:
- Have we added new features that change attack surface?
- Do we handle new types of data?
- Have our trust boundaries changed?
- Are original assumptions still valid?

**Output**: Updated threat model or list of modeling sessions needed.

#### 2. Vulnerability Management (30 min)
**Review**:
- Dependency scan results (trends over time)
- Unpatched vulnerabilities (why not patched? blocking issues?)
- Mean time to remediation (are we getting faster or slower?)
- False positive rate (are tools producing noise?)

**Metrics to track**:
- Number of high/critical vulnerabilities
- Age of oldest unpatched vulnerability
- Percentage of dependencies up-to-date

**Output**: Patch priority list, blocked issues escalated.

#### 3. Access Control Audit (30 min)
**Review**:
- Production access list (who should be removed?)
- Service accounts and API keys (any unused? overly permissive?)
- Credential rotation status
- MFA coverage (who's not using it?)
- Least privilege violations (people with more access than needed)

**Common findings**:
- Former employees still in systems
- Shared accounts (multiple people using same credentials)
- API keys that never expire
- Admin access granted "temporarily" 6 months ago

**Output**: Access removal list, credential rotation schedule.

#### 4. Security Control Effectiveness (30 min)
**Test**:
- Monitoring and alerting (run test attacks, do alerts fire?)
- Backup and recovery (can we actually restore from backup?)
- Incident response runbooks (are they up-to-date?)
- WAF/firewall rules (blocking what they should? allowing what they should?)

**Don't assume controls work. Test them.**

**Output**: Broken controls requiring remediation.

#### 5. Configuration Review (30 min)
**Check**:
- Secure defaults (anything drift from baseline?)
- Encryption in transit and at rest
- Logging configuration (still capturing what we need?)
- Cloud security group/firewall rules (any overly permissive rules?)
- Database access controls

**Tools**: Cloud provider security scanners (AWS Security Hub, Azure Security Center), configuration management systems.

**Output**: Configuration hardening tasks.

#### 6. Third-Party Risk (15 min)
**Review**:
- Vendors with access to your systems
- SaaS tools with data access
- Open source projects you depend on (still maintained?)
- APIs you integrate with (still secure? deprecated?)

**Questions**:
- Have we onboarded new vendors?
- Are existing vendors still compliant with our security requirements?
- Any vendors had security incidents?

**Output**: Vendor review actions, deprecated service migrations.

#### 7. Security Metrics and Trends (15 min)
**Track over time**:
- MTTD (Mean Time To Detect) incidents
- MTTR (Mean Time To Respond) to security issues
- Failed authentication attempts
- Security tool coverage (% of code scanned, % of systems monitored)
- Training completion rates

**Output**: Trend analysis, areas requiring focus.

## Integration with Development Lifecycle

Security reviews shouldn't be separate from development. Integrate them.

### Pre-Release Security Checklist

Before deploying significant changes:
- [ ] Threat model updated for new features
- [ ] Security scan passed (SAST/DAST)
- [ ] Dependencies scanned for vulnerabilities
- [ ] Access controls reviewed
- [ ] Logging captures security-relevant events
- [ ] Rollback procedure tested
- [ ] Incident response runbook updated

### Post-Incident Security Review

After any security incident or near-miss:
- What was the root cause?
- Did existing controls fail? Why?
- What should we have detected but didn't?
- What would prevent recurrence?
- What did we learn about our threat model?

Feed findings back into threat model and control improvements.

### Sprint-Based Security Reviews

For teams doing 2-week sprints, integrate security:
- **Sprint planning**: Include security-focused stories (dependency updates, access reviews)
- **Sprint retro**: Include security as explicit topic
- **Every 4th sprint**: Dedicate time to deeper security review

**Allocation**: 5-10% of sprint capacity for security maintenance.

## Measuring Security Posture Over Time

Track these metrics quarterly:

### Vulnerability Metrics
- **Vulnerability density**: Known vulns per 1000 lines of code
- **Time to patch**: Days from disclosure to remediation
- **Vulnerability backlog**: Trend (growing or shrinking?)

### Access Control Metrics
- **Access review frequency**: How often you audit access
- **Credential age**: Average age of credentials
- **MFA coverage**: Percentage of users with MFA enabled

### Detection and Response
- **MTTD**: How quickly you detect security events
- **MTTR**: How quickly you respond
- **False positive rate**: Are alerts useful or noise?

### Coverage Metrics
- **Code coverage by security scans**: Percentage scanned
- **Systems with monitoring**: Percentage covered
- **Third-party audit findings**: Trend (improving or declining?)

**Goal**: Metrics trending in right direction, not absolute perfection.

## Common Gaps and How to Find Them

### Gap: Shadow IT
**Symptom**: Engineers spinning up cloud resources outside official accounts.
**How to find**: Cloud asset inventory tools, expense report review.
**Fix**: Clear process for requesting resources, remove barriers to official provisioning.

### Gap: Credential Sprawl
**Symptom**: API keys and passwords scattered across repos, wikis, Slack.
**How to find**: GitHub secret scanning, grep repositories, Slack export search.
**Fix**: Secrets management system (HashiCorp Vault, AWS Secrets Manager), rotate exposed credentials.

### Gap: Logging Blind Spots
**Symptom**: Incidents happening without detection.
**How to find**: Review incident post-mortems, identify what you wish you'd logged.
**Fix**: Enhance logging, create missing alerts.

### Gap: Deprecated Dependencies
**Symptom**: Libraries no longer maintained, security patches unavailable.
**How to find**: Dependency scanning with lifecycle checks.
**Fix**: Migration plan to supported alternatives.

### Gap: Configuration Drift
**Symptom**: Systems diverge from secure baseline over time.
**How to find**: Configuration management scanning (Chef InSpec, Terraform drift detection).
**Fix**: Infrastructure as Code, automated compliance scanning.

## Risk Prioritization

You'll find more issues than you can fix. Prioritize.

### Risk Matrix

**Impact × Likelihood = Priority**

| Impact | Exploited Today | Exploitable | Requires Sophistication | Theoretical |
|--------|----------------|-------------|------------------------|-------------|
| **Critical** (data breach, system compromise) | Fix now | This sprint | Next sprint | Backlog |
| **High** (service disruption, degradation) | This sprint | Next sprint | Within month | Backlog |
| **Medium** (limited impact, workarounds exist) | Within month | Backlog | Backlog | Monitor |
| **Low** (minimal impact) | Backlog | Monitor | Defer | Defer |

**Critical decisions require judgment**. A theoretical vulnerability in a system exposed to the internet rates higher than an active exploit on an internal system with strict access controls.

## Automation and Tooling

Manual reviews don't scale. Automate where possible.

### Dependency Scanning
- **GitHub Dependabot**, **GitLab Dependency Scanning**: Automated PRs for vulnerable dependencies
- **Snyk**, **WhiteSource**: SaaS platforms with deeper analysis
- **OWASP Dependency-Check**: Free, self-hosted

### Configuration Scanning
- **Prowler** (AWS), **ScoutSuite** (multi-cloud): Cloud security posture management
- **Chef InSpec**, **OpenSCAP**: Infrastructure compliance scanning
- **Terraform Sentinel/OPA**: Policy as code

### Secret Detection
- **git-secrets**, **TruffleHog**, **detect-secrets**: Scan repositories for credentials
- **GitHub secret scanning**: Automated for public repos, available for private

### Security Testing
- **SAST** (Static Analysis): SonarQube, Semgrep, CodeQL
- **DAST** (Dynamic Analysis): OWASP ZAP, Burp Suite
- **Container scanning**: Trivy, Clair, Anchore

**Integration point**: CI/CD pipeline. Block merges on critical findings.

**Trade-off**: Automation finds known patterns. Novel attacks require human analysis.

## When to Bring in External Help

You need professional security assessment when:
- Handling sensitive data (PII, financial, health)
- Compliance requirements (SOC 2, HIPAA, PCI-DSS)
- Before major launch or acquisition
- After significant architecture changes
- You're out of your depth

**Types of assessments**:
- **Penetration testing**: Simulated attacks to find vulnerabilities
- **Security audit**: Comprehensive review of controls
- **Red team exercise**: Adversarial simulation
- **Compliance audit**: Third-party verification for standards

**Frequency**: Annually at minimum for high-risk systems. After major changes.

## Next Steps

- **Deep Water**: Continuous security monitoring, adversarial simulation, threat intelligence integration, security culture at scale
- **Related**: [Threat Modeling](../../02-design/threat-modeling/mid-depth/), [Incident Response](../../06-operations/incident-response/mid-depth/)

## Review Framework Quick Reference

| Framework | Best For | Depth | Frequency |
|-----------|----------|-------|-----------|
| **CIS Controls** | Small/medium teams, compliance | High | Quarterly |
| **OWASP Top 10** | Web applications | Medium | Quarterly |
| **MITRE ATT&CK** | Threat modeling, detection | High | Quarterly |
| **NIST CSF** | Governance, risk management | Strategic | Annually |

**Start simple**: OWASP Top 10 + dependency scanning. Expand as you mature.
