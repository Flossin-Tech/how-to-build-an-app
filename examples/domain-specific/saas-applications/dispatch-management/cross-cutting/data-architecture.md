# Data Architecture

## Data Strategy Overview

The dispatch application's data architecture must support:
- **Transactional integrity**: Dispatch assignments are critical operations
- **Audit requirements**: Complete history of all dispatch operations
- **Query performance**: Real-time dashboard needs fast queries
- **Scalability**: From hundreds to millions of records
- **Multi-tenancy**: Eventually isolate customer data (Mid-Depth+)

## Database Technology Selection

### PostgreSQL: The Right Choice for All Levels

**Why PostgreSQL**:
- Mature, proven RDBMS with ACID guarantees
- Excellent JSON support (JSONB) for flexible schemas
- Row-level security for multi-tenancy
- Strong community and ecosystem
- Schema support for logical data separation
- Can scale from single instance to distributed cluster

**Alternatives Considered and Rejected**:
- **MySQL**: Weaker JSON support, less sophisticated partitioning
- **MongoDB**: No ACID guarantees, harder to ensure consistency in critical dispatch workflow
- **SQLite**: Excellent for Surface Level but migration path to production database painful

---

## Database Architecture by Maturity Level

### Surface Level: Single PostgreSQL Instance

**Configuration**:
- PostgreSQL 15+ running in Docker container
- Single database: `dispatch`
- Single schema: `public`
- 4 GB RAM allocated
- SSD storage (50 GB sufficient)
- Daily backups (pg_dump) to local filesystem

**Connection Management**:
- Flask SQLAlchemy connection pool (5-10 connections)
- No pgBouncer (not needed at this scale)

**Performance Tuning**:
- Default PostgreSQL settings acceptable
- Add indexes on foreign keys and frequently queried columns
- No partitioning (data volume too small)

**Backup Strategy**:
```bash
# Daily cron job
pg_dump -U postgres -d dispatch -F c -f /backups/dispatch_$(date +%Y%m%d).backup
# Keep 30 days of backups
find /backups -name "dispatch_*.backup" -mtime +30 -delete
```

**Limitations**:
- No high availability (single point of failure)
- No read replicas (all queries hit primary)
- Manual backup restoration
- Limited to single host resources

---

### Mid-Depth: PostgreSQL with HA and Replication

**Configuration**:
- Primary-replica setup (1 primary, 1-2 read replicas)
- Managed service preferred (AWS RDS, Google Cloud SQL, Azure Database)
- 16 GB RAM on primary, 8 GB on replicas
- SSD storage (500 GB)
- Multi-tenant architecture: Schema-per-tenant

**Schema Design for Multi-Tenancy**:
```sql
-- Tenant management
CREATE SCHEMA tenant_management;

CREATE TABLE tenant_management.tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE NOT NULL,
    schema_name VARCHAR(63) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Each tenant gets their own schema
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_contoso;

-- Identical table structure in each tenant schema
CREATE TABLE tenant_acme.equipment ( ... );
CREATE TABLE tenant_contoso.equipment ( ... );
```

**Connection Routing**:
```python
# Flask determines tenant from subdomain or JWT claim
tenant_id = get_tenant_from_request()
tenant = Tenant.query.get(tenant_id)

# Set search_path for this connection
db.session.execute(f"SET search_path TO {tenant.schema_name}")

# All subsequent queries operate in tenant's schema
equipment = Equipment.query.all()  # Queries tenant_acme.equipment
```

**Read Replica Usage**:
- Write operations (dispatch, complete): Primary database
- Read operations (reports, dashboard): Read replica
- Prevents heavy reporting queries from impacting live operations

**Connection Pooling**:
- pgBouncer (transaction pooling mode)
- Pool size: 100 connections
- Max client connections: 1000
- Routes reads to replicas, writes to primary

**Backup Strategy**:
- Automated backups via managed service (daily, retained 30 days)
- Point-in-time recovery (PITR) capability
- Cross-region backup replication
- Backup restoration tested monthly

