---
title: "Feature Planning"
phase: "07-iteration"
topic: "feature-planning"
depth: "deep-water"
reading_time: 55
prerequisites: ["job-to-be-done", "deployment", "monitoring-logging", "user-research"]
related_topics: ["retrospectives", "security-posture-reviews", "product-market-fit"]
personas: ["specialist-expanding", "architect", "product-leader"]
updated: "2025-11-16"
---

# Feature Planning: Building Learning Systems That Compound

The sophisticated insight about feature planning is that the goal isn't building great features - it's building the organizational capability to identify and build great features faster than competitors, with less waste.

This requires systems thinking: How do discovery, delivery, measurement, and learning connect? How do you know if your planning process is getting better or worse? How do you avoid local optimization (great individual decisions) that leads to global failure (wrong product)?

## Product-Market Fit and the Three Horizons

### Product-Market Fit (Marc Andreessen / Superhuman Framework)

**Definition**: Being in a good market with a product that satisfies that market.

**Measurement challenge**: PMF is not binary (yes/no) but a spectrum (how much?).

**Sean Ellis test**: Ask users "How would you feel if you could no longer use this product?"
- **40%+ say "very disappointed"**: You have PMF
- **< 40%**: You don't have PMF yet

**Superhuman framework** (Rahul Vohra):
1. Survey users with Sean Ellis question
2. Segment by response (very disappointed, somewhat disappointed, not disappointed)
3. Analyze "very disappointed" cohort: What do they value? Common characteristics?
4. Analyze "not disappointed" cohort: Why aren't they getting value?
5. Double down on characteristics of "very disappointed" users
6. Improve or remove features that attract "not disappointed" users

**Strategic implication**: Pre-PMF and post-PMF require different planning approaches.

**Pre-PMF**:
- Maximize learning per dollar spent
- Rapid experimentation
- Tolerance for pivots
- Small, passionate user base over broad reach
- Qualitative feedback over quantitative metrics

**Post-PMF**:
- Maximize scaling and optimization
- Systematic process
- Stability in core product
- Broaden reach while maintaining satisfaction
- Quantitative metrics and A/B testing

**Danger**: Using post-PMF playbook (scale, optimize, incrementalism) when you're still pre-PMF. Results in scaling something the market doesn't want.

### McKinsey's Three Horizons Framework

Simultaneously manage products at different lifecycle stages:

**Horizon 1** (current core business):
- Mature products generating current revenue
- Focus: Optimization, efficiency, incremental improvement
- Planning horizon: 0-12 months
- Risk: Disruption, commoditization

**Horizon 2** (emerging opportunities):
- Growth businesses, proven but not yet mature
- Focus: Scaling, product-market fit refinement
- Planning horizon: 12-36 months
- Risk: Premature scaling, resource conflicts with H1

**Horizon 3** (future bets):
- Experiments, unproven ideas, innovation
- Focus: Learning, validation, finding PMF
- Planning horizon: 36+ months
- Risk: Insufficient resources, killed too early or too late

**Resource allocation**:
- H1: 70% (fund the business)
- H2: 20% (future growth)
- H3: 10% (options on future)

**Planning process differs by horizon**:
- H1: Data-driven optimization, predictable roadmaps
- H2: Experiment-driven, flexible roadmaps, North Star metrics
- H3: Learning-driven, hypothesis-based, pivot-friendly

**Common failure**: All resources on H1 (optimization) or H3 (innovation theater). Need balance.

## Outcome-Based Planning: OKRs Done Right

Objectives and Key Results (John Doerr, "Measure What Matters") are widely adopted and frequently misused.

### OKR Structure

**Objective**: Qualitative, aspirational, time-bound
**Key Results**: Quantitative, measurable, 3-5 per objective

**Example** (good):
- **Objective**: Become the easiest platform for new developers to deploy their first app
- **KR1**: 70% of new users deploy within 24 hours (up from 40%)
- **KR2**: NPS for first-time deployers reaches 50+ (up from 30)
- **KR3**: Time to first deploy decreases to <30 min median (down from 2 hours)

**Example** (bad):
- **Objective**: Improve the platform
- **KR1**: Ship 5 new features
- **KR2**: Fix 100 bugs
- **KR3**: Increase test coverage to 80%

