---
title: "Performance & Scalability Design - Mid-Depth"
phase: "02-design"
topic: "performance-scalability-design"
depth: "mid-depth"
reading_time: 25
prerequisites: ["performance-scalability-design-surface", "database-design-surface"]
related_topics: ["database-design", "api-design", "architecture-design"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-15"
---

# Performance & Scalability Design - Mid-Depth

You've shipped something that works. Users are happy. Then the dashboard shows response times climbing from 200ms to 3 seconds during peak hours. Your manager asks if the system can handle 10x the traffic. You need answers that involve more than "throw more servers at it."

This guide covers the specific techniques that matter: query optimization that actually works, caching layers that don't introduce more problems than they solve, and scaling strategies with real cost implications.

## 1. Database Query Optimization

Most performance problems live in the database. A single unoptimized query can make your entire application feel slow.

### Understanding EXPLAIN Plans

Your database query planner shows you exactly what it's doing. You need to read these plans like a map.

**PostgreSQL Example:**

```sql
EXPLAIN ANALYZE
SELECT u.username, p.title, p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.published = true
ORDER BY p.created_at DESC
LIMIT 20;
```

**Bad Plan (Sequential Scan):**
```
Limit (cost=15234.56..15234.61 rows=20 width=72) (actual time=2847.234..2847.240 rows=20)
  -> Sort (cost=15234.56..15484.56 rows=100000 width=72) (actual time=2847.232..2847.235 rows=20)
        Sort Key: p.created_at DESC
        Sort Method: top-N heapsort  Memory: 27kB
        -> Hash Join (cost=3456.00..12789.00 rows=100000 width=72) (actual time=45.234..2734.567 rows=98543)
              -> Seq Scan on posts p (cost=0.00..4567.00 rows=100000 width=45) (actual time=0.012..1234.567 rows=98543)
                    Filter: (published = true)
              -> Hash (cost=2345.00..2345.00 rows=50000 width=27) (actual time=34.123..34.123 rows=50000)
                    -> Seq Scan on users u (cost=0.00..2345.00 rows=50000 width=27)
```

That `Seq Scan on posts` means it's reading every row in the table. 2.8 seconds for 20 posts is unacceptable.

**Good Plan (Index Scan):**
```
Limit (cost=0.56..45.23 rows=20 width=72) (actual time=0.234..0.456 rows=20)
  -> Nested Loop (cost=0.56..223456.78 rows=100000 width=72) (actual time=0.232..0.452 rows=20)
        -> Index Scan Backward using posts_published_created_idx on posts p (cost=0.42..123456.78 rows=100000) (actual time=0.123..0.234 rows=20)
              Filter: (published = true)
        -> Index Scan using users_pkey on users u (cost=0.14..0.98 rows=1 width=27) (actual time=0.008..0.009 rows=1)
              Index Cond: (id = p.user_id)
```

Same query, 0.5ms instead of 2847ms. That's a 5,694x improvement from one index.

### Index Design That Works

Indexes aren't free. They slow down writes and consume storage. You need to be strategic.

**The Index:**
```sql
CREATE INDEX posts_published_created_idx
ON posts (published, created_at DESC)
WHERE published = true;
```

This partial index has three optimizations:
1. **Composite index** on both filter column (`published`) and sort column (`created_at`)
2. **DESC ordering** matches the query's `ORDER BY`
3. **Partial index** (`WHERE published = true`) only indexes published posts, reducing size by 40% if you have drafts

**Index Size Reality Check:**

For a posts table with 10 million rows:
- Full table: 5.2 GB
- Standard index on `created_at`: 214 MB
- Partial composite index: 128 MB (40% of posts are drafts)

Your write performance changes:
- Without index: 1,200 inserts/sec
- With full index: 980 inserts/sec (18% slower)
- With partial index: 1,050 inserts/sec (12% slower)

The partial index gives you 94% of the read performance benefit at 66% of the write cost.

### Query Patterns That Kill Performance

**N+1 Queries:**

```python
# Bad: 1 query + N queries (1 + 100 = 101 queries)
posts = Post.objects.all()[:100]
for post in posts:
    print(post.author.username)  # Each iteration hits the database
```

**Fixed with Eager Loading:**

```python
# Good: 2 queries total
posts = Post.objects.select_related('author').all()[:100]
for post in posts:
    print(post.author.username)  # Data already loaded
```

Response time drops from 850ms to 45ms for 100 posts.

**Counting Large Tables:**

```sql
-- Bad: Full table scan, takes 3.2 seconds on 10M rows
SELECT COUNT(*) FROM posts WHERE published = true;

-- Better: Use approximate count for dashboards
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'posts';
-- Returns in 0.8ms, accurate within 2-3%
```

For admin dashboards showing "~10 million posts", approximate counts are fine. For financial reconciliation, you need exact counts and you'll wait for them.

### Database-Specific Optimizations

**PostgreSQL - Materialized Views:**

```sql
CREATE MATERIALIZED VIEW popular_posts_weekly AS
SELECT
    p.id,
    p.title,
    COUNT(l.id) as like_count,
    COUNT(c.id) as comment_count
FROM posts p
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.title
ORDER BY like_count DESC, comment_count DESC
LIMIT 100;

CREATE UNIQUE INDEX ON popular_posts_weekly (id);

-- Refresh every hour via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY popular_posts_weekly;
```

Complex aggregation that took 4.5 seconds now returns in 12ms. The refresh takes 8 seconds but happens in the background.

**MySQL - Query Cache (Deprecated in 8.0, but the concept matters):**

MySQL removed query cache because application-level caching with Redis is more effective. The lesson: cache at the right layer.

## 2. Horizontal vs Vertical Scaling

You can make servers bigger or add more servers. Each choice has different cost curves and complexity.

### Vertical Scaling (Scaling Up)

Make your existing servers more powerful.

**Cost Example (AWS EC2, us-east-1, 2024 pricing):**

| Instance Type | vCPUs | RAM | Network | Cost/month | Requests/sec |
|--------------|-------|-----|---------|------------|--------------|
| t3.medium | 2 | 4 GB | Up to 5 Gbps | $30 | 250 |
| t3.xlarge | 4 | 16 GB | Up to 5 Gbps | $121 | 520 |
| c6i.2xlarge | 8 | 16 GB | Up to 12.5 Gbps | $248 | 1,100 |
| c6i.8xlarge | 32 | 64 GB | 12.5 Gbps | $992 | 3,200 |

Going from 250 to 3,200 req/sec cost you $962/month more. That's simple - one database, no distributed systems complexity.

**When Vertical Scaling Works:**
- Databases (PostgreSQL, MySQL perform better with more RAM for caching)
- In-memory workloads (Redis, Memcached)
- Single-threaded bottlenecks
- Teams without distributed systems expertise
- Getting to market quickly

**The Ceiling:**

The biggest AWS instance (u-24tb1.metal) has 448 vCPUs and 24 TB of RAM. Costs $218,400/month. Most of us hit budget or architectural limits long before that.

### Horizontal Scaling (Scaling Out)

Add more servers running the same code.

**Cost Example (Same Application):**

| Configuration | Instances | Type | Total Cost/month | Requests/sec | Cost per 1000 req/sec |
|--------------|-----------|------|------------------|--------------|---------------------|
| 1x Large | 1 | c6i.2xlarge | $248 | 1,100 | $225 |
| 4x Small | 4 | t3.xlarge | $484 | 2,080 | $233 |
| 8x Smaller | 8 | t3.large | $484 | 2,400 | $202 |

The 8x setup handles more traffic and survives individual instance failures. But now you need:
- Load balancer ($16/month + $0.008/GB)
- Session management (Redis cluster, $120/month)
- Deployment orchestration (ECS, Kubernetes, etc.)
- Monitoring across instances

The infrastructure complexity costs development time.

**When Horizontal Scaling Works:**
- Stateless applications (APIs, web servers)
- Embarrassingly parallel workloads (image processing, video encoding)
- Need for high availability
- Traffic patterns with big spikes
- Beyond the largest vertical instance

### The Hybrid Reality

Most systems use both:

```
                    Load Balancer
                         |
        +----------------+----------------+
        |                                 |
    App Server 1                     App Server 2
    (c6i.xlarge)                    (c6i.xlarge)
        |                                 |
        +----------------+----------------+
                         |
                  Database Server
                  (r6i.4xlarge - 128 GB RAM)
                         |
                  Read Replicas (2x)
                  (r6i.2xlarge each)
```

App servers scale horizontally (easy, stateless). Database scales vertically (harder to shard). Read replicas add horizontal capacity for read-heavy workloads.

## 3. Load Balancing Patterns

Once you have multiple servers, you need to distribute requests intelligently.

### Round-Robin

Simplest algorithm: requests rotate through servers in order.

```nginx
upstream backend {
    server app1.internal:8000;
    server app2.internal:8000;
    server app3.internal:8000;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

**Request Distribution:**
```
Request 1 -> app1
Request 2 -> app2
Request 3 -> app3
Request 4 -> app1
Request 5 -> app2
```

Works when:
- All servers have equal capacity
- All requests take similar time
- No session state

Breaks when:
- Server 2 is handling a 30-second report export while getting the next quick request
- Different instance types in your pool

### Least Connections

Send new requests to the server with fewest active connections.

```nginx
upstream backend {
    least_conn;
    server app1.internal:8000;
    server app2.internal:8000;
    server app3.internal:8000;
}
```

**Smart Distribution:**
```
Active Connections: app1=5, app2=12, app3=7
New request -> app1 (fewest connections)

Active Connections: app1=6, app2=12, app3=7
New request -> app1 again

Active Connections: app1=7, app2=12, app3=7
New request -> app1 or app3 (tied)
```

Better for:
- Mixed request duration (some fast, some slow)
- Long-lived connections (WebSockets, streaming)
- Heterogeneous server capacity

### Sticky Sessions (Session Affinity)

Route users to the same server for session continuity.

```nginx
upstream backend {
    ip_hash;  # Same source IP -> same server
    server app1.internal:8000;
    server app2.internal:8000;
    server app3.internal:8000;
}
```

Or with cookies:

```nginx
upstream backend {
    server app1.internal:8000;
    server app2.internal:8000;
    server app3.internal:8000;
}

server {
    location / {
        proxy_pass http://backend;
        sticky cookie srv_id expires=1h domain=.example.com path=/;
    }
}
```

**The Trade-off:**

Sticky sessions let you keep state in server memory (user sessions, shopping carts). But:
- Uneven load distribution (power users stick to one server)
- Server failures lose sessions
- Can't easily remove servers from pool
- Harder to auto-scale

Better approach: store sessions in Redis or database, keep app servers stateless.

### Health Checks

Load balancers need to know when servers are unhealthy.

```nginx
upstream backend {
    server app1.internal:8000 max_fails=3 fail_timeout=30s;
    server app2.internal:8000 max_fails=3 fail_timeout=30s;
    server app3.internal:8000 max_fails=3 fail_timeout=30s;
}
```

**AWS Application Load Balancer:**

```yaml
HealthCheck:
  Path: /health
  Protocol: HTTP
  Port: 8000
  HealthyThresholdCount: 2
  UnhealthyThresholdCount: 3
  TimeoutSeconds: 5
  IntervalSeconds: 30
```

Your `/health` endpoint should check:
- Database connectivity (can connect and query)
- Critical dependencies (Redis, external APIs)
- Disk space
- Memory availability

```python
@app.route('/health')
def health_check():
    checks = {
        'database': check_database(),
        'redis': check_redis(),
        'disk_space': check_disk_space()
    }

    if all(checks.values()):
        return jsonify({'status': 'healthy', 'checks': checks}), 200
    else:
        return jsonify({'status': 'unhealthy', 'checks': checks}), 503
```

Return 503 when unhealthy so the load balancer removes the instance from rotation.

## 4. Multi-Tier Caching

Caching at the right layer can reduce database load by 95%. Caching at the wrong layer creates stale data nightmares.

### Browser Cache (HTTP Headers)

Let browsers cache static assets for long periods.

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Impact:**
- First visit: Downloads 2.3 MB of assets
- Return visit: Downloads 0 bytes (304 Not Modified for changed files)
- Page load: 3.2s -> 0.8s

**Versioning Strategy:**

```html
<!-- Bad: Browser caches script.js, never gets updates -->
<script src="/static/script.js"></script>

<!-- Good: Hash in filename forces new download when code changes -->
<script src="/static/script.abc123.js"></script>
```

Most build tools (Webpack, Vite, Parcel) do this automatically.

### CDN Cache (CloudFront, Cloudflare)

Serve static content from edge locations near users.

**Performance Impact (Real Example):**

API endpoint returning user profile JSON:
- Direct to origin (us-east-1): 340ms from Sydney, Australia
- Via CloudFront: 12ms from Sydney (served from ap-southeast-2 edge)

**Cost Impact (AWS CloudFront):**

| Scenario | Monthly Requests | Direct S3 Cost | CloudFront Cost | Savings |
|----------|------------------|----------------|-----------------|---------|
| Blog | 10M requests | $400 (data transfer) | $120 (CDN) | $280 |
| Global API | 100M requests | $4,200 | $850 | $3,350 |

**Cache Configuration:**

```javascript
// CloudFront Cache Behavior
{
  "PathPattern": "/api/*",
  "TargetOriginId": "api-origin",
  "CachePolicyId": "custom-api-cache",
  "MinTTL": 0,
  "DefaultTTL": 300,      // 5 minutes
  "MaxTTL": 3600,         // 1 hour
  "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
  "CachedMethods": ["GET", "HEAD"],
  "ForwardQueryStrings": true,
  "ForwardCookies": "none"
}
```

**Cache Headers from Origin:**

```python
@app.route('/api/public/posts')
def public_posts():
    posts = get_recent_posts()
    response = jsonify(posts)
    response.headers['Cache-Control'] = 'public, max-age=300, s-maxage=600'
    # Browsers cache 5 min, CDN caches 10 min
    return response

@app.route('/api/user/profile')
def user_profile():
    profile = get_user_profile(current_user.id)
    response = jsonify(profile)
    response.headers['Cache-Control'] = 'private, max-age=60'
    # Only user's browser caches, not CDN (private data)
    return response
```

### Application Cache (Redis/Memcached)

Cache database queries and computed results in-memory.

**Redis Setup:**

```python
import redis
from functools import wraps
import json
import hashlib

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_result(ttl=300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key_data = f"{func.__name__}:{args}:{kwargs}"
            cache_key = hashlib.md5(cache_key_data.encode()).hexdigest()

            # Try to get from cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # Cache miss - compute result
            result = func(*args, **kwargs)

            # Store in cache
            redis_client.setex(
                cache_key,
                ttl,
                json.dumps(result)
            )

            return result
        return wrapper
    return decorator

@cache_result(ttl=600)  # Cache for 10 minutes
def get_trending_posts():
    # Complex query with joins and aggregations
    # Takes 2.3 seconds uncached
    return db.session.query(
        Post.id,
        Post.title,
        func.count(Like.id).label('like_count')
    ).join(Like).filter(
        Post.created_at > datetime.now() - timedelta(days=1)
    ).group_by(Post.id).order_by(
        desc('like_count')
    ).limit(20).all()
```

**Performance:**
- First call: 2,300ms (database query)
- Subsequent calls: 3ms (Redis lookup)
- Cache hit rate: 94% during peak hours

**Memory Usage:**

Redis with 1 million cached keys:
- Average value size: 2 KB
- Total memory: 2 GB
- AWS ElastiCache (cache.r6g.large): 13.07 GB RAM, $113/month
- Alternative: cache.t4g.medium: 3.09 GB RAM, $37/month (sufficient with TTL and LRU eviction)

### Database Query Cache

Some databases cache query results internally.

**PostgreSQL Shared Buffers:**

```
# postgresql.conf
shared_buffers = 8GB          # 25% of system RAM
effective_cache_size = 24GB   # 75% of system RAM
```

Frequently accessed rows stay in memory. But this is transparent - you can't control what gets cached.

**Application-Level Database Cache:**

```python
@cache_result(ttl=300)
def get_user_by_id(user_id):
    return db.session.query(User).filter(User.id == user_id).first()
```

Cache user objects to avoid repeated queries.

### Cache Invalidation

Phil Karlton said there are two hard problems in computer science: cache invalidation and naming things. He was right.

**Time-Based Invalidation (TTL):**

Simple but imprecise. Data can be stale for up to TTL duration.

```python
redis_client.setex('user:123', 600, json.dumps(user_data))  # Expires in 10 minutes
```

**Event-Based Invalidation:**

Invalidate cache when data changes.

```python
def update_user(user_id, **kwargs):
    # Update database
    user = db.session.query(User).filter(User.id == user_id).first()
    for key, value in kwargs.items():
        setattr(user, key, value)
    db.session.commit()

    # Invalidate cache
    cache_key = f"user:{user_id}"
    redis_client.delete(cache_key)

    return user
```

**Cache Stampede Prevention:**

When a popular cache key expires, hundreds of requests try to regenerate it simultaneously.

```python
import time

def get_with_lock(key, generator_func, ttl=300):
    # Try to get from cache
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)

    # Try to acquire lock
    lock_key = f"lock:{key}"
    lock_acquired = redis_client.set(lock_key, "1", nx=True, ex=10)

    if lock_acquired:
        # We got the lock - regenerate cache
        result = generator_func()
        redis_client.setex(key, ttl, json.dumps(result))
        redis_client.delete(lock_key)
        return result
    else:
        # Someone else is regenerating - wait and retry
        time.sleep(0.1)
        return get_with_lock(key, generator_func, ttl)
```

## 5. Rate Limiting and Quotas

Prevent abuse and ensure fair resource allocation.

### Fixed Window Rate Limiting

Simple but has edge case issues.

```python
import time

def rate_limit_fixed_window(user_id, max_requests=100, window_seconds=60):
    current_window = int(time.time() / window_seconds)
    key = f"rate_limit:{user_id}:{current_window}"

    current_count = redis_client.get(key)
    if current_count and int(current_count) >= max_requests:
        return False  # Rate limit exceeded

    redis_client.incr(key)
    redis_client.expire(key, window_seconds * 2)  # Keep for 2 windows
    return True
```

**The Problem:**

```
Window 1 (0-60s):   [.... 100 requests at t=59s]
Window 2 (60-120s): [100 requests at t=61s ....]
                    ^
                    200 requests in 2 seconds (burst)
```

### Sliding Window Rate Limiting

More accurate, prevents burst exploitation.

```python
def rate_limit_sliding_window(user_id, max_requests=100, window_seconds=60):
    key = f"rate_limit:{user_id}"
    now = time.time()
    window_start = now - window_seconds

    # Remove old entries
    redis_client.zremrangebyscore(key, 0, window_start)

    # Count requests in current window
    current_count = redis_client.zcard(key)
    if current_count >= max_requests:
        return False

    # Add current request
    redis_client.zadd(key, {str(now): now})
    redis_client.expire(key, window_seconds)

    return True
```

Uses Redis sorted sets to track exact request timestamps.

### Token Bucket (More Flexible)

Allows bursts while maintaining average rate.

```python
def rate_limit_token_bucket(user_id, capacity=100, refill_rate=10):
    """
    capacity: Max tokens in bucket
    refill_rate: Tokens added per second
    """
    key = f"token_bucket:{user_id}"
    now = time.time()

    # Get current state
    bucket_data = redis_client.get(key)
    if bucket_data:
        bucket = json.loads(bucket_data)
        tokens = bucket['tokens']
        last_refill = bucket['last_refill']

        # Refill tokens based on time elapsed
        elapsed = now - last_refill
        tokens = min(capacity, tokens + (elapsed * refill_rate))
    else:
        tokens = capacity
        last_refill = now

    # Try to consume a token
    if tokens < 1:
        return False

    tokens -= 1

    # Save state
    redis_client.setex(
        key,
        3600,
        json.dumps({
            'tokens': tokens,
            'last_refill': now
        })
    )

    return True
```

**Behavior:**
- User can burst up to 100 requests immediately
- Then limited to 10 requests/second average
- Tokens replenish continuously
- Better UX than hard limits

### Rate Limit Headers

Tell clients about their limits.

```python
from flask import request, jsonify

@app.before_request
def check_rate_limit():
    user_id = get_current_user_id()

    allowed = rate_limit_sliding_window(user_id, max_requests=1000, window_seconds=3600)

    # Calculate remaining quota
    key = f"rate_limit:{user_id}"
    current_count = redis_client.zcard(key)
    remaining = max(0, 1000 - current_count)

    # Add headers
    response.headers['X-RateLimit-Limit'] = '1000'
    response.headers['X-RateLimit-Remaining'] = str(remaining)
    response.headers['X-RateLimit-Reset'] = str(int(time.time()) + 3600)

    if not allowed:
        return jsonify({'error': 'Rate limit exceeded'}), 429
```

Clients can see their quota and back off gracefully.

### Tiered Rate Limits

Different limits for different user types.

```python
RATE_LIMITS = {
    'free': {'requests': 100, 'window': 3600},
    'basic': {'requests': 1000, 'window': 3600},
    'premium': {'requests': 10000, 'window': 3600},
    'enterprise': {'requests': 100000, 'window': 3600}
}

def get_rate_limit(user):
    tier = user.subscription_tier
    limits = RATE_LIMITS.get(tier, RATE_LIMITS['free'])
    return rate_limit_sliding_window(
        user.id,
        max_requests=limits['requests'],
        window_seconds=limits['window']
    )
```

## 6. Pagination Strategies

Returning all results at once breaks at scale.

### Offset-Based Pagination

Simple and familiar, but has problems at scale.

```python
@app.route('/api/posts')
def get_posts():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    offset = (page - 1) * per_page

    posts = db.session.query(Post)\
        .order_by(Post.created_at.desc())\
        .limit(per_page)\
        .offset(offset)\
        .all()

    total = db.session.query(func.count(Post.id)).scalar()

    return jsonify({
        'posts': [p.to_dict() for p in posts],
        'page': page,
        'per_page': per_page,
        'total': total,
        'pages': (total + per_page - 1) // per_page
    })
```

**The Problems:**

1. **Performance degrades with page number:**
   - Page 1 (OFFSET 0): 12ms
   - Page 100 (OFFSET 2000): 45ms
   - Page 10000 (OFFSET 200000): 3,200ms

   The database has to scan and skip 200,000 rows.

2. **Inconsistent results during writes:**
   - User on page 5
   - New post inserted
   - User clicks page 6
   - Sees the last item from page 5 again (shifted by insert)

3. **Total count is expensive:**
   ```sql
   SELECT COUNT(*) FROM posts;  -- Full table scan
   ```

### Cursor-Based Pagination (Keyset Pagination)

More complex but scales better.

```python
@app.route('/api/posts')
def get_posts_cursor():
    cursor = request.args.get('cursor')  # e.g., "2024-01-15T10:30:00Z_12345"
    per_page = int(request.args.get('per_page', 20))

    query = db.session.query(Post).order_by(
        Post.created_at.desc(),
        Post.id.desc()  # Tie-breaker for same timestamp
    )

    if cursor:
        # Decode cursor
        timestamp_str, last_id = cursor.split('_')
        cursor_time = datetime.fromisoformat(timestamp_str)

        # Continue from cursor
        query = query.filter(
            or_(
                Post.created_at < cursor_time,
                and_(
                    Post.created_at == cursor_time,
                    Post.id < int(last_id)
                )
            )
        )

    posts = query.limit(per_page + 1).all()

    # Check if there's a next page
    has_next = len(posts) > per_page
    if has_next:
        posts = posts[:per_page]

    # Generate next cursor
    next_cursor = None
    if has_next and posts:
        last_post = posts[-1]
        next_cursor = f"{last_post.created_at.isoformat()}_{last_post.id}"

    return jsonify({
        'posts': [p.to_dict() for p in posts],
        'next_cursor': next_cursor,
        'has_next': has_next
    })
```

**Required Index:**

```sql
CREATE INDEX posts_created_id_idx ON posts (created_at DESC, id DESC);
```

**Performance:**
- Page 1: 8ms
- Page 100: 9ms
- Page 10000: 11ms

Consistent performance regardless of depth.

**Trade-offs:**
- Can't jump to arbitrary pages (no "page 47" button)
- Can't show total page count
- Good for infinite scroll, API pagination
- Bad for traditional page numbers in UI

### Hybrid Approach

Offset for shallow pages, cursor for deep pagination.

```python
def get_posts_hybrid():
    page = request.args.get('page')
    cursor = request.args.get('cursor')

    if page and int(page) <= 10:
        # Shallow pagination: use offset (better UX)
        return get_posts_offset()
    else:
        # Deep pagination: use cursor (better performance)
        return get_posts_cursor()
```

## 7. Background Job Processing

Long-running tasks don't belong in HTTP requests.

### When to Use Background Jobs

HTTP requests should complete in under 1 second. If your task takes longer, move it to a background job.

**Examples:**
- Sending emails (external API call, 200-500ms each)
- Image processing (resize, optimize, 1-5 seconds)
- Report generation (complex queries, 10-60 seconds)
- Video encoding (minutes to hours)
- Data imports/exports
- Third-party API calls

### Celery (Python)

Distributed task queue backed by Redis or RabbitMQ.

```python
# celery_app.py
from celery import Celery

app = Celery(
    'tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1'
)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# tasks.py
from celery_app import app
import time

@app.task(bind=True, max_retries=3)
def send_welcome_email(self, user_id):
    try:
        user = User.query.get(user_id)
        email_service.send(
            to=user.email,
            subject='Welcome!',
            template='welcome',
            data={'username': user.username}
        )
    except EmailServiceError as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@app.task
def process_image(image_id):
    image = Image.query.get(image_id)

    # Generate thumbnails
    thumbnail = resize_image(image.path, width=200)
    save_thumbnail(thumbnail, f"{image.id}_thumb.jpg")

    # Optimize original
    optimized = optimize_image(image.path)
    save_optimized(optimized, image.path)

    # Update database
    image.processed = True
    db.session.commit()

# routes.py
@app.route('/api/register', methods=['POST'])
def register():
    user = create_user(request.json)

    # Queue email (returns immediately)
    send_welcome_email.delay(user.id)

    return jsonify({'user_id': user.id}), 201

@app.route('/api/images', methods=['POST'])
def upload_image():
    file = request.files['image']
    image = save_image(file)

    # Queue processing
    process_image.delay(image.id)

    return jsonify({
        'image_id': image.id,
        'status': 'processing'
    }), 202  # Accepted
```

**Running Workers:**

```bash
# Start worker with 4 concurrent processes
celery -A celery_app worker --loglevel=info --concurrency=4

# Or with gevent for I/O-bound tasks (1000 concurrent)
celery -A celery_app worker --pool=gevent --concurrency=1000
```

**Monitoring:**

```bash
# Flower web UI
celery -A celery_app flower

# Shows:
# - Active tasks
# - Worker health
# - Task history
# - Retry attempts
# - Processing time
```

### Sidekiq (Ruby)

Similar to Celery, backed by Redis.

```ruby
# app/workers/email_worker.rb
class EmailWorker
  include Sidekiq::Worker
  sidekiq_options retry: 3, queue: 'default'

  def perform(user_id)
    user = User.find(user_id)
    UserMailer.welcome_email(user).deliver_now
  end
end

# app/controllers/users_controller.rb
def create
  @user = User.new(user_params)
  if @user.save
    EmailWorker.perform_async(@user.id)
    render json: { user_id: @user.id }, status: :created
  end
end
```

### Bull (Node.js)

Redis-backed queues for Node.

```javascript
// queues/email.js
const Queue = require('bull');
const emailQueue = new Queue('email', 'redis://localhost:6379');

emailQueue.process(async (job) => {
  const { userId } = job.data;
  const user = await User.findById(userId);

  await emailService.send({
    to: user.email,
    subject: 'Welcome!',
    template: 'welcome',
    data: { username: user.username }
  });
});

// routes/users.js
router.post('/register', async (req, res) => {
  const user = await User.create(req.body);

  await emailQueue.add({ userId: user.id }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000  // Start with 1 minute
    }
  });

  res.status(201).json({ userId: user.id });
});
```

### Job Patterns

**Retry Logic:**

```python
@app.task(bind=True, max_retries=5, default_retry_delay=300)
def fetch_external_data(self, url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except (RequestException, Timeout) as exc:
        # Retry with exponential backoff
        raise self.retry(
            exc=exc,
            countdown=300 * (2 ** self.request.retries),
            max_retries=5
        )
```

**Scheduled Tasks (Cron):**

```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    'cleanup-old-sessions': {
        'task': 'tasks.cleanup_sessions',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
    'send-daily-digest': {
        'task': 'tasks.send_digest_emails',
        'schedule': crontab(hour=8, minute=0),  # 8 AM daily
    },
    'update-analytics': {
        'task': 'tasks.update_analytics',
        'schedule': 300.0,  # Every 5 minutes
    },
}
```

Run scheduler:
```bash
celery -A celery_app beat
```

**Job Chaining:**

```python
from celery import chain

# Process image, then send notification
workflow = chain(
    process_image.s(image_id),
    generate_thumbnails.s(),
    notify_user.s(user_id)
)
workflow.apply_async()
```

## 8. Auto-Scaling Configuration

Automatically add/remove capacity based on demand.

### Metrics-Based Auto-Scaling

**AWS Auto Scaling Group:**

```yaml
AutoScalingGroup:
  MinSize: 2
  MaxSize: 10
  DesiredCapacity: 2
  HealthCheckType: ELB
  HealthCheckGracePeriod: 300

ScaleUpPolicy:
  PolicyType: TargetTrackingScaling
  TargetTrackingConfiguration:
    PredefinedMetricSpecification:
      PredefinedMetricType: ASGAverageCPUUtilization
    TargetValue: 70.0

# Alternative: Scale on request count
ScaleOnRequests:
  TargetTrackingConfiguration:
    PredefinedMetricSpecification:
      PredefinedMetricType: ALBRequestCountPerTarget
    TargetValue: 1000.0  # 1000 requests/target/minute
```

**Behavior:**
- Start with 2 instances
- When CPU > 70% for 2 minutes, add instance
- When CPU < 70% for 15 minutes, remove instance
- Never go below 2 or above 10

### Scheduled Scaling

For predictable traffic patterns.

```yaml
ScheduledActions:
  - ScheduledActionName: ScaleUpMorning
    Recurrence: "0 8 * * *"  # 8 AM daily
    MinSize: 4
    MaxSize: 10
    DesiredCapacity: 6

  - ScheduledActionName: ScaleDownEvening
    Recurrence: "0 20 * * *"  # 8 PM daily
    MinSize: 2
    MaxSize: 10
    DesiredCapacity: 2
```

You know traffic spikes at 9 AM when people check your analytics dashboard. Pre-scale at 8 AM.

### Kubernetes Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
      - type: Percent
        value: 50  # Remove max 50% of pods at once
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
      - type: Percent
        value: 100  # Double pods if needed
        periodSeconds: 15
```

### Cost Implications

**Example Workload:**
- Base load: 2 instances (24/7)
- Peak load: 8 instances (4 hours/day)
- Instance cost: $0.10/hour

**Manual Scaling (Always 8 instances):**
```
8 instances × 24 hours × 30 days × $0.10 = $576/month
```

**Auto-Scaling:**
```
Base: 2 × 20 hours × 30 days × $0.10 = $120
Peak: 8 × 4 hours × 30 days × $0.10 = $96
Total: $216/month (62% savings)
```

The 8-instance capacity is available when needed, but you only pay for it 4 hours/day.

## 9. Performance Monitoring

You can't optimize what you don't measure.

### Latency Percentiles

Average latency is misleading. You need percentiles.

**Example API Response Times (1000 requests):**
```
p50 (median):  45ms    - Half of requests complete in 45ms
p95:           120ms   - 95% complete in 120ms
p99:           340ms   - 99% complete in 340ms
p99.9:         2,400ms - 99.9% complete in 2.4s
Average:       78ms
```

The average looks good (78ms), but 1% of users wait 340ms or more. If you serve 1 million requests/day, that's 10,000 slow requests.

### Why Percentiles Matter

**Case Study: E-commerce Checkout**

```
Metric          Before Optimization    After
Average:        250ms                  180ms  (28% improvement)
p50:            180ms                  120ms
p95:            450ms                  280ms
p99:            1,200ms                450ms  (62% improvement)
```

The p99 improvement fixed abandoned carts. Users experiencing 1.2s checkout were leaving. The average didn't tell that story.

### Application Performance Monitoring

**New Relic, DataDog, Sentry Performance:**

These tools automatically track:
- Request duration by endpoint
- Database query time
- External API calls
- Error rates
- Throughput (requests/min)

**Custom Metrics (StatsD/Prometheus):**

```python
from prometheus_client import Histogram, Counter
import time

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time

    request_duration.labels(
        method=request.method,
        endpoint=request.endpoint
    ).observe(duration)

    request_count.labels(
        method=request.method,
        endpoint=request.endpoint,
        status=response.status_code
    ).inc()

    return response
```

### Database Query Monitoring

**pgBadger (PostgreSQL):**

Analyzes logs to find:
- Slowest queries
- Most frequent queries
- Queries without indexes
- Lock contention

```bash
pgbadger /var/log/postgresql/postgresql-*.log -o report.html
```

Shows you:
```
Top 10 Slowest Queries:
1. SELECT * FROM posts WHERE user_id IN (...) - 4.2s avg, 1,234 calls
2. UPDATE users SET last_seen = NOW() WHERE id = ... - 2.8s avg, 45,678 calls
```

**Application Query Tracking:**

```python
import logging

class QueryLogger:
    def before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.time()

    def after_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        duration = time.time() - context._query_start_time

        if duration > 0.1:  # Log queries slower than 100ms
            logging.warning(f"Slow query ({duration:.2f}s): {statement[:200]}")

from sqlalchemy import event
event.listen(engine, "before_cursor_execute", QueryLogger().before_cursor_execute)
event.listen(engine, "after_cursor_execute", QueryLogger().after_cursor_execute)
```

### Real User Monitoring (RUM)

Track actual user experience.

```javascript
// Browser-side timing
window.addEventListener('load', () => {
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  const connectTime = perfData.responseEnd - perfData.requestStart;
  const renderTime = perfData.domComplete - perfData.domLoading;

  // Send to analytics
  analytics.track('page_performance', {
    total: pageLoadTime,
    network: connectTime,
    render: renderTime,
    url: window.location.pathname
  });
});
```

## 10. Common Bottlenecks and Fixes

### Bottleneck 1: N+1 Queries

**Symptom:** Slow pages that make hundreds of database queries.

**Detection:**
```
[SQL] SELECT * FROM posts LIMIT 20;  (2ms)
[SQL] SELECT * FROM users WHERE id = 1;  (1ms)
[SQL] SELECT * FROM users WHERE id = 2;  (1ms)
[SQL] SELECT * FROM users WHERE id = 3;  (1ms)
... (20 more queries)
Total: 23 queries, 125ms
```

**Fix:** Eager loading
```python
posts = Post.objects.select_related('author').all()[:20]
# 1 query with JOIN instead of 21 queries
```

### Bottleneck 2: Unindexed Foreign Keys

**Symptom:** Slow JOINs even with small tables.

**Detection:**
```sql
EXPLAIN SELECT * FROM comments c JOIN posts p ON c.post_id = p.id;
-- Shows "Seq Scan on comments"
```

**Fix:**
```sql
CREATE INDEX idx_comments_post_id ON comments(post_id);
-- JOIN time: 450ms -> 12ms
```

### Bottleneck 3: Large Payload Responses

**Symptom:** Fast database, slow network transfer.

**Detection:**
```
Database query: 45ms
JSON serialization: 320ms
Network transfer: 1,200ms (2.3 MB response)
```

**Fix:** Pagination + field filtering
```python
# Before: Return entire user object
@app.route('/api/users')
def get_users():
    return jsonify([u.to_dict() for u in User.query.all()])
    # Returns 50,000 users, 2.3 MB

# After: Paginate and return only needed fields
@app.route('/api/users')
def get_users():
    users = User.query.limit(20).all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'avatar_url': u.avatar_url
    } for u in users])
    # Returns 20 users, 4 KB
```

### Bottleneck 4: Synchronous External API Calls

**Symptom:** Request waits for external API.

**Detection:**
```
Request timeline:
  Database query: 15ms
  Email API call: 850ms  <-- Blocking
  Response: 865ms total
```

**Fix:** Move to background job
```python
# Before
@app.route('/api/register', methods=['POST'])
def register():
    user = create_user(request.json)
    send_email(user.email, 'Welcome!')  # Blocks for 850ms
    return jsonify(user.to_dict())

# After
@app.route('/api/register', methods=['POST'])
def register():
    user = create_user(request.json)
    send_welcome_email.delay(user.id)  # Returns in 2ms
    return jsonify(user.to_dict())
```

### Bottleneck 5: Missing Cache

**Symptom:** Expensive computation on every request.

**Detection:**
```
Trending posts query: 2,300ms per request
Called 120 times/minute
Database CPU: 95%
```

**Fix:** Cache with short TTL
```python
@cache_result(ttl=300)  # 5 minutes
def get_trending_posts():
    return expensive_query()

# Query time: 2,300ms -> 3ms (cached)
# Database CPU: 95% -> 12%
```

### Bottleneck 6: Memory Leaks

**Symptom:** Application slows down over time, needs periodic restarts.

**Detection:**
```bash
# Memory usage climbs steadily
Hour 0:  800 MB
Hour 6:  1,200 MB
Hour 12: 1,800 MB
Hour 18: 2,400 MB (OOM kill)
```

**Common Causes:**
- Event listeners not removed
- Global caches without size limits
- Circular references
- File handles not closed

**Fix:** Bounded caches
```python
from functools import lru_cache

# Before: Unbounded cache grows forever
cache = {}
def get_user(user_id):
    if user_id not in cache:
        cache[user_id] = User.query.get(user_id)
    return cache[user_id]

# After: LRU cache with max size
@lru_cache(maxsize=1000)
def get_user(user_id):
    return User.query.get(user_id)
```

## Summary

Performance optimization is about measuring, finding the bottleneck, and fixing it methodically. The key lessons:

1. **Database queries** are usually the problem. Use EXPLAIN plans and indexes.
2. **Scaling horizontally** is easier than vertical for stateless components.
3. **Load balancing** needs health checks and the right algorithm for your traffic.
4. **Caching** works at multiple levels - choose the right one for each data type.
5. **Rate limiting** prevents abuse and ensures fair resource allocation.
6. **Cursor pagination** scales better than offset for deep pages.
7. **Background jobs** keep HTTP requests fast and decouple long operations.
8. **Auto-scaling** saves money and handles traffic spikes automatically.
9. **Monitor percentiles**, not averages. p99 matters more than you think.
10. **Fix the bottleneck**, not random things. Measure first.

The difference between a system that handles 100 users and one that handles 100,000 isn't magic - it's these patterns applied consistently.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Architecture Design](../../architecture-design/mid-depth/index.md) - Related design considerations
- [Database Design](../../database-design/mid-depth/index.md) - Related design considerations
- [Error Handling & Resilience](../../error-handling-resilience/mid-depth/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
