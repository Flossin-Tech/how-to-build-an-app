---
title: "Compliance Validation"
phase: "04-testing"
topic: "compliance-validation"
depth: "mid-depth"
reading_time: 30
prerequisites: ["compliance-validation-surface", "security-testing", "accessibility-testing"]
related_topics: ["data-privacy", "audit-logging", "encryption", "soc2-preparation"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Compliance Validation (Mid-Depth)

## What This Builds On

The surface layer covered identifying requirements, basic GDPR/HIPAA/PCI-DSS testing, and synthetic test data. You know what compliance means for your application and have started testing the basics.

This mid-depth layer gets you ready for actual audits. You'll build comprehensive test suites for each compliance framework, automate compliance checks in CI/CD, prepare for SOC 2 certification, and maintain continuous compliance monitoring. The goal is passing audits and selling to enterprise customers who require proof of compliance.

## The Problems You're Solving

Manual compliance checks don't scale. You might be compliant today, but a feature deployed tomorrow could break GDPR data export or disable HIPAA audit logging. Preparing for audits is expensive and painful when done reactively. Enterprise sales stall without SOC 2.

The real problems:
- **Compliance drift**: Compliant at launch, non-compliant after six months of feature development
- **Audit surprises**: Discovering gaps when the auditor asks for evidence
- **Manual testing burden**: Checking 200 compliance requirements by hand before each release
- **Multi-jurisdiction complexity**: GDPR in EU, HIPAA in US, PIPEDA in Canada - different rules, same codebase
- **Proof required**: "We're compliant" doesn't close enterprise deals; SOC 2 Type II does

This guide shows you how to make compliance testable, automated, and continuously verified.

## Comprehensive GDPR Testing

GDPR grants users seven rights over their data. Each right needs automated tests proving it works. The fines for violations start at 4% of global revenue, which focuses the mind.

### The Seven Data Subject Rights

**1. Right of Access (Data Export)**

Users can request all data you hold about them. You have 30 days to comply. The export must be machine-readable and complete.

```javascript
describe('GDPR Data Export', () => {
  test('user can export all their data', async () => {
    const user = await createUser('user@example.com')
    await createOrders(user, 3)
    await createSessions(user, 5)
    await createReviews(user, 2)

    const response = await request
      .get('/api/user/export')
      .set('Authorization', `Bearer ${user.token}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('personal_data')
    expect(response.body).toHaveProperty('orders')
    expect(response.body).toHaveProperty('sessions')
    expect(response.body).toHaveProperty('reviews')

    // Must be machine-readable format (JSON or CSV)
    expect(response.headers['content-type']).toContain('application/json')
  })

  test('export includes all data categories', async () => {
    const user = await createUser('user@example.com', {
      name: 'Jane Doe',
      phone: '+1-555-0100'
    })
    await addPaymentMethod(user, { last4: '4242' })
    await createPreferences(user, { newsletter: true })

    const exported = await exportUserData(user.id)

    // Verify completeness - missing categories fail audits
    const requiredCategories = [
      'profile',              // Name, email, phone
      'contact_information',  // Address, secondary emails
      'orders',              // Purchase history
      'payment_methods',     // Saved cards (masked)
      'preferences',         // Settings and choices
      'login_history',       // Session data
      'consent_records',     // When they agreed to what
      'communications'       // Emails sent to them
    ]

    requiredCategories.forEach(category => {
      expect(exported).toHaveProperty(category)
    })
  })

  test('export format is portable', async () => {
    const user = await createUser('user@example.com')
    const exported = await exportUserData(user.id)

    // Must be usable by another service
    const reimported = JSON.parse(JSON.stringify(exported))
    expect(reimported.personal_data.email).toBe('user@example.com')

    // No proprietary IDs or internal references without context
    expect(exported._internal_id).toBeUndefined()
  })

  test('export completes in reasonable time', async () => {
    // 30-day deadline doesn't mean it should take 30 days
    const user = await createUserWithData({
      orders: 1000,
      sessions: 5000
    })

    const startTime = Date.now()
    const exported = await exportUserData(user.id)
    const duration = Date.now() - startTime

    // Should complete in seconds, not hours
    expect(duration).toBeLessThan(60000)  // 60 seconds max
    expect(exported.orders.length).toBe(1000)
  })

  test('export excludes derived or inferred data', async () => {
    const user = await createUser('user@example.com')

    // System infers user might like product X based on behavior
    await trackBehavior(user, 'viewed_product', { productId: 'X' })
    const inference = await getProductRecommendations(user.id)

    const exported = await exportUserData(user.id)

    // Exported data includes what user provided
    expect(exported.behavior_data).toBeDefined()

    // But not what system inferred (unless you choose to include it)
    expect(exported.recommendations).toBeUndefined()
  })
})
```

You can include inferred data in exports, but GDPR doesn't require it. The requirement is data "concerning" the user - what they provided or what you collected about them.

**2. Right to Erasure (Right to be Forgotten)**

Users can request deletion of their data. You must comply unless you have legitimate legal reasons to keep it (tax records, fraud prevention, etc.).

```javascript
describe('GDPR Data Deletion', () => {
  test('deleting user cascades to all related data', async () => {
    const user = await createUser('user@example.com')
    await createOrders(user, 5)
    await createReviews(user, 3)
    await createSessions(user, 10)
    await createWishlist(user, 7)

    await request
      .delete('/api/user/account')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(204)

    // User deleted
    expect(await db.users.findById(user.id)).toBeNull()

    // All related data deleted
    expect(await db.orders.findByUser(user.id)).toHaveLength(0)
    expect(await db.reviews.findByUser(user.id)).toHaveLength(0)
    expect(await db.sessions.findByUser(user.id)).toHaveLength(0)
    expect(await db.wishlist.findByUser(user.id)).toHaveLength(0)
  })

  test('deletion preserves legally required data', async () => {
    const user = await createUser('user@example.com')
    const order = await createOrder(user, {
      total: 100,
      tax: 10,
      date: new Date('2024-01-15')
    })

    await deleteUserAccount(user.id)

    // User PII deleted
    expect(await db.users.findById(user.id)).toBeNull()

    // Order preserved for tax compliance (7 years in many jurisdictions)
    const preserved = await db.orders.findById(order.id)
    expect(preserved).toBeDefined()
    expect(preserved.user_id).toBeNull()  // Unlinked from user
    expect(preserved.total).toBe(100)  // Financial data intact
    expect(preserved.tax).toBe(10)
    expect(preserved.anonymized).toBe(true)
    expect(preserved.anonymized_reason).toBe('tax_retention')
  })

  test('deletion handles backups appropriately', async () => {
    const user = await createUser('user@example.com')

    // Create backup before deletion
    await createBackup()

    // Delete user
    await deleteUserAccount(user.id)

    // User deleted in active database
    expect(await db.users.findById(user.id)).toBeNull()

    // Backup retention documented
    const policy = await getBackupRetentionPolicy()
    expect(policy.deleted_user_handling).toBe('overwrite_on_next_backup')
    expect(policy.max_retention_days).toBeLessThanOrEqual(90)
  })

  test('deletion is irreversible', async () => {
    const user = await createUser('user@example.com')
    const userId = user.id

    await deleteUserAccount(userId)

    // Cannot restore
    await expect(
      restoreUser(userId)
    ).rejects.toThrow(/cannot restore deleted account/i)

    // Email is freed for re-use after cooling-off period
    await expect(
      createUser('user@example.com')
    ).rejects.toThrow(/recently deleted/i)

    // But can re-use after 30 days
    await advanceTime(31, 'days')
    const newUser = await createUser('user@example.com')
    expect(newUser.id).not.toBe(userId)  // Different user
  })

  test('deletion logs are retained for compliance', async () => {
    const user = await createUser('user@example.com')

    await deleteUserAccount(user.id)

    // Deletion event logged
    const logs = await db.compliance_logs.where({
      action: 'account_deletion',
      user_id: user.id  // OK to log user_id even after deletion
    })

    expect(logs.length).toBe(1)
    expect(logs[0]).toHaveProperty('timestamp')
    expect(logs[0]).toHaveProperty('reason', 'user_request')
    expect(logs[0]).toHaveProperty('deleted_data_summary')
  })
})
```

The tricky part is balancing deletion with legitimate retention needs. Tax authorities require financial records. Fraud prevention requires keeping evidence. Document your retention policies before the auditor asks.

**3. Right to Rectification**

Users can correct inaccurate data. Straightforward in principle, complex when data has propagated.

```javascript
describe('GDPR Data Rectification', () => {
  test('user can update their personal data', async () => {
    const user = await createUser('user@example.com', {
      name: 'Jane Doe',
      phone: '+1-555-0100'
    })

    await request
      .patch('/api/user/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        name: 'Jane Smith',
        phone: '+1-555-0200'
      })
      .expect(200)

    const updated = await getUser(user.id)
    expect(updated.name).toBe('Jane Smith')
    expect(updated.phone).toBe('+1-555-0200')
  })

  test('corrections propagate to dependent systems', async () => {
    const user = await createUser('user@example.com', {
      name: 'Jane Doe'
    })

    // Name appears in order history
    await createOrder(user, { shipping_name: user.name })

    // User corrects name
    await updateUser(user.id, { name: 'Jane Smith' })

    // Future orders use new name
    const newOrder = await createOrder(user, {})
    expect(newOrder.shipping_name).toBe('Jane Smith')

    // Historical orders optionally updated (business decision)
    const oldOrder = await db.orders.first()
    // Either updated: expect(oldOrder.shipping_name).toBe('Jane Smith')
    // Or frozen as historical record with note
    expect(oldOrder.shipping_name_corrected).toBe('Jane Smith')
  })
})
```

**4. Right to Restrict Processing**

Users can limit how you use their data without deleting it. Think of it as "pause my account" rather than "delete my account."

```javascript
test('user can restrict processing without deletion', async () => {
  const user = await createUser('user@example.com')

  await request
    .post('/api/user/restrict-processing')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ reason: 'contesting data accuracy' })
    .expect(200)

  const restricted = await getUser(user.id)
  expect(restricted.processing_restricted).toBe(true)

  // Can still store data
  expect(restricted.email).toBe('user@example.com')

  // But cannot use it for new processing
  await expect(
    sendMarketingEmail(user.id)
  ).rejects.toThrow(/processing restricted/i)
})
```

**5. Right to Data Portability**

Similar to Right of Access, but specifically for data user provided (not derived) in a machine-readable format intended for transfer to another service.

```javascript
test('user can export data in portable format', async () => {
  const user = await createUser('user@example.com', {
    name: 'Jane Doe',
    preferences: { theme: 'dark' }
  })

  const portable = await request
    .get('/api/user/export-portable')
    .set('Authorization', `Bearer ${user.token}`)

  // Standard format (JSON, CSV, XML)
  expect(portable.headers['content-type']).toContain('application/json')

  // Only user-provided data
  expect(portable.body.profile).toBeDefined()
  expect(portable.body.preferences).toBeDefined()

  // Excludes system-generated (logs, IDs, etc.)
  expect(portable.body.internal_user_score).toBeUndefined()
})
```

**6. Right to Object**

Users can object to processing based on legitimate interests, direct marketing, or automated decision-making.

```javascript
test('user can object to marketing', async () => {
  const user = await createUser('user@example.com')

  await request
    .post('/api/user/object-marketing')
    .set('Authorization', `Bearer ${user.token}`)
    .expect(200)

  const updated = await getUser(user.id)
  expect(updated.marketing_objection).toBe(true)

  // Marketing processing must stop
  expect(await canSendMarketing(user.id)).toBe(false)
})
```

**7. Rights Related to Automated Decision-Making**

If you make decisions solely by automated means (credit scoring, resume screening), users have rights to human review.

```javascript
test('automated decisions can be reviewed by human', async () => {
  const user = await createUser('user@example.com')
  const loanApplication = await applyForLoan(user, { amount: 10000 })

  // Automated system denies
  expect(loanApplication.status).toBe('denied')
  expect(loanApplication.automated).toBe(true)

  // User requests human review
  await request
    .post(`/api/loans/${loanApplication.id}/request-review`)
    .set('Authorization', `Bearer ${user.token}`)
    .expect(200)

  const updated = await getLoanApplication(loanApplication.id)
  expect(updated.human_review_requested).toBe(true)
  expect(updated.review_deadline).toBeWithin(30, 'days')
})
```

### Consent Management Testing

GDPR requires consent to be freely given, specific, informed, and unambiguous. Pre-ticked boxes don't count.

```javascript
describe('GDPR Consent', () => {
  test('consent must be granular and optional', async () => {
    render(<CookieConsent />)

    // Necessary cookies can't be declined
    const necessary = screen.getByRole('checkbox', { name: /necessary/i })
    expect(necessary).toBeChecked()
    expect(necessary).toBeDisabled()

    // Optional categories start unchecked
    const analytics = screen.getByRole('checkbox', { name: /analytics/i })
    const marketing = screen.getByRole('checkbox', { name: /marketing/i })

    expect(analytics).not.toBeChecked()
    expect(marketing).not.toBeChecked()

    // User can consent to analytics but not marketing
    userEvent.click(analytics)
    userEvent.click(screen.getByRole('button', { name: /save preferences/i }))

    const consent = await getConsent(currentUser.id)
    expect(consent.necessary).toBe(true)
    expect(consent.analytics).toBe(true)
    expect(consent.marketing).toBe(false)
  })

  test('consent can be withdrawn easily', async () => {
    const user = await createUserWithConsent({
      analytics: true,
      marketing: true
    })

    // Withdrawing consent is as easy as giving it
    await request
      .post('/api/consent/withdraw')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ categories: ['marketing'] })
      .expect(200)

    const updated = await getConsent(user.id)
    expect(updated.marketing).toBe(false)
    expect(updated.analytics).toBe(true)  // Only requested category withdrawn

    // Processing stops immediately
    expect(await isMarketingAllowed(user.id)).toBe(false)
  })

  test('consent is logged with timestamp and version', async () => {
    const user = await createUser('user@example.com')

    await giveConsent(user.id, {
      analytics: true,
      policyVersion: '2024-01-15'
    })

    const logs = await db.consent_logs.where({ user_id: user.id })

    expect(logs.length).toBe(1)
    expect(logs[0].granted_at).toBeDefined()
    expect(logs[0].policy_version).toBe('2024-01-15')
    expect(logs[0].consent_text_hash).toBeDefined()  // Proof of what they agreed to
  })

  test('stale consent is re-requested', async () => {
    const user = await createUserWithConsent({
      analytics: true,
      granted_at: new Date('2023-01-01')
    })

    // Privacy policy updated significantly
    await updatePrivacyPolicy('2024-01-15', { major_changes: true })

    // Old consent is invalidated
    const valid = await isConsentValid(user.id)
    expect(valid).toBe(false)

    // User must re-consent
    const response = await request
      .get('/api/analytics-data')
      .set('Authorization', `Bearer ${user.token}`)

    expect(response.status).toBe(403)
    expect(response.body.error).toContain('consent required')
  })
})
```

The key insight: consent isn't binary. Analytics consent doesn't imply marketing consent. Documenting what they agreed to and when becomes critical when a user claims they never consented.

## Comprehensive HIPAA Testing

HIPAA applies to protected health information (PHI): anything that identifies a patient and relates to their health condition, treatment, or payment. The testing focus is access control, encryption, and audit logging.

### PHI Protection Testing

```javascript
describe('HIPAA PHI Protection', () => {
  test('PHI is encrypted at rest', async () => {
    const patient = await createPatient({
      name: 'John Doe',
      ssn: '123-45-6789',
      diagnosis: 'Type 2 Diabetes',
      medications: ['Metformin']
    })

    // Query database directly, bypassing ORM decryption
    const raw = await db.raw(
      'SELECT * FROM patients WHERE id = ?',
      [patient.id]
    )

    // PHI fields should be encrypted (typically AES-256)
    expect(raw[0].ssn).not.toBe('123-45-6789')
    expect(raw[0].ssn).toMatch(/^[A-Za-z0-9+/=]+$/)  // Base64 encrypted blob

    expect(raw[0].diagnosis).not.toBe('Type 2 Diabetes')
    expect(raw[0].diagnosis).toMatch(/^[A-Za-z0-9+/=]+$/)

    // Non-PHI fields can be unencrypted
    expect(raw[0].id).toBe(patient.id)
    expect(raw[0].created_at).toBeDefined()
  })

  test('PHI is encrypted in transit', async () => {
    // HTTPS enforced
    const httpsEnforced = await testHTTPSEnforcement()
    expect(httpsEnforced).toBe(true)

    // Minimum TLS 1.2 (TLS 1.3 preferred)
    const tlsVersion = await getTLSVersion()
    expect(parseFloat(tlsVersion)).toBeGreaterThanOrEqual(1.2)

    // Strong cipher suites only
    const ciphers = await getActiveCipherSuites()
    const weakCiphers = ciphers.filter(cipher =>
      cipher.includes('DES') ||   // Weak
      cipher.includes('RC4') ||   // Weak
      cipher.includes('MD5')      // Weak
    )
    expect(weakCiphers).toHaveLength(0)
  })

  test('PHI is encrypted in backups', async () => {
    const patient = await createPatient({
      ssn: '123-45-6789'
    })

    // Create backup
    const backup = await createBackup()

    // Extract backup file contents
    const backupContents = await readBackupFile(backup.path)

    // PHI should not appear in plaintext
    expect(backupContents).not.toContain('123-45-6789')

    // Backup should be encrypted container
    expect(backup.encryption).toBe('AES-256-GCM')
    expect(backup.encrypted).toBe(true)
  })
})
```

Encryption is table stakes for HIPAA. If PHI touches disk or network in plaintext, you fail the audit.

### Access Control Testing

HIPAA requires "minimum necessary" access - users only see PHI they need for their job function.

```javascript
describe('HIPAA Access Control', () => {
  test('minimum necessary access enforced', async () => {
    const patient = await createPatient({
      name: 'John Doe',
      diagnosis: 'Type 2 Diabetes'
    })

    // Doctor treating patient can view PHI
    const doctor = await createDoctor({ specialty: 'endocrinology' })
    await assignPatient(doctor.id, patient.id)

    const doctorView = await request
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${doctor.token}`)

    expect(doctorView.status).toBe(200)
    expect(doctorView.body).toHaveProperty('diagnosis')
    expect(doctorView.body).toHaveProperty('medications')

    // Receptionist sees contact info only
    const receptionist = await createStaff({ role: 'receptionist' })

    const receptionistView = await request
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${receptionist.token}`)

    expect(receptionistView.status).toBe(200)
    expect(receptionistView.body).toHaveProperty('name')
    expect(receptionistView.body).toHaveProperty('phone')
    expect(receptionistView.body).toHaveProperty('next_appointment')

    // No clinical data
    expect(receptionistView.body).not.toHaveProperty('diagnosis')
    expect(receptionistView.body).not.toHaveProperty('medications')
  })

  test('access requires legitimate relationship', async () => {
    const patient = await createPatient()
    const doctor = await createDoctor()

    // Doctor not assigned to patient
    const response = await request
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${doctor.token}`)

    expect(response.status).toBe(403)
    expect(response.body.error).toContain('no treatment relationship')
  })

  test('emergency access is logged and flagged', async () => {
    const patient = await createPatient()
    const emergencyDoc = await createDoctor()

    // Emergency access granted without prior relationship
    const response = await request
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${emergencyDoc.token}`)
      .set('X-Emergency-Access', 'true')
      .set('X-Emergency-Reason', 'Patient in ER, unconscious')

    expect(response.status).toBe(200)

    // Access logged with emergency flag
    const logs = await db.audit_logs.where({
      resource_id: patient.id,
      user_id: emergencyDoc.id
    })

    expect(logs[0].emergency_access).toBe(true)
    expect(logs[0].emergency_reason).toBeDefined()

    // Flagged for review
    const alerts = await db.compliance_alerts.where({
      type: 'emergency_access',
      patient_id: patient.id
    })

    expect(alerts.length).toBeGreaterThan(0)
  })
})
```

Break-glass access for emergencies is legitimate, but requires extra scrutiny. Document the emergency, log the access, and review it after.

### Audit Logging Testing

HIPAA requires detailed audit logs of PHI access. The logs must be tamper-proof and retained for six years.

```javascript
describe('HIPAA Audit Logging', () => {
  test('all PHI access is logged', async () => {
    const patient = await createPatient()
    const doctor = await createDoctor()
    await assignPatient(doctor.id, patient.id)

    // Access PHI
    await request
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${doctor.token}`)

    // Verify logged
    const logs = await db.audit_logs.where({
      resource_type: 'patient',
      resource_id: patient.id
    })

    expect(logs.length).toBeGreaterThan(0)

    const log = logs[0]
    expect(log).toHaveProperty('user_id', doctor.id)
    expect(log).toHaveProperty('action', 'view')
    expect(log).toHaveProperty('timestamp')
    expect(log).toHaveProperty('ip_address')
    expect(log).toHaveProperty('user_agent')

    // Which fields accessed
    expect(log).toHaveProperty('fields_accessed')
    expect(log.fields_accessed).toContain('diagnosis')
  })

  test('audit logs include failed access attempts', async () => {
    const patient = await createPatient()
    const unauthorizedUser = await createUser('user@example.com')

    // Attempt access without authorization
    await request
      .get(`/api/patients/${patient.id}`)
      .set('Authorization', `Bearer ${unauthorizedUser.token}`)
      .expect(403)

    // Failed attempt logged
    const logs = await db.audit_logs.where({
      resource_type: 'patient',
      resource_id: patient.id,
      user_id: unauthorizedUser.id
    })

    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].action).toBe('view_denied')
    expect(logs[0].reason).toContain('insufficient permissions')
  })

  test('audit logs are tamper-proof', async () => {
    const log = await createAuditLog({
      action: 'view',
      user_id: 123,
      resource_id: 456
    })

    // Attempt to modify
    await expect(
      db.audit_logs.update(log.id, { action: 'delete' })
    ).rejects.toThrow(/cannot modify audit log/i)

    // Attempt to delete
    await expect(
      db.audit_logs.delete(log.id)
    ).rejects.toThrow(/cannot delete audit log/i)
  })

  test('audit logs retained for 6 years minimum', async () => {
    const retentionPolicy = await getAuditLogRetentionPolicy()

    expect(retentionPolicy.years).toBeGreaterThanOrEqual(6)
    expect(retentionPolicy.deletion_disabled).toBe(true)
  })

  test('audit log storage is monitored', async () => {
    // Logs grow unbounded - monitor storage
    const monitoring = await getStorageMonitoring('audit_logs')

    expect(monitoring.enabled).toBe(true)
    expect(monitoring.alert_threshold_gb).toBeDefined()
    expect(monitoring.archival_strategy).toBeDefined()
  })
})
```

Audit logs become evidence. You can't delete them, you can't modify them. Plan for storage growth - six years of detailed access logs gets large.

### Business Associate Agreement Testing

If you use third-party services that handle PHI (cloud hosting, analytics, email), you need Business Associate Agreements (BAAs) with them.

```javascript
test('third-party services have BAAs', async () => {
  const thirdPartyServices = await getThirdPartyServices()

  const servicesWithPHI = thirdPartyServices.filter(service =>
    service.handles_phi
  )

  servicesWithPHI.forEach(service => {
    // Must have signed BAA
    expect(service.baa_signed).toBe(true)
    expect(service.baa_date).toBeDefined()
    expect(service.baa_expiration).toBeAfter(new Date())

    // BAA document on file
    expect(service.baa_document_path).toBeDefined()
  })
})

test('no PHI sent to services without BAA', async () => {
  const analyticsService = await getService('analytics')

  // Analytics service doesn't have BAA
  expect(analyticsService.baa_signed).toBe(false)

  // Track event without PHI
  const event = {
    user_id: 'hashed_id_123',  // Hashed, not actual patient ID
    action: 'viewed_page',
    page: '/dashboard'
  }

  await trackAnalytics(event)

  // Verify no PHI in payload
  expect(event.patient_name).toBeUndefined()
  expect(event.diagnosis).toBeUndefined()
  expect(event.ssn).toBeUndefined()
})
```

### Test Data Management

Never use real PHI in test environments. The fines for exposing test data are the same as for production data if it's real PHI.

```javascript
describe('Test Data Management', () => {
  test('test environment uses only synthetic data', async () => {
    if (process.env.NODE_ENV === 'test') {
      // No connection to production database
      expect(db.config.host).not.toContain('prod')
      expect(db.config.database).toContain('test')

      // All patient records marked as test data
      const patients = await db.patients.all()
      patients.forEach(patient => {
        expect(patient._is_test_data).toBe(true)

        // Obviously synthetic SSN
        expect(patient.ssn).toMatch(/^000-/)
      })
    }
  })

  test('production data cannot be copied to test', async () => {
    // Database backup script should prevent this
    await expect(
      copyProductionToTest()
    ).rejects.toThrow(/production data export disabled/i)
  })
})
```

Use synthetic data generators that create realistic but fake PHI. Tools like Faker.js work, but consider healthcare-specific generators that understand diagnosis codes, medication names, and procedure codes.

## SOC 2 Type I Preparation

SOC 2 is an audit of your security controls. Type I verifies controls exist at a point in time. Type II (deeper topic) verifies they operated effectively over 3-12 months.

SOC 2 is based on five Trust Service Criteria (TSC). You'll want to hire a qualified auditor for actual certification, but you can prepare by testing your controls.

### Trust Service Criteria

**1. Security**

The system is protected against unauthorized access, use, or modification.

```javascript
describe('SOC 2 Security Controls', () => {
  test('multi-factor authentication enforced for privileged users', async () => {
    const admin = await createUser('admin@example.com', { role: 'admin' })

    // Login with password only should require MFA
    const response = await request
      .post('/api/login')
      .send({
        email: admin.email,
        password: 'correct-password'
      })

    expect(response.status).toBe(200)
    expect(response.body.mfa_required).toBe(true)
    expect(response.body.session_token).toBeUndefined()  // No token yet

    // Full session only after MFA
    const mfaResponse = await request
      .post('/api/login/mfa')
      .send({
        email: admin.email,
        mfa_code: await generateMFACode(admin)
      })

    expect(mfaResponse.status).toBe(200)
    expect(mfaResponse.body.session_token).toBeDefined()
  })

  test('sessions expire after inactivity', async () => {
    const user = await createUser('user@example.com')
    const session = await createSession(user)

    // Session valid initially
    let response = await request
      .get('/api/protected')
      .set('Authorization', `Bearer ${session.token}`)

    expect(response.status).toBe(200)

    // Wait for timeout (15 minutes)
    await advanceTime(16, 'minutes')

    // Session expired
    response = await request
      .get('/api/protected')
      .set('Authorization', `Bearer ${session.token}`)

    expect(response.status).toBe(401)
    expect(response.body.error).toContain('session expired')
  })

  test('passwords meet complexity requirements', async () => {
    // Too short
    await expect(
      createUser('user@example.com', { password: 'Short1!' })
    ).rejects.toThrow(/at least 12 characters/i)

    // No uppercase
    await expect(
      createUser('user@example.com', { password: 'longpassword123!' })
    ).rejects.toThrow(/uppercase letter/i)

    // No number
    await expect(
      createUser('user@example.com', { password: 'LongPassword!' })
    ).rejects.toThrow(/number/i)

    // Valid password
    const user = await createUser('user@example.com', {
      password: 'LongPassword123!'
    })
    expect(user).toBeDefined()
  })

  test('sensitive data encrypted at rest', async () => {
    const user = await createUser('user@example.com')
    await addPaymentMethod(user, {
      card_number: '4242424242424242',
      last4: '4242'
    })

    // Database contains encrypted data
    const raw = await db.raw(
      'SELECT * FROM payment_methods WHERE user_id = ?',
      [user.id]
    )

    expect(raw[0].card_number).not.toContain('4242424242424242')
    expect(raw[0].card_number).toMatch(/^enc_/)  // Encrypted prefix

    // Application can decrypt
    const decrypted = await getPaymentMethod(user.id)
    expect(decrypted.last4).toBe('4242')  // Only last 4 stored/shown
  })

  test('access logs capture security events', async () => {
    const user = await createUser('user@example.com')

    // Failed login attempt
    await request
      .post('/api/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(401)

    // Logged
    const logs = await db.security_logs.where({
      event_type: 'login_failed',
      user_email: user.email
    })

    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0]).toHaveProperty('ip_address')
    expect(logs[0]).toHaveProperty('timestamp')
  })
})
```

**2. Availability**

The system is available for operation and use as committed or agreed.

```javascript
describe('SOC 2 Availability Controls', () => {
  test('system monitors uptime', async () => {
    const monitors = await getUptimeMonitors()

    expect(monitors.length).toBeGreaterThan(0)

    monitors.forEach(monitor => {
      expect(monitor.interval_seconds).toBeLessThanOrEqual(60)  // Check at least every minute
      expect(monitor.enabled).toBe(true)
      expect(monitor.last_check).toBeWithinLast(5, 'minutes')
    })
  })

  test('downtime triggers alerts', async () => {
    const alertRules = await getAlertRules()

    const downtimeAlert = alertRules.find(rule =>
      rule.condition === 'service_down'
    )

    expect(downtimeAlert).toBeDefined()
    expect(downtimeAlert.channels).toContain('pagerduty')
    expect(downtimeAlert.severity).toBe('critical')
  })

  test('backups automated and tested', async () => {
    const backupSchedule = await getBackupSchedule()

    expect(backupSchedule.frequency).toBe('daily')
    expect(backupSchedule.last_run).toBeWithinLast(24, 'hours')
    expect(backupSchedule.last_status).toBe('success')

    // Restore testing
    const restoreTests = await getBackupRestoreTests()
    expect(restoreTests.last_test_date).toBeWithinLast(30, 'days')
    expect(restoreTests.last_result).toBe('success')
  })

  test('redundancy configured', async () => {
    const infrastructure = await getInfrastructureConfig()

    // Database replicas
    expect(infrastructure.database_replicas).toBeGreaterThanOrEqual(1)

    // Multi-AZ deployment
    expect(infrastructure.availability_zones).toBeGreaterThanOrEqual(2)

    // Load balancer health checks
    expect(infrastructure.health_check_enabled).toBe(true)
  })
})
```

**3. Processing Integrity**

System processing is complete, valid, accurate, timely, and authorized.

```javascript
describe('SOC 2 Processing Integrity Controls', () => {
  test('input validation prevents invalid data', async () => {
    // Negative amount
    await expect(
      createOrder({ total: -100 })
    ).rejects.toThrow(/invalid amount/i)

    // Wrong type
    await expect(
      createOrder({ total: 'not-a-number' })
    ).rejects.toThrow(/invalid amount/i)

    // SQL injection attempt
    await expect(
      createOrder({ notes: "'; DROP TABLE orders; --" })
    ).rejects.toThrow(/invalid characters/i)
  })

  test('transactions are atomic', async () => {
    const user = await createUser('user@example.com')
    await addBalance(user.id, 100)

    // Transfer that fails mid-transaction
    await expect(
      transferWithIntentionalFailure(user.id, 50)
    ).rejects.toThrow()

    // Balance unchanged (rollback occurred)
    const updated = await getUser(user.id)
    expect(updated.balance).toBe(100)
  })

  test('critical operations require authorization', async () => {
    const user = await createUser('user@example.com')

    // Admin action requires admin role
    await expect(
      deleteAllUsers(user.token)  // Regular user token
    ).rejects.toThrow(/insufficient permissions/i)
  })

  test('data processing is logged for traceability', async () => {
    const order = await createOrder({ total: 100 })
    await processPayment(order.id, { amount: 100 })

    const logs = await db.processing_logs.where({ order_id: order.id })

    expect(logs).toContainEqual(
      expect.objectContaining({
        action: 'payment_processed',
        amount: 100,
        timestamp: expect.any(Date)
      })
    )
  })
})
```

**4. Confidentiality**

Information designated as confidential is protected as committed or agreed.

```javascript
describe('SOC 2 Confidentiality Controls', () => {
  test('customer data isolated between tenants', async () => {
    const tenant1 = await createTenant('Company A')
    const tenant2 = await createTenant('Company B')

    const user1 = await createUser('user@companya.com', {
      tenant_id: tenant1.id
    })
    const user2 = await createUser('user@companyb.com', {
      tenant_id: tenant2.id
    })

    // User1 cannot see User2's data
    const response = await request
      .get(`/api/users/${user2.id}`)
      .set('Authorization', `Bearer ${user1.token}`)

    expect(response.status).toBe(403)
    expect(response.body.error).toContain('different tenant')
  })

  test('confidential data not logged', async () => {
    const user = await createUser('user@example.com', {
      password: 'SecretPassword123!'
    })

    // Check application logs
    const logs = await getApplicationLogs()
    const logsText = logs.join('\n')

    // Password should not appear in logs
    expect(logsText).not.toContain('SecretPassword123!')

    // Even hashed password shouldn't appear
    const hashedPassword = await hashPassword('SecretPassword123!')
    expect(logsText).not.toContain(hashedPassword)
  })

  test('data disposal is secure', async () => {
    const user = await createUser('user@example.com')
    const userId = user.id

    await deleteUser(userId)

    // Verify no recoverable data
    const deleted = await db.users.findById(userId)
    expect(deleted).toBeNull()

    // Deletion logged
    const logs = await db.deletion_logs.where({ user_id: userId })
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].method).toBe('secure_deletion')
  })
})
```

**5. Privacy**

Personal information is collected, used, retained, disclosed, and disposed of to meet the entity's objectives.

```javascript
describe('SOC 2 Privacy Controls', () => {
  test('privacy policy accessible and current', async () => {
    const response = await request.get('/privacy')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Privacy Policy')
    expect(response.text).toContain('Last Updated')

    const lastUpdated = extractDateFromText(response.text, /Last Updated: (.+)/)
    expect(lastUpdated).toBeWithinLast(12, 'months')
  })

  test('data collection has documented purpose', async () => {
    const dataCategories = await getDataCollectionCategories()

    dataCategories.forEach(category => {
      expect(category).toHaveProperty('name')
      expect(category).toHaveProperty('purpose')
      expect(category).toHaveProperty('legal_basis')
      expect(category).toHaveProperty('retention_period')
    })
  })

  test('third-party data sharing disclosed', async () => {
    const privacyPolicy = await getPrivacyPolicy()
    const thirdPartyIntegrations = await getThirdPartyIntegrations()

    const disclosedPartners = privacyPolicy.third_party_sharing

    thirdPartyIntegrations.forEach(integration => {
      if (integration.shares_user_data) {
        expect(disclosedPartners).toContainEqual(
          expect.objectContaining({
            name: integration.name,
            purpose: expect.any(String)
          })
        )
      }
    })
  })

  test('users can access their data', async () => {
    const user = await createUser('user@example.com')

    const response = await request
      .get('/api/user/data')
      .set('Authorization', `Bearer ${user.token}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('personal_data')
    expect(response.body.personal_data.email).toBe('user@example.com')
  })
})
```

## Automated Compliance Testing in CI/CD

Manual compliance checks before each release don't scale. Automate what you can.

### Compliance Test Suites

Organize compliance tests by framework:

```javascript
// tests/compliance/gdpr.test.js
describe('GDPR Compliance', () => {
  const requiredEndpoints = [
    { path: '/api/user/export', method: 'GET', name: 'Data Export' },
    { path: '/api/user/account', method: 'DELETE', name: 'Account Deletion' },
    { path: '/api/consent', method: 'GET', name: 'Consent Status' },
    { path: '/api/consent', method: 'PUT', name: 'Update Consent' },
    { path: '/api/user/data-portability', method: 'GET', name: 'Data Portability' }
  ]

  requiredEndpoints.forEach(({ path, method, name }) => {
    test(`${name} endpoint exists (${method} ${path})`, async () => {
      const response = await request[method.toLowerCase()](path)

      // Exists (not 404)
      expect(response.status).not.toBe(404)

      // Requires authentication (not publicly accessible)
      expect([401, 403]).toContain(response.status)
    })
  })

  test('privacy policy exists and is accessible', async () => {
    const response = await request.get('/privacy')

    expect(response.status).toBe(200)
    expect(response.text.length).toBeGreaterThan(1000)
    expect(response.text).toContain('GDPR')
  })

  test('cookie consent mechanism exists', async () => {
    const response = await request.get('/')

    expect(response.text).toContain('cookie')
    expect(response.text).toContain('consent')
  })
})

