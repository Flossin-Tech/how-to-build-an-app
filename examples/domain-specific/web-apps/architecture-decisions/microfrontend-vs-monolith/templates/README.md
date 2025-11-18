# Architecture Decision Templates

**Purpose:** Reusable assessment tools for making quantitative architecture decisions

**Origin:** Extracted from the [Microfrontend vs. Monolith case study](/content/02-design/architecture-design/case-studies/microfrontend-vs-monolith.md)

**Applicability:** These templates work for ANY architecture decision, not just microfrontends

---

## Available Templates

### 1. Scale Appropriateness Assessment
**File:** [scale-assessment-template.md](scale-assessment-template.md)

**Purpose:** Determine if your current scale matches the architecture option's optimal threshold

**When to use:**
- Before choosing between architecture options
- To validate whether "we need X because we're growing" is true
- To calculate gap between current state and documented thresholds

**Time to complete:** 30-45 minutes

**Outputs:**
- Gap multipliers (1x, 3x, 10x away from threshold)
- Scale fit score (0-7 dimensions matching)
- Re-evaluation triggers (when to revisit decision)

**Example questions answered:**
- Are we at the scale where microfrontends provide value?
- Is our team size appropriate for microservices?
- Do we have the user volume justifying Kubernetes?

---

### 2. Team Capability Assessment
**File:** [capability-assessment-template.md](capability-assessment-template.md)

**Purpose:** Honestly assess team's ability to build and maintain the architecture option

**When to use:**
- After identifying architecture options
- Before committing budget/timeline
- To estimate learning investment

**Time to complete:** 45-60 minutes

**Outputs:**
- Capability match percentage (skills we have / skills required)
- Gap percentage (skills missing)
- Learning investment ($, weeks)
- Capability fit score (0-100%)

**Critical rule:** No grade inflation. Assess honestly, not aspirationally.

**Example questions answered:**
- Can our team successfully build this?
- How long will it take to learn required skills?
- What will it cost in opportunity cost and external help?

---

### 3. Decision Scorecard
**File:** [decision-scorecard.md](decision-scorecard.md)

**Purpose:** Score multiple architecture options across weighted criteria for data-driven decision

**When to use:**
- After completing scale and capability assessments
- To compare 2-4 architecture options objectively
- To make final recommendation with supporting data

**Time to complete:** 60-90 minutes (after assessments done)

**Outputs:**
- Weighted scores for each option (0-10 scale)
- Winner identification
- Sensitivity analysis (does winner change if weights change?)

**Example questions answered:**
- Which option scores highest across our priorities?
- Is the winner robust (wins even if we change weights)?
- What are the key trade-offs?

---

## How to Use These Templates

### Workflow

**Step 1: Identify Options** (30 minutes)
- List 2-4 architecture options you're considering
- Brief description of each option
- Examples: Monolith, Microservices, Microfrontends, Serverless, etc.

**Step 2: Scale Assessment** (30-45 minutes per option)
- Use [scale-assessment-template.md](scale-assessment-template.md)
- Research industry thresholds for each option
- Calculate gaps (current state vs. thresholds)
- Verdict: Appropriate, Borderline, Premature, Wrong scale

**Step 3: Capability Assessment** (45-60 minutes per option)
- Use [capability-assessment-template.md](capability-assessment-template.md)
- List ALL required skills (be comprehensive)
- Rate team's current skills (be honest)
- Calculate gap percentage and learning investment
- Verdict: Good fit, Moderate fit, Poor fit, Unacceptable

**Step 4: Decision Scorecard** (60-90 minutes)
- Use [decision-scorecard.md](decision-scorecard.md)
- Set criteria weights based on organizational priorities
- Score each option (1-10) across criteria
- Calculate weighted totals
- Identify winner and validate with sensitivity analysis

**Step 5: Document Decision** (30 minutes)
- Capture recommendation
- Document rationale with quantitative evidence
- Define re-evaluation triggers
- Get stakeholder sign-off

**Total Time:** 4-6 hours for thorough analysis (spread over 1-2 weeks)

---

## Example Use Cases

### Use Case 1: Frontend Architecture Decision

**Question:** Microfrontends vs. Extended Monolith?

**Templates Used:**
1. **Scale Assessment:** Found 10x below microfrontend threshold (500 vs. 5,000 users)
2. **Capability Assessment:** 68% skill gap for microfrontends vs. 10% for monolith
3. **Decision Scorecard:** Monolith scored 9.2/10 vs. microfrontends 2.5/10

**Outcome:** Extended monolith recommended, delivered $207K-$332K cheaper

**See full case study:** [microfrontend-vs-monolith.md](/content/02-design/architecture-design/case-studies/microfrontend-vs-monolith.md)

---

### Use Case 2: Backend Architecture Decision

**Question:** Microservices vs. Monolith?

**Templates Used:**
1. **Scale Assessment:**
   - Current: 2,000 users, 1 team
   - Microservices threshold: 10,000+ users, 3+ autonomous teams
   - Gap: 5x users, 3x teams → Premature

2. **Capability Assessment:**
   - Microservices require: Service mesh, distributed tracing, eventual consistency, circuit breakers
   - Team capability match: 40% (6 of 15 critical skills)
   - Learning investment: $80K-$120K

3. **Decision Scorecard:**
   - Monolith: 8.5/10 (scale-appropriate, team-ready, low cost)
   - Microservices: 3.2/10 (premature, high learning curve, expensive)

**Outcome:** Modular monolith with clear service boundaries

---

### Use Case 3: Database Decision

**Question:** SQL (PostgreSQL) vs. NoSQL (MongoDB)?

