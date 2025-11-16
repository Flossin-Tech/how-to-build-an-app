---
title: "Unit & Integration Testing - Deep Water"
phase: "04-testing"
topic: "unit-integration-testing"
depth: "deep-water"
reading_time: 45
prerequisites: ["unit-integration-testing-mid-depth"]
related_topics: ["contract-testing", "chaos-engineering", "test-architecture", "microservices-testing"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-16"
---

# Unit & Integration Testing - Deep Water

## Who This Is For

You're building systems at scale. Your test suite runs across hundreds of microservices. Test execution time measured in hours, not minutes. Flaky tests cost your team days per week. You need testing strategies that work when simple approaches fail.

This deep-water layer covers:
- Contract testing for microservices with Pact and consumer-driven contracts
- Mutation testing to validate test quality, not just coverage
- Property-based testing at scale with Hypothesis and fast-check
- Test infrastructure patterns: test containers, database fixtures, parallel execution
- Testing distributed systems with eventual consistency and time dependencies
- Enterprise test governance: standards, reviews, quality gates
- Large-scale test suite optimization: sharding, caching, incremental testing

If you're shipping monoliths with <100 tests, the mid-depth layer serves you better. This layer is for teams where testing itself is a scaling challenge.

## When You Need This Level

Concrete scenarios:

**Microservices Hell**: You have 50 services. Integration tests spin up docker-compose with 12 containers. Full test suite takes 2 hours. Developers merge code without running tests because "it takes too long." Production breaks weekly from integration issues that tests should have caught.

**The Flaky Test Crisis**: 15% of test runs fail randomly. Team culture degrades - developers re-run CI 3 times hoping for green. You spend more time investigating test failures than actual bugs. "Works on my machine" becomes "passes in CI eventually."

**Mutation Score Reality Check**: Coverage reports show 90%. You feel confident. A critical bug ships because tests verify the code runs, not that it's correct. You realize high coverage with weak assertions is worse than no tests - false confidence.

**Distributed System Complexity**: Your system uses event sourcing. Tests work with synchronous mocks. Production has race conditions, eventual consistency bugs, and timing-dependent failures your tests never caught.

**Enterprise Governance Needs**: You're SOC 2 certified. Auditors require traceability from requirements to tests to code. Manual test reviews don't scale. You need automated test quality enforcement and evidence trails.

## Contract Testing for Microservices

Integration tests between microservices fail the same way integration tests in monoliths fail - they're slow, brittle, and require spinning up all dependencies. Contract testing solves this with a different approach: test the contracts between services, not the implementations.

### The Integration Testing Problem

Traditional approach testing Service A calling Service B:

```javascript
// Traditional integration test - brittle and slow
describe('User Service calling Order Service', () => {
  beforeAll(async () => {
    await dockerCompose.up(['order-service', 'postgres', 'redis'])
    await waitForHealthy('order-service', { timeout: 60000 })
  })

  afterAll(async () => {
    await dockerCompose.down()
  })

  test('gets user orders', async () => {
    // Create test data in Order Service database
    await orderServiceDB.orders.create({
      userId: 'user-123',
      total: 100
    })

    // Call from User Service
    const orders = await userService.getOrders('user-123')

    expect(orders).toHaveLength(1)
    expect(orders[0].total).toBe(100)
  })
})
```

Problems:
- Requires running Order Service (slow startup, resource intensive)
- Requires Order Service database (state management complexity)
- Tests break when Order Service internals change, even if API contract remains stable
- Can't run in parallel (port conflicts, database conflicts)
- Flaky (network timeouts, race conditions in startup)

### Consumer-Driven Contract Testing

The contract testing insight: User Service (consumer) doesn't care how Order Service (provider) works internally. It only cares that when it makes specific requests, it gets expected responses.

**Pact-based consumer test** (User Service):

```javascript
// consumer-tests/order-service.pact.test.js
import { Pact } from '@pact-foundation/pact'
import { getUserOrders } from '../src/services/order-client'

const provider = new Pact({
  consumer: 'UserService',
  provider: 'OrderService',
  port: 8080,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'warn'
})

describe('Order Service Contract', () => {
  beforeAll(() => provider.setup())
  afterEach(() => provider.verify())
  afterAll(() => provider.finalize())

  describe('getting orders for user', () => {
    test('when user has orders', async () => {
      // Define expected interaction
      await provider.addInteraction({
        state: 'user user-123 has 2 orders',
        uponReceiving: 'a request for orders',
        withRequest: {
          method: 'GET',
          path: '/api/users/user-123/orders',
          headers: {
            'Authorization': 'Bearer token-123',
            'Accept': 'application/json'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: [
            {
              id: like('order-1'),
              userId: 'user-123',
              total: like(100),
              status: term({
                matcher: '^(pending|completed|cancelled)$',
                generate: 'completed'
              }),
              createdAt: iso8601DateTime()
            },
            {
              id: like('order-2'),
              userId: 'user-123',
              total: like(200),
              status: 'completed',
              createdAt: iso8601DateTime()
            }
          ]
        }
      })

      // Execute actual client code
      const orders = await getUserOrders('user-123', 'token-123')

      // Verify client handles response correctly
      expect(orders).toHaveLength(2)
      expect(orders[0].id).toBeDefined()
      expect(orders[0].total).toBeGreaterThan(0)
      expect(['pending', 'completed', 'cancelled']).toContain(orders[0].status)
    })

    test('when user has no orders', async () => {
      await provider.addInteraction({
        state: 'user user-456 has no orders',
        uponReceiving: 'a request for orders',
        withRequest: {
          method: 'GET',
          path: '/api/users/user-456/orders',
          headers: {
            'Authorization': 'Bearer token-123'
          }
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: []
        }
      })

      const orders = await getUserOrders('user-456', 'token-123')
      expect(orders).toHaveLength(0)
    })

    test('when user does not exist', async () => {
      await provider.addInteraction({
        state: 'user does not exist',
        uponReceiving: 'a request for non-existent user orders',
        withRequest: {
          method: 'GET',
          path: '/api/users/user-999/orders',
          headers: {
            'Authorization': 'Bearer token-123'
          }
        },
        willRespondWith: {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        }
      })

      await expect(
        getUserOrders('user-999', 'token-123')
      ).rejects.toThrow('User not found')
    })

    test('when authentication fails', async () => {
      await provider.addInteraction({
        state: 'invalid auth token',
        uponReceiving: 'a request with invalid token',
        withRequest: {
          method: 'GET',
          path: '/api/users/user-123/orders',
          headers: {
            'Authorization': 'Bearer invalid-token'
          }
        },
        willRespondWith: {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: 'Unauthorized',
            code: 'INVALID_TOKEN'
          }
        }
      })

      await expect(
        getUserOrders('user-123', 'invalid-token')
      ).rejects.toThrow('Unauthorized')
    })
  })
})
```

This test:
- Runs in milliseconds (no real service startup)
- Generates a pact file (contract) describing expectations
- Tests User Service's client code handles responses correctly
- Runs in parallel without conflicts
- Never flaky (no real network, no timing issues)

**Provider verification** (Order Service):

The contract file gets verified against Order Service:

```javascript
// provider-tests/verify-pacts.test.js
import { Verifier } from '@pact-foundation/pact'
import path from 'path'
import { server } from '../src/server'

describe('Pact Verification', () => {
  let serverInstance

  beforeAll(async () => {
    serverInstance = await server.listen(8080)
  })

  afterAll(async () => {
    await serverInstance.close()
  })

  test('validates the expectations of UserService', async () => {
    const options = {
      provider: 'OrderService',
      providerBaseUrl: 'http://localhost:8080',

      // Local pact file or pact broker URL
      pactUrls: [
        path.resolve(__dirname, '../pacts/userservice-orderservice.json')
      ],

      // State handlers - set up data for each contract state
      stateHandlers: {
        'user user-123 has 2 orders': async () => {
          await db.orders.create({ id: 'order-1', userId: 'user-123', total: 100 })
          await db.orders.create({ id: 'order-2', userId: 'user-123', total: 200 })
        },
        'user user-456 has no orders': async () => {
          await db.orders.deleteWhere({ userId: 'user-456' })
        },
        'user does not exist': async () => {
          // No setup needed - user naturally doesn't exist
        },
        'invalid auth token': async () => {
          // No setup needed - token validation will fail naturally
        }
      },

      // Clean up between tests
      stateHandlerCleanup: async () => {
        await db.orders.truncate()
      },

      // Publishing results (optional - for Pact Broker)
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_COMMIT
    }

    await new Verifier(options).verifyProvider()
  })
})
```

If Order Service breaks the contract (changes response format, removes fields, changes status codes), verification fails. User Service finds out immediately, before deploying incompatible changes.

### Pact Broker for Multi-Team Coordination

With many services, pact files need centralized management:

```yaml
# docker-compose.yml for Pact Broker
version: '3'
services:
  pact-broker:
    image: pactfoundation/pact-broker
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgres://postgres:password@postgres/pact_broker
      PACT_BROKER_ALLOW_PUBLIC_READ: 'true'

  postgres:
    image: postgres:13
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: pact_broker
    volumes:
      - pact-postgres:/var/lib/postgresql/data

volumes:
  pact-postgres:
```

**Publishing consumer pacts**:

```javascript
// package.json script
{
  "scripts": {
    "pact:publish": "pact-broker publish ./pacts --consumer-app-version=$GIT_COMMIT --broker-base-url=http://pact-broker:9292"
  }
}
```

**Verifying provider pacts from broker**:

```javascript
const options = {
  provider: 'OrderService',
  providerBaseUrl: 'http://localhost:8080',

  // Fetch from broker instead of local files
  pactBrokerUrl: 'http://pact-broker:9292',
  consumerVersionSelectors: [
    { mainBranch: true },  // Verify against main branch
    { deployedOrReleased: true }  // Verify against deployed consumers
  ],

  publishVerificationResult: true,
  providerVersion: process.env.GIT_COMMIT
}
```

### Advanced Contract Testing Patterns

**Bi-directional contracts** (GraphQL):

```javascript
describe('GraphQL Schema Contract', () => {
  test('schema matches consumer expectations', async () => {
    await provider.addInteraction({
      state: 'product exists',
      uponReceiving: 'a query for product',
      withRequest: {
        method: 'POST',
        path: '/graphql',
        headers: { 'Content-Type': 'application/json' },
        body: {
          query: `
            query GetProduct($id: ID!) {
              product(id: $id) {
                id
                name
                price
                inStock
              }
            }
          `,
          variables: { id: 'prod-123' }
        }
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          data: {
            product: {
              id: 'prod-123',
              name: like('Widget'),
              price: like(29.99),
              inStock: like(true)
            }
          }
        }
      }
    })

    const result = await graphqlClient.query(GET_PRODUCT, { id: 'prod-123' })
    expect(result.data.product).toBeDefined()
  })
})
```

**Message-based contracts** (event-driven):

```javascript
// Consumer expectation for event
describe('Order Created Event', () => {
  test('handles order created event', async () => {
    const message = {
      content: {
        eventType: 'order.created',
        orderId: like('order-123'),
        userId: like('user-456'),
        total: like(199.99),
        timestamp: iso8601DateTime()
      },
      metadata: {
        contentType: 'application/json'
      }
    }

    await messagePact.expectsToReceive('order created event')
      .withContent(message.content)
      .withMetadata(message.metadata)
      .verify(async (msg) => {
        // Test consumer's message handler
        await orderEventHandler.handle(msg)

        // Verify handler processed correctly
        const notification = await db.notifications.findBy({
          orderId: msg.orderId
        })
        expect(notification).toBeDefined()
      })
  })
})
```

**Contract test organization**:

```
tests/
├── contracts/
│   ├── consumers/
│   │   ├── order-service.pact.test.js
│   │   ├── payment-service.pact.test.js
│   │   └── shipping-service.pact.test.js
│   ├── providers/
│   │   ├── verify-all-pacts.test.js
│   │   └── state-handlers/
│   │       ├── order-states.js
│   │       ├── payment-states.js
│   │       └── user-states.js
│   └── messages/
│       ├── order-events.pact.test.js
│       └── payment-events.pact.test.js
```

### When Contract Testing Isn't Enough

Contract testing verifies interfaces. It doesn't verify:
- End-to-end flows (user action → multiple services → result)
- Performance under load
- Failure scenarios (service down, network partition)
- Data consistency across services

Complement contract tests with:
- Smoke tests in staging (minimal E2E verification)
- Synthetic monitoring in production
- Chaos engineering (intentional failure injection)

## Mutation Testing: Validating Test Quality

Code coverage tells you what lines executed. Mutation testing tells you if your tests actually prevent bugs.

### The Coverage Paradox

```javascript
// Code with 100% line coverage
function validateEmail(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email')
  }
  return true
}

// Test achieving 100% coverage
test('validates email', () => {
  validateEmail('user@example.com')  // Passes, all lines executed
})
```

Coverage: 100%. But the test doesn't verify anything. Function could return `false` instead of `true` and test still passes. Bug ships.

### How Mutation Testing Works

Mutation testing tools modify (mutate) your code and re-run tests. If tests still pass with mutated code, the mutation "survived" - your tests are weak.

**Stryker (JavaScript) example**:

Install:
```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
```

Configuration (`stryker.conf.json`):

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/__tests__/**"
  ],
  "thresholds": {
    "high": 90,
    "low": 70,
    "break": 60
  },
  "timeoutMS": 60000,
  "concurrency": 4
}
```

Run:
```bash
npx stryker run
```

**Example mutations and results**:

Original code:
```javascript
function isAdult(age) {
  return age >= 18
}
```

Weak test:
```javascript
test('isAdult works', () => {
  expect(isAdult(18)).toBe(true)
})
```

Stryker mutations:
```javascript
// Mutation 1: Change >= to >
function isAdult(age) {
  return age > 18  // Boundary mutation
}
// Test still passes! Mutation survived.

// Mutation 2: Change >= to <
function isAdult(age) {
  return age < 18  // Conditional boundary mutation
}
// Test fails. Mutation killed.

// Mutation 3: Change return to false
function isAdult(age) {
  return false  // Boolean literal mutation
}
// Test fails. Mutation killed.

// Mutation 4: Remove function body
function isAdult(age) {
  // Block removal mutation
}
// Test fails (undefined returned). Mutation killed.
```

Report shows:
- Mutation 1 survived → Test incomplete (doesn't verify boundary)
- Mutations 2, 3, 4 killed → Test catches these bugs

Fix by adding boundary test:
```javascript
test('isAdult boundary', () => {
  expect(isAdult(17)).toBe(false)  // Just under boundary
  expect(isAdult(18)).toBe(true)   // Exactly at boundary
  expect(isAdult(19)).toBe(true)   // Just over boundary
})
```

Now Mutation 1 (>= to >) gets killed.

### Mutation Testing in Practice

**Production mutation test suite**:

```javascript
// tests/mutation/config.js
module.exports = {
  // Target critical business logic only (mutation testing is slow)
  mutate: [
    'src/core/billing/**/*.js',
    'src/core/authentication/**/*.js',
    'src/core/authorization/**/*.js',
    'src/core/validation/**/*.js',
    '!**/*.test.js'
  ],

  // Ignore generated code
  ignore: [
    '**/generated/**',
    '**/migrations/**'
  ],

  // Mutation types to apply
  mutators: [
    'ArithmeticOperator',     // +, -, *, /
    'BlockStatement',         // Remove {} blocks
    'BooleanLiteral',         // true ↔ false
    'ConditionalExpression',  // ? :
    'EqualityOperator',       // ==, ===, !=, !==
    'LogicalOperator',        // &&, ||
    'UnaryOperator',          // !, -, +
    'UpdateOperator',         // ++, --
    'ArrowFunction',          // () => x
    'StringLiteral'           // 'text' changes
  ],

  // Performance optimization
  coverageAnalysis: 'perTest',  // Only run tests that cover mutated code
  concurrency: Math.max(os.cpus().length - 1, 1),
  timeoutMS: 30000,  // Kill hanging mutations

  // Quality gates
  thresholds: {
    high: 90,    // Green: 90%+ mutations killed
    low: 70,     // Yellow: 70-90%
    break: 60    // Red: <60%, fail build
  },

  // Reporting
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: {
    baseDir: 'reports/mutation'
  }
}
```

**Incremental mutation testing**:

Full mutation testing is slow. Use incremental strategy:

```bash
# Full mutation test weekly (comprehensive)
npm run test:mutation:full

