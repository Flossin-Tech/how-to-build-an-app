---
title: "Threat Modeling"
phase: "01-discovery-planning"
topic: "threat-modeling"
depth: "surface"
reading_time: 6
prerequisites: ["concept-of-operations"]
related_topics: ["requirements-gathering", "scope-setting"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Threat Modeling

Identify security risks and vulnerabilities early.

## What This Is

Think like an attacker - what could go wrong with your system? Before you build anything, figure out what attackers might try and how to prevent it.

## Minimum Viable Threat Model

List 3-5 things: "If attacker does X, they could access/break/steal Y"

Then for each threat, write down how you'll prevent it.

**Red flag:** Skipping threat modeling = expensive security patches after breach headlines.

## Good vs Bad Threat Modeling

**Bad example:**
- ❌ "We'll add security later"

Security bolted on later is security full of holes.

**Good example:**
- ✅ "If attacker intercepts API token, they access all user data. Need: token expiration + rotation"

This names a specific threat and a specific mitigation.

## The YOLO Dev Quick List

If you only do three things:

1. **List your sensitive data:** User passwords, payment info, personal details, API keys
2. **List who can access what:** Admin vs regular user vs anonymous visitor
3. **List your attack surface:** Login form, API endpoints, file uploads, anything users can send you

For each item, ask: "What's the worst thing someone could do here?"

## Common Attacks to Consider

- **Stolen credentials:** User password gets leaked/guessed
- **Injection attacks:** Attacker puts SQL/code into your forms
- **Unauthorized access:** User tries to access someone else's data
- **Data interception:** Someone eavesdropping on network traffic
- **Denial of service:** Attacker floods your system to make it unusable

You don't need to be a security expert. Just think through "what could go wrong" before it does.

---

## Navigation

### Want to Go Deeper?
- **[Mid-Depth →](../mid-depth/index.md)** STRIDE framework, data classification, and mitigation strategies
- **[Deep Water →](../deep-water/index.md)** Advanced frameworks, privacy modeling, supply chain threats

### Related Topics
- [Concept of Operations](../../concept-of-operations/surface/index.md) - How your system will be used
- [Requirements Gathering](../../requirements-gathering/surface/index.md) - Security requirements

### Navigate
- [← Back to Discovery & Planning](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
