---
title: "Supply Chain Security: Building Zero-Trust Dependency Programs"
phase: "03-development"
topic: "supply-chain-security"
depth: "deep-water"
reading_time: 45
prerequisites: []
related_topics: ["secure-coding-practices", "secret-management", "dependency-review", "deployment-strategy", "incident-response"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Supply Chain Security: Building Zero-Trust Dependency Programs

When the SolarWinds breach was discovered in December 2020, organizations worldwide realized that digitally signed, trusted software updates could be Trojan horses. When Log4Shell hit exactly one year later, organizations without dependency visibility spent weeks identifying exposure while attackers exploited the vulnerability.

The supply chain is the most efficient attack vector. Compromise one popular package and you've compromised thousands of applications. At enterprise scale, you need programs, not just tools.

This guide covers building supply chain security programs that assume compromise is inevitable and focus on detection, containment, and rapid response.

## Supply Chain Threat Landscape

Understanding attacker motivations and techniques informs defensive strategy.

### Attack Patterns and Motivations

**Dependency confusion attacks**: Exploiting how package managers resolve dependencies between public and private registries. If you have an internal package `@yourcompany/auth-utils`, attackers can publish a public package with the same name. Misconfigured package managers might install the public (malicious) version instead of your internal one.

Real incidents:
- 2021: Security researcher Alex Birsan demonstrated this against 35+ companies including Apple, Microsoft, Tesla
- Attacker profit: Bug bounties paid out over $130k for responsibly disclosed confusion vulnerabilities

**Typosquatting and combosquatting**: Registering package names similar to popular packages.
- `crossenv` instead of `cross-env` (2017, stole environment variables)
- `electorn` instead of `electron`
- `pythoon` packages targeting Python developers
- 2022: Over 200 malicious PyPI packages removed in single sweep

**Malicious package injection**: Compromising maintainer accounts or convincing maintainers to transfer ownership.
- `event-stream` (2018): New maintainer added code targeting cryptocurrency wallets, 2M weekly downloads
- `ua-parser-js` (2021): Compromised maintainer account, published versions with crypto miners
- `coa` and `rc` (2021): Compromised simultaneously, same attacker pattern
- `colors.js` and `faker.js` (2022): Maintainer intentionally sabotaged own packages

**Build system compromises**: Targeting the build and release pipeline.
- SolarWinds (2020): Build server compromised, malicious code injected into official releases
- Codecov (2021): Bash Uploader script modified to exfiltrate environment variables from CI builds
- php.git server (2021): Unauthorized commits in official PHP repository

**Subdomain takeovers affecting package ecosystems**:
- Package hosting on S3 buckets that were later deleted
- DNS records pointing to expired domains
- CDNs serving package assets from unclaimed subdomains

### Attacker Objectives

**Cryptocurrency theft**: Most common motivation for npm malware
- Targeting cryptocurrency wallet credentials
- Environment variable exfiltration (AWS keys often used for crypto mining)
- Browser password and credential theft

**Espionage**: State-sponsored and corporate
- SolarWinds targeted government agencies and major corporations
- Long-term persistent access
- Selective activation (only trigger malicious behavior for specific targets)

**Supply chain poisoning**: Using initial compromise as stepping stone
- Modify build processes to inject backdoors
- Steal signing certificates
- Compromise CI/CD credentials for further access

**Ransomware delivery**: Supply chain as distribution mechanism
- NotPetya (2017) distributed via Ukrainian accounting software update
- Broader than just packages, but shows the pattern

**Testing and research**: Not all malicious packages are truly malicious
- Security researchers demonstrating vulnerabilities
- Penetration testers assessing client security
- Still disruptive even if well-intentioned

### Why Supply Chain Attacks Work

1. **Transitive trust**: Developers trust packages, packages trust their dependencies
2. **Update fatigue**: Too many alerts leads to ignoring them all
3. **Assumption of safety**: "npm/PyPI wouldn't allow malicious packages"
4. **Lack of visibility**: Organizations don't know what dependencies they have
5. **Time pressure**: Shipping features prioritized over security review
6. **Single maintainer risk**: Many popular packages maintained by volunteers
7. **Weak verification**: Package registries have limited vetting processes

## SLSA Framework (Supply-chain Levels for Software Artifacts)

SLSA (pronounced "salsa") is an industry framework for supply chain integrity developed by Google and the OpenSSF. It provides graduated levels of assurance about how software is built.

### SLSA Levels

**Level 0**: No guarantees (most software today)
- No build process documentation
- No provenance
- No verification

**Level 1**: Build process exists and is documented
- Provenance showing how artifact was built
- Provenance available to consumers
- Minimal integrity guarantees

**Level 2**: Signed provenance generated by build service
- Provenance generated by trusted build service (not developer machine)
- Build service has authenticated identity
- Provenance cryptographically signed
- Prevents tampering after build

**Level 3**: Hardened build platform with isolation
- Source and build platform audited
- Provenance prevents unauthorized modification
- Builds run in ephemeral, isolated environments
- Strong guarantees about build integrity

**Level 4**: Two-party review of all changes (highest level)
- All changes reviewed and approved (no single committer can bypass)
- Hermetic, reproducible builds
- Complete auditability
- Maximum assurance

Most organizations operate at Level 0 or 1. Level 3+ requires significant infrastructure investment but provides strong guarantees.

### SLSA in Practice

**Generating provenance**:

Using GitHub Actions with SLSA provenance generation:
```yaml
name: SLSA Build and Provenance

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  id-token: write  # Required for provenance generation

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: |
          npm ci
          npm run build

      - name: Generate provenance
        uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0
        with:
          base64-subjects: "${{ needs.build.outputs.digest }}"
```

This generates a provenance attestation showing:
- What was built
- When and by whom
- What process was used
- Dependencies included
- Build environment details

**Verifying provenance**:
```bash
# Install SLSA verifier
go install github.com/slsa-framework/slsa-verifier/v2/cli/slsa-verifier@latest

# Verify artifact against provenance
slsa-verifier verify-artifact \
  --provenance-path attestation.intoto.jsonl \
  --source-uri github.com/yourorg/yourrepo \
  artifact.tar.gz
```

### Implementing SLSA

**Level 1 (achievable immediately)**:
1. Document build process in `BUILD.md`
2. Generate basic SBOM during builds
3. Publish both artifact and SBOM together

**Level 2 (requires build service)**:
1. Move builds from developer machines to CI/CD (GitHub Actions, GitLab CI)
2. Generate signed provenance using build service identity
3. Use OIDC tokens for keyless signing (via Sigstore)
4. Publish provenance alongside artifacts

**Level 3 (requires infrastructure)**:
1. Isolated, ephemeral build environments (containers, VMs destroyed after build)
2. Audited source and build platform
3. Hermetic builds (all dependencies declared, no network access during build)
4. Cryptographic verification at every step

**Level 4 (organizational change)**:
1. Mandatory code review (no direct commits to main)
2. Branch protection rules enforced
3. Reproducible builds (same input = same output bytecode)
4. Complete audit trail from commit to artifact

## Software Bill of Materials (SBOM) Deep Dive

SBOMs are the foundation of supply chain visibility. Without an SBOM, you can't answer "Are we affected by CVE-XXXX-YYYY?"

### CycloneDX vs SPDX Format Comparison

**CycloneDX** (security-focused):
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": {
    "timestamp": "2025-11-15T10:30:00Z",
    "component": {
      "type": "application",
      "name": "my-api",
      "version": "2.1.0"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "express",
      "version": "4.18.2",
      "purl": "pkg:npm/express@4.18.2",
      "licenses": [{"license": {"id": "MIT"}}],
      "hashes": [
        {
          "alg": "SHA-256",
          "content": "abc123..."
        }
      ]
    }
  ],
  "dependencies": [
    {
      "ref": "pkg:npm/express@4.18.2",
      "dependsOn": [
        "pkg:npm/body-parser@1.20.1",
        "pkg:npm/cookie@0.5.0"
      ]
    }
  ]
}
```

Advantages:
- Native support for VEX (Vulnerability Exploitability eXchange)
- Smaller file sizes
- Designed for security automation
- Strong tooling ecosystem (Dependency-Track, OWASP CycloneDX)

**SPDX** (license compliance-focused):
```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "my-api-2.1.0",
  "documentNamespace": "https://example.com/my-api-2.1.0",
  "creationInfo": {
    "created": "2025-11-15T10:30:00Z",
    "creators": ["Tool: syft-0.98.0"]
  },
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-express",
      "name": "express",
      "versionInfo": "4.18.2",
      "licenseConcluded": "MIT",
      "checksums": [
        {
          "algorithm": "SHA256",
          "checksumValue": "abc123..."
        }
      ]
    }
  ]
}
```

Advantages:
- ISO standard (ISO/IEC 5962:2021)
- Mature license compliance tooling
- Better for legal analysis
- Government acceptance (NTIA, FDA)

**Which to use?**
- Security/vulnerability focus: CycloneDX
- License compliance focus: SPDX
- Maximum compatibility: Generate both (Syft can do this)
- Regulation requirement: Check specific requirements (often accept both)

### SBOM Generation Tools Comparison

**Syft** (my recommendation for breadth):
```bash
# Install
brew install syft

