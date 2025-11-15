---
title: "Database Design - Deep Water"
phase: "02-design"
topic: "database-design"
depth: "deep-water"
reading_time: 50
prerequisites: ["database-design-surface"]
related_topics: ["architecture-design", "api-design", "data-flow-mapping", "performance-scalability-design"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Database Design - Deep Water

At some point, your database stops being a simple data store and becomes a distributed system with complex failure modes. You're handling millions of records, dealing with regulatory requirements across multiple jurisdictions, migrating schemas without downtime, and debugging why queries that worked fine at 100,000 rows now timeout at 10 million.

This is where theory meets production reality. Textbook solutions fall apart under real constraints. You can't just "add an index" when writes are already bottlenecked. You can't "normalize everything" when GDPR requires deleting user data across 40 microservices. You can't "just use eventual consistency" when financial regulations demand immediate consistency.

This guide covers the patterns that emerge at scale, the trade-offs that matter in production, and the specific techniques that companies like Stripe, Uber, and Airbnb used when their databases became the hardest part of their infrastructure.

## Advanced Data Modeling Patterns

The basic normalized schema gets you far, but certain problems need patterns that aren't covered in database textbooks.

### CQRS: Separate Models for Reads and Writes

Command Query Responsibility Segregation (CQRS) splits your data model into two: one optimized for writes, another for reads. This sounds like unnecessary complexity until you hit the specific problems it solves.

**The Problem:**
Your e-commerce application writes order data in a normalized relational schema - orders, order items, products, users, shipping addresses. Perfect for transactional consistency. But your analytics dashboard needs to show:
- Revenue by product category over time
- Top customers by lifetime value
- Shipping costs by region and carrier
- Inventory turnover rates

Each dashboard query joins 6+ tables and takes 30 seconds. You could denormalize the write schema, but then writes become complex and error-prone. You could add materialized views, but they lock tables during refresh.

**The CQRS Pattern:**

Write side (normalized, transactional):
```sql
-- Optimized for correctness, not read performance
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_purchase DECIMAL(10,2) NOT NULL
);
```

Read side (denormalized, optimized):
```sql
-- Updated asynchronously from write side
CREATE TABLE revenue_by_category_daily (
  date DATE NOT NULL,
  category TEXT NOT NULL,
  revenue DECIMAL(12,2) NOT NULL,
  order_count INTEGER NOT NULL,
  PRIMARY KEY (date, category)
);

CREATE TABLE customer_lifetime_value (
  user_id UUID PRIMARY KEY,
  total_orders INTEGER NOT NULL,
  total_revenue DECIMAL(12,2) NOT NULL,
  average_order_value DECIMAL(10,2) NOT NULL,
  last_order_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL
);
```

The read models are updated asynchronously - either via database triggers, application event handlers, or a separate process that reads from the transaction log. This adds complexity (you now have two schemas to maintain) but solves real problems:

- Write throughput isn't affected by complex read queries
- Read queries are fast because data is pre-aggregated
- Read replicas can use completely different storage engines
- Analytics don't impact production database performance

**When to use CQRS:**
- Analytics queries are killing production database performance
- You need to support vastly different read patterns (operational vs analytical)
- Write and read scale requirements differ significantly
- You're already using event sourcing (covered next)

**When not to use CQRS:**
- Your application is small enough that one well-indexed schema works fine
- The complexity of maintaining two models outweighs the benefits
- You can solve the problem with read replicas or caching

Stripe uses CQRS for their analytics products. The transactional write model stores payments in a normalized schema optimized for correctness. The read models denormalize this data for fast dashboard queries. Users see analytics that are a few seconds behind real-time, which is acceptable for business intelligence.

### Event Sourcing: Storing Facts, Not State

Traditional databases store current state - the order's status is "shipped", the user's balance is $127.43. Event sourcing stores the sequence of events that led to that state.

**Traditional state-based schema:**
```sql
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  balance DECIMAL(12,2) NOT NULL,  -- current balance
  updated_at TIMESTAMPTZ NOT NULL
);
```

When you transfer $100, you run:
```sql
BEGIN;
UPDATE bank_accounts SET balance = balance - 100 WHERE id = 'sender';
UPDATE bank_accounts SET balance = balance + 100 WHERE id = 'receiver';
COMMIT;
```

The balance changes, but you've lost the history. You know the current balance is $127.43, but you don't know if that's from receiving $127.43 in one transaction or 500 small transactions.

**Event sourcing schema:**
```sql
CREATE TABLE account_events (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  event_type TEXT NOT NULL,  -- 'deposited', 'withdrawn', 'transferred'
  amount DECIMAL(12,2) NOT NULL,
  from_account UUID,  -- for transfers
  to_account UUID,
  created_at TIMESTAMPTZ NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_account_events_account ON account_events(account_id, created_at);
```

To transfer $100:
```sql
INSERT INTO account_events (id, account_id, event_type, amount, to_account, created_at)
VALUES (gen_random_uuid(), 'sender', 'transferred', -100, 'receiver', now());

INSERT INTO account_events (id, account_id, event_type, amount, from_account, created_at)
VALUES (gen_random_uuid(), 'receiver', 'transferred', 100, 'sender', now());
```

To get current balance:
```sql
SELECT SUM(amount) FROM account_events WHERE account_id = 'sender';
```

This looks insane - you're summing potentially millions of rows on every balance check. In practice, you maintain a snapshot of current state and only replay events since the last snapshot:

```sql
CREATE TABLE account_snapshots (
  account_id UUID PRIMARY KEY,
  balance DECIMAL(12,2) NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL
);

-- Balance is snapshot + events since snapshot
SELECT s.balance + COALESCE(SUM(e.amount), 0) AS current_balance
FROM account_snapshots s
LEFT JOIN account_events e ON e.account_id = s.account_id
  AND e.created_at > s.snapshot_at
WHERE s.account_id = 'sender'
GROUP BY s.balance;
```

**What event sourcing gives you:**
- Complete audit trail of every change, forever
- Ability to reconstruct state at any point in time
- Debugging is time travel - replay events to see what happened
- New features can be built by replaying old events with new logic

**What it costs:**
- Storage grows continuously (mitigated by snapshots and archiving)
- Reading state requires aggregation (mitigated by snapshots and caching)
- Schema changes are harder - you can't migrate events, only add new event types
- Application complexity - you think in terms of events, not state

Financial systems love event sourcing because regulators require complete audit trails. If someone disputes a transaction from 3 years ago, you can replay all events and prove exactly what happened. You can't do that if you've been overwriting balances.

### Temporal Data: Tracking Changes Over Time

Sometimes you need to know not just current values, but all historical values. Employee records need to track salary changes, insurance beneficiaries, address updates. Inventory systems need to know prices at specific points in time.

**Naive approach - add columns:**
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  previous_salary DECIMAL(10,2),  -- doesn't scale
  salary_changed_at TIMESTAMPTZ
);
```

This breaks immediately. You can store one previous salary, but not a full history. You can't answer "what was this person's salary on June 1, 2022?"

**Better: separate history table:**
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  current_salary DECIMAL(10,2) NOT NULL
);

CREATE TABLE salary_history (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  salary DECIMAL(10,2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,  -- NULL means current
  EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(effective_from, effective_to) WITH &&
  )
);

CREATE INDEX idx_salary_history_employee ON salary_history(employee_id, effective_from);
```

