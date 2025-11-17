---
title: "Dependency Review - Mid-Depth"
phase: "02-design"
topic: "dependency-review"
depth: "mid-depth"
reading_time: 25
prerequisites: ["dependency-review-surface"]
related_topics: ["architecture-design", "security-architecture", "error-handling-resilience"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-15"
---

# Dependency Review - Mid-Depth

You're past the surface-level "does this library do what I need" stage. Now you need to evaluate whether a dependency will hold up six months from now when you're handling real traffic, security updates are announced, or your original developer has moved on.

This guide covers systematic evaluation, building defensive abstractions, and making build-versus-buy decisions that account for the full cost of ownership.

## 1. Evaluate Dependency Health

A library that works perfectly today but gets abandoned next month is a liability. Here's how to assess long-term viability.

### Maintenance Signals

**Active Maintenance** (look for all three):
- Regular commits in the past 6 months (not just documentation)
- Security issues addressed within weeks, not months
- Responsive maintainers on issue tracker (check response times)

**Warning Signs**:
- Last commit over a year ago
- Dozens of open security issues
- PRs from community ignored for months
- Multiple forks labeled "maintained fork"

Check actual activity, not just stars. A repo with 50k stars but no commits in 18 months is dead.

### Community Indicators

**Healthy Community**:
- Multiple active contributors (not just one person)
- Clear contribution guidelines
- Organized issue triage (labels, milestones)
- Public roadmap or changelog

**Risk Factors**:
- Single maintainer (bus factor of 1)
- Hostile or absent maintainer responses
- No clear governance
- Commercial version pushing features away from open source

Real example: `left-pad` had millions of downloads but was 11 lines maintained by one person who could unpublish it on a whim. That's what happened in 2016, breaking thousands of builds.

### Dependency Evaluation Checklist

```markdown
## Library: [name]
**Purpose**: What specific job does this solve?
**Alternatives**: What else could do this job?

### Health Metrics
- [ ] Last commit: [date] (within 6 months?)
- [ ] Open security issues: [count] (any critical?)
- [ ] Contributors: [count] (>3 active in past year?)
- [ ] Response time to issues: [estimate]
- [ ] Breaking changes frequency: [check changelog]

### Technical Fit
- [ ] Size: [KB] (acceptable for our bundle budget?)
- [ ] Dependencies: [count] (do they pull in more risk?)
- [ ] License: [type] (compatible with our use?)
- [ ] Versioning: [semver compliant?]

### Operational Factors
- [ ] Documentation quality: [good/adequate/poor]
- [ ] Migration path if we need to leave: [easy/moderate/hard]
- [ ] Support options: [community/commercial/none]
- [ ] Our team's expertise with this: [high/medium/low]

### Decision
- [ ] Accept and use directly
- [ ] Accept but wrap in abstraction layer
- [ ] Reject - use alternative: [name]
- [ ] Reject - build ourselves
```

Use this for any dependency that will be hard to remove later. A utility library? Probably fine to skip. Your entire auth system? Walk through every line.

### Version Stability Matters

Semantic versioning (semver) promises:
- `1.2.3` → `1.2.4` (patch): Bug fixes, no breaking changes
- `1.2.3` → `1.3.0` (minor): New features, backward compatible
- `1.2.3` → `2.0.0` (major): Breaking changes expected

In practice, not everyone follows this correctly. Check the actual changelog for "minor" releases that broke things.

Pre-1.0 versions (`0.x.x`) signal "still figuring it out" - expect breaking changes. That's fine for internal tools, risky for customer-facing features.

## 2. Design Abstraction Layers

When you call a third-party API directly from your business logic, you've made every file that imports it dependent on that vendor. Abstraction layers give you room to change your mind.

### When to Abstract

**Always abstract**:
- Payment processing (Stripe, PayPal, Square)
- Email delivery (SendGrid, Mailgun, SES)
- File storage (S3, GCS, Azure Blob)
- Authentication providers (Auth0, Firebase, Okta)

**Usually abstract**:
- Database clients (if you might switch databases)
- Feature flags (LaunchDarkly, Split, custom)
- Analytics (Segment, Mixpanel, custom)

**Probably don't bother**:
- Standard library equivalents
- Language-level frameworks (React, Django)
- Utility libraries with stable APIs (lodash, date-fns)

The cost of abstraction is code to maintain. The benefit is flexibility. Abstract things that are hard to change or likely to need swapping.

### Email Service Abstraction Example

Instead of calling SendGrid directly everywhere:

```javascript
// Bad - SendGrid everywhere
import sgMail from '@sendgrid/mail';

async function sendWelcomeEmail(user) {
  await sgMail.send({
    to: user.email,
    from: 'welcome@app.com',
    subject: 'Welcome!',
    html: '<p>Thanks for signing up</p>'
  });
}

async function sendPasswordReset(user, token) {
  await sgMail.send({
    to: user.email,
    from: 'security@app.com',
    subject: 'Reset your password',
    html: `<p>Click here: ${token}</p>`
  });
}
```

Now you've got SendGrid's API shape in two places. Add fifty email types and you've got a migration nightmare.

```javascript
// Better - abstraction layer
// email-service.js
export class EmailService {
  async send({ to, from, subject, body }) {
    // Implementation detail hidden
  }

  async sendTemplate({ to, templateId, variables }) {
    // Template handling abstracted
  }
}

// adapters/sendgrid-adapter.js
import sgMail from '@sendgrid/mail';

export class SendGridAdapter {
  async send({ to, from, subject, body }) {
    return sgMail.send({
      to,
      from,
      subject,
      html: body
    });
  }

  async sendTemplate({ to, templateId, variables }) {
    return sgMail.send({
      to,
      templateId,
      dynamicTemplateData: variables
    });
  }
}

// adapters/ses-adapter.js
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export class SESAdapter {
  constructor() {
    this.client = new SESClient({ region: 'us-east-1' });
  }

  async send({ to, from, subject, body }) {
    const command = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: body } }
      },
      Source: from
    });
    return this.client.send(command);
  }
}

// config.js
import { EmailService } from './email-service.js';
import { SendGridAdapter } from './adapters/sendgrid-adapter.js';
import { SESAdapter } from './adapters/ses-adapter.js';

const adapter = process.env.EMAIL_PROVIDER === 'ses'
  ? new SESAdapter()
  : new SendGridAdapter();

export const emailService = new EmailService(adapter);

// Now your business logic stays clean
import { emailService } from './config.js';

async function sendWelcomeEmail(user) {
  await emailService.sendTemplate({
    to: user.email,
    templateId: 'welcome',
    variables: { name: user.name }
  });
}
```

Switching from SendGrid to SES is now one line in your config file. You can also run both simultaneously during migration, or use SendGrid for transactional email and SES for marketing.

### Adapter Pattern Benefits

This is the Adapter pattern. Benefits:
- **Test without external calls**: Mock the adapter, test business logic
- **Provider-agnostic code**: Business logic doesn't know about SendGrid
- **Easy comparison**: Run both providers in parallel, measure deliverability
- **Gradual migration**: Route 10% through new provider, compare results

Cost: More code to maintain. For a five-person startup sending 100 emails a day, this might be overkill. For a company sending millions with compliance requirements, it's insurance.

## 3. Plan Dependency Update Strategy

Security updates drop without warning. You need a plan that doesn't involve panic and weekend work.

### Update Categories

**Security patches** (immediate):
- Critical CVEs affecting your attack surface
- Apply within 48 hours for internet-facing services
- Test in staging, deploy quickly

**Bug fixes** (weekly):
- Patch version bumps (`1.2.3` → `1.2.4`)
- Batch these in a weekly update cycle
- Automated tests should catch regressions

**Minor updates** (monthly):
- New features, backward compatible (`1.2.x` → `1.3.0`)
- Review changelog for deprecation warnings
- Update once a month unless you need new features

**Major updates** (quarterly or as needed):
- Breaking changes (`1.x.x` → `2.0.0`)
- Plan these like feature work
- Budget time for code changes and testing

### Automated Update Tools

**Dependabot** (GitHub):
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    reviewers:
      - "backend-team"
    labels:
      - "dependencies"

    # Group minor and patch updates
    groups:
      development-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"

    # Separate security updates
    security-updates:
      dependency-type: "production"
      update-types:
        - "security"
```

This creates PRs automatically. You still need to review and merge them.

**Renovate** (more configurable):
```json
{
  "extends": ["config:base"],
  "schedule": ["before 3am on Monday"],
  "automerge": true,
  "automergeType": "pr",
  "major": {
    "automerge": false
  },
  "minor": {
    "automerge": true
  },
  "patch": {
    "automerge": true
  },
  "separateMajorMinor": true,
  "packageRules": [
    {
      "matchUpdateTypes": ["patch", "pin", "digest"],
      "groupName": "all non-major dependencies",
      "groupSlug": "all-minor-patch",
      "automerge": true
    }
  ]
}
```

Renovate can auto-merge low-risk updates if tests pass. Saves review time.

### The Update Backlog Problem

If you ignore updates for six months, you'll have 50 dependencies to update. Some will conflict. You won't know which change broke things.

**Stay current strategy**:
- Weekly bot PRs for patches
- Auto-merge patches if tests pass
- Monthly manual review of minors
- Quarterly planning for majors

Takes 30 minutes a week versus three days every quarter.

## 4. Implement Circuit Breakers

External services fail. Your timeout is 30 seconds. If 100 requests pile up waiting for a dead service, you've burned 3,000 seconds of thread time. Circuit breakers stop this.

### Circuit Breaker States

**Closed** (normal operation):
- Requests pass through to external service
- Failures counted but don't block traffic

**Open** (failure mode):
- Requests fail immediately without calling service
- Returns error or cached response
- Stays open for timeout period (e.g., 60 seconds)

**Half-Open** (testing recovery):
- Allow one request through to test service
- If succeeds, close circuit
- If fails, reopen and reset timeout

### Implementation Example

```javascript
class CircuitBreaker {
  constructor({
    failureThreshold = 5,
    resetTimeout = 60000,
    monitoringPeriod = 10000
  }) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.monitoringPeriod = monitoringPeriod;

    this.state = 'CLOSED';
    this.failures = 0;
    this.nextAttempt = Date.now();
    this.successes = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try half-open
      this.state = 'HALF_OPEN';
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
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt
    };
  }
}