**Performance Enhancements**:
- Partitioning on `dispatch_assignments` by month (keeps current queries fast)
- Materialized views for dashboard metrics (refreshed every 5 minutes)
- Query optimization (EXPLAIN ANALYZE on slow queries)
- Statement timeout (30 seconds) to prevent runaway queries

---

### Deep-Water: Distributed PostgreSQL

**Configuration**:
- Sharded PostgreSQL (Citus Data extension) or managed service (AWS Aurora Global)
- Multiple database instances across regions
- Read replicas in each region
- 64 GB RAM per shard
- NVMe SSD storage (2 TB per shard)

**Sharding Strategy**:
- **Shard by tenant_id**: Large tenants get dedicated shards
- **Colocate related tables**: Work orders, equipment, dispatches in same shard
- **Cross-shard queries rare**: Most operations isolated to single tenant

**Geographic Distribution**:
```
US-East Region:
  - Primary shard (US customers A-M)
  - Replica of US-West shard (disaster recovery)

US-West Region:
  - Primary shard (US customers N-Z)
  - Replica of US-East shard (disaster recovery)

EU Region:
  - Primary shard (European customers)
  - Replicas of US shards (read-only, analytics)
```

**Data Residency Compliance**:
- EU customers' data stored in EU region only (GDPR requirement)
- US customers' data can replicate to EU for read-only analytics
- Per-tenant configuration: `data_residency_region`

**Advanced Features**:
- **Change Data Capture (CDC)**: Stream changes to analytics warehouse (Snowflake, BigQuery)
- **CQRS Pattern**: Write to PostgreSQL, replicate to Elasticsearch for complex searches
- **Event Sourcing** (optional): Store all dispatch events, rebuild state from event log

**Backup & Disaster Recovery**:
- Continuous WAL archiving to S3
- Cross-region replication with <5 minute lag
- RTO: 1 hour (failover to replica region)
- RPO: 5 minutes (max data loss)
- Quarterly DR drills (simulate primary region failure)

---

## Data Model Design

### Core Entity Relationships

```
┌─────────────┐
│   User      │────────┐
│             │        │
│ - id (PK)   │        │ (created_by)
│ - keycloak  │        │
│ - role      │        │
└─────────────┘        │
       │               │
       │ (dispatcher)  │
       │               │
       │               ▼
       │        ┌──────────────┐         ┌──────────────┐
       │        │ WorkOrder    │────────▶│ ConfigFile   │
       │        │              │         │              │
       │        │ - id (PK)    │         │ - id (PK)    │
       │        │ - order_num  │         │ - filepath   │
       │        │ - status     │         └──────────────┘
       │        └──────────────┘
       │               │
       │               │
       │               ▼
       │        ┌──────────────────────┐
       └───────▶│ DispatchAssignment   │◀────┐
                │                      │     │
                │ - id (PK)            │     │
                │ - work_order_id (FK) │     │
                │ - equipment_id (FK)  │     │
                │ - driver_id (FK)     │     │
                │ - dispatcher_id (FK) │     │
                │ - status             │     │
                │ - dispatched_at      │     │
                │ - completed_at       │     │
                └──────────────────────┘     │
                       │                     │
                       │                     │
                       ▼                     │
                ┌──────────────┐             │
                │ StatusReport │             │
                │              │             │
                │ - id (PK)    │             │
                │ - filepath   │             │
                └──────────────┘             │
                                             │
┌──────────────┐                             │
│ Equipment    │─────────────────────────────┘
│              │
│ - id (PK)    │
│ - type_id    │
│ - identifier │
│ - status     │
└──────────────┘
       │
       │
       ▼
┌──────────────┐
│ EquipmentType│
│              │
│ - id (PK)    │
│ - name       │
└──────────────┘

┌──────────────┐
│DispatchQueue │
│              │
│ - id (PK)    │
│ - work_order │
│ - equipment  │
│   _type_id   │
│ - priority   │
│ - requested  │
│   _at        │
└──────────────┘
```

### Table Design Principles

