---
title: "Database Design Essentials"
phase: "02-design"
topic: "database-design"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["data-flow-mapping", "api-design", "performance-scalability-design"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Database Design Essentials

Your database is where truth lives in your application. Every user action, every transaction, every piece of content eventually writes to or reads from your database. Get the structure wrong and you'll spend months working around your own design decisions.

This guide covers the fundamental choices that determine whether your database helps or hurts. You don't need to be a database theorist or memorize normalization forms. You need to understand when to use which type of database, how to structure data so it doesn't corrupt, and how to avoid the mistakes that create 3am emergencies.

## Relational vs NoSQL: Which One and When

The "relational versus NoSQL" debate feels like it should have a clear winner by now. It doesn't. Each solves different problems, and picking the wrong one for your use case creates years of pain.

**Relational databases (PostgreSQL, MySQL, SQL Server)** organize data in tables with strict schemas. Each row has the same columns. Relationships between tables use foreign keys. You query with SQL. This model has worked for 40 years because it's good at preventing data corruption and handling complex relationships.

Use relational databases when:
- **Data has clear relationships** - Users have orders. Orders have items. Items belong to products. These connections matter and need to stay consistent.
- **You need transactions** - When a payment succeeds, you need to update inventory, create a shipment record, and log the transaction. All of it happens or none of it happens. Relational databases guarantee this with ACID transactions.
- **Your schema is relatively stable** - You know what fields you need and they won't change drastically every week.
- **You need to query data flexibly** - You might filter users by signup date today and by location tomorrow. SQL handles arbitrary queries well.

**NoSQL databases (MongoDB, DynamoDB, Cassandra, Redis)** come in different flavors but share one trait: they don't enforce rigid table structures. Document databases store JSON-like objects. Key-value stores map strings to values. Graph databases store nodes and edges. Each type optimizes for different access patterns.

Use NoSQL when:
- **You need extreme scale** - Handling billions of reads per day across multiple continents. NoSQL databases distribute data across servers more easily than relational databases.
- **Your data structure varies** - Each product has different attributes. Some have sizes, some have colors, some have neither. Document databases handle this without creating hundreds of null columns.
- **You have simple access patterns** - You fetch entire documents by ID. You don't join across collections or run complex aggregations.
- **Speed matters more than consistency** - You can tolerate showing slightly stale data if it means 10x faster reads.

**The default choice is relational.** PostgreSQL handles most web applications comfortably. It's well-understood, has excellent tooling, prevents common data corruption bugs, and scales further than most projects ever need.

Switch to NoSQL when you have evidence that relational databases won't work - not because NoSQL sounds modern or because you read a blog post. Instagram, Slack, and GitHub run on PostgreSQL. If it works for them, it probably works for you.

## Schema Design: The Basics That Matter

Schema design is about structuring your tables so data stays accurate and queries stay fast. The core concept is normalization - organizing data to reduce duplication and prevent inconsistencies.

### The Three Normal Forms That Actually Matter

Database textbooks describe six normal forms. In practice, you need to understand three.

**First Normal Form (1NF): No Repeating Groups**

Each column should contain a single value, not lists or arrays.

```sql
-- Violates 1NF - tags stored as comma-separated string
CREATE TABLE posts_bad (
  id INTEGER PRIMARY KEY,
  title TEXT,
  tags TEXT  -- "javascript,tutorial,beginner"
);

-- Follows 1NF - tags in separate table
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  title TEXT
);

CREATE TABLE post_tags (
  post_id INTEGER REFERENCES posts(id),
  tag TEXT,
  PRIMARY KEY (post_id, tag)
);
```

The first version looks simpler but causes problems immediately. How do you find all posts tagged "javascript"? You need `WHERE tags LIKE '%javascript%'`, which is slow and wrong - it also matches "javascripting". You can't enforce valid tag values. You can't count how many posts use each tag without string parsing.

The second version splits tags into a separate table. Now you can query, count, and validate tags properly. Yes, it's two tables instead of one. That's the trade-off.

**Second Normal Form (2NF): No Partial Dependencies**

Every non-key column should depend on the entire primary key, not just part of it.

```sql
-- Violates 2NF - product_name depends only on product_id, not the full key
CREATE TABLE order_items_bad (
  order_id INTEGER,
  product_id INTEGER,
  product_name TEXT,  -- duplicated for every order
  quantity INTEGER,
  price_per_unit DECIMAL,
  PRIMARY KEY (order_id, product_id)
);

-- Follows 2NF - product details in separate table
CREATE TABLE order_items (
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER,
  price_per_unit DECIMAL,  -- stored here because price can change
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT,
  current_price DECIMAL
);
```

The first version duplicates the product name in every order that includes that product. If you fix a typo in "Wireless Keybord", you have to update hundreds of rows. Miss one and you have inconsistent data.

Notice `price_per_unit` stays in `order_items` even though products have prices. This is intentional - you need to record the price at the time of purchase, which might differ from the current price. Historical data often requires careful handling.

**Third Normal Form (3NF): No Transitive Dependencies**

Non-key columns should depend on the key directly, not on other non-key columns.

```sql
-- Violates 3NF - city and state depend on zip, not on user_id
CREATE TABLE users_bad (
  id INTEGER PRIMARY KEY,
  email TEXT,
  zip_code TEXT,
  city TEXT,     -- depends on zip_code
  state TEXT     -- depends on zip_code
);

-- Follows 3NF - address components in separate table
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT,
  zip_code TEXT REFERENCES zip_codes(code)
);

CREATE TABLE zip_codes (
  code TEXT PRIMARY KEY,
  city TEXT,
  state TEXT,
  latitude DECIMAL,
  longitude DECIMAL
);
```

In the first version, if you store 1,000 users in Portland, OR 97201, you duplicate "Portland" and "OR" 1,000 times. Worse, someone might enter "97201" with city "Porland" and now you have bad data that's hard to find.

The second version stores each zip code once with its correct city and state. Update one row and every user in that zip code has correct data.

### When to Denormalize

Normalization prevents data corruption but adds joins. Every join makes queries slower and harder to write. Sometimes you intentionally denormalize - violate normal forms - for performance or simplicity.

**Cache computed values:**
```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  title TEXT,
  comment_count INTEGER DEFAULT 0  -- denormalized for speed
);

-- Update via trigger when comments added/removed
CREATE TRIGGER update_comment_count
  AFTER INSERT ON comments
  FOR EACH ROW
  UPDATE posts SET comment_count = comment_count + 1
  WHERE id = NEW.post_id;
```

Counting comments with `SELECT COUNT(*) FROM comments WHERE post_id = ?` works but gets slow with millions of comments. Storing the count as a column trades perfect accuracy for speed. If the count drifts slightly due to a failed trigger, it's usually acceptable for a public display number.

**Duplicate data you query together:**
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_email TEXT,  -- duplicated from users table
  shipping_address JSONB
);
```

You could join to the `users` table to get the email, but orders need the email that existed when the order was placed, not the user's current email. Duplicating it is correct here. Same for shipping addresses - you want a snapshot at order time, not the user's current address.

Denormalize when:
- Joining hurts performance and you've measured it
- You need historical snapshots, not current data
- The duplicated data rarely changes
- You can accept slightly stale values

Don't denormalize by default. Start normalized, measure performance, denormalize specific hot spots.

## Primary Keys, Foreign Keys, and Indexes

These three concepts keep your data connected and findable.

**Primary keys** uniquely identify each row. Most tables use auto-incrementing integers:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,  -- auto-incrementing integer
  email TEXT UNIQUE NOT NULL
);
```