// Usage with external API
const paymentCircuit = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000
});

async function processPayment(amount, token) {
  try {
    return await paymentCircuit.execute(async () => {
      return await stripeAPI.charges.create({
        amount,
        source: token
      });
    });
  } catch (error) {
    if (error.message === 'Circuit breaker is OPEN') {
      // Service is down, use fallback
      await queuePaymentForRetry({ amount, token });
      return { status: 'queued', message: 'Payment queued for processing' };
    }
    throw error;
  }
}
```

This prevents cascading failures. If Stripe is down, you fail fast and queue payments instead of timing out on every request.

### Production Circuit Breaker Libraries

Don't build this from scratch for production:

**Node.js**: `opossum`
```javascript
const CircuitBreaker = require('opossum');

const breaker = new CircuitBreaker(asyncFunction, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.on('open', () => {
  logger.error('Circuit breaker opened');
});

breaker.fire(param1, param2);
```

**Python**: `pybreaker`
```python
from pybreaker import CircuitBreaker

breaker = CircuitBreaker(
    fail_max=5,
    timeout_duration=60
)

@breaker
def call_external_service():
    return requests.get('https://api.example.com')
```

**Go**: `gobreaker`
```go
import "github.com/sony/gobreaker"

cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "ExternalAPI",
    MaxRequests: 3,
    Interval:    time.Second * 10,
    Timeout:     time.Second * 60,
})

