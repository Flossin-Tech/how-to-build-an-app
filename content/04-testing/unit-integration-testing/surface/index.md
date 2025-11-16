---
title: "Unit & Integration Testing"
phase: "04-testing"
topic: "unit-integration-testing"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["security-testing", "tdd", "ci-cd-pipelines"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Unit & Integration Testing

## What This Is About

You've built something. It works on your machine. You ship it to production, and... it breaks. A user enters data you didn't expect. An API returns a different format than it did yesterday. Your code that worked perfectly in isolation crashes when it talks to the database.

Testing is how you find these problems before your users do.

**Unit tests** verify small pieces of code in isolation. A function that calculates tax. A validation rule that checks email format. Pure logic without dependencies.

**Integration tests** verify how pieces work together. Can your API endpoint actually save to the database? Does your user signup flow work end-to-end? Does your code handle what external services actually return?

This isn't about writing perfect tests. It's about writing enough tests that you can ship with confidence and change code without fear.

## The Problem You're Solving

### Without Tests

**Bugs ship to production.** You can't manually verify every code path. Users find bugs you never thought to check.

**You're afraid to change code.** Refactoring feels dangerous. Will it break something? You don't know until users complain.

**Debugging takes hours.** A bug appears. You don't know which change caused it. You add console.log statements everywhere and pray.

**Deployments are stressful.** Every release is a gamble. You deploy on Friday afternoon and spend the weekend fixing production.

### With Tests

**Bugs get caught early.** Tests fail before code reaches production. You fix issues in minutes, not days.

**You can refactor safely.** Change implementation. If tests still pass, behavior is preserved. Green tests mean you're good.

**Debugging is faster.** A failing test shows exactly what broke. You know which function and which scenario.

**Deployments are boring.** Tests pass, code deploys, nothing breaks. You ship on Friday and go home.

## The Minimum You Need to Know

### What to Test (and What to Skip)

You don't have time to test everything. Focus on what prevents real pain.

**Test these things:**

- **Critical user paths** - Signup, login, checkout, the core feature your app exists to do
- **Anything that handles money or data** - Payment processing, data storage, calculations that matter
- **Complex business logic** - Validation rules, pricing algorithms, permission checks
- **Security boundaries** - Authentication, authorization, input validation

**Skip these for now:**

- **Simple getters/setters** - If it just returns a value, don't test it
- **Framework code** - React, Express, Django already have tests
- **Third-party libraries** - Stripe and AWS test their own code
- **Obvious UI styling** - Your button's border radius doesn't need a test

When in doubt, ask: "What bug does this test prevent?" If you can't answer, skip it.

### Unit vs Integration Tests - A Simple Rule

Kent C. Dodds offers clear guidance: "Write tests. Not too many. Mostly integration."

**Unit tests** work best for pure logic:

```javascript
// Unit test - pure logic, no dependencies
function calculateTax(amount, rate) {
  if (amount < 0) throw new Error('Amount cannot be negative');
  return amount * rate;
}

test('calculates tax correctly', () => {
  expect(calculateTax(100, 0.08)).toBe(8);
});

test('rejects negative amounts', () => {
  expect(() => calculateTax(-100, 0.08)).toThrow('Amount cannot be negative');
});
```

**Integration tests** work best for code with dependencies:

```javascript
// Integration test - uses database, tests real behavior
async function createUser(email, password) {
  // Validates email
  // Hashes password
  // Saves to database
  // Sends welcome email
}

test('creates user with valid data', async () => {
  const user = await createUser('test@example.com', 'secure123');

  // Verify user exists in database
  const saved = await db.users.findOne({ email: 'test@example.com' });
  expect(saved).toBeTruthy();
  expect(saved.email).toBe('test@example.com');

  // Verify password was hashed (not stored in plain text)
  expect(saved.password).not.toBe('secure123');
});
```

Most bugs happen when components interact. Integration tests catch those.

### Your First Test - 10 Minute Exercise

Pick your most critical feature. Write a test that exercises the happy path.

**Step 1: Install a testing framework**

JavaScript/TypeScript:
```bash
npm install --save-dev jest
# or
npm install --save-dev vitest
```

Python:
```bash
pip install pytest
```

**Step 2: Write your first test**

Create a file ending in `.test.js` (Jest/Vitest) or `_test.py` (pytest):

```javascript
// signup.test.js
const { validateEmail } = require('./signup');

test('valid email passes validation', () => {
  expect(() => validateEmail('user@example.com')).not.toThrow();
});

test('invalid email fails validation', () => {
  expect(() => validateEmail('notanemail')).toThrow('Invalid email');
});

test('empty email fails validation', () => {
  expect(() => validateEmail('')).toThrow('Email required');
});
```

**Step 3: Run the test**

```bash
npm test
# or
pytest
```

**Step 4: Watch it pass**

Green output means your code works as expected.

**Step 5: Break your code, watch it fail**

Change `validateEmail` to always return true. Run tests again. They should fail. This proves your tests actually work.

That's it. You've written your first test.

### The 80/20 Rule for Testing

Focus on the 20% of tests that prevent 80% of bugs.

**Critical path testing:**
```javascript
test('user can complete checkout', async () => {
  // Add item to cart
  await addToCart('product-123');

  // Enter payment info
  await submitPayment({ card: '4242424242424242' });

  // Verify order created
  const order = await getLatestOrder();
  expect(order.status).toBe('paid');
});
```

This single test covers add to cart, payment processing, and order creation. If it passes, your core flow works.

**Edge cases that actually happen:**

```javascript
test('handles empty shopping cart', async () => {
  await expect(checkout()).rejects.toThrow('Cart is empty');
});

test('handles missing payment info', async () => {
  await addToCart('product-123');
  await expect(submitPayment({})).rejects.toThrow('Payment required');
});
```

Empty inputs and missing data happen constantly. Test for them.

**Security holes:**

```javascript
test('prevents SQL injection in search', async () => {
  const malicious = "'; DROP TABLE users; --";
  const results = await searchProducts(malicious);

  // Should return empty results, not execute SQL
  expect(results).toEqual([]);

  // Verify users table still exists
  const users = await db.users.count();
  expect(users).toBeGreaterThan(0);
});
```

If your app accepts user input, test that attackers can't break it.

**Don't obsess over:**

- 100% code coverage (you can have 100% coverage with worthless tests)
- Testing every possible edge case (you'll never ship)
- Perfect test structure on day 1 (you'll learn what works)

Ship with good-enough tests. Improve them as you learn what breaks.

### Common Mistakes to Avoid

**Mistake 1: Testing implementation details**

```javascript
// ❌ Bad - test breaks when you refactor
test('counter uses useState', () => {
  const component = render(<Counter />);
  expect(component.state.count).toBe(0);
});

// ✅ Good - tests behavior users see
test('counter starts at zero', () => {
  render(<Counter />);
  expect(screen.getByText('Count: 0')).toBeInTheDocument();
});
```

Test what users see and do, not how your code works internally. If you refactor and behavior doesn't change, tests should still pass.

**Mistake 2: No tests at all**

"I'll add tests later" means you won't. You'll forget which edge cases matter. Your code will become untestable.

Write at least one test for your critical path before shipping.

**Mistake 3: Testing framework code**

```javascript
// ❌ Bad - testing React, not your code
test('useState works', () => {
  const [count, setCount] = useState(0);
  setCount(1);
  expect(count).toBe(1);
});
```

React, Express, Django - they're already tested. Don't waste time testing them again.

**Mistake 4: Tests that randomly fail**

Flaky tests are worse than no tests. If tests fail randomly, developers ignore failures. The test suite becomes useless.

Common causes:
- Tests depend on each other (test A must run before test B)
- Tests share state (one test modifies data another test reads)
- Tests depend on timing (waiting for async operation that sometimes takes longer)
- Tests depend on external services (API is down, test fails)

Fix flaky tests immediately or delete them.

### Quick Start Checklist

Before you ship to production, verify you have:

- [ ] At least 1 test for critical user path (signup, checkout, core feature)
- [ ] Tests for authentication/authorization (can users access what they shouldn't?)
- [ ] Input validation tests (reject SQL injection, XSS, invalid data)
- [ ] Error handling tests (app doesn't crash on bad input)
- [ ] Tests actually run in CI/CD (they're not just sitting there)

This isn't perfect. It's good enough to catch most bugs before users do.

## Tools to Get Started

Don't spend weeks choosing tools. Pick one and start writing tests.

**JavaScript/TypeScript:**

- **Jest** - Most popular, works everywhere, good documentation
- **Vitest** - Faster than Jest, better for Vite projects
- **React Testing Library** - For testing React components (pairs with Jest/Vitest)

Start with Jest unless you're using Vite. It works and has answers for everything on Stack Overflow.

**Python:**

- **pytest** - Industry standard, simple to use
- **unittest** - Built into Python, no installation needed

Use pytest. It's better and everyone uses it.

**Other Languages:**

- Java: JUnit
- C#: NUnit or xUnit
- Ruby: RSpec
- Go: built-in `testing` package

Pick the one your community uses. Testing frameworks are commodities.

**Don't:**
- Try multiple frameworks to compare them
- Spend days configuring the perfect setup
- Rewrite your tests in a different framework because you read it's better

Write tests. Improve your tools later if they become a problem.

## Red Flags You're Doing It Wrong

**Warning sign 1: No tests before production**

If you ship without tests, you're using your users as QA testers. This works until it doesn't.

**Warning sign 2: Tests take 30+ minutes to run**

Nobody will run them. Tests that don't get run don't help.

Target: Unit tests in seconds, full suite under 10 minutes.

**Warning sign 3: Tests fail randomly**

Flaky tests kill trust. Developers ignore failures. Bugs slip through.

Fix or delete flaky tests immediately.

**Warning sign 4: Changing code breaks unrelated tests**

Your tests are too coupled to implementation. Test behavior, not internals.

**Warning sign 5: 100% coverage but bugs still ship**

Coverage measures what code ran, not whether it was tested meaningfully. You can have 100% coverage with terrible tests.

Focus on preventing real bugs, not hitting coverage numbers.

## Real-World Example: Testing User Signup

Here's what testing a real feature looks like.

**The feature:** User signup with email and password.

**Critical path test:**

```javascript
test('user can sign up with valid email and password', async () => {
  const response = await request(app)
    .post('/api/signup')
    .send({
      email: 'newuser@example.com',
      password: 'SecurePass123!'
    });

  expect(response.status).toBe(201);
  expect(response.body.user.email).toBe('newuser@example.com');

  // Verify user can log in
  const loginResponse = await request(app)
    .post('/api/login')
    .send({
      email: 'newuser@example.com',
      password: 'SecurePass123!'
    });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body.token).toBeTruthy();
});
```

**Edge case tests:**

```javascript
test('rejects invalid email format', async () => {
  const response = await request(app)
    .post('/api/signup')
    .send({ email: 'notanemail', password: 'SecurePass123!' });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('Invalid email');
});

test('rejects weak password', async () => {
  const response = await request(app)
    .post('/api/signup')
    .send({ email: 'user@example.com', password: '123' });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('Password must be');
});

test('prevents duplicate email', async () => {
  // Create first user
  await request(app)
    .post('/api/signup')
    .send({ email: 'user@example.com', password: 'SecurePass123!' });

  // Try to create duplicate
  const response = await request(app)
    .post('/api/signup')
    .send({ email: 'user@example.com', password: 'DifferentPass456!' });

  expect(response.status).toBe(409);
  expect(response.body.error).toContain('Email already exists');
});
```

**Security tests:**

```javascript
test('passwords are hashed, not stored in plain text', async () => {
  await request(app)
    .post('/api/signup')
    .send({ email: 'user@example.com', password: 'SecurePass123!' });

  const user = await db.users.findOne({ email: 'user@example.com' });

  // Password in database should NOT match what user entered
  expect(user.password).not.toBe('SecurePass123!');

  // Should be a hash (bcrypt hashes start with $2b$)
  expect(user.password).toMatch(/^\$2[aby]\$/);
});

test('prevents SQL injection in email field', async () => {
  const malicious = "admin@example.com'; DROP TABLE users; --";

  await request(app)
    .post('/api/signup')
    .send({ email: malicious, password: 'SecurePass123!' });

  // Verify users table still exists
  const count = await db.users.count();
  expect(count).toBeGreaterThan(0);
});
```

This is testing a real feature. Not theoretical examples. Code you'd actually write.

## What's Next

This surface layer gets you started. You can write basic tests, understand what to test, and ship with some confidence.

When you're ready for more depth:

**Mid-Depth covers:**
- Test doubles (mocks, stubs, fakes) and when to use each
- Test-Driven Development (TDD) workflow
- Integration testing with databases and external APIs
- Property-based testing for complex validation
- Organizing tests as your codebase grows

**Deep-Water covers:**
- Contract testing for microservices
- Mutation testing to validate test quality
- Testing distributed systems
- Advanced test data management
- Chaos engineering

**Related Topics:**

- [Security Testing](../../security-testing/surface/index.md) - Test for vulnerabilities before attackers find them
- [CI/CD Pipelines](../../../05-deployment/ci-cd-pipelines/surface/index.md) - Run tests automatically on every commit

---

## The Bottom Line

Tests catch bugs before users do. They let you refactor without fear. They make deployments boring instead of terrifying.

You don't need perfect tests. You need enough tests that you can ship with confidence.

Start with one test for your critical path. Add tests when you fix bugs. Test security boundaries and edge cases. Run tests before deploying.

That's enough to prevent most of the pain.

---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Security Testing](../../security-testing/surface/index.md) - Related testing considerations
- [Accessibility Testing](../../accessibility-testing/surface/index.md) - Related testing considerations
- [Compliance Validation](../../compliance-validation/surface/index.md) - Related testing considerations

### Navigate
- [← Back to Testing Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