// tests/compliance/security.test.js
describe('Security Compliance', () => {
  test('HTTPS enforced in production', () => {
    if (process.env.NODE_ENV === 'production') {
      expect(process.env.FORCE_HTTPS).toBe('true')
    }
  })

  test('security headers present', async () => {
    const response = await request.get('/')

    const requiredHeaders = [
      'strict-transport-security',
      'x-frame-options',
      'x-content-type-options',
      'content-security-policy',
      'x-xss-protection'
    ]

    requiredHeaders.forEach(header => {
      expect(response.headers[header]).toBeDefined()
    })
  })

  test('sensitive routes require authentication', async () => {
    const sensitiveRoutes = [
      '/api/users',
      '/api/orders',
      '/api/admin'
    ]

    for (const route of sensitiveRoutes) {
      const response = await request.get(route)
      expect([401, 403]).toContain(response.status)
    }
  })
})

// tests/compliance/accessibility.test.js
describe('Accessibility Compliance', () => {
  test('HTML has lang attribute', async () => {
    const response = await request.get('/')
    expect(response.text).toMatch(/<html[^>]+lang="[a-z]{2}"/i)
  })

  test('images have alt text', async () => {
    render(<App />)

    const images = screen.getAllByRole('img')
    images.forEach(img => {
      expect(img).toHaveAttribute('alt')
    })
  })

  test('forms have labels', async () => {
    render(<LoginForm />)

    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      const label = screen.getByLabelText(input.labels[0].textContent)
      expect(label).toBeDefined()
    })
  })
})
```

### CI/CD Pipeline Integration

```yaml
# .github/workflows/compliance.yml
name: Compliance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run GDPR Compliance Tests
        run: npm run test:compliance:gdpr

      - name: Run HIPAA Compliance Tests
        run: npm run test:compliance:hipaa
        if: env.HIPAA_REQUIRED == 'true'

      - name: Run Security Compliance Tests
        run: npm run test:compliance:security

      - name: Run Accessibility Compliance Tests
        run: npm run test:compliance:accessibility

      - name: Generate Compliance Report
        run: npm run compliance:report
        if: always()

      - name: Upload Compliance Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: compliance-report
          path: reports/compliance-report.html

      - name: Comment PR with Compliance Status
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs')
            const report = fs.readFileSync('reports/compliance-summary.md', 'utf8')
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            })
```

Package.json scripts:

```json
{
  "scripts": {
    "test:compliance": "npm run test:compliance:all",
    "test:compliance:all": "jest tests/compliance --coverage",
    "test:compliance:gdpr": "jest tests/compliance/gdpr.test.js",
    "test:compliance:hipaa": "jest tests/compliance/hipaa.test.js",
    "test:compliance:security": "jest tests/compliance/security.test.js",
    "test:compliance:accessibility": "jest tests/compliance/accessibility.test.js",
    "compliance:report": "node scripts/generate-compliance-report.js"
  }
}
```

### Compliance Report Generation

```javascript
// scripts/generate-compliance-report.js
const fs = require('fs')
const path = require('path')