**Primary Keys**:
- Use UUIDs (not auto-incrementing integers)
- Prevents ID prediction attacks
- Easier for distributed databases (no collision risk)
- Can generate client-side if needed

**Timestamps**:
- Every table has `created_at` and `updated_at`
- Use `TIMESTAMP WITH TIME ZONE` (store in UTC)
- Application converts to user's timezone for display

**Status Fields**:
- Use VARCHAR enums (not database ENUMs)
- Easier to add new statuses without migration
- Application-level validation ensures valid values

**Soft Deletes** (Mid-Depth and beyond):
- `deleted_at TIMESTAMP NULL`
- Soft delete = set timestamp, don't actually remove row
- Queries filter out deleted records
- Allows audit trail and potential recovery

**Audit Columns** (Mid-Depth and beyond):
```sql
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id),
deleted_by UUID REFERENCES users(id)
```

---

## Indexing Strategy

### Surface Level: Basic Indexes

**Critical Indexes**:
```sql
-- Equipment availability queries
CREATE INDEX idx_equipment_status ON equipment(status) WHERE status = 'available';

-- Active dispatch queries
CREATE INDEX idx_dispatch_status ON dispatch_assignments(status) WHERE status IN ('dispatched', 'en_route', 'on_site', 'returning');

-- Work order lookups
CREATE INDEX idx_workorder_status ON work_orders(status);
CREATE UNIQUE INDEX idx_workorder_number ON work_orders(order_number);

-- Queue processing
CREATE INDEX idx_queue_priority_time ON dispatch_queue(priority DESC, requested_at ASC);

-- Foreign key indexes (PostgreSQL doesn't auto-index FKs)
CREATE INDEX idx_dispatch_workorder ON dispatch_assignments(work_order_id);
CREATE INDEX idx_dispatch_equipment ON dispatch_assignments(equipment_id);
CREATE INDEX idx_dispatch_driver ON dispatch_assignments(driver_id);
CREATE INDEX idx_configfile_workorder ON config_files(work_order_id);
```

**Index Maintenance**:
- PostgreSQL auto-vacuums handle most cleanup
- Manual REINDEX if queries slow down unexpectedly

---

### Mid-Depth: Advanced Indexing

**Composite Indexes**:
```sql
-- Dispatcher dashboard: "Show me active dispatches for equipment type X"
CREATE INDEX idx_dispatch_equipment_type_status ON dispatch_assignments(equipment_id, status) INCLUDE (work_order_id, driver_id, dispatched_at);

-- Report filtering: "Show me all completed dispatches in December for driver Y"
CREATE INDEX idx_dispatch_completed_driver_date ON dispatch_assignments(driver_id, completed_at) WHERE status = 'completed';
```

**Partial Indexes** (indexes only relevant rows):
```sql
-- Most queries only care about active dispatches
CREATE INDEX idx_active_dispatches ON dispatch_assignments(dispatched_at) WHERE status NOT IN ('completed', 'recalled');
```

**GIN Indexes for JSONB** (if using JSON columns for flexible data):
```sql
-- Work order metadata stored as JSONB
ALTER TABLE work_orders ADD COLUMN metadata JSONB;
CREATE INDEX idx_workorder_metadata ON work_orders USING GIN (metadata);

-- Query: Find work orders with specific metadata
SELECT * FROM work_orders WHERE metadata @> '{"priority": "urgent"}';
```

**Index Monitoring**:
```sql
-- Find unused indexes (candidates for removal)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_%';

-- Find missing indexes (high seq_scan on large tables)
SELECT schemaname, tablename, seq_scan, seq_tup_read,
       idx_scan, seq_tup_read / seq_scan AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;
```

---

### Deep-Water: Specialized Indexing

**Partitioned Table Indexes**:
```sql
-- Partition dispatch_assignments by month
CREATE TABLE dispatch_assignments (
    id UUID NOT NULL,
    dispatched_at TIMESTAMP NOT NULL,
    ...
) PARTITION BY RANGE (dispatched_at);

CREATE TABLE dispatch_assignments_2025_01 PARTITION OF dispatch_assignments
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes created on each partition automatically
CREATE INDEX idx_dispatch_2025_01_status ON dispatch_assignments_2025_01(status);
```

