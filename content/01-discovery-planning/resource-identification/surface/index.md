---
title: "Resource Identification"
phase: "01-discovery-planning"
topic: "resource-identification"
depth: "surface"
reading_time: 6
prerequisites: ["job-to-be-done", "requirements-gathering"]
related_topics: ["scope-setting", "threat-modeling"]
personas: ["new-developer", "yolo-dev", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Resource Identification

Determine team, tools, budget, and constraints.

## What This Is

Figure out what you have and what you need to build this. Before you start coding, know whether you have the people, skills, money, and tools required.

## Minimum Viable Resource List

Document:
- **Team members + their skills**
- **Budget range** (even rough estimate)
- **Timeline** (when does this need to be done?)
- **Must-use tools/platforms** (company requirements, existing infrastructure)

**Red flag:** Starting without knowing your constraints = project stalls halfway through.

## Good vs Bad Resource Planning

**Bad example:**
- ❌ "We'll figure it out as we go"

This leads to discovering you need a machine learning expert when you're 80% done.

**Good example:**
- ✅ "2 backend devs (Python), 1 frontend (React), $50K cloud budget, 3 months, must use company AWS account"

This tells you exactly what you're working with.

## The Three Critical Questions

1. **Do we have the skills?** If not, how do we get them? (hire, train, outsource?)
2. **Do we have the budget?** What happens if we run over?
3. **Do we have the time?** What gets cut if we're behind schedule?

Answer these before you start, not when you hit the wall.

## Common Resources to Identify

**People:**
- Developers (what languages/frameworks?)
- Designer (UI/UX work)
- QA/Testers
- DevOps/Infrastructure
- Security specialist (even part-time)

**Tools:**
- Development tools (IDEs, version control)
- Hosting/infrastructure (AWS, Azure, self-hosted?)
- Third-party services (auth, payments, email, monitoring)
- CI/CD pipeline

**Budget:**
- Cloud hosting costs
- Third-party service subscriptions
- Tools/licenses
- External contractors if needed

Don't need perfect numbers. Need ballpark figures so you know if you're building a $5K project or a $500K project.

---

## Navigation

### Want to Go Deeper?
- **[Mid-Depth →](../mid-depth/index.md)** Infrastructure planning, third-party dependencies, and security tools
- **[Deep Water →](../deep-water/index.md)** Capacity planning, compliance costs, disaster recovery, and on-call rotation

### Related Topics
- [Scope Setting](../../scope-setting/surface/index.md) - Define project boundaries
- [Requirements Gathering](../../requirements-gathering/surface/index.md) - What you need to build

### Navigate
- [← Back to Discovery & Planning](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
