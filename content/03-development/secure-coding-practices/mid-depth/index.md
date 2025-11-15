---
title: "Secure Coding Practices: OWASP Top 10 and Defensive Programming"
phase: "03-development"
topic: "secure-coding-practices"
depth: "mid-depth"
reading_time: 25
prerequisites: []
related_topics: ["secret-management", "code-review-process", "supply-chain-security", "threat-modeling"]
personas: ["generalist-leveling-up", "specialist-expanding", "busy-developer"]
updated: "2025-11-15"
---

# Secure Coding Practices: OWASP Top 10 and Defensive Programming

Secure coding isn't a checklist - it's a mindset. Defense in depth means assuming every layer can fail and building redundancy. This guide covers the OWASP Top 10 vulnerabilities with practical code examples and patterns for defensive programming.

## Introduction: Defense in Depth

The castle had a moat, walls, gates, guards, and a keep. If attackers breached one layer, others remained. Software security works the same way.

**Defense in depth means:**
- Input validation at UI **and** API **and** database
- Authentication at gateway **and** service **and** data layer
- Encryption in transit **and** at rest **and** in backups

When one control fails (and eventually something will), others catch the attack.

This isn't paranoia. It's acknowledging that complexity creates gaps. The Equifax breach happened because one server missed a patch. One. A defense-in-depth approach would have limited the damage.

## OWASP Top 10: The Foundation

The Open Web Application Security Project (OWASP) publishes the Top 10 most critical web application security risks. These represent consensus from security professionals worldwide about what actually causes breaches.

Learn these. Defend against these. Everything else is specialty work.

### 1. Broken Access Control

**The vulnerability:** Users can access data or functions they shouldn't. Think: viewing someone else's account by changing a URL parameter.

**Common patterns:**
- Insecure Direct Object References (IDOR): `/api/invoice/12345` returns any invoice if you guess the ID
- Missing function-level access control: Admin API endpoints don't check if user is actually admin
- Privilege escalation: Regular user manipulates request to grant themselves admin rights

**Vulnerable code:**

```python
# ❌ No authorization check - anyone can view any order
@app.route('/api/orders/<order_id>')
def get_order(order_id):
    order = Order.query.get(order_id)
    return jsonify(order.to_dict())
```

**Secure code:**

```python
# ✅ Verify user owns the order or is admin
@app.route('/api/orders/<order_id>')
@login_required
def get_order(order_id):
    order = Order.query.get_or_404(order_id)

    # Authorization check
    if order.user_id != current_user.id and not current_user.is_admin:
        abort(403, "You don't have permission to view this order")

    return jsonify(order.to_dict())
```

**Defense principles:**
- **Deny by default**: Start from "no access" and explicitly grant permissions
- **Least privilege**: Users get minimum permissions needed for their job
- **Check on every request**: Don't cache authorization decisions - verify each time
- **Centralize authorization logic**: One place to check, easier to audit

**Implementation pattern:**

```javascript
// Reusable authorization middleware
function requireOwnership(resourceType) {
    return async (req, res, next) => {
        const resource = await db[resourceType].findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (resource.userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.resource = resource;
        next();
    };
}

// Use it
app.get('/api/documents/:id',
    authenticate,
    requireOwnership('Document'),
    (req, res) => {
        res.json(req.resource);
    }
);
```

### 2. Cryptographic Failures

**The vulnerability:** Sensitive data exposed due to weak or missing encryption. Passwords stored in plain text. Credit cards transmitted over HTTP. Backup files unencrypted.

**What needs protection:**
- Passwords (hashed, never encrypted)
- Personally Identifiable Information (PII)
- Financial data (credit cards, bank accounts)
- Health records
- Session tokens
- API keys and secrets

**Vulnerable code:**

```java
// ❌ Plain text password storage
public void createUser(String username, String password) {
    String sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    jdbcTemplate.update(sql, username, password);
}

// ❌ Weak hashing
String hash = DigestUtils.md5Hex(password);
// MD5 is broken - rainbow tables can crack it instantly
```

**Secure code:**

```java
// ✅ Proper password hashing with bcrypt
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public void createUser(String username, String password) {
    BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12); // cost factor
    String hashedPassword = encoder.encode(password);

    String sql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
    jdbcTemplate.update(sql, username, hashedPassword);
}

// ✅ Verification
public boolean verifyPassword(String username, String password) {
    String storedHash = getUserPasswordHash(username);
    return encoder.matches(password, storedHash);
}
```

**Encryption in transit:**

