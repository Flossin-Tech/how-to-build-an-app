---
title: "Error Handling & Resilience - Deep Water"
phase: "02-design"
topic: "error-handling-resilience"
depth: "deep-water"
reading_time: 50
prerequisites: ["error-handling-resilience-surface"]
related_topics: ["architecture-design", "api-design", "monitoring-observability", "deployment-strategies"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Error Handling & Resilience - Deep Water

Building resilient distributed systems is fundamentally about accepting that everything fails and designing for graceful degradation. Network packets get lost. Servers crash. Databases lock. Dependencies timeout. Cloud providers have regional outages.

The surface-level patterns - circuit breakers, retries, error categorization - work fine for simple services. Once you're coordinating multiple services, handling distributed transactions, or keeping systems running through partial failures, you need deeper patterns.

This isn't theoretical. These are lessons learned from actual production outages where basic error handling wasn't enough.

## Advanced Circuit Breaker Patterns

The basic circuit breaker from the surface level has three states: closed (normal operation), open (failing, reject requests), and half-open (testing if the service recovered). That works, but real systems need more nuance.

### Adaptive Circuit Breakers

Static thresholds (open after 5 failures) don't account for varying load. During high traffic, 5 failures might be noise. During low traffic, it might indicate serious problems.

Adaptive circuit breakers track failure rates instead of absolute counts:

```javascript
class AdaptiveCircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 0.5; // 50% failure rate
    this.volumeThreshold = options.volumeThreshold || 10; // Minimum requests to evaluate
    this.timeout = options.timeout || 60000; // Time before half-open
    this.windowSize = options.windowSize || 10000; // Rolling window in ms

    this.state = 'closed';
    this.nextAttempt = Date.now();
    this.attempts = [];
  }

  async call(fn) {
    this.cleanOldAttempts();

    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitOpenError('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  cleanOldAttempts() {
    const cutoff = Date.now() - this.windowSize;
    this.attempts = this.attempts.filter(a => a.timestamp > cutoff);
  }

  recordSuccess() {
    this.attempts.push({ timestamp: Date.now(), success: true });

    if (this.state === 'half-open') {
      // Successful attempt in half-open state -> close circuit
      this.state = 'closed';
    }
  }

  recordFailure() {
    this.attempts.push({ timestamp: Date.now(), success: false });

    if (this.attempts.length < this.volumeThreshold) {
      // Not enough data yet
      return;
    }

    const failures = this.attempts.filter(a => !a.success).length;
    const failureRate = failures / this.attempts.length;

    if (failureRate >= this.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  getMetrics() {
    this.cleanOldAttempts();
    const total = this.attempts.length;
    const failures = this.attempts.filter(a => !a.success).length;

    return {
      state: this.state,
      totalAttempts: total,
      failures,
      failureRate: total > 0 ? failures / total : 0,
      nextAttempt: this.state === 'open' ? this.nextAttempt : null
    };
  }
}
```

This tracks attempts in a rolling time window. If you're getting 100 requests/second, 5 failures in the window might be 5%. If you're getting 1 request/second, 5 failures is 50%. The circuit adapts to load.

The `volumeThreshold` prevents premature opens. If you've only seen 2 requests and both failed, that's not enough data - maybe it was just bad luck.

### Bulkhead Pattern

Circuit breakers prevent cascading failures by stopping calls to failing services. Bulkheads prevent resource exhaustion by isolating different operations.

The name comes from ships - bulkheads are watertight compartments. If one compartment floods, the others stay dry and the ship doesn't sink.

In software, if one slow dependency consumes all your connection pool threads, other unrelated operations can't proceed. Bulkheads partition resources:

```javascript
class Bulkhead {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.currentConcurrent = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.currentConcurrent >= this.maxConcurrent) {
      // At capacity - either reject or queue
      throw new BulkheadFullError(
        `Bulkhead full (${this.currentConcurrent}/${this.maxConcurrent})`
      );
    }

    this.currentConcurrent++;

    try {
      return await fn();
    } finally {
      this.currentConcurrent--;
    }
  }

  getMetrics() {
    return {
      maxConcurrent: this.maxConcurrent,
      currentConcurrent: this.currentConcurrent,
      utilization: this.currentConcurrent / this.maxConcurrent
    };
  }
}

// Usage: Separate bulkheads for different dependencies
const paymentBulkhead = new Bulkhead(5);
const emailBulkhead = new Bulkhead(10);
const analyticsBulkhead = new Bulkhead(3);

async function processOrder(order) {
  // Critical: Process payment
  const payment = await paymentBulkhead.execute(() =>
    stripe.processPayment(order.total)
  );

  // Important but non-blocking: Send confirmation
  try {
    await emailBulkhead.execute(() =>
      sendOrderConfirmation(order)
    );
  } catch (error) {
    // Email bulkhead full - queue for later
    await queueEmail(order);
  }

  // Nice to have: Track analytics
  try {
    await analyticsBulkhead.execute(() =>
      analytics.trackPurchase(order)
    );
  } catch (error) {
    // Analytics bulkhead full - drop the event
    logger.warn('Analytics bulkhead full, dropping event');
  }

  return payment;
}
```

If your analytics service is slow and consumes all 3 analytics threads, payments and emails continue normally. Without bulkheads, slow analytics could block everything.

You can combine bulkheads with circuit breakers:

```javascript
class ResilientService {
  constructor(serviceName, options = {}) {
    this.name = serviceName;
    this.circuitBreaker = new AdaptiveCircuitBreaker(options.circuit);
    this.bulkhead = new Bulkhead(options.maxConcurrent || 10);
    this.timeout = options.timeout || 5000;
  }

  async call(fn) {
    // Bulkhead first - reject if at capacity
    return this.bulkhead.execute(async () => {
      // Circuit breaker - reject if circuit is open
      return this.circuitBreaker.call(async () => {
        // Timeout - fail fast if too slow
        return this.withTimeout(fn, this.timeout);
      });
    });
  }

  async withTimeout(fn, ms) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new TimeoutError(
          `Operation timed out after ${ms}ms`
        )), ms)
      )
    ]);
  }

  getHealth() {
    return {
      name: this.name,
      circuit: this.circuitBreaker.getMetrics(),
      bulkhead: this.bulkhead.getMetrics()
    };
  }
}

// Usage
const recommendationService = new ResilientService('recommendations', {
  maxConcurrent: 5,
  timeout: 3000,
  circuit: {
    failureThreshold: 0.5,
    volumeThreshold: 10,
    timeout: 30000
  }
});
```

Now your recommendation service has timeout protection (fail after 3s), concurrency limits (max 5 concurrent calls), and circuit breaking (open after 50% failure rate). The circuit breaker uses the timeout to determine failures - if recommendations take longer than 3s, that counts as a failure.

## Saga Pattern for Distributed Transactions

Distributed transactions are hard. You can't use database ACID transactions across multiple services. The saga pattern breaks a distributed transaction into a sequence of local transactions, with compensating actions if something fails.

Example: Booking a trip requires reserving a flight, hotel, and rental car. If the car rental fails, you need to cancel the flight and hotel.

### Choreography vs Orchestration

There are two ways to coordinate sagas.

**Choreography:** Each service publishes events and listens to others. No central coordinator.

```javascript
// Flight service
async function reserveFlight(bookingId, flightDetails) {
  const reservation = await db.reservations.create({
    bookingId,
    type: 'flight',
    details: flightDetails,
    status: 'reserved'
  });

  await eventBus.publish('flight.reserved', {
    bookingId,
    reservationId: reservation.id,
    flightDetails
  });

  return reservation;
}

// Hotel service listens for flight reservations
eventBus.on('flight.reserved', async (event) => {
  try {
    const reservation = await reserveHotel(
      event.bookingId,
      event.hotelDetails
    );

    await eventBus.publish('hotel.reserved', {
      bookingId: event.bookingId,
      reservationId: reservation.id
    });
  } catch (error) {
    // Hotel reservation failed - trigger compensation
    await eventBus.publish('booking.failed', {
      bookingId: event.bookingId,
      failedAt: 'hotel',
      reason: error.message
    });
  }
});

// Flight service listens for booking failures
eventBus.on('booking.failed', async (event) => {
  if (event.bookingId) {
    await cancelFlightReservation(event.bookingId);
  }
});
```

Choreography is decentralized. Services coordinate through events. This works well for simple flows, but debugging is harder - there's no single place showing the entire workflow.

**Orchestration:** A central orchestrator manages the saga.

```javascript
class BookingOrchestrator {
  async bookTrip(bookingDetails) {
    const saga = await this.createSaga(bookingDetails);

    try {
      // Step 1: Reserve flight
      saga.flight = await this.reserveFlight(bookingDetails.flight);
      await this.updateSagaState(saga.id, 'flight_reserved');

      // Step 2: Reserve hotel
      saga.hotel = await this.reserveHotel(bookingDetails.hotel);
      await this.updateSagaState(saga.id, 'hotel_reserved');

      // Step 3: Reserve car
      saga.car = await this.reserveCar(bookingDetails.car);
      await this.updateSagaState(saga.id, 'car_reserved');

      // All steps succeeded - commit
      await this.commitSaga(saga.id);
      return saga;

    } catch (error) {
      // Something failed - compensate
      await this.compensate(saga, error);
      throw new SagaFailedError(
        `Booking failed at ${saga.state}`,
        { sagaId: saga.id, error }
      );
    }
  }

  async compensate(saga, error) {
    await this.updateSagaState(saga.id, 'compensating');

    // Undo in reverse order
    if (saga.car) {
      await this.cancelCar(saga.car.id).catch(err =>
        logger.error('Failed to cancel car', { sagaId: saga.id, err })
      );
    }

    if (saga.hotel) {
      await this.cancelHotel(saga.hotel.id).catch(err =>
        logger.error('Failed to cancel hotel', { sagaId: saga.id, err })
      );
    }

    if (saga.flight) {
      await this.cancelFlight(saga.flight.id).catch(err =>
        logger.error('Failed to cancel flight', { sagaId: saga.id, err })
      );
    }

    await this.updateSagaState(saga.id, 'compensated');
  }

  async createSaga(details) {
    return db.sagas.create({
      type: 'trip_booking',
      state: 'created',
      details,
      createdAt: new Date()
    });
  }

  async updateSagaState(sagaId, state) {
    return db.sagas.update(sagaId, {
      state,
      updatedAt: new Date()
    });
  }
}
```

Orchestration centralizes the workflow. You can see the entire saga in one place. You can query the saga table to see which bookings are in progress, which failed, and where they failed.

The trade-off: the orchestrator becomes a single point of failure. You need to make it reliable - persist saga state, handle crashes and restarts, resume in-progress sagas.

### Handling Saga Failures

Compensating transactions aren't always possible. What if you can't cancel the flight? The reservation system might be down, or the airline might have a no-refund policy.

You have a few options:

**1. Retry compensation:**

```javascript
async function compensateWithRetry(action, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await action();
      return; // Success
    } catch (error) {
      logger.warn('Compensation failed, retrying', {
        attempt: i + 1,
        maxRetries,
        error: error.message
      });

      if (i === maxRetries - 1) {
        throw error;
      }

      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

**2. Manual intervention queue:**

If compensation fails after retries, queue it for manual review:

```javascript
async function compensate(saga, error) {
  try {
    await this.cancelCar(saga.car.id);
  } catch (cancelError) {
    // Automated compensation failed
    await db.manualInterventions.create({
      sagaId: saga.id,
      action: 'cancel_car',
      resourceId: saga.car.id,
      error: cancelError.message,
      createdAt: new Date()
    });

    await notifyOpsTeam({
      type: 'saga_compensation_failed',
      sagaId: saga.id,
      details: cancelError
    });
  }
}
```

**3. Eventual consistency with timeouts:**

Some compensations can be asynchronous. Reserve the resource with a timeout - if the saga doesn't commit within 30 minutes, automatically cancel the reservation:

```javascript
async function reserveFlightWithTimeout(details, timeoutMinutes = 30) {
  const reservation = await flightService.reserve(details);

  // Schedule automatic cancellation
  await scheduler.scheduleAt(
    Date.now() + timeoutMinutes * 60 * 1000,
    'cancel-reservation-if-not-committed',
    { reservationId: reservation.id }
  );

  return reservation;
}

// Scheduled job
async function cancelReservationIfNotCommitted(reservationId) {
  const reservation = await db.reservations.findById(reservationId);

  if (reservation.status === 'reserved') {
    // Never committed - cancel it
    await flightService.cancel(reservation.id);
    await db.reservations.update(reservationId, {
      status: 'expired',
      cancelledAt: new Date()
    });
  }
}
```

This handles the case where the orchestrator crashes after reserving the flight but before completing the saga. The flight automatically cancels after 30 minutes.

## Chaos Engineering

You can design for failures, but you don't know if your resilience patterns actually work until you test them. Chaos engineering means deliberately breaking things in production to verify your systems handle failures gracefully.

Netflix pioneered this with Chaos Monkey - a service that randomly terminates EC2 instances. If your system can't handle instances being killed, you have a problem. Better to discover that during business hours when your team is ready than during a 3am outage.

### Fault Injection

Start with controlled experiments in test environments before moving to production.

**Network failures:**

```javascript
// Middleware to inject network failures
function chaosMiddleware(config) {
  return async (req, res, next) => {
    if (!config.enabled) {
      return next();
    }

    const random = Math.random();

    // 5% chance of network timeout
    if (random < 0.05) {
      logger.info('Chaos: Injecting timeout', {
        path: req.path,
        method: req.method
      });

      // Never respond - simulate timeout
      return;
    }

    // 3% chance of 500 error
    if (random < 0.08) {
      logger.info('Chaos: Injecting 500 error', {
        path: req.path,
        method: req.method
      });

      return res.status(500).json({
        error: 'Chaos engineering: Random failure'
      });
    }

    // 2% chance of slow response
    if (random < 0.10) {
      logger.info('Chaos: Injecting latency', {
        path: req.path,
        method: req.method
      });

      await sleep(5000);
    }

    next();
  };
}

// Enable only for certain services or endpoints
app.use('/api/recommendations', chaosMiddleware({
  enabled: process.env.CHAOS_ENABLED === 'true'
}));
```

This randomly injects failures. You can verify:
- Do circuit breakers open when failures hit the threshold?
- Do retries work correctly?
- Do fallbacks activate?
- Are errors logged with enough context to debug?

**Service failures:**

```javascript
class ChaosProxy {
  constructor(service, config) {
    this.service = service;
    this.config = config;
  }

  async call(method, ...args) {
    if (this.shouldFail()) {
      throw new Error(`Chaos: ${this.config.serviceName} is down`);
    }

    if (this.shouldBeSlow()) {
      await sleep(this.config.latencyMs || 5000);
    }

    return this.service[method](...args);
  }

  shouldFail() {
    return Math.random() < (this.config.failureRate || 0);
  }

  shouldBeSlow() {
    return Math.random() < (this.config.latencyRate || 0);
  }
}

// Wrap dependencies with chaos
const recommendationService = new ChaosProxy(realRecommendationService, {
  serviceName: 'recommendations',
  failureRate: 0.05, // 5% failures
  latencyRate: 0.10, // 10% slow responses
  latencyMs: 8000
});
```

### Game Days

Game days are scheduled chaos experiments. The team knows it's happening, but not exactly what will fail or when.

Common scenarios:
- **Database failover:** Kill the primary database and verify failover to replica works
- **Region outage:** Shut down an entire AWS region and verify traffic routes to others
- **Dependency failures:** Take down a critical dependency (payment processor, auth service) and verify graceful degradation
- **Traffic spikes:** Generate 10x normal traffic and verify autoscaling works

After each game day, document what broke and what worked:

```markdown
# Game Day: Database Failover - 2025-11-15

## Scenario
Simulated primary database failure at 2:00 PM PST.

## Expected Behavior
- Application detects failure within 10 seconds
- Automatic failover to replica
- Max 30 seconds of degraded performance
- No data loss

## Actual Results
✅ Failure detected in 8 seconds
✅ Failover successful
❌ Application returned 500 errors for 2 minutes
❌ 15 transactions failed and were not retried

## Issues Discovered
1. Connection pool didn't refresh after failover - kept trying dead primary
2. Failed transactions weren't queued for retry
3. Monitoring didn't alert until 1 minute after failure

## Action Items
- [ ] Fix connection pool to detect and reconnect on failover
- [ ] Implement retry queue for failed transactions
- [ ] Tune monitoring to alert within 15 seconds
- [ ] Add automated tests for failover scenario

## Next Game Day
Test replica lag - what happens if replica is 30 seconds behind primary?
```

Document everything. Game days are learning experiences.

### Production Chaos

Once you're confident in test environments, carefully introduce chaos in production.

Start small:
- Single instance failures (not entire services)
- Low failure rates (0.1% - 1%)
- Off-peak hours
- Limited to non-critical services

Gradually increase scope:
- Higher failure rates
- Critical services (with circuit breakers and fallbacks tested)
- Peak hours (the real test)

Always have a kill switch:

```javascript
const chaosConfig = {
  enabled: process.env.CHAOS_ENABLED === 'true',
  services: {
    recommendations: {
      enabled: false, // Per-service toggle
      failureRate: 0.01
    },
    analytics: {
      enabled: true,
      failureRate: 0.02
    }
  }
};

// Kill switch: environment variable or feature flag
// Can disable globally or per-service instantly
```

Tools like Chaos Mesh (Kubernetes) or Gremlin provide production chaos engineering platforms with safety controls, blast radius limits, and automatic rollback.

## Distributed System Failures

Distributed systems fail in ways single servers don't. Understanding these failure modes helps you design defensively.

### Partial Failures

In a monolith, things either work or they don't. In distributed systems, some parts work while others fail.

Example: An e-commerce system with separate services for products, cart, checkout, and recommendations. The recommendations service is down. Do you:

**A)** Fail the entire page?
**B)** Show the page without recommendations?
**C)** Show generic recommendations from a cache?

The answer depends on the user's job-to-be-done. If they're browsing products, option B or C works - they can still shop. If recommendations are the primary navigation (like Netflix), maybe option A is better than showing stale data.

Design for partial failures:

```javascript
async function buildProductPage(productId, userId) {
  // Parallel requests for different data
  const [product, reviews, inventory, recommendations] = await Promise.allSettled([
    productService.get(productId),
    reviewService.getFor(productId),
    inventoryService.checkStock(productId),
    recommendationService.getFor(userId, productId)
  ]);

  // Product is critical - fail if missing
  if (product.status === 'rejected') {
    throw new NotFoundError('Product not found');
  }

  // Build page with whatever succeeded
  return {
    product: product.value,
    reviews: reviews.status === 'fulfilled'
      ? reviews.value
      : [],
    inStock: inventory.status === 'fulfilled'
      ? inventory.value.inStock
      : null, // Show "check availability" instead
    recommendations: recommendations.status === 'fulfilled'
      ? recommendations.value
      : await getPopularProducts() // Fallback
  };
}
```

`Promise.allSettled` lets you handle each result independently. Some can fail while others succeed.

### Cascading Failures

Cascading failures happen when one failure triggers others. Classic example: a slow database causes API timeouts, which cause retries, which overload the database further, making it slower, causing more timeouts.

This is why circuit breakers are critical. They break the cascade by stopping calls to the failing dependency.

Another pattern: load shedding. When overwhelmed, reject new requests to protect existing ones:

```javascript
class LoadShedder {
  constructor(maxConcurrent, maxQueueSize = 0) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = maxQueueSize;
    this.current = 0;
    this.queue = [];
  }

  async execute(fn) {
    // At capacity and no queue room - shed load
    if (this.current >= this.maxConcurrent &&
        this.queue.length >= this.maxQueueSize) {
      throw new LoadSheddingError('Server overloaded, please retry later');
    }

    // Queue if at capacity but queue has room
    if (this.current >= this.maxConcurrent) {
      return new Promise((resolve, reject) => {
        this.queue.push({ fn, resolve, reject });
      });
    }

    return this.executeNow(fn);
  }

  async executeNow(fn) {
    this.current++;

    try {
      return await fn();
    } finally {
      this.current--;
      this.processQueue();
    }
  }

  processQueue() {
    if (this.queue.length > 0 && this.current < this.maxConcurrent) {
      const { fn, resolve, reject } = this.queue.shift();

      this.executeNow(fn)
        .then(resolve)
        .catch(reject);
    }
  }
}

