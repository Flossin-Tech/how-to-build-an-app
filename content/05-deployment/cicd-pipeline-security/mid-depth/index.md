---
title: "CI/CD Pipeline Security"
phase: "05-deployment"
topic: "cicd-pipeline-security"
depth: "mid-depth"
reading_time: 25
prerequisites: ["infrastructure-as-code", "access-control"]
related_topics: ["deployment-strategy", "supply-chain-security", "secret-management"]
personas: ["generalist-leveling-up", "specialist-expanding", "yolo-dev"]
updated: "2025-11-16"
---

# CI/CD Pipeline Security: Building Trustworthy Deployments

Your deployment pipeline is infrastructure. Like all infrastructure, it needs security controls. Unlike application code, pipeline compromises let attackers deploy whatever they want to production without triggering your normal security reviews.

This section covers practical patterns for securing CI/CD systems using industry frameworks and real-world lessons from breaches.

## SLSA Framework: Supply-chain Levels for Software Artifacts

SLSA (rhymes with "salsa") is a security framework from Google that defines increasing levels of supply chain integrity. Think of it like HTTPS padlock indicators - SLSA provides assurance about how software was built.

### SLSA Level 0: No Guarantees

**What it means:** You run code but have no idea how it was built or if it's what the developer intended.

**Example:**
- Download a binary from a website
- `curl https://example.com/install.sh | bash`
- Manual builds on developer laptops

**Risks:**
- Build artifact could be different from source code
- Attacker could have modified the binary
- No audit trail of build process

This is where most software starts. It's not inherently evil, but you're trusting blindly.

### SLSA Level 1: Build Process Exists

**Requirements:**
- Build process is fully scripted/automated
- Provenance (metadata) generated describing what was built

**What this gives you:**
- Documentation of build steps
- Ability to reproduce builds
- Basic audit trail

**Example:**
```yaml
# .github/workflows/build.yml
name: Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: make build
      - name: Generate provenance
        run: |
          echo "Built from commit: $GITHUB_SHA" > provenance.json
          echo "Built at: $(date)" >> provenance.json
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: my-app
          path: |
            dist/
            provenance.json
```

**Value:** You can answer "How was this built?" Instead of "I think Sarah built it on her laptop Tuesday," you have recorded evidence.

**Limitation:** Provenance is just a text file. Anyone could create it. There's no signature proving it's legitimate.

### SLSA Level 2: Signed Provenance

**Additional requirements:**
- Build service generates provenance (not the build script)
- Provenance is signed so it can't be tampered with
- Consumers can verify the signature

**What this gives you:**
- Cryptographic proof of build metadata
- Tamper detection
- Assurance the build happened on the declared platform

**Implementation with GitHub Actions:**

GitHub Actions can generate signed attestations automatically:

```yaml
name: Build with attestation
on: [push]

permissions:
  id-token: write  # Required for signing
  contents: read
  attestations: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build artifact
        run: npm run build

      - name: Generate artifact attestation
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: 'dist/my-app.tar.gz'
```

This generates a signed statement:
- Who built it (GitHub Actions workflow)
- When it was built
- What source commit was used
- What build steps ran

The signature is stored in a public transparency log (Sigstore Rekor) that anyone can verify.

**Verification:**

```bash
# Anyone can verify the attestation
gh attestation verify dist/my-app.tar.gz \
  --owner myorg
```

If the artifact was tampered with after building, verification fails.

**Real-world value:** Suppose an attacker compromises your artifact storage (S3, Artifactory, container registry). They can replace your binary with a malicious one, but they can't forge the signature. When you verify before deploying, you catch the tampering.

### SLSA Level 3: Hardened Build Platform

