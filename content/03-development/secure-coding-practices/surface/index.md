---
title: "Secure Coding Practices: The Essential Security Rules"
phase: "03-development"
topic: "secure-coding-practices"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["secret-management", "code-review-process", "supply-chain-security", "threat-modeling"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up", "specialist-expanding", "busy-developer"]
updated: "2025-11-15"
---

# Secure Coding Practices: The Essential Security Rules

**Most security vulnerabilities happen because of predictable coding mistakes.** Fix these three things and you prevent 80% of common attacks.

## What This Is

Secure coding means writing code that can't be exploited. Not "hard to exploit" or "mostly safe" - code that actively prevents attackers from doing damage.

Every line of code that accepts input, stores data, or makes decisions is a potential attack surface. Secure coding is about writing that code defensively from the start, not adding security later.

**Why it matters:** The Equifax breach exposed 147 million records because of one unpatched vulnerability. Capital One lost 100 million customer records because of a single misconfigured permission. These weren't sophisticated attacks - they were preventable coding mistakes.

## Minimum Viable Understanding

If you only remember five things about secure coding:

### 1. Validate All Input - Trust Nothing

Every piece of data from users, APIs, files, or databases could be malicious. Check it before using it.

```python
# ❌ Dangerous - accepts anything
def update_user_age(age):
    user.age = age
    user.save()

# ✅ Safe - validates input
def update_user_age(age):
    if not isinstance(age, int):
        raise ValueError("Age must be an integer")
    if age < 0 or age > 150:
        raise ValueError("Age must be between 0 and 150")
    user.age = age
    user.save()
```

### 2. Never Build SQL with String Concatenation

SQL injection is still the most common database attack. It happens when you build queries by pasting strings together.

```javascript
// ❌ SQL Injection vulnerability
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.execute(query);
// Attacker sends: id=1 OR 1=1
// Query becomes: SELECT * FROM users WHERE id = 1 OR 1=1
// Returns ALL users

// ✅ Safe - parameterized query
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = ?';
db.execute(query, [userId]);
// Parameter is escaped automatically
```

### 3. Encode Output to Prevent XSS

Cross-Site Scripting (XSS) happens when you display user input without encoding it. The browser executes it as code.

```javascript
// ❌ XSS vulnerability
const username = getUserInput();
document.getElementById('greeting').innerHTML = `Hello ${username}`;
// Attacker enters: <script>steal_cookies()</script>
// Browser executes the script

// ✅ Safe - text content, not HTML
const username = getUserInput();
document.getElementById('greeting').textContent = `Hello ${username}`;
// Script becomes literal text, not executed
```

### 4. Use Framework Security Features

Don't write your own authentication, encryption, or session management. Use the security features built into your framework.

```python
# ❌ Dangerous - homemade password hashing
import hashlib
password_hash = hashlib.md5(password.encode()).hexdigest()
# MD5 is broken, no salt, easily cracked

# ✅ Safe - use framework's secure hashing
from django.contrib.auth.hashers import make_password
password_hash = make_password(password)
# Uses bcrypt/PBKDF2 with salt automatically
```

### 5. Keep Dependencies Updated

Your code is only as secure as the libraries it uses. Outdated dependencies are low-hanging fruit for attackers.

```bash
# Check for known vulnerabilities
npm audit
pip-audit
# Or use automated tools like Dependabot
```

## Real Red Flags: What to Look For

### ❌ Hardcoded Secrets

```python
# Anyone with access to code has production database credentials
DATABASE_URL = "postgresql://admin:SecretPass123@prod.db.com/data"
```

### ✅ Environment Variables

```python
# Secrets stored separately, not in code
import os
DATABASE_URL = os.environ.get('DATABASE_URL')
```

---

### ❌ No Authentication on API Endpoints

```javascript
app.get('/api/users/:id/email', (req, res) => {
    // Anyone can request any user's email
    const email = db.getUserEmail(req.params.id);
    res.json({ email });
});
```

### ✅ Require Authentication

```javascript
app.get('/api/users/:id/email', requireAuth, (req, res) => {
    // Verify user is authenticated and authorized
    if (req.user.id !== req.params.id && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const email = db.getUserEmail(req.params.id);
    res.json({ email });
});
```

---

### ❌ Accepting Unvalidated File Uploads

```python
# Attacker uploads malicious.php.jpg
file = request.files['upload']
file.save(f'/uploads/{file.filename}')
# Server might execute PHP code
```

### ✅ Validate File Type and Contents

```python
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

file = request.files['upload']
if file and allowed_file(file.filename):
    # Validate file content, not just extension
    # Generate safe filename, don't trust user input
    safe_filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, safe_filename))
```

---

### ❌ Exposing Detailed Error Messages

```java
// Reveals database structure and version to attackers
catch (SQLException e) {
    return "Database error: " + e.getMessage();
    // "Table 'users' doesn't exist in database MySQL 5.7.32"
}
```

### ✅ Generic Error Messages, Detailed Logs

```java
catch (SQLException e) {
    logger.error("Database error for user " + userId, e);
    return "An error occurred. Please try again.";
    // Logs have details, user sees generic message
}
```

## The Security Big Three

These three practices prevent the majority of web application vulnerabilities:

1. **Input Validation**: Check everything that comes in (user input, API responses, file contents)
2. **Output Encoding**: Escape everything that goes out (to browser, database, shell)
3. **Parameterized Queries**: Never concatenate strings to build SQL, use parameters

Get these right and you're ahead of most codebases.

## Quick Validation Test

Before shipping code, check:

- [ ] All user input is validated (type, length, format, range)
- [ ] Database queries use parameterized statements, not string concatenation
- [ ] User-generated content is encoded before display
- [ ] Authentication is required on protected endpoints
- [ ] File uploads are validated by content, not just extension
- [ ] Error messages don't reveal system internals
- [ ] Secrets are in environment variables, not hardcoded
- [ ] Dependencies are up-to-date (run `npm audit` or equivalent)
- [ ] HTTPS is enforced (no plain HTTP for sensitive data)
- [ ] Password storage uses proper hashing (bcrypt, Argon2, scrypt)

If you can check all ten boxes, you've covered the basics.

## Common Gotchas

**"The framework handles that automatically"** - Maybe. Verify it. Assumptions about what's automatic cause breaches.

**"We'll add security later"** - Security bolted on after the fact misses architectural problems. Input validation added in the UI but not the API still leaves you vulnerable.

**"Only internal users access this"** - Insider threats are real. Internal doesn't mean trusted.

**"We sanitize input with a blocklist"** - Blocklists fail. There are infinite ways to encode `<script>`. Use allowlists (only accept known-good patterns) or encoding instead.

## One-Sentence Maxim

**"Validate input like it's malicious, because sometimes it is."**

Security isn't paranoia when the threats are real. Write code that assumes bad input and handles it gracefully.


---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [code-quality](../../code-quality/surface/index.md) - Related development considerations
- [secret-management](../../secret-management/surface/index.md) - Related development considerations
- [supply-chain-security](../../supply-chain-security/surface/index.md) - Related development considerations

### Navigate
- [← Back to Development Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