async function generateComplianceReport() {
  const results = {
    gdpr: await runTests('tests/compliance/gdpr.test.js'),
    hipaa: await runTests('tests/compliance/hipaa.test.js'),
    security: await runTests('tests/compliance/security.test.js'),
    accessibility: await runTests('tests/compliance/accessibility.test.js')
  }

  const report = {
    timestamp: new Date().toISOString(),
    overall_status: calculateOverallStatus(results),
    frameworks: {
      gdpr: {
        total_tests: results.gdpr.total,
        passed: results.gdpr.passed,
        failed: results.gdpr.failed,
        compliance_percentage: (results.gdpr.passed / results.gdpr.total * 100).toFixed(1)
      },
      hipaa: {
        total_tests: results.hipaa.total,
        passed: results.hipaa.passed,
        failed: results.hipaa.failed,
        compliance_percentage: (results.hipaa.passed / results.hipaa.total * 100).toFixed(1)
      },
      security: {
        total_tests: results.security.total,
        passed: results.security.passed,
        failed: results.security.failed,
        compliance_percentage: (results.security.passed / results.security.total * 100).toFixed(1)
      },
      accessibility: {
        total_tests: results.accessibility.total,
        passed: results.accessibility.passed,
        failed: results.accessibility.failed,
        compliance_percentage: (results.accessibility.passed / results.accessibility.total * 100).toFixed(1)
      }
    },
    failures: extractFailures(results)
  }

  // Save JSON
  fs.writeFileSync(
    'reports/compliance-report.json',
    JSON.stringify(report, null, 2)
  )

  // Generate HTML
  const html = generateHTML(report)
  fs.writeFileSync('reports/compliance-report.html', html)

  // Generate Markdown summary for PR comments
  const markdown = generateMarkdown(report)
  fs.writeFileSync('reports/compliance-summary.md', markdown)

  console.log('Compliance report generated')

  // Exit with error if any compliance tests failed
  if (report.overall_status === 'failed') {
    process.exit(1)
  }
}

