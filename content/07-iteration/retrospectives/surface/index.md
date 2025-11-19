---
title: "Retrospectives"
phase: "07-iteration"
topic: "retrospectives"
depth: "surface"
reading_time: 8
prerequisites: ["deployment", "operations"]
related_topics: ["incident-response", "monitoring-logging", "feature-planning"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-16"
---

# Retrospectives

A retrospective is a structured conversation where your team stops, looks at what happened, and decides what to do differently. That's it.

Most teams skip this. They're too busy shipping the next thing to talk about how the last thing went. Then they repeat the same problems forever.

## Why This Matters

You know those recurring problems that keep slowing you down? The deploy process that always breaks on Fridays. The dependency that keeps causing bugs. The miscommunication between backend and frontend. Those don't fix themselves.

Retrospectives are how you stop making the same mistake twice.

## The One Rule (Norm Kerth's Prime Directive)

Before every retrospective, someone reads this out loud:

> "Regardless of what we discover, we understand and truly believe that everyone did the best job they could, given what they knew at the time, their skills and abilities, the resources available, and the situation at hand."

If you can't believe that, retrospectives won't work. You'll get blame and defensiveness instead of learning.

## The Basic Format (15-30 Minutes)

You need three things:
1. **What went well?** (Things to keep doing)
2. **What didn't go well?** (Things that caused problems)
3. **What are we going to change?** (Specific actions, with owners)

That's the whole structure. Everything else is optional.

## How to Run One

### Before the Meeting
- Pick a regular time (end of sprint, after a major deploy, monthly)
- Keep it short - 30 minutes max for small teams
- Have someone facilitate (rotate this role)

### During the Meeting
1. **Set the context** (5 min)
   - Read the Prime Directive
   - Remind everyone what time period you're reviewing
   - State the goal: learn and improve, not blame

2. **Gather data** (10 min)
   - Each person shares what went well and what didn't
   - Write everything down visibly (whiteboard, shared doc, sticky notes)
   - No discussion yet - just collect observations

3. **Identify patterns** (5 min)
   - Group similar items together
   - Look for recurring themes
   - Pick the top 1-3 issues to address

4. **Decide actions** (10 min)
   - For each issue: what specifically will we do differently?
   - Assign an owner to each action
   - Set a deadline (next retro is common)
   - Make actions concrete: "Deploy before 2pm on Fridays" not "Improve deploy process"

### After the Meeting
- Write down the action items somewhere everyone can see them
- Actually do the actions (this is where most teams fail)
- Check at the next retro: did we do what we said? Did it help?

## Common Escape Hatches for YOLO Devs

**"We don't have time for meetings"**
You have time to fix the same bug three times in a row? A 15-minute conversation now saves hours later.

**"My team is just me"**
Do a personal retro. Write down what went well, what didn't, what you'll change. Takes 10 minutes. Works surprisingly well.

**"Nothing went wrong"**
Something always went wrong. You spent three hours debugging something. A library broke. A deploy took longer than expected. Those count.

**"Everything went wrong"**
Pick one thing. Change that. Come back to the rest next time.

## The Minimal Viable Retrospective

If you're really strapped for time, do this:

1. **One thing that went well** (keep doing it)
2. **One thing that didn't** (stop doing it or fix it)
3. **One specific change** (who, what, by when)

That's 5 minutes. You can afford 5 minutes.

## What Good Looks Like

You know retrospectives are working when:
- You stop having the same problem repeatedly
- People actually bring up difficult issues without fear
- The action items get completed before the next retro
- You're fixing systemic problems, not just individual mistakes
- Teams make small improvements consistently instead of big changes occasionally

## What Doesn't Work

**Blame retrospectives**: "Why did Alex break production?"
This shuts down learning. People stop being honest.

**No-action retrospectives**: You talk about problems, write them down, nothing changes.
This breeds cynicism faster than anything.

**Manager-only retrospectives**: "I'll tell you what went wrong."
The people doing the work have better information than you do.

**Once-a-year retrospectives**: Too infrequent to matter.
By the time you meet again, you've forgotten what happened and why.

## The Real Point

Retrospectives aren't about having meetings. They're about building a team that learns from experience instead of repeating it.

The teams that ship reliably aren't the ones that never make mistakes. They're the ones that notice mistakes quickly, talk about them honestly, and change something concrete before the next iteration.

That's the difference between a team that gets better and a team that just gets older.

## Next Steps

- **Mid-Depth**: Specific retrospective formats (Start/Stop/Continue, Timeline, Five Whys) and when to use each
- **Deep Water**: Building organizational learning systems, measuring improvement velocity, psychological safety

## Quick Reference

**Minimum viable retro:**
1. What went well?
2. What didn't?
3. What will we change? (specific, with owner)

**How often:** End of sprint, after major releases, after incidents, or monthly

**How long:** 15-30 minutes for small teams, 45-60 for larger groups

**Who:** Everyone who worked on what you're reviewing

**When it's working:** Same problems stop recurring
