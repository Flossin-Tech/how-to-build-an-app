---
title: "Error Handling & Resilience Design - Mid-Depth"
phase: "02-design"
topic: "error-handling-resilience"
depth: "mid-depth"
reading_time: 25
prerequisites: ["error-handling-resilience-surface"]
related_topics: ["api-design", "architecture-design", "monitoring-observability"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-15"
---

# Error Handling & Resilience Design - Mid-Depth

You've got basic error handling in place. Now you need to keep your system running when third-party APIs go down, databases slow to a crawl, and load spikes hit at 3am. This guide covers the patterns that separate systems that fall over from systems that survive.

## What You'll Learn

- Circuit breaker pattern with working implementations
- Bulkhead isolation to prevent cascade failures
- Retry strategies that don't make problems worse
- Timeout configuration that actually works
- Graceful degradation when dependencies fail
- Dead letter queues for async resilience
- Error budgets and SLOs for quantifying reliability
- Structured error responses that clients can parse
- Monitoring and alerting for error conditions
- Chaos engineering to test your assumptions

## 1. Circuit Breaker Pattern

The circuit breaker pattern prevents your system from repeatedly calling a failing dependency. It's named after electrical circuit breakers - when something goes wrong, it opens the circuit and stops the flow.

### How Circuit Breakers Work

Three states:

1. **Closed** - Normal operation, requests pass through
2. **Open** - Failure threshold reached, requests fail immediately without calling the dependency
3. **Half-Open** - After timeout, allow a few test requests to see if the dependency recovered

### Python Implementation

```python
from datetime import datetime, timedelta
from enum import Enum
from threading import Lock
import time

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold=5,
        recovery_timeout=60,
        expected_exception=Exception,
        name=None
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name or "CircuitBreaker"

        self._failure_count = 0
        self._last_failure_time = None
        self._state = CircuitState.CLOSED
        self._lock = Lock()

    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._state = CircuitState.HALF_OPEN
                    print(f"{self.name}: Attempting reset (half-open)")
                else:
                    raise CircuitBreakerError(
                        f"{self.name}: Circuit is OPEN"
                    )

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result

        except self.expected_exception as e:
            self._on_failure()
            raise

    def _should_attempt_reset(self):
        """Check if enough time has passed to try recovery."""
        return (
            self._last_failure_time and
            datetime.now() >= self._last_failure_time + timedelta(
                seconds=self.recovery_timeout
            )
        )

    def _on_success(self):
        """Reset failure count on successful call."""
        with self._lock:
            self._failure_count = 0
            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.CLOSED
                print(f"{self.name}: Circuit CLOSED (recovered)")

    def _on_failure(self):
        """Increment failure count and open circuit if threshold reached."""
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = datetime.now()

            if self._failure_count >= self.failure_threshold:
                self._state = CircuitState.OPEN
                print(
                    f"{self.name}: Circuit OPEN "
                    f"({self._failure_count} failures)"
                )

    @property
    def state(self):
        return self._state

class CircuitBreakerError(Exception):
    pass

# Usage example
import requests

payment_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    expected_exception=requests.exceptions.RequestException,
    name="PaymentAPI"
)

def call_payment_api(order_id, amount):
    """Call external payment API with circuit breaker protection."""
    def _api_call():
        response = requests.post(
            "https://api.payments.example/charge",
            json={"order_id": order_id, "amount": amount},
            timeout=5
        )
        response.raise_for_status()
        return response.json()

    try:
        return payment_breaker.call(_api_call)
    except CircuitBreakerError:
        # Circuit is open - return cached response or error
        return {"status": "pending", "message": "Payment service unavailable"}
```

### Node.js Implementation

```javascript
const CircuitState = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open'
};

class CircuitBreaker {
  constructor({
    failureThreshold = 5,
    recoveryTimeout = 60000, // ms
    name = 'CircuitBreaker'
  } = {}) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.name = name;

    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = CircuitState.CLOSED;
  }

  async call(fn) {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`${this.name}: Attempting reset (half-open)`);
      } else {
        throw new Error(`${this.name}: Circuit is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  shouldAttemptReset() {
    return (
      this.lastFailureTime &&
      Date.now() >= this.lastFailureTime + this.recoveryTimeout
    );
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log(`${this.name}: Circuit CLOSED (recovered)`);
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(
        `${this.name}: Circuit OPEN (${this.failureCount} failures)`
      );
    }
  }
}

// Usage with fetch
const inventoryBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000,
  name: 'InventoryAPI'
});

