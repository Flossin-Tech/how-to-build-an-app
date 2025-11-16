---
title: "Deployment Strategy"
phase: "05-deployment"
topic: "deployment-strategy"
depth: "deep-water"
reading_time: 45
prerequisites: []
related_topics: ["infrastructure-as-code", "access-control", "cicd-pipeline-security"]
personas: ["specialist-expanding"]
updated: "2025-11-16"
---

# Deployment Strategy: Advanced Patterns and Case Studies

This guide covers advanced deployment patterns used by organizations operating at scale: Google SRE's SLO-driven deployments, Netflix's chaos engineering integration, sophisticated progressive delivery automation, and the operational complexity of multi-region deployments.

## Google SRE: SLO-Driven Deployment Philosophy

Google treats Service Level Objectives (SLOs) as the primary driver of deployment decisions. The philosophy: deployments should be governed by data about actual service health, not release schedules or organizational politics.

### Error Budget Framework

**Core concept:** SLO defines target reliability. Error budget is the inverse—allowed unreliability.

```
SLO: 99.9% availability
Error budget: 1 - 0.999 = 0.1% = 0.001

Over 30 days (2,592,000 seconds):
Allowed downtime = 2,592,000 × 0.001 = 2,592 seconds ≈ 43 minutes
```

This 43 minutes is your error budget. You can spend it on:
- Deployments that cause brief outages
- Risky experiments
- Planned maintenance

### Deployment Policy Based on Error Budget

```
IF service within SLO (error budget available):
  → Deploy according to normal schedule
  → Team can take risks, ship features

IF service exceeded SLO (error budget exhausted):
  → HALT all deployments except P0/security fixes
  → Focus 100% on reliability
  → Re-stabilize service before resuming feature work
```

Quote from Google SRE book: "The policy is not intended to serve as punishment for missing SLOs; halting change gives teams permission to focus exclusively on reliability when data indicates that reliability is more important than other product features."

### Practical Implementation

**Step 1: Define SLIs (Service Level Indicators)**

Measure what users actually experience:

```
SLI: Request success rate
Measurement: HTTP 2xx responses / total HTTP responses
Target: 99.9%

SLI: Request latency
Measurement: p99 response time
Target: <500ms
```

**Step 2: Calculate real-time error budget consumption**

```python
# Simplified error budget calculation
def calculate_error_budget_remaining(slo, actual_uptime, time_period_seconds):
    """
    slo: Target reliability (0.999 for 99.9%)
    actual_uptime: Measured uptime percentage over period
    time_period_seconds: Measurement window (e.g., 30 days)
    """
    allowed_downtime = time_period_seconds * (1 - slo)
    actual_downtime = time_period_seconds * (1 - actual_uptime)
    budget_remaining = allowed_downtime - actual_downtime

    return budget_remaining, (budget_remaining / allowed_downtime) * 100

# Example
slo = 0.999
actual_uptime = 0.9985  # Measured over 30 days
time_period = 30 * 24 * 60 * 60  # 30 days in seconds

remaining_seconds, remaining_percent = calculate_error_budget_remaining(
    slo, actual_uptime, time_period
)

print(f"Error budget remaining: {remaining_seconds:.0f} seconds ({remaining_percent:.1f}%)")
# Output: Error budget remaining: 1296 seconds (50.0%)
```

**Step 3: Deployment decision automation**

```yaml
deployment_policy:
  - if: error_budget_remaining > 50%
    action: auto_approve
    reason: "Sufficient error budget for normal deployment"

  - if: error_budget_remaining > 25% AND error_budget_remaining <= 50%
    action: manual_approval_required
    reason: "Moderate error budget; engineering manager must approve"

  - if: error_budget_remaining <= 25%
    action: deployment_freeze
    allowed_exceptions:
      - P0 incidents
      - Security patches
      - Reliability improvements
    reason: "Error budget nearly exhausted; focus on stability"
```

### Key Insight: Data Removes Politics

Without error budgets, deployment decisions are political:
- Product: "We need to ship this feature now!"
- Engineering: "We need time to fix bugs!"
- Result: Argument based on opinions

With error budgets, deployment decisions are data-driven:
- Error budget: 15% remaining
- Policy: Deployment freeze except reliability improvements
- Result: Data makes the decision; no argument needed