**Covering Indexes** (index-only scans):
```sql
-- Dashboard query: "Show equipment ID, status, and last dispatch time"
CREATE INDEX idx_equipment_covering ON equipment(id, status, updated_at);
-- PostgreSQL can answer query entirely from index, no table scan
```

**Expression Indexes**:
```sql
-- Search work orders by lowercase order number
CREATE INDEX idx_workorder_number_lower ON work_orders(LOWER(order_number));
SELECT * FROM work_orders WHERE LOWER(order_number) = 'wo-12345';
```

---

## Data Retention & Archival

### Surface Level: Simple Retention

**Policy**:
- Keep all data indefinitely (data volume small)
- Manual cleanup if storage becomes issue

---

### Mid-Depth: Automated Archival

**Retention Policies**:
- **Active work orders**: Until completed
- **Completed work orders**: 2 years in primary DB, then archive
- **Dispatch assignments**: 2 years in primary DB, then archive
- **Status reports**: 7 years (compliance requirement)
- **Audit logs**: 3 years

**Archival Process**:
```sql
-- Monthly job: Move old data to archive schema
CREATE SCHEMA archive;

-- Move completed dispatches older than 2 years
INSERT INTO archive.dispatch_assignments
SELECT * FROM dispatch_assignments
WHERE status IN ('completed', 'recalled')
  AND completed_at < NOW() - INTERVAL '2 years';

DELETE FROM dispatch_assignments
WHERE status IN ('completed', 'recalled')
  AND completed_at < NOW() - INTERVAL '2 years';

-- Archive schema has same structure, different storage (cheaper tier)
```

**Cold Storage**:
- Export archived data to S3 Glacier (very cheap: $0.004/GB/month)
- Queryable via AWS Athena if needed
- Reports remain in S3 Standard tier (fast access)

---

### Deep-Water: Tiered Storage

**Hot Tier** (NVMe SSD):
- Last 6 months of data
- All active and recent dispatches
- Fast queries (<100ms)

**Warm Tier** (Standard SSD):
- 6 months to 2 years
- Accessible but slower (< 1 second)
- Read replicas on warm storage

**Cold Tier** (Object Storage):
- 2+ years old
- S3 Glacier or equivalent
- Query via analytics engine (Athena, BigQuery)
- Retrieval time: Minutes to hours

**Automated Tiering**:
- Database lifecycle policies move data automatically
- No manual intervention required
- Cost optimization: Hot tier 100x more expensive than cold

---

## Data Flow Architecture

### Transactional Flow (Write Path)

```
User Action (Dispatch Request)
        ↓
Frontend (React)
        ↓ HTTPS + JWT
Backend API (Flask)
        ↓ Validate, Business Logic
┌───────────────────────┐
│ Database Transaction  │
│ 1. Check availability │
│ 2. Create assignment  │
│ 3. Update equipment   │
│ 4. Update work order  │
│ COMMIT or ROLLBACK    │
└───────────────────────┘
        ↓
Response to User
```

**Transaction Management**:
```python
# Pseudocode for dispatch operation
from contextlib import contextmanager

@contextmanager
def transaction():
    try:
        yield
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

with transaction():
    # All-or-nothing operation
    equipment = Equipment.query.filter_by(id=eq_id, status='available').with_for_update().first()
    if not equipment:
        raise NoEquipmentAvailable()
    
    driver = find_available_driver()
    if not driver:
        create_queue_entry()
        return
    
    assignment = DispatchAssignment(
        equipment_id=equipment.id,
        driver_id=driver.id,
        work_order_id=wo_id,
        status='dispatched'
    )
    db.session.add(assignment)
    
    equipment.status = 'dispatched'
    work_order.status = 'assigned'
```