function calculateOverallStatus(results) {
  const allPassed = Object.values(results).every(r => r.failed === 0)
  return allPassed ? 'passed' : 'failed'
}

function extractFailures(results) {
  const failures = []

  for (const [framework, result] of Object.entries(results)) {
    if (result.failures) {
      result.failures.forEach(failure => {
        failures.push({
          framework,
          test: failure.name,
          error: failure.message
        })
      })
    }
  }

  return failures
}

generateComplianceReport()
```

## Continuous Compliance Monitoring

Automated tests catch regressions. Continuous monitoring catches drift in production.

### Compliance Dashboard

Build a dashboard tracking key compliance metrics:

```javascript
// Metrics to track
const complianceMetrics = {
  gdpr: {
    data_export_requests: {
      total: 45,
      completed_within_30_days: 45,
      compliance_rate: '100%'
    },
    deletion_requests: {
      total: 12,
      completed: 12,
      pending: 0
    },
    consent_withdrawal: {
      total: 8,
      processing_stopped_immediately: 8
    }
  },
  hipaa: {
    audit_logs: {
      total_access_events: 15234,
      logged: 15234,
      completeness: '100%'
    },
    encryption: {
      data_encrypted_at_rest: true,
      data_encrypted_in_transit: true,
      encryption_algorithm: 'AES-256-GCM'
    },
    access_control: {
      unauthorized_attempts: 23,
      all_denied: true
    }
  },
  soc2: {
    availability: {
      uptime_percentage: 99.95,
      target: 99.9,
      status: 'compliant'
    },
    security: {
      mfa_enabled_percentage: 100,
      target: 100,
      status: 'compliant'
    },
    backups: {
      last_backup: '2024-11-15T02:00:00Z',
      backup_tested: '2024-11-10T14:00:00Z',
      status: 'compliant'
    }
  }
}