result, err := cb.Execute(func() (interface{}, error) {
    return callExternalAPI()
})
```

## 5. Budget for Third-Party Service Costs at Scale

That free tier looks great when you're testing. Then you launch and your bill is $10,000 a month.

### Real Cost Examples

**SendGrid Pricing** (2024):
- Free: 100 emails/day
- Essentials: $19.95/month for 50k emails ($0.0004/email)
- Pro: $89.95/month for 100k emails ($0.0009/email)
- Beyond: $0.0006 - $0.00125/email depending on volume

If you send password resets, notifications, and marketing:
- 1,000 users × 3 emails/week = 12,000 emails/month (Free tier)
- 10,000 users × 3 emails/week = 120,000 emails/month ($90/month)
- 100,000 users × 3 emails/week = 1.2M emails/month ($750-$1,500/month)

**Stripe Processing**:
- 2.9% + $0.30 per transaction (standard)
- $10 purchase = $0.29 + $0.30 = $0.59 fee (5.9%)
- $100 purchase = $2.90 + $0.30 = $3.20 fee (3.2%)

That fixed $0.30 kills you on small transactions. 1,000 transactions × $10 = $10,000 revenue, $590 in fees.

**AWS S3 Storage**:
- Storage: $0.023/GB/month (first 50 TB)
- GET requests: $0.0004 per 1,000
- PUT requests: $0.005 per 1,000

User uploads 1GB of photos = $0.023/month storage. Seems cheap. But if 100,000 users each upload 1GB = $2,300/month just for storage. Add in bandwidth for serving those images and you're at $5,000+/month.

### Cost Estimation Worksheet

```markdown
## Service: [name]
**Purpose**: [what it does]
**Pricing model**: [per-transaction / per-GB / per-user / etc]