**Why first is good**: Outcome-focused (user success), measurable, ambitious but achievable.

**Why second is bad**: Output-focused (tasks completed, not value delivered), arbitrary numbers.

### Common OKR Dysfunctions

**Dysfunction: OKRs as disguised roadmaps**
**Symptom**: Key results are "Ship feature X by date Y"
**Problem**: Output, not outcome. Doesn't encourage finding best solution.
**Fix**: Key results should be metric changes. Features are hypotheses for achieving them.

**Dysfunction: Sandbagging**
**Symptom**: Teams set conservative goals they know they'll hit
**Problem**: OKRs become performance reviews, not stretch goals. No learning.
**Fix**: Decouple OKRs from compensation. Target 70% achievement. 100% means you aimed too low.

**Dysfunction: Too many OKRs**
**Symptom**: 5 objectives with 5 KRs each = 25 things to track
**Problem**: Nothing is actually prioritized. Spread too thin.
**Fix**: 1-3 objectives per quarter max. Ruthless focus.

**Dysfunction: No connection between OKRs and daily work**
**Symptom**: Teams work on things not connected to key results
**Problem**: OKRs become aspirational documents, not decision-making frameworks.
**Fix**: Weekly check-ins. Explicit connection between initiatives and key results.

**Dysfunction: Unchanging OKRs despite learning**
**Symptom**: Set in Q1, never revised even when you learn they're wrong
**Problem**: Optimizing for wrong thing.
**Fix**: Quarterly revision is fine. Mid-quarter revision for major pivots is acceptable.

### Aligning OKRs Across Levels

**Company OKRs** (annual or bi-annual): Strategic direction
**Department OKRs** (quarterly): Contribution to company OKRs
**Team OKRs** (quarterly): Contribution to department OKRs
**Individual OKRs** (quarterly, if used): Contribution to team OKRs

**Alignment ≠ cascading**: Don't mechanically break down company OKRs. Teams should have autonomy to find best way to contribute.

**Example**:
- **Company OKR**: Increase annual recurring revenue by 50%
- **Product team OKR**: Increase trial-to-paid conversion by 20% (one of several ways to grow ARR)
- **Growth team OKR**: Increase qualified leads by 30%
- **Engineering team OKR**: Decrease system downtime to <99.9% (enables sales to close deals)

Each team finds differentiated way to contribute to company goal.

## Portfolio Management and Resource Allocation

Treating feature planning as portfolio of bets under uncertainty.

### The Innovation Portfolio (Nagji & Tuff, HBR)

**Three types of innovation**:

1. **Core** (70% of resources, 10% of returns potential):
   - Incremental improvements to existing products
   - Known customers, known offerings
   - Low risk, predictable returns
   - Example: Performance improvements, UI polish

2. **Adjacent** (20% of resources, 20% of returns potential):
   - Expanding to adjacent markets or offerings
   - Known customers, new offerings OR new customers, known offerings
   - Medium risk, medium returns
   - Example: New feature for existing users, existing feature for new segment

3. **Transformational** (10% of resources, 70% of returns potential):
   - New markets with new offerings
   - Unknown customers, unknown offerings
   - High risk, high potential returns
   - Example: Entirely new product lines, new business models

**Portfolio question**: Are you overweight on core (incrementalism) or transformational (moonshots)?

**Healthy balance varies by context**:
- Startups: More transformational (searching for PMF)
- Growth companies: Balanced
- Mature companies: More core (optimize existing business)

**Rebalancing**: Quarterly review of resource allocation across portfolio categories.

### Real Options Theory (Alexander Laufer)

Feature planning as managing options under uncertainty.

**Key insight**: Don't commit early to irreversible decisions when you can defer and gather information.

**Example**: Building platform vs. building specific features
- Platform (high upfront cost, preserves future options)
- Specific features (low cost, closes options)

**When you have high uncertainty about future needs**: Build flexible platform even if more expensive initially. Preserves options.

**When future needs are clear**: Build specific solution. No value in unused flexibility.

**Sunk cost fallacy in feature planning**: Continuing to invest in feature because you already spent time on it, even after learning it won't work.