async function checkInventory(productId) {
  try {
    return await inventoryBreaker.call(async () => {
      const response = await fetch(
        `https://api.inventory.example/products/${productId}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5s timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    });
  } catch (error) {
    // Circuit open or API failed - return cached data or error state
    return { available: false, message: 'Inventory check unavailable' };
  }
}
```

### Production Circuit Breaker Libraries

Rolling your own works for learning, but production systems should use battle-tested libraries:

**Python:**
- `pybreaker` - Simple, effective implementation
- `aiobreaker` - Async/await support for asyncio
- Built into resilience libraries like `tenacity`

**Node.js:**
- `opossum` - Netflix-inspired, widely used
- `cockatiel` - Modern, TypeScript-first

**Java:**
- Resilience4j - Modern, lightweight (replaced Hystrix)
- Spring Cloud Circuit Breaker - Framework integration

**.NET:**
- Polly - Comprehensive resilience library
- Built into .NET 8+ with `Microsoft.Extensions.Http.Resilience`

**Go:**
- `gobreaker` - Simple implementation
- `hystrix-go` - Port of Netflix Hystrix

## 2. Bulkhead Pattern

Named after ship compartments that prevent one leak from sinking the entire vessel. In software, bulkheads isolate resources so one failing operation can't exhaust all available capacity.

### Thread Pool Isolation

```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import time

class Bulkhead:
    def __init__(self, max_concurrent=10, queue_size=100, timeout=30):
        self.executor = ThreadPoolExecutor(
            max_workers=max_concurrent,
            thread_name_prefix="bulkhead-"
        )
        self.max_concurrent = max_concurrent
        self.queue_size = queue_size
        self.timeout = timeout
        self._active_count = 0

    def execute(self, func, *args, **kwargs):
        """Execute function in isolated thread pool."""
        future = self.executor.submit(func, *args, **kwargs)

        try:
            return future.result(timeout=self.timeout)
        except TimeoutError:
            future.cancel()
            raise BulkheadTimeoutError(
                f"Operation exceeded {self.timeout}s timeout"
            )

class BulkheadTimeoutError(Exception):
    pass

# Separate bulkheads for different operations
analytics_bulkhead = Bulkhead(max_concurrent=5, timeout=10)
payment_bulkhead = Bulkhead(max_concurrent=20, timeout=5)
email_bulkhead = Bulkhead(max_concurrent=10, timeout=15)

def send_analytics_event(event_data):
    """Non-critical analytics - limited resources."""
    return analytics_bulkhead.execute(_send_to_analytics, event_data)

def process_payment(payment_data):
    """Critical payment - more resources, strict timeout."""
    return payment_bulkhead.execute(_process_payment_api, payment_data)

def send_email(email_data):
    """Email sending - isolated from other operations."""
    return email_bulkhead.execute(_send_via_smtp, email_data)
```

### Database Connection Pools

```javascript
// Separate pools for different workload types
const { Pool } = require('pg');

// Read queries - larger pool for high concurrency
const readPool = new Pool({
  host: 'read-replica.db.example',
  database: 'app',
  max: 50, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Write queries - smaller pool, stricter limits
const writePool = new Pool({
  host: 'primary.db.example',
  database: 'app',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Long-running reports - tiny pool, won't impact main app
const reportPool = new Pool({
  host: 'read-replica.db.example',
  database: 'app',
  max: 5,
  idleTimeoutMillis: 300000, // 5 min
  connectionTimeoutMillis: 10000,
});

async function getUserById(userId) {
  const client = await readPool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function createOrder(orderData) {
  const client = await writePool.connect();
  try {
    await client.query('BEGIN');
    // ... transaction logic
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Why Bulkheads Matter

Without bulkheads, a slow analytics API can consume all available threads, making your payment processing wait. A database query that takes 30 seconds can block queries that should take 50ms. Isolation prevents cascading failures.

## 3. Retry Strategies

Retries are dangerous. Done wrong, they amplify failures (thundering herd). Done right, they hide transient glitches.

### Exponential Backoff with Jitter

```python
import random
import time
from functools import wraps

def retry_with_backoff(
    max_attempts=3,
    base_delay=1,
    max_delay=60,
    exponential_base=2,
    jitter=True,
    retryable_exceptions=(Exception,)
):
    """Decorator for exponential backoff with jitter."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    if attempt == max_attempts - 1:
                        # Last attempt failed - re-raise
                        raise

                    # Calculate delay with exponential backoff
                    delay = min(
                        base_delay * (exponential_base ** attempt),
                        max_delay
                    )

                    # Add jitter to prevent thundering herd
                    if jitter:
                        delay = delay * (0.5 + random.random())

                    print(
                        f"Attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    time.sleep(delay)

        return wrapper
    return decorator

# Usage
import requests

@retry_with_backoff(
    max_attempts=5,
    base_delay=1,
    max_delay=32,
    retryable_exceptions=(
        requests.exceptions.ConnectionError,
        requests.exceptions.Timeout
    )
)
def fetch_user_data(user_id):
    response = requests.get(
        f"https://api.example.com/users/{user_id}",
        timeout=5
    )
    response.raise_for_status()
    return response.json()
```

### Idempotency Tokens

Retries only work safely if operations are idempotent. For operations that aren't naturally idempotent (like charging a credit card), use idempotency tokens:

```javascript
const { v4: uuidv4 } = require('uuid');

async function processPayment({ orderId, amount, idempotencyKey }) {
  // Client provides idempotency key, or we generate one
  const key = idempotencyKey || uuidv4();

  try {
    const response = await fetch('https://api.stripe.com/v1/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Idempotency-Key': key, // Stripe deduplicates on this
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        amount: amount,
        currency: 'usd',
        source: 'tok_visa',
        description: `Order ${orderId}`
      })
    });

    if (!response.ok) {
      throw new Error(`Payment failed: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    // Network error - safe to retry with same idempotency key
    throw error;
  }
}

// Your application layer
class PaymentService {
  async chargeOrder(orderId, amount) {
    // Generate idempotency key once, use for all retries
    const idempotencyKey = uuidv4();

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await processPayment({
          orderId,
          amount,
          idempotencyKey // Same key for all retries
        });
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
}
```

### When NOT to Retry

Don't retry:
- **Client errors (4xx)** - If the request was invalid, retrying won't help
- **Authentication failures** - Credentials won't become valid on retry
- **Resource exhaustion** - Retrying makes it worse
- **Non-idempotent operations without tokens** - You'll create duplicates

Do retry:
- **Network timeouts** - Transient network issues
- **503 Service Unavailable** - Server overloaded, might recover
- **Connection refused** - Service might be restarting
- **Rate limit errors (429)** - With backoff respecting Retry-After header

## 4. Timeout Configuration

Every network call needs a timeout. The default is usually infinity. That's a problem.

### Client-Side Timeouts

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure session with timeouts and retries
session = requests.Session()

# Retry configuration (for retryable errors only)
retry_strategy = Retry(
    total=3,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "POST"],
    backoff_factor=1  # 1s, 2s, 4s
)

adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("http://", adapter)
session.mount("https://", adapter)

# Different timeouts for different operations
def get_user_profile(user_id):
    """Fast operation - short timeout."""
    response = session.get(
        f"https://api.example.com/users/{user_id}",
        timeout=(2, 5)  # (connect_timeout, read_timeout)
    )
    response.raise_for_status()
    return response.json()

def generate_report(report_id):
    """Slow operation - longer timeout."""
    response = session.post(
        "https://api.example.com/reports/generate",
        json={"report_id": report_id},
        timeout=(3, 30)  # Connect fast, but allow slow processing
    )
    response.raise_for_status()
    return response.json()
```

### Server-Side Timeouts

```javascript
const express = require('express');
const app = express();

// Global timeout middleware
app.use((req, res, next) => {
  // 30 second timeout for all requests
  req.setTimeout(30000, () => {
    res.status(408).json({
      error: 'Request timeout',
      message: 'Server did not receive complete request in time'
    });
  });

  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Response timeout',
        message: 'Server could not complete request in time'
      });
    }
  });

  next();
});

// Per-route timeout for expensive operations
function timeoutMiddleware(ms) {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Operation timeout',
          message: `Operation exceeded ${ms}ms limit`
        });
      }
    }, ms);

    res.on('finish', () => clearTimeout(timeout));
    next();
  };
}

app.post('/api/reports', timeoutMiddleware(60000), async (req, res) => {
  // Complex report generation - 60 second timeout
  const report = await generateComplexReport(req.body);
  res.json(report);
});

app.get('/api/users/:id', timeoutMiddleware(5000), async (req, res) => {
  // Simple lookup - 5 second timeout
  const user = await db.users.findById(req.params.id);
  res.json(user);
});
```

### Database Query Timeouts

```python
import psycopg2
from psycopg2 import pool

# Connection pool with statement timeout
db_pool = pool.SimpleConnectionPool(
    minconn=5,
    maxconn=20,
    host="db.example.com",
    database="app",
    user="app_user",
    password="...",
    options="-c statement_timeout=5000"  # 5s default
)

def execute_query(query, params=None, timeout_ms=5000):
    """Execute query with specific timeout."""
    conn = db_pool.getconn()
    try:
        cursor = conn.cursor()

        # Set timeout for this specific query
        cursor.execute(f"SET statement_timeout = {timeout_ms}")
        cursor.execute(query, params)

        result = cursor.fetchall()
        conn.commit()
        return result

    except psycopg2.errors.QueryCanceled:
        conn.rollback()
        raise TimeoutError(f"Query exceeded {timeout_ms}ms timeout")
    finally:
        db_pool.putconn(conn)

# Fast queries
users = execute_query(
    "SELECT * FROM users WHERE id = %s",
    (user_id,),
    timeout_ms=1000  # 1 second
)

# Slow reports can take longer
report_data = execute_query(
    "SELECT ... FROM orders JOIN products ... WHERE ...",
    (start_date, end_date),
    timeout_ms=30000  # 30 seconds
)
```

### Cascading Timeouts

Your timeout hierarchy should cascade - each layer slightly shorter than the layer above:

```
Client timeout:          30s
├── API Gateway:         28s
    ├── Service A:       25s
        ├── Database:    20s
        └── Cache:       5s
```

This gives each layer time to return a proper error response instead of just timing out.

## 5. Graceful Degradation

When dependencies fail, degrade gracefully instead of failing completely.

### Fallback Strategies

```python
from functools import wraps
import logging

logger = logging.getLogger(__name__)

def with_fallback(fallback_func):
    """Decorator that provides fallback on failure."""
    def decorator(primary_func):
        @wraps(primary_func)
        def wrapper(*args, **kwargs):
            try:
                return primary_func(*args, **kwargs)
            except Exception as e:
                logger.warning(
                    f"{primary_func.__name__} failed: {e}. "
                    f"Using fallback."
                )
                return fallback_func(*args, **kwargs)
        return wrapper
    return decorator

# Cached fallback
_recommendation_cache = {}

def get_cached_recommendations(user_id):
    """Return cached recommendations if available."""
    return _recommendation_cache.get(user_id, {
        "products": [],
        "message": "Recommendations temporarily unavailable"
    })

@with_fallback(get_cached_recommendations)
def get_user_recommendations(user_id):
    """Get personalized recommendations from ML service."""
    response = requests.get(
        f"https://ml-api.example.com/recommend/{user_id}",
        timeout=2
    )
    response.raise_for_status()

    recommendations = response.json()
    _recommendation_cache[user_id] = recommendations
    return recommendations

# Static fallback
def get_default_search_results(query):
    """Return popular items when search is down."""
    return {
        "results": get_popular_items(),
        "message": "Showing popular items (search temporarily unavailable)"
    }

@with_fallback(get_default_search_results)
def search_products(query):
    """Search using Elasticsearch."""
    response = es_client.search(
        index="products",
        body={"query": {"match": {"name": query}}},
        request_timeout=5
    )
    return response["hits"]["hits"]
```

### Feature Flags for Degradation

```javascript
// Feature flag service
class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.loadFromConfig();
  }

  isEnabled(flagName) {
    return this.flags.get(flagName) || false;
  }

  disable(flagName) {
    this.flags.set(flagName, false);
    console.log(`Feature disabled: ${flagName}`);
  }

  enable(flagName) {
    this.flags.set(flagName, true);
    console.log(`Feature enabled: ${flagName}`);
  }

  loadFromConfig() {
    // Load from config service, database, or environment
    this.flags.set('recommendations', true);
    this.flags.set('realtime-inventory', true);
    this.flags.set('advanced-search', true);
  }
}

const features = new FeatureFlags();

// Product listing with graceful degradation
async function getProductListing(category) {
  const products = await db.products.find({ category });

  // Enhance with recommendations if available
  if (features.isEnabled('recommendations')) {
    try {
      const recommendations = await fetchRecommendations(category);
      products.recommendations = recommendations;
    } catch (error) {
      // Recommendation service down - disable feature temporarily
      features.disable('recommendations');
      logger.error('Recommendations failed, disabling feature', error);
    }
  }

  // Enhance with real-time inventory if available
  if (features.isEnabled('realtime-inventory')) {
    try {
      products.inventory = await fetchInventory(products.map(p => p.id));
    } catch (error) {
      // Inventory service slow - use cached data
      products.inventory = await getCachedInventory(products.map(p => p.id));
      logger.warn('Using cached inventory data');
    }
  }

  return products;
}
```

### Priority Shedding

When under load, shed low-priority work first:

```python
from enum import IntEnum
import queue
import threading

class Priority(IntEnum):
    CRITICAL = 1   # Payment processing, checkout
    HIGH = 2       # User-facing features
    MEDIUM = 3     # Analytics, recommendations
    LOW = 4        # Background tasks, emails

class PriorityQueue:
    def __init__(self, max_size=1000):
        self.queue = queue.PriorityQueue(maxsize=max_size)
        self.dropped_count = {p: 0 for p in Priority}
        self.current_load = 0
        self.max_load = max_size

    def enqueue(self, item, priority=Priority.MEDIUM):
        """Add item to queue, dropping low priority if full."""
        self.current_load = self.queue.qsize()
        load_percentage = self.current_load / self.max_load

        # Under heavy load, drop non-critical work
        if load_percentage > 0.9 and priority >= Priority.MEDIUM:
            self.dropped_count[priority] += 1
            logger.warning(
                f"Dropping {priority.name} priority task "
                f"(load: {load_percentage:.1%})"
            )
            return False

        if load_percentage > 0.7 and priority == Priority.LOW:
            self.dropped_count[priority] += 1
            return False

        try:
            self.queue.put((priority.value, item), block=False)
            return True
        except queue.Full:
            self.dropped_count[priority] += 1
            return False

    def dequeue(self, timeout=1):
        """Get next item from queue."""
        try:
            priority, item = self.queue.get(timeout=timeout)
            return item
        except queue.Empty:
            return None

# Usage
task_queue = PriorityQueue()

def process_payment(payment_data):
    """Critical - always process."""
    task_queue.enqueue(
        {'type': 'payment', 'data': payment_data},
        Priority.CRITICAL
    )

def send_analytics_event(event_data):
    """Low priority - drop under load."""
    task_queue.enqueue(
        {'type': 'analytics', 'data': event_data},
        Priority.LOW
    )
```

## 6. Dead Letter Queues

For asynchronous operations, dead letter queues capture messages that can't be processed so you can investigate and retry later.

### Message Queue with DLQ

```javascript
// Using AWS SQS as example, but pattern applies to any queue system
const { SQSClient, SendMessageCommand, ReceiveMessageCommand,
        DeleteMessageCommand } = require('@aws-sdk/client-sqs');

const sqs = new SQSClient({ region: 'us-east-1' });

const MAIN_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123/orders';
const DLQ_URL = 'https://sqs.us-east-1.amazonaws.com/123/orders-dlq';

async function processOrder(orderData) {
  // Processing logic that might fail
  if (!orderData.customerId) {
    throw new Error('Missing customer ID');
  }

  // Process order...
  await db.orders.insert(orderData);
  await sendConfirmationEmail(orderData.email);
}

async function consumeMessages() {
  while (true) {
    try {
      const { Messages } = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: MAIN_QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 30
      }));

      if (!Messages || Messages.length === 0) {
        continue;
      }

      for (const message of Messages) {
        const receiveCount = parseInt(
          message.Attributes?.ApproximateReceiveCount || '0'
        );

        try {
          const orderData = JSON.parse(message.Body);
          await processOrder(orderData);

          // Success - delete from queue
          await sqs.send(new DeleteMessageCommand({
            QueueUrl: MAIN_QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle
          }));

        } catch (error) {
          console.error('Order processing failed:', error);

          if (receiveCount >= 3) {
            // Max retries reached - move to DLQ manually
            // (or configure automatic DLQ in SQS settings)
            await sqs.send(new SendMessageCommand({
              QueueUrl: DLQ_URL,
              MessageBody: message.Body,
              MessageAttributes: {
                ErrorMessage: {
                  DataType: 'String',
                  StringValue: error.message
                },
                FailureTime: {
                  DataType: 'String',
                  StringValue: new Date().toISOString()
                },
                OriginalReceiptHandle: {
                  DataType: 'String',
                  StringValue: message.ReceiptHandle
                }
              }
            }));

            // Remove from main queue
            await sqs.send(new DeleteMessageCommand({
              QueueUrl: MAIN_QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle
            }));

            console.log('Message moved to DLQ after 3 failures');
          }
          // If not max retries, message becomes visible again for retry
        }
      }

    } catch (error) {
      console.error('Queue consumer error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// DLQ inspection and reprocessing
async function inspectDeadLetters() {
  const { Messages } = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: DLQ_URL,
    MaxNumberOfMessages: 10
  }));

  return Messages?.map(m => ({
    body: JSON.parse(m.Body),
    error: m.MessageAttributes?.ErrorMessage?.StringValue,
    failedAt: m.MessageAttributes?.FailureTime?.StringValue,
    receiptHandle: m.ReceiptHandle
  })) || [];
}

async function reprocessDeadLetter(receiptHandle) {
  // After fixing the issue, reprocess message
  const message = await getMessageByReceiptHandle(receiptHandle);

  // Send back to main queue
  await sqs.send(new SendMessageCommand({
    QueueUrl: MAIN_QUEUE_URL,
    MessageBody: message.Body
  }));

  // Remove from DLQ
  await sqs.send(new DeleteMessageCommand({
    QueueUrl: DLQ_URL,
    ReceiptHandle: receiptHandle
  }));
}
```

### Database-Based DLQ Pattern

If you're not using a message queue service:

```python
from datetime import datetime
from enum import Enum

class MessageStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"

# Database schema
# CREATE TABLE message_queue (
#     id SERIAL PRIMARY KEY,
#     message_type VARCHAR(100),
#     payload JSONB,
#     status VARCHAR(20),
#     attempts INTEGER DEFAULT 0,
#     max_attempts INTEGER DEFAULT 3,
#     error_message TEXT,
#     created_at TIMESTAMP DEFAULT NOW(),
#     processed_at TIMESTAMP,
#     dead_letter_at TIMESTAMP
# );

class MessageQueue:
    def __init__(self, db_connection):
        self.db = db_connection

    def enqueue(self, message_type, payload, max_attempts=3):
        """Add message to queue."""
        self.db.execute("""
            INSERT INTO message_queue
            (message_type, payload, status, max_attempts)
            VALUES (%s, %s, %s, %s)
        """, (message_type, payload, MessageStatus.PENDING.value, max_attempts))
        self.db.commit()

    def process_next(self):
        """Get and process next pending message."""
        # Atomic claim of next message
        message = self.db.execute("""
            UPDATE message_queue
            SET status = %s, attempts = attempts + 1
            WHERE id = (
                SELECT id FROM message_queue
                WHERE status IN (%s, %s)
                ORDER BY created_at
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *
        """, (
            MessageStatus.PROCESSING.value,
            MessageStatus.PENDING.value,
            MessageStatus.FAILED.value
        )).fetchone()

        if not message:
            return None

        try:
            # Process message
            self._process_message(message['message_type'], message['payload'])

            # Mark completed
            self.db.execute("""
                UPDATE message_queue
                SET status = %s, processed_at = NOW()
                WHERE id = %s
            """, (MessageStatus.COMPLETED.value, message['id']))
            self.db.commit()

        except Exception as e:
            error_msg = str(e)

            if message['attempts'] >= message['max_attempts']:
                # Move to dead letter
                self.db.execute("""
                    UPDATE message_queue
                    SET status = %s, error_message = %s, dead_letter_at = NOW()
                    WHERE id = %s
                """, (MessageStatus.DEAD_LETTER.value, error_msg, message['id']))
            else:
                # Mark failed for retry
                self.db.execute("""
                    UPDATE message_queue
                    SET status = %s, error_message = %s
                    WHERE id = %s
                """, (MessageStatus.FAILED.value, error_msg, message['id']))

            self.db.commit()
            raise

    def get_dead_letters(self, limit=100):
        """Get messages in dead letter status."""
        return self.db.execute("""
            SELECT * FROM message_queue
            WHERE status = %s
            ORDER BY dead_letter_at DESC
            LIMIT %s
        """, (MessageStatus.DEAD_LETTER.value, limit)).fetchall()

    def reprocess_dead_letter(self, message_id):
        """Reset dead letter message for reprocessing."""
        self.db.execute("""
            UPDATE message_queue
            SET status = %s, attempts = 0, error_message = NULL
            WHERE id = %s AND status = %s
        """, (MessageStatus.PENDING.value, message_id,
              MessageStatus.DEAD_LETTER.value))
        self.db.commit()
```

## 7. Error Budgets and SLOs

Error budgets quantify how much failure is acceptable. They turn reliability into a concrete number you can track and make decisions with.

### Defining SLOs

Service Level Objectives specify your reliability target:

```yaml
# services/payment-api/slo.yaml
slos:
  - name: API Availability
    target: 99.9%  # "three nines"
    measurement_window: 30_days

  - name: API Latency (p95)
    target: 500ms
    percentile: 95
    measurement_window: 7_days

  - name: Background Job Success Rate
    target: 99.5%
    measurement_window: 7_days

error_budget:
  # 99.9% availability = 0.1% error budget
  # Over 30 days (43,200 minutes):
  allowed_downtime_minutes: 43.2  # 0.1% of 43,200

  # Error budget policy
  policy:
    budget_exhausted:
      - freeze_releases
      - focus_on_reliability
      - mandatory_postmortems

    budget_healthy:
      - normal_release_cadence
      - invest_in_features
```

### Tracking Error Budget

```python
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class SLO:
    name: str
    target_percentage: float
    measurement_window_days: int

@dataclass
class ErrorBudget:
    slo: SLO
    total_requests: int
    failed_requests: int
    measurement_start: datetime

    @property
    def actual_percentage(self):
        """Current success rate."""
        if self.total_requests == 0:
            return 100.0
        success_rate = (
            (self.total_requests - self.failed_requests) /
            self.total_requests * 100
        )
        return success_rate

    @property
    def allowed_failures(self):
        """Total failures allowed in budget."""
        return int(self.total_requests * (1 - self.slo.target_percentage / 100))

    @property
    def remaining_budget(self):
        """How many more failures are allowed."""
        return self.allowed_failures - self.failed_requests

    @property
    def budget_consumed_percentage(self):
        """Percentage of error budget consumed."""
        if self.allowed_failures == 0:
            return 0.0
        return (self.failed_requests / self.allowed_failures) * 100

    @property
    def is_budget_exhausted(self):
        """Whether we've exceeded our error budget."""
        return self.actual_percentage < self.slo.target_percentage

    def __str__(self):
        return f"""
Error Budget Report: {self.slo.name}
Target SLO: {self.slo.target_percentage}%
Actual: {self.actual_percentage:.3f}%
Budget Consumed: {self.budget_consumed_percentage:.1f}%
Remaining Failures: {self.remaining_budget:,} of {self.allowed_failures:,}
Status: {'⚠️  EXHAUSTED' if self.is_budget_exhausted else '✓ Healthy'}
        """.strip()

# Usage
api_slo = SLO(
    name="Payment API Availability",
    target_percentage=99.9,
    measurement_window_days=30
)

# Get metrics from monitoring system
budget = ErrorBudget(
    slo=api_slo,
    total_requests=10_000_000,
    failed_requests=15_000,
    measurement_start=datetime.now() - timedelta(days=30)
)

print(budget)
# Error Budget Report: Payment API Availability
# Target SLO: 99.9%
# Actual: 99.850%
# Budget Consumed: 150.0%
# Remaining Failures: -5,000 of 10,000
# Status: ⚠️  EXHAUSTED
```

### Error Budget Policy Automation

```javascript
// Automated actions based on error budget
class ErrorBudgetPolicy {
  constructor(slo, metrics) {
    this.slo = slo;
    this.metrics = metrics;
    this.actions = [];
  }

  evaluate() {
    const budget = this.calculateBudget();

    if (budget.consumed >= 100) {
      this.actions.push({
        severity: 'critical',
        action: 'freeze_releases',
        message: 'Error budget exhausted - release freeze in effect'
      });

      this.actions.push({
        severity: 'high',
        action: 'mandatory_postmortem',
        message: 'Postmortem required for all incidents'
      });
    } else if (budget.consumed >= 75) {
      this.actions.push({
        severity: 'warning',
        action: 'limit_releases',
        message: 'Error budget at 75% - limit to critical releases only'
      });
    } else if (budget.consumed >= 50) {
      this.actions.push({
        severity: 'info',
        action: 'increase_monitoring',
        message: 'Error budget at 50% - increase alerting sensitivity'
      });
    } else {
      this.actions.push({
        severity: 'info',
        action: 'normal_operations',
        message: 'Error budget healthy - normal release cadence'
      });
    }

    return {
      budget,
      actions: this.actions
    };
  }

  calculateBudget() {
    const { total_requests, failed_requests } = this.metrics;
    const successRate = ((total_requests - failed_requests) / total_requests) * 100;
    const allowedFailures = total_requests * (1 - this.slo.target / 100);
    const consumed = (failed_requests / allowedFailures) * 100;

    return {
      successRate,
      allowedFailures,
      actualFailures: failed_requests,
      consumed,
      remaining: allowedFailures - failed_requests
    };
  }
}

// Integration with deployment pipeline
async function canDeploy(serviceName) {
  const metrics = await getServiceMetrics(serviceName);
  const slo = await getServiceSLO(serviceName);

  const policy = new ErrorBudgetPolicy(slo, metrics);
  const evaluation = policy.evaluate();

  const freezeActive = evaluation.actions.some(
    a => a.action === 'freeze_releases'
  );

  if (freezeActive) {
    console.error('Deployment blocked:', evaluation.actions[0].message);
    return false;
  }

  return true;
}
```

## 8. Structured Error Responses

RFC 7807 defines a standard format for HTTP problem details. Using it makes errors machine-readable and consistent.

### RFC 7807 Implementation

```python
from flask import Flask, jsonify, request
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any

@dataclass
class ProblemDetail:
    """RFC 7807 Problem Details for HTTP APIs."""
    type: str  # URI reference identifying the problem type
    title: str  # Short, human-readable summary
    status: int  # HTTP status code
    detail: Optional[str] = None  # Human-readable explanation
    instance: Optional[str] = None  # URI reference to specific occurrence

    # Extension members for additional context
    def with_extensions(self, **kwargs) -> Dict[str, Any]:
        """Add extension members to problem detail."""
        result = asdict(self)
        result.update(kwargs)
        return result

# Common problem types
class ProblemTypes:
    VALIDATION_ERROR = "https://api.example.com/problems/validation-error"
    NOT_FOUND = "https://api.example.com/problems/not-found"
    RATE_LIMIT = "https://api.example.com/problems/rate-limit-exceeded"
    AUTHENTICATION = "https://api.example.com/problems/authentication-required"
    AUTHORIZATION = "https://api.example.com/problems/insufficient-permissions"
    CONFLICT = "https://api.example.com/problems/resource-conflict"
    SERVER_ERROR = "https://api.example.com/problems/internal-error"

app = Flask(__name__)

@app.errorhandler(404)
def not_found(error):
    problem = ProblemDetail(
        type=ProblemTypes.NOT_FOUND,
        title="Resource Not Found",
        status=404,
        detail=str(error),
        instance=request.path
    )
    return jsonify(asdict(problem)), 404

@app.errorhandler(429)
def rate_limited(error):
    problem = ProblemDetail(
        type=ProblemTypes.RATE_LIMIT,
        title="Rate Limit Exceeded",
        status=429,
        detail="You have exceeded the allowed request rate"
    ).with_extensions(
        retry_after=60,
        limit=100,
        window_seconds=3600
    )

    response = jsonify(problem)
    response.headers['Retry-After'] = '60'
    return response, 429

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()

    # Validation
    errors = []
    if not data.get('email'):
        errors.append({'field': 'email', 'message': 'Email is required'})
    if not data.get('password') or len(data['password']) < 8:
        errors.append({
            'field': 'password',
            'message': 'Password must be at least 8 characters'
        })

    if errors:
        problem = ProblemDetail(
            type=ProblemTypes.VALIDATION_ERROR,
            title="Validation Failed",
            status=400,
            detail="Request body contains invalid or missing fields",
            instance=request.path
        ).with_extensions(
            validation_errors=errors
        )
        return jsonify(problem), 400

    # Create user...
    return jsonify({'id': 123, 'email': data['email']}), 201
```

### Client-Side Error Handling

```javascript
class ApiError extends Error {
  constructor(problemDetail) {
    super(problemDetail.title);
    this.name = 'ApiError';
    this.type = problemDetail.type;
    this.status = problemDetail.status;
    this.detail = problemDetail.detail;
    this.instance = problemDetail.instance;
    this.extensions = problemDetail;
  }

  isValidationError() {
    return this.type.endsWith('/validation-error');
  }

  isRateLimit() {
    return this.status === 429;
  }

  isRetryable() {
    return this.status >= 500 || this.status === 429;
  }
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json, application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/problem+json')) {
      const problem = await response.json();
      throw new ApiError(problem);
    }

    // Fallback for non-RFC 7807 errors
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Usage
async function createUser(userData) {
  try {
    return await apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isValidationError()) {
        // Handle validation errors
        console.log('Validation errors:', error.extensions.validation_errors);
        return { errors: error.extensions.validation_errors };
      }

      if (error.isRateLimit()) {
        const retryAfter = error.extensions.retry_after;
        console.log(`Rate limited. Retry after ${retryAfter}s`);
        // Maybe queue for later
      }

      if (error.isRetryable()) {
        // Implement retry logic
      }
    }

    throw error;
  }
}
```

## 9. Error Monitoring and Alerting

You can't fix errors you don't know about. Proper monitoring catches problems before users report them.

### Structured Logging

```python
import logging
import json
from datetime import datetime
from contextvars import ContextVar

# Request context for correlation
request_id_var = ContextVar('request_id', default=None)

class StructuredLogger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)

        handler = logging.StreamHandler()
        handler.setFormatter(self.StructuredFormatter())
        self.logger.addHandler(handler)

    class StructuredFormatter(logging.Formatter):
        def format(self, record):
            log_data = {
                'timestamp': datetime.utcnow().isoformat(),
                'level': record.levelname,
                'logger': record.name,
                'message': record.getMessage(),
                'request_id': request_id_var.get(),
            }

            # Add exception info if present
            if record.exc_info:
                log_data['exception'] = {
                    'type': record.exc_info[0].__name__,
                    'message': str(record.exc_info[1]),
                    'traceback': self.formatException(record.exc_info)
                }

            # Add extra fields
            for key, value in record.__dict__.items():
                if key not in ('name', 'msg', 'args', 'created', 'filename',
                              'funcName', 'levelname', 'levelno', 'lineno',
                              'module', 'msecs', 'message', 'pathname',
                              'process', 'processName', 'relativeCreated',
                              'thread', 'threadName', 'exc_info', 'exc_text',
                              'stack_info'):
                    log_data[key] = value

            return json.dumps(log_data)

    def error(self, message, **kwargs):
        self.logger.error(message, extra=kwargs)

    def info(self, message, **kwargs):
        self.logger.info(message, extra=kwargs)

    def warning(self, message, **kwargs):
        self.logger.warning(message, extra=kwargs)

# Usage
logger = StructuredLogger(__name__)

def process_payment(order_id, amount):
    try:
        request_id_var.set(f"req_{order_id}_{datetime.now().timestamp()}")

        logger.info(
            "Processing payment",
            order_id=order_id,
            amount=amount,
            currency="USD"
        )

        # Payment processing...

        logger.info(
            "Payment successful",
            order_id=order_id,
            transaction_id="txn_123"
        )

    except Exception as e:
        logger.error(
            "Payment failed",
            order_id=order_id,
            amount=amount,
            error_type=type(e).__name__,
            exc_info=True
        )
        raise

# Output:
# {"timestamp": "2025-11-15T10:30:00.123Z", "level": "INFO",
#  "logger": "__main__", "message": "Processing payment",
#  "request_id": "req_12345_1700048400.123",
#  "order_id": 12345, "amount": 99.99, "currency": "USD"}
```

### Error Aggregation

```javascript
// Send errors to aggregation service (Sentry, Rollbar, etc.)
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

  beforeSend(event, hint) {
    // Filter out noise
    const error = hint.originalException;

    // Don't send validation errors
    if (error?.name === 'ValidationError') {
      return null;
    }

    // Don't send client errors (4xx) except auth issues
    if (error?.status >= 400 && error?.status < 500 && error?.status !== 401) {
      return null;
    }

    // Add custom context
    event.tags = {
      ...event.tags,
      deployment: process.env.DEPLOY_ID,
      region: process.env.AWS_REGION
    };

    return event;
  }
});

// Express middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Routes...

app.use(Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture 5xx errors
    return error.status >= 500;
  }
}));

