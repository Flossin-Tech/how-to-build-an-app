# Microfrontend vs. Monolith Architecture Decision: Practical Application

**Case Study Type:** Real-World Architecture Decision
**Domain:** Web Applications
**Industry:** Finance Sector
**Decision Date:** November 2025
**Outcome:** Extended Monolith (Code Splitting) Chosen

---

## Overview

This practical example demonstrates how a finance sector organization made a scale-appropriate architecture decision when adding new features to an existing web application. The decision framework and templates provided here are reusable for similar architecture choices.

**For the comprehensive academic case study with full research methodology, see:**
→ [`/content/02-design/architecture-design/case-studies/microfrontend-vs-monolith.md`](/content/02-design/architecture-design/case-studies/microfrontend-vs-monolith.md)

---

## Quick Summary

**The Question:** Should we adopt microfrontend architecture for three new feature areas, or extend the existing monolith?

**The Answer:** Extended monolith with React.lazy code splitting.

**Why:**
- 10x below scale where microfrontends provide value (500 vs. 5,000+ users)
- 3x below team scale needing independent deployment (1 vs. 3+ teams)
- 68-78% skill gap for microfrontends vs. 10% for monolith
- $27K investment vs. $135K-$228K for microfrontends
- 12-14 weeks to production vs. 16-41 weeks

---

## Contents

1. **[scenario.md](scenario.md)** - The business context and technical problem
2. **[approach.md](approach.md)** - How the decision was made using quantitative framework
3. **[what-went-right.md](what-went-right.md)** - Why extended monolith succeeded
4. **[what-went-wrong.md](what-went-wrong.md)** - Pitfalls avoided by rejecting microfrontends
5. **[takeaways.md](takeaways.md)** - Key learnings for other architecture decisions
6. **[templates/](templates/)** - Reusable assessment templates and checklists

---

## How to Use This Example

### If You're Facing a Similar Decision

1. **Read [scenario.md](scenario.md)** - Does this match your context?
2. **Read [approach.md](approach.md)** - Learn the 5-step decision framework
3. **Use [templates/](templates/)** - Apply the assessment tools to your situation
4. **Review [takeaways.md](takeaways.md)** - Apply lessons to your context

### If You're Learning Architecture Decision-Making

1. **Start with the comprehensive case study** in `/content/02-design/architecture-design/case-studies/`
2. **Return here for practical application** - See how it works in practice
3. **Experiment with templates** - Practice on hypothetical scenarios

### If You're Teaching This Material

- **Academic treatment:** Use the case study in `/content/` for structured learning
- **Practical workshop:** Use this example directory for hands-on exercises
- **Templates:** Provide the assessment matrices for student exercises

---

## Related Resources

**Educational Content:**
- [Architecture Design (Surface)](/content/02-design/architecture-design/surface/index.md) - Architecture basics
- [Architecture Design (Mid-Depth)](/content/02-design/architecture-design/mid-depth/index.md) - Decision frameworks
- [Architecture Design (Deep-Water)](/content/02-design/architecture-design/deep-water/index.md) - Advanced patterns

**Diagrams:**
- All architecture diagrams: `/assets/diagrams/architecture/microfrontend-case-study/`
- Decision flowchart, scale thresholds, comparison matrices

**Other Examples:**
- See `/examples/README.md` for code examples implementing the chosen architecture
- Microfrontend implementation examples (when appropriate)
- Monolith optimization examples

---

## Reusable Decision Framework

This example demonstrates a 5-step framework applicable to any architecture decision:

1. **Scale Assessment** - Are we at the right scale for this option?
2. **Capability Assessment** - Can our team build and maintain this?
3. **Financial Analysis** - What's the total cost of ownership?
4. **Risk Evaluation** - What could go wrong?
5. **Reversibility Check** - How hard to change course later?

See [approach.md](approach.md) for detailed application and [templates/](templates/) for reusable tools.

---

## Key Insight

**The best architecture is not the most advanced—it's the one that matches your current constraints while maintaining future flexibility.**

Microfrontends solve organizational problems (coordinating 3+ autonomous teams), not technical problems (having multiple feature areas). At 10x below the scale where benefits materialize, they represent premature optimization that costs 4-6x more and delivers 30-50% slower.

---

## Questions This Example Answers

- When are microfrontends appropriate vs. premature?
- How do you quantify "scale appropriateness"?
- What skill gaps make an architecture too risky?
- How do you calculate total cost including opportunity costs?
- When should you revisit an architecture decision?
- How do you assess risk in regulated industries (finance, healthcare)?

---

## Credits

**Organization:** Anonymous Finance Sector Company
**Team Size:** 4-6 developers
**Timeline:** November 2025 decision, 12-14 week implementation
**Outcome:** Production deployment Q1 2026, features delivered on time and budget

---

**Last Updated:** November 18, 2025
**Version:** 1.0