# Changed files only in PR (fast feedback)
npm run test:mutation:incremental
```

Incremental script:
```javascript
// scripts/mutation-test-changed.js
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function getChangedFiles() {
  const { stdout } = await execAsync('git diff --name-only origin/main...HEAD')
  return stdout
    .split('\n')
    .filter(f => f.endsWith('.js') && !f.includes('.test.'))
    .filter(f => f.startsWith('src/'))
}

async function runMutationTests() {
  const changedFiles = await getChangedFiles()

  if (changedFiles.length === 0) {
    console.log('No changed files to test')
    return
  }

  console.log(`Running mutation tests on ${changedFiles.length} changed files`)

  const config = {
    mutate: changedFiles,
    // ... rest of config
  }

  // Write temporary config
  fs.writeFileSync('stryker.temp.json', JSON.stringify(config))

  // Run stryker with temp config
  await execAsync('npx stryker run --configFile stryker.temp.json')
}

runMutationTests()
```

### Interpreting Mutation Scores

**What's a good mutation score?**

- 90%+: Excellent - tests prevent most bugs
- 70-90%: Good - reasonable confidence
- 50-70%: Weak - many bugs slip through
- <50%: Critical - tests provide false confidence

**Common surviving mutations**:

```javascript
// 1. Logging statements (acceptable survivors)
function processOrder(order) {
  console.log('Processing order:', order.id)  // Mutation: remove log
  // ... actual processing
}
// No need to test logging was called

