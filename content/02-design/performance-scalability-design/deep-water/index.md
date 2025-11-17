---
title: "Performance & Scalability Design - Deep Water"
phase: "02-design"
topic: "performance-scalability-design"
depth: "deep-water"
reading_time: 50
prerequisites: ["performance-scalability-design-surface"]
related_topics: ["architecture-design", "database-design", "api-design", "monitoring-observability"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Performance & Scalability Design - Deep Water

The surface content covered the fundamentals: cache what doesn't change, index what you query, use a CDN. These practices get you to thousands of users without breaking a sweat.

This content covers what happens when those patterns aren't enough. When you're handling millions of requests per day. When cache invalidation becomes a distributed systems problem. When a single database can't handle the load. When geographic distribution matters not just for static assets, but for dynamic content.

The systems described here are what companies like Discord, Stripe, Netflix, and Shopify built after their basic infrastructure stopped scaling. They're complex. They're expensive to operate. They solve real problems that only appear at scale.

You probably don't need most of this right now. But when you do need it, you'll know exactly which problem you're solving.

## Understanding the Scalability Cliff

Applications don't slow down linearly. They hit cliffs.

With 1,000 users, response times average 200ms. With 10,000 users, still 200ms. With 50,000 users, 250ms. Then you hit 75,000 users and response times spike to 5 seconds. Your database connection pool is exhausted. Every request waits for a connection. The system is at a cliff.

These cliffs appear at different points depending on your architecture:

**Connection pool exhaustion** - You can only handle as many concurrent requests as you have database connections. Most apps start with 10-20. When concurrent requests exceed that, new requests queue. The queue builds up faster than it drains. Response times spiral.

**Memory exhaustion** - Application servers have finite RAM. Each request uses memory. When you run out, the OS starts swapping to disk. Swap is 1000x slower than RAM. The system grinds to a halt.

**CPU saturation** - When CPU usage hits 80-90%, response times increase exponentially. A server running at 70% CPU handles requests in 100ms. The same server at 95% CPU handles requests in 2 seconds.

**Network bandwidth** - A 1 Gbps connection seems huge until you're serving video or high-resolution images to thousands of users simultaneously. You hit the limit and throughput plummets.

**Lock contention** - Databases use locks to maintain consistency. When many requests try to update the same rows, they wait for locks. One slow transaction holding a lock can block hundreds of requests.

The key insight: you need to identify which cliff you're approaching before you hit it. That requires monitoring with specific metrics.

## Global CDN Architecture Beyond Static Files

Surface-level CDN usage is straightforward: put images and JavaScript files on edge servers. At scale, CDNs become compute platforms that run application logic.

### Edge Computing Patterns

Cloudflare Workers, AWS Lambda@Edge, and Vercel Edge Functions let you run code at CDN edge locations. This moves computation closer to users.

**Authentication at the Edge**
Instead of sending every request to your origin server to check authentication, verify JWT tokens at the edge. A request from Tokyo hits the Tokyo edge server, verifies the token locally, and either serves cached content or proxies to origin.

```javascript
// Runs at edge locations worldwide
async function handleRequest(request) {
  const token = request.headers.get('Authorization');

  // Verify JWT locally at edge - no origin request needed
  const user = await verifyToken(token);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Serve from edge cache if available
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  let response = await cache.match(cacheKey);

  if (!response) {
    // Only hit origin if not cached
    response = await fetch(request);
    await cache.put(cacheKey, response.clone());
  }

  return response;
}
```

This pattern reduced Discord's authentication overhead by 70% when they moved JWT verification to the edge. Origin servers no longer process millions of authentication checks.

**Personalization at the Edge**
You can't cache personalized content the traditional way - every user sees different data. But you can cache the template and inject personalization at the edge.

Stripe does this for their dashboard. The HTML structure is cached at the edge. User-specific data (account balance, recent transactions) comes from a fast API call. The edge server combines them before sending to the client.

```javascript
async function personalizedResponse(request, userId) {
  // Cache the template - same for all users
  const template = await getFromCache('dashboard-template');

  // Fetch user-specific data - fast API call
  const userData = await fetch(`https://api.example.com/user/${userId}/summary`);

  // Combine at edge
  return renderTemplate(template, userData);
}
```

Response time from San Francisco: template from local edge (20ms) + API call to origin (80ms) = 100ms total. Without edge caching, the full HTML render at origin takes 300ms plus network latency.

### Regional Caching Tiers

Large-scale systems use multiple caching layers with different eviction policies.

**Edge Cache (Short TTL)**
Lives on CDN edge servers. Hundreds of locations. Very small capacity per location. Stores frequently accessed content with 30-60 second TTL.

**Regional Cache (Medium TTL)**
Lives in major regions. Dozens of locations. Larger capacity. Stores popular content with 5-15 minute TTL.

**Origin Cache (Long TTL)**
Lives near application servers. Few locations. Large capacity. Stores everything with hours to days TTL.

Shopify's architecture looks like this:

```
User Request → Edge Cache (miss)
  → Regional Cache (miss)
    → Origin Cache (miss)
      → Application Server
