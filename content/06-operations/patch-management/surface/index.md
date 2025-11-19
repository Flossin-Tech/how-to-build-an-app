---
title: "Patch Management"
phase: "06-operations"
topic: "patch-management"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["monitoring-logging", "incident-response", "backup-recovery"]
personas: ["new-developer", "yolo-dev", "busy-developer"]
updated: "2025-11-16"
---

# Patch Management - Surface

Ransomware gangs don't exploit every vulnerability—they target the ones you haven't patched yet. The Medusa ransomware group waited two months after patches were available, knowing many organizations wouldn't have applied them. They were right. Average recovery cost when this happens: $2.73 million.

Patch management is how you close the door before attackers walk through it. The problem isn't having too many vulnerabilities to fix—it's knowing which ones matter.

## What This Is (And Isn't)

**What it is:**
- Updating software to fix security bugs that attackers actively exploit
- A risk-based decision system: what to patch now vs. what to patch later
- The difference between a 2-day fix and a 2-month recovery

**What it isn't:**
- Patching every vulnerability the moment it's discovered (that causes its own problems)
- Something you can skip because you have antivirus (compensating controls don't replace patches)
- A purely technical problem (it's a business decision about acceptable risk)

## The Core Concept

Here's the reality: security researchers discover roughly 130 new vulnerabilities every single day. Nobody can patch that fast. Trying to patch everything immediately breaks systems and burns out teams.

The good news? Only about 4% of all vulnerabilities are actively exploited by attackers in real-world attacks. The rest are theoretical—possible but not happening.

The U.S. Cybersecurity and Infrastructure Security Agency (CISA) maintains a public catalog of Known Exploited Vulnerabilities. This is the 4%. These are the CVEs (Common Vulnerabilities and Exposures) that attackers actually use. Start there.

## Why This Matters

Real impact in concrete terms:

**Without patch management:**
- Ransomware groups exploit known vulnerabilities in your systems
- 5,600+ organizations got ransomed in 2024 alone
- Average recovery: $2.73 million (up from $1.8M the year before)
- Attackers now move from disclosure to exploitation in 5.4 days on average

**With patch management:**
- You close security holes before attackers find them
- Critical systems get patches within days, not months
- You know what's urgent (exploited) vs. what can wait (theoretical)
- Downtime is planned, not a surprise at 3am

## Basic Pattern

The simplest approach that works:

**Three-tier prioritization:**

1. **Known Exploited (patch immediately)**
   - Check CISA's KEV catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
   - If vulnerability is listed, patch it fast (days, not weeks)
   - These are confirmed to be used in real attacks

2. **Critical Systems (patch on schedule)**
   - Internet-facing systems (websites, APIs, remote access)
   - Systems handling sensitive data (customer info, payments, health records)
   - Patch within 2-4 weeks after testing

3. **Everything Else (standard cycle)**
   - Internal systems, development environments, non-critical apps
   - Patch quarterly or when convenient
   - Test thoroughly before deploying

**Example workflow:**

```
1. New security patch announced
   ↓
2. Check: Is this vulnerability in the KEV catalog?
   ↓
   YES → Fast track (1-2 days of testing, deploy)
   NO → Check: Is this in a critical system?
        ↓
        YES → Standard track (2-4 weeks testing, deploy)
        NO → Extended track (next quarterly patch cycle)
```

**What this does:**
- Focuses limited time on the vulnerabilities that actually matter
- Prevents the "patch everything immediately" panic that breaks systems
- Allows testing for non-urgent patches so you don't cause regressions
- Balances security risk with operational stability

## Common Mistakes (And How to Avoid Them)

### 1. Patching by Severity Score Alone
**What happens:** You patch a "Critical" vulnerability that's never been exploited, while ignoring an "Important" one that ransomware gangs are actively using.

**Why it happens:** CVSS severity scores measure worst-case impact, not real-world risk. 56% of vulnerabilities score as High or Critical, but only 4% are exploited.

**How to prevent it:** Use exploitation status as your primary filter. The CISA KEV catalog tells you what's actually being attacked. Severity scores are secondary.

### 2. No Testing Before Production
**What happens:** You patch immediately to close a security hole, but the patch breaks your application. Now you have unplanned downtime instead of just a vulnerability.

**Why it happens:** Patches sometimes contain bugs or break compatibility with your specific configuration.

**How to prevent it:** Different urgency levels need different testing depths. Known exploited vulnerabilities get quick testing (1-2 days). Standard patches get full testing (2-4 weeks). Match your testing to the actual risk.

### 3. Ignoring End-of-Life Systems
**What happens:** You have a Windows Server 2012 box that "we'll upgrade eventually." Three years later it's still running, accumulating vulnerabilities, and becomes the entry point for an attack.

**Why it happens:** Upgrade projects get delayed while security holes pile up.

**How to prevent it:** If you can't patch an end-of-life system, isolate it. Network segmentation, restricted access, and monitoring can reduce risk until you can replace it. Don't let "eventually upgrade" become "never upgrade."

## Quick Wins

**This week:**
- Subscribe to CISA KEV catalog updates (email or RSS)
- Identify your 5 most critical systems (internet-facing or handling sensitive data)
- Check if those systems have pending security patches

**This month:**
- Create a simple patch tracking spreadsheet: System Name | Current Patch Level | Last Patched Date | Next Patch Window
- Set up a monthly patch cycle for non-critical systems
- Document your rollback procedure (how to undo a patch if it breaks something)

**This quarter:**
- Establish a "known exploited = urgent" policy with your team
- Test your patch deployment process on a non-critical system
- Build a test environment that mirrors production for patch validation

## Red Flags

You have a problem if:
- You can't name your last patch deployment date
- You're running systems that vendors stopped supporting years ago
- Your "patch testing" takes longer than 6 weeks
- You don't know which systems are internet-facing
- Security patches sit in a queue while you wait for "the right time"
- You've never rolled back a bad patch (meaning you've never tested rollback)

## What Success Looks Like

You're doing patch management right when:
- Known exploited vulnerabilities get patched within days of announcement
- Your team knows which systems are critical and which can wait
- Patch deployment rarely causes surprises or unplanned downtime
- You have metrics: "We patched 94% of KEV vulnerabilities within 2 weeks"
- Operations and security teams agree on patching priorities

You'll notice: fewer emergency "drop everything and patch" incidents. Attackers scanning for vulnerable systems don't find yours. Audit findings focus on process improvements, not critical unpatched systems.

## Next Steps

Start with CISA's Known Exploited Vulnerabilities catalog. That's your priority list—the 4% that actually matters. If you're running systems with vulnerabilities on that list, those are your first patches.

For the rest, build a schedule. Internet-facing systems get monthly patches. Internal systems get quarterly patches. Test everything before production, but match your testing time to the actual risk level.

The mid-depth guide covers how to build a complete patch management process: CVSS vs. SSVC frameworks, patch cadence planning, testing strategies, and compensating controls when patches aren't available.

The deep-water guide addresses enterprise-scale challenges: vulnerability scanning automation, container image patching, live patching for high-availability systems, and compliance requirements (PCI-DSS, HIPAA, SOC 2).