```javascript
// ❌ Sending sensitive data over HTTP
fetch('http://api.example.com/payment', {
    method: 'POST',
    body: JSON.stringify({ cardNumber: '4111...' })
});

// ✅ HTTPS enforced
// In Express.js - redirect HTTP to HTTPS
app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
        next();
    }
});

// Use HSTS header to force HTTPS
app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload');
    next();
});
```

**Key management:**

```python
# ❌ Hardcoded encryption key
from cryptography.fernet import Fernet

KEY = b'hardcoded-key-in-source-code'  # Leaked when code is shared
cipher = Fernet(KEY)

# ✅ Key from environment, rotatable
import os
from cryptography.fernet import Fernet

def get_cipher():
    key = os.environ.get('ENCRYPTION_KEY')
    if not key:
        raise ValueError("ENCRYPTION_KEY environment variable not set")
    return Fernet(key.encode())

cipher = get_cipher()
encrypted = cipher.encrypt(sensitive_data.encode())
```

**Defense principles:**
- **Use TLS everywhere**: Not just login pages - entire application
- **Hash passwords, don't encrypt**: Use bcrypt, Argon2, or scrypt with proper cost factors
- **Encrypt sensitive data at rest**: Database fields, file storage, backups
- **Proper key management**: Environment variables, secrets management services (AWS Secrets Manager, HashiCorp Vault)
- **Don't roll your own crypto**: Use established libraries

### 3. Injection

**The vulnerability:** Attacker sends malicious data that gets executed as code or commands. SQL injection, command injection, LDAP injection, NoSQL injection.

SQL injection is still pervasive because developers still concatenate strings to build queries.

**SQL Injection - Vulnerable:**

```php
// ❌ Classic SQL injection vulnerability
$user_id = $_GET['id'];
$query = "SELECT * FROM users WHERE id = " . $user_id;
$result = mysqli_query($conn, $query);

// Attacker sends: id=1 OR 1=1
// Query: SELECT * FROM users WHERE id = 1 OR 1=1
// Returns all users

// Attacker sends: id=1; DROP TABLE users; --
// Executes: SELECT * FROM users WHERE id = 1; DROP TABLE users; --
// Deletes the table
```

**SQL Injection - Secure:**

```php
// ✅ Parameterized query (prepared statement)
$user_id = $_GET['id'];
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);  // "i" = integer type
$stmt->execute();
$result = $stmt->get_result();

// Parameters are escaped automatically
// Attacker's input becomes literal value, not executed
```

**ORM usage (additional safety):**

```python
# ✅ Django ORM - parameterized automatically
user_id = request.GET.get('id')
user = User.objects.get(id=user_id)

# Even if user_id is malicious, ORM escapes it
# Never interpolate into raw SQL:

# ❌ Still vulnerable even with ORM
User.objects.raw(f"SELECT * FROM users WHERE id = {user_id}")

# ✅ Use ORM parameters
User.objects.raw("SELECT * FROM users WHERE id = %s", [user_id])
```

**NoSQL Injection:**

```javascript
// ❌ MongoDB injection vulnerability
const username = req.body.username;
const password = req.body.password;

db.collection('users').findOne({
    username: username,
    password: password
});

// Attacker sends: { "username": "admin", "password": { "$ne": null } }
// Query: { username: "admin", password: { $ne: null } }
// Matches if password is not null - bypasses authentication
```

```javascript
// ✅ Validate input types
const username = req.body.username;
const password = req.body.password;

// Ensure strings, reject objects
if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
}

const user = await db.collection('users').findOne({
    username: username,
    password: hashPassword(password)
});
```

**OS Command Injection:**

```python
# ❌ Command injection vulnerability
import os
filename = request.args.get('file')
os.system(f'cat {filename}')

# Attacker sends: file=log.txt; rm -rf /
# Executes: cat log.txt; rm -rf /
# Deletes everything (if permissions allow)
```

```python
# ✅ Avoid shell entirely - use safe APIs
import subprocess
filename = request.args.get('file')

# Validate filename
import re
if not re.match(r'^[a-zA-Z0-9_.-]+$', filename):
    raise ValueError("Invalid filename")

# Use list form - no shell interpretation
result = subprocess.run(['cat', filename], capture_output=True, text=True)
```

**Defense principles:**
- **Parameterized queries always**: Never concatenate user input into SQL
- **ORMs help but aren't magic**: Raw SQL methods can still be vulnerable
- **Validate input types**: Especially for NoSQL databases
- **Avoid system shells**: Use language APIs instead of shell commands
- **Allowlist validation**: Only accept known-good patterns for filenames, commands

