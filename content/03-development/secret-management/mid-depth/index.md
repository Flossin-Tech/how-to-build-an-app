---
title: "Secret Management: Production Implementation"
phase: "03-development"
topic: "secret-management"
depth: "mid-depth"
reading_time: 25
prerequisites: []
related_topics: ["secure-coding-practices", "supply-chain-security", "deployment-strategy", "incident-response"]
personas: ["generalist-leveling-up", "specialist-expanding", "busy-developer"]
updated: "2025-11-15"
---

# Secret Management: Production Implementation

Building systems that handle sensitive credentials safely at scale.

## Introduction: The Secret Lifecycle

Secrets aren't static. They're created, distributed, used, rotated, and eventually revoked. Each stage introduces security risks.

A proper secret management system handles:
- **Secure storage**: Encrypted at rest, access-controlled
- **Secure distribution**: Getting secrets to applications without exposing them
- **Access control**: Who (or what) can access which secrets
- **Audit logging**: Recording all secret access
- **Rotation**: Changing secrets regularly or on-demand
- **Revocation**: Disabling compromised or unused secrets

This guide covers practical implementation for teams building production systems.

## Types of Secrets

Different secrets have different requirements and rotation strategies.

### API Keys and Tokens

Third-party service credentials: Stripe, SendGrid, AWS access keys, GitHub tokens.

**Characteristics**:
- Usually long-lived (months to years)
- Service-specific format
- Often tied to billing
- Revocation is immediate

**Rotation strategy**: Quarterly or when team members with access leave. Some services support multiple concurrent keys for zero-downtime rotation.

### Database Credentials

Usernames and passwords for databases: PostgreSQL, MySQL, MongoDB, Redis.

**Characteristics**:
- Medium-lived (weeks to months)
- Connection strings contain multiple pieces (host, port, username, password, database name)
- Rotation can cause downtime if not handled carefully

**Rotation strategy**: Monthly or when compromised. Use connection pooling and graceful shutdown to rotate without downtime.

### Encryption Keys

Keys for encrypting data at rest or in transit: AES keys, RSA private keys.

**Characteristics**:
- Rotation requires re-encryption or key hierarchy
- Loss means data is unrecoverable
- Often regulated (FIPS 140-2, PCI-DSS requirements)

**Rotation strategy**: Depends on compliance requirements and data sensitivity. Use envelope encryption to simplify rotation.

### TLS/SSL Certificates

X.509 certificates for HTTPS and service-to-service authentication.