async function updateComplianceDashboard() {
  const metrics = await collectComplianceMetrics()
  await saveToDashboard(metrics)

  // Alert on non-compliance
  const issues = detectComplianceIssues(metrics)
  if (issues.critical.length > 0) {
    await alertComplianceTeam(issues.critical)
  }
}
```

### Scheduled Compliance Scans

```javascript
// services/compliance-scanner.js
const schedule = require('node-schedule')

class ComplianceScanner {
  async scanGDPRCompliance() {
    const issues = []

    // Check data export endpoint exists
    try {
      await testEndpoint('/api/user/export', 'GET')
    } catch (error) {
      issues.push({
        severity: 'critical',
        framework: 'GDPR',
        issue: 'Data export endpoint not accessible',
        remediation: 'Restore /api/user/export endpoint'
      })
    }

    // Check consent management
    const users = await db.users.sample(100)
    for (const user of users) {
      const consent = await db.consent.findByUser(user.id)
      if (!consent) {
        issues.push({
          severity: 'high',
          framework: 'GDPR',
          issue: `User ${user.id} has no consent record`,
          remediation: 'Ensure all users have consent records'
        })
      }
    }

    return issues
  }

  async scanHIPAACompliance() {
    const issues = []

    // Check encryption
    const encryptionStatus = await checkDatabaseEncryption()
    if (!encryptionStatus.enabled) {
      issues.push({
        severity: 'critical',
        framework: 'HIPAA',
        issue: 'Database encryption not enabled',
        remediation: 'Enable encryption at rest immediately'
      })
    }

    // Check audit log completeness
    const recentAccess = await db.patients.recentAccess(24) // Last 24h
    const loggedAccess = await db.audit_logs.recentAccess(24)

    if (recentAccess.length !== loggedAccess.length) {
      issues.push({
        severity: 'critical',
        framework: 'HIPAA',
        issue: 'Audit logging incomplete',
        remediation: 'Investigate audit logging gaps'
      })
    }

    return issues
  }

