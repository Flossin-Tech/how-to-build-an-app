---
title: "Compliance Validation"
phase: "04-testing"
topic: "compliance-validation"
depth: "surface"
reading_time: 8
prerequisites: ["security-testing", "accessibility-testing"]
related_topics: ["data-privacy", "secure-coding-practices", "audit-logging"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Compliance Validation

## What This Is About

Compliance validation is testing that proves your application follows legal and regulatory requirements for your industry and geography.

This isn't abstract legal theory. If you collect email addresses, you probably have compliance obligations. If you handle health data or payment cards, you definitely do.

The consequences of non-compliance are concrete:
- GDPR fines up to 4% of global revenue (or €20 million, whichever is higher)
- Payment processors cutting you off (no PCI-DSS = no credit cards)
- Enterprise contracts requiring SOC 2 certification
- HIPAA violations ranging from $100 to $50,000 per record
- Lawsuits from users whose data you mishandled

Compliance testing proves you're actually following the rules, not just claiming you are.

## Do You Actually Need This?

Start with a quick assessment:

**Do you collect any personal information?** (Name, email, phone number, IP addresses)
- No → You might be OK, but keep reading
- Yes → Continue

**Where are your users located?**
- European Union or UK → GDPR applies to you
- California → CCPA applies (similar to GDPR but less strict)
- Other US states → Check state-specific privacy laws
- International → Multiple frameworks might apply

**What kind of data do you handle?**
- Health information → HIPAA (US) or similar healthcare regulations
- Payment cards → PCI-DSS applies
- Student records → FERPA (US education privacy)
- Financial data → SOX, GLBA, or similar financial regulations
- Just names/emails → Basic privacy regulations apply

**Who are you selling to?**
- Enterprise customers → They'll likely require SOC 2
- Government → FedRAMP, FISMA, or agency-specific requirements
- Small businesses → Depends on their industry
- Consumers → Privacy regulations apply

If any of these apply to you, compliance isn't optional.

## The Big Four Compliance Frameworks

### GDPR - General Data Protection Regulation

**Who it applies to**: Anyone with users in the EU or UK, regardless of where your company is located.

**What it requires**:
- Explicit consent before collecting personal data (no pre-checked boxes)
- Users can request all their data in a portable format (data export)
- Users can delete their data (right to erasure/right to be forgotten)
- Report data breaches within 72 hours
- Privacy policy explaining what data you collect and why

**Testing requirements**:
```javascript
// Test: User can export their data
test('user can request data export', async () => {
  const user = await createTestUser('alice@example.com')

  const response = await request
    .get('/api/user/export')
    .set('Authorization', user.token)

  expect(response.status).toBe(200)
  expect(response.body).toHaveProperty('email', 'alice@example.com')
  expect(response.body).toHaveProperty('profile')
  expect(response.body).toHaveProperty('created_at')
  // User gets everything in machine-readable format (JSON)
})

// Test: User can delete their account
test('user can delete account and all data', async () => {
  const user = await createTestUser('bob@example.com')
  const orderId = await createTestOrder(user.id)

  await request
    .delete('/api/user/account')
    .set('Authorization', user.token)

  // Verify user data is actually deleted
  const deletedUser = await db.users.findByEmail('bob@example.com')
  expect(deletedUser).toBeNull()

  // Verify related data is deleted (cascade)
  const userOrders = await db.orders.findByUser(user.id)
  expect(userOrders).toHaveLength(0)
})
```

**Quick wins**:
- Add cookie consent banner (required for EU visitors)
- Build data export endpoint (JSON format is fine)
- Build data deletion workflow that cascades to related tables
- Write privacy policy (use a generator, have a lawyer review)

### HIPAA - Health Insurance Portability and Accountability Act

**Who it applies to**: US healthcare providers, health insurers, and anyone handling Protected Health Information (PHI).

**What it requires**:
- Encrypt PHI at rest and in transit
- Access controls (who can see patient data)
- Audit logs of who accessed what patient data
- Business Associate Agreements with vendors
- No real PHI in development or test environments

**Testing requirements**:
```javascript
// Test: PHI access is logged
test('accessing patient records creates audit log', async () => {
  const patient = await createTestPatient()
  const doctor = await createTestDoctor()

  await request
    .get(`/api/patients/${patient.id}`)
    .set('Authorization', doctor.token)

  // Verify access was logged
  const auditLog = await db.audit_logs.findRecent({
    user_id: doctor.id,
    resource_type: 'patient',
    resource_id: patient.id
  })

  expect(auditLog).toBeDefined()
  expect(auditLog.action).toBe('view')
  expect(auditLog.timestamp).toBeDefined()
  expect(auditLog.ip_address).toBeDefined()
})

// Test: Only authorized users can access PHI
test('non-authorized users cannot access patient data', async () => {
  const patient = await createTestPatient()
  const unauthorizedUser = await createTestUser()

  const response = await request
    .get(`/api/patients/${patient.id}`)
    .set('Authorization', unauthorizedUser.token)

  expect(response.status).toBe(403)
  expect(response.body.error).toMatch(/not authorized/i)
})
```

**Critical rule**: Never use production PHI in test environments. Use synthetic data instead:

```javascript
// Generate realistic but fake patient data
function createTestPatient() {
  return {
    name: faker.person.fullName(),
    dob: faker.date.past(50),
    mrn: `TEST-${faker.string.alphanumeric(8)}`, // Medical record number
    diagnosis: 'Test diagnosis',
    _test_data_flag: true // Mark as test data
  }
}
```

### PCI-DSS - Payment Card Industry Data Security Standard

**Who it applies to**: Anyone who accepts, processes, stores, or transmits credit card information.

**What it requires**:
- Never store CVV/CVC codes (the 3-digit security code)
- Encrypt cardholder data
- Use a payment processor (Stripe, Square) - don't handle cards directly
- Quarterly vulnerability scans
- Annual penetration testing

**The best compliance strategy**: Don't handle card data yourself. Use Stripe, Square, or another PCI-compliant processor.

**Testing requirements** (if using a payment processor):
```javascript
// Test: Payment flow works without storing card data
test('payment is processed without storing card number', async () => {
  // Use Stripe test card
  const testCardToken = 'tok_visa' // Stripe test token

  const response = await request
    .post('/api/checkout')
    .send({
      amount: 5000, // $50.00
      paymentToken: testCardToken
    })

  expect(response.status).toBe(200)
  expect(response.body.status).toBe('succeeded')

  // Verify we didn't store the card number
  const order = await db.orders.findById(response.body.orderId)
  expect(order.card_number).toBeUndefined()
  expect(order.card_last_four).toBe('4242') // OK to store last 4 digits
  expect(order.payment_token).toBeDefined() // Token is safe
})

// Test: Card data is never logged
test('card numbers do not appear in logs', async () => {
  const logs = await getRecentLogs()

  // Check for patterns that look like card numbers
  const cardPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/

  for (const log of logs) {
    expect(log.message).not.toMatch(cardPattern)
  }
})
```

**Test cards** (use these instead of real cards):
```javascript
const TEST_CARDS = {
  visa: '4242424242424242',
  mastercard: '5555555555554444',
  amex: '378282246310005',
  declined: '4000000000000002'
}
```

### SOC 2 - Service Organization Control 2

**Who it applies to**: SaaS companies selling to enterprise customers.

**What it requires**:
- Security controls (access management, encryption, monitoring)
- Availability controls (uptime, backups, disaster recovery)
- Third-party audit by certified auditor
- 6-12 months of evidence for Type II certification

**Testing requirements**:
```javascript
// Test: Access controls are enforced
test('users can only access their own organization data', async () => {
  const org1User = await createTestUser({ orgId: 'org-1' })
  const org2Resource = await createTestResource({ orgId: 'org-2' })

  const response = await request
    .get(`/api/resources/${org2Resource.id}`)
    .set('Authorization', org1User.token)

  expect(response.status).toBe(403)
})

// Test: All access is logged
test('resource access is logged for audit', async () => {
  const user = await createTestUser()
  const resource = await createTestResource()

  await request
    .get(`/api/resources/${resource.id}`)
    .set('Authorization', user.token)

  const auditLog = await db.audit_logs.findRecent({
    user_id: user.id,
    resource_id: resource.id
  })

  expect(auditLog).toBeDefined()
  expect(auditLog.action).toBe('read')
})

// Test: Failed login attempts are limited
test('account locked after 5 failed login attempts', async () => {
  const user = await createTestUser({ email: 'test@example.com' })

  // Attempt 5 failed logins
  for (let i = 0; i < 5; i++) {
    await request
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
  }

  // 6th attempt should be blocked
  const response = await request
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: user.password })

  expect(response.status).toBe(429) // Too many requests
  expect(response.body.error).toMatch(/account locked/i)
})
```

## Common Compliance Mistakes

### Mistake 1: "We'll Add Compliance Later"

Compliance affects your architecture (how you store data, who can access it, how you log access). Retrofitting compliance is expensive and sometimes impossible.

**What to do**: Build compliance in from the start. At minimum, plan for:
- Data deletion (don't design data models that can't be deleted)
- Access logging (add audit tables early)
- Data export (structure data so it can be extracted)

### Mistake 2: Testing with Production Data

Using real user data in test environments violates GDPR, HIPAA, and most other privacy regulations.

```javascript
// ❌ Bad - compliance violation
test('user profile loads correctly', async () => {
  // Using real production user!
  const realUser = await db.users.findByEmail('john.smith@realcompany.com')
  // ...
})

// ✅ Good - synthetic test data
test('user profile loads correctly', async () => {
  const testUser = await createTestUser({
    email: 'test+profile@example.com',
    name: faker.person.fullName()
  })

  // Clean up after test
  afterAll(async () => {
    await testUser.delete()
  })
})
```

### Mistake 3: Soft Deletes Don't Count as Deletion

GDPR requires actual data deletion, not just marking records as deleted.

```javascript
// ❌ Bad - doesn't satisfy GDPR
async function deleteUser(userId) {
  await db.users.update(userId, { deleted: true })
  // Data still exists in database
}

// ✅ Good - actually deletes data
async function deleteUser(userId) {
  // Delete related data first (cascade)
  await db.orders.deleteByUser(userId)
  await db.sessions.deleteByUser(userId)
  await db.audit_logs.anonymizeUser(userId) // Keep audit logs but remove PII

  // Delete user record
  await db.users.delete(userId)
}
```

### Mistake 4: No Audit Logging

SOC 2, HIPAA, and PCI-DSS all require audit logs showing who accessed what and when.

```javascript
// ✅ Log all access to sensitive data
async function getPatientRecord(patientId, userId, ipAddress) {
  const patient = await db.patients.findById(patientId)

  // Log the access
  await db.audit_logs.create({
    user_id: userId,
    action: 'view',
    resource_type: 'patient',
    resource_id: patientId,
    timestamp: new Date(),
    ip_address: ipAddress
  })

  return patient
}
```

### Mistake 5: Assuming Payment Processor = Full Compliance

Stripe and Square handle card data securely (solving most PCI-DSS requirements), but you still need to:
- Test that you're not storing card numbers anywhere
- Test that card data isn't logged
- Handle refunds and disputes correctly
- Secure the payment token

## Quick Wins - Baseline Compliance

These apply to almost everyone handling personal data:

### 1. Add a Privacy Policy

Required by GDPR, CCPA, and most privacy laws.

**What to include**:
- What data you collect
- Why you collect it
- How long you keep it
- Who you share it with
- How users can request deletion

Use a privacy policy generator, then have a lawyer review it.

### 2. Cookie Consent Banner

Required for EU visitors under GDPR.

**Requirements**:
- Appear before setting non-essential cookies
- Allow users to opt out
- Remember user's choice
- Make it easy to change consent later

### 3. Data Export Endpoint

GDPR's "right to access" requires letting users download their data.

```javascript
// /api/user/export
app.get('/api/user/export', authenticateUser, async (req, res) => {
  const userId = req.user.id

  // Gather all user data
  const userData = {
    profile: await db.users.findById(userId),
    orders: await db.orders.findByUser(userId),
    preferences: await db.preferences.findByUser(userId),
    activity: await db.activity_log.findByUser(userId),
    created_at: new Date().toISOString()
  }

  res.json(userData)
})
```

### 4. Data Deletion Endpoint

GDPR's "right to erasure" requires letting users delete their data.

```javascript
// /api/user/account
app.delete('/api/user/account', authenticateUser, async (req, res) => {
  const userId = req.user.id

  // Delete in order (handle foreign keys)
  await db.sessions.deleteByUser(userId)
  await db.orders.deleteByUser(userId)
  await db.preferences.deleteByUser(userId)
  await db.activity_log.anonymizeUser(userId) // Keep logs but remove PII
  await db.users.delete(userId)

  res.json({ message: 'Account deleted successfully' })
})
```

### 5. HTTPS Everywhere

All compliance frameworks require encryption in transit. No HTTP, only HTTPS.

Test this:
```javascript
test('HTTP requests redirect to HTTPS', async () => {
  const response = await request
    .get('http://example.com/api/user')
    .redirects(0) // Don't follow redirects

  expect(response.status).toBe(301) // Permanent redirect
  expect(response.headers.location).toMatch(/^https:/)
})
```

### 6. Audit Logging for Sensitive Operations

Log who did what, when.

```javascript
// Log important actions
const AUDITABLE_ACTIONS = [
  'user.login',
  'user.logout',
  'user.password_change',
  'user.delete',
  'data.export',
  'admin.access',
  'patient.view', // HIPAA
  'payment.process' // PCI-DSS
]

async function auditLog(userId, action, details = {}) {
  await db.audit_logs.create({
    user_id: userId,
    action: action,
    details: details,
    timestamp: new Date(),
    ip_address: details.ip
  })
}
```

## Test Data for Compliance

Never use production data in testing if you're subject to GDPR, HIPAA, or PCI-DSS.

### Generate Synthetic Data

```javascript
const { faker } = require('@faker-js/faker')

function createTestUser() {
  return {
    email: `test+${faker.string.alphanumeric(8)}@example.com`,
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    _test_data: true // Flag it clearly
  }
}

function createTestPatient() {
  return {
    name: faker.person.fullName(),
    dob: faker.date.past(50),
    ssn: '000-00-0000', // Clearly fake
    mrn: `TEST-${faker.string.alphanumeric(8)}`,
    diagnosis: 'Test diagnosis',
    _test_data: true
  }
}
```

### Use Test Payment Cards

```javascript
// Stripe test cards - use these, never real cards
const TEST_CARDS = {
  visa_success: '4242424242424242',
  visa_declined: '4000000000000002',
  requires_authentication: '4000002500003155',
  mastercard: '5555555555554444'
}
```

## Red Flags You Have Compliance Issues

Watch for these warning signs:

- ⚠️ Using production data in test/dev environments
- ⚠️ Storing credit card numbers in your database
- ⚠️ No privacy policy on your website
- ⚠️ Can't export user data in portable format
- ⚠️ Can't delete user data (or only soft-delete)
- ⚠️ No audit logs for data access
- ⚠️ HTTP instead of HTTPS
- ⚠️ Sharing data with third parties without user consent
- ⚠️ No cookie consent banner for EU visitors
- ⚠️ Pre-checked consent boxes (not allowed under GDPR)

## When to Get Expert Help

Some compliance you can handle yourself. Some requires lawyers and auditors.

**Handle yourself** (with testing):
- Basic GDPR compliance (consent, export, deletion)
- Using a payment processor (Stripe/Square handles most PCI-DSS)
- Basic access logging
- Privacy policy (use generator + lawyer review)

**Get expert help for**:
- HIPAA compliance (healthcare data is complicated)
- SOC 2 Type II audit (requires certified auditor)
- PCI-DSS Level 1 (high transaction volume)
- Government contracts (FedRAMP, FISMA)
- After a data breach (get lawyer immediately)

Don't DIY HIPAA or SOC 2 audits. The cost of getting it wrong is too high.

## What's Next

This surface layer helps you identify which compliance frameworks apply to you and implement basic compliance testing.

**When you're ready for more**:
- **Mid-Depth**: Automated compliance checks in CI/CD, comprehensive GDPR/HIPAA testing, SOC 2 controls validation
- **Deep-Water**: Multi-framework compliance (GDPR + HIPAA + SOC 2), audit preparation, continuous compliance monitoring

**Related Topics**:
- [Security Testing](../../security-testing/surface/index.md) - Many compliance requirements overlap with security testing
- [Accessibility Testing](../../accessibility-testing/surface/index.md) - ADA and WCAG have legal compliance aspects
- [Audit Logging](../../../06-operations/audit-logging/surface/index.md) - Required for SOC 2, HIPAA, PCI-DSS

**Reality check**: Compliance isn't fun, but it's not optional. The good news is that most compliance requirements are testable. Treat compliance features like any other feature - write tests, automate what you can, and verify they work before you need them for an audit.

---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Unit & Integration Testing](../../unit-integration-testing/surface/index.md) - Related testing considerations
- [Security Testing](../../security-testing/surface/index.md) - Related testing considerations
- [Accessibility Testing](../../accessibility-testing/surface/index.md) - Related testing considerations

### Navigate
- [← Back to Testing Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
