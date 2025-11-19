---
title: "Threat Modeling"
phase: "01-discovery-planning"
topic: "threat-modeling"
depth: "deep-water"
reading_time: 50
prerequisites: ["concept-of-operations"]
related_topics: ["requirements-gathering", "scope-setting", "resource-identification"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Threat Modeling - Deep Water

Advanced threat analysis for high-risk systems.

## Attack Trees and Kill Chains

**Attack trees** visually represent how attackers achieve their goals.

```
Goal: Steal customer credit card data
├── OR: Compromise database
│   ├── AND: Exploit SQL injection
│   │   ├── Find injection point in search
│   │   └── Extract data via time-based blind SQLi
│   └── AND: Steal database credentials
│       ├── Phish database admin
│       └── Access database from compromised account
└── OR: Intercept during transmission
    ├── Man-in-the-middle attack (requires network access)
    └── Compromise payment processor API
```

Each AND node requires all child steps. Each OR node provides alternatives. This shows which attack paths are easiest (fewer AND steps) and where mitigations have most impact.

**Kill chains** map attack progression stages:
1. Reconnaissance (gather information about target)
2. Weaponization (prepare exploit)
3. Delivery (get exploit to target)
4. Exploitation (execute exploit)
5. Installation (establish persistence)
6. Command & Control (communicate with compromised system)
7. Actions on Objectives (achieve goal: steal data, etc.)

Breaking the chain at any point stops the attack. Early stages (reconnaissance, delivery) are easier to defend than later stages.

## Threat Actor Profiling

Different attackers have different capabilities and motivations:

**Script kiddies:**
- Skill: Low (use existing tools)
- Motivation: Fame, curiosity
- Resources: Minimal
- Defense: Basic security hygiene stops them

**Organized criminals:**
- Skill: Medium to high
- Motivation: Financial gain
- Resources: Moderate (can buy exploits, botnets)
- Defense: Defense in depth, monitoring for unusual patterns

**Nation states:**
- Skill: Very high (zero-day exploits, custom malware)
- Motivation: Espionage, sabotage
- Resources: Significant (time, money, patience)
- Defense: If you're the target, you need serious security investment

**Insider threats:**
- Skill: Varies (but has legitimate access)
- Motivation: Revenge, financial, coercion
- Resources: Insider knowledge, existing access
- Defense: Least privilege, segregation of duties, audit logs

Your threat model should specify which threat actors you're defending against. If you're not a defense contractor or bank, you probably don't need nation-state level defenses.

## DREAD Scoring for Risk Prioritization

DREAD is a more detailed risk scoring system:

- **Damage:** How bad would an attack be? (0-10)
- **Reproducibility:** How easy is it to reproduce the attack? (0-10)
- **Exploitability:** How much effort to launch the attack? (0-10)
- **Affected users:** How many people are impacted? (0-10)
- **Discoverability:** How easy is it to discover the vulnerability? (0-10)

**Risk Score = (D + R + E + A + D) / 5**

**Example - SQL Injection:**
- Damage: 10 (complete database compromise)
- Reproducibility: 10 (works every time)
- Exploitability: 5 (requires some SQL knowledge)
- Affected users: 10 (all users' data at risk)
- Discoverability: 8 (automated scanners find it)
- Risk Score: 8.6 / 10 (CRITICAL)

**Example - Timing attack on password comparison:**
- Damage: 8 (can guess passwords with enough attempts)
- Reproducibility: 7 (works but requires precise timing)
- Exploitability: 3 (requires sophisticated tools, statistics knowledge)
- Affected users: 10 (all users vulnerable)
- Discoverability: 2 (very subtle, rarely discovered)
- Risk Score: 6.0 / 10 (MEDIUM)

This helps justify security investments: "We're fixing the 8.6/10 risk before the 6.0/10 risk."

## Abuse Cases Alongside Use Cases

For every use case, write an abuse case showing how it could be misused.

**Use case:** User uploads profile picture
**Abuse cases:**
- Upload malware disguised as image file
- Upload extremely large file to exhaust storage
- Upload inappropriate/illegal content
- Upload file with embedded script (XSS in filename)
- Upload file to overwrite other users' pictures

For each abuse case, document mitigations:
- Validate file type (check magic bytes, not just extension)
- Limit file size (reject >5MB)
- Scan uploads with antivirus
- Sanitize filenames
- Store uploads in non-executable location
- Check authorization (can only upload to own profile)

## Privacy Threat Modeling (LINDDUN Framework)

For systems handling personal data, use LINDDUN:

**Linkability:** Can attacker link two items of interest?
- Example: Link anonymous survey responses to specific individuals
- Mitigation: Data minimization, anonymization, aggregation

**Identifiability:** Can attacker identify a user?
- Example: Re-identify "anonymized" data through quasi-identifiers
- Mitigation: K-anonymity, differential privacy

**Non-repudiation:** Can user deny doing something?
- Example: User can't deny sending a message (sometimes this is the threat)
- Mitigation: Plausible deniability features (in privacy-focused contexts)

**Detectability:** Can attacker detect existence of information?
- Example: Detect that user accessed specific sensitive resource
- Mitigation: Traffic analysis protection, dummy queries

**Disclosure of information:** Can attacker access personal information?
- Example: Data breach exposing user details
- Mitigation: Encryption, access controls, data minimization

**Unawareness:** Are users unaware of data collection/processing?
- Example: Hidden tracking without consent
- Mitigation: Transparency, clear privacy notices, consent mechanisms

**Non-compliance:** Does processing violate regulations?
- Example: GDPR violation, missing legal basis for processing
- Mitigation: Privacy by design, DPO review, compliance checks

## Supply Chain Attack Vectors

Your code is only part of the attack surface. Consider:

**Dependency vulnerabilities:**
- Outdated libraries with known CVEs
- Mitigation: Dependency scanning, automated updates, SCA tools

**Compromised dependencies:**
- Malicious code injected into legitimate package
- Mitigation: Pin versions, verify checksums, use private registries

**Build pipeline compromise:**
- Attacker modifies code during build
- Mitigation: Signed commits, reproducible builds, SLSA framework

**Infrastructure as code:**
- Misconfigurations in Terraform/CloudFormation
- Mitigation: Policy as code, automated security checks

**Third-party services:**
- Your app integrates with compromised service
- Mitigation: Validate all external inputs, least privilege API keys

**Development tools:**
- Compromised IDE plugin, malicious VS Code extension
- Mitigation: Vet tools, use official sources, network isolation

## Compliance-Specific Threats

Different regulations have specific threat models:

**HIPAA (healthcare):**
- Unauthorized access to PHI (Protected Health Information)
- Missing audit trails for access
- Inadequate encryption of PHI
- Business associate violations

**PCI-DSS (payment cards):**
- Storing prohibited data (CVV, track data)
- Inadequate network segmentation
- Missing encryption of cardholder data
- Insufficient access logging

**GDPR (privacy):**
- Lacking legal basis for processing
- Missing data subject rights (access, deletion, portability)
- Inadequate breach notification
- Unauthorized international data transfers

For each applicable regulation, map threats specific to non-compliance. These often have financial penalties attached.

## Automated Threat Modeling Tools Integration

Tools can help scale threat modeling:

**Microsoft Threat Modeling Tool:**
- Visual modeling of data flows
- Automatic threat generation based on STRIDE
- Mitigation recommendations

**OWASP Threat Dragon:**
- Open source threat modeling
- Diagram-based approach
- Export to reports

**IriusRisk:**
- Integrates with development workflows
- Maps threats to specific code components
- Tracks mitigation implementation

**ThreatSpec:**
- Annotations in source code
- Generate threat model from code comments
- Keeps threat model synchronized with code

These tools don't replace thinking, but they:
- Ensure consistent coverage
- Provide template threats
- Track mitigations over time
- Generate compliance documentation

Use tools to augment human analysis, not replace it.
