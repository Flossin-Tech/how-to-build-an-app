---
title: "Dispatch Management Application - Progressive Architecture Case Study"
domain: "saas-applications"
category: "case-study"
difficulty: "intermediate"
topics:
  - phase: "02-design"
    topic: "architecture-design"
    depths: ["surface", "mid-depth", "deep-water"]
  - phase: "02-design"
    topic: "database-design"
    depths: ["mid-depth", "deep-water"]
  - phase: "03-development"
    topic: "secure-coding-practices"
    depths: ["surface", "mid-depth", "deep-water"]
  - phase: "05-deployment"
    topic: "deployment-strategy"
    depths: ["surface", "mid-depth", "deep-water"]
personas: ["new-developer", "yolo-dev", "specialist-expanding", "generalist-leveling-up"]
last_updated: "2025-11-24"
---

# Dispatch Management Application: Monolith to Microservices Journey

## Overview

This case study demonstrates the evolution of a B2B SaaS dispatch management application across three maturity levels, illustrating when and why to add architectural complexity. The system manages equipment dispatch with driver assignment, work order tracking, and automated queue management.

**Key Learning Objective**: Understand that starting with a monolith is not a compromise—it's the optimal choice for product-market fit validation. This case study shows exactly when and why to evolve your architecture based on real business drivers, not theoretical concerns.

## Core Business Problem

Organizations need to efficiently dispatch equipment (vehicles, machinery) with qualified drivers to work sites based on work orders. When no drivers are available, requests must queue automatically and be fulfilled as resources become available. All dispatch activity must be tracked, reported, and auditable.

**Industries**: Logistics, healthcare (medical equipment), construction, utilities, government services

## Three Maturity Levels

This case study is organized by progressive enhancement levels, demonstrating the Thermocline Principle in practice:

### Surface Level: Product-Market Fit Validation
- **Goal**: Prove the dispatch workflow solves real problems
- **Scale**: 100 concurrent users, 50 concurrent dispatchers
- **Timeline**: 3-6 months to launch
- **Infrastructure**: Single-server deployment with Docker Compose
- **Cost**: $50-300/month
- **Focus**: Core functionality, basic security, rapid iteration

### Mid-Depth: Production SaaS
- **Goal**: Reliable multi-tenant operation for paying customers
- **Scale**: 1,000 concurrent users, multiple organizations
- **Timeline**: 6-12 months post-Surface Level
- **Infrastructure**: Kubernetes or managed containers, load balancing
- **Cost**: $500-600/month
- **Focus**: Performance, reliability, enterprise integration, compliance

### Deep-Water: Enterprise Scale
- **Goal**: Global multi-region deployment with enterprise SLAs
- **Scale**: 10,000+ concurrent users, worldwide
- **Timeline**: 12-18 months post-Mid-Depth
- **Infrastructure**: Microservices, multi-region, advanced automation
- **Cost**: $10,000-50,000/month
- **Focus**: Geographic distribution, service extraction, compliance certifications

## Technology Stack

- **Frontend**: React 18+ with Vite
- **Backend**: Flask (Python) - modular monolith
- **Authentication**: Keycloak (OAuth2/OIDC) from day one
- **Database**: PostgreSQL with schema-per-tenant (Mid-Depth+)
- **Security**: SSL/TLS throughout, even at Surface Level

## Key Architectural Decisions

### 1. Monolith First Strategy

**Decision**: Start with modular monolith, not microservices

**Rationale**:
- Development velocity 3x faster than microservices
- Single deployment simplifies debugging
- Shared database enables ACID transactions
- Infrastructure costs: $50/month vs $500/month for microservices

**What Makes It "Modular"**:
- Clear module boundaries (Auth, Users, Equipment, Dispatch, Reporting)
- Modules communicate through well-defined service layers
- Module structure enables future extraction if needed

**When We Evolved**: Only at Deep-Water level (10,000+ users) did we extract high-volume services (Auth, Notifications) to microservices. Core business logic (Dispatch, Users, Equipment) stayed in the monolith to maintain transactional consistency.

### 2. Security From Day One

**Decision**: Integrate Keycloak from Surface Level