# Generate CycloneDX
syft packages . -o cyclonedx-json > sbom.cdx.json

# Generate SPDX
syft packages . -o spdx-json > sbom.spdx.json

# For container images
syft packages nginx:latest -o cyclonedx-json

# Multiple formats at once
syft packages . -o cyclonedx-json=sbom.cdx.json -o spdx-json=sbom.spdx.json
```

Supports: Container images, filesystems, archives, language packages (npm, pip, go, cargo, maven, etc.)

**CycloneDX CLI tools**:
```bash
# Node.js
npm install -g @cyclonedx/cyclonedx-npm
cyclonedx-npm --output-file sbom.json

# Python
pip install cyclonedx-bom
cyclonedx-py -o sbom.json

# Java (Maven)
# Add to pom.xml
<plugin>
  <groupId>org.cyclonedx</groupId>
  <artifactId>cyclonedx-maven-plugin</artifactId>
  <version>2.7.10</version>
</plugin>

# Then run
mvn cyclonedx:makeAggregateBom
```

**SPDX tools**:
```bash
# Microsoft SBOM Tool (multi-language)
curl -Lo sbom-tool https://github.com/microsoft/sbom-tool/releases/latest/download/sbom-tool-linux-x64
chmod +x sbom-tool
./sbom-tool generate -b . -bc . -pn MyApp -pv 1.0.0

# SPDX Python tools
pip install spdx-tools
spdx-tools generate -f json -o sbom.spdx.json
```

**Trivy** (container-focused):
```bash
# Install
brew install trivy

# Generate SBOM from image
trivy image --format cyclonedx --output sbom.cdx.json nginx:latest

# Also scans for vulnerabilities
trivy image --format json nginx:latest
```

### SBOM Analysis and Vulnerability Matching

Once you have an SBOM, you can:

**1. Identify vulnerable components**:
```bash
# Using Grype with SBOM
grype sbom:sbom.cdx.json

# Output shows vulnerabilities found in SBOM
┌────────────┬──────────────────┬──────────┬────────┬───────────────────┐
│   Library  │  Vulnerability   │ Severity │ Status │   Fix Available   │
├────────────┼──────────────────┼──────────┼────────┼───────────────────┤
│ express    │ CVE-2024-XXXXX   │ High     │ Active │ 4.18.3            │
└────────────┴──────────────────┴──────────┴────────┴───────────────────┘
```

**2. Analyze dependency relationships**:
```bash
# CycloneDX CLI analysis
cyclonedx-cli analyze --input sbom.cdx.json --vulnerabilities

# Dependency-Track (web UI for SBOM management)
docker run -p 8080:8080 dependencytrack/bundled
# Upload SBOM, continuous monitoring
```

**3. Compare SBOMs over time**:
```bash
# Diff between versions
cyclonedx-cli diff \
  --from sbom-v1.0.0.json \
  --to sbom-v2.0.0.json
