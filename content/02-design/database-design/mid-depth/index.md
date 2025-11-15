---
title: "Database Design - Mid-Depth"
phase: "02-design"
topic: "database-design"
depth: "mid-depth"
reading_time: 25
prerequisites: ["database-design-surface"]
related_topics: ["api-design", "performance-scalability-design", "data-flow-mapping"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-15"
---

# Database Design - Mid-Depth

You know how to normalize tables and write basic queries. Now you need to handle real production concerns: queries that slow down as tables grow, schema changes that can't afford downtime, multi-tenant isolation, and the trade-offs between normalization and performance.

This guide focuses on PostgreSQL examples, but the concepts apply broadly. We'll cover what matters when thousands of users start hitting your database.

## Index Strategy: When and What to Index

Indexes speed up reads but slow down writes. Every insert, update, or delete on a table must also update every index on that table. The question isn't "should I add indexes?" but "which indexes justify their cost?"

### When to Add an Index

Add indexes for:

**Columns in WHERE clauses you run frequently:**
```sql
-- If you query by email often
SELECT * FROM users WHERE email = 'user@example.com';

-- Create index
CREATE INDEX idx_users_email ON users(email);
```

**Foreign keys used in JOINs:**
```sql
-- Orders joining to users
SELECT orders.*, users.name
FROM orders
JOIN users ON orders.user_id = users.id;

-- Index the foreign key
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

**Columns used in ORDER BY:**
```sql
-- Chronological listing
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;

CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

PostgreSQL creates indexes on primary keys and unique constraints automatically. Don't duplicate them.

### Composite Indexes: Order Matters

A composite index on (A, B, C) can satisfy queries on:
- (A)
- (A, B)
- (A, B, C)

But NOT queries on just (B) or (C) or (B, C).

**Practical example:**
```sql
-- Multi-tenant SaaS: most queries filter by tenant_id first
CREATE INDEX idx_orders_tenant_created
ON orders(tenant_id, created_at DESC);

-- This index helps both queries:
SELECT * FROM orders WHERE tenant_id = 123;
SELECT * FROM orders WHERE tenant_id = 123 ORDER BY created_at DESC;

-- But does NOT help:
SELECT * FROM orders ORDER BY created_at DESC; -- missing tenant_id
```

**Rule of thumb:** Put the most selective column first, unless you always filter on a specific column (like tenant_id in multi-tenant apps).

### Covering Indexes: Avoiding Table Lookups

A covering index includes all columns needed by a query, so PostgreSQL doesn't need to look up the table rows at all.

```sql
-- Query needs user_id, status, and total
SELECT user_id, status, total
FROM orders
WHERE status = 'pending';

-- Without INCLUDE, PostgreSQL must look up table rows for 'total'
CREATE INDEX idx_orders_status ON orders(status);

-- Covering index includes 'total' in the index
CREATE INDEX idx_orders_status_covering
ON orders(status) INCLUDE (user_id, total);
```

The `INCLUDE` clause (PostgreSQL 11+) adds columns to the index without making them part of the search key. This means you can cover the query without affecting index ordering or selectivity.

Use covering indexes for hot queries where you've confirmed table lookups are the bottleneck (check EXPLAIN ANALYZE output).

### Partial Indexes: Indexing a Subset

If you only query certain rows frequently, index just those rows.

```sql
-- You only care about active subscriptions
SELECT * FROM subscriptions
WHERE user_id = 123 AND status = 'active';

-- Don't index cancelled subscriptions (90% of rows)
CREATE INDEX idx_subscriptions_active
ON subscriptions(user_id)
WHERE status = 'active';
```

This index is smaller, faster to update, and exactly as useful as indexing all rows would be for active subscription queries.

Common use cases:
- `WHERE deleted_at IS NULL` (if you soft delete)
- `WHERE status IN ('pending', 'processing')` (skip 'completed')
- `WHERE published = true` (skip drafts)

### Expression Indexes: For Computed Values

If you query on a function result, index that expression.

```sql
-- Case-insensitive email lookup
SELECT * FROM users WHERE LOWER(email) = LOWER('User@Example.com');

CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

```sql
-- Date-based queries
SELECT * FROM orders WHERE DATE(created_at) = '2025-11-15';

CREATE INDEX idx_orders_date ON orders(DATE(created_at));
-- Better: use a range query instead to avoid function on column
SELECT * FROM orders
WHERE created_at >= '2025-11-15' AND created_at < '2025-11-16';
```

Expression indexes cost CPU on every write. Prefer storing computed values as columns if you update rarely but query often.

### Monitoring Index Usage

PostgreSQL tracks index usage. Find unused indexes:

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

If an index shows zero scans after weeks in production, it's costing you write performance for no benefit. Drop it.

## Database Constraints: Enforcement at the Right Layer

Constraints prevent bad data from entering your database. Application code has bugs; constraints don't.

### NOT NULL: The Minimum Viable Constraint

If a column must have a value, mark it NOT NULL.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    bio TEXT  -- NULL allowed
);
```

Adding NOT NULL later requires verifying no existing rows violate it:

```sql
-- Check for NULLs first
SELECT COUNT(*) FROM users WHERE email IS NULL;

-- If zero, safe to add
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

On a large table, this locks the table while scanning. See the migration strategy section for zero-downtime approaches.

### UNIQUE Constraints: Beyond Just Email

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);
```

UNIQUE creates an index automatically. For multi-column uniqueness:

```sql
-- One coupon code per user
CREATE TABLE user_coupons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    coupon_code TEXT NOT NULL,
    UNIQUE(user_id, coupon_code)
);
```

Unique constraints respect NULL in PostgreSQL: multiple rows can have NULL in a unique column because NULL != NULL. If this isn't what you want, combine with NOT NULL.

### CHECK Constraints: Business Rules in the Database

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    CHECK (price > 0),
    CHECK (discount_price IS NULL OR discount_price < price)
);
```

CHECK constraints run on every insert and update. Keep them fast.

**What works well in CHECK:**
- Simple comparisons (price > 0)
- Column relationships (end_date > start_date)
- Enum-like values (status IN ('pending', 'active', 'cancelled'))

**What doesn't work:**
- Subqueries (use triggers instead)
- Complex business logic (too rigid)
- Anything requiring external data

### Foreign Keys: Referential Integrity

Foreign keys prevent orphaned records.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**CASCADE options control what happens when you delete the parent:**

```sql
-- Delete user → delete their orders
user_id INTEGER REFERENCES users(id) ON DELETE CASCADE