**Rationale**:
- "We'll add SSO later" becomes "we'll never add it" in practice
- Enterprise customers expect OAuth2/OIDC, not custom auth
- Self-signed certificates acceptable for Surface Level
- Professional certificates (Let's Encrypt) for Mid-Depth+

**Progressive Enhancement**:
- **Surface**: Keycloak + self-signed certs + Docker secrets
- **Mid-Depth**: Let's Encrypt + Vault + MFA + ABAC
- **Deep-Water**: HSM + Zero-trust + SOC 2/ISO 27001 compliance

### 3. Progressive Database Strategy

**Surface Level**: Single PostgreSQL database, all tables in public schema

**Mid-Depth Level**: Schema-per-tenant for data isolation
- Each tenant gets isolated PostgreSQL schema
- Automated schema creation function
- Connection pooling with pgBouncer

**Deep-Water Level**: Citus sharding for geographic distribution
- Horizontal scaling with distributed tables
- Multi-region replication
- Read replicas for reporting workloads

## Case Study Structure

### [00-overview/](./00-overview/)
- Business problem and requirements
- Architecture philosophy
- When to use this pattern vs alternatives

### [01-surface-level/](./01-surface-level/)
- Single-server Docker Compose deployment
- MVP feature scope
- Trade-offs accepted (and why they're acceptable)
- Success criteria for PMF validation

### [02-mid-depth-level/](./02-mid-depth-level/)
- Evolution drivers (metrics that triggered changes)
- Multi-tenant architecture
- Migration strategy from Surface Level
- New capabilities unlocked

### [03-deep-water-level/](./03-deep-water-level/)
- Selective microservices extraction
- Multi-region deployment
- When NOT to do this (cost-benefit analysis)
- Alternative approaches

### [cross-cutting/](./cross-cutting/)
- Security evolution across all levels
- Modular monolith patterns
- Queue management progression
- Multi-tenancy implementation
- Module organization (frontend and backend)

## Success Criteria by Level

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

## What Makes This Case Study Valuable

1. **Real Business Context**: Not toy examples—shows actual workflows and edge cases
2. **Explicit Trade-Offs**: Documents what was deliberately simplified at each level and why
3. **Evolution Triggers**: Metric-based decisions, not guesswork ("We evolved when response times exceeded 5 seconds")
4. **Cost-Aware Architecture**: Infrastructure costs at each scale
5. **Anti-Pattern Documentation**: Shows what NOT to do and when simplicity is better
6. **Complete Implementation Guidance**: Not just architecture diagrams—includes module structure, API specifications, testing strategies

## How to Use This Case Study

### For New Developers
Start with **01-surface-level/** to understand how to build an MVP that's secure enough but not over-engineered. This shows a realistic 3-6 month timeline to launch.

### For YOLO Devs
Review **cross-cutting/security-evolution.md** to identify critical gaps in your 2am build. Focus on the "non-negotiable security" section.

### For Specialists Expanding
Backend engineers learning DevOps: Focus on deployment evolution across levels.
Frontend engineers learning backend: Review **cross-cutting/module-structure.md** for backend patterns.

### For Generalist Leveling Up
Read all three levels sequentially to understand systematic architectural thinking and when to add complexity.

## Related Topics

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

## Alternatives and When to Use Them

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

## Next Steps

After reviewing this case study:

1. **Assess your current phase**: Are you at Surface, Mid-Depth, or forcing Deep-Water prematurely?
2. **Identify evolution triggers**: Use metrics, not guesses (response times, error rates, customer complaints)
3. **Plan migration timeline**: Based on customer traction and funding, not arbitrary dates
4. **Extract reusable patterns**: Module structure, security patterns, deployment strategies

## Contributing to This Case Study

This case study benefits from real-world experiences:

- **What worked differently in your context**: Different industries, scales, or tech stacks
- **Lessons learned**: Mistakes made during evolution, unexpected challenges
- **Cost data**: Actual infrastructure costs at each level
- **Timeline adjustments**: How long migrations actually took vs. estimates

## Source Documentation

This case study is derived from comprehensive planning documentation including:
- Business requirements and workflows
- Security architecture across all levels
- Data architecture and multi-tenancy patterns
- Module structure (frontend and backend)
- Migration strategies and testing approaches

See subdirectories for detailed documentation.