Sometimes natural keys make sense - values that are already unique:

```sql
CREATE TABLE countries (
  iso_code CHAR(2) PRIMARY KEY,  -- "US", "CA", "GB"
  name TEXT
);
```

UUIDs work for distributed systems where multiple servers create records independently:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  occurred_at TIMESTAMP
);
```

UUIDs are 128-bit random values that won't collide even across different databases. They're larger and slower than integers but prevent coordination between servers.

**Foreign keys** enforce relationships between tables:

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id),
  title TEXT
);
```

The `REFERENCES` constraint prevents orphaned data. You can't insert a post with `author_id = 999` if user 999 doesn't exist. You can't delete a user who has posts unless you specify what should happen:

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- delete posts when user deleted
  title TEXT
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- keep comment, null out author
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT
);
```

Foreign keys catch bugs. If your application tries to create invalid relationships, the database stops it before data corrupts.

**Indexes** make queries fast:

```sql
-- Without index: searches every row
SELECT * FROM users WHERE email = 'user@example.com';

-- With index: direct lookup
CREATE INDEX idx_users_email ON users(email);
```

Indexes are like book indexes - they let you jump directly to relevant rows instead of scanning the entire table. Without the index, finding a user by email checks every row. With the index, it's nearly instant even with millions of users.

Create indexes for:
- Foreign keys (almost always needed)
- Columns you filter on frequently (`WHERE email = ?`)
- Columns you sort by (`ORDER BY created_at DESC`)
- Columns used in joins

Don't index everything. Each index speeds up reads but slows down writes - the database has to update every index when you insert or update rows. Index columns you actually query, not columns that might someday be useful.

```sql
-- Common indexes for a typical app
CREATE INDEX idx_posts_author ON posts(author_id);           -- foreign key
CREATE INDEX idx_posts_created ON posts(created_at DESC);    -- sorted lists
CREATE INDEX idx_users_email ON users(email);                -- login lookups
CREATE INDEX idx_comments_post ON comments(post_id);         -- foreign key
```

## Common Patterns: Users, Posts, and Relationships

Most applications share similar data structures. Here are the patterns that appear everywhere.

**Users and Authentication:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- never store plain text passwords
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);  -- for login
```