```

Shows what dependencies were added, removed, or updated between releases.

### SBOM in Incident Response

When a vulnerability is announced:

**Without SBOM**:
1. Search codebases manually for package references
2. Check each application's dependencies
3. Miss transitive dependencies
4. Days to weeks to identify exposure

**With SBOM**:
1. Query SBOM repository for affected package
2. Identify all applications containing it
3. Include transitive dependencies
4. Hours to identify exposure

Example query:
```bash
# Find all applications using log4j
grep -r "org.apache.logging.log4j" sbom-repository/*.json

# Or using Dependency-Track API
curl -X POST "https://dtrack.example.com/api/v1/component/search" \
  -H "X-Api-Key: $API_KEY" \
  -d '{"name": "log4j-core"}'
```

Returns list of applications, versions, and whether they're affected.

### Regulatory Requirements

**Executive Order 14028 (US Federal)**: Software vendors selling to federal government must provide SBOM.

**NTIA Minimum Elements**:
- Author name
- Component name
- Version
- Dependencies
- Unique identifier (PURL recommended)
- Timestamp

**EU Cyber Resilience Act**: Proposed requirement for SBOMs for products with digital elements.

**Healthcare (FDA)**: Increasingly requiring SBOMs for medical device software.

**Financial services**: Some regulators requesting SBOMs for critical systems.

Generating SBOMs proactively positions you for these requirements rather than scrambling when required.

## Advanced Dependency Scanning

Moving beyond basic vulnerability detection to intelligent risk assessment.

### SCA Tool Comparison (Enterprise)

**Snyk**:
- Strengths: Developer experience, IDE integration, auto-fix PRs, container scanning
- Pricing: Free tier available, paid scales with users
- Best for: Developer-focused teams, startups to enterprise
- Unique: AI-powered DeepCode analysis

**Sonatype Nexus Lifecycle**:
- Strengths: Policy enforcement, Java ecosystem depth, repository management integration
- Pricing: Enterprise-only
- Best for: Java-heavy organizations, enterprises with Artifactory/Nexus
- Unique: Firewall mode (block downloads of policy-violating components)

**JFrog Xray**:
- Strengths: Deep integration with Artifactory, recursive scanning, impact analysis
- Pricing: Enterprise-only
- Best for: Organizations already using Artifactory
- Unique: Scan artifacts after build but before promotion

**GitHub Advanced Security**:
- Strengths: Native GitHub integration, CodeQL for code scanning, secret scanning
- Pricing: Free for public repos, paid for private repos
- Best for: GitHub-native workflows
- Unique: Code scanning with semantic analysis (not just pattern matching)

**Mend (formerly WhiteSource)**:
- Strengths: License compliance, aggressive scanning, remediation advice
- Pricing: Enterprise-focused
- Best for: Regulated industries, large enterprises
- Unique: Extensive license policy engine

**Aqua Security**:
- Strengths: Container and Kubernetes security, runtime protection
- Pricing: Enterprise-only
- Best for: Cloud-native organizations, Kubernetes deployments
- Unique: Runtime protection beyond static scanning

### Reachability Analysis

Not all vulnerabilities are exploitable in your application. Reachability analysis determines if vulnerable code is actually called.

**The problem**:
```
Vulnerability found: CVE-2024-XXXX in lodash@4.17.19
Severity: High
Vulnerable function: _.template()
```

But if you never call `_.template()`, you're not actually vulnerable despite having the package.

**Reachability tools**:

**Snyk** (call graph analysis):
```bash
snyk test --reachable
```

Shows which vulnerabilities are reachable from your code.

**GitHub CodeQL** (semantic analysis):
```ql
// CodeQL query to find usage of vulnerable function
import javascript

from CallExpr call
where call.getCalleeName() = "template"
  and call.getReceiver().toString() = "_"
select call, "Usage of vulnerable lodash template function"
```

**Manual approach** (if tools unavailable):
1. Search codebase for vulnerable function name
2. Check if it's actually called
3. Trace execution paths
4. Determine if attacker-controlled data reaches vulnerable function

This doesn't mean you can ignore unreachable vulnerabilities - a refactor might make them reachable - but it helps prioritize patching.

### Exploit Prediction Scoring System (EPSS)

EPSS predicts the probability a CVE will be exploited in the wild within the next 30 days.

**CVSS vs EPSS**:
- CVSS: Technical severity (how bad is it if exploited?)
- EPSS: Probability (how likely is exploitation?)

A CVE could be CVSS 9.8 (critical) but EPSS 0.01% (very unlikely to be exploited). Conversely, a CVSS 6.5 (medium) with EPSS 80% is a higher priority.

**Using EPSS**:
```bash
# Query EPSS API
curl "https://api.first.org/data/v1/epss?cve=CVE-2021-44228" | jq

# Response
{
  "cve": "CVE-2021-44228",
  "epss": "0.97567",  # 97.5% probability
  "percentile": "0.99999"
}
```

**Prioritization matrix**:
```
High CVSS + High EPSS → Fix immediately
High CVSS + Low EPSS → Fix within SLA
Low CVSS + High EPSS → Investigate (might be targeted)
Low CVSS + Low EPSS → Schedule for maintenance
```

Tools like Snyk and GitHub Advanced Security are starting to incorporate EPSS scores.

### False Positive Management

SCA tools generate false positives. Managing them is critical to avoid alert fatigue.

**Common false positive types**:

1. **Version range mismatches**: Tool thinks you have 1.2.3, you actually have 1.2.4
2. **Vulnerability applies to different platform**: Windows vulnerability flagged on Linux-only deployment
3. **Vulnerability in unused optional feature**: Dependency has vulnerability in feature you don't use
4. **Backported patches**: Vendor backported fix without version bump

**Management strategies**:

**Snyk ignore**:
```bash
# Ignore specific vulnerability
snyk ignore --id=SNYK-JS-LODASH-1234567

# With reason and expiry
snyk ignore --id=SNYK-JS-LODASH-1234567 \
  --reason="Vulnerability in unused template function" \
  --expiry=2025-12-31
```

Creates `.snyk` policy file:
```yaml
ignore:
  SNYK-JS-LODASH-1234567:
    - '*':
        reason: Vulnerability in unused template function
        expires: 2025-12-31T00:00:00.000Z
```

**GitHub Dependency Review** (dismiss alert):
```yaml
# Dismiss via API
curl -X PATCH \
  "https://api.github.com/repos/owner/repo/dependabot/alerts/1" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{"state": "dismissed", "dismissed_reason": "tolerable_risk", "dismissed_comment": "Vulnerability not reachable in our usage"}'
```

**Centralized policy management**:
```yaml
# vulnerability-policy.yml
suppressions:
  - cve: CVE-2024-XXXXX
    reason: "Vulnerability in Node.js crypto module, we use OpenSSL 3.0+"
    expiry: "2025-12-31"
    approved_by: "security-team"

  - package: "lodash"
    version: "4.17.19"
    cve: CVE-2024-YYYYY
    reason: "Template function not used"
    reachability: false
```

**Key principle**: Document why you're ignoring, set expiry dates, require security team approval for critical severity.

## Private Package Registries

Private registries give you control over what dependencies developers can access.

### Registry Options

**npm Enterprise / GitHub Packages**:
```bash
# Configure npm to use GitHub Packages for @yourorg scope
echo "@yourorg:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc
```

**JFrog Artifactory** (enterprise standard):
- Central hub for all package types (npm, Maven, PyPI, Docker, etc.)
- Proxy/cache public registries
- Scan packages before developers download
- License and security policy enforcement

```yaml
# Artifactory virtual repository config
{
  "key": "npm-virtual",
  "packageType": "npm",
  "repositories": [
    "npm-local",      # Your internal packages
    "npm-remote"      # Proxy to public npm
  ],
  "description": "Virtual npm repository with security policies"
}
```

**Sonatype Nexus Repository**:
- Similar to Artifactory
- Free version available (Nexus Repository OSS)
- Integrates with Nexus Lifecycle for policy

**Verdaccio** (lightweight, open source):
```bash
# Run private npm registry
npm install -g verdaccio
verdaccio

# Configure
cat > ~/.config/verdaccio/config.yaml <<EOF
storage: ./storage
auth:
  htpasswd:
    file: ./htpasswd
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
  '@yourorg/*':
    access: $authenticated
    publish: $authenticated
  '**':
    proxy: npmjs
EOF
```

Good for small teams, less suitable for enterprise scale.

### Mirroring Public Registries

Benefits:
- Availability (if npm is down, you're not blocked)
- Performance (local cache)
- Security (scan before developers download)
- Audit trail (who downloaded what, when)

**Artifactory remote repository**:
```yaml
{
  "key": "npm-remote",
  "rclass": "remote",
  "packageType": "npm",
  "url": "https://registry.npmjs.org",
  "xrayIndex": true,  # Scan packages
  "description": "Proxy to npm with security scanning"
}
```

When developers install packages, Artifactory:
1. Checks if package is cached
2. If not, downloads from npm
3. Scans with Xray
4. Blocks if policy violations found
5. Caches if clean
6. Serves to developer

### Dependency Firewall

Block downloads of packages that violate security or license policies.

**Sonatype Nexus Firewall**:
```yaml
# Policy: Block packages with critical vulnerabilities
{
  "policyName": "Critical Vulnerabilities",
  "threatLevel": 1,
  "action": "BLOCK",
  "conditions": [
    {
      "type": "SECURITY_VULNERABILITY_CVSS_SCORE",
      "operator": "GREATER_THAN_OR_EQUAL",
      "value": 9.0
    }
  ]
}

# Policy: Block GPL licenses
{
  "policyName": "GPL License Block",
  "threatLevel": 3,
  "action": "BLOCK",
  "conditions": [
    {
      "type": "LICENSE",
      "operator": "MATCHES",
      "value": ["GPL-3.0", "AGPL-3.0"]
    }
  ]
}
```

Developer tries to install package → Firewall checks policies → Block or allow.

**Artifactory with Xray policies**:
```json
{
  "name": "security-policy",
  "type": "security",
  "rules": [
    {
      "name": "critical-vulnerabilities",
      "priority": 1,
      "criteria": {
        "min_severity": "Critical"
      },
      "actions": {
        "block_download": {
          "unscanned": true,
          "active": true
        },
        "notify_deployer": true
      }
    }
  ]
}
```

### Namespace Management

Prevent dependency confusion attacks by controlling package namespaces.

**Problem**: Public package `@yourorg/auth-utils` could shadow your private `@yourorg/auth-utils`.

**Solution 1: Private scope (npm)**:
```bash
# Reserve @yourorg scope on npm
npm access restricted @yourorg

# Publish scoped packages
npm publish --access restricted
```

**Solution 2: Registry priority**:
```bash
# .npmrc - always prefer private registry for @yourorg
@yourorg:registry=https://registry.yourcompany.com/
```

**Solution 3: Block public packages with your namespace**:
```yaml
# Artifactory policy
{
  "blockPublicPackagesWithOrgScope": true,
  "orgScopes": ["@yourorg", "@yourcompany"]
}
```

## Code Signing and Provenance

Cryptographically prove that artifacts are what they claim to be.

### Sigstore (Cosign, Rekor, Fulcio)

Sigstore is a free, keyless signing service. It solves the key management problem - you don't need to manage long-lived signing keys.

**How it works**:
1. Developer authenticates with OIDC (GitHub, Google, etc.)
2. Fulcio (CA) issues short-lived certificate
3. Cosign signs artifact
4. Signature and certificate logged to Rekor (transparency log)
5. Certificate expires (10 minutes)

No keys to manage, full auditability via transparency log.

**Signing container images**:
```bash
# Install cosign
brew install cosign

# Sign image (uses OIDC, no keys needed)
cosign sign docker.io/yourorg/app:latest

# OIDC flow opens browser, you authenticate
# Signature stored in registry alongside image

# Verify signature
cosign verify docker.io/yourorg/app:latest \
  --certificate-identity=you@example.com \
  --certificate-oidc-issuer=https://github.com/login/oauth
```

**Signing arbitrary artifacts**:
```bash
# Sign a binary
cosign sign-blob --bundle bundle.json artifact.tar.gz

# Verify
cosign verify-blob --bundle bundle.json \
  --certificate-identity=you@example.com \
  --certificate-oidc-issuer=https://github.com/login/oauth \
  artifact.tar.gz
```

**In CI/CD** (GitHub Actions):
```yaml
name: Sign and Publish

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  id-token: write  # Required for keyless signing
  packages: write

jobs:
  sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t ghcr.io/${{ github.repository }}:${{ github.sha }} .

      - name: Push image
        run: docker push ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image
        run: |
          cosign sign ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --yes  # Non-interactive mode
```

### in-toto Framework

in-toto provides supply chain layout specifications - defining what steps should happen and who can perform them.

**Layout example**:
```json
{
  "steps": [
    {
      "name": "build",
      "expected_command": ["npm", "run", "build"],
      "expected_materials": [["MATCH", "*", "FROM", "checkout"]],
      "expected_products": [["MATCH", "dist/*", "IN", "dist"]],
      "pubkeys": ["build-service-key"]
    },
    {
      "name": "test",
      "expected_command": ["npm", "test"],
      "expected_materials": [["MATCH", "dist/*", "FROM", "build"]],
      "pubkeys": ["test-service-key"]
    }
  ],
  "inspect": [
    {
      "name": "verify-tests-passed",
      "expected_materials": [["MATCH", "*", "FROM", "test"]]
    }
  ]
}
```

Each step generates signed metadata. Final verification checks:
- All required steps were performed
- Steps were performed by authorized keys
- Materials and products match expectations
- No unauthorized modifications

Implemented by SLSA Level 3+ systems.

### Build Attestations

Attestations are signed statements about artifacts.

**SLSA provenance attestation**:
```json
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "subject": [
    {
      "name": "pkg:docker/yourorg/app@sha256:abc123...",
      "digest": {"sha256": "abc123..."}
    }
  ],
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "predicate": {
    "builder": {"id": "https://github.com/actions/runner"},
    "buildType": "https://github.com/actions/workflow",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/yourorg/yourrepo",
        "digest": {"sha1": "def456..."},
        "entryPoint": ".github/workflows/build.yml"
      }
    },
    "materials": [
      {"uri": "pkg:npm/express@4.18.2", "digest": {"sha256": "..."}}
    ]
  }
}
```

This tells you:
- What artifact was produced
- Who built it (GitHub Actions)
- From what source code (specific commit)
- What dependencies were included

**Generating attestations with GitHub Actions**:
```yaml
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    image: ghcr.io/${{ github.repository }}:${{ github.sha }}
    format: cyclonedx-json

- name: Attest SBOM
  uses: actions/attest-sbom@v1
  with:
    subject-path: 'sbom.cyclonedx.json'
    sbom-path: 'sbom.cyclonedx.json'
```

Attestations are stored in Sigstore's Rekor transparency log.

### Container Image Signing

**Cosign for containers**:
```bash
# Sign
cosign sign nginx:latest

# Add attestations
cosign attest --predicate sbom.json --type cyclonedx nginx:latest

# Verify signature
cosign verify nginx:latest

# Verify and extract attestation
cosign verify-attestation nginx:latest
```

**Admission controllers to enforce signatures** (Kubernetes):

Using **Kyverno**:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: enforce
  rules:
    - name: verify-signature
      match:
        resources:
          kinds:
            - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/yourorg/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/yourorg/*"
                    issuer: "https://github.com/login/oauth"
```

This prevents running unsigned images in Kubernetes.

Using **OPA Gatekeeper** with Ratify:
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: VerifyImageSignature
metadata:
  name: require-signed-images
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    verifier: "cosign"
    repositories:
      - "ghcr.io/yourorg/*"
```

## Dependency Pinning Strategies

Exact versions vs ranges is a security vs convenience trade-off.

### Exact Versions vs Semver Ranges

**Exact pinning**:
```json
{
  "dependencies": {
    "express": "4.18.2",
    "react": "18.2.0"
  }
}
```

Pros:
- Complete control over updates
- Reproducible builds (even without lock file)
- No surprise breaking changes

Cons:
- Don't automatically get security patches
- More maintenance burden
- Can miss important updates

**Semver ranges**:
```json
{
  "dependencies": {
    "express": "^4.18.2",  // Allows 4.x.x
    "react": "~18.2.0"      // Allows 18.2.x only
  }
}
```

Caret (`^`) allows minor and patch updates. Tilde (`~`) allows only patch updates.

Pros:
- Automatic security patch updates
- Less maintenance
- Follows semver conventions

Cons:
- Assumes maintainers follow semver correctly (they don't always)
- Breaking changes sometimes in minor versions
- Supply chain attack window (malicious patch release)

### The Pragmatic Approach

**Application dependencies**:
```json
{
  "dependencies": {
    "express": "^4.18.2"  // Allow patches and minors
  },
  "devDependencies": {
    "jest": "^29.5.0"     // Dev tools can be more flexible
  }
}
```

Plus:
- Lock file committed (pins exact versions)
- Automated tools (Dependabot) create PRs for updates
- CI runs tests before merging
- Security updates prioritized (merge within days)
- Major updates reviewed manually

This gives you automatic patches while maintaining control.

**Library dependencies** (if you're publishing a library):
```json
{
  "dependencies": {
    "lodash": "^4.17.0"  // Wide range to avoid conflicts
  },
  "peerDependencies": {
    "react": ">=17.0.0"  // Let consumer choose
  }
}
```

Libraries should be flexible to avoid dependency hell for consumers.

### Update Cadence and Policies

**Security updates**: Within 72 hours (critical), 1 week (high)
**Minor updates**: Weekly or bi-weekly review
**Major updates**: Quarterly, with testing period
**Dev dependencies**: Monthly bulk update

**Policy example**:
```yaml
# dependency-update-policy.yml
security_updates:
  critical_severity:
    merge_within: 72 hours
    auto_merge: false  # Manual review even for critical
    requires_approval: security-team

  high_severity:
    merge_within: 1 week
    auto_merge: false
    requires_approval: engineering-lead

  medium_low:
    merge_within: 2 weeks
    auto_merge: true
    requires_approval: any-team-member

feature_updates:
  patch_versions:
    auto_merge: true
    requires_approval: false

  minor_versions:
    auto_merge: false
    requires_approval: code-owner

  major_versions:
    auto_merge: false
    requires_approval: architecture-team
    breaking_change_review: required
```

Enforce with branch protection and code owners.

### Automated Updates with Guardrails

**Dependabot auto-merge** (for low-risk updates):
```yaml
# .github/workflows/dependabot-auto-merge.yml
name: Dependabot auto-merge
on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  dependabot:
    runs-on: ubuntu-latest
    if: ${{ github.actor == 'dependabot[bot]' }}
    steps:
      - name: Metadata
        id: metadata
        uses: dependabot/fetch-metadata@v1

      - name: Auto-merge patch updates
        if: ${{ steps.metadata.outputs.update-type == 'version-update:semver-patch' }}
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

Only auto-merges patch versions, and only after CI passes.

## Zero-Trust Dependency Model

Assume every dependency could be compromised. Design systems to limit blast radius.

### Assume Breach Mentality

**Principles**:
1. **Least privilege**: Dependencies shouldn't need root access
2. **Isolation**: Sandbox dependency execution
3. **Monitoring**: Detect anomalous behavior
4. **Defense in depth**: Multiple layers of protection

### Runtime Sandboxing

**gVisor** (lightweight VM-like isolation):
```bash
# Install gVisor runtime
sudo apt-get install -y google-gvisor

# Run container with gVisor
docker run --runtime=runsc nginx:latest
```

gVisor intercepts syscalls, preventing container escapes even if container is compromised.

**Firecracker** (microVM):
```bash
# Run workload in microVM
firecracker --config-file vm_config.json
```

Used by AWS Lambda. Each function runs in isolated microVM. Compromise of one function doesn't affect others.

**Kata Containers** (Kubernetes-focused):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  runtimeClassName: kata  # Use Kata Containers runtime
  containers:
    - name: app
      image: myapp:latest
```

Each pod runs in its own lightweight VM.

### Dependency Isolation

**Node.js isolates** (V8 VM contexts):
```javascript
const { Isolate } = require('isolated-vm');

async function runUntrustedCode(code, data) {
  const isolate = new Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();

  await context.global.set('data', data);

  const result = await isolate.compileScript(code).then(script =>
    script.run(context, { timeout: 1000 })
  );

  return result;
}
```

Untrusted code runs in isolated V8 context with memory limits and timeouts.

**Python sandboxing** (RestrictedPython):
```python
from RestrictedPython import compile_restricted, safe_globals

code = """
# Untrusted user code
result = data['x'] + data['y']
"""

byte_code = compile_restricted(code, '<inline>', 'exec')
exec(byte_code, safe_globals, {'data': {'x': 10, 'y': 20}})
```

Restricts access to dangerous builtins like `eval`, `open`, `import`.

**Deno security model** (permission-based):
```bash
# Run with no permissions
deno run script.ts

# Run with specific permissions
deno run --allow-net=api.example.com --allow-read=/tmp script.ts
```

Explicitly grant permissions. By default, nothing is allowed.

### Permission Boundaries

**Linux capabilities** (instead of root):
```dockerfile
FROM node:18-alpine

# Add capability to bind privileged ports
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

# Run as non-root
USER node

CMD ["node", "server.js"]
```

Application can bind port 80/443 without running as root.

**Seccomp profiles** (syscall filtering):
```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "syscalls": [
    {
      "names": ["read", "write", "open", "close", "socket"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Only allow specific syscalls. Block everything else.

**AppArmor profiles**:
```
#include <tunables/global>

profile app-container flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>

  # Allow network
  network inet tcp,

  # Allow read access to /app
  /app/** r,

  # Deny everything else
  /** ix,
}
```

Mandatory Access Control profile limiting what container can access.

## CI/CD Pipeline Hardening

Your pipeline is a high-value target. It has access to code, secrets, and production.

### Pipeline Security (GitHub Actions Focus)

**Minimal permissions**:
```yaml
name: Build

on: [push]

permissions:
  contents: read  # Only read source code
  # No write permissions unless explicitly needed

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

Default is `permissions: write: all`. Explicitly reduce to minimum.

**Pin actions to SHA**:
```yaml
# Bad - tag can be moved
- uses: actions/checkout@v4

# Better - specific version
- uses: actions/checkout@v4.1.0

# Best - immutable SHA
- uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608
```

**Verify action source**:
```yaml
# Only use verified creators
- uses: actions/checkout@v4  # GitHub official
- uses: docker/build-push-action@v5  # Docker official

# Scrutinize third-party actions
- uses: random-user/random-action@main  # Review before using
```

### Immutable Build Environments

**Ephemeral runners** (GitHub Actions already does this):
- Each job runs in fresh VM
- VM destroyed after job
- No state persists between runs

**Self-hosted runners** (be careful):
```yaml
jobs:
  build:
    runs-on: self-hosted  # Persistent state, can be compromised
```

If using self-hosted:
- Rebuild runner images frequently
- Don't reuse runners between different repositories
- Isolate with VMs or containers
- Monitor for compromise

**Hermetic builds** (all inputs declared):
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: node:18.17.1-alpine3.18  # Exact version
      # No network access during build
      options: --network none
    steps:
      - uses: actions/checkout@v4
      - name: Restore cache
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      - run: npm ci --offline  # Only use cached packages
      - run: npm run build
```

All dependencies declared in lock file, cached before build, no network during build.

### Third-Party Action Security

**The Codecov incident** (2021):
Codecov's Bash Uploader script was modified to exfiltrate environment variables (including secrets) from CI builds. Thousands of organizations affected over months.

**Mitigations**:

1. **Review action code** before using:
```bash
# Clone and review
git clone https://github.com/actions/checkout
cd checkout
git checkout v4.1.0
# Review src/ and dist/
```

2. **Limit secret access**:
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
        # Secrets not exposed to third-party actions

      - name: Deploy
        if: github.ref == 'refs/heads/main'
        run: ./deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          # Only expose secrets when absolutely needed
```

3. **Use composite actions** (run scripts, not full actions):
```yaml
- name: Custom step
  run: |
    # Your own script
    ./scripts/custom-step.sh
  # No third-party code execution
```

4. **Audit action permissions**:
```yaml
# Some actions request broad permissions
- uses: some-action/action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    # What does this action do with the token?
    # Review before granting
```

### OIDC for Keyless Authentication

Replace long-lived cloud credentials with short-lived OIDC tokens.

**Old way** (long-lived AWS keys):
```yaml
- name: Configure AWS
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

Problem: Keys in secrets store, can be exfiltrated, must be rotated.

**New way** (OIDC):
```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read

steps:
  - name: Configure AWS
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
      aws-region: us-east-1
      # No long-lived credentials
```

GitHub gives job an OIDC token, AWS STS exchanges it for temporary credentials, credentials expire after job.

**Trust policy** (AWS):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:yourorg/yourrepo:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Only specific repo and branch can assume role.

### Artifact Signing in CI/CD

Sign artifacts during build, verify before deployment.

**Using Cosign in GitHub Actions**:
```yaml
name: Build and Sign

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  id-token: write
  packages: write

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: |
          npm ci
          npm run build
          tar -czf app.tar.gz dist/

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign artifact
        run: |
          cosign sign-blob --bundle bundle.json app.tar.gz

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: signed-app
          path: |
            app.tar.gz
            bundle.json

      - name: Generate attestation
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: app.tar.gz
```

Deployment verifies signature before running.

## Container Supply Chain Security

Containers have their own supply chain - base images, layers, build tools.

### Base Image Selection Strategy

**Official images**:
```dockerfile
FROM node:18.17.1-alpine3.18
```

Pros: Maintained by Docker/project teams, regularly updated, generally trustworthy
Cons: Still need scanning, can have vulnerabilities

**Distroless images**:
```dockerfile
FROM gcr.io/distroless/nodejs18-debian11
```

Pros: Minimal attack surface, no shell/package manager, smallest size
Cons: Harder to debug (no shell), limited base images available

**Scratch**:
```dockerfile
FROM scratch
COPY ./binary /binary
CMD ["/binary"]
```

Pros: Absolutely minimal, literally empty image
Cons: Only works for static binaries (Go, Rust), no standard libs

**Chainguard Images**:
```dockerfile
FROM cgr.dev/chainguard/node:latest
```

Pros: Minimal, regularly updated, SBOMs included, signatures
Cons: Newer, smaller ecosystem than Docker official

**Strategy**:
- Distroless for production when possible
- Alpine for development (has shell for debugging)
- Pin exact versions (including OS version)
- Regularly update and rebuild

### Multi-stage Builds for Attack Surface Reduction

```dockerfile
# Build stage - includes build tools
FROM node:18.17.1-alpine3.18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage - minimal
FROM gcr.io/distroless/nodejs18-debian11
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Run as non-root
USER nonroot

CMD ["dist/server.js"]
```

Final image:
- No npm (can't install packages)
- No shell (can't execute commands)
- No source code (only built dist)
- No build tools
- Runs as non-root

Compromising this container gives attacker very little.

### Image Scanning in CI/CD

**Trivy in GitHub Actions**:
```yaml
name: Scan Image

on:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail build on issues

      - name: Upload results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

Results appear in GitHub Security tab.

**Grype for detailed analysis**:
```yaml
- name: Scan with Grype
  run: |
    curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
    grype myapp:${{ github.sha }} --fail-on critical
```

**Snyk Container**:
```yaml
- name: Snyk Container scan
  uses: snyk/actions/docker@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    image: myapp:${{ github.sha }}
    args: --severity-threshold=high
```

### Runtime Image Verification

**Admission controllers** verify signatures before allowing pods to run.

**Kyverno** (policy engine):
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-images
spec:
  validationFailureAction: enforce
  background: false
  rules:
    - name: verify-signature
      match:
        resources:
          kinds:
            - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/yourorg/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/yourorg/*"
                    issuer: "https://github.com/login/oauth"
                    rekor:
                      url: "https://rekor.sigstore.dev"
```

If image isn't signed by GitHub Actions from your org, pod is rejected.

**OPA Gatekeeper** with Ratify:
```yaml
apiVersion: config.ratify.deislabs.io/v1beta1
kind: Verifier
metadata:
  name: verifier-cosign
spec:
  name: cosign
  artifactTypes: application/vnd.dev.cosign.artifact.sig.v1+json
  parameters:
    key: |
      -----BEGIN PUBLIC KEY-----
      [Your public key]
      -----END PUBLIC KEY-----
```

**Notary Project** (Docker Content Trust successor):
```bash
# Sign image
notation sign ghcr.io/yourorg/app:latest

# Create trust policy
cat > ~/.config/notation/trustpolicy.json <<EOF
{
  "version": "1.0",
  "trustPolicies": [
    {
      "name": "yourorg-images",
      "registryScopes": ["ghcr.io/yourorg/*"],
      "signatureVerification": {
        "level": "strict"
      },
      "trustStores": ["ca:yourorg-ca"],
      "trustedIdentities": ["*"]
    }
  ]
}
EOF

# Verify
notation verify ghcr.io/yourorg/app:latest
```

## Vendor Risk Management

Third-party SaaS and APIs are part of your supply chain.

### Third-Party SaaS Security Review

Before integrating a service:

**Security assessment**:
- SOC 2 Type II report available?
- ISO 27001 certified?
- What data do they process?
- Where is data stored geographically?
- What's their incident response history?
- Do they have a bug bounty program?

**Integration risk**:
- What permissions do they need?
- Can you limit access scope?
- Do they support least-privilege access?
- Can you revoke access immediately?
- Are there alternatives with better security posture?

**Data handling**:
- What PII/sensitive data will they access?
- Do they support encryption in transit and at rest?
- Can you encrypt data before sending?
- What's their data retention policy?
- How do you delete data when terminating service?

### Vendor Security Questionnaires

Standard questions to ask vendors:

1. **Certifications**: SOC 2, ISO 27001, FedRAMP, etc.
2. **Encryption**: TLS version, encryption at rest, key management
3. **Access control**: MFA required? RBAC? SSO support?
4. **Audit logs**: Available? Retention period? Format?
5. **Incident response**: SLA for notification? History of breaches?
6. **Data location**: Where is data processed and stored?
7. **Compliance**: GDPR, HIPAA, SOX, PCI DSS as applicable
8. **Vulnerability management**: Scan frequency? Penetration tests?
9. **Employee access**: Background checks? Least privilege?
10. **Supply chain**: Do they vet their suppliers?

### SLA and Incident Response Requirements

**Contract clauses**:
```
SECURITY INCIDENT NOTIFICATION:
Vendor shall notify Customer within 24 hours of discovering any
unauthorized access to Customer data or systems. Notification shall
include:
- Nature of the incident
- Data affected
- Preliminary assessment
- Remediation steps taken

SECURITY CONTROLS:
Vendor shall maintain:
- SOC 2 Type II compliance (annual audit)
- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256)
- Multi-factor authentication for all access
- Regular penetration testing (at least annually)
- Vulnerability scanning (at least monthly)
```

**Data Processing Agreements** (DPA):
Required for GDPR compliance when vendor processes EU data.

## License Compliance at Scale

Managing licenses across hundreds of dependencies.

### Automated License Scanning

**FOSSA** (commercial):
```bash
# Install
npm install -g fossa-cli

# Scan project
fossa analyze

# Check for policy violations
fossa test
```

Generates compliance reports, tracks license changes, enforces policies.

**Scancode** (open source):
```bash
# Install
pip install scancode-toolkit

# Scan codebase
scancode --license --copyright --info --json-pp output.json /path/to/project
```

Detects licenses in source files, not just declared licenses.

**License compatibility checker**:
```python
# license-policy.py
COMPATIBLE_LICENSES = {
    'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'
}

REVIEW_REQUIRED = {
    'LGPL-2.1', 'LGPL-3.0', 'MPL-2.0'
}

INCOMPATIBLE = {
    'GPL-2.0', 'GPL-3.0', 'AGPL-3.0'  # For proprietary software
}

def check_license(license_id):
    if license_id in COMPATIBLE_LICENSES:
        return "APPROVED"
    elif license_id in REVIEW_REQUIRED:
        return "LEGAL_REVIEW"
    elif license_id in INCOMPATIBLE:
        return "BLOCKED"
    else:
        return "UNKNOWN"
```

### Policy Enforcement

**Artifactory license policies**:
```json
{
  "name": "license-policy",
  "type": "license",
  "rules": [
    {
      "name": "block-gpl",
      "priority": 1,
      "criteria": {
        "allowed_licenses": [],
        "banned_licenses": ["GPL-2.0", "GPL-3.0", "AGPL-3.0"]
      },
      "actions": {
        "block_download": {
          "active": true
        }
      }
    }
  ]
}
```

**FOSSA policy**:
```yaml
policies:
  - name: Production Policy
    type: licensing
    rules:
      - condition: license
        value: GPL-3.0
        action: deny

      - condition: license
        value: AGPL-3.0
        action: deny

      - condition: license
        value: LGPL-*
        action: flag  # Allow but flag for review
```

### Attribution and Notice Generation

**Generate NOTICE file**:
```bash
# Using license-checker
license-checker --production --json > licenses.json

# Generate notice
cat > NOTICE.txt <<EOF
This software includes the following third-party dependencies:

$(jq -r 'to_entries[] | "\(.key) (\(.value.licenses))\n  \(.value.repository // "No repository")\n"' licenses.json)
EOF
```

**Include in distributions**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY dist/ .
COPY NOTICE.txt /NOTICE.txt  # Include attribution
CMD ["node", "server.js"]
```

Some licenses (Apache 2.0, BSD) require attribution in distributed binaries.

## Supply Chain Security Metrics

What you measure improves.

### Key Metrics

**Mean Time to Update (MTTU)**:
Time from dependency update available to deployed in production.

```
MTTU = (Sum of update lag for all dependencies) / (Number of dependencies)

Example:
Dependency A: Update available Jan 1, deployed Jan 5 = 4 days
Dependency B: Update available Jan 3, deployed Jan 6 = 3 days
MTTU = (4 + 3) / 2 = 3.5 days
```

Track separately for security vs feature updates.

**Vulnerability Exposure Window**:
Time from CVE disclosure to patched in production.

```
Critical CVE disclosed: Jan 1, 09:00
Patch deployed to production: Jan 1, 15:00
Exposure window: 6 hours
```

Goal: < 24 hours for critical, < 7 days for high.

**Dependency Freshness**:
How outdated are your dependencies?

```
freshness = (current_version / latest_version)

express: 4.18.2 (current) / 4.18.3 (latest) = 0.997 = 99.7% fresh
react: 17.0.2 (current) / 18.2.0 (latest) = 0.944 = 94.4% fresh
```

Anything below 90% indicates stale dependencies.

**SBOM Coverage**:
Percentage of applications with SBOMs generated.

```
SBOM_coverage = (Applications with SBOMs) / (Total applications)
```

Goal: 100%

**Policy Violation Rate**:
How often are policy-violating dependencies introduced?

```
violation_rate = (PRs blocked by policy) / (Total dependency update PRs)
```

High rate might indicate policy is too strict or developers bypassing checks.

**Automated Update Success Rate**:
How many automated updates merge without issues?

```
success_rate = (Auto-merged PRs) / (Total Dependabot PRs)
```

Low success rate indicates brittle tests or breaking changes.

### Dashboards

**Example metrics dashboard** (using Grafana):
```yaml
# Prometheus metrics
supply_chain_dependency_age_days{package="express", version="4.18.2"} 45
supply_chain_vulnerability_count{severity="critical"} 2
supply_chain_vulnerability_count{severity="high"} 8
supply_chain_mttu_hours{type="security"} 18
supply_chain_mttu_hours{type="feature"} 168
supply_chain_sbom_coverage_percent 87
```

**Alerts**:
```yaml
groups:
  - name: supply_chain
    rules:
      - alert: CriticalVulnerabilityOpen
        expr: supply_chain_vulnerability_count{severity="critical"} > 0
        for: 24h
        annotations:
          summary: "Critical vulnerability unpatched for 24 hours"

      - alert: DependencyVeryStale
        expr: supply_chain_dependency_age_days > 365
        annotations:
          summary: "Dependency over 1 year old"
```

## Incident Response for Supply Chain

When a dependency is compromised, speed matters.

### Detecting Compromised Dependencies

**Indicators**:
- Unusual network connections from build or application
- Cryptocurrency mining CPU usage
- Environment variable access
- Unexpected file system writes
- New maintainers on critical packages
- Sudden version bumps without changelog

**Monitoring**:

**Runtime monitoring** (Falco for containers):
```yaml
- rule: Unexpected Network Connection
  desc: Dependency making network connection to unexpected host
  condition: >
    spawned_process and
    proc.name in (node, python, java) and
    fd.net and
    not fd.snet in (allowed_destinations)
  output: >
    Unexpected network connection (process=%proc.name
    destination=%fd.snet connection=%fd.name)
  priority: WARNING
```

**Build monitoring**:
```yaml
# GitHub Actions - alert on unusual behavior
- name: Monitor build
  run: |
    # Check for unexpected network calls during build
    tcpdump -i any -w build.pcap &
    TCPDUMP_PID=$!

    npm ci
    npm run build

    kill $TCPDUMP_PID

    # Analyze for suspicious destinations
    tcpdump -r build.pcap | grep -v "registry.npmjs.org" && exit 1
```

### SBOM-Based Impact Analysis

When Log4Shell was announced:

**Without SBOM**:
1. Search all codebases for "log4j"
2. Miss transitive dependencies
3. Check each server manually
4. Days to weeks to identify exposure

**With SBOM**:
```bash
# Query all SBOMs for log4j
grep -r "log4j-core" sbom-repository/

# Returns:
sbom-repository/api-gateway/sbom.json:    "name": "log4j-core", "version": "2.14.1"
sbom-repository/data-processor/sbom.json: "name": "log4j-core", "version": "2.15.0"

# Immediately know which applications are affected
```

**Automated impact analysis**:
```python
import json
import glob

def find_vulnerable_apps(package_name, vulnerable_versions):
    affected = []

    for sbom_file in glob.glob("sbom-repository/**/*.json", recursive=True):
        with open(sbom_file) as f:
            sbom = json.load(f)

        for component in sbom.get('components', []):
            if component['name'] == package_name:
                if component['version'] in vulnerable_versions:
                    affected.append({
                        'application': sbom['metadata']['component']['name'],
                        'version': component['version'],
                        'sbom': sbom_file
                    })

    return affected

