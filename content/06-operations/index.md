# Phase 6: Operations

Keeping it running and handling when things go wrong.

Your code is in production. Users are depending on it. Now the real work begins—keeping it running, knowing when something breaks, responding when things go wrong, and making sure you can recover from disasters.

Operations is often invisible when it's working well. No one notices great uptime. But when things break—and they will—the difference between good ops and bad ops is whether you find out from your monitoring or from angry users on Twitter.

This phase is about observability (knowing what's happening), resilience (handling failure gracefully), and preparedness (having a plan when the worst happens). It's about making sure security patches get applied before exploits hit, backups exist before you need them, and your team knows what to do during an outage.

## Key Questions This Phase Answers

- How do we know when something is broken, slow, or about to fail?
- What do we do when there's an incident, and who's responsible for what?
- How do we keep systems patched and secure without breaking things?
- How do we scale up when traffic spikes or scale down to save money?
- Can we recover if the database gets corrupted or the data center catches fire?

## Topics

| Topic | Surface (5-10 min) | Mid-Depth (15-30 min) | Deep Water (30-60+ min) |
|-------|-------------------|---------------------|---------------------|
| Monitoring & Logging | [Surface](monitoring-logging/surface/index.md) | [Mid-Depth](monitoring-logging/mid-depth/index.md) | [Deep Water](monitoring-logging/deep-water/index.md) |
| Incident Response | [Surface](incident-response/surface/index.md) | [Mid-Depth](incident-response/mid-depth/index.md) | [Deep Water](incident-response/deep-water/index.md) |
| Patch Management | [Surface](patch-management/surface/index.md) | [Mid-Depth](patch-management/mid-depth/index.md) | [Deep Water](patch-management/deep-water/index.md) |
| Backup & Recovery | [Surface](backup-recovery/surface/index.md) | [Mid-Depth](backup-recovery/mid-depth/index.md) | [Deep Water](backup-recovery/deep-water/index.md) |

## What Comes Next

Operations gives you data about how your system is actually performing in the real world. That data tells you what to fix, what to improve, and what to build next. That's **[Iteration](../07-iteration/index.md)**—where you learn from what happened and make the system better.