// 2. Error messages (acceptable survivors)
function validate(email) {
  if (!email) {
    throw new Error('Email required')  // Mutation: change message
  }
}
// Testing exact error message is brittle

// 3. Equivalent mutants (false positives)
function calculate(x) {
  return x * 2  // Mutation: x + x (mathematically equivalent)
}
// Impossible to kill without implementation knowledge
```

**Actionable surviving mutations**:

```javascript
// Boundary condition not tested
function getDiscount(total) {
  if (total >= 100) return 0.10      // Mutation: >= to >
  if (total >= 50) return 0.05       // Tests don't cover boundaries
  return 0
}

// Missing assertion
function formatPrice(amount) {
  return `$${amount.toFixed(2)}`     // Mutation: toFixed(2) to toFixed(1)
}
test('formats price', () => {
  formatPrice(10.5)  // No assertion! Test always passes
})

// Incomplete error handling
async function fetchUser(id) {
  const response = await api.get(`/users/${id}`)
  if (!response.ok) {                 // Mutation: !response.ok to response.ok
    throw new Error('Failed to fetch')
  }
  return response.data
}
// Test only covers happy path, not error path
```

## Property-Based Testing at Scale

Example-based tests check specific cases. Property-based tests verify invariants hold for all inputs.

### From Examples to Properties

**Example-based** (what you know):

```javascript
test('reversing array twice returns original', () => {
  expect(reverse(reverse([1, 2, 3]))).toEqual([1, 2, 3])
  expect(reverse(reverse(['a', 'b']))).toEqual(['a', 'b'])
  expect(reverse(reverse([]))).toEqual([])
})
```

**Property-based** (more powerful):

```javascript
const fc = require('fast-check')