# Usage
vulnerable = find_vulnerable_apps('log4j-core', ['2.0', '2.1', ..., '2.14.1'])
print(f"Found {len(vulnerable)} affected applications")
```

Hours instead of days.

### Emergency Patching Procedures

**Critical vulnerability workflow**:

1. **Assess** (Target: 1 hour)
   - Is the vulnerability in our stack?
   - Is vulnerable code reachable?
   - What's the exploitation risk?

2. **Patch** (Target: 4 hours)
   - Update dependency to patched version
   - Run test suite
   - Build and scan new artifact

3. **Deploy** (Target: 2 hours)
   - Deploy to staging
   - Smoke tests
   - Deploy to production (canary → full rollout)

4. **Verify** (Target: 1 hour)
   - Confirm patched version running
   - Generate new SBOM
   - Update SBOM repository
   - Monitor for issues

Total: 8 hours from disclosure to production.

**Emergency pipeline**:
```yaml
# .github/workflows/emergency-patch.yml
name: Emergency Security Patch

on:
  workflow_dispatch:
    inputs:
      cve:
        description: 'CVE being patched'
        required: true
      package:
        description: 'Package to update'
        required: true

jobs:
  emergency-patch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Update dependency
        run: npm update ${{ github.event.inputs.package }}

      - name: Run tests
        run: npm test
        timeout-minutes: 10

      - name: Build
        run: npm run build

      - name: Scan for CVE
        run: |
          npm audit | grep -q "${{ github.event.inputs.cve }}" && exit 1 || exit 0

      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: "SECURITY: Patch ${{ github.event.inputs.cve }}"
          labels: security, emergency
          branch: security/${{ github.event.inputs.cve }}
