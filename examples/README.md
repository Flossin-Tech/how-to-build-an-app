# Examples Directory

This directory contains practical code examples, case studies, and real-world scenarios that illustrate concepts across the guide.

## Purpose

Examples bring abstract concepts to life. This directory centralizes examples that:

1. Can be referenced from multiple topics/depth levels
2. Show complete, working implementations
3. Demonstrate real-world scenarios, not toy problems
4. Illustrate trade-offs and decision-making processes

## Directory Structure

```
examples/
├── shared/                    # Examples used across multiple topics
│   ├── authentication/        # Reusable auth examples
│   ├── data-validation/       # Input validation patterns
│   ├── error-handling/        # Error handling strategies
│   └── api-design/            # API design patterns
└── domain-specific/           # Examples for specific application types
    ├── web-apps/              # Traditional web applications
    ├── mobile-apps/           # iOS/Android applications
    ├── ml-systems/            # Machine learning systems
    ├── api-services/          # Backend APIs and microservices
    ├── data-pipelines/        # ETL and data processing
    ├── gaming/                # Game development
    ├── iot/                   # IoT and embedded systems
    ├── healthcare/            # HIPAA-compliant healthcare apps
    ├── fintech/               # Financial applications
    └── saas/                  # Multi-tenant SaaS platforms
```

## Shared Examples

These are generic patterns applicable across domains, organized by topic area.

> **Note**: The shared examples directory structure is planned but not yet populated. The following shows the intended organization for future examples.

### Planned Structure: `shared/authentication/` (Coming Soon)

```
shared/authentication/
├── README.md                  # Overview of auth patterns
├── basic-password-auth/
│   ├── secure-version.py      # Proper implementation
│   ├── insecure-version.py    # What NOT to do (annotated)
│   └── explanation.md         # Why differences matter
├── oauth2-flow/
│   ├── implementation.js
│   ├── security-checklist.md
│   └── common-mistakes.md
├── jwt-tokens/
│   ├── creation.py
│   ├── validation.py
│   ├── rotation-strategy.md
│   └── pitfalls.md
└── mfa-implementation/
    ├── totp-setup.py
    ├── backup-codes.py
    └── ux-considerations.md
```

When populated, each shared example will include:
- Working code (multiple languages where helpful)
- Security considerations
- Common mistakes and how to avoid them
- Links to topics where this example is referenced

## Domain-Specific Examples

These show how general principles apply to specific application types.

### Example: `domain-specific/ml-systems/`

```
domain-specific/ml-systems/
├── README.md                  # ML-specific development considerations
├── threat-modeling/
│   ├── model-poisoning-scenario.md
│   ├── data-privacy-threats.md
│   └── adversarial-inputs.md
├── data-versioning/
│   ├── dvc-example/
│   ├── mlflow-tracking/
│   └── comparison.md
├── model-deployment/
│   ├── ab-testing-models/
│   ├── canary-deployment/
│   └── rollback-strategy.md
└── monitoring/
    ├── model-drift-detection.py
    ├── performance-degradation.py
    └── alerting-thresholds.md
```

### Example: `domain-specific/healthcare/`

```
domain-specific/healthcare/
├── README.md                  # HIPAA and healthcare-specific considerations
├── data-classification/
│   ├── phi-identification.md
│   ├── minimum-necessary.md
│   └── de-identification.py
├── access-control/
│   ├── role-based-access.py
│   ├── audit-logging.py
│   └── emergency-access.md
├── encryption/
│   ├── at-rest-encryption.py
│   ├── in-transit-tls.md
│   └── key-management.md
└── compliance/
    ├── hipaa-checklist.md
    ├── breach-notification.md
    └── baa-requirements.md
```

## Example File Structure

Each example follows a consistent structure:

### Code Examples

```
example-name/
├── README.md                  # Overview and learning objectives
├── implementation/            # Working code
│   ├── main.py (or .js, .go, etc.)
│   ├── tests/
│   │   └── test_main.py
│   └── requirements.txt
├── explanation.md             # Line-by-line breakdown
├── trade-offs.md              # Decision rationale
├── common-mistakes.md         # What to avoid
├── variations/                # Alternative approaches
│   ├── alternative-1/
│   └── alternative-2/
└── references.md              # Links to related topics and resources
```

### Case Studies

```
case-study-name/
├── README.md                  # Case study overview
├── scenario.md                # The problem/situation
├── approach.md                # How it was solved
├── what-went-right.md         # Successes and why
├── what-went-wrong.md         # Failures and lessons
├── code-snippets/             # Relevant code excerpts
└── takeaways.md               # Key learnings
```

## Example Metadata

Each example includes YAML frontmatter in its README.md:

```yaml
---
title: "Secure Password Authentication with Bcrypt"
domain: "shared"
category: "authentication"
languages: ["python", "javascript", "go"]
difficulty: "beginner"
topics:
  - phase: "03-development"
    topic: "secure-coding-practices"
    depths: ["surface", "mid-depth"]
  - phase: "04-testing"
    topic: "security-testing"
    depths: ["surface"]
use_cases:
  - "User login systems"
  - "API authentication"
  - "Admin panels"
anti_patterns_shown: true
working_code: true
tested: true
last_updated: "2025-11-15"
---
```

## Language Coverage

Examples should be provided in multiple languages where practical:

**Priority 1** (Most common):
- Python
- JavaScript/TypeScript
- Go

**Priority 2** (Common for specific domains):
- Java
- C#/.NET
- Ruby
- PHP

**Priority 3** (Specialized):
- Rust
- Swift/Kotlin (mobile)
- C/C++ (embedded/systems)

Not all examples need all languages. Prioritize based on:
- Domain relevance (e.g., Swift for mobile examples)
- Concept clarity (some concepts clearer in certain languages)
- Community usage patterns

## Anti-Patterns

Examples should explicitly show both:

1. **The Right Way**: Secure, maintainable, production-ready code
2. **The Wrong Way**: Common mistakes, annotated with why they're problematic

Format for showing anti-patterns:

```python
# ❌ INSECURE - DO NOT USE
# This example shows a common mistake: storing passwords in plain text
def insecure_login(username, password):
    user = db.query("SELECT * FROM users WHERE username = ?", username)
    if user and user.password == password:  # Plain text comparison!
        return user
    return None

# Why this is wrong:
# - Passwords stored in plain text in database
# - If DB is compromised, all passwords are exposed
# - No protection against rainbow table attacks
# - Violates every security standard

# ✅ SECURE - USE THIS
# Proper password verification using bcrypt
import bcrypt

def secure_login(username, password):
    user = db.query("SELECT * FROM users WHERE username = ?", username)
    if user and bcrypt.checkpw(password.encode(), user.password_hash):
        return user
    return None

# Why this is better:
# - Passwords hashed with bcrypt (slow, resistant to brute force)
# - Even with DB access, attacker can't easily reverse hashes
# - Salt automatically generated per-password
# - Industry standard approach
```

## Testing Examples

All code examples should include:

1. **Unit tests** demonstrating the example works
2. **Security tests** for security-related examples
3. **Instructions** to run tests locally

Example test structure:

```
example/
├── implementation/
│   └── main.py
└── tests/
    ├── test_functionality.py      # Does it work?
    ├── test_security.py            # Is it secure?
    ├── test_edge_cases.py          # Does it handle errors?
    └── README.md                   # How to run tests
```

## Real-World Context

Each example should include context about:

1. **When to use this**: Appropriate scenarios
2. **When NOT to use this**: Limitations and alternatives
3. **Scaling considerations**: What changes at 100/10K/1M users
4. **Team considerations**: Review, maintenance, knowledge transfer
5. **Cost implications**: Performance, infrastructure, licensing

## Cross-Referencing

Examples are linked bidirectionally:

1. **Content → Examples**: Topics link to relevant examples
2. **Examples → Content**: Examples link back to topics for deeper learning

Example reference format in content:

```markdown
## Password Storage

Never store passwords in plain text. Use a slow hashing algorithm like bcrypt.

📌 **See Example**: [Secure Password Authentication](/examples/shared/authentication/basic-password-auth/) *(coming soon)*

For more advanced scenarios, see:
- [OAuth2 Implementation](/examples/shared/authentication/oauth2-flow/) *(coming soon)*
- [Multi-Factor Authentication](/examples/shared/authentication/mfa-implementation/) *(coming soon)*
```

## Community Contributions

Examples are ideal for community contributions:

1. **New languages**: Add implementation in additional language
2. **Domain variations**: Show how pattern applies in your domain
3. **Case studies**: Share real-world success/failure stories
4. **Anti-patterns**: Document mistakes you've seen in the wild

Contribution template provided in each example's README.

## Maintenance

- **Test regularly**: Automated tests run on CI/CD
- **Update dependencies**: Keep examples current with latest package versions
- **Security patches**: High priority for security-related examples
- **Deprecation notices**: Mark examples when better approaches emerge
- **Community feedback**: Iterate based on user questions and confusion

## Integration with Interactive App

The app will:

1. **Embed examples** inline with content
2. **Live code editing**: Try examples in browser where possible
3. **Copy to clipboard**: Easy code copying
4. **Download as project**: Get complete working project
5. **Language switching**: Toggle between language implementations
6. **Security toggle**: Show/hide anti-patterns for focused learning
7. **Annotated view**: Hover for explanations of specific lines
