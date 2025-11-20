---
title: "Security Posture Reviews"
phase: "07-iteration"
topic: "security-posture-reviews"
depth: "deep-water"
reading_time: 50
prerequisites: ["threat-modeling", "secure-coding-practices", "deployment", "monitoring-logging", "incident-response"]
related_topics: ["retrospectives", "feature-planning", "access-control"]
personas: ["specialist-expanding", "architect"]
updated: "2025-11-16"
---

# Security Posture Reviews: Continuous Adaptive Security

The fundamental challenge of security posture management is asymmetric: attackers need to find one vulnerability, defenders need to close them all. You can't win that game through perfect defense. You win by detecting and adapting faster than attackers can exploit weaknesses.

This requires shifting from periodic security reviews to continuous security posture management - integrating security validation into every aspect of the development and operations lifecycle.

## Beyond Compliance Theater

Most security posture reviews optimize for the wrong thing: checking boxes on compliance frameworks. This creates a dangerous illusion of security.

**The compliance trap**: Organizations pass audits while remaining fundamentally insecure because:
1. **Point-in-time assessment**: Compliant on audit day, drift happens next week
2. **Documentation over reality**: Policies exist on paper, not in practice
3. **Minimum viable compliance**: Do just enough to pass, not enough to be secure
4. **Control implementation ≠ control effectiveness**: Having a firewall doesn't mean it's configured correctly

### Shift from Compliance to Resilience (Kelly Shortridge)

**Compliance thinking**: "Are we doing the security things?"
**Resilience thinking**: "How quickly do we detect and recover from security failures?"

**Key insight**: Systems will be breached. The question is how well you contain, detect, and recover.

**Metrics shift**:
- From: Percentage of controls implemented
- To: Mean time to detect (MTTD), mean time to contain (MTTC), blast radius

**Cultural shift**:
- From: Prevent all failures
- To: Fail safely, learn quickly, adapt continuously

## Continuous Security Posture Management

Move from quarterly reviews to continuous validation.

### The Continuous Security Loop

```
[Instrument] → [Detect] → [Analyze] → [Respond] → [Learn] → [Instrument]
```

**1. Instrument**: Everything that matters for security
- Authentication attempts (successes and failures)
- Authorization decisions (access grants and denials)
- Data access patterns
- Configuration changes
- Deployment events
- Infrastructure provisioning