### Google's Canary Approach

Google's Sisyphus framework (internal deployment orchestrator) implements automated canary advancement:

```
Hour 0: Deploy to 1 cluster (0.1% of users)
  ↓
  Monitor for 60 minutes:
    - HTTP 5xx rate
    - Request latency p99
    - Resource consumption per request
  ↓
  Metrics within tolerance? → Advance to next cluster
  Metrics degraded?         → Halt and alert

Hour 1: Deploy to 2 clusters (0.2% of users)
  ↓
  Monitor for 60 minutes
  ↓
  Continue until 100% deployed
```

**Critical insight from Google:** Aggregate metrics mask canary issues.

If you measure overall error rate:
```
Canary (5% traffic): 10% error rate
Stable (95% traffic): 0.1% error rate
Aggregate: (0.05 × 10%) + (0.95 × 0.1%) = 0.5% + 0.095% = 0.595%
```

0.595% aggregate error rate looks fine. But 10% error rate in canary is disaster.

**Solution:** Monitor canary and stable separately. Compare metrics between populations.

### Metric Selection at Google

Quote from SRE book: "Stack-rank metrics based on how well they indicate actual user-perceivable problems."

**High-value metrics:**
- HTTP response codes (4xx = client error, 5xx = server error)
- Request latency percentiles (p50, p95, p99)
- Resource consumption per request (not system-wide)
- Application-level errors specific to service