  async scanSOC2Compliance() {
    const issues = []

    // Check uptime
    const uptime = await getUptimePercentage(30) // Last 30 days
    if (uptime < 99.9) {
      issues.push({
        severity: 'medium',
        framework: 'SOC 2',
        issue: `Uptime ${uptime}% below target 99.9%`,
        remediation: 'Review availability controls'
      })
    }

    // Check backup recency
    const lastBackup = await getLastBackupTime()
    const hoursSinceBackup = (Date.now() - lastBackup) / 1000 / 60 / 60

    if (hoursSinceBackup > 24) {
      issues.push({
        severity: 'high',
        framework: 'SOC 2',
        issue: 'Backup overdue',
        remediation: 'Investigate backup failure'
      })
    }

    return issues
  }

  async runFullScan() {
    const results = {
      timestamp: new Date(),
      gdpr: await this.scanGDPRCompliance(),
      hipaa: await this.scanHIPAACompliance(),
      soc2: await this.scanSOC2Compliance()
    }

    // Save results
    await db.compliance_scans.create(results)

    // Alert on critical issues
    const critical = [
      ...results.gdpr.filter(i => i.severity === 'critical'),
      ...results.hipaa.filter(i => i.severity === 'critical'),
      ...results.soc2.filter(i => i.severity === 'critical')
    ]

    if (critical.length > 0) {
      await this.alertTeam(critical)
    }

    return results
  }

