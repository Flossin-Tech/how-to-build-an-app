---
title: "Dispatch Management: Progressive Architecture from PMF to Enterprise Scale"
type: "case-study"
phase: "02-design"
topic: "architecture-design"
domain: "saas-applications"
industry: "logistics"
reading_time: 25
keywords: ["monolith-first", "progressive enhancement", "modular monolith", "microservices", "scale", "b2b-saas"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-24"
---

# Dispatch Management Application: Monolith to Microservices Journey

**Authors:** Engineering Team, How to Build an App
**Date:** November 24, 2025
**Decision Status:** Guidance Framework
**Industry Context:** Logistics, B2B SaaS, Multi-Tenant

---

## Abstract

**Background:** A B2B SaaS dispatch management application evolved from product-market fit validation (100 users) through production SaaS (1,000 users) to enterprise scale (10,000+ users), demonstrating when and why to add architectural complexity.

**Research Question:** How should architecture evolve based on real business drivers rather than theoretical concerns?

**Methodology:** Progressive enhancement framework evaluating three maturity levels - Surface (PMF validation), Mid-Depth (production SaaS), and Deep-Water (enterprise scale). Each level justified by quantitative triggers: user scale, team size, revenue thresholds, and technical pain points.

**Key Findings:**
- Monolith-first strategy enables 3x faster development velocity at Surface level
- Multi-tenancy added at Mid-Depth when 50+ organizations require data isolation
- Selective microservices extraction at Deep-Water only for proven bottlenecks (Auth, Notifications, Reporting)
- Infrastructure costs: $50/month (Surface) → $525/month (Mid-Depth) → $21,000/month (Deep-Water)
- Timeline: 2-3 years from idea to Deep-Water, if successful enough to need it

**Conclusion:** Starting with a modular monolith is the optimal choice for product-market fit validation. Complexity should be added progressively based on real business drivers (scale, compliance, SLA requirements) rather than theoretical architectural preferences.

**Significance:** Demonstrates quantitative decision framework for architecture evolution applicable across B2B SaaS products, emphasizing current-state optimization over future-state speculation.

**Keywords:** Monolith-First, Progressive Enhancement, Multi-Tenancy, B2B SaaS, Microservices, Scale Appropriateness

---

## 1. Introduction

### 1.1 Problem Statement

Organizations need to efficiently dispatch equipment (vehicles, machinery) with qualified drivers to work sites based on work orders. When no drivers are available, requests must queue automatically and be fulfilled as resources become available. All dispatch activity must be tracked, reported, and auditable.

**Industries**: Logistics, healthcare (medical equipment), construction, utilities, government services

This case study addresses a common problem in software architecture: when to add complexity. The proliferation of microservices and distributed architecture case studies from large enterprises (Netflix, Uber, Airbnb) has created pressure to adopt complex architectures regardless of appropriateness for team size, user scale, or business context.

### 1.2 Organizational Context

**Key Learning Objective**: Understand that starting with a monolith is not a compromise—it's the optimal choice for product-market fit validation. This case study shows exactly when and why to evolve your architecture based on real business drivers, not theoretical concerns.

### 1.3 The Thermocline Principle Applied

This case study is organized by progressive enhancement levels, demonstrating the Thermocline Principle in practice:

- **Surface Level**: Essential architecture for everyone validating product-market fit
- **Mid-Depth**: Practical guidance for production SaaS with paying customers
- **Deep-Water**: Advanced topics for enterprise-scale global operations

Each depth level builds upon the previous one, allowing readers to jump to what they need without reading linearly.

### 1.4 Architecture Philosophy

**Core Principle:** Start simple, evolve based on real pain points.

The monolith-first strategy is not a compromise—it's the optimal strategy for product-market fit validation. Complexity is added progressively, driven by actual business needs rather than theoretical concerns.

**Why Monolith First?**

- **Development Velocity**: 3x faster development compared to microservices
- **Infrastructure Economics**: Surface Level costs $50-300/month vs $500-1,000/month for microservices
- **Technical Benefits**: ACID transactions across all modules, shared database eliminates data synchronization issues
- **Team Fit**: Single coordinated team benefits from unified codebase

**What Makes It "Modular"?**

Not all monoliths are created equal. This is a **modular monolith**, not a "big ball of mud":

- Clear module boundaries (Auth, Users, Equipment, Dispatch, Reporting)
- Modules communicate through service layer interfaces
- Each module can be extracted to a microservice if needed
- But extraction happens **only when scale demands it**

---

## 2. The Three Maturity Levels

### Quick Comparison

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

## 3. Technology Stack

The stack is deliberately boring and proven:

- **Frontend**: React 18+ with Vite (component reusability, large talent pool)
- **Backend**: Flask (Python) - modular monolith (fast development, sufficient performance)
- **Authentication**: Keycloak (OAuth2/OIDC) from day one (enterprise customers expect SSO)
- **Database**: PostgreSQL with schema-per-tenant at Mid-Depth+ (ACID transactions matter)
- **Security**: SSL/TLS throughout, even at Surface Level (prevent plaintext habits)

**Why These Choices?**

- **React**: Large talent pool means you can hire developer #2 without exotic framework training
- **Flask**: Fast development matters more than peak performance at Surface level
- **PostgreSQL**: ACID transactions actually matter when assigning equipment and drivers atomically
- **Keycloak**: "We'll add SSO later" means "we'll never add it in practice"

---

## 4. Key Architectural Decisions

### Decision 1: Monolith First Strategy

**Decision**: Start with modular monolith, not microservices

**Rationale**:
- Development velocity 3x faster than microservices
- Single deployment simplifies debugging
- Shared database enables ACID transactions
- Infrastructure costs: $50/month vs $500/month for microservices

**When We Evolved**: Only at Deep-Water level (10,000+ users) did we extract high-volume services (Auth, Notifications) to microservices. Core business logic (Dispatch, Users, Equipment) stayed in the monolith to maintain transactional consistency.

### Decision 2: Security From Day One

**Decision**: Integrate Keycloak from Surface Level

**Rationale**:
- "We'll add SSO later" becomes "we'll never add it" in practice
- Enterprise customers expect OAuth2/OIDC, not custom auth
- Self-signed certificates acceptable for Surface Level
- Professional certificates (Let's Encrypt) for Mid-Depth+

**Progressive Enhancement**:
- **Surface**: Keycloak + self-signed certs + Docker secrets + basic RBAC
- **Mid-Depth**: Let's Encrypt + Vault + MFA + ABAC
- **Deep-Water**: HSM + Zero-trust + SOC 2/ISO 27001 compliance

### Decision 3: Progressive Database Strategy

**Surface Level**: Single PostgreSQL database, all tables in public schema

**Mid-Depth Level**: Schema-per-tenant for data isolation
- Each tenant gets isolated PostgreSQL schema
- Automated schema creation function
- Connection pooling with pgBouncer

**Deep-Water Level**: Citus sharding for geographic distribution
- Horizontal scaling with distributed tables
- Multi-region replication
- Read replicas for reporting workloads

---

## 5. Evolution Decision Framework

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

## 6. Success Criteria by Level

### Surface Level
- 5-10 active dispatcher users for 30+ days
- 500+ dispatch cycles completed successfully
- <5 second response times under normal load
- Qualitative validation: "We can't go back to the old way"

### Mid-Depth
- 50+ paying organizations using the system
- 99% uptime over 90-day periods
- <2 second average API response time
- Zero data loss incidents
- SOC 2 Type I audit passed (if pursuing compliance)

### Deep-Water
- 500+ organizations across multiple regions
- 99.9% uptime with <1 hour RTO
- Support for 10,000+ concurrent users
- ISO 27001 certified
- Multi-region failover tested quarterly

---

## 7. What Makes This Case Study Valuable

1. **Real Business Context**: Not toy examples—shows actual workflows and edge cases
2. **Explicit Trade-Offs**: Documents what was deliberately simplified at each level and why
3. **Evolution Triggers**: Metric-based decisions, not guesswork ("We evolved when response times exceeded 5 seconds")
4. **Cost-Aware Architecture**: Infrastructure costs at each scale
5. **Anti-Pattern Documentation**: Shows what NOT to do and when simplicity is better
6. **Complete Implementation Guidance**: Not just architecture diagrams—includes module structure, API specifications, testing strategies

---

## 8. How to Use This Case Study

### For New Developers
Start with **[Surface Level Architecture](/02-design/architecture-design/case-studies/dispatch-management-surface/)** to understand how to build an MVP that's secure enough but not over-engineered. This shows a realistic 3-6 month timeline to launch.

### For YOLO Devs
Review security architecture documentation to identify critical gaps in your 2am build. Focus on the "non-negotiable security" section in each level.

### For Specialists Expanding
- Backend engineers learning DevOps: Focus on deployment evolution across levels
- Frontend engineers learning backend: Review module structure for backend patterns

### For Generalist Leveling Up
Read all three levels sequentially to understand systematic architectural thinking and when to add complexity.

---

## 9. Related Topics

### Phase 02: Design
- **Architecture Design**: Monolith vs microservices trade-offs
- **Database Design**: Multi-tenancy patterns, schema-per-tenant
- **Frontend Architecture**: Feature-based module organization

### Phase 03: Development
- **Secure Coding Practices**: Keycloak integration, JWT validation
- **Code Quality**: Module boundaries, service layer patterns

### Phase 05: Deployment
- **Deployment Strategy**: Docker Compose → Kubernetes → Multi-region
- **Access Control**: RBAC at Surface, ABAC at Mid-Depth, policy-as-code at Deep-Water

### Phase 06: Operations
- **Monitoring & Logging**: Basic logs → ELK stack → Distributed tracing
- **Backup & Recovery**: RTO/RPO progression across maturity levels

---

## 10. Alternatives and When to Use Them

### When This Pattern Fits
- B2B SaaS applications
- Need for multi-tenancy
- Compliance requirements (HIPAA, SOC 2, ISO 27001)
- Geographic distribution eventually needed
- Small team (< 10 engineers at start)

### When NOT to Use This Pattern
- Consumer-facing applications with unpredictable viral growth
- Real-time requirements from day one (gaming, trading platforms)
- Team with deep microservices expertise and funding
- Single-tenant enterprise software
- Existing monolith that's already proven at scale

### Alternative Approaches
- **Microservices First**: If you have funding, experienced team, and confirmed enterprise customers
- **Serverless First**: For event-driven workloads with unpredictable traffic
- **Static Site + API**: For content-heavy applications with minimal state

---

## 11. Detailed Architecture Documentation

This case study includes comprehensive documentation at each maturity level:

- **[Surface Level](/02-design/architecture-design/case-studies/dispatch-management-surface/)**: Product-Market Fit Validation
- **[Mid-Depth Level](/02-design/architecture-design/case-studies/dispatch-management-mid-depth/)**: Production SaaS
- **[Deep-Water Level](/02-design/architecture-design/case-studies/dispatch-management-deep-water/)**: Enterprise Scale
- **[Maturity Levels Overview](/02-design/architecture-design/case-studies/dispatch-management-maturity-levels/)**: When to Evolve

---

## 12. Key Statistics

- 7 development lifecycle phases covered
- 3 distinct maturity levels
- Infrastructure cost range: $50/month to $50,000/month (1000x increase)
- Timeline: 3-6 months (Surface) to 2-3 years (Deep-Water)
- Team growth: 1-2 developers to 40-50 people
- Scale progression: 100 to 10,000+ concurrent users (100x increase)

---

## 13. Contributing to This Case Study

This case study benefits from real-world experiences:

- **What worked differently in your context**: Different industries, scales, or tech stacks
- **Lessons learned**: Mistakes made during evolution, unexpected challenges
- **Cost data**: Actual infrastructure costs at each level
- **Timeline adjustments**: How long migrations actually took vs. estimates

---

**Document Version:** 1.0
**Last Updated:** November 24, 2025
**Next Review:** February 24, 2026 (Quarterly)