**2. Detect**: Anomalies and known attack patterns
- Behavioral baselines (what's normal for this user/service?)
- Attack signatures (known exploitation techniques)
- Policy violations (misconfiguration, unauthorized changes)

**3. Analyze**: Context and severity
- Is this an attack or legitimate unusual behavior?
- What's the blast radius?
- What data/systems are at risk?

**4. Respond**: Contain and remediate
- Automated response (block IP, revoke credentials, isolate system)
- Human investigation
- Coordinated incident response

**5. Learn**: Feed back into defenses
- Update detection rules
- Improve instrumentation
- Revise threat model
- Strengthen controls

### Implementation Patterns

#### Pattern: Security Chaos Engineering (Netflix)

Apply chaos engineering principles to security:
- Deliberately inject attack scenarios into production (safely)
- Verify detection and response mechanisms work
- Build confidence in security controls through testing

**Example exercises**:
- Attempt to access data without proper credentials
- Try to escalate privileges
- Simulate data exfiltration
- Test incident response procedures under load

**Prerequisites**: Mature monitoring, incident response capability, management buy-in.

**Trade-off**: Risk of causing actual outages. Start in non-production, gradually increase realism.

#### Pattern: Red Team / Blue Team Exercises

**Red team**: Offensive security, attempts to breach systems using realistic attack techniques.
**Blue team**: Defensive security, detects and responds to red team.
**Purple team**: Collaborative, red and blue work together to improve defenses.

**Frequency**: Quarterly for mature organizations, annually otherwise.

**Scope variations**:
- **Assumed breach**: Start with red team having credentials (tests detection/response)
- **Zero knowledge**: Red team starts with no inside information (tests full kill chain)
- **Specific scenario**: Test defenses against particular threat actor or technique

**Output**: Gap analysis, control improvements, detection rule refinement.

**Investment**: Expensive (weeks of specialized expertise). Reserve for high-value assets or compliance requirements.

#### Pattern: Continuous Vulnerability Disclosure

Move from periodic scanning to continuous discovery.

**Components**:
1. **Automated scanning** in CI/CD pipeline (every commit)
2. **Production scanning** (daily or weekly, depending on risk tolerance)
3. **Third-party testing** (bug bounty programs)
4. **Threat intelligence feeds** (CVE databases, vendor advisories, security research)

**Aggregation challenge**: Multiple tools produce thousands of findings. Need deduplication, prioritization, workflow management.

**Tooling**:
- **DefectDojo**, **OWASP Glue**: Vulnerability aggregation and management
- **Kenna Security**, **Tenable.io**: Risk-based vulnerability management with threat intelligence
- **ThreadFix**, **Faraday**: Centralized vulnerability management

**SLA-based remediation**:
- Critical (CVSS 9-10, actively exploited): 7 days
- High (CVSS 7-8.9): 30 days
- Medium (CVSS 4-6.9): 90 days
- Low (CVSS 0-3.9): Best effort

**Track**: Remediation velocity, SLA compliance, backlog trends.

## Threat Intelligence Integration

Security posture reviews should incorporate external threat intelligence, not just internal assessment.

### Intelligence Sources

**Strategic intelligence** (what's happening in the threat landscape):
- Threat reports from security vendors (Mandiant, CrowdStrike, FireEye)
- Government advisories (CISA, NSA, FBI)
- Industry-specific intelligence sharing (FS-ISAC for finance, H-ISAC for healthcare)

**Tactical intelligence** (specific indicators of compromise):
- Threat feeds (malicious IPs, domains, file hashes)
- CVE databases
- Exploit databases (Exploit-DB, Metasploit modules)

**Operational intelligence** (adversary TTPs - tactics, techniques, procedures):
- MITRE ATT&CK framework
- Threat actor profiles
- Campaign tracking

### Operationalizing Threat Intelligence

**Process**:
1. **Ingest**: Consume threat feeds (APIs, STIX/TAXII standards)
2. **Normalize**: Convert to common format (STIX)
3. **Enrich**: Add context (geolocation, reputation, historical data)
4. **Correlate**: Match against your environment (are we vulnerable to this?)
5. **Prioritize**: Focus on threats relevant to your organization
6. **Act**: Update detection rules, patch vulnerabilities, adjust controls
7. **Measure**: Did intelligence improve security outcomes?

**Platforms**: MISP, OpenCTI, ThreatConnect, Anomali, Recorded Future.

**Common failure mode**: Data hoarding without action. Collecting intelligence is not the same as using it.

### Threat-Informed Defense (MITRE)

Map your security controls to ATT&CK framework:
- For each technique, what detection/prevention controls exist?
- What's your coverage percentage?
- Which high-value techniques have no coverage?

**Example**: Technique T1078 (Valid Accounts - attackers using legitimate credentials)

**Coverage assessment**:
- **Prevent**: MFA (partial mitigation, doesn't prevent compromised credentials)
- **Detect**: Anomalous login patterns, impossible travel, unusual access patterns
- **Respond**: Automated credential revocation, user notification

**Gap**: No detection for slow, low-volume abuse of valid credentials that matches normal patterns.

**Remediation**: Implement User and Entity Behavior Analytics (UEBA).

**Tooling**: MITRE ATT&CK Navigator for coverage visualization.

## Security Metrics and Benchmarking

What gets measured gets improved. But security is hard to measure meaningfully.

### Vanity Metrics vs. Actionable Metrics

**Vanity metrics** (look good, don't drive behavior):
- Number of vulnerabilities found (more scanning = more findings)
- Number of security tools deployed
- Security budget as percentage of IT spend
- Lines of code scanned

**Actionable metrics** (inform decisions):
- **Mean Time to Remediate (MTTR)**: How fast we fix known issues
- **Vulnerability recurrence rate**: Do we keep making same mistakes?
- **Attack surface reduction**: Are we shrinking exposure over time?
- **Detection coverage**: Percentage of ATT&CK techniques we can detect
- **Incident containment time**: How quickly we stop active attacks

### Security Maturity Models

Track progression from ad-hoc to optimized security practices.

**SAMM (Software Assurance Maturity Model) - OWASP**:
Five functions, three maturity levels each:
- Governance (Strategy, Policy, Education)
- Design (Threat Assessment, Security Requirements, Security Architecture)
- Implementation (Secure Build, Secure Deployment, Defect Management)
- Verification (Architecture Assessment, Requirements Testing, Security Testing)
- Operations (Incident Management, Environment Management, Operational Enablement)

**Use**: Self-assess current maturity, set target maturity, roadmap to close gaps.

**BSIMM (Building Security In Maturity Model)**:
Descriptive model based on real-world data from 130+ organizations.
- 12 practices across 4 domains
- Maturity levels derived from actual organizational implementations

**Use**: Benchmark against peers, identify common practices at your maturity level.

**Trade-off**: SAMM is prescriptive (here's what to do), BSIMM is descriptive (here's what others do). SAMM better for roadmapping, BSIMM better for benchmarking.

### Measuring Security Culture

Security posture isn't just technical controls. It's organizational behavior.

**Indicators of security culture maturity**:

1. **Reporting behavior**
   - Do people report security concerns or hide them?
   - Measure: Security reports per capita, trend over time

2. **Blameless post-mortems**
   - Are security incidents learning opportunities or witch hunts?
   - Measure: Post-mortem follow-through rate, psychological safety scores

3. **Security ownership**
   - Do engineers own security or defer to "security team"?
   - Measure: Security stories originated by development vs. security team

4. **Training effectiveness**
   - Does training change behavior or just check compliance box?
   - Measure: Secure coding pattern adoption, vulnerability trends by team

5. **Security friction**
   - Is security seen as enabler or blocker?
   - Measure: Developer satisfaction with security tools/processes

**Survey framework** (Google's Project Aristotle approach):
- Quarterly team surveys
- Anonymous responses
- Track trends over time
- Action items from low scores

## Adversary Simulation and Attack Surface Management

Don't wait for real attackers to find your weaknesses.

### Breach and Attack Simulation (BAS)

Automated platforms that continuously run attack scenarios:
- **SafeBreach**, **Cymulate**, **AttackIQ**: Commercial BAS platforms
- **Atomic Red Team**, **Caldera**: Open-source ATT&CK-based testing

**How it works**:
1. Agent deployed in your environment
2. Runs simulated attacks (low-risk, non-destructive)
3. Validates detection and prevention controls
4. Reports gaps in coverage

**Example scenarios**:
- Data exfiltration to cloud storage
- Lateral movement across network segments
- Credential dumping and reuse
- Persistence mechanism installation

**Value**: Continuous validation. Know controls work before real attack.

**Trade-off**: Generates false positives in monitoring. Requires mature SOC to differentiate simulation from real threats.

### External Attack Surface Management (EASM)

Continuous discovery and monitoring of internet-exposed assets.

**Problem**: Shadow IT, forgotten dev environments, orphaned cloud resources, acquired company infrastructure. You can't protect what you don't know exists.

**Approach**:
1. **Automated discovery**: Scan from attacker's perspective (what's visible externally?)
2. **Asset inventory**: Catalog everything found
3. **Risk assessment**: Identify misconfigurations, vulnerabilities, excessive exposure
4. **Attribution**: Map assets to owners/business units
5. **Remediation**: Fix or decommission risky assets

**Platforms**: **Censys**, **Shodan**, **RiskIQ**, **CyCognito**, **Randori**.

**Integration**: Feed discovered assets into vulnerability management, threat modeling.

**Frequency**: Continuous scanning, weekly reporting.

### Purple Team Metrics

Measure collaboration effectiveness between offensive and defensive security:

**Coverage metrics**:
- Percentage of ATT&CK techniques tested
- Percentage of critical assets tested
- Detection rule coverage

**Effectiveness metrics**:
- Detection rate (% of attacks detected)
- False positive rate
- Time to detect
- Time to respond

**Improvement metrics**:
- Gaps closed since last exercise
- Detection improvements
- Response time improvement

**Cultural metrics**:
- Cross-team collaboration quality
- Actionable findings per exercise
- Remediation completion rate

## The Resilience Engineering Perspective

Richard Cook's "How Complex Systems Fail" and Sidney Dekker's "Drift into Failure" offer insights for security posture management.

### Key Principles

**1. Complex systems run in degraded mode**
Your security posture is never perfect. Gaps exist. The question is whether you know about them and have compensating controls.

**2. All systems have undetected failures**
You have vulnerabilities you don't know about. Assume breach. Design for graceful degradation.

**3. Failure happens at boundaries**
Most security failures occur at trust boundaries, integration points, organizational handoffs. Focus review energy there.

**4. Hindsight bias obscures learning**
After incident, obvious what should have been done. But with information available beforehand, decision may have been reasonable. (Outcome bias in security reviews prevents learning.)

**5. Change introduces new failure modes**
Every feature, every dependency update, every configuration change can introduce vulnerabilities. Security review must be continuous, not point-in-time.

### Drift into Failure

Organizations slowly drift toward unsafe states through small, individually rational decisions:
- Skip security review for "minor" feature
- Delay patching because it's "low risk"
- Grant "temporary" production access that becomes permanent
- Accept "one more" outdated dependency

**Prevention**: Regular calibration through reviews. Are we drifting? What's changed from our baseline?

## Organizational Patterns for Security at Scale

### Pattern: Security Champions (Etsy, Salesforce)

Distributed security expertise instead of centralized security team bottleneck.

**Structure**:
- One security champion per team (usually senior engineer)
- Champions are team members first, security advocates second
- Regular training and coordination
- Direct line to central security team

**Responsibilities**:
- Security review participation
- Security story grooming
- Security training for team
- Escalation path for security concerns

**Benefits**:
- Scales security knowledge
- Security embedded in development, not bolted on
- Faster security decision-making

**Trade-offs**:
- Requires investment in training
- Champion time commitment (10-20%)
- Consistency across champions varies

### Pattern: Security Guilds (Spotify Model)

Cross-team community of practice for security.

**Structure**:
- Voluntary participation
- Regular meetings (monthly)
- Knowledge sharing, not decision-making authority

**Activities**:
- Security tool evaluations
- Threat landscape discussion
- Post-mortem sharing
- Security patterns and anti-patterns

**Benefits**:
- Distributes knowledge
- Creates security culture
- Bottom-up security improvements

**Trade-offs**: Voluntary means inconsistent participation. Needs executive support to protect time.

### Pattern: Secure-by-Default Platforms (Google, Netflix)

Provide secure infrastructure platforms with guard rails.

**Approach**:
1. Build paved-road platforms with security baked in
2. Make secure path easiest path
3. Make insecure path possible but harder (for legitimate exceptions)
4. Monitor for off-platform resource creation

**Example**: Internal PaaS with:
- Automatic encryption at rest
- Managed secrets
- Pre-configured monitoring and alerting
- WAF and DDoS protection
- Compliance controls built-in

**Benefits**:
- Shifts left (security by default, not added later)
- Reduces cognitive load on developers
- Consistent security controls

**Trade-offs**:
- Large upfront investment
- Platform team becomes bottleneck if not designed well
- Can constrain innovation if too rigid

## Integration with Business Risk Management

Security posture reviews should inform business risk decisions, not just technical ones.

### Quantitative Risk Assessment

Move beyond "high/medium/low" to financial impact modeling.

**FAIR (Factor Analysis of Information Risk)**:
- **Loss Event Frequency**: How often will this happen?
- **Loss Magnitude**: How bad when it does?
- Combines to: **Risk** (annual loss expectancy)

**Example**: Ransomware risk assessment
- **Threat Event Frequency**: 2x per year (based on industry data)
- **Vulnerability**: 40% chance of successful exploitation (backup coverage, EDR effectiveness)
- **Loss Event Frequency**: 0.8x per year
- **Primary Loss**: $2M (downtime, recovery, ransomware payment)
- **Secondary Loss**: $500K (reputation, customer churn)
- **Annual Loss Expectancy**: $2M * 0.8 = $2M

**Decision**: Is $500K investment in improved backup and EDR justified? Yes (ROI is positive).

**Trade-offs**: Requires data (often unavailable). Models are estimates, not precision. Better than pure gut feel.

### Security Investment Prioritization

Given limited budget and capacity, what to fix first?

**Framework**: Risk × Ease of Remediation

| Risk | Easy to Fix | Hard to Fix |
|------|------------|-------------|
| **Critical** | Do immediately | Do this quarter |
| **High** | This sprint | This quarter |
| **Medium** | Backlog | Defer unless easy win |
| **Low** | If time permits | Don't do |

**"Easy" factors**: Time, cost, dependencies, team expertise, business disruption.

**Communicate in business terms**: "This vulnerability could lead to $XM in losses with Y% probability. Fix costs $Z and takes N weeks."

## The Long Game: Security Posture Evolution

Organizations mature through phases. Don't expect to jump from ad-hoc to optimized.

### Maturity Progression

**Phase 1: Reactive** (most startups)
- Security happens after incidents
- Point tools, no integration
- Security team as external auditors

**Indicators**:
- Discovering vulnerabilities in production
- No security requirements in planning
- Patching happens when things break

**Phase 2: Compliance-Driven** (regulated industries)
- Security for audit purposes
- Formalized processes and policies
- Dedicated security team

**Indicators**:
- Can pass audits but still have incidents
- Security slows down development
- Checkbox mentality

**Phase 3: Proactive** (mature tech companies)
- Security integrated into SDLC
- Automated scanning and testing
- Security champions in teams

**Indicators**:
- Finding vulnerabilities before production
- Security requirements in user stories
- Developers have security training

**Phase 4: Adaptive** (leading organizations)
- Continuous security validation
- Threat-informed defense
- Security as competitive advantage

**Indicators**:
- Real-time threat intelligence integration
- Automated response to threats
- Security metrics drive business decisions

**Time to progress**: 1-2 years per phase with dedicated effort. Can't skip phases.

## Next Steps and Further Reading

**Foundational**:
- Shostack, "Threat Modeling: Designing for Security"
- McGraw, "Software Security: Building Security In"
- Shortridge, "Security Chaos Engineering"

**Resilience Engineering**:
- Cook, "How Complex Systems Fail"
- Dekker, "The Field Guide to Understanding 'Human Error'"
- Dekker, "Drift into Failure"

**Organizational**:
- Forsgren et al., "Accelerate" (DORA metrics)
- Kim et al., "The DevOps Handbook"
- Beyer et al., "Building Secure and Reliable Systems" (Google SRE)

**Frameworks**:
- NIST Cybersecurity Framework
- MITRE ATT&CK
- OWASP SAMM
- CIS Critical Security Controls

**Threat Intelligence**:
- MITRE, "Threat-Informed Defense"
- Lockheed Martin, "Cyber Kill Chain"
- Mandiant, "M-Trends" (annual report)

## Related Topics

- [Threat Modeling](../../01-discovery-planning/threat-modeling/deep-water/)
- [Incident Response](../../06-operations/incident-response/deep-water/)
- [Retrospectives](../retrospectives/deep-water/)
- [Monitoring & Logging](../../06-operations/monitoring-logging/deep-water/)
