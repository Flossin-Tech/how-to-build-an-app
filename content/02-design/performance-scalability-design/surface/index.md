---
title: "Performance & Scalability Design Essentials"
phase: "02-design"
topic: "performance-scalability-design"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["database-design", "api-design", "architecture-design"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Performance & Scalability Design Essentials

You don't need to build the next Netflix on day one. But you do need to avoid the obvious mistakes that make your app slow before you even launch.

Performance requirements matter upfront - not because you should optimize everything, but because some decisions are expensive to change later. Choosing a relational database when you need to handle millions of writes per second is a problem. Putting your CDN in the wrong region when all your users are on the other side of the world is a problem. Not thinking about these things at all is the biggest problem.

The good news: most performance issues follow predictable patterns. Fix the common ones during design, measure the rest, then optimize what actually matters.

## Know Your Performance Requirements

Before you write a single line of code, answer these questions:

**How fast does it need to respond?**
- API endpoints: Usually 200-500ms is acceptable
- Page loads: Under 3 seconds for initial load
- Interactive elements: Under 100ms or they feel sluggish
- Background jobs: Depends entirely on the job

**How many people will use it?**
- 10 concurrent users? Don't overthink it
- 1,000 concurrent users? You need caching
- 100,000 concurrent users? You need serious infrastructure planning

**What's the data volume?**
- 1,000 records? Any database works
- 1 million records? Indexes matter
- 100 million records? Database design really matters

Write these numbers down. You'll use them to make trade-off decisions. "Should I cache this?" becomes easier when you know you have 50 users, not 50,000.

A SaaS dashboard for 20 internal employees has different requirements than a public API serving mobile apps. One needs to work reliably. The other needs to work reliably *and* fast *and* scale.

## Caching Strategy Basics

Caching means storing a copy of data somewhere faster than the original source. It's the most effective performance improvement you can make.

There are four places to cache, from closest to the user to furthest:

**Browser Cache**
Static assets like images, CSS, JavaScript files. Set HTTP cache headers and browsers store them locally. Your server never sees repeat requests.

```http
Cache-Control: public, max-age=31536000, immutable
```

This tells browsers: "Keep this file for a year and never check if it changed." Works great for versioned assets like `app.v123.js`.

**CDN (Content Delivery Network)**
Geographic distribution of static files. User in Tokyo hits a Tokyo server. User in London hits a London server. Speed of light matters - round-trip time from Tokyo to New York is 200ms just from distance.

Put images, videos, CSS, JavaScript on a CDN. Most cloud providers offer this. Cloudflare, AWS CloudFront, Vercel Edge Network all work.

**Application Cache**
Store database query results or expensive computations in memory. Redis and Memcached are common tools.

```python
# Without cache: hits database every time
def get_user_profile(user_id):
    return db.query("SELECT * FROM users WHERE id = ?", user_id)

# With cache: hits database once, then serves from memory
def get_user_profile(user_id):
    cache_key = f"user:{user_id}"
    cached = redis.get(cache_key)
    if cached:
        return cached

    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    redis.set(cache_key, user, expiry=300)  # Cache for 5 minutes
    return user
```

Database queries that take 50ms drop to under 1ms from cache. That's a 50x improvement.

**Database Cache**
The database itself caches frequently accessed data in RAM. You usually don't configure this directly - the database handles it. But knowing it exists helps you understand why the first query is slow and subsequent ones are fast.

### What to Cache

Cache things that:
- Don't change often (user profiles, product catalogs)
- Are expensive to compute (analytics dashboards, reports)
- Are accessed frequently (homepage content, navigation menus)

Don't cache things that:
- Change constantly (real-time stock prices, live sports scores)
- Are unique per request (personalized recommendations based on current context)
- Are already fast (simple queries on indexed columns)

### How Long to Cache

This is a trade-off between performance and freshness.

- Static assets: Hours to days (or until you deploy new code)
- User profiles: Minutes to hours
- Product inventory: Seconds to minutes
- Homepage content: Minutes
- Search results: Seconds

When in doubt, start with 5 minutes. You can always adjust.

### Cache Invalidation

The classic computer science joke: "There are only two hard things in computer science: cache invalidation and naming things."

It's hard because you need to know when data changed. The simple approach: set an expiration time and accept slightly stale data. The complex approach: invalidate the cache whenever the underlying data changes.

For most apps, expiration times work fine. User updates their profile? They can wait 5 minutes to see the change reflected everywhere.

## Async Processing for Expensive Operations

Some operations are too slow to do during a web request:
- Generating a 200-page PDF report
- Processing a 4K video upload
- Sending 10,000 personalized emails
- Running complex data analysis

If these take 30 seconds and you do them synchronously, the user stares at a loading spinner for 30 seconds. Their browser might timeout. They might close the tab.

The solution: acknowledge the request immediately, do the work in the background, notify when done.

```python
# Synchronous - user waits 30 seconds
@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    report = expensive_report_generation()  # 30 seconds
    return report

# Asynchronous - user gets response immediately
@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    job_id = queue.enqueue(expensive_report_generation)
    return {"status": "processing", "job_id": job_id}
```

The user gets a response in 100ms. A background worker picks up the job, processes it, and sends an email or in-app notification when done.

Background job systems: Celery, Sidekiq, Bull, Cloud Tasks, SQS. Pick one that works with your language and infrastructure.

**When to use async processing:**
- Operation takes more than 2-3 seconds
- Operation uses significant CPU or memory
- Operation can fail and needs retry logic
- User doesn't need immediate results

**When to keep it synchronous:**
- User needs results to continue (login, payment processing)
- Operation is fast (under 500ms)
- Operation is simple and unlikely to fail

## CDN for Static Assets

Your application server might be in Virginia. Your user might be in Singapore. That's 15,000 kilometers and 200-300ms of latency just from physics.

Static files - images, CSS, JavaScript, fonts, videos - don't change per user. Serve them from a CDN and the Singapore user hits a Singapore server. Latency drops to 20ms.

```html
<!-- Slow: serving from your application server -->
<img src="https://yourapp.com/images/logo.png">

<!-- Fast: serving from CDN -->
<img src="https://cdn.yourapp.com/images/logo.png">
```

Most cloud platforms include CDN as a checkbox option. Vercel, Netlify, AWS CloudFront, Cloudflare - all handle this automatically if you configure them.

The performance gain is dramatic. A page with 20 images might load in 8 seconds from your server. Same page from a CDN loads in 2 seconds.

## Database Query Basics

Slow database queries kill performance. Two common problems catch everyone at least once.

### The N+1 Problem

This is the classic mistake. You query for a list of items, then loop through and query for related data. One query for the list, N queries for each item. Hence "N+1."

```python
# Bad - N+1 queries
posts = db.query("SELECT * FROM posts LIMIT 10")  # 1 query
for post in posts:
    author = db.query("SELECT * FROM users WHERE id = ?", post.author_id)  # N queries
    print(f"{post.title} by {author.name}")
# Total: 11 queries for 10 posts
```

Each query takes 5ms. That's 55ms total. Seems fine. But if you have 100 posts, it's 505ms. With 1,000 posts, it's 5 seconds.

The fix: eager loading. Get everything in one or two queries.

```python
# Good - 2 queries
posts = db.query("SELECT * FROM posts LIMIT 10")  # 1 query
author_ids = [p.author_id for p in posts]
authors = db.query("SELECT * FROM users WHERE id IN (?)", author_ids)  # 1 query

author_map = {a.id: a for a in authors}
for post in posts:
    author = author_map[post.author_id]
    print(f"{post.title} by {author.name}")
# Total: 2 queries for 10 posts
```

Same result, 95% less database load. Most ORMs have built-in eager loading. Use it.

### Missing Indexes

Databases search through every row without indexes. Fast for 100 rows. Slow for 10,000 rows. Painfully slow for 1 million rows.

```sql
-- Slow - scans entire table
SELECT * FROM users WHERE email = 'user@example.com';

-- Fast - uses index
CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE email = 'user@example.com';
```

Without the index: 200ms. With the index: 2ms.

Index columns you search by, filter by, or join on. Don't index everything - indexes slow down writes and take up space. But index the columns you actually query.

Common candidates:
- Primary keys (usually indexed automatically)
- Foreign keys (used in joins)
- Email addresses (used in login)
- Status fields (used in filtering)
- Created dates (used in sorting)

## When to Optimize

This might be the most important section.

Don't optimize code you haven't written yet. Don't optimize code that's already fast enough. Don't optimize code you're guessing is slow.

The process:
1. Build it
2. Measure it
3. Identify actual bottlenecks
4. Fix the slowest thing
5. Measure again

"Premature optimization is the root of all evil" is attributed to Donald Knuth. He's right. Complex caching logic, convoluted async processing, denormalized database schemas - these make code harder to understand and maintain. Only add complexity when measurements prove you need it.

That said, there are free optimizations:
- Use database indexes on columns you query
- Serve static assets from a CDN
- Cache responses that don't change often
- Don't do expensive work synchronously if users can wait

These are cheap to implement and save headaches later.

But choosing a specialized database because "it's faster" without measuring? Rewriting your API in a "faster language" without profiling? That's premature optimization.

Your app is probably slow because:
1. Missing database indexes
2. N+1 queries
3. No caching
4. Static assets served from application server
5. Synchronous processing of slow operations

Fix those first. Then measure. You might be done.

## Common Mistakes

**Optimizing the wrong thing**. You speed up a function from 5ms to 1ms. Great. But that function is called once per request and the request takes 500ms. You saved 0.8% of the total time.

Measure first. Fix the biggest bottleneck. A 200ms database query matters more than a 5ms function.

**Over-caching**. Caching adds complexity. Invalidation is hard. Stale data causes bugs. If something is already fast, don't cache it.

**Ignoring the N+1 problem**. It's fine with 10 records. It's a disaster with 10,000. If you're looping and querying, you probably have an N+1 problem.

**No monitoring**. You can't improve what you don't measure. Add basic performance monitoring from day one. Many platforms include this. Use it.

**Assuming what's slow**. Developers are terrible at guessing where time is spent. I've seen teams rewrite entire modules to optimize something that took 2% of request time while ignoring a database query taking 60%.

## Key Takeaways

Performance isn't about building the fastest possible system. It's about building a system that's fast enough for your users and your scale.

Start with these practices:
- Define acceptable response times before you build
- Cache static assets and serve from a CDN
- Use background jobs for slow operations
- Index database columns you query
- Watch for N+1 queries

Then measure real usage and optimize what actually matters.

Your first version doesn't need to scale to a million users. It needs to work reliably for the users you actually have. When you grow, measure where it slows down, then optimize those specific bottlenecks.

Good enough today beats perfect someday. Ship it, measure it, improve it.
---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Architecture Design](../../architecture-design/surface/index.md) - Related design considerations
- [Database Design](../../database-design/surface/index.md) - Related design considerations
- [Error Handling & Resilience](../../error-handling-resilience/surface/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