```

Most requests hit at edge. Popular but not ultra-popular content hits at regional. Everything else hits origin cache. Only uncached content reaches application servers.

The benefit: origin servers handle 5% of requests instead of 100%. When you're handling 100,000 requests per second, that's the difference between 100 application servers and 5,000.

### Cache Invalidation at Scale

"Clear the cache when data changes" sounds simple. At scale, it's distributed systems complexity.

**The Thundering Herd Problem**
Your cache has product pricing with 5-minute TTL. It expires. At exactly that moment, 10,000 requests arrive. All see cache miss. All query the database. The database falls over.

**Solution 1: Locking**
When cache misses, acquire a lock before hitting the database. Other requests wait for the lock holder to populate the cache.

```python
def get_product_price(product_id):
    cache_key = f"price:{product_id}"

    # Try cache first
    price = cache.get(cache_key)
    if price:
        return price

    # Cache miss - acquire lock
    lock_key = f"lock:{cache_key}"
    if cache.add(lock_key, "locked", ttl=10):
        # We got the lock - fetch from database
        price = db.query("SELECT price FROM products WHERE id = ?", product_id)
        cache.set(cache_key, price, ttl=300)
        cache.delete(lock_key)
        return price
    else:
        # Someone else has the lock - wait and retry
        time.sleep(0.1)
        return get_product_price(product_id)
```

This works but creates latency spikes. The first request takes 200ms (database query). Subsequent requests wait 100ms (sleep and retry). Not ideal.

**Solution 2: Probabilistic Early Expiration**
Don't wait for cache to expire. Refresh it probabilistically before expiration.

```python
import random

def get_product_price(product_id):
    cache_key = f"price:{product_id}"

    # Cache stores (value, timestamp)
    cached = cache.get(cache_key)
    if cached:
        value, cached_at = cached
        age = time.time() - cached_at
        ttl = 300  # 5 minutes

        # Probabilistically refresh when getting old
        # When age = 0.8 * TTL, 20% chance to refresh
        # When age = 0.9 * TTL, 30% chance to refresh
        refresh_probability = max(0, (age / ttl) - 0.5) * 2

        if random.random() > refresh_probability:
            return value

        # Fall through to refresh

    # Refresh cache
    price = db.query("SELECT price FROM products WHERE id = ?", product_id)
    cache.set(cache_key, (price, time.time()), ttl=300)
    return price
```

Requests spread out cache refreshes. No thundering herd. No latency spikes. This is what Reddit uses for their comment caching.

**Solution 3: Cache Warming**
Pre-populate cache before it's needed. When you deploy new pricing, push it to the cache before announcing it.

```python
def deploy_new_pricing(pricing_data):
    # Write to database
    db.batch_update("products", pricing_data)

    # Immediately warm cache
    for product in pricing_data:
        cache_key = f"price:{product['id']}"
        cache.set(cache_key, product['price'], ttl=300)

    # Now announce the change
    notify_users("Pricing updated")
```

No cache misses. No database load spike. Users see new pricing immediately.

**Solution 4: Versioned Cache Keys**
Include a version in the cache key. Invalidation becomes "increment the version."

```python
# Global version stored in fast distributed store
PRICING_VERSION = redis.get("pricing_version")  # e.g., "v47"

def get_product_price(product_id):
    cache_key = f"price:{PRICING_VERSION}:{product_id}"

    price = cache.get(cache_key)
    if price:
        return price

    price = db.query("SELECT price FROM products WHERE id = ?", product_id)
    cache.set(cache_key, price, ttl=3600)  # Long TTL is fine
    return price

def update_all_pricing():
    # Update database
    db.execute("UPDATE products SET price = price * 1.1")

    # Invalidate all cached prices by bumping version
    redis.incr("pricing_version")  # Now "v48"

    # Old cache keys ("price:v47:*") are orphaned
    # New requests use new keys ("price:v48:*")
```

Instantaneous invalidation across all edge servers worldwide. No cache purge API calls. No distributed invalidation coordination. The old cache entries expire naturally.

This is what Cloudflare's CDN uses internally. When you purge cache, they're bumping a version number, not actually deleting entries.

## Database Performance at Scale

A single PostgreSQL or MySQL instance can handle 10,000-50,000 queries per second on good hardware. That's enough for most applications. When it's not, you have options.

### Connection Pooling Done Right

Applications don't connect directly to the database. They connect to a pool. The pool maintains persistent connections and reuses them.

**Why connection pooling matters**
Creating a database connection takes 20-50ms. Reusing an existing connection takes under 1ms. For queries that take 5ms, connection overhead doubles your latency.

**Pool sizing math**
This seems simple but most teams get it wrong. Too few connections and requests queue. Too many and you overwhelm the database.

The formula: `connections = ((core_count * 2) + effective_spindle_count)`

For modern SSDs, effective spindle count is essentially infinite, but the CPU formula holds: a server with 8 cores should have about 16-32 database connections.

But that's for the database server. Your application pool needs to account for the number of application servers.

If you have:
- 5 application servers
- Each with a pool of 20 connections
- That's 100 connections to the database

Your database needs to handle 100 connections. If it has 8 cores, that's fine (it can handle ~200). If it has 2 cores, you're overloaded.

**PgBouncer for connection pooling**
Application servers connect to PgBouncer. PgBouncer maintains a smaller pool to the actual database.

```ini
[databases]
myapp = host=db.internal port=5432

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