### 4. Insecure Design

**The vulnerability:** Fundamental security flaws in architecture and design, not implementation bugs. No amount of secure coding fixes a flawed design.

**Examples:**
- Password reset that only requires email address (no verification)
- No rate limiting on expensive operations (resource exhaustion)
- Insufficient workflow validation (skip payment step in checkout)
- Missing security requirements entirely

This is where threat modeling (from the Design phase) becomes code.

**Vulnerable design - Password reset:**

```javascript
// ❌ Insecure password reset flow
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
        // Sends new password in email - bad!
        const newPassword = generateRandomPassword();
        user.password = hashPassword(newPassword);
        await user.save();

        sendEmail(email, `Your new password is: ${newPassword}`);
    }

    res.json({ message: 'If email exists, password sent' });
});

// Problems:
// 1. Password sent in email (insecure channel)
// 2. No verification that requester owns email
// 3. No rate limiting (can spam resets)
```

**Secure design - Password reset:**

```javascript
// ✅ Secure password reset flow
const crypto = require('crypto');

app.post('/forgot-password', rateLimit({ max: 3, windowMs: 3600000 }), async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
        // Generate secure token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = hashToken(resetToken);

        user.resetToken = resetTokenHash;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send link, not password
        const resetUrl = `https://app.example.com/reset/${resetToken}`;
        sendEmail(email, `Reset password: ${resetUrl}`);
    }

    // Same message whether user exists or not (prevent enumeration)
    res.json({ message: 'If email exists, reset link sent' });
});

app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    const tokenHash = hashToken(token);

    const user = await User.findOne({
        resetToken: tokenHash,
        resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Validate password strength
    if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ error: 'Password too weak' });
    }

    user.password = hashPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
});
```

**Workflow validation:**

```python
# ❌ Insecure checkout - can skip payment
@app.route('/checkout/shipping', methods=['POST'])
def set_shipping():
    cart_id = session.get('cart_id')
    shipping_address = request.json.get('address')
    Cart.update(cart_id, shipping=shipping_address, step='payment')
    return jsonify({'next': '/checkout/payment'})

@app.route('/checkout/confirm', methods=['POST'])
def confirm_order():
    cart_id = session.get('cart_id')
    # ❌ Doesn't verify payment happened!
    Order.create_from_cart(cart_id)
    return jsonify({'success': True})
```

```python
# ✅ Secure checkout - enforces workflow
@app.route('/checkout/confirm', methods=['POST'])
def confirm_order():
    cart_id = session.get('cart_id')
    cart = Cart.get(cart_id)

    # Verify all steps completed
    if not cart.shipping_address:
        return jsonify({'error': 'Missing shipping address'}), 400

    if not cart.payment_confirmed:
        return jsonify({'error': 'Payment not confirmed'}), 400

    # Server-side payment verification
    payment = Payment.get(cart.payment_id)
    if payment.status != 'completed' or payment.amount != cart.total:
        return jsonify({'error': 'Payment verification failed'}), 400

    order = Order.create_from_cart(cart)
    return jsonify({'order_id': order.id, 'success': True})
```

**Defense principles:**
- **Security requirements upfront**: Define security in design phase
- **Threat model your workflows**: What could an attacker skip or manipulate?
- **Rate limiting on sensitive operations**: Login, registration, password reset, expensive queries
- **Server-side validation of workflow state**: Never trust client to follow the process

### 5. Security Misconfiguration

**The vulnerability:** Insecure default configurations, incomplete setups, verbose error messages, unnecessary features enabled.

**Common misconfigurations:**
- Default credentials still active
- Directory listing enabled
- Unnecessary services running
- Verbose error messages in production
- Missing security headers
- Debug mode enabled in production

**Vulnerable configuration:**

```javascript
// ❌ Debug mode in production
const app = express();
app.set('env', 'development'); // Verbose errors, stack traces exposed

app.get('/api/data', (req, res) => {
    try {
        const data = db.query('SELECT * FROM secret_data');
        res.json(data);
    } catch (error) {
        // Exposes database schema, credentials, paths
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            query: error.sql
        });
    }
});
```

**Secure configuration:**

```javascript
// ✅ Production configuration
const app = express();
app.set('env', 'production');

// Centralized error handler
app.use((err, req, res, next) => {
    // Log detailed error server-side
    logger.error('Application error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        user: req.user?.id
    });

    // Send generic message to client
    res.status(500).json({
        error: 'An error occurred. Please try again.'
    });
});

