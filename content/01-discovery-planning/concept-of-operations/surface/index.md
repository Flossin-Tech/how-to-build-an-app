---
title: "Concept of Operations (ConOps)"
phase: "01-discovery-planning"
topic: "concept-of-operations"
depth: "surface"
reading_time: 7
prerequisites: ["job-to-be-done"]
related_topics: ["requirements-gathering", "threat-modeling"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Concept of Operations (ConOps)

Define how the system will actually be used.

## What This Is

Describe how users will interact with your system in the real world. Not what the system can do, but how people will actually use it day-to-day.

## Minimum Viable ConOps

Write 3-5 scenarios showing: "User does X, system responds with Y, user then does Z"

**Red flag:** Building without ConOps = discovering your API design is backwards after launch.

## Good vs Bad ConOps

**Bad example:**
- ❌ "The system will have a dashboard"

This describes a feature, not how someone uses it.

**Good example:**
- ✅ "Doctor opens patient chart, reviews flagged lab results, clicks to order follow-up test, system checks insurance pre-auth"

This shows the actual workflow in context.

## Why This Matters

Without ConOps, you end up building systems that technically work but don't fit how people actually work. You discover this after you've written thousands of lines of code.

## How to Write a Scenario

1. Start with a real person in a real situation
2. Describe what they're trying to accomplish
3. Walk through each step of the interaction
4. Include what the system does in response
5. End with the outcome

Keep it concrete. Avoid abstractions like "the user performs operations." Instead: "the nurse scans the patient wristband."