// Manual error capture with context
function processOrder(orderData) {
  try {
    // Process order...
  } catch (error) {
    Sentry.withScope(scope => {
      scope.setContext('order', {
        id: orderData.id,
        amount: orderData.amount,
        items: orderData.items.length
      });
      scope.setUser({
        id: orderData.customerId,
        email: orderData.customerEmail
      });
      scope.setLevel('error');

      Sentry.captureException(error);
    });

    throw error;
  }
}
```

### Alert Configuration

```yaml
# Prometheus alerting rules
groups:
  - name: api_errors
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }} over 5 minutes"

      # Error budget burn rate
      - alert: ErrorBudgetBurnRateCritical
        expr: |
          (
            (1 - slo:availability:ratio_rate5m{service="api"})
            >
            (14.4 * (1 - 0.999))  # 99.9% SLO, burning 2% budget/hour
          )
        for: 1h
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "Burning error budget too fast"
          description: "At current rate, 30-day error budget will be exhausted in {{ $value | humanizeDuration }}"

      # Circuit breaker open
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{state="open"} == 1
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Circuit breaker open for {{ $labels.dependency }}"
          description: "Circuit breaker has been open for 5 minutes, requests are failing fast"

      # Dead letter queue growing
      - alert: DeadLetterQueueGrowing
        expr: increase(sqs_messages_visible{queue=~".*-dlq"}[1h]) > 100
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Dead letter queue {{ $labels.queue }} growing"
          description: "Added {{ $value }} messages to DLQ in the last hour"
