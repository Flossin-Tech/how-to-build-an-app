---
title: "Patch Management - Mid-Depth"
phase: "06-operations"
topic: "patch-management"
depth: "mid-depth"
reading_time: 25
prerequisites: ["patch-management-surface"]
related_topics: ["monitoring-logging", "incident-response", "backup-recovery"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-16"
---

# Patch Management - Mid-Depth

You've deployed your system and you're patching vulnerabilities as they're announced. Then you hit the 130-per-day CVE problem. There are 23,600 vulnerabilities published in the first half of 2025 alone. You can't patch everything immediately. Your infrastructure team wants two weeks to test patches. Your security team wants patches deployed within 48 hours. Finance reports that the average ransomware recovery costs $2.73 million.

You need a system that decides what gets patched when, based on actual risk.

## When Surface Level Isn't Enough

You've shipped the basic version. Now you're hitting real problems:

- CVSS scores mark 56% of vulnerabilities as "Critical" or "High" but most aren't exploited
- Your team patches by severity rating and misses vulnerabilities that ransomware gangs actually use
- Testing every patch takes weeks while exploit timelines have compressed to 5 days
- Compliance frameworks demand fixed timelines that don't align with operational reality
- Zero-day vulnerabilities appear with exploits before patches exist

This guide covers practical patterns for risk-based patch management that work when you're past "just patch everything."

## Core Patterns

### Pattern 1: CVSS Limitations and Why Severity Isn't Risk

**When to use this:**
- Your organization patches "Critical and High" vulnerabilities within 30 days
- You're overwhelmed by the volume of "high severity" patches
- You've missed exploited vulnerabilities because they were rated "Medium"

**How it works:**

CVSS (Common Vulnerability Scoring System) measures severity, not risk. The difference matters.

A CVSS score represents the worst-case scenario if a vulnerability is exploited—technical impact like "complete system compromise" or "data exfiltration." It doesn't tell you whether attackers actually use the vulnerability.

**Real example: Follina (CVE-2022-30190)**
- Microsoft rating: CVSS 7.8, Severity "Important"
- Many organizations had policies like "patch Critical only within 30 days"
- This vulnerability was actively exploited in ransomware campaigns
- Organizations patching by CVSS score alone missed it

**The misprioritization problem:**

56% of all vulnerabilities score as High or Critical on CVSS. If you patch everything above 7.0, you're patching the majority of published CVEs—most of which are never exploited. Meanwhile, 4% of vulnerabilities account for nearly all real-world attacks.

**What's happening:**
1. CVSS assigns base scores within 2 weeks of discovery
2. Scores reflect theoretical maximum impact, not actual exploitation
3. Scores rarely change even when exploits emerge in the wild
4. Organizations treat CVSS as risk assessment when it's severity measurement

**Trade-offs:**
- **Pro:** CVSS provides consistent, vendor-neutral technical scoring
- **Pro:** Useful for understanding what could happen if exploited
- **Con:** Doesn't predict what will actually be exploited
- **Con:** Creates false urgency for unexploited vulnerabilities and false calm for exploited ones
- **When it's worth it:** Use CVSS as one input in a larger decision framework, not the only input

### Pattern 2: CISA KEV Catalog (Known Exploited Vulnerabilities)

**When to use this:**
- You need to identify which vulnerabilities attackers actually use
- You're implementing risk-based prioritization
- You need authoritative data for prioritization decisions

**How it works:**

CISA (Cybersecurity & Infrastructure Security Agency) maintains the Known Exploited Vulnerabilities catalog—a curated list of CVEs confirmed to be exploited in real-world attacks. This is the authoritative source for the 4% of vulnerabilities that matter most.

**Implementation:**

```bash
# Check if a CVE is in the KEV catalog
# Example: Is CVE-2024-57727 actively exploited?

curl -s https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json \
  | jq '.vulnerabilities[] | select(.cveID=="CVE-2024-57727")'

# Result: If present, this CVE is confirmed exploited
# Output includes:
# - CVE ID
# - Vendor/Product
# - Vulnerability name
# - Date added to catalog
# - Required action (usually "Apply updates")
# - Due date for federal agencies
```

**What's happening:**
1. CISA tracks vulnerabilities observed in real attacks
2. When exploitation is confirmed, CVE is added to KEV catalog
3. Federal agencies must remediate within 2 weeks (recent CVEs) or 6 months (pre-2021)
4. Catalog is continuously updated as new exploitation is discovered

**Trade-offs:**
- **Pro:** Authoritative confirmation of real-world exploitation
- **Pro:** Free, public, continuously updated resource
- **Pro:** Eliminates guesswork about which vulnerabilities attackers use
- **Con:** Reactive—vulnerabilities are added after exploitation begins, not before
- **Con:** Doesn't predict future exploitation of currently unexploited vulnerabilities
- **When it's worth it:** Always. This should be the first filter in your prioritization process.

### Pattern 3: SSVC (Stakeholder-Specific Vulnerability Categorization)

**When to use this:**
- CVSS scores aren't sufficient for your prioritization needs
- You need context-aware decision making for your specific environment
- You want a structured framework that accounts for organizational factors

**How it works:**

SSVC is a decision-tree framework developed by Carnegie Mellon SEI and recommended by CISA. Instead of asking "how severe is this," it asks "what should we do about this, given our context?"

**The five decision factors:**

1. **Exploitation status:** Is this CVE actively exploited in the wild?
   - None: No evidence of exploitation
   - PoC: Proof-of-concept exists
   - Active: Confirmed exploitation in attacks

2. **Technical impact:** What happens if a system is compromised?
   - Partial: Limited impact on one area (C/I/A)
   - Total: Complete loss of confidentiality, integrity, or availability

3. **Automatable:** Can an attack be automated or does it require human interaction?
   - No: Requires human reconnaissance or social engineering
   - Yes: Fully automated exploitation possible

4. **Mission prevalence:** How common is affected software in your organization?
   - Minimal: Edge cases, limited deployment
   - Support: Widely deployed in supporting systems
   - Essential: Critical to mission-essential functions

5. **Public well-being impact:** Does compromise affect critical infrastructure or public safety?
   - Minimal: Limited public impact
   - Material: Significant public harm possible
   - Irreversible: Permanent damage or loss of life

**The four priority outcomes:**

- **Track:** No immediate action; monitor and remediate in standard timelines
- **Track\*:** Closer monitoring warranted; remediate in standard timelines
- **Attend:** Supervisory attention; faster remediation than standard cycles
- **Act:** Immediate coordinated action; remediate as soon as possible

**Example decision path:**

```
Vulnerability: CVE-2024-57727 (SimpleHelp remote access software)

Exploitation status: Active (confirmed in ransomware campaigns)
Technical impact: Total (remote code execution, full system compromise)
Automatable: Yes (exploit requires no user interaction)
Mission prevalence: Support (deployed on IT help desk systems)
Public well-being impact: Minimal (internal IT systems)

Decision tree result: ACT
→ Immediate remediation required
→ Timeline: Days, not weeks
→ Coordinate across teams
```

**Implementation:**

Organizations customize the decision tree based on their tolerance for risk. A hospital might weight "mission prevalence" differently than a retail company. An industrial control system operator might prioritize "public well-being" higher than a SaaS provider.

**Trade-offs:**
- **Pro:** Context-aware prioritization specific to your organization
- **Pro:** Accounts for factors CVSS ignores (exploitation status, prevalence)
- **Pro:** Provides clear decision outcomes (Track/Track\*/Attend/Act)
- **Con:** Requires understanding your environment (which systems are mission-essential?)
- **Con:** More complex than sorting by CVSS score
- **When it's worth it:** When you have hundreds or thousands of systems and need to prioritize effectively across varying risk levels

### Pattern 4: Patch Cadence Planning (Patch Tuesday Model)

**When to use this:**
- You manage Windows systems at scale
- You need predictable patch deployment windows
- You want to align testing and deployment cycles

**How it works:**

Microsoft releases security updates on a predictable schedule, allowing organizations to plan testing and deployment.

**Patch Tuesday cadence:**
- **Second Tuesday of each month** at 10:00 AM Pacific Time
- **B Release (Update Tuesday):** Security fixes + cumulative updates + new non-security content
- **C Release (Third week):** Non-security updates for testing
- **D Release (Fourth week):** Non-security updates for testing
- **Out-of-Band (OOB):** Emergency releases for zero-days or critical issues requiring immediate patching

**Why the second Tuesday?**
Provides Monday for IT teams to remediate issues from the previous week, then patch Tuesday, then Wednesday-Thursday to address deployment issues before the weekend.

**Organizational patch workflow:**

```
Week 1 (Patch Tuesday):
├─ Tuesday: Microsoft releases patches
├─ Tuesday-Wednesday: Patch scanning and inventory
├─ Wednesday-Thursday: Deploy to test environment
└─ Friday: Validate patches in test

Week 2:
├─ Monday-Tuesday: Deploy to pre-production environment
├─ Wednesday: Monitor for issues
├─ Thursday: Deploy to production (phased rollout)
└─ Friday-Monday: Complete production deployment

Week 3:
├─ Monday: Verify 100% deployment
├─ Tuesday: Remediate failures
└─ Wednesday: Close change tickets

Exception path (Known Exploited):
├─ Day 0-1: Validate patch doesn't break critical functionality
├─ Day 1-2: Deploy to production with emergency change approval
└─ Day 2-3: Complete deployment, monitor for issues
```

**Common issues at this step:**
- Patches may require reboots during business hours (plan maintenance windows)
- Some patches have prerequisites or require specific installation order
- Compatibility issues between patches and third-party software

**Trade-offs:**
- **Pro:** Predictable schedule enables change management and communication
- **Pro:** Allows time for testing before production deployment
- **Pro:** Reduces surprise from unexpected patches
- **Con:** 2-4 week lag between patch release and production deployment creates exploitation window
- **Con:** Doesn't work for zero-days requiring immediate patching
- **When it's worth it:** For standard patch cycles on non-internet-facing systems where testing is essential

## Decision Framework

Use this framework to choose between approaches:

| Consideration | Immediate Patching | Patch Tuesday Model | Risk-Based (SSVC) |
|--------------|-------------------|---------------------|-------------------|
| **Timeline** | Hours to days | 2-4 weeks | Days (exploited) to months (standard) |
| **Testing** | Minimal (smoke test only) | Full regression testing | Varies by risk level |
| **Downtime Risk** | High (untested patches) | Low (thoroughly tested) | Medium (selective testing) |
| **Security Coverage** | Maximal (no gap) | Gap of 2-4 weeks | Prioritized (exploited first) |
| **Best for** | Known exploited, zero-days | Standard Windows updates | Mixed environment, 1000+ systems |

**Decision tree:**

```
Is the vulnerability in CISA's KEV catalog?
  ├─ YES → Is the affected system internet-facing or critical?
  │         ├─ YES → Immediate patching (emergency procedures)
  │         └─ NO → Fast-track patching (within 1 week, limited testing)
  └─ NO → Apply SSVC decision tree
            ├─ Act → Deploy within days (expedited testing)
            ├─ Attend → Deploy within 2-3 weeks (standard testing)
            ├─ Track* → Deploy within quarterly cycle
            └─ Track → Deploy as resources allow
```

## Testing and Validation

### How to verify it's working:

**Test environment validation:**

```bash
# Check if patches are installed (Linux)
rpm -qa --last | head -20

# Check if patches are installed (Windows PowerShell)
Get-HotFix | Sort-Object -Property InstalledOn -Descending | Select-Object -First 20

# Verify patch doesn't break critical functionality
# Example: Test database connectivity after kernel patch
systemctl status postgresql
psql -h localhost -U app_user -d production_db -c "SELECT 1;"
```

**What to test before production:**
1. **Smoke tests:** Does the system boot? Do critical services start?
2. **Integration tests:** Do dependencies still work (databases, APIs, file systems)?
3. **Performance tests:** Has latency or throughput changed?
4. **Rollback tests:** Can you revert the patch if needed?

### Monitoring in production:

Key metrics to track:

- **Mean Time to Detect (MTTD):** Time from CVE publication to detection in your environment
  - Target: < 24 hours for critical systems
  - Alert threshold: > 72 hours indicates scanning gaps

- **Mean Time to Remediate (MTTR):** Time from detection to patch deployment
  - Target for known exploited: < 7 days
  - Target for standard: < 30 days
  - Alert threshold: > 60 days indicates process breakdown

- **Patch coverage percentage:** % of systems patched for specific CVE
  - Target: 95%+ for known exploited
  - Target: 85%+ for standard patches
  - Alert threshold: < 70% indicates deployment issues

**What to do when alerts fire:**
- MTTD > 72 hours → Check vulnerability scanners, validate asset inventory
- MTTR > 60 days → Identify bottlenecks (testing? approvals? change management?)
- Coverage < 70% → Investigate deployment failures, EOL systems, incompatibility issues

## Common Pitfalls

### Pitfall 1: Patching by CVSS Score Alone

**What happens:** You patch 10 "Critical" severity vulnerabilities that aren't exploited while missing a "High" severity vulnerability actively used in ransomware campaigns.

**Root cause:** Treating severity as risk. CVSS measures worst-case impact, not exploitation likelihood.

**Prevention:**
1. Check CISA KEV catalog first (is it exploited?)
2. Apply SSVC decision tree (exploitation + technical impact + prevalence)
3. Use threat intelligence (is there a public exploit? ransomware campaign?)
4. Consider asset criticality (internet-facing systems need faster patching)

**Detection:**
- You're patching 100+ vulnerabilities per month but still seeing exploitation
- Post-breach analysis shows you missed "medium" severity vulnerabilities
- Patch backlog keeps growing despite increased effort

**Example:**

```
// Bad approach: Sort by CVSS only
SELECT cve_id, cvss_score, affected_systems
FROM vulnerabilities
WHERE cvss_score >= 9.0
ORDER BY cvss_score DESC;

// Result: 500 Critical vulnerabilities, most unexploited

// Good approach: Filter by exploitation first
SELECT cve_id, cvss_score, affected_systems
FROM vulnerabilities
WHERE is_known_exploited = true
   OR (cvss_score >= 9.0 AND system_criticality = 'internet-facing')
ORDER BY
  CASE
    WHEN is_known_exploited THEN 1
    WHEN system_criticality = 'internet-facing' THEN 2
    ELSE 3
  END,
  cvss_score DESC;

// Result: 20 vulnerabilities requiring immediate attention
```

### Pitfall 2: No Compensating Controls for Unpatched Systems

**What happens:** Zero-day vulnerability is disclosed. No patch exists yet. Systems remain exposed for days or weeks until vendor releases fix.

**Root cause:** Assumption that patching is the only remediation strategy.

**Prevention:** Implement defense-in-depth with multiple layers:

**Compensating controls when patches aren't available:**
1. **Network segmentation:** Isolate affected systems from internet or other networks
2. **Access restrictions:** Disable remote access, require VPN, implement IP allowlisting
3. **Monitoring/EDR:** Detect exploitation attempts even if you can't prevent them
4. **Service disablement:** If the vulnerable service isn't critical, disable it
5. **WAF/IPS rules:** Block known exploit patterns at network layer

**Example: SimpleHelp vulnerability (CVE-2024-57727)**

```yaml
# Compensating controls while waiting for patch

Network:
  - Block inbound TCP port 5500 (SimpleHelp server) at firewall
  - Restrict access to VPN-connected IP ranges only
  - Add IDS/IPS signature to detect exploitation attempts

Access:
  - Disable public internet access to SimpleHelp server
  - Require multi-factor authentication for all connections
  - Enable session recording and monitoring

Monitoring:
  - Alert on unexpected process execution from SimpleHelp directory
  - Monitor for outbound connections from server to suspicious IPs
  - EDR configured to detect ransomware behaviors

Service Management:
  - If SimpleHelp isn't actively used, disable the service entirely
  - If critical, limit to specific business hours (9am-5pm) with on-call activation
  - Maintain inventory of who has access and why
```

**Detection:**
- Systems with unpatched zero-days have no additional controls
- No documentation of what to do when patches aren't available
- Security team says "we're waiting for a patch" with no interim mitigation

### Pitfall 3: Testing Becomes a Bottleneck for Emergency Patches

**What happens:** Known exploited vulnerability with active ransomware campaigns. IT says "we need 6-8 weeks to test this." Exploitation happens before patch is deployed.

**Root cause:** One-size-fits-all testing policy that doesn't differentiate by risk level.

**Prevention:** Implement risk-tiered testing:

| Risk Level | Testing Approach | Timeline | Example |
|-----------|-----------------|----------|---------|
| **Emergency (Known Exploited)** | Smoke test only (system boots, critical services start) | 24-48 hours | Zero-day in internet-facing web server |
| **High (SSVC: Act)** | Functional testing of critical paths | 3-5 days | Important vulnerability in production database |
| **Standard (SSVC: Attend)** | Full regression testing | 2-3 weeks | Regular monthly security updates |
| **Low (SSVC: Track)** | Extended testing or defer to next cycle | Quarterly | Non-critical systems, low-severity patches |

**Testing strategy for emergency patches:**

1. **Identify critical functionality:** What absolutely must work?
   - Web server: Can it serve pages? Handle authentication? Process payments?
   - Database: Can applications connect? Read/write data? Run transactions?
   - API: Can clients authenticate? Make requests? Receive responses?

2. **Automated smoke tests:**
```bash
#!/bin/bash
# Emergency patch validation script

echo "Testing critical functionality after patch..."

# Test 1: System boots
if ! systemctl is-system-running --quiet; then
  echo "FAIL: System not running properly"
  exit 1
fi

# Test 2: Critical services are active
for service in nginx postgresql redis; do
  if ! systemctl is-active --quiet $service; then
    echo "FAIL: $service is not active"
    exit 1
  fi
done

# Test 3: Application responds
if ! curl -f -s http://localhost:8080/health > /dev/null; then
  echo "FAIL: Application health check failed"
  exit 1
fi

# Test 4: Database connectivity
if ! psql -h localhost -U app_user -d production_db -c "SELECT 1;" > /dev/null 2>&1; then
  echo "FAIL: Database connection failed"
  exit 1
fi

echo "PASS: All critical functionality working"
exit 0
```

3. **Have rollback plan ready:**
   - VM snapshot before patching
   - Database backup before schema changes
   - Documented rollback procedure tested in advance
   - Escalation path if rollback is needed

**Detection:**
- Time from CVE publication to deployment is consistently > 60 days
- Known exploited vulnerabilities wait in testing queue
- No differentiation between emergency and standard patch testing
- Post-breach analysis shows "we were testing the patch when we got ransomed"

## Real-World Examples

### Example 1: Ransomware Exploiting Patch Lag

**Context:** Mid-size organization with 500 servers, standard patch cycle of quarterly deployments

**Problem:**
- SimpleHelp vulnerabilities (CVE-2024-57727, CVE-2024-57728) published in January 2024
- Organization patches quarterly (next cycle: April 2024)
- Medusa ransomware group exploited SimpleHelp in March 2024
- Organization compromised before quarterly patch deployment

**Solution:**
1. Implemented CISA KEV monitoring (automated check daily)
2. Created emergency patch track for known exploited vulnerabilities
3. Differentiated testing requirements:
   - Known exploited: 48-hour deployment with smoke testing
   - Standard: Quarterly cycle with full regression testing
4. Added compensating controls for zero-days:
   - Network segmentation for remote access tools
   - EDR on all internet-facing systems
   - IDS/IPS signatures for known exploit patterns

**Results:**
- **Before:** MTTR for critical vulnerabilities was 90 days (quarterly cycle)
- **After:** MTTR for known exploited vulnerabilities reduced to 5 days
- **Time to implement:** 2 weeks to establish process, 1 week to train teams
- **Total cost:** No additional tooling required (used existing WSUS, vulnerability scanners)
- **Avoided cost:** Estimated $2.73M ransomware recovery cost

### Example 2: CVSS Misprioritization Corrected with SSVC

**Context:** Enterprise organization with 5,000 systems, patching 300+ vulnerabilities per month

**Problem:**
- Patch team overwhelmed with volume of "Critical" and "High" CVEs
- 56% of vulnerabilities scored as High/Critical on CVSS
- Limited testing resources meant backlog kept growing
- Post-breach analysis showed missed Follina (CVSS 7.8, "Important") while patching unexploited Critical vulnerabilities

**Solution:**
1. Adopted SSVC decision framework
2. Automated prioritization based on:
   - CISA KEV catalog (exploitation status)
   - EPSS scores (exploit prediction)
   - Asset criticality tags (internet-facing, sensitive data, mission-critical)
   - Threat intelligence feeds (ransomware campaigns)
3. Created four patch tracks:
   - **Act:** Deploy within 7 days (known exploited + critical systems)
   - **Attend:** Deploy within 30 days (high EPSS + production systems)
   - **Track\*:** Deploy within 90 days (moderate risk)
   - **Track:** Deploy as resources allow (low risk)

**Results:**
- **Before:** Patching 300+ vulnerabilities/month, backlog of 1,200
- **After:** Patching 50 high-priority vulnerabilities/month, backlog eliminated
- **Efficiency gain:** 83% reduction in patch volume with better coverage of actual threats
- **Time to implement:** 1 month (SSVC decision tree + automation)
- **Resources saved:** Reduced testing burden by focusing on exploited vulnerabilities

**Lessons learned:**
- Not all "Critical" vulnerabilities need immediate patching
- Exploitation status is the most important factor
- Automated prioritization based on multiple inputs prevents human bias

## Tools and Integration

### Recommended Tools

**Tool 1: WSUS (Windows Server Update Services)**
- **What it does:** Centralized patch management for Windows systems
- **When to use it:** Managing 50+ Windows servers or workstations
- **Setup:**

```powershell
# Install WSUS role
Install-WindowsFeature -Name UpdateServices -IncludeManagementTools

# Configure WSUS database
# Best practice: Use separate SQL instance from Configuration Manager
$wsusUtil = "C:\Program Files\Update Services\Tools\wsusutil.exe"
& $wsusUtil postinstall CONTENT_DIR=C:\WSUS SQL_INSTANCE_NAME=WSUS_SERVER\SQLEXPRESS

# Configure automatic approvals for critical updates
# (Manual approval recommended for production)
$wsus = Get-WsusServer
$rule = $wsus.GetInstallApprovalRules() | Where-Object {$_.Name -eq "Critical Updates"}
$rule.Enabled = $true
$rule.Save()
```

**Best practices:**
- Store updates locally to download license terms (enable "Store updates locally")
- Use TLS/SSL for all WSUS communication to prevent privilege escalation attacks
- Maximum 1,000 updates per deployment to avoid client overload
- Regular database cleanup to keep scan times reasonable
- When deploying multiple WSUS servers, share same SQL database for resilience

**Tool 2: Red Hat Satellite / Foreman**
- **What it does:** Patch and configuration management for Red Hat Enterprise Linux
- **When to use it:** Managing RHEL systems at scale (100+ servers)
- **Setup:**

```bash
# Register system to Red Hat Satellite
curl -sS https://satellite.example.com/pub/bootstrap.py | \
  python3 - --login=admin --organization="Production" --location="US-East" \
  --hostgroup="webservers"

# Apply patches for specific CVE
hammer host update --id 123 --errata-ids "RHSA-2024:1234"

# Create patch schedule for non-critical systems
hammer recurring-logic create \
  --cron-line "0 2 * * 0" \
  --task-id "Actions::Katello::Host::UpgradeAll"
```

**Tool 3: Qualys VMDR (Vulnerability Management, Detection, and Response)**
- **What it does:** Continuous vulnerability scanning with integrated patch management
- **When to use it:** Need cloud-based scanning across diverse environments (on-prem, cloud, containers)
- **Setup:**

```bash
# Install Qualys Cloud Agent
curl -o qualys-cloud-agent.rpm \
  https://qualys-download.example.com/CloudAgent/QualysCloudAgent.rpm
rpm -ivh qualys-cloud-agent.rpm

# Configure agent with activation ID and customer ID
/usr/local/qualys/cloud-agent/bin/qualys-cloud-agent.sh \
  ActivationId=12345678-1234-1234-1234-123456789012 \
  CustomerId=87654321-4321-4321-4321-210987654321
```

**Integration pattern: CVSS + EPSS + KEV filtering**

```python
# Example: Automated patch prioritization using multiple sources

import requests
import json
from datetime import datetime

# Fetch CISA KEV catalog
kev_url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
kev_data = requests.get(kev_url).json()
kev_cves = {v['cveID']: v for v in kev_data['vulnerabilities']}

# Fetch EPSS scores (Exploit Prediction Scoring System)
epss_url = "https://api.first.org/data/v1/epss"
epss_data = requests.get(epss_url).json()

# Fetch vulnerabilities from your scanner (Qualys/Tenable/etc.)
scanner_vulns = get_vulnerabilities_from_scanner()

# Prioritize
for vuln in scanner_vulns:
    cve_id = vuln['cve_id']
    cvss_score = vuln['cvss_score']

    # Priority 1: Known exploited (CISA KEV)
    if cve_id in kev_cves:
        vuln['priority'] = 'P1-IMMEDIATE'
        vuln['reason'] = 'Known exploited (CISA KEV)'
        vuln['timeline'] = '7 days'

    # Priority 2: High EPSS + internet-facing
    elif vuln['epss_score'] > 0.5 and vuln['asset_exposure'] == 'internet-facing':
        vuln['priority'] = 'P2-HIGH'
        vuln['reason'] = 'High exploit probability + exposed asset'
        vuln['timeline'] = '14 days'

    # Priority 3: Critical CVSS + production
    elif cvss_score >= 9.0 and vuln['environment'] == 'production':
        vuln['priority'] = 'P3-ELEVATED'
        vuln['reason'] = 'Critical severity in production'
        vuln['timeline'] = '30 days'

    # Priority 4: Standard
    else:
        vuln['priority'] = 'P4-STANDARD'
        vuln['reason'] = 'Standard patch cycle'
        vuln['timeline'] = '90 days'

# Export prioritized list
export_to_ticketing_system(scanner_vulns)
```

### Integration Patterns

**How patch management fits into larger systems:**

```
CI/CD Pipeline Integration:
├─ Build stage: Scan container images for vulnerabilities
│  └─ Tool: Trivy, Anchore, Snyk
├─ Test stage: Verify patches don't break tests
│  └─ Tool: Automated test suites
├─ Deploy stage: Only deploy images with no Critical KEV vulnerabilities
│  └─ Policy: Block deployment if known exploited CVE present
└─ Runtime: Continuous scanning of running containers
   └─ Tool: Runtime security (Falco, Aqua Security)

ITSM Integration:
├─ ServiceNow: Create change tickets for patch deployments
├─ Jira: Track patch backlog and completion
├─ PagerDuty: Alert on-call for emergency patches
└─ Slack: Notify teams when patches are deployed

Compliance Integration:
├─ SOC 2: Evidence collection for vulnerability management
├─ PCI-DSS: Quarterly vulnerability scans + remediation tracking
├─ HIPAA: Timely patching documentation
└─ BOD 22-01: Federal compliance reporting (CISA KEV remediation)
```

## Cost-Benefit Analysis

### Time Investment

**Initial setup:**
- WSUS deployment (Windows): 8-16 hours
- Red Hat Satellite (Linux): 16-24 hours
- SSVC decision tree customization: 4-8 hours
- Automation scripting (KEV monitoring, prioritization): 8-16 hours
- Process documentation and training: 8-16 hours

**Total initial investment:** 48-80 hours (1-2 weeks for one person)

**Learning curve:**
- Operations team: 1-2 weeks to learn SSVC framework
- Security team: 1 week to integrate threat intelligence
- Executives: 2 hours to understand risk-based approach

**Ongoing maintenance:**
- KEV catalog monitoring: 30 minutes daily (automated)
- Patch testing and deployment: 8-16 hours per month
- Process refinement: 4 hours per quarter
- Metrics review and reporting: 2 hours per month

**Total ongoing:** ~20-25 hours per month

### Return on Investment

**Immediate (Months 1-3):**
- Reduced patch backlog by focusing on exploited vulnerabilities
- Faster response to known exploited CVEs (7 days vs. 90 days)
- Clear prioritization reduces team decision paralysis

**Medium-term (Months 3-12):**
- 80% reduction in patch volume while improving coverage of real threats
- Reduced testing burden for low-risk patches
- Improved compliance audit results (demonstrable risk-based approach)
- Avoided ransomware incidents (estimated $2.73M average cost)

**Long-term (1+ years):**
- Mature vulnerability management process
- Predictable patch cadence reduces operational friction
- Better security posture with measurable metrics (MTTD, MTTR)
- Team confidence in patch decision-making

### When to skip this

**Scenario 1: Small environment (< 20 systems)**
You can manually review vulnerabilities and patch on a simple schedule. SSVC and automation add complexity without proportional benefit.

**Alternative:** Use CISA KEV catalog for prioritization, patch monthly for standard vulnerabilities.

**Scenario 2: Fully automated patching is acceptable**
If downtime doesn't matter (dev/test environments) or systems are stateless (immutable infrastructure), automatic patching is simpler.

**Alternative:** Enable automatic updates (Windows Update, `dnf-automatic`, `unattended-upgrades`)

**Scenario 3: Managed service handles patching**
If you use fully managed services (AWS RDS, Azure SQL, Google Cloud managed services), the provider handles patching.

**Alternative:** Monitor vendor patch schedules, ensure your SLA includes timely patching.

## Progressive Enhancement Path

**Month 1-2: Foundation**
- [ ] Implement CISA KEV catalog monitoring (automated daily check)
- [ ] Create emergency patch track (known exploited = 7-day timeline)
- [ ] Document current patch process and identify bottlenecks
- [ ] Establish baseline metrics (current MTTD, MTTR, patch coverage)

**Month 3-4: Optimization**
- [ ] Adopt SSVC decision framework (customize for your organization)
- [ ] Implement risk-tiered testing (emergency vs. standard)
- [ ] Deploy vulnerability scanning automation (continuous, not quarterly)
- [ ] Integrate patch management with ITSM (ServiceNow, Jira)

**Month 5-6: Advanced**
- [ ] Add EPSS scoring to prioritization logic
- [ ] Implement live patching for kernel updates (RHEL systems)
- [ ] Create compensating controls library for zero-days
- [ ] Build automated reporting dashboards (metrics, compliance, trends)

## Summary

Key takeaways:

1. **CVSS measures severity, not risk.** 56% of vulnerabilities score as High/Critical, but only 4% are exploited. Prioritize by exploitation status first, severity second.

2. **CISA KEV catalog is the authoritative source for exploited vulnerabilities.** Check it daily. Patch known exploited CVEs within 7 days.

3. **SSVC provides context-aware prioritization.** Five factors (exploitation, technical impact, automatable, mission prevalence, public well-being) lead to four outcomes (Track/Track\*/Attend/Act). Customize the decision tree for your organization.

4. **Testing and speed are tradeable.** Emergency patches get smoke tests and 48-hour deployment. Standard patches get full regression testing and 2-4 week deployment. Match testing rigor to actual risk.

5. **Compensating controls buy time when patches aren't available.** Network segmentation, access restrictions, monitoring, and service disablement mitigate zero-days while waiting for vendor patches.

**Start here:**
- Monitor CISA KEV catalog (automate the check)
- Create separate patch tracks for known exploited vs. standard vulnerabilities
- Measure MTTD and MTTR to identify bottlenecks in your process

**For deeper understanding:**
- Deep Water content covers enterprise patch orchestration, container patching, live patching implementation, and compliance integration
- External resources: CISA SSVC Guide (PDF), Red Hat Insights documentation, Microsoft WSUS best practices

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick wins
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Monitoring & Logging](../../monitoring-logging/mid-depth/index.md) - Detecting exploitation attempts
- [Incident Response](../../incident-response/mid-depth/index.md) - Zero-day emergency procedures
- [Backup & Recovery](../../backup-recovery/mid-depth/index.md) - Rollback strategies for failed patches

### Navigate
- [← Back to Operations Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