**Low-value metrics:**
- System-wide CPU (canary is small percentage; won't affect aggregate)
- Total request count (expected to be small for canary)
- Disk usage (usually not related to code changes)

Limit to 5-12 metrics maximum. Each metric adds false positive risk.

### Results at Google Scale

Google's approach yields:
- 99.99%+ uptime for critical services
- <0.5% of deployments require rollback
- Multiple deployments per day per service
- Error budgets align product and reliability goals

## Netflix: Chaos Engineering and Immutable Infrastructure

Netflix operates at massive scale: 250+ million subscribers, hundreds of microservices, hundreds of deployments per day. Their philosophy: don't trust that new code is "safe" just because tests pass. Validate production resilience continuously.

### Spinnaker: Multi-Cloud Deployment Platform

Netflix open-sourced Spinnaker, their continuous delivery platform. Spinnaker implements:

**1. Immutable infrastructure deployments**
- Never modify running servers
- Create new servers with desired state
- Destroy old servers after cutover
- Eliminates configuration drift

**2. Blue-green and canary strategies built-in**
- Declarative deployment pipelines
- Automatic rollback on failure
- Multi-cloud support (AWS, GCP, Azure, Kubernetes)

**3. Integration with chaos engineering**
- Run chaos experiments during canary phase
- Validate resilience before full rollout

### Spinnaker Pipeline Example

```json
{
  "name": "Deploy to Production",
  "stages": [
    {
      "type": "bake",
      "name": "Build AMI",
      "baseOs": "ubuntu",
      "baseLabel": "release",
      "package": "my-service"
    },
    {
      "type": "deploy",
      "name": "Deploy Canary",
      "clusters": [{
        "provider": "aws",
        "region": "us-east-1",
        "capacity": {"desired": 1},
        "strategy": "redblack"
      }]
    },
    {
      "type": "manualJudgment",
      "name": "Canary Analysis",
      "instructions": "Review metrics. Approve to continue.",
      "judgmentInputs": ["Proceed", "Rollback"]
    },
    {
      "type": "deploy",
      "name": "Deploy to All",
      "clusters": [{
        "provider": "aws",
        "region": "us-east-1",
        "capacity": {"desired": 100},
        "strategy": "redblack"
      }]
    }
  ]
}
```

This pipeline:
1. Builds immutable AMI from source code
2. Deploys canary (1 instance)
3. Manual approval after reviewing canary metrics
4. Deploys to full fleet (100 instances)

### Chaos Engineering Integration

Netflix's philosophy: "Constant testing of their ability to succeed despite failure ensures it works when it matters most during unexpected outages."

**The Simian Army** (Netflix's chaos tools):

| Tool | What It Does | Purpose |
|------|--------------|---------|
| Chaos Monkey | Randomly terminates instances | Tests service recovers from instance failure |
| Latency Monkey | Injects network delays | Tests timeout/retry logic |
| Chaos Kong | Simulates entire datacenter failure | Tests multi-region failover |
| Conformity Monkey | Terminates non-compliant instances | Enforces infrastructure standards |

### Chaos Engineering During Deployment

Netflix doesn't just deploy carefully—they intentionally break things during canary phase:

```
Deploy canary (5% traffic)
  ↓
While monitoring canary:
  ├─ Run Chaos Monkey: Kill 2-3 canary instances
  ├─ Run Latency Monkey: Inject 500ms delay to dependencies
  └─ Run DNS test: Simulate service discovery failure
  ↓
Does service recover automatically?
  ├─ YES → Canary passes chaos validation
  │        → Advance to 25% traffic
  │
  └─ NO  → Canary fails chaos validation
           → Rollback immediately
           → Fix resilience gaps before retrying
```

**Key finding:** If new code breaks under chaos, Netflix catches it with 5% of users, not 100%.

### ChAP: Chaos Automation Platform

Modern Netflix approach integrates chaos directly into CI/CD:

```
Deployment pipeline triggers
  ↓
Deploy canary release (5% traffic)
  ↓
ChAP runs automated chaos experiments:
  - Instance termination
  - Network latency injection
  - Dependency failure simulation
  ↓
Canary survives chaos?
  ├─ YES → Advance to next ring
  └─ NO  → Automatic rollback + alert team
```

### Immutable Infrastructure Benefits

Netflix's immutable approach eliminates entire classes of problems:

**Problem with mutable infrastructure:**
```
Server A deployed 6 months ago: Python 3.8, library v1.2
Server B deployed today: Python 3.9, library v1.5
Same code, different behavior → "works on my machine" in production
```

**Solution with immutable infrastructure:**
```
Every deployment creates fresh servers from same image
Server A image: Python 3.9, library v1.5
Server B image: Python 3.9, library v1.5
Identical state → reproducible behavior
```

**Rollback with immutable infrastructure:**
```
Current: Servers running image v47
Deploy: Create new servers running image v48
Problem detected: Destroy v48 servers, scale up v47 servers
Rollback complete in minutes (no configuration to revert)
```

### Results at Netflix Scale

- Hundreds of deployments per day
- 99.9%+ availability despite chaos experiments
- Sub-second failover between AWS regions
- Used to deploy 95% of Netflix infrastructure

## Advanced Progressive Delivery with Flagger

Flagger (by Weaveworks) automates canary advancement using declarative policies and feedback from service mesh or ingress.

### Architecture Overview

```
                    ┌─────────────────┐
                    │ Flagger         │
                    │ Controller      │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ↓                   ↓                   ↓
   ┌─────────┐         ┌─────────┐        ┌──────────┐
   │ Service │         │ Metrics │        │ Alerting │
   │ Mesh    │         │ Provider│        │ (Slack)  │
   │ (Istio) │         │ (Prom)  │        └──────────┘
   └─────────┘         └─────────┘
         │                   │
         │                   │
   Traffic Routing      Metric Analysis
```

Flagger integrates with:
- **Service meshes:** Istio, Linkerd, Kuma (for traffic splitting)
- **Ingress controllers:** NGINX, Traefik, Contour (for HTTP routing)
- **Metrics:** Prometheus, Datadog, New Relic, CloudWatch
- **Alerts:** Slack, MS Teams, Discord, PagerDuty

### Canary Resource Definition

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: payment-api
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-api

  # Progressive delivery configuration
  service:
    port: 9898
    targetPort: 9898

  analysis:
    interval: 1m              # Check metrics every 1 minute
    threshold: 5              # Rollback after 5 consecutive failures
    maxWeight: 50             # Max 50% traffic to canary
    stepWeight: 10            # Increase by 10% each interval

    metrics:
    # Primary SLI: Request success rate
    - name: request-success-rate
      templateRef:
        name: success-rate
        namespace: flagger-system
      thresholdRange:
        min: 99
      interval: 1m

    # Secondary SLI: Request latency
    - name: request-duration
      templateRef:
        name: latency
        namespace: flagger-system
      thresholdRange:
        max: 500
      interval: 1m

    # Custom metric: Business transactions
    - name: transaction-success
      query: |
        sum(rate(
          payment_transactions_total{status="success"}[1m]
        )) / sum(rate(
          payment_transactions_total[1m]
        )) * 100
      thresholdRange:
        min: 95

    # Webhooks for custom validation
    webhooks:
    - name: load-test
      url: http://flagger-loadtester.test/
      timeout: 5s
      metadata:
        type: cmd
        cmd: "hey -z 1m -q 10 -c 2 http://payment-api-canary.production:9898/"

    - name: security-scan
      url: http://security-scanner.test/scan
      timeout: 30s
      metadata:
        service: payment-api-canary
        namespace: production
```

### Automated Rollback Logic

When Flagger detects metric violations:

```
Stage 1: Metric check fails
  ↓
Stage 2: Increment failure counter (1/5)
  ↓
Stage 3: Pause traffic advancement
  ↓
Stage 4: Continue monitoring for next interval
  ↓
Stage 5: Metric still failing?
  ├─ YES → Increment failure counter (2/5, 3/5, ...)
  │
  │        Failure counter >= threshold (5)?
  │        ├─ YES → ROLLBACK
  │        │        - Scale canary to zero
  │        │        - Route all traffic to primary
  │        │        - Alert team via Slack
  │        │        - Mark rollout as failed
  │        │
  │        └─ NO  → Continue monitoring
  │
  └─ NO  → Reset failure counter to 0
           → Resume traffic advancement
```

This prevents false positives (temporary metric blips) while ensuring real problems trigger rollback.

### A/B Testing with Flagger

Beyond canary, Flagger supports A/B testing with session affinity:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: frontend
spec:
  analysis:
    interval: 1m
    iterations: 10

    # A/B testing configuration
    match:
    - headers:
        user-type:
          exact: "beta-tester"

    # Route beta testers to canary
    # Route everyone else to primary
    sessionAffinity:
      cookieName: flagger-cookie
      maxAge: 86400  # 24 hours
```

Users with `user-type: beta-tester` header get routed to canary. Cookie ensures same user always sees same version.

### Blue-Green Mirroring (Shadow Testing)

Flagger can implement shadow testing:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: recommendation-engine
spec:
  analysis:
    interval: 1m
    threshold: 10
    iterations: 10

    # Mirror 100% of traffic to canary
    # Primary serves real responses
    # Canary responses discarded
    mirror: true
    mirrorWeight: 100

    metrics:
    - name: error-rate
      thresholdRange:
        max: 1
    - name: latency-comparison
      query: |
        histogram_quantile(0.99,
          rate(http_request_duration_seconds_bucket{app="recommendation-engine-canary"}[1m])
        ) / histogram_quantile(0.99,
          rate(http_request_duration_seconds_bucket{app="recommendation-engine-primary"}[1m])
        )
      thresholdRange:
        max: 1.2  # Canary must be within 120% of primary latency
```

This validates new version handles production traffic before exposing it to users.

### Integration with GitOps

Flagger works with GitOps tools (ArgoCD, Flux):

```
Developer commits code
  ↓
CI builds container image
  ↓
ArgoCD detects new image in Git
  ↓
ArgoCD updates Deployment manifest
  ↓
Flagger detects Deployment change
  ↓
Flagger initiates canary analysis
  ↓
Flagger automatically promotes or rolls back
```

Entire deployment process is declarative and version-controlled.

## Database Migration Patterns Beyond Expand-Contract

Expand-contract works for simple schema changes. Complex migrations require more sophisticated patterns.

### Dual-Write Synchronization

For complete data structure rewrites (e.g., SQL to NoSQL migration):

```
Phase 1: Parallel writes
  ↓
Application writes to both old DB and new DB
Message queue ensures consistency
  ↓
Phase 2: Validation period
  ↓
Run both for weeks
Compare outputs to ensure consistency
Monitor for divergence
  ↓
Phase 3: Cut over reads
  ↓
Point readers to new DB
Keep old DB as fallback (dual-read)
  ↓
Phase 4: Retire old DB
  ↓
After fully migrated, decommission old DB
```

**Implementation example:**

```python
class DualWriteUserRepository:
    def __init__(self, old_db, new_db, event_queue):
        self.old_db = old_db  # PostgreSQL
        self.new_db = new_db  # DynamoDB
        self.event_queue = event_queue

    def create_user(self, user_data):
        # Write to old DB (source of truth during migration)
        old_id = self.old_db.insert_user(user_data)

        # Async write to new DB
        self.event_queue.publish({
            'type': 'user_created',
            'old_id': old_id,
            'data': user_data
        })

        return old_id

    def get_user(self, user_id):
        # Read from old DB (during Phase 2)
        user_old = self.old_db.get_user(user_id)

        # Compare with new DB (validation)
        user_new = self.new_db.get_user(user_id)

        if user_old != user_new:
            log.error(f"Data divergence detected for user {user_id}")
            alert_team()

        return user_old  # Return from old DB (source of truth)
```

**Phase 3 implementation:**

```python
class CutoverUserRepository:
    def get_user(self, user_id):
        # Primary read from new DB
        try:
            return self.new_db.get_user(user_id)
        except Exception as e:
            log.error(f"New DB read failed: {e}")
            # Fallback to old DB
            return self.old_db.get_user(user_id)
```

### Read-Write Splitting

For databases with complex replication:

```
Phase 1: Writes → New DB, Reads → Old DB + New DB (compare)
  ↓
  Validate consistency
  ↓
Phase 2: Writes → New DB, Reads → New DB (primary), Old DB (fallback)
  ↓
  Monitor error rates
  ↓
Phase 3: Writes → New DB, Reads → New DB only
  ↓
  Old DB remains as archive
  ↓
Phase 4: Old DB decommissioned
```

### Schema Evolution with Prisma/pgroll

Tools like pgroll automate expand-contract migrations:

```sql
-- Migration 1: Expand
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;

-- Migration 2: Backfill
UPDATE users SET email_verified = false WHERE email_verified IS NULL;

-- Migration 3: Make non-nullable
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

-- Migration 4: Add constraint
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
```

pgroll handles versioning, allowing old code to continue using old schema while new code uses new schema.

## Session Management Across Deployments

Stateful applications require special handling during deployments.

### Problem: Distributed Session Loss

```
User logs in → Session stored on Server A (v1)
  ↓
Canary deployment routes user to Server B (v2)
  ↓
Server B doesn't have session → User appears logged out
```

### Solution 1: Distributed Session Store

```
┌──────────┐     ┌──────────┐
│ Server A │────▶│  Redis   │◀────│ Server B │
│   (v1)   │     │ (shared) │     │   (v2)   │
└──────────┘     └──────────┘     └──────────┘
```

Both v1 and v2 read/write sessions to shared Redis.

**Implementation:**

```javascript
// Express.js with Redis session store
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const client = redis.createClient({
  host: 'redis.production.svc.cluster.local',
  port: 6379
});

app.use(session({
  store: new RedisStore({ client }),
  secret: 'session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    maxAge: 86400000  // 24 hours
  }
}));
```

### Solution 2: Session Affinity with Gradual Migration

For long-lived connections (WebSocket, gRPC):

```yaml
# Istio VirtualService with session affinity
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: websocket-service
spec:
  hosts:
  - websocket.example.com
  http:
  - match:
    - headers:
        cookie:
          regex: ".*session=.*"
    route:
    - destination:
        host: websocket-v1
        subset: stable
      weight: 95
    - destination:
        host: websocket-v2
        subset: canary
      weight: 5
    # Session affinity: same session always routes to same version
    consistentHash:
      httpCookie:
        name: session
        ttl: 3600s
```

Users with existing sessions stay on v1. New sessions get routed to canary.

### Solution 3: Graceful Connection Draining

For deployments that require connection closure:

```yaml
# Kubernetes Pod with preStop hook
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: websocket-server
    lifecycle:
      preStop:
        exec:
          command:
          - /bin/sh
          - -c
          - |
            # Send close frame to all connected clients
            kill -TERM 1
            # Wait for clients to disconnect gracefully
            sleep 30
```

This gives clients 30 seconds to reconnect to new version before forcibly terminating.

## Multi-Region Deployments

Coordinating deployments across geographic regions adds complexity.

### Staggered Regional Deployment

```
Timeline:

00:00 - US-East: Deploy canary (5% traffic)
02:00 - US-East: Advance to 50%
04:00 - US-East: Complete at 100%

        ↓ US-East stable for 4 hours

08:00 - EU-West: Deploy canary (5% traffic)
10:00 - EU-West: Advance to 50%
12:00 - EU-West: Complete at 100%

        ↓ EU-West stable for 4 hours

16:00 - APAC: Deploy canary (5% traffic)
18:00 - APAC: Advance to 50%
20:00 - APAC: Complete at 100%
```

**Rationale:** If US-East deployment fails, stop before rolling to other regions. Limits blast radius to single region.

### Ring-Based Regional Progression

```
Ring 0: US-East only (20% of global traffic)
  ↓
  Validate for 8 hours
  ↓
Ring 1: US-East + EU-West (60% of global traffic)
  ↓
  Validate for 8 hours
  ↓
Ring 2: All regions (100% of global traffic)
```

Each ring must stabilize before proceeding.

### Data Consistency During Multi-Region Deployment

**Challenge:** Old version in US-East, new version in EU-West, shared global database.

**Solution 1: Master-Slave Replication**

```
US-East (v1) ──writes──▶ Master DB
                           │
                           │ replication
                           ↓
EU-West (v2) ──reads───▶ Slave DB
```

New version reads from replica. Safe as long as schema is backward-compatible.

**Solution 2: Active-Active with Conflict Resolution**

```
US-East (v1) ──writes──▶ Region DB ◀──writes── EU-West (v2)
                           ▲
                           │
                   Conflict Resolution
                   (Last-Write-Wins)
```

Both regions write to local DB. Changes replicate globally. Conflicts resolved by timestamp.

**Solution 3: Eventual Consistency**

Tolerate temporary divergence:

```
US-East (v1): User updates profile → Write to local DB
                                      ↓
                                  Async replication
                                      ↓
EU-West (v2): User queries profile → Reads from local DB (stale for seconds)
```

Application designed to handle stale reads.

### GitOps for Multi-Region

ArgoCD manages multi-region deployments declaratively:

```yaml
# ApplicationSet for multi-region deployment
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: global-api
spec:
  generators:
  - list:
      elements:
      - region: us-east-1
        ringLevel: 0
      - region: eu-west-1
        ringLevel: 1
      - region: ap-northeast-1
        ringLevel: 2

  template:
    metadata:
      name: 'api-{{region}}'
    spec:
      source:
        repoURL: https://github.com/company/infrastructure
        path: apps/api
        targetRevision: main
        helm:
          parameters:
          - name: region
            value: '{{region}}'
          - name: ringLevel
            value: '{{ringLevel}}'

      destination:
        server: 'https://kubernetes.{{region}}.example.com'
        namespace: production

      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

ArgoCD automatically deploys to regions in ring order.

## Advanced Rollback Patterns

### Rollback with State Migration

**Problem:** New version wrote data in new format. Rollback to old version can't read new format.

**Solution: Backward-compatible rollback**

```
New version deploys:
  - Writes data in new format
  - Also includes fallback reader for old format

Rollback occurs:
  - Old version includes reader for new format (deployed before new version)
  - Can safely read data written by new version
```

**Implementation:**

```python
# Old version (deployed first, includes forward-compatible reader)
class UserRepository_v1:
    def read_user(self, user_id):
        data = self.db.get(user_id)

        # Can read both old and new formats
        if 'preferences' in data:  # New format
            return User.from_json_v2(data)
        else:  # Old format
            return User.from_json_v1(data)

# New version (writes new format)
class UserRepository_v2:
    def write_user(self, user):
        data = user.to_json_v2()  # New format
        self.db.set(user.id, data)
```

Deploy sequence:
1. Deploy v1 with forward-compatible reader
2. Deploy v2 (writes new format)
3. Rollback to v1 works (v1 can read new format)

### Feature Flag Rollback with Cleanup

**Problem:** Feature flag disables feature, but code still deployed. Memory leaks or background processes continue.

**Solution: Staged feature flag rollback**

```yaml
Stage 1: Disable feature for users (flag = off)
  ↓
  Monitor for 24 hours
  ↓
Stage 2: Stop background processes (flag = maintenance_mode)
  ↓
  Monitor for 24 hours
  ↓
Stage 3: Deploy code that removes feature entirely
```

### Automated Rollback with State Verification

```python
class DeploymentController:
    def rollback(self, deployment_id):
        # Step 1: Route traffic to old version
        self.load_balancer.route_to_previous(deployment_id)

        # Step 2: Verify traffic routing
        time.sleep(10)
        current_version = self.load_balancer.get_active_version()
        if current_version != self.get_previous_version(deployment_id):
            raise RollbackFailed("Traffic routing verification failed")

        # Step 3: Verify metrics return to baseline
        time.sleep(60)
        metrics = self.monitoring.get_metrics(window_seconds=60)
        if metrics.error_rate > self.baseline.error_rate * 1.1:
            raise RollbackFailed("Metrics still degraded after rollback")

        # Step 4: Scale down new version
        self.kubernetes.scale_deployment(
            deployment=f"{deployment_id}-canary",
            replicas=0
        )

        # Step 5: Alert team
        self.slack.send_message(
            channel="#deployments",
            text=f"Rollback completed for {deployment_id}"
        )

        return RollbackSuccess()
```

## Deployment Risk Modeling

### DREAD Risk Assessment

Microsoft's DREAD model for deployment risk:

| Factor | Score (1-10) | Reasoning |
|--------|--------------|-----------|
| **Damage** | How bad if deployment fails? | 8 - Payment processing down = revenue loss |
| **Reproducibility** | Can you reproduce the bug? | 7 - Happens under load |
| **Exploitability** | How easy to trigger? | 9 - Normal user behavior triggers |
| **Affected users** | What percentage? | 10 - All users potentially affected |
| **Discoverability** | How likely users find it? | 10 - Immediate user-facing impact |

**Total risk score:** 8 + 7 + 9 + 10 + 10 = 44/50 (High Risk)

**Recommended strategy:** Blue-green or canary with automated rollback

### Error Budget Consumption Model

Calculate how much error budget a deployment consumes:

```
Deployment risk: 0.5% (historical failure rate)
Duration at risk: 1 hour (canary phase)
Users impacted: 5% (canary population)

Error budget consumption = risk × duration × users
                         = 0.005 × 1 hour × 0.05
                         = 0.00025 of monthly error budget

Monthly error budget: 43 minutes (for 99.9% SLO)
Deployment cost: 43 min × 0.00025 = 0.6 seconds

Allowed deployments per month: 43 min / 0.6 sec = 4,300 deployments
```

Low-risk deployments (canary + automated rollback) consume negligible error budget, enabling frequent releases.

High-risk deployments (big-bang, no canary) consume significant budget and must be infrequent.

## Key Takeaways

1. **SLO-driven deployments remove politics** - Error budgets make deployment decisions data-driven
2. **Chaos engineering validates resilience** - Netflix intentionally breaks things during canary to catch problems early
3. **Progressive delivery automates risk management** - Flagger/Argo Rollouts eliminate manual canary decisions
4. **Immutable infrastructure eliminates drift** - Every deployment creates fresh servers with identical state
5. **Multi-region requires coordination** - Staggered rollout prevents global outages
6. **Stateful apps need session management** - Distributed session store or sticky routing required

## Case Study Comparison

| Aspect | Google SRE | Netflix |
|--------|-----------|---------|
| **Philosophy** | SLO-driven, data removes politics | Chaos-driven, validate resilience continuously |
| **Primary strategy** | Canary with automated advancement | Blue-green with chaos testing |
| **Deployment frequency** | Multiple per day per service | Hundreds per day across fleet |
| **Key innovation** | Error budgets align product/reliability | Chaos engineering in production |
| **Rollback trigger** | Automated based on SLO violation | Automated based on chaos validation failure |
| **Infrastructure** | Borg (Kubernetes ancestor) | AWS + Spinnaker |
| **Result** | 99.99%+ uptime, <0.5% rollback rate | 99.9%+ uptime despite chaos experiments |

Both organizations deploy hundreds of times per day with high reliability. Both use automation to remove human error. Both treat deployments as data-driven processes, not manual procedures.

## Further Reading

- **Google SRE Book:** https://sre.google/sre-book/release-engineering/
- **Google SRE Workbook - Canarying:** https://sre.google/workbook/canarying-releases/
- **Netflix Tech Blog - Chaos Engineering:** http://techblog.netflix.com/2015/09/chaos-engineering-upgraded.html
- **Flagger Documentation:** https://docs.flagger.app
- **Spinnaker:** https://spinnaker.io/
- **Martin Fowler - Feature Toggles:** https://martinfowler.com/articles/feature-toggles.html