// Security headers
const helmet = require('helmet');
app.use(helmet());

// Disable unnecessary features
app.disable('x-powered-by');
```

**Security headers configuration:**

```python
# Flask example with comprehensive security headers
from flask import Flask
from flask_talisman import Talisman

app = Flask(__name__)

# Force HTTPS
Talisman(app,
    force_https=True,
    strict_transport_security=True,
    strict_transport_security_max_age=31536000,
    content_security_policy={
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline'",
        'style-src': "'self' 'unsafe-inline'"
    },
    content_security_policy_nonce_in=['script-src']
)

@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response
```

**Defense principles:**
- **Secure by default**: Change default passwords, disable unnecessary features
- **Principle of least privilege**: Only enable what's needed
- **Environment-specific configuration**: Different settings for dev/staging/production
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Regular audits**: Configuration drift happens - check periodically

### 6. Vulnerable and Outdated Components

**The vulnerability:** Using libraries with known vulnerabilities. The Equifax breach happened because one server didn't patch Apache Struts.

**The problem:**
- Applications use hundreds of dependencies
- Dependencies have dependencies (transitive dependencies)
- Vulnerabilities discovered constantly
- Updating can break things, so teams delay

**Detection:**

```bash
# npm (Node.js)
npm audit
npm audit fix  # Automatic fixes for non-breaking updates

# Python
pip-audit  # or
safety check

# Java
mvn dependency-check:check

# Ruby
bundle audit

# Go
go list -json -m all | nancy sleuth
```

**Automated scanning in CI/CD:**

```yaml
# GitHub Actions example
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Run dependency audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
```

**Update strategy:**

```javascript
// package.json - version ranges
{
  "dependencies": {
    "express": "^4.18.0",  // ^ allows minor and patch updates
    "jsonwebtoken": "~9.0.0"  // ~ allows patch updates only
  },
  "devDependencies": {
    "jest": "*"  // ❌ Avoid * - no version control
  }
}

// Better: Use exact versions for critical security libraries
{
  "dependencies": {
    "express": "4.18.2",
    "jsonwebtoken": "9.0.2"
  }
}
```

**Dependabot configuration:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
```

**Defense principles:**
- **Automated scanning**: Run on every commit, not manually
- **Regular updates**: Weekly or monthly cadence, not "when we have time"
- **Review changelogs**: Understand what changed before updating
- **Test after updates**: Automated tests catch breaking changes
- **Monitor advisories**: Subscribe to security mailing lists for your stack

### 7. Identification and Authentication Failures

**The vulnerability:** Broken authentication allows attackers to compromise passwords, keys, or session tokens to assume other users' identities.

**Common failures:**
- Weak password requirements
- No account lockout after failed attempts
- Session tokens in URLs
- Predictable session IDs
- No multi-factor authentication option
- Credentials in source code

**Vulnerable authentication:**

```python
# ❌ Weak authentication implementation
@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    user = User.query.filter_by(username=username).first()

    # ❌ Timing attack - reveals if user exists
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    # ❌ Weak password check (plain text comparison)
    if user.password != password:
        return jsonify({'error': 'Invalid credentials'}), 401

    # ❌ Predictable session token
    session_token = f"{user.id}_{datetime.now().timestamp()}"

    return jsonify({'token': session_token})
```

**Secure authentication:**

```python
from werkzeug.security import check_password_hash
import secrets
import time

# Rate limiting decorator
login_attempts = {}

def rate_limit_login(username):
    """Prevent brute force attacks"""
    now = time.time()
    attempts = login_attempts.get(username, [])

    # Remove attempts older than 15 minutes
    attempts = [t for t in attempts if now - t < 900]

    if len(attempts) >= 5:
        return False

    attempts.append(now)
    login_attempts[username] = attempts
    return True

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    # ✅ Consistent timing to prevent user enumeration
    user = User.query.filter_by(username=username).first()

    if not user:
        # Hash anyway to maintain consistent timing
        check_password_hash('dummy', password)
        return jsonify({'error': 'Invalid credentials'}), 401

    # ✅ Rate limiting
    if not rate_limit_login(username):
        return jsonify({'error': 'Too many login attempts. Try again later.'}), 429

    # ✅ Secure password verification
    if not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    # ✅ Cryptographically secure session token
    session_token = secrets.token_urlsafe(32)

    # Store session with expiration
    Session.create(
        user_id=user.id,
        token_hash=hash_token(session_token),
        expires_at=datetime.now() + timedelta(hours=24)
    )

    return jsonify({'token': session_token})
```

