---
title: "Monitoring & Logging"
phase: "06-operations"
topic: "monitoring-logging"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["incident-response", "patch-management", "backup-recovery"]
personas: ["new-developer", "yolo-dev", "busy-developer"]
updated: "2025-11-16"
---

# Monitoring & Logging - Surface

You deployed your code. It's running somewhere in production. Now the question is: how do you know if it's working?

Without monitoring, you find out your app is broken when customers complain on Twitter. With monitoring, you find out before they notice. The difference is whether you're reactive or in control.

## What This Is (And Isn't)

**What it is:**
- Collecting data about how your system behaves in production
- Knowing when something is wrong before customers tell you
- Understanding what happened when things break

**What it isn't:**
- A magic fix for bugs (it tells you there's a problem, not how to solve it)
- Only for large companies (even small projects need this)
- Something you can skip and add later (by then, you won't know what "normal" looks like)

## The Core Concept

Think of monitoring like the dashboard in your car. You don't stare at the speedometer constantly, but you glance at it to make sure you're not speeding. You don't memorize fuel levels, but you notice when the low-fuel light comes on.

Monitoring gives you those dashboard lights for your application. It tells you:
- Is it responding quickly enough?
- Is it handling the expected traffic?
- Are requests failing?
- Is it running out of resources?

Logging is the black box recorder. When something goes wrong, logs tell you what happened. Monitoring tells you something is wrong. Logs tell you why.

## Why This Matters

Real impact when you don't have monitoring:

**Without this:**
- You discover outages when customers complain
- You spend 2 hours guessing what went wrong
- You don't know if your fix actually worked
- You wake up at 3am to a problem that started at 6pm

**With this:**
- You get alerted when problems start
- You see exactly when and where things broke
- You confirm fixes by watching metrics recover
- You catch issues during business hours (most of the time)

A real example: Service responds in 200ms on average. One customer's requests take 30 seconds. Without monitoring, you might not notice. With proper logging and monitoring, you can query "show me all slow requests" and immediately see the problem is isolated to one user's data pattern.

## Basic Pattern

Start with the Four Golden Signals. Google's Site Reliability Engineering team identified these as the minimum you need to know if a service is healthy:

**The Four Signals:**

1. **Latency** - How long requests take
   - Measure: p50, p95, p99 response times
   - Alert: When p99 crosses your threshold (e.g., >1 second)

2. **Traffic** - How many requests you're handling
   - Measure: Requests per second
   - Alert: When traffic drops unexpectedly (service might be down)

3. **Errors** - How many requests are failing
   - Measure: Error rate (percentage of failed requests)
   - Alert: When error rate exceeds normal (e.g., >1%)

4. **Saturation** - How full your service is
   - Measure: CPU, memory, disk usage
   - Alert: When resources approach limits (e.g., disk >90%)

**Example (simple logging):**
```python
import logging
import time

# Set up structured logging
logging.basicConfig(
    format='%(asctime)s %(levelname)s %(message)s',
    level=logging.INFO
)

def handle_request(user_id, request_type):
    start_time = time.time()

    try:
        # Your actual work here
        result = process_request(request_type)

        # Log successful request with timing
        duration = time.time() - start_time
        logging.info(f"request_success user={user_id} type={request_type} duration={duration:.3f}s")

        return result

    except Exception as e:
        # Log failures with context
        duration = time.time() - start_time
        logging.error(f"request_failed user={user_id} type={request_type} duration={duration:.3f}s error={str(e)}")
        raise
```

**What this does:**
- Logs every request with user context and timing
- Distinguishes success from failure
- Includes duration (lets you measure latency)
- Provides structured format you can parse later

This is basic, but it works. From these logs, you can answer: How many requests? How many failed? How long did they take? That covers three of the four golden signals.

## Common Mistakes (And How to Avoid Them)

### 1. Alert Fatigue (The Biggest Problem)
**What happens:** You get 50 alerts per day. Most are false alarms. You start ignoring them. Then you miss the real outage.

**Why it happens:** Alert thresholds set too low (CPU >70% might be normal) or alerts on things that don't require action.

**How to prevent it:** Only alert on things that need immediate human attention. If the problem can be fixed automatically (auto-scaling, auto-restart), automate it instead of alerting. Research shows 67% of alerts get ignored because of false positives.

### 2. Logging Everything
**What happens:** Every function logs entry and exit. Logs fill up disk. Storage costs explode. Queries timeout because there's too much data.

**Why it happens:** Developer debugging mindset applied to production.

**How to prevent it:** Log important events (requests, errors, state changes), not every line of code. Use log levels correctly. In production, log INFO and above. Save DEBUG for development.

### 3. Plain Text Logs
**What happens:** Logs look like: "User John failed to login". Later, you want to find all failed logins. You have to write complex text parsing.

**Why it happens:** Seems easier to write human-readable messages.

**How to prevent it:** Use structured logging (JSON format). Example: `{"event":"login_failed","user":"john","timestamp":"..."}`. Now you can query by field. The research is clear: structured logging (like JSON) uses 1.5-2x more storage, but it's worth it because you can actually search and analyze the data.

## Quick Wins

**This week:**
- Add basic logging to your most critical endpoints (use the pattern above)
- Track one metric: request count or error rate

**This month:**
- Set up one alert: when error rate exceeds 5%
- Review logs from the last week - what patterns do you see?

**This quarter:**
- Implement all Four Golden Signals
- Document what "normal" looks like (baselines)
- Create a runbook: "When X alert fires, check Y"

## Red Flags

You have a problem if:
- You find out about outages from customers
- You can't answer "how many requests failed yesterday?"
- You have no idea what CPU/memory usage is normal
- It takes hours to find what went wrong after an incident
- Your alerts wake people up but turn out to be false alarms

## What Success Looks Like

You know you're doing this right when:
- You detect and fix issues before customers notice them
- When something breaks, you can pull up logs and see exactly what happened
- Your team trusts alerts (they're not crying wolf)
- You can answer questions like "show me all slow requests for user X" in seconds
- You have data to back up decisions ("we need to scale because traffic increased 40%")

## Next Steps

Start simple: Add structured logging with the Four Golden Signals in mind. From those logs, you can build dashboards and alerts later.

The mid-depth guide covers how to choose monitoring tools, set alert thresholds based on data (not guesses), and build a complete monitoring stack. The deep-water guide explores distributed tracing for microservices, high-cardinality observability, and monitoring at scale.

But first: log your requests with context (user, duration, status). You'd be surprised how much visibility that one change gives you.