**Key Points**:
- `with_for_update()`: Locks row for duration of transaction (prevents double-dispatch)
- Atomic operation: All updates succeed or all fail
- No partial states

---

### Query Flow (Read Path)

**Surface Level** (simple):
```
User Request (Dashboard)
        ↓
Frontend
        ↓ Poll every 30 seconds
Backend API
        ↓ Query database
PostgreSQL
        ↓
Response (JSON)
```

**Mid-Depth** (with caching):
```
User Request
        ↓
Backend API
        ↓ Check cache
Redis Cache ──(miss)──▶ PostgreSQL Read Replica
        │                      │
        │(hit)                 │
        ▼                      ▼
    Response ◀────────────Cache result (TTL 30s)
```

**Deep-Water** (with multiple layers):
```
User Request
        ↓
API Gateway (caching)
        ↓
Backend Service
        ↓
┌─────────────────┐
│ Multi-tier      │
│ 1. Redis cache  │
│ 2. Read replica │
│ 3. Elasticsearch│ (for complex searches)
└─────────────────┘
        ↓
Response
```

---

## File Storage Architecture

### Surface Level: Local Filesystem

**Configuration Files & Reports**:
```
/var/app/
  /uploads/
    /config_files/
      /{work_order_id}/
        config_v1.json
        config_v2.json
  /reports/
    /{dispatch_assignment_id}/
      status_report.pdf
```

**Database References**:
```sql
-- config_files table stores path
filepath = '/var/app/uploads/config_files/abc-123/config_v1.json'

-- Application serves files
@app.route('/api/config-files/<file_id>')
def download_config_file(file_id):
    config_file = ConfigFile.query.get(file_id)
    return send_file(config_file.filepath)
```

**Limitations**:
- No redundancy (single host failure = data loss)
- No scalability (single host storage limit)
- Difficult backups (must backup filesystem separate from database)

---

### Mid-Depth: Object Storage (S3)

**Architecture**:
```
User Uploads File
        ↓
Backend API
        ↓ Generate pre-signed URL
S3 Bucket
        ↓
Store object with metadata

Database stores S3 key (not full file)
```

**S3 Bucket Structure**:
```
s3://dispatch-app-files-prod/
  /tenants/
    /acme/
      /config-files/
        abc-123/config_v1.json
      /reports/
        def-456/status_report.pdf
  /backups/
    database_2025-01-15.backup
```

**Direct Upload Flow** (efficient):
```python
# Backend generates pre-signed POST URL
s3_client = boto3.client('s3')
presigned_post = s3_client.generate_presigned_post(
    Bucket='dispatch-app-files',
    Key=f'tenants/{tenant_id}/config-files/{work_order_id}/{filename}',
    ExpiresIn=3600
)

# Return to frontend
return jsonify({
    'upload_url': presigned_post['url'],
    'fields': presigned_post['fields']
})

# Frontend uploads directly to S3 (not through backend)
# After upload, frontend notifies backend
# Backend creates ConfigFile record with S3 key
```

**Benefits**:
- Unlimited storage
- 99.999999999% durability (11 nines)
- Versioning enabled (can restore previous versions)
- Lifecycle policies (auto-delete files older than X years)
- CloudFront CDN for fast global access

**Security**:
- Bucket not publicly accessible
- All access via pre-signed URLs (temporary, time-limited)
- Server-side encryption (SSE-S3 or SSE-KMS)

---

### Deep-Water: Multi-Region Object Storage

**Architecture**:
- S3 Cross-Region Replication (CRR)
- Users access bucket in nearest region
- Automatic failover if region unavailable

**Content Delivery**:
```
User downloads report
        ↓
CloudFront (CDN) ──(cache miss)──▶ S3 Origin
        │                              │
        │(cache hit)                   │
        ▼                              ▼
Fast delivery                    Cached in edge location
(<50ms latency)                  (subsequent requests fast)
```

**Cost Optimization**:
- Hot files (recent reports): S3 Standard
- Warm files (6-24 months): S3 Intelligent-Tiering
- Cold files (2+ years): S3 Glacier Deep Archive
- Lifecycle policy auto-transitions based on age