**Password strength enforcement:**

```javascript
const passwordStrength = require('check-password-strength');

function validatePassword(password) {
    // Minimum requirements
    if (password.length < 12) {
        return { valid: false, error: 'Password must be at least 12 characters' };
    }

    // Use library to check strength
    const strength = passwordStrength.passwordStrength(password);

    if (strength.value === 'Weak' || strength.value === 'Medium') {
        return {
            valid: false,
            error: 'Password too weak. Include uppercase, lowercase, numbers, and symbols.'
        };
    }

    // Check against common passwords
    if (isCommonPassword(password)) {
        return { valid: false, error: 'This password is too common. Choose something unique.' };
    }

    return { valid: true };
}
```

**Session management:**

```javascript
// ✅ Secure session configuration
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    name: 'sessionId',  // Don't use default name
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,      // HTTPS only
        httpOnly: true,    // Not accessible via JavaScript
        maxAge: 3600000,   // 1 hour
        sameSite: 'strict' // CSRF protection
    }
}));
```

**Multi-factor authentication:**

```python
import pyotp
import qrcode

def enable_mfa(user):
    """Generate TOTP secret for user"""
    secret = pyotp.random_base32()
    user.mfa_secret = encrypt(secret)  # Encrypt before storing
    user.save()

    # Generate QR code for authenticator app
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email,
        issuer_name='YourApp'
    )

    qr = qrcode.make(totp_uri)
    return qr, secret

def verify_mfa(user, token):
    """Verify TOTP token"""
    secret = decrypt(user.mfa_secret)
    totp = pyotp.TOTP(secret)

    # Verify with window for clock skew
    return totp.verify(token, valid_window=1)

@app.route('/login', methods=['POST'])
def login():
    # ... username/password verification ...

    if user.mfa_enabled:
        # Require MFA token
        mfa_token = request.form.get('mfa_token')
        if not verify_mfa(user, mfa_token):
            return jsonify({'error': 'Invalid MFA token'}), 401

    # Create session
    # ...
```

**Defense principles:**
- **Strong password requirements**: Length matters more than complexity
- **Rate limiting**: Prevent brute force attacks
- **Account lockout**: Temporary lockout after failed attempts
- **Secure session tokens**: Cryptographically random, sufficient entropy
- **MFA option**: Especially for privileged accounts
- **Constant-time comparisons**: Prevent timing attacks

### 8. Software and Data Integrity Failures

**The vulnerability:** Code and infrastructure that doesn't verify integrity. Insecure CI/CD pipelines, auto-updates without verification, unsigned code, insecure deserialization.

**Examples:**
- Accepting serialized objects from untrusted sources
- No verification of plugin/module authenticity
- Compromised CI/CD pipeline injecting malicious code
- No integrity checking of downloaded dependencies

**Insecure deserialization:**

```python
# ❌ Dangerous - pickle can execute arbitrary code
import pickle

def load_user_settings(settings_data):
    # If attacker controls settings_data, they can execute code
    settings = pickle.loads(settings_data)
    return settings

# Attacker sends:
# pickle.dumps(os.system('rm -rf /'))
```

```python
# ✅ Safe - use JSON for untrusted data
import json

def load_user_settings(settings_data):
    try:
        settings = json.loads(settings_data)
        # Validate structure
        if not isinstance(settings, dict):
            raise ValueError("Settings must be a dictionary")
        return settings
    except json.JSONDecodeError:
        raise ValueError("Invalid settings format")
```

**CI/CD pipeline security:**

```yaml
# ✅ Secure GitHub Actions workflow
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # For OIDC

    steps:
      - uses: actions/checkout@v3

      # Verify commit signature
      - name: Verify commit signature
        run: |
          git verify-commit HEAD || exit 1

      # Pin dependencies by hash, not just version
      - name: Install dependencies
        run: npm ci  # Uses package-lock.json for reproducible builds

      # Verify dependency integrity
      - name: Verify checksums
        run: npm audit signatures

      # SAST scanning
      - name: Run security scan
        uses: github/codeql-action/analyze@v2

      # Build
      - name: Build
        run: npm run build

      # Sign artifacts
      - name: Sign build artifacts
        run: |
          cosign sign-blob --key cosign.key build/app.js > build/app.js.sig

      # Deploy with OIDC (no long-lived credentials)
      - name: Deploy to AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActions
          aws-region: us-east-1
```

**Dependency integrity:**

