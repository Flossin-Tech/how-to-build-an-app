---
title: "Deployment Strategy"
phase: "05-deployment"
topic: "deployment-strategy"
depth: "mid-depth"
reading_time: 25
prerequisites: []
related_topics: ["infrastructure-as-code", "access-control", "cicd-pipeline-security"]
personas: ["generalist-leveling-up", "busy-developer"]
updated: "2025-11-16"
---

# Deployment Strategy: Making Trade-offs

This guide helps you choose deployment strategies based on real constraints: budget, team size, reliability requirements, and technical debt you're willing to accept.

## Strategy Comparison Matrix

| Strategy | Infrastructure Cost | Rollback Speed | Deployment Duration | Risk Level | Best For |
|----------|---------------------|----------------|---------------------|------------|----------|
| Blue-Green | 2× (high) | <1 min | <1 hour | Medium | Critical services |
| Rolling | 1× (low) | 5-15 min | 1-4 hours | Medium-High | Budget-constrained |
| Canary | 1.05× (medium) | <1 min | 2-6 hours | Low | High-reliability SLOs |
| Recreate | 1× (low) | 5-30 min | <30 min | High | Batch jobs |
| Shadow | 2× (high) | <1 min | 2-4 hours | Low | Load testing |
| A/B Test | 1.1-1.2× (medium) | 1-7 days | 3-28 days | Medium | Measuring impact |
| Ring | 1.2× (medium-high) | 5-60 min | 7-14 days | Low | Large organizations |

## Blue-Green Deployments: When Fast Rollback Matters

### How It Actually Works

You maintain two complete production environments:

```
┌─────────────┐
│ Load        │
│ Balancer    │──────────┐
└─────────────┘          │
                         ├──> Blue Environment (active)
                         │    - 10 servers
                         │    - Current version
                         │    - Handling 100% traffic
                         │
                         └──> Green Environment (staging)
                              - 10 servers
                              - New version
                              - Testing phase
```

**Deployment steps:**
1. Green runs old version (inactive)
2. Deploy new version to Green
3. Run integration tests against Green
4. Switch load balancer to Green
5. Blue becomes new staging environment

**Rollback:** Flip load balancer back to Blue (takes seconds).

### Database Schema Problem

Both environments can't have incompatible database schemas. If Blue expects column `user_name` but Green expects `username`, they can't share the same database.

**Solution: Expand-Contract Pattern**

**Phase 1 - Expand (First deployment):**
```sql
-- Add new column; old code unaware
ALTER TABLE users ADD COLUMN username VARCHAR(255);
```
Blue continues using `user_name`. Green ignores `username`. Both work.

**Phase 2 - Migrate (Second deployment):**
```sql
-- Backfill data
UPDATE users SET username = user_name WHERE username IS NULL;
```
Deploy code that:
- Writes to BOTH `user_name` and `username`
- Reads from `username` (new column)

Both environments can now work with either column.

**Phase 3 - Contract (Third deployment):**
```sql
-- Remove old column
ALTER TABLE users DROP COLUMN user_name;
```

This takes three deployments instead of one, but gives you safe rollback at every step.

### Stateful Applications

**Problem:** Users logged into Blue lose their session when traffic switches to Green.

**Solution 1: Distributed Session Store**
```
User session → Redis (shared by both Blue and Green)
                │
                ├──> Blue reads/writes sessions
                └──> Green reads/writes sessions
```

User can be routed to either environment without losing state.

**Solution 2: Session Affinity (Sticky Sessions)**
- Load balancer routes user to same environment throughout deployment
- User hitting Blue always goes to Blue until deployment completes
- Trade-off: Reduces load balancing effectiveness

### When Blue-Green Makes Sense

**Favors blue-green:**
- You have tight SLOs (99.9%+ uptime required)
- Infrastructure budget available for 2× capacity
- Deployment errors have severe business impact (payment processing, healthcare)
- Need disaster recovery practice (inactive environment doubles as DR test)