**Templates Used:**
1. **Scale Assessment:**
   - Current: 50K transactions/day, structured data, ACID required
   - NoSQL threshold: 1M+ transactions/day OR flexible schema need
   - Gap: 20x below transaction volume, don't need schema flexibility

2. **Capability Assessment:**
   - SQL: Team has 90% capability match (SQL expertise)
   - NoSQL: Team has 30% capability match (no MongoDB experience)
   - Learning investment: SQL $5K vs. NoSQL $60K

3. **Decision Scorecard:**
   - PostgreSQL: 9.0/10 (ACID compliance, team expertise, proven)
   - MongoDB: 4.5/10 (no schema flexibility need, learning curve)

**Outcome:** PostgreSQL with JSON columns for semi-structured data

---

## Adapting Templates to Your Context

### Industry Adjustments

**Finance / Healthcare (Risk-Averse):**
- **Scale Assessment:** Add compliance/audit complexity dimension
- **Capability Assessment:** Weight "proven technology" higher
- **Decision Scorecard:** Increase risk weighting to 25-30%

**Startup (High Risk Tolerance):**
- **Scale Assessment:** Focus on growth trajectory, not current state
- **Capability Assessment:** Accept higher skill gaps (team can learn fast)
- **Decision Scorecard:** Weight timeline and speed heavily (35-40%)

**Enterprise (Multiple Stakeholders):**
- **Scale Assessment:** Add organizational politics dimension
- **Capability Assessment:** Include vendor support requirements
- **Decision Scorecard:** Add stakeholder buy-in criterion

### Domain Adjustments

**Microservices Decision:**
- **Scale threshold research:** Transaction volume, team autonomy needs
- **Capability skills:** Service mesh, distributed tracing, event sourcing
- **Risk factors:** Distributed debugging, eventual consistency challenges

**Kubernetes Decision:**
- **Scale threshold research:** Container count, deployment frequency
- **Capability skills:** YAML, kubectl, Helm, observability
- **Risk factors:** Operational complexity, MTTR increase

**GraphQL Decision:**
- **Scale threshold research:** Client diversity, query flexibility needs
- **Capability skills:** Schema design, resolver optimization, N+1 prevention
- **Risk factors:** Query complexity attacks, learning curve

---

## Tips for Effective Use

### 1. Honest Assessment is Critical

**Common Pitfalls:**
- ❌ Inflating team capabilities ("we'll learn it quickly")
- ❌ Assuming future scale ("we might have 10,000 users someday")
- ❌ Ignoring organizational constraints (risk tolerance, budget)

**Best Practices:**
- ✅ Rate skills based on evidence (production experience)
- ✅ Use current state + 2-3x headroom, not 10x speculation
- ✅ Account for industry context (finance ≠ startup)

### 2. Research Industry Thresholds

**Don't guess thresholds. Research them.**

**Good sources:**
- Company engineering blogs (IKEA, Spotify, Netflix)
- Conference talks with user/team metrics
- Academic papers with case studies
- Documentation showing "best for X users"

**Document sources in templates** (provides credibility)

### 3. Get Second Opinion

**Cognitive biases affect individual assessments:**
- Confirmation bias (favoring preferred option)
- Optimism bias (underestimating learning time)
- Dunning-Kruger effect (overestimating team capability)

**Mitigation:**
- Have 2-3 people complete capability assessment independently
- Compare results, discuss discrepancies
- Use average or conservative estimate

### 4. Sensitivity Analysis

**Test if winner changes when assumptions change:**
- What if we grow 10x faster than expected? (scale scenario)
- What if learning takes 2x longer? (capability scenario)
- What if budget gets cut 50%? (financial scenario)

**Robust decision:** Winner stays same across scenarios

---

## When NOT to Use These Templates

**Skip templates for:**
- Trivial decisions (proven best practice, no alternatives)
- Time-sensitive emergencies (production down, need quick fix)
- Decisions easily reversed (can try and rollback quickly)

**Use lightweight checklist instead:**
1. Does this solve a real problem we have today?
2. Can our team build this in <2 weeks?
3. Is it easily reversible if wrong?

**If all "Yes," proceed. If any "No," consider using templates.**

---

## Maintenance and Updates

**These templates should be updated when:**
- Industry thresholds change (new research emerges)
- New architecture patterns gain adoption (e.g., edge computing)
- Team capability norms shift (e.g., Kubernetes becomes standard)

**Update frequency:** Annually or when significant technology shifts occur

**Version tracking:** Templates include version and last updated date

---

## Contributing Improvements

**Have you used these templates? Share:**
- What worked well
- What was confusing
- What dimensions were missing
- Domain-specific adaptations

**Submit improvements:**
- Enhanced templates for specific domains
- Additional use case examples
- Industry-specific adjustments

---

## Related Resources

**Comprehensive Case Study:**
- [Microfrontend vs. Monolith](/content/02-design/architecture-design/case-studies/microfrontend-vs-monolith.md) - Full methodology

**Practical Example:**
- [Scenario](../scenario.md) - Real-world problem
- [Approach](../approach.md) - How framework was applied
- [Takeaways](../takeaways.md) - Generalizable lessons

**Educational Content:**
- [Architecture Design (Surface)](/content/02-design/architecture-design/surface/index.md)
- [Architecture Design (Mid-Depth)](/content/02-design/architecture-design/mid-depth/index.md)
- [Architecture Design (Deep-Water)](/content/02-design/architecture-design/deep-water/index.md)

---

**Template Version:** 1.0
**Last Updated:** November 18, 2025
**Origin Case Study:** Microfrontend vs. Monolith (Finance Sector, 2025)
**Maintainer:** Architecture Decision Framework Working Group
