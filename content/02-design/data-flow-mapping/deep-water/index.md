---
title: "Data Flow Mapping - Deep Water"
phase: "02-design"
topic: "data-flow-mapping"
depth: "deep-water"
reading_time: 50
prerequisites: ["data-flow-mapping-surface"]
related_topics: ["architecture-design", "api-design", "database-design", "security-architecture"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Data Flow Mapping - Deep Water

Data flow mapping at the deep-water level is about proving to regulators, security auditors, and your future self that you know exactly what happens to data—from collection through every transformation to eventual deletion. This isn't theoretical. The hospital that can't prove they delete patient data gets fined millions. The payment processor that can't trace a transaction through their system loses their certification. The SaaS company that can't demonstrate tenant isolation loses enterprise customers.

This guide covers the advanced patterns you need when building systems that handle regulated data, operate across borders, serve multiple tenants, or need to survive regulatory audits.

## Why Surface-Level Mapping Isn't Enough

Surface-level data flow mapping—the numbered list showing user input to database—works until it doesn't. It fails when:

**A regulator asks**: "Show me every system that processes EU citizen data and prove none of it leaves the EU region."

**An auditor demands**: "Demonstrate that tenant A's data is cryptographically isolated from tenant B, even in your search indexes and backups."

**Legal requires**: "We need to honor a data subject access request. Give me every piece of information we hold about user ID 12345, including all derived data and analytics."

**Security team asks**: "If this service is compromised, what data can an attacker access? Show me the trust boundaries and encryption zones."

**Post-incident review**: "The webhook retry queue had personally identifiable information sitting in plaintext for 14 days. Why wasn't this in the data flow map?"

These questions require different artifacts than a simple flow diagram. You need data lineage tracking, compliance-aware architecture, and provable deletion workflows.

## Compliance-Driven Data Flow Mapping

GDPR, HIPAA, PCI-DSS, SOC 2—they all care deeply about data flows. The common thread: you must be able to demonstrate control over data at every stage.

### GDPR Data Lineage

GDPR doesn't just require data protection—it requires you to know where data is, how it's processed, and who has access. Article 30 mandates "records of processing activities."

Here's what a GDPR-aware data flow map looks like:

```
User Registration Flow (GDPR-Aware):

1. User enters personal data in form
   - Legal Basis: Consent (Article 6(1)(a))
   - Data Categories: Contact details, account credentials
   - Processing Purpose: Account creation
   - Retention: Until account deletion + 30 days for fraud prevention
   - Location: EU-West region only

2. POST /api/register → API Gateway (eu-west-1)
   - Data in transit: TLS 1.3
   - Logging: Request logged WITHOUT body (no PII in CloudWatch)
   - Processing Location: Ireland data center

3. API validates and hashes password
   - Processor: bcrypt library (server-side, ephemeral)
   - Data Transformation: Password → irreversible hash
   - Original password never persisted

4. User record written to PostgreSQL
   - Data Controller: Your company
   - Data Processor: AWS RDS (Data Processing Agreement in place)
   - Storage Location: eu-west-1, encryption at rest (AES-256)
   - Backups: eu-west-1 only, 30-day retention
   - Access Controls: Application service account only

5. Verification email sent via SendGrid
   - Data Processor: SendGrid (DPA signed)
   - Data Shared: Email address, verification token
   - Processing Purpose: Email delivery
   - Data Retention: SendGrid purges after 30 days
   - Location: SendGrid EU infrastructure

6. Analytics event sent to internal data warehouse
   - Data: User ID (pseudonymized), timestamp, registration source
   - Purpose: Business analytics (Legitimate Interest, Article 6(1)(f))
   - PII Removed: Email, IP address not included
   - Retention: 2 years, then aggregated only

Data Subject Rights Implementation:
- Right to Access: Query users table + analytics_events where user_id = X
- Right to Erasure: Delete user record + queue SendGrid deletion + anonymize analytics
- Right to Portability: Export user record as JSON
- Right to Rectification: Update users table, propagate to analytics
```

This isn't a simple flow diagram anymore. It's a compliance artifact. Each step documents:

- **Legal basis** for processing (consent, contract, legitimate interest)
- **Data categories** and sensitivity level
- **Processing purpose** (can't repurpose without new legal basis)
- **Retention periods** (must delete after purpose fulfilled)
- **Geographic location** (for cross-border transfer rules)
- **Third-party processors** (must have Data Processing Agreements)
- **Encryption state** (at rest, in transit)
- **Access controls** (who can read this data)

When GDPR auditors come knocking, you hand them this document for each critical flow. It shows you've mapped processing activities and can honor data subject rights.

### HIPAA Audit Trails

HIPAA requires tracking who accessed patient data, when, and why. Your data flow map needs to show not just data movement, but access logging.

```
Patient Record Access Flow (HIPAA Compliant):

1. Physician logs into EHR system
   - Authentication: MFA required (password + hardware token)
   - Audit: Login event logged with timestamp, user ID, source IP
   - Session: 15-minute timeout, re-auth required

2. Physician searches for patient by name
   - Authorization: Check physician has treatment relationship with patient
   - Audit: Search query logged (who, what, when, result count)
   - Minimum Necessary: Search results show limited fields (name, DOB, MRN)

3. Physician opens patient chart
   - Authorization: Verify active treatment relationship
   - Audit: Access event logged (user_id, patient_id, timestamp, reason_code)
   - Data Retrieved: Full PHI (Protected Health Information)
   - Encryption: TLS 1.3 in transit, AES-256 at rest
   - Location: HIPAA-compliant data center, BAA with hosting provider

4. Chart data rendered in UI
   - Client-side: No PHI cached in browser localStorage
   - Session storage: Cleared on tab close
   - Audit: Screen view logged for access trail

5. Physician makes notes, saves chart
   - Data Written: Clinical notes, diagnosis codes, treatment plan
   - Audit: Modification event logged (before/after values for critical fields)
   - Encryption: Encrypted before write to database
   - Backup: Encrypted backups, 7-year retention (HIPAA requirement)

6. Patient portal access
   - Patient views own chart via portal
   - Audit: Patient access logged separately (different reason code)
   - Authorization: Patients can only access own data
   - Data Filtering: Some clinical notes hidden per physician discretion

Audit Trail Requirements:
- Who: User ID, role, authentication method
- What: Data accessed (patient ID, data categories)
- When: Timestamp (UTC, synced to authoritative time source)
- Why: Reason for access (treatment, payment, healthcare operations)
- Outcome: Success or failure, data returned
- Retention: 6 years minimum
- Tamper-proof: Audit logs write-only, cryptographically signed
```

The difference from a regular data flow: every data access triggers an audit event. You're not just mapping data movement—you're mapping observability of that movement.

HIPAA auditors will ask: "Show me everyone who accessed this patient's record in the last 6 months." If your data flow map doesn't include the logging infrastructure to answer that, you're not compliant.

### PCI-DSS and Cardholder Data Flows

PCI-DSS has a simple rule: minimize where cardholder data (CHD) flows. The fewer systems that touch credit card numbers, the smaller your compliance scope.

```
Payment Processing Flow (PCI-DSS Scope Minimization):

1. User enters payment details
   - Location: Stripe.js hosted form (Stripe's iframe, not your DOM)
   - CHD Never Reaches Your Server: Card number, CVV never touch your infrastructure
   - Your Code: Receives only tokenized reference (tok_xyz)

2. Client sends payment token to your API
   - Data Transmitted: Payment token, order ID, amount
   - No CHD: Token is single-use, expires in 15 minutes
   - PCI Scope: Your API is OUT of scope for PCI (no CHD processing)

3. API charges token via Stripe API
   - Communication: HTTPS to Stripe's PCI-certified infrastructure
   - Data Sent: Token, amount, currency, order metadata
   - Data Received: Charge ID, status, last-4 digits of card
   - Your Storage: charge_id, last4, brand (Visa/MC), expiry month/year
   - NOT Stored: Full card number, CVV (PCI-DSS 3.2.1)

4. Charge confirmation saved to database
   - Stored Fields: charge_id, amount, status, last4, brand
   - Encryption: Database encrypted at rest (not strictly required for last4, but best practice)
   - Retention: Transaction records retained 7 years (merchant requirement)

5. Receipt sent to customer
   - Email Contents: Order summary, last4 of card, amount charged
   - No CHD: Never include full card number in email
   - Email Service: SendGrid (no CHD, out of PCI scope)

PCI Compliance Boundaries:
- In Scope: Nothing (using Stripe tokenization)
- Reduced Scope Alternative: If you processed cards directly:
  - Cardholder Data Environment (CDE): Payment processing servers
  - Encrypted Storage: Encrypt CHD in database
  - Network Segmentation: CDE isolated from rest of infrastructure
  - Key Management: Encryption keys rotated, HSM-protected
  - Quarterly Scans: ASV scans of public-facing systems
  - Annual Audit: QSA assessment for Level 1 merchants

Data Flow Shows Scope Reduction:
- Traditional flow: Card → Your Server → Payment Gateway (Your server in PCI scope)
- Tokenized flow: Card → Stripe → Token → Your Server (Your server OUT of scope)
```

The critical insight: data flow mapping for PCI is about showing what you DON'T process. Every arrow that bypasses your infrastructure is one less system to audit.

### Right to Deletion Implementation

GDPR's right to erasure (Article 17) means your data flow map must be reversible. You need to trace data forward during collection and backward during deletion.

```
User Deletion Flow (Right to Erasure):

1. User initiates account deletion
   - Trigger: User clicks "Delete Account" in settings
   - Confirmation: Email verification link (prevent accidental deletion)
   - Grace Period: 30-day soft delete (user can recover)

2. Soft delete user record
   - Database: UPDATE users SET deleted_at = NOW(), status = 'pending_deletion'
   - Effect: User cannot log in, data hidden from UI
   - Reversible: User can recover within 30 days

3. After 30-day grace period, hard deletion begins
   - Automated Job: Runs daily, finds users with deleted_at > 30 days ago
   - Deletion Cascade: Trace all related data

4. Delete from primary database
   - Direct References: DELETE FROM user_sessions, user_preferences, user_uploads
   - Foreign Keys: CASCADE delete configured on database level
   - Audit: Log deletion event (user_id, timestamp, triggered_by)

5. Delete from third-party processors
   - Email Service: API call to SendGrid to delete contact
   - Analytics: Anonymize user events (replace user_id with random ID)
   - CRM: API call to Salesforce to delete contact record
   - File Storage: Delete S3 objects with prefix /users/{user_id}/
   - CDN: Purge cached content for user-specific URLs

6. Handle analytics and derived data
   - Aggregated Metrics: User already anonymized, no action needed
   - ML Training Data: Retrain models without user's data (expensive)
   - Pragmatic Approach: Mark data as deleted, exclude from future training
   - Logs: Anonymize logs (replace user_id with hash or "DELETED_USER")

7. Delete from backups (the hard part)
   - Database Backups: Point-in-time backups still contain deleted user
   - Approach 1: Wait for backup retention to expire (pragmatic)
   - Approach 2: Restore backup, delete user, re-backup (expensive)
   - GDPR Guidance: Can retain in backups if deletion is "impossible or disproportionate effort"
   - Document: Backup retention policy (e.g., 90 days), explain to user

8. Deletion verification
   - Checklist: Verify deletion from all systems in data flow map
   - Audit Trail: Log each deletion step (system, timestamp, status)
   - Completion Email: Notify user that deletion is complete
   - Exceptions: Retain minimum data for legal obligations (e.g., financial records for tax)

Data Retention vs. Right to Erasure:
- User requests deletion
- But: You must retain transaction records for 7 years (tax law)
- Solution: Delete PII (name, email), retain anonymized transaction (order_id, amount, date)
- Pseudonymization: Replace user_id with one-way hash, retain order records
```

The complexity: deletion is a distributed systems problem. You have to track down every copy of the data—across microservices, third-party processors, caches, backups, and analytics pipelines—and delete or anonymize it.

Your data flow map is your deletion checklist. Every arrow pointing to a data store is a deletion task.

## Event-Driven Data Flows

Event-driven architectures decouple services but make data flows harder to trace. Data doesn't flow through API calls—it flows through events, and any number of consumers might be listening.

### Event Sourcing and CQRS Data Flows

Event sourcing stores state as a sequence of events rather than current values. CQRS (Command Query Responsibility Segregation) splits reads and writes into separate data models. Together, they create complex data flows.

```
E-commerce Order Flow (Event Sourcing + CQRS):

Command Side (Writes):
1. User submits order: POST /api/orders
   - Command: CreateOrder {user_id, items, shipping_address}
   - Validation: Check inventory, validate address
   - Event Published: OrderCreated {order_id, user_id, items, timestamp}
   - Event Store: Append-only log (PostgreSQL events table or EventStoreDB)
   - No Update: Events are immutable, never updated or deleted

2. Payment processed
   - Command: ProcessPayment {order_id, payment_token}
   - Integration: Charge via Stripe API
   - Event Published: PaymentAuthorized {order_id, charge_id, amount}
   - Event Store: Append new event, never modify OrderCreated event

3. Fulfillment begins
   - Event Consumer: Warehouse service listens to PaymentAuthorized
   - Command: ShipOrder {order_id, items}
   - Event Published: OrderShipped {order_id, tracking_number, carrier}

Query Side (Reads):
4. Build read models from events
   - Event Projector: Consumes all events, builds denormalized views
   - Read Model 1: orders_summary table (for user's order history)
     - Created from: OrderCreated, PaymentAuthorized, OrderShipped events
     - Schema: {order_id, user_id, status, total, tracking_number, created_at}
   - Read Model 2: inventory_status table (for product availability)
     - Created from: OrderCreated, OrderCancelled events
     - Schema: {product_id, available_qty, reserved_qty}
   - Read Model 3: revenue_by_day (for analytics dashboard)
     - Created from: PaymentAuthorized events
     - Schema: {date, total_revenue, order_count}

5. User queries order status: GET /api/orders/{order_id}
   - Query: Read from orders_summary table (not event store)
   - Fast: Denormalized view optimized for reads
   - Eventually Consistent: May lag seconds behind events

Data Flow Characteristics:
- Source of Truth: Event store (immutable, append-only)
- Current State: Reconstructed by replaying events
- Multiple Views: Same events build different read models
- Auditability: Complete history preserved in events
- Deletion Complexity: Can't delete events (audit trail), must project without deleted user's data

Event Store Schema:
| event_id | aggregate_id | event_type       | event_data                          | timestamp           | version |
|----------|--------------|------------------|-------------------------------------|---------------------|---------|
| 1        | order-123    | OrderCreated     | {user_id, items, shipping_address}  | 2025-01-15 10:30:00 | 1       |
| 2        | order-123    | PaymentAuth      | {charge_id, amount}                 | 2025-01-15 10:31:00 | 2       |
| 3        | order-123    | OrderShipped     | {tracking: "1Z999"}                 | 2025-01-15 14:00:00 | 3       |

Right to Deletion in Event-Sourced Systems:
- Problem: Can't delete events (breaks audit trail and event replay)
- Solution 1: Encrypt PII in events, delete encryption key
  - Events remain, but PII is unrecoverable
  - Audit trail intact (you know order was created at X time)
  - User data irrecoverable (complies with GDPR)
- Solution 2: Project events without deleted user
  - Tombstone event: UserDeleted {user_id, deleted_at}
  - Projectors skip events for deleted users
  - Read models don't include deleted user's data
  - Event store retains history, but not exposed
```

The data flow map for event sourcing shows two parallel flows: the immutable event log (source of truth) and the projected read models (queryable views). Debugging requires tracing both.

### Saga Orchestration for Distributed Transactions

Sagas coordinate long-running transactions across services. Data flows through a sequence of local transactions, with compensating transactions if something fails.

```
Order Fulfillment Saga (Orchestrated):

1. User places order
   - Saga Initiator: Order Service receives CreateOrder command
   - Saga State: Created in saga_state table
     {saga_id, type: "OrderFulfillment", status: "started", current_step: 1}

2. Reserve Inventory (Step 1)
   - Command: Order Service → Inventory Service: ReserveItems {order_id, items}
   - Inventory Service: Decrements available_qty, increments reserved_qty
   - Response: Success {reservation_id}
   - Saga State Update: current_step = 2, reservation_id stored
   - Compensating Transaction: ReleaseReservation {reservation_id}

3. Authorize Payment (Step 2)
   - Command: Order Service → Payment Service: AuthorizePayment {order_id, amount}
   - Payment Service: Calls Stripe, holds funds
   - Response: Success {authorization_id}
   - Saga State Update: current_step = 3, authorization_id stored
   - Compensating Transaction: VoidAuthorization {authorization_id}

4. Create Shipment (Step 3)
   - Command: Order Service → Shipping Service: CreateShipment {order_id, address}
   - Shipping Service: Creates label, schedules pickup
   - Response: Success {shipment_id, tracking_number}
   - Saga State Update: current_step = 4, shipment_id stored
   - Compensating Transaction: CancelShipment {shipment_id}

5. Saga Complete
   - All steps succeeded
   - Saga State: status = "completed"
   - Final Event: OrderFulfilled {order_id, tracking_number}

Failure Scenario: Payment Fails
3. Authorize Payment (Step 2)
   - Command: Order Service → Payment Service: AuthorizePayment
   - Payment Service: Stripe declines card
   - Response: Failure {reason: "insufficient_funds"}
   - Saga State Update: status = "compensating", current_step = 2

4. Compensate: Release Inventory (Step 1 Rollback)
   - Command: Order Service → Inventory Service: ReleaseReservation {reservation_id}
   - Inventory Service: Decrements reserved_qty, increments available_qty
   - Response: Success
   - Saga State Update: status = "failed", failure_reason stored

5. Notify User
   - Event: OrderFailed {order_id, reason: "payment_declined"}
   - User receives email: "Your order couldn't be completed"

Data Flow for Saga:
- Orchestrator: Order Service (tracks saga state, sends commands)
- Participants: Inventory, Payment, Shipping services
- State Management: Saga state persisted in database (for crash recovery)
- Idempotency: Each command has unique ID, participants deduplicate retries
- Observability: Each step logged, entire saga traceable by saga_id

Saga State Table:
| saga_id | type             | status      | current_step | data                                      | created_at          |
|---------|------------------|-------------|--------------|-------------------------------------------|---------------------|
| s-123   | OrderFulfillment | completed   | 4            | {reservation_id, authorization_id, ...}   | 2025-01-15 10:30:00 |
| s-124   | OrderFulfillment | failed      | 2            | {reservation_id, failure: "payment_fail"} | 2025-01-15 10:45:00 |

Tracing Data Flow Through Sagas:
- Question: "Why did order-456 fail?"
- Answer: Query saga_state where order_id = 456
  - See: status = "failed", current_step = 2 (payment), failure_reason
  - Trace: Inventory was reserved, payment failed, inventory was released
- Audit Trail: Every command sent to participants logged with timestamp
```

Saga data flows are inherently complex because they're designed for failure. Your data flow map needs to show both the happy path and all compensating paths.

### Event-Driven Multi-Tenant Data Flow

When you combine events with multi-tenancy, you need tenant context flowing through every event.

```
Multi-Tenant SaaS Event Flow:

1. Tenant A user creates document
   - Command: CreateDocument {tenant_id: "tenant-a", user_id, title, content}
   - Event Published: DocumentCreated {tenant_id: "tenant-a", doc_id, user_id, title}
   - Event Metadata: tenant_id in every event (required for filtering)

2. Event routing with tenant isolation
   - Event Bus: Kafka topic "documents" (shared)
   - Partition Key: tenant_id (ensures tenant A events go to same partition)
   - Consumer Groups: Each service has consumer group
   - Filtering: Consumers MUST filter by tenant_id before processing

3. Search indexing service consumes event
   - Consumer: Search Indexer subscribes to "documents" topic
   - Event Received: DocumentCreated {tenant_id: "tenant-a", ...}
   - Tenant Context: Extract tenant_id from event
   - Index Selection: Route to Elasticsearch index "documents-tenant-a"
   - Isolation: Tenant A's documents in separate index from Tenant B

4. Analytics service consumes event
   - Consumer: Analytics Aggregator subscribes to "documents" topic
   - Event Received: DocumentCreated {tenant_id: "tenant-a", ...}
   - Storage: Write to analytics database with tenant_id column
   - Query Isolation: SELECT ... WHERE tenant_id = 'tenant-a'

5. Webhook notification service consumes event
   - Consumer: Webhook Dispatcher subscribes to "documents" topic
   - Event Received: DocumentCreated {tenant_id: "tenant-a", ...}
   - Lookup: Query webhook_subscriptions WHERE tenant_id = 'tenant-a'
   - Delivery: POST to tenant A's webhook URL only
   - No Cross-Tenant: Never send tenant A's events to tenant B's webhook

Security Boundaries in Event Flows:
- Event Schema: tenant_id is required field in every event
- Publisher: Validates tenant_id matches authenticated user's tenant
- Event Bus: Kafka ACLs prevent one tenant's service from reading other tenants' partitions
- Consumers: ALWAYS filter by tenant_id before processing
- Dead Letter Queue: Failed events preserve tenant_id for debugging

Data Flow Risk: Event Leakage
- Risk: Consumer doesn't filter by tenant_id, processes all events
- Result: Tenant A's documents get indexed in Tenant B's search
- Mitigation: Consumer library enforces tenant_id filtering
- Testing: Integration tests verify tenant isolation in event flows

Tracing Multi-Tenant Event Flow:
- Question: "Did tenant B ever receive tenant A's data?"
- Answer:
  1. Query event bus: Filter by tenant_id = "tenant-a", trace to all consumers
  2. Query each consumer's data store: Verify no tenant-a data in tenant-b's partitions
  3. Audit logs: Check for cross-tenant access violations
```

The data flow map for multi-tenant event architectures must show tenant context flowing through every arrow. Missing a tenant_id check in one consumer can breach isolation.

## Multi-Tenant Data Flow Patterns

Multi-tenancy makes data flows complex because tenant isolation must be enforced at every layer.

### Tenant Isolation Strategies

Different isolation strategies change your data flow architecture.

```
Strategy 1: Database-Per-Tenant (Highest Isolation)

Data Flow:
1. Request arrives: GET /api/documents
   - Authentication: Extract tenant_id from JWT
   - Tenant Context: tenant_id = "acme-corp"

2. Database routing
   - Connection Pool: Lookup connection string for tenant_id
   - Database: Connect to "acme-corp-db" (separate PostgreSQL database)
   - Query: SELECT * FROM documents WHERE user_id = ? (no tenant_id filter needed)

3. Response returned
   - Data: Only from acme-corp's database
   - Isolation: Physical database isolation, no data leak risk

Pros:
- Perfect isolation (tenant A can't possibly access tenant B's data)
- Easy to export tenant's data (dump their database)
- Compliance: Can place tenant's DB in specific region
- Backup/restore per tenant
- Scaling: Can move large tenants to dedicated hardware

Cons:
- Expensive: N tenants = N databases
- Schema migrations: Must run migration on every database
- Cross-tenant analytics: Must query all databases, aggregate results
- Connection pooling: Complex (pool per tenant)

Data Flow for Deletion:
- Tenant churns
- Drop entire database
- Clean deletion (no tenant data left behind)


Strategy 2: Schema-Per-Tenant (Good Isolation)

Data Flow:
1. Request arrives: GET /api/documents
   - Authentication: Extract tenant_id from JWT
   - Tenant Context: tenant_id = "acme-corp"

2. Schema routing
   - Database: Single PostgreSQL database
   - Schema Selection: SET search_path TO "acme_corp"
   - Query: SELECT * FROM documents (reads from acme_corp.documents table)

3. Response returned
   - Data: Only from acme_corp schema
   - Isolation: Logical schema isolation

Pros:
- Good isolation (schemas are namespace-separated)
- Cheaper than database-per-tenant
- Easier schema migrations (still per-schema, but same DB connection)
- Cross-tenant analytics easier (same database)

Cons:
- Still N schemas to migrate
- Connection pooling complexity
- Can't easily move tenant to different region
- Schema name must be validated (SQL injection risk if dynamic)

Data Flow for Deletion:
- Tenant churns
- DROP SCHEMA acme_corp CASCADE
- Removes all tenant data


Strategy 3: Row-Level Tenant ID (Shared Database)

Data Flow:
1. Request arrives: GET /api/documents
   - Authentication: Extract tenant_id from JWT
   - Tenant Context: tenant_id = "acme-corp"

2. Query with tenant filter
   - Database: Single PostgreSQL database, shared schema
   - Query: SELECT * FROM documents WHERE tenant_id = 'acme-corp' AND user_id = ?
   - CRITICAL: Every query MUST include tenant_id in WHERE clause

3. Response returned
   - Data: Only rows where tenant_id matches
   - Isolation: Application-enforced (bug = data leak)

Pros:
- Cheapest (single database, single schema)
- Schema migrations: One migration
- Cross-tenant analytics: Easy (single table)
- Connection pooling: Simple (one pool)

Cons:
- Data leak risk: Forget tenant_id filter = breach
- Index size: Large indexes (all tenants' data)
- No physical isolation (harder to meet compliance)
- Deletion complexity: Must find all rows for tenant

Data Flow for Deletion:
- Tenant churns
- DELETE FROM documents WHERE tenant_id = 'acme-corp'
- DELETE FROM users WHERE tenant_id = 'acme-corp'
- ... (repeat for every table)
- Risk: Miss a table, leave orphaned data

Enforcing Row-Level Security:
- PostgreSQL Row-Level Security (RLS):
  CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id'));

  SET app.tenant_id = 'acme-corp';
  SELECT * FROM documents; -- Automatically filtered
- Application ORM: Set global filter on every query
- Database views: CREATE VIEW documents_filtered AS
  SELECT * FROM documents WHERE tenant_id = current_setting('app.tenant_id');
```

Your data flow map must show which isolation strategy you use. Database-per-tenant means routing happens at connection time. Row-level means every query needs tenant filtering.

### Cross-Tenant Analytics and Aggregation

Sometimes you need to aggregate data across tenants (SaaS provider's admin dashboard). This creates a privileged data flow.

```
Cross-Tenant Analytics Flow (Shared Database with RLS):

1. Admin requests usage dashboard
   - Authentication: Admin user (not tenant-specific)
   - Authorization: Verify user has "super_admin" role
   - Request: GET /api/admin/usage-stats

2. Connect with elevated privileges
   - Database Connection: Use admin connection pool (no RLS)
   - OR: SET app.tenant_id = NULL (disable RLS for this session)
   - Risk: Admin connection can see all tenant data

3. Aggregate query across all tenants
   - Query:
     SELECT
       tenant_id,
       COUNT(*) as document_count,
       SUM(storage_bytes) as total_storage
     FROM documents
     GROUP BY tenant_id
   - No tenant_id filter: Intentional cross-tenant query

4. Return aggregated results
   - Data: Summary per tenant (not individual documents)
   - Logging: Audit log records admin cross-tenant access
   - Response: [{tenant_id: "acme", documents: 1250, storage: "25GB"}, ...]

Security Considerations:
- Admin endpoints: Separate from tenant endpoints (/api/admin/* vs /api/*)
- Authorization: Strong RBAC (only specific users can access)
- Audit: Log every cross-tenant query (who, when, what query)
- Data Minimization: Return aggregates, not raw tenant data
- Rate Limiting: Prevent admin endpoint abuse

Data Flow Risk:
- Admin credentials compromised → all tenant data accessible
- Mitigation: MFA required, short-lived tokens, frequent re-auth
```

The data flow map needs to show two classes of flows: tenant-scoped (normal) and cross-tenant (privileged). The privileged flows require extra security.

### Data Residency and Regional Isolation

Some tenants require data to stay in specific geographic regions (GDPR, China's data localization laws, government contracts).

```
Multi-Region SaaS Data Flow:

1. User signs up, selects region
   - Tenant Creation: POST /api/tenants {name, region: "eu"}
   - Routing Decision: Tenant's data will live in EU region
   - Database: tenant_metadata table records {tenant_id, region: "eu"}

2. Tenant's first API request
   - Request: POST /api/documents (Authorization: Bearer {JWT with tenant_id})
   - Region Lookup: Query tenant_metadata, get region = "eu"
   - Database Routing: Connect to eu-west-1 PostgreSQL instance
   - Write: Document stored in EU region

3. File upload from tenant in EU region
   - Request: POST /api/upload
   - Region Lookup: tenant_id → region = "eu"
   - Storage Routing: Upload to S3 bucket "app-data-eu" (eu-west-1)
   - Metadata: Document record in EU database points to EU S3 object

4. Search indexing
   - Event: DocumentCreated {tenant_id, region: "eu", ...}
   - Consumer: Search indexer checks region field
   - Index Routing: Write to Elasticsearch cluster in eu-west-1
   - Isolation: EU data never sent to US Elasticsearch cluster

5. Analytics job (risky cross-region flow)
   - Job: Nightly aggregation for SaaS provider's business metrics
   - Region Filter: Process EU data in EU region, US data in US region
   - Aggregation: Run map-reduce in-region, then aggregate results
   - Data Export: Only aggregated metrics leave region (not raw data)

6. Tenant access from different geography
   - User in US accesses EU-region tenant's data
   - Request: GET /api/documents (from US IP)
   - Region Lookup: tenant_id → region = "eu"
   - Database: Connect to EU database
   - Response: Data served from EU (user's location doesn't matter)
   - Latency: Higher for US user accessing EU data (expected)

Data Residency Compliance:
- Tenant's Data: Always in tenant's chosen region
- Metadata: tenant_id → region mapping might be replicated globally (for routing)
- Backups: In same region as primary data
- Logs: Tenant's access logs in same region
- Exceptions: Data needed for security/fraud detection might be replicated

Architecture:
- Regional Deployments: Full application stack in each region
- Global Routing: API Gateway routes to correct region based on tenant_id
- Data Replication: None (keeps data isolated to region)
- Cross-Region: Only for admin functions, heavily audited

Data Flow Map Shows:
- Request → Region Lookup → Regional Database/Storage
- All arrows to data stores labeled with region
- Clear boundaries: "EU tenant data never flows to US region"
```

The data flow map for multi-region architectures must show geographic boundaries as trust boundaries. Data crossing regions is a compliance event.

## Security Boundaries and Zero Trust

Modern security architecture assumes every network boundary can be breached. Data flow maps need to show trust boundaries and verification points.

### Zero-Trust Data Flow Architecture

In zero-trust architecture, every service verifies identity and authorization, even for internal requests.

```
Microservices Data Flow (Zero-Trust):

Traditional Approach (Perimeter Security):
1. Request → API Gateway (authenticates user)
2. Gateway → Internal Service A (no auth, trusts gateway)
3. Service A → Service B (no auth, same network)
4. Service B → Database (no auth, internal network)
Risk: Compromise Service A → access entire internal network

Zero-Trust Approach:
1. Request → API Gateway
   - Authentication: Verify user JWT
   - Authorization: Check user permissions
   - Token Refresh: Mint short-lived service token for next hop

2. Gateway → Service A
   - Mutual TLS: Gateway presents client cert, Service A verifies
   - Service Token: Gateway includes JWT {caller: "api-gateway", ...}
   - Service A: Verifies JWT signature, checks caller identity

3. Service A → Service B
   - Mutual TLS: Service A presents client cert, Service B verifies
   - Service Token: Service A mints new JWT {caller: "service-a", user_id, ...}
   - Service B: Verifies JWT, checks caller is authorized to access this endpoint
   - Authorization: Service B checks user_id has permission (doesn't trust caller)

4. Service B → Database
   - Authentication: Database credentials from secrets manager (not env vars)
   - Connection: TLS-encrypted, certificate validation
   - Authorization: Database user has minimal privileges (only service_b_user)
   - Row-Level Security: Database enforces tenant_id filter

Data Flow Characteristics:
- No Implicit Trust: Every hop verifies identity and authorization
- Defense in Depth: Compromise one service doesn't give access to others
- Least Privilege: Each service has minimal permissions
- Audit Trail: Every service logs caller identity and access

Service-to-Service Authentication:
- Option 1: Mutual TLS (mTLS)
  - Each service has certificate
  - Services verify each other's certificates
  - Rotation: Certs expire, must rotate
- Option 2: Service Mesh (Istio, Linkerd)
  - Mesh handles mTLS automatically
  - Sidecars inject authentication
  - Centralized policy enforcement
- Option 3: JWT with short expiration
  - Caller mints JWT for each request
  - Callee verifies signature, expiration
  - Simpler than mTLS, but requires clock sync

Authorization in Zero-Trust:
- Problem: Service B receives request from Service A on behalf of User
- Question: Does User have permission to access this resource?
- Solution: Pass user context through call chain
  - JWT includes: {service_id: "service-a", user_id: "user-123", tenant_id: "acme"}
  - Service B checks user_id permissions (not service_id)
  - Service B logs both service_id (who called) and user_id (on whose behalf)
```

The zero-trust data flow map shows authentication and authorization at every boundary, not just the perimeter.

### Encryption Zones and Data Classification

Data flows through zones with different encryption requirements based on sensitivity.

```
Data Flow Through Encryption Zones:

1. Public Zone: Internet
   - Data: Encrypted in transit (TLS 1.3)
   - No Data at Rest: CDN caches public assets only

2. DMZ Zone: API Gateway
   - Data in Transit: TLS termination here
   - Data at Rest: None (stateless)
   - Logging: Request logs encrypted at rest (CloudWatch with KMS)

3. Application Zone: Microservices
   - Data in Transit: Internal TLS (service mesh)
   - Data at Rest: None (stateless services)
   - Caching: Redis with TLS, data encrypted in Redis memory

4. Data Zone: Databases
   - Data in Transit: TLS connections from app to DB
   - Data at Rest: Encryption at rest (AES-256)
   - Key Management: AWS KMS, keys rotated annually
   - Backups: Encrypted with different key than primary

5. Restricted Data Zone: PII/PHI Storage
   - Data in Transit: TLS 1.3 with mutual authentication
   - Data at Rest: Field-level encryption (encrypt PII columns separately)
   - Key Management: Hardware Security Module (HSM)
   - Access: Only specific services with explicit grants
   - Audit: Every access logged to write-only audit log

Data Classification Affects Flow:
- Public Data: No encryption at rest required
- Internal Data: Encrypted at rest, standard access controls
- Confidential Data: Encrypted at rest, access logged, need-to-know basis
- Restricted Data (PII/PHI/PCI): Field-level encryption, HSM keys, audit trail

Example: User Profile Data Flow
1. User updates email (PII)
   - Client → API: TLS-encrypted transit
   - API: Classifies email as PII
   - API → Database: Encrypt email with field-level encryption key
     - Encryption: AES-256-GCM, key from KMS
     - Database stores: {user_id, email_encrypted: "ciphertext", email_key_id: "kms-key-123"}
   - Audit: Log access to PII encryption key

2. Application needs to send email
   - Service → KMS: Request decryption key (with audit)
   - KMS: Verify service is authorized for email decryption
   - KMS → Service: Return decryption key
   - Service: Decrypt email field
   - Service → Email Provider: Send email via TLS
   - Service: Discard decrypted email from memory

3. Analytics needs aggregated data
   - Analytics Service: Query user data
   - Database: Returns encrypted email (ciphertext)
   - Analytics Service: Doesn't have decryption key
   - Analytics: Aggregates without accessing PII

Field-Level Encryption Data Flow:
- Sensitive fields encrypted separately with unique keys
- Key rotation: Re-encrypt fields with new key (background job)
- Access control: Only services with explicit KMS grants can decrypt
- Audit: KMS logs every encryption/decryption operation
```

The data flow map shows which zones data passes through and what encryption applies in each zone.

### Trust Boundary Analysis

Every time data crosses a trust boundary, you need to validate, sanitize, or transform it.

```
Trust Boundary Catalog:

Boundary 1: Internet → API Gateway
- Threat: Malicious user input
- Controls:
  - Rate limiting: 100 requests/minute per IP
  - Input validation: Schema validation on all requests
  - DDoS protection: CloudFlare in front
  - Authentication: JWT required for protected endpoints

Boundary 2: API Gateway → Internal Services
- Threat: Compromised gateway sending malicious requests
- Controls:
  - Mutual TLS: Gateway presents certificate
  - Service tokens: Short-lived JWTs (5 min expiration)
  - Input re-validation: Services don't trust gateway's validation
  - Network segmentation: Services not accessible from internet

Boundary 3: Internal Services → Database
- Threat: SQL injection, unauthorized data access
- Controls:
  - Parameterized queries: Never string concatenation
  - Least privilege: Service DB user can only access its tables
  - Connection encryption: TLS required
  - Read replicas: Separate for analytics (can't write to production)

Boundary 4: Database → Backups
- Threat: Backup leakage, unauthorized restore
- Controls:
  - Encryption: Backups encrypted with separate key
  - Access control: Only DR team can access backups
  - Retention: 30 days, then deleted
  - Testing: Quarterly restore drills (verify encryption works)

Boundary 5: Application → Third-Party API
- Threat: Third-party compromise, data leakage
- Controls:
  - HTTPS required: Validate certificates
  - Data minimization: Only send necessary fields
  - Secrets management: API keys in secrets manager, rotated
  - Response validation: Don't trust third-party data
  - Circuit breaker: Fail fast if third-party is down

Boundary 6: Third-Party Webhook → Application
- Threat: Spoofed webhooks, malicious payloads
- Controls:
  - Signature verification: HMAC signature required
  - Replay protection: Timestamp validation (reject old requests)
  - Input validation: Strict schema validation
  - Idempotency: Handle duplicate webhooks gracefully
  - Logging: Log all webhook attempts (success and failure)

Boundary 7: Application → Logs/Monitoring
- Threat: Sensitive data in logs, log injection
- Controls:
  - PII scrubbing: Remove email, SSN, card numbers before logging
  - Log injection prevention: Sanitize user input in log messages
  - Access control: Only security team can access production logs
  - Retention: 90 days, then deleted
  - Encryption: Logs encrypted at rest

Data Flow Map with Trust Boundaries:
[Internet] --HTTPS--> [API Gateway] --mTLS--> [Service A] --TLS--> [Database]
     |                      |                     |                   |
  Validate             Re-validate          Parameterize        Encrypt at rest
  Rate limit           Service token        Least privilege     Access control

Each arrow crosses a trust boundary and shows the control applied.
```

Trust boundary analysis turns your data flow map into a threat model. Every arrow is a potential attack vector.

## Data Provenance and Lineage Tracking

Data provenance answers: "Where did this value come from?" Data lineage answers: "What happened to it along the way?"

### Tracking Data Origin and Transformations

When data is transformed through multiple systems, you need to trace it back to the source.

```
Data Lineage Example: Customer Revenue Report

1. Source: Stripe webhook delivers PaymentSucceeded event
   - Raw Data: {charge_id, amount, customer_id, timestamp, metadata}
   - Lineage Record:
     {
       lineage_id: "lin-001",
       source: "stripe",
       source_id: "ch_123abc",
       timestamp: "2025-01-15T10:30:00Z",
       data_hash: "sha256:abc123..."
     }

2. Transform 1: ETL pipeline normalizes data
   - Input: Stripe event
   - Transformation: Extract amount, convert to USD, lookup customer name
   - Output: {order_id, customer_name, amount_usd, date}
   - Lineage Record:
     {
       lineage_id: "lin-002",
       parent_lineage_id: "lin-001",
       transformation: "stripe_to_orders_table",
       code_version: "etl-v2.3.1",
       timestamp: "2025-01-15T10:31:00Z"
     }

3. Transform 2: Aggregation for monthly report
   - Input: Orders table (multiple rows)
   - Transformation: SELECT customer_id, SUM(amount_usd) GROUP BY customer_id, month
   - Output: {customer_id, month, total_revenue}
   - Lineage Record:
     {
       lineage_id: "lin-003",
       parent_lineage_ids: ["lin-002", "lin-014", "lin-027", ...],
       transformation: "monthly_revenue_aggregation",
       sql_query: "SELECT customer_id, ...",
       timestamp: "2025-01-15T11:00:00Z"
     }

4. Transform 3: Join with customer demographics
   - Input: Monthly revenue + customer demographics table
   - Transformation: JOIN revenue ON customer_id
   - Output: {customer_id, total_revenue, industry, company_size}
   - Lineage Record:
     {
       lineage_id: "lin-004",
       parent_lineage_ids: ["lin-003", "lin-customer-demo"],
       transformation: "revenue_enrichment",
       timestamp: "2025-01-15T11:05:00Z"
     }

5. Final Report: Revenue by Industry
   - CFO views report: "Fintech customers: $2.3M revenue"
   - Drill-down question: "Which transactions contributed to this number?"
   - Lineage Trace:
     - Start: lin-004 (final report)
     - Parent: lin-003 (monthly aggregation)
     - Parent: lin-002 (orders table rows)
     - Parent: lin-001 (original Stripe events)
     - Result: List of Stripe charge IDs that contributed

Data Lineage Schema:
| lineage_id | parent_lineage_id | source     | transformation       | timestamp           | code_version |
|------------|-------------------|------------|----------------------|---------------------|--------------|
| lin-001    | NULL              | stripe     | webhook_ingestion    | 2025-01-15 10:30:00 | webhook-v1.0 |
| lin-002    | lin-001           | lin-001    | stripe_to_orders     | 2025-01-15 10:31:00 | etl-v2.3.1   |
| lin-003    | lin-002           | lin-002... | monthly_aggregation  | 2025-01-15 11:00:00 | report-v3.2  |

Use Cases for Lineage Tracking:
- Regulatory Audit: "Show me where this number came from"
- Data Quality: "This report looks wrong, which transformation is buggy?"
- Impact Analysis: "If we change this ETL job, what reports will be affected?"
- Reproducibility: "Re-run this report with the same data and transformations from last month"
- GDPR: "Show me all analytics derived from this user's data"
```

Data lineage tracking adds metadata to your data flow, creating a directed acyclic graph (DAG) of transformations.

### Audit Chains for Compliance

Audit chains prove data hasn't been tampered with. Critical for financial and healthcare systems.

```
Immutable Audit Log Implementation:

1. Financial transaction occurs
   - Event: MoneyTransferred {from_account, to_account, amount, timestamp}
   - Audit Record:
     {
       sequence_num: 1001,
       event_type: "MoneyTransferred",
       event_data: {from: "acc-123", to: "acc-456", amount: 100.00},
       timestamp: "2025-01-15T10:30:00Z",
       user_id: "user-789",
       previous_hash: "sha256:abc123...",
       record_hash: "sha256:def456..."
     }

2. Hash chain calculation
   - Current Record Data: Concatenate sequence + event + timestamp + user
   - Previous Hash: Hash of previous audit record
   - Record Hash: SHA256(current_data + previous_hash)
   - Result: Each record cryptographically linked to previous

3. Append-only storage
   - Database: Audit records INSERT-only, no UPDATE or DELETE
   - Permissions: Application can INSERT, humans can only SELECT
   - Immutability: Even DBAs can't modify without breaking hash chain

4. Verification
   - Periodic Job: Verify audit chain integrity
   - Process:
     - Read record N
     - Read record N+1
     - Calculate: SHA256(record_N) should equal record_N+1.previous_hash
     - If mismatch: Alert security team (tampering detected)

5. Regulatory audit
   - Auditor: "Show me all money transfers from account acc-123 in January"
   - Query: SELECT * FROM audit_log WHERE event_type = 'MoneyTransferred'
           AND event_data->'from_account' = 'acc-123'
           AND timestamp >= '2025-01-01'
   - Verification: Auditor can verify hash chain themselves
   - Proof: Hashes prove records haven't been altered since creation

Audit Log Schema:
| sequence_num | event_type        | event_data              | timestamp           | user_id  | previous_hash | record_hash |
|--------------|-------------------|-------------------------|---------------------|----------|---------------|-------------|
| 1000         | AccountCreated    | {account_id: "acc-123"} | 2025-01-15 09:00:00 | sys      | sha256:...    | sha256:...  |
| 1001         | MoneyTransferred  | {from: "acc-123", ...}  | 2025-01-15 10:30:00 | user-789 | sha256:...    | sha256:...  |
| 1002         | AccountClosed     | {account_id: "acc-456"} | 2025-01-15 11:00:00 | user-111 | sha256:...    | sha256:...  |

Data Flow for Auditing:
- Every state-changing operation → Audit log entry
- Audit log is write-only (append-only)
- Hash chain prevents tampering
- Periodic verification job ensures integrity
- Auditors can independently verify chain
```

Audit chains add a parallel immutable data flow alongside your primary data flow.

### Reproducibility in ML Pipelines

Machine learning pipelines transform data through many steps. Reproducibility requires tracking every input, transformation, and parameter.

```
ML Training Pipeline Lineage:

1. Raw data collection
   - Source: Customer support tickets (database table)
   - Sample: SELECT * FROM tickets WHERE created_at >= '2025-01-01'
   - Data Version: tickets-2025-01-15 (immutable snapshot)
   - Lineage: {dataset_id: "ds-001", source: "tickets", query: "...", timestamp: "..."}

2. Data cleaning
   - Input: ds-001 (10,000 tickets)
   - Transformation: Remove HTML tags, normalize whitespace, filter non-English
   - Code: data_cleaning.py version git:abc123
   - Output: ds-002 (9,500 tickets)
   - Lineage: {dataset_id: "ds-002", parent: "ds-001", transform: "clean", code_version: "git:abc123"}

3. Feature extraction
   - Input: ds-002 (cleaned text)
   - Transformation: TF-IDF vectorization, max_features=5000
   - Code: feature_extraction.py version git:def456
   - Output: ds-003 (feature matrix 9500 x 5000)
   - Parameters: {vectorizer: "TF-IDF", max_features: 5000, min_df: 5}
   - Lineage: {dataset_id: "ds-003", parent: "ds-002", transform: "features", params: {...}}

4. Model training
   - Input: ds-003 (features + labels)
   - Algorithm: Random Forest
   - Hyperparameters: {n_estimators: 100, max_depth: 10, random_seed: 42}
   - Code: model_training.py version git:ghi789
   - Output: model-v1.5.pkl
   - Metrics: {accuracy: 0.87, precision: 0.85, recall: 0.89}
   - Lineage:
     {
       model_id: "model-v1.5",
       dataset: "ds-003",
       algorithm: "RandomForest",
       hyperparameters: {...},
       code_version: "git:ghi789",
       training_timestamp: "2025-01-15T12:00:00Z",
       metrics: {...}
     }

5. Model deployment
   - Model: model-v1.5.pkl
   - Deployment: Production API, deployed at 2025-01-15T14:00:00Z
   - Versioning: Model registry tracks which model version is in production
   - Lineage: {deployment_id: "dep-123", model_id: "model-v1.5", environment: "prod"}

6. Prediction serving
   - Request: Classify new ticket
   - Model: model-v1.5 (loaded from registry)
   - Prediction: "category: billing, confidence: 0.92"
   - Lineage:
     {
       prediction_id: "pred-456",
       model_id: "model-v1.5",
       input_hash: "sha256:...",
       prediction: "billing",
       confidence: 0.92,
       timestamp: "2025-01-16T09:30:00Z"
     }

Reproducibility Questions Answered:
- "Which data was used to train this model?"
  - Trace: model-v1.5 → ds-003 → ds-002 → ds-001 → tickets table snapshot
- "Why is model v1.5 performing differently than v1.4?"
  - Compare: model-v1.5.dataset vs model-v1.4.dataset (different data)
  - Compare: model-v1.5.hyperparameters vs model-v1.4.hyperparameters
- "Re-train the exact same model with the same data"
  - Load: ds-003 (immutable)
  - Run: model_training.py git:ghi789 with saved hyperparameters
  - Verify: Should get same model weights (if random_seed is fixed)
- "This prediction seems wrong, which model version made it?"
  - Lookup: pred-456 → model-v1.5
  - Context: Model trained on ds-003, which excluded tickets after Jan 1

ML Lineage Schema:
| lineage_id | lineage_type | parent_id | artifact_id | code_version | params           | timestamp           |
|------------|--------------|-----------|-------------|--------------|------------------|---------------------|
| lin-001    | dataset      | NULL      | ds-001      | NULL         | {query: "..."}   | 2025-01-15 10:00:00 |
| lin-002    | transform    | lin-001   | ds-002      | git:abc123   | {transform: ...} | 2025-01-15 10:30:00 |
| lin-003    | transform    | lin-002   | ds-003      | git:def456   | {vectorizer:...} | 2025-01-15 11:00:00 |
| lin-004    | model        | lin-003   | model-v1.5  | git:ghi789   | {n_estimators:100} | 2025-01-15 12:00:00 |

Tools for ML Lineage:
- MLflow: Tracks experiments, parameters, metrics, models
- DVC (Data Version Control): Versions datasets, tracks lineage
- Kubeflow Pipelines: DAG-based pipelines with built-in lineage
- Custom: Metadata database tracking dataset → transform → model chain
```

ML data flows are inherently complex. Lineage tracking makes them debuggable and reproducible.

## Advanced Visualization Techniques

Surface-level diagrams are simple numbered lists. Deep-water diagrams use formal notations for complex systems.

### C4 Model for Data Flow Diagrams

The C4 model (Context, Containers, Components, Code) provides hierarchical views of system architecture.

```
C4 Level 1: System Context (Data Flow Perspective)

Shows data flowing between systems:

[User] --registration data--> [SaaS Application] --payment data--> [Stripe]
                                     |
                                     +--email--> [SendGrid]
                                     |
                                     +--analytics--> [Google Analytics]
                                     |
                                     +--storage--> [AWS S3]

Legend:
- Boxes: Systems
- Arrows: Data flows (labeled with data type)
- External: Third-party systems
- Internal: Your system


C4 Level 2: Container Diagram (Service-Level Data Flow)

Shows data flowing between services/databases:

[Browser] --HTTPS--> [API Gateway] --mTLS--> [Auth Service] --SQL--> [User DB]
                            |                        |
                            v                        |
                     [Order Service] <---------------+
                            |
                            v
                      [PostgreSQL]
                            |
                            v
                    [Backup to S3]

Legend:
- Containers: Services, databases, apps
- Arrows: Data flow with protocol
- Databases: Cylindrical boxes


C4 Level 3: Component Diagram (Internal Service Data Flow)

Shows data flowing through components of a service:

Order Service:
[API Controller] --validate--> [Business Logic] --transform--> [Data Access Layer] --SQL--> [Database]
        |                              |
        +--log--> [Logger]             +--event--> [Event Publisher]
                      |                                |
                      v                                v
               [CloudWatch]                      [Kafka Topic]

Legend:
- Components: Classes/modules within a service
- Arrows: Data passing between components
```

C4 diagrams show data flow at different zoom levels. Use Context for stakeholder presentations, Component for developer documentation.

### BPMN for Complex Processes

Business Process Model and Notation (BPMN) shows data flow through business processes with decision points, parallel flows, and exception handling.

```
Order Fulfillment Process (BPMN-style):

START
  |
  v
[Receive Order]
  |
  v
<Check Inventory> (Decision)
  |
  +-- In Stock --> [Reserve Items] --> [Authorize Payment] --> <Payment OK?> (Decision)
  |                                              |                    |
  |                                              |                    +-- Success --> [Ship Order] --> [Send Receipt] --> END
  |                                              |                    |
  |                                              |                    +-- Failure --> [Release Reservation] --> [Notify User] --> END
  |
  +-- Out of Stock --> [Backorder Process] --> [Notify User] --> END

Legend:
- [Rectangle]: Task/Activity (data transformation)
- <Diamond>: Decision point (data-driven branching)
- Arrows: Sequence flow (data passing)
- START/END: Process boundaries

Data Flows Annotated:
- Receive Order: Data in = {user_id, items, shipping_address}
- Check Inventory: Data in = {items}, Data out = {in_stock: true/false}
- Reserve Items: Data in = {items}, Data out = {reservation_id}
- Authorize Payment: Data in = {amount, payment_token}, Data out = {authorization_id, status}
- Ship Order: Data in = {reservation_id, address}, Data out = {tracking_number}
```

BPMN is useful when business stakeholders need to understand data flows through complex processes with many branches.

### Swimlane Diagrams for Multi-Actor Flows

Swimlane diagrams show which actor (user, service, third-party) handles each step of a data flow.

```
Password Reset Flow (Swimlane Diagram):

Actor          | Data Flow
---------------|-----------------------------------------------------------
User           | [Click "Forgot Password"] --> Enter email
               |         |
               |         v
Browser        | POST /api/reset {email} ------------------------------+
               |                                                       |
               |                                                       v
API Server     |                                             [Verify email exists]
               |                                                       |
               |                                                       v
               |                                             [Generate reset token]
               |                                                       |
               |                                                       v
Database       |                                             [Store token, expires 1hr]
               |                                                       |
               |                                                       v
API Server     |                                             [Queue email job]
               |                                                       |
               |                                                       v
Email Service  |                                             [Send reset link]
(SendGrid)     |                                                       |
               |                                                       v
User           | [Receive email] --> Click reset link
               |         |
               |         v
Browser        | GET /reset?token=xyz
               |         |
               |         v
               | [Enter new password] --> POST /api/reset-confirm {token, password}
               |                                                       |
               |                                                       v
API Server     |                                             [Verify token valid & not expired]
               |                                                       |
               |                                                       v
               |                                             [Hash new password]
               |                                                       |
               |                                                       v
Database       |                                             [Update password, delete token]
               |                                                       |
               |                                                       v
Browser        | <-- Success response
               |         |
               |         v
User           | [See success message]

Legend:
- Swimlanes: Horizontal bands for each actor
- Arrows: Data flow between actors
- Boxes: Actions performed by that actor
```

Swimlane diagrams make it obvious when data crosses organizational boundaries (your service to third-party).

## Real-World Case Studies

Theory is useful. Let's see how this works in production systems.

### Case Study: Stripe's Payment Data Flow

Stripe processes billions of dollars. Their data flow is designed for security and compliance.

```
Stripe Payment Flow (Simplified):

1. Merchant integrates Stripe.js
   - Merchant's Website: Includes <script src="https://js.stripe.com/v3/"></script>
   - Stripe.js: Loads in merchant's page, renders payment form in iframe
   - Data Isolation: Merchant's JavaScript cannot access card number in iframe

2. Customer enters card details
   - Browser: Card number, expiry, CVV entered in Stripe-controlled iframe
   - Data Flow: Card data never touches merchant's DOM or servers
   - Compliance: Merchant's servers never see cardholder data (out of PCI scope)

3. Stripe.js tokenizes card
   - Client-Side: Stripe.js calls Stripe API directly from browser
   - Request: HTTPS POST to api.stripe.com {card_number, expiry, cvv}
   - Response: {token: "tok_abc123"} (single-use token, expires in minutes)
   - Data Flow: Card data → Stripe servers (never merchant)

4. Merchant's server charges token
   - Merchant Server: POST to Stripe API {token, amount, currency}
   - Stripe: Exchanges token for stored card, processes charge
   - Response: {charge_id, status, last4, brand}
   - Data Flow: Token → Stripe → Charge confirmation (no full card data)

5. Stripe stores card (if recurring)
   - Stripe Database: Encrypted cardholder data
   - Encryption: Separate keys per merchant, rotated regularly
   - Access: Strict need-to-know (engineers can't see production card data)
   - Geography: Stored in region per merchant requirement

6. Payment network communication
   - Stripe → Visa/Mastercard: Authorization request
   - Payment Network: Routes to issuing bank
   - Issuing Bank: Approves or declines
   - Response: Flows back through network → Stripe → Merchant

7. Merchant fulfills order
   - Merchant: Receives charge_id and status
   - Storage: Stores charge_id (not card data)
   - Fulfillment: Ships product or activates service

Data Flow Security:
- Cardholder data never touches merchant servers (PCI scope reduction)
- Tokenization: Reversible only by Stripe
- Encryption: At rest and in transit
- Network: Stripe has Level 1 PCI-DSS certification
- Audit: Every card access logged

Compliance:
- PCI-DSS Level 1: Stripe is audited annually by Qualified Security Assessor
- Merchant: Uses Stripe's SAQ A (simplest self-assessment)
- Data Retention: Stripe purges declined cards, retains successful per network rules
- Regional: Stripe can store data in specific regions for GDPR compliance
```

Key lesson: Stripe's entire business model is architecting data flow to minimize their customers' compliance burden.

### Case Study: Healthcare PHI Data Flow

Protected Health Information (PHI) under HIPAA has strict flow requirements.

```
Electronic Health Records (EHR) System Data Flow:

1. Patient check-in
   - Front Desk: Enters patient demographics (name, DOB, SSN, insurance)
   - Data Classification: PHI (identifiable health information)
   - Access: Front desk staff have role-based access
   - Audit: Every field entry logged (user_id, field, timestamp)

2. Clinical examination
   - Physician: Documents symptoms, diagnosis, treatment plan
   - Data Entry: Tablet with EHR app (local offline storage for reliability)
   - Sync: Encrypted sync to server when network available
   - Audit: Document creation and every edit logged

3. EHR database storage
   - Database: On-premise or HIPAA-compliant cloud (AWS/Azure with BAA)
   - Encryption: AES-256 at rest, TLS 1.3 in transit
   - Access Control: Role-based (physicians see their patients, admins see all)
   - Minimum Necessary: Users see only data needed for their role

4. Lab order placed
   - Physician: Orders blood work via EHR
   - Data Flow: EHR → HL7 message → Lab system
   - HL7 Format: Standardized healthcare message format
   - Data Sent: Patient ID, ordered tests, physician info
   - Encryption: VPN tunnel or direct encrypted connection

5. Lab results return
   - Lab System: Completes tests, sends HL7 message back
   - Data Flow: Lab → HL7 → EHR (auto-imported into patient chart)
   - Alert: Physician notified of critical results
   - Audit: Lab result receipt logged

6. Prescription sent to pharmacy
   - Physician: Prescribes medication via EHR
   - Data Flow: EHR → Surescripts (prescription network) → Pharmacy
   - Encryption: All hops encrypted
   - Data Sent: Patient ID, medication, dosage, physician
   - Audit: Prescription transmission logged

7. Patient portal access
   - Patient: Logs into portal to view results
   - Authentication: MFA required (password + SMS code)
   - Authorization: Patient sees only their own data
   - Data Filtering: Some notes hidden per physician's discretion
   - Audit: Patient access logged (separate from clinical access)

8. Billing integration
   - EHR: Sends encounter data to billing system
   - Data Flow: Clinical codes (ICD-10, CPT) + demographics
   - Minimum Necessary: Billing doesn't get full clinical notes
   - Data Sent: Patient ID, diagnosis codes, procedure codes, insurance
   - Compliance: Billing system also HIPAA-compliant

9. Research data extraction (de-identified)
   - Research Team: Requests data for study
   - IRB Approval: Institutional Review Board approves study
   - De-identification: Strip 18 HIPAA identifiers (name, DOB, SSN, etc.)
   - Data Export: De-identified records only
   - Audit: Data export logged, researcher access tracked

10. Data retention and deletion
   - Retention: Medical records kept 7+ years (state law dependent)
   - Deletion: After retention period, secure deletion
   - Backups: Encrypted, same retention policy
   - Audit Logs: Kept longer than data (often 10+ years)

HIPAA Data Flow Requirements Met:
- Encryption: In transit (TLS) and at rest (AES-256)
- Access Control: Role-based, minimum necessary
- Audit Trail: Every access logged (who, what, when, why)
- Business Associate Agreements: With all third parties (lab, pharmacy, cloud provider)
- Patient Rights: Access, amendment, accounting of disclosures
- Breach Notification: Documented procedures if data flows to unauthorized party
```

Key lesson: Healthcare data flows require comprehensive audit trails and encryption at every hop. The data flow map doubles as compliance documentation.

### Case Study: Financial Audit Trail

Financial systems need immutable audit trails for regulatory compliance.

```
Trading Platform Data Flow (Audit-Focused):

1. User places trade order
   - UI: User enters {symbol: "AAPL", quantity: 100, type: "market"}
   - Client-Side Validation: Check format, positive quantity
   - Timestamp: Client records intention timestamp (for latency analysis)

2. Order sent to trading API
   - Transport: HTTPS POST to /api/orders
   - Authentication: JWT with user_id, account_id
   - Authorization: Verify account has sufficient funds
   - Audit: Log incoming order (user, account, order details, timestamp)

3. Order validated
   - Validation: Check symbol exists, market is open, quantity is valid lot size
   - Risk Check: Verify account has buying power
   - Compliance Check: Pattern day trader rules, position limits
   - Audit: Log validation result (pass/fail, reasons)

4. Order sent to exchange
   - Routing: Determine best exchange for execution
   - FIX Protocol: Standard financial protocol for order routing
   - Data Sent: {symbol, quantity, order_type, account_id}
   - Audit: Log order sent to exchange (exchange, timestamp, order_id)
   - Immutable: Audit record hashed and chained (tamper-evident)

5. Execution confirmation from exchange
   - Exchange Response: {order_id, execution_id, fill_price, fill_quantity, timestamp}
   - Latency: Log exchange timestamp vs. our timestamp
   - Audit: Log execution (execution_id, price, quantity, timestamp)

6. Update account balances
   - Database Transaction: BEGIN
     - Deduct cash: UPDATE accounts SET cash_balance = cash_balance - (price * quantity)
     - Add shares: UPDATE positions SET quantity = quantity + shares
     - Record trade: INSERT INTO trades (execution_id, price, quantity, ...)
   - Database Transaction: COMMIT
   - Audit: Log balance update (before balance, after balance, transaction_id)

7. Confirmation sent to user
   - Notification: Email + push notification
   - Data: Trade confirmation (symbol, quantity, price, timestamp)
   - Audit: Log notification sent (channel, timestamp)

8. Regulatory reporting
   - Daily Job: Extract all trades
   - Format: CAT (Consolidated Audit Trail) format for SEC
   - Data Sent: Every order, modification, cancellation, execution
   - Encryption: Encrypted transmission to SEC reporting system
   - Audit: Log report generation and submission

9. Account statement generation
   - Monthly Job: Generate account statements
   - Data: All trades, dividends, fees, balances for the month
   - Storage: PDF stored encrypted, user can download
   - Retention: 7 years (SEC requirement)

Audit Trail Requirements:
- Immutability: Append-only audit log, hash-chained
- Completeness: Every state change logged
- Timestamp: Synchronized to authoritative time source (NIST)
- Tamper-Evidence: Hash chain breaks if record is modified
- Retention: 7 years minimum for SEC compliance
- Access: Audit logs are read-only, even for DBAs

Audit Log Schema:
| seq  | event_type     | user_id  | account_id | order_data                  | timestamp (UTC)     | previous_hash | record_hash |
|------|----------------|----------|------------|-----------------------------|---------------------|---------------|-------------|
| 1001 | OrderReceived  | user-123 | acct-456   | {symbol: "AAPL", qty: 100}  | 2025-01-15 14:30:00 | sha256:...    | sha256:...  |
| 1002 | OrderValidated | user-123 | acct-456   | {validation: "pass"}        | 2025-01-15 14:30:01 | sha256:...    | sha256:...  |
| 1003 | OrderRouted    | user-123 | acct-456   | {exchange: "NASDAQ"}        | 2025-01-15 14:30:02 | sha256:...    | sha256:...  |
| 1004 | OrderExecuted  | user-123 | acct-456   | {price: 150.25, qty: 100}   | 2025-01-15 14:30:03 | sha256:...    | sha256:...  |

Regulatory Questions Answered:
- "Show me all trades for account X in January"
  - Query audit log, filtered by account_id and timestamp
- "Prove this trade happened at this price"
  - Show audit record, verify hash chain hasn't been broken
- "What was the latency from order to execution?"
  - Diff: OrderReceived timestamp vs. OrderExecuted timestamp
- "Who had access to this account's data?"
  - Separate access audit log tracks every query against account data
```

Key lesson: Financial data flows require cryptographic proof of integrity. The audit trail is as important as the operational data.

## Practical Application: Conducting a Data Flow Review

You've read the theory. Here's how to actually do this work.

### Pre-Implementation Data Flow Review

Before building a new feature, review its data flows.

**1. Identify Data Elements**
- What data does this feature collect, process, or display?
- Classify each element: Public, Internal, Confidential, Restricted (PII/PHI/PCI)
- Example: User registration feature
  - Email: PII (restricted)
  - Password: Credential (restricted, hashed)
  - Username: Internal (non-sensitive)
  - Created_at: Internal (non-sensitive)

**2. Map the Flow**
- Draw the path from source to destination
- Include all intermediate systems (caches, queues, third-parties)
- Note transformations (hashing, encryption, aggregation)

**3. Identify Trust Boundaries**
- Mark every place data crosses a security boundary
- User input → Server
- Server → Database
- Server → Third-party
- Database → Backup

**4. Document Controls at Each Boundary**
- Validation: What schema/format checks happen?
- Authorization: Who can perform this action?
- Encryption: Is data encrypted in transit? At rest?
- Audit: Is this access logged?

**5. Check for Red Flags**
- Sensitive data in logs?
- Missing validation at any boundary?
- Credentials in client code?
- Unclear third-party data ownership?
- Can data be deleted if user requests it?

**6. Get Sign-Off**
- Security team: Reviews trust boundaries and encryption
- Legal/Compliance: Reviews third-party data sharing, retention
- Engineering lead: Reviews technical feasibility

**7. Document for Future Reference**
- Store data flow map with feature documentation
- Update when flow changes
- Reference during security audits

### Post-Incident Data Flow Analysis

When something goes wrong, trace the data flow to find the root cause.

**Incident: PII Leaked in Application Logs**

1. Identify the leak
   - Discovery: Security team finds email addresses in CloudWatch logs
   - Scope: How much data? How long has it been happening?

2. Trace the data flow backward
   - Where did the logged data come from?
   - CloudWatch ← Application logger ← Error handler ← API request
   - Root cause: Error handler logs full request body on validation errors

3. Identify all affected systems
   - Where else is this data logged?
   - Check: Application logs, API gateway logs, load balancer logs
   - Find: Application logs and API gateway both have PII

4. Assess compliance impact
   - How long retained? CloudWatch: 90 days, API Gateway: 7 days
   - Who has access? Dev team, ops team, security team
   - What's the risk? Logs accessible by ~20 engineers

5. Remediate
   - Immediate: Stop the leak (deploy fix to remove PII from logs)
   - Short-term: Purge existing logs with PII
   - Long-term: Add PII scrubbing to logging library

6. Update data flow map
   - Mark: "Error handler must scrub PII before logging"
   - Add: Pre-deployment checklist item "Verify no PII in logs"

7. Lessons learned
   - Why wasn't this caught in design review?
   - Add: Data flow review must include error paths, not just happy path

## Key Takeaways

Deep-water data flow mapping is about proving you have control over data in regulated, complex, or security-critical systems.

**Compliance-Driven Mapping:**
- GDPR requires data lineage, legal basis, retention periods for every flow
- HIPAA requires audit trails showing who accessed PHI, when, and why
- PCI-DSS requires minimizing cardholder data flows (use tokenization)
- Right to deletion requires reverse-tracing data through all systems

**Event-Driven Architectures:**
- Event sourcing stores immutable event log as source of truth
- CQRS projects events into multiple read models
- Sagas coordinate distributed transactions with compensating actions
- Multi-tenant events require tenant_id in every message for isolation

**Multi-Tenancy:**
- Database-per-tenant: Perfect isolation, expensive
- Schema-per-tenant: Good isolation, moderate cost
- Row-level tenant_id: Cheapest, requires discipline (easy to leak data)
- Data residency: Some tenants require data in specific geographic regions

**Security Boundaries:**
- Zero-trust: Authenticate and authorize at every service boundary
- Encryption zones: Different encryption requirements based on data sensitivity
- Trust boundaries: Validate going in, sanitize going out
- Field-level encryption: Encrypt sensitive columns separately with HSM keys

**Data Provenance:**
- Lineage tracking: Record every transformation from source to destination
- Audit chains: Cryptographically prove data hasn't been tampered with
- ML reproducibility: Track datasets, code versions, hyperparameters
- Regulatory audits: "Show me where this number came from"

**Advanced Visualization:**
- C4 model: Context → Containers → Components → Code (zoom levels)
- BPMN: Business process flows with decision points and exception handling
- Swimlane diagrams: Show which actor handles each step

**Real-World Complexity:**
- Stripe: Architected to keep cardholder data off merchant servers
- Healthcare: HIPAA requires encryption, access controls, and comprehensive audits
- Financial: Immutable audit logs with hash chains for tamper-evidence

The difference between surface and deep-water data flow mapping: Surface shows what happens when everything works. Deep-water shows what happens when regulators audit you, systems fail, or users exercise their rights. Build for the deep-water scenarios from the start—retrofitting compliance is expensive and sometimes impossible.

When you can demonstrate complete data lineage, cryptographic audit trails, and tenant isolation to an auditor, you've mastered deep-water data flow mapping. Until then, keep tracing those arrows.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[← Mid-Depth](../mid-depth/index.md)** Practical patterns and implementation

### Related Topics
- [Architecture Design](../../architecture-design/deep-water/index.md) - Related design considerations
- [Database Design](../../database-design/deep-water/index.md) - Related design considerations
- [State Management Design](../../state-management-design/deep-water/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