**Doesn't favor blue-green:**
- Resource-constrained (can't afford 2× infrastructure)
- Database changes are frequent (expand-contract overhead adds up)
- Deployment happens multiple times per day (maintaining two environments becomes operational burden)

## Rolling Deployments: The Budget-Conscious Approach

### How It Actually Works

Replace instances incrementally:

```
Start:  [v1] [v1] [v1] [v1] [v1] [v1] [v1] [v1]
Step 1: [v2] [v2] [v1] [v1] [v1] [v1] [v1] [v1]  (25% updated)
Step 2: [v2] [v2] [v2] [v2] [v1] [v1] [v1] [v1]  (50% updated)
Step 3: [v2] [v2] [v2] [v2] [v2] [v2] [v1] [v1]  (75% updated)
Step 4: [v2] [v2] [v2] [v2] [v2] [v2] [v2] [v2]  (100% updated)
```

**Kubernetes implementation:**
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Only 1 instance down at a time
      maxSurge: 1        # Create 1 extra instance during rollout
```

This updates one pod at a time while keeping the rest available.

### API Compatibility Requirement

During rolling update, v1 and v2 run simultaneously. If they can't talk to each other, users see errors.

**Problem scenario:**
```
Frontend v2 makes request: GET /api/users?include=preferences
Backend v1 doesn't support 'include' parameter → 400 Bad Request
```

**Solution: Backward-compatible API changes**

Add new parameters as optional:
```javascript
// v1 backend
app.get('/api/users', (req, res) => {
  const users = getUsers();
  res.json(users);
});

// v2 backend (backward compatible)
app.get('/api/users', (req, res) => {
  const users = getUsers();
  if (req.query.include === 'preferences') {
    users.forEach(u => u.preferences = getPreferences(u.id));
  }
  res.json(users);
});
```

v2 frontend can request `include=preferences`. v1 backend ignores it (no error). v2 backend honors it.

### Rollback Complexity

**Problem:** Rolling update is 50% complete. Errors detected. How do you rollback?

**Answer:** Trigger reverse rolling update (redeploy v1 incrementally).

```
Current: [v2] [v2] [v2] [v2] [v1] [v1] [v1] [v1]
Rollback Step 1: [v1] [v1] [v2] [v2] [v1] [v1] [v1] [v1]
Rollback Step 2: [v1] [v1] [v1] [v1] [v1] [v1] [v1] [v1]
```

This takes 5-15 minutes. During rollback, users still see errors from remaining v2 instances.

**Contrast with canary:** Canary rollback is instant (stop routing traffic to canary instances). Rolling rollback is gradual.

### When Rolling Makes Sense

**Favors rolling:**
- Limited infrastructure budget (no 2× capacity available)
- Application handles API versioning well
- Deployment time less critical than cost
- Using Kubernetes (built-in support)

**Doesn't favor rolling:**
- Breaking API changes between versions
- Need instant rollback (can't tolerate 5-15 minute recovery)
- Stateful applications with complex session management

## Canary Deployments: Early Detection

### How It Actually Works

```
Production Traffic (100%)
  │
  ├─ 5% → Canary (v2)
  │        Monitor: error rate, latency, resource usage
  │
  └─ 95% → Stable (v1)
           Monitor: error rate, latency, resource usage
```

**Critical requirement:** Monitor canary and stable populations separately.

If you aggregate metrics, a 20% error rate in 5% canary appears as only 1% overall error rate. You miss the problem.

### Metric Selection

**Good metrics** (indicate user-facing problems):
- HTTP error rate (5xx responses)
- Request latency at p99
- Application-level errors
- Failed health checks

**Bad metrics** (don't indicate user problems):
- System-wide CPU (canary is 5% of traffic; won't move aggregate CPU much)
- Total request count (expected to be low for canary)
- Disk usage (not related to code changes usually)

### Canary Advancement Policy

Progressive rollout with metric gates:

```
Stage 1: 5% traffic to canary
  │
  ├─ Wait 10 minutes
  ├─ Check metrics
  │
  ├─ Success rate >= 99%? YES → Continue
  │                        NO  → ROLLBACK
  ↓
Stage 2: 25% traffic to canary
  │
  ├─ Wait 20 minutes
  ├─ Check metrics
  │
  ├─ Success rate >= 99%? YES → Continue
  │                        NO  → ROLLBACK
  ↓
Stage 3: 50% traffic to canary
  ↓
Stage 4: 100% traffic (canary becomes stable)
```

### Automated Canary with Flagger

Flagger (Kubernetes progressive delivery tool) automates this process:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
spec:
  analysis:
    interval: 1m
    threshold: 5          # Fail after 5 consecutive failures
    maxWeight: 50         # Max 50% traffic to canary
    stepWeight: 10        # Increase by 10% each interval
  metrics:
  - name: request-success-rate
    thresholdRange:
      min: 99             # Must maintain 99% success
  - name: request-duration
    thresholdRange:
      max: 500            # Max 500ms latency
```

Flagger integrates with:
- **Service meshes:** Istio, Linkerd (for traffic splitting)
- **Monitoring:** Prometheus, Datadog, New Relic (for metrics)
- **Alerting:** Slack, PagerDuty (for notifications)

When metric check fails, Flagger automatically routes all traffic back to stable version and scales canary to zero.

### Canary Anti-Patterns

**Anti-pattern 1: Time-based comparison**
```
Compare today's metrics to yesterday's metrics
```
**Problem:** Business patterns change day-to-day. Tuesday might have different traffic than Monday.

**Solution:** Concurrent comparison (canary vs. stable, same time period).

**Anti-pattern 2: Shared infrastructure**
```
Canary and stable share same database, cache, message queue
```
**Problem:** Canary performance issues (slow queries) affect stable population.

**Solution:** Isolate canary infrastructure when possible.

**Anti-pattern 3: Too many metrics**
```
Monitor 50 different metrics; any violation triggers rollback
```
**Problem:** False positives. More metrics = more chances for spurious failure.

**Solution:** Pick 5-12 critical metrics that actually indicate user problems.

### When Canary Makes Sense

**Favors canary:**
- High-reliability requirements (SLOs matter)
- Strong observability platform (Prometheus, Datadog, etc.)
- Deployment errors have severe consequences
- Can tolerate deployments taking hours

**Doesn't favor canary:**
- Weak monitoring (can't measure success accurately)
- Need fast time-to-market (canary takes hours)
- Team inexperienced with observability complexity

## Feature Toggles: Decoupling Deployment from Release

Feature toggles let you deploy code but not release features.

### Types of Feature Toggles

| Type | Duration | Purpose | Example |
|------|----------|---------|---------|
| Release Toggle | Days-weeks | Hide incomplete feature | New search algorithm |
| Experiment Toggle | Days-weeks | A/B test | UI layout variant |
| Ops Toggle | Hours | Disable during outages | Kill expensive feature to recover capacity |
| Permissioning Toggle | Months-years | Control by user type | Premium features for paying users |

### Implementation Pattern

**Bad: Direct check everywhere**
```javascript
// Toggle check scattered throughout code
if (featureFlags.newCheckout) {
  renderNewCheckout();
} else {
  renderOldCheckout();
}
```

**Problem:** When you want to remove toggle, you grep entire codebase for references.

**Good: Dependency injection**
```javascript
// Decision logic centralized
const CheckoutComponent = featureFlags.newCheckout
  ? NewCheckoutComponent
  : OldCheckoutComponent;

// Usage sites just reference
<CheckoutComponent />
```

**Benefit:** When removing toggle, change one line. All usage sites unchanged.

### Feature Toggle Lifecycle

1. **Create toggle** - New feature deployed, toggle = off
2. **Enable for beta** - Toggle = on for 5% of users
3. **Enable for all** - Toggle = on for 100%
4. **Remove toggle** - Delete toggle logic after stable (treat as technical debt)

**Critical:** Don't let toggles accumulate. Each toggle adds runtime complexity and testing burden.

### When Feature Toggles Make Sense

**Favors toggles:**
- Deploy frequently but release on business schedule
- Need instant rollback (disable toggle, no deployment)
- A/B testing (different users see different versions)
- Large incomplete features (deploy incrementally, hide until ready)

**Doesn't favor toggles:**
- Simple applications with infrequent releases
- Team can't manage technical debt (toggles pile up)
- Testing complexity too high (2^n combinations of toggle states)

## Progressive Delivery: Automating Decisions

Progressive delivery automates canary advancement using policies and metrics.

**Manual canary:**
```
Engineer monitors dashboard
  ↓
Sees metrics look good
  ↓
Manually advances canary from 5% → 25%
  ↓
Repeats every 30 minutes
```

**Progressive delivery (automated):**
```
System monitors metrics every 1 minute
  ↓
If success_rate >= 99% AND latency <= 500ms
  ↓
Automatically advance canary 5% → 25% → 50% → 100%
  ↓
If metrics degrade, automatically rollback
```

### Tools for Progressive Delivery

**Flagger (Weaveworks):**
- Kubernetes-native
- Integrates with Istio, Linkerd, Gateway API
- Automatic rollback on metric failure
- https://flagger.app

**Argo Rollouts (CNCF):**
- GitOps-integrated
- Advanced traffic management
- Blue-green and canary strategies
- https://argo-rollouts.readthedocs.io

**Spinnaker (Netflix):**
- Multi-cloud deployment orchestration
- Immutable infrastructure deployments
- Used for 95% of Netflix infrastructure
- https://spinnaker.io

### When Progressive Delivery Makes Sense

**Favors progressive delivery:**
- High deployment frequency (multiple times per day)
- Mature observability platform
- Team comfortable with automation
- SLO-driven culture

**Doesn't favor progressive delivery:**
- Deploy infrequently (manual decisions acceptable)
- Weak monitoring (can't trust automated decisions)
- Small team (operational overhead not justified)

## Shadow Deployments: Testing at Production Scale

Shadow deployment routes copy of production traffic to new version without returning its responses to users.

### How It Actually Works

```
Production Request
  │
  ├─ Duplicate → Shadow (v2)
  │              - Processes request
  │              - Response discarded
  │              - Logs collected
  │
  └─ Process  → Stable (v1)
                - Processes request
                - Response returned to user
```

### Use Cases

**Good for shadow:**
- Read-heavy APIs (search, recommendations, analytics)
- Performance testing (measure latency under real load)
- Idempotent operations (safe to duplicate)

**Not good for shadow:**
- Writes/mutations (payments, account creation)
- Distributed sessions (shadow state diverges from production)
- Operations with side effects (sending emails, SMS)

### Implementation Challenges

**Challenge 1: Traffic duplication overhead**

Doubling infrastructure cost. Need budget for shadow capacity.

**Challenge 2: Asynchronous workflows**

If shadow version triggers background jobs, those jobs execute on production data. Mutations leak into production.

**Solution:** Mock external dependencies in shadow environment.

**Challenge 3: Data consistency**

Shadow version sees production data but doesn't modify it. Reads stale state if stable version modifies it after shadow reads.

### When Shadow Makes Sense

**Favors shadow:**
- Testing major architectural changes (rewrite from monolith to microservices)
- Performance is primary concern
- Service is read-heavy or mutations are safe to duplicate
- Infrastructure budget available

**Doesn't favor shadow:**
- Service is write-heavy (can't safely duplicate mutations)
- Budget-constrained (can't afford 2× infrastructure)
- Complex state synchronization (distributed sessions)

## A/B Testing: Measuring User Impact

A/B testing routes users to different versions to measure behavioral differences.

### How It Actually Works

```
User arrives
  │
  ├─ Hash(user_id) % 2 == 0 → Version A (control)
  │                           Track: conversion, engagement, revenue
  │
  └─ Hash(user_id) % 2 == 1 → Version B (treatment)
                              Track: conversion, engagement, revenue
```

**Critical:** Same user always sees same version (deterministic routing based on user ID).

### Statistical Requirements

**Sample size calculation:**

For conversion rate improvement (5% → 6%):
- Confidence level: 95%
- Statistical power: 80%
- Required sample: ~15,000 users per variant

**Duration:**

If you have 1,000 daily active users:
- Need 30 days to reach 15,000 samples per variant

If you have 100,000 daily active users:
- Need 1 day to reach required samples

### Novelty Effect

**Problem:** Users try new features intensively when first released, then usage drops.

**Example:**
```
Week 1: New UI → 20% conversion (novelty)
Week 4: New UI → 12% conversion (steady state)
Old UI:         10% conversion (steady state)
```

If you measure after Week 1, you incorrectly conclude new UI is 2× better.

**Solution:** Run A/B tests for 2-4 weeks to capture steady-state behavior.

### When A/B Testing Makes Sense

**Favors A/B testing:**
- Measuring business metrics (conversion, engagement, revenue)
- Sufficient user volume (thousands of users per day)
- Can tolerate long-running tests (weeks)
- Team trained in experimental design and statistics

**Doesn't favor A/B testing:**
- Low user volume (can't reach statistical significance)
- Need fast rollback (can't wait weeks for data)
- Technical changes only (no user-facing impact)

## Ring Deployments: Organizational Blast Radius Control

Ring deployment rolls out to concentric rings of increasing size.

### Ring Structure

```
Ring 0 (Canary): Internal employees (100 people)
  ↓
  Wait 24-48 hours, validate metrics
  ↓
Ring 1 (Early Adopters): Beta program (10,000 users)
  ↓
  Wait 3-5 days, validate metrics
  ↓
Ring 2 (General Population): All users (1,000,000 users)
```

### Ring Progression Criteria

**Ring 0 → Ring 1:**
- Zero critical bugs reported
- Error rate <0.05% increase
- Employee feedback positive
- Peak load periods validated

**Ring 1 → Ring 2:**
- Same criteria as Ring 0
- Community feedback analyzed
- Geographic distribution validated
- Support team prepared for general rollout

### Integration with Feature Flags

Rings define WHO can access feature. Flags define IF they can access it.

```
Ring 0 + Feature Flag 100% = Employees see feature
Ring 1 + Feature Flag 50%  = Half of early adopters see feature
Ring 2 + Feature Flag 10%  = 10% of all users see feature
```

This gives you fine-grained control: staged rollout (rings) + gradual enablement (flags).

### When Ring Deployment Makes Sense

**Favors ring:**
- Large user base (millions of users)
- Organizational structure supports rings (employees, beta community, general)
- Can tolerate week-long rollout
- Different user tiers expect different experiences

**Doesn't favor ring:**
- Small user base (thousands of users, not millions)
- Need fast rollout (hours, not weeks)
- Don't have employee or beta populations

## Automated Rollback: Decision Framework

### Rollback Triggers

| Metric | Baseline | Rollback Trigger | Reasoning |
|--------|----------|------------------|-----------|
| Error rate | 0.05% | Increase >3-5% (total >0.08%) | User-facing failures |
| Latency p99 | 200ms | Increase >50% (total >300ms) | Performance degradation |
| Pod crashes | 0 | Any increase | Application instability |
| Health checks | 100% pass | >3 consecutive failures | Service unavailable |
| CPU per request | 2ms | Increase >30% | Resource exhaustion |

### Grace Period

**Problem:** Normal startup causes temporary metric spike. Auto-rollback triggers on false positive.

**Solution:** Wait 5-10 minutes after deployment before analyzing metrics.

```
Deploy at 10:00am
  ↓
Grace period: 10:00-10:05 (ignore metrics)
  ↓
Analysis period: 10:05-10:15 (watch metrics)
  ↓
Metrics stable → Continue
Metrics degraded → Rollback
```

### Manual Override

**Scenario:** Engineer knows metric spike is expected (data backfill causes temporary CPU increase).

**Solution:** Manual override prevents auto-rollback.

```yaml
deployment:
  auto_rollback: false  # Manual override
  reason: "Backfill operation causes expected CPU spike"
```

Team monitors manually and decides when to re-enable auto-rollback.

## Cost-Benefit Analysis

### Total Cost of Ownership

**Blue-Green:**
- Infrastructure: 2× production capacity ($$$)
- Engineering time: Medium (maintain two environments)
- Deployment time: <1 hour
- **TCO:** High infrastructure, medium engineering

**Rolling:**
- Infrastructure: 1× production capacity ($)
- Engineering time: Medium (manage API compatibility)
- Deployment time: 1-4 hours
- **TCO:** Low infrastructure, medium engineering

**Canary:**
- Infrastructure: 1.05× production capacity ($$)
- Engineering time: High (monitoring, observability)
- Deployment time: 2-6 hours
- **TCO:** Medium infrastructure, high engineering

### Risk-Adjusted Cost

Consider cost of failure:

```
Strategy Cost = Infrastructure + Engineering + (Failure Rate × Incident Cost)

Blue-green:  $10,000/month + $5,000/month + (0.1% × $100,000) = $15,100/month
Rolling:     $5,000/month  + $5,000/month + (1% × $100,000)   = $11,000/month
Canary:      $5,500/month  + $8,000/month + (0.25% × $100,000) = $13,750/month
```

For this scenario, rolling deployment is cheapest when accounting for failure risk.

But if incident cost is $1,000,000 (healthcare, financial services):

```
Blue-green:  $10,000 + $5,000 + (0.1% × $1,000,000)  = $16,000/month
Canary:      $5,500  + $8,000 + (0.25% × $1,000,000) = $16,000/month
Rolling:     $5,000  + $5,000 + (1% × $1,000,000)    = $20,000/month
```

Now blue-green and canary are cheaper than rolling because they reduce failure rate enough to offset infrastructure cost.

## Key Takeaways

1. **No universal best strategy** - Trade-offs depend on your constraints
2. **Start simple, evolve** - Rolling → Blue-green → Canary → Progressive delivery
3. **Measure what matters** - Can't make safe deployment decisions without observability
4. **Decouple deployment from release** - Feature flags enable deploying often, releasing carefully
5. **Practice rollback** - Untested rollback procedures fail when you need them

## Decision Tree

```
Can you afford 2× infrastructure?
  ├─ NO → Rolling deployment
  │       - Add monitoring
  │       - Practice rollback
  │
  └─ YES → Do you have strong observability?
            ├─ NO → Blue-green deployment
            │       - Invest in monitoring
            │       - Add feature flags
            │
            └─ YES → Canary deployment
                     - Automate with Flagger/Argo Rollouts
                     - Implement progressive delivery
```

The right strategy depends on where you are, what you can afford, and what you're trying to protect.

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Infrastructure as Code](../../infrastructure-as-code/mid-depth/index.md) - Related deployment considerations
- [CI/CD Pipeline Security](../../cicd-pipeline-security/mid-depth/index.md) - Related deployment considerations
- [Access Control](../../access-control/mid-depth/index.md) - Related deployment considerations

### Navigate
- [← Back to Deployment Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