test('reversing array twice returns original', () => {
  fc.assert(
    fc.property(
      fc.array(fc.anything()),  // Generate random arrays
      (arr) => {
        const reversed = reverse(reverse(arr))
        expect(reversed).toEqual(arr)
      }
    )
  )
})
```

Generates hundreds of test cases:
- `[]`
- `[undefined]`
- `[1, 2, 3, ..., 1000]` (large arrays)
- `[[[[]]]]` (nested)
- `[null, undefined, 0, '', false]` (edge cases)
- `[{complex: 'object'}, new Set(), new Map()]`

Finds edge cases you'd never think to write.

### Real-World Property Examples

**1. Serialization/Deserialization**

Property: Deserializing serialized data returns original:

```javascript
fc.assert(
  fc.property(
    fc.record({
      id: fc.uuid(),
      name: fc.string(),
      email: fc.emailAddress(),
      age: fc.integer({ min: 0, max: 120 }),
      verified: fc.boolean(),
      metadata: fc.dictionary(fc.string(), fc.anything())
    }),
    (user) => {
      const serialized = JSON.stringify(user)
      const deserialized = JSON.parse(serialized)
      expect(deserialized).toEqual(user)
    }
  )
)
```

**2. Validation Consistency**

Property: Valid data passes validation, invalid data fails:

```javascript
describe('Email validation properties', () => {
  test('valid emails always pass', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),  // Generates valid emails
        (email) => {
          expect(() => validateEmail(email)).not.toThrow()
          expect(validateEmail(email)).toBe(true)
        }
      )
    )
  })

  test('strings without @ always fail', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !s.includes('@')),
        (notEmail) => {
          expect(() => validateEmail(notEmail)).toThrow()
        }
      )
    )
  })
})
```

**3. Sorting Properties**

Properties for sorting algorithms:

```javascript
describe('Sort properties', () => {
  test('sorting is idempotent', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        (arr) => {
          const sorted1 = sort(arr)
          const sorted2 = sort(sorted1)
          expect(sorted1).toEqual(sorted2)
        }
      )
    )
  })

  test('sorted array has same elements', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        (arr) => {
          const sorted = sort(arr)
          expect(sorted.length).toBe(arr.length)
          expect(sorted.sort()).toEqual([...arr].sort())
        }
      )
    )
  })

  test('sorted array is ordered', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        (arr) => {
          const sorted = sort(arr)
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i]).toBeLessThanOrEqual(sorted[i + 1])
          }
        }
      )
    )
  })
})
```

**4. Business Logic Invariants**

Property: Shopping cart total equals sum of items:

```javascript
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        price: fc.double({ min: 0.01, max: 10000 }),
        quantity: fc.integer({ min: 1, max: 100 })
      }),
      { minLength: 0, maxLength: 50 }
    ),
    (items) => {
      const cart = new ShoppingCart()
      items.forEach(item => cart.addItem(item))

      const expectedTotal = items.reduce((sum, item) =>
        sum + (item.price * item.quantity), 0
      )

      expect(cart.total()).toBeCloseTo(expectedTotal, 2)
    }
  )
)
```

### Advanced Property-Based Testing

**Stateful testing** (testing sequences of operations):

```javascript
// Model bank account with properties
const BankAccountCommands = [
  fc.constant(null).map(() => ({
    type: 'deposit',
    amount: fc.sample(fc.double({ min: 0.01, max: 10000 }), 1)[0]
  })),
  fc.constant(null).map(() => ({
    type: 'withdraw',
    amount: fc.sample(fc.double({ min: 0.01, max: 10000 }), 1)[0]
  })),
  fc.constant(null).map(() => ({
    type: 'checkBalance'
  }))
]