**Additional requirements:**
- Build environment is isolated (ephemeral, doesn't persist state)
- Source and build provenance are tracked
- Build parameters are recorded

**What this prevents:**
- Persistent compromises of build infrastructure
- Builds that depend on ambient state (previous builds, local files)
- Secret leaks between builds

**Example (GitHub Actions):**

GitHub Actions already provides isolation - each job runs in a fresh VM that's destroyed after completion. To reach SLSA 3, you need to additionally:

1. **Pin all dependencies** (covered in surface level)
2. **Record all build parameters**
3. **Prevent external network access during build** (optional but stronger)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: gcr.io/distroless/static@sha256:specific-digest

    steps:
      - uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab
        with:
          ref: ${{ github.sha }}  # Explicit commit

      - name: Build in isolated environment
        run: |
          # All dependencies pinned in go.mod/package-lock.json
          make build
        env:
          # No credentials available during build
          # Only pulled from secrets store at deploy time
          NETWORK_ISOLATION: true
```

**Why isolation matters:**

In 2020, researchers demonstrated "SolarWinds-style" attacks where compromising a single build server could inject malware into every subsequent build. Ephemeral build environments prevent this - if an attacker compromises one build, it doesn't affect the next build (which runs on fresh infrastructure).

### SLSA Level 4: Hermetic Builds (Advanced)

Level 4 requires hermetic builds: builds that can't be influenced by external state. This is genuinely hard and mostly used by organizations like Google, where builds are reproducible bit-for-bit.

We'll cover this in deep-water. For most organizations, **SLSA 3 is the realistic target**.

## Artifact Signing with Sigstore

Sigstore is an open-source project (Linux Foundation) providing free artifact signing infrastructure. Think of it as "Let's Encrypt for code signing."

### The Problem Sigstore Solves

Traditionally, signing code requires:
1. Generate and protect a long-lived private key
2. Get a code signing certificate from a CA (costs money)
3. Securely distribute and rotate keys
4. Manage key expiration

This is complex and expensive. Most developers don't do it.

Sigstore makes signing easy:
1. No long-lived keys - uses short-lived certificates
2. Free and automated
3. Integrates with existing identity providers (GitHub, Google, Microsoft)
4. Signatures stored in public transparency logs for auditability

### Components

**Cosign:** Tool for signing and verifying container images and artifacts

**Rekor:** Public transparency log (like Certificate Transparency for code)

**Fulcio:** Certificate authority that issues short-lived certificates

### How It Works

When you sign an artifact:

1. Authenticate with Fulcio using OIDC (GitHub, Google, etc.)
2. Fulcio issues a short-lived certificate (valid ~10 minutes)
3. Use the certificate to sign the artifact
4. Signature and certificate are uploaded to Rekor (transparency log)
5. Private key is discarded (only existed for minutes)

When someone verifies:

1. Download artifact and signature
2. Check signature against Rekor log
3. Verify the OIDC identity in the certificate matches expected value
4. Confirm artifact hasn't been tampered with

### Practical Example: Signing Container Images

```bash
# Install cosign
go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# Sign a container image (uses keyless signing)
# This will open a browser to authenticate via OIDC
cosign sign myregistry.io/myapp:v1.2.3

# Verify the image
cosign verify myregistry.io/myapp:v1.2.3 \
  --certificate-identity=user@example.com \
  --certificate-oidc-issuer=https://github.com/login/oauth
```

**In CI/CD:**

```yaml
# GitHub Actions with Cosign
jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      packages: write

    steps:
      - name: Build image
        run: docker build -t myregistry.io/myapp:${{ github.sha }} .

      - name: Push image
        run: docker push myregistry.io/myapp:${{ github.sha }}

      - name: Sign image
        run: |
          cosign sign --yes myregistry.io/myapp:${{ github.sha }}
```

This signs the image with GitHub's identity. Anyone can verify the image came from your repository's GitHub Actions workflow.

### Policy Enforcement

In Kubernetes, you can require all deployed images be signed:

```yaml
# Using Sigstore Policy Controller
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: require-signed-images
spec:
  images:
  - glob: "myregistry.io/**"
  authorities:
  - keyless:
      identities:
      - issuer: https://github.com/login/oauth
        subject: https://github.com/myorg/myrepo/.github/workflows/build.yml@refs/heads/main
```

This policy says: "Only deploy images from myregistry.io if they were signed by the specified GitHub Actions workflow."

**Result:** Attackers can't push malicious images to your registry and have them deployed. Even if they compromise registry credentials, unsigned images get rejected.

## Secrets Management Patterns

The CircleCI breach exposed a fundamental question: should CI/CD systems store secrets at all?

### Pattern 1: Centralized Secret Manager (Traditional)

**How it works:**
- Secrets stored in CI platform (GitHub Secrets, GitLab CI Variables)
- Pipeline jobs pull secrets at runtime
- Secrets encrypted at rest, masked in logs

**Example:**
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET }}
        run: terraform apply
```

**Pros:**
- Simple to set up
- Centralized management
- Works with any cloud provider

**Cons:**
- Long-lived credentials are stored somewhere (attack target)
- If CI platform is compromised, all secrets exposed (CircleCI scenario)
- Secrets must be rotated manually
- No way to enforce "this job can only access production for 10 minutes"

### Pattern 2: Workload Identity (Modern)

**How it works:**
- No secrets stored in CI/CD platform
- Pipeline authenticates using OIDC (temporary tokens)
- Cloud provider verifies the token and grants short-lived credentials
- Credentials expire after minutes/hours

**Example (GitHub Actions → AWS):**

```yaml
# Configure OIDC trust in AWS IAM first
# Then in workflow:
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC

    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
          aws-region: us-east-1
          # No secret keys needed!

      - name: Deploy
        run: |
          # AWS SDK automatically uses temporary credentials
          aws s3 sync ./dist s3://my-bucket
```

**What happens behind the scenes:**
1. GitHub Actions requests an OIDC token from GitHub
2. Token contains claims: repository, workflow, branch, etc.
3. GitHub Actions sends token to AWS STS (Security Token Service)
4. AWS validates token signature with GitHub's public keys
5. If token claims match IAM role trust policy, AWS issues temporary credentials (valid ~1 hour)
6. Workflow uses credentials, then they expire

**Pros:**
- No long-lived secrets stored anywhere
- Even if CI platform is compromised, attacker gets nothing permanent
- Fine-grained access control (can specify "only main branch can deploy prod")
- Automatic rotation (credentials expire)
- Audit trail of which workflows accessed which resources

**Cons:**
- More complex initial setup
- Not all cloud providers support it yet (though AWS, GCP, Azure all do)
- Debugging is harder (credentials are ephemeral)

**Trust policy example:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

This says: "Only allow workflows from myorg/myrepo's main branch to assume this role."

**When to use workload identity:**
- New projects (no legacy credential debt)
- Cloud-native deployments (AWS, GCP, Azure)
- High-security requirements
- Projects with compliance mandates

**When to stick with secret managers:**
- Third-party services that don't support OIDC (many SaaS tools)
- Legacy systems
- Multi-cloud with inconsistent OIDC support

### Pattern 3: Just-in-Time Secret Provisioning

For secrets that must be stored (third-party API keys, database passwords), provision them just-in-time rather than storing them permanently.

**Example with HashiCorp Vault:**

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Get database credentials
        id: vault
        uses: hashicorp/vault-action@v2
        with:
          url: https://vault.example.com
          method: jwt
          role: github-actions
          secrets: |
            secret/data/production/db password | DB_PASSWORD

      - name: Run migrations
        env:
          DB_PASSWORD: ${{ steps.vault.outputs.DB_PASSWORD }}
        run: |
          # Credentials valid for this job only
          npm run migrate
```

Vault creates a temporary database password when the job starts and revokes it when the job completes.

**Benefit:** Even if an attacker steals credentials from logs, they're already expired.

## Supply Chain Attack Scenarios

Understanding how CI/CD pipelines get compromised helps you design defenses.

### Scenario 1: Dependency Confusion

**Attack:**
1. Attacker sees you use internal package `@mycompany/auth-utils`
2. Attacker publishes public package with same name to npm
3. Your build system pulls the attacker's package instead of your internal one
4. Malicious code runs during build, exfiltrates secrets

**Defense:**
```yaml
# .npmrc
@mycompany:registry=https://npm.pkg.github.com/
```

Configure scoped packages to use your private registry exclusively.

**Additional protection:**
```yaml
# package.json - use exact versions
{
  "dependencies": {
    "@mycompany/auth-utils": "1.2.3"  // not ^1.2.3 or ~1.2.3
  }
}
```

### Scenario 2: Compromised Action/Plugin

**Attack:**
1. You use third-party GitHub Action: `third-party/deploy-action@v1`
2. Attacker compromises third-party's repository
3. Attacker pushes malicious update to v1 tag
4. Your pipeline automatically pulls the malicious version
5. Action exfiltrates `${{ secrets.DEPLOY_KEY }}`

**Defense:**

Pin to commit hash instead of tag:

```yaml
# Before (vulnerable)
- uses: third-party/deploy-action@v1

# After (protected)
- uses: third-party/deploy-action@8e5e7e5ab8b370d6c329ec480221332ada57f0ab  # v1.2.3
```

Tags can move. Commit hashes can't.

**Monitoring:**

Use Dependabot or Renovate to get PRs when new versions are available. Review changes before updating the hash.

### Scenario 3: Pull Request from Fork

**Attack:**
1. Attacker forks your public repository
2. Creates PR that modifies workflow to exfiltrate secrets
3. If workflows run on PR from fork with secret access, game over

**Defense:**

GitHub Actions provides different trigger contexts:

```yaml
# DANGEROUS - runs on all PRs with full secret access
on: [pull_request]

# SAFER - only runs on PRs from non-forked branches
on:
  pull_request:
  pull_request_target:  # Runs in base branch context

# Or require manual approval for fork PRs
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy:
    # Prevent running on forks
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
```

**Additional protection:**

```yaml
# Use environment protection rules
jobs:
  deploy:
    environment: production  # Requires manual approval
    runs-on: ubuntu-latest
```

Configure the `production` environment to require review from specific teams.

## Practical Security Checklist

### Level 1: Baseline (Should Do This Week)

- [ ] Store all secrets in CI platform's secret manager (not in code)
- [ ] Require code review for workflow/pipeline changes (CODEOWNERS)
- [ ] Pin third-party actions to commit hashes
- [ ] Enable dependency scanning (Dependabot, Snyk, etc.)
- [ ] Enable secret scanning in repositories
- [ ] Scope secrets to specific jobs/environments
- [ ] Rotate any secrets that were ever committed to version control

### Level 2: Hardening (Should Do This Month)

- [ ] Implement workload identity instead of long-lived credentials (AWS, GCP, Azure)
- [ ] Configure branch protection rules requiring status checks before merge
- [ ] Set up artifact attestation (SLSA 2) for production builds
- [ ] Implement container image signing with Cosign
- [ ] Enable audit logging for CI/CD platform
- [ ] Document incident response plan for compromised pipeline
- [ ] Test rollback procedures for malicious deployments

### Level 3: Advanced (Ongoing)

- [ ] Achieve SLSA Level 3 for critical services
- [ ] Implement policy enforcement (e.g., only signed images deploy)
- [ ] Set up monitoring/alerting for unusual pipeline behavior
- [ ] Conduct supply chain threat modeling
- [ ] Implement network isolation for build environments
- [ ] Use hermetic builds where reproducibility matters
- [ ] Regular penetration testing of CI/CD infrastructure

## When Things Go Wrong

### Incident: Compromised CI/CD Secret

**Symptoms:**
- Unusual deployments to production
- Unexpected AWS bills (someone mining crypto with your credentials)
- Security alerts about API calls from unknown IPs
- Third-party service reports unauthorized access

**Immediate actions:**

1. **Revoke compromised credentials** (AWS keys, API tokens, etc.)
2. **Suspend pipeline** to prevent further damage
3. **Audit recent deployments** - what got deployed in the window of compromise?
4. **Check access logs** - what did the attacker access?
5. **Rotate all related secrets** (principle: if one secret leaked, assume others might have)

**Investigation:**

```bash
# AWS: Check CloudTrail for unauthorized API calls
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA... \
  --start-time 2024-01-01T00:00:00 \
  --end-time 2024-01-15T23:59:59

# GitHub: Audit log for workflow runs
gh api /repos/OWNER/REPO/actions/runs \
  --jq '.workflow_runs[] | select(.created_at > "2024-01-01")'
```

**Recovery:**

1. Deploy known-good version from before compromise
2. Implement lessons learned (workload identity, better secret scoping, etc.)
3. Document incident for future reference
4. Notify stakeholders if customer data may have been accessed

### Incident: Malicious Dependency in Build

**Symptoms:**
- Build starts failing unexpectedly
- Unusual network traffic from build runners
- Build artifacts contain unexpected files
- Anti-virus flags build artifacts

**Response:**

1. **Isolate** - Stop using the suspicious dependency
2. **Investigate** - Check dependency source (GitHub repo, npm package, etc.)
3. **Scan** - Run malware scanners on recent build artifacts
4. **Rebuild** - Rebuild from clean dependencies
5. **Report** - Report malicious package to registry (npm, PyPI, etc.)

**Prevention going forward:**

- Pin all dependencies to known-good versions
- Review dependency changes before accepting Dependabot PRs
- Use private registries for internal packages
- Implement artifact scanning in pipeline

## Cost-Benefit Analysis

**Time investment:**
- Basic security (Level 1): 4-8 hours initial setup, 1 hour/month maintenance
- Hardening (Level 2): 2-3 days initial, 4 hours/month
- Advanced (Level 3): 1-2 weeks initial, 1 day/month

**Risk reduction:**
- Level 1: Prevents ~80% of opportunistic attacks
- Level 2: Prevents ~95% of targeted attacks
- Level 3: Prevents sophisticated supply chain attacks

**Real cost of a breach:**
- CircleCI customers: weeks of engineering time rotating secrets
- SolarWinds: ~$100M in costs, permanent reputation damage
- CodeCov: 29,000 customers potentially compromised

Even a small chance of avoiding one breach justifies the investment.

## Where to Go From Here

This mid-depth coverage gives you production-ready CI/CD security for most organizations. You understand:
- SLSA levels and why they matter
- How to sign artifacts with Sigstore
- Workload identity vs. stored secrets
- Common attack scenarios and defenses
- Practical implementation checklist

**For security engineers and platform teams** building enterprise CI/CD infrastructure, the deep-water level covers:
- SLSA 4 hermetic builds and reproducibility
- Advanced supply chain attack analysis
- Policy-as-code enforcement (OPA, Kyverno)
- Zero-trust architectures
- Incident response playbooks

**For most teams,** staying at this level is appropriate. Focus on:
1. Getting to SLSA 2 (signed provenance)
2. Moving to workload identity
3. Actually doing the checklist items above

Perfect security is expensive. Good-enough security prevents real-world attacks.

---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Infrastructure as Code](../../infrastructure-as-code/mid-depth/index.md) - Related deployment considerations
- [Deployment Strategy](../../deployment-strategy/mid-depth/index.md) - Related deployment considerations
- [Access Control](../../access-control/mid-depth/index.md) - Related deployment considerations

### Navigate
- [← Back to Deployment Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
