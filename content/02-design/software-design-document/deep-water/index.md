---
title: "Software Design Document - Deep Water"
phase: "02-design"
topic: "software-design-document"
depth: "deep-water"
reading_time: 50
prerequisites: ["software-design-document-surface"]
related_topics: ["architecture-design", "api-design", "deployment-strategies", "incident-response"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Software Design Document - Deep Water

This is advanced documentation practices for systems at scale - the techniques that keep architecture decisions visible, APIs discoverable, and incidents recoverable.

## Architecture Decision Records (ADRs)

ADRs are short documents that capture important architectural decisions and their context. The format Michael Nygard proposed in 2011 remains the standard because it works.

### ADR Template

```markdown
# ADR-0015: Use PostgreSQL for Transactional Data

Date: 2025-11-15
Status: Accepted
Supersedes: ADR-0003

## Context

We need a primary database for customer orders, inventory, and payment
processing. Current volume is 10k orders/day with peaks at 50k. We need
ACID guarantees for financial transactions and complex querying for
reporting.

We evaluated PostgreSQL, MySQL, and CockroachDB over two weeks using
production-scale data.

## Decision

We will use PostgreSQL 16 as our primary transactional database.

## Consequences

Positive:
- Strong ACID guarantees for financial data
- JSON support for flexible product attributes
- Mature tooling (pgAdmin, pg_stat_statements)
- Team has 5 years PostgreSQL experience
- Cost: $800/month for managed instance vs $2500 for CockroachDB

Negative:
- Vertical scaling limits (we'll hit them around 500k orders/day)
- No built-in horizontal scaling (will need sharding if we grow 50x)
- Replication lag in read replicas (typically 100-500ms)

Neutral:
- Migration from MySQL will take 2 weeks
- Requires connection pooling (PgBouncer) for high connection counts

## Alternatives Considered

### MySQL
- Pros: Team familiarity, lower hosting cost ($600/month)
- Cons: Weaker JSON support, less robust full-text search
- Why rejected: JSON querying is critical for product catalog

### CockroachDB
- Pros: Built-in horizontal scaling, multi-region by default
- Cons: 3x cost, team learning curve, less mature ecosystem
- Why rejected: We don't need multi-region yet, can migrate later if needed

## Review Date

2026-06-15 (when we hit 200k orders/day)
```

### Status Values

Standard ADR statuses form a lifecycle:

- **Proposed**: Under discussion
- **Accepted**: Decision made, being implemented
- **Deprecated**: Still in use but being phased out
- **Superseded**: Replaced by another ADR (link to it)
- **Rejected**: Considered but not chosen (document why)

### When to Write an ADR

Write one when:
- The decision is expensive to reverse (database choice, language, cloud provider)
- Multiple teams are affected
- You're diverging from established patterns ("we're using Redis here but Postgres everywhere else")
- Someone six months from now will ask "why did we do it this way?"
- You spent more than 2 hours researching alternatives

Don't write one for:
- Trivial choices (which CSS framework)
- Easily reversible decisions
- Team conventions already documented elsewhere

### RFC Process for Major Decisions

Some organizations use Request for Comments for decisions affecting multiple teams:

```markdown
# RFC-047: Migrate to Event-Driven Architecture

Author: sarah@company.com
Date: 2025-11-01
Status: In Review
Review Period: 2 weeks (closes 2025-11-15)
Reviewers: @platform-team @backend-team @mobile-team

## Summary (required - 3 sentences max)

Migrate our monolith's synchronous service calls to event-driven
architecture using Kafka. Orders, inventory, and shipping become
independent services communicating via events. This enables independent
deployment and horizontal scaling.

## Background

[Current state, problem being solved, why now]

## Proposal

[Detailed design, API contracts, migration plan]

## Alternatives Considered

[What else we looked at and why this is better]

## Implementation Plan

- Phase 1 (Week 1-2): Set up Kafka cluster, basic producer/consumer
- Phase 2 (Week 3-4): Migrate order creation to events
- Phase 3 (Week 5-8): Migrate inventory, shipping
- Phase 4 (Week 9-10): Remove old synchronous calls
- Rollback plan: Feature flags allow reverting to sync calls

## Open Questions

- How do we handle event ordering guarantees?
- What's our schema evolution strategy?
- Who owns the Kafka infrastructure?

## Success Metrics

- Orders service can deploy independently (currently blocked by inventory)
- P95 latency under 200ms (currently 800ms)
- Zero data loss during migration

## Comments

[Team members add feedback here or in linked doc]
```

The RFC sits in a shared doc (Google Docs, Notion, Confluence) for 1-2 weeks. Teams comment, ask questions, propose changes. Author updates based on feedback. Once approved, it becomes an ADR.

## C4 Model Deep Dive

The C4 model (Context, Container, Component, Code) is a hierarchical approach to architecture diagrams. Created by Simon Brown, it's like zooming a map - you pick the altitude that shows what you need.

### Level 1: System Context

Shows your system as a box and everything it talks to.

```
[Customer] --> [E-commerce System] --> [Payment Gateway (Stripe)]
                      |
                      v
               [Email Service (SendGrid)]
                      |
                      v
               [Warehouse Management System]
```

Use context diagrams for:
- Executive presentations
- Onboarding new team members
- Security boundary analysis
- Vendor/partner integration discussions

Who sees this: Everyone. This is the "subway map" of your system.

### Level 2: Container

A "container" is something that executes code - a web app, mobile app, database, message queue. Not Docker containers, though those might be how you deploy them.

```
[Web Browser]
      |
      v
[React SPA] --HTTPS--> [API Gateway (Kong)]
                             |
                             v
                    +--------+--------+
                    |        |        |
                [Orders  [Inventory] [Users
                 API]      API]       API]
                    |        |        |
                    v        v        v
              [PostgreSQL] [Redis] [PostgreSQL]
                    |
                    v
              [Kafka Event Bus]
```

Use container diagrams for:
- DevOps/infrastructure planning
- Security reviews (what talks to what)
- Technology stack decisions
- Deployment architecture

Who sees this: Engineering, DevOps, security team, technical leadership.

### Level 3: Component

Shows the major structural pieces inside a container - controllers, services, repositories, etc.

```
Inside Orders API:

[HTTP Layer]
    |
    OrderController
    PaymentController
    |
    v
[Business Logic]
    |
    OrderService
    PaymentService
    InventoryClient
    |
    v
[Data Access]
    |
    OrderRepository
    PaymentRepository
    |
    v
[Database Layer]
```

Use component diagrams for:
- Code review context
- Team responsibilities (who owns which components)
- Identifying circular dependencies
- Planning refactoring work

Who sees this: Engineers working on this container.

### Level 4: Code

This is UML class diagrams or actual code. The C4 model says "just show the code" at this level - your IDE already does this well.

Most teams stop at Level 3. You'd only create Level 4 diagrams for particularly complex algorithms or data structures that need explanation.

### Practical C4 Usage

Real example from a healthcare startup:

**Context diagram** (in investor pitch deck):
- System: Patient Portal
- Users: Patients, Doctors, Insurance Companies
- External: Stripe, Twilio, FDA Drug Database

**Container diagram** (in architecture review):
- Web App (React)
- Mobile App (React Native)
- API Gateway (Kong)
- Auth Service (Node.js + PostgreSQL)
- Appointment Service (Go + PostgreSQL)
- Prescription Service (Python + PostgreSQL)
- Message Queue (RabbitMQ)
- HIPAA-compliant File Storage (AWS S3)

**Component diagram** (in Prescription Service docs):
- PrescriptionController
- DrugInteractionChecker
- InsuranceVerifier
- PharmacyRouter
- AuditLogger (regulatory requirement)

They didn't create code-level diagrams. The component diagram was enough for new engineers to understand the flow.

### Tooling

Create C4 diagrams with:
- **Structurizr** (DSL specifically for C4, exports to multiple formats)
- **PlantUML** (text-based, version control friendly)
- **Mermaid** (renders in GitHub/GitLab)
- **draw.io/Lucidchart** (visual editors)
- **Diagrams as Code** (Python library)

The best tool is one that lives in your repository and updates when code changes.

## API Documentation

API documentation is the user interface for developers using your service. Stripe's API docs are legendary because they invested in making them excellent.

### OpenAPI/Swagger Specification

OpenAPI is a standard format for describing REST APIs. You can write it by hand or generate it from code.

```yaml
openapi: 3.0.0
info:
  title: Orders API
  version: 2.1.0
  description: |
    Create and manage customer orders. This API uses cursor-based
    pagination and returns JSON. Rate limit is 1000 requests/hour
    per API key.
  contact:
    email: api-support@company.com
  license:
    name: Apache 2.0

servers:
  - url: https://api.company.com/v2
    description: Production
  - url: https://sandbox.api.company.com/v2
    description: Sandbox (test mode, fake data)

paths:
  /orders:
    post:
      summary: Create a new order
      description: |
        Creates an order and reserves inventory. Returns immediately
        with order ID. Processing happens asynchronously - poll the
        order status or use webhooks.

      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
            examples:
              simple:
                summary: Basic order
                value:
                  customer_id: "cus_9s6XKzkNRiz8i3"
                  items:
                    - product_id: "prod_abc123"
                      quantity: 2
              complex:
                summary: Order with shipping and promo
                value:
                  customer_id: "cus_9s6XKzkNRiz8i3"
                  items:
                    - product_id: "prod_abc123"
                      quantity: 2
                  shipping_address:
                    street: "123 Main St"
                    city: "San Francisco"
                    state: "CA"
                    zip: "94102"
                  promo_code: "SUMMER2025"

      responses:
        '201':
          description: Order created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              examples:
                invalid_product:
                  value:
                    error:
                      type: "invalid_request"
                      message: "Product prod_xyz789 does not exist"
                      param: "items[0].product_id"
        '402':
          description: Payment required (insufficient inventory)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

      security:
        - ApiKeyAuth: []

components:
  schemas:
    CreateOrderRequest:
      type: object
      required:
        - customer_id
        - items
      properties:
        customer_id:
          type: string
          description: Customer ID from customers API
        items:
          type: array
          minItems: 1
          items:
            type: object
            required:
              - product_id
              - quantity
            properties:
              product_id:
                type: string
              quantity:
                type: integer
                minimum: 1
                maximum: 100
        shipping_address:
          $ref: '#/components/schemas/Address'
        promo_code:
          type: string
          pattern: '^[A-Z0-9]{6,12}$'

    Order:
      type: object
      properties:
        id:
          type: string
          example: "ord_1234567890"
        status:
          type: string
          enum: [pending, processing, shipped, delivered, cancelled]
        created_at:
          type: string
          format: date-time
        total_amount:
          type: integer
          description: Total in cents (e.g., 2599 = $25.99)

    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            type:
              type: string
            message:
              type: string
            param:
              type: string
              description: Which parameter caused the error

  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

### Generating Code from OpenAPI

Once you have an OpenAPI spec, you can generate:
- **Server stubs** (Express, FastAPI, Spring Boot)
- **Client SDKs** (JavaScript, Python, Go, Ruby)
- **API documentation** (Redoc, Swagger UI)
- **Mock servers** (for frontend development)
- **Test cases** (contract testing)

Tools like `openapi-generator` support 50+ languages. Stripe, Twilio, and GitHub all generate their SDKs this way.

### API Versioning Documentation

When you change an API, you need migration guides:

```markdown
# Migration Guide: v1 to v2

## Timeline

- 2025-11-15: v2 launched (both versions supported)
- 2026-05-15: v1 deprecation notices start appearing
- 2026-11-15: v1 shut down (18 months total)

## Breaking Changes

### 1. Order amounts now in cents (was dollars)

**v1:**
```json
{
  "amount": 25.99
}
```

**v2:**
```json
{
  "amount": 2599
}
```

**Why:** Floating point arithmetic causes rounding errors. Stripe, Square,
and most payment APIs use cents to avoid "your order is $10.000000001".

**Migration:** Multiply all amounts by 100 and convert to integers.

### 2. Pagination changed from page numbers to cursors

**v1:**
```
GET /orders?page=2&per_page=20
```

**v2:**
```
GET /orders?cursor=eyJpZCI6MTIzfQ&limit=20
```

**Why:** Page numbers break when new items are added. If someone adds an
order while you're on page 2, you might see the same order twice or skip one.

**Migration:** Remove page calculation logic. Store cursor from previous
response, use it in next request. Cursor is opaque - don't parse it.

### 3. Errors now use RFC 7807 Problem Details

**v1:**
```json
{
  "error": "Product not found"
}
```

**v2:**
```json
{
  "type": "https://api.company.com/errors/product-not-found",
  "title": "Product Not Found",
  "status": 404,
  "detail": "Product prod_xyz789 does not exist",
  "instance": "/orders/ord_123",
  "invalid_params": [
    {
      "name": "items[0].product_id",
      "reason": "Product does not exist"
    }
  ]
}
```

**Why:** Structured errors are easier to handle programmatically. The
`type` URL provides documentation. Status codes are explicit.

**Migration:** Update error handling to look for `type` field. Old
clients still work (we include `error` field for backward compatibility).

## New Features (non-breaking)

### Webhook support
You can now register webhook URLs to get notified when order status changes.

### Idempotency keys
Include `Idempotency-Key` header to safely retry requests.

### Expanded filtering
`/orders?status=shipped&created_after=2025-01-01`

## Code Examples

### Node.js Migration
[Full working example showing v1 to v2 changes]

### Python Migration
[Full working example showing v1 to v2 changes]
```

### Deprecation Notices

When you deprecate something, communicate clearly:

```markdown
## DEPRECATED: /v1/orders endpoint

**Deprecated:** 2025-11-15
**Removal Date:** 2026-11-15 (12 months)

This endpoint is deprecated and will be removed. Use `/v2/orders` instead.

### What's changing
- Amounts use cents instead of dollars
- Pagination uses cursors instead of pages
- Full migration guide: [link]

### How to upgrade
1. Update API base URL from `/v1` to `/v2`
2. Multiply amount values by 100
3. Replace page-based pagination with cursor-based
4. Test in sandbox: sandbox.api.company.com/v2

### Need help?
- Email api-support@company.com
- Office hours: Tuesdays 2-3pm PT (calendar link)
- Migration guide: [link]
```

If you're Stripe or AWS, you support old versions for years. If you're a startup, 12 months is reasonable. Communicate early and often.

## System Design Documents

For large projects (multi-team, multi-month), you need more than an ADR. You need a system design document that covers architecture, non-functional requirements, capacity planning, and operational concerns.

### Enterprise Template

```markdown
# System Design: Real-Time Inventory System

**Author:** Jane Smith (jane@company.com)
**Status:** In Review → Approved → Implemented
**Last Updated:** 2025-11-15
**Reviewers:** Platform Team, Warehouse Team, Frontend Team

## Executive Summary (for skip-level managers)

We're rebuilding inventory tracking to support real-time updates across
50 warehouses. Current system has 5-minute delay causing overselling. New
system will use event streaming to update inventory within 100ms. Cost
increase: $5k/month. Reduces overselling losses by estimated $50k/month.

## Background

### Current State
- Batch updates every 5 minutes
- Single PostgreSQL database
- 500k SKUs across 50 warehouses
- 10k orders/day, peaks at 40k

### Problems
- Overselling during high-demand product launches (lost $180k in refunds last quarter)
- Can't support flash sales or limited inventory drops
- Warehouse staff see stale data, manual corrections required
- Customer complaints about "available" items becoming unavailable

### Why Now
Black Friday 2024 saw 200k orders/day. We oversold 5000 items. Current
system can't handle 2025 growth projections.

## Requirements

### Functional Requirements
- FR-1: Display real-time inventory (< 1 second staleness)
- FR-2: Reserve inventory on cart add (15-minute hold)
- FR-3: Support 50 warehouses with independent inventory
- FR-4: Handle 100k orders/day (5x current peak)
- FR-5: Warehouse staff can adjust inventory with reason codes

### Non-Functional Requirements

**Performance:**
- NFR-1: P95 inventory check latency < 100ms
- NFR-2: Support 1000 concurrent inventory updates/second
- NFR-3: Cart reservation latency < 200ms

**Reliability:**
- NFR-4: 99.9% uptime (43 minutes downtime/month allowed)
- NFR-5: Zero inventory count drift (eventual consistency OK for display)
- NFR-6: Graceful degradation if event bus is down

**Security:**
- NFR-7: SOC2 compliance (audit log all inventory changes)
- NFR-8: Warehouse-level access control
- NFR-9: Rate limiting per API client

**Scalability:**
- NFR-10: Horizontal scaling to 1M orders/day
- NFR-11: Add warehouses without code changes

**Operational:**
- NFR-12: Deploy without downtime
- NFR-13: Rollback capability within 5 minutes
- NFR-14: Monitoring dashboard with inventory drift alerts

## Proposed Architecture

### High-Level Design

```
[Web/Mobile Clients]
        |
        v
[API Gateway (Kong)]
        |
        v
[Inventory Service] --> [Kafka Event Bus] --> [Analytics Pipeline]
        |                      |
        v                      v
[Redis Cache]          [Order Service]
        |                      |
        v                      v
[PostgreSQL]           [Warehouse Service]
(source of truth)
```

### Data Model

```sql
-- Source of truth
CREATE TABLE inventory (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    warehouse_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 0),
    reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    updated_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    version INT NOT NULL DEFAULT 1, -- optimistic locking
    UNIQUE (sku, warehouse_id)
);

-- Audit log (regulatory requirement)
CREATE TABLE inventory_history (
    id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'adjustment', 'sale', 'return', 'reservation'
    quantity_change INT NOT NULL,
    reason_code VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100) NOT NULL
);

-- Reservations (cart holds)
CREATE TABLE reservations (
    id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_reservations_expires ON reservations(expires_at)
WHERE expires_at > NOW();
```

### API Contracts

```
POST /inventory/reserve
{
  "sku": "ABC123",
  "quantity": 2,
  "customer_id": "cus_xyz",
  "warehouse_id": 5
}

Response 201:
{
  "reservation_id": "res_789",
  "expires_at": "2025-11-15T15:45:00Z",
  "available_quantity": 48
}

Response 409 (insufficient inventory):
{
  "error": "insufficient_inventory",
  "requested": 2,
  "available": 1,
  "warehouse_id": 5
}
```

### Event Schema

```json
{
  "event_type": "inventory.updated",
  "event_id": "evt_1234567890",
  "timestamp": "2025-11-15T15:30:00Z",
  "data": {
    "sku": "ABC123",
    "warehouse_id": 5,
    "previous_quantity": 50,
    "new_quantity": 48,
    "change_reason": "sale",
    "order_id": "ord_abc123"
  }
}
```

### Technology Choices

- **Language:** Go (high concurrency, team experience)
- **Database:** PostgreSQL (ACID guarantees required)
- **Cache:** Redis (sub-millisecond reads)
- **Event Bus:** Kafka (we already run it, team knows it)
- **Deployment:** Kubernetes (current platform)

## Capacity Planning

### Traffic Projections

Current: 10k orders/day
Black Friday 2024: 200k orders/day
2025 Target: 100k orders/day sustained, 500k peak

Assumptions:
- Average 2.5 items/order
- 3 inventory checks per item (product page, cart, checkout)
- 20% cart abandonment (reservation releases)

**Peak load:**
- 500k orders/day = 20k orders/hour = 5.5 orders/second
- 5.5 * 2.5 items * 3 checks = ~41 reads/second
- 5.5 * 2.5 items = ~14 writes/second

### Resource Requirements

**Database:**
- Current: 1 PostgreSQL instance (4 vCPU, 16GB RAM)
- Needed: Primary + 2 read replicas
- Storage: 500k SKUs * 50 warehouses * 200 bytes = 5GB (negligible)

**Cache:**
- 500k SKUs * 50 warehouses * 100 bytes = 2.5GB
- Redis: 8GB instance (headroom for other data)

**Application:**
- 3 instances for redundancy
- 2 vCPU, 4GB RAM each
- Autoscale to 10 instances at 70% CPU

**Cost:**
- Database: $800/month (primary + replicas)
- Redis: $200/month
- App servers: $300/month (3 * $100)
- Kafka: $400/month (already paid, shared)
- Total: $1700/month (vs current $600)

### Performance Testing Results

Load tested with k6 at 2x peak load (10 orders/second):
- P50 latency: 45ms
- P95 latency: 120ms
- P99 latency: 250ms
- Error rate: 0.01%

Database CPU peaked at 40%. We have 2.5x headroom.

## Migration Plan

### Phase 1: Dual Write (Week 1-2)
- Deploy new service
- Write to both old and new systems
- Read from old system (no impact)
- Validation: Compare old vs new in logs

### Phase 2: Shadow Read (Week 3)
- Read from new system
- Log discrepancies but don't block
- Fix data sync issues

### Phase 3: Cutover (Week 4)
- Read from new system
- Stop dual writes to old system
- Old system in standby mode

### Phase 4: Cleanup (Week 5-6)
- Monitor for issues
- Decommission old system
- Remove compatibility code

### Rollback Plan
- Feature flag flips back to old system
- No data loss (dual write continues through Phase 3)
- RTO: 5 minutes (feature flag toggle)
- RPO: 0 (no data loss)

## Operational Concerns

### Monitoring

**SLIs (Service Level Indicators):**
- Inventory check latency (P95 < 100ms)
- Reservation success rate (> 99%)
- Event processing lag (< 1 second)

**Alerts:**
- P95 latency > 200ms for 5 minutes
- Error rate > 1% for 2 minutes
- Event lag > 5 seconds
- Inventory drift detected (old vs new mismatch)

### Runbook Links
- [Incident Response: Inventory Service Down]
- [Procedure: Manual Inventory Correction]
- [Procedure: Event Bus Recovery]

### Disaster Recovery
- Database: Daily backups, 30-day retention
- Point-in-time recovery within 5 minutes
- RTO: 15 minutes (failover to read replica promoted to primary)
- RPO: 1 minute (replication lag)

## Security Considerations

### Threat Model
- **Threat:** Unauthorized inventory adjustment
  - **Mitigation:** Role-based access, audit logs, require reason codes
- **Threat:** API abuse (reservation flooding)
  - **Mitigation:** Rate limiting (100 req/minute per customer)
- **Threat:** Data exfiltration (competitor scraping inventory)
  - **Mitigation:** API key required, usage monitoring

### Compliance
- SOC2: Audit log retention 7 years
- PCI: No payment data stored (out of scope)
- GDPR: Customer ID is pseudonymous, no PII

## Open Questions

- [RESOLVED 2025-11-10] Do we need multi-warehouse fulfillment routing?
  **Decision:** Phase 2 feature, not MVP
- [OPEN] What's the reservation timeout for enterprise customers?
- [OPEN] Do warehouses need offline mode capability?

## Success Metrics

Launch criteria (must hit in first month):
- Zero overselling incidents
- P95 latency < 100ms
- 99.9% uptime
- Zero data loss incidents

Long-term (3 months):
- Reduce overselling losses by 80% ($40k/month savings)
- Support 500k orders/day peak (Black Friday)
- Customer complaints about availability < 10/month

## Appendix

### Alternative Approaches Considered

**Option 1: Keep current system, reduce batch interval**
- Pros: Low effort, no new infrastructure
- Cons: Still eventual consistency, doesn't solve overselling
- Rejected: Doesn't meet real-time requirement

**Option 2: Use DynamoDB instead of PostgreSQL**
- Pros: Automatic scaling, lower latency
- Cons: Learning curve, no ACID across warehouses, higher cost
- Rejected: Team inexperience, need ACID guarantees

### References
- [ADR-0023: Kafka for Event Bus]
- [PostgreSQL Performance Tuning Guide]
- [Amazon: Inventory Management White Paper]
```

This template covers architecture, requirements, capacity planning, migration, operations, security, and success metrics. Adjust the sections based on your organization's needs.

## Documentation as Code

The best documentation lives in git alongside code, uses automation to stay current, and generates artifacts from a single source of truth.

### Principles

1. **Single source of truth**: Write once, generate multiple formats
2. **Version control**: Docs in git, reviewed like code
3. **Automation**: Generate docs from code when possible
4. **Testing**: Validate code examples actually run
5. **Continuous deployment**: Docs site deploys on merge

### Documentation Structure

```
repo/
├── docs/
│   ├── architecture/
│   │   ├── decisions/          # ADRs
│   │   │   ├── 0001-use-postgres.md
│   │   │   └── template.md
│   │   ├── diagrams/
│   │   │   ├── system-context.mmd
│   │   │   └── container.mmd
│   │   └── README.md
│   ├── api/
│   │   ├── openapi.yaml        # Source of truth
│   │   └── examples/
│   │       ├── create-order.sh
│   │       └── list-orders.py
│   ├── runbooks/
│   │   ├── incident-response.md
│   │   ├── database-failover.md
│   │   └── deployment.md
│   ├── onboarding/
│   │   ├── day-1.md
│   │   ├── local-setup.md
│   │   └── team-practices.md
│   └── compliance/
│       ├── soc2-controls.md
│       └── audit-log-access.md
├── .github/workflows/
│   └── docs.yml                # Deploy docs on merge
└── mkdocs.yml                  # Doc site config
```

### Generating API Docs

From OpenAPI spec, generate multiple artifacts:

```yaml
# .github/workflows/docs.yml
name: Documentation

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Validate OpenAPI spec
      - name: Validate OpenAPI
        run: |
          npx @apidevtools/swagger-cli validate docs/api/openapi.yaml

      # Generate API reference docs
      - name: Generate API docs
        run: |
          npx redoc-cli build docs/api/openapi.yaml \
            -o docs/api/reference.html

      # Generate client SDKs
      - name: Generate SDKs
        run: |
          docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
            -i /local/docs/api/openapi.yaml \
            -g javascript \
            -o /local/sdk/javascript

          docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
            -i /local/docs/api/openapi.yaml \
            -g python \
            -o /local/sdk/python

      # Test API examples
      - name: Test examples
        run: |
          ./scripts/test-api-examples.sh

      # Build documentation site
      - name: Build docs
        run: |
          pip install mkdocs-material
          mkdocs build

      # Deploy to GitHub Pages
      - name: Deploy docs
        if: github.ref == 'refs/heads/main'
        run: |
          mkdocs gh-deploy --force
```

### Testing Documentation Examples

Code examples in docs break. Test them in CI:

```bash
#!/bin/bash
# scripts/test-api-examples.sh

set -e

echo "Starting test API server..."
docker-compose -f docker-compose.test.yml up -d api
sleep 5

echo "Testing create order example..."
response=$(bash docs/api/examples/create-order.sh)
echo "$response" | jq -e '.id' > /dev/null || exit 1

echo "Testing list orders example..."
python docs/api/examples/list-orders.py || exit 1

echo "All examples passed"
docker-compose -f docker-compose.test.yml down
```

This catches broken examples before they reach production docs.

### Auto-Generated Documentation

Generate docs from code comments:

```go
// Package inventory provides real-time inventory tracking across warehouses.
//
// Architecture
//
// The inventory service uses event sourcing with Kafka. All inventory changes
// publish events that other services consume. Redis caches current inventory
// for low-latency reads.
//
// Usage
//
//     client := inventory.NewClient(apiKey)
//     available, err := client.CheckAvailability("SKU-123", 5)
//
// See examples/ directory for complete examples.
package inventory

// CheckAvailability returns whether the requested quantity is available.
//
// This checks real-time inventory across all warehouses. If multiple warehouses
// have the item, it returns the total. Use CheckAvailabilityByWarehouse for
// warehouse-specific checks.
//
// Parameters:
//   - sku: Product SKU identifier
//   - quantity: Desired quantity
//
// Returns:
//   - Available: Whether requested quantity exists
//   - TotalQuantity: Total quantity across all warehouses
//   - Error: Database errors, network errors
//
// Example:
//
//     available, total, err := client.CheckAvailability("ABC-123", 5)
//     if err != nil {
//         return err
//     }
//     if !available {
//         return fmt.Errorf("only %d available", total)
//     }
//
func (c *Client) CheckAvailability(sku string, quantity int) (bool, int, error) {
    // implementation
}
```

Run `godoc` or tools like `pkgsite` to generate browsable documentation.

### Docs-Driven Development

Some teams write docs first:

1. Write API documentation (OpenAPI spec)
2. Generate mock server from spec
3. Frontend develops against mock
4. Backend implements to match spec
5. Contract tests verify implementation matches spec

This ensures the API is well-designed before writing code.

## Runbooks and Playbooks

Runbooks are step-by-step instructions for operational tasks. When something breaks at 2am, you want a checklist, not a treasure hunt.

### Incident Response Runbook

```markdown
# Runbook: Orders API High Error Rate

**Alert:** orders_api_error_rate > 5% for 5 minutes
**Severity:** P1 (customer-facing service degraded)
**On-call:** orders-team

## Symptoms
- Error rate spike in Datadog dashboard
- Customer complaints about checkout failures
- Slack alerts in #incidents

## Investigation Steps

### 1. Check service health (2 minutes)

```bash
# Are pods running?
kubectl get pods -n orders

# Recent restarts?
kubectl get pods -n orders -o json | jq '.items[] | select(.status.containerStatuses[].restartCount > 0)'

# Pod logs (last 100 lines)
kubectl logs -n orders deployment/orders-api --tail=100
```

**Common findings:**
- Out of memory (OOMKilled in pod status)
- Connection pool exhausted (error logs show "connection timeout")
- Deployment in progress (multiple pod versions running)

### 2. Check dependencies (2 minutes)

```bash
# Database connection pool
curl https://api.company.com/health/detailed | jq '.database'

# Is payment gateway up?
curl https://status.stripe.com/api/v2/status.json

# Kafka lag
kubectl exec -n kafka kafka-0 -- kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group orders-consumer \
  --describe
```

**Common findings:**
- Database connections maxed out
- Stripe API degradation (check status page)
- Kafka consumer lag (offset not moving)

### 3. Check recent changes (1 minute)

```bash
# Recent deployments
kubectl rollout history deployment/orders-api -n orders

# Recent config changes
git log --since="2 hours ago" -- config/
```

**Common findings:**
- Deployment 10 minutes before alert
- Configuration change in environment variables

## Mitigation Steps

### If: Out of Memory
```bash
# Increase memory limit temporarily
kubectl set resources deployment/orders-api -n orders \
  --limits=memory=2Gi --requests=memory=1Gi

# Scale horizontally
kubectl scale deployment/orders-api -n orders --replicas=6
```

### If: Database connection pool exhausted
```bash
# Increase pool size (requires redeploy)
kubectl set env deployment/orders-api -n orders \
  DB_POOL_SIZE=50

# Or scale app instances (distributes load)
kubectl scale deployment/orders-api -n orders --replicas=8
```

### If: Bad deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/orders-api -n orders

# Verify rollback
kubectl rollout status deployment/orders-api -n orders
```

### If: External dependency down
```bash
# Enable circuit breaker (if not auto-enabled)
kubectl set env deployment/orders-api -n orders \
  STRIPE_CIRCUIT_BREAKER=true

# This degrades gracefully (shows "payment unavailable" instead of errors)
```

## Post-Incident

1. Update incident doc with timeline
2. Schedule postmortem within 48 hours
3. File bugs for action items
4. Update this runbook if steps were wrong/incomplete

## Escalation

If above steps don't resolve in 15 minutes:
- Page @platform-team (Slack: /pd trigger platform-team)
- Engage vendor support (Stripe: support.stripe.com)
- Consider maintenance mode (emergency deploy feature flag)

## Postmortem Template

[Link to postmortem template]
```

### Deployment Runbook

```markdown
# Runbook: Production Deployment

**Frequency:** ~10 deployments/week
**Duration:** 15 minutes (automated), 30 minutes if manual rollback needed
**Requires:** Two engineers (one deploying, one observing)

## Pre-Deployment Checklist

- [ ] All CI/CD checks passed (tests, lint, security scan)
- [ ] Staging deployment successful (deployed 24 hours ago minimum)
- [ ] No active incidents (check #incidents)
- [ ] Feature flags configured for new features
- [ ] Database migrations tested in staging
- [ ] Rollback plan documented (below)

## Deployment Steps

### 1. Announce deployment (Slack #deployments)

```
🚀 Deploying orders-api v2.5.0 to production
- Changes: Add idempotency support, fix reservation race condition
- PR: https://github.com/company/orders-api/pull/456
- Monitoring: https://datadog.com/dashboard/orders-api
- Rolling back by: 3:30pm if issues detected
```

### 2. Run database migrations (if any)

```bash
# Migrations run automatically, but verify
kubectl logs -n orders job/migration-v2-5-0 --follow

# Check migration status
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

**Rollback consideration:** Migrations should be backward-compatible. New code
works with old schema, old code works with new schema.

### 3. Deploy application

```bash
# Trigger deployment
kubectl set image deployment/orders-api -n orders \
  orders-api=company/orders-api:v2.5.0

# Watch rollout
kubectl rollout status deployment/orders-api -n orders

# Deployment uses rolling update:
# - 25% max surge (extra pods during deploy)
# - 25% max unavailable
# - 30 second readiness probe delay
# Total time: ~5 minutes for 4 pods
```

### 4. Monitor deployment

Watch these dashboards for 10 minutes:
- [Error rate dashboard]
- [Latency dashboard]
- [Database connections dashboard]

**Green light:** Error rate < 1%, P95 latency < 200ms, no alerts

**Yellow light:** Small latency increase (expected, caches warming up)

**Red light:** Error rate > 2%, new errors in logs → rollback immediately

### 5. Verify functionality

```bash
# Create test order (production sandbox account)
curl -X POST https://api.company.com/orders \
  -H "X-API-Key: $SANDBOX_KEY" \
  -d '{
    "customer_id": "test_cus_123",
    "items": [{"product_id": "test_prod_abc", "quantity": 1}]
  }'

# Should return 201 with order ID
```

### 6. Enable new features (if any)

```bash
# Gradually enable idempotency (new feature in v2.5.0)
# Start with 10% of traffic
curl -X POST https://feature-flags.company.com/flags/idempotency-support \
  -d '{"rollout_percentage": 10}'

# Wait 5 minutes, monitor error rate

# Increase to 50%
curl -X POST https://feature-flags.company.com/flags/idempotency-support \
  -d '{"rollout_percentage": 50}'

# Wait 5 minutes

# Full rollout
curl -X POST https://feature-flags.company.com/flags/idempotency-support \
  -d '{"rollout_percentage": 100}'
```

## Rollback Procedure

If error rate > 2% or critical bugs detected:

```bash
# Rollback deployment (takes 3 minutes)
kubectl rollout undo deployment/orders-api -n orders

# Verify rollback
kubectl rollout status deployment/orders-api -n orders

# Disable feature flags
curl -X POST https://feature-flags.company.com/flags/idempotency-support \
  -d '{"rollout_percentage": 0}'

# Announce in Slack
```

**Migration rollback:**
If database migration is incompatible, run down migration:
```bash
kubectl create job rollback-v2-5-0 --from=cronjob/migration-rollback
```

## Post-Deployment

- [ ] Update deployment log (who deployed, when, any issues)
- [ ] Monitor dashboards for 1 hour
- [ ] Mark Jira tickets as deployed
- [ ] Announce deployment complete in #deployments

## Common Issues

### Deployment stuck at "Waiting for rollout to finish"
**Cause:** New pods failing readiness check
**Fix:** Check logs, usually database connection or config issue
```bash
kubectl logs -n orders deployment/orders-api
```

### Error rate spike immediately after deploy
**Cause:** Breaking change, incompatible config
**Fix:** Rollback immediately, investigate in staging

### Gradual error rate increase (30 minutes after deploy)
**Cause:** Memory leak, connection pool exhaustion
**Fix:** Scale up temporarily, rollback, file bug
```bash
kubectl scale deployment/orders-api -n orders --replicas=8
```
```

### Disaster Recovery Playbook

```markdown
# Playbook: Database Disaster Recovery

**Scenario:** Primary database unrecoverable (corruption, accidental deletion, region outage)
**RTO:** 15 minutes (time to recover)
**RPO:** 5 minutes (max data loss)
**Last Tested:** 2025-10-15 (quarterly DR drill)

## Activation Criteria

Activate this playbook when:
- Primary database unreachable for > 5 minutes
- Database corruption detected
- Accidental data deletion affecting > 100 records
- AWS region outage (us-east-1)

**Decision maker:** Engineering Director or on-call SRE

## Recovery Steps

### Option 1: Promote Read Replica (fastest - 5 minutes)

Use when primary is down but data is intact.

```bash
# 1. Stop application from writing (prevent split-brain)
kubectl scale deployment/orders-api -n orders --replicas=0

# 2. Promote read replica to primary (AWS RDS)
aws rds promote-read-replica \
  --db-instance-identifier orders-replica-1

# Wait for promotion (2-3 minutes)
aws rds describe-db-instances \
  --db-instance-identifier orders-replica-1 \
  --query 'DBInstances[0].DBInstanceStatus'

# 3. Update application config to new primary
kubectl set env deployment/orders-api -n orders \
  DATABASE_URL=postgresql://orders-replica-1.xxxx.rds.amazonaws.com

# 4. Restart application
kubectl scale deployment/orders-api -n orders --replicas=4

# 5. Create new read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier orders-replica-2 \
  --source-db-instance-identifier orders-replica-1
```

**Data loss:** None (replica is real-time copy)

### Option 2: Restore from Backup (15 minutes)

Use when data corruption or accidental deletion.

```bash
# 1. Identify backup to restore
aws rds describe-db-snapshots \
  --db-instance-identifier orders-primary \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
  --output table

# 2. Restore to new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier orders-restored \
  --db-snapshot-identifier orders-snapshot-2025-11-15-06-00

# Wait for restore (10 minutes for 100GB database)

# 3. Point application at restored database
kubectl set env deployment/orders-api -n orders \
  DATABASE_URL=postgresql://orders-restored.xxxx.rds.amazonaws.com

kubectl rollout restart deployment/orders-api -n orders

# 4. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour';"
```

**Data loss:** Up to 5 minutes (last backup to incident time)

### Option 3: Multi-Region Failover (if configured)

Use when entire AWS region is down.

```bash
# 1. Update DNS to point to us-west-2
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://failover-to-west.json

# 2. Verify replication lag in west region
psql $WEST_DATABASE_URL -c "SELECT NOW() - pg_last_xact_replay_timestamp() AS lag;"

# Should be < 1 second

# 3. Promote west replica to primary
# (same steps as Option 1, but in us-west-2)
```

**Data loss:** Replication lag (typically < 1 second)

## Verification

After recovery, verify these:

### Data Integrity
```sql
-- Check order count matches expected
SELECT DATE(created_at), COUNT(*)
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at);

-- Check for gaps in order IDs
SELECT id FROM generate_series(
  (SELECT MIN(id) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour'),
  (SELECT MAX(id) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour')
) AS id
WHERE id NOT IN (SELECT id FROM orders);
```

### Application Health
```bash
# Error rate
curl https://api.company.com/health

# Create test order
curl -X POST https://api.company.com/orders \
  -H "X-API-Key: $TEST_KEY" \
  -d '{"customer_id": "test_123", "items": [{"product_id": "test_abc", "quantity": 1}]}'
```

### Monitoring
- Check Datadog for error spikes
- Verify logs flowing to Splunk
- Confirm alerts are functional

## Communication

### During Recovery

**Slack (#incidents):**
```
🔴 DATABASE INCIDENT - orders-primary unresponsive
Status: Promoting read replica (ETA 5 minutes)
Impact: Orders API unavailable
Next update: 2:15pm
Incident commander: @sarah
```

**Status Page (status.company.com):**
```
Investigating: We're experiencing issues with our orders system.
New orders cannot be placed. Existing orders are not affected.
We're working on a fix and will update in 10 minutes.
```

### Post-Recovery

**Slack:**
```
✅ RESOLVED - orders-primary recovered
- Promoted replica at 2:10pm
- Service restored at 2:13pm
- Downtime: 8 minutes
- Data loss: None
- Postmortem: [link]
```

**Status Page:**
```
Resolved: Orders system is fully operational. We promoted a backup
database after the primary became unresponsive. No customer data
was lost. We're investigating the root cause.
```

## Postmortem

Required within 24 hours:
- Timeline of events
- Root cause analysis
- Impact assessment (downtime, data loss, customer impact)
- Action items to prevent recurrence
- Update this playbook with lessons learned

Template: [link to postmortem template]

## Testing

DR drills every quarter:
- Restore from backup in staging
- Promote replica in staging
- Time each step, update RTOs
- Update this playbook with new findings

Last drill results: [link]
```

## Compliance Documentation

Regulated industries (healthcare, finance, government) require specific documentation for audits.

### SOC 2 Control Documentation

SOC 2 auditors want to see that you have processes and that you follow them.

```markdown
# SOC 2 Control: Access Control (CC6.1)

**Control Objective:** Logical and physical access is restricted to authorized users.

## Control Description

We implement role-based access control (RBAC) for all systems. Access is granted
based on job function and follows the principle of least privilege. Access is
reviewed quarterly and revoked within 24 hours of termination.

## How It Works

### 1. Access Request Process

New employee:
1. Manager submits access request in Jira (template: `access-request`)
2. Security team reviews request against role matrix
3. Access granted in Okta (SSO) and AWS IAM
4. Employee completes security training before access is activated

Example access request: [JIRA-1234]

### 2. Role-Based Access

We define 4 access levels:

**Developer (Read/Write to dev/staging):**
- Can deploy to dev and staging environments
- Read-only access to production logs
- No database write access in production

**Senior Developer (Read-only to production):**
- Developer permissions +
- Read-only production database access
- Production log analysis

**SRE (Production write access):**
- Senior Developer permissions +
- Deploy to production
- Database write access (with approval)
- Infrastructure changes

**Admin (Full access):**
- All permissions
- Requires VP approval
- MFA required
- All actions logged

### 3. Quarterly Access Review

Process:
1. Security team exports current access list (first week of quarter)
2. Managers review their team's access (due second week)
3. Excess access is revoked (third week)
4. Report filed with audit evidence

Last review: Q3 2025 - [link to evidence]

### 4. Termination Process

When employee leaves:
1. HR notifies Security team via Slack bot (automated)
2. Security team revokes access within 4 hours (SLA: 24 hours)
3. Manager confirms no data exfiltration risk
4. Access revocation logged

Evidence: [Access revocation log - last 12 months]

## Technical Implementation

### SSO (Okta)
All application access requires Okta SSO. SAML integration enforces:
- MFA for production access
- Session timeout after 8 hours
- Geolocation restrictions (US, Canada, UK only)

Configuration: [Okta policy screenshot]

### AWS IAM
Developers access AWS via Okta SAML. Policies enforce:
- No permanent access keys (temporary credentials via STS)
- MFA required for production account access
- CloudTrail logs all API calls

Example IAM policy: [link to policy file]

### Database Access
Production database access via bastion host:
- SSH key authentication (passwords disabled)
- Audit log of all queries
- Read-only by default (write requires approval)

Bastion configuration: [terraform/bastion.tf]

## Evidence for Auditors

**Q4 2024 Evidence:**
- [Access request tickets] (147 requests, 142 approved, 5 denied)
- [Quarterly review spreadsheet] (23 users reviewed, 3 access changes)
- [Termination log] (5 employees, avg revocation time: 2.3 hours)
- [Failed access attempts] (34 attempts, all alerted)
- [MFA adoption rate] (100% for production access)

**Testing:**
Auditor can verify control by:
1. Requesting access list from Okta
2. Selecting random sample of 10 employees
3. Verifying access matches job function
4. Confirming MFA enabled
5. Testing that revoked access is actually blocked

## Exceptions

**Exception 2024-11-01:**
- User: contractor-john@vendor.com
- Reason: Third-party security audit requires read access
- Approved by: CTO (approved-email.pdf)
- Expiration: 2024-11-30
- Status: Expired and revoked
```

### HIPAA Documentation Example

```markdown
# HIPAA Compliance: PHI Access Logging

**Regulation:** HIPAA Security Rule § 164.312(b) - Audit Controls

## Requirement

"Implement hardware, software, and/or procedural mechanisms that record and
examine activity in information systems that contain or use electronic
protected health information."

## Implementation

### What We Log

All access to PHI (Protected Health Information) is logged:
- Who accessed (user ID, session ID)
- What was accessed (patient record ID, fields viewed)
- When (timestamp with timezone)
- From where (IP address, user agent)
- Why (clinical context if available)

### Log Retention

- Active logs: 7 years (HIPAA requirement: 6 years)
- Archived logs: S3 Glacier, encrypted at rest
- Deletion: Automated after 7 years + 90 days

### Log Format

```json
{
  "timestamp": "2025-11-15T14:30:22Z",
  "user_id": "dr_smith_12345",
  "user_role": "physician",
  "patient_id": "patient_67890",
  "action": "view_record",
  "fields_accessed": ["demographics", "medications", "lab_results"],
  "ip_address": "10.0.1.45",
  "facility": "main_hospital",
  "session_id": "sess_abc123",
  "clinical_context": "annual_checkup"
}
```

### Security

Logs are protected with:
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Immutability (append-only, no deletion/editing)
- Access control (only Security and Compliance teams)
- Integrity checking (SHA-256 hashes)

### Monitoring

Automated alerts for:
- Access outside business hours (9pm-6am)
- Bulk record access (>20 records in 10 minutes)
- Access to VIP patients (flagged records)
- Geographic anomalies (login from unusual location)
- Terminated employee access (should be impossible)

### Audit Process

Monthly review:
1. Security team samples 50 random access events
2. Verify each has legitimate clinical purpose
3. Flag anomalies for investigation
4. Report filed with Compliance officer

Evidence: [Monthly audit reports - last 12 months]

### Employee Training

All employees with PHI access complete:
- HIPAA training on hire (required before access granted)
- Annual refresher training
- Acknowledgment of minimum necessary standard

Training records: [LMS reports]

## Breach Response

If unauthorized PHI access detected:
1. Immediate investigation (Security team, <1 hour)
2. Determine scope (how many patients, what data)
3. Notify affected patients (< 60 days if ≥500 patients)
4. Notify HHS and media (if ≥500 patients)
5. File breach report

Breach response playbook: [link]
```

## Case Studies: Documentation Done Well

### Stripe API Documentation

Stripe's API docs are legendary. What makes them work:

**1. Code examples in 7 languages** (Ruby, Python, PHP, Java, Node, Go, .NET)
Every endpoint has working examples. They update automatically when the API changes.

**2. Interactive testing**
You can make real API calls from the docs using your test API key. The results appear inline.

**3. Errors are first-class**
Error documentation is as detailed as success cases. Each error code has an explanation and resolution steps.

**4. Migration guides for every version**
When Stripe changes something, they publish detailed migration guides with code examples showing before/after.

**5. Webhook documentation**
Events are documented with full payload examples. You can send test webhooks to your endpoint from the dashboard.

**Why it works:** Stripe's revenue depends on developers succeeding. Bad docs mean lost revenue. They invest accordingly.

### AWS Architecture Whitepapers

AWS publishes detailed architecture guides for specific use cases:
- Gaming: DDoS protection, global player base, real-time multiplayer
- Healthcare: HIPAA compliance, PHI encryption, backup procedures
- Financial services: PCI DSS, audit logging, multi-region disaster recovery

Each whitepaper includes:
- Reference architecture diagrams (C4-style)
- AWS service choices with justification
- Cost estimates at different scales
- Security considerations
- Disaster recovery procedures
- Code examples (CloudFormation templates)

Example: "Building HIPAA-Compliant Healthcare Applications on AWS"
- 47 pages, published 2024
- Covers encryption, access logging, backup, disaster recovery
- Links to specific AWS services with configuration guidance
- References HIPAA regulations with specific mappings

**Why it works:** AWS wants customers to succeed at scale. These whitepapers solve the "how do I architect this?" question before customers call support.

### Google SRE Book

Google published their internal SRE (Site Reliability Engineering) practices as a free book. It includes:
- Runbook templates
- Incident response procedures
- Postmortem format (blameless, action-oriented)
- On-call best practices
- SLO/SLI definitions
- Monitoring philosophy

"Runbook template" (Chapter 14):
```
Service: [name]
Dependencies: [databases, APIs, queues]
SLOs: [latency, availability, error rate targets]
Known failure modes: [what goes wrong and how to fix it]
Escalation: [who to page if you're stuck]
Recent changes: [link to deployment log]
```

**Why it works:** Google's scale means their practices have been battle-tested. Startups copy these templates because they're proven.

### GitLab Handbook

GitLab's entire company handbook is public (5000+ pages). Includes:
- Engineering processes
- Incident response procedures
- Security policies
- Compliance documentation

Example: Their incident response process is fully documented with:
- Severity definitions
- Response time SLAs
- Communication templates
- Postmortem template
- Metrics (MTTD, MTTR)

**Why it works:** Radical transparency. New employees read the handbook before day 1. Everything is searchable. Nothing is "tribal knowledge."

## When Documentation Becomes Over-Documentation

You can document too much. Signs you've crossed the line:

**1. Documentation that's always out of date**
If you can't keep it current, it's worse than useless - it's misleading. Solution: Auto-generate from code or delete it.

**2. Documentation nobody reads**
Check analytics. If a 50-page architecture doc has 2 views, delete 40 pages. Solution: Start with a 1-page summary, link to details.

**3. Documenting the obvious**
"This function adds two numbers" - your IDE already shows that. Solution: Document *why*, not *what*.

**4. Process documentation without enforcement**
"All PRs require design docs" but nobody checks. Solution: Automate or don't pretend.

**5. Documentation as procrastination**
Writing docs feels productive but delays shipping. Solution: Ship first, document after (for MVPs).

### The Right Amount

A 10-person startup needs:
- README with setup instructions
- API documentation (if you have an API)
- Basic runbooks for production incidents
- ADRs for major decisions

That's probably 10-20 pages total.

A 100-person company needs:
- All of the above +
- Onboarding guide
- Architecture overview
- Incident response procedures
- Security/compliance docs (if regulated)

Maybe 50-100 pages.

A 1000-person company needs:
- All of the above +
- Team ownership docs
- Detailed runbooks
- Capacity planning docs
- Compliance evidence
- Postmortems

Could be 500+ pages, but most of it is auto-generated (API docs, metrics, logs).

## Summary

Advanced documentation practices:

**ADRs** capture architectural decisions with context. Use them for expensive-to-reverse choices that affect multiple teams. Keep them short (1-2 pages).

**C4 model** provides a consistent way to show architecture at different zoom levels. Context for executives, container for DevOps, component for developers.

**API documentation** using OpenAPI enables auto-generated SDKs, mock servers, and interactive testing. Invest here if APIs are core to your business.

**System design documents** for major projects cover architecture, capacity planning, migration, monitoring, and success metrics. They're hefty (10-20 pages) but prevent expensive mistakes.

**Documentation as code** means docs live in git, deploy automatically, and stay current. Test your code examples in CI.

**Runbooks** provide step-by-step instructions for operational tasks. The 2am version of your brain needs a checklist, not exploration.

**Compliance documentation** maps your actual processes to regulatory requirements. Auditors want evidence that you follow your own policies.

The best documentation is:
- Single source of truth (generated from code when possible)
- Version controlled (in git)
- Tested (code examples actually run)
- Minimal (just enough, no more)
- Discoverable (searchable, linked)

The worst documentation is:
- Out of date (misleading)
- Orphaned (nobody knows it exists)
- Redundant (says what code already says)
- Unenforced process docs (theater)

Write docs that solve real problems. Delete docs that don't. Keep what remains ruthlessly current.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[← Mid-Depth](../mid-depth/index.md)** Practical patterns and implementation

### Related Topics
- [Architecture Design](../../architecture-design/deep-water/index.md) - Related design considerations
- [Dependency Review](../../dependency-review/deep-water/index.md) - Related design considerations
- [Data Flow Mapping](../../data-flow-mapping/deep-water/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
