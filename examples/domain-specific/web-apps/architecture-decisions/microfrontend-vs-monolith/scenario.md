# Scenario: Finance Sector Web Application Architecture Decision

**Context:** Internal web application requiring feature expansion
**Timeline:** November 2025
**Industry:** Finance (Regulated)
**Decision Trigger:** Adding three new feature areas

---

## The Business Context

### Current Application

**Purpose:** Internal pipeline management and configuration system

**Users:**
- <500 total users (employees across departments)
- <50 concurrent users (typical workday)
- No external/public access
- Standard work hours (9am-6pm EST)

**Current Functionality:**
- View pipeline status and history
- Basic configuration review
- Read-only access to pipeline results

**Technology Stack:**
- **Frontend:** React SPA built with Vite
- **Backend:** Flask REST API (Python)
- **Database:** PostgreSQL
- **Deployment:** NGINX serving static files + reverse proxy to Flask (internal port 5000)
- **Infrastructure:** Automated CI/CD, familiar NGINX configuration

### The Team

**Size:** 4-6 developers (single coordinated team)

**Skills:**
- React fundamentals: Advanced (2+ years production)
- Vite: Intermediate (basic configuration, dev server, plugins)
- Component architecture: Advanced (composition, hooks, state management)
- CI/CD: Intermediate (existing pipelines work well)
- NGINX: Intermediate (reverse proxy, static serving)
- Code splitting: Basic (awareness but not systematic use)
- **No microfrontend experience** (never used Module Federation, shell patterns, or distributed frontend)

**Work Style:**
- Coordinated releases (weekly to bi-weekly deployments)
- Code review before merge
- All developers can work across full stack
- No specialized sub-teams or domain ownership

**Constraints:**
- Finance sector compliance review for architecture changes
- Risk-averse culture (proven technology preferred)
- Change management approval process (2-4 weeks for major changes)
- Security review requirements (all architectural changes audited)

---

## The Requirements

### Three New Feature Areas

**1. CRUD Operations for Pipeline Items**

User needs:
- List view with filtering and sorting (by status, date, owner)
- Create new pipeline items with form validation
- Edit existing items with conflict detection
- Delete with confirmation and audit logging

Complexity:
- Integration with existing Flask API endpoints
- State management for lists and forms
- Permission checks (role-based access)

Estimated scope: 2-3 weeks development

**2. Pipeline Configuration File Editor**

User needs:
- Visual editor for YAML configuration files
- Syntax highlighting and real-time validation
- Save and preview functionality
- Version tracking and rollback capability

Complexity:
- Code editor component (Monaco or CodeMirror) - heavy dependency (~200KB)
- Backend integration for save/load
- Validation logic (YAML parsing, schema validation)

Estimated scope: 2-3 weeks development

**3. User Management System**

User needs:
- Admin-only access (role-based access control)
- User creation and editing
- Role assignment interface
- Permission management

Complexity:
- Integration with existing authentication system
- RBAC enforcement at multiple levels (UI + API)
- Audit trail for user changes (compliance requirement)

Estimated scope: 2-3 weeks development

---

## The Architecture Question

### What Triggered the Question

The presence of **three distinct feature areas** raised a reasonable question:

> "Should we adopt a microfrontend architecture to handle this growing complexity?"

**Reasoning:**
- Multiple feature domains (pipeline items, config editing, user management)
- Microfrontends are what modern teams use at scale
- Opportunity to modernize architecture before it becomes harder
- Industry case studies from IKEA, Spotify, Zalando look impressive

**Counterpoint (initial concerns):**
- Team has no microfrontend experience
- User scale is relatively small (<500 users)
- Single coordinated team (not multiple autonomous teams)
- Finance sector might resist experimental architecture

### The Stakes

**If we choose wrong:**
- **Too complex:** 4-6 months learning curve, delayed features, budget overrun
- **Too simple:** Technical debt, poor performance, difficult future scaling
- **Wrong for compliance:** Rejection in security review, rework required

**What success looks like:**
- Features delivered within 3-4 months
- Performance acceptable (<3s Time to Interactive)
- Security approval obtained
- Future growth supported (doesn't need rewrite in 1-2 years)

---

## Constraints Shaping the Decision

### Scale Constraints

**Current State:**
- <500 total users
- <50 concurrent users
- Single region (US East)
- Standard transaction volume (not high-frequency trading)

**Growth Forecast:**
- Modest growth expected (10-20% annually)
- No plans for external/public access
- No geographic expansion planned
- User base capped by employee count

**Implication:** Scale is relatively stable and small. Not expecting 10x growth.

### Organizational Constraints

**Team Structure:**
- Single small team (no autonomous sub-teams)
- Coordinated deployment cycles (everyone releases together)
- No distributed teams across timezones
- Developers work across all feature areas

**Implication:** No organizational need for independent deployment per feature area.

### Compliance Constraints (Finance Sector)

**Requirements:**
- Security review for architectural changes (2-4 weeks)
- Audit trails for all data modifications
- Clear rollback procedures documented and tested
- Risk assessment required
- Experimental/unproven technology faces higher scrutiny

**Culture:**
- Risk-averse (proven patterns preferred)
- Security incidents have severe consequences
- Compliance failures can halt projects
- "Move fast and break things" culture NOT acceptable

**Implication:** Architectures with higher risk profiles (new tooling, complex rollback) face longer approval and potential rejection.

### Technical Constraints

**Current Infrastructure:**
- NGINX configuration working well
- Vite build process familiar to team
- CI/CD pipelines automated
- No requirement for independent deployment by feature

**No Polyglot Requirements:**
- All features suitable for React
- No need for Angular + React + Vue in different features
- Backend remains unified Flask API

**Implication:** No technical forcing function requiring distributed frontend.

---

## Decision Criteria

Given the scenario, the architecture should:

1. **Match current scale** (500 users, 1 team) while supporting modest growth
2. **Align with team capabilities** (minimize learning investment, leverage existing skills)
3. **Pass compliance review** (low risk, simple audit trails, clear rollback)
4. **Deliver features quickly** (3-4 months to production)
5. **Maintain future flexibility** (doesn't lock us into a dead end)

---

## Options to Evaluate

**Option 1:** Microfrontend Architecture (Webpack Module Federation)
- Shell app + 3 independent microfrontends
- Runtime integration, separate deployments
- Industry-proven pattern

**Option 2:** Vite Module Federation
- Same pattern using Vite plugin
- Leverages existing Vite knowledge
- Less mature ecosystem

**Option 3:** Extended Monolith with Dynamic Loading
- Single codebase with React.lazy code splitting
- Feature-based organization
- Modular architecture without distributed deployment

---

## What This Scenario Demonstrates

**Common Situation:**
Many teams face this decision when adding features to existing applications. Multiple feature areas trigger "should we split this up?" instinct.

**Key Insight:**
The presence of multiple features doesn't automatically justify microfrontends. The decision requires quantitative assessment of scale, team capability, and organizational needs.

**Next:** See [approach.md](approach.md) for how we analyzed these options systematically.

---

**Related Files:**
- [approach.md](approach.md) - How the decision was made
- [what-went-right.md](what-went-right.md) - Why monolith succeeded
- [templates/](templates/) - Apply this framework to your scenario