```json
// package-lock.json includes integrity hashes
{
  "dependencies": {
    "express": {
      "version": "4.18.2",
      "resolved": "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
      "integrity": "sha512-5/PsL6iGPdfQ/lKM1UuielYgv3BUoJfz1aUwU9vHZ+J7gyvwdQXFEBIEIaxeGf0GIcreATNyBExtalisDbuMqQ=="
    }
  }
}
```

**Defense principles:**
- **Never deserialize untrusted data**: Use JSON, not pickle/marshal/serialize for external input
- **Verify dependencies**: Check hashes, use lock files
- **Signed commits**: Verify who made changes
- **Signed artifacts**: Verify build outputs haven't been tampered with
- **Secure CI/CD**: Least privilege, audit logs, approval gates for production

### 9. Security Logging and Monitoring Failures

**The vulnerability:** Insufficient logging makes breaches undetectable. The average time to detect a breach is 200+ days. Can't respond to what you can't see.

**What to log:**
- Authentication events (login, logout, failed attempts)
- Authorization failures (access denied)
- Input validation failures
- Application errors and exceptions
- Security-relevant configuration changes
- Use of privileged functions

**What NOT to log:**
- Passwords or password hashes
- Session tokens
- Credit card numbers or PII
- Encryption keys

**Inadequate logging:**

```javascript
// ❌ No security logging
app.post('/api/admin/delete-user', async (req, res) => {
    const userId = req.body.userId;
    await User.delete(userId);
    res.json({ success: true });
});

// When breach happens: Who deleted the user? When? From where?
// No way to know.
```

**Comprehensive logging:**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'security.log' }),
        new winston.transports.Console()
    ]
});

app.post('/api/admin/delete-user', requireAdmin, async (req, res) => {
    const userId = req.body.userId;
    const targetUser = await User.findById(userId);

    // Security event logging
    logger.info('User deletion attempt', {
        event: 'user_deletion',
        actor: {
            id: req.user.id,
            username: req.user.username,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        },
        target: {
            id: targetUser.id,
            username: targetUser.username
        },
        timestamp: new Date().toISOString(),
        successful: true
    });

    await User.delete(userId);
    res.json({ success: true });
});

// Failed authentication logging
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findByUsername(username);

    if (!user || !await verifyPassword(user, password)) {
        logger.warn('Failed login attempt', {
            event: 'login_failure',
            username: username,  // OK to log username
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });

        return res.status(401).json({ error: 'Invalid credentials' });
    }

    logger.info('Successful login', {
        event: 'login_success',
        userId: user.id,
        username: user.username,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Create session...
});
```

**Monitoring and alerting:**

```python
# Alert on suspicious patterns
from datetime import datetime, timedelta

def check_for_anomalies():
    """Run periodically to detect attacks"""

    # Multiple failed logins from same IP
    recent_failures = LoginAttempt.filter(
        success=False,
        timestamp__gte=datetime.now() - timedelta(minutes=10)
    ).group_by('ip_address')

    for ip, attempts in recent_failures:
        if len(attempts) > 10:
            send_alert(f"Possible brute force from {ip}: {len(attempts)} failed logins")

    # Privilege escalation attempts
    escalation_attempts = SecurityLog.filter(
        event='authorization_failure',
        requested_resource__contains='admin',
        timestamp__gte=datetime.now() - timedelta(hours=1)
    )

    if escalation_attempts.count() > 5:
        send_alert(f"Multiple privilege escalation attempts detected")

    # Unusual access patterns
    late_night_admin = SecurityLog.filter(
        event='admin_action',
        timestamp__hour__gte=23  # After 11 PM
    )

    for log in late_night_admin:
        send_alert(f"Admin action outside business hours: {log.actor} performed {log.action}")
```

**Defense principles:**
- **Log security events**: Authentication, authorization, config changes
- **Include context**: Who, what, when, where (user ID, action, timestamp, IP)
- **Protect logs**: Write-only access, tamper-proof storage
- **Centralize logs**: SIEM or log aggregation (Splunk, ELK stack, Datadog)
- **Alert on anomalies**: Automated detection of suspicious patterns
- **Regular review**: Someone actually looks at the logs

### 10. Server-Side Request Forgery (SSRF)

**The vulnerability:** Application fetches a remote resource without validating the user-supplied URL. Attacker can make server request internal resources, cloud metadata endpoints, or scan internal network.

**Common targets:**
- Cloud metadata APIs (AWS: `http://169.254.169.254/latest/meta-data/`)
- Internal services (databases, admin panels)
- Localhost services
- Internal network scanning