Store only the password hash, never the actual password. Use bcrypt, scrypt, or argon2 for hashing - they're designed to be slow, which prevents brute force attacks.

**Content with Authors:**
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_published ON posts(published_at DESC)
  WHERE status = 'published';  -- partial index for published posts
```

The partial index on `published_at` only includes published posts, making queries for "recent published posts" very fast without indexing drafts.

**Comments and Nested Discussions:**
```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,  -- for replies
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

The `parent_id` self-reference allows threaded comments. Top-level comments have `parent_id = NULL`. Replies have `parent_id` pointing to the comment they're replying to.

**Many-to-Many Relationships:**
```sql
-- Users can follow other users
CREATE TABLE follows (
  follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  followed_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followed_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);  -- "who do I follow?"
CREATE INDEX idx_follows_followed ON follows(followed_id);  -- "who follows me?"

-- Prevent following yourself
ALTER TABLE follows ADD CONSTRAINT no_self_follow
  CHECK (follower_id != followed_id);
```

Join tables like `follows` connect two tables in a many-to-many relationship. The composite primary key `(follower_id, followed_id)` prevents duplicate follows. Separate indexes on each column support queries in both directions.

## Red Flags: Mistakes to Avoid

Some database mistakes show up in almost every project. Knowing them helps you avoid months of cleanup work.

**Storing multiple values in one column:**
```sql
-- Bad: comma-separated tags
tags TEXT  -- "javascript,react,tutorial"

-- Good: separate table
CREATE TABLE post_tags (
  post_id INTEGER,
  tag TEXT,
  PRIMARY KEY (post_id, tag)
);
```

Any time you're storing commas, semicolons, or other delimiters in a column, you're probably violating first normal form. You'll regret it when you need to query or validate the data.

**Missing indexes on foreign keys:**
```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id)
  -- Missing: CREATE INDEX idx_comments_post ON comments(post_id);
);
```

Without the index, fetching all comments for a post scans the entire comments table. With millions of comments, this query times out. Index every foreign key unless you have a specific reason not to.

**Using NULL when you mean empty:**
```sql
-- Unclear: is bio NULL or empty string?
bio TEXT  -- Could be NULL, '', or actual text

-- Clear: bio is always a string, never NULL
bio TEXT NOT NULL DEFAULT ''
```

NULL means "unknown" or "not applicable". Empty string means "known to be empty". Pick one and be consistent. Mixing them creates bugs in application code that forgets to check for both.

**No timestamps:**
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  total DECIMAL
  -- Missing: created_at, updated_at
);
```

You always want to know when a record was created. Often you want to know when it was last modified. Add these columns to every table by default. The one time you don't include them is the one time you desperately need to know "when did this order get created?"

**Overly generic schemas:**
```sql
-- Too generic - can represent anything, query nothing efficiently
CREATE TABLE entities (
  id SERIAL PRIMARY KEY,
  type TEXT,
  attributes JSONB
);
```

This is called the Entity-Attribute-Value anti-pattern. It looks flexible but makes every query painful. You can't enforce data types, can't add proper indexes, and can't use foreign keys. Use proper tables with proper columns.

**No constraints:**
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT,  -- should be NOT NULL
  price DECIMAL  -- should be CHECK (price >= 0)
);
```

The database can enforce business rules. Let it. Use `NOT NULL` for required fields. Use `CHECK` constraints for value ranges. Use `UNIQUE` for fields that must be unique. Every constraint is a bug your application doesn't have to prevent.

## Key Takeaways

Database design isn't about memorizing rules. It's about making consistent, defensible choices:

1. **Start with relational databases** unless you have specific evidence that NoSQL solves a real problem you're having.

2. **Normalize to third normal form** to prevent data duplication and corruption. Denormalize specific cases when you've measured performance problems.

3. **Use foreign keys** to enforce relationships. Let the database prevent orphaned data and invalid references.

4. **Index foreign keys and frequently queried columns.** Every unindexed query is a future timeout waiting to happen.

5. **Add timestamps, constraints, and NOT NULL** by default. Future you will thank you when debugging production issues at midnight.

6. **Follow common patterns** for users, posts, comments, and relationships. Don't reinvent schemas that have worked for millions of applications.

The goal isn't perfect database design. It's a schema that accurately represents your domain, prevents corruption, and performs well enough that you're not constantly working around it. Start simple, measure reality, and adjust based on evidence.

---

**Related Topics:**
- [Data Flow Mapping](../../data-flow-mapping/surface/) - Understanding how data moves through your system
- [API Design](../../api-design/surface/) - Designing APIs that expose your database effectively
- [Performance & Scalability Design](../../performance-scalability-design/surface/) - Scaling databases as your application grows

**Next Steps:**
- **Mid-Depth**: Advanced patterns like soft deletes, audit logs, full-text search, materialized views, and query optimization
- **Deep Water**: Sharding strategies, replication topologies, database migrations at scale, and polyglot persistence
