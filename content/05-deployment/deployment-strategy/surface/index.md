---
title: "Deployment Strategy"
phase: "05-deployment"
topic: "deployment-strategy"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["infrastructure-as-code", "access-control", "cicd-pipeline-security"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-16"
---

# Deployment Strategy

Deployment strategy determines how you move code from development to production. The strategy you pick affects downtime risk, rollback speed, infrastructure cost, and how many users get hit if something breaks.

According to research from Waze, canary releases prevent about 25% of all incidents on their services. Your choice of deployment strategy has measurable business impact.

## The Core Question

When you deploy, you're deciding: should everyone get the new version at once, or should some smaller group test it first?

There are seven main approaches. Each trades off cost, speed, and safety differently.

## Seven Deployment Strategies

### 1. Blue-Green Deployment

**How it works:** Run two identical production environments. Blue is live. Deploy to Green, test it, then switch all traffic at once.

**When to use:** You can afford 2× infrastructure and want instant rollback.

- Downtime: None
- Rollback: Flip traffic back (instant)
- Cost: High (doubles infrastructure)

**Real scenario:** Payment processing system that can't have any downtime during deployment. Deploy to Green, run final checks, switch traffic. If Green breaks, switch back to Blue in seconds.

### 2. Rolling Deployment

**How it works:** Replace old instances with new ones gradually, one or a few at a time.

**When to use:** Limited infrastructure budget but still want zero downtime.

- Downtime: None
- Rollback: Reverse the rolling update (5-15 minutes)
- Cost: Low (same infrastructure)

**Real scenario:** API service with 10 instances. Update 2 instances, watch them, update 2 more, repeat. Old and new versions run side-by-side for a while.

**Catch:** Old and new versions run simultaneously. If v2 frontend can't talk to v1 backend, users see errors.

### 3. Canary Deployment

**How it works:** Send 1-5% of traffic to new version. Monitor. If metrics look good, gradually increase to 100%.

**When to use:** Catching problems early with minimal user impact.

- Downtime: None
- Rollback: Stop sending traffic to canary (instant)
- Cost: Medium (1.05× infrastructure)

**Real scenario:** Social media app with 1 million users. Deploy to 5% (50,000 users). If error rate spikes, only 50,000 people saw the problem. Rollback before it hits everyone.

**What to monitor:** Error rate, latency, failed health checks. Compare canary metrics to stable version metrics.

### 4. Recreate Deployment

**How it works:** Stop all old instances, deploy new ones.

**When to use:** Batch jobs or off-hours deployments where downtime is acceptable.

- Downtime: Yes (during deployment)
- Rollback: Restart old version (5-30 minutes)
- Cost: Lowest (no extra infrastructure)

**Real scenario:** Nightly data processing job. Stop it at 2am, deploy new version, restart. Users aren't using it anyway.

## Real-World Example: Single-Server Docker Compose Pattern

Not every application needs Kubernetes on day one. A single-server Docker Compose deployment can handle 100+ concurrent users and is appropriate when validating product-market fit.

A dispatch management application used this pattern at launch:

**Deployment Architecture**:
- Single EC2 t3.medium (2 vCPU, 4GB RAM)
- Docker Compose with 4 containers
- Cost: ~$50/month

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - ./static:/usr/share/nginx/html:ro
    depends_on:
      - flask-app

  flask-app:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://dispatch:${DB_PASSWORD}@postgres:5432/dispatch
      - KEYCLOAK_URL=https://keycloak:8443
    secrets:
      - db_password
      - keycloak_client_secret
    depends_on:
      - postgres
      - keycloak

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    environment:
      - KC_DB=postgres
      - KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
      - KC_DB_USERNAME=keycloak
      - KC_DB_PASSWORD=${KEYCLOAK_DB_PASSWORD}
    secrets:
      - keycloak_db_password
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    secrets:
      - postgres_password

volumes:
  postgres_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
  keycloak_client_secret:
    file: ./secrets/keycloak_client_secret.txt
  keycloak_db_password:
    file: ./secrets/keycloak_db_password.txt
  postgres_password:
    file: ./secrets/postgres_password.txt
```

**Deployment Process**:
```bash
# Deploy new version
git pull origin main
docker-compose build
docker-compose up -d

# Verify deployment
docker-compose ps
curl -k https://localhost/health

# Rollback if needed
git checkout previous-tag
docker-compose build
docker-compose up -d
```

**When This Pattern Is Appropriate**:
- Product-market fit validation (0-100 users)
- Known user base who understands it's not enterprise-grade
- Downtime of 2-5 minutes during deployment is acceptable
- Recovery time of 4 hours from backup is acceptable
- Cost optimization is important (saves $400-900/month vs Kubernetes)

**Evolution Triggers** (when to move beyond this):
- Customer contracts require 99%+ uptime SLAs
- Traffic consistently exceeds single-server capacity (response times >5 seconds)
- Deployments become daily (current approach causes too much downtime)
- Need geographic distribution for global users
- Team size grows beyond 5 engineers

**Key Insight**: This isn't a stopgap solution. It's the right architecture for the stage. The team ran this for 6 months, acquired 50+ customers, and validated product-market fit before adding complexity. The $50/month savings went toward customer development instead of infrastructure.

📌 **See Complete Architecture**: [Dispatch Management - Surface Level](/02-design/architecture-design/case-studies/dispatch-management-surface/)

### 5. Shadow Deployment (Dark Launch)

**How it works:** Deploy new version, send it a copy of production traffic, but don't return its responses to users. Stable version continues serving real responses.

**When to use:** Testing under real load without any user-facing risk.

- Downtime: None
- Rollback: Stop shadow traffic (immediate)
- Cost: High (2× infrastructure)

**Real scenario:** New search algorithm. Route copy of all search queries to new version, compare response times and results, but keep showing users the old search results. When confident the new algorithm is faster and better, switch.

**Limitation:** Can't test writes/mutations (billing, payments). Only works for read-heavy or idempotent operations.

### 6. A/B Testing Deployment

**How it works:** Route different users to different versions based on user ID, geography, or other criteria. Compare behavior.

**When to use:** Measuring whether new feature actually improves user behavior.

- Downtime: None
- Rollback: Remove traffic split (instant)
- Cost: Medium
- Duration: Days or weeks (need statistical significance)

**Real scenario:** E-commerce site testing two checkout flows. 50% of users see version A, 50% see version B. After 2 weeks, measure which version has higher conversion rate.

### 7. Ring Deployment

**How it works:** Roll out to concentric rings: Ring 0 (employees), Ring 1 (early adopters), Ring 2 (all users).

**When to use:** Large organizations where you can afford staged rollout over days.

- Downtime: None
- Rollback: Stop progression to next ring
- Cost: Medium-High
- Duration: 1-2 weeks

**Real scenario:** Enterprise software with millions of users. Deploy to 100 employees first. If stable after 24 hours, deploy to 10,000 early adopters. If stable after 3 days, deploy to all users.

## Quick Decision Framework

| Your Situation | Use This Strategy |
|----------------|-------------------|
| Absolutely can't have downtime | Blue-green or canary |
| Limited infrastructure budget | Rolling deployment |
| Afraid to deploy | Feature flags + canary |
| Database schema changes | Blue-green (with expand-contract pattern) |
| Testing with real production load | Shadow deployment |
| Measuring user behavior impact | A/B testing |
| Large organization, many teams | Ring deployment + feature flags |
| Batch job, downtime OK | Recreate |

## Deployment vs. Release: Critical Difference

**Deployment** = Technical: Getting code into production.
**Release** = Business: Making features visible to users.

You can separate these with **feature toggles** (feature flags):

1. Deploy code with feature hidden (toggle = off)
2. Test in production while users don't see it
3. Turn toggle on for beta users
4. Turn toggle on for everyone
5. If problems: turn toggle off (instant rollback, no deployment)

This is how companies deploy multiple times per day while releasing features on a business schedule.

## What to Watch During Deployment

Monitor these metrics continuously:

**Critical metrics:**
- **Error rate** - Should stay constant or decrease
- **Request latency** (p99) - Shouldn't spike above 50% of baseline
- **Failed health checks** - Application-level checks
- **Resource usage** - CPU, memory shouldn't degrade

**When to rollback:**
- Error rate increases >2-3% above baseline
- Latency p99 increases >50% above baseline
- Failed health checks exceed threshold
- New error messages in logs

Wait 5-10 minutes after deployment before analyzing. Systems often have startup spike.

## Common Deployment Disasters

| Disaster | Cause | Prevention |
|----------|-------|------------|
| Big-bang failure | All changes at once; can't isolate issues | Deploy small changes frequently |
| Friday outage | Deploy when team unavailable | Deploy during business hours |
| Database incompatibility | Old code can't work with new schema | Use expand-contract pattern |
| Session loss | Users logged out during traffic shift | Use distributed session store (Redis) |
| No rollback | When deployment fails, stuck | Always keep previous version running |

## Rollback Decision: 5-Minute Framework

```
Deploy
  ↓
Wait 5-10 minutes (avoid false positives)
  ↓
Check metrics
  ↓
Metrics degraded >2-3%?
  ├─ YES → Affecting >10% users? → ROLLBACK
  │         Getting worse? → ROLLBACK
  │         Stable? → Monitor longer
  └─ NO → Continue deployment
```

**Rollback speed by strategy:**
- Blue-green: <1 minute (flip traffic)
- Canary: <1 minute (stop canary traffic)
- Rolling: 5-15 minutes (redeploy old version)
- Feature flag: Milliseconds (disable flag)

## Database Schema Changes: The Problem

You can't just add a required column to your database. If you do, old code breaks because it doesn't know about the new column. But you can't switch all code instantaneously.

**Solution: Expand-Contract Pattern**

Three deployments:

**Deployment 1 - Expand:**
- Add new column (old code ignores it)

**Deployment 2 - Migrate:**
- Deploy code that writes to both old and new columns
- Backfill existing data
- Deploy code that reads from new column

**Deployment 3 - Contract:**
- Remove old column

Each deployment can be rolled back independently. No downtime required.

## Starting Point: Where You Are Now

Most teams start simple and evolve:

**Stage 1:** Manual deployments (high risk)
→ Automate with CI/CD pipeline

**Stage 2:** Rolling deployments (low cost)
→ Add monitoring and rollback procedures

**Stage 3:** Blue-green + feature toggles (safer)
→ Implement SLO monitoring and automated rollback

**Stage 4:** Canary + chaos engineering (mature)
→ Progressive delivery platforms, service mesh

You don't need Stage 4 on day one. Start where your team can handle the complexity.

## Key Takeaway

The deployment strategy you choose determines what happens when something breaks:

- **Recreate:** Everyone sees the problem, significant downtime
- **Rolling:** Problems spread gradually, 5-15 minute rollback
- **Canary:** 5% of users see problems, instant rollback
- **Blue-green:** Problems caught before anyone sees them, instant rollback

Pick the strategy that matches your tolerance for things going wrong and your infrastructure budget.

## Next Steps

1. **Assess current state:** What strategy do you use now? (Most start with rolling or recreate)
2. **Identify constraints:** Infrastructure budget? Downtime tolerance? Team maturity?
3. **Pick one improvement:** If using recreate, move to rolling. If using rolling, add basic monitoring.
4. **Practice rollback:** Test your rollback procedure in staging before you need it in production.

The goal isn't perfection. The goal is knowing what will happen when deployment fails, and having a plan to recover quickly.

---

## Real Life Case Studies

### [Dispatch Management: Progressive Architecture](/02-design/architecture-design/case-studies/dispatch-management/)

A B2B SaaS application showing deployment strategy evolution: Single-server Docker Compose (Surface) → Multi-instance Kubernetes (Mid-Depth) → Multi-region with geographic distribution (Deep-Water). Demonstrates when simple is sufficient and when to add complexity.

**Topics covered:** Docker Compose single-server pattern, Recreate deployment for PMF validation, Evolution triggers for Kubernetes adoption, Cost analysis at each deployment stage, Acceptable downtime at different scales

**Deployment Focus:** See [Surface Level architecture](/02-design/architecture-design/case-studies/dispatch-management-surface/) for complete Docker Compose deployment pattern handling 100+ users for ~$50/month.