The `EXCLUDE` constraint (PostgreSQL-specific) prevents overlapping date ranges for the same employee. You can't have two different salaries effective at the same time.

To insert a new salary:
```sql
-- End the current salary period
UPDATE salary_history
SET effective_to = '2025-01-01'
WHERE employee_id = 'emp123' AND effective_to IS NULL;

-- Insert new salary
INSERT INTO salary_history (id, employee_id, salary, effective_from, effective_to)
VALUES (gen_random_uuid(), 'emp123', 125000, '2025-01-01', NULL);

-- Update current_salary for fast access
UPDATE employees SET current_salary = 125000 WHERE id = 'emp123';
```

To find salary at a specific date:
```sql
SELECT salary
FROM salary_history
WHERE employee_id = 'emp123'
  AND effective_from <= '2024-06-01'
  AND (effective_to IS NULL OR effective_to > '2024-06-01');
```

**Bitemporal data** tracks two time dimensions:
- **Valid time**: When the fact was true in reality
- **Transaction time**: When we learned about it

Example: Employee gets a raise effective January 1, but HR doesn't process it until January 15. Valid time is Jan 1, transaction time is Jan 15. If they later discover an error and backdate a correction, you need both dimensions to understand what you knew and when you knew it.

```sql
CREATE TABLE employee_assignments (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  department TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_until TIMESTAMPTZ,  -- NULL means current knowledge
  PRIMARY KEY (id),
  EXCLUDE USING gist (
    employee_id WITH =,
    daterange(valid_from, valid_to) WITH &&,
    tstzrange(recorded_at, recorded_until) WITH &&
  )
);
```

This is complex. You need it for:
- Healthcare records (diagnosis dates vs when they were recorded)
- Financial corrections and restatements
- Regulatory compliance with audit requirements
- Any system where "when did it happen" differs from "when did we know"

Most systems don't need bitemporal tracking. The added complexity is significant. Use it when regulations or business requirements explicitly need both time dimensions.

## Sharding and Partitioning at Scale

When a single database server can't handle your load, you split data across multiple servers. There are two main approaches: partitioning (split within one database) and sharding (split across databases).

### Table Partitioning: One Database, Multiple Chunks

PostgreSQL, MySQL, and other databases support table partitioning - dividing a large table into smaller physical pieces while keeping a single logical table.

**Range partitioning** by date:
```sql
-- Parent table (logical)
CREATE TABLE events (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  data JSONB
) PARTITION BY RANGE (occurred_at);

-- Child partitions (physical)
CREATE TABLE events_2024_01 PARTITION OF events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE events_2024_03 PARTITION OF events
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
```

Queries automatically route to the right partition:
```sql
-- Only scans events_2024_01, ignores others
SELECT * FROM events
WHERE occurred_at >= '2024-01-15' AND occurred_at < '2024-01-20';
```

Benefits:
- Fast deletion - drop old partitions instead of DELETE queries
- Improved query performance - scan only relevant partitions
- Easier maintenance - vacuum and analyze individual partitions
- Archive old data by detaching partitions

**List partitioning** by category:
```sql
CREATE TABLE orders (
  id UUID NOT NULL,
  region TEXT NOT NULL,
  total DECIMAL(10,2)
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('US');
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('EU', 'GB');
CREATE TABLE orders_apac PARTITION OF orders FOR VALUES IN ('JP', 'SG', 'AU');
```

Use case: Different regions have different compliance requirements, so you can put EU partitions on servers in EU datacenters.

**Hash partitioning** for even distribution:
```sql
CREATE TABLE sessions (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  data JSONB
) PARTITION BY HASH (user_id);

CREATE TABLE sessions_0 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE sessions_1 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE sessions_2 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE sessions_3 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

The database hashes `user_id` and routes to the appropriate partition. This distributes data evenly without requiring a range or list.

**Partition pruning** - the database's ability to skip irrelevant partitions - is what makes this fast. If the query doesn't include the partition key, you lose this benefit:

```sql
-- Good: includes partition key, only scans one partition
SELECT * FROM events WHERE occurred_at = '2024-01-15';

