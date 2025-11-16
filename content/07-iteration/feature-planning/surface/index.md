---
title: "Feature Planning"
phase: "07-iteration"
topic: "feature-planning"
depth: "surface"
reading_time: 9
prerequisites: ["job-to-be-done", "deployment"]
related_topics: ["monitoring-logging", "retrospectives", "user-research"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-16"
---

# Feature Planning

Feature planning is deciding what to build next based on what you've learned from what you already built. It's not about having the best ideas - it's about having the best information when making decisions.

Most teams build features because someone thought they'd be cool. Better teams build features because data and user feedback said they'd solve real problems.

## Why This Matters

You have limited time. Every feature you build is a bet: you're betting users want it, will use it, and that it's more valuable than the other things you could build instead.

**Without data**: You're guessing.
**With data**: You're making informed bets.

Informed bets still fail sometimes. But they fail less often.

## The Basic Loop

1. **Ship something**
2. **Watch what happens** (monitoring, analytics, user feedback)
3. **Learn what worked and what didn't**
4. **Decide what to build next** based on that learning
5. **Repeat**

This is Eric Ries' Build-Measure-Learn cycle from "The Lean Startup." Sounds simple. Most teams skip steps 2 and 3.

## What to Measure

You need to know two things:
1. **Are people using what you built?**
2. **Is it solving their problem?**

### Usage Metrics (Are People Using It?)

**Basic questions**:
- How many people used this feature this week?
- Is usage going up or down over time?
- Are new users trying it or just existing users?
- Do people use it once and never again, or repeatedly?

**Tools**: Google Analytics, Mixpanel, Amplitude, Heap, Plausible.

**YOLO escape hatch**: Start with just page views and user counts. You can get sophisticated later.

### Outcome Metrics (Is It Solving Their Problem?)

Usage doesn't mean success. People might be using a feature because they have no choice, not because it's good.

**Better questions**:
- Did the feature accomplish what users were trying to do?
- Are users getting stuck? Where?
- Are they giving up partway through?
- Are they contacting support about this feature?

**Examples**:
- **E-commerce**: Did they complete checkout? (not just add to cart)
- **SaaS tool**: Did they accomplish their task? (not just log in)
- **Content site**: Did they find what they were looking for? (not just bounce)

**Tools**: User session recordings (FullStory, Hotjar), customer support tickets, Net Promoter Score (NPS) surveys.

## Quick Ways to Gather Feedback

### 1. Talk to Actual Users (15-30 min each)

Not a survey. An actual conversation.

**Questions to ask**:
- What were you trying to do?
- What went well?
- What was confusing or frustrating?
- If you could change one thing, what would it be?

**How many**: 5-10 users is usually enough to find the biggest problems.

**Who to talk to**: Recent users (within last week), mix of new and experienced, include people who stopped using your product.

**Mistake to avoid**: Only talking to users who love your product. The ones who left have better information about problems.

### 2. Watch Session Recordings

See what users actually do, not what they say they do.

**Look for**:
- Confusion (cursor hovering, clicking wrong things)
- Frustration (rapid clicking, rage clicks)
- Abandonment (getting halfway through and leaving)
- Workarounds (using features in ways you didn't expect)

**Time**: 30-60 minutes reviewing 10-15 sessions reveals most issues.

### 3. Check Support Tickets

What are people asking for help with?

**Common patterns**:
- Same question from multiple users = documentation problem or UX problem
- Workaround instructions = feature gap
- "How do I..." questions = missing feature or hidden feature

**Frequency**: Weekly review. Takes 15 minutes.

### 4. Monitor Analytics Funnels

Where are people dropping off?

**Example funnel**:
1. Land on homepage: 1000 users
2. Sign up: 200 users (80% drop-off)
3. Complete onboarding: 100 users (50% drop-off)
4. Use core feature: 30 users (70% drop-off)

**Biggest drop-off = biggest opportunity**. Fix that first.

## Deciding What to Build Next

You'll have more ideas than time. Prioritize ruthlessly.

### The Simple Framework: Impact vs. Effort

Draw a 2x2 grid:

```
High Impact, Low Effort → Do these first (quick wins)
High Impact, High Effort → Do these next (big bets)
Low Impact, Low Effort → Do these if you have time
Low Impact, High Effort → Don't do these
```

**Impact**: How many users affected? How much does it improve their experience? Revenue impact?

**Effort**: How long will it take? How risky is it? Dependencies?

**Estimate both honestly**. Don't lie to yourself about effort.

### Common Traps

**Trap: Building what the loudest customer wants**
Loudest ≠ most representative. One angry customer might want something 99% of users don't care about.

**Fix**: Look for patterns across multiple users, not individual requests.

**Trap: Building everything half-way**
Shipping 10 mediocre features instead of 3 great ones.

**Fix**: Finish things. Better to have 3 features that work well than 10 that barely work.

**Trap: Building features nobody asked for**
"If we build it, they will come." (They won't.)

**Fix**: Validate demand before building. Talk to users. Run surveys. Check if competitors have this feature and whether users care.

**Trap: Ignoring technical debt**
Keep adding features while system gets slower, buggier, harder to change.

**Fix**: Reserve 20% of time for technical improvements. Faster long-term.

## The Minimal Viable Feature Planning Process

If you're just starting, do this:

**Weekly** (30 minutes):
1. Review metrics from last week
   - What went up/down?
   - Any surprises?
2. Review support tickets
   - Common issues?
3. Review feedback
   - What are users saying?

**Monthly** (2 hours):
1. List potential features/improvements
2. Score on impact vs. effort
3. Pick top 3 for next month
4. Make sure at least one is technical debt

**Quarterly** (4 hours):
1. Look at bigger trends
   - Are we growing or shrinking?
   - What's working? What isn't?
2. Decide strategic direction
   - Double down on what works
   - Kill what doesn't
   - Explore one new bet

## What Good Looks Like

You know feature planning is working when:
- You can explain why you're building something with data, not opinions
- Features ship and get used (not built and ignored)
- You say "no" to good ideas because you have better ones
- Teams spend more time on features that matter to users
- You kill features that aren't working

## YOLO Dev Escape Hatches

**"We don't have analytics set up"**
Add Google Analytics or Plausible. Takes 30 minutes. Free.

**"We don't have time to talk to users"**
You have time to build features nobody uses? 5 user conversations save weeks of wasted development.

**"Our roadmap is already set for the year"**
Then you're not learning from what you ship. Reserve 20-30% for learning-based changes.

**"We just build what the boss wants"**
Help your boss make better decisions by showing them user data. Most bosses prefer being right to being in charge.

## Next Steps

- **Mid-Depth**: Product discovery frameworks (continuous discovery, opportunity solution trees), experimentation and A/B testing, roadmap formats
- **Deep Water**: Outcome-based planning, North Star metrics, product-market fit assessment, learning systems at scale

## Quick Reference

**Build-Measure-Learn loop**:
1. Ship feature
2. Measure usage and outcomes
3. Learn what worked
4. Plan next feature based on learning

**Prioritization**:
- High impact, low effort = Do first
- High impact, high effort = Do next
- Low impact = Maybe later or never

**Data to collect**:
- Usage metrics (who, how many, how often)
- Outcome metrics (did it solve their problem)
- Qualitative feedback (what users say)

**How often**:
- Weekly: Quick metrics review
- Monthly: Feature prioritization
- Quarterly: Strategic direction

---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Retrospectives](../../retrospectives/surface/index.md) - Related iteration considerations
- [Security Posture Reviews](../../security-posture-reviews/surface/index.md) - Related iteration considerations

### Navigate
- [← Back to Iteration Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