fc.assert(
  fc.property(
    fc.array(fc.oneof(...BankAccountCommands), { maxLength: 100 }),
    (commands) => {
      const account = new BankAccount(1000)  // Start with $1000
      let expectedBalance = 1000

      commands.forEach(cmd => {
        switch (cmd.type) {
          case 'deposit':
            account.deposit(cmd.amount)
            expectedBalance += cmd.amount
            break

          case 'withdraw':
            try {
              account.withdraw(cmd.amount)
              expectedBalance -= cmd.amount
            } catch (e) {
              // Withdrawal failed (insufficient funds)
              expect(expectedBalance).toBeLessThan(cmd.amount)
            }
            break

          case 'checkBalance':
            expect(account.balance()).toBeCloseTo(expectedBalance, 2)
            break
        }
      })

      // Final invariant: balance never negative
      expect(account.balance()).toBeGreaterThanOrEqual(0)
    }
  )
)
```

**Shrinking** (finding minimal failing case):

When property test fails, fast-check "shrinks" to simplest failing input:

```javascript
// Buggy function
function addItems(items) {
  let total = 0
  for (let i = 0; i < items.length; i++) {
    if (items[i].price < 0) {
      throw new Error('Negative price')  // Bug: should validate before loop
    }
    total += items[i].price
  }
  return total
}

// Property test
fc.assert(
  fc.property(
    fc.array(fc.record({ price: fc.integer() })),
    (items) => {
      expect(() => addItems(items)).not.toThrow()
    }
  )
)

// Fails with generated input:
// [{price: 5}, {price: -2}, {price: 100}, {price: 23}, ...]

// Shrinks to minimal failing case:
// [{price: -1}]
```

Shrinking helps identify root cause quickly.

**Custom generators**:

```javascript
// Generate realistic user data
const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  age: fc.integer({ min: 13, max: 120 }),

  // Custom: valid password
  password: fc.string({ minLength: 12 }).filter(s =>
    /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)
  ),

  // Custom: realistic timestamps
  createdAt: fc.date({
    min: new Date('2020-01-01'),
    max: new Date()
  }),

  // Custom: valid phone
  phone: fc.stringMatching(/^\+1-\d{3}-\d{3}-\d{4}$/)
})

fc.assert(
  fc.property(
    userArbitrary,
    (user) => {
      // Test user creation logic
      const created = createUser(user)
      expect(created.id).toBe(user.id)
    }
  )
)
```

### When to Use Property-Based Testing

**Good fits**:
- Parsers and serializers (roundtrip properties)
- Sorting, filtering, transformation functions (invariant properties)
- Validation logic (valid inputs pass, invalid fail)
- State machines (valid state transitions)
- Mathematical operations (commutativity, associativity)

**Poor fits**:
- UI rendering (no clear properties)
- External API integration (can't generate valid auth tokens)
- Time-based behavior (properties involving "now")
- Specific business rules without mathematical properties

**Hybrid approach**:

```javascript
describe('Password validation', () => {
  // Example-based for specific requirements
  test('requires minimum length', () => {
    expect(() => validatePassword('Short1!')).toThrow('at least 12')
  })

  test('requires uppercase, lowercase, number', () => {
    expect(() => validatePassword('alllowercase123')).toThrow('uppercase')
  })

  // Property-based for exhaustive validation
  test('valid passwords always pass', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 12, maxLength: 100 })
          .filter(s => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)),
        (password) => {
          expect(() => validatePassword(password)).not.toThrow()
        }
      )
    )
  })
})
```

## Testing Distributed Systems

Distributed systems introduce complexity: eventual consistency, network partitions, timing dependencies, cascading failures. Traditional testing approaches fail.

### Eventual Consistency Testing

```javascript
describe('Eventual consistency', () => {
  test('order eventually appears in all read replicas', async () => {
    const order = await createOrder({ userId: 'user-123', total: 100 })

    // Write to master
    expect(order.id).toBeDefined()

    // Read from replica may lag
    const readReplicas = [replica1, replica2, replica3]

    // Eventual consistency: retry until all replicas have the order
    await waitFor(async () => {
      const results = await Promise.all(
        readReplicas.map(replica =>
          replica.orders.findById(order.id)
        )
      )

      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.id).toBe(order.id)
      })
    }, {
      timeout: 10000,    // 10 seconds max
      interval: 100      // Check every 100ms
    })
  })
})
```

**Testing replication lag**:

```javascript
test('handles read-after-write consistency', async () => {
  const userId = 'user-123'

  // Write new preference
  await preferences.update(userId, { theme: 'dark' })

  // Immediately read from same client
  // Should see own writes (read-after-write consistency)
  const prefs = await preferences.get(userId, {
    consistencyLevel: 'strong'  // Force read from master
  })

  expect(prefs.theme).toBe('dark')
})
```

### Time-Dependent Testing

Controlling time in tests:

```javascript
const { MockDate } = require('mockdate')