**Vulnerable code:**

```python
# ❌ SSRF vulnerability
@app.route('/fetch-image')
def fetch_image():
    url = request.args.get('url')

    # Fetches any URL attacker provides
    response = requests.get(url)

    return response.content, 200, {'Content-Type': 'image/jpeg'}

# Attacker requests:
# /fetch-image?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
# Server fetches AWS credentials and returns them
```

**Secure code:**

```python
# ✅ SSRF protection
from urllib.parse import urlparse
import ipaddress

ALLOWED_DOMAINS = ['cdn.example.com', 'images.example.com']

def is_safe_url(url):
    """Validate URL to prevent SSRF"""
    try:
        parsed = urlparse(url)

        # Only allow HTTPS
        if parsed.scheme != 'https':
            return False

        # Check domain allowlist
        if parsed.hostname not in ALLOWED_DOMAINS:
            return False

        # Prevent IP addresses (especially internal ones)
        try:
            ip = ipaddress.ip_address(parsed.hostname)
            # Block private IP ranges
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                return False
        except ValueError:
            # Not an IP address, check DNS resolution
            resolved_ip = socket.gethostbyname(parsed.hostname)
            ip = ipaddress.ip_address(resolved_ip)
            if ip.is_private or ip.is_loopback:
                return False

        return True
    except Exception:
        return False

@app.route('/fetch-image')
def fetch_image():
    url = request.args.get('url')

    if not is_safe_url(url):
        return jsonify({'error': 'Invalid URL'}), 400

    # Use timeout to prevent slowloris attacks
    response = requests.get(url, timeout=5, allow_redirects=False)

    # Verify content type
    content_type = response.headers.get('Content-Type', '')
    if not content_type.startswith('image/'):
        return jsonify({'error': 'URL does not point to an image'}), 400

    return response.content, 200, {'Content-Type': content_type}
```

**AWS IMDSv2 protection:**

```python
# If running on AWS EC2, use IMDSv2 (requires token)
# In application startup or infrastructure config:

# Force IMDSv2
# aws ec2 modify-instance-metadata-options \
#     --instance-id i-1234567890abcdef0 \
#     --http-tokens required \
#     --http-put-response-hop-limit 1
```

**Defense principles:**
- **Allowlist domains**: Only fetch from known-good URLs
- **Block private IPs**: Prevent access to internal network
- **Disable redirects**: Attacker can redirect to internal resource
- **Network segmentation**: Application shouldn't have access to internal admin systems
- **Use IMDSv2**: On AWS, require token for metadata access

## Common Pitfalls and Defensive Programming

### Client-Side Validation is Not Security

```javascript
// ❌ Client-side validation only
// HTML form
<input type="number" min="0" max="100" name="age" required>

// JavaScript validation
if (age < 0 || age > 100) {
    alert('Invalid age');
    return;
}

// Attacker bypasses by:
// 1. Disabling JavaScript
// 2. Using browser dev tools
// 3. Sending direct HTTP request
```

```javascript
// ✅ Client-side for UX, server-side for security
// Client - immediate feedback
if (age < 0 || age > 100) {
    showError('Age must be between 0 and 100');
    return;
}

// Server - actual validation
app.post('/update-profile', (req, res) => {
    const age = parseInt(req.body.age);

    if (!Number.isInteger(age) || age < 0 || age > 150) {
        return res.status(400).json({ error: 'Invalid age' });
    }

    // Proceed...
});
```

### Fail Securely

