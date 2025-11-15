---
title: "Secret Management: The Essentials"
phase: "03-development"
topic: "secret-management"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["secure-coding-practices", "supply-chain-security", "deployment-strategy", "incident-response"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up", "specialist-expanding", "busy-developer"]
updated: "2025-11-15"
---

# Secret Management: The Essentials

Keeping API keys, passwords, and credentials out of the hands of attackers.

## What This Is

Secrets are sensitive data your application needs to function: API keys for third-party services, database passwords, encryption keys, OAuth client secrets, and authentication tokens. They're the keys to your kingdom.

Poor secret management is how breaches happen. An attacker who finds your secrets can:
- Access your production database
- Impersonate your application to third-party services
- Decrypt sensitive user data
- Rack up thousands of dollars in cloud service charges
- Pivot to other systems using compromised credentials

The most common mistake is putting secrets directly in your code. Once code is committed to version control, secrets are effectively public forever, even if you delete them later.

## Minimum Viable Understanding

Follow these rules. No exceptions.

### Never Commit Secrets to Version Control

Git history is permanent. Deleting a file doesn't remove it from history. Every developer who clones the repo gets the entire history, including that commit from three years ago with the production database password.

Attackers scan GitHub constantly for committed secrets. Automated bots find exposed API keys within minutes of being pushed.

### Use Environment Variables as Your Baseline

Environment variables are the minimum safe approach:

```python
# ❌ WRONG - Secret in code
api_key = "sk_live_abc123xyz789"
db_password = "ProductionPass2023!"

# ✅ CORRECT - Secret from environment
import os
api_key = os.environ["API_KEY"]
db_password = os.environ["DB_PASSWORD"]
```

```javascript
// ❌ WRONG - Secret in code
const apiKey = "sk_live_abc123xyz789";

// ✅ CORRECT - Secret from environment
const apiKey = process.env.API_KEY;
```

### Different Secrets for Each Environment

Use completely different credentials for development, staging, and production. When your development database credentials leak (they will), your production data stays safe.

Never test with production credentials. Ever.

### Rotate Compromised Secrets Immediately

If a secret is exposed, assume it's compromised. Rotate it immediately:
1. Generate new secret
2. Update systems to use new secret
3. Revoke old secret
4. Investigate extent of exposure

Minutes matter. Automated bots scan for secrets constantly.

## Real Red Flags

### ❌ Hardcoded API Keys in Code

```python
# This is in your git history forever
stripe_api_key = "sk_live_51HaB3KLm8NOP..."
```

Bots scan GitHub for strings like `sk_live_`, `api_key =`, and common patterns. Your key will be found and used.

### ❌ .env File Committed to Git

```bash
# .env file with real secrets
DATABASE_URL=postgres://user:pass@prod.example.com/db
STRIPE_KEY=sk_live_abc123
```

If this file is committed, these secrets are public. Adding `.env` to `.gitignore` after committing doesn't help - it's already in git history.

### ❌ Production Credentials in Slack or Email

"Hey can you send me the prod DB password?"

Chat logs and email are:
- Searchable by many people
- Backed up indefinitely
- Not designed for secret storage
- Often synced to personal devices

Use a password manager designed for teams instead.

### ✅ Environment Variables

```bash
# Set in your shell or platform, not in code
export API_KEY=abc123
export DATABASE_URL=postgres://localhost/dev_db

# Reference in code
import os
api_key = os.environ["API_KEY"]
```

### ✅ .env in .gitignore

```bash
# .gitignore
.env
.env.local
.env.*.local
```

Create `.env.example` with dummy values to show what environment variables are needed:

```bash
# .env.example - committed to git
API_KEY=your_api_key_here
DATABASE_URL=postgres://localhost/myapp_dev
```

### ✅ Secret Management Service

For production, use a dedicated service:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager

These provide encryption at rest, access auditing, automatic rotation, and fine-grained access control.

## Emergency: If You Committed a Secret

You pushed code with a hardcoded secret. The clock is ticking.

### Immediate Actions (within minutes)

1. **Revoke the secret immediately**
   - Regenerate API key
   - Change password
   - Revoke OAuth token
   - Whatever it takes to make the old secret useless

2. **Update your application** with the new secret
   - Use environment variables this time
   - Deploy immediately if production is affected

3. **Verify the old secret is disabled**
   - Try using it - should fail
   - Check service dashboards for unauthorized usage

### Follow-up Actions (within hours)

4. **Audit access logs**
   - Check if the compromised secret was used
   - Look for unusual activity
   - Determine scope of potential breach

5. **Clean git history** (complex, not foolproof)
   - Use `git filter-branch` or BFG Repo-Cleaner
   - Force push to all branches
   - Notify all team members to re-clone
   - Understand this doesn't remove forks or local copies

6. **Document the incident**
   - What happened
   - What was exposed
   - Actions taken
   - How to prevent recurrence

### Reality Check

Removing secrets from git history is difficult and doesn't guarantee the secret wasn't already harvested. Focus on rotating the secret first.

If this was a public repository, assume the secret is compromised. If it was private, you have more time but still act fast.

## Quick Validation Test

Run through this checklist:

- [ ] No secrets in source code files
- [ ] `.env` and similar files in `.gitignore`
- [ ] Different credentials for dev/staging/prod
- [ ] Team uses password manager for sharing secrets (not Slack/email)
- [ ] Production secrets stored in secret management service or platform secret storage
- [ ] You know how to rotate each type of secret you use
- [ ] Automated secret scanning in CI/CD (git-secrets, TruffleHog, or GitGuardian)

If you can't check all these boxes, you have work to do.

## When to Graduate Beyond Environment Variables

Environment variables work fine for small projects and development. Move to a dedicated secret management service when:

- You have more than 5-10 secrets to manage
- Multiple services need the same secrets
- You need audit logs of who accessed what secret when
- Compliance requires encryption at rest and access controls
- You need automated secret rotation
- You're running in Kubernetes or a microservices architecture

Don't let perfect be the enemy of good. Environment variables are infinitely better than hardcoded secrets.

## One-Sentence Maxim

**If it's a secret, it doesn't belong in git.**

---

## Navigation

**Current**: Surface Level - Essential rules for safe secret handling

**Next Steps**:
- **Mid-Depth**: Secret management services, rotation strategies, and development workflows
- **Deep Water**: Enterprise secret architecture, encryption key management, and zero-trust access

**Related Topics**:
- [Secure Coding Practices](../../secure-coding-practices/surface/index.md) - Security principles for writing code
- [Deployment Strategy](../../../05-deployment/deployment-strategy/surface/index.md) - Injecting secrets during deployment
- [Incident Response](../../../06-operations/incident-response/surface/index.md) - Responding when secrets are exposed