describe('Session expiration', () => {
  beforeEach(() => {
    // Freeze time
    MockDate.set('2024-01-15T10:00:00Z')
  })

  afterEach(() => {
    // Restore real time
    MockDate.reset()
  })

  test('session expires after 15 minutes', async () => {
    const session = await createSession('user-123')

    // Session valid at creation
    expect(await isSessionValid(session.token)).toBe(true)

    // Advance time 14 minutes
    MockDate.set('2024-01-15T10:14:00Z')
    expect(await isSessionValid(session.token)).toBe(true)

    // Advance time to 16 minutes (past expiration)
    MockDate.set('2024-01-15T10:16:00Z')
    expect(await isSessionValid(session.token)).toBe(false)
  })

  test('session extends on activity', async () => {
    const session = await createSession('user-123')

    // Advance time 10 minutes
    MockDate.set('2024-01-15T10:10:00Z')

    // Activity extends session
    await touchSession(session.token)

    // Advance another 14 minutes (would be expired without touch)
    MockDate.set('2024-01-15T10:24:00Z')

    // Still valid because touched at 10 minutes
    expect(await isSessionValid(session.token)).toBe(true)
  })
})
```

### Network Partition Simulation

Testing behavior when services can't communicate:

```javascript
const Toxiproxy = require('toxiproxy-node-client')

describe('Network partition handling', () => {
  let proxy

  beforeAll(async () => {
    // Toxiproxy proxies traffic and injects failures
    proxy = new Toxiproxy('http://toxiproxy:8474')

    await proxy.create({
      name: 'order-service',
      listen: '0.0.0.0:8080',
      upstream: 'order-service:3000'
    })
  })

  test('gracefully handles order service timeout', async () => {
    // Inject 30-second latency (simulating network partition)
    await proxy.get('order-service').addToxic({
      type: 'latency',
      attributes: {
        latency: 30000
      }
    })

    // Call should timeout and fail gracefully
    const startTime = Date.now()

    await expect(
      userService.getOrders('user-123', { timeout: 5000 })
    ).rejects.toThrow('timeout')

    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(6000)  // Respects timeout

    // Clean up toxic
    await proxy.get('order-service').removeToxic('latency_downstream')
  })

  test('circuit breaker opens after failures', async () => {
    // Inject complete failure
    await proxy.get('order-service').down()

    // First few requests fail and open circuit
    for (let i = 0; i < 5; i++) {
      await expect(
        userService.getOrders('user-123')
      ).rejects.toThrow()
    }

    // Circuit now open - fast fail without calling service
    const fastFailStart = Date.now()
    await expect(
      userService.getOrders('user-123')
    ).rejects.toThrow('circuit open')

    const fastFailDuration = Date.now() - fastFailStart
    expect(fastFailDuration).toBeLessThan(100)  // Fails immediately

    // Restore service
    await proxy.get('order-service').up()

    // Wait for circuit to half-open
    await sleep(10000)

    // Circuit allows test request
    const orders = await userService.getOrders('user-123')
    expect(orders).toBeDefined()
  })
})
```

### Chaos Engineering in Tests

Intentionally inject failures to verify resilience:

```javascript
describe('Chaos testing', () => {
  test('system handles random service failures', async () => {
    const services = ['order', 'payment', 'shipping', 'notification']

    // Randomly fail 20% of requests to each service
    services.forEach(async service => {
      await chaosMonkey.enableFor(service, {
        failureRate: 0.2,
        latencyMs: { min: 0, max: 5000 }
      })
    })

    // Run 100 order placements
    const results = []
    for (let i = 0; i < 100; i++) {
      try {
        const order = await placeOrder({
          userId: `user-${i}`,
          items: [{ id: 'prod-1', qty: 1 }]
        })
        results.push({ success: true, order })
      } catch (error) {
        results.push({ success: false, error: error.message })
      }
    }

    const successRate = results.filter(r => r.success).length / 100

    // Should handle failures gracefully
    // Even with 20% service failure rate, order success should be >70%
    // (retries and fallbacks compensate)
    expect(successRate).toBeGreaterThan(0.7)

    // Failed orders should have clear error messages
    results.filter(r => !r.success).forEach(r => {
      expect(r.error).toMatch(/payment failed|shipping unavailable|timeout/)
    })

    // Cleanup
    services.forEach(service => chaosMonkey.disable(service))
  })
})
```

## Large-Scale Test Suite Optimization

When test suites take hours, optimization becomes critical.

### Test Sharding

Run tests in parallel across multiple machines:

```yaml
# GitHub Actions matrix strategy
name: Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4, 5, 6, 7, 8]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests (shard ${{ matrix.shard }}/8)
        run: npm run test -- --shard=${{ matrix.shard }}/8