```

### Post-Incident Review

After patching:

**Questions to answer**:
1. How did we discover the vulnerability? (Our scanning? Public disclosure?)
2. How long were we vulnerable?
3. Did we have an SBOM? Did it help?
4. What was our MTTU?
5. Did automated tools work as expected?
6. Were any systems compromised?
7. What can we improve?

**Action items**:
- Update vulnerability response runbook
- Improve detection capabilities
- Faster patching pipeline
- Better SBOM coverage
- More comprehensive scanning

Document and share learnings.

## Compliance and Regulations

Supply chain security is increasingly regulated.

### Executive Order 14028 (US Federal)

"Improving the Nation's Cybersecurity" (May 2021)

Requirements for software vendors selling to federal government:

1. **SBOM provision**: Must provide SBOM in machine-readable format
2. **Secure development**: Attestation that software was developed following secure practices
3. **Vulnerability disclosure**: Must have vulnerability disclosure policy
4. **Incident notification**: Must notify federal agencies of breaches
5. **Multi-factor authentication**: Required for developer and release accounts

**Compliance**:
```yaml
# Generate SBOM in build
- name: Generate SBOM
  run: syft packages . -o cyclonedx-json=sbom.json

# Attest secure development
- name: Attest
  uses: actions/attest-build-provenance@v1
  with:
    subject-path: app.tar.gz

