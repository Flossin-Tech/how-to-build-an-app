---
title: "Unit & Integration Testing"
phase: "04-testing"
topic: "unit-integration-testing"
depth: "mid-depth"
reading_time: 25
prerequisites: ["unit-integration-testing-surface"]
related_topics: ["tdd", "ci-cd-pipelines", "test-doubles", "property-based-testing"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Unit & Integration Testing (Mid-Depth)

## What This Builds On

The surface layer got you started with basic testing: write a test, verify it catches bugs, run it before deploying. You understand the difference between unit and integration tests, and you've shipped code with test coverage.

This mid-depth layer is for building production-ready test suites. You're solving different problems now:

- **Tests are slow.** Your suite takes 15 minutes to run. Developers skip tests before committing. CI/CD blocks deploys for half an hour.
- **Tests are brittle.** You refactor code and 30 tests break, even though behavior didn't change. Tests are coupled to implementation details.
- **Tests don't catch real bugs.** You have 80% coverage but bugs still ship. Your tests verify your code runs, not that it's correct.
- **Mocking confusion.** You mock everything and tests pass while production breaks. You mock nothing and tests are slow and flaky.
- **Growing codebase complexity.** Your simple test approach doesn't scale. Test data is a mess. Tests depend on each other.

We'll fix these problems with techniques from testing experts: Martin Fowler's test double taxonomy, Kent C. Dodds' Testing Trophy, and Maurizio Aniche's test effectiveness research.

## The Problems You're Solving

### Problem 1: Slow Tests Kill Productivity

Your integration tests hit the database. Every test creates test data, runs queries, cleans up. The suite takes 20 minutes.

Developers stop running tests locally. They push code, wait for CI/CD, then fix failures. The feedback loop is 30 minutes instead of 30 seconds.

**Solution approach:**
- Use test doubles at architectural boundaries (mock external APIs, not internal functions)
- Use fast in-memory databases for integration tests
- Parallelize test execution
- Separate fast tests from slow tests

We'll cover these in detail.

### Problem 2: Brittle Tests Slow Down Refactoring

You rename a function. You change how a component renders internally. You refactor from classes to hooks. Tests break everywhere, even though behavior is identical.

This is testing implementation instead of behavior. Your tests are coupled to how code works, not what it does.

**Solution approach:**
- Test behavior users see, not internal implementation
- Avoid testing private functions directly
- Use higher-level integration tests instead of unit tests for complex interactions
- Follow the Testing Trophy model

### Problem 3: High Coverage, Low Effectiveness

You have 90% code coverage. Tests are green. A user enters unexpected input and the app crashes. Coverage measured lines executed, not whether tests were meaningful.

**Solution approach:**
- Property-based testing generates inputs you wouldn't think to test
- Mutation testing validates tests actually catch bugs
- Focus on specification-based testing (what should happen) not just structural testing (what code exists)

### Problem 4: Mock Abuse Creates False Confidence

You mock the database. You mock the email service. You mock internal functions. You mock everything. Tests pass. You deploy. Everything breaks because mocks don't match reality.

**Solution approach:**
- Understand test double types: mocks, stubs, fakes, spies
- Mock at architectural boundaries, not everywhere
- Use real implementations when practical
- Keep mocks synchronized with real services (contract testing)

## Test Doubles: When and How to Fake Dependencies

Martin Fowler's test doubles taxonomy clarifies the confusion around mocks, stubs, fakes, and spies. Each type serves different purposes.

### The Five Types of Test Doubles

#### 1. Dummy Objects

Objects passed around but never actually used. They fill parameter lists but aren't accessed.

```javascript
test('processes order without using logger', () => {
  const dummyLogger = null; // Never called, just fills parameter
  const order = new Order(dummyLogger);

  order.addItem('product-123');

  expect(order.total()).toBe(29.99);
});
```

You rarely create these intentionally. They emerge when functions require parameters you don't care about in a specific test.

#### 2. Stubs

Return canned responses to calls. No logic, just predetermined data.

```javascript
// Stub payment gateway - always succeeds
class StubPaymentGateway {
  async charge(amount, card) {
    return {
      id: 'ch_stub123',
      status: 'succeeded',
      amount: amount
    };
  }
}

test('creates order when payment succeeds', async () => {
  const paymentGateway = new StubPaymentGateway();
  const order = await checkout(cart, paymentGateway);

  expect(order.status).toBe('paid');
  expect(order.paymentId).toBe('ch_stub123');
});
```

**Stubs verify state.** Did the payment result in a paid order? Stubs don't care how you used them, only what they return.

**When to use stubs:**
- External services you don't control (payment gateways, shipping APIs)
- Tests that need specific responses (error conditions, edge cases)
- Making slow operations fast (database reads become instant returns)

#### 3. Spies

Record how they were called. Wrap real objects to observe behavior.

```javascript
test('sends welcome email after signup', async () => {
  const emailSpy = {
    sent: [],
    async send(to, subject, body) {
      this.sent.push({ to, subject, body });
    }
  };

  await createUser('user@example.com', 'password', emailSpy);

  // Verify email was sent
  expect(emailSpy.sent).toHaveLength(1);
  expect(emailSpy.sent[0].to).toBe('user@example.com');
  expect(emailSpy.sent[0].subject).toContain('Welcome');
});
```

**Spies verify behavior.** Was the email service called with the right arguments?

Most testing frameworks include spy functionality:

```javascript
// Jest spy
const emailService = {
  send: jest.fn()
};

await createUser('user@example.com', 'password', emailService);

expect(emailService.send).toHaveBeenCalledWith(
  'user@example.com',
  expect.stringContaining('Welcome'),
  expect.anything()
);
```

**When to use spies:**
- Verify side effects happened (email sent, event logged, API called)
- Check function was called with correct arguments
- Track call count (function called exactly once, or three times)

#### 4. Mocks

Pre-programmed with expectations. Tests fail if expectations aren't met.

```javascript
test('saves audit log on critical action', async () => {
  const auditLogger = {
    log: jest.fn()
  };

  await performCriticalAction(auditLogger);

  // Mock expectation: log must be called with specific arguments
  expect(auditLogger.log).toHaveBeenCalledWith({
    action: 'critical_action',
    timestamp: expect.any(Number),
    user: expect.any(String)
  });
});
```

Mocks and spies look similar. The difference is in intent. Spies observe what happened. Mocks define what should happen and fail if it doesn't.

**When to use mocks:**
- Verify interactions with dependencies (logging, analytics, external APIs)
- Ensure required side effects occur (audit logging, event publishing)
- Test code paths that depend on specific call sequences

#### 5. Fakes

Working implementations with shortcuts. Simpler than production but functionally equivalent for testing.

```javascript
// Fake in-memory database
class FakeDatabase {
  constructor() {
    this.users = [];
  }

  async create(data) {
    const user = { id: this.users.length + 1, ...data };
    this.users.push(user);
    return user;
  }

  async findById(id) {
    return this.users.find(u => u.id === id);
  }

  async clear() {
    this.users = [];
  }
}

// Use in tests
let db;

beforeEach(() => {
  db = new FakeDatabase();
});

test('can create and retrieve user', async () => {
  const user = await db.create({ email: 'test@example.com' });
  const found = await db.findById(user.id);

  expect(found.email).toBe('test@example.com');
});
```

**Fakes are real implementations, just simpler.** An in-memory database instead of PostgreSQL. A fake file system instead of disk I/O.

**When to use fakes:**
- Database (in-memory SQLite instead of PostgreSQL)
- File system (in-memory instead of disk)
- Time/clock (controllable time instead of real system time)
- Random number generators (seeded RNG for reproducibility)

### The Mock Abuse Anti-Pattern

The most common testing mistake is mocking everything. It creates tests that pass while production code is broken.

**Example of over-mocking:**

```javascript
// ❌ Bad - testing implementation, not behavior
test('creates user', async () => {
  const mockValidator = jest.fn().mockReturnValue(true);
  const mockHasher = jest.fn().mockReturnValue('hashed_password');
  const mockDb = jest.fn().mockResolvedValue({ id: 1 });
  const mockEmailer = jest.fn().mockResolvedValue(true);

  await createUser(
    'test@example.com',
    'password',
    mockValidator,
    mockHasher,
    mockDb,
    mockEmailer
  );

  expect(mockValidator).toHaveBeenCalled();
  expect(mockHasher).toHaveBeenCalled();
  expect(mockDb).toHaveBeenCalled();
  expect(mockEmailer).toHaveBeenCalled();
});
```

This test passes if you call the mocked functions, even if every function has bugs. You're testing that code calls functions, not that it works correctly.

**Better approach:**

```javascript
// ✅ Good - testing behavior with minimal mocking
test('creates user and sends welcome email', async () => {
  // Use real validator
  // Use real password hasher
  // Use real test database
  // Only mock external email service
  const emailSpy = { sent: [] };

  const user = await createUser('test@example.com', 'SecurePass123!', {
    sendEmail: (to, subject, body) => emailSpy.sent.push({ to, subject, body })
  });

  // Verify user was created correctly
  expect(user.id).toBeTruthy();
  expect(user.email).toBe('test@example.com');

  // Verify password was hashed (not stored plaintext)
  expect(user.password).not.toBe('SecurePass123!');
  expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash

  // Verify email was sent
  expect(emailSpy.sent).toHaveLength(1);
  expect(emailSpy.sent[0].to).toBe('test@example.com');

  // Verify can log in with created user
  const session = await login('test@example.com', 'SecurePass123!');
  expect(session.userId).toBe(user.id);
});
```

This test uses real implementations for everything except the external email service. If validation fails, password hashing breaks, or database saving fails, the test catches it.

### Decision Framework: Mock or Real?

**Use real implementations when:**
- Internal functions in your codebase
- Pure functions with no side effects
- Fast operations (validation, calculation, formatting)
- In-memory alternatives exist (SQLite instead of PostgreSQL)

**Use test doubles when:**
- External services you don't control (Stripe, Twilio, AWS)
- Slow operations you can't speed up (network calls, file I/O)
- Unpredictable operations (current time, random values)
- Testing error conditions (simulate API failure)

**Specific recommendations:**

| Dependency | Recommendation | Reason |
|------------|---------------|---------|
| Database | Real (in-memory) | Fake (SQLite) fast enough, catches real SQL bugs |
| External API | Stub/Mock | You don't control it, might be down, costs money |
| Email service | Stub/Spy | External service, slow, costs money |
| File system | Fake (in-memory) | Fake file systems fast and deterministic |
| Time/dates | Fake (controllable) | Makes tests deterministic |
| Random | Fake (seeded) | Makes tests reproducible |
| Validation | Real | Fast, pure logic, your code |
| Calculations | Real | Fast, pure logic, your code |

## Test-Driven Development (TDD) in Practice

TDD is a discipline: write test first, then implementation. Popularized by Kent Beck, it's been controversial. Some swear by it. Others find it impractical.

The truth is context-dependent.

### The Red-Green-Refactor Cycle

TDD follows a three-step loop:

1. **Red**: Write a failing test
2. **Green**: Write minimal code to make it pass
3. **Refactor**: Improve code while keeping tests green

**Complete example - Building a shopping cart:**

**Step 1: Red - Write failing test**

```javascript
test('can add item to cart', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: '123', name: 'Widget', price: 9.99 });

  expect(cart.items).toHaveLength(1);
  expect(cart.items[0].name).toBe('Widget');
});

// Test fails - ShoppingCart doesn't exist
```

**Step 2: Green - Minimal implementation**

```javascript
class ShoppingCart {
  constructor() {
    this.items = [];
  }

  addItem(item) {
    this.items.push(item);
  }
}

// Test passes
```

**Step 3: Refactor - Improve (nothing to improve yet)**

Continue the cycle.

**Step 4: Red - Next test**

```javascript
test('calculates total', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: '123', price: 9.99 });
  cart.addItem({ id: '456', price: 15.00 });

  expect(cart.total()).toBe(24.99);
});

// Test fails - total() doesn't exist
```

**Step 5: Green - Implement total()**

```javascript
class ShoppingCart {
  constructor() {
    this.items = [];
  }

  addItem(item) {
    this.items.push(item);
  }

  total() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}

// Test passes
```

**Step 6: Refactor - Add quantity support**

Current design doesn't support quantities. Refactor while tests stay green.

```javascript
test('supports item quantities', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: '123', price: 9.99 }, 2);

  expect(cart.total()).toBe(19.98);
});

// Test fails - quantity not supported
```

**Refactor to support quantities:**

```javascript
class ShoppingCart {
  constructor() {
    this.items = [];
  }

  addItem(item, quantity = 1) {
    this.items.push({ ...item, quantity });
  }

  total() {
    return this.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }
}

// All tests pass
```

TDD forces you to think about the interface before implementation. What should this function do? What should it return? What errors should it handle?

### When TDD Works Well

TDD shines in specific contexts:

**1. Well-understood requirements**

You know what the code should do. You just need to implement it.

```javascript
// Requirements: Calculate tax based on amount and rate
// Requirement: Reject negative amounts
// Requirement: Round to 2 decimal places

test('calculates tax for positive amount', () => {
  expect(calculateTax(100, 0.08)).toBe(8.00);
});

test('rejects negative amount', () => {
  expect(() => calculateTax(-100, 0.08)).toThrow('Amount must be positive');
});

test('rounds to 2 decimal places', () => {
  expect(calculateTax(100, 0.085)).toBe(8.50);
});
```

Writing tests first clarifies edge cases and requirements.

**2. Bug fixes**

Write a failing test that reproduces the bug, then fix the bug.

```javascript
// Bug report: User can submit form with empty email
test('rejects empty email', () => {
  expect(() => validateSignup({ email: '', password: 'pass' }))
    .toThrow('Email required');
});

// Test fails - bug confirmed
// Now fix the bug
// Test passes - bug fixed and won't regress
```

This guarantees the bug won't come back. If it does, the test catches it.

**3. Refactoring legacy code**

Write tests for current behavior (even if it's bad), then refactor.

```javascript
// Legacy code with no tests
function processPayment(amount, card) {
  // 200 lines of spaghetti code
}

// First: Write tests for current behavior
test('processes valid payment', () => {
  const result = processPayment(100, '4242424242424242');
  expect(result.status).toBe('success');
});

// Now refactor with confidence
// If tests pass, behavior is preserved
```

**4. Learning new APIs or libraries**

TDD helps you understand how an API works.

```javascript
// Learning how Stripe API works
test('creates customer', async () => {
  const customer = await stripe.customers.create({
    email: 'test@example.com'
  });

  expect(customer.id).toMatch(/^cus_/);
  expect(customer.email).toBe('test@example.com');
});
```

Writing tests forces you to read documentation and experiment.

### When TDD Struggles

TDD doesn't work well in every context:

**1. Exploratory work and spikes**

You don't know what you're building yet. You're experimenting with approaches.

```javascript
// Bad fit for TDD
// You don't know what the UI should look like
// You're trying different layouts and interactions
// Write the UI first, add tests after you know what works
```

**2. UI/UX development**

Hard to write tests before you know what the UI should look like.

**Better approach:** Build UI, get feedback, then add tests for the settled design.

**3. Unclear or changing requirements**

Tests for requirements that change every day become wasted effort.

**4. Learning unfamiliar technology**

When learning a new framework, library, or domain, test-first is backwards. You don't know what to test because you don't understand the technology yet.

**Better approach:** Spike without tests to learn, then delete spike code and rebuild with TDD.

### Pragmatic TDD: A Hybrid Approach

Neither pure TDD nor test-after is universally better. Use what works for the context.

**Recommended workflow:**

1. **Spike/explore** - Build quick proof-of-concept without tests
2. **Once approach is clear** - Delete spike code
3. **Rebuild with TDD** - Write tests first for settled design
4. **Or test-after** - If approach is very clear, implement then test

**Example: Building a new feature**

```javascript
// Phase 1: Spike (no tests)
// Try different approaches to see what works
// Get feedback on UI/UX
// This code will be deleted

// Phase 2: Rebuild with TDD
// You know what works now
// Write tests first
test('user can filter products by category', () => {
  // Test code
});

// Implement feature with confidence
```

Kent Beck (who popularized TDD) admits he doesn't always use it. Use TDD when it helps, skip it when it doesn't.

## Test Organization and Maintainability

As your codebase grows, test organization matters. Poorly organized tests become technical debt.

### Test Structure Patterns

Two popular patterns: AAA and Given-When-Then.

**AAA (Arrange-Act-Assert)**

```javascript
test('user can update profile', async () => {
  // Arrange - set up test data and preconditions
  const user = await createUser({
    email: 'user@example.com',
    name: 'Original Name'
  });
  const updates = { name: 'New Name' };

  // Act - perform the action being tested
  const result = await updateProfile(user.id, updates);

  // Assert - verify the outcome
  expect(result.name).toBe('New Name');
  expect(result.email).toBe('user@example.com'); // Unchanged

  // Verify database was updated
  const saved = await db.users.findById(user.id);
  expect(saved.name).toBe('New Name');
});
```

Clear structure makes tests readable. You see setup, action, and verification.

**Given-When-Then (BDD style)**

```javascript
describe('Shopping Cart Discounts', () => {
  it('applies 10% discount when total exceeds $100', async () => {
    // Given a cart with $120 worth of items
    const cart = new ShoppingCart();
    cart.addItem({ id: '1', price: 100, name: 'Item 1' });
    cart.addItem({ id: '2', price: 20, name: 'Item 2' });

    // When calculating total
    const total = cart.calculateTotal();

    // Then 10% discount is applied
    expect(total).toBe(108); // $120 - 10% = $108
  });

  it('does not apply discount when total is under $100', () => {
    // Given a cart with $80 worth of items
    const cart = new ShoppingCart();
    cart.addItem({ id: '1', price: 80, name: 'Item 1' });

    // When calculating total
    const total = cart.calculateTotal();

    // Then no discount is applied
    expect(total).toBe(80);
  });
});
```

Given-When-Then reads like specifications. Tests document requirements.

Both patterns work. Pick one and be consistent.

### Test Data Builders

As tests grow, creating test data becomes repetitive. Test Data Builder pattern solves this.

**Without builder (repetitive):**

```javascript
test('admin can delete posts', async () => {
  const admin = await createUser({
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    verified: true,
    createdAt: new Date()
  });

  const post = await createPost({
    title: 'Test Post',
    content: 'Content',
    author: admin.id,
    published: true,
    createdAt: new Date()
  });

  await deletePost(admin, post.id);

  expect(await findPost(post.id)).toBeNull();
});
```

**With builder (concise and readable):**

```javascript
class UserBuilder {
  constructor() {
    this.data = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      verified: true
    };
  }

  withEmail(email) {
    this.data.email = email;
    return this;
  }

  asAdmin() {
    this.data.role = 'admin';
    return this;
  }

  unverified() {
    this.data.verified = false;
    return this;
  }

  async build() {
    return await createUser(this.data);
  }
}

// Usage
test('admin can delete posts', async () => {
  const admin = await new UserBuilder()
    .asAdmin()
    .build();

  const post = await new PostBuilder()
    .withAuthor(admin.id)
    .build();

  await deletePost(admin, post.id);

  expect(await findPost(post.id)).toBeNull();
});
```

Builders make tests readable. You see what matters (user is admin) and ignore what doesn't (exact email address).

**Another example with multiple variations:**

```javascript
class OrderBuilder {
  constructor() {
    this.data = {
      status: 'pending',
      total: 0,
      items: []
    };
  }

  withItem(product, quantity = 1) {
    this.data.items.push({ product, quantity });
    this.data.total += product.price * quantity;
    return this;
  }

  paid() {
    this.data.status = 'paid';
    return this;
  }

  shipped() {
    this.data.status = 'shipped';
    return this;
  }

  async build() {
    return await createOrder(this.data);
  }
}

// Tests become self-documenting
test('can refund paid orders', async () => {
  const order = await new OrderBuilder()
    .withItem({ id: '123', price: 50 })
    .paid()
    .build();

  const refund = await refundOrder(order.id);
  expect(refund.amount).toBe(50);
});

test('cannot refund shipped orders', async () => {
  const order = await new OrderBuilder()
    .withItem({ id: '123', price: 50 })
    .shipped()
    .build();

  await expect(refundOrder(order.id))
    .rejects.toThrow('Cannot refund shipped orders');
});
```

### DAMP Tests, Not DRY Tests

DRY (Don't Repeat Yourself) is good for production code. Tests should be DAMP (Descriptive And Meaningful Phrases).

**Too DRY (bad for tests):**

```javascript
let user, product, cart;

beforeEach(async () => {
  user = await createStandardUser();
  product = await createStandardProduct();
  cart = await createStandardCart(user);
});

test('can checkout', async () => {
  // What's "standard"? Have to read beforeEach to understand
  await checkout(cart);
  expect(cart.status).toBe('complete');
});

test('cannot checkout empty cart', async () => {
  // Wait, this test uses empty cart but beforeEach creates non-empty cart?
  // Confusing!
  cart.items = [];
  await expect(checkout(cart)).rejects.toThrow();
});
```

**DAMP (good for tests):**

```javascript
test('can checkout with items in cart', async () => {
  const user = await createUser('user@example.com');
  const cart = await createCart(user);
  await cart.addItem({ id: '123', price: 50 });

  await checkout(cart);

  expect(cart.status).toBe('complete');
});

test('cannot checkout empty cart', async () => {
  const user = await createUser('user@example.com');
  const cart = await createCart(user); // Empty cart, explicit

  await expect(checkout(cart)).rejects.toThrow('Cart is empty');
});
```

Each test is self-contained. You understand it without reading other code.

**When to share setup:**

Share setup when every test needs identical preconditions:

```javascript
describe('User permissions', () => {
  let adminUser;

  beforeEach(async () => {
    // Every test needs admin user
    adminUser = await createUser({ role: 'admin' });
  });

  test('admin can delete users', async () => {
    // Uses adminUser
  });

  test('admin can ban users', async () => {
    // Uses adminUser
  });
});
```

But if tests need different data, make it explicit in each test.

## Property-Based Testing

Most tests use examples. Property-based testing uses generated inputs and verifies properties hold.

### Example-Based vs Property-Based

**Example-based (traditional):**

```javascript
test('reversing a string twice returns original', () => {
  expect(reverse(reverse('hello'))).toBe('hello');
  expect(reverse(reverse('world'))).toBe('world');
  expect(reverse(reverse('a'))).toBe('a');
});
```

You test specific examples. But what about strings you didn't think to test?

**Property-based (generative):**

```javascript
const fc = require('fast-check');

test('reversing a string twice returns original', () => {
  fc.assert(
    fc.property(fc.string(), (str) => {
      expect(reverse(reverse(str))).toBe(str);
    })
  );
});

// This generates hundreds of random strings
// Including edge cases: '', 'a', very long strings, Unicode, etc.
```

The framework generates inputs and verifies the property (reversing twice returns original) holds for all of them.

### When to Use Property-Based Testing

Property-based testing excels for code with clear invariants (rules that always hold).

**Good fits:**

**1. Mathematical properties**

```javascript
// Property: Sorting is idempotent (sorting twice = sorting once)
fc.assert(
  fc.property(fc.array(fc.integer()), (arr) => {
    const sorted1 = sort(arr);
    const sorted2 = sort(sorted1);
    expect(sorted1).toEqual(sorted2);
  })
);

// Property: Sorted array has same elements as original
fc.assert(
  fc.property(fc.array(fc.integer()), (arr) => {
    const sorted = sort(arr);
    expect(sorted.length).toBe(arr.length);
    expect(sorted.sort()).toEqual(arr.sort()); // Both sorted, should match
  })
);
```

**2. Encoders/decoders**

```javascript
// Property: Decoding encoded data returns original
fc.assert(
  fc.property(fc.anything(), (data) => {
    const encoded = encode(data);
    const decoded = decode(encoded);
    expect(decoded).toEqual(data);
  })
);
```

**3. Business logic with invariants**

```javascript
// Property: Adding item increases cart total
fc.assert(
  fc.property(
    fc.float({ min: 0.01, max: 1000 }),
    (price) => {
      const cart = new ShoppingCart();
      const before = cart.total();

      cart.addItem({ id: 'test', price });

      expect(cart.total()).toBeGreaterThan(before);
      expect(cart.total()).toBe(before + price);
    }
  )
);

// Property: Removing all items leaves cart empty
fc.assert(
  fc.property(
    fc.array(fc.record({
      id: fc.string(),
      price: fc.float({ min: 0.01 })
    })),
    (items) => {
      const cart = new ShoppingCart();
      items.forEach(item => cart.addItem(item));

      cart.clear();

      expect(cart.items).toHaveLength(0);
      expect(cart.total()).toBe(0);
    }
  )
);
```

**4. Validation logic**

```javascript
// Property: Valid email format is accepted
fc.assert(
  fc.property(
    fc.emailAddress(),
    (email) => {
      expect(() => validateEmail(email)).not.toThrow();
    }
  )
);

// Property: Invalid format is rejected
fc.assert(
  fc.property(
    fc.string().filter(s => !s.includes('@')),
    (invalid) => {
      expect(() => validateEmail(invalid)).toThrow();
    }
  )
);
```

### Property-Based Testing Libraries

- **JavaScript**: fast-check
- **Python**: Hypothesis
- **Java**: jqwik
- **Haskell**: QuickCheck (the original)

### Limitations

Property-based testing can't replace all tests. Some behaviors don't have clear properties.

```javascript
// Hard to express as property
test('welcome email has correct subject line', async () => {
  const email = await sendWelcomeEmail('user@example.com');
  expect(email.subject).toBe('Welcome to our app!');
});
```

There's no property here, just a specific expected value. Use example-based tests.

Use property-based testing for code with mathematical or logical invariants. Use example-based testing for everything else.

## Integration Testing Strategies

Integration tests verify components work together. More realistic than unit tests, slower to run.

### Testing with Real Databases

Don't mock your database in integration tests. Use a real database (but not production).

**Transaction rollback pattern:**

```javascript
describe('User repository', () => {
  let transaction;

  beforeEach(async () => {
    transaction = await db.beginTransaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  test('can create and find user', async () => {
    const user = await userRepo.create({
      email: 'test@example.com',
      name: 'Test User'
    }, { transaction });

    const found = await userRepo.findById(user.id, { transaction });

    expect(found.email).toBe('test@example.com');
    expect(found.name).toBe('Test User');
  });

  test('prevents duplicate email', async () => {
    await userRepo.create({
      email: 'user@example.com',
      name: 'User One'
    }, { transaction });

    await expect(userRepo.create({
      email: 'user@example.com',
      name: 'User Two'
    }, { transaction })).rejects.toThrow('Email already exists');
  });
});
```

Each test runs in a transaction that rolls back. No cleanup needed. Tests are isolated.

**Isolated test database pattern:**

```javascript
// Each test gets fresh database
beforeAll(async () => {
  await db.migrate.latest();
});

beforeEach(async () => {
  await db.seed.run(); // Seed with test data
});

afterEach(async () => {
  await db.raw('TRUNCATE TABLE users CASCADE');
  await db.raw('TRUNCATE TABLE orders CASCADE');
});
```

Truncating tables between tests ensures isolation.

**In-memory database for speed:**

```javascript
// Use SQLite in-memory for tests instead of PostgreSQL
const db = knex({
  client: 'sqlite3',
  connection: ':memory:',
  useNullAsDefault: true
});

// Runs much faster than PostgreSQL
// Good enough for most integration tests
```

SQLite is fast (in-memory) but not identical to PostgreSQL. Trade-off: speed vs production parity.

### Testing External APIs

Don't call real external APIs in tests. They're slow, cost money, and might be down.

**Mock Service Worker (MSW) for HTTP mocking:**

```javascript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('https://api.stripe.com/v1/charges/:id', (req, res, ctx) => {
    return res(ctx.json({
      id: req.params.id,
      amount: 1000,
      status: 'succeeded'
    }));
  }),

  rest.post('https://api.stripe.com/v1/charges', (req, res, ctx) => {
    return res(ctx.json({
      id: 'ch_test123',
      amount: req.body.amount,
      status: 'succeeded'
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('can process payment', async () => {
  const result = await stripe.charges.create({
    amount: 1000,
    currency: 'usd',
    source: 'tok_visa'
  });

  expect(result.status).toBe('succeeded');
  expect(result.amount).toBe(1000);
});

test('handles payment failure', async () => {
  // Override handler for this test
  server.use(
    rest.post('https://api.stripe.com/v1/charges', (req, res, ctx) => {
      return res(ctx.status(402), ctx.json({
        error: { message: 'Card declined' }
      }));
    })
  );

  await expect(stripe.charges.create({
    amount: 1000,
    currency: 'usd',
    source: 'tok_visa'
  })).rejects.toThrow('Card declined');
});
```

MSW intercepts HTTP requests and returns mock responses. Your code makes real HTTP calls, but they never leave your machine.

### Contract Testing for Microservices

When testing microservices, you have a problem: services depend on each other. How do you test service A without running service B?

**Contract testing** (using Pact) solves this:

**Consumer test (Frontend expects specific API response):**

```javascript
const { Pact } = require('@pact-foundation/pact');

const provider = new Pact({
  consumer: 'Frontend',
  provider: 'UserAPI'
});

describe('User API', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  test('can get user by ID', async () => {
    await provider.addInteraction({
      state: 'user 123 exists',
      uponReceiving: 'a request for user 123',
      withRequest: {
        method: 'GET',
        path: '/users/123'
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: 123,
          name: 'John Doe',
          email: 'john@example.com'
        }
      }
    });

    const user = await userAPI.getUser(123);

    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
  });
});
```

This creates a contract: "When I GET /users/123, I expect this response format."

**Provider verification (Backend must satisfy contract):**

The backend runs the same test to verify it actually returns what the frontend expects:

```javascript
const { Verifier } = require('@pact-foundation/pact');

it('validates the expectations of Frontend', () => {
  return new Verifier({
    provider: 'UserAPI',
    providerBaseUrl: 'http://localhost:3000',
    pactUrls: ['path/to/frontend-userapi.json']
  }).verifyProvider();
});
```

If the backend changes the response format, this test fails. You know the frontend will break before deploying.

Contract testing prevents integration bugs between services.

## Test Effectiveness and Quality

You have tests. But are they good tests?

### Mutation Testing

Mutation testing answers: "If I introduce bugs, do my tests catch them?"

**How it works:**

1. Mutation testing tool changes your code (mutates it)
2. Runs tests against mutated code
3. If tests still pass, mutation survived (weak tests)
4. If tests fail, mutation killed (good tests)

**Example with Stryker (JavaScript):**

```bash
npm install --save-dev @stryker-mutator/core
npx stryker run
```

**Original code:**

```javascript
function isAdult(age) {
  return age >= 18;
}
```

**Test:**

```javascript
test('isAdult returns true for age 18', () => {
  expect(isAdult(18)).toBe(true);
});
```

**Stryker mutates code:**

```javascript
// Mutation: >= becomes >
function isAdult(age) {
  return age > 18;
}
```

**Test still passes!** Mutation survived. Your test didn't verify the boundary condition.

**Add better test:**

```javascript
test('isAdult boundary cases', () => {
  expect(isAdult(18)).toBe(true);  // Exactly 18
  expect(isAdult(17)).toBe(false); // Just under
  expect(isAdult(19)).toBe(true);  // Just over
});
```

Now when Stryker mutates `>=` to `>`, test fails. Mutation killed.

**Mutation testing score shows test quality:**

- 90%+ mutation score = excellent tests
- 70-90% = good tests
- <70% = weak tests

Mutation testing is slow (runs your tests many times with different mutations). Run it occasionally, not on every commit.

### Test Smells (Maurizio Aniche)

Common problems that make tests worse than useless:

**1. Flaky Test**

Test passes/fails randomly.

**Causes:**
- Timing issues (race conditions, hardcoded sleeps)
- Shared state between tests
- External dependencies (network, file system)
- Randomness (Math.random() in production code)

**Fix:**

```javascript
// ❌ Flaky - timing dependent
test('modal appears', async () => {
  clickButton();
  await sleep(100); // Maybe enough, maybe not
  expect(modal).toBeVisible();
});

// ✅ Fixed - wait for condition
test('modal appears', async () => {
  clickButton();
  await waitFor(() => expect(modal).toBeVisible());
});
```

**2. Slow Test**

Test takes too long. Developers skip running it.

**Fix:**
- Use in-memory database instead of PostgreSQL
- Mock external APIs
- Parallelize test execution
- Move to integration/E2E suite (run less frequently)

**3. Mystery Guest**

Test depends on hidden external state.

```javascript
// ❌ Mystery guest - where did test-data.json come from?
test('loads users', async () => {
  const users = await loadUsers('test-data.json');
  expect(users).toHaveLength(5);
});

// ✅ Fixed - explicit data
test('loads users', async () => {
  const data = [
    { id: 1, name: 'User 1' },
    { id: 2, name: 'User 2' }
  ];
  const users = await loadUsers(data);
  expect(users).toHaveLength(2);
});
```

**4. Resource Optimism**

Test assumes resources exist.

```javascript
// ❌ Assumes file exists
test('reads config', () => {
  const config = readFile('/tmp/config.json');
  expect(config.setting).toBe('value');
});

// ✅ Creates resource in test
test('reads config', () => {
  writeFile('/tmp/test-config.json', { setting: 'value' });
  const config = readFile('/tmp/test-config.json');
  expect(config.setting).toBe('value');
  deleteFile('/tmp/test-config.json');
});
```

**5. Assertion Roulette**

Too many assertions. Which one failed?

```javascript
// ❌ Which assertion failed?
test('user data', () => {
  expect(user.name).toBe('John');
  expect(user.email).toBe('john@example.com');
  expect(user.age).toBe(30);
  expect(user.role).toBe('admin');
  expect(user.verified).toBe(true);
});

// ✅ Separate tests or descriptive error
test('user has correct name', () => {
  expect(user.name).toBe('John');
});

test('user has correct email', () => {
  expect(user.email).toBe('john@example.com');
});
```

**6. Conditional Test Logic**

If/else in tests means some paths never execute.

```javascript
// ❌ Conditional logic in test
test('processes data', () => {
  if (data.type === 'A') {
    expect(process(data)).toBe('result A');
  } else {
    expect(process(data)).toBe('result B');
  }
});

// ✅ Separate tests
test('processes type A', () => {
  const data = { type: 'A' };
  expect(process(data)).toBe('result A');
});

test('processes type B', () => {
  const data = { type: 'B' };
  expect(process(data)).toBe('result B');
});
```

### Code Coverage: What It Means (and Doesn't)

Code coverage measures what lines executed, not whether tests are good.

**Coverage types:**

- **Line coverage**: % of lines executed
- **Branch coverage**: % of if/else branches taken
- **Function coverage**: % of functions called
- **Statement coverage**: % of statements executed

**The problem with coverage as a metric:**

```javascript
// 100% coverage, zero value
test('function runs', () => {
  myFunction();
  expect(true).toBe(true);
});
```

Every line executed. No verification of correctness.

**Better metric: Mutation testing score**

Mutation testing measures whether tests catch bugs, not just execute code.

**How to use coverage:**

- Use coverage to find untested code
- Don't use coverage as quality metric
- Don't mandate 100% coverage (diminishing returns)
- Focus on critical path coverage (not every getter/setter)

**Good coverage target: 70-80% for critical code paths**

100% coverage has costs:
- Time writing tests for trivial code
- Brittle tests for code that doesn't need testing
- False confidence from bad tests that achieve coverage

## Practical CI/CD Integration

Tests only help if they run. Integrate testing into your deployment pipeline.

### Test Running Strategy

Run fast tests first, slow tests later. Fast feedback on most bugs.

```yaml
# GitHub Actions example
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm install

      # Fast feedback: Unit tests first (seconds)
      - name: Unit Tests
        run: npm run test:unit

      # Medium speed: Integration tests (minutes)
      - name: Integration Tests
        run: npm run test:integration

      # Optional on PR, required on main branch
      - name: E2E Tests
        if: github.ref == 'refs/heads/main'
        run: npm run test:e2e

      # Coverage report
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

**Strategy:**
1. Unit tests on every commit (fast, immediate feedback)
2. Integration tests on every commit (slower, but catches most bugs)
3. E2E tests on main branch only (slow, catches integration issues)

**Test parallelization:**

```javascript
// Jest configuration
module.exports = {
  maxWorkers: '50%', // Use 50% of CPU cores
  testMatch: ['**/__tests__/**/*.test.js']
};
```

Or split across CI workers:

```yaml
# Run different test suites in parallel
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:e2e
```

All three jobs run simultaneously. Total time = slowest job, not sum of all jobs.

### Failing Tests Block Deployment

Configure CI/CD to prevent deployment if tests fail:

```yaml
deploy:
  needs: [unit-tests, integration-tests]
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to production
      run: ./deploy.sh
```

Deployment only runs if tests pass. No broken code in production.

## What's Next

This mid-depth layer covered production-ready testing practices:

- Test doubles (mocks, stubs, fakes, spies) and when to use each
- TDD workflow and when it helps vs hurts
- Test organization with builders and DAMP principles
- Property-based testing for invariants
- Integration testing with real databases
- Test effectiveness with mutation testing
- Test smells and how to avoid them
- CI/CD integration strategies

You can now build test suites that are fast, reliable, and catch real bugs.

**When you're ready for deep-water:**
- Contract testing for microservices at scale
- Chaos engineering for distributed systems
- Advanced test data management strategies
- Testing in production with feature flags and canary releases
- Test organization for monorepos and large teams

**Related topics:**
- [Security Testing](../../security-testing/mid-depth/) - Test for vulnerabilities (SAST, DAST, penetration testing)
- [CI/CD Pipelines](../../../05-deployment/ci-cd-pipelines/mid-depth/) - Automate testing in deployment pipeline
- [Refactoring](../../../03-development/refactoring/mid-depth/) - Tests enable confident refactoring

---

## The Bottom Line

Good tests prevent bugs, enable refactoring, and make deployments boring.

Mock at architectural boundaries. Test behavior, not implementation. Use property-based testing for invariants. Run fast tests frequently, slow tests less often.

Focus on test effectiveness (do they catch bugs?) not test coverage (what lines ran?).

Tests are production code. Treat them with the same care.