```

Jest sharding:
```bash
# Shard 1 of 8
jest --shard=1/8

# Each shard runs ~1/8 of tests
```

Custom sharding by directory:
```javascript
// scripts/shard-tests.js
const glob = require('glob')
const path = require('path')

function shardTests(shardIndex, totalShards) {
  const allTests = glob.sync('**/*.test.js', {
    cwd: 'tests',
    absolute: true
  })

  // Distribute tests evenly across shards
  return allTests.filter((test, index) =>
    index % totalShards === shardIndex - 1
  )
}

const shard = parseInt(process.env.SHARD_INDEX)
const total = parseInt(process.env.TOTAL_SHARDS)

const testsForShard = shardTests(shard, total)

// Run only this shard's tests
process.argv.push(...testsForShard)
```

### Test Caching and Incremental Testing

Only run tests affected by code changes:

```javascript
// jest.config.js
module.exports = {
  // Cache test results
  cache: true,
  cacheDirectory: '.jest-cache',

  // Only run tests related to changed files
  onlyChanged: true,

  // Detect changed files since last commit
  changedSince: 'origin/main',

  // Coverage only for changed files
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageProvider: 'v8'  // Faster than babel
}
```

**Nx affected tests** (monorepo):

```bash
# Only test projects affected by changes
nx affected:test --base=origin/main
```

### Test Parallelization

Jest parallel execution:
```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',  // Use 50% of CPU cores

  // Or specific number
  // maxWorkers: 4,

  // Test timeout
  testTimeout: 30000
}
```

Concurrent tests:
```javascript
// Enable concurrent execution
describe.concurrent('Parallel test suite', () => {
  test.concurrent('test 1', async () => {
    // Runs in parallel with other concurrent tests
  })

  test.concurrent('test 2', async () => {
    // ...
  })

  test.concurrent('test 3', async () => {
    // ...
  })
})
```

### Selective Test Execution

```javascript
// Run only tests matching pattern
npm test -- --testPathPattern=user

// Run only integration tests
npm test -- --testPathPattern=integration

// Skip slow tests locally
npm test -- --testPathIgnorePatterns=e2e

// Run tests by tag
describe('Database tests', () => {
  // Tag with @slow
  test('@slow complex query', async () => {
    // ...
  })
})

// Run only @fast tests
npm test -- --testNamePattern="^(?!.*@slow)"
```

### Test Infrastructure Patterns

**Test Containers** for real dependencies:

```javascript
const { GenericContainer } = require('testcontainers')

describe('Database integration', () => {
  let container
  let dbConnection

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new GenericContainer('postgres:13')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'testdb'
      })
      .withExposedPorts(5432)
      .start()

    const port = container.getMappedPort(5432)
    dbConnection = await connectToDatabase({
      host: 'localhost',
      port,
      user: 'test',
      password: 'test',
      database: 'testdb'
    })

    await dbConnection.migrate.latest()
  }, 60000)  // Container startup can take time

  afterAll(async () => {
    await dbConnection.destroy()
    await container.stop()
  })

  test('can query database', async () => {
    const result = await dbConnection.raw('SELECT 1 as value')
    expect(result.rows[0].value).toBe(1)
  })
})
```

**Shared test fixtures**:

```javascript
// tests/fixtures/database.js
class DatabaseFixture {
  constructor() {
    this.container = null
    this.connection = null
  }

  async setup() {
    if (this.connection) return this.connection

    this.container = await new GenericContainer('postgres:13')
      .withEnvironment(/* ... */)
      .start()

    this.connection = await connect(/* ... */)
    await this.connection.migrate.latest()

    return this.connection
  }

  async teardown() {
    if (this.connection) await this.connection.destroy()
    if (this.container) await this.container.stop()
  }

  async reset() {
    await this.connection.raw('TRUNCATE TABLE users CASCADE')
    await this.connection.raw('TRUNCATE TABLE orders CASCADE')
  }
}

// Singleton instance
const dbFixture = new DatabaseFixture()

module.exports = dbFixture
```

Usage:
```javascript
const dbFixture = require('./fixtures/database')

beforeAll(() => dbFixture.setup())
afterAll(() => dbFixture.teardown())
beforeEach(() => dbFixture.reset())
```

## Enterprise Test Governance

At scale, test quality and standards need governance.

### Test Quality Metrics

Track and enforce test quality:

```javascript
// scripts/test-quality-report.js
const { readFileSync } = require('fs')

