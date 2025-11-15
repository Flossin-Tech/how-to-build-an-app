---
title: "Dependency Review Essentials"
phase: "02-design"
topic: "dependency-review"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["architecture-design", "security-architecture", "supply-chain-security"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Dependency Review Essentials

Your app doesn't exist in isolation. It's built on top of hundreds or thousands of other people's code - libraries for HTTP requests, database connections, authentication, payment processing, email delivery. Every one of those dependencies is a potential point of failure, security vulnerability, or legal complication.

Most developers don't think about dependencies until something breaks. A library you've used for two years suddenly stops working. A critical security patch requires rewriting half your code. A service you depend on gets acquired and shut down. An npm package you installed turns out to have malware.

This isn't paranoia. These things happen regularly. The good news is that reviewing your dependencies before you're too committed is straightforward and catches most problems before they become emergencies.

## Why This Matters

Here's what happens when you don't review dependencies:

**The Abandoned Library Problem**: You build your app using a library that seems perfect. Six months later, you discover it hasn't been updated in three years. There's a critical security vulnerability with no fix. Now you're choosing between rewriting that part of your app or shipping known vulnerabilities.

**The Cascade Failure**: Your payment processing works perfectly in development. In production, you hit an API rate limit you didn't know existed. Your checkout flow breaks. Customers can't buy anything. You're losing money while frantically reading documentation you should have read months ago.

**The License Surprise**: You're about to launch when legal notices your app uses a GPL library. Your proprietary code now needs to be open source, or you need to rip out and replace that dependency. This is a real scenario that has delayed product launches.

**The Supply Chain Attack**: A dependency you installed six months ago pushed an update with malicious code. It's harvesting your users' data. You didn't notice because you weren't monitoring for changes.

The pattern is the same: small decisions made early (or not made at all) create expensive problems later. Dependency review is about making those decisions deliberately.

## Inventory Everything You Depend On

Before you can evaluate dependencies, you need to know what they are. This sounds obvious, but most projects have more dependencies than developers realize.

### Direct Dependencies

These are libraries and services you explicitly chose and added to your project:

**Package Manager Dependencies**: Whatever's in your `package.json`, `requirements.txt`, `Gemfile`, `pom.xml`, or equivalent. Run `npm list --depth=0` (or your language's equivalent) to see what you've directly installed.

**External Services**: APIs and third-party services your app calls:
- Payment processing (Stripe, PayPal)
- Authentication providers (Auth0, Firebase Auth)
- Email delivery (SendGrid, Mailgun)
- SMS/notifications (Twilio, OneSignal)
- Cloud storage (AWS S3, Cloudinary)
- Analytics (Google Analytics, Mixpanel)
- Error tracking (Sentry, Rollbar)

**Infrastructure Dependencies**: What your app needs to run:
- Database (PostgreSQL, MongoDB, Redis)
- Message queues (RabbitMQ, AWS SQS)
- CDN (Cloudflare, Fastly)
- Hosting platform (Vercel, AWS, Heroku)

### Transitive Dependencies

These are dependencies of your dependencies. If you install library A, and library A requires libraries B, C, and D, those are transitive dependencies. You didn't choose them, but you're using them.

Run `npm list` (without the depth flag) to see everything. The list is usually long. A typical Node.js project might have 20 direct dependencies and 800 transitive ones. You're responsible for all of them.

### Development Dependencies

Libraries you use for building, testing, and development but don't ship to production. These matter too because they run on developer machines and CI systems. A compromised development dependency can steal credentials or inject malicious code into your build.

Write this down somewhere. A simple spreadsheet works:
- Dependency name
- What it does (in one sentence)
- Type (library, API service, infrastructure)
- Direct or transitive
- Current version

You'll reference this constantly.

## Check for Known Vulnerabilities

Once you know what you're using, check if any of it has known security problems. This is easier than it sounds because tools do most of the work.

### Automated Scanning Tools

**npm audit** (for Node.js): Run `npm audit` in your project directory. It checks your dependencies against a database of known vulnerabilities and tells you what's broken and how to fix it.

You'll see output like:
```
found 3 vulnerabilities (1 moderate, 2 high)
  run `npm audit fix` to fix them
```

Sometimes `npm audit fix` works automatically. Sometimes it breaks your code because the fix requires a breaking change. Read what changed before you commit the fix.

**Snyk**: Free for open source projects, scans for vulnerabilities and provides fix recommendations. Integrates with GitHub to automatically check pull requests. More comprehensive than npm audit alone.