  async alertTeam(issues) {
    // Send to PagerDuty, Slack, email, etc.
    await sendAlert({
      title: 'Critical Compliance Issues Detected',
      issues: issues,
      urgency: 'high'
    })
  }
}

// Run daily at 2 AM
const scanner = new ComplianceScanner()
schedule.scheduleJob('0 2 * * *', () => {
  scanner.runFullScan()
})
```

### Alerting on Compliance Drift

```javascript
// Set up alerts for compliance metrics
async function configureComplianceAlerts() {
  // Alert if GDPR data export takes > 7 days
  await createAlert({
    name: 'GDPR Data Export Delay',
    condition: 'avg(data_export_duration_days) > 7',
    severity: 'high',
    message: 'Data export requests taking longer than 7 days (GDPR requires 30)',
    channels: ['email', 'slack']
  })

  // Alert if audit logging stops
  await createAlert({
    name: 'HIPAA Audit Logging Gap',
    condition: 'rate(audit_logs_created[5m]) == 0',
    severity: 'critical',
    message: 'No audit logs created in last 5 minutes',
    channels: ['pagerduty', 'slack']
  })

  // Alert if uptime drops
  await createAlert({
    name: 'SOC 2 Availability',
    condition: 'uptime_percentage < 99.9',
    severity: 'medium',
    message: 'Uptime below SOC 2 target',
    channels: ['email']
  })
}
```

## Multi-Jurisdiction Compliance

Different jurisdictions have different rules. GDPR in EU, CCPA in California, PIPEDA in Canada, LGPD in Brazil.

### Strategy Options

**Option 1: Highest Common Denominator**

Implement GDPR (strictest), get most others for free.

```javascript
// Apply GDPR standards globally
const dataPrivacyConfig = {
  global: {
    framework: 'GDPR',
    applies_to: 'all_users',
    data_export: true,
    data_deletion: true,
    consent_required: true
  }
}
```

Simpler to implement, but might be overkill for non-EU users.

**Option 2: Jurisdiction-Specific**

Apply rules based on user location.

```javascript
async function getApplicableFrameworks(userId) {
  const user = await db.users.findById(userId)
  const location = await getUserLocation(user)

  const frameworks = []

  if (location.country === 'EU' || location.state === 'EEA') {
    frameworks.push('GDPR')
  }

  if (location.country === 'US' && location.state === 'CA') {
    frameworks.push('CCPA')
  }

  if (location.country === 'CA') {
    frameworks.push('PIPEDA')
  }

  return frameworks
}

