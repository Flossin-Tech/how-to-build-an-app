---
title: "Software Design Documentation - Mid-Depth"
phase: "02-design"
topic: "software-design-document"
depth: "mid-depth"
reading_time: 25
prerequisites: ["software-design-document-surface"]
related_topics: ["architecture-design", "api-design", "database-design"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-15"
---

# Software Design Documentation - Mid-Depth

Design docs prevent the most expensive kind of rework - the kind where you've built the wrong thing correctly. This guide covers how to write different types of design docs, get them reviewed, and keep them useful after the code ships.

## 1. Structure for Different Audiences

The same design needs different presentations. Your CTO needs to understand risk and cost. Your engineers need implementation details. Your ops team needs to know what breaks at 3am.

### Executive Summary (1 page max)

Skip the introduction and get straight to decisions:

```markdown
## Executive Summary

**What we're building**: Async job processing system for customer reports
**Why now**: Current sync processing timing out (>30s) for 15% of customers
**Cost**: 2 engineers, 4 weeks + $400/mo infrastructure
**Risk**: Requires data migration, 2-week parallel run period
**Decision needed by**: 2025-11-22 (Black Friday prep deadline)

### Key Trade-offs
- **Build vs SaaS**: Building on existing Postgres + Redis vs $2k/mo for managed queue
- **Recommendation**: Build - we need custom retry logic for financial reconciliation
```

Executives rarely read past page one. If they do, they're looking for risks you didn't mention up front.

### Engineering Design Doc

Engineers need to implement this. Give them the information in the order they'll use it:

```markdown
## Engineering Design

### Context
Current report generation blocks HTTP requests. P95 latency is 8s, P99 is 45s.
We've exhausted the obvious optimizations (added indexes, denormalized common queries).

### Goals
- Reports complete within 60s for 99.9% of requests
- No customer-visible failures during migration
- Maintain audit trail (we're SOC2 certified)

### Non-Goals
- Real-time report updates (async is acceptable)
- Sub-second report generation (60s is fine)
- Support for reports >10MB (separate project)

### Proposed Solution
Background job system using:
- **Queue**: Redis Lists (we already run Redis for cache)
- **Workers**: Go workers in existing deployment
- **Storage**: Postgres (reports table already exists)
- **Notifications**: WebSocket + polling fallback

### Alternatives Considered
1. **AWS SQS + Lambda**: $2k/mo, but we need longer than 15min execution time
2. **Celery**: Adds Python dependency to Go stack
3. **Database polling**: Tried it, creates excessive DB load

### Implementation Plan
**Phase 1** (Week 1): Queue infrastructure, no customer impact
**Phase 2** (Week 2): Parallel run - write to both sync and async paths
**Phase 3** (Week 3): Feature flag to 10% of traffic
**Phase 4** (Week 4): Full rollout, remove old code

### Success Metrics
- P99 latency < 500ms for report request endpoint
- Job completion rate > 99.9%
- Zero data loss during migration (audit both systems)

### Risks
- **Redis failure loses queued jobs**: Mitigation in Phase 2
- **Worker crashes during report generation**: Jobs are idempotent, safe to retry
- **Monitoring gaps**: Add metrics before Phase 3
```

This answers the questions engineers ask during implementation: "Why are we doing this?" and "What happens if X fails?"

### Operations Runbook Section

Ops doesn't read design docs unless something's on fire. Put their section at the end with a clear heading they can search for:

```markdown
## Operations Guide

### New Infrastructure
- **Redis**: Using existing cluster, added `reports:queue` namespace
- **Workers**: 3 new processes in app deployment (scale with CPU, not separately)
- **Monitoring**: Datadog dashboard "Report Generation"

### What Normal Looks Like
- Queue depth: 0-50 jobs (spikes to 200 during business hours)
- Worker processing time: P50=12s, P95=45s, P99=58s
- Redis memory: +50MB for queue data

### Alerts You'll Get
- `ReportQueueDepthHigh`: Queue >500 jobs for 5+ minutes
  - **Likely cause**: Worker deployment scaled down or crashed
  - **Fix**: Check worker logs, scale up if needed
  - **Impact**: Reports delayed but not lost

- `ReportJobFailureRateHigh`: >1% jobs failing
  - **Likely cause**: Database connectivity or bad data
  - **Fix**: Check recent deploys, review failed job errors in logs
  - **Impact**: Customers see "Report generation failed" error

### Rollback Procedure
If deployment fails:
1. Feature flag `async_reports` to 0% (takes effect immediately)
2. Old code path still exists, will work
3. Queued jobs will complete, no data loss
4. File incident, we'll investigate

### Data Migration Notes
- Old reports in `reports` table, `status='completed'`
- New async reports have `job_id` field populated
- Both paths write to same table, safe to query either way
```

Operations teams appreciate terseness. Tell them what changed, what breaks, how to fix it.

## 2. Document API Contracts Before Implementation

API specs are contracts. Write them before implementation so frontend and backend can work in parallel, and you catch design mistakes when they're cheap to fix.

### OpenAPI Specification

OpenAPI (formerly Swagger) is the standard. It's verbose but tooling is excellent - you get docs, client libraries, and validation for free.

```yaml
openapi: 3.0.0
info:
  title: Report Generation API
  version: 2.0.0
  description: |
    Async report generation. Request a report, poll for completion.
    Reports are retained for 30 days.

paths:
  /api/v2/reports:
    post:
      summary: Request a new report
      description: |
        Initiates async report generation. Returns immediately with job ID.
        Poll GET /api/v2/reports/{jobId} for completion.

      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [reportType, startDate, endDate]
              properties:
                reportType:
                  type: string
                  enum: [sales, inventory, customers]
                  description: Type of report to generate

                startDate:
                  type: string
                  format: date
                  example: "2025-01-01"

                endDate:
                  type: string
                  format: date
                  example: "2025-01-31"

                filters:
                  type: object
                  description: Report-specific filters (see docs for each reportType)
                  additionalProperties: true

      responses:
        '202':
          description: Report generation started
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobId:
                    type: string
                    format: uuid
                    example: "550e8400-e29b-41d4-a716-446655440000"

                  status:
                    type: string
                    enum: [queued]

                  estimatedCompletionTime:
                    type: string
                    format: date-time
                    description: Rough estimate, not guaranteed

        '400':
          description: Invalid request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

        '429':
          description: Rate limit exceeded (10 reports per hour)
          headers:
            Retry-After:
              schema:
                type: integer
              description: Seconds until rate limit resets

  /api/v2/reports/{jobId}:
    get:
      summary: Check report status
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
            format: uuid

      responses:
        '200':
          description: Job status
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/JobQueued'
                  - $ref: '#/components/schemas/JobProcessing'
                  - $ref: '#/components/schemas/JobCompleted'
                  - $ref: '#/components/schemas/JobFailed'

        '404':
          description: Job not found or expired (jobs retained 30 days)

components:
  schemas:
    JobQueued:
      type: object
      properties:
        jobId: {type: string, format: uuid}
        status: {type: string, enum: [queued]}
        createdAt: {type: string, format: date-time}
        queuePosition: {type: integer, description: "Approximate position in queue"}

    JobProcessing:
      type: object
      properties:
        jobId: {type: string, format: uuid}
        status: {type: string, enum: [processing]}
        createdAt: {type: string, format: date-time}
        startedAt: {type: string, format: date-time}
        progress: {type: integer, minimum: 0, maximum: 100, description: "Best effort estimate"}

    JobCompleted:
      type: object
      properties:
        jobId: {type: string, format: uuid}
        status: {type: string, enum: [completed]}
        createdAt: {type: string, format: date-time}
        completedAt: {type: string, format: date-time}
        downloadUrl: {type: string, format: uri, description: "Signed URL, valid for 1 hour"}
        expiresAt: {type: string, format: date-time, description: "When report is deleted"}

    JobFailed:
      type: object
      properties:
        jobId: {type: string, format: uuid}
        status: {type: string, enum: [failed]}
        createdAt: {type: string, format: date-time}
        failedAt: {type: string, format: date-time}
        error:
          type: object
          properties:
            code: {type: string, example: "INVALID_DATE_RANGE"}
            message: {type: string, example: "Date range cannot exceed 1 year"}
            retryable: {type: boolean, description: "Whether retrying might succeed"}

    Error:
      type: object
      properties:
        code: {type: string}
        message: {type: string}
        details: {type: object, additionalProperties: true}
```

This spec is long, but you write it once and generate:
- Interactive docs (Swagger UI, ReDoc)
- Client libraries (typescript-fetch, go, python)
- Server stubs (validation middleware)
- Mock servers (Prism) - frontend can develop against fake API

### Contract Testing

The spec is worthless if implementation drifts. Contract tests catch this:

```javascript
// contract.test.js - runs in CI
const OpenAPIValidator = require('express-openapi-validator');
const request = require('supertest');
const app = require('./app');

describe('API Contract', () => {
  test('POST /api/v2/reports matches OpenAPI spec', async () => {
    const response = await request(app)
      .post('/api/v2/reports')
      .send({
        reportType: 'sales',
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

    // This fails if response doesn't match spec
    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('jobId');
    expect(response.body.status).toBe('queued');
  });

  test('Invalid date range returns 400', async () => {
    const response = await request(app)
      .post('/api/v2/reports')
      .send({
        reportType: 'sales',
        startDate: '2025-01-31',
        endDate: '2025-01-01'  // End before start
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: expect.any(String),
      message: expect.any(String)
    });
  });
});
```

## 3. Success Metrics and Acceptance Criteria

Design docs should answer: "How do we know when this is done and working?"

### Measurable Success Criteria

Vague goals create endless debates. Specific numbers create shared understanding:

**Bad**:
- Improve performance
- Make reports faster
- Better user experience

**Good**:
```markdown
## Success Metrics

### Performance (measured via Datadog)
- **P95 request latency** for POST /api/v2/reports: <500ms (currently 8s)
- **P99 job completion time**: <60s (currently N/A - requests timeout)
- **Throughput**: 100 concurrent report generations (currently 10)

### Reliability (measured via logs + error tracking)
- **Job completion rate**: >99.9% (excluding user errors like invalid dates)
- **Data accuracy**: 100% - async reports must match sync reports during parallel run
- **Zero data loss**: All queued jobs complete, even during deploys

### User Experience (measured via analytics)
- **Abandonment rate**: <5% of users leaving page while report generates
- **Support tickets**: <10/month about "slow reports" (currently 40/month)

### Business Impact (measured via usage analytics)
- **Report generation volume**: No decrease (proves users trust new system)
- **Peak hour usage**: Increase of 20% (users avoid peak hours due to timeouts)

### Acceptance Criteria (must all pass before GA)
- [ ] 1 week at 100% traffic with no SEV2+ incidents
- [ ] All success metrics met in production
- [ ] Ops team has runbook and has practiced rollback
- [ ] Old sync code path removed (no dead code in production)
```

These numbers create clear doneness criteria. No endless "just one more tweak" cycles.

### Non-Functional Requirements

Performance and security aren't optional extras. They're requirements:

```markdown
## Non-Functional Requirements

### Performance
- **Response time**: API endpoints <500ms P95
- **Job processing**: Reports complete in <60s P99
- **Scalability**: Handle 10x current load (500 concurrent jobs)

### Security
- **Authentication**: All endpoints require valid JWT
- **Authorization**: Users can only request reports for their organization
- **Data retention**: Reports auto-delete after 30 days (GDPR)
- **Audit trail**: Log all report requests and completions (SOC2)

### Reliability
- **Availability**: 99.9% uptime (43 minutes/month downtime budget)
- **Data durability**: Zero report loss even during infrastructure failures
- **Graceful degradation**: If workers are down, API still accepts requests

### Observability
- **Logging**: All errors logged with context (jobId, userId, timestamp)
- **Metrics**: Queue depth, processing time, failure rate
- **Tracing**: End-to-end trace from API request to job completion
- **Alerting**: Page on-call if queue depth >1000 or failure rate >1%

### Maintainability
- **Documentation**: OpenAPI spec stays in sync with implementation
- **Testing**: >80% code coverage, contract tests for all APIs
- **Deployment**: Zero-downtime deploys, automated rollback on errors
```

These often get forgotten until production. Writing them down forces the conversation early.

## 4. Design Review Process

Design reviews catch mistakes when they're cheap to fix. The goal isn't consensus - it's to surface information the author didn't have.

### Lightweight Review for Small Changes

Not everything needs a formal review. Use this threshold:

**Needs formal review**:
- New API endpoints or changes to existing contracts
- Database schema changes
- New infrastructure (queues, caches, third-party services)
- Changes affecting multiple teams
- Anything customer-visible

**Doesn't need formal review**:
- Refactoring with no behavior change
- Bug fixes that don't change architecture
- Internal implementation details
- Performance optimizations (unless they change guarantees)

### Review Template

```markdown
## Design Review Checklist

**Author**: @jane
**Reviewers**: @backend-team, @ops-team
**Review deadline**: 2025-11-18 (need 3 business days for feedback)
**Decision maker**: @engineering-manager (tie-breaker if no consensus)

### Review Focus Areas
- [ ] **Scalability**: Can this handle 10x growth?
- [ ] **Failure modes**: What happens when Redis/DB/workers fail?
- [ ] **Monitoring**: Can we detect problems before customers complain?
- [ ] **Migration risk**: Safe rollback plan?
- [ ] **Operational complexity**: Can on-call handle this at 3am?
- [ ] **Security**: Any new attack surface?
- [ ] **Cost**: Ongoing operational cost acceptable?

### Questions for Reviewers
1. We chose Redis over SQS because we need >15min processing time. Anyone know if SQS extended timeouts would work?
2. Parallel run period is 1 week - too short? Too long?
3. Ops team: Is Datadog dashboard sufficient or need custom alerting?

### Review Comments
- **@ops-team**: Add metric for job age (oldest job in queue). Queue depth can be low but if oldest job is 1hr old, something's wrong.
- **@security**: Signed download URLs are good, but set Content-Disposition header to prevent XSS if report contains user data.
- **@backend-lead**: Consider idempotency keys for POST /reports - users might retry if it feels slow.
```

### Review Timeline

```
Day 1: Author posts design doc
Day 2-3: Reviewers read and comment
Day 4: Review meeting (30min) - only to discuss contention, not rehash doc
Day 5: Author updates doc based on feedback
Day 6: Final approval or another round
```

If reviews take longer than a week, your process is broken. Either split the design into smaller pieces or you're trying to get consensus from too many people.

## 5. Link Design to Threat Models and Requirements

Design docs don't exist in isolation. They implement requirements and address threats.

### Traceability Matrix

```markdown
## Requirements Traceability

| Requirement ID | Description | Implementation |
|----------------|-------------|----------------|
| REQ-001 | Reports complete in <60s | Async job processing |
| REQ-002 | Audit trail for compliance | Log all job state changes |
| REQ-003 | No data loss during deploys | Persistent queue (Redis), idempotent jobs |
| SEC-001 | Users only see their org's data | Authorization check in job worker |
| SEC-002 | Reports auto-delete (GDPR) | Cron job deletes reports >30 days old |
| OPS-001 | Zero-downtime deploys | Feature flag controls rollout |
```

This answers: "Why did we build it this way?" Six months later, when someone wants to remove the audit logging to save money, you can point to the SOC2 requirement.

### Threat Model Integration

Reference specific threats from your threat model:

```markdown
## Security Considerations

### Threat: Unauthorized Report Access (Threat ID: TM-023)
**Risk**: User modifies jobId in URL to access another user's report
**Mitigation**:
- Job records include `userId` field
- GET /reports/{jobId} checks `job.userId == currentUser.id`
- Returns 404 (not 403) to avoid leaking job existence

### Threat: Report Contains PII (Threat ID: TM-024)
**Risk**: Reports cached or logged, creating PII exposure
**Mitigation**:
- Download URLs are signed, 1-hour expiration
- Reports served with `Cache-Control: no-store`
- Logs contain jobId but never report contents
- Reports auto-delete after 30 days

### Threat: Queue Poisoning (Threat ID: TM-025)
**Risk**: Malicious job data crashes workers repeatedly
**Mitigation**:
- Input validation before queueing
- Worker catches all exceptions, marks job failed
- Dead letter queue for jobs failing >3 times
- Monitoring alerts on DLQ depth
```

Linking to threat IDs creates bidirectional traceability. You can answer both "How did we mitigate this threat?" and "Why does this code exist?"

## 6. RFC Process for Major Changes

RFCs (Request for Comments) are design docs for decisions that affect multiple teams or are hard to reverse. Not every design needs an RFC - use them when the cost of being wrong is high.

### When to Write an RFC

**Use RFC**:
- Changing API contracts (breaking changes)
- Choosing between databases, languages, or frameworks
- Architectural patterns (microservices, event sourcing)
- Cross-team dependencies

**Don't use RFC**:
- Team-internal implementation details
- Easily reversible decisions
- Experiments or prototypes

### RFC Template

```markdown
# RFC-012: Async Report Generation

**Status**: Accepted
**Author**: @jane
**Created**: 2025-11-10
**Accepted**: 2025-11-15
**Supersedes**: None
**Superseded by**: None

## Summary
Replace synchronous report generation (blocking HTTP requests) with async job queue system to improve P95 latency from 8s to <500ms and support reports that take >30s to generate.

## Motivation
We're seeing 15% of report requests timeout. This is increasing support load and preventing us from launching larger reports (currently capped at 1000 rows, customers want 100k rows).

Sync processing is fundamentally limited - we can't make DB queries 10x faster, but we can move them off the HTTP request path.

## Detailed Design

### API Changes
**Before**:
```
POST /api/v1/reports
Response (after 8s): { "data": [...], "format": "csv" }
```

**After**:
```
POST /api/v2/reports
Response (immediate): { "jobId": "abc123", "status": "queued" }

GET /api/v2/reports/abc123
Response: { "status": "completed", "downloadUrl": "https://..." }
```

**Breaking change**: Frontend must be updated to poll for completion

### Infrastructure
- **Queue**: Redis Lists (already in use for cache)
- **Workers**: 3 processes in existing app deployment
- **Cost**: ~$50/mo (Redis memory increase)

### Migration Strategy
1. Launch v2 API alongside v1
2. Migrate frontend to v2 over 2 weeks
3. Deprecate v1 (6-month notice)
4. Remove v1 code

## Alternatives Considered

### A. Keep Sync, Optimize Queries
Tried this. Added indexes, denormalized data. Got P95 from 15s to 8s but can't go further without major schema changes.

**Why rejected**: Doesn't solve >30s timeout limit

### B. Streaming Response
Start sending CSV rows as they're generated.

**Why rejected**: Doesn't help mobile clients (need complete file). Complicates error handling (what if query fails halfway through?).

### C. AWS SQS + Lambda
Managed queue service.

**Why rejected**: Lambda 15min timeout too short for future reports. Would cost $2k/mo vs $50/mo for Redis.

## Open Questions
- ~~Should we support webhooks for completion notification?~~ **Resolved**: Not v1, can add later
- ~~What happens to queued jobs during deploy?~~ **Resolved**: Redis persists queue, jobs resume after deploy

## Success Metrics
- P95 latency <500ms (from 8s)
- Support tickets about slow reports <10/month (from 40/month)
- No regression in report accuracy (100% match during parallel run)

## Risks

### Risk: Queue Depth Grows Unbounded
**Likelihood**: Medium
**Impact**: High (Redis OOM, workers can't keep up)
**Mitigation**: Alert on queue depth >500. Rate limit per user (10 reports/hour). Auto-scale workers based on queue depth.

### Risk: Breaking Change Breaks Mobile App
**Likelihood**: Low
**Impact**: High (can't roll back mobile apps)
**Mitigation**: Support both v1 and v2 for 6 months. Feature flag mobile app updates.

## Timeline
- Week 1: Infrastructure + parallel run
- Week 2-3: Frontend migration
- Week 4: Monitor at 100% traffic
- Week 5: Remove feature flag

## Reviewers
- @backend-team: Implementation details
- @frontend-team: API contract
- @ops-team: Operational impact
- @product: Customer experience during migration
```

### RFC Workflow

```
1. Draft: Author writes RFC, marks status "Draft"
2. Comment period: 1 week for feedback
3. Review meeting: 1 hour, discuss major concerns
4. Revision: Author updates based on feedback
5. Decision: "Accepted", "Rejected", or "Needs more investigation"
6. Implementation: Build it
7. Retrospective: After launch, update RFC with what actually happened
```

RFCs that skip the retrospective step are half-done. The most valuable part is comparing what you predicted vs what actually happened.

## 7. Architecture Decision Records (ADRs) at Scale

ADRs are lightweight RFCs. They answer: "Why did we do it this way?" when someone asks six months later.

### ADR Format

```markdown
# ADR-023: Use Redis for Job Queue

**Date**: 2025-11-10
**Status**: Accepted
**Deciders**: @jane, @backend-lead, @ops-lead
**Context**: Need async job processing for report generation

## Decision
Use Redis Lists for job queue instead of managed queue service (SQS, Google Pub/Sub) or database polling.

## Rationale
- Already running Redis for caching, no new infrastructure
- Redis Lists support BLPOP (blocking pop) for efficient worker polling
- Can handle our scale (500 jobs/hour peak)
- Cheap ($50/mo vs $2k/mo for managed services)

## Consequences

**Positive**:
- Low operational cost
- Familiar technology (team knows Redis)
- Fast implementation (no new service to learn)

**Negative**:
- Redis is single point of failure (but we already depend on it for cache)
- No built-in dead letter queue (we'll build our own)
- Manual scaling (managed services auto-scale)

**Neutral**:
- Need to monitor queue depth ourselves

## Follow-up
- Set up Redis replication (currently single instance)
- Implement dead letter queue for failed jobs
- Add CloudWatch alarms for queue depth

## Superseded by
None (still current as of 2025-11-15)
```

### ADR Organization

```
docs/adr/
  0001-use-typescript.md
  0002-postgres-over-mongodb.md
  0023-redis-for-job-queue.md
  0024-openapi-for-api-specs.md
  README.md  (index with status and summary)
```

Number them sequentially. When an ADR is superseded, don't delete it - update the status and link to the new one:

```markdown
# ADR-023: Use Redis for Job Queue

**Date**: 2025-11-10
**Status**: Superseded by ADR-045
**Superseded on**: 2026-03-15

[Original content preserved]

## Why Superseded
Redis became a bottleneck at 5000 jobs/hour. Moved to AWS SQS for auto-scaling.
See ADR-045 for new architecture.
```

This creates a history of decisions, which is valuable when you're debugging why something works the way it does.

## 8. Template Library

Don't start from scratch every time. Here are templates for common design docs.

### API Design Template

```markdown
# API Design: {Feature Name}

## Overview
**What**: {One sentence - what does this API do?}
**Why**: {Why are we building this?}
**Who**: {Which clients will use this - web, mobile, internal services?}

## API Specification

### Endpoints
```
POST   /api/v2/resources
GET    /api/v2/resources/{id}
PATCH  /api/v2/resources/{id}
DELETE /api/v2/resources/{id}
```

### Request/Response Examples
{Include actual JSON examples, not just schemas}

### Error Handling
{What errors can occur? What HTTP status codes?}

### Rate Limits
{What are the limits? How are they enforced?}

### Versioning
{Is this v1 or v2? Migration plan from old version?}

## OpenAPI Specification
{Link to openapi.yaml file or embed it}

## Authentication & Authorization
{Who can call this API? How do they authenticate?}

## Non-Functional Requirements
**Performance**: {Expected latency, throughput}
**Reliability**: {Uptime target, error budget}
**Security**: {What security measures?}

## Implementation Plan
{Rough timeline, dependencies}

## Testing Strategy
{Unit tests, integration tests, contract tests}

## Monitoring & Alerting
{What metrics? What alerts?}

## Rollout Plan
{Feature flags? Gradual rollout? Migration period?}
```

### Database Design Template

```markdown
# Database Design: {Feature Name}

## Schema Changes

### New Tables
```sql
CREATE TABLE report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  report_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- queued, processing, completed, failed
  parameters JSONB NOT NULL,
  result_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_report_jobs_user_created ON report_jobs(user_id, created_at DESC);
CREATE INDEX idx_report_jobs_status ON report_jobs(status) WHERE status IN ('queued', 'processing');
```

### Modified Tables
{ALTER TABLE statements}

### Data Migration
{How do we migrate existing data? Backfill scripts?}

## Query Patterns

### Expected Queries
```sql
-- Worker picks next job (called 100/sec)
SELECT id FROM report_jobs
WHERE status = 'queued'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- User checks job status (called 1000/sec)
SELECT status, result_url, error_message
FROM report_jobs
WHERE id = $1 AND user_id = $2;
```

### Query Performance
{Expected query times, explain plans if needed}

## Indexing Strategy
{Why these indexes? What queries do they support?}

## Data Retention
{How long do we keep this data? Deletion strategy?}

## Rollback Plan
{How do we undo this migration if it fails?}

## Testing
{How do we test migration? Test data setup?}
```

### Infrastructure Design Template

```markdown
# Infrastructure Design: {Service Name}

## Architecture Diagram
{Diagram showing components and data flow}

## Components

### {Component Name}
**Technology**: {e.g., Redis 7.0}
**Purpose**: {What does it do?}
**Sizing**: {CPU, memory, disk}
**Scaling**: {How does it scale?}
**Cost**: {Monthly cost estimate}

## Data Flow
1. {Step 1}
2. {Step 2}
...

## Failure Modes

### {Component} Fails
**Impact**: {What breaks?}
**Detection**: {How do we know?}
**Recovery**: {How do we fix it?}
**Mitigation**: {How do we prevent it?}

## Monitoring

### Metrics
- {Metric name}: {What it measures, alert threshold}

### Alerts
- {Alert name}: {When it fires, how to respond}

## Security
{Network security, access control, encryption}

## Disaster Recovery
{Backup strategy, RTO, RPO}

## Cost Analysis
{Monthly cost breakdown by component}

## Rollout Plan
{How do we launch this safely?}
```

## 9. Design Review Checklists

Use checklists to ensure you don't miss common failure modes.

### API Design Checklist

```markdown
## API Design Review

### Contract
- [ ] OpenAPI spec exists and validates
- [ ] All error cases documented with HTTP status codes
- [ ] Request/response examples for happy path and errors
- [ ] Versioning strategy (v1, v2, etc.)
- [ ] Breaking changes called out explicitly

### Security
- [ ] Authentication method specified
- [ ] Authorization rules documented (who can access what)
- [ ] Input validation rules defined
- [ ] Rate limiting strategy
- [ ] No sensitive data in URLs or logs

### Performance
- [ ] Expected latency documented (P50, P95, P99)
- [ ] Throughput requirements specified
- [ ] Caching strategy if applicable
- [ ] Pagination for list endpoints

### Reliability
- [ ] Idempotency for non-GET requests
- [ ] Retry guidance for clients
- [ ] Timeout recommendations
- [ ] Circuit breaker if calling external services

### Developer Experience
- [ ] Clear error messages (not just "invalid input")
- [ ] Consistent naming conventions
- [ ] Follows existing API patterns in codebase
- [ ] Client library generation plan

### Operations
- [ ] Monitoring metrics defined
- [ ] Alerts for error rates, latency
- [ ] Logging plan (what to log, what not to log)
- [ ] Graceful degradation strategy

### Migration
- [ ] Backward compatibility plan
- [ ] Feature flag if needed
- [ ] Rollback procedure
- [ ] Communication plan for API consumers
```

### Database Design Checklist

```markdown
## Database Review

### Schema
- [ ] Primary keys on all tables
- [ ] Foreign key constraints for referential integrity
- [ ] NOT NULL constraints where appropriate
- [ ] CHECK constraints for data validation
- [ ] Indexes for common query patterns
- [ ] No indexes on columns that are rarely queried

### Performance
- [ ] Query patterns documented with expected frequency
- [ ] EXPLAIN plans for slow queries
- [ ] Index size estimated (don't index everything)
- [ ] Partitioning strategy if table will be large (>10M rows)

### Data Integrity
- [ ] Uniqueness constraints where needed
- [ ] Cascade delete rules defined
- [ ] Soft delete vs hard delete decision documented
- [ ] Audit trail if required for compliance

### Migration
- [ ] Migration is reversible (down migration exists)
- [ ] Migration tested on production-sized data
- [ ] Lock duration estimated for ALTER TABLE
- [ ] Zero-downtime strategy if needed
- [ ] Backfill script for existing data

### Operations
- [ ] Backup impact assessed (larger DB = longer backups)
- [ ] Retention policy documented
- [ ] Archival strategy for old data
- [ ] Monitoring for table size growth
```

### Infrastructure Design Checklist

```markdown
## Infrastructure Review

### Scalability
- [ ] Auto-scaling rules defined
- [ ] Load testing plan
- [ ] Can handle 10x current load
- [ ] Bottlenecks identified

### Reliability
- [ ] Single points of failure identified and mitigated
- [ ] Health check endpoints
- [ ] Graceful shutdown behavior
- [ ] Disaster recovery plan (backup, restore)

### Security
- [ ] Network security groups configured
- [ ] Secrets management (no hardcoded credentials)
- [ ] Encryption at rest and in transit
- [ ] Minimal IAM permissions

### Observability
- [ ] Metrics exported to monitoring system
- [ ] Logs structured and queryable
- [ ] Distributed tracing if microservices
- [ ] Alerts defined with runbooks

### Cost
- [ ] Monthly cost estimated
- [ ] Cost alarms configured
- [ ] Cheaper alternatives considered
- [ ] Reserved instances if long-term

### Operations
- [ ] Deployment strategy (blue/green, rolling, canary)
- [ ] Rollback procedure
- [ ] On-call runbook exists
- [ ] Failure scenarios practiced
```

## 10. Keeping Docs Synchronized with Code

Documentation rots. The only way to prevent it is to make it fail loudly when out of sync.

### Documentation as Code

Store docs in the repo, version them with code:

```
/docs
  /api
    openapi.yaml        # Source of truth
  /adr
    0001-decision.md
  /design
    report-system.md
/src
  /api
    reports.go
/tests
  /contract
    api-contract.test.js  # Fails if code doesn't match openapi.yaml
```

When you merge code, you merge its documentation. No separate wiki that drifts.

### Contract Testing in CI

```yaml
# .github/workflows/test.yml
name: Tests
on: [pull_request]
jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate OpenAPI spec
        run: |
          npx @stoplight/spectral-cli lint docs/api/openapi.yaml

      - name: Test API matches spec
        run: |
          npm test -- tests/contract/

      - name: Generate client library
        run: |
          npx openapi-generator-cli generate \
            -i docs/api/openapi.yaml \
            -g typescript-fetch \
            -o /tmp/client

          # If spec is invalid, this fails

      - name: Check ADR links
        run: |
          # Fail if ADRs reference non-existent files
          ./scripts/validate-adr-links.sh
```

If the spec and code diverge, CI fails. This forces you to update docs or fix the code.

### Generated Documentation

Generate docs from code when possible:

```go
// Worker processes background jobs from the queue
type Worker struct {
    redis    *redis.Client
    logger   *log.Logger
    handlers map[string]JobHandler
}

// Start begins processing jobs. Blocks until context is cancelled.
// Returns error only if redis connection fails on startup.
func (w *Worker) Start(ctx context.Context) error {
    // ...
}
```

Then:

```bash
godoc -http=:6060  # Generates HTML docs from comments
```

Code comments can't drift from code - they're in the same file. You still need design docs for the "why", but API docs can be generated.

### Documentation Review in PRs

Make docs a required review item:

```markdown
## Pull Request Template

### Changes
{What changed?}

### Documentation Updates
- [ ] OpenAPI spec updated (if API changed)
- [ ] ADR added (if architectural decision)
- [ ] Runbook updated (if ops impact)
- [ ] README updated (if setup changed)
- [ ] N/A - no documentation needed

### Reviewer Checklist
- [ ] Code matches design doc
- [ ] Tests match acceptance criteria
- [ ] Metrics added per design doc
```

If the PR touches API code but doesn't update the OpenAPI spec, reviewer asks why.

### Living Documentation

Some docs are generated from production:

```javascript
// Generate API usage examples from real traffic
const express = require('express');
const app = express();

app.use((req, res, next) => {
  if (process.env.GENERATE_DOCS) {
    // Sample 1% of requests
    if (Math.random() < 0.01) {
      logRequestExample({
        method: req.method,
        path: req.path,
        body: req.body,
        response: res.locals.response  // Captured later
      });
    }
  }
  next();
});
```

Then periodically:

```bash
# Generate examples from logs
node scripts/generate-api-examples.js > docs/api/real-examples.md
```

Real examples are more useful than made-up ones, and they can't drift because they're from production.

### Documentation Metrics

Track documentation health:

```markdown
## Documentation Health Dashboard

**Coverage**:
- API endpoints documented: 47/50 (94%)
- API endpoints with examples: 45/50 (90%)
- Database tables documented: 23/25 (92%)

**Freshness**:
- Docs updated in last 30 days: 67%
- Docs updated in last 90 days: 89%
- Stale docs (>6 months): 3

**Quality**:
- Broken links: 2
- TODOs in docs: 8
- OpenAPI spec validates: Yes
- Contract tests passing: Yes
```

This makes documentation health visible. When coverage drops, you notice.

## Summary

Good design docs prevent expensive mistakes. They're most valuable when they:

1. **Start before code** - API contracts written first let frontend and backend develop in parallel
2. **Target specific audiences** - Executives need risks, engineers need implementation details, ops needs runbooks
3. **Include success metrics** - "P95 latency <500ms" not "improve performance"
4. **Link to requirements** - Traceability answers "why did we build it this way?"
5. **Are versioned with code** - Docs in the repo, not a separate wiki
6. **Fail loudly when wrong** - Contract tests catch drift automatically
7. **Focus on decisions** - Document the "why" and the alternatives considered

The goal isn't comprehensive documentation. It's documentation that stays useful after the code ships. Write docs that answer the questions your future self will ask six months from now when debugging a production incident at 2am.

Start with templates. Review them like code. Test them automatically. Delete them when they're obsolete. Documentation is code - treat it like code.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Architecture Design](../../architecture-design/mid-depth/index.md) - Related design considerations
- [Dependency Review](../../dependency-review/mid-depth/index.md) - Related design considerations
- [Data Flow Mapping](../../data-flow-mapping/mid-depth/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
