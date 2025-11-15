---
title: "Error Handling Design Essentials"
phase: "02-design"
topic: "error-handling-resilience"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["api-design", "architecture-design", "monitoring-observability"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Error Handling Design Essentials

Your app will fail. The payment processor will timeout. The database will refuse connections. A user will upload a 500MB file to an endpoint expecting 5MB. These aren't edge cases - they're Tuesday.

Most developers bolt on error handling after something breaks in production. That's backwards. The best time to design error handling is before you write the first line of implementation code.

## Why Design Errors Upfront

When you treat errors as an afterthought, you get this:

```javascript
try {
  const payment = await processPayment(orderId);
  return payment;
} catch (error) {
  console.log(error);
  return { error: "Something went wrong" };
}
```

The user sees "Something went wrong." Your logs say `[object Object]`. You have no idea if it was a timeout, a declined card, or a network issue. The customer support team gets an angry email with no actionable information.

Designing error handling upfront means deciding:
- Which errors do you expect and how will you handle them?
- What does the user need to know vs what do you need to log?
- When should you retry vs fail immediately?
- What happens when a dependency is down?

These aren't implementation details. They're design decisions that affect user experience, system reliability, and your ability to debug production issues.

## Expected vs Unexpected Errors

Not all errors are equal. Some are part of normal operation. Others indicate something fundamentally wrong.

**Expected errors** are business rules and validation failures:
- Invalid credit card number
- User not authorized to access a resource
- Resource not found
- Rate limit exceeded
- File too large

You should design specific responses for these. They're not bugs - they're anticipated scenarios.

**Unexpected errors** are system failures:
- Database connection refused
- Out of memory
- External API returned 500
- Null pointer exception
- Disk full

These indicate something broke that shouldn't have. You can't predict every unexpected error, but you can design how your system responds when they happen.

Here's the difference in practice:

```javascript
// Bad: Treating everything the same
async function getUser(userId) {
  try {
    const user = await db.users.findById(userId);
    return user;
  } catch (error) {
    throw new Error("Failed to get user");
  }
}

// Good: Distinguish expected from unexpected
async function getUser(userId) {
  try {
    const user = await db.users.findById(userId);

    if (!user) {
      // Expected: User doesn't exist
      throw new NotFoundError(`User ${userId} not found`);
    }

    return user;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Pass through expected errors
    }

    // Unexpected: Database connection failed, query error, etc.
    logger.error('Database error fetching user', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw new SystemError('Unable to retrieve user data');
  }
}
```

The first version hides whether the user doesn't exist or the database is down. The second makes that distinction explicit, which matters for how you respond.

## User-Facing Messages That Actually Help

Error messages for users need to be:
1. Clear about what happened
2. Actionable when possible
3. Never expose internal details

Compare these messages for a payment failure:

**Bad:** "Error code 5023"

**Bad:** "Database query failed: Connection timeout to postgres-primary.internal:5432"

**Good:** "We couldn't process your payment. Please check your card details and try again."

**Better:** "Your card was declined. Please verify the card number and billing address, or try a different payment method."

The first tells the user nothing. The second leaks your infrastructure (postgres? internal domains?). The third is clear but generic. The fourth tells the user specifically what to check.

For different error types:

```javascript
function getUserFriendlyMessage(error) {
  if (error instanceof ValidationError) {
    // Specific validation failures
    return `Please correct the following: ${error.fields.join(', ')}`;
  }

  if (error instanceof NotFoundError) {
    return 'We couldn't find that item. It may have been deleted.';
  }

  if (error instanceof UnauthorizedError) {
    return 'You don't have permission to access this resource.';
  }

  if (error instanceof RateLimitError) {
    return `Too many requests. Please wait ${error.retryAfter} seconds.`;
  }

  // Unexpected errors: Don't expose internals
  return 'Something went wrong on our end. We've been notified and are looking into it.';
}
```

Notice the last case. When something unexpected breaks, you tell the user it's not their fault, you're aware of it, and you don't mention database timeouts or null pointers.

## Logging for Debugging

What the user sees is one thing. What you log is another. Logs are for you to debug issues, so include everything you'll need:

```javascript
// Bad logging
catch (error) {
  console.log("Error processing payment");
}

// Good logging
catch (error) {
  logger.error('Payment processing failed', {
    orderId: order.id,
    userId: user.id,
    amount: order.total,
    paymentMethod: order.paymentMethod,
    provider: 'stripe',
    error: error.message,
    errorCode: error.code,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
}
```

The first log is useless. Which payment? For which user? What actually failed?

The second gives you context. When you're debugging a production issue at 2am, you need to know what the user was trying to do, with what data, and what specifically failed.

Structure your logs:
- **Context:** What was happening (orderId, userId, operation)
- **Error details:** Message, code, stack trace
- **Environment:** Timestamp, server, deployment version
- **Don't log:** Passwords, credit card numbers, API keys, personal data (depending on regulations)

## When to Retry (and When Not To)

Some errors are transient. The network hiccuped. The API was briefly overloaded. These might succeed if you try again.

Other errors are permanent. The user's card is declined. The resource doesn't exist. Retrying won't help.

**Retry these:**
- Network timeouts
- Rate limit errors (with backoff)
- 503 Service Unavailable
- Connection refused (might be temporary)
- Database deadlocks

**Don't retry these:**
- 400 Bad Request (your request is invalid)
- 401 Unauthorized (you're not authenticated)
- 403 Forbidden (you don't have permission)
- 404 Not Found (the resource doesn't exist)
- Validation errors

Basic retry with exponential backoff:

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return await response.json();
      }

      // Don't retry client errors
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      // Server errors might be transient
      lastError = new Error(`Server error: ${response.status}`);

    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt) * 1000;
      await sleep(delayMs);

      logger.warn('Retrying request', {
        url,
        attempt: attempt + 1,
        maxRetries,
        delayMs
      });
    }
  }

  throw lastError;
}
```

This pattern waits longer between each retry (exponential backoff), which helps when a service is overloaded - you give it time to recover rather than hammering it more.

The key decision: identify which errors are worth retrying. Retrying a validation error just wastes time and resources.

## Fail Fast vs Graceful Degradation

When a dependency fails, you have two choices:

**Fail fast:** Return an error immediately. The operation can't continue without this dependency.

Example: Payment processing. If Stripe is down, you can't complete the purchase. Fail fast, show the user an error, let them try again later.

**Graceful degradation:** Continue with reduced functionality. The dependency is nice to have but not critical.

Example: Product recommendations. If the recommendation service is down, show popular items instead. The user can still browse and buy.

```javascript
async function getProductPage(productId) {
  const product = await db.products.findById(productId);

  if (!product) {
    // Fail fast: No product = no page
    throw new NotFoundError('Product not found');
  }

  let recommendations = [];
  try {
    // Try to get personalized recommendations
    recommendations = await recommendationService.getFor(productId);
  } catch (error) {
    // Graceful degradation: Fall back to popular items
    logger.warn('Recommendation service failed, using fallback', {
      productId,
      error: error.message
    });
    recommendations = await db.products.findPopular(5);
  }

  return {
    product,
    recommendations
  };
}
```

The product data is required - without it, there's no page to show. The recommendations are nice to have - if that service is down, show something reasonable instead.

Circuit breaker pattern takes this further. If a dependency keeps failing, stop trying to call it for a while:

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold; // Open circuit after this many failures
    this.timeout = timeout; // Wait this long before trying again
    this.state = 'closed'; // closed, open, half-open
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      // Try again (half-open state)
      this.state = 'half-open';
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

  onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

// Usage
const breaker = new CircuitBreaker();

async function getRecommendations(productId) {
  try {
    return await breaker.call(() =>
      recommendationService.getFor(productId)
    );
  } catch (error) {
    return fallbackRecommendations(productId);
  }
}
```