-- Delete user → set orders.user_id to NULL
user_id INTEGER REFERENCES users(id) ON DELETE SET NULL

-- Delete user → fail if they have orders (default)
user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT
```

CASCADE is dangerous for critical data. If you delete a customer by mistake, CASCADE can wipe their entire order history. Consider soft deletes (covered later) or requiring explicit cleanup.

Foreign keys have a performance cost: every insert/update verifies the parent exists. But catching orphaned records at 2am is worse than the microseconds of validation.

## Migration Strategy: Zero-Downtime Schema Changes

Schema changes on large tables can lock them for minutes. Your app gets connection timeouts, requests pile up, and you're scrambling to kill the migration.

Here's how to avoid that.

### The Problem with ALTER TABLE

```sql
-- Locks the entire table until complete
ALTER TABLE users ADD COLUMN phone TEXT;
```

On a table with millions of rows, this might take 30 seconds and block all writes. Your application can't insert users, update profiles, or authenticate anyone.

### Safe Pattern: Add Column with Default

**Unsafe:**
```sql
ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';
```

This rewrites every row to add the default value. On PostgreSQL 11+, adding a column with a volatile default (like `NOW()`) or a NOT NULL constraint triggers a table rewrite.

**Safe (PostgreSQL 11+):**
```sql
-- Add nullable column with constant default (no rewrite)
ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';

-- Later, add NOT NULL after backfilling data
-- (requires checking no NULLs exist first)
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

Even safer: add the column as nullable, backfill data in batches, then add NOT NULL.

### Safe Pattern: Add Index Concurrently

```sql
-- Locks table briefly
CREATE INDEX idx_users_email ON users(email);
```