// Usage
const shedder = new LoadShedder(100, 50);

app.use(async (req, res, next) => {
  try {
    await shedder.execute(async () => {
      await next();
    });
  } catch (error) {
    if (error instanceof LoadSheddingError) {
      res.status(503).set('Retry-After', '60').json({
        error: 'Service temporarily overloaded'
      });
    } else {
      throw error;
    }
  }
});
```

When overloaded, you return 503 with `Retry-After` instead of accepting requests you can't handle. This prevents cascading failures - the load stays bounded.

### Thundering Herd

The thundering herd problem: a cache expires and suddenly 1000 concurrent requests all hit the database to repopulate it.

Solutions:

**1. Request coalescing:**

```javascript
class CoalescedCache {
  constructor(ttl) {
    this.cache = new Map();
    this.inflightRequests = new Map();
    this.ttl = ttl;
  }

  async get(key, fetcher) {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    // Check if another request is already fetching
    const inflight = this.inflightRequests.get(key);
    if (inflight) {
      return inflight; // Wait for the in-flight request
    }

    // Fetch data
    const promise = fetcher()
      .then(value => {
        this.cache.set(key, {
          value,
          expiresAt: Date.now() + this.ttl
        });
        this.inflightRequests.delete(key);
        return value;
      })
      .catch(error => {
        this.inflightRequests.delete(key);
        throw error;
      });

    this.inflightRequests.set(key, promise);
    return promise;
  }
}