-- Bad: no partition key, scans all partitions
SELECT * FROM events WHERE user_id = 'user123';
```

Partitioning is transparent to applications. You query the parent table, the database handles routing. It's a performance optimization, not an architectural change.

### Sharding: Multiple Databases

When one database server isn't enough, you shard - split data across multiple independent database servers. Unlike partitioning (which is automatic), sharding is manual and pervasive.

**Choosing a shard key:**

The shard key determines which server stores each record. Choose wrong and you get hot spots (some shards overloaded while others idle) or impossible queries.

**Shard by user/tenant:**
```sql
-- Application determines shard from user_id
shard = hash(user_id) % num_shards

-- Shard 0 (database server us-shard-0)
CREATE TABLE users (id UUID PRIMARY KEY, ...);
CREATE TABLE posts (id UUID PRIMARY KEY, author_id UUID, ...);
CREATE TABLE comments (id UUID PRIMARY KEY, author_id UUID, ...);

-- Shard 1 (database server us-shard-1)
CREATE TABLE users (id UUID PRIMARY KEY, ...);
CREATE TABLE posts (id UUID PRIMARY KEY, author_id UUID, ...);
CREATE TABLE comments (id UUID PRIMARY KEY, author_id UUID, ...);
```

All data for a user lives on one shard. This is efficient for user-centric queries ("show me all my posts") but makes cross-user queries expensive ("show recent posts from all users I follow").

**Shard by geography:**
```sql
-- US users on US shards
shard = lookup_region(user_id) == 'US' ? us_shard : eu_shard
```

Good for data residency requirements (GDPR requires EU user data stays in EU). Bad if users travel - sudden latency spike when a US user visits Europe.

**Shard by time:**
```sql
-- Events from 2024-01 on shard_2024_01
shard = extract_month(occurred_at)
```

Works for append-only data like logs or events. Writes hit the current shard, old shards become read-only. But queries spanning time ranges hit multiple shards.

**Queries in a sharded system:**

Single-shard queries are fast:
```sql
-- Application knows user_id = 'user123' is on shard 2
SELECT * FROM posts WHERE author_id = 'user123';
```

Cross-shard queries are hard:
```sql
-- Need to query all shards and merge results
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;
```

The application must:
1. Query all shards in parallel
2. Fetch more results than needed (fetch 10 from each shard)
3. Merge and sort in application code
4. Apply limit after merging

Joins across shards don't work:
```sql
-- If users and posts are on different shards, this is impossible
SELECT u.name, p.title
FROM users u
JOIN posts p ON p.author_id = u.id;
```

You have to denormalize - store user name on posts table - or make two queries and join in application code.

**Rebalancing shards:**

Eventually shard distribution becomes uneven. User 'celebrity123' has 10M followers, making shard 3 huge while shard 1 is small. Or you need to add more shards as data grows.

Rebalancing means moving data between shards while the system is running. This is complicated:

1. Write to both old and new shard during migration
2. Copy existing data from old to new shard
3. Verify data matches
4. Switch reads to new shard
5. Remove data from old shard

Instagram famously struggled with this. They sharded by user_id, but when they needed to add shards, they couldn't easily move users between shards without downtime. They eventually built custom tooling to do live migrations.

**Shard exhaustion:**

If your shard key is too granular, you run out of shards. Instagram used a hash of user_id across thousands of logical shards, mapped to fewer physical shards. As they grew, they could remap logical shards to new physical servers without changing application logic.

```python
# Logical shards: 10,000 (virtual)
logical_shard = hash(user_id) % 10000

# Physical shards: 100 (actual database servers)
physical_shard = shard_mapping[logical_shard]
```

When adding capacity, they updated `shard_mapping` to redistribute logical shards across more physical servers.

Sharding is a last resort. It adds immense complexity:
- Application must know which shard to query
- Cross-shard queries are slow or impossible
- Transactions across shards require distributed coordination (slow and error-prone)
- Schema changes must run on all shards
- Backups, monitoring, and operations multiply by number of shards

Before sharding, try:
- Read replicas for read scaling
- Connection pooling to handle more connections
- Query optimization and indexing
- Vertical scaling (bigger servers)
- Caching frequently accessed data

Shard when you've exhausted these options and have evidence that data size or write throughput actually requires it.

## Replication Strategies

Replication copies data to multiple servers for availability, performance, or geographic distribution. The complexity is in keeping replicas consistent.

### Primary-Replica (Master-Slave)

One primary server accepts writes, multiple replicas copy data from the primary and handle read queries.

```
Primary (writes)
    |
    | replication stream
    |
    v
Replica 1 (reads) -> Replica 2 (reads) -> Replica 3 (reads)
```

**Synchronous replication:**
Writes don't commit until at least one replica confirms it received the data.

```sql
-- Primary waits for replica confirmation before returning
BEGIN;
INSERT INTO orders (id, user_id, total) VALUES (...);
COMMIT;  -- blocks until replica acknowledges
```

This guarantees replicas have all data (no data loss if primary fails) but adds latency. Each write takes 2x-3x longer because it waits for network round-trips to replicas.

**Asynchronous replication:**
Writes commit immediately, replicas catch up in the background.

```sql
-- Primary commits immediately, replicas lag slightly behind
BEGIN;
INSERT INTO orders (id, user_id, total) VALUES (...);
COMMIT;  -- returns immediately
```

Fast writes, but replicas might be seconds or minutes behind. If primary fails before replicas catch up, you lose those writes.

**Replication lag problems:**

The gap between primary and replica is called replication lag. It creates weird bugs:

```python
# User submits form (write to primary)
db_primary.execute("INSERT INTO posts (id, title) VALUES (?, ?)", post_id, title)

# Redirect to post page (read from replica)
redirect(f"/posts/{post_id}")