### Current Usage
- Volume: [amount]
- Current cost: $[amount]/month

### Projected Growth
- 6 months: [volume] → $[estimated cost]
- 1 year: [volume] → $[estimated cost]
- 2 years: [volume] → $[estimated cost]

### Cost Optimization Options
- [ ] Volume discounts at [threshold]
- [ ] Annual commitment saves [percentage]
- [ ] Reserved capacity available?
- [ ] Alternative pricing tier at [volume]

### Budget Triggers
- Alert at $[amount]/month (approaching limit)
- Hard limit at $[amount]/month (business constraint)
- Review if cost exceeds $[amount per user]/month

### Fallback Plan
If costs exceed budget:
- [ ] Option 1: [describe]
- [ ] Option 2: [describe]
- [ ] Option 3: [describe]
```

Run this exercise for any service that charges based on usage. Don't wait until you get a surprise $50,000 bill.

### Cost Per User Math

Calculate what each user costs you in third-party services:

```
Monthly Active Users: 50,000

Email (SendGrid): $150/month = $0.003/user
Payment processing (Stripe): $800/month = $0.016/user
File storage (S3): $500/month = $0.01/user
Error tracking (Sentry): $29/month = $0.0006/user
Analytics (Mixpanel): $899/month = $0.018/user

Total third-party cost per user: $0.0476/month

If your revenue per user is $5/month, that's 0.95% going to services.
If your revenue per user is $0.50/month (ad-supported), that's 9.5% - not sustainable.
```

Know your unit economics before you scale.

## 6. Dependency Scanning in CI/CD Pipeline

Manual security reviews don't scale. Automate scanning for known vulnerabilities.

### GitHub Actions Example

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 8 * * 1'  # Weekly on Monday

jobs:
  dependency-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: snyk.sarif

  npm-audit:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: |
          npm audit --audit-level=high
          npm audit --json > audit-report.json

      - name: Upload audit results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: npm-audit-report
          path: audit-report.json
```

This runs on every PR and weekly. Catches new CVEs before they hit production.

### GitLab CI Integration

```yaml
# .gitlab-ci.yml
include:
  - template: Security/Dependency-Scanning.gitlab-ci.yml
  - template: Security/SAST.gitlab-ci.yml

dependency_scanning:
  stage: test
  variables:
    DS_EXCLUDED_PATHS: "spec,test,tests,tmp"
  only:
    - merge_requests
    - main

gemnasium-dependency_scanning:
  allow_failure: false
  only:
    variables:
      - $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"
```

GitLab's built-in security scanning is solid. Enable it.

### Scanning Tools Comparison

**npm audit** (built-in):
- Free, already installed
- Checks npm registry's vulnerability database
- Fast but basic

**Snyk**:
- Free tier: unlimited tests, limited fixes
- Deeper analysis than npm audit
- Suggests fix PRs automatically
- Monitors licenses too

**GitHub Dependency Scanning** (Dependabot):
- Free for public repos, included in GitHub Advanced Security
- Creates PRs for vulnerable dependencies
- Integrates with GitHub's security advisories

**Trivy** (open source):
- Scans containers, dependencies, IaC
- Fast and comprehensive
- Good for CI/CD pipelines

Use at least npm audit in CI. Add Snyk or Trivy for production applications.

### Handling Vulnerability Reports

Not every CVE is critical for your use case:

```markdown
## CVE-2024-12345 in dependency-name

**Severity**: High
**CVSS Score**: 7.5
**Attack Vector**: Network

### What's Vulnerable
Remote code execution if attacker can control input to `parseUntrusted()`

### Our Usage
We only use this library for `safeFunction()` which doesn't call the vulnerable code.

### Decision
- [ ] Update immediately (we use vulnerable function)
- [x] Update in next weekly cycle (not immediately exploitable)
- [ ] Accept risk and document (vulnerability doesn't apply)
- [ ] Remove dependency (find alternative)

**Documented**: [link to issue/ticket]
**Follow-up date**: 2025-11-22
```

Don't panic-update everything. Understand the vulnerability, check if you're affected, then decide.

## 7. Vendor SLA Evaluation and Fallback Planning

Your uptime depends on vendors' uptime. Know what they promise and what happens when they fail.

### SLA Terms That Matter

**Uptime Guarantee**:
- 99.9% = 43 minutes downtime/month
- 99.95% = 22 minutes downtime/month
- 99.99% = 4 minutes downtime/month

Your SLA can't exceed your vendors'. If your payment processor guarantees 99.9% and you promise customers 99.95%, you'll breach your SLA when they have issues.

**Support Response Times**:
- Critical: 1 hour response (not resolution)
- High: 4 hours
- Normal: 24 hours
- Low: 48 hours

"Response" means "we acknowledged your ticket." Resolution might take days.

**Service Credits**:
- AWS: 10% credit if uptime < 99.95%, 30% if < 99.0%
- Stripe: No SLA on standard plan, enterprise only
- Twilio: 99.95% guarantee, pro-rated credit

Credits don't cover your lost revenue. If you lose $50,000 because a vendor was down and they give you a $200 credit, you're still out $49,800.

### Vendor Evaluation Checklist

```markdown
## Vendor: [name]
**Service**: [what they provide]
**Contract term**: [monthly/annual/3-year]

### SLA Terms
- Uptime guarantee: [percentage]
- Support response time (critical): [hours]
- Service credits: [terms]
- Planned maintenance windows: [frequency/notice period]

### Our Dependency
- Can we operate without this vendor? [yes/no]
- How long can we tolerate outage? [minutes/hours/days]
- What's our fallback if they're down? [describe]

### Financial Terms
- Current cost: $[amount]/month
- Cancellation terms: [notice required]
- Price increase terms: [how much notice]
- Enterprise support cost: $[amount] (worth it? [yes/no])

### Risk Assessment
- [ ] Single point of failure (no redundancy)
- [ ] Critical path for customer-facing features
- [ ] Data lock-in (hard to export)
- [ ] No viable alternative

### Fallback Plan
**Immediate** (< 5 min downtime):
[describe graceful degradation]

**Short-term** (< 24 hours):
[describe alternative provider or manual process]

**Long-term** (> 24 hours):
[describe migration to alternative]
```

### Multi-Vendor Strategies

**Active-Active**: Run two providers simultaneously
- Payment processing: Accept both Stripe and PayPal
- Email: Send critical emails via both SendGrid and SES
- Storage: Write to S3 and Google Cloud Storage

Cost: 2× the price, complex to manage
Benefit: Instant failover

**Active-Passive**: Keep second provider ready but idle
- Payment: Stripe active, Square credentials ready
- Database: Primary region + standby region
- DNS: Primary nameserver + secondary

Cost: Minimal (unused credits)
Benefit: Hours to failover, not days

**Graceful Degradation**: Work without the vendor
- Payment down? Accept orders, charge later
- Email down? Queue messages for retry
- Search down? Fall back to database filter

Cost: Design complexity
Benefit: Users can still accomplish tasks

Most companies use graceful degradation for non-critical services and active-passive for critical ones. Active-active is for when downtime costs more than redundancy.

## 8. Build vs Buy Decision Framework

Every dependency is a build-versus-buy decision. Sometimes building is cheaper long-term. Sometimes buying is the only sane option.

### Total Cost of Ownership

**Buying** a service:
- Monthly/annual fees
- Integration time (usually days)
- Vendor lock-in risk
- Limited customization
- Ongoing cost as you scale

**Building** it yourself:
- Developer time (weeks to months)
- Maintenance burden forever
- You own the code
- Full customization
- Fixed cost (just developer salaries)

Example: Authentication

