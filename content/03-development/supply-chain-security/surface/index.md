---
title: "Supply Chain Security: Trust What You Import"
phase: "03-development"
topic: "supply-chain-security"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["secure-coding-practices", "secret-management", "dependency-review", "deployment-strategy"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up", "specialist-expanding", "busy-developer"]
updated: "2025-11-15"
---

# Supply Chain Security: Trust What You Import

Your code is maybe 5% of what runs in production. The other 95% is dependencies you didn't write. Every `npm install`, `pip install`, or `go get` is an act of trust.

Sometimes that trust is misplaced.

## What This Is

Supply chain security is about protecting the code you *import* just as much as the code you *write*. When you add a dependency, you're trusting:

- The author isn't malicious
- The author's account hasn't been compromised
- The package registry wasn't tampered with
- Transitive dependencies (dependencies of your dependencies) are also safe
- Future updates won't introduce vulnerabilities or malware

Attackers know this. They target the supply chain because it's efficient - compromise one popular package and you've compromised thousands of applications.

## Minimum Viable Understanding

### Dependencies Are Attack Vectors

In 2018, the `event-stream` npm package was sold to a new maintainer who added malicious code targeting cryptocurrency wallets. It had 2 million downloads per week. In 2021, the `ua-parser-js` package was compromised and served malware for three hours. In December 2021, Log4Shell affected billions of devices through a single logging library.

You don't have to review every line of every dependency, but you do need basic protections.

### Five Essential Practices

**1. Know What You're Installing**

Before running `npm install sketchy-package`, spend 30 seconds:
- Check when it was last updated
- Look at the weekly downloads
- Scan the README
- Check the GitHub repository (does it exist? is it active?)

If something feels off, it probably is.

**2. Use Lock Files**

Lock files (`package-lock.json`, `yarn.lock`, `Pipfile.lock`, `go.sum`, `Cargo.lock`) pin exact versions of every dependency and transitive dependency. This means:
- Builds are reproducible
- Attackers can't swap in malicious versions
- You control when updates happen

Commit your lock files to version control.

**3. Scan for Known Vulnerabilities**

Free tools check your dependencies against databases of known vulnerabilities:

```bash
# npm
npm audit

# Python
pip-audit

# Go
go list -json -m all | nancy sleuth

# Rust
cargo audit
```

Run these in CI. Fix critical and high-severity issues.

**4. Automate Dependency Updates**

Vulnerabilities are discovered constantly. Tools like Dependabot (GitHub), Renovate, or Snyk can automatically create pull requests when:
- Security updates are available
- New versions are released

Don't ignore these PRs for months. Review and merge security updates within days.

**5. Review What You Actually Install**

Typosquatting is real. Attackers register packages with names like `reqeusts` (note the typo) hoping developers make mistakes. Some examples:

- `crossenv` instead of `cross-env` (caught in 2017)
- `python3-dateutil` instead of `python-dateutil`
- `electorn` instead of `electron`

Copy package names carefully. Check you're installing what you intended.

## Real Red Flags

### What Not to Do

❌ **Installing unknown packages without investigation**
```bash
# Someone on StackOverflow said this fixes my problem
npm install random-fix-tool
```

❌ **Ignoring vulnerability alerts**
```
Dependabot: Critical vulnerability in lodash
[Ignored for 6 months]
```

❌ **No lock files in version control**
```
# .gitignore
package-lock.json  # Bad idea
```

❌ **Running dependencies with full system access**
```bash
# Install script has root access, what could go wrong?
sudo npm install
```

❌ **Copying code from unverified sources**
```javascript
// Found this on some random gist, seems legit
const suspiciousFunction = require('totally-safe-package');
```

### What to Do Instead

✅ **Review before installing**
```bash
# Check the package page first
npm info <package-name>
# Look at the repository, check recent activity
# Then install
npm install <package-name>
```

✅ **Automated scanning in CI**
```yaml
# .github/workflows/security.yml
- name: Run security audit
  run: npm audit --audit-level=high
```

✅ **Lock files committed**
```bash
git add package-lock.json
git commit -m "Lock dependency versions"
```

✅ **Regular dependency updates**
```
Enable Dependabot in repository settings
Review and merge security PRs weekly
```

✅ **Principle of least privilege**
```bash
# Never use sudo for package installs
npm install  # Installs to local node_modules
```

## Recent High-Profile Supply Chain Attacks

Understanding what's happened helps prevent repeating it:

**SolarWinds (2020)**: Attackers compromised the build system for network management software used by Fortune 500 companies and government agencies. The malicious update was digitally signed and trusted. Affected 18,000+ organizations.

**Log4Shell (2021)**: Critical vulnerability in Log4j, a Java logging library used everywhere. Billions of devices affected. Patching took months because many organizations didn't know where Log4j was used in their dependencies.

**event-stream (2018)**: Popular npm package with 2M weekly downloads. New maintainer added code to steal Bitcoin. Went undetected for months.

**ua-parser-js (2021)**: Compromised maintainer account. Malicious version published that installed cryptocurrency miners and password stealers. Affected versions downloaded 1M+ times in three hours.

**Codecov (2021)**: Bash script used in CI pipelines was compromised. Extracted environment variables (including secrets) from thousands of customer builds over months.

The pattern: attackers target widely-used dependencies and build tools because the impact multiplies.

## Quick Validation Test

Can you answer yes to these?

- [ ] Lock files are committed to version control
- [ ] Automated vulnerability scanning runs in CI
- [ ] I review packages before installing them
- [ ] Dependabot (or equivalent) is enabled
- [ ] Security alerts are reviewed within a week
- [ ] Dependencies are updated at least monthly
- [ ] I verify package names before installing

If you checked fewer than 5, you have supply chain exposure.

## One-Sentence Maxim

**You're responsible for vulnerabilities in code you didn't write but chose to import.**

The defense is visibility, automation, and healthy skepticism.