// Usage
const cache = new CoalescedCache(60000); // 60 second TTL

async function getProduct(productId) {
  return cache.get(`product:${productId}`, async () => {
    return db.products.findById(productId);
  });
}
```

When the cache expires and 1000 requests come in, only the first one hits the database. The other 999 wait for that request to complete, then all receive the same cached result.

**2. Probabilistic early expiration:**

Don't wait for cache expiration. Refresh early based on probability:

```javascript
async function getWithProbabilisticRefresh(key, fetcher, ttl) {
  const cached = cache.get(key);

  if (!cached) {
    // No cache - fetch
    const value = await fetcher();
    cache.set(key, value, ttl);
    return value;
  }

  const age = Date.now() - cached.timestamp;
  const timeLeft = ttl - age;

  // Probabilistically refresh before expiration
  // As timeLeft approaches 0, probability approaches 1
  const refreshProbability = 1 - (timeLeft / ttl);

  if (Math.random() < refreshProbability) {
    // Refresh cache in background
    fetcher()
      .then(value => cache.set(key, value, ttl))
      .catch(err => logger.warn('Background refresh failed', { key, err }));
  }

  return cached.value;
}
```

This spreads cache refreshes over time instead of all hitting at expiration.

## Retry Strategies

Basic exponential backoff works, but production systems need more sophistication.

### Jittered Backoff

Without jitter, retries synchronize. If 100 requests fail simultaneously and all retry with exponential backoff, they retry simultaneously again. You get periodic thundering herds.

Add randomness:

```javascript
function exponentialBackoffWithJitter(attempt, baseDelayMs = 1000, maxDelayMs = 32000) {
  const exponentialDelay = Math.min(
    baseDelayMs * Math.pow(2, attempt),
    maxDelayMs
  );

  // Full jitter: random between 0 and exponentialDelay
  return Math.random() * exponentialDelay;
}