```

## 10. Chaos Engineering Basics

Testing your resilience patterns means breaking things on purpose. Chaos engineering helps you find weaknesses before they find you in production.

### Simple Chaos Experiments

```python
import random
from functools import wraps
import os

class ChaosConfig:
    """Configuration for chaos experiments."""
    ENABLED = os.getenv('CHAOS_ENABLED', 'false').lower() == 'true'
    FAILURE_RATE = float(os.getenv('CHAOS_FAILURE_RATE', '0.1'))
    LATENCY_MS = int(os.getenv('CHAOS_LATENCY_MS', '1000'))

def chaos_latency(min_ms=100, max_ms=5000):
    """Inject random latency."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if ChaosConfig.ENABLED and random.random() < ChaosConfig.FAILURE_RATE:
                delay = random.randint(min_ms, max_ms) / 1000
                print(f"[CHAOS] Injecting {delay:.2f}s latency into {func.__name__}")
                time.sleep(delay)
            return func(*args, **kwargs)
        return wrapper
    return decorator

def chaos_exception(exception_type=Exception, message="Chaos exception"):
    """Randomly raise exceptions."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if ChaosConfig.ENABLED and random.random() < ChaosConfig.FAILURE_RATE:
                print(f"[CHAOS] Raising {exception_type.__name__} in {func.__name__}")
                raise exception_type(message)
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Apply to external calls
@chaos_latency(min_ms=500, max_ms=3000)
@chaos_exception(TimeoutError, "Simulated timeout")
def fetch_user_profile(user_id):
    """Fetch user profile from external service."""
    response = requests.get(f"https://api.example.com/users/{user_id}")
    return response.json()

