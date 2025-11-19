---
title: "Backup & Recovery"
phase: "06-operations"
topic: "backup-recovery"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["monitoring-logging", "incident-response", "patch-management"]
personas: ["new-developer", "yolo-dev", "busy-developer"]
updated: "2025-11-16"
---

# Backup & Recovery - Surface

Your database crashes at 3 PM. Your last backup ran at 8 AM. You've lost 11 hours of customer orders, and nobody's sure if the backup actually works because it's never been tested.

This happens more often than anyone admits. Half of companies with disaster recovery plans never test them. That's like buying fire insurance and never checking if the fire department has your address.

## What This Is (And Isn't)

**What it is:**
- A system for copying your data so you can recover from disasters
- Insurance against hardware failure, software bugs, ransomware, and human error
- Both the backup process and the recovery process (one without the other is worthless)

**What it isn't:**
- A replacement for version control (use Git for code)
- Something you configure once and forget
- Reliable if you've never tested a restore

## The Core Concept

Every system that stores data eventually loses that data. Disks fail. Bugs delete records. Ransomware encrypts databases. Someone runs `DELETE FROM users` without a `WHERE` clause.

The question isn't "Will we lose data?" It's "When we lose data, how far back do we need to recover?"

Backups give you time travel. Database crashed Tuesday at 3 PM? Restore Monday's backup and manually re-enter Tuesday's data. Not great, but better than starting over.

The catch: backups only work if you can actually restore from them. An untested backup is worse than no backup at all because it creates false confidence. You think you're protected, so you skip other precautions, then discover during a crisis that your backups are corrupted.

## Why This Matters

Real impact in concrete terms:

**Without this:**
- Ransomware encrypts your production database and your backups (89% of ransomware victims had their backups targeted)
- Hardware failure destroys the only copy of customer data
- You discover during a crisis that backups were never actually running
- Six months of work vanishes because nobody tested the restore process

**With this:**
- Database crashes? Restore from yesterday's backup. You lose one day of data, not everything.
- Ransomware hits? Restore from the offline backup it couldn't reach.
- Someone deletes production data? Recover to five minutes before the mistake.
- Confidence that systems can actually be recovered, not just hope.

## Basic Pattern: The 3-2-1-1-0 Rule

This is the modern backup standard. It evolved from the older 3-2-1 rule to address ransomware and untested backups.

**The rule:**
- **3 copies** of your data (production + 2 backups)
- **2 different media types** (like disk + cloud, or disk + tape)
- **1 copy offsite** (different building, different city)
- **1 copy offline or immutable** (can't be deleted, even by ransomware)
- **0 errors** when you test restoration

**Example for a small web application:**

```yaml
# Weekly backup schedule
production_database:
  location: Main server in office

backup_copy_1:
  location: Local NAS drive (same office, different hardware)
  media: Disk storage
  frequency: Nightly at 2 AM

backup_copy_2:
  location: AWS S3 (offsite, different region)
  media: Cloud object storage
  frequency: Daily sync from NAS
  immutable: 30-day retention lock (can't delete for 30 days)

backup_copy_3:
  location: External hard drive, disconnected after backup
  media: Physical drive stored in bank safe deposit box
  frequency: Weekly, rotated on Monday mornings

verification:
  test_restore: Monthly - restore random database to test environment
  full_test: Quarterly - complete application recovery drill
```

**What this protects against:**
- Local hardware failure: NAS backup available
- Office fire/disaster: Cloud and external drive survive
- Ransomware: Offline external drive untouchable, cloud copy immutable
- Backup corruption: Monthly testing catches problems before you need it

## Common Mistakes (And How to Avoid Them)

### 1. Never Testing Backups
**What happens:** You discover backups don't work during an actual disaster.
**Why it happens:** Testing feels risky ("What if I break something?") and time-consuming.
**How to prevent it:** Start tiny. Once a month, restore a single file or database table to a test environment. Takes 15 minutes. Proves the backup actually works.

### 2. Storing Backup on Same System as Production
**What happens:** Ransomware encrypts production and backup simultaneously. Hardware failure kills both.
**Why it happens:** It's simpler and cheaper to backup to the same machine.
**How to prevent it:** At minimum, backup to a different physical device. Ideally, use the 3-2-1-1-0 rule above.

### 3. No Idea What RTO/RPO Means
**What happens:** You promise "four-hour recovery" but your backup takes 12 hours to restore.
**Why it happens:** Nobody asked business stakeholders how much downtime is acceptable.
**How to prevent it:**
- **RTO (Recovery Time Objective):** How long can you be down? "We can restore the database in 2 hours."
- **RPO (Recovery Point Objective):** How much data can you lose? "Daily backups mean we might lose 24 hours of transactions."

These are business decisions, not technical ones. Ask: "How much does one hour of downtime cost?" and "What's the cost of losing one day of data?" Then design backups to meet those requirements.

## Quick Wins

**This week:**
- Test restoring a single file from your current backup system (if it fails, you just learned you have no backups)
- Document where backups are stored and how to access them

**This month:**
- Add one offsite backup copy (cloud storage or external drive)
- Schedule monthly restore testing on the calendar (make it recurring, assign to someone)

**This quarter:**
- Implement the full 3-2-1-1-0 rule
- Document recovery procedures so anyone on the team can restore, not just one person

## Red Flags

You have a problem if:
- You can't remember the last time someone tested a restore
- All backups are in the same physical location as production
- The backup system says "Success" but nobody's ever verified
- Only one person knows how to recover from backup
- You don't know your RTO or RPO numbers
- Backups are connected to the network 24/7 (ransomware's favorite target)

## What Success Looks Like

When backups are done right:

Your junior developer can follow the documented procedure to restore a database to yesterday's state in under an hour. They've done it in practice, during a quarterly drill, so they're confident.

Your backups include three copies: local NAS for fast recovery, cloud storage that can't be deleted for 30 days (immutable), and an external drive that gets disconnected and stored offsite weekly (offline).

Every month, automated alerts notify the team if the test restore fails. Every quarter, the whole team participates in a recovery drill.

When ransomware hits your production database, you're annoyed but not panicked. You shut down infected systems, restore from the offline backup to a clean environment, and resume operations. You lose one day of data (not ideal) but the company survives.

## Next Steps

1. **Test your current backup today.** Restore a single file. If it works, great. If it doesn't, now you know.

2. **Document your RTO/RPO.** Ask stakeholders: "How long can we be down?" and "How much data can we afford to lose?" Use those answers to design your backup frequency.

3. **Add one offline or immutable copy.** Cloud storage with retention locks or a disconnected external drive. This is your ransomware insurance.

For systematic backup implementation patterns and testing strategies, see **[Mid-Depth →](../mid-depth/)**.

For advanced topics like point-in-time recovery and chaos testing, see **[Deep Water →](../deep-water/)**.