```sql
-- Builds index without blocking writes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

`CONCURRENTLY` takes longer and can fail midway (leaves an invalid index you must drop), but it doesn't block production traffic. Always use it in production.

### Safe Pattern: Remove Column in Stages

Removing a column is instant in PostgreSQL (just marks it invisible), but your application code might still reference it.

1. Deploy code that doesn't use the column
2. Wait to confirm no errors
3. Drop the column

```sql
-- After confirming app doesn't reference 'legacy_field'
ALTER TABLE users DROP COLUMN legacy_field;
```

For paranoia, first stop writing to the column, confirm reads don't break, then drop it.

### Safe Pattern: Change Column Type

Changing types usually rewrites the table. Avoid if possible by adding a new column:

```sql
-- Instead of: ALTER TABLE users ALTER COLUMN age TYPE INTEGER;
-- Do this:

-- 1. Add new column
ALTER TABLE users ADD COLUMN age_int INTEGER;

-- 2. Backfill in batches
UPDATE users SET age_int = age::INTEGER
WHERE id BETWEEN 1 AND 100000;
-- Repeat for all rows in chunks

-- 3. Deploy code to use age_int
-- 4. Drop old column
ALTER TABLE users DROP COLUMN age;
-- 5. Rename new column
ALTER TABLE users RENAME COLUMN age_int TO age;
```

This keeps the table available during the migration.

### Migration Tools

Don't write raw SQL migrations by hand. Use a tool that tracks which migrations ran:

- **Rails**: ActiveRecord migrations
- **Django**: Django migrations
- **Node**: Knex.js, Sequelize, TypeORM
- **Language-agnostic**: Flyway, Liquibase

These tools ensure migrations run exactly once and in order, even across multiple servers.

## Query Optimization: Making Slow Queries Fast

You've got a query taking 3 seconds. Users are complaining. Here's how to fix it.

### Step 1: EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT orders.*, users.name
FROM orders
JOIN users ON orders.user_id = users.id
WHERE orders.status = 'pending'
ORDER BY orders.created_at DESC
LIMIT 20;
```