1,000 application connections multiplexed into 25 database connections. The database doesn't see the thundering herd.

Pool modes matter:
- **Session mode**: One database connection per client for entire session. Safe but doesn't pool effectively.
- **Transaction mode**: Database connection released after each transaction. Pools well. Works for most apps.
- **Statement mode**: Database connection released after each statement. Maximum pooling. Breaks prepared statements and temp tables.

Discord runs PgBouncer in transaction mode. They have thousands of application servers connecting to dozens of database connections.

### Read Replicas and Separation

Typical web apps are 90% reads, 10% writes. Send reads to replicas. Keep the primary for writes only.

```python
# Simple read/write split
class DatabaseRouter:
    def db_for_read(self):
        # Round-robin across replicas
        return random.choice([
            'replica-1',
            'replica-2',
            'replica-3'
        ])

    def db_for_write(self):
        return 'primary'

# Usage
user = db.query('SELECT * FROM users WHERE id = ?', user_id, db=db_for_read())
db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', user_id, db=db_for_write())
```

This works until you hit replication lag. You write to primary, immediately read from replica, and don't see your write because replication is 200ms behind.

**Solutions:**

1. **Sticky reads after writes** - After a write, read from primary for 2-3 seconds
2. **Read your writes** - Track last write timestamp, wait for replica to catch up
3. **Eventual consistency** - Accept that some reads are slightly stale

GitHub uses approach #1. After you star a repository, your profile shows the change immediately (read from primary). Other users see it 1-2 seconds later (read from replicas).

### CQRS: Command Query Responsibility Segregation

At extreme scale, separate databases for reads and writes.

**Write Database** (PostgreSQL)
- Normalized schema
- ACID transactions
- Authoritative source of truth
- Handles inserts, updates, deletes

**Read Database** (Elasticsearch or denormalized PostgreSQL)
- Denormalized, optimized for queries
- Eventually consistent
- Can be minutes behind
- Handles all reads

When you update data, it goes to write database. A background process streams changes to read database. Reads are fast because the schema is optimized for queries. Writes are safe because the write database maintains integrity.

Stack Overflow works this way. They write to SQL Server. The read layer is Elasticsearch with denormalized documents. Searching is instant because Elasticsearch is optimized for full-text search. Data integrity is guaranteed because SQL Server is the source of truth.

The trade-off: complexity. You're managing two databases, keeping them in sync, and accepting eventual consistency. Only worth it at scale.

### Query Optimization Beyond Indexes

**EXPLAIN ANALYZE is your best friend**

```sql
EXPLAIN ANALYZE
SELECT p.*, u.name, COUNT(l.id) as like_count
FROM posts p
JOIN users u ON u.id = p.author_id
LEFT JOIN likes l ON l.post_id = p.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, u.name
ORDER BY like_count DESC
LIMIT 10;
```

The output shows:
- Which indexes were used (or not used)
- How many rows were scanned
- Where time was spent
- Whether the query planner made good choices

Common findings:

**Sequential scan when index exists** - The planner thinks a full table scan is faster. Often true for small tables, bad for large ones. Force index usage or adjust planner statistics.

**Nested loop on large tables** - Nested loop joins work for small datasets. For large ones, hash joins or merge joins are better. Adjust `work_mem` or rewrite the query.

**Sort on disk** - If sort data exceeds `work_mem`, PostgreSQL sorts on disk (slow). Increase `work_mem` or reduce result set before sorting.

### Partitioning Large Tables

A table with 100 million rows slows down even with perfect indexes. Partitioning splits it into smaller tables.

```sql
-- Partition by month
CREATE TABLE events (
    id BIGSERIAL,
    user_id INTEGER,
    event_type VARCHAR(50),
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2024_11 PARTITION OF events
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE events_2024_12 PARTITION OF events
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
```

Queries that filter by `created_at` only scan relevant partitions. A query for November data scans 1 partition with 3 million rows, not 1 table with 100 million rows.

Queries go from 5 seconds to 200ms.

The trick: partition on columns you always filter by. Partitioning by user_id helps if you always query one user at a time. Partitioning by created_at helps if you always query date ranges. Partitioning by random ID doesn't help anyone.

## Multi-Layer Caching Strategies

You already know about caching. This is about making caches work together without stampeding.

### The Full Stack

```
Browser Cache (HTTP headers)
  ↓ miss
CDN Edge Cache (Cloudflare, Cloudfront)
  ↓ miss
Application Cache (Redis)
  ↓ miss
Database Query Cache
  ↓ miss
Database (PostgreSQL, MySQL)
```