# Test your circuit breaker
for i in range(20):
    try:
        profile = fetch_user_profile(123)
        print(f"Request {i}: Success")
    except Exception as e:
        print(f"Request {i}: Failed - {e}")
```

### Controlled Chaos with Feature Flags

```javascript
// More controlled chaos using feature flags
class ChaosExperiments {
  constructor(featureFlags) {
    this.flags = featureFlags;
  }

  // Experiment: Database connection pool exhaustion
  async databaseConnectionChaos(dbPool) {
    if (!this.flags.isEnabled('chaos-db-pool')) {
      return;
    }

    console.log('[CHAOS] Exhausting database connection pool');

    // Hold connections without releasing
    const heldConnections = [];
    for (let i = 0; i < dbPool.maxSize; i++) {
      const conn = await dbPool.connect();
      heldConnections.push(conn);
    }

    // Release after 30 seconds
    setTimeout(() => {
      heldConnections.forEach(conn => conn.release());
      console.log('[CHAOS] Released held connections');
    }, 30000);
  }

  // Experiment: Simulate slow dependency
  async simulateSlowDependency(normalFunc, slowMs = 10000) {
    if (!this.flags.isEnabled('chaos-slow-dependency')) {
      return await normalFunc();
    }

    console.log(`[CHAOS] Adding ${slowMs}ms delay`);
    await new Promise(resolve => setTimeout(resolve, slowMs));
    return await normalFunc();
  }