async function retryWithJitter(fn, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === maxRetries - 1) {
        throw error;
      }

      const delayMs = exponentialBackoffWithJitter(attempt);

      logger.info('Retrying after backoff', {
        attempt: attempt + 1,
        maxRetries,
        delayMs: Math.round(delayMs)
      });

      await sleep(delayMs);
    }
  }

  throw lastError;
}
```

The first retry might be anywhere from 0-1000ms. The second from 0-2000ms. The third from 0-4000ms. Retries spread out over time instead of clustering.

### Idempotency Keys

Retries are dangerous if operations aren't idempotent. Idempotent means you can safely retry - doing it twice has the same effect as doing it once.

Reading data is naturally idempotent. Writing data often isn't - if you retry a payment, you might charge the customer twice.

Solution: idempotency keys. The client generates a unique key for each operation. The server stores which keys it's processed:

```javascript
class IdempotentOperationHandler {
  constructor() {
    this.processed = new Map(); // In production: use Redis or database
  }

  async handle(idempotencyKey, operation) {
    // Check if we already processed this key
    const existing = this.processed.get(idempotencyKey);
    if (existing) {
      if (existing.status === 'processing') {
        // Another request with same key is in progress - wait
        return this.waitForCompletion(idempotencyKey);
      }

      // Already completed - return cached result
      if (existing.status === 'completed') {
        return existing.result;
      }

      // Previous attempt failed - can retry
      if (existing.status === 'failed') {
        // Fall through to retry
      }
    }

    // Mark as processing
    this.processed.set(idempotencyKey, {
      status: 'processing',
      startedAt: Date.now()
    });

    try {
      const result = await operation();

      // Mark as completed
      this.processed.set(idempotencyKey, {
        status: 'completed',
        result,
        completedAt: Date.now()
      });

      return result;

    } catch (error) {
      // Mark as failed
      this.processed.set(idempotencyKey, {
        status: 'failed',
        error: error.message,
        failedAt: Date.now()
      });

      throw error;
    }
  }