Each layer has different characteristics:

**Browser Cache**
- Capacity: ~100MB per site
- Latency: 0ms (already on disk)
- TTL: Hours to months
- Invalidation: Hard (requires cache busting)
- Best for: Versioned assets (`app.v123.js`)

**CDN Edge Cache**
- Capacity: ~100GB per POP
- Latency: 10-50ms
- TTL: Minutes to hours
- Invalidation: API calls
- Best for: Popular content

**Application Cache (Redis)**
- Capacity: Limited by RAM (typically 8-64GB)
- Latency: 1-5ms
- TTL: Seconds to hours
- Invalidation: Precise control
- Best for: Database query results, computed data

**Database Cache**
- Capacity: 25-50% of database size
- Latency: Sub-millisecond
- TTL: Managed by database
- Invalidation: Automatic
- Best for: Hot data you can't control

### Cache Coherence Strategies

With multiple cache layers, keeping them consistent is hard.

**Approach 1: Write-through**
Update database and cache simultaneously.

```python
def update_user_profile(user_id, new_data):
    # Update database
    db.execute("UPDATE users SET name = ? WHERE id = ?",
               new_data['name'], user_id)

    # Update cache immediately
    cache_key = f"user:{user_id}"
    cache.set(cache_key, new_data, ttl=300)
```

Pros: Cache never stale. Cons: Two writes for every update. If cache write fails, they diverge.

**Approach 2: Write-invalidate**
Update database, delete from cache.

```python
def update_user_profile(user_id, new_data):
    # Update database
    db.execute("UPDATE users SET name = ? WHERE id = ?",
               new_data['name'], user_id)

    # Invalidate cache
    cache_key = f"user:{user_id}"
    cache.delete(cache_key)
```

Pros: Simple. Cache can't be stale. Cons: Next read is a cache miss.

**Approach 3: Write-behind**
Update cache, asynchronously update database.

```python
def update_user_profile(user_id, new_data):
    # Update cache immediately
    cache_key = f"user:{user_id}"
    cache.set(cache_key, new_data, ttl=300)

    # Queue database update
    queue.enqueue(lambda: db.execute(
        "UPDATE users SET name = ? WHERE id = ?",
        new_data['name'], user_id
    ))
```

Pros: Fast writes. Cons: Database might be behind. If cache evicts before queue processes, data is lost.

Most systems use write-invalidate. It's simple and correct. Write-through makes sense for critical data. Write-behind is rare because the risks usually outweigh the benefits.

### Dealing with Cache Stampedes

Covered locking earlier. Here's a different approach: stale-while-revalidate.

```python
def get_product_price(product_id):
    cache_key = f"price:{product_id}"

    # Cache stores (value, timestamp, stale)
    cached = cache.get(cache_key)

    if cached:
        value, timestamp, is_stale = cached

        if not is_stale:
            # Fresh data - return it
            return value

        # Stale data - return it but refresh in background
        threading.Thread(target=refresh_cache,
                        args=(product_id, cache_key)).start()
        return value

    # No cache - fetch synchronously
    price = db.query("SELECT price FROM products WHERE id = ?", product_id)
    cache.set(cache_key, (price, time.time(), False), ttl=300)
    return price

def refresh_cache(product_id, cache_key):
    price = db.query("SELECT price FROM products WHERE id = ?", product_id)
    cache.set(cache_key, (price, time.time(), False), ttl=300)
```

When cache expires, mark it stale but keep serving it. Refresh in the background. Users never see the cache miss latency.

This is what Varnish HTTP cache does with `stale-while-revalidate` header.

## Async Processing Architecture

Background jobs are simple at small scale: queue a job, worker picks it up, processes it. At scale, you need sophisticated job handling.

### Message Queues vs Event Streams

**Message Queues (RabbitMQ, SQS, Cloud Tasks)**
- Jobs are consumed once
- Worker acknowledges completion
- Failed jobs retry
- Order not guaranteed (usually)

**Event Streams (Kafka, Kinesis, Pulsar)**
- Events are broadcast to subscribers
- Multiple consumers can read the same event
- Events stored for days/weeks
- Order guaranteed within partition

Use queues for "do this work once" tasks: send email, generate PDF, process payment.

Use streams for "these events happened" notifications: user signed up, order placed, payment completed. Multiple systems care about these events.

### Backpressure and Rate Limiting

A sudden spike in jobs can overwhelm workers. Your API receives 100,000 new orders in 10 minutes (flash sale). Each order queues 3 jobs (confirmation email, inventory update, shipping label). That's 300,000 jobs.

Your workers process 100 jobs/second. That's 50 minutes to clear the queue. But jobs keep coming. The queue grows to millions. Workers fall further behind.

**Backpressure solution: Queue limits**

```python
def enqueue_job(job):
    queue_size = redis.llen('job_queue')

    if queue_size > 10000:
        # Queue is too large - reject new jobs
        raise QueueFullError("Job queue at capacity")

    redis.rpush('job_queue', job)
```