  // Experiment: Return errors from specific endpoint
  errorInjectionMiddleware() {
    return (req, res, next) => {
      const endpoints = this.flags.get('chaos-error-endpoints') || [];

      if (endpoints.includes(req.path)) {
        const errorRate = this.flags.get('chaos-error-rate') || 0.1;

        if (Math.random() < errorRate) {
          console.log(`[CHAOS] Injecting 500 error for ${req.path}`);
          return res.status(500).json({
            error: 'Chaos engineering experiment',
            experiment: 'error-injection'
          });
        }
      }

      next();
    };
  }
}

// Usage in tests or staging environment
const chaos = new ChaosExperiments(featureFlags);

// Enable specific experiment
featureFlags.enable('chaos-slow-dependency');
featureFlags.set('chaos-error-endpoints', ['/api/payments', '/api/inventory']);
featureFlags.set('chaos-error-rate', 0.2);

app.use(chaos.errorInjectionMiddleware());
```

### Production-Safe Chaos

Never run chaos experiments in production without safeguards:

1. **Start small** - One service, low blast radius
2. **Gradual rollout** - 1% of traffic, then 5%, then 10%
3. **Business hours only** - When engineers are watching
4. **Automatic rollback** - Kill switch if metrics degrade
5. **Alert before breaking** - Notify on-call before experiment starts

Tools for production chaos engineering:
- **Chaos Monkey** (Netflix) - Random instance termination
- **Litmus** - Kubernetes chaos engineering
- **Gremlin** - Comprehensive chaos platform
- **AWS Fault Injection Simulator** - Managed chaos for AWS
- **Chaos Mesh** - Open source Kubernetes chaos

## Putting It All Together

Here's what a resilient service looks like with all these patterns:

```python
# Resilient payment service
from dataclasses import dataclass
import logging

