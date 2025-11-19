---
title: "Incident Response - Mid-Depth"
phase: "06-operations"
topic: "incident-response"
depth: "mid-depth"
reading_time: 28
prerequisites: ["monitoring-logging-surface"]
related_topics: ["monitoring-logging", "patch-management", "backup-recovery"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-16"
---

# Incident Response - Mid-Depth

You know incidents happen. You've maybe handled a few. Now you need a real framework—one that works when you're woken up at 3am, when customers are screaming, when nothing makes sense.

The difference between chaos and coordinated response isn't heroics. It's structure.

## When Surface Level Isn't Enough

You've shipped the basic version. Now you're hitting real problems:

- Your team pages everyone for every issue, burning through goodwill and sleep
- Postmortems devolve into blame sessions where people hide information
- The same incidents keep happening because action items never get done
- You can't decide whether to launch features or fix reliability
- Your runbooks are stale documentation nobody trusts

This guide covers the practical patterns that work when you're past "just make it work" and need sustainable incident response.

## Core Patterns

### Pattern 1: Incident Command System (ICS)

**When to use this:**
- Incidents involving more than 2-3 people
- Any SEV-1 or SEV-2 incident
- When coordination gets messy or unclear who's in charge

**How it works:**

The Incident Command System came from fighting California wildfires in the 1970s. Turns out the same structure that coordinates fire crews across multiple agencies works for software incidents too.

The core principle: one person coordinates, others execute. No one does both.

**Implementation:**

```yaml
# Incident roles structure
roles:
  incident_commander:
    responsibility: "Coordinate response, make decisions, delegate"
    does_not: "Debug code, fix servers, write queries"
    span_of_control: "3-7 people (5 ideal)"

  deputy_incident_commander:
    responsibility: "Assist IC, take over if needed, often acts as Scribe"
    does_not: "Override IC decisions during incident"

  scribe:
    responsibility: "Document timeline, decisions, actions in real-time"
    output: "Timeline for postmortem, recorded decisions"

  subject_matter_experts:
    responsibility: "Technical diagnosis and remediation"
    reports_to: "Incident Commander"
    does_not: "Join call unless directly needed"
```

**What's happening:**

1. **IC declares incident**: Someone (often on-call) declares an incident and takes IC role or hands it off
2. **IC assesses situation**: What's broken? How many customers affected? What severity?
3. **IC brings in SMEs**: "I need database expert" or "I need frontend engineer"
4. **SMEs report findings**: They tell IC what they're seeing, IC decides next steps
5. **IC makes decisions**: "Let's roll back" or "Try restarting these services first"
6. **Scribe documents everything**: Timeline captures what happened when for postmortem
7. **IC dismisses people**: When your work is done, you leave the call (don't waste people's time)

**Trade-offs:**

- **Pro:** Clear accountability—no "too many cooks" problem
- **Pro:** Scales to large incidents without chaos
- **Pro:** IC can think strategically instead of getting lost in technical weeds
- **Con:** Requires discipline not to jump in and fix things yourself
- **Con:** Small teams might feel this is overkill for minor incidents
- **When it's worth it:** Any incident where coordination matters more than individual heroics

### Pattern 2: Error Budget Policy

**When to use this:**
- You have defined SLOs (Service Level Objectives)
- Product and engineering argue about launch velocity vs. stability
- You need objective criteria for "reliable enough"

**How it works:**

Error budgets turn reliability from philosophy into math. Your SLO is your promise. The gap between promise and perfection is your budget.

```python
# Error budget calculation
def calculate_error_budget(slo_target, time_period_minutes):
    """
    SLO of 99.99% means you can be down 0.01% of the time.
    That's your error budget.
    """
    allowed_downtime_pct = 1.0 - slo_target
    error_budget_minutes = time_period_minutes * allowed_downtime_pct
    return error_budget_minutes

# Example: 99.99% SLO over 4 weeks
slo = 0.9999  # 99.99%
four_weeks_minutes = 28 * 24 * 60  # 40,320 minutes
budget = calculate_error_budget(slo, four_weeks_minutes)
print(f"Error budget: {budget:.2f} minutes per 4 weeks")  # 4.03 minutes

# When budget depletes, freeze releases
current_downtime_minutes = 3.5
remaining_budget = budget - current_downtime_minutes
budget_consumed_pct = (current_downtime_minutes / budget) * 100

if budget_consumed_pct > 100:
    print("RELEASE FREEZE: Error budget exhausted")
    print("Focus: Reliability work only")
elif budget_consumed_pct > 80:
    print("WARNING: Approaching budget limit")
    print("Consider: Stability work before next launch")
else:
    print(f"OK to launch: {remaining_budget:.2f} minutes remaining")
```

**What's happening:**
1. Product Management sets target SLO (e.g., 99.99% uptime)
2. The difference between target and 100% is your "budget" for downtime
3. Every incident consumes part of this budget
4. When budget runs out, teams pause feature launches
5. Teams invest in reliability work to replenish the budget

**Trade-offs:**
- **Pro:** Eliminates political arguments about launches (data decides)
- **Pro:** Product teams naturally self-regulate as budget depletes
- **Pro:** Creates shared ownership of reliability between product and engineering
- **Con:** Requires accurate monitoring to track budget consumption
- **Con:** Needs buy-in from product leadership or it becomes ignored
- **When it's worth it:** When you have clear SLOs and want to balance velocity with reliability

### Pattern 3: Blameless Postmortem Process

**When to use this:**
- After any significant incident
- When >20% of error budget consumed in single incident
- For near-misses that could have been catastrophic

**How it works:**

Blameless postmortems treat human error as a symptom of systemic problems, not evidence of individual incompetence. People make mistakes when systems make mistakes easy.

**Implementation:**

```markdown
# Postmortem Template

## Incident Summary
**Date:** 2025-11-15
**Duration:** 14:23 UTC - 15:47 UTC (84 minutes)
**Severity:** SEV-2
**Impact:** 15% of users unable to login
**Error Budget Consumed:** 1.2 minutes (30% of monthly budget)

## Timeline (Forward-Looking)
- 14:18 - Deploy v2.3.4 begins
- 14:23 - Auth service response time increases (p99: 2s → 8s)
- 14:25 - First customer reports unable to login
- 14:27 - Monitoring alert fires: auth_latency_high
- 14:29 - Engineer A declares SEV-2, takes IC role
- 14:32 - Database SME joins, identifies connection pool exhaustion
- 14:38 - Decision: Roll back deploy vs. increase pool size
- 14:40 - Rollback initiated (IC decision)
- 14:47 - Rollback complete, latency returns to normal
- 15:05 - Monitoring confirms full recovery
- 15:47 - Incident closed

## What Happened (Systems Focus)
The new auth code opened 50 DB connections per request instead of reusing
a pool. Under normal load, this exhausted the database connection limit
within 5 minutes of deploy.

## Contributing Factors (Not "Who Screwed Up")
1. **Code review missed connection handling**: No reviewer had deep DB expertise
2. **Load testing didn't catch it**: Staging environment capped at 10 concurrent users
3. **Connection pool monitoring absent**: We tracked query time but not connection count
4. **Deploy happened during peak hours**: Amplified impact

## What Went Well
- Monitoring detected the issue within 2 minutes
- IC made rollback decision quickly (didn't chase other theories)
- Clear communication to customer support team

## Action Items (Specific, Owned, Dated)
- [ ] Add connection pool metrics to monitoring dashboard (Engineer B, Nov 18)
- [ ] Add DB connection count check to load tests (QA Lead, Nov 20)
- [ ] Require DB expertise on reviews for auth changes (Team Lead, Nov 17)
- [ ] Document rollback procedure in runbook (Engineer A, Nov 17)
- [ ] Schedule deploys outside peak hours (Product, ongoing)

## Questions We Asked (Learning-Oriented)
✅ "What information did the responder have at decision time?"
✅ "What systemic factors allowed this to reach production?"
✅ "How can we detect this class of problem earlier?"

❌ NOT asked: "Why didn't you check connections?" (hindsight bias)
❌ NOT asked: "Who approved this deploy?" (blame focus)
```

**What's happening:**
- Timeline constructed forward (what was known when), not backward (why didn't you know)
- Focus on system gaps, not individual mistakes
- Action items are specific with owners and dates
- Questioning style encourages honesty

**Trade-offs:**
- **Pro:** People report incidents honestly when they don't fear punishment
- **Pro:** Root causes surface that blame culture would hide
- **Pro:** Action items address systems, preventing entire classes of incidents
- **Con:** Requires strong cultural commitment from leadership
- **Con:** Must still distinguish honest errors from negligence (that's "just culture")
- **When it's worth it:** Always. Blame culture produces strictly worse outcomes.

### Pattern 4: Structured Runbook Development

**When to use this:**
- Same incident keeps happening
- On-call engineers don't know how to respond
- Tribal knowledge lives in specific people's heads

**How it works:**

Runbooks transform operational knowledge into executable procedures. Good runbooks answer: "I got this alert, what do I do?"

**Implementation:**

```markdown
# Runbook: High API Latency (api_latency_p99_high)

## Trigger
Alert: `api_latency_p99_high`
Threshold: p99 latency > 2 seconds for 5 minutes
Severity: Usually SEV-3, escalate to SEV-2 if affecting >10% of requests

## Background
The API service handles all customer requests. It depends on:
- PostgreSQL database (read/write)
- Redis cache (read-heavy)
- Auth service (JWT validation)

Common causes of latency spikes:
1. Cache miss storm (Redis unavailable or cache evicted)
2. Database slow queries (missing indexes, locks)
3. Downstream service timeout (auth service down)
4. Resource exhaustion (CPU, memory)

## Impact Assessment
Check dashboard: https://grafana.company.com/api-health

- If p99 > 5s: Likely SEV-2 (poor user experience)
- If error rate > 5%: Escalate to SEV-1
- If affecting < 5% of requests: Probably SEV-3

## Initial Diagnosis

### Step 1: Check recent deploys
```bash
# Did we just deploy?
kubectl rollout history deployment/api-service

# If deploy within last 15 minutes, consider rollback
```

### Step 2: Check dependencies
```bash
# Is Redis healthy?
redis-cli -h redis.internal ping
# Expected: PONG

# Is database healthy?
psql -h db.internal -c "SELECT 1;"
# Expected: Returns within 100ms

# Is auth service healthy?
curl -s https://auth.internal/health
# Expected: {"status": "healthy"}
```

### Step 3: Check resource usage
```bash
# Check API pod CPU/memory
kubectl top pods -l app=api-service

# If CPU > 80%: Likely need to scale
# If Memory > 90%: Potential memory leak
```

## Mitigation Steps

### Option A: Cache Miss Storm (Redis down)
```bash
# 1. Verify Redis is the issue
redis-cli -h redis.internal ping
# If timeout or connection refused:

# 2. Check Redis pod status
kubectl get pods -l app=redis

# 3. If Redis pod is down, restart it
kubectl rollout restart deployment/redis

# 4. Monitor latency recovery
# Expected: Latency returns to normal within 2-3 minutes as cache warms
```
**Success criteria:** p99 latency < 500ms

### Option B: Database Slow Queries
```sql
-- 1. Check for long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- 2. If you see obvious slow query, consider terminating it
SELECT pg_terminate_backend(PID);
-- Use with caution, may interrupt user requests
```
**Success criteria:** Active query count < 10

### Option C: Resource Exhaustion (Scale Up)
```bash
# If CPU consistently > 80%
kubectl scale deployment/api-service --replicas=6
# Current: 3 replicas, scaling to 6

# Monitor pod startup
kubectl get pods -l app=api-service -w

# Expected: Latency improves as new pods take load
```
**Success criteria:** CPU < 60%, latency < 500ms

### Option D: Rollback Recent Deploy
```bash
# If all above checks pass but latency started after deploy
kubectl rollout undo deployment/api-service

# Monitor rollback progress
kubectl rollout status deployment/api-service

# Verify latency recovery
```
**Success criteria:** Latency returns to pre-deploy baseline

## Escalation Path

If none of the above works after 15 minutes:
1. Escalate to SEV-2 (if not already)
2. Page database on-call: `@db-oncall` in Slack
3. Page infrastructure on-call: `@infra-oncall` in Slack
4. Update status page: https://status.company.com

## Recovery Verification

After mitigation:
1. Check dashboard shows p99 < 500ms for 5 consecutive minutes
2. Verify error rate < 1%
3. Confirm customer support reports no ongoing issues
4. Update incident timeline in Slack thread
5. Schedule postmortem if incident duration > 30 minutes

## Automation Opportunity
- Auto-scale based on latency (not just CPU)
- Circuit breakers for downstream services
- Automatic rollback if error rate spikes post-deploy
```

**What's happening:**
1. Alert triggers runbook
2. Background gives context (why this matters, what's involved)
3. Diagnosis steps identify root cause
4. Mitigation options provide specific commands with expected results
5. Escalation path prevents getting stuck
6. Success criteria confirm the fix worked

**Trade-offs:**
- **Pro:** New on-call engineers can handle incidents confidently
- **Pro:** Consistent response reduces MTTR (Mean Time To Recovery)
- **Pro:** Documents tribal knowledge before people leave
- **Con:** Runbooks drift from reality if not maintained
- **Con:** Can become cargo cult if people don't understand the "why"
- **When it's worth it:** For any repeatable incident or common alert

## Practical Implementation Guide

### Step 1: Define Your Severity Levels

Don't just copy someone else's severity system. Define it based on your specific business impact.

**Example:**

| Severity | Impact | Response Time | Notification |
|----------|--------|---------------|--------------|
| SEV-1 | All customers unable to use core function OR data loss/breach | Immediate | Public status page + executives |
| SEV-2 | Significant subset of customers affected OR core function degraded | < 10 minutes | Internal + affected customers |
| SEV-3 | Minor function degraded, workarounds exist | High-urgency business hours | Internal team only |
| SEV-4 | Performance issue, no customer impact | Standard business hours | No immediate notification |

**Common issue at this step:**
- Making too many severity levels (stick to 3-4 useful ones)
- Vague definitions ("significant" without numbers)

**Fix:** Attach specific metrics to each level:
- SEV-1: >50% of users affected OR any data loss
- SEV-2: 10-50% of users affected OR critical feature down
- SEV-3: <10% of users affected OR cosmetic issue

### Step 2: Create On-Call Rotation

Build a rotation that balances coverage with sustainability.

**Example:**

```yaml
# On-call rotation config
rotation_size: 6-8 engineers  # Sweet spot for monthly rotation
shift_length: 1 week
handoff_time: Monday 10am local time
escalation_delay: 15 minutes  # Auto-escalate if primary doesn't respond

schedule:
  primary_oncall:
    - week_1: Alice
    - week_2: Bob
    - week_3: Charlie
    - week_4: Dana
    - week_5: Eve
    - week_6: Frank

  secondary_oncall:  # Offset by 3 weeks
    - week_1: Dana
    - week_2: Eve
    - week_3: Frank
    - week_4: Alice
    - week_5: Bob
    - week_6: Charlie

compensation:
  weekday_oncall: +$200/week
  weekend_oncall: +$500/weekend
  incident_response: Time-in-lieu within 2 weeks
```

**Common issues at this step:**
- Rotation too small (< 5 people) → burnout
- No compensation → resentment
- Paging everyone for every incident → alert fatigue

### Step 3: Set Up Incident Communication Channels

Create clear communication paths before incidents happen.

**Example:**

```markdown
# Incident Communication Protocol

## For Responders
- **Primary channel:** #incident-response Slack channel
- **Incident call:** Zoom link in channel description (auto-started by PagerDuty)
- **Status updates:** Every 20-30 minutes during active SEV-1/2 incidents
- **Timeline documentation:** Google Doc linked in Slack thread

## For Stakeholders
- **Customer-facing:** status.company.com (update within 15 min of SEV-1/2)
- **Internal teams:** #incidents-updates Slack channel (read-only)
- **Executive updates:** Email to exec-list for SEV-1 only

## Templates

### Initial Incident Notification
```
🚨 SEV-2 INCIDENT: API Latency Spike
Started: 14:23 UTC
Impact: 15% of users experiencing slow login (8s vs normal 200ms)
Incident Commander: @alice
Status: Investigating root cause
Next update: 14:45 UTC
Incident doc: [link]
```

### Resolution Notification
```
✅ RESOLVED: API Latency Spike
Resolved: 15:47 UTC (84 minute duration)
Root cause: Database connection pool exhaustion from v2.3.4 deploy
Mitigation: Rollback to v2.3.3
Follow-up: Postmortem scheduled for 2025-11-17
```
```

**Common issues at this step:**
- Too many communication channels (nobody knows where to look)
- No templates (people waste time figuring out what to say)
- Demanding constant updates (stops productive work)

## Decision Framework

Use this framework to choose your incident response approach:

| Consideration | Lightweight (Startup) | Structured (Growing) | Enterprise (Large Org) |
|--------------|------------|------------|------------|
| **Team Size** | < 10 engineers | 10-50 engineers | 50+ engineers |
| **Incident Frequency** | < 2/month | 2-10/month | 10+/month |
| **ICS Structure** | Optional (one person can IC + fix) | Recommended | Required |
| **On-call rotation** | Informal (whoever's around) | 4-6 person rotation | 6-8+ person rotation |
| **Error budgets** | Simple (99.9% target) | Formal policy | Multiple SLOs per service |
| **Runbook formality** | Google doc | Structured markdown | Automated runbooks |
| **Postmortem process** | Informal chat | Written doc, action items | Facilitated sessions, metrics |

**Decision tree:**

```
Do you have > 10 engineers?
  ├─ NO → Start with lightweight
  │       - Informal on-call
  │       - Simple severity levels (3 levels)
  │       - Basic postmortem doc
  └─ YES → Do you have > 5 incidents/month?
            ├─ NO → Structured approach
            │       - Formal on-call rotation
            │       - ICS for SEV-1/2
            │       - Error budget policy
            └─ YES → Enterprise approach
                    - Always use ICS
                    - Automated runbooks
                    - Dedicated incident management platform
```

## Testing and Validation

### How to verify it's working:

```python
# Incident response health metrics
from datetime import datetime, timedelta

class IncidentMetrics:
    def __init__(self):
        self.incidents = []

    def calculate_health(self):
        """Key metrics for incident response effectiveness"""
        if not self.incidents:
            return "No incidents to analyze"

        # Mean Time To Detect (MTTD)
        mttd = sum(i.detected_at - i.started_at
                   for i in self.incidents) / len(self.incidents)

        # Mean Time To Recover (MTTR)
        mttr = sum(i.resolved_at - i.detected_at
                   for i in self.incidents) / len(self.incidents)

        # Postmortem completion rate
        postmortems_completed = sum(1 for i in self.incidents
                                     if i.postmortem_done)
        completion_rate = postmortems_completed / len(self.incidents)

        # Action item completion rate
        total_action_items = sum(len(i.action_items) for i in self.incidents)
        completed_items = sum(
            sum(1 for item in i.action_items if item.completed)
            for i in self.incidents
        )
        action_completion = completed_items / total_action_items if total_action_items > 0 else 0

        return {
            "mttd_minutes": mttd.total_seconds() / 60,
            "mttr_minutes": mttr.total_seconds() / 60,
            "postmortem_completion_rate": completion_rate,
            "action_item_completion_rate": action_completion,
            "total_incidents": len(self.incidents),
            "sev1_count": sum(1 for i in self.incidents if i.severity == "SEV-1"),
        }

# Good incident response looks like:
# - MTTD < 5 minutes (monitoring catches issues quickly)
# - MTTR < 60 minutes for SEV-2 (team responds effectively)
# - Postmortem completion > 90%
# - Action item completion > 75% within 30 days
```

### Monitoring in production:

- **Track incident count over time**: Should trend downward as action items fix root causes
- **Alert threshold**: >3 SEV-1 incidents per month indicates systemic issues
- **What to do when it fires**: Schedule deep-dive to find patterns across incidents

## Common Pitfalls

### Pitfall 1: IC Also Troubleshoots Deeply

**What happens:** Incident Commander gets sucked into debugging, stops coordinating team
**Root cause:** IC role assigned only to senior technical people who can't resist fixing things
**Prevention:** Separate coordination from technical work. Train diverse people for IC role.
**Detection:** Notice if IC goes silent for 10+ minutes during incident

**Example:**
```markdown
# Bad: IC doing technical work
14:32 IC: "I'm going to check the database logs"
[15 minutes of silence]
14:47 IC: "Found it! Connection pool exhausted"
Problem: While IC investigated, other responders waited for direction

# Good: IC delegates
14:32 IC: "@bob can you check database connection pool status?"
14:35 Bob: "Pool at 98/100 connections, queries backing up"
14:36 IC: "@alice what's normal connection count at this time?"
14:37 Alice: "Usually 20-30"
14:38 IC: "Decision: Roll back last deploy. @bob initiate rollback."
```

### Pitfall 2: Fear of Escalation

**What happens:** Teams get stuck rather than calling for help, wasting hours
**Root cause:** Culture punishes asking for help or admitting you don't know
**Prevention:** Emphasize "escalate early and often" in training and practice
**Detection:** Incidents with long MTTR where obvious expert wasn't paged

**Example:**
```markdown
# Bad: Stuck for 2 hours
14:30 Incident starts
16:30 Team still guessing at database issue
16:45 Finally pages DBA on-call
16:50 DBA identifies issue in 5 minutes
Total time: 2 hours 20 minutes (2 hours wasted)

# Good: Escalate early
14:30 Incident starts
14:38 Initial checks don't reveal issue
14:40 Page DBA on-call: "Need help with unusual DB behavior"
14:45 DBA identifies issue
Total time: 15 minutes
```

### Pitfall 3: Runbooks Become Stale

**What happens:** Documented procedures don't match reality, responders don't trust runbooks
**Root cause:** No process to update runbooks after incidents or infrastructure changes
**Prevention:** Include "Update runbook" in postmortem action items for every incident
**Detection:** Responders say "the runbook is wrong" during incidents

**Example:**
```bash
# Runbook says:
# Step 1: SSH into server
ssh api-prod-01.company.com

# Reality: Infrastructure migrated to Kubernetes 6 months ago
# Actual command needed:
kubectl exec -it deployment/api-service -- /bin/bash

# Fix: Update runbook immediately after discovering mismatch
```

## Real-World Examples

### Example 1: E-commerce Site Black Friday Incident

**Context:** Online retailer, 500K concurrent users during Black Friday sale
**Problem:** Payment processing failed for 15 minutes, losing $200K in revenue

**Solution using ICS pattern:**

```markdown
Timeline:
09:00 Black Friday sale starts
09:15 Payment success rate drops from 95% to 12%
09:16 Alert fires, Engineer A declares SEV-1, takes IC role
09:18 IC brings in payment service SME, database SME, infrastructure SME
09:20 Database SME reports: Connection pool saturated (200/200 connections)
09:21 IC asks: "Can we increase pool size quickly?"
09:22 Database SME: "Yes, but need to restart service (2 min downtime)"
09:23 IC decision: "Do it. Business accepts 2min downtime vs. continued failure"
09:25 Database restarted with pool size 400
09:27 Payment success rate recovers to 93%
09:30 IC monitors for 3 minutes, confirms stable
09:30 Incident resolved, IC assigns postmortem to Engineer B
```

**Results:**
- Total downtime: 15 minutes (impact limited)
- Revenue loss: $200K (vs. potentially $2M+ if continued)
- IC coordination prevented "everyone try random fixes" chaos
- Postmortem action items: Load test payment system at 2x expected peak traffic

### Example 2: SaaS Startup's Blameless Culture Transformation

**Context:** 30-person startup, blame culture causing people to hide incidents
**Problem:** Same incidents kept happening because teams weren't honest in postmortems

**Solution using blameless postmortem pattern:**

Before (blame culture):
```markdown
Postmortem excerpt:
"The incident was caused by Engineer X deploying without proper testing.
In the future, Engineer X needs to be more careful."

Result: Engineer X felt attacked, rest of team learned nothing
Root cause (missing staging environment) never addressed
Incident recurred 3 weeks later with different engineer
```

After (blameless culture):
```markdown
Postmortem excerpt:
"The incident occurred because our staging environment doesn't match
production's database schema. Deploys pass staging tests but fail in
production. Any engineer making DB changes faces this risk.

Action items:
- Sync staging DB schema from production daily (DevOps, Nov 20)
- Add schema comparison to CI pipeline (Engineer Y, Nov 22)
- Document DB migration process (DBA, Nov 25)"

Result: Systemic fix prevented entire class of incidents
Engineers report issues honestly, knowing they won't be blamed
```

**Results:**
- Incident recurrence rate: Dropped 60% over 6 months
- Time to root cause identification: 40% faster (people share honest information)
- Engineer retention: Improved (blame-related turnover stopped)

## Tools and Integration

### Recommended Tools

**Tool 1: PagerDuty (or similar incident management)**
- **What it does:** Alert routing, on-call scheduling, escalation policies
- **When to use it:** When you have formal on-call rotation (>5 engineers)
- **Setup:**
```yaml
# PagerDuty escalation policy
escalation_policy:
  name: "Engineering On-Call"
  repeat_count: 2  # Escalate twice before giving up

  levels:
    - level: 1
      timeout_minutes: 10
      targets:
        - type: schedule
          name: "Primary On-Call"

    - level: 2
      timeout_minutes: 10
      targets:
        - type: schedule
          name: "Secondary On-Call"

    - level: 3
      timeout_minutes: 15
      targets:
        - type: user
          name: "Engineering Manager"
```

**Tool 2: Statuspage (customer communication)**
- **What it does:** Public status page for customer-facing incident updates
- **When to use it:** Any customer-facing service
- **Setup:**
```markdown
# Statuspage component structure
components:
  - name: "API"
    status: operational | degraded_performance | partial_outage | major_outage
  - name: "Web Application"
  - name: "Mobile App"
  - name: "Database"

# Incident update template
incident:
  title: "Elevated API Latency"
  status: investigating | identified | monitoring | resolved
  impact: none | minor | major | critical
  updates:
    - time: "14:23 UTC"
      message: "We are investigating reports of elevated API latency"
    - time: "14:40 UTC"
      message: "Issue identified. Implementing fix."
    - time: "15:47 UTC"
      message: "Issue resolved. Monitoring for stability."
```

### Integration Patterns

**Monitoring → Alerting → Runbooks:**

```yaml
# Prometheus alert with runbook link
groups:
  - name: api_alerts
    rules:
      - alert: HighAPILatency
        expr: histogram_quantile(0.99, api_request_duration_seconds) > 2
        for: 5m
        labels:
          severity: warning
          team: api
        annotations:
          summary: "API p99 latency above 2 seconds"
          description: "p99 latency is {{ $value }}s (threshold: 2s)"
          runbook_url: "https://runbooks.company.com/high-api-latency"
          dashboard_url: "https://grafana.company.com/api-health"
```

When alert fires:
1. PagerDuty creates incident
2. Incident includes runbook link
3. On-call engineer clicks link, follows runbook
4. Runbook has direct commands to run
5. Engineer updates incident status in PagerDuty
6. PagerDuty updates Statuspage automatically

## Cost-Benefit Analysis

### Time Investment

- **Initial setup:** 40-60 hours
  - Define severity levels: 4 hours
  - Set up on-call rotation: 8 hours
  - Create 10 initial runbooks: 20 hours
  - Configure tooling (PagerDuty, Statuspage): 8 hours
  - Train team on ICS: 4 hours
  - Write error budget policy: 4 hours
  - Create postmortem template: 2 hours

- **Learning curve:** 1-2 months
  - First few incidents feel awkward using ICS
  - Team learns when to escalate
  - Runbooks get refined through use

- **Ongoing maintenance:** 4-8 hours per month
  - Update runbooks after incidents
  - Refine on-call rotation
  - Conduct postmortems

### Return on Investment

**Immediate (Week 1):**
- Clear on-call schedule eliminates "who's on-call?" confusion
- Severity levels prevent over-paging for minor issues
- Runbooks give new engineers confidence

**Medium-term (3-6 months):**
- MTTR decreases 30-50% (faster incident resolution)
- Repeat incidents drop as postmortem action items get done
- On-call stress reduces (clear procedures, predictable rotations)

**Long-term (1+ year):**
- Engineering culture shifts toward learning not blame
- Error budgets enable data-driven launch decisions
- Tribal knowledge captured in runbooks (team scales without chaos)

### When to skip this

- **Team < 5 engineers:** Formal on-call rotation is overkill, use informal schedule
- **Incidents < 1/month:** Don't need full ICS structure for rare incidents
- **Pre-product-market-fit startup:** Focus on shipping, not operational excellence
- **Legacy system being replaced:** Don't invest in sophisticated incident response for dying system

## Progressive Enhancement Path

**Month 1-2: Foundation**
- [ ] Define 3-4 severity levels with specific metrics
- [ ] Create basic on-call rotation (even if just 3 people)
- [ ] Set up #incident-response Slack channel
- [ ] Write postmortem template
- [ ] Create first 3 runbooks for most common alerts

**Month 3-4: Optimization**
- [ ] Implement ICS structure for SEV-1/2 incidents
- [ ] Add error budget policy with 1-2 key SLOs
- [ ] Train 3-4 people as potential Incident Commanders
- [ ] Set up public status page
- [ ] Link runbooks in all monitoring alerts

**Month 5-6: Advanced**
- [ ] Track MTTR and incident trends
- [ ] Conduct monthly postmortem review sessions
- [ ] Start automating runbook procedures
- [ ] Implement chaos testing for critical services
- [ ] Build incident response dashboard

## Summary

Key takeaways:

1. **Structure prevents chaos**: ICS gives clear roles, preventing "too many cooks" during incidents
2. **Error budgets align incentives**: Objective data replaces political arguments about launches
3. **Blameless culture accelerates learning**: People report honestly when they don't fear punishment

**Start here:**
- Define your severity levels with specific metrics (this week)
- Create basic on-call rotation even if informal (this week)
- Write one good runbook for your most common alert (next sprint)

**For deeper understanding:**
- Deep-water content covers chaos engineering, incident metrics, advanced postmortem facilitation
- See monitoring-logging mid-depth for alerting strategy
- See patch-management mid-depth for change management that reduces incidents