**Prevention**: Explicit decision points. Invest small amount (prototype), learn, decide whether to invest more. Avoid large upfront commitments.

### Capital Allocation and Financial Modeling

Product decisions are capital allocation decisions. Opportunity cost is real.

**Simple financial model**:
- **Investment**: Engineering time × loaded cost (salary + overhead, typically 1.5-2x salary)
- **Return**: Revenue impact, cost savings, risk reduction
- **Payback period**: How long until return exceeds investment?
- **NPV (Net Present Value)**: Account for time value of money

**Example**:
- Feature requires 2 engineers for 3 months
- Loaded cost: $200K/year per engineer
- Investment: 2 × ($200K / 4 quarters) × 1 quarter = $100K
- Expected return: 10% increase in conversions = $50K/quarter additional revenue
- Payback period: 2 quarters
- NPV (at 10% discount rate, 3 year horizon): Positive, build it

**When this works**: B2B products with clear revenue connection.

**When it doesn't**: Consumer products with indirect monetization, strategic features, platform work.

**Hybrid approach**: Model what you can, make qualitative judgments on strategic value for rest.

## Experimentation at Scale: The Spotify Model

**Hypothesis-driven development**: Treat features as experiments, not commitments.

### The Spotify Squad Structure (2014 model, evolved since)

**Squads** (small cross-functional teams, 6-12 people):
- Autonomy to decide what to build
- Accountable for metrics (not roadmap compliance)
- Long-lived (not project-based)

**Tribes** (collection of related squads, 40-150 people):
- Coordinate on shared goals
- Share learnings
- Resolve dependencies

**Chapters** (people with same skills across squads):
- Share practices
- Develop skills
- Maintain standards

**Guilds** (communities of interest across tribes):
- Web performance guild, machine learning guild, etc.
- Knowledge sharing, not formal authority

**Feature planning in this model**:
- Company-level OKRs set direction
- Tribes align on tribe-level goals
- Squads autonomous in how they contribute
- Weekly demos and monthly retrospectives share learnings
- Kill features that don't move metrics (not move them to "maintenance mode")

**Trade-offs**:
- Requires maturity (clear metrics, strong culture)
- Coordination overhead at scale
- Can create duplication
- Depends on hiring autonomous, senior people

**When it works**: High-trust culture, clear metrics, mature product.
**When it doesn't**: Early stage, unclear strategy, junior team.

## Measuring the Learning System Itself

How do you know if your feature planning process is improving?

### Meta-Metrics for Planning Effectiveness

**Velocity of learning**:
- **Time from idea to validated learning**: How quickly do you test assumptions?
- **Experiments per quarter**: Are you running more experiments over time?
- **Percentage of experiments that inform decisions**: Or are experiments theater?

**Quality of decisions**:
- **Feature success rate**: What percentage of shipped features move target metrics?
- **Pivot rate**: How often do you change direction based on data?
- **Prediction accuracy**: How close are actual results to predicted results?

**Resource efficiency**:
- **Waste ratio**: Time spent on abandoned features / total development time
- **Rework ratio**: How often do you rebuild features?
- **Utilization of research**: Percentage of user research findings that inform roadmap

**Organizational alignment**:
- **Roadmap coherence**: Can teams explain how their work connects to company goals?
- **Cross-functional participation**: Are user research, design, engineering, product collaborating or siloed?
- **Decision latency**: How long from identifying opportunity to starting work?

**Track quarterly**: Is the system getting better or worse?

## Advanced Discovery Techniques

### Jobs-to-be-Done Deep Dive (Clayton Christensen)

**Insight**: People don't buy products, they "hire" them to do jobs.

**Framework**:
- **Functional job**: What task is being done?
- **Emotional job**: How do they want to feel?
- **Social job**: How do they want to be perceived?

**Example**: Milkshake sales analysis (Christensen case study)
- Traditional segmentation: Demographics (age, flavor preference)
- JTBD insight: 40% bought in morning for commute (job: make boring commute interesting)
- Implications: Thicker milkshake (lasts longer), easy to buy (fast drive-through), varied flavors (prevent boredom)

**Application to feature planning**: Don't segment by user demographics. Segment by jobs they're trying to do.