**Buy (Auth0)**:
- $240/year for 7,000 users
- 2 days to integrate
- Handles OAuth, SSO, MFA out of the box
- Can't customize login flow much
- Costs scale with users

**Build**:
- 3 weeks developer time ($15,000 @ $100/hour)
- Another week every quarter for security updates ($5,000/year)
- You control everything
- You're also responsible for everything
- Fixed cost regardless of user count

If you have 1,000 users and no special requirements, buy Auth0. If you have 100,000 users with complex B2B SSO requirements, building might be cheaper.

### Decision Matrix

| Factor | Buy | Build |
|--------|-----|-------|
| Time to market | Days | Weeks/months |
| Initial cost | Low | High |
| Ongoing cost | Scales with usage | Fixed |
| Customization | Limited | Unlimited |
| Maintenance | Vendor's problem | Your problem |
| Expertise needed | Minimal | Domain expert |
| Security responsibility | Shared | All yours |

### When to Buy

**Always buy**:
- Payment processing (PCI compliance is too expensive to build)
- Email delivery (maintaining IP reputation is a full-time job)
- SMS/voice (telecom infrastructure requires massive scale)
- Maps (OpenStreetMap exists but Google Maps is better)

**Usually buy**:
- Authentication (unless you have complex requirements)
- Analytics (Mixpanel/Amplitude are mature)
- Error tracking (Sentry is cheap and good)
- CDN (Cloudflare/Fastly have global infrastructure)

**Consider building**:
- Business logic that's your competitive advantage
- Internal tools with specific workflows
- High-volume services where marginal costs matter
- Features that change frequently

### Decision Worksheet

```markdown
## Feature: [name]
**Purpose**: [job to be done]

### Buy Option: [vendor name]
- Cost: $[amount]/month
- Integration time: [estimate]
- Limitations: [list constraints]
- Vendor risk: [assess lock-in/stability]

### Build Option
- Developer time: [estimate]
- Annual maintenance: [estimate]
- Required expertise: [list]
- Opportunity cost: [what else could we build]

### Hybrid Option
- Use vendor for [parts]
- Build custom [parts]
- Total cost: [estimate]

### Recommendation
[Buy / Build / Hybrid] because:
1. [reason]
2. [reason]
3. [reason]

**Revisit this decision**: [date/milestone]
```

Your decision today might not be right in two years. Plan to revisit as scale changes.

## 9. Supply Chain Security (SLSA Framework, SBOM)

Your application isn't just your code. It's your code plus 500 dependencies plus their 5,000 transitive dependencies. That's your supply chain.

### SLSA Framework Basics

SLSA (Supply-chain Levels for Software Artifacts) defines four levels:

**SLSA 1**: Basic provenance
- Automated build process
- Build metadata recorded
- You can prove what source created which artifact

**SLSA 2**: Verified source
- Version control for all source code
- Authenticated build service
- Build metadata includes source commit hash

**SLSA 3**: Build integrity
- Hardened build platform
- Provenance unavailable to build
- Non-falsifiable provenance (signed)

**SLSA 4**: Complete verification
- Two-party review for all changes
- Hermetic builds (reproducible)
- Complete provenance attestation

Most teams should target SLSA 2. Level 3 and 4 are for critical infrastructure.

### Implementing SLSA 2

**GitHub Actions with attestations**:

```yaml
# .github/workflows/build.yml
name: Build and Attest

on:
  push:
    branches: [main]
  release:
    types: [created]

permissions:
  contents: read
  id-token: write
  attestations: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build artifact
        run: |
          npm ci
          npm run build
          tar -czf app-${{ github.sha }}.tar.gz dist/

      - name: Generate provenance
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: 'app-${{ github.sha }}.tar.gz'

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: build-artifact
          path: app-${{ github.sha }}.tar.gz
```

This creates signed provenance linking your build artifact to source code. Anyone can verify the artifact came from your repository.

### Software Bill of Materials (SBOM)

An SBOM is an ingredients list for your software. Lists every component and version.

**Generate SBOM with SPDX format**:

```bash
# Using syft (Anchore's tool)
syft packages dir:. -o spdx-json > sbom.spdx.json

# Using CycloneDX
cyclonedx-bom -o sbom.xml

# npm built-in (Node 16+)
npm sbom --sbom-format spdx > sbom.spdx.json
```

