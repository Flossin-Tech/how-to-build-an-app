---
title: "Dispatch Management: Surface Level - Product-Market Fit Validation"
type: "case-study"
phase: "02-design"
topic: "architecture-design"
domain: "saas-applications"
industry: "logistics"
reading_time: 15
keywords: ["monolith-first", "mvp", "docker-compose", "pmf-validation"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-24"
---

# Surface Level: Product-Market Fit Validation

## Goal

Prove the dispatch workflow solves real customer problems. Success looks like 5-10 active users for 30+ days saying "We can't go back to the old way" and being willing to pay for it.

**Timeline**: 3-6 months from start to first paying customers
**Team**: 1-2 developers
**Infrastructure**: $50-300/month

## Success Criteria

You're ready to evolve to Mid-Depth when you hit:
- 500+ completed dispatches
- <5 second response times under normal load
- Customers asking for production SLAs and multi-tenant isolation

If customers aren't using it enough to complain about limitations, you're not ready to add complexity yet.

## Architecture Decision: Monolith First

All backend modules in one Flask application, deployed with Docker Compose on a single EC2 instance. Everything talks to one PostgreSQL database.

**Why this works:**
- Development is 3x faster (no network calls between modules, no distributed transaction complexity)
- Debugging is simpler (all logs in one place, stack traces actually make sense)
- Infrastructure costs $50/month instead of $500 for microservices
- You can always split later if scale demands it

**Trade-offs accepted:**
- Can't scale modules independently (not needed at 100 users)
- Single point of failure (good backups and a 4-hour recovery window are acceptable for PMF validation)
- All-or-nothing deployments (weekly releases work fine with this customer base)

The key insight: these aren't failures to address later—they're deliberate choices that enable faster product development *right now*.

## Technology Stack

The stack is deliberately boring:

**Flask** for the backend because fast development matters more than peak performance. You'll hit product-market fit problems long before you hit Flask's performance ceiling at this scale.

**React** for the frontend because component reusability and hiring is easier than with newer frameworks. The large talent pool means you can hire developer #2 without them needing to learn an exotic framework.

**PostgreSQL** for the database because ACID transactions actually matter when you're assigning equipment and drivers atomically. MongoDB's lack of real transactions would bite you immediately. Single instance is fine—it handles 100 concurrent users easily.

**Keycloak** for auth because "we'll add SSO later" means "we'll never add it in practice." Enterprise customers expect OAuth2/OIDC from day one. The operational complexity is worth avoiding the technical debt of custom auth.

## What Gets Simplified

These simplifications are *features*, not bugs to fix later:

### In-Memory Queue
Dispatch requests that can't be filled immediately go into a Python list in memory. Lost on restart.

**Why it's acceptable**: Queue depth is typically <10 items. Deployments are infrequent (weekly). Losing the queue is annoying but not catastrophic—dispatchers can re-create requests in 2 minutes. Avoiding Redis saves $50/month and operational overhead.

**Evolution trigger**: When deployments become daily and queue losses cause customer complaints more than 2x per month, migrate to Redis.

### 30-Second Polling
The dashboard refreshes every 30 seconds. No WebSocket complexity, no server-sent events, just periodic API calls. Manual refresh button if you need it now.

**Why it's acceptable**: Dispatch operations take minutes to hours. Seeing an update 30 seconds late doesn't matter. The dispatcher is managing the overall situation, not reacting to split-second changes.

**Evolution trigger**: When dispatchers complain they need real-time updates, add WebSockets at Mid-Depth.

### Self-Signed SSL Certificates
Generate your own CA and issue service certificates from it. No Let's Encrypt automation, no certificate renewal monitoring.

**Why it's acceptable**: This is an internal tool for known users on corporate networks. Browser warnings are a one-time setup annoyance, not a barrier. Customers understand it's not production-grade yet.

**Evolution trigger**: When you start selling to external customers or they demand publicly-trusted certificates, migrate to Let's Encrypt at Mid-Depth.

### Single Server, No High Availability
One EC2 instance runs everything. If it dies, nothing works until you restore from backup.

**Why it's acceptable**: Recovery time of 4 hours is fine for PMF validation. Your 10 customers know this isn't enterprise-grade. The alternative (multi-instance with load balancer) costs 5x more and adds operational complexity that doesn't teach you anything about product-market fit.

**Evolution trigger**: When customer contracts require 99% uptime SLAs, move to multi-instance deployment at Mid-Depth.

### Manual Operations
Backups run on cron (or manually). Monitoring is "check if it's up." Log analysis is `grep` and `tail`. No ELK stack, no Prometheus, no alerting.

**Why it's acceptable**: With 10 customers, you know when something breaks because they tell you. The time you'd spend setting up comprehensive monitoring is better spent talking to customers and building features they need.

**Evolution trigger**: When manual operations consume >4 hours per week or you have too many customers to notice individually when things break, add proper monitoring at Mid-Depth.

## Deployment

Docker Compose on a single EC2 t3.medium (2 vCPU, 4 GB RAM, ~$50/month). Four containers:
- nginx (reverse proxy + static files)
- flask-app (all backend modules)
- keycloak (authentication)
- postgres (database for both app and keycloak)

Secrets in Docker secrets files (not in the compose file). Self-signed certificates in a `/certs` directory distributed to all services.

Deploy with `docker-compose up -d`. Rollback with `docker-compose down && git checkout previous-tag && docker-compose up -d`. Blue-green deployment, database migrations, and zero-downtime deploys come later if you need them.

## Security That Ships With Surface Level

Some security decisions are non-negotiable even at this level:

**Keycloak from day one**: OAuth2/OIDC, not custom password tables. This saves you from the "rewrite auth" project at Mid-Depth.

**SSL everywhere**: Even with self-signed certs, services communicate over HTTPS. Database connections require SSL. This habit prevents plaintext credentials from becoming embedded assumptions.

**Role-based access control**: Admin, dispatcher, driver, and viewer roles enforced at the API level. Attribute-based access control comes at Mid-Depth, but role-based covers 90% of needs now.

**Secrets in Docker secrets**: Not in environment variables, not in the compose file, not committed to git. The secrets live in separate files with filesystem permissions.

What you *don't* need yet: MFA, HSMs, Vault, zero-trust networking, SOC 2 compliance. Those come at Mid-Depth and Deep-Water when customer contracts require them.

## What You Learn at Surface Level

This phase is about validating assumptions, not building perfect architecture:

**Product questions:**
- Do customers actually need automated queue management, or do they prefer manual control?
- Is priority-based dispatch (urgent vs standard) sufficient, or do they need more granular priority levels?
- Do they care about equipment utilization reports, or just completion tracking?

**Technical questions:**
- Where are the performance bottlenecks? (Probably not where you think)
- Which features get used heavily vs rarely?
- What error conditions happen in practice vs theory?

**Business questions:**
- What are customers willing to pay?
- Which customer segments value this most?
- What integrations would unlock more customers?

The architecture decisions at Surface Level optimize for learning speed, not scale or reliability. Get the answers to these questions before you add the complexity of Mid-Depth.

## When to Evolve to Mid-Depth

**Quantitative triggers:**
- Response times consistently exceed 5 seconds
- Concurrent users approaching 100
- Queue losses causing customer complaints >2x per month
- Manual operations consuming >4 hours per week

**Qualitative triggers:**
- Multiple paying customers (not just pilot users)
- Enterprise customers demanding production SLAs
- Need for multi-tenant data isolation
- Compliance requirements emerging (SOC 2, HIPAA, etc.)

**Financial trigger:**
- Revenue exceeds $10,000/month (infrastructure costs become negligible percentage)

If you're not hitting these triggers, you're not ready for Mid-Depth complexity. More customers first, better architecture second.

## What You Don't Need Yet

**Kubernetes**: Docker Compose handles 100 users fine. The operational complexity of K8s doesn't teach you anything about product-market fit.

**Microservices**: The monolith scales to 1,000 concurrent users. Extract services only when specific bottlenecks justify it, not because "it's best practice."

**Multi-region deployment**: Your customers are in one time zone. Global distribution is a Deep-Water problem.

**Comprehensive monitoring**: Prometheus, Grafana, ELK stack—all valuable at Mid-Depth, all distractions right now. Customers will tell you when things break.

**Automated testing beyond basics**: Unit tests for business logic, integration tests for critical paths. E2E test suites and chaos engineering come later.

**Sophisticated CI/CD**: Git push, ssh into server, docker-compose up -d. Automated blue-green deployments with rollback are Mid-Depth concerns.

The most dangerous thing at Surface Level is building infrastructure for problems you don't have yet. Every hour spent on "best practices" is an hour not spent talking to customers.

## Real-World Timeline

**Month 1-2**: Core workflow implementation (work orders, equipment, basic dispatch)
**Month 3-4**: Auth integration, basic UI, first pilot customer
**Month 5-6**: Bug fixes, feature requests, second and third customers

If you're not in front of real customers by month 4, you're over-engineering. Ship something that works, learn from actual usage, iterate.

## Cost Breakdown

Monthly infrastructure (steady state):
- EC2 t3.medium: $50
- EBS storage: $10
- Backups (S3): $5
- Domain + SSL: $0 (self-signed)
- **Total: ~$65/month**

Development cost (3-6 months):
- 1-2 developers: $50,000-100,000 (salary for 6 months)
- Cheaper than building the wrong thing perfectly

The real cost is opportunity cost. Premature scaling costs time you could spend finding product-market fit.

## Next Steps

Once you hit the evolution triggers above, see [Mid-Depth Architecture](/02-design/architecture-design/case-studies/dispatch-management-mid-depth/) for:
- Multi-tenant data isolation (schema-per-tenant)
- Redis-backed queue persistence
- WebSocket real-time updates
- Let's Encrypt SSL automation
- ELK stack for centralized logging
- Automated backups with monitoring

But don't go there until Surface Level customers are literally asking for those capabilities.

---

**Related Case Study Documents:**
- [Main Overview](/02-design/architecture-design/case-studies/dispatch-management/)
- [Mid-Depth Level](/02-design/architecture-design/case-studies/dispatch-management-mid-depth/)
- [Deep-Water Level](/02-design/architecture-design/case-studies/dispatch-management-deep-water/)
- [Maturity Levels Overview](/02-design/architecture-design/case-studies/dispatch-management-maturity-levels/)