Better to reject new jobs than to accept them and process them hours late. The API can return 503 Service Unavailable. The client retries later or the user gets an error message.

**Rate limiting solution: Token bucket**

```python
class RateLimiter:
    def __init__(self, rate, capacity):
        self.rate = rate  # tokens per second
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.time()

    def allow(self):
        now = time.time()
        elapsed = now - self.last_update

        # Refill tokens
        self.tokens = min(self.capacity,
                         self.tokens + elapsed * self.rate)
        self.last_update = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

# Limit to 100 jobs per second
limiter = RateLimiter(rate=100, capacity=100)

def enqueue_job(job):
    if not limiter.allow():
        raise RateLimitError("Too many jobs")

    redis.rpush('job_queue', job)
```

Jobs enqueue at sustainable rate. Queue doesn't grow unbounded. System stays responsive.

### Dead Letter Queues

Some jobs fail permanently. Email address doesn't exist. Payment card declined. External API returned 400 Bad Request (client error, not worth retrying).

Retrying these jobs wastes resources. After N failures, move them to a dead letter queue (DLQ) for manual review.

```python
def process_job(job):
    try:
        result = perform_work(job)
        acknowledge_job(job)
    except RetryableError as e:
        # Temporary failure - retry
        job.retries += 1
        if job.retries < 5:
            requeue_job(job)
        else:
            # Too many retries - move to DLQ
            dead_letter_queue.add(job)
            acknowledge_job(job)  # Don't requeue
    except PermanentError as e:
        # Permanent failure - don't retry
        dead_letter_queue.add(job)
        acknowledge_job(job)
```

Ops teams review DLQ weekly. Most are legitimate failures (invalid email). Some reveal bugs (malformed data from API). Fix the bugs, requeue the jobs.

Stripe processes billions of jobs. Their DLQ catches edge cases that QA never found. It's a debugging goldmine.

## Load Balancing Deep Dive

Surface content mentioned load balancing. This covers the real complexity.

### Layer 4 vs Layer 7

**Layer 4 (Transport Layer)**
Load balancer looks at IP addresses and TCP/UDP ports. Fast. Doesn't inspect HTTP headers or application data.

```
Client → Load Balancer (sees: TCP connection to port 443)
           → Server A, B, or C
```

Advantages:
- Very fast (minimal processing)
- Protocol-agnostic (works for HTTP, WebSockets, gRPC, databases)
- Low latency overhead (microseconds)

Disadvantages:
- Can't route based on URL path
- Can't inspect cookies or headers
- Can't do SSL termination easily

**Layer 7 (Application Layer)**
Load balancer inspects HTTP requests. Can route based on URL, headers, cookies.

```
Client → Load Balancer (sees: GET /api/users, Host: api.example.com)
           → Routes to API servers

Client → Load Balancer (sees: GET /images/logo.png, Host: cdn.example.com)
           → Routes to asset servers
```

Advantages:
- Intelligent routing (send /api to API servers, /images to asset servers)
- SSL termination (decrypt once at load balancer, plain HTTP to backends)
- Can inspect cookies for sticky sessions

Disadvantages:
- Slower (milliseconds of overhead)
- More CPU intensive
- Must understand the protocol

Most systems use L7 for HTTP traffic, L4 for everything else.

### Load Balancing Algorithms

**Round Robin**
Each request goes to the next server in the list. Simple. Fair. Ignores server load.

Server A gets request 1, 4, 7, 10...
Server B gets request 2, 5, 8, 11...
Server C gets request 3, 6, 9, 12...

Works great if requests have similar cost. Breaks down if request 1 is "fetch user profile" (10ms) and request 2 is "generate annual report" (30 seconds).

**Least Connections**
Route to server with fewest active connections. Better load distribution if request cost varies.

Servers:
- A: 5 connections
- B: 3 connections
- C: 8 connections

Next request goes to B.

**Least Response Time**
Track how long each server takes to respond. Route to the fastest.

Servers:
- A: avg 150ms response time
- B: avg 80ms response time
- C: avg 200ms response time

Next request goes to B.

Useful when servers have different hardware or some are degraded.

**Weighted Distribution**
Some servers are more powerful. Give them more traffic.

Servers:
- A: 2x CPUs, weight 2
- B: 4x CPUs, weight 4
- C: 2x CPUs, weight 2

Server B gets 50% of traffic. A and C split the remaining 50%.

**IP Hash**
Hash the client IP, always send to the same server. Provides stickiness without cookies.

```python
def select_server(client_ip, servers):
    hash_value = hash(client_ip)
    index = hash_value % len(servers)
    return servers[index]
```