**Example SBOM snippet**:

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "my-app",
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-express",
      "name": "express",
      "versionInfo": "4.18.2",
      "licenseDeclared": "MIT",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:npm/express@4.18.2"
        }
      ]
    }
  ]
}
```

### Why SBOMs Matter

When Log4Shell (CVE-2021-44228) hit in December 2021, every company scrambled to answer: "Do we use Log4j anywhere?"

With SBOMs, you run:
```bash
grep -r "log4j" sbom.spdx.json
```

Without SBOMs, you search every repository, ask every team, check every Docker image, and still aren't sure.

**Automate SBOM generation**:

```yaml
# .github/workflows/sbom.yml
name: Generate SBOM

on:
  release:
    types: [published]

jobs:
  sbom:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Generate SBOM
        run: |
          npm install -g @cyclonedx/cyclonedx-npm
          cyclonedx-bom -o sbom.json

      - name: Attach SBOM to release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: sbom.json
          asset_name: sbom.json
          asset_content_type: application/json
```

Now every release includes a complete dependency list.

## 10. Dependency Sprawl Prevention

Projects start with 10 dependencies. Two years later you've got 300. Each one is a maintenance burden and security risk.

### Before Adding a Dependency

Ask these questions:

**1. Can I write this in 30 minutes?**
- Utility functions: probably yes
- OAuth integration: probably no

**2. Will this save more time than it costs?**
- One-time use: write it yourself
- Used everywhere: dependency probably worth it

**3. Does this duplicate something we already have?**
- Check existing dependencies first
- lodash and underscore do the same thing

**4. Is this maintained?**
- Last commit > 1 year ago? Warning sign
- Zero-day CVE sitting unpatched? Move on

**5. What's the bundle size?**
- moment.js: 289 KB
- date-fns: 78 KB (or 5 KB if you import just what you need)
- Choice is obvious for client-side code

### Audit Existing Dependencies

```bash
# Find unused dependencies
npx depcheck

# Analyze bundle size
npx webpack-bundle-analyzer dist/stats.json

# Check for duplicates
npm dedupe

# List all dependencies (including transitive)
npm ls --all

# Find packages with known vulnerabilities
npm audit
```

Run this quarterly. You'll find packages that snuck in and were never removed.

### Dependency Budget

Set a rule: "We maintain no more than X direct dependencies."

Example budget for a typical web app:
- Framework: 1 (React/Vue/Svelte)
- Routing: 1
- State management: 1
- API client: 1
- Date handling: 1
- Form validation: 1
- UI components: 3-5
- Dev tools: 10

Total direct dependencies: ~20

If you want to add #21, you need to remove something or make a strong case.

### Consolidation Strategies

**Use multi-tools instead of single-purpose libraries**:
- lodash covers many utility needs
- React Query handles API calls, caching, and state
- Zod does validation and type generation

**Leverage native platform features**:
```javascript
// Old way (needs moment.js)
moment().format('YYYY-MM-DD')

// Modern native way (zero dependencies)
new Date().toISOString().split('T')[0]
```

**Extract to internal package**:
If you copy-paste code across projects, make it a shared package:
```bash
my-company/
  shared-utils/
  shared-components/
  project-a/
  project-b/
```

Now one maintained package instead of duplicated code.

## Putting It All Together

Dependency management is risk management. Every external package is:
- A potential security vulnerability
- A maintenance burden
- A cost (in bundle size or service fees)
- A time saver (when chosen well)

Your job is to maximize the benefit while controlling the cost.

**Minimum viable dependency hygiene**:
1. Review new dependencies before adding them
2. Scan for vulnerabilities in CI/CD
3. Update dependencies weekly (automated)
4. Abstract critical external services
5. Know your service costs per user
6. Generate SBOMs for releases

This takes an hour a week. Skipping it means spending days on incident response when something breaks.

**Next steps**:
- Set up automated dependency scanning (today)
- Create abstraction layers for critical services (this sprint)
- Calculate cost per user for third-party services (this week)
- Define your build-vs-buy criteria (before next vendor evaluation)

The dependencies you choose today shape what you can build tomorrow. Choose carefully.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Architecture Design](../../architecture-design/mid-depth/index.md) - Related design considerations
- [Software Design Document](../../software-design-document/mid-depth/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
