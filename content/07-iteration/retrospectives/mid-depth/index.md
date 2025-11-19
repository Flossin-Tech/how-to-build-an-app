---
title: "Retrospectives"
phase: "07-iteration"
topic: "retrospectives"
depth: "mid-depth"
reading_time: 25
prerequisites: ["deployment", "operations", "incident-response"]
related_topics: ["monitoring-logging", "feature-planning", "security-posture-reviews"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-16"
---

# Retrospectives

Retrospectives are structured learning sessions where teams identify what's working, what isn't, and what to change. The format matters less than the follow-through. A team that runs mediocre retros but implements every action item will outperform a team with sophisticated formats and no execution.

## The Facilitation Challenge

Running effective retrospectives requires balancing structure (so you make progress) with openness (so people speak honestly). Too much structure and you get performative participation. Too little and you get meandering conversations that waste time.

### Core Facilitation Principles (Esther Derby & Diana Larsen)

1. **Set the stage**: Create psychological safety before diving into problems
2. **Gather data**: Collect what actually happened, not opinions about what happened
3. **Generate insights**: Look for patterns and root causes
4. **Decide what to do**: Specific, actionable changes with owners
5. **Close the retrospective**: End with clarity about next steps

The facilitator's job is to guide the process, not control the outcomes. You're not there to solve problems - you're there to help the team solve their own problems.

## Retrospective Formats and When to Use Them

Different formats work better for different situations. Pick based on what you're trying to learn.

### Start/Stop/Continue
**When to use**: Regular sprint retros, general-purpose reflection
**Time**: 30-45 minutes
**Best for**: Teams that need clear action items

**Structure:**
- **Start**: What should we begin doing?
- **Stop**: What should we quit doing?
- **Continue**: What's working that we should keep?

**Why it works**: Forces prioritization. You can't start 10 new things - the format pushes you toward 1-2 concrete changes.

**Trade-off**: Can feel repetitive if you use it every time. Rotate with other formats.

### Timeline Retrospective
**When to use**: After a major release, incident post-mortem, when you need to establish shared understanding
**Time**: 45-60 minutes
**Best for**: Complex situations with unclear timelines

**Structure:**
1. Draw a timeline of the period (on whiteboard or shared doc)
2. Each person adds events they remember
3. Mark emotional reactions (highs and lows)
4. Discuss patterns: What caused the lows? What created the highs?
5. Decide what to change

**Why it works**: Reveals different perspectives on the same events. Backend thought deploy went smoothly while frontend was fighting CORS errors.

**Trade-off**: Takes longer, requires visual space (harder remote).

### Five Whys (Sakichi Toyoda/Toyota Production System)
**When to use**: After incidents, when you keep hitting the same problem
**Time**: 20-30 minutes for a single issue
**Best for**: Getting to root causes instead of symptoms

**Structure:**
1. State the problem clearly
2. Ask "Why did this happen?"
3. Answer factually
4. Ask "Why?" about that answer
5. Repeat until you hit systemic causes (usually 3-5 iterations)

**Example:**
- Problem: Production deploy failed Friday at 4pm
- Why? Database migration timed out
- Why? Migration locked a table with 10M rows
- Why? We didn't test migration on production-sized data
- Why? Staging database only has 1000 rows
- Why? No process for keeping staging data volume realistic
- **Action**: Create process to refresh staging with production-sized sample data monthly

**Why it works**: Gets past "someone made a mistake" to "what systemic issue allowed this mistake?"

**Trade-off**: Can feel like interrogation if not facilitated carefully. Restate the Prime Directive often.

### Sailboat/Speedboat Retrospective
**When to use**: When team morale is low, when you want metaphorical distance
**Time**: 30-45 minutes
**Best for**: Discussing sensitive topics without direct confrontation

**Structure:**
Draw a sailboat heading toward an island:
- **Island (goal)**: Where are we trying to go?
- **Wind**: What's helping us get there?
- **Anchors**: What's slowing us down?
- **Rocks**: What risks are we worried about?

**Why it works**: Metaphor creates psychological distance. Easier to say "legacy code is an anchor" than "this codebase is terrible."

**Trade-off**: Some teams find metaphors silly. Read the room.

### Lean Coffee Format
**When to use**: When team has lots of topics to discuss, limited time
**Time**: 45-60 minutes
**Best for**: Self-organizing teams, varied discussion topics

**Structure:**
1. Everyone writes topics on cards (5 min)
2. Brief explanation of each topic (5 min)
3. Dot voting to prioritize (2 min)
4. Discuss top topic for 8 minutes
5. Vote to continue (3 min more) or move to next topic
6. Repeat until time runs out
7. Last 10 min: decide action items

**Why it works**: Democratic, responsive to what team cares about most.

**Trade-off**: Can skip important-but-uncomfortable topics if team votes for easy wins.

## Remote vs. In-Person Trade-offs

**Remote advantages:**
- Written notes by default (better documentation)
- Anonymous input possible (Miro, Retrium, Google Jamboard)
- Easier for quiet team members to contribute
- Can use breakout rooms for small group discussions

**Remote challenges:**
- Harder to read body language
- Technical issues derail momentum
- Less spontaneous discussion
- Screen fatigue affects engagement

**Hybrid challenges:**
- Remote participants feel like second-class citizens
- Whiteboard work excludes remote folks
- Audio quality issues
- Harder to facilitate equal participation

**Making hybrid work:**
- Use digital tools even for in-person participants (everyone on laptops)
- Dedicated camera pointed at whiteboard
- Facilitator actively solicits remote input
- Test technology before the meeting

## Frequency and Timing

**Sprint retrospectives**: End of each sprint (every 1-2 weeks)
- Pros: Regular rhythm, issues are fresh
- Cons: Can feel like obligation, less time to see if changes work

**Release retrospectives**: After major deploys
- Pros: Focused on significant events, clear scope
- Cons: May miss ongoing process problems

**Incident retrospectives**: Within 24-48 hours of incidents
- Pros: Details are fresh, urgency drives action
- Cons: Emotions may still be running high

**Quarterly retrospectives**: Broader process and team health
- Pros: Time to see patterns, strategic conversations
- Cons: Too infrequent to catch tactical issues

**Best practice**: Layer them. Sprint retros for tactical issues, quarterly for strategic, incident retros when needed.

## The Action Item Problem

Most retrospectives fail at follow-through. You have great conversations, identify real problems, agree on changes, then nothing happens.

### Why Action Items Fail

1. **Too many**: Team commits to 7 changes, completes 0
2. **Too vague**: "Improve communication" (how?)
3. **No owner**: Everyone's responsible = no one's responsible
4. **No deadline**: Will get to it eventually (never does)
5. **No authority**: Team identifies problem they can't fix (need budget/headcount/management decision)

### Making Action Items Stick

**SMART framework:**
- **Specific**: Not "better tests" but "add integration test for checkout flow"
- **Measurable**: How will we know it's done?
- **Achievable**: Can we actually do this with current resources?
- **Relevant**: Will this solve the problem we identified?
- **Time-bound**: By when? (Next retro is a good default)

**Limit to 1-3 action items per retro**
You will complete 1-3 small changes. You will not complete 10.

**Track publicly**
Put action items somewhere everyone sees them (team board, Slack channel, JIRA epic). Check status at next retro.

**Start each retro by reviewing last retro's actions**
Did we do what we said? Did it help? If not, why not?

## Measuring Retrospective Effectiveness

Hard to measure directly, but proxy metrics:

**Leading indicators:**
- Attendance rate (are people showing up?)
- Participation rate (are people contributing?)
- Action item completion rate (are we following through?)

**Lagging indicators:**
- DORA metrics improving over time (deploy frequency, lead time, MTTR, change failure rate)
- Same problems stop appearing in incident post-mortems
- Team satisfaction scores (Spotify squad health check model)

**Qualitative signals:**
- People bring up difficult topics without fear
- Constructive disagreement happens
- Solutions come from team, not facilitator
- Actions address systemic issues, not just symptoms

## Common Dysfunctions and Fixes

### Dysfunction: Blamestorming
**Symptom**: Retro turns into "whose fault was this?"
**Fix**: Restate Prime Directive. Focus on "what systemic issue allowed this?" not "who did this?"

### Dysfunction: Rehashing
**Symptom**: Same problems discussed every retro, nothing changes
**Fix**: Make action items more specific. If action isn't complete by next retro, escalate as impediment to management.

### Dysfunction: Toxic positivity
**Symptom**: Everything's great, no problems identified
**Fix**: Anonymous input methods. Explicit invitation: "What almost went wrong?" or "What got harder this sprint?"

### Dysfunction: Missing the empowered
**Symptom**: Team identifies problems only management can fix
**Fix**: Invite decision-makers periodically. Track impediments separately and escalate. Focus team retros on things team can control.

### Dysfunction: Facilitator as problem-solver
**Symptom**: Facilitator proposes all solutions
**Fix**: Ask questions instead of giving answers. "What could we try?" not "Here's what we should do."

## Integration with Other Practices

Retrospectives don't exist in isolation. Connect them to:

**Incident post-mortems**: Feed systemic issues into retros
**Sprint planning**: Action items become backlog items
**Security reviews**: Security findings become retro topics
**Monitoring dashboards**: Use data to ground discussions
**Feature planning**: User feedback informs what to build next

## Next Steps

- **Deep Water**: Building organizational learning systems, cultural transformation, measuring improvement velocity, psychological safety at scale
- **Related**: [Incident Response](../../06-operations/incident-response/mid-depth/), [Feature Planning](../feature-planning/mid-depth/)

## Framework Summary

| Format | Best For | Time | Complexity |
|--------|----------|------|------------|
| Start/Stop/Continue | General-purpose | 30-45 min | Low |
| Timeline | Complex events | 45-60 min | Medium |
| Five Whys | Root cause analysis | 20-30 min | Medium |
| Sailboat | Low morale, sensitive topics | 30-45 min | Low |
| Lean Coffee | Democratic topic selection | 45-60 min | Medium |

**When in doubt**: Start with Start/Stop/Continue. It works for 80% of situations.
