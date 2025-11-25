---
title: "Dispatch Management: Maturity Levels Overview - When to Evolve Your Architecture"
type: "case-study"
phase: "02-design"
topic: "architecture-design"
domain: "saas-applications"
industry: "logistics"
reading_time: 20
keywords: ["architecture-evolution", "maturity-levels", "decision-framework", "scale-thresholds"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-24"
---

# Maturity Levels Overview: When to Evolve Your Architecture

## The Three Levels

This case study follows an application from product-market fit validation (100 users) to enterprise scale (10,000+ users). Each level adds complexity only when real business pain justifies it.

## Quick Comparison

| Dimension | Surface Level | Mid-Depth Level | Deep-Water Level |
|-----------|--------------|----------------|------------------|
| **Goal** | Prove it solves the problem | Reliable SaaS for paying customers | Enterprise scale, global reach |
| **Scale** | 100 concurrent users | 1,000 concurrent users | 10,000+ concurrent users |
| **Timeline** | 3-6 months to launch | 6-12 months post-Surface | 12-18 months post-Mid-Depth |
| **Team** | 1-2 developers | 3-5 engineers + DevOps | 10-15 engineers + platform team |
| **Infrastructure** | $50-300/month | $500-600/month | $10,000-50,000/month |
| **Architecture** | Monolith, single server | Monolith, multi-instance | Selective microservices extraction |
| **Uptime** | 95% (best effort) | 99% | 99.9% with multi-region |

---

## Surface Level: Product-Market Fit Validation

### Goal

Prove the dispatch workflow solves real problems. Success looks like 5-10 users for 30+ days saying "We can't go back to the old way" and willing to pay.

### What You Build

**Architecture**: Flask monolith on a single EC2 instance, Docker Compose deployment, one PostgreSQL database.

**Trade-offs accepted**:
- Self-signed SSL certificates (internal users only)
- In-memory queue (lost on restart)
- 30-second polling refresh (not real-time)
- Single server, no high availability
- Manual backups and monitoring

**Why these are acceptable**: You have 10 known customers. They understand it's not production-grade. Queue losses are annoying but customers can re-create requests in 2 minutes. The alternative—adding Redis, Let's Encrypt, multi-instance deployment—costs 10x more and teaches you nothing about product-market fit.

### When to Evolve

**You're ready for Mid-Depth when**:
- Response times exceed 5 seconds consistently
- Concurrent users approaching 100
- Queue losses causing complaints >2x per month
- Manual operations consuming >4 hours per week
- Revenue exceeds $10,000/month

If you're not hitting these triggers, you're not ready. More customers first, better architecture second.

See [Surface Level Architecture](../01-surface-level/architecture.md) for complete details.

---

## Mid-Depth Level: Production SaaS

### Goal

Reliable multi-tenant operation for paying customers. Enterprise customers demanding 99% uptime SLAs and data isolation.

### What Changes from Surface

**Architecture**: Still a monolith (microservices not justified yet), but now multi-instance with load balancer on Kubernetes or managed containers.

**Key additions**:
- Let's Encrypt SSL (automatic renewal)
- Redis-backed queue (persistent across deploys)
- WebSocket real-time updates (sub-second)
- Schema-per-tenant multi-tenancy (data isolation)
- ELK stack for centralized logging
- Prometheus + Grafana monitoring
- HashiCorp Vault for secrets
- Automated backups with alerts

**Evolution drivers** (what made you evolve):
- Enterprise customers refused to accept self-signed certificates
- Queue losses during deployments became unacceptable as deployment frequency increased
- 30-second polling too slow once customers had 20+ concurrent dispatchers
- Multiple organizations demanded data isolation for compliance
- Manual operations started consuming entire days per week

### Infrastructure Cost Jump

From $65/month to $525/month. Why?
- Kubernetes cluster: $150/month
- Worker nodes (3×): $150/month
- Redis managed service: $50/month
- Load balancer: $25/month
- ELK stack: $100/month
- Monitoring and backups: $50/month

This 8x cost increase is justified because you now have 50+ paying customers and revenue exceeding $50,000/month. Infrastructure is <2% of revenue.

### When to Evolve

**You're ready for Deep-Water when**:
- Concurrent users approaching 1,000
- Global customers experiencing >200ms latency
- Auth service bottleneck (>80% CPU while core app at 20%)
- Enterprise contracts requiring 99.9% SLAs
- Geographic data residency compliance requirements

If auth isn't a bottleneck, you're not ready for microservices. Monolith scaling stops working around 1,000-2,000 concurrent users, not 100.

See [Mid-Depth Architecture](../02-mid-depth-level/architecture.md) for complete details.

---

## Deep-Water Level: Enterprise Scale

### Goal

Global multi-region deployment with enterprise SLAs and compliance certifications (SOC 2 Type II, ISO 27001).

### What Changes from Mid-Depth

**Selective microservices extraction** (not all-or-nothing):
- **Extracted**: Auth Service (high request volume), Notification Service (CPU-intensive), Reporting Service (heavy S3 processing)
- **Stayed in monolith**: Users, Equipment, Dispatch modules (tight transactional coupling justifies keeping them together)

**Key additions**:
- Multi-region deployment (active-active)
- Service mesh (Istio/Linkerd)
- Distributed tracing (Jaeger)
- HSM for key management
- Citus sharding for PostgreSQL
- Zero-trust security architecture
- Kafka event-driven messaging
- Global load balancer with latency-based routing

### Why Selective Extraction?

**Auth Service** became a bottleneck because every API call validates tokens. Extracting it to a microservice allowed independent scaling (10 instances for auth, 3 for core app).

**Notification Service** is CPU-intensive and failure-tolerant. Can retry without impacting core dispatch logic. Good candidate for extraction.

**Reporting Service** does heavy S3 processing. Isolating it prevents report generation from impacting dispatch operations.

**Users, Equipment, Dispatch stayed together** because they have tight transactional coupling. Dispatching requires atomic updates across all three. Splitting them would create distributed transaction problems worse than any scaling benefit.

### Infrastructure Cost Jump

From $525/month to $10,000-50,000/month. Why?
- Multi-region Kubernetes: $500/month base
- Worker nodes (20+): $2,000/month
- Citus managed PostgreSQL: $1,000/month
- Kafka managed service: $500/month
- Service mesh overhead: $200/month
- Global load balancer: $200/month
- Security tools (WAF, DDoS): $1,000/month
- Observability stack: $500/month
- Multi-region data transfer: $1,000-5,000/month (varies with traffic)
- Compliance tooling: $1,000/month

This 20-40x cost increase from Mid-Depth is justified only when you have 500+ organizations, global presence, and revenue exceeding $5M/year.

### When NOT to Evolve Further

**Stop here if**:
- Infrastructure costs as percentage of revenue stabilize
- Customer complaints about performance/reliability are rare
- Team can maintain system without constant firefighting
- Adding features doesn't require architectural changes

Resist the urge to extract more microservices "because best practice." Every service you extract adds operational complexity, distributed tracing needs, network latency, and deployment coordination overhead.

See [Deep-Water Architecture](../03-deep-water-level/architecture.md) for complete details.

---

## Evolution Decision Framework

### Before You Evolve, Ask:

**1. Is this pain real or theoretical?**
- Real: "Customers complaining daily about 5-second load times with screenshots"
- Theoretical: "Microservices would let us scale better" (at 50 users)

**2. Is this pain frequent or edge case?**
- Frequent: "Queue losses every deployment (3x per week), customers filing tickets"
- Edge case: "Queue might be lost if server crashes mid-dispatch" (hasn't happened yet)

**3. Can we solve this without evolving?**
- Try: Add caching, optimize queries, add read replicas, increase instance size
- Before: Jumping to next maturity level

**4. What's the business cost of NOT evolving?**
- Quantify: Lost revenue, churned customers, support ticket time
- Compare to: Engineering time + infrastructure cost of evolution

**5. What's the evolution cost?**
- Engineering: 2-4 months of development time
- Opportunity: Features not built during evolution
- Operational: Ongoing complexity to maintain

### Red Flags: Evolving for Wrong Reasons

**Bad reasons**:
- "Microservices are best practice" (dogma without data)
- "Big tech companies use Kubernetes" (their scale differs from yours)
- "New engineer wants experience with technology X" (resume-driven development)
- "It will make future scaling easier" (YAGNI—You Ain't Gonna Need It)

**Good reasons**:
- "Response times exceed 5 seconds for 20% of requests" (measured data)
- "Queue losses causing 10 support tickets per month" (business impact)
- "Enterprise contracts require 99.9% SLA" (customer requirement)
- "Auth service CPU at 90% while core at 20%" (specific bottleneck)

---

## Cost Analysis Across Levels

### Infrastructure Costs (Monthly)

**Surface Level**: $50-300
- EC2 t3.medium: $50
- Storage + backups: $15
- Total: ~$65

**Mid-Depth Level**: $500-600
- Kubernetes cluster: $150
- Worker nodes (3×): $150
- Redis, load balancer, monitoring: $225
- Total: ~$525

**Deep-Water Level**: $10,000-50,000
- Multi-region infrastructure: $500
- Worker nodes (20+): $2,000
- Managed services (DB, Kafka, etc.): $2,500
- Security + compliance: $2,000
- Multi-region transfer: $1,000-5,000
- Total: ~$10,000-50,000 (varies with scale)

### Engineering Time Costs

**Surface Level**: 1-2 developers
- Mostly product development (80%)
- Some operations (20%)
- Annual cost: $100-200k

**Mid-Depth Level**: 3-5 engineers + DevOps
- Product development (70%)
- Operations and tooling (30%)
- Annual cost: $400-600k

**Deep-Water Level**: 10-15 engineers + platform team
- Product development (60%)
- Platform and operations (40%)
- Annual cost: $1.5-2.5M

### The Real Cost: Opportunity Cost

At Surface Level, every hour spent on "best practices" is an hour not spent talking to customers. The most expensive mistake is building the wrong thing perfectly.

At Mid-Depth, every week spent on infrastructure is a week not spent on revenue-generating features. Evolve when pain exceeds cost, not before.

At Deep-Water, infrastructure work is necessary to maintain SLAs. But resist over-engineering—every microservice extracted adds permanent operational overhead.

---

## Timeline Expectations

### Surface → Mid-Depth Migration

**Typical Duration**: 2-4 months

**Effort**:
- Infrastructure setup (Kubernetes, monitoring): 3-4 weeks
- Multi-tenancy implementation: 4-6 weeks
- Data migration: 2-3 weeks
- Testing and parallel run: 2-3 weeks

**You can accelerate this** if you planned for it at Surface Level (modular code, clean interfaces).

### Mid-Depth → Deep-Water Migration

**Typical Duration**: 6-9 months

**Effort**:
- Microservices extraction (3 services): 8-12 weeks
- Multi-region setup: 4-6 weeks
- Service mesh implementation: 3-4 weeks
- Observability (distributed tracing): 3-4 weeks
- Data sharding migration: 4-6 weeks
- Compliance certifications: 8-12 weeks
- Testing and validation: 4-6 weeks

**This assumes** you have the team and experience. First-time microservices migration adds 50% to timeline.

---

## Which Level Should You Start At?

### Start at Surface Level If:

You're validating product-market fit, have 1-2 developers, need to ship in 3-6 months, and infrastructure budget is <$500/month.

**This describes 95% of new products.**

### Start at Mid-Depth Level If:

You have signed enterprise customers pre-launch, have funding for 3-5 engineers, have DevOps expertise on team, and compliance is required from day one.

**This describes venture-funded startups with enterprise customers confirmed before writing code.**

### Start at Deep-Water Level If:

You have massive funding, experienced team of 10+ engineers, global customers confirmed, and regulatory requirements mandate service isolation.

**This describes <1% of new products. If you have to ask if you're in this category, you're not.**

### Most Startups Should:

1. **Start at Surface Level** (3-6 months) → prove product-market fit
2. **Evolve to Mid-Depth** when revenue and users justify it (6-12 months)
3. **Consider Deep-Water** only when hitting real scale limits (12-18 months later)

**Total timeline**: 2-3 years from idea to Deep-Water, IF you're successful enough to need it.

---

## Summary: Choose Your Level Wisely

**Surface Level** optimizes for learning speed. You're figuring out what to build. Architecture decisions optimize for iteration velocity, not scale.

**Mid-Depth Level** optimizes for reliability with paying customers. You've proven product-market fit, now you need production-grade infrastructure without over-engineering.

**Deep-Water Level** optimizes for global enterprise scale. You've proven both product-market fit and business model. Now you need geographic distribution and compliance certifications.

**Key insight**: Every level of complexity you add reduces development velocity. Add complexity only when the pain of not having it exceeds the pain of maintaining it.

Most companies never need Deep-Water. Many never need Mid-Depth. Start simple, evolve based on real pain, resist dogma.

---

For detailed architecture at each level:
- [Surface Level Architecture](../01-surface-level/architecture.md)
- [Mid-Depth Level Architecture](../02-mid-depth-level/architecture.md)
- [Deep-Water Level Architecture](../03-deep-water-level/architecture.md)
