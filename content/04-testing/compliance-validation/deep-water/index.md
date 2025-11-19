---
title: "Compliance Validation - Deep Water"
phase: "04-testing"
topic: "compliance-validation"
depth: "deep-water"
reading_time: 55
prerequisites: ["compliance-validation-mid-depth"]
related_topics: ["soc2-type-ii", "fedramp", "iso-27001", "compliance-automation", "audit-preparation"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-16"
---

# Compliance Validation - Deep Water

## Who This Is For

You're building compliance programs at enterprise scale. Basic GDPR/HIPAA testing isn't enough - you need SOC 2 Type II certification, FedRAMP authorization, or ISO 27001. Auditors expect mature, continuous compliance validation. Manual testing doesn't scale across multiple frameworks and jurisdictions.

This deep-water layer covers:
- SOC 2 Type II: Proving controls operated effectively over time (vs. point-in-time Type I)
- FedRAMP authorization: Government cloud security for federal agencies
- ISO 27001 certification: Information security management systems at scale
- Industry-specific deep dives: HIPAA technical safeguards, PCI-DSS network segmentation
- Continuous compliance monitoring architectures
- Compliance as Code: OPA, Sentinel, Cloud Custodian for automated enforcement
- Multi-region compliance strategies: Different rules, same codebase
- Third-party risk management: Vendor security assessments

If you're a startup building basic GDPR compliance, the mid-depth layer serves you better. This level is for enterprises, regulated industries, government contractors, or any organization where compliance failures mean business extinction.

## When You Need This Level

Concrete scenarios:

**The SOC 2 Type II Requirement**: Your enterprise sales pipeline stalls without SOC 2 Type II. Prospects ask for it in RFPs. Type I certification proves controls exist; Type II proves they work. You need 3-12 months of evidence showing controls operated effectively.

**FedRAMP Authorization**: You're selling cloud services to federal agencies. FedRAMP authorization is mandatory. The process takes 12-18 months, costs $500K-$2M, and requires continuous monitoring. Non-compliance means losing government business.

**Global Multi-Framework Compliance**: You operate in US (HIPAA, SOC 2), Europe (GDPR, NIS Directive), Japan (APPI), and Australia (Privacy Act). Each framework has different requirements. Manual compliance tracking across frameworks doesn't scale.

**The Compliance Audit Surprise**: Auditors arrive for annual SOC 2 review. They ask for evidence of control effectiveness. You have screenshots from last year but no systematic evidence collection. Audit fails. You lose customers. You need continuous compliance evidence generation.

**Third-Party Risk at Scale**: You integrate with 200+ vendors. Each processes customer data. Under GDPR, you're responsible for their security. Manually assessing 200 vendors annually is impossible. You need automated vendor risk management.

## SOC 2 Type II: Proving Controls Work Over Time

SOC 2 Type I proves controls exist at a point in time. Type II proves they operated effectively over 3-12 months. Type II is what customers actually want.

### Understanding SOC 2 Type II Requirements

**The Five Trust Service Criteria** (from mid-depth):
1. Security
2. Availability
3. Processing Integrity
4. Confidentiality
5. Privacy

**Type I vs Type II**:

```markdown
| Aspect | Type I | Type II |
|--------|--------|---------|
| **What It Proves** | Controls exist and are designed appropriately | Controls operated effectively over time |
| **Time Period** | Point-in-time (single day) | 3-12 months continuous |
| **Evidence Required** | Design documentation, policies | Logs, metrics, exception reports, samples |
| **Audit Effort** | 2-4 weeks | 3-6 months |
| **Cost** | $15K-$50K | $50K-$150K |
| **Customer Value** | Limited (just design) | High (proof of operation) |
```

### SOC 2 Type II Evidence Collection

**Control: MFA Required for Admin Access**

Type I: Policy document + MFA enabled
Type II: 6 months of authentication logs proving MFA was always required

```javascript
// Continuous evidence collection for MFA control
class MFAComplianceMonitor {
  async collectDailyEvidence() {
    const today = new Date().toISOString().split('T')[0]

    // 1. Get all admin user accounts
    const adminUsers = await db.users.find({ role: { $in: ['admin', 'superadmin'] } })

    // 2. Verify MFA enabled for each
    const mfaStatus = await Promise.all(
      adminUsers.map(async user => {
        const mfaEnabled = await auth.checkMFAEnabled(user.id)
        return {
          userId: user.id,
          email: user.email,
          mfaEnabled,
          checkedAt: new Date()
        }
      })
    )

    // 3. Check authentication events for the day
    const authEvents = await db.auth_logs.find({
      timestamp: {
        $gte: new Date(today),
        $lt: new Date(new Date(today).setDate(new Date(today).getDate() + 1))
      },
      userRole: { $in: ['admin', 'superadmin'] }
    })

    // 4. Verify all admin logins used MFA
    const nonMFALogins = authEvents.filter(event =>
      event.eventType === 'login_success' && !event.mfaVerified
    )

    // 5. Store evidence
    const evidence = {
      date: today,
      controlId: 'ACCESS-001',
      controlDescription: 'MFA required for admin access',
      totalAdminUsers: adminUsers.length,
      adminUsersWithMFA: mfaStatus.filter(s => s.mfaEnabled).length,
      totalAdminLogins: authEvents.filter(e => e.eventType === 'login_success').length,
      adminLoginsWithMFA: authEvents.filter(e =>
        e.eventType === 'login_success' && e.mfaVerified
      ).length,
      exceptions: nonMFALogins.map(e => ({
        userId: e.userId,
        timestamp: e.timestamp,
        ipAddress: e.ipAddress
      })),
      compliant: nonMFALogins.length === 0,
      evidence: {
        userSnapshot: mfaStatus,
        authEvents: authEvents.length,
        summary: `${mfaStatus.filter(s => s.mfaEnabled).length}/${adminUsers.length} admin users have MFA enabled. ${authEvents.filter(e => e.eventType === 'login_success' && e.mfaVerified).length}/${authEvents.filter(e => e.eventType === 'login_success').length} admin logins used MFA.`
      }
    }

    // Save to compliance database
    await db.compliance_evidence.insert(evidence)

    // Alert if non-compliant
    if (!evidence.compliant) {
      await this.alertComplianceTeam({
        severity: 'high',
        control: 'ACCESS-001',
        issue: `${nonMFALogins.length} admin login(s) without MFA`,
        exceptions: evidence.exceptions
      })
    }

    return evidence
  }

  async generateAuditReport(startDate, endDate) {
    // Auditor asks: "Show me MFA was enforced for all admin logins from Jan-Jun"

    const evidence = await db.compliance_evidence.find({
      controlId: 'ACCESS-001',
      date: { $gte: startDate, $lte: endDate }
    })

    const totalDays = evidence.length
    const compliantDays = evidence.filter(e => e.compliant).length
    const totalAdminLogins = evidence.reduce((sum, e) => sum + e.totalAdminLogins, 0)
    const mfaLogins = evidence.reduce((sum, e) => sum + e.adminLoginsWithMFA, 0)
    const exceptions = evidence.flatMap(e => e.exceptions)

    return {
      controlId: 'ACCESS-001',
      controlDescription: 'MFA required for admin access',
      period: { startDate, endDate },
      daysMonitored: totalDays,
      compliantDays,
      complianceRate: (compliantDays / totalDays * 100).toFixed(2) + '%',
      totalAdminLogins,
      mfaLogins,
      mfaRate: (mfaLogins / totalAdminLogins * 100).toFixed(2) + '%',
      exceptions: {
        count: exceptions.length,
        details: exceptions
      },
      conclusion: exceptions.length === 0
        ? 'Control operated effectively with no exceptions'
        : `Control operated with ${exceptions.length} exception(s) - see remediation`
    }
  }
}

// Schedule daily evidence collection
schedule.scheduleJob('0 1 * * *', async () => {
  const monitor = new MFAComplianceMonitor()
  await monitor.collectDailyEvidence()
})
```

### SOC 2 Type II Control Testing Strategy

**Population vs Sample Testing**:

```javascript
class SOC2SamplingStrategy {
  // Auditors won't test every control instance
  // They sample based on population size

  getSampleSize(populationSize) {
    // AICPA sampling guidance (simplified)
    if (populationSize < 25) return populationSize  // Test all
    if (populationSize < 100) return 25
    if (populationSize < 250) return 40
    return 60  // For large populations
  }

  async selectSamples(controlId, startDate, endDate) {
    // Control: Access reviews performed monthly
    const reviews = await db.access_reviews.find({
      date: { $gte: startDate, $lte: endDate }
    })

    const sampleSize = this.getSampleSize(reviews.length)

    // Stratified random sampling (sample from each month)
    const months = this.groupByMonth(reviews)
    const samplesPerMonth = Math.ceil(sampleSize / months.length)

    const samples = []
    months.forEach(month => {
      const monthSamples = this.randomSample(month.reviews, samplesPerMonth)
      samples.push(...monthSamples)
    })

    return samples.slice(0, sampleSize)
  }

  async validateControlOperation(controlId, sample) {
    // For each sample, verify control operated correctly

    const results = await Promise.all(
      sample.map(async item => {
        const validation = await this.validateItem(controlId, item)
        return {
          itemId: item.id,
          date: item.date,
          passed: validation.passed,
          evidence: validation.evidence,
          issues: validation.issues
        }
      })
    )

    const passRate = results.filter(r => r.passed).length / results.length

    return {
      controlId,
      sampleSize: sample.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      passRate: (passRate * 100).toFixed(2) + '%',
      operatingEffectively: passRate >= 0.95,  // 95% threshold common
      results
    }
  }

  async validateItem(controlId, item) {
    // Control-specific validation logic
    switch (controlId) {
      case 'ACCESS-REVIEW-001':
        return await this.validateAccessReview(item)

      case 'BACKUP-001':
        return await this.validateBackupOperation(item)

      case 'VULNERABILITY-SCAN-001':
        return await this.validateVulnerabilityScan(item)

      default:
        throw new Error(`Unknown control: ${controlId}`)
    }
  }

  async validateAccessReview(review) {
    // Verify access review was performed correctly
    const issues = []

    // 1. Was review completed on time?
    const dueDate = new Date(review.scheduledDate)
    const completedDate = new Date(review.completedDate)
    if (completedDate > dueDate) {
      issues.push(`Review completed late: ${completedDate} (due ${dueDate})`)
    }

    // 2. Was review performed by appropriate person?
    const reviewer = await db.users.findById(review.reviewerId)
    if (!reviewer.roles.includes('manager')) {
      issues.push(`Review performed by non-manager: ${reviewer.email}`)
    }

    // 3. Were findings addressed?
    if (review.findings && review.findings.length > 0) {
      const unresolvedFindings = review.findings.filter(f => !f.resolved)
      if (unresolvedFindings.length > 0) {
        issues.push(`${unresolvedFindings.length} unresolved findings`)
      }
    }

    // 4. Is there evidence of review?
    if (!review.signature || !review.completionNotes) {
      issues.push('Missing review signature or notes')
    }

    return {
      passed: issues.length === 0,
      evidence: {
        reviewId: review.id,
        scheduledDate: review.scheduledDate,
        completedDate: review.completedDate,
        reviewer: reviewer.email,
        findingsCount: review.findings?.length || 0
      },
      issues
    }
  }
}
```

### Common SOC 2 Type II Control Failures

**Failure 1: Inconsistent Control Operation**

```javascript
// Problem: Control works 95% of time, fails occasionally
// Auditor: "Control not operating effectively"

// Example: Backup verification
const backupResults = await db.backups.find({
  date: { $gte: '2024-01-01', $lte: '2024-06-30' }
})

const stats = {
  totalDays: 181,
  backupsSuccessful: 175,
  backupsFailed: 6,
  successRate: '96.7%'
}

// Even 96.7% might fail audit if failures weren't properly handled
// Auditor wants to see:
// 1. Were failures detected immediately?
// 2. Were they escalated appropriately?
// 3. Were they resolved within SLA?
// 4. Is there evidence of root cause analysis?

const failureAnalysis = backupResults
  .filter(b => b.status === 'failed')
  .map(failure => ({
    date: failure.date,
    detectedWithin: failure.alertSentAt - failure.failedAt,  // Should be < 1 hour
    escalatedWithin: failure.escalatedAt - failure.alertSentAt,  // Should be < 4 hours
    resolvedWithin: failure.resolvedAt - failure.failedAt,  // Should be < 24 hours
    rootCauseDocumented: !!failure.rootCause,
    preventiveMeasures: failure.preventiveMeasures || []
  }))

// If ANY failure wasn't detected/escalated/resolved properly, control fails
```

**Failure 2: Missing Exception Management**

```javascript
// All controls have exceptions
// Auditors want to see exceptions are:
// 1. Logged
// 2. Reviewed
// 3. Approved by appropriate authority
// 4. Time-limited
// 5. Monitored for abuse

class ExceptionManagement {
  async requestException(controlId, reason, requestedBy) {
    const exception = {
      id: generateId(),
      controlId,
      reason,
      requestedBy,
      requestedAt: new Date(),
      status: 'pending_approval',
      approvedBy: null,
      approvedAt: null,
      expiresAt: null,
      justification: reason
    }

    await db.control_exceptions.insert(exception)

    // Auto-escalate to appropriate approver
    await this.escalateForApproval(exception)

    return exception
  }

  async approveException(exceptionId, approverId, duration days) {
    const exception = await db.control_exceptions.findById(exceptionId)
    const approver = await db.users.findById(approverId)

    // Verify approver has authority
    if (!this.canApproveControl(approver, exception.controlId)) {
      throw new Error('Approver lacks authority for this control')
    }

    // Set expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    await db.control_exceptions.update(exceptionId, {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
      expiresAt,
      maxDuration: durationDays
    })

    // Log approval for audit trail
    await db.audit_log.insert({
      eventType: 'exception_approved',
      exceptionId,
      controlId: exception.controlId,
      approver: approver.email,
      duration: durationDays,
      timestamp: new Date()
    })

    return exception
  }

  async monitorExceptions() {
    // Daily check for expiring/expired exceptions
    const exceptions = await db.control_exceptions.find({
      status: 'approved',
      expiresAt: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }  // Expiring within 7 days
    })

    for (const exception of exceptions) {
      if (exception.expiresAt < new Date()) {
        // Expired - auto-revoke
        await this.revokeException(exception.id, 'Automatic expiration')
      } else {
        // Expiring soon - alert owner
        await this.alertExceptionExpiring(exception)
      }
    }
  }
}
```

**Failure 3: Inadequate Evidence**

Auditor: "Show me encryption was enabled all year"
You: "Here's the config file showing encryption is on"
Auditor: "This proves it's on today. What about March 15th?"

```javascript
// Solution: Continuous evidence snapshots

class EncryptionComplianceEvidence {
  async collectDailySnapshot() {
    const today = new Date().toISOString().split('T')[0]

    // 1. Database encryption
    const databases = await cloud.getDatabases()
    const dbEncryption = databases.map(db => ({
      name: db.name,
      encryptionEnabled: db.encryptionAtRest,
      encryptionAlgorithm: db.encryptionConfig.algorithm,
      keyManagement: db.encryptionConfig.keyManagement
    }))

    // 2. Storage bucket encryption
    const buckets = await cloud.getStorageBuckets()
    const bucketEncryption = buckets.map(bucket => ({
      name: bucket.name,
      encryptionEnabled: bucket.defaultEncryption.enabled,
      keyType: bucket.defaultEncryption.keyType
    }))

    // 3. Application-level encryption
    const appEncryption = {
      sensitiveFieldsEncrypted: await this.checkSensitiveFieldEncryption(),
      tlsVersion: await this.getMinimumTLSVersion(),
      certificateExpiry: await this.getCertificateExpiry()
    }

    // 4. Store evidence
    const evidence = {
      date: today,
      controlId: 'CRYPTO-001',
      databases: dbEncryption,
      storageBuckets: bucketEncryption,
      application: appEncryption,
      compliant: this.validateEncryptionCompliance(dbEncryption, bucketEncryption, appEncryption),
      evidenceHash: this.hashEvidence({
        databases: dbEncryption,
        buckets: bucketEncryption,
        app: appEncryption
      })
    }

    await db.compliance_evidence.insert(evidence)

    // 5. Store configuration snapshots (immutable)
    await this.storeConfigSnapshot(today, databases, buckets)

    return evidence
  }

  async storeConfigSnapshot(date, databases, buckets) {
    // Immutable storage for audit
    const snapshot = {
      date,
      databases: databases.map(db => db.getFullConfig()),
      buckets: buckets.map(b => b.getFullConfig()),
      capturedAt: new Date(),
      capturedBy: 'automated-compliance-system'
    }

    // Hash snapshot for tamper detection
    snapshot.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex')

    // Store in write-once storage (e.g., S3 with object lock)
    await immutableStorage.put(
      `compliance/snapshots/${date}/encryption.json`,
      JSON.stringify(snapshot),
      { objectLock: true, retentionYears: 7 }
    )
  }
}
```

## FedRAMP: Government Cloud Security

FedRAMP (Federal Risk and Authorization Management Program) authorizes cloud services for federal agencies. It's comprehensive, expensive, and mandatory for government cloud business.

### FedRAMP Impact Levels

```markdown
# FedRAMP Impact Levels

## Low Impact (LI-SaaS)
- **Data Type**: Public information
- **Impact if Compromised**: Limited
- **Controls**: 125 baseline controls
- **Cost**: $150K-$500K
- **Timeline**: 3-6 months
- **Example**: Public-facing collaboration tools

## Moderate Impact (Most common)
- **Data Type**: Sensitive but not classified (CUI - Controlled Unclassified Information)
- **Impact if Compromised**: Serious
- **Controls**: 325 baseline controls
- **Cost**: $500K-$1.5M
- **Timeline**: 6-12 months
- **Example**: HR systems, email, case management

## High Impact
- **Data Type**: Highly sensitive, law enforcement, emergency services
- **Impact if Compromised**: Severe/catastrophic
- **Controls**: 421 baseline controls
- **Cost**: $2M-$5M
- **Timeline**: 12-18 months
- **Example**: Law enforcement databases, emergency response systems

Note: Most commercial cloud services target Moderate
```

### FedRAMP Authorization Process

```markdown
# FedRAMP Authorization Paths

## Path 1: Agency Authorization
1. Partner with sponsoring agency
2. Agency conducts security assessment
3. Agency authorizes use
4. FedRAMP PMO reviews
5. Listed in FedRAMP Marketplace

**Pros**: Faster if you have agency sponsor
**Cons**: Single agency use initially

## Path 2: JAB Provisional Authorization (Joint Authorization Board)
1. Complete security package
2. Submit to FedRAMP PMO
3. 3PAO (Third-Party Assessment Organization) conducts assessment
4. JAB reviews (DHS, DoD, GSA)
5. Provisional Authorization granted
6. Any agency can use

**Pros**: Broadly usable immediately
**Cons**: Longer process, more scrutiny

## Path 3: CSP Supplied (Rare)
1. Company self-assesses
2. Submit package
3. Agencies can review and authorize individually

**Pros**: Cheapest
**Cons**: Each agency re-evaluates, no FedRAMP badge
```

### FedRAMP Continuous Monitoring

FedRAMP requires continuous monitoring, not annual audits:

```javascript
// FedRAMP Continuous Monitoring Requirements

class FedRAMPContinuousMonitoring {
  async monthlyDeliverables() {
    // Required monthly submissions to FedRAMP PMO

    return {
      // 1. Inventory updates (within 5 days of month end)
      inventory: await this.generateInventoryWorkbook(),

      // 2. Vulnerability scans (monthly OS, quarterly database/web)
      vulnerabilityScans: await this.runVulnerabilityScans(),

      // 3. POA&M (Plan of Action & Milestones) updates
      poam: await this.updatePOAM(),

      // 4. Change requests
      changeRequests: await this.getChangeRequests(),

      // 5. Incident reports
      incidents: await this.getSecurityIncidents(),

      // Submission deadline: 30 days after month end
      submissionDeadline: this.getSubmissionDeadline()
    }
  }

  async generateInventoryWorkbook() {
    // FedRAMP Integrated Inventory Workbook
    // Every system component must be catalogued

    const components = await cloud.getAllComponents()

    return {
      hardware: components
        .filter(c => c.type === 'hardware')
        .map(c => ({
          assetId: c.id,
          assetType: c.hardwareType,
          manufacturer: c.manufacturer,
          model: c.model,
          serialNumber: c.serialNumber,
          location: c.physicalLocation || c.cloudRegion,
          function: c.function,
          ipAddress: c.ipAddress,
          macAddress: c.macAddress,
          owner: c.owner,
          custodian: c.custodian,
          fipsValidated: c.fipsValidated || false,
          netStatus: c.networkStatus  // Internal/External/DMZ
        })),

      software: components
        .filter(c => c.type === 'software')
        .map(c => ({
          assetId: c.id,
          softwareName: c.name,
          version: c.version,
          vendor: c.vendor,
          licenseType: c.license,
          function: c.function,
          installedOn: c.hostIds,
          patchLevel: c.patchLevel,
          lastUpdated: c.lastPatchDate,
          vulnerabilities: c.knownVulnerabilities || []
        })),

      network: await this.getNetworkDevices(),

      data: await this.getDataInventory()
    }
  }

  async runVulnerabilityScans() {
    // FedRAMP requires specific scanning schedules

    const scans = {
      // Monthly OS scans (all servers)
      operating_systems: await this.scanOS(),

      // Quarterly database scans
      databases: this.isQuarterEnd() ? await this.scanDatabases() : null,

      // Quarterly web application scans
      web_applications: this.isQuarterEnd() ? await this.scanWebApps() : null
    }

    // All scans must use FedRAMP-approved scanning tools
    // Validate scanner is approved
    await this.validateScannerApproved(scans)

    // Risk categorization required
    await this.categorizeVulnerabilities(scans)

    return scans
  }

  async categorizeVulnerabilities(scans) {
    // FedRAMP risk ratings: Very High, High, Moderate, Low

    const allVulnerabilities = [
      ...scans.operating_systems.vulnerabilities,
      ...(scans.databases?.vulnerabilities || []),
      ...(scans.web_applications?.vulnerabilities || [])
    ]

    const categorized = allVulnerabilities.map(vuln => {
      // FedRAMP uses CVSS + additional factors
      const cvssScore = vuln.cvssScore

      let fedrampRisk
      if (cvssScore >= 9.0) {
        fedrampRisk = 'Very High'
      } else if (cvssScore >= 7.0) {
        fedrampRisk = 'High'
      } else if (cvssScore >= 4.0) {
        fedrampRisk = 'Moderate'
      } else {
        fedrampRisk = 'Low'
      }

      return {
        ...vuln,
        fedrampRisk,
        remediationDeadline: this.getRemediationDeadline(fedrampRisk)
      }
    })

    return categorized
  }

  getRemediationDeadline(risk) {
    // FedRAMP required remediation timeframes
    const discovered = new Date()

    switch (risk) {
      case 'Very High':
        return new Date(discovered.setDate(discovered.getDate() + 15))  // 15 days

      case 'High':
        return new Date(discovered.setDate(discovered.getDate() + 30))  // 30 days

      case 'Moderate':
        return new Date(discovered.setDate(discovered.getDate() + 90))  // 90 days

      case 'Low':
        return new Date(discovered.setMonth(discovered.getMonth() + 6))  // 180 days

      default:
        throw new Error(`Unknown risk level: ${risk}`)
    }
  }

  async updatePOAM() {
    // Plan of Action & Milestones
    // Tracks all open vulnerabilities and control weaknesses

    const openVulnerabilities = await db.vulnerabilities.find({ status: 'open' })
    const controlWeaknesses = await db.control_gaps.find({ status: 'open' })

    const poamItems = [
      ...openVulnerabilities.map(v => ({
        itemType: 'vulnerability',
        id: v.id,
        description: v.description,
        risk: v.fedrampRisk,
        discoveredDate: v.discoveredAt,
        scheduledCompletion: v.remediationDeadline,
        milestones: v.remediationPlan.milestones,
        resources: v.assignedTo,
        status: v.status,
        comments: v.comments
      })),

      ...controlWeaknesses.map(cw => ({
        itemType: 'control_weakness',
        id: cw.id,
        description: cw.description,
        affectedControl: cw.controlId,
        risk: cw.risk,
        discoveredDate: cw.discoveredAt,
        scheduledCompletion: cw.targetRemediationDate,
        milestones: cw.remediationPlan.milestones,
        resources: cw.assignedTo,
        status: cw.status,
        comments: cw.comments
      }))
    ]

    // Sort by risk and deadline
    poamItems.sort((a, b) => {
      const riskOrder = { 'Very High': 4, 'High': 3, 'Moderate': 2, 'Low': 1 }
      return riskOrder[b.risk] - riskOrder[a.risk]
    })

    return {
      reportDate: new Date(),
      totalItems: poamItems.length,
      byRisk: {
        veryHigh: poamItems.filter(i => i.risk === 'Very High').length,
        high: poamItems.filter(i => i.risk === 'High').length,
        moderate: poamItems.filter(i => i.risk === 'Moderate').length,
        low: poamItems.filter(i => i.risk === 'Low').length
      },
      items: poamItems
    }
  }

  async handleSecurityIncident(incident) {
    // FedRAMP requires incident notification within timeframes

    const severity = this.assessIncidentSeverity(incident)

    // Notification requirements
    const notifications = {
      'Critical': {
        notify: ['fedramp-pmo@gsa.gov', 'agency-isso@agency.gov'],
        within: '1 hour',
        followUp: 'Daily until resolved'
      },
      'High': {
        notify: ['agency-isso@agency.gov'],
        within: '4 hours',
        followUp: 'Every 2 days'
      },
      'Moderate': {
        notify: ['agency-isso@agency.gov'],
        within: '24 hours',
        followUp: 'Weekly'
      },
      'Low': {
        notify: ['agency-isso@agency.gov'],
        within: '5 days',
        followUp: 'Monthly'
      }
    }

    const requirement = notifications[severity]

    // Send notifications
    await this.sendIncidentNotifications(incident, requirement.notify)

    // Schedule follow-ups
    await this.scheduleFollowUps(incident, requirement.followUp)

    return {
      incidentId: incident.id,
      severity,
      notificationsSent: requirement.notify,
      deadline: this.calculateDeadline(requirement.within)
    }
  }
}
```

### FedRAMP vs SOC 2 Comparison

```markdown
| Aspect | FedRAMP | SOC 2 |
|--------|---------|-------|
| **Focus** | Government security requirements | Customer trust (security, availability, etc.) |
| **Authority** | Mandatory for federal agencies | Voluntary market standard |
| **Controls** | NIST 800-53 (325+ controls) | AICPA TSC (varies by criteria) |
| **Assessment** | 3PAO (government-approved auditors) | CPA firms |
| **Timeline** | 6-18 months | 3-6 months (Type II) |
| **Cost** | $500K-$2M | $50K-$150K |
| **Ongoing** | Continuous monitoring, monthly reports | Annual re-audit |
| **Scope** | Entire infrastructure | Can be scoped to specific systems |
| **Accessibility** | Public authorization (marketplace listing) | Private report to customers |
| **Rigor** | Very high (government security) | High (market-driven) |
```

## ISO 27001: Information Security Management System

ISO 27001 certifies your information security management system (ISMS), not just technical controls. It's process-heavy and global.

### ISO 27001 Certification Process

```markdown
# ISO 27001 Certification Stages

## Stage 0: Pre-Audit Readiness (3-6 months)
- [ ] Define ISMS scope
- [ ] Conduct risk assessment
- [ ] Create Statement of Applicability (SoA)
- [ ] Develop security policies and procedures
- [ ] Implement controls
- [ ] Internal audit
- [ ] Management review

## Stage 1: Documentation Audit (1-2 days)
Auditor reviews:
- [ ] Information Security Policy
- [ ] Risk Assessment & Treatment Plan
- [ ] Statement of Applicability
- [ ] All mandatory procedures (10 required)
- [ ] Evidence of ISMS operation

Outcome: Findings report, issues to address before Stage 2

## Stage 2: Main Audit (3-5 days)
Auditor assesses:
- [ ] Control effectiveness (sample-based)
- [ ] Risk treatment adequacy
- [ ] ISMS process maturity
- [ ] Employee awareness and compliance
- [ ] Incident management
- [ ] Business continuity

Outcome:
- **Certification** (if no major non-conformities)
- **Conditional** (minor issues, must fix within 90 days)
- **Fail** (major issues, re-audit required)

## Stage 3: Surveillance Audits (Annual)
- Year 1: Partial re-audit
- Year 2: Partial re-audit
- Year 3: Full re-certification audit

## Certification Valid: 3 years
Re-certification every 3 years
```

### ISO 27001 Risk Assessment

Core of ISO 27001 is systematic risk assessment:

```javascript
class ISO27001RiskAssessment {
  async conductRiskAssessment() {
    // ISO 27001 Annex A has 114 controls across 14 domains
    // But you select which apply based on risk assessment

    // Step 1: Identify assets
    const assets = await this.identifyInformationAssets()

    // Step 2: Identify threats
    const threats = await this.identifyThreats()

    // Step 3: Identify vulnerabilities
    const vulnerabilities = await this.identifyVulnerabilities()

    // Step 4: Assess risk
    const risks = []
    for (const asset of assets) {
      for (const threat of threats) {
        for (const vulnerability of vulnerabilities) {
          if (this.threatExploitsVulnerability(threat, vulnerability, asset)) {
            const risk = await this.calculateRisk(asset, threat, vulnerability)
            risks.push(risk)
          }
        }
      }
    }

    // Step 5: Risk treatment decisions
    const treatedRisks = await this.applyRiskTreatment(risks)

    // Step 6: Generate Statement of Applicability
    const soa = await this.generateStatementOfApplicability(treatedRisks)

    return {
      assets,
      risks,
      treatedRisks,
      soa,
      residualRisk: this.calculateResidualRisk(treatedRisks)
    }
  }

  async identifyInformationAssets() {
    // What information do you process?
    return [
      {
        id: 'ASSET-001',
        name: 'Customer Database',
        type: 'Data',
        classification: 'Confidential',
        owner: 'CTO',
        custodian: 'Database Administrator',
        location: 'AWS RDS us-east-1',
        value: {
          confidentiality: 'High',  // If disclosed: major damage
          integrity: 'High',         // If modified: major damage
          availability: 'High'       // If unavailable: major damage
        }
      },
      {
        id: 'ASSET-002',
        name: 'Application Source Code',
        type: 'Data',
        classification: 'Confidential',
        owner: 'CTO',
        custodian: 'Engineering Lead',
        location: 'GitHub',
        value: {
          confidentiality: 'High',
          integrity: 'Critical',  // Integrity more important than confidentiality
          availability: 'Medium'
        }
      },
      {
        id: 'ASSET-003',
        name: 'API Servers',
        type: 'System',
        classification: 'Internal',
        owner: 'Infrastructure Lead',
        custodian: 'DevOps Team',
        location: 'AWS EC2 us-east-1',
        value: {
          confidentiality: 'Medium',
          integrity: 'High',
          availability: 'Critical'  // Service uptime essential
        }
      }
      // ... more assets
    ]
  }

  async identifyThreats() {
    // ISO 27005 threat catalog
    return [
      {
        id: 'THREAT-001',
        name: 'Unauthorized access to database',
        category: 'Human - Malicious',
        likelihood: 'Medium',  // Based on industry data
        source: 'External attacker'
      },
      {
        id: 'THREAT-002',
        name: 'Accidental data deletion',
        category: 'Human - Accidental',
        likelihood: 'Medium',
        source: 'Internal employee'
      },
      {
        id: 'THREAT-003',
        name: 'Hardware failure',
        category: 'Environmental',
        likelihood: 'Low',
        source: 'Equipment wear/damage'
      },
      {
        id: 'THREAT-004',
        name: 'DDoS attack',
        category: 'Human - Malicious',
        likelihood: 'High',
        source: 'External attacker'
      }
      // ... more threats
    ]
  }

  async calculateRisk(asset, threat, vulnerability) {
    // Risk = Likelihood × Impact

    // Likelihood scoring (1-5)
    const likelihoodScores = {
      'Very Low': 1,
      'Low': 2,
      'Medium': 3,
      'High': 4,
      'Very High': 5
    }

    // Impact scoring (1-5)
    const impactScores = {
      'Negligible': 1,
      'Minor': 2,
      'Moderate': 3,
      'Major': 4,
      'Severe': 5
    }

    // Determine impact based on asset value and threat
    const impact = this.assessImpact(asset, threat)
    const likelihood = this.assessLikelihood(threat, vulnerability)

    const riskScore = likelihoodScores[likelihood] * impactScores[impact]

    // Risk levels: 1-5: Low, 6-12: Medium, 13-20: High, 21-25: Critical
    let riskLevel
    if (riskScore <= 5) riskLevel = 'Low'
    else if (riskScore <= 12) riskLevel = 'Medium'
    else if (riskScore <= 20) riskLevel = 'High'
    else riskLevel = 'Critical'

    return {
      id: `RISK-${asset.id}-${threat.id}`,
      asset: asset.name,
      assetId: asset.id,
      threat: threat.name,
      threatId: threat.id,
      vulnerability: vulnerability.name,
      vulnerabilityId: vulnerability.id,
      likelihood,
      impact,
      riskScore,
      riskLevel,
      existingControls: await this.getExistingControls(asset, threat),
      residualRisk: null  // After treatment
    }
  }

  async applyRiskTreatment(risks) {
    // ISO 27001 requires risk treatment decision for each risk
    // Four options: Avoid, Reduce, Transfer, Accept

    return risks.map(risk => {
      let treatment

      if (risk.riskLevel === 'Critical' || risk.riskLevel === 'High') {
        // Must reduce or avoid
        treatment = {
          decision: 'Reduce',
          controls: this.selectControls(risk),
          implementation: 'Immediate',
          residualRisk: this.calculateResidualRisk(risk, 'Reduce')
        }
      } else if (risk.riskLevel === 'Medium') {
        // Reduce or transfer
        if (risk.asset.classification === 'Confidential') {
          treatment = {
            decision: 'Reduce',
            controls: this.selectControls(risk),
            implementation: 'Within 6 months',
            residualRisk: this.calculateResidualRisk(risk, 'Reduce')
          }
        } else {
          treatment = {
            decision: 'Transfer',
            mechanism: 'Cyber insurance',
            implementation: 'Annual renewal',
            residualRisk: risk.riskLevel  // Same level, but transferred
          }
        }
      } else {
        // Can accept
        treatment = {
          decision: 'Accept',
          justification: 'Risk level acceptable given business context',
          approvedBy: 'CISO',
          approvedDate: new Date(),
          residualRisk: risk.riskLevel
        }
      }

      return {
        ...risk,
        treatment
      }
    })
  }

  selectControls(risk) {
    // Map risks to ISO 27001 Annex A controls
    const controlMappings = {
      'Unauthorized access to database': [
        'A.9.1.1 - Access control policy',
        'A.9.2.1 - User registration',
        'A.9.2.2 - Privileged access rights management',
        'A.9.2.3 - User access rights management',
        'A.9.4.1 - Information access restriction',
        'A.10.1.1 - Cryptographic controls policy',
        'A.18.1.3 - Protection of records'
      ],
      'DDoS attack': [
        'A.17.1.1 - Availability of information processing facilities',
        'A.17.2.1 - Availability of information processing facilities',
        'A.13.1.1 - Network controls',
        'A.13.1.2 - Security of network services'
      ]
      // ... more mappings
    }

    return controlMappings[risk.threat] || []
  }

  async generateStatementOfApplicability(treatedRisks) {
    // Statement of Applicability (SoA)
    // For each of 114 Annex A controls, state if applicable and why

    const allControls = this.getAnnexAControls()  // All 114 controls

    const soa = allControls.map(control => {
      // Is this control needed based on risk assessment?
      const risks = treatedRisks.filter(risk =>
        risk.treatment.controls?.includes(control.id)
      )

      if (risks.length > 0) {
        return {
          controlId: control.id,
          controlName: control.name,
          applicable: true,
          justification: `Required to mitigate: ${risks.map(r => r.id).join(', ')}`,
          implementationStatus: 'Implemented',
          responsibility: control.owner
        }
      } else {
        return {
          controlId: control.id,
          controlName: control.name,
          applicable: false,
          justification: 'Not applicable based on risk assessment',
          implementationStatus: 'N/A',
          responsibility: null
        }
      }
    })

    return soa
  }
}
```

### ISO 27001 Mandatory Procedures

ISO 27001 requires these documented procedures:

```javascript
const mandatoryISO27001Procedures = [
  {
    clause: '4.3',
    name: 'Determining the scope of ISMS',
    required: 'Document defining ISMS boundaries'
  },
  {
    clause: '5.3',
    name: 'Organizational roles and responsibilities',
    required: 'Document assigning information security responsibilities'
  },
  {
    clause: '6.1.2',
    name: 'Information security risk assessment',
    required: 'Documented risk assessment process and results'
  },
  {
    clause: '6.1.3',
    name: 'Information security risk treatment',
    required: 'Risk treatment plan and decisions'
  },
  {
    clause: '6.2',
    name: 'Information security objectives',
    required: 'Documented security objectives and plans'
  },
  {
    clause: '7.2',
    name: 'Competence',
    required: 'Evidence of security training and competence'
  },
  {
    clause: '8.1',
    name: 'Operational planning and control',
    required: 'Operational security processes documented'
  },
  {
    clause: '9.1',
    name: 'Monitoring and measurement',
    required: 'Process for monitoring security controls'
  },
  {
    clause: '9.2',
    name: 'Internal audit',
    required: 'Internal audit program and results'
  },
  {
    clause: '9.3',
    name: 'Management review',
    required: 'Regular management review of ISMS'
  },
  {
    clause: '10.1',
    name: 'Nonconformity and corrective action',
    required: 'Process for handling security gaps and fixes'
  }
]

// Testing procedure existence
describe('ISO 27001 Mandatory Procedures', () => {
  test('all mandatory procedures exist and are current', async () => {
    for (const proc of mandatoryISO27001Procedures) {
      const document = await db.isms_documents.findOne({
        clause: proc.clause,
        type: 'procedure'
      })

      expect(document).toBeDefined()
      expect(document.name).toContain(proc.name)

      // Document must be current (reviewed within 12 months)
      const lastReview = new Date(document.lastReviewed)
      const monthsOld = (Date.now() - lastReview) / (1000 * 60 * 60 * 24 * 30)
      expect(monthsOld).toBeLessThan(12)

      // Must be approved
      expect(document.approvedBy).toBeDefined()
      expect(document.approvedDate).toBeDefined()
    }
  })
})
```

## Compliance as Code

Manual compliance checks don't scale. Codify policies for automated enforcement.

### Open Policy Agent (OPA)

```rego
# Policy: Kubernetes pods must not run as root

package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Pod"
  input.request.operation == "CREATE"

  # Check if any container runs as root
  container := input.request.object.spec.containers[_]
  not container.securityContext.runAsNonRoot

  msg := sprintf("Container %v must run as non-root user", [container.name])
}

# Policy: S3 buckets must have encryption enabled

package aws.s3

deny[msg] {
  resource := input.resource
  resource.type == "aws_s3_bucket"

  not resource.server_side_encryption_configuration

  msg := sprintf("S3 bucket %v must have server-side encryption enabled", [resource.name])
}

# Policy: Database connections must use TLS

package database.connections

deny[msg] {
  connection := input.connection
  connection.protocol == "postgresql"
  connection.ssl_mode != "require"

  msg := sprintf("Database connection to %v must require TLS", [connection.host])
}
```

Enforcing OPA policies:

```javascript
// OPA policy enforcement in CI/CD
const { exec } = require('child_process')

async function enforceOPAPolicies() {
  // Check Terraform plans against policies
  const terraformPlan = await getTerraformPlan()

  const result = await runOPA({
    policy: 'policies/aws/',
    input: terraformPlan,
    format: 'json'
  })

  if (result.violations.length > 0) {
    console.error('Policy violations found:')
    result.violations.forEach(v => {
      console.error(`  - ${v.message}`)
    })
    process.exit(1)
  }

  console.log('All policies passed')
}

function runOPA({ policy, input, format }) {
  return new Promise((resolve, reject) => {
    const opa = exec(`opa eval --data ${policy} --input ${input} --format ${format} 'data.terraform.deny'`)

    let stdout = ''
    let stderr = ''

    opa.stdout.on('data', data => stdout += data)
    opa.stderr.on('data', data => stderr += data)

    opa.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr))
      } else {
        const result = JSON.parse(stdout)
        resolve({
          violations: result.result || []
        })
      }
    })
  })
}
```

### Cloud Custodian (AWS Policy Enforcement)

```yaml
# cloud-custodian-policies.yml

policies:
  # Ensure all EC2 instances are tagged
  - name: ec2-require-tags
    resource: ec2
    description: All EC2 instances must have required tags
    filters:
      - or:
          - "tag:Environment": absent
          - "tag:Owner": absent
          - "tag:CostCenter": absent
    actions:
      - type: notify
        to: ["security@company.com"]
        subject: "EC2 instance missing required tags"
      - type: stop  # Stop instances after 7 days if still untagged
        days: 7

  # Ensure S3 buckets have encryption
  - name: s3-enforce-encryption
    resource: s3
    description: S3 buckets must have default encryption enabled
    filters:
      - type: bucket-encryption
        state: false
    actions:
      - type: set-bucket-encryption
        enabled: true
        crypto: AES256

  # Remove unused security groups
  - name: security-group-unused
    resource: security-group
    description: Delete security groups not attached to any resource after 30 days
    filters:
      - type: unused
        days: 30
    actions:
      - delete

  # Ensure RDS instances have backups
  - name: rds-require-backups
    resource: rds
    description: RDS instances must have automated backups with 7+ day retention
    filters:
      - type: value
        key: BackupRetentionPeriod
        value: 7
        op: less-than
    actions:
      - type: modify-db
        BackupRetentionPeriod: 7
      - type: notify
        to: ["dba@company.com"]
        subject: "RDS backup retention increased to 7 days"
```

Running Cloud Custodian:

```bash
# Dry run (what would happen)
custodian run --dryrun cloud-custodian-policies.yml -s output/

# Actual enforcement
custodian run cloud-custodian-policies.yml -s output/

# Schedule periodic runs
0 */6 * * * custodian run /path/to/policies.yml -s /path/to/output/
```

## Multi-Region Compliance

Operating globally means navigating different privacy and security regulations per region.

### Compliance Matrix by Region

```javascript
class MultiRegionComplianceManager {
  getApplicableRegulations(userRegion, dataType) {
    const regulations = {
      'EU': {
        privacy: ['GDPR', 'ePrivacy Directive'],
        security: ['NIS Directive', 'NIS2 (from 2024)'],
        sector: dataType === 'health' ? ['Medical Device Regulation'] : []
      },
      'US': {
        privacy: ['CCPA', 'CPRA (California)', 'VCDPA (Virginia)', 'CPA (Colorado)'],
        health: dataType === 'health' ? ['HIPAA'] : [],
        finance: dataType === 'financial' ? ['GLBA', 'SOX'] : [],
        children: ['COPPA']
      },
      'UK': {
        privacy: ['UK GDPR', 'Data Protection Act 2018'],
        security: []
      },
      'Canada': {
        privacy: ['PIPEDA', 'Quebec Law 25'],
        health: dataType === 'health' ? ['PHIPA (Ontario)', 'PHIA (Manitoba)'] : []
      },
      'China': {
        privacy: ['PIPL (Personal Information Protection Law)'],
        security: ['Cybersecurity Law', 'Data Security Law'],
        dataLocalization: true  // Data must be stored in China
      },
      'Australia': {
        privacy: ['Privacy Act 1988'],
        security: []
      },
      'Japan': {
        privacy: ['APPI (Act on Protection of Personal Information)'],
        security: []
      },
      'Brazil': {
        privacy: ['LGPD (Lei Geral de Proteção de Dados)'],
        security: []
      }
    }

    return regulations[userRegion] || { privacy: [], security: [], sector: [] }
  }

  async enforceDataResidency(userId, userRegion) {
    // Some regulations require data stored in-region

    const residencyRequirements = {
      'China': {
        required: true,
        reason: 'Cybersecurity Law requires data localization',
        allowedRegions: ['cn-north-1', 'cn-northwest-1']
      },
      'Russia': {
        required: true,
        reason: 'Federal Law 152-FZ requires Russian citizen data stored in Russia',
        allowedRegions: ['ru-central-1']
      },
      'EU': {
        required: false,  // GDPR doesn't mandate EU storage
        but: 'International transfers require adequacy decision or safeguards (SCCs)',
        allowedRegions: 'any'
      }
    }

    const requirement = residencyRequirements[userRegion]

    if (requirement?.required) {
      const user = await db.users.findById(userId)
      const userDataRegion = this.getDatabaseRegion(user)

      if (!requirement.allowedRegions.includes(userDataRegion)) {
        throw new Error(
          `User from ${userRegion} must have data in ${requirement.allowedRegions}, ` +
          `currently in ${userDataRegion}. Reason: ${requirement.reason}`
        )
      }
    }
  }

  async handleCrossBorderTransfer(data, fromRegion, toRegion) {
    // GDPR and other laws regulate cross-border data transfers

    if (fromRegion === 'EU' && !this.isAdequateRegion(toRegion)) {
      // Must use Standard Contractual Clauses or other safeguards

      const transferMechanism = await this.getTransferMechanism(fromRegion, toRegion)

      if (!transferMechanism) {
        throw new Error(
          `Cannot transfer data from ${fromRegion} to ${toRegion} ` +
          `without adequate safeguards (e.g., Standard Contractual Clauses)`
        )
      }

      // Log transfer for accountability
      await db.data_transfers.insert({
        data: data.id,
        fromRegion,
        toRegion,
        mechanism: transferMechanism,
        timestamp: new Date(),
        legalBasis: transferMechanism.legalBasis
      })
    }
  }

  isAdequateRegion(region) {
    // EU Commission adequacy decisions
    const adequateRegions = [
      'UK',  // Post-Brexit adequacy decision
      'Switzerland',
      'Canada',  // Commercial organizations under PIPEDA
      'Japan',
      'South Korea',
      'New Zealand',
      'Argentina',
      'Uruguay',
      'Israel'
    ]

    return adequateRegions.includes(region)
  }
}
```

## Third-Party Risk Management

You're responsible for your vendors' security. At scale, manual vendor assessments don't work.

### Vendor Security Assessment Workflow

```javascript
class VendorSecurityAssessment {
  async assessNewVendor(vendor) {
    // Tiered assessment based on vendor risk

    const riskTier = this.determineRiskTier(vendor)

    let assessment
    switch (riskTier) {
      case 'Critical':
        // Vendors with access to production data, critical systems
        assessment = await this.criticalVendorAssessment(vendor)
        break

      case 'High':
        // Vendors with limited data access or important functions
        assessment = await this.highRiskVendorAssessment(vendor)
        break

      case 'Medium':
        // Vendors with no data access, non-critical functions
        assessment = await this.mediumRiskVendorAssessment(vendor)
        break

      case 'Low':
        // Off-the-shelf software, no integration
        assessment = await this.lowRiskVendorAssessment(vendor)
        break
    }

    return {
      vendor: vendor.name,
      riskTier,
      assessment,
      approvalRequired: this.requiresApproval(riskTier, assessment),
      nextReviewDate: this.getNextReviewDate(riskTier)
    }
  }

  determineRiskTier(vendor) {
    // Risk based on data access and criticality

    let score = 0

    // Data access
    if (vendor.accessesPII) score += 3
    if (vendor.accessesPHI) score += 4
    if (vendor.accessesPaymentData) score += 5

    // System criticality
    if (vendor.criticalityTier === 'tier-1') score += 3  // Production outage if down
    if (vendor.criticalityTier === 'tier-2') score += 2  // Degraded service
    if (vendor.criticalityTier === 'tier-3') score += 1  // Nice-to-have

    // Integration level
    if (vendor.apiIntegration) score += 2
    if (vendor.databaseAccess) score += 4

    if (score >= 10) return 'Critical'
    if (score >= 7) return 'High'
    if (score >= 4) return 'Medium'
    return 'Low'
  }

  async criticalVendorAssessment(vendor) {
    // Comprehensive assessment for critical vendors

    return {
      // 1. Security questionnaire (detailed)
      questionnaire: await this.sendQuestionnaire(vendor, 'critical'),

      // 2. Request certifications
      certifications: await this.requestCertifications(vendor, [
        'SOC 2 Type II',
        'ISO 27001',
        'Industry-specific (HIPAA BAA, PCI-DSS, etc.)'
      ]),

      // 3. Penetration test results
      pentestResults: await this.requestPentestResults(vendor),

      // 4. On-site audit (for highest risk)
      onsiteAudit: vendor.dataAccessLevel === 'full-production'
        ? await this.scheduleOnsiteAudit(vendor)
        : null,

      // 5. Legal review
      legalReview: await this.requestLegalReview(vendor, [
        'MSA (Master Service Agreement)',
        'DPA (Data Processing Agreement)',
        'SLA (Service Level Agreement)'
      ]),

      // 6. Technical review
      technicalReview: await this.conductTechnicalReview(vendor),

      // 7. Continuous monitoring
      monitoring: await this.setupVendorMonitoring(vendor)
    }
  }

  async highRiskVendorAssessment(vendor) {
    return {
      questionnaire: await this.sendQuestionnaire(vendor, 'standard'),
      certifications: await this.requestCertifications(vendor, ['SOC 2 Type II']),
      legalReview: await this.requestLegalReview(vendor, ['DPA', 'SLA']),
      technicalReview: await this.conductTechnicalReview(vendor)
    }
  }

  async mediumRiskVendorAssessment(vendor) {
    return {
      questionnaire: await this.sendQuestionnaire(vendor, 'light'),
      certifications: await this.requestCertifications(vendor, ['SOC 2 or ISO 27001']),
      legalReview: await this.requestLegalReview(vendor, ['MSA'])
    }
  }

  async lowRiskVendorAssessment(vendor) {
    return {
      questionnaire: await this.sendQuestionnaire(vendor, 'basic'),
      certifications: 'Not required',
      legalReview: 'Standard terms acceptance'
    }
  }

  async setupVendorMonitoring(vendor) {
    // Continuous monitoring of vendor security posture

    return {
      // Monitor for breaches
      breachMonitoring: await this.enableBreachMonitoring(vendor),

      // Monitor certifications
      certificationExpiry: await this.trackCertificationExpiry(vendor),

      // Monitor for security incidents
      incidentTracking: await this.enableIncidentTracking(vendor),

      // Quarterly security reviews
      quarterlyReviews: await this.scheduleQuarterlyReviews(vendor)
    }
  }

  getNextReviewDate(riskTier) {
    const now = new Date()

    switch (riskTier) {
      case 'Critical':
        return new Date(now.setMonth(now.getMonth() + 6))  // Every 6 months

      case 'High':
        return new Date(now.setFullYear(now.getFullYear() + 1))  // Annually

      case 'Medium':
        return new Date(now.setFullYear(now.getFullYear() + 2))  // Every 2 years

      case 'Low':
        return new Date(now.setFullYear(now.getFullYear() + 3))  // Every 3 years
    }
  }
}
```

## What You've Mastered

You can now:

**Enterprise Compliance Programs**:
- SOC 2 Type II certification with continuous evidence collection
- FedRAMP authorization for government cloud services
- ISO 27001 ISMS implementation and certification
- Multi-framework compliance across jurisdictions

**Advanced Compliance Techniques**:
- Compliance as Code with OPA, Sentinel, Cloud Custodian
- Automated policy enforcement in CI/CD
- Continuous monitoring and evidence generation
- Multi-region compliance strategies

**Vendor and Supply Chain Management**:
- Risk-based vendor security assessments
- Third-party continuous monitoring
- Vendor certification tracking
- Supply chain risk management

## Related Deep-Water Topics

**Within Phase 04-Testing**:
- [Unit & Integration Testing - Deep Water](../../unit-integration-testing/deep-water/): Contract testing, mutation testing, property-based testing
- [Security Testing - Deep Water](../../security-testing/deep-water/): Penetration testing, red team exercises, bug bounty programs
- [Accessibility Testing - Deep Water](../../accessibility-testing/deep-water/): WCAG AAA, cognitive accessibility, assistive technology

**Future Topics** (not yet available):
- Privacy Engineering: Building privacy into systems from the start
- Cloud Security Posture Management: Continuous cloud security monitoring
- Zero Trust Architecture: Implementing comprehensive zero-trust models
- Regulatory Change Management: Adapting to evolving compliance requirements

---

Compliance at this level isn't about passing audits. It's about building systems that maintain compliance continuously, across frameworks and jurisdictions, at scale.

The techniques here are for organizations where compliance is existential - regulated industries, government contractors, global enterprises where compliance failures end the business.

If you're just starting compliance work, the surface and mid-depth layers serve you better. But when compliance is continuous, multi-framework, and critical to survival, these patterns provide the rigor needed.
