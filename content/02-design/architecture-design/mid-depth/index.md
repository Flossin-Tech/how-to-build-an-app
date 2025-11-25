---
title: "Architecture Design - Mid-Depth"
phase: "02-design"
topic: "architecture-design"
depth: "mid-depth"
reading_time: 25
prerequisites: ["job-to-be-done", "data-modeling"]
related_topics: ["api-design", "database-design", "security-architecture", "deployment-strategy"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-15"
---

# Architecture Design - Mid-Depth

You've got a system that works. Now you're facing questions like "Should we split this into microservices?" or "How do we let the billing team work independently from the shipping team?" or "Why does changing the user profile break three other features?"

This guide is about making architectural decisions that let your system grow without collapsing under its own complexity. Not the theoretical computer science version - the version where you have existing code, paying customers, and a team that needs to ship features next week.

## 1. Service Boundaries and Bounded Contexts

The hardest part of architecture isn't choosing between monolith and microservices. It's figuring out where one thing ends and another begins.

### Finding Natural Boundaries

Domain-Driven Design (DDD) calls these "bounded contexts" - areas where a particular model makes sense and has clear meaning. Eric Evans popularized this in his 2003 book, and it's still the most useful framework for finding service boundaries.

The trick is that the same word means different things in different contexts. "Customer" in the billing system isn't the same as "Customer" in the support ticket system. In billing, you care about payment methods and subscription status. In support, you care about issue history and satisfaction scores. Trying to use one unified "Customer" object for both creates a mess.

**How to spot a bounded context:**

1. **Different teams own different parts** - If the billing team and the shipping team rarely coordinate, they're probably in different contexts
2. **Different change frequencies** - Pricing logic changes monthly, while warehouse locations change yearly
3. **Different data needs** - The recommendation engine needs user browsing history; the invoice generator doesn't
4. **Different vocabulary** - Sales calls them "leads," marketing calls them "prospects," support calls them "customers"

**Real example from e-commerce:**

```
Catalog Context:
- Product (SKU, description, images, categories)
- Category
- Brand

Inventory Context:
- Stock Item (quantity, location, reserved count)
- Warehouse
- Restock Order

Order Context:
- Order (customer, items, total, status)
- Payment
- Shipping Address

Fulfillment Context:
- Shipment (tracking, carrier, items)
- Pick List
- Packing Slip
```

Notice that "Product" appears in multiple contexts, but means different things. In Catalog, it's marketing information. In Inventory, it's a stock item with a warehouse location. In Orders, it's a line item with a price. In Fulfillment, it's a physical thing to pack.

### Context Mapping

Once you've identified contexts, you need to map how they relate. This is where things get practical.

**Customer-Supplier relationship:**
The upstream team (supplier) provides data the downstream team (customer) consumes. The catalog team supplies product data to the order system.

**Conformist relationship:**
The downstream team has no influence over the upstream model. You're integrating with Stripe's API - you conform to their model.

**Anti-Corruption Layer:**
You build a translation layer so the external system's mess doesn't leak into your clean domain. This is what you do when integrating with a legacy system or a poorly designed external API.

```javascript
// Anti-Corruption Layer for legacy inventory system
class InventoryAdapter {
  async getStockLevel(productId) {
    // Legacy system has bizarre structure
    const legacyResponse = await legacyAPI.call({
      action: 'STOCK_INQ',
      prod_num: productId,
      warehouse_flags: 'ALL',
      include_reserved: 'Y'
    });

    // Translate to our clean domain model
    return {
      productId,
      available: legacyResponse.qty_on_hand - legacyResponse.qty_reserved,
      reserved: legacyResponse.qty_reserved,
      locations: legacyResponse.warehouses.map(wh => ({
        warehouseId: wh.wh_code,
        quantity: wh.qty
      }))
    };
  }
}
```

**Shared Kernel:**
Two contexts share some subset of the domain model. Both teams have to coordinate changes to this shared part. Use sparingly - it creates coupling.

**Published Language:**
A well-documented, stable format for integration. APIs with versioning and backward compatibility. This is what public APIs should be.

The key insight from context mapping is that different relationships require different levels of coordination. A shared kernel requires tight coordination. An anti-corruption layer lets you work completely independently.

## 2. Modular Monolith in Practice

Before you jump to microservices, understand this: most of the benefits of microservices come from good boundaries, not from network calls.

A modular monolith is a single deployable unit (usually one process) with clear internal boundaries. It's how Shopify runs a $200B e-commerce platform. They have thousands of engineers working on one Rails codebase, successfully.

### Directory Structure That Enforces Boundaries

```
src/
├── catalog/
│   ├── domain/
│   │   ├── product.ts
│   │   ├── category.ts
│   │   └── brand.ts
│   ├── application/
│   │   ├── product-service.ts
│   │   └── catalog-events.ts
│   ├── infrastructure/
│   │   ├── product-repository.ts
│   │   └── product-cache.ts
│   └── api/
│       └── catalog-controller.ts
├── orders/
│   ├── domain/
│   │   ├── order.ts
│   │   ├── order-line.ts
│   │   └── payment.ts
│   ├── application/
│   │   ├── order-service.ts
│   │   └── order-events.ts
│   ├── infrastructure/
│   │   └── order-repository.ts
│   └── api/
│       └── order-controller.ts
└── shared/
    ├── events/
    │   └── event-bus.ts
    └── types/
        └── money.ts
```

The structure communicates rules:
- Orders can publish events about orders
- Catalog can subscribe to those events
- Orders CANNOT directly import from catalog/domain
- Cross-module communication happens through the event bus or published interfaces

### Enforcing Module Boundaries

Structure alone isn't enough. People will take shortcuts. You need enforcement.

**Using a module boundary linter:**

```javascript
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-domain-access',
      severity: 'error',
      from: { path: '^src/([^/]+)/' },
      to: {
        path: '^src/(?!\\1)[^/]+/domain',
        pathNot: '^src/shared/'
      }
    },
    {
      name: 'no-infrastructure-in-domain',
      severity: 'error',
      from: { path: 'domain/' },
      to: { path: 'infrastructure/' }
    }
  ]
};
```

This configuration prevents the orders module from importing from `catalog/domain` and prevents domain code from depending on infrastructure code.

**Nx workspace boundaries** (for TypeScript/JavaScript monorepos):

```json
{
  "sourceTag": "scope:orders",
  "onlyDependOnLibsWithTags": ["scope:orders", "scope:shared"]
}
```

**Java module system** (Java 9+):

```java
// module-info.java in orders module
module com.example.orders {
  requires com.example.shared;
  exports com.example.orders.api;
  // domain package is not exported - internal only
}
```

### When Modular Monolith Works

**You should probably start here if:**
- You have fewer than 50 engineers
- Your deployment takes less than 30 minutes
- Most features touch 1-3 modules
- Your team is in the same timezone
- Your data has complex relationships (lots of joins)

**You might need to split when:**
- Different modules have wildly different scaling needs (your image processing maxes out CPU while your API is I/O bound)
- Different modules have different security requirements (PCI compliance for payments, HIPAA for health data)
- Deploy frequency is bottlenecked by testing everything together
- Team coordination overhead exceeds communication overhead of distributed systems

Simon Brown calls this "modular first, microservices when necessary." Get the boundaries right in a monolith. Splitting later is easier when the boundaries are clean.

## Evolution Triggers: Surface to Mid-Depth

One of the hardest architecture decisions is knowing when to evolve. Theoretical concerns ("microservices are best practice") lead to premature complexity. Real metrics drive smart evolution.

The dispatch management case study evolved from Surface to Mid-Depth based on quantitative triggers:

| Metric | Surface Level Target | Actual Value That Triggered Evolution |
|--------|---------------------|--------------------------------------|
| Response Time | <5 seconds | Consistently exceeding 5 seconds under load |
| Queue Losses | Acceptable occasionally | >2 incidents per month causing customer complaints |
| Concurrent Users | 0-100 | Approaching 100, growth trajectory clear |
| Manual Operations | Manageable | Consuming >4 hours per week |
| Customer Demands | Internal tool expectations | Enterprise customers requiring SLAs and publicly-trusted certificates |

**Key Insight**: They didn't evolve because "microservices are best practice" or "Redis is better than in-memory queues." They evolved when specific, measurable pain points exceeded acceptable thresholds.

**What Changed at Mid-Depth**:
- In-memory queue → Redis (persistent across deployments)
- 30-second polling → WebSocket real-time updates
- Self-signed certificates → Let's Encrypt
- Single-instance deployment → Multi-instance with load balancer
- Basic file logging → Centralized logging (ELK stack)
- Single database → Schema-per-tenant for data isolation

**What Stayed the Same**: Still a modular monolith. The Users, Equipment, and Dispatch modules remained in one application with a shared database because ACID transactions were valuable and distributed transactions would add complexity without benefit.

📌 **See Full Framework**: [Maturity Levels Overview](/02-design/architecture-design/case-studies/dispatch-management-maturity-levels/)

## 3. Communication Patterns: Synchronous vs Asynchronous

Once you have multiple modules (whether in a monolith or separate services), they need to communicate. The synchronous vs asynchronous choice has bigger implications than most people realize.

### Synchronous (Request-Response)

One module calls another and waits for a response. HTTP requests, gRPC calls, direct function calls in a monolith.

**When it works well:**

```javascript
// Order service needs current price
async function createOrder(userId, productId, quantity) {
  // We NEED the price to create an order
  const product = await catalogService.getProduct(productId);

  if (!product.available) {
    throw new Error('Product not available');
  }

  const order = {
    userId,
    productId,
    quantity,
    priceAtPurchase: product.currentPrice,
    total: product.currentPrice * quantity
  };

  return await orderRepository.save(order);
}
```

This is synchronous because the order literally cannot be created without the price. The business logic requires it.

**The coupling problem:**

```javascript
// Orders now depend on three services
async function createOrder(userId, productId, quantity) {
  const product = await catalogService.getProduct(productId);
  const user = await userService.getUser(userId);
  const inventory = await inventoryService.checkStock(productId, quantity);

  // If ANY of these services are down, orders are down
  // If ANY are slow, orders are slow
}
```

You've created a distributed monolith - all the complexity of microservices with none of the independence.

**Mitigation strategies:**

1. **Cache aggressively** - Product names rarely change. Cache them for hours.
2. **Graceful degradation** - Can you create the order with placeholder data and fill it in later?
3. **Circuit breakers** - Fail fast when downstream services are struggling
4. **Timeouts** - Don't wait forever. 500ms is an eternity in server time.

### Asynchronous (Event-Driven)

One module publishes an event. Other modules that care about it react independently.

**When it works well:**

```javascript
// Orders publishes an event
class OrderService {
  async createOrder(userId, productId, quantity) {
    const order = await orderRepository.save({
      userId,
      productId,
      quantity,
      status: 'pending'
    });

    await eventBus.publish('order.created', {
      orderId: order.id,
      userId,
      productId,
      quantity
    });

    return order;
  }
}

// Inventory subscribes to the event
class InventoryService {
  @Subscribe('order.created')
  async handleOrderCreated(event) {
    await this.reserveStock(event.productId, event.quantity);
  }
}

// Email service also subscribes
class EmailService {
  @Subscribe('order.created')
  async handleOrderCreated(event) {
    const user = await this.getUser(event.userId);
    await this.sendOrderConfirmation(user.email, event.orderId);
  }
}
```

The order service doesn't know about inventory or email. It just publishes what happened. If you add a recommendation engine that wants to know about orders, you just add another subscriber. Zero changes to the order service.

**The consistency problem:**

What happens when the order is created but inventory reservation fails? You've got an order the customer sees, but no inventory reserved.

This is eventual consistency - the system is temporarily inconsistent but will eventually reach a consistent state. Your code needs to handle this.

### The Spectrum in Practice

Most real systems use both:

**Synchronous for:**
- Reading data you need immediately (product price during checkout)
- Operations that should fail fast (payment processing)
- User-facing requests where latency matters

**Asynchronous for:**
- Side effects that don't block the main operation (sending email)
- Fanout to multiple consumers (order created → inventory, shipping, analytics)
- Operations that can be retried (generating reports)
- Decoupling services with different uptime requirements

**Example from Netflix:**
When you click play on a video, the video stream starts synchronously - you need it now. But tracking that you watched it, updating recommendations, and billing happen asynchronously. You don't wait for those to finish before the video plays.

## 4. Data Management Patterns

Data is where distributed systems get messy. In a monolith, you join tables. In distributed systems, you can't.

### Database-per-Service

Each service has its own database. Other services cannot query it directly - they must go through the service's API.

**Why this matters:**

```
Orders DB:
- orders table
- order_lines table

Inventory DB:
- stock_items table
- warehouse_locations table
```

If the order service needs stock levels, it calls the inventory service API. It cannot do:

```sql
-- This is impossible when databases are separate
SELECT o.*, s.quantity_available
FROM orders.orders o
JOIN inventory.stock_items s ON o.product_id = s.product_id
```

**Benefits:**
- Each service can use the best database for its needs (Postgres for orders, Redis for caching, Elasticsearch for search)
- Schema changes don't require cross-team coordination
- Services can be deployed independently
- Clearer ownership

**Costs:**
- No joins across services
- No distributed transactions
- Data duplication required
- Eventual consistency

### Handling Joins Without Joins

**Pattern 1: Embed what you need**

When an order is created, copy the product name and price into the order:

```javascript
{
  orderId: "123",
  userId: "user-456",
  items: [
    {
      productId: "prod-789",
      productName: "Blue Widget",  // Copied from catalog
      priceAtPurchase: 29.99,       // Copied from catalog
      quantity: 2
    }
  ]
}
```

This is denormalization. The product name lives in two places. When it changes in the catalog, old orders still show the old name - which is actually what you want. Historical orders should reflect what the product was called when purchased.

**Pattern 2: Composite API**

The API gateway makes multiple requests and combines results:

```javascript
// API Gateway
async function getOrderDetails(orderId) {
  const order = await orderService.getOrder(orderId);

  const productIds = order.items.map(item => item.productId);
  const products = await catalogService.getProducts(productIds);

  // Combine the data
  return {
    ...order,
    items: order.items.map(item => ({
      ...item,
      productDetails: products.find(p => p.id === item.productId)
    }))
  };
}
```

This works for reads. It doesn't work for complex queries across services.

**Pattern 3: CQRS and Materialized Views**

Keep a read-optimized copy of the data for queries.

```javascript
// Orders service publishes events
eventBus.publish('order.created', orderData);

// Reporting service builds its own view
@Subscribe('order.created')
async function updateOrderReportView(event) {
  await reportingDB.execute(`
    INSERT INTO order_report_view
    (order_id, user_id, product_id, product_name, total)
    VALUES (?, ?, ?, ?, ?)
  `, [event.orderId, event.userId, event.productId,
      event.productName, event.total]);
}
```

The reporting database has a denormalized view optimized for queries. It's eventually consistent with the order service, but that's fine for reports.

### The Saga Pattern

When a business transaction spans multiple services, you need coordination without distributed transactions.

**Example:** Creating an order requires:
1. Validate customer credit
2. Reserve inventory
3. Create the order
4. Charge payment

If payment fails, you need to unreserve the inventory. You can't use a database transaction across services.

**Choreography-based saga:**

Each service publishes events and reacts to events:

```javascript
// 1. Order service starts the saga
await eventBus.publish('order.initiated', {
  orderId, userId, items
});

// 2. Inventory service reserves stock
@Subscribe('order.initiated')
async function reserveInventory(event) {
  const reserved = await inventory.reserve(event.items);
  if (reserved) {
    await eventBus.publish('inventory.reserved', event);
  } else {
    await eventBus.publish('inventory.failed', event);
  }
}

// 3. Payment service charges
@Subscribe('inventory.reserved')
async function chargePayment(event) {
  const charged = await payment.charge(event.userId, event.total);
  if (charged) {
    await eventBus.publish('payment.completed', event);
  } else {
    await eventBus.publish('payment.failed', event);
  }
}

// 4. Inventory service listens for payment failure
@Subscribe('payment.failed')
async function releaseInventory(event) {
  await inventory.release(event.orderId);
}
```

Each service knows its part. The full workflow emerges from local decisions.

**Orchestration-based saga:**

A coordinator explicitly manages the workflow:

```javascript
class OrderSaga {
  async execute(orderData) {
    const state = { orderId: uuid(), rollback: [] };

    try {
      // Step 1: Reserve inventory
      await inventory.reserve(orderData.items);
      state.rollback.push(() => inventory.release(state.orderId));

      // Step 2: Charge payment
      const payment = await payment.charge(orderData.userId, orderData.total);
      state.rollback.push(() => payment.refund(payment.id));

      // Step 3: Create order
      await orders.create({ ...orderData, orderId: state.orderId });

      return state.orderId;

    } catch (error) {
      // Rollback in reverse order
      for (const rollback of state.rollback.reverse()) {
        await rollback();
      }
      throw error;
    }
  }
}
```

This is more explicit but creates a central coordinator that knows about all services.

**Trade-offs:**
- Choreography: More decoupled, harder to understand the full flow
- Orchestration: Easier to understand, but the orchestrator becomes a coupling point

Chris Richardson's book "Microservices Patterns" covers sagas in depth. For most teams, start with orchestration - it's easier to debug.

## 5. Migration Strategies: From Monolith to Services

You've decided to extract a service. Don't rewrite from scratch. Strangler Fig pattern is how you do this safely.

### The Strangler Fig Pattern

Named after the strangler fig tree that grows around another tree until it can stand independently. Martin Fowler wrote about this in 2004, and it's still the safest way to break up a monolith.

**The process:**

1. **Identify a boundary** - Start with something peripheral, not core. Don't begin by extracting user authentication.
2. **Intercept calls** - Route new calls to the new service, old calls to the monolith
3. **Migrate incrementally** - Move features one at a time
4. **Eventually remove the old code** - When nothing calls it anymore

**Example: Extracting a recommendation engine**

```javascript
// 1. Monolith has recommendations built-in
class ProductController {
  async getProduct(productId) {
    const product = await db.getProduct(productId);
    const recommendations = await this.calculateRecommendations(productId);
    return { product, recommendations };
  }

  async calculateRecommendations(productId) {
    // Complex logic in the monolith
  }
}

// 2. Add adapter layer with feature flag
class ProductController {
  async getProduct(productId) {
    const product = await db.getProduct(productId);

    const recommendations = await featureFlags.isEnabled('new-recommendations')
      ? await recommendationServiceClient.getRecommendations(productId)
      : await this.calculateRecommendations(productId);

    return { product, recommendations };
  }
}

// 3. Gradually roll out to 1%, 10%, 50%, 100%
// 4. Remove old code when 100% traffic on new service
class ProductController {
  async getProduct(productId) {
    const product = await db.getProduct(productId);
    const recommendations = await recommendationServiceClient.getRecommendations(productId);
    return { product, recommendations };
  }
}
```

### Data Migration Strategy

The hard part isn't the code. It's the data.

**Phase 1: Dual writes**

```javascript
// Write to both databases
async function createOrder(orderData) {
  // Write to monolith DB
  const order = await monolithDB.orders.create(orderData);

  // Also write to new service
  try {
    await orderService.createOrder(orderData);
  } catch (error) {
    logger.error('Failed to write to new order service', error);
    // Don't fail the request - log and continue
  }

  return order;
}
```

You're writing to both places but only reading from the monolith. This builds up data in the new service.

**Phase 2: Dual reads with comparison**

```javascript
async function getOrder(orderId) {
  const monolithOrder = await monolithDB.orders.get(orderId);
  const serviceOrder = await orderService.getOrder(orderId);

  // Compare and log discrepancies
  if (!isEqual(monolithOrder, serviceOrder)) {
    logger.warn('Data mismatch', { monolithOrder, serviceOrder });
  }

  // Still return monolith data
  return monolithOrder;
}
```

You're verifying the new service has correct data without relying on it.

**Phase 3: Read from new service, fallback to monolith**

```javascript
async function getOrder(orderId) {
  try {
    return await orderService.getOrder(orderId);
  } catch (error) {
    logger.error('Order service failed, falling back', error);
    return await monolithDB.orders.get(orderId);
  }
}
```

Now the new service is primary. The monolith is the backup.

**Phase 4: Remove monolith code**

```javascript
async function getOrder(orderId) {
  return await orderService.getOrder(orderId);
}
```

The monolith no longer has order logic.

This process takes weeks or months, not days. Uber spent years moving from a monolith to microservices. They didn't do a big bang rewrite.

## 6. API Versioning and Contracts

Once you have multiple services talking to each other (or external clients), breaking changes become expensive. You need versioning.

### Semantic Versioning for APIs

Same as package versioning:
- **Major version** (v2): Breaking changes
- **Minor version** (v2.1): New features, backward compatible
- **Patch version** (v2.1.3): Bug fixes

```
GET /v2/products/123
```

**What's a breaking change?**

Breaking:
- Removing a field
- Renaming a field
- Changing a field type
- Adding a required field
- Changing error codes
- Changing authentication

Not breaking:
- Adding an optional field
- Adding a new endpoint
- Deprecating a field (but still returning it)

### Versioning Strategies

**1. URL versioning**

```
GET /v1/products/123
GET /v2/products/123
```

Pros: Explicit, easy to route
Cons: URL changes, have to maintain multiple versions

**2. Header versioning**

```
GET /products/123
Accept: application/vnd.myapp.v2+json
```

Pros: URL stays clean
Cons: Less visible, harder to test in browser

**3. Expand-and-contract**

Don't version at all. Support both old and new formats simultaneously:

```javascript
// API supports both old camelCase and new snake_case
{
  userId: "123",          // Deprecated but still returned
  user_id: "123",         // New format
  productName: "Widget",  // Old
  product_name: "Widget"  // New
}
```

Return both for a deprecation period. Eventually remove the old fields.

Stripe does this. Their API has a version date (like `2024-11-15`), and they guarantee old versions work for years.

### Consumer-Driven Contracts

The consumer defines what they need from the API. The provider must satisfy those contracts.

**Using Pact:**

```javascript
// Consumer test
describe('Product API', () => {
  it('should return product details', async () => {
    await provider.addInteraction({
      state: 'product 123 exists',
      uponReceiving: 'a request for product 123',
      withRequest: {
        method: 'GET',
        path: '/products/123'
      },
      willRespondWith: {
        status: 200,
        body: {
          id: '123',
          name: 'Blue Widget',
          price: 29.99
        }
      }
    });

    const product = await productClient.getProduct('123');
    expect(product.name).toBe('Blue Widget');
  });
});
```

The consumer publishes this contract. The provider runs tests to verify they satisfy it. If the provider changes the API in a way that breaks the contract, their tests fail before they deploy.

This catches breaking changes early. The catalog team can't accidentally break the order team.

## 7. Observability Across Services

In a monolith, you have a stack trace. In microservices, a request touches 5 services. You need correlation.

### The Three Pillars

**Logs:** What happened
**Metrics:** How much and how fast
**Traces:** Where did the request go

### Distributed Tracing

Every request gets a trace ID. Every service adds spans to that trace.

```javascript
// API Gateway starts the trace
const traceId = generateTraceId();

// Passes trace ID to downstream services
await fetch('http://orders-service/orders', {
  headers: {
    'X-Trace-Id': traceId,
    'X-Span-Id': generateSpanId(),
    'X-Parent-Span-Id': null
  }
});

// Orders service continues the trace
app.use((req, res, next) => {
  const span = tracer.startSpan('process-order', {
    traceId: req.headers['x-trace-id'],
    parentSpanId: req.headers['x-span-id']
  });

  req.span = span;
  next();
});

// When calling another service
await fetch('http://inventory-service/reserve', {
  headers: {
    'X-Trace-Id': req.headers['x-trace-id'],
    'X-Parent-Span-Id': req.span.id
  }
});
```

Now you can see the full path:

```
Trace abc123:
  API Gateway (50ms)
    → Orders Service (200ms)
      → Inventory Service (30ms)
      → Payment Service (500ms)  ← This is the slow part
```

**OpenTelemetry** is the standard. It works with Jaeger, Zipkin, Datadog, and others.

### Structured Logging

Log JSON, not strings:

```javascript
// Bad
logger.info(`User ${userId} created order ${orderId}`);

// Good
logger.info('order.created', {
  traceId: req.traceId,
  userId,
  orderId,
  total: order.total,
  itemCount: order.items.length
});
```

Now you can query: "Show me all failed orders over $100 in the last hour" instead of grepping for strings.

### Health Checks

Every service needs:

```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (req, res) => {
  const dbHealthy = await db.ping();
  const cacheHealthy = await redis.ping();

  if (dbHealthy && cacheHealthy) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({
      status: 'not ready',
      database: dbHealthy ? 'ok' : 'down',
      cache: cacheHealthy ? 'ok' : 'down'
    });
  }
});
```

Kubernetes uses this to decide if a pod should receive traffic.

## 8. When to Extract a Service

Not every module should be a service. Here's a framework.

### Extract When:

**1. Genuinely different scaling needs**

Your image resizing service maxes out CPU at 100 requests/second. Your API handles 10,000 requests/second but barely uses CPU. If they're in the same process, you have to scale both together.

**2. Different deployment frequency**

The pricing engine changes daily. The warehouse location service changes twice a year. If they're in the same monolith, every pricing change requires testing and deploying the warehouse code.

**3. Team autonomy blocked**

The payments team wants to deploy every day. The core platform deploys monthly. If payments is part of the monolith, they're stuck with monthly deploys.

**4. Different technology requirements**

You need Python for machine learning models but the rest of the system is Java. Okay, extract it.

**5. Security boundary**

PCI compliance requires the payment handling code to be isolated. Separate service with restricted access makes sense.

### Don't Extract When:

**1. Just because it's a "microservice architecture"**

If everything scales together, deploys together, and changes together, separating it creates overhead without benefit.

**2. Coordinating changes across services**

If every feature requires deploying three services in sequence, you haven't achieved independence.

**3. Complex distributed transactions**

If you're constantly doing sagas to maintain consistency, keep it in the monolith and use database transactions.

**4. Team is small**

Five people don't need fifty services. The coordination overhead exceeds the benefit.

### The Amazon "Two-Pizza Team" Rule

If a service is owned by a team larger than two pizzas can feed (roughly 8-10 people), it's probably too big. If a service is owned by less than one person (someone has fifteen services), you've over-split.

## 9. Practical Decision Framework

Here's how to actually make these decisions.

### Step 1: Map Current Dependencies

Draw what depends on what:

```
User Service → Order Service → Inventory Service
                 ↓                    ↓
           Email Service       Analytics Service
```

Count the arrows. If Order Service has 20 inbound dependencies, extracting it is risky.

### Step 2: Identify Change Patterns

For the past three months, what changed together?

If every time you change order processing you also change inventory, they're coupled. Separating them creates coordination overhead.

If order processing changes weekly and inventory changes monthly, separation might help.

### Step 3: Consider Team Structure

Conway's Law: Systems reflect the organization that builds them.

If you have separate teams for orders and inventory, separating the code matches the team structure. If one team owns both, separating creates unnecessary complexity.

### Step 4: Start With the Simplest Thing

Default to:
1. Modular monolith with enforced boundaries
2. Extract services only when you hit specific pain
3. Start with peripheral services (reporting, recommendations) not core (authentication, orders)

### Step 5: Measure Before and After

If you extract a service to improve deploy frequency, track deploy frequency. If it doesn't improve, you've added complexity for nothing.

If you extract for performance, measure performance before and after. Distributed systems are often slower than monoliths for low-scale workloads.

## 10. Practical Examples

### Example 1: E-commerce Modular Monolith

```
src/
├── catalog/
│   └── api/
│       └── catalog-api.ts          # Public interface
├── orders/
│   ├── domain/
│   │   └── order-aggregate.ts      # Business logic
│   ├── application/
│   │   └── order-service.ts
│   └── api/
│       └── order-api.ts             # Public interface
├── inventory/
│   ├── domain/
│   │   └── stock-management.ts
│   └── api/
│       └── inventory-api.ts         # Public interface
└── shared/
    └── events/
        └── domain-events.ts
```

**Communication:**

```javascript
// orders/application/order-service.ts
import { CatalogAPI } from '@app/catalog/api';
import { InventoryAPI } from '@app/inventory/api';
import { DomainEvents } from '@app/shared/events';

class OrderService {
  constructor(
    private catalogApi: CatalogAPI,
    private inventoryApi: InventoryAPI,
    private events: DomainEvents
  ) {}

  async createOrder(userId: string, items: OrderItem[]) {
    // Get product details from catalog
    const products = await this.catalogApi.getProducts(
      items.map(i => i.productId)
    );

    // Check inventory
    const available = await this.inventoryApi.checkAvailability(items);
    if (!available) {
      throw new Error('Insufficient inventory');
    }

    // Create order
    const order = Order.create(userId, items, products);
    await this.orderRepository.save(order);

    // Publish event for other modules
    await this.events.publish('order.created', {
      orderId: order.id,
      userId,
      items
    });

    return order;
  }
}
```

Everything runs in one process. Dependency injection provides the APIs. Communication is through published interfaces, not direct database access.

### Example 2: Extracting Image Processing

You have image uploads in the monolith. It's CPU-intensive and blocking other requests.

**Phase 1: Async within monolith**

```javascript
// Before: Synchronous blocking
async function uploadImage(file) {
  const resized = await resizeImage(file);  // Blocks for 2 seconds
  const url = await storage.save(resized);
  return url;
}

// After: Async with job queue
async function uploadImage(file) {
  const jobId = await imageQueue.enqueue('resize-image', {
    fileId: file.id,
    sizes: ['thumbnail', 'medium', 'large']
  });

  return { jobId, status: 'processing' };
}
```

Still a monolith, but processing happens asynchronously. Measure if this solves the problem.

**Phase 2: Extract to separate service**

Only if you still have issues:

```javascript
// Monolith uploads to storage
async function uploadImage(file) {
  const url = await storage.saveOriginal(file);

  await imageService.processImage({
    url,
    sizes: ['thumbnail', 'medium', 'large']
  });

  return { url, status: 'processing' };
}

// Separate image service
class ImageService {
  async processImage(request) {
    const original = await this.download(request.url);

    for (const size of request.sizes) {
      const resized = await this.resize(original, size);
      await storage.save(resized, `${request.url}-${size}`);
    }

    await eventBus.publish('image.processed', {
      originalUrl: request.url
    });
  }
}
```

Now you can scale image processing independently. Deploy Python image libraries without touching the main app.

### Example 3: Saga for Order Fulfillment

```javascript
class OrderFulfillmentSaga {
  async execute(order) {
    const saga = {
      orderId: order.id,
      completed: [],
      compensations: []
    };

    try {
      // Step 1: Reserve inventory
      await inventoryService.reserve({
        orderId: order.id,
        items: order.items
      });
      saga.completed.push('inventory-reserved');
      saga.compensations.push(() =>
        inventoryService.release(order.id)
      );

      // Step 2: Authorize payment
      const auth = await paymentService.authorize({
        userId: order.userId,
        amount: order.total
      });
      saga.completed.push('payment-authorized');
      saga.compensations.push(() =>
        paymentService.cancel(auth.id)
      );

      // Step 3: Create shipment
      const shipment = await shippingService.createShipment({
        orderId: order.id,
        address: order.shippingAddress,
        items: order.items
      });
      saga.completed.push('shipment-created');

      // Step 4: Capture payment
      await paymentService.capture(auth.id);
      saga.completed.push('payment-captured');

      // Success
      await orderService.markFulfilled(order.id);

    } catch (error) {
      // Rollback in reverse order
      logger.error('Saga failed, rolling back', {
        saga,
        error
      });

      for (const compensate of saga.compensations.reverse()) {
        try {
          await compensate();
        } catch (compensationError) {
          logger.error('Compensation failed', compensationError);
          // You're in trouble - manual intervention needed
        }
      }

      await orderService.markFailed(order.id, error);
      throw error;
    }
  }
}
```

This is orchestration-based. The saga coordinator knows all the steps. It's easier to understand than choreography for most teams.

## Wrapping Up

Architecture isn't about picking microservices or monolith. It's about managing complexity as your system grows.

The key decisions:
1. **Find the right boundaries** using domain-driven design
2. **Start with a modular monolith** and enforce module boundaries
3. **Choose communication patterns** based on coupling vs. consistency needs
4. **Plan for data** before you split services
5. **Version APIs** to enable independent evolution
6. **Build observability** so you can debug distributed systems
7. **Extract services** only when you have specific pain

Most systems should be modular monoliths longer than you think. The teams that succeed with microservices are the ones who got good at boundaries first.

When in doubt, make the change reversible. Feature flags and adapters let you try extraction without commitment. Measure whether it actually helped.

Your architecture should serve your team and your customers. Not the other way around.

---

## Real Life Case Studies

### [Dispatch Management: Progressive Architecture](/02-design/architecture-design/case-studies/dispatch-management/)

A B2B SaaS application that evolved from product-market fit validation (100 users) to enterprise scale (10,000+ users). Shows when and how to evolve from Surface Level to Mid-Depth based on quantitative triggers (response times, user scale, manual operation overhead).

**Topics covered:** Evolution framework, Schema-per-tenant multi-tenancy, Redis queue migration, WebSocket implementation, Let's Encrypt automation, ELK stack integration

**Focus on Mid-Depth:** See [Maturity Levels Overview](/02-design/architecture-design/case-studies/dispatch-management-maturity-levels/) for the specific triggers that justified each evolution step.

### [Microfrontend vs. Monolith Decision](/02-design/architecture-design/case-studies/microfrontend-vs-monolith/)

See a complete quantitative framework for architecture decisions in action. This case study demonstrates how to use documented scale thresholds, team capability assessment, and financial modeling to make evidence-based choices. **Framework focus: 35-45 minutes** to understand the methodology.