User from IP 192.168.1.100 always hits the same server. Good for caching per-server state. Bad if one server is overloaded (doesn't redistribute).

### Sticky Sessions and Why They Matter

Some applications store session state in server memory. User logs in, session data lives on Server A. Next request must go to Server A or user appears logged out.

**Cookie-based stickiness**

```
Client requests login
  → Load balancer routes to Server A
  → Server A sets cookie: lb-server=A

Client makes next request with cookie: lb-server=A
  → Load balancer sees cookie, routes to Server A
```

Works until Server A crashes. User loses session.

**Better solution: Shared session storage**
Don't store sessions in application memory. Store in Redis or database.

```python
# Bad - in-memory sessions
sessions = {}

@app.route('/login')
def login():
    session_id = generate_id()
    sessions[session_id] = {'user_id': 123}
    return set_cookie('session_id', session_id)

# Good - shared session storage
@app.route('/login')
def login():
    session_id = generate_id()
    redis.set(f'session:{session_id}', {'user_id': 123}, ttl=3600)
    return set_cookie('session_id', session_id)
```

Now any server can handle any request. No sticky sessions needed. Server crashes don't lose sessions.

This is how stateless applications scale. GitHub, Netflix, Stripe all use shared session storage.

### Health Checks That Actually Work

Load balancers remove unhealthy servers from rotation. But "health check" needs to verify actual functionality, not just "is the server running."

**Bad health check:**

```python
@app.route('/health')
def health():
    return "OK", 200
```

This returns 200 even if:
- Database is down
- Cache is unreachable
- Disk is full
- Application logic is broken

**Better health check:**

```python
@app.route('/health')
def health():
    checks = {
        'database': check_database(),
        'cache': check_cache(),
        'disk': check_disk_space(),
    }

    if all(checks.values()):
        return {'status': 'healthy', 'checks': checks}, 200
    else:
        return {'status': 'unhealthy', 'checks': checks}, 503

def check_database():
    try:
        db.execute('SELECT 1')
        return True
    except:
        return False

def check_cache():
    try:
        redis.ping()
        return True
    except:
        return False

def check_disk_space():
    usage = shutil.disk_usage('/').percent
    return usage < 90
```

Load balancer calls `/health` every 10 seconds. Server returns 503 if dependencies are down. Load balancer removes it from rotation. Other servers handle traffic while this one recovers.

## Auto-Scaling Strategy

Manually adding servers when traffic spikes is too slow. Auto-scaling does it automatically.

### Horizontal vs Vertical Scaling

**Vertical (Scale Up)**
Add CPU/RAM to existing servers. 2-core server becomes 8-core server.

Advantages:
- Simple (no code changes)
- No distributed systems complexity
- Good for databases

Disadvantages:
- Expensive (bigger servers cost disproportionately more)
- Limited (can't infinitely scale one machine)
- Single point of failure

**Horizontal (Scale Out)**
Add more servers. 2 servers become 10 servers.

Advantages:
- Cost-effective (many small servers cheaper than one huge server)
- No limits (add servers until you run out of money)
- Redundancy (losing one server doesn't kill the system)

Disadvantages:
- Application must be stateless
- Coordination overhead
- More complex deployment

Web applications scale horizontally. Databases often scale vertically (until they can't, then you shard).

### Scaling Triggers

Auto-scaling needs to know when to add/remove servers.

**CPU-based:**
Add server when CPU > 70%. Remove server when CPU < 30%.

Simple but flawed. CPU might be high because one slow request is blocking. Adding more servers doesn't help.

**Request queue depth:**
Add server when queue depth > 100 requests. Remove server when queue depth < 10.

Better. Directly measures demand. Works for request-response systems.

**Custom metrics:**
Add server when [business metric] exceeds threshold.

Examples:
- Stream processing: Add server when lag > 10 seconds
- API: Add server when p95 latency > 500ms
- Background jobs: Add server when queue > 1000 jobs

These tie scaling to actual user impact.

### Predictive Scaling

Reactive scaling adds servers after load increases. Users already experienced slowness. Predictive scaling adds servers before load increases.

```python
# Historical pattern: traffic spikes at 9am weekdays
scaling_schedule = {
    'weekday_morning': {
        'time': '8:45',
        'action': 'scale_to',
        'instances': 20
    },
    'weekday_evening': {
        'time': '18:00',
        'action': 'scale_to',
        'instances': 5
    }
}
```

E-commerce sites scale up before Black Friday. News sites scale up before elections. SaaS apps scale up at 9am Monday when everyone logs in.

AWS Auto Scaling and GCP Autoscaler support scheduled scaling.

### Cost Optimization

Auto-scaling can get expensive. Strategies to control costs:

**Spot instances / Preemptible VMs**
Cloud providers sell excess capacity at 70-90% discount. They can reclaim it with 2 minutes notice.

Use for:
- Batch processing
- Background jobs
- Non-critical workloads

Don't use for:
- Databases
- Stateful services
- Anything where interruption causes data loss

**Reserved instances**
Commit to running servers for 1-3 years. Get 40-60% discount.

Use for baseline capacity. Your app always needs 5 servers minimum. Reserve those. Scale beyond 5 with on-demand.

**Right-sizing**
Most servers are overprovisioned. Monitor actual usage. If CPU averages 20%, use smaller instance types.

Tools: AWS Compute Optimizer, GCP Recommender, Datadog rightsizing.

**Scale-to-zero for dev environments**
Development and staging environments don't need to run 24/7. Scale them to zero after business hours.

```yaml
# Scale down at 7pm
0 19 * * * scale-to-zero dev-environment

# Scale up at 7am
0 7 * * * scale-up dev-environment
```

Saves 60% of dev environment costs (12 hours per day vs 24).

## Performance Monitoring and Profiling

You can't optimize what you don't measure. At scale, monitoring moves from "nice to have" to "critical infrastructure."

### Application Performance Monitoring (APM)

APM tools trace requests through your system:

1. Request hits load balancer (3ms)
2. Routed to application server (2ms)
3. Application queries database (45ms)
4. Application calls external API (120ms)
5. Application renders response (8ms)
6. Total: 178ms

You immediately see the bottleneck: external API call (120ms, 67% of request time).

Popular APM tools:
- **New Relic**: Full-featured, expensive
- **Datadog**: Strong infrastructure monitoring + APM
- **Elastic APM**: Open source, integrates with ELK stack
- **Honeycomb**: Modern, excellent for microservices
- **Sentry**: Primarily error tracking, has basic performance monitoring

### Flame Graphs for Profiling

Flame graphs visualize where CPU time is spent. Each horizontal bar is a function. Width is how much time it used.

```
main()                          [=====================================] 100%
  ├─ handle_request()           [============================] 70%
  │   ├─ fetch_user()           [=======] 20%
  │   │   └─ database_query()   [======] 18%
  │   └─ render_template()      [===================] 50%
  │       ├─ load_template()    [=====] 12%
  │       └─ render()           [=============] 38%
  └─ send_response()            [========] 30%
```

You instantly see `render()` takes 38% of CPU time. Optimize that first.

Generate flame graphs with profilers:
- Python: py-spy
- Node.js: 0x, clinic.js
- Ruby: stackprof
- Go: pprof
- Java: async-profiler

### Detecting N+1 Queries

APM tools track database queries per request. Bullet (Ruby), Django Debug Toolbar (Python), and similar tools alert on N+1 queries.

Example alert:
```
⚠️ N+1 Query Detected
GET /posts
  SELECT * FROM posts LIMIT 10          [1 query]
  SELECT * FROM users WHERE id = ?      [10 queries]

Suggestion: Use eager loading
  posts = Post.includes(:author).limit(10)
```

These alerts appear in development before they hit production.

### Real User Monitoring (RUM)

Server-side monitoring shows backend performance. RUM shows what users actually experience.

```javascript
// Measure page load performance
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];

  const metrics = {
    dns: perfData.domainLookupEnd - perfData.domainLookupStart,
    tcp: perfData.connectEnd - perfData.connectStart,
    ttfb: perfData.responseStart - perfData.requestStart,
    download: perfData.responseEnd - perfData.responseStart,
    domProcessing: perfData.domComplete - perfData.domLoading,
    total: perfData.loadEventEnd - perfData.fetchStart
  };

  // Send to analytics
  sendMetrics(metrics);
});
```

This captures real-world performance including:
- Network latency (varies by geography)
- Client device performance (desktop vs mobile)
- Browser differences
- Third-party scripts slowing pages

You discover things server metrics miss: "Our app is fast in the US but slow in India because our CDN has no edge servers in Asia."

### Core Web Vitals

Google's performance metrics that affect SEO:

**Largest Contentful Paint (LCP)**: How long until main content is visible
- Good: < 2.5s
- Poor: > 4s

**First Input Delay (FID)**: How long until page responds to interaction
- Good: < 100ms
- Poor: > 300ms

**Cumulative Layout Shift (CLS)**: How much content jumps around while loading
- Good: < 0.1
- Poor: > 0.25

Measure with:

```javascript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'LCP') {
      console.log('LCP:', entry.startTime);
    }
  }
}).observe({entryTypes: ['largest-contentful-paint']});
```

Tools: Google PageSpeed Insights, Lighthouse, Chrome DevTools.

## Case Studies: Scaling Real Systems

### Discord: Handling 5 Million Concurrent Users

Problem: Message indexes growing too large. Billions of messages per channel. Queries slowing down.

**Original Architecture:**
MongoDB with messages in single collection per channel. Indexes on message_id. As channels aged, indexes grew to gigabytes.

**Solution:**
Moved to Cassandra partitioned by time buckets. Messages from 2024-11-01 to 2024-11-07 in one partition. Queries always include time range.

```sql
-- Old query (slow on large channels)
SELECT * FROM messages WHERE channel_id = ? ORDER BY id DESC LIMIT 50

-- New query (fast - hits one partition)
SELECT * FROM messages
WHERE channel_id = ?
  AND bucket = '2024-11-01'
  AND timestamp > ?
LIMIT 50
```

Result: Queries went from 2 seconds to 30ms. System now handles 850 million messages per day.

Key insight: Time-series data naturally partitions by time. Stop fighting it.

### Stripe: Processing Billions of API Requests

Problem: Payment processing can't have downtime. Every request must succeed or fail gracefully.

**Architecture:**
- Idempotency keys on all write operations
- Multi-region active-active deployment
- Request retries with exponential backoff
- Circuit breakers on external dependencies

**Idempotency:**

```python
@app.route('/v1/charges', methods=['POST'])
def create_charge(amount, idempotency_key):
    # Check if we've processed this request before
    existing = db.query(
        "SELECT * FROM charges WHERE idempotency_key = ?",
        idempotency_key
    )
    if existing:
        # Return the previous result
        return existing

    # Process the charge
    charge = process_payment(amount)

    # Store with idempotency key
    db.insert("charges", {
        'id': charge.id,
        'amount': amount,
        'idempotency_key': idempotency_key
    })

    return charge
```

Client retries on network failure. Server returns same result. No duplicate charges.

Result: 99.999% uptime processing $640 billion annually.

Key insight: Make operations idempotent. Everything becomes retry-safe.

### Netflix: Streaming to 200 Million Subscribers

Problem: Serving video globally with minimal buffering.

**Architecture:**
- Open Connect CDN with servers in ISP data centers
- Pre-positioned content based on viewing predictions
- Adaptive bitrate streaming
- Chaos engineering (deliberately break things to test resilience)

**Content Pre-positioning:**
Netflix predicts what users will watch based on viewing history. They push popular content to edge servers during off-peak hours.

When you hit play on "Stranger Things," it streams from a server physically located at your ISP. Not from AWS. From a box in your city.

**Chaos Engineering:**
They randomly kill servers in production. Services must gracefully degrade. This is the origin of Chaos Monkey.

Result: 99.99% availability streaming petabytes daily.

Key insight: For latency-sensitive workloads, physics matters more than clever code. Get data closer to users.

### Shopify: Black Friday Flash Sales

Problem: 10,000 requests per second baseline. 75,000 requests per second during flash sales.

**Architecture:**
- Read replicas for database (20+ replicas during flash sales)
- Redis cache with 99% hit rate
- Job queues for order processing
- Rate limiting to prevent store overload

**Adaptive Scaling:**

```ruby
# Scale based on queue depth and error rate
def scale_decision
  queue_depth = redis.llen('order_queue')
  error_rate = statsd.get('http.errors.rate')

  if queue_depth > 5000 || error_rate > 0.05
    scale_up
  elsif queue_depth < 500 && error_rate < 0.01
    scale_down
  end
end
```

Result: Processed $2.9 billion on Black Friday 2023 without downtime.

Key insight: Plan for 10x your normal traffic. Then test at 20x.

## When to Actually Use These Techniques

Most of this content is overkill for most apps. Guidelines:

**Use CDN + basic caching:**
From day one. It's free or cheap and simple to implement.

**Use read replicas:**
When database CPU consistently > 60% from read queries.

**Use connection pooling:**
From day one if using traditional databases. It's standard practice.

**Use CQRS:**
When read and write patterns are fundamentally different and causing contention. Probably never.

**Use multi-layer caching:**
When your application cache hit rate is high (>80%) but you want to reduce origin load further.

**Use auto-scaling:**
When traffic patterns are predictable (time-of-day) or spiky (events, sales).

**Use async processing:**
When operations take >2 seconds or use significant resources.

**Use edge computing:**
When you have global users and latency is a competitive advantage.

The pattern: start simple, measure, add complexity only when needed.

Discord didn't start with Cassandra. They started with MongoDB. When it stopped scaling, they migrated. Stripe didn't start with multi-region deployment. They started with a single region and added regions as they grew globally.

Build for today's scale. Plan for tomorrow's. Don't build for a future that might not come.

## Trade-offs at Every Layer

Every optimization has costs. Here's what you're signing up for:

| Optimization Technique | Costs & Drawbacks | When It's Worth It |
|------------------------|-------------------|-------------------|
| **Caching** | Added complexity, stale data risks, cache invalidation bugs | Database-bound workloads where reads far outnumber writes |
| **Read replicas** | Eventual consistency issues, replication lag, operational overhead | Primary database is CPU-bound from read queries |
| **Auto-scaling** | Can get expensive if tuned poorly, adds complexity, slower than over-provisioning | Traffic patterns are unpredictable or highly variable |
| **Edge computing** | Harder to debug, limited runtime environment, cold start latency | Global user base with low-latency requirements |
| **Async processing** | Increased complexity, eventual consistency model, harder to debug failures | Operations take >200ms or involve external services |

The unifying theme: complexity is a cost. Only pay it when the benefit exceeds the cost.

A 200ms response time that's simple to maintain beats a 100ms response time that requires five engineers to understand.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[← Mid-Depth](../mid-depth/index.md)** Practical patterns and implementation

### Related Topics
- [Architecture Design](../../architecture-design/deep-water/index.md) - Related design considerations
- [Database Design](../../database-design/deep-water/index.md) - Related design considerations
- [Error Handling & Resilience](../../error-handling-resilience/deep-water/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