logger = StructuredLogger(__name__)

# Circuit breakers for dependencies
stripe_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    name="Stripe API"
)

fraud_check_breaker = CircuitBreaker(
    failure_threshold=3,
    recovery_timeout=30,
    name="Fraud Check"
)

# Bulkhead for non-critical operations
analytics_bulkhead = Bulkhead(max_concurrent=5, timeout=10)

@dataclass
class PaymentResult:
    success: bool
    transaction_id: Optional[str] = None
    error: Optional[str] = None
    degraded: bool = False

@retry_with_backoff(
    max_attempts=3,
    base_delay=1,
    retryable_exceptions=(NetworkError, TimeoutError)
)
def process_payment(
    order_id: str,
    amount: Decimal,
    idempotency_key: str
) -> PaymentResult:
    """
    Process payment with full resilience patterns:
    - Circuit breakers for external services
    - Retries with backoff
    - Graceful degradation
    - Structured logging
    - Idempotency
    """
    logger.info(
        "Processing payment",
        order_id=order_id,
        amount=str(amount),
        idempotency_key=idempotency_key
    )

    # Critical path: charge payment (with circuit breaker)
    try:
        def _charge():
            return stripe.charge(
                amount=amount,
                idempotency_key=idempotency_key,
                timeout=5
            )

        charge_result = stripe_breaker.call(_charge)
        transaction_id = charge_result['id']

    except CircuitBreakerError:
        logger.error("Payment circuit breaker open", order_id=order_id)
        return PaymentResult(
            success=False,
            error="Payment service temporarily unavailable"
        )
    except Exception as e:
        logger.error(
            "Payment charging failed",
            order_id=order_id,
            error=str(e),
            exc_info=True
        )
        raise

    # Non-critical: fraud check (with fallback)
    fraud_score = None
    try:
        def _fraud_check():
            return fraud_api.check_transaction(transaction_id, timeout=2)

        fraud_score = fraud_check_breaker.call(_fraud_check)

    except (CircuitBreakerError, TimeoutError) as e:
        logger.warning(
            "Fraud check degraded",
            order_id=order_id,
            reason=str(e)
        )
        # Degrade gracefully - allow payment but flag for review
        fraud_score = {'needs_review': True, 'degraded': True}

    # Non-critical: analytics (with bulkhead and fire-and-forget)
    try:
        analytics_bulkhead.execute(
            send_analytics_event,
            {
                'event': 'payment_processed',
                'order_id': order_id,
                'amount': str(amount)
            }
        )
    except Exception as e:
        # Analytics failure doesn't affect payment
        logger.warning("Analytics failed", error=str(e))

    logger.info(
        "Payment completed",
        order_id=order_id,
        transaction_id=transaction_id,
        fraud_score=fraud_score
    )

    return PaymentResult(
        success=True,
        transaction_id=transaction_id,
        degraded=fraud_score.get('degraded', False)
    )