  async waitForCompletion(idempotencyKey, timeoutMs = 30000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const current = this.processed.get(idempotencyKey);

      if (current.status === 'completed') {
        return current.result;
      }

      if (current.status === 'failed') {
        throw new Error(current.error);
      }

      await sleep(100); // Poll every 100ms
    }

    throw new Error('Idempotent operation timed out');
  }
}

// Usage
const handler = new IdempotentOperationHandler();

app.post('/payments', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'Idempotency-Key header required'
    });
  }

  try {
    const payment = await handler.handle(idempotencyKey, async () => {
      return processPayment(req.body);
    });

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Now if the client times out and retries with the same idempotency key:
- If the first request is still processing, the retry waits for it
- If the first request completed, the retry returns the cached result
- If the first request failed, the retry actually retries

This makes retries safe for non-idempotent operations.

### Retry Budgets

Retries cost resources. If every request retries 3 times and 50% are failing, you've just doubled your load on the failing service - making things worse.

Retry budgets limit total retries:

```javascript
class RetryBudget {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 60000; // 1 minute
    this.retryRatio = options.retryRatio || 0.1; // 10% of requests can retry

    this.requests = [];
    this.retries = [];
  }

  recordRequest() {
    this.cleanOld();
    this.requests.push(Date.now());
  }

  canRetry() {
    this.cleanOld();

    const requestCount = this.requests.length;
    const retryCount = this.retries.length;

    // Allow retries up to retryRatio of total requests
    const allowed = requestCount * this.retryRatio;

    return retryCount < allowed;
  }

  recordRetry() {
    this.retries.push(Date.now());
  }

  cleanOld() {
    const cutoff = Date.now() - this.windowSize;
    this.requests = this.requests.filter(t => t > cutoff);
    this.retries = this.retries.filter(t => t > cutoff);
  }

  getStats() {
    this.cleanOld();
    return {
      requests: this.requests.length,
      retries: this.retries.length,
      retryRate: this.requests.length > 0
        ? this.retries.length / this.requests.length
        : 0,
      budgetRemaining: Math.max(0,
        this.requests.length * this.retryRatio - this.retries.length
      )
    };
  }
}

// Usage
const retryBudget = new RetryBudget({ retryRatio: 0.1 });

async function fetchWithBudget(url) {
  retryBudget.recordRequest();

  try {
    return await fetch(url);
  } catch (error) {
    if (isRetryable(error) && retryBudget.canRetry()) {
      retryBudget.recordRetry();

      await sleep(1000);
      return await fetch(url);
    }

    throw error;
  }
}
```

If you're getting 100 requests/minute and the retry ratio is 10%, you can do 10 retries/minute. Once you've used the budget, stop retrying - you're already overloading the service.

## Observability for Resilience

You can't improve what you can't measure. Resilience requires observability - knowing when things fail and how your systems respond.

### Error Budgets

SRE thinking: 100% uptime is impossible and not worth the cost. Define acceptable downtime, track it, and spend your "error budget" intentionally.

Example: 99.9% uptime means 43 minutes of downtime per month. That's your error budget.

```javascript
class ErrorBudget {
  constructor(slo) {
    this.slo = slo; // e.g., 0.999 for 99.9%
    this.windowSize = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.requests = [];
  }

  recordRequest(success) {
    this.requests.push({
      timestamp: Date.now(),
      success
    });

    this.cleanOld();
  }

  cleanOld() {
    const cutoff = Date.now() - this.windowSize;
    this.requests = this.requests.filter(r => r.timestamp > cutoff);
  }

  getStatus() {
    this.cleanOld();

    const total = this.requests.length;
    const successful = this.requests.filter(r => r.success).length;
    const failed = total - successful;

    const actualSLO = total > 0 ? successful / total : 1;
    const budgetRemaining = this.slo - actualSLO;

    // How many more failures can we have before exceeding budget?
    const allowedFailures = Math.floor(total * (1 - this.slo)) - failed;

    return {
      slo: this.slo,
      actual: actualSLO,
      budgetRemaining,
      totalRequests: total,
      successful,
      failed,
      allowedFailures: Math.max(0, allowedFailures),
      status: budgetRemaining >= 0 ? 'healthy' : 'exceeded'
    };
  }
}

// Track error budget
const budget = new ErrorBudget(0.999);

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const success = res.statusCode < 500;
    budget.recordRequest(success);

    if (res.statusCode >= 500) {
      const status = budget.getStatus();

      logger.warn('Error budget impact', {
        path: req.path,
        statusCode: res.statusCode,
        budgetRemaining: status.budgetRemaining,
        allowedFailures: status.allowedFailures
      });

      if (status.status === 'exceeded') {
        logger.error('ERROR BUDGET EXCEEDED', status);
        // Alert ops team, stop risky deploys, etc.
      }
    }
  });

  next();
});
```

When you exceed your error budget, you take action:
- Stop feature development and focus on reliability
- No risky deploys until budget recovers
- Root cause analysis on recent failures
- Invest in resilience improvements

### SLIs, SLOs, and SLAs

**SLI (Service Level Indicator):** What you measure. Examples:
- Request success rate
- Response time (p50, p95, p99)
- Throughput (requests per second)

**SLO (Service Level Objective):** What you promise internally. Examples:
- 99.9% of requests succeed
- p95 response time < 200ms
- 99% of requests complete within 1 second

**SLA (Service Level Agreement):** What you promise customers with consequences. Examples:
- 99.95% uptime or you get a refund
- p99 response time < 500ms or you get credits

SLIs are the data. SLOs are your internal targets. SLAs are contractual obligations.

```javascript
class SLITracker {
  constructor() {
    this.latencies = [];
    this.successes = 0;
    this.failures = 0;
    this.windowStart = Date.now();
  }

  recordRequest(latencyMs, success) {
    this.latencies.push(latencyMs);

    if (success) {
      this.successes++;
    } else {
      this.failures++;
    }
  }

  getSLIs() {
    const total = this.successes + this.failures;
    const sorted = this.latencies.slice().sort((a, b) => a - b);

    const percentile = (p) => {
      const index = Math.floor(sorted.length * p);
      return sorted[index] || 0;
    };

    return {
      successRate: total > 0 ? this.successes / total : 1,
      totalRequests: total,
      latency: {
        p50: percentile(0.50),
        p95: percentile(0.95),
        p99: percentile(0.99),
        p999: percentile(0.999)
      },
      windowDuration: Date.now() - this.windowStart
    };
  }

  checkSLOs() {
    const slis = this.getSLIs();

    return {
      successRateSLO: {
        target: 0.999,
        actual: slis.successRate,
        met: slis.successRate >= 0.999
      },
      p95LatencySLO: {
        target: 200,
        actual: slis.latency.p95,
        met: slis.latency.p95 <= 200
      },
      p99LatencySLO: {
        target: 500,
        actual: slis.latency.p99,
        met: slis.latency.p99 <= 500
      }
    };
  }
}
```

Track SLIs continuously. Alert when SLOs are at risk before they're breached.

### Alerting Strategies

Bad alerts: too many, too noisy, nobody responds.

Good alerts: actionable, rate-limited, escalating.

```javascript
class AlertManager {
  constructor() {
    this.alerts = new Map();
    this.cooldowns = new Map();
  }

  async trigger(alertName, severity, details) {
    // Check cooldown - don't spam same alert
    const lastSent = this.cooldowns.get(alertName);
    const cooldownMs = severity === 'critical' ? 5 * 60 * 1000 : 30 * 60 * 1000;

    if (lastSent && Date.now() - lastSent < cooldownMs) {
      logger.debug('Alert in cooldown', { alertName, severity });
      return;
    }

    // Record alert
    this.alerts.set(alertName, {
      severity,
      details,
      triggeredAt: Date.now()
    });

    this.cooldowns.set(alertName, Date.now());

    // Send alert based on severity
    if (severity === 'critical') {
      await this.sendCriticalAlert(alertName, details);
    } else if (severity === 'warning') {
      await this.sendWarningAlert(alertName, details);
    }
  }

  async sendCriticalAlert(alertName, details) {
    // Page on-call engineer
    await pagerDuty.trigger({
      title: `CRITICAL: ${alertName}`,
      details,
      severity: 'critical'
    });

    // Post to incident channel
    await slack.postMessage('#incidents', {
      text: `🚨 CRITICAL ALERT: ${alertName}`,
      attachments: [{
        color: 'danger',
        text: JSON.stringify(details, null, 2)
      }]
    });
  }

  async sendWarningAlert(alertName, details) {
    // Post to monitoring channel (don't page)
    await slack.postMessage('#monitoring', {
      text: `⚠️ Warning: ${alertName}`,
      attachments: [{
        color: 'warning',
        text: JSON.stringify(details, null, 2)
      }]
    });
  }

  clear(alertName) {
    this.alerts.delete(alertName);
    logger.info('Alert cleared', { alertName });
  }
}

// Usage
const alertManager = new AlertManager();

// Monitor error budget
setInterval(() => {
  const status = errorBudget.getStatus();

  if (status.status === 'exceeded') {
    alertManager.trigger('error-budget-exceeded', 'critical', status);
  } else if (status.budgetRemaining < 0.001) { // Less than 0.1% remaining
    alertManager.trigger('error-budget-low', 'warning', status);
  } else {
    alertManager.clear('error-budget-low');
    alertManager.clear('error-budget-exceeded');
  }
}, 60000); // Check every minute
```

Alert on things that require action:
- Error budget almost exhausted (still have time to respond)
- Circuit breakers opening (dependency is failing)
- p99 latency above SLO (users are experiencing slow responses)
- Retry budget exhausted (you're overloading dependencies)

Don't alert on:
- Individual request failures (that's normal)
- Transient blips (wait for sustained issues)
- Metrics that don't require action

## Multi-Region Failover

Running in multiple regions provides disaster recovery. If one region goes down, traffic routes to others.

### Active-Passive

One region handles all traffic (active), others are standby (passive). If the active region fails, failover to passive.

Simpler than active-active, but the passive region is wasted capacity during normal operation.

```javascript
class RegionalFailover {
  constructor() {
    this.regions = [
      { name: 'us-east-1', url: 'https://api-us-east.example.com', active: true },
      { name: 'eu-west-1', url: 'https://api-eu-west.example.com', active: false }
    ];
    this.healthChecks = new Map();
  }

  async healthCheck(region) {
    try {
      const response = await fetch(`${region.url}/health`, { timeout: 5000 });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async checkAllRegions() {
    for (const region of this.regions) {
      const healthy = await this.healthCheck(region);
      this.healthChecks.set(region.name, {
        healthy,
        checkedAt: Date.now()
      });
    }
  }

  getActiveRegion() {
    const active = this.regions.find(r => r.active);
    const health = this.healthChecks.get(active.name);

    // Active region unhealthy - failover
    if (health && !health.healthy) {
      logger.error('Active region unhealthy, failing over', {
        from: active.name
      });

      active.active = false;

      // Promote first healthy passive region
      const passive = this.regions.find(r => {
        const h = this.healthChecks.get(r.name);
        return !r.active && h && h.healthy;
      });

      if (passive) {
        passive.active = true;
        logger.info('Failover complete', {
          to: passive.name
        });

        return passive;
      }

      logger.error('No healthy regions available');
      return null;
    }

    return active;
  }

  async call(endpoint, options) {
    const region = this.getActiveRegion();

    if (!region) {
      throw new Error('No healthy regions available');
    }

    return fetch(`${region.url}${endpoint}`, options);
  }
}

// Run health checks
const failover = new RegionalFailover();
setInterval(() => failover.checkAllRegions(), 30000);
```

In production, DNS or load balancers handle failover - you don't want application code making these decisions. But the principle is the same: health check regions, route to healthy ones.

### Active-Active

All regions handle traffic simultaneously. More complex but better resource utilization and lower latency (route users to nearest region).

Challenge: data consistency. If a user updates their profile in us-east, it needs to propagate to eu-west.

**Eventual consistency:**

Accept that data will be briefly inconsistent across regions. Writes go to the local region, async replication propagates to others.

```javascript
class MultiRegionCache {
  constructor(localRegion, regions) {
    this.localRegion = localRegion;
    this.regions = regions; // ['us-east', 'eu-west', 'ap-south']
    this.cache = new Map();
    this.replicationQueue = [];
  }

  async set(key, value) {
    // Write to local cache immediately
    this.cache.set(key, {
      value,
      version: Date.now(),
      region: this.localRegion
    });

    // Queue replication to other regions
    this.replicationQueue.push({
      key,
      value,
      version: Date.now(),
      sourceRegion: this.localRegion
    });

    this.processReplicationQueue();
  }

  async get(key) {
    return this.cache.get(key)?.value;
  }

  async processReplicationQueue() {
    while (this.replicationQueue.length > 0) {
      const item = this.replicationQueue.shift();

      // Replicate to other regions
      for (const region of this.regions) {
        if (region === this.localRegion) continue;

        try {
          await this.replicateTo(region, item);
        } catch (error) {
          logger.warn('Replication failed, will retry', {
            region,
            key: item.key,
            error: error.message
          });

          // Re-queue for retry
          this.replicationQueue.push(item);
        }
      }
    }
  }

  async replicateTo(region, item) {
    await fetch(`https://api-${region}.example.com/replicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  }

  async handleReplication(item) {
    const existing = this.cache.get(item.key);

    // Use version/timestamp to resolve conflicts
    // Last write wins (based on version)
    if (!existing || item.version > existing.version) {
      this.cache.set(item.key, {
        value: item.value,
        version: item.version,
        region: item.sourceRegion
      });
    }
  }
}
```

This uses "last write wins" conflict resolution. More sophisticated approaches use CRDTs (conflict-free replicated data types) or vector clocks.

### DNS Failover

DNS-based failover routes users to healthy regions:

```javascript
// Simplified DNS health check and failover
class DNSFailover {
  constructor() {
    this.endpoints = [
      { region: 'us-east', ip: '1.2.3.4', weight: 100, healthy: true },
      { region: 'eu-west', ip: '5.6.7.8', weight: 100, healthy: true }
    ];
  }

  async updateHealthChecks() {
    for (const endpoint of this.endpoints) {
      try {
        const response = await fetch(`http://${endpoint.ip}/health`, {
          timeout: 5000
        });
        endpoint.healthy = response.ok;
      } catch (error) {
        endpoint.healthy = false;
      }
    }

    await this.updateDNSRecords();
  }

  async updateDNSRecords() {
    const healthy = this.endpoints.filter(e => e.healthy);

    if (healthy.length === 0) {
      logger.error('No healthy endpoints for DNS');
      return;
    }

    // Update Route53/CloudFlare/etc with healthy endpoints
    await dnsProvider.updateRecords('api.example.com', {
      type: 'A',
      records: healthy.map(e => ({
        ip: e.ip,
        weight: e.weight,
        healthCheck: true
      }))
    });

    logger.info('DNS records updated', {
      healthy: healthy.map(e => e.region)
    });
  }
}
```

DNS providers like Route 53 or Cloudflare handle this automatically with health checks and weighted routing.

Limitation: DNS caching. TTL (time to live) means clients might cache the old IP for minutes after failover. Set low TTLs (60 seconds) for critical services, accepting the increased DNS query load.

## Real-World Incidents

Learning from actual outages teaches more than theoretical examples.

### AWS S3 Outage (February 2017)

**What happened:** A typo in a command took down S3 in us-east-1 for 4 hours. Many services had hard dependencies on S3 and failed completely.

**Lesson:** Even AWS has outages. If your system assumes S3 is always available, you're going to have a bad time.

**What to do differently:**
- Graceful degradation: if S3 is down, can you serve cached content?
- Multi-region S3 replication
- Don't hard-fail on S3 errors for non-critical assets (images, CSS) - show broken image icons instead of 500 errors

### GitHub Outage (October 2018)

**What happened:** Network partition between East Coast and West Coast data centers. Both sides thought they were primary and accepted writes. When the partition healed, data conflicts had to be resolved.

**Lesson:** Distributed consensus is hard. Split-brain scenarios (multiple primaries) cause data corruption.

**What to do differently:**
- Use battle-tested consensus algorithms (Raft, Paxos)
- Favor consistency over availability when data correctness matters
- Have a plan for split-brain recovery (which side wins?)

### Stripe Outage (July 2019)

**What happened:** Failover from primary to secondary database failed because the replica was lagging. Replication lag wasn't monitored closely enough.

**Lesson:** Passive regions aren't actually passive - they need to stay in sync. Replication lag matters.

**What to do differently:**
- Monitor replication lag continuously
- Alert when lag exceeds threshold (e.g., 30 seconds)
- Test failover regularly (game days) to ensure replicas are actually ready

### Cloudflare Outage (July 2019)

**What happened:** A bad regex in a WAF (web application firewall) rule caused excessive CPU usage, taking down global traffic.

**Lesson:** Performance matters. A single inefficient piece of code can cascade to full outage.

**What to do differently:**
- Performance testing for critical paths (especially regex, database queries)
- Canary deployments: roll out changes to 1% of traffic first
- Circuit breakers even for internal components (if WAF is slow, bypass it)

### npm Outage (March 2019)

**What happened:** Internal network issues caused 99th percentile latency to spike. Some services timed out and retried, overloading npm further. Cascading failure.

**Lesson:** Retry storms make outages worse. Retries need backoff and budgets.

**What to do differently:**
- Exponential backoff with jitter on all retries
- Retry budgets to limit total retry load
- Circuit breakers to stop retry storms

## Putting It All Together

Resilience is layers:

1. **Request level:** Timeouts, retries with backoff and jitter, idempotency keys
2. **Service level:** Circuit breakers, bulkheads, load shedding
3. **System level:** Health checks, graceful degradation, partial failure handling
4. **Infrastructure level:** Multi-region deployment, auto-scaling, redundancy
5. **Operational level:** Error budgets, SLOs, alerting, game days, chaos engineering

You don't implement everything at once. Start with the surface-level patterns. Add complexity as your system scales and your understanding deepens.

A realistic progression:
- **Early stage:** Basic error handling, logging, retry logic
- **Growing:** Circuit breakers, structured logging, health checks
- **Scaling:** Bulkheads, saga pattern for distributed transactions, observability platform
- **Mature:** Chaos engineering, error budgets, multi-region active-active, SRE team

The most important thing: design for failure from the start. The patterns get more sophisticated, but the mindset stays the same - everything will fail eventually, so build systems that fail gracefully.

When you're debugging a 3am production outage, you'll be glad you designed error handling upfront instead of trying to add it while half-asleep and panicking. Ask me how I know.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[← Mid-Depth](../mid-depth/index.md)** Practical patterns and implementation

### Related Topics
- [API Design](../../api-design/deep-water/index.md) - Related design considerations
- [Architecture Design](../../architecture-design/deep-water/index.md) - Related design considerations
- [Performance & Scalability Design](../../performance-scalability-design/deep-water/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