**Research method**:
1. Observe struggling moments (when do people struggle to get job done?)
2. Map current solutions (how do they do job today, even if not with your product?)
3. Identify constraints (what limits their ability to do job better?)
4. Design for job (features that help complete job better)

### Continuous Discovery (Teresa Torres)

**Weekly touchpoints with customers** (at least 3 per week):
- User interviews
- Usability testing
- Data analysis sessions
- Customer support shadowing

**Goal**: Continuous stream of insights, not quarterly big research projects.

**Output**: Opportunity solution tree updated weekly based on learnings.

**Trade-off**: Requires dedicated time. Product managers spend 30-40% of time on discovery activities.

### Quantitative Discovery: Data Mining for Opportunities

Beyond A/B testing and basic analytics. Use data to find unknown opportunities.

**Techniques**:

**Cohort analysis**: Group users by shared characteristics, compare behavior.
- Example: Users who joined in Q1 vs. Q2. Different retention rates. Why?

**Funnel analysis**: Find drop-off points.
- Not just "60% drop off at checkout" but "which user segments drop off? At which step? Why?"

**Correlation analysis**: What behaviors predict success?
- Example: Users who connect integrations in first week have 3x retention. Insight: Promote integrations earlier.

**Segmentation**: Find natural user clusters.
- Example: K-means clustering finds 4 distinct user types with different needs. Build for each.

**Session recording analysis**: Watch what users actually do.
- At scale: Tools like FullStory, Heap auto-capture interactions. Search for patterns.

**Tooling**: Amplitude, Mixpanel, Heap for product analytics. Looker, Tableau for BI. Python/R for custom analysis.

## Decision-Making Frameworks for Feature Planning

### DACI (Driver, Approver, Contributor, Informed)

**Driver**: Runs the process, synthesizes input, makes recommendation
**Approver**: Makes final decision
**Contributor**: Provides input (engineering feasibility, design, research)
**Informed**: Kept in loop, no input required

**Application**: For each feature decision, clarify who plays each role.

**Prevents**: Unclear ownership, decision-by-committee, stakeholder surprise.

### One-Way vs. Two-Way Doors (Jeff Bezos)

**Two-way doors**: Reversible decisions. Can undo if wrong.
- Example: A/B test, feature flag, beta launch

**Strategy**: Make quickly with minimal process. Bias toward action.

**One-way doors**: Irreversible or very costly to reverse.
- Example: Database choice, platform architecture, public API contracts

**Strategy**: Deliberate carefully, gather more information, involve more people.

**Application**: Treat most feature decisions as two-way doors. Move fast, learn, reverse if needed.

**Common mistake**: Treating two-way doors as one-way (slow, bureaucratic) or one-way doors as two-way (reckless).

### Pre-Mortems (Gary Klein)

Before committing to major feature:
1. Assume it's launched and failed spectacularly
2. Team writes down all reasons why it failed
3. Discuss and mitigate highest-probability failure modes

**Why it works**: Surfaces concerns people are hesitant to raise. Overrides optimism bias.

**Timing**: After decision to build, before detailed planning. Creates opportunity to refine approach.

## The Build Trap and How to Avoid It (Melissa Perri)

**Build trap**: Organization measures success by outputs (features shipped) rather than outcomes (value created).

**Symptoms**:
- Roadmap measured in feature count
- Success celebrated when feature ships (not when it works)
- Backlogs filled with feature requests
- Teams measured by velocity
- Users complaining "too many features, none work great"