---

## Data Consistency & Integrity

### ACID Guarantees

**Atomicity**: All-or-nothing transactions
```python
# Either equipment is dispatched AND work order updated AND assignment created
# OR none of these happen
with transaction():
    equipment.status = 'dispatched'
    work_order.status = 'assigned'
    assignment = create_dispatch_assignment()
```

**Consistency**: Database constraints enforced
```sql
-- Equipment can only be dispatched once
ALTER TABLE dispatch_assignments ADD CONSTRAINT unique_active_equipment
    EXCLUDE USING gist (equipment_id WITH =)
    WHERE (status IN ('dispatched', 'en_route', 'on_site', 'returning'));

-- Driver can only have one active assignment
ALTER TABLE dispatch_assignments ADD CONSTRAINT unique_active_driver
    EXCLUDE USING gist (driver_id WITH =)
    WHERE (status IN ('dispatched', 'en_route', 'on_site', 'returning'));
```

**Isolation**: Transactions don't interfere
```python
# Two dispatchers try to assign same equipment simultaneously
# with_for_update() locks the row
# Second dispatcher waits for first transaction to complete
# Then sees equipment already dispatched and returns error
```

**Durability**: Committed data persists
- PostgreSQL WAL (Write-Ahead Logging) ensures crash recovery
- Data written to disk before COMMIT returns
- Even if server crashes immediately after COMMIT, data is safe

---

### Eventual Consistency (Deep-Water)

**Scenario**: Multi-region deployment with async replication

**Example**:
```
US-East: Equipment dispatched (write to primary)
         ↓
         Replication lag: 2 seconds
         ↓
EU Region: Read replica still shows equipment as available
```

**Mitigation**:
- **Read Your Writes**: After dispatch, read from primary (not replica) for 10 seconds
- **Causality Tokens**: Client passes token indicating "I just wrote X", server ensures replica has seen that write
- **Conflict Resolution**: Last-write-wins with timestamp ordering

**Accept Trade-off**:
- Strong consistency: High latency (wait for cross-region writes)
- Eventual consistency: Low latency but brief inconsistency windows
- Dispatch app chooses low latency (tolerate 2-second lag in dashboard)

---

## Data Privacy & Compliance

### GDPR Compliance (Mid-Depth and Deep-Water)

**Right to Access**:
- User can request export of all their data
- Generate JSON export: User profile, assignments, reports

**Right to Erasure**:
- Soft delete user (set deleted_at)
- Anonymize in historical records (replace name with "Deleted User")
- Retain assignment records for audit (work order must reference a user, even if deleted)

**Data Minimization**:
- Only collect data necessary for dispatch operations
- Don't store unnecessary PII (e.g., driver's home address if not needed)

**Data Residency**:
- EU users' data stays in EU region
- Tenant configuration: `data_region: 'eu'`
- Application enforces at database query level

---

### PCI DSS (if handling payments - Future)

**Requirements**:
- Encrypt cardholder data
- Never store CVV
- Limit access to cardholder data
- Regular security testing

**Recommendation**: Use payment processor (Stripe, Square) to avoid PCI scope

---

## Backup & Recovery Strategy

### Surface Level: Daily Backups

**Backup Process**:
```bash
#!/bin/bash
# Daily pg_dump
DATE=$(date +%Y%m%d)
pg_dump -U postgres -d dispatch -F c -f /backups/dispatch_$DATE.backup

# Keep 30 days
find /backups -name "dispatch_*.backup" -mtime +30 -delete
```

**Recovery**:
```bash
# Restore from backup
pg_restore -U postgres -d dispatch -c /backups/dispatch_20250115.backup
```

**RTO**: 4 hours (manual restore process)  
**RPO**: 24 hours (max data loss: 1 day)

---

### Mid-Depth: Automated Backups + PITR

**Backup Strategy**:
- Automated daily snapshots (AWS RDS)
- Transaction logs (WAL) archived continuously
- Point-in-time recovery (PITR) to any second in last 35 days