**Characteristics**:
- Have expiration dates (30-90 days with Let's Encrypt, 1+ year for purchased certs)
- Renewal is predictable
- Automated renewal is standard practice

**Rotation strategy**: Automate renewal with cert-manager (Kubernetes) or ACME clients. Set alerts for certificates expiring within 30 days.

### Service Account Credentials

Cloud provider service accounts, CI/CD credentials, Kubernetes service account tokens.

**Characteristics**:
- Often scoped to specific permissions
- May be short-lived (hours) or long-lived (years)
- Used by automated systems, not humans

**Rotation strategy**: Use short-lived credentials when possible (AWS IAM roles, GCP Workload Identity). Long-lived credentials should rotate quarterly.

### OAuth Client Secrets

OAuth 2.0 client secrets for applications integrating with OAuth providers.

**Characteristics**:
- Used during OAuth flows
- Compromise allows impersonating your application
- Some providers allow multiple concurrent secrets

**Rotation strategy**: Annually or when compromised. Check if provider supports multiple secrets for zero-downtime rotation.

## Environment Variables: The Baseline

Environment variables are the minimum acceptable approach for secret management. They're not perfect, but they're vastly better than hardcoding.

### How Environment Variables Work

The operating system provides each process with environment variables - key-value pairs accessible to the application.

**Python**:
```python
import os

# Required - will raise KeyError if not set
database_url = os.environ["DATABASE_URL"]

# Optional with default
api_timeout = int(os.environ.get("API_TIMEOUT", "30"))

# Check if set
if "FEATURE_FLAG" in os.environ:
    enable_experimental_feature = True
```

**Node.js**:
```javascript
// Required - will be undefined if not set
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Optional with default
const apiTimeout = parseInt(process.env.API_TIMEOUT || "30");
```

**Go**:
```go
import "os"

// Required - empty string if not set
databaseUrl := os.Getenv("DATABASE_URL")
if databaseUrl == "" {
    log.Fatal("DATABASE_URL environment variable is required")
}

// Optional with default
apiTimeout := os.Getenv("API_TIMEOUT")
if apiTimeout == "" {
    apiTimeout = "30"
}
```

**Java**:
```java
// Required
String databaseUrl = System.getenv("DATABASE_URL");
if (databaseUrl == null) {
    throw new IllegalStateException("DATABASE_URL environment variable is required");
}

// Optional with default
String apiTimeout = System.getenv().getOrDefault("API_TIMEOUT", "30");
```

### .env Files for Local Development

For local development, use `.env` files to avoid setting environment variables manually.

**Install dotenv library**:
```bash
# Python
pip install python-dotenv

# Node.js
npm install dotenv

# Ruby
gem install dotenv
```

**Create .env file** (never commit this):
```bash
# .env
DATABASE_URL=postgres://localhost/myapp_dev
STRIPE_API_KEY=sk_test_abc123
REDIS_URL=redis://localhost:6379
API_SECRET=dev-secret-change-in-prod
```

**Load in application**:
```python
# Python - at the top of your app
from dotenv import load_dotenv
load_dotenv()  # Loads .env file into os.environ

import os
database_url = os.environ["DATABASE_URL"]
```

```javascript
// Node.js - at the top of your app
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
```

**Create .env.example** (commit this):
```bash
# .env.example
DATABASE_URL=postgres://localhost/myapp_dev
STRIPE_API_KEY=sk_test_your_test_key_here
REDIS_URL=redis://localhost:6379
API_SECRET=change-me-in-production
```

**Add to .gitignore**:
```bash
# .gitignore
.env
.env.local
.env.*.local
```

### Platform-Specific Environment Variables

Different platforms provide different ways to set environment variables for production.

**Heroku**:
```bash
# Set via CLI
heroku config:set DATABASE_URL=postgres://...
heroku config:set API_KEY=abc123

# View current config
heroku config

# Unset
heroku config:unset API_KEY
```

**Vercel**:
```bash
# Set via CLI
vercel env add DATABASE_URL

# Or via web dashboard: Project Settings → Environment Variables
```

**AWS Elastic Beanstalk**:
```bash
# Via .ebextensions/environment.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    DATABASE_URL: "postgres://..."
    API_KEY: "abc123"
```

**Docker**:
```bash
# Pass at runtime
docker run -e DATABASE_URL=postgres://... -e API_KEY=abc123 myapp

# Or via environment file
docker run --env-file .env myapp
```

**Docker Compose**:
```yaml
# docker-compose.yml
services:
  web:
    image: myapp
    env_file:
      - .env  # Load from file
    environment:
      - NODE_ENV=production  # Inline
```

**Kubernetes**:
```yaml
# Using environment variables directly (not recommended for secrets)
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    env:
    - name: DATABASE_URL
      value: "postgres://..."  # DON'T DO THIS for real secrets
```

### Limitations of Environment Variables

Environment variables are a baseline, but they have limits:

1. **Visible to the process**: Any code running in your application can read all environment variables
2. **Logged in error reports**: Stack traces often include environment variables
3. **Visible in process listings**: `ps auxe` shows environment variables on Linux
4. **No audit trail**: Can't track who accessed what secret when
5. **No rotation without restart**: Changing secrets requires application restart
6. **No fine-grained access**: All secrets available to all code in the process

Graduate to a secret management service when these limitations become problems.

## Secret Management Services

Dedicated services designed for storing, distributing, and managing secrets at scale.

### AWS Secrets Manager

Managed service for storing and rotating secrets in AWS.

**Key features**:
- Automatic rotation for RDS, Redshift, DocumentDB
- Encryption at rest with AWS KMS
- Fine-grained IAM access control
- Audit logging via CloudTrail
- Versioning of secret values

**Pricing**: $0.40/secret/month + $0.05/10,000 API calls

**Usage example**:
```python
import boto3
from botocore.exceptions import ClientError

client = boto3.client('secretsmanager', region_name='us-east-1')

def get_secret(secret_name):
    try:
        response = client.get_secret_value(SecretId=secret_name)
        return response['SecretString']
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print(f"Secret {secret_name} not found")
        raise

# Get database credentials
db_secret = get_secret('production/database')
# Returns JSON: {"username": "admin", "password": "..."}
```

**When to use**:
- Already using AWS
- Need automatic RDS credential rotation
- Want managed service with minimal setup

**When to avoid**:
- Multi-cloud setup (vendor lock-in)
- Very high API call volume (costs add up)
- Need advanced features like dynamic secrets

### HashiCorp Vault

Open-source secret management with both self-hosted and managed (HCP Vault) options.

**Key features**:
- Dynamic secrets (generate on-demand)
- Encryption as a service
- Multiple authentication methods (AWS IAM, Kubernetes, LDAP, etc.)
- Secret leasing and renewal
- Highly available clustering

**Pricing**: Free (self-hosted), HCP Vault starts at $0.03/hour

**Usage example**:
```python
import hvac

# Initialize client
client = hvac.Client(url='https://vault.example.com:8200')

# Authenticate (example using token)
client.token = 'your-vault-token'

# Read static secret
secret = client.secrets.kv.v2.read_secret_version(
    path='production/database',
    mount_point='secret'
)
db_password = secret['data']['data']['password']

# Generate dynamic database credentials (valid for 1 hour)
db_creds = client.secrets.database.generate_credentials(
    name='readonly-role'
)
username = db_creds['data']['username']  # vault-generated
password = db_creds['data']['password']  # vault-generated
```

**When to use**:
- Multi-cloud or hybrid cloud
- Need dynamic secrets or encryption as a service
- Want flexibility and control
- Enterprise features (namespaces, replication)

**When to avoid**:
- Don't want to operate infrastructure (use managed service instead)
- Team lacks experience with Vault

### Azure Key Vault

Microsoft Azure's managed secret and key management service.

**Key features**:
- Secrets, keys, and certificates in one service
- Managed Identity integration
- RBAC and access policies
- Hardware security module (HSM) backed options
- Soft delete and purge protection

**Pricing**: $0.03/10,000 transactions, HSM-backed keys extra

**Usage example**:
```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# Authenticate using managed identity or CLI credentials
credential = DefaultAzureCredential()
client = SecretClient(
    vault_url="https://myvault.vault.azure.net/",
    credential=credential
)

# Get secret
secret = client.get_secret("database-password")
password = secret.value
```

**When to use**:
- Azure-native applications
- Need HSM-backed keys
- Using Azure Managed Identity

**When to avoid**:
- Not using Azure
- Need dynamic secret generation

### Google Cloud Secret Manager

Google Cloud's managed secret storage service.

**Key features**:
- IAM-based access control
- Automatic replication across regions
- Versioning and secret rotation
- Audit logging via Cloud Audit Logs
- Integration with GKE, Cloud Run, Cloud Functions

**Pricing**: $0.06/secret/month + $0.03/10,000 accesses

**Usage example**:
```python
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()

# Access secret (using Workload Identity in GKE)
name = "projects/123456/secrets/database-password/versions/latest"
response = client.access_secret_version(request={"name": name})
password = response.payload.data.decode('UTF-8')
```

**When to use**:
- GCP-native applications
- Using GKE with Workload Identity
- Want simple, managed service

**When to avoid**:
- Need dynamic secret generation
- Multi-cloud requirements

### Comparison and Selection Guide

| Feature | AWS Secrets Manager | HashiCorp Vault | Azure Key Vault | GCP Secret Manager |
|---------|-------------------|-----------------|-----------------|-------------------|
| **Dynamic secrets** | RDS only | Yes, many systems | No | No |
| **Automatic rotation** | AWS services | Yes, flexible | Limited | Manual |
| **Multi-cloud** | No | Yes | No | No |
| **Encryption as service** | No | Yes | Yes | No |
| **Learning curve** | Low | High | Low | Low |
| **Operational overhead** | None | High (self-hosted) | None | None |
| **Cost** | Medium | Free-High | Low | Medium |

**Choose AWS Secrets Manager** if you're all-in on AWS and need automatic RDS rotation.

**Choose HashiCorp Vault** if you need dynamic secrets, multi-cloud, or advanced features. Be prepared to invest in learning and operations.

**Choose Azure Key Vault** if you're Azure-native and use Managed Identity.

**Choose GCP Secret Manager** if you're GCP-native and want simplicity.

**Choose environment variables** if you have fewer than 10 secrets and are a small team.

## Secret Rotation

Changing secrets regularly limits the damage from undetected compromises.

### Why Rotation Matters

Secrets can be compromised without you knowing:
- Logs accidentally include secrets
- Employee laptop stolen
- Insider threat
- Application vulnerability leaks memory
- Third-party breach exposes your integration credentials

Regular rotation limits the window of opportunity for an attacker.

### Automated vs Manual Rotation

**Automated rotation**:
- Scheduled (every 30/60/90 days)
- No human intervention required
- Zero downtime if implemented correctly
- Requires application support for graceful secret refresh

**Manual rotation**:
- Triggered by events (employee departure, suspected breach)
- Requires coordination and downtime
- Higher risk of mistakes

Automate what you can. High-value secrets (database credentials, encryption keys) should rotate automatically.

### Zero-Downtime Rotation Strategies

**Strategy 1: Support multiple concurrent credentials**

Some services allow multiple valid API keys simultaneously.

1. Generate new secret (secret B) while old secret (secret A) is still valid
2. Update application to use new secret B
3. Verify application works with secret B
4. Revoke old secret A

**Strategy 2: Graceful application restart**

For secrets that can't be concurrent:

1. Generate new secret
2. Update secret in secret management system
3. Rolling restart of application instances
   - Each instance reads new secret on startup
   - Old instances continue using cached old secret until restarted
   - Load balancer ensures availability during rolling restart

**Strategy 3: Dual-read period**

Application temporarily accepts both old and new credentials.

1. Generate new secret
2. Configure system to accept both old and new secrets
3. Update applications to use new secret
4. After all applications updated, remove old secret from acceptance list
5. Revoke old secret

### Rotation Frequency Guidelines

These are starting points, not rules:

- **Database credentials**: 30-90 days
- **API keys**: 90 days
- **Encryption keys**: 1 year (or per compliance requirements)
- **TLS certificates**: 90 days (automated with Let's Encrypt)
- **Service account credentials**: 90 days for long-lived, hours/days for short-lived
- **OAuth secrets**: Annually

Increase frequency for:
- Higher-privileged access
- Compliance requirements
- Elevated threat level
- After security incidents

### Rotation Automation Examples

**AWS Secrets Manager automatic rotation**:
```python
# Lambda function for RDS rotation (AWS provides this template)
import boto3
import pymysql

def lambda_handler(event, context):
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    if step == "createSecret":
        # Generate new password
        new_password = generate_random_password()
        # Store as AWSPENDING version
        secrets_client.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps({"password": new_password}),
            VersionStages=['AWSPENDING']
        )

    elif step == "setSecret":
        # Update database with new password
        # Connect using AWSCURRENT credentials, change to AWSPENDING password

    elif step == "testSecret":
        # Verify new credentials work

    elif step == "finishSecret":
        # Promote AWSPENDING to AWSCURRENT
```

**Vault dynamic database credentials**:
```python
# Vault generates temporary credentials on-demand
import hvac

client = hvac.Client(url='https://vault.example.com')
client.token = 'app-token'

# Request database credentials (valid for 1 hour)
creds = client.secrets.database.generate_credentials(name='readonly')

username = creds['data']['username']  # vault-gen-readonly-abc123
password = creds['data']['password']  # random-generated
lease_id = creds['lease_id']
lease_duration = creds['lease_duration']  # 3600 seconds

# Use credentials...

# Optional: renew lease before expiration
client.sys.renew_lease(lease_id=lease_id)

# Or revoke early when done
client.sys.revoke_lease(lease_id=lease_id)
```

## Least Privilege

Grant the minimum access necessary for each component.

### Scope Secrets to Services

Each service should only access secrets it needs.

**Bad**: One "database" secret with admin access used by all services.

**Good**: Separate credentials for each service with appropriate permissions:
- Web API: Read-write on specific tables
- Analytics job: Read-only on specific tables
- Backup process: Read-only on entire database
- Migration script: Schema modification rights

### Scope Secrets to Environments

Never use production credentials in development or staging.

**Per-environment secrets**:
```
development/database    -> Local PostgreSQL
staging/database        -> Staging RDS instance
production/database     -> Production RDS instance

development/stripe      -> Stripe test key
production/stripe       -> Stripe live key
```

### Time-Limited Credentials

Short-lived credentials limit blast radius.

**AWS STS temporary credentials** (valid 15 mins - 12 hours):
```python
import boto3

sts_client = boto3.client('sts')

# Assume role for temporary credentials
assumed_role = sts_client.assume_role(
    RoleArn='arn:aws:iam::123456789:role/MyAppRole',
    RoleSessionName='api-server-session',
    DurationSeconds=3600  # 1 hour
)

# Use temporary credentials
temp_credentials = assumed_role['Credentials']
s3_client = boto3.client(
    's3',
    aws_access_key_id=temp_credentials['AccessKeyId'],
    aws_secret_access_key=temp_credentials['SecretAccessKey'],
    aws_session_token=temp_credentials['SessionToken']
)
```

**Vault dynamic secrets** automatically expire.

### Human Access vs Service Access

Humans and services should use different credentials.

**Humans**:
- Multi-factor authentication
- Tied to individual identity
- Audited
- Time-limited sessions
- Can be revoked when person leaves

**Services**:
- Service accounts or IAM roles
- Scoped to specific permissions
- Automatically rotated
- No interactive login

Never use a human's credentials for automated processes.

## Detection and Response

Preventing secret exposure is ideal. Detecting and responding quickly is the backup plan.

### Git Secret Scanning Tools

Automated tools scan repositories for accidentally committed secrets.

**git-secrets** (AWS):
```bash
# Install
brew install git-secrets  # macOS
apt-get install git-secrets  # Linux

# Set up in repository
cd your-repo
git secrets --install
git secrets --register-aws  # Prevent AWS keys

# Add custom patterns
git secrets --add 'password\s*=\s*["\'][^"\']+["\']'

# Scan existing history
git secrets --scan-history
```

**TruffleHog**:
```bash
# Install
pip install truffleHog

# Scan repository
truffleHog --regex --entropy=True https://github.com/user/repo.git

# Scan specific branch
truffleHog --regex --branch main file:///path/to/repo
```

**GitGuardian** (SaaS):
- Monitors public GitHub repositories automatically
- Alerts when secrets detected
- Integrates with CI/CD
- Commercial product with free tier

**GitHub Secret Scanning** (built-in for public repos, GitHub Advanced Security for private):
- Automatic scanning
- Notifies repository owners and service providers
- Covers 200+ token formats

### Pre-commit Hooks

Prevent secrets from being committed in the first place.

**detect-secrets** pre-commit hook:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

```bash
# Install
pip install pre-commit detect-secrets

# Set up
pre-commit install

# Create baseline (existing secrets to ignore)
detect-secrets scan > .secrets.baseline

# Now commits are automatically scanned
git commit -m "Add feature"  # Blocked if secrets detected
```

### What to Do When Secrets Are Exposed

Time is critical. Act fast.

**Within 5 minutes**:
1. **Revoke the secret** - Regenerate API key, change password, revoke token
2. **Update application** with new secret
3. **Verify old secret is disabled** - Test that old credentials don't work

**Within 1 hour**:
4. **Audit access logs** - Check if compromised secret was used
5. **Assess scope** - What data/systems could have been accessed?
6. **Notify stakeholders** - Security team, management, potentially customers

**Within 24 hours**:
7. **Review git history** - How long was secret exposed?
8. **Check for forks/clones** - Who has copies of the repository?
9. **Clean git history** (if practical) - BFG Repo-Cleaner or git filter-branch
10. **Document incident** - Timeline, actions taken, lessons learned

**Ongoing**:
11. **Monitor for abuse** - Watch for unusual activity for 30+ days
12. **Implement prevention** - Pre-commit hooks, secret scanning, training

### Breach Notification Considerations

Some exposures trigger legal notification requirements:

- **GDPR**: Breach of personal data must be reported within 72 hours
- **PCI-DSS**: Credit card data breach requires notification
- **HIPAA**: Healthcare data breach notification required
- **State laws**: Many US states have breach notification laws

Consult legal counsel if:
- Customer data may have been accessed
- Financial credentials exposed
- Healthcare information potentially compromised
- Any regulated data possibly breached

Better safe than sued.

## Development Workflow

How teams actually use secrets day-to-day.

### Local Development

Developers need secrets to run the application locally.

**Approach 1: .env files** (most common)
```bash
# Each developer has their own .env (not committed)
DATABASE_URL=postgres://localhost/myapp_dev
STRIPE_KEY=sk_test_abc123  # Test key, safe to share
REDIS_URL=redis://localhost:6379
```

**Approach 2: Shared development secrets**

Use actual secret manager for shared dev environment:
```python
# config.py
import os

if os.environ.get('ENVIRONMENT') == 'production':
    # Fetch from production secret manager
    secrets = fetch_from_secrets_manager('production')
elif os.environ.get('ENVIRONMENT') == 'staging':
    secrets = fetch_from_secrets_manager('staging')
else:
    # Local development - use .env
    from dotenv import load_dotenv
    load_dotenv()
    secrets = os.environ
```

### Sharing Secrets with Team

Never use email or Slack for production secrets.

**Option 1: Team password manager**
- 1Password (Teams/Business)
- LastPass (Business)
- Bitwarden (Organizations)

Store production secrets in shared vaults. Access controlled by role.

**Option 2: Secret management service**

Grant team members temporary access:
```bash
# AWS: Grant engineer temporary access to staging secrets
aws secretsmanager create-secret --name staging/database
aws iam attach-user-policy --user-name engineer --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# Vault: Time-limited token for specific secrets
vault token create -policy=staging-readonly -ttl=8h
```

**Option 3: Onboarding documentation**

For secrets that must be manually configured:
```markdown
# Onboarding: Setting up local environment

1. Copy `.env.example` to `.env`
2. Request Stripe test API key from #engineering-team Slack
3. Database runs locally via Docker Compose (no external credentials needed)
4. For production access, request AWS IAM credentials from ops team
```

### CI/CD Secret Injection

Continuous integration and deployment pipelines need secrets.

**GitHub Actions**:
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          ./deploy.sh
```

Secrets configured in repository settings, accessed via `${{ secrets.NAME }}`.

**GitLab CI**:
```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - ./deploy.sh
  variables:
    DATABASE_URL: $CI_DATABASE_URL  # From GitLab CI/CD variables
    API_KEY: $CI_API_KEY
  only:
    - main
```

**CircleCI**:
```yaml
# .circleci/config.yml
version: 2.1
jobs:
  deploy:
    docker:
      - image: cimg/python:3.11
    steps:
      - checkout
      - run:
          name: Deploy
          command: ./deploy.sh
    environment:
      DATABASE_URL: ${DATABASE_URL}  # From project environment variables
```

**Best practices**:
- Use platform-provided secret storage (not in YAML)
- Limit secret access to specific workflows/jobs
- Audit who can modify secrets
- Rotate CI/CD secrets quarterly
- Use different secrets for CI/CD than for production runtime

### Secret Bootstrapping

How do you get the first secret to your application?

**Problem**: Application needs secrets to start, but how does it authenticate to the secret manager?

**Solution 1: Platform-provided identity (best)**
- AWS IAM roles
- GCP Workload Identity
- Azure Managed Identity
- Kubernetes Service Accounts

Application authenticates using platform identity, no static credentials needed.

```python
# Application running in AWS EC2 or ECS
# No credentials in code or environment variables
import boto3

# boto3 automatically uses IAM role attached to instance
client = boto3.client('secretsmanager')
secret = client.get_secret_value(SecretId='database-password')
```

**Solution 2: Single bootstrap secret**

One long-lived secret to access secret manager, all other secrets retrieved from manager.

```bash
# Only VAULT_TOKEN in environment
export VAULT_TOKEN=s.abc123xyz

# Application reads this token, uses it to fetch all other secrets
```

Limit permissions of bootstrap secret to read-only on specific paths.

**Solution 3: External secret injection**

Platform injects secrets before application starts.
- Kubernetes External Secrets Operator
- AWS Systems Manager Parameter Store with ECS
- GCP Secret Manager with Cloud Run

Application reads secrets from files or environment variables that were injected by platform.

## Common Pitfalls

### Logging Secrets

Don't log secrets, even at debug level.

**Bad**:
```python
logger.debug(f"Connecting to database: {database_url}")
# Logs: Connecting to database: postgres://user:PASSWORD@host/db
```

**Good**:
```python
# Parse URL, log without password
from urllib.parse import urlparse
parsed = urlparse(database_url)
safe_url = f"{parsed.scheme}://{parsed.hostname}:{parsed.port}{parsed.path}"
logger.debug(f"Connecting to database: {safe_url}")
# Logs: Connecting to database: postgres://host:5432/db
```

### Secrets in Error Messages

Exception details often include variable values.

**Bad**:
```python
try:
    api_client.authenticate(api_key)
except Exception as e:
    logger.error(f"Authentication failed with key {api_key}: {e}")
```

**Good**:
```python
try:
    api_client.authenticate(api_key)
except Exception as e:
    logger.error(f"Authentication failed with key ending in ...{api_key[-4:]}: {e}")
```

### Secrets in URLs

Don't pass secrets as query parameters.

**Bad**:
```
https://api.example.com/data?api_key=sk_live_abc123
```

URLs are logged by proxies, load balancers, browsers, and application servers.

**Good**:
```python
# Use Authorization header
import requests

headers = {"Authorization": f"Bearer {api_key}"}
response = requests.get("https://api.example.com/data", headers=headers)
```

### Hardcoded Secrets in Tests

Test code needs credentials too, but don't hardcode them.

**Bad**:
```python
# test_api.py
def test_api_call():
    api_key = "sk_test_abc123xyz"  # Hardcoded in test
    response = api.call(api_key)
    assert response.status_code == 200
```

**Good**:
```python
# test_api.py
import os

def test_api_call():
    api_key = os.environ.get("TEST_API_KEY", "mock-key-for-ci")
    response = api.call(api_key)
    assert response.status_code == 200
```

Use test/sandbox API keys when available. Mock external services when not.

### Secrets in Docker Images

Don't bake secrets into Docker images.

**Bad**:
```dockerfile
# Dockerfile
FROM python:3.11
COPY .env /app/.env  # DON'T DO THIS
COPY . /app
CMD ["python", "app.py"]
```

Docker images are often stored in registries, shared with teams, and layer history is preserved.

**Good**:
```dockerfile
# Dockerfile
FROM python:3.11
COPY . /app
# No secrets in image

# Secrets passed at runtime
# docker run -e DATABASE_URL=... myapp
```

### Caching Secrets Too Long

Balance between performance and security.

**Bad**: Cache secrets forever
```python
# Global variable, never refreshed
API_KEY = get_secret('api-key')  # Runs once at import

def make_api_call():
    return api.call(API_KEY)  # Always uses initial value
```

If secret is rotated, application never picks up new value.

**Good**: Refresh periodically
```python
import time

class SecretCache:
    def __init__(self, secret_name, ttl=3600):  # 1 hour TTL
        self.secret_name = secret_name
        self.ttl = ttl
        self.cached_value = None
        self.cached_at = 0

    def get(self):
        now = time.time()
        if self.cached_value is None or (now - self.cached_at) > self.ttl:
            self.cached_value = get_secret(self.secret_name)
            self.cached_at = now
        return self.cached_value

api_key_cache = SecretCache('api-key', ttl=3600)

def make_api_call():
    api_key = api_key_cache.get()  # Refreshes if stale
    return api.call(api_key)
```

## When You've Outgrown Environment Variables

Signs it's time for a real secret management service:

1. **You have more than 10-15 secrets** - Manual management becomes error-prone
2. **Multiple services need the same secrets** - Synchronization is painful
3. **You need audit logs** - Compliance or security requirements
4. **Secrets change frequently** - Manual updates to all environments is tedious
5. **You're running Kubernetes** - Kubernetes Secrets alone aren't enough
6. **Team is growing** - More people need access to different subsets of secrets
7. **You need automatic rotation** - Manual rotation is forgotten
8. **Compliance requirements** - PCI-DSS, HIPAA, SOC 2, etc.

Environment variables are fine for startups and small projects. Production systems handling sensitive data need more.

---

## Navigation

**Current**: Mid-Depth Level - Production secret management implementation

**Next Steps**:
- **Deep Water**: Enterprise secret architecture, encryption key management, Kubernetes integration, and zero-trust access

**Related Topics**:
- [Secure Coding Practices](../../secure-coding-practices/mid-depth/index.md) - Security principles for writing code
- [Deployment Strategy](../../../05-deployment/deployment-strategy/mid-depth/index.md) - Injecting secrets during deployment
- [Incident Response](../../../06-operations/incident-response/mid-depth/index.md) - Responding to security incidents
- [Supply Chain Security](../../supply-chain-security/mid-depth/index.md) - Managing secrets in dependencies and CI/CD