**Root causes**:
- Product managers as project managers (coordinate delivery, not strategy)
- Sales-driven roadmaps (every customer request becomes commitment)
- Stakeholder-driven roadmaps (HiPPO - Highest Paid Person's Opinion)
- Lack of clear strategy (everyone builds different things)

**Escape routes**:

1. **Shift metrics from output to outcome**
   - Not: "Shipped 10 features this quarter"
   - But: "Increased activation rate by 15%"

2. **Product strategy as filter**
   - Clear strategy lets you say no to off-strategy requests
   - "We're focused on SMB market, this is enterprise feature"

3. **Autonomous teams with outcome ownership**
   - Teams own metrics, not backlogs
   - Freedom to find best solution

4. **Kill features that don't work**
   - Measure post-launch impact
   - Sunset low-value features
   - Simplicity is valuable

## Building a Learning Culture

Feature planning effectiveness depends on organizational culture.

### Psychological Safety for Product Decisions (Edmondson)

**Safe to admit**: "This feature didn't work" without career damage.

**Safe to challenge**: "I don't think we should build this" without being overridden.

**Safe to experiment**: "Let's try this unusual approach" without needing guaranteed success.

**Indicators of low psychological safety in planning**:
- Feature failures hidden or rationalized
- Junior team members don't speak up in planning meetings
- Experiments designed to confirm existing beliefs, not test them
- HiPPO (Highest Paid Person's Opinion) dominates decisions

**Improvement levers**:
- Leaders model admitting mistakes ("I was wrong about...")
- Celebrate learning from failed experiments
- Blameless post-mortems for feature failures
- Explicit invitation for dissent in planning meetings

### Evidence-Based Decision Culture

**Ladder of inference** (Chris Argyris): We observe data, interpret it, draw conclusions, take actions. Often skip steps.

**Example**:
- **Data**: User didn't complete signup
- **Interpretation**: Signup is too hard
- **Conclusion**: Need simpler form
- **Action**: Build simplified signup
- **Reality**: User was just browsing, not ready to commit. Simpler signup won't help.

**Prevention**: Make reasoning explicit.
- "Here's what we observed"
- "Here's what we think it means"
- "Here are alternative explanations"
- "Here's why we chose this interpretation"
- "Here's how we'll know if we're wrong"

**Meeting practice**: "What would have to be true for this to be the right decision?" Forces explicit assumptions.

### Democratizing Data

**Problem**: If only data team can answer questions, learning velocity limited by data team capacity.

**Solution**: Self-service analytics.
- Product managers can query data
- Engineers can build dashboards
- Everyone sees same metrics

**Tooling**: Looker, Mode, Metabase, Amplitude.

**Prerequisites**: Clean data model, clear definitions, training.

**Trade-offs**: Risk of misinterpretation. Mitigate with data literacy training and clear documentation.

## Synthesis: The Compounding Learning System

Effective feature planning isn't about individual decisions. It's about building a system where:

1. **High-quality information flows in**: User research, data, competitive intelligence, technology trends
2. **Good decisions flow out**: Based on evidence, aligned with strategy, testable
3. **Learning loops close**: Measure outcomes, update beliefs, refine process
4. **The system improves**: Each cycle faster, cheaper, higher success rate

**Flywheel**:
- Ship features based on evidence
- Measure outcomes
- Build trust in process
- Get more resources for discovery
- Higher-quality insights
- Better features
- More trust
- (Repeat)

The teams that dominate long-term aren't the ones that guessed right about what to build. They're the ones that learned faster than competitors, built better feedback loops, and compounded small improvements in their planning process over years.

## Further Reading

**Foundational**:
- Ries, "The Lean Startup"
- Cagan, "Inspired: How to Create Tech Products Customers Love"
- Torres, "Continuous Discovery Habits"
- Perri, "Escaping the Build Trap"

**Strategy**:
- Christensen, "Competing Against Luck" (Jobs-to-be-Done)
- Rumelt, "Good Strategy Bad Strategy"
- McGrath, "Seeing Around Corners" (Inflection points)

**Organizational**:
- Doerr, "Measure What Matters" (OKRs)
- Gothelf & Seiden, "Sense and Respond"
- Cutler, "The North Star Playbook"

**Decision-Making**:
- Kahneman, "Thinking, Fast and Slow"
- Klein, "Sources of Power: How People Make Decisions"
- Duke, "Thinking in Bets"

**Analytics**:
- Amplitude, "The North Star Playbook"
- Mixpanel, "Product Metrics Guide"

## Related Topics

- [Job-to-be-Done](../../01-discovery-planning/job-to-be-done/deep-water/)
- [Retrospectives](../retrospectives/deep-water/)
- [Monitoring & Logging](../../06-operations/monitoring-logging/deep-water/)
- [A/B Testing](../../04-testing/a-b-testing/deep-water/)
