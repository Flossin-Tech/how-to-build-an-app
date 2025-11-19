---
title: "Feature Planning"
phase: "07-iteration"
topic: "feature-planning"
depth: "mid-depth"
reading_time: 30
prerequisites: ["job-to-be-done", "deployment", "monitoring-logging"]
related_topics: ["retrospectives", "user-research", "a-b-testing"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-16"
---

# Feature Planning

Effective feature planning balances three tensions: user needs vs. business goals, speed vs. learning, and exploitation (doubling down on what works) vs. exploration (trying new things).

Teams that master this ship features that move metrics, not just features that sound good in planning meetings.

## Product Discovery vs. Delivery

Most teams confuse these two activities:

**Discovery**: Figuring out what to build (learning, validation, experimentation)
**Delivery**: Building what you decided to build (execution, shipping, scaling)

**Common failure mode**: All delivery, no discovery. Results in shipping features based on assumptions, not evidence.

**Better balance**: 20-30% of time on discovery activities. Less for mature products with clear direction, more for early-stage products finding product-market fit.

## Continuous Discovery Habits (Teresa Torres)

Don't do discovery once at the beginning and delivery forever after. Interleave them.

### The Opportunity Solution Tree

**Structure**:
1. **Desired Outcome** (top): What metric are we trying to move?
2. **Opportunities** (middle): What user needs or problems could we address?
3. **Solutions** (bottom): What features could we build to address those opportunities?

**Why it works**: Forces you to start with outcomes, not solutions. Prevents "we should build X" without asking "why would X matter?"

**Example**:
- **Outcome**: Increase user activation (% who complete onboarding)
- **Opportunities**: Users don't understand value prop / Setup is too complex / First-time experience is overwhelming
- **Solutions**: Better onboarding copy / Simplify first-time flow / Interactive tutorial / Demo mode

**Process**:
1. Start with outcome (what metric moves?)
2. Interview users to discover opportunities (what problems do they have?)
3. Generate multiple solutions per opportunity
4. Test assumptions before committing to full build

**Frequency**: Weekly opportunity interviews (15-30 min each), weekly team review of tree.

### Interview Techniques for Discovery

**Goals**: Understand user needs, validate assumptions, find opportunities.

**Not goals**: Get feature requests, ask what they want you to build.

**Good questions**:
- "Tell me about the last time you tried to [job-to-be-done]"
- "What was the hardest part?"
- "How did you work around that?"
- "What would have made that easier?"

**Bad questions**:
- "Would you use a feature that does X?" (Everyone says yes, few actually use it)
- "What features do you want?" (Users imagine solutions, often wrong ones)
- "How often do you use our product?" (Self-reports are unreliable)

**Who to interview**:
- Recent users (within last 2 weeks)
- Users who stopped using your product (churn interviews)
- Users who succeeded at their task
- Users who failed or gave up

**How many**: 5-10 per opportunity. Patterns emerge quickly.

**Documentation**: Record interviews (with permission), extract quotes, map to opportunity solution tree.

## Prioritization Frameworks

"Impact vs. Effort" is a start, but more sophisticated frameworks help with complex trade-offs.

### RICE Score (Intercom)

**Formula**: (Reach × Impact × Confidence) / Effort

**Reach**: How many users affected per quarter? (numeric estimate)
**Impact**: How much it improves their experience (3=massive, 2=high, 1=medium, 0.5=low, 0.25=minimal)
**Confidence**: How sure are we? (100%=high, 80%=medium, 50%=low)
**Effort**: Person-months of work

**Example**:
- Feature A: (1000 users × 2 impact × 80% confidence) / 2 months = 800
- Feature B: (300 users × 3 impact × 100% confidence) / 1 month = 900

**Feature B wins despite smaller reach** because higher impact, confidence, and less effort.

**When to use**: Comparing features with different characteristics. Works best with numeric estimates.

**Trade-off**: Requires estimation discipline. Easy to game by inflating reach/impact.

### Value vs. Complexity (Weighted Shortest Job First variant)

**Value**: User value + business value + risk reduction + opportunity enablement
**Complexity**: Technical complexity × uncertainty

**Prioritize**: High value, low complexity first.

**User value**: Pain relief, time saved, jobs enabled
**Business value**: Revenue impact, cost savings, strategic alignment
**Risk reduction**: Security fixes, compliance, technical debt that could cause outages
**Opportunity enablement**: Platform work that unlocks future features

**When to use**: Balancing different types of value (not just user features).

**Trade-off**: Subjective scoring requires calibration across team.

### Kano Model

**Categories**:
- **Basic expectations**: Must-haves. Absence causes dissatisfaction. Presence doesn't increase satisfaction.
- **Performance**: More is better. Linear satisfaction increase.
- **Delighters**: Unexpected features that increase satisfaction disproportionately.

**Example (e-commerce)**:
- **Basic**: Search works, checkout doesn't fail
- **Performance**: Fast shipping, good prices
- **Delighters**: Surprise discount, gift wrapping, handwritten thank-you note

**Implication**: Fix basic expectations first (prevents churn), optimize performance second (incremental improvement), add delighters last (differentiation).

**Trade-off**: User research intensive. Features drift from delighters to basics over time.

### Cost of Delay (Don Reinertsen)

**Question**: What's the cost per week of not shipping this feature?

**High cost of delay**: Revenue-generating features, competitive threats, compliance deadlines
**Low cost of delay**: Nice-to-haves, incremental improvements

**Prioritize by**: Cost of delay divided by duration (CD3 - Cost of Delay Divided by Duration)

**When to use**: Time-sensitive decisions, business-critical features.

**Trade-off**: Requires financial modeling. Hard to estimate for strategic features.

## Experimentation and Validation

Build-Measure-Learn means testing assumptions before committing to full builds.

### The Ladder of Evidence (Strong to Weak)

1. **Behavioral data**: What users actually do (strongest)
2. **A/B test results**: Controlled experiment showing causal relationship
3. **Prototype feedback**: Users try something close to real thing
4. **User interviews**: Users talk about their needs
5. **Surveys**: Users report preferences
6. **Internal opinions**: What team thinks (weakest)

**Principle**: Climb the ladder. Don't ship based on weak evidence when you could get strong evidence.

### A/B Testing Basics

**Structure**:
- Control group sees current experience
- Treatment group sees new feature
- Measure difference in key metric

**Statistical significance**: Need enough users to detect meaningful difference. Use sample size calculator.

**Common mistakes**:
- **Peeking**: Checking results before test completes (increases false positives)
- **Multiple comparisons**: Testing 20 metrics, one shows significance by chance
- **Novelty effect**: Users try new thing because it's new, not because it's better
- **Insufficient power**: Too few users, can't detect real differences

**When A/B testing works**:
- High traffic (thousands of users)
- Clear primary metric
- Changes where you expect measurable impact

**When it doesn't**:
- Low traffic (takes months to reach significance)
- Long-term strategic bets (can't measure quickly)
- Major redesigns (too many variables)

**Alternatives for low-traffic**:
- Sequential testing (rollout to 10%, then 50%, then 100%, measuring at each step)
- Qualitative validation (user testing, interviews)
- Analytics comparison (before vs. after, accounting for seasonality)

### Prototype Testing

Test the idea before building the full thing.

**Prototype fidelity levels**:
1. **Paper sketches**: Rough concept, very fast
2. **Wireframes**: Layout and flow, no polish
3. **Clickable mockup**: Looks real, limited functionality (Figma, InVision)
4. **Functional prototype**: Works for happy path, edge cases unhandled
5. **Beta feature**: Real implementation, small user group

**Start low fidelity**: Learn whether direction is right before investing in polish.

**What to test**:
- Do users understand what this does?
- Can they complete the task?
- Where do they get confused?
- Does this solve their problem better than current approach?

**How many users**: 5-8 per round. Run multiple rounds as you refine.

## Roadmap Formats and Communication

Different audiences need different views of the plan.

### Now/Next/Later Roadmap

**Now** (current sprint/month): Committed, in active development
**Next** (upcoming sprint/month): Prioritized, details being worked out
**Later** (future): Ideas, not committed

**Benefits**:
- Honest about uncertainty (doesn't pretend you know exactly what you'll build in month 6)
- Easy to update
- Prevents premature commitment

**Trade-offs**: Less specific than stakeholders often want. Requires cultural shift to accept uncertainty.

### Theme-Based Roadmap

**Structure**: Organize by themes (customer segments, strategic goals, problem areas) rather than specific features.

**Example**:
- **Q1 theme**: Improve activation (get new users to value faster)
- **Q2 theme**: Increase retention (keep existing users engaged)
- **Q3 theme**: Expansion (drive upsell and cross-sell)

**Benefits**: Focuses on outcomes, allows flexibility on specific solutions.

**Trade-offs**: Vague for teams needing concrete plans.

### Feature Roadmap (Traditional)

**Structure**: Timeline with specific features mapped to dates.

**Benefits**: Concrete, easy to understand, satisfies stakeholders wanting certainty.

**Trade-offs**:
- Pretends you know what you'll build in 6 months (you don't)
- Becomes outdated immediately
- Incentivizes shipping features on time regardless of whether they're right features
- Discourages learning and adaptation

**When to use**: Regulatory deadlines, contractual obligations, coordinated launches. Otherwise, avoid.

### Amazon Working Backwards (PR/FAQ)

**Format**: Start with press release and FAQ for finished feature as if launching today.

**Press release includes**:
- Heading (feature name)
- Problem being solved
- Quote from leader about why it matters
- How it works
- Quote from hypothetical customer about impact
- How to get started

**FAQ covers**:
- User questions
- Business questions
- Technical questions

**Process**: Write before building. If you can't write compelling press release, don't build it.

**Benefits**: Forces clarity on user value. Surface questions early. Creates alignment.

**Trade-offs**: Time investment upfront. Works better for customer-facing features than infrastructure.

## Metrics and Instrumentation

You can't learn from what you don't measure.

### North Star Metric

**Definition**: Single metric that captures core value delivered to users.

**Examples**:
- **Spotify**: Time spent listening
- **Airbnb**: Nights booked
- **Slack**: Messages sent by team
- **Notion**: Engaged teams (teams with 5+ active users)

**Characteristics of good North Star**:
- Expresses value to customer
- Correlated with business success
- Actionable (team can influence it)
- Leading indicator (predicts long-term success)

**Supporting metrics**: Break down North Star into input metrics you can directly influence.

**Example** (e-commerce, North Star = Revenue):
- Input metrics: Traffic, conversion rate, average order value, repeat purchase rate
- Levers: SEO, checkout optimization, recommendations, email marketing

### Metric Instrumentation Checklist

For each feature you ship:
- [ ] Primary metric defined (what success looks like)
- [ ] Events instrumented (user actions logged)
- [ ] Funnels set up (track progression through flow)
- [ ] Dashboards created (easy to check progress)
- [ ] Alerts configured (know when metric degrades)
- [ ] Baseline measured (know where you started)

**Common gap**: Ship feature, realize later you can't measure impact because you didn't instrument properly.

**Prevention**: Instrumentation requirements in definition of done.

## Balancing Exploration and Exploitation

**Exploitation**: Double down on what's working (optimize existing features)
**Exploration**: Try new things (new features, new markets, new approaches)

**Multi-armed bandit problem**: Allocate resources to maximize long-term value.

**Risk of over-exploiting**: Incremental improvements while missing big opportunities. Competitors innovate past you.

**Risk of over-exploring**: Constantly chasing new ideas, nothing fully developed. "Ready, fire, aim" repeatedly.

### Allocation Strategies

**70/20/10 rule** (Google):
- 70% on core business (exploitation)
- 20% on related innovations (adjacent exploration)
- 10% on wild ideas (high-risk exploration)

**Basecamp approach**: 6-week cycles with built-in 2-week cooldown for exploration.

**Spotify squads**: Teams self-allocate based on OKRs, but leadership nudges toward balance.

**No universal answer**: Early-stage products need more exploration. Mature products need more exploitation.

## Saying No Effectively

Most product work is saying no to good ideas so you can say yes to great ones.

### How to Say No

**Bad approach**: "We don't have time" (implies you might do it later, creates false hope)

**Better**: "We're prioritizing X because it affects Y users. This affects fewer users and has less impact."

**Even better**: "Not on the roadmap now. Here's where to submit it for future consideration. If we see demand from 10+ customers, we'll reconsider."

**Best**: "That's not aligned with our strategy to [stated strategy]. Here's an alternative approach that gets you to your goal."

### The Product Backlog Problem

Backlogs become graveyards of ideas that will never be built but no one wants to close.

**Symptoms**:
- Hundreds of tickets
- Oldest item is from 2 years ago
- No one reviews regularly

**Fix**: Aggressive pruning. If it hasn't been prioritized in 6 months, close it. If it's still important, it'll come back up.

**Better approach**: Limit backlog to items you might build in next 3 months. Everything else goes in "ideas parking lot" reviewed quarterly.

## Integration with Iteration Practices

Feature planning doesn't exist in isolation.

**From retrospectives**: Process improvements, technical debt items
**From security reviews**: Security features, compliance work
**From incident post-mortems**: Reliability improvements, monitoring gaps
**From user research**: Opportunities and solutions

**Synthesis**: Regular planning sessions that incorporate all these inputs.

**Cadence**:
- Weekly: Tactical prioritization (what's next?)
- Monthly: Validate assumptions, adjust based on data
- Quarterly: Strategic direction, big bets

## Next Steps

- **Deep Water**: Product-market fit assessment, outcome-based OKRs, portfolio management, learning systems at scale
- **Related**: [Job-to-be-Done](../../01-discovery-planning/job-to-be-done/mid-depth/), [Monitoring & Logging](../../06-operations/monitoring-logging/mid-depth/)

## Framework Quick Reference

| Framework | Best For | Complexity | Data Required |
|-----------|----------|------------|---------------|
| **Impact vs. Effort** | Simple prioritization | Low | Estimates |
| **RICE** | Comparing diverse features | Medium | Numeric estimates |
| **Value vs. Complexity** | Balancing multiple value types | Medium | Subjective scoring |
| **Kano Model** | Understanding satisfaction drivers | High | User research |
| **Cost of Delay** | Time-sensitive decisions | High | Financial models |

**Start with**: Impact vs. Effort. Graduate to RICE as estimation discipline improves.

## Roadmap Format Comparison

| Format | Certainty | Flexibility | Stakeholder Comfort |
|--------|-----------|-------------|---------------------|
| **Now/Next/Later** | Low | High | Low |
| **Theme-based** | Medium | High | Medium |
| **Feature timeline** | High (false) | Low | High |
| **PR/FAQ** | High for scope | Medium | Medium |

**Choose based on**: Organizational culture and actual uncertainty in your planning.