# Include SBOM with delivery
- name: Package for delivery
  run: |
    tar -czf delivery.tar.gz app/ sbom.json attestation.json
```

### NTIA Minimum Elements for SBOM

Required fields:
- **Supplier Name**: Who provides the component
- **Component Name**: What is it
- **Version**: Specific version
- **Other Unique Identifiers**: Package URL (PURL), CPE
- **Dependency Relationships**: What depends on what
- **Author of SBOM Data**: Who created the SBOM
- **Timestamp**: When SBOM was created

Both CycloneDX and SPDX support these elements.

### EU Cyber Resilience Act (Proposed)

Requirements for products with digital elements:

1. **Security by design**: Develop with security in mind
2. **Vulnerability handling**: Process for handling vulnerabilities
3. **Security updates**: Provide updates for product lifetime
4. **SBOM**: Provide transparency about components
5. **Incident reporting**: Report actively exploited vulnerabilities

Still being finalized, but indicates direction of regulation.

### Industry-Specific Requirements

**Healthcare (FDA)**:
- Medical device software must have SBOM
- Cybersecurity plan required
- Post-market vulnerability monitoring

**Finance**:
- Some regulators requiring third-party risk management
- Vendor security reviews
- Incident notification requirements

**Government contractors**:
- FedRAMP for cloud services
- NIST 800-53 controls
- Supply chain risk management (SCRM)

## Supply Chain Security Maturity Model

Assess your current state and plan improvements.

### Maturity Levels

**Level 0: Ad-hoc**
- No dependency tracking
- No vulnerability scanning
- Infrequent updates
- No SBOM
- No policies

**Level 1: Initial**
- Basic dependency scanning (npm audit)
- Occasional updates
- Dependabot enabled but PRs often ignored
- Developers aware of supply chain risks
- No systematic approach

**Level 2: Managed**
- Automated scanning in CI
- Regular dependency updates (monthly)
- SBOMs generated for some applications
- Vulnerability SLA established
- Basic policies (block critical vulnerabilities)
- Lock files committed

**Level 3: Defined**
- SBOMs for all applications
- SBOM repository maintained
- Vulnerability SLA enforced
- Private package registry
- License compliance checking
- Third-party action security review
- Container image scanning
- Update automation with testing

**Level 4: Measured**
- Comprehensive metrics (MTTU, exposure window)
- Dashboards and alerting
- Regular policy reviews
- Reachability analysis
- EPSS-based prioritization
- Code signing implemented
- Incident response playbook tested

**Level 5: Optimizing**
- SLSA Level 3+ build systems
- Zero-trust dependency model
- Runtime sandboxing
- Continuous improvement based on metrics
- Industry-leading practices
- Contributing to open source security

### Progression Plan

**From Level 0 → 1** (1-2 months):
1. Enable Dependabot
2. Add `npm audit` to CI
3. Commit lock files
4. Train team on supply chain risks

**From Level 1 → 2** (2-3 months):
1. Establish vulnerability SLA
2. Generate SBOMs for critical applications
3. Implement license scanning
4. Create dependency update policy
5. Add container image scanning

**From Level 2 → 3** (3-6 months):
1. SBOM for all applications
2. Set up private registry
3. Implement policy enforcement (firewall)
4. Review and pin third-party actions
5. Automate security updates with testing
6. Create incident response playbook

**From Level 3 → 4** (6-12 months):
1. Implement metrics collection
2. Build dashboards
3. Add reachability analysis
4. Implement EPSS-based prioritization
5. Code signing for releases
6. Regular testing of incident response

**From Level 4 → 5** (12+ months):
1. SLSA Level 3 build infrastructure
2. Runtime sandboxing for high-risk components
3. Advanced threat detection
4. Contribute improvements back to ecosystem
5. Regular security research

## Case Studies and Lessons Learned

Learning from real incidents.

### SolarWinds (2020)

**What happened**:
- Attackers compromised build server
- Injected malicious code into Orion software
- Code was digitally signed (trusted)
- 18,000+ organizations installed malicious update

**How it worked**:
- Build system compromise (not source code)
- Small, obfuscated payload
- Targeted activation (only for specific organizations)
- Months of persistence before detection

**Lessons**:
1. **Build systems are targets**: Harden build infrastructure
2. **Digital signatures aren't enough**: Need build provenance
3. **Trust but verify**: Even signed software should be monitored
4. **SBOM critical for response**: Organizations couldn't quickly identify if they used Orion

**Defenses**:
- SLSA Level 3+ (isolated, audited builds)
- Build provenance generation and verification
- Runtime monitoring for anomalous behavior
- SBOM repository for impact analysis

### Log4Shell / Log4j (December 2021)

**What happened**:
- Critical RCE in Log4j logging library
- CVSS 10.0 (maximum severity)
- Trivial to exploit
- Billions of devices affected

**Why so bad**:
- Log4j used everywhere (transitive dependency)
- Organizations didn't know where they used it
- Java's ecosystem makes dependencies opaque
- Patches required code changes in some cases

**Response timeline**:
- Dec 9: Vulnerability disclosed
- Dec 10: Exploit code public
- Dec 10: Mass scanning and exploitation began
- Weeks-months: Organizations still identifying exposure

**Lessons**:
1. **Transitive dependencies are invisible**: SBOMs make them visible
2. **Speed matters**: Organizations with SBOMs responded faster
3. **Updates aren't always simple**: Some fixes require code changes
4. **Prepare for the next one**: Log4Shell won't be the last

**Defenses**:
- SBOM for every application
- SBOM query capability
- Automated vulnerability scanning
- Fast-track emergency patching process
- Runtime protection (WAF rules bought time)

### event-stream (2018)

**What happened**:
- Popular npm package (2M weekly downloads)
- Original maintainer transferred ownership
- New maintainer added malicious code in dependency (`flatmap-stream`)
- Targeted cryptocurrency wallets

**Attack technique**:
- Malicious code in dependency, not main package
- Obfuscated payload
- Targeted (only activated for specific application)
- Gradual rollout to avoid detection

**Detection**:
- Community member noticed suspicious code
- Manual review, not automated tools
- Took months to discover

**Lessons**:
1. **Maintainer burnout is real**: Single maintainers are vulnerable
2. **Transitive dependencies are trust multipliers**: Review entire tree
3. **Targeted attacks are hard to detect**: Behavioral monitoring helps
4. **Community matters**: Open source security is a community effort

**Defenses**:
- Review maintainer changes for critical dependencies
- Monitor for suspicious dependencies added
- Runtime behavioral monitoring
- Consider forking critical unmaintained packages

### Codecov (2021)

**What happened**:
- Bash Uploader script compromised
- Script ran in thousands of CI pipelines
- Exfiltrated environment variables (secrets)
- Months before detection

**Impact**:
- Hundreds of organizations affected
- Secrets stolen (AWS keys, etc.)
- Required mass secret rotation

**How it worked**:
- Attacker modified script hosted on CDN
- Script ran with access to CI environment variables
- Exfiltrated secrets to attacker-controlled server
- Codecov unaware for months

**Lessons**:
1. **Third-party scripts in CI are risky**: They have access to everything
2. **Pin versions**: Don't `curl | bash` latest
3. **Limit secret exposure**: Only expose secrets when needed
4. **Monitor outbound connections**: CI shouldn't connect to unknown hosts

**Defenses**:
```yaml
# Don't do this
- run: curl -s https://codecov.io/bash | bash