```

This service survives:
- Stripe API downtime (circuit breaker returns error immediately)
- Fraud service timeouts (degrades gracefully, flags for review)
- Analytics service failures (isolated in bulkhead, doesn't block payment)
- Network glitches (retries with backoff)
- Duplicate requests (idempotency key prevents double-charging)

And you can monitor it all:
- Structured logs for debugging
- Metrics on circuit breaker state
- Error budget tracking for SLO compliance
- Alerts when degraded mode persists

## Key Takeaways

1. **Circuit breakers** prevent cascading failures by failing fast when dependencies are down
2. **Bulkheads** isolate resources so one failure can't exhaust all capacity
3. **Retries with backoff** hide transient failures without amplifying load
4. **Timeouts at every layer** prevent hanging requests from accumulating
5. **Graceful degradation** keeps core functionality working when nice-to-have features fail
6. **Dead letter queues** capture failed async operations for investigation and replay
7. **Error budgets** quantify acceptable failure and guide operational decisions
8. **Structured errors** make failures machine-readable and debuggable
9. **Comprehensive monitoring** catches problems before users do
10. **Chaos engineering** validates your resilience assumptions

The difference between a system that falls over at the first sign of trouble and one that keeps running through failure is these patterns. They're not complicated, but they need to be designed in from the start, not bolted on when things catch fire at 3am.

## Next Steps

- Read [Monitoring & Observability](../../06-operations/monitoring-observability/surface/) for visibility into these patterns
- See [API Design](../api-design/mid-depth/) for resilient API contracts
- Study [Architecture Design](../architecture-design/mid-depth/) for system-level resilience
- Check [Incident Response](../../06-operations/incident-response/mid-depth/) for handling failures when they do occur