Output shows:
- Which indexes PostgreSQL used (or didn't)
- Actual row counts vs estimated counts
- Sequential scans vs index scans
- Execution time per operation

**Look for:**
- `Seq Scan` on large tables (add an index)
- `rows=1000000` when you expected `rows=10` (outdated statistics)
- Nested loops with high iteration counts (bad join order)

### Step 2: Update Statistics

PostgreSQL's query planner uses statistics to estimate row counts. Outdated statistics lead to bad plans.

```sql
ANALYZE orders;  -- Update stats for one table
ANALYZE;         -- Update stats for entire database
```

Run ANALYZE after bulk imports or major data changes.

### Step 3: Add Missing Indexes

If EXPLAIN shows a sequential scan on a filtered column, add an index.

```sql
-- Sequential scan on WHERE status = 'pending'
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
```

Re-run EXPLAIN ANALYZE to confirm the planner uses the new index.

### The N+1 Query Problem

Classic ORM mistake:

```python
# Fetches users
users = User.query.all()  # 1 query

for user in users:
    # Fetches orders for each user (N queries)
    print(user.orders)
```

If you have 100 users, that's 101 queries. Fix with eager loading:

```python
# Fetches users and their orders in 2 queries (or 1 with JOIN)
users = User.query.options(joinedload(User.orders)).all()
```

**How to spot N+1:**
- Watch database query logs
- Count queries per request (should be low)
- Tools like Django Debug Toolbar, Rails Bullet, or New Relic flag this

### Avoiding SELECT *

```sql
-- Fetches all columns (including large TEXT fields)
SELECT * FROM articles WHERE id = 123;

-- Faster: fetch only what you need
SELECT id, title, author_id, created_at FROM articles WHERE id = 123;
```

Especially important if your table has JSONB blobs or large text columns you don't need.

### Use LIMIT Wisely

```sql
-- Scans entire table to sort, then returns 10 rows
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- With index on created_at, this is instant
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

Always combine LIMIT with appropriate indexes on ORDER BY columns.

### Connection Pooling and Query Performance

Opening a database connection takes milliseconds. In high-traffic apps, this adds up.

**Connection pooling** reuses connections across requests:

```javascript
// Without pooling: new connection per request
app.get('/users', async (req, res) => {
    const client = await db.connect();  // Slow
    const result = await client.query('SELECT * FROM users');
    await client.end();
    res.json(result.rows);
});

// With pooling: reuse connections
const pool = new Pool({ max: 20 });

app.get('/users', async (req, res) => {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
});
```

**Pool size tuning:**
- Start with `max = (CPU cores * 2) + disk spindles`
- For cloud databases: 10-20 connections per app server
- Monitor: too few → requests wait for connections; too many → database thrashing

PostgreSQL has a `max_connections` setting (default 100). If you have 10 app servers with pool size 20, that's 200 connections needed. Either increase `max_connections` or use a connection pooler like PgBouncer.

## Multi-Tenancy Patterns: Isolating Customer Data

SaaS apps serve multiple customers (tenants) from one application. You must isolate their data to prevent customer A from seeing customer B's records.

Three approaches, each with trade-offs.

### Pattern 1: Separate Database Per Tenant

Each customer gets their own database.

```javascript
const tenantDb = getDatabaseForTenant(req.tenantId);
const orders = await tenantDb.query('SELECT * FROM orders');
```

**Pros:**
- Perfect isolation (no query can leak data across tenants)
- Easy to backup/restore individual customers
- Can scale tenants to different database servers

**Cons:**
- Expensive (100 customers = 100 databases)
- Schema migrations must run 100 times
- Difficult to run cross-tenant analytics

**When to use:** High-value enterprise customers who demand isolation, or regulated industries (healthcare, finance).

### Pattern 2: Shared Database, Separate Schema Per Tenant

All tenants in one database, but each has their own schema (namespace).

```sql
-- Tenant A
CREATE SCHEMA tenant_a;
CREATE TABLE tenant_a.orders (...);

-- Tenant B
CREATE SCHEMA tenant_b;
CREATE TABLE tenant_b.orders (...);
```

```javascript
await db.query('SET search_path TO tenant_' + tenantId);
const orders = await db.query('SELECT * FROM orders');
```

**Pros:**
- Better than separate DBs (one migration applies to all schemas)
- Some isolation (can't accidentally JOIN across schemas)

**Cons:**
- Still expensive at scale (1000 customers = 1000 schemas)
- PostgreSQL connection must set schema per request
- Hard to enforce at application layer (forgot to set schema = data leak)

**When to use:** Mid-size SaaS with dozens of tenants, where isolation justifies complexity.

### Pattern 3: Shared Database, Shared Schema (Row-Level Security)

All tenants share the same tables. Every table has a `tenant_id` column.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    -- other columns
);

-- Every query filters by tenant
SELECT * FROM orders WHERE tenant_id = 123;
```

**Pros:**
- Simple (one schema, one migration)
- Efficient (one set of tables)
- Easy cross-tenant analytics

**Cons:**
- Risk of data leaks if you forget `WHERE tenant_id = ...`
- Indexes must include tenant_id
- Noisy neighbor problem (one tenant's load affects all)

**When to use:** Most SaaS products with hundreds or thousands of small tenants.

### Enforcing Row-Level Security (RLS)

PostgreSQL Row-Level Security enforces tenant filtering at the database level, so application bugs can't leak data.

```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy: users only see their tenant's rows
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.current_tenant')::INTEGER);
```

```javascript
// Set tenant for this session
await db.query('SET app.current_tenant = $1', [tenantId]);

// Queries automatically filter by tenant_id
const orders = await db.query('SELECT * FROM orders');
```

Even if you write `SELECT * FROM orders` without a WHERE clause, PostgreSQL adds `WHERE tenant_id = current_tenant` automatically.

**Gotcha:** RLS applies per database session. You must set `app.current_tenant` for every connection from the pool. Use a middleware that runs before every query.

**Performance:** RLS policies add a WHERE clause to every query. Ensure `tenant_id` is indexed (preferably as the first column in composite indexes).

## Soft Deletes and Audit Trails

Hard deleting data is risky. Users delete things by accident. Support needs to restore deleted records. Compliance requires knowing what changed and when.

### Soft Deletes: Marking Rows as Deleted

Instead of `DELETE FROM users WHERE id = 123`, mark the row deleted:

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- "Delete" a user
UPDATE users SET deleted_at = NOW() WHERE id = 123;

-- Query only active users
SELECT * FROM users WHERE deleted_at IS NULL;
```

**Index it:**
```sql
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
```

**Pros:**
- Easy to undelete (set deleted_at = NULL)
- Audit trail of what was deleted and when
- Foreign keys still work (deleted user's orders remain)

**Cons:**
- Every query needs `WHERE deleted_at IS NULL`
- Unique constraints break (two deleted users can have same email)
- Table grows forever (need archival strategy)

### Unique Constraints with Soft Deletes

Problem: You soft-delete user@example.com, then register a new user with the same email. The unique constraint on email fails.

**Solution: Partial unique index**

```sql
-- Only enforce uniqueness for non-deleted rows
CREATE UNIQUE INDEX idx_users_email_unique
ON users(email) WHERE deleted_at IS NULL;
```

Now deleted rows don't participate in the uniqueness check.

### Audit Trails: Tracking Changes

Audit trails record who changed what and when.

**Simple approach: Audit columns**

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    -- business columns
    amount DECIMAL(10,2),
    -- audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ,
    updated_by INTEGER REFERENCES users(id)
);
```

Tracks when and who, but not what changed.

**Full audit trail: Separate audit table**

```sql
CREATE TABLE orders_audit (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by INTEGER NOT NULL,
    action TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB
);
```

Trigger automatically logs changes:

```sql
CREATE OR REPLACE FUNCTION audit_orders()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO orders_audit (order_id, changed_by, action, old_values, new_values)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        current_setting('app.current_user')::INTEGER,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_orders();
```

Now every change is logged automatically. Query the audit table to see history.

**When to use full audit:**
- Compliance requirements (HIPAA, GDPR, SOC 2)
- Financial data (need to prove amounts weren't changed)
- High-stakes decisions (loan approvals, medical records)

**When to skip it:**
- Low-value data (analytics events, logs)
- High-write workloads (doubles write volume)

## When to Denormalize: Read-Heavy Patterns

Normalization reduces duplication. Denormalization trades duplication for speed.

### The Problem with Deep Joins

Normalized schema for blog posts:

```sql
SELECT
    posts.title,
    users.name AS author_name,
    COUNT(comments.id) AS comment_count
FROM posts
JOIN users ON posts.author_id = users.id
LEFT JOIN comments ON comments.post_id = posts.id
GROUP BY posts.id, users.name
ORDER BY posts.created_at DESC;
```

Every page load hits three tables. As tables grow, this gets slower.

### Denormalizing: Store Computed Values

```sql
ALTER TABLE posts ADD COLUMN author_name TEXT;
ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Update when post is created
INSERT INTO posts (title, author_id, author_name)
SELECT 'My Post', 123, users.name FROM users WHERE users.id = 123;

-- Update comment count when comments added
UPDATE posts SET comment_count = comment_count + 1 WHERE id = 456;
```

Now the query is trivial:

```sql
SELECT title, author_name, comment_count
FROM posts
ORDER BY created_at DESC;
```

**Trade-off:** Faster reads, but you must keep denormalized data in sync. If the author changes their name, you must update all their posts.

### Materialized Views: Database-Managed Denormalization

```sql
CREATE MATERIALIZED VIEW post_summaries AS
SELECT
    posts.id,
    posts.title,
    users.name AS author_name,
    COUNT(comments.id) AS comment_count
FROM posts
JOIN users ON posts.author_id = users.id
LEFT JOIN comments ON comments.post_id = posts.id
GROUP BY posts.id, users.name;

CREATE INDEX idx_post_summaries_id ON post_summaries(id);
```

Query the view instead of the tables:

```sql
SELECT * FROM post_summaries ORDER BY id DESC;
```

**Refresh the view periodically:**

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY post_summaries;
```

`CONCURRENTLY` lets reads continue during refresh (requires a unique index).

**When to use materialized views:**
- Complex aggregations you run often
- Data changes infrequently (hourly, daily)
- Acceptable for data to be slightly stale

**When to avoid:**
- Need real-time data
- High write volume (refresh becomes bottleneck)

### Caching vs Denormalization

Sometimes application-level caching (Redis, Memcached) is simpler than denormalizing the database.

**Denormalize when:**
- You need to query/filter the computed values (can't do that in cache)
- Data changes predictably (easy to keep in sync)

**Cache when:**
- Data is identical for all users (homepage content)
- Invalidation is simple (time-based or event-based)
- You'd otherwise hit the database on every request

Both work. Caching is easier to add without changing your schema. Denormalization is better when you need to query the denormalized data.

## Time-Series Data Patterns

Time-series data (metrics, logs, sensor readings) has different access patterns than transactional data.

### Characteristics of Time-Series Data

- Append-mostly (new data arrives, old data rarely changes)
- Time-range queries (last hour, last week)
- Often high volume (millions of rows per day)
- Old data accessed less (last 5 minutes hot, last year cold)

### Using TimescaleDB for Time-Series

TimescaleDB is a PostgreSQL extension that partitions time-series data automatically.

```sql
CREATE TABLE metrics (
    time TIMESTAMPTZ NOT NULL,
    device_id INTEGER NOT NULL,
    temperature DECIMAL,
    humidity DECIMAL
);

-- Convert to hypertable (partitions by time)
SELECT create_hypertable('metrics', 'time');
```

TimescaleDB automatically creates partitions (chunks) for each time range. Queries on recent data only scan recent chunks.

**Retention policies:**

```sql
-- Drop data older than 90 days
SELECT add_retention_policy('metrics', INTERVAL '90 days');
```

Automatically deletes old chunks without locking the table.

**Continuous aggregates:**

```sql
-- Pre-compute hourly averages
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS hour,
    device_id,
    AVG(temperature) AS avg_temp
FROM metrics
GROUP BY hour, device_id;
```

Queries against hourly rollups are much faster than scanning raw data.

### Without TimescaleDB: Partitioning by Date

PostgreSQL 10+ supports declarative partitioning.

```sql
CREATE TABLE metrics (
    time TIMESTAMPTZ NOT NULL,
    device_id INTEGER,
    temperature DECIMAL
) PARTITION BY RANGE (time);

-- Create monthly partitions
CREATE TABLE metrics_2025_11 PARTITION OF metrics
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE metrics_2025_12 PARTITION OF metrics
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
```

Queries filtering by time only scan relevant partitions.

**Gotcha:** You must create new partitions before data arrives. Automate this with a cron job or use TimescaleDB which handles it.

## JSON Data Patterns

PostgreSQL's JSONB type stores JSON efficiently and supports indexing.

### When to Use JSONB

**Good fit:**
- Variable schema (user preferences, feature flags)
- Semi-structured data (API responses, event payloads)
- Sparse attributes (most products don't have "battery_life", but some do)

**Bad fit:**
- Relational data (use foreign keys instead)
- Data you need to enforce constraints on (can't enforce types in JSON)
- High-frequency updates (updating JSON rewrites the entire value)

### Storing and Querying JSONB

```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO events (user_id, event_type, metadata)
VALUES (123, 'page_view', '{"page": "/pricing", "referrer": "google"}');

-- Query JSON field
SELECT * FROM events
WHERE metadata->>'page' = '/pricing';

-- Query nested JSON
SELECT * FROM events
WHERE metadata->'user'->>'country' = 'US';
```

### Indexing JSONB

```sql
-- Index specific field
CREATE INDEX idx_events_page ON events((metadata->>'page'));

-- GIN index for any field (slower, but flexible)
CREATE INDEX idx_events_metadata ON events USING GIN(metadata);
```

GIN indexes support containment queries:

```sql
-- Find events with specific JSON structure
SELECT * FROM events
WHERE metadata @> '{"page": "/pricing"}';
```

### Updating JSONB Fields

```sql
-- Add field
UPDATE events
SET metadata = metadata || '{"viewed_pricing": true}'
WHERE id = 123;

-- Remove field
UPDATE events
SET metadata = metadata - 'referrer'
WHERE id = 123;
```

Updating JSONB rewrites the entire JSON value. If you update a JSONB column frequently, consider extracting hot fields to regular columns.

## Common Mistakes at Scale

Mistakes that don't matter at 1000 rows but kill performance at 1 million.

### Mistake 1: No Index on Foreign Keys

PostgreSQL doesn't automatically index foreign keys (unlike primary keys).

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id)  -- No automatic index
);
```

Queries joining on `user_id` do sequential scans. Add the index:

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### Mistake 2: Using OFFSET for Pagination

```sql
-- Page 1000 of results
SELECT * FROM products
ORDER BY created_at
LIMIT 20 OFFSET 19980;  -- 999 * 20
```

PostgreSQL must scan 20,000 rows to skip the first 19,980, even though you only return 20.

**Better: Cursor-based pagination**

```sql
-- First page
SELECT * FROM products
WHERE created_at < NOW()
ORDER BY created_at DESC
LIMIT 20;

-- Next page (use last created_at from previous page)
SELECT * FROM products
WHERE created_at < '2025-11-15 10:00:00'
ORDER BY created_at DESC
LIMIT 20;
```

This scans only the rows you need.

### Mistake 3: Storing Enumerated Values as Strings

```sql
-- Wastes space and is slow to query
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    status TEXT  -- 'pending', 'processing', 'shipped', 'delivered'
);
```

Better:

```sql
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered');

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    status order_status NOT NULL DEFAULT 'pending'
);
```

ENUMs take 4 bytes; TEXT takes 8+ bytes plus string storage. ENUMs also prevent typos.

### Mistake 4: Using UUIDs as Primary Keys Without Thinking

UUIDs (128-bit) are great for distributed systems but have trade-offs.

**Problem:** UUIDs are random, so inserts scatter across the B-tree index. This causes index bloat and slower writes compared to sequential integers.

**When UUIDs make sense:**
- Distributed databases (avoid ID conflicts across servers)
- Security (sequential IDs leak information: "we have 1000 customers")

**When integers are better:**
- Single-server databases
- High insert volume

**Compromise: UUIDv7 (time-ordered UUIDs)** combines timestamp prefix with random suffix. Inserts are mostly sequential, but globally unique.

### Mistake 5: Not Vacuuming

PostgreSQL uses MVCC (Multi-Version Concurrency Control). Updates don't overwrite rows; they create new versions. Old versions must be cleaned up.

**Autovacuum does this automatically, but sometimes can't keep up.**

Symptoms:
- Table bloat (tables using 10x expected disk space)
- Slow queries despite indexes
- Transaction ID wraparound warnings

Monitor bloat:

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

If `n_dead_tup` is high, autovacuum is falling behind. Manually vacuum:

```sql
VACUUM ANALYZE orders;
```

Tune autovacuum settings (`autovacuum_vacuum_scale_factor`, `autovacuum_naptime`) if this happens regularly.

### Mistake 6: Ignoring Connection Limits

Every connection consumes memory (~10MB in PostgreSQL). If you have 500 app servers with pool size 20, you need 10,000 connections. PostgreSQL's default `max_connections` is 100.

**Solutions:**
- Use connection pooling in your app
- Use PgBouncer (connection pooler) to multiplex app connections onto fewer database connections
- Increase `max_connections` (but watch memory usage)

## What You've Gained

You now know how to:
- Design indexes that help queries without slowing writes
- Enforce constraints at the database level
- Change schemas on large tables without downtime
- Diagnose and fix slow queries
- Choose the right multi-tenancy pattern for your SaaS
- Implement soft deletes and audit trails
- Decide when to denormalize for performance
- Handle time-series and JSON data
- Avoid common scaling mistakes

The database isn't just storage. It's your data's last line of defense against bugs, the enforcer of constraints application code forgets, and often the bottleneck when your app grows.

These patterns matter when you're supporting real users who notice when queries take 5 seconds instead of 50ms. The surface-level stuff gets you started. This mid-depth content keeps you running when the database hits 100 million rows.

For deeper topics like database replication, sharding, or advanced query optimization, see the deep-water content. For understanding how these database decisions connect to your overall system design, check out the related topics on API design and performance/scalability planning.