When errors happen, fail to a safe state (deny access, don't grant it).

```python
# ❌ Fails open - grants access on error
def check_permission(user, resource):
    try:
        policy = get_access_policy(resource)
        return policy.allows(user)
    except Exception as e:
        # Error retrieving policy - assume it's OK
        return True  # Dangerous!

# ✅ Fails closed - denies access on error
def check_permission(user, resource):
    try:
        policy = get_access_policy(resource)
        return policy.allows(user)
    except Exception as e:
        logger.error(f"Error checking permission: {e}")
        return False  # Deny by default
```

### Don't Trust Security Through Obscurity

```javascript
// ❌ Security through obscurity
// "They won't find the admin panel if we use a random URL"
app.get('/admin-panel-x7k9p2m', (req, res) => {
    // No authentication - assumes URL secrecy
    res.render('admin-dashboard');
});

// ✅ Actual security
app.get('/admin', requireAuth, requireAdmin, (req, res) => {
    res.render('admin-dashboard');
});
```

Obscurity adds a layer, but it's not security. Someone will find it.

### Centralize Security Controls

```javascript
// ❌ Security logic scattered everywhere
app.get('/api/orders/:id', (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const order = getOrder(req.params.id);
    if (order.userId !== req.session.user.id) return res.status(403).send('Forbidden');
    res.json(order);
});

app.get('/api/invoices/:id', (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const invoice = getInvoice(req.params.id);
    if (invoice.userId !== req.session.user.id) return res.status(403).send('Forbidden');
    res.json(invoice);
});

// Repeated logic - easy to forget, inconsistent
```

```javascript
// ✅ Centralized middleware
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

function requireOwnership(resourceType) {
    return async (req, res, next) => {
        const resource = await db[resourceType].findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (resource.userId !== req.session.user.id && !req.session.user.isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.resource = resource;
        next();
    };
}

// Clean, consistent, auditable
app.get('/api/orders/:id', requireAuth, requireOwnership('Order'), (req, res) => {
    res.json(req.resource);
});

app.get('/api/invoices/:id', requireAuth, requireOwnership('Invoice'), (req, res) => {
    res.json(req.resource);
});
```

## Secure Coding Checklist

Before merging code, verify:

**Input Validation:**
- [ ] All user input validated (type, length, format, range)
- [ ] Allowlist validation where possible
- [ ] Server-side validation (not just client-side)
- [ ] File uploads validated by content, not extension

**Injection Prevention:**
- [ ] Database queries use parameterized statements
- [ ] No string concatenation in SQL
- [ ] ORM used correctly (no raw SQL injection)
- [ ] Shell commands avoided or properly sanitized

**Output Encoding:**
- [ ] User content encoded before display
- [ ] Context-appropriate encoding (HTML, JavaScript, URL)
- [ ] CSP headers configured

**Authentication & Authorization:**
- [ ] Protected endpoints require authentication
- [ ] Authorization checked on every request
- [ ] Session management secure (httpOnly, secure, sameSite)
- [ ] Password hashing uses bcrypt/Argon2/scrypt

**Cryptography:**
- [ ] Passwords hashed, not encrypted
- [ ] Secrets in environment variables, not code
- [ ] TLS enforced for sensitive data
- [ ] Using framework crypto, not custom

**Error Handling:**
- [ ] Generic error messages to users
- [ ] Detailed errors logged server-side
- [ ] No stack traces in production responses
- [ ] Fail securely (deny on error)

**Dependencies:**
- [ ] Dependency scanning enabled
- [ ] No known critical vulnerabilities
- [ ] Update strategy in place

**Logging:**
- [ ] Security events logged
- [ ] No sensitive data in logs
- [ ] Centralized log storage

## Tools and Resources

**SAST (Static Analysis):**
- **SonarQube** - Multi-language security scanning
- **Semgrep** - Fast, customizable pattern matching
- **Bandit** - Python security linter
- **Brakeman** - Ruby on Rails security scanner
- **ESLint with security plugins** - JavaScript

**Dependency Scanning:**
- **Snyk** - Comprehensive vulnerability database
- **Dependabot** - Automated dependency updates (GitHub)
- **OWASP Dependency-Check** - Open source, multi-language
- **npm audit** / **pip-audit** - Built into package managers

**DAST (Dynamic Analysis):**
- **OWASP ZAP** - Open source web app scanner
- **Burp Suite** - Professional web security testing

**Learning Resources:**
- **OWASP Top 10** - https://owasp.org/Top10/
- **OWASP Cheat Sheet Series** - Quick reference for secure coding patterns
- **PortSwigger Web Security Academy** - Free, hands-on security training

---

## Navigation

**Current Location:** Phase 03 - Development → Secure Coding Practices → Mid-Depth

**Related Topics:**
- [Secret Management](../../secret-management/mid-depth/) - Secure handling of credentials and keys
- [Code Review Process](../../code-review-process/mid-depth/) - Security-focused code review
- [Supply Chain Security](../../supply-chain-security/mid-depth/) - Dependency and build pipeline security
- [Threat Modeling](../../../02-design/threat-modeling/mid-depth/) - Understanding attack vectors

**Next Steps:**
- Go deeper: [Deep Water Secure Coding](../deep-water/) - Advanced AppSec and security programs
- Go lighter: [Surface Secure Coding](../surface/) - Essential security quick reference
- Apply it: Implement SAST scanning in your CI/CD pipeline
- Practice: Run OWASP ZAP against your application