After 5 failures, the circuit opens - you stop calling the failing service and use the fallback immediately. After 60 seconds, you try once more (half-open). If it succeeds, you close the circuit and resume normal operation.

This protects the failing service from being overwhelmed and improves your response time (you're not waiting for timeouts).

## Common Mistakes

**Swallowing errors:**

```javascript
// Bad: Error disappears
try {
  await criticalOperation();
} catch (error) {
  // Nothing here
}
```

If you catch an error, do something with it - log it, return a default value, re-throw it. Silent failures are impossible to debug.

**Generic error messages:**

```javascript
// Bad: User has no idea what to fix
throw new Error('Invalid input');

// Good: User knows exactly what's wrong
throw new ValidationError('Email address must be in format: user@domain.com');
```

**Logging sensitive data:**

```javascript
// Bad: Logging passwords and credit cards
logger.error('Login failed', {
  username,
  password, // Never log passwords
  creditCard // Never log card numbers
});

// Good: Log what you need without secrets
logger.error('Login failed', {
  username,
  reason: 'invalid_credentials'
});
```

**Retrying non-idempotent operations without safeguards:**

```javascript
// Dangerous: Might charge the card multiple times
for (let i = 0; i < 3; i++) {
  try {
    await chargeCard(amount);
    break;
  } catch (error) {
    if (i === 2) throw error;
  }
}

// Better: Use idempotency keys
const idempotencyKey = generateKey();
for (let i = 0; i < 3; i++) {
  try {
    await chargeCard(amount, { idempotencyKey });
    break;
  } catch (error) {
    if (i === 2) throw error;
  }
}
```

The idempotency key ensures that even if you retry, the payment processor recognizes it's the same request and doesn't charge twice.

## Key Takeaways

Design error handling before you implement features. Decide upfront:

1. **Categorize errors:** Expected (validation, not found) vs unexpected (database down, out of memory)

2. **User messages:** Clear, actionable, never exposing internal details

3. **Logging:** Include context (user ID, operation, data) and error details (message, code, stack trace)

4. **Retry logic:** Only retry transient errors. Use exponential backoff. Don't retry validation failures.

5. **Fail fast or degrade:** Critical dependencies should fail fast. Nice-to-have features should degrade gracefully.

6. **Circuit breakers:** Stop calling failing dependencies to protect them and improve your response time.

Errors aren't exceptional - they're a normal part of running software. Design for them from the start, and you'll build systems that handle failure gracefully instead of catastrophically.

The YOLO dev who built something at 2am and now sees random crashes can start here: categorize your errors, add proper logging, and implement retry logic for external API calls. Those three changes will eliminate most production fire drills.
---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [API Design](../../api-design/surface/index.md) - Related design considerations
- [Architecture Design](../../architecture-design/surface/index.md) - Related design considerations
- [Performance & Scalability Design](../../performance-scalability-design/surface/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