function analyzeTestQuality() {
  const coverage = JSON.parse(readFileSync('coverage/coverage-summary.json'))
  const testResults = JSON.parse(readFileSync('test-results.json'))

  const metrics = {
    coverage: {
      lines: coverage.total.lines.pct,
      branches: coverage.total.branches.pct,
      functions: coverage.total.functions.pct,
      statements: coverage.total.statements.pct
    },

    tests: {
      total: testResults.numTotalTests,
      passed: testResults.numPassedTests,
      failed: testResults.numFailedTests,
      skipped: testResults.numPendingTests
    },

    performance: {
      totalTime: testResults.testResults.reduce((sum, r) =>
        sum + r.perfStats.runtime, 0
      ),
      avgTestTime: testResults.testResults.reduce((sum, r) =>
        sum + r.perfStats.runtime, 0
      ) / testResults.numTotalTests,
      slowTests: testResults.testResults
        .filter(r => r.perfStats.runtime > 5000)
        .length
    },

    flakiness: calculateFlakiness(testResults),

    mutationScore: getMutationScore()
  }

  // Quality gates
  const gates = {
    coverageThreshold: 70,
    mutationScoreThreshold: 60,
    maxSlowTests: 10,
    maxFlakyTests: 5
  }

  const violations = []

  if (metrics.coverage.lines < gates.coverageThreshold) {
    violations.push(`Coverage ${metrics.coverage.lines}% below threshold ${gates.coverageThreshold}%`)
  }

  if (metrics.mutationScore < gates.mutationScoreThreshold) {
    violations.push(`Mutation score ${metrics.mutationScore}% below threshold ${gates.mutationScoreThreshold}%`)
  }

  if (metrics.performance.slowTests > gates.maxSlowTests) {
    violations.push(`${metrics.performance.slowTests} slow tests exceeds limit ${gates.maxSlowTests}`)
  }

  return { metrics, violations }
}
```

### Test Code Review Checklist

Automated checks in PR reviews:

```javascript
// .github/workflows/test-quality-check.yml
- name: Test Quality Check
  run: |
    node scripts/test-quality-check.js
```

```javascript
// scripts/test-quality-check.js
const { execSync } = require('child_process')

function checkTestQuality() {
  const issues = []

  // 1. Every new file has tests
  const newFiles = execSync('git diff --name-only origin/main...HEAD --diff-filter=A')
    .toString()
    .split('\n')
    .filter(f => f.startsWith('src/') && f.endsWith('.js'))

  newFiles.forEach(file => {
    const testFile = file.replace('src/', 'tests/').replace('.js', '.test.js')
    if (!fs.existsSync(testFile)) {
      issues.push(`Missing test file for ${file}`)
    }
  })

  // 2. Tests are not too slow
  const slowTests = findSlowTests()
  if (slowTests.length > 0) {
    issues.push(`Found ${slowTests.length} tests slower than 5s:`)
    slowTests.forEach(test => {
      issues.push(`  ${test.file}: ${test.name} (${test.duration}ms)`)
    })
  }

  // 3. Tests use proper assertions
  const weakAssertions = findWeakAssertions()
  if (weakAssertions.length > 0) {
    issues.push('Tests with weak assertions (expect(true).toBe(true)):')
    weakAssertions.forEach(test => issues.push(`  ${test}`))
  }

  // 4. Coverage didn't decrease
  const coverageDiff = getCoverageDiff()
  if (coverageDiff < 0) {
    issues.push(`Coverage decreased by ${Math.abs(coverageDiff)}%`)
  }

  if (issues.length > 0) {
    console.error('Test quality issues found:')
    issues.forEach(issue => console.error(`- ${issue}`))
    process.exit(1)
  }
}
```

### Test Documentation Standards

```javascript
/**
 * Test: User authentication flow
 *
 * @testtype integration
 * @priority high
 * @requirements AUTH-001, AUTH-002
 * @author jane.doe
 * @since 2024-01-15
 *
 * Verifies:
 * - User can log in with valid credentials
 * - Session is created and persisted
 * - Invalid credentials are rejected
 * - Rate limiting prevents brute force
 *
 * Prerequisites:
 * - Test database running
 * - User fixtures loaded
 *
 * Known issues:
 * - Flaky in CI due to rate limiter timing (ISSUE-123)
 */
describe('User authentication', () => {
  // ...
})
```

## What You've Mastered

You can now:

**Test at Scale**:
- Contract testing eliminates microservice integration test complexity
- Mutation testing validates test quality beyond coverage metrics
- Property-based testing finds edge cases you'd never write manually
- Test infrastructure patterns (containers, fixtures, sharding) make large suites manageable

**Test Complex Systems**:
- Eventual consistency and distributed system testing
- Network partition and failure simulation
- Time-dependent and stateful testing
- Chaos engineering for resilience verification

**Govern Test Quality**:
- Enterprise test standards and review processes
- Automated quality gates in CI/CD
- Test performance monitoring and optimization
- Traceability from requirements through tests to code

## Related Deep-Water Topics

**Within Phase 04-Testing**:
- [Security Testing - Deep Water](../../security-testing/deep-water/index.md): Penetration testing, red team exercises, bug bounty programs
- [Accessibility Testing - Deep Water](../../accessibility-testing/deep-water/index.md): WCAG AAA, cognitive accessibility, assistive technology
- [Compliance Validation - Deep Water](../../compliance-validation/deep-water/index.md): SOC 2 Type II, FedRAMP, ISO 27001 certification

**Future Topics** (not yet available):
- Chaos Engineering: Advanced failure injection, game days, production testing
- Performance Testing: Load testing at scale, performance regression detection
- Test-Driven Development at Scale: TDD in large teams, emergent design, refactoring legacy systems

---

Testing at this scale isn't about more tests. It's about strategic testing: high confidence with minimal cost, catching bugs early when they're cheap to fix, and maintaining quality as systems grow.

The techniques here work for teams building systems where testing complexity rivals application complexity. If you're not there yet, that's fine - the mid-depth layer probably serves you better.

But when your test suite becomes the bottleneck, when flaky tests destroy productivity, when integration testing costs more than the features it validates - these patterns solve those problems.