# Query hits replica that hasn't replicated yet
post = db_replica.query("SELECT * FROM posts WHERE id = ?", post_id)
# post is None - 404 error
```

The user just created a post and immediately gets a 404 because the replica hasn't caught up.

Solutions:
- Read your own writes from primary (but defeats purpose of replicas)
- Add replica lag indicator and retry reads
- Use sessions or cookies to route users to same replica
- Accept eventual consistency and show "post is being processed" messages

**Failover:**

When the primary fails, promote a replica to become the new primary. This requires:

1. Detect primary is dead (not just slow)
2. Choose which replica to promote (usually the one most caught up)
3. Reconfigure other replicas to follow new primary
4. Update application to send writes to new primary

Automated failover is dangerous. If you detect the primary wrong, you might promote a replica while the old primary is still running. Now you have two primaries accepting writes - split brain. When they reconnect, you have conflicting data and no automatic way to merge it.

Manual failover is safer but slow. If primary fails at 3am, someone needs to wake up, verify it's really dead, and promote a replica.

Most systems use semi-automated failover - automation detects the failure and recommends action, but a human confirms before promotion.

### Multi-Primary (Multi-Master)

Multiple servers accept writes. This is complex because concurrent writes to different primaries can conflict.

```
Primary 1 (US) <-----> Primary 2 (EU)
     ^                      ^
     |                      |
     v                      v
Replicas                Replicas
```

**Use case:** Geographic distribution where US users write to US primary, EU users to EU primary, reducing latency.

**The conflict problem:**

Two users update the same row on different primaries simultaneously:

```
Primary 1 (US):
UPDATE users SET email = 'alice@us.com' WHERE id = 'user123';

Primary 2 (EU):
UPDATE users SET email = 'alice@eu.com' WHERE id = 'user123';
```

Both primaries commit successfully. Then they replicate to each other. Which email is correct?

**Conflict resolution strategies:**

**Last-write-wins (LWW):**
Use timestamps to determine winner. The update with the later timestamp wins.

```sql
UPDATE users
SET email = 'alice@eu.com',
    updated_at = '2025-11-15 14:30:00'  -- EU timestamp
WHERE id = 'user123'
  AND updated_at < '2025-11-15 14:30:00';  -- only update if ours is newer
