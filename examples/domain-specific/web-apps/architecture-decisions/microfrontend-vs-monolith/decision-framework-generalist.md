# Architecture Decision Framework: Microfrontends vs. Monolith

**Reading Time:** 15-20 minutes
**Persona:** Generalist Leveling Up (systematic learning)
**Depth:** Mid-Depth

---

## Why This Framework Matters

You'll face architecture decisions throughout your career: monolith vs. microservices, SQL vs. NoSQL, REST vs. GraphQL, cloud vs. on-premise. This framework helps you make those decisions based on data rather than hype.

We'll walk through a real case study (microfrontends vs. monolith for a finance app), but the framework applies to any architecture decision.

---

## Table of Contents

1. [The Scenario](#the-scenario)
2. [The Five-Step Framework](#the-five-step-framework)
3. [Applying the Framework](#applying-the-framework)
4. [Templates and Checklists](#templates-and-checklists)
5. [Common Traps to Avoid](#common-traps-to-avoid)
6. [Using This for Other Decisions](#using-this-for-other-decisions)

---

## The Scenario

**Starting Point:**
- Finance sector web app
- React SPA (Vite) + Flask API
- <500 users, <50 concurrent
- One small team (4-6 developers)
- Need to add 3 new feature areas

**The Question:**
Should we split these new features into microfrontends, or extend the existing monolith?

**Why It Matters:**
- Wrong choice costs 4-6 months of learning
- Could reduce team velocity by 50% for extended periods
- Architecture changes are expensive to reverse
- Finance sector compliance adds scrutiny

This is a real decision with real consequences.

---

## The Five-Step Framework

### Overview

```
1. Scale Assessment      → Are we at the right scale for this option?
2. Capability Assessment → Can our team actually build this?
3. Complexity-Value Ratio → Do benefits justify the complexity?
4. Risk Evaluation       → What could go wrong? Can we tolerate it?
5. Reversibility Check   → How hard to change course if we're wrong?
```

Each step produces a go/no-go signal. If an option fails 2+ steps, it's likely wrong for your context.

---

### Step 1: Scale Assessment

**Question:** Are we at the scale where each architecture option provides value?

#### The Process

**1.1 Research thresholds**
- Find case studies (IKEA, Spotify, Zalando for microfrontends)
- Identify scale at which benefits materialize
- Look for "before/after" metrics

**1.2 Map your current state**
- Users (total and concurrent)
- Team size and structure
- Geographic distribution
- Deployment frequency

**1.3 Calculate gap multipliers**
- Current vs. threshold
- Express as multiplier (2x, 10x, 100x away?)
- Bigger gap = more premature

#### Scale Appropriateness Checklist

Use this checklist for any architecture decision:

```markdown
## Scale Appropriateness Checklist

Option: [Architecture Option Name]

[ ] Researched industry case studies for this option
[ ] Identified minimum viable scale (users, teams, transactions)
[ ] Mapped our current state against thresholds
[ ] Calculated gap multipliers for critical dimensions
[ ] Assessed if we're within optimal range or X times away

**Dimensions to Consider:**
- [ ] Total users (daily/monthly active)
- [ ] Concurrent users (peak load)
- [ ] Team size (number of developers)
- [ ] Team structure (1 team vs. multiple autonomous teams)
- [ ] Geographic distribution (single region vs. multi-region)
- [ ] Deployment frequency (actual vs. needed)
- [ ] Transaction volume
- [ ] Data complexity

**Gap Analysis:**
- If 1-2x away: Probably appropriate
- If 3-5x away: Might be premature
- If 10x+ away: Almost certainly premature
```

#### Our Case Study Results

| Dimension | Current | MFE Threshold | Gap |
|-----------|---------|---------------|-----|
| Users | <500 | 5,000+ | **10x below** |
| Teams | 1 | 3+ | **3x below** |
| Concurrent | <50 | 500+ | **10x below** |

**Verdict:** Microfrontends are 10x premature on user scale, 3x premature on team scale.

---

### Step 2: Capability Assessment

**Question:** Can our team successfully build and maintain this option?

#### The Process

**2.1 Honest skills inventory**
- List every skill the team currently has
- Rate each: None/Basic/Intermediate/Advanced
- Don't inflate (wishful thinking hurts)
- Include infrastructure and debugging, not just coding

**2.2 List required skills**
- For each option, enumerate all skills needed
- Be specific (not just "React" but "React.lazy, Suspense, error boundaries")
- Include "hidden" skills (distributed debugging, monitoring, deployment coordination)

**2.3 Calculate capability gap**
- Match current vs. required
- Calculate % gap: (Missing skills / Total required)
- Critical threshold: >50% gap = high risk

**2.4 Estimate learning investment**
- Research learning curves (documentation time estimates)
- Add 1.5-2x buffer for trial-and-error
- Calculate cost: weeks × team size × hourly rate
- Consider opportunity cost (features not shipped)

#### Capability Assessment Template

```markdown
## Team Capability Assessment

**Team Profile:**
- Size: [N] developers
- Primary stack: [Technologies]
- Experience level: [Junior/Mid/Senior mix]
- Industry: [Startup/Finance/Healthcare/etc.]

**Skills Inventory:**

| Skill Category | Specific Skill | Current Level | Evidence |
|----------------|----------------|---------------|----------|
| [Category] | [Skill] | [None/Basic/Int/Adv] | [How we know] |
| Frontend | React fundamentals | Advanced | 2+ years production |
| Frontend | Module Federation | None | Never used |
| ... | ... | ... | ... |

**Skills Required for Option:**

| Required Skill | Level Needed | Current Level | Gap |
|----------------|--------------|---------------|-----|
| React fundamentals | Advanced | Advanced | ✓ No gap |
| Module Federation | Advanced | None | ❌ Critical |
| ... | ... | ... | ... |

**Gap Analysis:**
- Total skills required: [N]
- Skills we have: [M]
- Capability match: [M/N × 100]%
- Gap: [100 - match]%

**Learning Investment:**
- Estimated time: [X] weeks
- Team size: [N] people
- Hourly rate: $[Y]
- Total cost: X weeks × N people × 40 hrs × $Y = $[TOTAL]
- Opportunity cost: [What we won't ship]

**Verdict:** [Good fit / Moderate fit / Poor fit]
```

#### Our Case Study Results

| Option | Capability Match | Gap | Learning Time | Cost |
|--------|------------------|-----|---------------|------|
| Microfrontends | 32% | 68% | 10-18 weeks | $115k |
| Vite MFE | 22% | 78% | 14-25 weeks | $163k |
| Monolith | 90% | 10% | 2-3 weeks | $27k |

**Verdict:** Only monolith has closable skills gap (<20%).

---

### Step 3: Complexity-Value Ratio

**Question:** What value does each option deliver relative to complexity introduced?

#### The Process

**3.1 Identify actual benefits for YOUR scenario**
- Not theoretical benefits
- Not benefits at different scale
- What value do YOU get, specifically?

**3.2 Identify actual complexity for YOUR context**
- Infrastructure overhead
- Learning curve
- Operational burden
- Debugging difficulty

**3.3 Calculate ratio**
```
Value = Sum of benefits weighted by importance
Complexity = Sum of costs weighted by impact
Ratio = Value / Complexity (higher is better)
```

**3.4 Compare options**
- Which delivers most value per unit complexity?
- Are high-complexity options justified by proportional value?

#### Complexity-Value Assessment Template

```markdown
## Complexity-Value Analysis

**Option:** [Architecture Option Name]

**Benefits for Our Scenario:**

| Benefit | Applies to Us? | Value (0-10) | Weight | Score |
|---------|----------------|--------------|--------|-------|
| Independent deployment | No (1 team) | 0 | High | 0 |
| Isolated failures | Low (500 users) | 2 | Medium | 1 |
| Technology diversity | No (standardized) | 0 | Low | 0 |
| ... | ... | ... | ... | ... |
| **TOTAL VALUE** | | | | **[X]** |

**Complexity for Our Context:**

| Complexity | Applies to Us? | Impact (0-10) | Weight | Score |
|------------|----------------|---------------|--------|-------|
| Multiple pipelines | Yes | 8 | High | 8 |
| Distributed debugging | Yes | 9 | High | 9 |
| Version coordination | Yes | 7 | Medium | 5 |
| ... | ... | ... | ... | ... |
| **TOTAL COMPLEXITY** | | | | **[Y]** |

**Ratio:** X / Y = [Ratio]

**Interpretation:**
- >5.0: Excellent value for complexity
- 2.0-5.0: Good value
- 1.0-2.0: Marginal value
- 0.5-1.0: Poor value
- <0.5: Complexity far exceeds value
```

#### Our Case Study Results

**Microfrontends:**
- Value: Low (independent deployment irrelevant for 1 team)
- Complexity: High (distributed debugging, orchestration, deployment)
- Ratio: ~0.1

**Monolith:**
- Value: High (faster delivery, better performance, team focus on features)
- Complexity: Low (module boundaries, code splitting)
- Ratio: ~8.5

**Verdict:** Monolith delivers 85x better complexity-value ratio.

---

### Step 4: Risk Evaluation

**Question:** What could go wrong, and can we tolerate it?

#### Risk Categories

**Technical Risk**
- Production failures
- Debugging difficulty
- Performance issues
- Third-party dependency risks

**Timeline Risk**
- Learning curve extends
- First feature delayed
- Infrastructure setup complications
- Security review delays

**Knowledge Risk**
- Key person dependency
- Knowledge transfer difficulty
- Onboarding new hires
- Market availability for hiring

**Context Risk** (Industry-specific)
- Compliance requirements
- Audit trail complexity
- Risk tolerance mismatch
- Regulatory constraints

#### Risk Assessment Template

```markdown
## Risk Assessment Matrix

**Option:** [Architecture Option Name]
**Industry Context:** [Startup/Finance/Healthcare/etc.]

| Risk Category | Rating | Evidence | Mitigation | Acceptable? |
|---------------|--------|----------|------------|-------------|
| **Technical** | [Low/Med/High/Critical] | | | [Yes/No] |
| - Production failures | | [Specific risks] | [Plan] | |
| - Debugging complexity | | | | |
| **Timeline** | | | | |
| - Learning extends | | | | |
| - First feature delayed | | | | |
| **Knowledge** | | | | |
| - Key person dependency | | | | |
| - Hiring difficulty | | | | |
| **Context** | | | | |
| - Industry fit | | | | |
| - Compliance issues | | | | |

**Overall Risk Rating:** [Low/Medium/High/Critical]

**Risk Tolerance Assessment:**
- Industry standard: [Low/Medium/High tolerance]
- Team size impact: [Can/Cannot absorb failures]
- Business priority: [Innovation/Stability/Speed]

**Verdict:** [Acceptable / Reconsider / Unacceptable]
```

#### Our Case Study Results

| Risk Category | Microfrontends | Vite MFE | Monolith |
|---------------|----------------|----------|----------|
| Technical | High | **Critical** | Low |
| Timeline | High | **Critical** | Low |
| Knowledge | High | **Critical** | Low |
| Finance Fit | Med-High | **Critical** | Low |

**Critical Risk for Vite MFE:** Unmaintained plugin with known production bugs = unacceptable for finance sector.

**Verdict:** Only monolith has acceptable risk profile.

---

### Step 5: Reversibility Check

**Question:** How hard is it to change course if we're wrong?

#### The Concept

Some decisions are harder to reverse than others:

**Asymmetric Reversibility:**
- Simple → Complex: Usually easier
- Complex → Different Complex: Usually harder
- Complex → Simple: Often very hard (rare, expensive)

**Implication:** When uncertain, start with the simpler option that keeps future options open.

#### Reversibility Assessment Template

```markdown
## Reversibility Analysis

**Option Under Consideration:** [Architecture Option]

### Forward Path (Current → Option)
- **Feasibility:** [Easy/Moderate/Hard]
- **Strategy:** [How we'd implement]
- **Timeline:** [Weeks/months]
- **Cost:** [Estimate]
- **Risk:** [Low/Medium/High]

### Reverse Path (Option → Current)
- **Feasibility:** [Easy/Moderate/Hard/Rare]
- **Strategy:** [How we'd undo]
- **Timeline:** [Weeks/months]
- **Cost:** [Estimate]
- **Risk:** [Low/Medium/High]

### Alternative Path (Option → Different Option)
- **Feasibility:** [Easy/Moderate/Hard]
- **Example scenario:** [When we'd switch]
- **Cost:** [Estimate]

### Decision Implication

**If reversibility is:**
- Easy both ways: Choose based on other factors
- Easy forward, hard backward: Ensure high confidence
- Hard both ways: Need very high confidence
- Easy to defer: Start simple, migrate if pain materializes

**For this option:** [Assessment]
```

#### Our Case Study Results

**Monolith → Microfrontends:**
- Feasibility: High (strangler pattern well-established)
- Strategy: Extract microfrontends incrementally
- Timeline: 6-12 months when needed
- Can be deferred until pain materializes

**Microfrontends → Monolith:**
- Feasibility: Low (rarely done, architectural failure)
- Strategy: Rebuild or live with complexity
- Cost: High (essentially rebuild)
- Risk: High (business pressure, sunk cost fallacy)

**Verdict:** Start with monolith, keep microfrontend migration path open. Can't easily go back from microfrontends.

---

## Applying the Framework

### Decision Matrix: All Five Steps

| Step | Microfrontends | Vite MFE | Monolith |
|------|----------------|----------|----------|
| **1. Scale** | ❌ 10x below threshold | ❌ 10x below threshold | ✓ Within range |
| **2. Capability** | ❌ 68% gap, $115k | ❌ 78% gap, $163k | ✓ 10% gap, $27k |
| **3. Value/Complexity** | ❌ 0.1 ratio | ❌ 0.1 ratio | ✓ 8.5 ratio |
| **4. Risk** | ❌ High | ❌ Critical | ✓ Low |
| **5. Reversibility** | 🔸 Hard to reverse | 🔸 Hard to reverse | ✓ Easy to migrate |

**Results:**
- Microfrontends: Fails 4 of 5 steps (only reversibility is "okay")
- Vite MFE: Fails all 5 steps (critical risks)
- Monolith: Passes all 5 steps

**Decision:** Monolith is the only viable option for this scenario.

---

## Templates and Checklists

### Complete Decision Framework Template

```markdown
# Architecture Decision: [Option A] vs. [Option B] vs. [Option C]

## Context
- Current state: [Description]
- Team: [Size, skills, experience]
- Industry: [Startup/Finance/etc.]
- Requirements: [What we need to accomplish]

## Step 1: Scale Appropriateness
- [ ] Researched thresholds for each option
- [ ] Mapped current state
- [ ] Calculated gap multipliers

| Option | Current | Threshold | Gap | Verdict |
|--------|---------|-----------|-----|---------|
| A | ... | ... | ... | ... |
| B | ... | ... | ... | ... |

## Step 2: Team Capability
- [ ] Inventoried current skills
- [ ] Listed required skills per option
- [ ] Calculated capability gaps
- [ ] Estimated learning investment

| Option | Match % | Gap % | Learning | Cost | Verdict |
|--------|---------|-------|----------|------|---------|
| A | ... | ... | ... | ... | ... |
| B | ... | ... | ... | ... | ... |

## Step 3: Complexity-Value Ratio
- [ ] Identified benefits for our scenario
- [ ] Identified complexity for our context
- [ ] Calculated ratios

| Option | Value | Complexity | Ratio | Verdict |
|--------|-------|------------|-------|---------|
| A | ... | ... | ... | ... |
| B | ... | ... | ... | ... |

## Step 4: Risk Assessment
- [ ] Evaluated technical risk
- [ ] Evaluated timeline risk
- [ ] Evaluated knowledge risk
- [ ] Evaluated context-specific risk

| Option | Technical | Timeline | Knowledge | Context | Overall | Verdict |
|--------|-----------|----------|-----------|---------|---------|---------|
| A | ... | ... | ... | ... | ... | ... |
| B | ... | ... | ... | ... | ... | ... |

## Step 5: Reversibility
- [ ] Assessed forward migration path
- [ ] Assessed reverse migration path
- [ ] Considered alternatives

| Option | Forward | Reverse | Deferred? | Verdict |
|--------|---------|---------|-----------|---------|
| A | ... | ... | ... | ... |
| B | ... | ... | ... | ... |

## Final Decision

**Chosen Option:** [Option X]

**Why:**
- [Step where it excelled]
- [Step where it excelled]
- [Step where it excelled]

**Not Chosen:**
- Option Y: [Failed on steps X, Y, Z]
- Option Z: [Failed on steps A, B, C]

**Re-evaluation Triggers:**
- [ ] Metric 1 exceeds threshold
- [ ] Metric 2 exceeds threshold
- [ ] Timeline: Review in [X] months

**Monitoring Dashboard:**
| Metric | Current | Threshold | Next Review |
|--------|---------|-----------|-------------|
| ... | ... | ... | ... |
```

### Quick Screening Checklist

Use this for rapid option elimination:

```markdown
## Quick Screening Checklist

For each option, answer yes/no:

**Scale:**
- [ ] Are we within 2x of minimum viable scale?
- [ ] Are we within optimal range for this option?

**Capability:**
- [ ] Is capability gap <50%?
- [ ] Can we close gap in <8 weeks?

**Value:**
- [ ] Do we get concrete benefits (not just theoretical)?
- [ ] Does value justify complexity for our scenario?

**Risk:**
- [ ] Is technical risk acceptable for our context?
- [ ] Is timeline risk acceptable for our deadlines?

**Reversibility:**
- [ ] Can we defer this decision?
- [ ] Can we change course if wrong?

**Verdict:**
- 8+ yes: Strong candidate
- 5-7 yes: Moderate candidate (dig deeper)
- <5 yes: Eliminate from consideration
```

---

## Common Traps to Avoid

### Trap 1: Technology Enthusiasm Bias

**What it looks like:**
"Microfrontends are the future" → "Therefore we should use them"

**Why it's wrong:**
The future for organizations at scale. Not necessarily your future at your current scale.

**How to avoid:**
Complete Step 1 (Scale Assessment) before enthusiasm takes over. Let data override hype.

---

### Trap 2: Resume-Driven Development

**What it looks like:**
"I want microfrontend experience on my resume" → "Let's use microfrontends"

**Why it's wrong:**
Team learning goals are valid but shouldn't drive production architecture choices that affect customers.

**How to avoid:**
- Sandbox environments for learning
- Side projects for resume building
- Production for appropriate architecture
- Honest conversation about career goals vs. business needs

---

### Trap 3: Over-Estimation of Skills

**What it looks like:**
"We used React.lazy once, so we're good at code splitting"

**Why it's wrong:**
Occasional use ≠ proficiency. Basic ≠ Advanced.

**How to avoid:**
- Rate skills honestly (Basic/Intermediate/Advanced)
- Evidence-based assessment (What can you build without documentation?)
- Don't inflate to justify preferred option

---

### Trap 4: Under-Estimation of Learning Time

**What it looks like:**
"Docs say 2 weeks to learn" → "We'll be productive in 2 weeks"

**Why it's wrong:**
Documentation time estimates don't include trial-and-error, debugging, knowledge sharing, or productivity ramp.

**How to avoid:**
- Add 1.5-2x buffer to documentation estimates
- Research real team experiences (blog posts, retrospectives)
- Account for productivity loss during learning (typically 40-60%)
- Include team knowledge transfer time

---

### Trap 5: Sunk Cost Fallacy

**What it looks like:**
"We already spent 4 weeks on MFE setup, we can't switch now"

**Why it's wrong:**
4 weeks sunk doesn't justify 20 more weeks of pain if option is wrong.

**How to avoid:**
- Evaluate current situation objectively
- Past investment is sunk (can't recover)
- Focus on future cost and benefit
- Kill projects early if not working

---

### Trap 6: Building for Hypothetical Scale

**What it looks like:**
"We might grow to 10,000 users" → builds for 10,000 → has 500 for 3 years

**Why it's wrong:**
- Most applications don't reach anticipated scale
- If they do, it's over 3-5 years (tech evolves, team learns)
- Over-engineering wastes 80% of effort

**How to avoid:**
- Build for current scale + 2-3x headroom (not 10-100x)
- Plan migration path for when scale materializes
- Revisit quarterly based on actual growth
- Focus on shipping features now vs. preparing for hypothetical future

---

### Trap 7: Ignoring Industry Context

**What it looks like:**
"This works for startups" → applies to finance/healthcare without adjustment

**Why it's wrong:**
Risk tolerance varies by industry. Experimental approaches that work for startups fail compliance in finance/healthcare.

**How to avoid:**
- Factor in compliance requirements (Step 4: Risk)
- Consider audit preferences
- Account for security review timelines
- Match tech maturity to industry risk tolerance

---

## Using This for Other Decisions

### The Framework Is Reusable

This five-step framework works for any architecture decision:

**Examples:**
- Monolith vs. Microservices (backend)
- SQL vs. NoSQL databases
- REST vs. GraphQL APIs
- Cloud vs. On-premise deployment
- Self-hosted vs. SaaS tools
- Framework A vs. Framework B

**The pattern:**
1. Is this appropriate for our scale?
2. Can our team build this?
3. Does value justify complexity?
4. Can we tolerate the risks?
5. Can we change course if wrong?

### Adaptation Template

```markdown
## Adapting the Framework

**Your Decision:** [What you're deciding]

**Step 1: Scale Assessment**
- Research threshold: [Where does Option A make sense?]
- Map current state: [Where are we now?]
- Calculate gap: [How far away?]

**Step 2: Capability Assessment**
- Current skills: [What we have]
- Required skills: [What Option A needs]
- Gap %: [Difference]
- Learning investment: [Time × Cost]

**Step 3: Complexity-Value**
- Value for us: [Specific benefits]
- Complexity for us: [Specific costs]
- Ratio: [Value / Complexity]

**Step 4: Risk**
- Technical: [What could fail?]
- Timeline: [What could delay?]
- Knowledge: [Who knows this?]
- Context: [Industry fit?]

**Step 5: Reversibility**
- Forward: [How hard to implement?]
- Reverse: [How hard to undo?]
- Defer: [Can we wait?]

**Decision:** [Based on all five steps]
```

### Key Principles to Remember

**1. Data Over Enthusiasm**
Quantify what you can. Concrete numbers overcome bias.

**2. Context Matters**
Right answer for Spotify ≠ right answer for your 5-person team.

**3. Honest Assessment**
Grade inflation hurts. Rate skills and risks honestly.

**4. Current Reality**
Build for scale you have, not scale you hope to have.

**5. Reversibility**
When uncertain, choose the option that keeps future options open.

---

## Conclusion

Architecture decisions should be grounded in current reality, not future aspirations.

**The five-step framework:**
1. **Scale Assessment** - Are we at the right scale?
2. **Capability Assessment** - Can our team build this?
3. **Complexity-Value Ratio** - Do benefits justify complexity?
4. **Risk Evaluation** - Can we tolerate what could go wrong?
5. **Reversibility Check** - Can we change course?

**For our case study:**
- Microfrontends failed 4 of 5 steps
- Monolith passed all 5 steps
- Decision was clear

**For your decisions:**
Use this framework. Adapt the templates. Make data-driven choices.

The best architecture is one that matches your current constraints and keeps options open for the future.

---

## Further Reading

**Full Case Study:**
- [Complete ADR](./case-study.md) - Detailed 15-20 minute read
- [Options Analysis](./options-analysis.md) - Deep dive on all three options

**Assessment Matrices:**
- [Scale Appropriateness](./scale-appropriateness-assessment-matrix.md)
- [Team Capability](./team-capability-assessment-matrix.md)

**Related Content:**
- Architecture Design Patterns (Deep Water)
- Technical Debt Management
- Performance & Scalability Design