# Do this
- run: |
    curl -s https://codecov.io/bash -o codecov.sh
    echo "expected-hash  codecov.sh" | sha256sum -c
    bash codecov.sh
```

Or use official GitHub Actions (pinned to SHA).

### colors.js and faker.js (2022)

**What happened**:
- Maintainer intentionally sabotaged own packages
- Infinite loop added to `colors` and `faker`
- Broke thousands of applications
- Protest against lack of compensation for open source work

**Impact**:
- Applications crashed or hung
- Highlighted single-maintainer risk
- Discussion about open source sustainability

**Lessons**:
1. **Dependency on volunteers**: Critical infrastructure maintained by volunteers
2. **Version pinning saves you**: Teams with pinned versions unaffected
3. **Update testing is critical**: Breaking changes caught in CI
4. **Open source sustainability**: Need to support maintainers

**Defenses**:
- Lock files (don't auto-update)
- CI testing before production deployment
- Consider funding critical dependencies
- Monitor for unusual updates

## Enterprise Supply Chain Security Playbook

Bringing it all together.

### Week 1: Assessment
- Inventory all applications
- Identify dependencies (generate SBOMs)
- Run vulnerability scans
- Assess current maturity level
- Identify gaps

### Week 2-4: Quick Wins
- Enable Dependabot
- Add `npm audit` / `pip-audit` to CI
- Commit lock files
- Set up vulnerability alerting
- Document critical dependencies

### Month 2-3: Foundation
- Generate SBOMs for all applications
- Create SBOM repository
- Implement container scanning
- Review and pin CI/CD actions
- Establish vulnerability SLA

### Month 4-6: Systematic Approach
- Deploy private package registry
- Implement license scanning
- Create dependency review process
- Automate dependency updates
- Test incident response procedures

### Month 7-12: Advanced Capabilities
- Implement code signing
- SLSA Level 2+ builds
- Reachability analysis
- Metrics and dashboards
- Policy enforcement (firewall)

### Ongoing
- Monthly metrics review
- Quarterly policy updates
- Annual incident response drills
- Continuous improvement
- Industry engagement

---

## Navigation

**You are here**: 03-development → supply-chain-security → deep-water

**Related topics**:
- [Secure Coding Practices](../../secure-coding-practices/deep-water/) - Securing code you write
- [Secret Management](../../secret-management/deep-water/) - Protecting credentials in supply chain
- [Deployment Strategy](../../../05-deployment/deployment-strategy/deep-water/) - Secure deployment pipelines
- [Incident Response](../../../06-operations/incident-response/deep-water/) - Responding to supply chain incidents

**Other depths**:
- [Surface](../surface/) - Quick overview and essential practices
- [Mid-Depth](../mid-depth/) - Dependency scanning, SBOM, systematic management

**Next steps**:
- Assess your current maturity level
- Generate SBOMs for all applications
- Implement SLSA Level 2+ builds
- Create supply chain incident response playbook
- Establish metrics and dashboards
- Consider contributing to open source security efforts
