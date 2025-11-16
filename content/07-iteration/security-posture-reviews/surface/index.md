---
title: "Security Posture Reviews"
phase: "07-iteration"
topic: "security-posture-reviews"
depth: "surface"
reading_time: 10
prerequisites: ["deployment", "secure-coding-practices"]
related_topics: ["threat-modeling", "incident-response", "access-control"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-16"
---

# Security Posture Reviews

Your threat landscape changes faster than your code. New vulnerabilities get discovered. Attackers find new techniques. Your system grows and exposes new attack surfaces. What was secure six months ago might not be secure today.

A security posture review is a regular check-up: Are we still protected against the threats that matter?

## Why This Matters

You already did threat modeling during design. You implemented secure coding practices. You're running monitoring and logging. That's all necessary, but it's not sufficient.

**Things that change:**
- New CVEs (Common Vulnerabilities and Exposures) in your dependencies
- Your system adds new features (new attack surface)
- Attackers develop new techniques (what worked yesterday fails today)
- Team members leave (taking security knowledge with them)
- Compliance requirements change
- You realize assumptions you made during threat modeling were wrong

Security isn't a one-time thing. It's a continuous process.

## The Minimal Viable Security Review

If you do nothing else, do this monthly:

### 1. Check Dependencies for Known Vulnerabilities (15 minutes)

Run automated tools:
- **npm audit** (Node.js)
- **pip-audit** (Python)
- **bundle audit** (Ruby)
- **OWASP Dependency-Check** (Java)
- **cargo audit** (Rust)

**Look for**: Critical and high-severity vulnerabilities with available patches.

**Do**: Update vulnerable dependencies. If you can't update immediately, document why and set a deadline.

**YOLO escape hatch**: Use Dependabot, Renovate, or Snyk to automate this. They'll open PRs for you.

### 2. Review Access Controls (10 minutes)

**Questions to ask:**
- Who has production access? Should they still have it?
- Any former employees still in systems?
- Any shared credentials that should be rotated?
- Any API keys or tokens older than 90 days?

**Do**: Remove access that's no longer needed. Rotate old credentials.

**Common mistake**: People leave the company, but their accounts stay active for months.

### 3. Check for Unpatched Systems (10 minutes)

**Look at:**
- Operating system updates
- Database versions
- Web server versions
- Container base images
- Third-party services you depend on

**Do**: Schedule maintenance windows to apply patches. Critical security patches should go out within 30 days max.

**Trade-off**: Patching can break things. That's why you have staging environments and rollback procedures.

### 4. Review Recent Incidents and Alerts (10 minutes)

**Questions:**
- Did monitoring catch anything suspicious?
- Any failed login attempts?
- Unusual traffic patterns?
- Security tool alerts (if you have them)?

**Do**: Investigate anomalies. Most are false alarms. Some aren't.

**If something looks wrong**: Don't ignore it. Either confirm it's benign or escalate.

## What You're Looking For

**Known vulnerabilities**: Things that have CVE numbers and published exploits
**Configuration drift**: Settings that changed from secure defaults
**New attack surface**: Features you added that might be exploitable
**Broken security controls**: Monitoring that stopped working, auth that got misconfigured
**Outdated assumptions**: Threat model said "we'll never store PII" but now you do

## How Often?

**Minimum**: Monthly for critical systems
**Better**: Bi-weekly or with every sprint
**After major changes**: New features, architecture changes, big refactors
**After incidents**: Always review security after something goes wrong

**If you only have 30 minutes a month**: Do dependency scanning and access review. That catches most low-hanging fruit.

## Signs Your Security Posture Is Degrading

- Dependencies getting more out-of-date instead of less
- More people have production access than 6 months ago
- You can't remember the last time you rotated credentials
- Security alerts are ignored
- "We'll fix that next sprint" for security issues, then you don't
- Someone asks "who has access to X?" and nobody knows

## Common Excuses and Rebuttals

**"We don't have time for this"**
You have time to get breached and spend weeks in incident response?

**"We're too small to be a target"**
Automated scanners don't care about your size. They hit everything exposed to the internet.

**"We haven't been hacked yet"**
You probably have been and didn't notice. Most breaches take months to discover.

**"We'll do it after launch"**
When has "after launch" ever been less busy?

**"Our cloud provider handles security"**
They handle infrastructure security. Application security is your job. (Shared responsibility model)

## Quick Wins for YOLO Devs

Already shipped something and security was an afterthought? Start here:

1. **Enable automated dependency scanning** (GitHub/GitLab have this built-in)
2. **Set up basic monitoring alerts** (failed logins, error spikes)
3. **Remove default credentials** (admin/admin, root/password, API keys in examples)
4. **Enable HTTPS** (Let's Encrypt is free)
5. **Review who has production access** (probably too many people)

That's 2-3 hours of work that prevents 80% of obvious attacks.

## What Success Looks Like

- Known vulnerabilities get patched within 30 days
- No one has access they don't need
- Security issues don't accumulate in backlog forever
- Team can answer "who has access to X?" quickly
- You catch configuration drift before it causes incidents

## When to Escalate

You need help if:
- You found something actively being exploited
- Critical vulnerability with no patch available
- You don't understand a security alert
- Compliance audit is coming and you're not ready
- You're storing sensitive data and don't have encryption

Don't try to handle active breaches alone. Get help.

## Next Steps

- **Mid-Depth**: Structured review frameworks (CIS benchmarks, MITRE ATT&CK), security metrics, integrating reviews with development cycles
- **Deep Water**: Continuous security monitoring, adversarial simulation, security culture transformation

## Quick Checklist

Monthly security review:
- [ ] Run dependency vulnerability scan
- [ ] Review production access list
- [ ] Check for unpatched systems
- [ ] Review security alerts and anomalies
- [ ] Rotate credentials older than 90 days
- [ ] Document findings and set action items

**Time required**: 45-60 minutes/month
**Cost of skipping**: Potentially catastrophic

---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Retrospectives](../../retrospectives/surface/index.md) - Related iteration considerations
- [Feature Planning](../../feature-planning/surface/index.md) - Related iteration considerations

### Navigate
- [← Back to Iteration Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