async function handleDataExportRequest(userId) {
  const frameworks = await getApplicableFrameworks(userId)

  if (frameworks.includes('GDPR')) {
    // 30-day deadline, machine-readable format
    return await exportGDPRData(userId)
  } else if (frameworks.includes('CCPA')) {
    // 45-day deadline, can charge reasonable fee
    return await exportCCPAData(userId)
  }
}
```

More complex, but respects regional differences.

## When to Hire Experts

You can prepare for compliance audits by building test suites and monitoring. You cannot certify yourself.

**Hire experts for:**
- SOC 2 Type I or Type II certification (you need a qualified auditor)
- HIPAA compliance program (legal and technical complexity)
- PCI-DSS certification (required for payment card processing)
- ISO 27001 certification
- FedRAMP authorization (government contracts)

**You can handle:**
- Basic GDPR/CCPA compliance for small user bases
- Automated compliance testing
- Security best practices (encryption, access control)
- Continuous monitoring

The automated tests and monitoring you build now become evidence for the auditor later.

## What's Next

You now have comprehensive compliance testing, automated checks in CI/CD, and continuous monitoring. This prepares you for actual audits and enterprise sales.

When you need more depth:
- **Deep Water**: SOC 2 Type II (proving controls operated effectively over time), FedRAMP, ISO 27001, multi-framework compliance programs, enterprise compliance at scale
- **Related Topics**:
  - Security Testing - Penetration testing, vulnerability scanning
  - Audit Logging - Tamper-proof logs, retention strategies
  - Incident Response - Breach notification requirements
  - Data Privacy - Encryption strategies, data minimization

The goal isn't perfect compliance on day one. The goal is building systems that maintain compliance as they evolve, catching regressions before they become violations, and having evidence ready when the auditor asks.

Start with the frameworks that matter for your users and industry. Add automated tests for critical requirements. Monitor continuously. Expand coverage over time.

Compliance isn't a checkbox. It's a continuous process that you can make testable, automated, and sustainable.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick wins
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Unit & Integration Testing](../../unit-integration-testing/mid-depth/index.md) - Related testing considerations
- [Security Testing](../../security-testing/mid-depth/index.md) - Related testing considerations
- [Accessibility Testing](../../accessibility-testing/mid-depth/index.md) - Related testing considerations

### Navigate
- [← Back to Testing Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