```

Problem: Clocks aren't perfectly synchronized. EU server's clock might be 5 seconds ahead, so EU writes always win even if they happened second.

**Application-level resolution:**
Keep both values and let application code decide.

```sql
-- Store conflicts for manual resolution
CREATE TABLE email_conflicts (
  user_id UUID,
  email_us TEXT,
  email_eu TEXT,
  resolved BOOLEAN DEFAULT false
);
```

This is honest but requires code to handle conflicts. Good for critical data where you can't afford to silently drop updates.

**Commutative operations:**
Design writes to be order-independent. Incrementing counters works regardless of order:

```sql
-- These commute (order doesn't matter)
UPDATE posts SET view_count = view_count + 1;  -- both primaries
UPDATE posts SET view_count = view_count + 1;
-- Final result: view_count += 2, regardless of order

-- These don't commute
UPDATE posts SET view_count = 10;  -- Primary 1
UPDATE posts SET view_count = 15;  -- Primary 2
-- Final result: whoever replicates last wins
```

CRDTs (Conflict-free Replicated Data Types) formalize this - data structures designed to merge automatically without conflicts.

**Multi-primary is hard.** Use it only when:
- Geographic distribution demands it for latency
- Downtime is completely unacceptable (no single point of failure)
- Your data model supports automatic conflict resolution

Otherwise, stick with primary-replica.

### Quorum-Based Replication

Instead of primary/replica distinction, all servers are equal. Writes and reads require a quorum (majority) of servers to agree.

Cassandra and DynamoDB use this model:

```
# Write to 3 servers, wait for 2 to acknowledge (W=2)
# Read from 3 servers, return when 2 respond (R=2)
# As long as W + R > N (total servers), reads see latest writes
```

Trade-off: No single primary means no single point of failure, but also no single source of truth. Conflict resolution is always necessary.

## Performance Optimization at Scale

The techniques that work at 10,000 rows don't work at 10,000,000. Here's what changes.

### Query Planner Deep Dive

Your database has a query planner that decides how to execute each query. Understanding what it's doing helps you write queries that don't choke at scale.

**EXPLAIN ANALYZE** shows the plan:

```sql
EXPLAIN ANALYZE
SELECT p.title, u.name
FROM posts p
JOIN users u ON u.id = p.author_id
WHERE p.created_at > '2024-01-01'
  AND p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 10;
```

Output (simplified):
```
Limit  (cost=0.56..123.45 rows=10) (actual time=0.123..0.456 rows=10 loops=1)
  ->  Nested Loop  (cost=0.56..15234.67 rows=1237) (actual time=0.122..0.454 rows=10 loops=1)
        ->  Index Scan Backward using idx_posts_created on posts p  (cost=0.42..8456.78 rows=1237)
              Index Cond: (created_at > '2024-01-01'::date)
              Filter: (status = 'published'::text)
              Rows Removed by Filter: 42
        ->  Index Scan using users_pkey on users u  (cost=0.14..5.49 rows=1)
              Index Cond: (id = p.author_id)
  Planning Time: 0.234 ms
  Execution Time: 0.489 ms
```

**What this tells you:**

1. **Index Scan Backward** - Using the index on `created_at` and scanning in reverse (DESC)
2. **Nested Loop** - For each post, look up the user by primary key
3. **Filter** - After using the index, it filters by status (42 rows discarded)
4. **Limit pushdown** - Stops after finding 10 rows, doesn't scan everything

This is good. Execution time is under 1ms.

**Bad plan:**

```
Limit  (cost=45678.90..45679.15 rows=10)
  ->  Sort  (cost=45678.90..45879.23 rows=80000)
        Sort Key: p.created_at DESC
        ->  Hash Join  (cost=15234.56..44567.89 rows=80000)
              Hash Cond: (p.author_id = u.id)
              ->  Seq Scan on posts p  (cost=0.00..25432.00 rows=80000)
                    Filter: ((created_at > '2024-01-01') AND (status = 'published'))
              ->  Hash  (cost=10000.00..10000.00 rows=100000)
                    ->  Seq Scan on users u  (cost=0.00..10000.00 rows=100000)
```

This is terrible:
1. **Seq Scan** - Scanning the entire table instead of using an index
2. **Sort** - Sorting 80,000 rows before applying LIMIT
3. **Hash Join** - Building a hash table of all users (expensive)

Why? Missing index on `(created_at, status)`. The planner can't efficiently find published posts after 2024-01-01, so it scans everything.

**Fix:**
```sql
CREATE INDEX idx_posts_created_status ON posts(created_at DESC, status)
WHERE status = 'published';
```

This partial index only includes published posts, sorted by creation date. Now the planner can use it to find the 10 most recent published posts instantly.

**Query planner hints:**

Sometimes the planner chooses poorly because statistics are stale or assumptions are wrong.

```sql
-- Update table statistics
ANALYZE posts;

-- Force index usage (PostgreSQL)
SET enable_seqscan = off;  -- testing only, don't use in production

-- Force join strategy (PostgreSQL)
SET enable_hashjoin = off;
```

These are debugging tools. If you're forcing the planner's hand in production, something is wrong. Fix the root cause (missing index, stale statistics, wrong data types).

### Index Strategies for Complex Queries

Simple indexes on single columns work until they don't.

**Composite indexes:**

```sql
-- Index on (a, b, c) can be used for queries filtering on:
-- - a
-- - a, b
-- - a, b, c
-- But NOT for:
-- - b
-- - c
-- - b, c

CREATE INDEX idx_posts_complex ON posts(author_id, status, created_at DESC);

-- Uses index
SELECT * FROM posts WHERE author_id = 'user123' AND status = 'published';

-- Doesn't use index effectively (missing author_id)
SELECT * FROM posts WHERE status = 'published' AND created_at > '2024-01-01';
```

Order matters. Put the most selective column first (the one that filters to fewest rows).

**Covering indexes:**

Include extra columns so the database doesn't need to fetch the actual row:

```sql
CREATE INDEX idx_posts_covering ON posts(author_id, created_at DESC)
INCLUDE (title, status);

-- Index contains all needed columns - no table lookup required
SELECT title, status FROM posts
WHERE author_id = 'user123'
ORDER BY created_at DESC
LIMIT 10;
```

This is called an index-only scan. It's faster because the database reads only the index, not the table.

**Partial indexes:**

Index only rows you care about:

```sql
-- Only index published posts
CREATE INDEX idx_posts_published ON posts(created_at DESC)
WHERE status = 'published';

-- Much smaller than indexing all posts, so faster updates
```

If 95% of posts are published, this index is tiny and updates to draft posts don't touch it.

**Expression indexes:**

Index computed values:

```sql
-- Find users by lowercase email
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
```

Without the index, `LOWER(email)` is computed for every row. With it, the computation is done once at insert time.

**Full-text search indexes:**

```sql
-- PostgreSQL full-text search
CREATE INDEX idx_posts_search ON posts
USING gin(to_tsvector('english', title || ' ' || content));

SELECT title FROM posts
WHERE to_tsvector('english', title || ' ' || content) @@ to_tsquery('database & design');
```

GIN (Generalized Inverted Index) is designed for full-text search. It's much faster than `LIKE '%database%'` and supports stemming, ranking, and relevance.

For serious search, use dedicated tools (Elasticsearch, Typesense, Meilisearch). For basic search within your app, PostgreSQL full-text search works well.

**Monitoring index usage:**

Unused indexes waste space and slow down writes. Find them:

```sql
-- PostgreSQL: indexes that are never used
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey';
```

Drop indexes that aren't used. Every index has a cost.

### Materialized Views

Materialized views are cached query results stored as tables. Unlike regular views (which are just stored queries), materialized views physically store data.

**Regular view:**
```sql
CREATE VIEW recent_posts AS
SELECT p.*, u.name as author_name
FROM posts p
JOIN users u ON u.id = p.author_id
WHERE p.created_at > now() - interval '7 days';

-- Every query executes the JOIN
SELECT * FROM recent_posts;
```

**Materialized view:**
```sql
CREATE MATERIALIZED VIEW recent_posts AS
SELECT p.*, u.name as author_name
FROM posts p
JOIN users u ON u.id = p.author_id
WHERE p.created_at > now() - interval '7 days';

-- Creates a real table with the query results
CREATE INDEX idx_mv_recent_posts_created ON recent_posts(created_at);

-- Query reads from the cached table - fast
SELECT * FROM recent_posts;

-- Refresh when data changes (can be slow)
REFRESH MATERIALIZED VIEW recent_posts;
```

Materialized views trade freshness for speed. The data is stale until you refresh, but queries are fast because there's no JOIN.

**Concurrent refresh:**
```sql
-- PostgreSQL: refresh without locking the view
REFRESH MATERIALIZED VIEW CONCURRENTLY recent_posts;
```

This requires a unique index on the view but allows queries to continue while refreshing.

**When to use:**
- Complex aggregations run frequently (analytics dashboards)
- Reports that don't need real-time data
- Computed columns that are expensive to calculate on-the-fly

Stripe uses materialized views for merchant dashboards. Daily revenue summaries refresh overnight. Merchants see near-real-time data (refreshed every 15 minutes) without the cost of computing aggregations on every page load.

## Multi-Tenancy Patterns

SaaS applications serve multiple customers (tenants) from shared infrastructure. How you isolate tenant data determines security, performance, and operational complexity.

### Pattern 1: Shared Schema with Row-Level Security

All tenants share the same tables. A `tenant_id` column identifies which tenant owns each row.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
```

Every query must filter by `tenant_id`:
```sql
SELECT * FROM documents WHERE tenant_id = 'tenant123';
```

The application is responsible for adding `tenant_id` to every query. Miss it once and you leak data across tenants.

**Row-Level Security (RLS)** enforces tenant isolation at the database level:

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their tenant's documents
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Application sets tenant_id for the session
SET app.current_tenant = 'tenant123';

-- Now queries automatically filter by tenant_id
SELECT * FROM documents;  -- only returns tenant123's documents
```

RLS prevents data leakage bugs. Even if application code forgets the `WHERE tenant_id` clause, the database enforces it.

**Pros:**
- Simple schema management (one set of tables)
- Efficient resource sharing (all tenants use same database)
- Easy to add features (one schema change affects all tenants)

**Cons:**
- Noisy neighbor problem (one tenant's heavy queries slow everyone)
- Harder to guarantee performance per tenant
- Backup/restore is all-or-nothing
- Difficult to move individual tenants to different infrastructure

Slack uses this model. All workspaces share tables, RLS isolates data. It works because most workspaces are small and activity is distributed.

### Pattern 2: Separate Schema per Tenant

Each tenant gets their own schema within the same database:

```sql
-- Tenant 1
CREATE SCHEMA tenant_abc;
CREATE TABLE tenant_abc.documents (...);

-- Tenant 2
CREATE SCHEMA tenant_xyz;
CREATE TABLE tenant_xyz.documents (...);
```

Application sets the schema search path:
```sql
SET search_path = tenant_abc;
SELECT * FROM documents;  -- queries tenant_abc.documents
```

**Pros:**
- Better isolation than shared schema
- Can backup/restore individual schemas
- Performance is more predictable per tenant
- Easier to migrate tenants between databases

**Cons:**
- Schema management at scale (1000 tenants = 1000 schemas)
- Cross-tenant queries are harder (rare but sometimes needed)
- Connection pooling more complex (need to reset search_path)

Atlassian uses this for some products. Each Jira/Confluence instance gets a schema. It's easier to move large customers to dedicated databases when they outgrow shared infrastructure.

### Pattern 3: Database per Tenant

Each tenant gets a completely separate database:

```
tenant_abc_db: full schema
tenant_xyz_db: full schema
tenant_123_db: full schema
```

**Pros:**
- Perfect isolation (one tenant's problems don't affect others)
- Trivial to backup, restore, or move individual tenants
- Can put tenants on different servers (geographic distribution, compliance)
- Can offer different SLA tiers (enterprise tenants on faster hardware)

**Cons:**
- Operational complexity (managing 1000+ databases)
- Schema migrations must run on all databases
- Expensive (can't share resources efficiently)
- Cross-tenant analytics require connecting to all databases

Heroku Postgres uses this model. Every customer gets a dedicated database. It's expensive but provides strong isolation guarantees.

**Choosing a pattern:**

- **Shared schema**: 1000+ small tenants, low isolation requirements, cost-sensitive
- **Separate schemas**: 100-1000 medium tenants, moderate isolation needs
- **Database per tenant**: <100 large tenants, high isolation needs, enterprise SLA requirements

You can mix approaches. Shopify uses shared schemas for small merchants, dedicated databases for large ones.

## Zero-Downtime Migrations

Changing schemas without taking the application offline requires careful sequencing.

### Adding Columns

Simple case:
```sql
-- Safe: columns are nullable by default
ALTER TABLE users ADD COLUMN phone TEXT;
```

Application continues working. Old code ignores new column, new code uses it.

**Not safe:**
```sql
-- Breaks old application code
ALTER TABLE users ADD COLUMN phone TEXT NOT NULL;
```

Old application code doesn't provide `phone` on INSERT, query fails.

**Safe approach:**
```
1. Add column as nullable: ALTER TABLE users ADD COLUMN phone TEXT;
2. Deploy code that writes phone (if available)
3. Backfill existing rows: UPDATE users SET phone = '' WHERE phone IS NULL;
4. Add NOT NULL constraint: ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

Each step is safe. If you rollback between steps, everything still works.

### Removing Columns

```sql
-- Dangerous: breaks old application code that references this column
ALTER TABLE users DROP COLUMN deprecated_field;
```

**Safe approach:**
```
1. Deploy code that stops reading/writing the column
2. Wait for all old code to be retired
3. Drop the column: ALTER TABLE users DROP COLUMN deprecated_field;
```

The gap between step 1 and 3 might be weeks. That's fine - the column wastes a bit of space but doesn't break anything.

### Renaming Columns

```sql
-- Breaks old and new code simultaneously
ALTER TABLE users RENAME COLUMN email TO email_address;
```

Old code queries `email`, new code queries `email_address`. Both break for a period.

**Safe approach using views:**
```
1. Add new column: ALTER TABLE users ADD COLUMN email_address TEXT;
2. Create trigger to keep columns in sync:
   CREATE TRIGGER sync_email
     BEFORE INSERT OR UPDATE ON users
     FOR EACH ROW EXECUTE FUNCTION sync_email_columns();
3. Backfill: UPDATE users SET email_address = email WHERE email_address IS NULL;
4. Deploy code that reads/writes email_address
5. Wait for old code to be retired
6. Drop old column and trigger
```

Alternatively, use a view:
```sql
-- Create view with new column name
CREATE VIEW users_v2 AS
  SELECT id, email as email_address, name FROM users;

-- Old code queries `users`, new code queries `users_v2`
-- Both work simultaneously
```

When migration is complete, rename the table and drop the view:
```sql
ALTER TABLE users RENAME TO users_old;
ALTER TABLE users_v2 RENAME TO users;  -- if it was a table
```

### Adding Indexes

```sql
-- Locks table until index is built (might take hours on large tables)
CREATE INDEX idx_users_email ON users(email);
```

On a production table with millions of rows, this blocks all writes for the duration.

**Safe approach:**
```sql
-- PostgreSQL: build index without locking
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

Takes longer (can't use all optimizations) but doesn't block writes. If it fails, it leaves an invalid index that you must drop manually:

```sql
-- Find invalid indexes
SELECT indexname FROM pg_indexes WHERE indexname LIKE '%invalid%';

DROP INDEX CONCURRENTLY idx_users_email;  -- cleanup failed build
```

MySQL (8.0+) has similar functionality:
```sql
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;
```

### Changing Column Types

```sql
-- Rewrites entire table, locks for duration
ALTER TABLE events ALTER COLUMN event_id TYPE BIGINT;
```

On a table with billions of rows, this might lock for hours.

**Safe approach - dual writes:**
```
1. Add new column: ALTER TABLE events ADD COLUMN event_id_new BIGINT;
2. Backfill in batches: UPDATE events SET event_id_new = event_id::bigint WHERE ... LIMIT 10000;
3. Deploy code that writes both columns
4. Finish backfill
5. Deploy code that reads from new column
6. Drop old column
7. Rename new column
```

Each step is fast. Backfill runs in small batches to avoid long locks.

### Blue-Green Migrations

For complex migrations, run old and new schemas simultaneously:

```
1. Create new schema alongside old: CREATE TABLE users_v2 (...);
2. Set up replication/triggers to keep them in sync
3. Verify data matches
4. Switch reads to new schema
5. Switch writes to new schema
6. Drop old schema
```

This is heavyweight but safe. Used for major schema overhauls (normalizing a denormalized schema, changing primary keys).

GitHub did this when changing how they store repository data. Old and new schemas ran in parallel for months before cutover.

## Compliance and Audit Requirements

Regulations like GDPR, HIPAA, SOC 2, and PCI-DSS impose specific database requirements.

### Data Residency

GDPR requires EU citizen data stays in the EU. HIPAA requires healthcare data stays in US-controlled regions.

**Geographic partitioning:**
```sql
-- EU users on EU servers
CREATE TABLE users_eu (
  id UUID PRIMARY KEY,
  email TEXT,
  country TEXT CHECK (country IN ('DE', 'FR', 'IT', ...))
) PARTITION BY LIST (country);

-- US users on US servers
CREATE TABLE users_us (
  id UUID PRIMARY KEY,
  email TEXT,
  country TEXT CHECK (country IN ('US', 'CA', 'MX'))
) PARTITION BY LIST (country);
```

Application routes queries to the appropriate database based on user location.

**Cross-region challenges:**

User lives in Germany but uses your app while traveling in US. Do you:
- Serve stale data from US replica? (Fast but might violate GDPR)
- Query EU database from US? (Slow but compliant)
- Maintain geo-distributed database? (Complex but handles both)

There's no perfect answer. Consult legal team for your specific requirements.

### Encryption at Rest

Most compliance frameworks require database encryption.

**Transparent Data Encryption (TDE):**
Database encrypts data files automatically. Application code unchanged.

PostgreSQL:
```bash
# Encrypt data directory with LUKS/dm-crypt at filesystem level
cryptsetup luksFormat /dev/sdb1
mount /dev/mapper/encrypted /var/lib/postgresql/data
```

MySQL/MariaDB:
```sql
-- Enable encryption for InnoDB tablespace
ALTER TABLE users ENCRYPTION='Y';
```

AWS RDS, Google Cloud SQL, Azure Database all support encryption at rest via configuration. No application changes needed.

**Column-level encryption:**

Encrypt specific sensitive columns:

```sql
-- PostgreSQL pgcrypto
CREATE EXTENSION pgcrypto;

-- Store encrypted SSN
INSERT INTO users (id, ssn_encrypted)
VALUES ('user123', pgp_sym_encrypt('123-45-6789', 'encryption-key'));

-- Decrypt when needed
SELECT id, pgp_sym_decrypt(ssn_encrypted, 'encryption-key') as ssn
FROM users WHERE id = 'user123';
```

Pros: Selective encryption (only sensitive fields)
Cons: Application must handle encryption/decryption, can't index encrypted fields

### Audit Logs

Track who accessed what data when.

**Table-level audit:**
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  row_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger on users table
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

The trigger function logs every change to `audit_log`. You have a complete history of all modifications.

**Query audit:**
Track who ran which queries.

PostgreSQL:
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
```

This logs every query to PostgreSQL's log files. Parse logs to see who accessed sensitive data:

```
2025-11-15 14:30:00 UTC [12345]: user=alice,db=prod LOG: SELECT * FROM patients WHERE ssn = '123-45-6789';
```

For production systems, use structured audit logging (pgAudit extension) rather than parsing text logs.

### Right to Deletion (GDPR)

Users can request their data be deleted. This is complicated in real systems with references across tables.

**Hard delete:**
```sql
-- Delete user and all related data
DELETE FROM users WHERE id = 'user123';
-- CASCADE deletes posts, comments, etc via foreign keys
```

Problem: Breaks referential integrity if other data references this user. Historical orders lose customer information.

**Soft delete:**
```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- "Delete" user
UPDATE users SET deleted_at = now(), email = NULL, name = 'Deleted User'
WHERE id = 'user123';

-- Queries exclude deleted users
SELECT * FROM users WHERE deleted_at IS NULL;
```

User data is anonymized but records remain for historical purposes. Orders still exist, but customer info is gone.

**Tombstone pattern:**
```sql
-- Replace user data with tombstone marker
UPDATE users SET
  email = NULL,
  name = NULL,
  phone = NULL,
  address = NULL,
  gdpr_deleted = true,
  deleted_at = now()
WHERE id = 'user123';
```

The user row exists (preserves foreign key relationships) but personal data is removed.

**Distributed deletion:**

In microservices, user data spans multiple databases:
```
accounts-db: users table
orders-db: customer info
analytics-db: user events
```

Deletion requires coordinating across services:
```python
def delete_user_gdpr(user_id):
    # Orchestrate deletion across all services
    accounts_service.delete_user(user_id)
    orders_service.anonymize_customer(user_id)
    analytics_service.delete_events(user_id)
    email_service.unsubscribe(user_id)

    # Record deletion request fulfillment
    audit_log.record_deletion(user_id, timestamp=now())
```

This is fragile. If one service fails, you have partial deletion. Use a deletion request queue and mark items as they complete:

```sql
CREATE TABLE gdpr_deletion_requests (
  user_id UUID PRIMARY KEY,
  requested_at TIMESTAMPTZ,
  accounts_deleted BOOLEAN DEFAULT false,
  orders_deleted BOOLEAN DEFAULT false,
  analytics_deleted BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);
```

Background workers process the queue, marking each service as complete. If a step fails, you can retry.

## Real-World Case Studies

Theory is fine, but here's how actual companies evolved their databases.

### Stripe: From Monolith to Sharded MySQL

**Early days (2011-2013):**
Single MySQL database, normalized schema. Worked fine for thousands of businesses.

**Growth (2013-2015):**
Primary database hitting limits. Queries slowing down, write throughput bottlenecked. They tried:
- Read replicas (helped read scaling)
- Better indexes (helped some queries)
- Caching (reduced database load)

Still hitting write limits.

**Sharding (2015-2016):**
Sharded by merchant account. Each merchant's data lives on one shard. This required:
- Choosing shard key (merchant ID)
- Migrating existing data to shards
- Updating application code to route queries to correct shard
- Building tooling to manage shards

Cross-merchant queries (like "total payment volume across all merchants") became harder. They solved this with CQRS - transactional writes go to shards, analytics reads go to data warehouse.

**Lessons:**
- Start simple (single database)
- Shard when evidence demands it, not preemptively
- Accept trade-offs (cross-shard queries get harder)
- Build tooling before you migrate (don't wing it)

### Uber: From PostgreSQL to Schemaless

**Initial architecture:**
PostgreSQL for trips, riders, drivers. Worked until they reached global scale.

**Problems at scale:**
- PostgreSQL replication lag in distant regions (US to Asia)
- Write throughput limits
- Difficulty with schema changes across regions

**Schemaless (2014-2016):**
Built custom system on MySQL and Cassandra:
- MySQL as append-only log
- Cassandra for indexing
- Application handles data versioning

**Why custom?**
They needed:
- Multi-region replication with conflict resolution
- Versioned data (see trip history at any point in time)
- Flexible schema (different cities have different requirements)

No off-the-shelf database satisfied all requirements.

**Lessons:**
- Build custom infrastructure only when necessary
- Most companies aren't Uber scale
- Custom systems have operational costs (you own every bug)

### GitHub: From MySQL to MySQL (but different)

**The problem (2016):**
MySQL primary database approaching write capacity. Sharding would be very complex (repositories reference users, users reference organizations, etc).

**The solution:**
Stayed on MySQL but:
- Migrated to larger hardware (vertical scaling)
- Improved query efficiency (removed N+1 queries)
- Better caching layer (GitHub-flavored Markdown rendering)
- Read replicas for analytics

**Lessons:**
- Vertical scaling is underrated
- Often you can optimize before sharding
- Sometimes throwing money at hardware is cheaper than engineering time

They did eventually shard some tables (like repository metadata) but kept core data on single primary for years longer than expected.

### Discord: From MongoDB to Cassandra to ScyllaDB

**Early days (2015):**
MongoDB for messages. Chose it for flexible schema and ease of use.

**Growing pains (2017):**
MongoDB struggling with message volume. Latency spikes, memory issues.

**Migration to Cassandra (2017):**
Moved messages to Cassandra for better write scaling and predictable performance.

**Problems with Cassandra:**
- Garbage collection pauses causing latency spikes
- Operational complexity (tuning JVM, compaction strategies)
- Costly reads for recent messages

**Migration to ScyllaDB (2020):**
ScyllaDB is Cassandra-compatible but written in C++ (no JVM). Same data model, better performance.

**Lessons:**
- Initial technology choice matters less than ability to migrate
- Operational simplicity has real value (fewer JVM tunings)
- Performance predictability matters more than raw throughput

## Key Takeaways

Advanced database design isn't about using every technique. It's about recognizing when specific patterns solve actual problems.

**Start simple:**
- Normalized relational schema
- One primary database with read replicas
- Standard indexes on foreign keys and query columns

**Add complexity when evidence demands:**
- CQRS when read and write patterns diverge significantly
- Event sourcing when audit trail is legally required
- Sharding when single database can't handle writes
- Multi-region when latency or data residency requires it

**Prioritize:**
1. Correctness (don't lose data, maintain consistency)
2. Operability (can you debug it at 3am?)
3. Performance (make it fast enough)

Every advanced pattern adds operational burden. Sharding means managing N databases. CQRS means keeping read and write models in sync. Multi-region means conflict resolution.

The best database design is the simplest one that meets your requirements. Complexity is expensive - pay for it only when the alternative is worse.

---

**Related Topics:**
- [Architecture Design](../../architecture-design/surface/) - How database design fits into overall architecture
- [API Design](../../api-design/surface/) - Exposing database data through APIs
- [Performance & Scalability Design](../../performance-scalability-design/surface/) - Scaling beyond the database
- [Data Flow Mapping](../../data-flow-mapping/surface/) - Tracking how data moves through your system

**Further Reading:**
- *Designing Data-Intensive Applications* by Martin Kleppmann - The definitive guide to distributed data systems
- *Database Internals* by Alex Petrov - How databases actually work under the hood
- *High Performance MySQL* - Optimization techniques for MySQL/MariaDB
- *The Art of PostgreSQL* by Dimitri Fontaine - Advanced PostgreSQL patterns
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[← Mid-Depth](../mid-depth/index.md)** Practical patterns and implementation

### Related Topics
- [Architecture Design](../../architecture-design/deep-water/index.md) - Related design considerations
- [Data Flow Mapping](../../data-flow-mapping/deep-water/index.md) - Related design considerations
- [Performance & Scalability Design](../../performance-scalability-design/deep-water/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
