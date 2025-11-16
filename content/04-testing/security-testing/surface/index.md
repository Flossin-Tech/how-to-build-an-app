---
title: "Security Testing"
phase: "04-testing"
topic: "security-testing"
depth: "surface"
reading_time: 8
prerequisites: ["unit-integration-testing"]
related_topics: ["secure-coding-practices", "threat-modeling", "compliance-validation"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Security Testing

## What This Is About

Security testing finds vulnerabilities before attackers do. You don't need to be a security expert to prevent the most common attacks - you just need to test for them.

Here's what matters: The OWASP Top 10 vulnerabilities account for the majority of breaches. Simple tests catch them. This is not optional if you have users or handle any data.

This guide focuses on the minimum security testing needed to avoid becoming a headline.

## The Problem You're Solving

Without security testing, you're shipping vulnerabilities that attackers actively exploit:

- SQL injection exposes your entire database
- Cross-site scripting steals user sessions
- Broken authorization lets users access each other's data
- Sensitive data leaks through error messages and logs
- Vulnerable dependencies give attackers a foothold

**Reality check**: Most breaches exploit basic vulnerabilities that automated tools and simple manual tests would catch. The Equifax breach? Unpatched dependency. Capital One? Misconfigured access control. These weren't sophisticated attacks - they were preventable with basic security testing.

## The Minimum You Need to Know

### The Big 5 Vulnerabilities to Test For

Focus on these before you ship anything:

#### 1. SQL Injection

**What it is**: Attacker puts SQL code into your input fields, and your database executes it.

**How to test**:
```bash
# Try these in login forms, search boxes, any text input:
username: admin' OR '1'='1
username: '; DROP TABLE users--
search: ' UNION SELECT password FROM users--
```

If any of these bypass security or cause errors, you're vulnerable.

**How to prevent**: Use parameterized queries. Never concatenate user input into SQL.

```javascript
// ❌ Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${userEmail}'`

// ✅ Safe - parameterized query
const query = 'SELECT * FROM users WHERE email = ?'
db.query(query, [userEmail])
```

#### 2. Cross-Site Scripting (XSS)

**What it is**: Attacker injects JavaScript that runs in other users' browsers.

**How to test**:
```bash
# Try these in any field that gets displayed back to users:
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<iframe src="javascript:alert('XSS')">
```

If you see an alert box, you're vulnerable.

**How to prevent**: Escape all user input before displaying it. Use a Content Security Policy header.

```javascript
// ❌ Vulnerable - renders raw HTML
<div>{userComment}</div>

// ✅ Safe - escapes HTML (React does this by default)
<div>{userComment}</div>  // React escapes automatically

// ✅ Also set CSP header
Content-Security-Policy: default-src 'self'; script-src 'self'
```

#### 3. Broken Authentication

**What it is**: Weak login systems let attackers access accounts they shouldn't.

**How to test**:
- Access a protected page without logging in
- Log in, wait 30 minutes, try to use the same session
- Log out, hit the back button - can you still see protected data?
- Change password without re-authenticating

**How to prevent**: Use proven authentication libraries. Enforce session timeouts. Require re-authentication for sensitive actions.

```javascript
// ✅ Good authentication checklist
- [ ] Passwords hashed with bcrypt/Argon2 (never stored plain text)
- [ ] Sessions expire after inactivity (30 min standard)
- [ ] Logout invalidates session completely
- [ ] Password changes require current password
- [ ] Rate limiting on login attempts
```

#### 4. Broken Authorization

**What it is**: Users can access data belonging to other users.

**How to test**:
```bash
# Log in as User A (ID: 123)
# Visit: /profile/123  (your profile - should work)

# Now try: /profile/456  (User B's profile)
# Try: /api/users/456/orders
# Try: /admin/users

# Change IDs in any URL or API request
```

If you can see other users' data, you have broken authorization.

**How to prevent**: Check authorization on every single request. Never trust client-side checks.

```javascript
// ❌ Vulnerable - only checks authentication, not authorization
app.get('/profile/:userId', isAuthenticated, (req, res) => {
  const profile = await db.getProfile(req.params.userId)
  res.json(profile)  // Any logged-in user can see any profile
})

// ✅ Safe - checks if user is authorized for this specific data
app.get('/profile/:userId', isAuthenticated, (req, res) => {
  if (req.user.id !== req.params.userId && !req.user.isAdmin) {
    return res.status(403).send('Forbidden')
  }
  const profile = await db.getProfile(req.params.userId)
  res.json(profile)
})
```

#### 5. Sensitive Data Exposure

**What it is**: Passwords, API keys, personal information visible in logs, errors, or network traffic.

**How to test**:
- Trigger an error - does the stack trace show up?
- Check browser network tab - is sensitive data unencrypted?
- Look at application logs - are passwords or tokens logged?
- View page source - are API keys in JavaScript?

**How to prevent**: Never log secrets. Encrypt sensitive data. Use HTTPS everywhere.

```javascript
// ❌ Exposes sensitive data
console.log('User login:', { email, password })  // Don't log passwords
res.status(500).json({ error: err.stack })  // Don't show stack traces

// ✅ Safe
console.log('User login attempt:', { email })  // Only log non-sensitive
res.status(500).json({ error: 'Internal server error' })  // Generic message
// Log full error server-side only
logger.error('Login error', { error: err.message, userId })
```

### Your First Security Test - 30 Minute Checklist

Run through these manual tests right now:

```bash
# Test 1: SQL Injection (5 min)
1. Find every input field (login, search, forms)
2. Enter: ' OR '1'='1
3. Enter: '; DROP TABLE users--
✓ Expected: Should be rejected or safely escaped
✗ Red flag: Bypasses security or shows SQL error

# Test 2: XSS (5 min)
1. Find fields where input is displayed back
2. Enter: <script>alert('XSS')</script>
3. Enter: <img src=x onerror=alert('XSS')>
✓ Expected: Should be escaped, no alert box
✗ Red flag: Alert box appears

# Test 3: Broken Authorization (10 min)
1. Create two user accounts
2. Log in as User A
3. Find URLs with User A's ID
4. Change ID to User B's ID
✓ Expected: Access denied
✗ Red flag: You see User B's data

# Test 4: Session Management (5 min)
1. Log in to your app
2. Wait 30 minutes (or clear session cookie)
3. Try to access protected page
✓ Expected: Redirected to login
✗ Red flag: Still have access

# Test 5: Error Messages (5 min)
1. Enter wrong password
2. Access non-existent resource (/api/users/999999)
3. Trigger a server error (invalid data)
✓ Expected: Generic error messages only
✗ Red flag: Stack traces, database names, file paths visible
```

If any of these tests fail, you have a security vulnerability that needs fixing before you ship.

### Automated Security Scanning

Manual testing is essential, but automated tools catch more:

#### OWASP ZAP - Free Vulnerability Scanner

```bash
# Install via Docker (easiest)
docker pull zaproxy/zap-stable

# Run automated scan against your app
docker run -t zaproxy/zap-stable zap-baseline.py \
  -t https://your-app.com \
  -r report.html

# Review report for:
# - Missing security headers
# - SQL injection vulnerabilities
# - XSS vulnerabilities
# - Insecure cookies
# - Directory listings
```

Run this weekly. It takes 5-15 minutes and finds issues you'll miss manually.

#### Dependency Vulnerability Scanning

Your dependencies have known vulnerabilities. Check them:

```bash
# Node.js
npm audit
npm audit fix  # Auto-fix when possible

# Python
pip install pip-audit
pip-audit

# Ruby
gem install bundler-audit
bundle-audit

# Check results
✓ 0 vulnerabilities: Ship it
⚠ Low/Medium: Review and plan fixes
🚨 High/Critical: Fix before deploying
```

Run this before every deployment. Critical vulnerabilities in dependencies are how attackers get in.

#### GitHub/GitLab Built-in Security

If you use GitHub or GitLab, enable free security scanning:

1. Go to repository Settings → Security
2. Enable:
   - **Dependency scanning** - Finds vulnerable libraries
   - **Secret scanning** - Finds leaked API keys
   - **Code scanning** - Finds security bugs in your code

All free for public repos. Worth it for private repos too.

### Security Testing in Your Workflow

#### Before Every Commit
```bash
# Quick check (30 seconds)
- [ ] No hardcoded passwords or API keys
- [ ] User inputs validated on server side
- [ ] Authorization checks on protected routes

# Use git-secrets to prevent committing secrets
git secrets --scan
```

#### Before Every Deploy
```bash
# Required tests (10 min)
- [ ] Run npm audit (or equivalent)
- [ ] Run OWASP ZAP baseline scan
- [ ] Manual test: Try accessing another user's data
- [ ] Check error pages don't leak info
- [ ] Verify HTTPS redirect works
```

#### After Deploy
```bash
# Production verification (5 min)
- [ ] Security headers present (check securityheaders.com)
- [ ] HTTPS enforced (http:// redirects to https://)
- [ ] Sessions expire after inactivity
- [ ] Error pages don't show stack traces
```

## Common Security Testing Mistakes

### Mistake 1: "We'll add security later"

Security vulnerabilities are exponentially harder to fix after launch. Adding authentication and input validation later means rewriting your entire application.

Start secure from day one. It's easier to write `db.query('SELECT * FROM users WHERE id = ?', [userId])` than to go back and fix 200 SQL queries six months later.

### Mistake 2: Only Testing Happy Path

Your tests probably look like this:

```javascript
// ❌ Only tests valid inputs
test('user can log in', async () => {
  const response = await login('user@example.com', 'validpassword')
  expect(response.status).toBe(200)
})
```

Attackers don't use valid inputs. They test unhappy paths:

```javascript
// ✅ Tests malicious inputs
test('login rejects SQL injection', async () => {
  const response = await login("' OR '1'='1", 'anything')
  expect(response.status).toBe(400)
})

test('login rejects XSS attempt', async () => {
  const response = await login('<script>alert(1)</script>', 'pwd')
  expect(response.status).toBe(400)
})

test('login rate limits after failures', async () => {
  for (let i = 0; i < 10; i++) {
    await login('user@example.com', 'wrong')
  }
  const response = await login('user@example.com', 'wrong')
  expect(response.status).toBe(429)  // Too many requests
})
```

Think like an attacker. What would you try?

### Mistake 3: Trusting Client-Side Validation

Client-side validation improves UX. It does not improve security.

```javascript
// ❌ Only validates on client
<form>
  <input type="email" required>
  <input type="number" min="0" max="100">
  <button>Submit</button>
</form>

// Attacker bypasses this by making direct API call:
fetch('/api/submit', {
  method: 'POST',
  body: JSON.stringify({
    email: '<script>alert(1)</script>',
    number: -999999
  })
})
```

Always validate on the server:

```javascript
// ✅ Validates on server (client validation is bonus)
app.post('/api/submit', (req, res) => {
  if (!isValidEmail(req.body.email)) {
    return res.status(400).send('Invalid email')
  }
  if (req.body.number < 0 || req.body.number > 100) {
    return res.status(400).send('Number out of range')
  }
  // Process valid data
})
```

### Mistake 4: Rolling Your Own Crypto

Don't write your own:
- Password hashing
- Encryption algorithms
- Random number generation
- Token generation

Use proven libraries:

```javascript
// ❌ Don't do this
const hash = md5(password)  // MD5 is broken
const token = Math.random().toString()  // Predictable

// ✅ Use proper libraries
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const hash = await bcrypt.hash(password, 10)  // Proper hashing
const token = crypto.randomBytes(32).toString('hex')  // Cryptographically secure
```

Cryptography is hard. Smart people spend careers on it. Use their work.

## Quick Win: Security Headers

Add these HTTP headers to block common attacks. Takes 5 minutes:

```javascript
// Express.js - use helmet middleware
const helmet = require('helmet')
app.use(helmet())

// What it adds:
// Content-Security-Policy: Prevents XSS
// X-Frame-Options: Prevents clickjacking
// X-Content-Type-Options: Prevents MIME sniffing
// Strict-Transport-Security: Enforces HTTPS
// Referrer-Policy: Limits referrer info leakage
```

Test your headers at [securityheaders.com](https://securityheaders.com). Aim for an A rating.

## Tools to Get Started

### Free and Open Source

**OWASP ZAP**: Automated vulnerability scanner. Run it weekly.

**Burp Suite Community**: Manual testing tool for deeper investigation.

**npm audit / pip-audit**: Dependency scanning built into package managers.

**git-secrets**: Prevents committing passwords and API keys.

**sqlmap**: Tests for SQL injection specifically.

### Built into GitHub/GitLab

**Dependabot / Dependency Scanning**: Automated dependency updates for security issues.

**Secret Scanning**: Detects leaked API keys and tokens.

**Code Scanning (CodeQL)**: Static analysis for security bugs.

All free for public repositories.

### Start With This Stack

1. **OWASP ZAP** automated baseline scan (weekly)
2. **Dependency scanning** (before every deploy)
3. **Manual checklist** from this guide (before every deploy)

This catches 80% of common vulnerabilities with minimal effort.

## Red Flags You're Vulnerable

Stop and fix these immediately:

🚨 **Critical**:
- Passwords stored in plain text or with MD5/SHA1
- SQL queries built with string concatenation
- User input rendered as HTML without escaping
- API keys or passwords in source code
- No HTTPS in production

⚠️ **High Risk**:
- No session timeouts
- Error messages show stack traces in production
- No rate limiting on authentication endpoints
- Users can access data by changing IDs in URLs
- Dependencies not updated in 6+ months

## Real-World Security Testing Example

**Scenario**: User profile page that displays user information.

**Security tests to write**:

```javascript
// Test 1: Authorization - users can only see their own profiles
test('user cannot access another users profile', async () => {
  const user1 = await createUser('user1@example.com')
  const user2 = await createUser('user2@example.com')

  const response = await request
    .get(`/profile/${user2.id}`)
    .set('Authorization', `Bearer ${user1.token}`)

  expect(response.status).toBe(403)
})

// Test 2: Authentication - unauthenticated access denied
test('unauthenticated users cannot access profiles', async () => {
  const user = await createUser('user@example.com')
  const response = await request.get(`/profile/${user.id}`)

  expect(response.status).toBe(401)
})

// Test 3: SQL injection protection
test('profile lookup is safe from SQL injection', async () => {
  const user = await createUser('user@example.com')
  const token = await login(user)

  const response = await request
    .get("/profile/123' OR '1'='1")
    .set('Authorization', `Bearer ${token}`)

  expect(response.status).toBe(400)
})

// Test 4: XSS protection
test('profile fields are escaped to prevent XSS', async () => {
  const xssPayload = '<script>alert("XSS")</script>'
  const user = await createUser('user@example.com', {
    name: xssPayload
  })

  const response = await request
    .get(`/profile/${user.id}`)
    .set('Authorization', `Bearer ${user.token}`)

  const html = response.text
  expect(html).not.toContain('<script>')
  expect(html).toContain('&lt;script&gt;')
})

// Test 5: Sensitive data not exposed
test('profile response does not include password hash', async () => {
  const user = await createUser('user@example.com')
  const token = await login(user)

  const response = await request
    .get(`/profile/${user.id}`)
    .set('Authorization', `Bearer ${token}`)

  expect(response.body).not.toHaveProperty('password')
  expect(response.body).not.toHaveProperty('passwordHash')
})
```

These five tests prevent most common vulnerabilities in a user profile feature.

## What's Next

This surface layer prevents the most common vulnerabilities - SQL injection, XSS, broken auth/authorization, and data exposure. That's enough to avoid most breaches.

When you're ready for more depth:

**Mid-Depth Security Testing** covers:
- SAST (Static Application Security Testing) integration
- DAST (Dynamic Application Security Testing) tools
- Security testing in CI/CD pipelines
- Threat modeling informed testing
- API security testing

**Deep-Water Security Testing** includes:
- Penetration testing
- Security audits and certifications
- Compliance-specific testing (HIPAA, PCI-DSS, SOC 2)
- Advanced threat scenarios
- Bug bounty programs

**Related Topics**:
- **Secure Coding Practices**: Prevention is better than testing after the fact
- **Threat Modeling**: Understand what you're testing for and why
- **Compliance Validation**: Meeting regulatory security requirements

---

Security testing isn't about being paranoid. It's about not giving attackers easy wins. Test for the common stuff, catch the obvious vulnerabilities, and you'll be ahead of most applications out there.

Start with the 30-minute checklist. Run OWASP ZAP. Fix what it finds. That's the baseline.

---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Unit & Integration Testing](../../unit-integration-testing/surface/index.md) - Related testing considerations
- [Accessibility Testing](../../accessibility-testing/surface/index.md) - Related testing considerations
- [Compliance Validation](../../compliance-validation/surface/index.md) - Related testing considerations

### Navigate
- [← Back to Testing Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
