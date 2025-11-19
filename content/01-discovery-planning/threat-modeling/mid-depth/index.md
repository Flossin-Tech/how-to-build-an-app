---
title: "Threat Modeling"
phase: "01-discovery-planning"
topic: "threat-modeling"
depth: "mid-depth"
reading_time: 25
prerequisites: ["concept-of-operations"]
related_topics: ["requirements-gathering", "scope-setting"]
personas: ["generalist-leveling-up", "busy-developer", "specialist-expanding"]
updated: "2025-11-15"
---

# Threat Modeling - Mid-Depth

Systematic approach to identifying and prioritizing security risks.

## STRIDE Framework

STRIDE is a mnemonic for six threat categories. Go through each one for your system:

**Spoofing:** Can someone pretend to be someone else?
- Example: Attacker steals user's session token, impersonates them
- Mitigation: Strong authentication, token expiration, device fingerprinting

**Tampering:** Can someone modify data they shouldn't?
- Example: User modifies price in checkout request
- Mitigation: Server-side validation, digital signatures, integrity checks

**Repudiation:** Can someone deny doing something they did?
- Example: User claims they never approved a transaction
- Mitigation: Audit logs, non-repudiation signatures, email confirmations

**Information Disclosure:** Can someone access data they shouldn't?
- Example: API returns other users' data without checking permissions
- Mitigation: Authorization checks, encryption, data minimization

**Denial of Service:** Can someone make the system unavailable?
- Example: Attacker floods login endpoint with requests
- Mitigation: Rate limiting, auto-scaling, circuit breakers

**Elevation of Privilege:** Can someone gain higher access than allowed?
- Example: Regular user accesses admin functions
- Mitigation: Role-based access control, principle of least privilege

## Identify Trust Boundaries in Your Architecture

A trust boundary is where data moves from a trusted zone to less-trusted zone (or vice versa).

**Common boundaries:**
- User's browser → Your server (don't trust anything from browser)
- Your server → Database (trust your own server, but still validate)
- Your server → Third-party API (don't trust external responses)
- Authenticated user → Unauthenticated public (different permissions)

At each boundary, ask:
- What data crosses this boundary?
- What validation/sanitization happens?
- What authentication/authorization is required?

Most security bugs happen at trust boundaries where validation is missing.

## Rate Threats by Likelihood × Impact

Not all threats are equally important. Prioritize using a simple matrix:

**Impact scale:**
- Critical: Complete system compromise, mass data breach
- High: Significant data loss, extended downtime
- Medium: Limited data exposure, degraded service
- Low: Minimal impact, easily recoverable

**Likelihood scale:**
- High: Easy to exploit, publicly known techniques
- Medium: Requires some skill, tools available
- Low: Difficult to exploit, requires insider access

**Priority = Impact × Likelihood**

Focus on High Impact + High Likelihood first. You can't fix everything, so fix the things that are both likely and damaging.

## Define Mitigations for Top 5-10 Threats

For each high-priority threat, document:

**Threat:** SQL injection in user search
**How it works:** Attacker enters `'; DROP TABLE users; --` in search box
**Impact:** Database compromise, data loss
**Likelihood:** High (automated scanners look for this)
**Mitigation:** Use parameterized queries, never concatenate user input into SQL
**Verification:** Add test cases with injection strings, run SAST scanner

## Common Pitfall: Only Thinking About External Attackers

Don't forget about:
- **Malicious insiders:** Employees with legitimate access
- **Curious users:** People poking around to see what they can access
- **Compromised accounts:** Legitimate user whose credentials got stolen
- **Supply chain:** Vulnerabilities in your dependencies

Your threat model should include "authenticated user tries to access other users' data" not just "external hacker breaks in."

## Consider Data Classification

Not everything needs Fort Knox protection. Classify your data:

**Public:** Can be freely shared (marketing content, public docs)
**Internal:** Should stay within organization (internal tools, non-sensitive business data)
**Confidential:** Sensitive business data (customer lists, financial reports)
**Restricted:** Highly sensitive (passwords, payment data, health records, PII)

Apply security controls proportional to classification:
- Public: Basic integrity checks
- Internal: Authentication required
- Confidential: Authorization + encryption in transit
- Restricted: Encryption at rest + in transit, audit logging, strict access controls

Don't waste effort encrypting public marketing content, but absolutely encrypt payment data.
