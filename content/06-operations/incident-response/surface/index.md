---
title: "Incident Response"
phase: "06-operations"
topic: "incident-response"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["monitoring-logging", "patch-management", "backup-recovery"]
personas: ["new-developer", "yolo-dev", "busy-developer"]
updated: "2025-11-16"
---

# Incident Response - Surface

At 2am on a Tuesday, your monitoring system wakes you up. Your app is down for 20% of users. You don't have a process for who does what, how to communicate with customers, or how to learn from this afterward. By the time you've figured out who to call, the outage has cost you three customers and your team's sleep.

Incident response is what separates a five-minute blip from a multi-hour disaster. The difference isn't just technical skill—it's having a plan before things go wrong.

## What This Is (And Isn't)

**What it is:**
- A structured process for coordinating response when systems fail
- Roles that define who makes decisions, who fixes things, and who communicates
- A framework for learning from failures without blaming people
- Tools for measuring acceptable reliability and when to pause launches

**What it isn't:**
- Heroic firefighting by your most technical person
- A document you write and never update
- Punishment for whoever touched the system last
- Something only enterprise companies need

## The Core Concept

When your service goes down, the natural instinct is to get everyone on a call and start debugging. This fails at scale. Too many people talking means no one's coordinating. The most technical person gets stuck explaining things instead of fixing them. Status updates to customers get forgotten until someone asks "did we tell people?"

Incident response structures chaos. Someone coordinates (the Incident Commander) without getting pulled into debugging. Someone documents what's happening (the Scribe) so you remember what you tried when writing the postmortem. Subject Matter Experts focus entirely on fixing the problem. Everyone knows their job.

This isn't bureaucracy—it's efficiency. The same way an emergency room has triage nurses and attending physicians, incident response separates coordination from execution. When everyone knows their role, incidents get resolved faster with less confusion.

## Why This Matters

Real impact in concrete terms:

**Without this:**
- Incidents take 3x longer because no one's coordinating
- Your best engineer gets burned out handling everything alone
- You make the same mistakes repeatedly because no one documented what happened
- Customers leave because they don't know if you even noticed the problem
- Product launches get derailed by arguments about "is this stable enough?"

**With this:**
- Clear roles mean faster resolution—IC coordinates while SMEs fix
- Blameless postmortems turn incidents into learning opportunities
- Error budgets give you data-driven answers to "should we launch or stabilize?"
- Team members share on-call burden instead of one person carrying everything
- Customers trust you because you communicate proactively during outages

## Basic Pattern

The simplest incident response structure that works:

**Severity Classification:**
```
SEV-1 (Critical): Service down for all customers
→ Page everyone immediately, public notification required

SEV-2 (Major): Service down for subset of customers
→ Page on-call team, notify internally

SEV-3 (Stability): Degraded performance, small user impact
→ High priority during business hours

SEV-4 (Minor): Performance issues, no customer impact
→ Standard priority ticket

SEV-5 (Cosmetic): UI bugs, minor issues
→ Backlog
```

**What this does:**
- Prevents paging the whole team at 3am for minor issues
- Gives clear guidance on response urgency
- Sets expectations for stakeholder communication
- If you're unsure between two levels, assume the higher severity

**Basic Incident Flow:**
1. **Detect:** Monitoring alerts on-call person
2. **Assess:** On-call determines severity (SEV-1 through SEV-5)
3. **Coordinate:** Incident Commander (IC) leads response, doesn't debug
4. **Fix:** Subject Matter Experts (SMEs) troubleshoot and resolve
5. **Document:** Scribe records timeline and decisions
6. **Communicate:** IC updates stakeholders on status
7. **Learn:** Team conducts blameless postmortem afterward

## Common Mistakes (And How to Avoid Them)

### 1. Incident Commander Tries to Debug
**What happens:** The person coordinating the response gets pulled into technical troubleshooting, and coordination falls apart. No one's making decisions or communicating status.

**Why it happens:** You assume the IC needs to be the most technical person, or they see a problem they know how to fix.

**How to prevent it:** Separate roles clearly. IC coordinates and makes decisions. SMEs do the technical work. If IC knows the fix, they delegate it to someone else while continuing to coordinate.

### 2. No Clear Ownership
**What happens:** Three people are debugging the same thing. Critical tasks get missed because everyone assumes someone else is handling it.

**Why it happens:** No one explicitly assigns tasks during the incident.

**How to prevent it:** IC assigns specific tasks to specific people: "Alice, check database connections. Bob, review recent deploys. Report back in 10 minutes."

### 3. Skipping the Postmortem
**What happens:** The same incident happens again next month because you never figured out the root cause or implemented fixes.

**Why it happens:** Team is tired after the incident and just wants to move on. Writing a postmortem feels like extra work.

**How to prevent it:** Make postmortems required for any incident that consumed significant error budget (more on that in a second) or required on-call response. Schedule the postmortem meeting within a week while details are fresh.

## Quick Wins

**This week:**
- Define severity levels (SEV-1 through SEV-5) for your service with specific criteria
- Document who to page for each severity level
- Create a shared document where anyone can record incident timeline in real-time

**This month:**
- Calculate your service's error budget: if your SLA is 99.9% uptime, you have 43 minutes of allowed downtime per month
- Conduct a blameless postmortem for your next incident (even a small one) focused on system improvements, not individual blame
- Set up a rotation so on-call duty is shared across the team

**This quarter:**
- Establish an error budget policy: when budget is exhausted, freeze non-critical launches until stability improves
- Train multiple people as Incident Commanders—don't rely on one person
- Link runbooks directly to your monitoring alerts so responders know what to do

## Red Flags

You have a problem if:
- The same person handles every incident (burnout waiting to happen)
- Incidents take longer than 30 minutes to even start coordinating (no clear process)
- You can't remember what you tried during the last incident (no documentation)
- Product and engineering argue about every launch (no error budget framework)
- People are afraid to report issues because they'll get blamed (toxic culture)
- Your monitoring alerts page people, but there's no runbook explaining what to do

## What Success Looks Like

You know incident response is working when:

Incidents resolve faster because everyone knows their role. The IC coordinates without getting stuck debugging. SMEs focus on fixing the problem without worrying about status updates. The Scribe captures what happened so postmortems have real data.

Your error budget gives you objective answers to "can we launch this feature?" When you're under budget, launches continue. When budget is exhausted, the team naturally focuses on reliability work without needing management to intervene.

Blameless postmortems turn incidents into system improvements. Instead of "who broke it," you ask "what conditions allowed this to break?" Action items have owners and target dates. You share learnings across the team so everyone gets smarter.

On-call burden is distributed. People serve once a month or less, not every week. Alert fatigue decreases because you tune thresholds and automate responses. Engineers feel supported, not burned out.

## Next Steps

Start simple. Pick severity levels and document who to page. Next incident, assign an Incident Commander (even if it's just you) and a Scribe (even if they just take notes in Slack). Afterward, schedule 30 minutes for a blameless postmortem focused on one question: "What can we change so this doesn't happen again?"

For systematic implementation of incident command structure, on-call rotations, and runbook development, see the mid-depth guide.

For advanced topics like chaos engineering, error budget policies, and building postmortem culture across organizations, see the deep-water guide.

---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Monitoring & Logging](../../monitoring-logging/surface/index.md) - Related operations considerations
- [Patch Management](../../patch-management/surface/index.md) - Related operations considerations
- [Backup & Recovery](../../backup-recovery/surface/index.md) - Related operations considerations

### Navigate
- [← Back to Operations Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