**Dependabot** (GitHub): Automatically opens pull requests when dependencies have updates, especially security patches. Enable it in your repository settings. You'll get PRs like "Bump lodash from 4.17.19 to 4.17.21 to fix CVE-2021-23337."

**OWASP Dependency-Check**: Language-agnostic tool that identifies known vulnerable components. Good for Java, .NET, and projects mixing multiple languages.

### What To Do With Vulnerability Reports

When a scanner reports a vulnerability, you need to answer three questions:

**1. Does this affect my code?**

Not every vulnerability in a dependency affects you. If the vulnerable function is in a part of the library you don't use, the practical risk might be low. Read the CVE (Common Vulnerabilities and Exposures) description to understand what's actually vulnerable.

Example: A library has a remote code execution vulnerability in its XML parsing. If you're only using it for JSON, you're probably fine. Probably. Update anyway when you can.

**2. Is there a fix?**

Check if a patched version exists. If yes, update. If no, you need to decide between:
- Waiting for a fix (acceptable for low-severity issues in non-critical code)
- Switching to a different library
- Removing the dependency entirely if you can work around it

**3. How critical is this dependency?**

A vulnerability in your payment processing library requires immediate action. A low-severity issue in a development-only testing utility can wait until your next regular update cycle.

The tools will assign severity ratings (low, moderate, high, critical). Treat them as guidelines, not gospel. Critical means "drop what you're doing and fix this." High means "fix this week." Moderate means "fix this sprint." Low means "fix when convenient."

### Regular Scanning Schedule

Run vulnerability scans:
- Before deploying to production
- Weekly in active development
- When Dependabot or Snyk opens a PR
- After any dependency updates

Automated tools can run these checks on every commit via CI/CD. Set it up once, forget about it, and just respond to alerts.

## Identify Your Critical Dependencies

Some dependencies are more important than others. If your logging library breaks, that's bad. If your payment processing breaks, you're losing money every minute it's down.

### The "What Breaks?" Analysis

Go through your dependency list and ask: "If this disappeared tomorrow, what would break?"

