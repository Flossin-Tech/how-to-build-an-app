---
title: "CI/CD Pipeline Security"
phase: "05-deployment"
topic: "cicd-pipeline-security"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["infrastructure-as-code", "access-control", "supply-chain-security"]
personas: ["new-developer", "yolo-dev", "busy-developer"]
updated: "2025-11-16"
---

# CI/CD Pipeline Security

Your CI/CD pipeline is a deployment machine with production credentials. If attackers compromise it, they deploy malicious code directly to production under your company's name.

This happens more than you think.

## What This Is

CI/CD pipeline security protects the automated systems that build, test, and deploy your code. Your pipeline probably has access to:

- Source code repositories
- Production deployment credentials
- Cloud provider API keys
- Database connection strings
- Third-party service tokens
- Container registries
- Customer data (if you test with real data)

That's everything an attacker needs to own your infrastructure.

## Why Pipelines Are Targeted

In December 2022, CircleCI announced that attackers had stolen customer secrets by compromising an employee's laptop and escalating access to production systems. Thousands of companies had to rotate credentials and investigate whether attackers had deployed backdoors via CI/CD.

Attackers love CI/CD systems because:
- One compromise grants access to everything the pipeline touches
- Pipeline code often runs with elevated privileges
- Secrets are centralized in one place
- Changes to pipeline configs might not be reviewed as carefully as application code
- Pipelines run automatically, potentially deploying malicious code without human review

## Minimum Viable Security

### 1. Never Commit Secrets

This is the most common mistake and the easiest to fix.

**Bad:**
```yaml
# .github/workflows/deploy.yml
- name: Deploy
  run: aws s3 sync . s3://my-bucket
  env:
    AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
    AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Secrets in code get pushed to version control. Even if you delete the commit, they're in the Git history forever. Assume they're compromised immediately.

**Better:**
```yaml
# .github/workflows/deploy.yml
- name: Deploy
  run: aws s3 sync . s3://my-bucket
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

Store secrets in your CI platform (GitHub Secrets, GitLab CI Variables, Jenkins Credentials). They're encrypted at rest and masked in logs.

**Best:**
Use workload identity (GitHub Actions OIDC, Google Workload Identity, AWS IAM Roles for Service Accounts) where the CI platform proves its identity to cloud providers without storing long-lived credentials at all.

### 2. Review Pipeline Changes Like Code

Pipeline configurations are code. Treat them that way.

```yaml
# Require pull request reviews for workflow changes
# In .github/CODEOWNERS:
/.github/workflows/  @security-team @platform-team
```

A malicious pipeline change could:
- Exfiltrate secrets to attacker-controlled servers
- Deploy backdoors to production
- Modify source code before building
- Disable security scans

Don't let pipeline changes bypass code review.

### 3. Pin Dependency Versions

CI/CD pipelines pull third-party actions, Docker images, and build tools. Those can change.

**Vulnerable:**
```yaml
- uses: actions/checkout@v3  # What if v3 gets compromised?
- uses: docker://nginx:latest  # "latest" is a moving target
```

**Safer:**
```yaml
# Pin to specific commit hash
- uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab  # v3.5.2
# Pin to digest
- uses: docker://nginx@sha256:104c7c5c583191e...
```

When you pin to a hash or digest, you're using exactly the version you tested. Updates happen explicitly, not by surprise.

### 4. Limit Blast Radius

**Principle of least privilege:** Give each pipeline job only the permissions it needs.

For example, a "test" job doesn't need production deployment credentials. A "build" job doesn't need write access to your repository.

Many CI platforms let you scope secrets:
```yaml
# GitHub Actions: environment-specific secrets
jobs:
  test:
    runs-on: ubuntu-latest
    # No production secrets accessible here

  deploy:
    runs-on: ubuntu-latest
    environment: production  # Only this job gets prod secrets
```

If an attacker compromises your test job, they can't automatically access production.

### 5. Scan Before Deploy

Your pipeline should catch problems before they reach production.

Minimum checks:
- **Dependency scanning** - Find known vulnerabilities in packages
- **Secret scanning** - Catch accidentally committed credentials
- **Container scanning** - Check base images for CVEs

Most of these are free:
```yaml
# GitHub Actions has built-in secret scanning
# Add dependency scanning:
- name: Run Snyk
  run: npx snyk test

# Add container scanning:
- name: Scan image
  run: docker scan my-app:latest
```

False positives happen, but catching one real secret leak pays for reviewing 100 false alarms.

## Red Flags

### Your Pipeline Might Be Insecure If:

- Secrets are hard-coded in workflow files or scripts
- Anyone with repository write access can modify workflows without review
- You use `actions/checkout@latest` or `FROM ubuntu:latest`
- Production credentials are available to all jobs
- Pipeline logs contain unmasked secrets
- You've never rotated CI/CD secrets
- Third-party actions run with unlimited permissions
- Dependencies are pulled from public repositories without verification

### The CircleCI Breach in Practice

After the CircleCI breach, companies had to:
1. Rotate every secret stored in CircleCI (thousands of credentials)
2. Audit all deployments from Dec 16-Jan 4 for backdoors
3. Review access logs to determine if attackers used stolen credentials
4. Investigate whether customer data was accessed
5. Notify customers about the breach

The breach happened because an attacker compromised an employee's laptop and escalated privileges. CircleCI's security controls didn't prevent lateral movement to production secret storage.

The lesson: pipeline security is infrastructure security. Defense in depth matters.

## What Success Looks Like

You have basic CI/CD pipeline security when:

1. **No secrets in code** - Version control is clean
2. **Pipeline changes are reviewed** - CODEOWNERS enforces this
3. **Dependencies are pinned** - Actions and images use hashes/digests
4. **Permissions are scoped** - Test jobs can't deploy to production
5. **Scans are automated** - Every build checks for vulnerabilities
6. **Secrets are rotated** - You have a process for credential rotation
7. **Logs are sanitized** - Secrets don't appear in build output

This won't stop nation-state attackers, but it will stop opportunistic compromises and most real-world threats.

## Where to Go Next

**Surface-level practice is enough for most teams.** If you:
- Store secrets in your CI platform's secret manager
- Require reviews for workflow changes
- Pin dependencies to specific versions
- Scope credentials to jobs that need them
- Run basic security scans

...you're ahead of 80% of projects.

For teams with higher security requirements (handling sensitive data, compliance mandates, high-value targets), the mid-depth level covers:
- SLSA framework levels for build provenance
- Artifact signing with Sigstore
- Advanced secrets management patterns (workload identity, short-lived credentials)
- Pipeline isolation techniques
- Audit logging and monitoring

For security engineers building enterprise CI/CD platforms, the deep-water level covers:
- SLSA 4 hermetic builds
- Supply chain attack analysis
- Policy enforcement with OPA/Kyverno
- Zero-trust architectures for CI/CD
- Incident response for pipeline compromises

---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Infrastructure as Code](../../infrastructure-as-code/surface/index.md) - Related deployment considerations
- [Deployment Strategy](../../deployment-strategy/surface/index.md) - Related deployment considerations
- [Access Control](../../access-control/surface/index.md) - Related deployment considerations

### Navigate
- [← Back to Deployment Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