**Recovery Scenarios**:
```bash
# Restore to specific point in time
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance dispatch-prod \
    --target-db-instance dispatch-restored \
    --restore-time 2025-01-15T14:30:00Z
```

**RTO**: 1 hour (automated restore)  
**RPO**: 5 minutes (WAL archive interval)

---

### Deep-Water: Continuous Replication

**Strategy**:
- Synchronous replication to standby in same region
- Asynchronous replication to other regions
- Near-zero RPO, minimal RTO

**Failover**:
```
Primary database fails
        ↓ (automatic detection in 30 seconds)
Standby promoted to primary
        ↓ (DNS updated automatically)
Application connects to new primary
Total downtime: <2 minutes
```

**RTO**: <5 minutes (automated failover)  
**RPO**: 0 (synchronous replication, no data loss)

---

## Performance Considerations

### Query Optimization

**Slow Query Example**:
```sql
-- Find all dispatches in December with equipment type "Truck"
SELECT d.*, e.identifier, et.name
FROM dispatch_assignments d
JOIN equipment e ON d.equipment_id = e.id
JOIN equipment_types et ON e.equipment_type_id = et.id
WHERE d.dispatched_at BETWEEN '2024-12-01' AND '2024-12-31'
  AND et.name = 'Truck';

-- Slow because: Full table scan, multiple joins
```

**Optimized**:
```sql
-- Add composite index
CREATE INDEX idx_dispatch_date_equipment ON dispatch_assignments(dispatched_at, equipment_id);

-- Denormalize equipment type name into dispatch_assignments (Mid-Depth)
ALTER TABLE dispatch_assignments ADD COLUMN equipment_type_name VARCHAR(100);

-- Query becomes much simpler
SELECT * FROM dispatch_assignments
WHERE dispatched_at BETWEEN '2024-12-01' AND '2024-12-31'
  AND equipment_type_name = 'Truck';
```

**When to Denormalize**:
- Data rarely changes (equipment type name)
- Significant query performance gain
- Accept eventual consistency (update via trigger or background job)

---

### Connection Pool Sizing

**Formula**:
```
connections = ((core_count * 2) + effective_spindle_count)

Example:
- 4 cores
- SSD (assume 1 spindle)
connections = (4 * 2) + 1 = 9

Recommendation: Start with 10, tune based on monitoring
```

**Monitoring**:
```sql
-- Check active connections
SELECT count(*), state
FROM pg_stat_activity
WHERE datname = 'dispatch'
GROUP BY state;

-- If waiting connections high, increase pool size
```

---

## Data Migration Considerations

### Surface → Mid-Depth Migration

**Challenge**: Add multi-tenancy to existing single-tenant schema

**Approach**:
1. Add `tenant_id` column to all tables
2. Backfill existing data with single tenant ID
3. Deploy code that sets search_path based on tenant
4. Create new schemas for new tenants
5. Gradually migrate tenants to separate schemas

**Zero-Downtime Migration**:
- Use database triggers to replicate writes to both old and new schemas
- Switch reads to new schema after validation
- Remove triggers after cutover complete

---

### Mid-Depth → Deep-Water Migration

**Challenge**: Shard existing database across multiple instances

**Approach**:
1. Identify sharding key (tenant_id)
2. Analyze tenant sizes, allocate to shards
3. Export data per tenant
4. Import to target shards
5. Update connection routing logic
6. Cutover tenant-by-tenant (not all at once)

**Rollback Plan**: Keep original database for 30 days, can revert if issues

---

## Conclusion

The data architecture evolves from simple single-instance PostgreSQL at Surface Level to a sophisticated distributed system at Deep-Water. Key principles remain constant:

1. **ACID guarantees** for critical operations
2. **Audit trail** for all changes
3. **Scalable storage** using object storage
4. **Performance through indexing** and caching
5. **Resilience through backups** and replication

Start simple, add complexity only when scale demands it. PostgreSQL can handle this evolution gracefully with proper planning.