**Critical Dependencies** (app doesn't work without them):
- Payment processing (Stripe API, PayPal SDK)
- Authentication (Auth0, Firebase, your session library)
- Database drivers (pg for PostgreSQL, mongoose for MongoDB)
- Core framework (Express, React, Rails)

**Important Dependencies** (features break, app limps along):
- Email delivery (SendGrid, Mailgun)
- File uploads (AWS S3 SDK, Cloudinary)
- Search functionality (Elasticsearch client, Algolia)
- Push notifications (OneSignal, Firebase Cloud Messaging)

**Nice-to-Have Dependencies** (degraded experience):
- Analytics (Google Analytics, Mixpanel)
- Error tracking (Sentry)
- A/B testing tools
- Chat widgets

**Development-Only** (doesn't affect production):
- Testing frameworks (Jest, pytest)
- Build tools (webpack, Babel)
- Linters (ESLint, Prettier)

Mark your critical dependencies in your spreadsheet. These get extra attention.

### Understanding Service Dependencies

For external services (APIs you call), you need to know:

**Rate Limits**: How many requests can you make per hour/day/month? What happens when you hit the limit? Does it return an error, or does your account get suspended?

Stripe free tier: 100 API calls per second. SendGrid free tier: 100 emails per day. Google Maps API: $200 free credit per month, then you pay per request. Know these numbers before you launch.

**Quotas**: Storage limits, user limits, data transfer limits. AWS S3 free tier gives you 5GB storage and 20,000 GET requests per month. After that, you're billed.

**Service Level Agreements (SLAs)**: What uptime does the vendor guarantee? 99.9% sounds good but means 8.7 hours of downtime per year. 99.99% means 52 minutes per year. Free tiers usually have no SLA at all.

**Geographic Availability**: Does the service work in all regions where your users are? Some APIs have different endpoints for EU vs US due to data residency laws.

Test what happens when you exceed limits or when the service is unavailable. Does your app crash, or does it degrade gracefully?

## Plan for Dependency Failure

Every dependency will eventually fail, get deprecated, or become unavailable. Planning for this isn't pessimism - it's engineering.

### When Libraries Get Abandoned

Check the maintenance status of libraries before committing to them:

**Activity Indicators**:
- Last commit date (be suspicious if it's over a year old)
- Open issues and PR count (hundreds of unaddressed issues is a red flag)
- Maintainer responsiveness (do they respond to security reports?)
- Download counts (popular libraries get more scrutiny and support)

For critical dependencies, have a backup plan. If you're using Library A for authentication, know what Library B would be if you had to switch. You don't need to build it, just identify the alternative.

### When Services Go Down

External services have outages. Stripe had a partial outage in 2019 that affected some payment processing. GitHub goes down occasionally. AWS has had regional outages that took down huge portions of the internet.

**Graceful Degradation**: What's the minimum viable experience when a service is down?

Example: If SendGrid is down, you can't send email. Options:
- Queue the email and retry when the service recovers
- Display a message: "Email confirmation will arrive shortly"
- Use a fallback email provider (requires setting up two services)

**Timeouts and Retries**: Don't let your app hang forever waiting for an external service. Set reasonable timeouts (3-10 seconds for most APIs) and retry logic with exponential backoff.

**Circuit Breakers**: After several failed attempts to call a service, stop trying for a while. This prevents cascading failures where your app wastes resources repeatedly calling a service that's down.

You don't need to implement all of this immediately, but you should know which dependencies would benefit from these patterns.

### Vendor Lock-In

Some dependencies are easier to replace than others. Using a specific database? Your data model is probably tied to its features. Using AWS Lambda? Migrating to another platform requires rewriting code.

This isn't necessarily bad - sometimes lock-in is worth the benefits - but understand the cost of switching. For critical systems, favor standards and portable approaches when possible:
- PostgreSQL is easier to migrate than a proprietary database
- REST APIs are more portable than vendor-specific SDKs
- Standard authentication flows are easier to replace than proprietary ones

## Licensing and Legal Concerns

Every dependency has a license that defines how you can use it. Ignore this at your peril.

### Common Open Source Licenses

**MIT and Apache 2.0** (permissive): Use in commercial projects. Modify as needed. Don't remove copyright notices. That's basically it. Most JavaScript libraries use MIT.

**GPL (General Public License)** (copyleft): If you use GPL code, your code must also be GPL. That means open source. This is fine for open source projects, potentially problematic for proprietary software.

There's nuance here (linking, dynamic vs static, GPL v2 vs v3), but the simple version is: GPL requires you to open source your code. If you can't do that, don't use GPL libraries.

**BSD** (permissive): Similar to MIT, slightly different legal language.

**ISC** (permissive): Very simple permissive license, common in npm packages.

**Proprietary/Commercial**: Some libraries require paid licenses for commercial use. Read the terms.

### How to Check Licenses

**npm**: Run `npx license-checker --summary` to see all licenses in your project.

**Careful What You Install**: Before adding a dependency, check its license on npm, GitHub, or PyPI. It's usually in the LICENSE file in the repository.

If you're building a commercial product, avoid GPL unless you're prepared to open source your code. Stick with MIT, Apache, BSD, or ISC for libraries.

### Legal Review

If you're building anything commercial, have legal review your dependencies before launch. They'll want to know:
- List of all dependencies and their licenses
- Any GPL or copyleft licenses
- Any dependencies with patent clauses
- Any proprietary or commercial dependencies

Get this done early. Replacing a dependency deep in your architecture is expensive.

## Key Takeaways

**Start with an inventory**: List every library, service, and infrastructure component you depend on. You can't evaluate what you don't know exists.

**Scan for vulnerabilities regularly**: Use npm audit, Snyk, or Dependabot. Fix critical and high-severity issues immediately. Set up automated scanning so you don't have to remember.

**Know what's critical**: Identify dependencies where failure means your app is down or losing money. Plan for their failure with timeouts, retries, and graceful degradation.

**Check licenses**: MIT and Apache are safe for commercial use. GPL requires open sourcing your code. Get legal review before launch if you're building anything commercial.

**Monitor dependencies ongoing**: This isn't a one-time review. New vulnerabilities appear. Libraries get abandoned. Services change their pricing or terms. Check quarterly at minimum.

The dependencies you choose today shape what your app can do and how much pain you'll experience maintaining it. Spend an hour now reviewing them carefully. It beats spending a week later frantically replacing a critical dependency that turned out to be abandoned, vulnerable, or incompatible with your business model.

Most dependency problems are preventable with basic due diligence. Do the due diligence.
---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Architecture Design](../../architecture-design/surface/index.md) - Related design considerations
- [Software Design Document](../../software-design-document/surface/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
