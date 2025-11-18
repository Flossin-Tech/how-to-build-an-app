---
title: "Architecture Design - Deep Water"
phase: "02-design"
topic: "architecture-design"
depth: "deep-water"
reading_time: 50
prerequisites: ["architecture-design-surface", "architecture-design-mid-depth"]
related_topics: ["api-design", "database-design", "state-management-design", "performance-scalability-design"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Architecture Design - Deep Water

The mid-depth architecture guide covered modular monoliths, service boundaries, and when to extract services. Those patterns work well until you're coordinating deployments across 50 microservices, handling regulatory requirements across three continents, or debugging a cascade failure where one slow service brought down your entire platform.

This is where simple patterns break down. Not because they're wrong - they still apply - but because you're dealing with constraints that force architectural decisions most developers never encounter. When you need to maintain 99.99% uptime during deployments, when data residency laws dictate your database topology, when a single user action triggers processing across 20 services - you need patterns specifically designed for these problems.

This guide covers the architecture decisions that matter at enterprise scale, under regulatory constraints, and in truly distributed systems. These are the patterns that prevent 3am incidents when you're operating systems that can't afford to go down.

## Advanced Architectural Patterns

### Event Sourcing at Scale

Event sourcing sounds elegant in theory: store every state change as an immutable event, rebuild current state by replaying events. In practice, it introduces complexity that only pays off when you have specific needs.

**When event sourcing actually helps**:

You need a complete audit trail for regulatory compliance. Financial systems, healthcare records, legal documents - anything where "who changed what and when" matters for audits. A traditional database with UPDATE statements loses history. Event sourcing preserves it by design.

You need temporal queries. "What was this customer's account balance on March 15?" With traditional databases, you'd need to maintain historical snapshots. With event sourcing, replay events up to that timestamp.

You need to recover from bugs by replaying events differently. You discover a calculation error that's been running for three months. With event sourcing, fix the bug and replay events to get correct state.

**Real example from Uber**: Their trip pricing system uses event sourcing. Every event (trip requested, driver assigned, trip completed, fare calculated) is stored immutably. When they discovered a fare calculation bug affecting millions of trips, they replayed events with the corrected logic to recalculate accurate fares. With a traditional database, they'd have lost the historical context needed to fix past trips.

**The implementation reality**:

```javascript
// Trip events stored immutably
const events = [
  { type: 'TripRequested', timestamp: '2025-11-15T10:00:00Z', data: { userId: 'u123', pickup: {...}, dropoff: {...} } },
  { type: 'DriverAssigned', timestamp: '2025-11-15T10:02:30Z', data: { driverId: 'd456' } },
  { type: 'TripStarted', timestamp: '2025-11-15T10:05:00Z', data: { actualPickupLocation: {...} } },
  { type: 'TripCompleted', timestamp: '2025-11-15T10:35:00Z', data: { actualRoute: [...], distance: 8.2 } },
  { type: 'FareCalculated', timestamp: '2025-11-15T10:35:15Z', data: { baseFare: 12.50, surge: 1.5, total: 18.75 } }
];

// Current state is derived by replaying events
function getCurrentState(tripId) {
  const tripEvents = eventStore.getEvents(tripId);
  return tripEvents.reduce((state, event) => {
    return applyEvent(state, event);
  }, initialState);
}
```

**The hidden costs**:

Event replay gets slow. Netflix had event streams where replaying to current state took 45 minutes. They added periodic snapshots - save state every 1000 events, replay from the snapshot instead of from the beginning. Now replay takes 30 seconds.

Event schema evolution is hard. You have events from 2020 when `TripRequested` didn't include `requestedVehicleType` because you didn't offer that feature yet. Your event handlers need to work with both old and new schemas forever, or you rebuild your entire event store (expensive).

Storage grows unbounded unless you implement compaction. Kafka uses log compaction - for each key, keep only the latest event. This works if you don't need full history. Otherwise, plan for terabytes of event storage.

**When not to use event sourcing**: CRUD applications where current state is all you need. User profiles, product catalogs, content management - these don't benefit from event sourcing complexity. The audit trail from database triggers and change tracking is good enough.

### CQRS (Command Query Responsibility Segregation)

Martin Fowler warns that CQRS adds "risky complexity" and most implementations he's seen caused serious problems. Use it only when you have genuinely different optimization needs for reads versus writes.

**The legitimate use case**: Your write model is a complex domain with strict consistency requirements. Your read model needs to be denormalized for performance. Trying to use one model for both creates a mess.

**Real example from Netflix**: Their recommendation system has complex write logic (user watched video X, update viewing history, update preferences, train ML model). But reads are simple - get recommendations for user. They separated these:

**Write side** (Command):
```javascript
class UpdateViewingHistory {
  async execute(userId, videoId) {
    // Complex domain logic with transactions
    await db.transaction(async (tx) => {
      await tx.viewingHistory.create({ userId, videoId, timestamp: now() });
      await tx.userPreferences.updateFromView(userId, videoId);
      await eventBus.publish('video.viewed', { userId, videoId });
    });
  }
}
```

**Read side** (Query):
```javascript
class GetRecommendations {
  async execute(userId) {
    // Optimized read from denormalized view
    return recommendationsCache.get(userId) ||
           await recommendationsDB.getPrecomputed(userId);
  }
}
```

The read side is built asynchronously from events. When `video.viewed` fires, a background job updates the precomputed recommendations. Users don't wait for this processing.

**Why this works**: Writes need strong consistency (viewing history must be accurate). Reads tolerate eventual consistency (recommendations being 5 seconds stale is fine). Different databases optimized differently - Postgres for writes, Redis for reads.

**The complexity cost**: You now maintain two models of the same data. When the domain changes, both models need updating. You need reconciliation logic when the read model diverges from write model. You need monitoring to detect when eventual consistency delays are too long.

**When CQRS is premature**: You have a CRUD app where reads and writes both hit the same simple data. Adding CQRS just makes everything harder without benefit. Start with a unified model. Extract CQRS only when read/write optimization needs diverge significantly.

### Hexagonal Architecture (Ports and Adapters)

The theory: isolate your business logic from external dependencies (databases, APIs, queues) by defining ports (interfaces) and adapters (implementations). Your domain doesn't know if it's using Postgres or MongoDB, HTTP or gRPC.

**Why this matters at scale**: You started with Postgres. You're now hitting 10,000 writes/sec and need to shard. Or you need to migrate from REST to gRPC for performance. Or regulatory requirements force you to switch cloud providers.

With hexagonal architecture, your domain logic is isolated. The external dependencies are behind interfaces. Swapping implementations doesn't require rewriting business logic.

**Real implementation**:

```typescript
// Port (interface) - domain defines what it needs
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(orderId: string): Promise<Order>;
  findByCustomer(customerId: string): Promise<Order[]>;
}

// Domain logic depends on the interface, not implementation
class OrderService {
  constructor(private orderRepo: OrderRepository) {}

  async createOrder(customerId: string, items: OrderItem[]): Promise<Order> {
    const order = Order.create(customerId, items);
    await this.orderRepo.save(order);
    return order;
  }
}

// Adapter 1: Postgres implementation
class PostgresOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> {
    await db.query('INSERT INTO orders ...', order.toRow());
  }
  // ... other methods
}

// Adapter 2: MongoDB implementation (swap without changing domain)
class MongoOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> {
    await db.collection('orders').insertOne(order.toDocument());
  }
  // ... other methods
}
```

**When Spotify migrated to Google Cloud**: Their hexagonal architecture meant domain logic didn't care about infrastructure. They swapped AWS adapters for GCP adapters. Domain logic untouched. Migration still took months, but would've taken years without this isolation.

**The testing benefit**: You can test domain logic without a database. Create a fake repository implementation:

```typescript
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(orderId: string): Promise<Order> {
    return this.orders.get(orderId);
  }
}

// Tests run fast without database setup
const orderService = new OrderService(new InMemoryOrderRepository());
```

**When not to use it**: Small applications where you'll never swap databases or message queues. The abstraction adds indirection without benefit. If you're building an internal tool that will use Postgres forever, just use Postgres directly.

## Distributed Systems Realities

### The CAP Theorem in Practice

The textbook version: in a distributed system, you can't simultaneously have Consistency, Availability, and Partition tolerance. You have to pick two.

Martin Kleppmann's reality check: CAP theorem is "too simplistic and too widely misunderstood to be of much use." The real question isn't "Does my system satisfy CAP?" It's "How sensitive is my operation latency to network delays?"

**The actual trade-off**: When a network partition happens (and it will), you either:
1. **Choose availability**: Respond to requests even if data might be inconsistent
2. **Choose consistency**: Refuse to respond until you can guarantee consistency

There's no "have both" option during the partition. After the partition heals, you need reconciliation.

**Real example from Amazon DynamoDB**: During network splits, they chose availability. Shopping cart operations continue even if databases are partitioned. When partition heals, they merge cart contents from both sides. Better to show a cart with duplicate items than to block purchases.

**When this goes wrong**: You choose availability for a banking system. During partition, user withdraws $500 from ATM A while database A thinks balance is $600. Simultaneously, database B thinks balance is $600, user withdraws $500 from ATM B. Both succeed. When partition heals, account is -$400. This is why banks choose consistency - ATM transactions block if database is unreachable.

### Consistency Models

**Linearizability** (strongest): Operations appear to happen instantaneously at some point between start and finish. Reads always see the most recent write. This is what people mean by "strong consistency."

Cost: Requires coordination between nodes. Every write must be acknowledged by majority before completing. Adds latency.

**Eventual consistency** (weakest): If no new updates occur, eventually all nodes will converge to same value. No guarantees on how long "eventually" takes.

Cost: Your application must handle reading stale data. UI needs to show "saving..." states and optimistic updates.

**Real numbers from Stripe**: Their payment APIs use linearizable consistency. When a charge succeeds, that must be immediately visible to all subsequent reads. They pay the latency cost (p99 latency is 400ms instead of 50ms) because consistency requirements are non-negotiable.

Their analytics APIs use eventual consistency. If a dashboard shows yesterday's transaction count with a 5-minute delay, nobody cares. They optimize for throughput (processing 100K+ events/sec) instead of immediate consistency.

### Distributed Transactions and Sagas

Two-phase commit (2PC) is the textbook solution for distributed transactions. In practice, it's problematic:

**Why 2PC fails**: It requires all participants to be available. If one service is down, the entire transaction blocks. In microservices with 20 services, if any one service has 99.9% uptime, your transaction has 98% reliability (0.999^20). Unacceptable.

**The saga pattern alternative**: Break the transaction into local transactions with compensating actions.

**Real example from Airbnb booking flow**:

```javascript
// Without saga (traditional transaction - doesn't work across services)
async function bookReservation(listingId, guestId, dates) {
  await db.transaction(async (tx) => {
    await reservationService.createReservation(listingId, guestId, dates);
    await paymentService.chargeGuest(guestId, amount);
    await calendarService.blockDates(listingId, dates);
    await notificationService.notifyHost(listingId);
  });
  // Problem: each service has its own database - can't use one transaction
}

// With orchestrated saga
class BookingOrchestrator {
  async execute(listingId, guestId, dates) {
    const saga = {
      completed: [],
      compensations: []
    };

    try {
      // Step 1: Create reservation
      const reservationId = await reservationService.create(listingId, guestId, dates);
      saga.completed.push('reservation');
      saga.compensations.push(() => reservationService.cancel(reservationId));

      // Step 2: Charge payment
      const chargeId = await paymentService.charge(guestId, amount);
      saga.completed.push('payment');
      saga.compensations.push(() => paymentService.refund(chargeId));

      // Step 3: Block calendar
      await calendarService.block(listingId, dates);
      saga.completed.push('calendar');
      saga.compensations.push(() => calendarService.unblock(listingId, dates));

      // Step 4: Notify (no compensation needed - notification can't be unsent)
      await notificationService.notify(listingId, guestId);

      return { success: true, reservationId };

    } catch (error) {
      // Rollback by calling compensations in reverse
      for (const compensate of saga.compensations.reverse()) {
        try {
          await compensate();
        } catch (compensationError) {
          // Log error - manual intervention needed
          await alerting.criticalError('saga-compensation-failed', {
            saga,
            error: compensationError
          });
        }
      }
      throw error;
    }
  }
}
```

**The hard parts**:

Compensating actions must be idempotent. If the network fails and you retry, running the compensation twice shouldn't break things.

Some actions can't be compensated. You sent an email notification - you can't unsend it. You charged a credit card - refunds take days and cost fees. Design sagas so uncompensatable actions happen last.

Partial failures create inconsistent states. Payment succeeded but calendar service is down. The saga fails, tries to refund payment, but refund API is also down. You're stuck with a charged customer and no reservation. You need monitoring that alerts on stuck sagas and manual intervention processes.

**When sagas work well**: E-commerce order processing, booking systems, anything with clear rollback semantics. The operations have natural compensation (cancel order, refund payment, release inventory).

**When sagas are wrong**: Anything requiring strong consistency across services. If you're doing sagas to work around the fact that your service boundaries are wrong, fix the boundaries instead.

## Enterprise Domain-Driven Design

### Tactical Patterns for Complex Domains

DDD tactical patterns (entities, value objects, aggregates) matter when your domain is complex enough that organizing it incorrectly creates bugs.

**Entities vs Value Objects**:

An entity has identity - two instances with the same data are still different if they have different IDs. A value object has no identity - two instances with same data are identical.

```typescript
// Entity: User identity matters
class User {
  id: string;
  email: string;
  name: string;

  // Two users with same email/name are different people
  equals(other: User): boolean {
    return this.id === other.id;
  }
}

// Value Object: Money has no identity
class Money {
  amount: number;
  currency: string;

  // Two Money instances with same amount/currency are identical
  equals(other: Money): boolean {
    return this.amount === other.amount &&
           this.currency === other.currency;
  }

  // Value objects are immutable - operations return new instances
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

**Why this matters**: Value objects are immutable and comparable by value. This makes them safe to share and cache. Entities need careful lifecycle management and can't be cached by value.

### Aggregate Design

Aggregates are consistency boundaries. Everything inside an aggregate changes together in a transaction. Changes across aggregates are eventually consistent.

**Bad aggregate design** from a real e-commerce system:

```typescript
// Aggregate that's too large
class Order {
  id: string;
  customer: Customer;  // Full customer object
  items: OrderItem[];
  shippingAddress: Address;
  payment: Payment;
  inventory: InventoryReservation[];

  // Problem: changing customer profile requires loading every order
  // Problem: checking inventory requires loading entire order
  // Problem: aggregate spans multiple bounded contexts
}
```

**Good aggregate design**:

```typescript
// Order aggregate owns only what must be consistent together
class Order {
  id: string;
  customerId: string;  // Reference, not embedded
  items: OrderItem[];
  total: Money;
  status: OrderStatus;

  // Business invariant enforced within aggregate
  addItem(item: OrderItem): void {
    if (this.status !== OrderStatus.Draft) {
      throw new Error('Cannot modify submitted order');
    }
    this.items.push(item);
    this.recalculateTotal();
  }

  private recalculateTotal(): void {
    this.total = this.items
      .map(item => item.price.multiply(item.quantity))
      .reduce((sum, price) => sum.add(price));
  }
}

// Customer is separate aggregate
class Customer {
  id: string;
  email: string;
  shippingAddresses: Address[];
  // Can change independently of orders
}

// Inventory is separate aggregate
class InventoryItem {
  productId: string;
  warehouseId: string;
  quantityAvailable: number;
  reserved: Map<orderId, quantity>;
  // Can change independently of orders
}
```

**The rule**: If data must be consistent within a single transaction, it belongs in the same aggregate. If eventual consistency is acceptable, use separate aggregates.

**Real mistake from healthcare system**: They made Patient the aggregate root with embedded Appointments, MedicalRecords, Prescriptions, BillingRecords. Result: every operation locked the entire patient record. Booking an appointment blocked viewing medical history. The system ground to a halt under load.

**The fix**: Separate aggregates for Patient, Appointment, MedicalRecord, Prescription, BillingRecord. They're linked by patientId reference. Reading medical records doesn't lock appointment booking. System went from 50 concurrent users to 5,000.

### Event Storming for Finding Boundaries

Event storming is a workshop technique for discovering domain boundaries. You gather domain experts and developers, put sticky notes on a wall, and map out domain events.

**The process**:

1. **Orange sticky notes**: Domain events (things that happened) - "Order Placed," "Payment Processed," "Item Shipped"
2. **Blue sticky notes**: Commands (things users do) - "Place Order," "Cancel Order"
3. **Yellow sticky notes**: Aggregates (things that handle commands and emit events)
4. **Pink sticky notes**: External systems
5. **Purple sticky notes**: Policies (when this event happens, trigger this command)

**What you discover**: Events cluster around certain aggregates. The clusters reveal bounded contexts. When events in one cluster rarely interact with events in another cluster, that's a natural service boundary.

**Real example from logistics company**: They ran event storming for their shipping system. Events clustered into three groups:
- Order Management (order placed, order cancelled, order updated)
- Route Planning (route calculated, driver assigned, route optimized)
- Delivery Tracking (delivery attempted, delivery completed, exception occurred)

Each cluster became a separate bounded context. The contexts communicate through events. Order Management publishes "Order Ready for Delivery," Route Planning subscribes and publishes "Route Assigned," Delivery Tracking subscribes and publishes delivery status.

The key insight: they initially thought it was one big "Shipping" domain. Event storming revealed three distinct subdomains with clear boundaries. This prevented them from building a tangled monolith.

## Performance Architecture at Scale

### Query Optimization for Distributed Systems

When your database is on one server and your application is on another, every query crosses the network. At scale, this is your primary bottleneck.

**The N+1 query problem** hits hard in distributed systems:

```javascript
// Bad: N+1 queries across network
async function getOrdersWithCustomers(limit) {
  const orders = await db.query('SELECT * FROM orders LIMIT ?', limit);

  for (const order of orders) {
    // Each iteration makes a network request to database
    order.customer = await db.query(
      'SELECT * FROM customers WHERE id = ?',
      order.customer_id
    );
  }
  return orders;
}
// Result: 1 query + 100 queries = 101 network round trips
// At 5ms per round trip = 505ms
```

**The fix**: Batch the queries:

```javascript
// Good: 2 queries total
async function getOrdersWithCustomers(limit) {
  const orders = await db.query('SELECT * FROM orders LIMIT ?', limit);
  const customerIds = orders.map(o => o.customer_id);

  const customers = await db.query(
    'SELECT * FROM customers WHERE id IN (?)',
    customerIds
  );
  const customerMap = new Map(customers.map(c => [c.id, c]));

  orders.forEach(order => {
    order.customer = customerMap.get(order.customer_id);
  });

  return orders;
}
// Result: 2 network round trips = 10ms (50x faster)
```

**At GitHub scale**: They have repositories with thousands of pull requests. Loading PR list without optimization would make 10,000+ queries. They use DataLoader (same pattern as above) to batch all author/reviewer/status queries. Page load time went from 45 seconds to 1.2 seconds.

### Multi-Layer Caching Strategy

Caching is the only way to serve millions of requests per second. But naive caching creates cache consistency problems.

**The layers**:

1. **CDN edge cache** (CloudFront, Fastly): Static assets and public content. Closest to users, highest cache hit rate, but can only cache public content.

2. **Application cache** (Redis, Memcached): Database query results, computed values, session data. Shared across application servers.

3. **In-process cache** (in-memory maps): Hot data that changes rarely. Fastest, but duplicated across servers.

4. **Database query cache**: Built into database, caches query results.

**Real architecture from Reddit**:

```
User request
  ↓
CDN (Fastly)
  ├─ Cache hit: return immediately (95% of requests)
  └─ Cache miss
      ↓
Application Server
  ├─ In-process cache (Go maps)
  │   └─ Cache hit: return in <1ms
  └─ Cache miss
      ↓
Redis cluster
  ├─ Cache hit: return in 2ms
  └─ Cache miss
      ↓
PostgreSQL (with query cache)
  └─ Return in 50ms, populate caches
```

**The hard part**: Cache invalidation. When data changes, which caches need updating?

**Pattern 1: TTL-based invalidation** (simplest):
```javascript
cache.set('user:123', userData, { ttl: 300 }); // 5 minute TTL
```
Data can be stale for up to 5 minutes. Fine for non-critical data. Terrible for inventory counts or pricing.

**Pattern 2: Event-based invalidation**:
```javascript
// When data changes, publish event
await db.updateUser(userId, changes);
await eventBus.publish('user.updated', { userId });

// Cache listens for events
eventBus.subscribe('user.updated', async (event) => {
  await cache.delete(`user:${event.userId}`);
});
```

**Pattern 3: Write-through cache**:
```javascript
async function updateUser(userId, changes) {
  await db.updateUser(userId, changes);
  const freshData = await db.getUser(userId);
  await cache.set(`user:${userId}`, freshData);
}
```

**Stripe's approach**: They use write-through caching with event-based invalidation as backup. Most cache updates happen synchronously on writes. Events catch any missed invalidations. Plus TTLs as final safety (5 minutes for most data). This gives them 99.9% cache hit rate with consistency guarantees.

### Connection Pooling

Every database connection consumes memory on the database server. PostgreSQL: ~10MB per connection. With 1000 connections, that's 10GB just for connection overhead.

**The problem**: Without pooling, every request opens a connection. At 1000 req/sec, you're opening/closing 1000 connections/sec. Database spends more time managing connections than executing queries.

**The solution**: Connection pool maintains persistent connections. Requests borrow connections, use them, return them.

```javascript
// Without pooling (bad)
async function getUser(userId) {
  const conn = await db.connect();  // Expensive: TCP handshake, auth
  const user = await conn.query('SELECT * FROM users WHERE id = ?', userId);
  await conn.close();  // Wasteful: connection just opened
  return user;
}

// With pooling (good)
const pool = new Pool({
  host: 'db.example.com',
  database: 'myapp',
  max: 20,  // Maximum 20 connections
  idleTimeoutMillis: 30000
});

async function getUser(userId) {
  const conn = await pool.acquire();  // Reuses existing connection
  const user = await conn.query('SELECT * FROM users WHERE id = ?', userId);
  pool.release(conn);  // Returns to pool, doesn't close
  return user;
}
```

**Sizing the pool**: Too few connections and requests queue waiting. Too many and you overwhelm the database.

**The formula** from HikariCP (popular Java connection pool):
```
connections = ((core_count * 2) + effective_spindle_count)
```

For a 4-core database with SSD (effectively infinite spindles): 4 * 2 + 1 = 9 connections.

Counter-intuitive but proven: small pools perform better than large pools. A 10-connection pool often outperforms a 100-connection pool because less time is spent on connection management.

**Discord's numbers**: They reduced their PostgreSQL connection pool from 100 to 10 connections per application server. CPU usage on database dropped 40%. Query throughput increased 25%. The overhead of managing 100 connections was significant.

## Real-World Case Studies

### Uber: From Monolith to Microservices

**2012**: Uber was a Python monolith. One codebase, one database, one deployment. It worked fine for San Francisco.

**2014**: Expanding to 20 cities. Monolith had problems:
- Deploy took 30 minutes, blocked all development
- Database at 80% CPU, couldn't shard the monolith
- Every team blocked on every other team

**The migration strategy**: They didn't rewrite. They used strangler fig pattern to gradually extract services.

**First extraction**: Trip management. High value, clear boundary, 60% of database load.

```
Before:
  Monolith (trip logic + dispatch + billing + everything)
    ↓
  PostgreSQL (one database)

After:
  Monolith (dispatch + billing + everything except trips)
    ↓
  PostgreSQL (non-trip tables)

  Trip Service (trip logic only)
    ↓
  PostgreSQL (trips table only)
```

**The process**:
1. Created new trip service with copy of trip logic
2. Added feature flag in monolith: route 1% of trip requests to new service
3. Monitored for discrepancies between monolith and service results
4. Gradually increased to 10%, 50%, 100% over 3 months
5. Deleted trip code from monolith

**What they learned**: Service extraction took 4x longer than estimated. Most time spent on:
- Database migration (moving trips table to separate database)
- Handling transactions that spanned old monolith and new service
- Building monitoring to detect inconsistencies

**2015-2017**: Extracted 100+ more services. Dispatch, billing, mapping, surge pricing, driver onboarding, background checks.

**2018**: 2,200+ microservices. New problem: distributed monolith. Services made synchronous calls to each other. One slow service cascaded failures.

**The fix**: Move to async event-driven architecture. Services publish events, other services subscribe. Synchronous calls only for user-facing requests.

**Current state**: Mostly async communication. Circuit breakers and fallbacks on every external call. Achieved 99.99% uptime (4.38 minutes downtime per month) across millions of requests/sec.

### Netflix: Chaos Engineering

**The problem**: With hundreds of microservices, failures are constant. Not "if" but "when."

**Traditional approach**: Prevent failures through testing. Netflix's approach: assume failures happen, build systems that survive them.

**Chaos Monkey** (2011): Randomly kills production servers during business hours.

```javascript
// Simplified Chaos Monkey logic
async function chaosMonkey() {
  while (true) {
    await sleep(random(60, 300) * 1000);  // Random 1-5 minutes

    const instances = await aws.listInstances({
      environment: 'production',
      excludeTags: ['chaos-monkey-exempt']
    });

    const victim = instances[random(0, instances.length)];

    logger.info('Chaos Monkey terminating instance', {
      instanceId: victim.id,
      service: victim.service
    });

    await aws.terminateInstance(victim.id);
  }
}
```

**Why this works**: Forces engineers to build resilient systems. If your service can't handle one server dying, you find out immediately (during business hours, when you're there to fix it) rather than at 3am during an incident.

**Evolution**: Chaos Kong (kills entire AWS region), Chaos Gorilla (kills entire availability zone), Latency Monkey (adds random latency to requests).

**Real incident prevented by Chaos Monkey**: In 2012, AWS had major outage in us-east-1 region. Most services went down. Netflix stayed up. Why? Chaos Monkey had been killing their servers randomly for a year. Every service had fallbacks, circuit breakers, and multi-region redundancy. They'd already experienced "simulated outages" hundreds of times.

**The lesson**: You can't prevent failures in distributed systems. You can only prepare for them.

### Airbnb: Data Consistency in Booking System

**The hard problem**: Booking a listing involves multiple consistency requirements:
- Calendar must be blocked (can't double-book)
- Payment must be processed
- Host and guest must be notified
- Reputation score must update

These span multiple databases and services. Traditional transaction won't work.

**Their solution**: Orchestrated saga with compensation logic:

```javascript
class BookingSaga {
  async execute(listingId, guestId, checkIn, checkOut) {
    const saga = new SagaLog(this.id);

    try {
      // Reserve calendar (holds for 10 minutes)
      const reservationToken = await calendar.reserve(listingId, checkIn, checkOut);
      saga.record('calendar.reserved', reservationToken);

      // Validate guest eligibility
      await guestService.validateEligibility(guestId);
      saga.record('guest.validated');

      // Authorize payment (doesn't charge yet)
      const authToken = await payment.authorize(guestId, amount);
      saga.record('payment.authorized', authToken);

      // Create booking record
      const booking = await bookings.create({
        listingId, guestId, checkIn, checkOut, status: 'pending'
      });
      saga.record('booking.created', booking.id);

      // Capture payment (actually charges)
      await payment.capture(authToken);
      saga.record('payment.captured');

      // Confirm calendar reservation
      await calendar.confirm(reservationToken);
      saga.record('calendar.confirmed');

      // Update booking status
      await bookings.updateStatus(booking.id, 'confirmed');

      // Send notifications (non-critical, happens async)
      await events.publish('booking.confirmed', { bookingId: booking.id });

      return { success: true, bookingId: booking.id };

    } catch (error) {
      await this.compensate(saga, error);
      throw error;
    }
  }

  async compensate(saga, error) {
    const steps = saga.getCompletedSteps();

    // Undo in reverse order
    if (steps.includes('payment.captured')) {
      await payment.refund(saga.data.authToken);
    }
    if (steps.includes('calendar.reserved')) {
      await calendar.release(saga.data.reservationToken);
    }
    if (steps.includes('booking.created')) {
      await bookings.updateStatus(saga.data.bookingId, 'failed');
    }

    // Log for manual review if compensation fails
    await incidents.create({
      type: 'saga-failed',
      saga: saga.id,
      error: error.message,
      requiresManualReview: true
    });
  }
}
```

**What makes this work**:

Calendar reservation has a timeout. If payment fails, reservation automatically releases after 10 minutes. This prevents orphaned reservations.

Payment authorization is separate from capture. Authorization just checks that funds exist and holds them. Capture actually charges. If anything fails before capture, no money moved.

Booking record is created early with 'pending' status. If saga fails, booking exists but is marked failed. Customer support can see it and understand what happened.

Notifications happen asynchronously after critical steps succeed. Failure to send notification doesn't fail the booking.

**Metrics**: This saga approach gave them 99.95% booking success rate. The 0.05% failures are mostly legitimate (payment declined, calendar unavailable). Less than 0.001% are saga failures requiring manual intervention.

### Stripe: API Reliability at Scale

**The requirement**: Financial APIs must never lose data. Ever.

**Their architecture**:

**Idempotency keys**: Every request includes a unique idempotency key. If request is retried (network failure, timeout), same key prevents duplicate charges.

```javascript
// Client includes idempotency key
await stripe.charges.create({
  amount: 5000,
  currency: 'usd',
  source: 'tok_visa'
}, {
  idempotencyKey: 'order-123-attempt-1'
});

// If request times out and client retries with same key
await stripe.charges.create({
  amount: 5000,
  currency: 'usd',
  source: 'tok_visa'
}, {
  idempotencyKey: 'order-123-attempt-1'  // Same key
});
// Stripe detects duplicate, returns original charge without creating new one
```

**Implementation**:

```javascript
async function createCharge(chargeData, idempotencyKey) {
  // Check if this idempotency key was already processed
  const existing = await idempotencyCache.get(idempotencyKey);
  if (existing) {
    return existing.result;  // Return cached result
  }

  // Lock the idempotency key to prevent concurrent duplicates
  const lock = await locks.acquire(idempotencyKey, { timeout: 30000 });

  try {
    // Process the charge
    const charge = await db.transaction(async (tx) => {
      const chargeId = generateId();
      await tx.charges.insert({ id: chargeId, ...chargeData });

      // Store idempotency key mapping
      await tx.idempotency.insert({
        key: idempotencyKey,
        chargeId,
        createdAt: now()
      });

      return { id: chargeId, ...chargeData };
    });

    // Cache for fast future lookups
    await idempotencyCache.set(idempotencyKey, {
      result: charge,
      ttl: 86400  // 24 hours
    });

    return charge;

  } finally {
    await lock.release();
  }
}
```

**Write-ahead logging**: Before processing any mutation, write it to durable log. If server crashes mid-request, replay log on startup.

**Multi-region replication**: Every write goes to 3+ regions. Can lose an entire region and recover.

**Metrics**: 99.999% API uptime (5.26 minutes downtime per year). Their architecture makes this possible.

## Anti-Patterns at Scale

### The Distributed Monolith

You have microservices, but they're tightly coupled. Every deployment requires coordinating 10 services. Changes cascade across service boundaries. You got all the complexity of microservices with none of the benefits.

**How it happens**:

```javascript
// Order service calls inventory service synchronously
async function createOrder(items) {
  for (const item of items) {
    // Synchronous call - if inventory service is down, orders are down
    const available = await inventoryService.checkAvailability(item.productId);
    if (!available) {
      throw new Error('Out of stock');
    }
  }

  // Calls payment service synchronously
  await paymentService.charge(userId, total);

  // Calls shipping service synchronously
  await shippingService.createShipment(orderId);

  // If any service is slow, entire order is slow
}
```

Every service depends on every other service being fast and available. One slow service blocks everything.

**The fix**: Move to async events with eventual consistency:

```javascript
async function createOrder(items) {
  // Create order optimistically
  const order = await orders.create({
    items,
    status: 'pending'
  });

  // Publish event - other services react asynchronously
  await events.publish('order.created', {
    orderId: order.id,
    items,
    userId
  });

  return order;
}

// Inventory service subscribes
events.subscribe('order.created', async (event) => {
  const reserved = await inventory.reserve(event.items);
  if (!reserved) {
    await events.publish('order.inventory-unavailable', {
      orderId: event.orderId
    });
  }
});

// Order service handles inventory failures
events.subscribe('order.inventory-unavailable', async (event) => {
  await orders.updateStatus(event.orderId, 'cancelled');
  await events.publish('order.cancelled', event);
});
```

Now services are decoupled. Inventory service being slow doesn't block order creation. Trade-off: eventual consistency. The order might be cancelled minutes later if inventory unavailable.

### Premature Microservices Extraction

You split into microservices before understanding domain boundaries. Now you're constantly refactoring across service boundaries.

**Real example**: Company split user profile into separate service from authentication. Seemed logical - different concerns.

Problem: Every auth request needed user profile (name, role). Authentication service had to call user profile service. Added 20ms latency to every request. At 10,000 req/sec, that's 200 CPU-seconds wasted on network calls.

**The fix**: They merged authentication and user profile back into one service. Latency dropped to 2ms. Sometimes a monolith is right answer.

**The lesson**: Split when you have genuine independent scaling needs or team autonomy requirements. Don't split just because you can.

### Shared Database Across Services

You have microservices but they share a database. Services write to each other's tables. You can't deploy services independently because schema changes break other services.

```javascript
// Order service writes directly to inventory table
async function createOrder(items) {
  await db.transaction(async (tx) => {
    await tx.orders.insert({ ... });

    // Writing to inventory table owned by inventory service - bad!
    await tx.inventory.update({
      productId: items[0].productId,
      quantity: db.raw('quantity - ?', items[0].quantity)
    });
  });
}
```

**Why this breaks**: Inventory service can't change its schema without coordinating with order service. Services are coupled at database level.

**The fix**: Each service owns its data. Cross-service operations use APIs or events:

```javascript
async function createOrder(items) {
  const order = await orders.create({ items, status: 'pending' });

  // Call inventory service API instead of writing to its database
  const reserved = await inventoryService.reserveStock(items);

  if (reserved) {
    await orders.updateStatus(order.id, 'confirmed');
  } else {
    await orders.updateStatus(order.id, 'cancelled');
  }
}
```

Now inventory service can change its database schema without breaking order service.

## Advanced Observability

### Distributed Tracing

When one request spans 20 services, debugging requires knowing the entire path.

**OpenTelemetry implementation**:

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function createOrder(items) {
  // Start a span for this operation
  const span = tracer.startSpan('createOrder', {
    attributes: {
      'order.itemCount': items.length,
      'user.id': userId
    }
  });

  try {
    // Child spans for downstream calls
    const inventorySpan = tracer.startSpan('checkInventory', {
      parent: span
    });
    const available = await inventoryService.check(items);
    inventorySpan.end();

    const paymentSpan = tracer.startSpan('processPayment', {
      parent: span
    });
    await paymentService.charge(userId, total);
    paymentSpan.end();

    span.setStatus({ code: SpanStatusCode.OK });
    return order;

  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    throw error;

  } finally {
    span.end();
  }
}
```

**What you see in trace viewer**:

```
Trace abc-123 (500ms total)
├─ order-service: createOrder (500ms)
│  ├─ order-service: checkInventory (50ms)
│  │  └─ inventory-service: checkAvailability (45ms)
│  │     └─ inventory-db: query (40ms)
│  ├─ order-service: processPayment (400ms) ← Bottleneck found
│  │  └─ payment-service: charge (390ms)
│  │     └─ stripe-api: create-charge (380ms)
│  └─ order-service: saveOrder (50ms)
```

You can immediately see payment processing is the slow part. Without tracing, you'd know the request took 500ms but not where.

### Chaos Engineering for Architecture Validation

Netflix's Chaos Monkey is famous. But chaos engineering is more than random server termination.

**Chaos experiments for architecture**:

**Latency injection**: Add random delays to service calls. Does your system gracefully degrade or does it cascade fail?

```javascript
// Chaos middleware
app.use(async (req, res, next) => {
  if (chaos.isEnabled('latency') && Math.random() < 0.1) {
    const delay = chaos.getLatencyMs();  // e.g., 2000ms
    await sleep(delay);
  }
  next();
});
```

**Dependency failure**: Return errors from dependencies. Does your app handle it gracefully?

```javascript
async function getRecommendations(userId) {
  try {
    return await recommendationService.get(userId);
  } catch (error) {
    // Chaos test: does app still work when recommendations fail?
    logger.warn('Recommendations unavailable', error);
    return []; // Graceful degradation: show empty recommendations
  }
}
```

**Resource exhaustion**: Consume all database connections. Does your app queue requests or crash?

**Region failure**: Kill an entire AWS region. Does traffic failover to other regions?

**Gradual rollout**: Run chaos experiments against 1% of traffic, monitor for errors, increase to 10%, 50%, 100%.

**Real results from Uber**: Chaos testing revealed their payment service had no fallback when Stripe API was down. They added fallback to secondary payment provider. When Stripe had an outage in 2023, Uber stayed operational. Chaos testing prevented millions in lost revenue.

### SLO-Based Decision Making

Service Level Objectives (SLOs) should drive architectural decisions.

**Example SLO**: 99.9% of order creation requests complete in under 500ms.

This means:
- 0.1% can be slower (roughly 43 minutes per month)
- If you're at 99.95%, you have budget to spend on new features
- If you're at 99.85%, you need to focus on reliability

**Using error budget for decisions**:

```javascript
// SLO tracker
class SLOTracker {
  constructor(target = 0.999) {
    this.target = target;
  }

  async getCurrentSLO() {
    const window = 30 * 24 * 60 * 60 * 1000;  // 30 days
    const total = await metrics.count('orders.created', { window });
    const failed = await metrics.count('orders.created', {
      window,
      filter: 'duration > 500ms OR error = true'
    });

    const successRate = (total - failed) / total;
    const errorBudget = (1 - this.target) - (1 - successRate);

    return {
      current: successRate,
      target: this.target,
      errorBudget,
      status: errorBudget > 0 ? 'healthy' : 'unhealthy'
    };
  }

  async canDeployNewFeature() {
    const slo = await this.getCurrentSLO();

    if (slo.errorBudget < 0) {
      return {
        allowed: false,
        reason: 'Out of error budget. Focus on reliability.'
      };
    }

    return {
      allowed: true,
      errorBudget: slo.errorBudget
    };
  }
}
```

**At Google**: If you're out of error budget, you can't launch new features. You must focus on reliability until you're back within SLO. This prevents teams from shipping features that compromise reliability.

## Multi-Region Architecture

### Global Distribution Strategies

When you have users across continents, single-region architecture doesn't work. Speed of light is your enemy.

**The latency problem**: User in Tokyo accessing us-east-1 server has 150ms minimum latency (speed of light). 300ms round trip. This makes real-time interactions feel slow.

**Pattern 1: Read replicas in each region**

```
Primary (us-east-1)
  ├─ Read Replica (eu-west-1)
  ├─ Read Replica (ap-northeast-1)
  └─ Read Replica (ap-southeast-1)

Writes: Always go to primary
Reads: Go to nearest replica
```

**Pros**: Simple. Reads are fast globally.
**Cons**: Writes are still slow for non-US users. Replication lag means stale reads.

**Pattern 2: Multi-primary (active-active)**

```
Primary (us-east-1) ⟷ Primary (eu-west-1) ⟷ Primary (ap-northeast-1)
```

All regions accept both reads and writes. Changes replicate between regions.

**Pros**: Writes are fast globally.
**Cons**: Conflict resolution needed when same data modified in two regions.

**Real example from Discord**: User in Europe sends message, writes to eu-west-1 database. User in US reads from us-east-1 database. Replication delay is 50-200ms. US user sees message appear 200ms after Europe user sent it.

Most of the time this is fine. But during conflicts (two users editing same message), last-write-wins can lose data.

### Data Residency and Compliance

GDPR requires EU customer data stays in EU. CCPA has California requirements. Health data often can't leave the country.

**The architecture**:

```javascript
// Route requests based on user's country
async function getUserData(userId) {
  const user = await users.findById(userId);
  const region = getRegionForCountry(user.country);

  if (region === 'eu') {
    return euDatabase.getUserData(userId);
  } else if (region === 'us') {
    return usDatabase.getUserData(userId);
  }
  // ... other regions
}

// Hard rule: EU data never leaves EU region
class EUDataService {
  async getData(userId) {
    // This service only deployed in EU region
    // Database only accessible from EU region
    // Network rules prevent data leaving EU
    return euDatabase.query('SELECT * FROM users WHERE id = ?', userId);
  }
}
```

**Complexity**: User moves from EU to US. Do you migrate their data? GDPR still applies to EU citizens regardless of location. You need to track user's citizenship, not just current location.

**Real compliance approach from Stripe**: They store payment data regionally based on where business is registered, not where end user is located. A French company's data stays in EU even if they have US customers. Simplifies compliance at cost of potential latency.

### Conflict Resolution Strategies

When same data is modified in two regions simultaneously, you need conflict resolution.

**Last-write-wins (simplest but lossy)**:

```javascript
// Entry 1: Written in us-east-1 at 10:00:00.500
{ id: 'user-123', name: 'Alice', timestamp: 1700000000500 }

// Entry 2: Written in eu-west-1 at 10:00:00.700
{ id: 'user-123', name: 'Alicia', timestamp: 1700000000700 }

// When replication reconciles, eu-west-1 wins (later timestamp)
// us-east-1 change is lost
```

**Conflict-free Replicated Data Types (CRDTs)**: Data structures designed to merge without conflicts.

**Example: Counter CRDT**:

```javascript
// US region increments counter
const usCounter = { us: 5, eu: 3 };  // Total: 8

// EU region increments counter (doesn't know about US increment yet)
const euCounter = { us: 4, eu: 4 };  // Total: 8

// When they merge, take maximum for each region
const merged = {
  us: Math.max(usCounter.us, euCounter.us),  // 5
  eu: Math.max(usCounter.eu, euCounter.eu)   // 4
};
// Total: 9 (both increments preserved)
```

**Vector clocks** for causality tracking:

```javascript
// Track which regions have seen which versions
const version = {
  us: 3,  // US region has seen 3 writes
  eu: 2   // EU region has seen 2 writes
};

// When regions sync, compare vector clocks to detect conflicts
```

**Real implementation from Riak database**: They use vector clocks and allow application to resolve conflicts. When conflict detected, both versions returned to application, which decides which to keep or how to merge.

## Wrapping Up

Architecture at this level isn't about picking the perfect pattern. It's about understanding trade-offs and choosing the ones you can live with.

Event sourcing gives you audit trails but forces you to handle event schema evolution. CQRS optimizes reads and writes separately but doubles your data models. Microservices enable independent deployment but require distributed systems expertise. Multi-region improves latency but introduces consistency challenges.

**The key decisions**:

**When to use event sourcing**: You need audit trails or temporal queries. Accept the complexity of event schema evolution and storage costs.

**When to use CQRS**: Read and write models have genuinely different optimization needs. Don't use it for simple CRUD.

**When to extract microservices**: You have independent scaling needs, multiple teams, or different deployment schedules. Don't extract just because it's trendy.

**When to go multi-region**: Users are globally distributed and latency matters. Accept the complexity of data residency and conflict resolution.

**When to use sagas**: You need transactions across services. Accept eventual consistency and build compensation logic.

None of these patterns is inherently better. They solve specific problems at specific scales. Most applications never need them. But when you do need them, understanding the trade-offs prevents costly mistakes.

The companies that succeed at scale (Netflix, Uber, Stripe, Airbnb) didn't start with these patterns. They evolved into them as they grew. They started with monoliths, learned their domain boundaries, then extracted services strategically. They added complexity only when it solved real problems.

Start simple. Measure constantly. Add complexity only when you have specific evidence that it's needed. The best architecture is the simplest one that meets your actual requirements.

---

## Real-World Case Study

**[Microfrontend vs. Monolith Decision](case-studies/microfrontend-vs-monolith.md)**

Deep dive into a comprehensive architecture decision methodology with full academic rigor. Includes literature review of documented industry thresholds, quantitative scoring framework, risk assessment matrices, and honest discussion of trade-offs and limitations. **Full analysis: 60-90 minutes** for complete understanding.

[Browse all architecture case studies →](case-studies/)

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[← Mid-Depth](../mid-depth/index.md)** Practical patterns and implementation

### Related Topics
- [API Design](../../api-design/deep-water/index.md) - Related design considerations
- [Database Design](../../database-design/deep-water/index.md) - Related design considerations
- [Performance & Scalability Design](../../performance-scalability-design/deep-water/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
