# How to Build an App: A Non-Linear Guide to Software Development

## What This Is

A practical reference for building software that actually works—not just technically, but for the humans who use it and maintain it.

Unlike traditional tutorials that force you through Chapter 1 before Chapter 2, this guide is built for how developers actually work: jumping in wherever you are, getting what you need, and moving forward.

## Who This Is For

**New developers** who need a map of the entire software development lifecycle without drowning in theory.

**Busy developers** who need quick answers right now—not a 300-page book they'll never finish.

**Specialists expanding out** (e.g., backend devs learning deployment, web devs learning ML) who know the process but need domain-specific guidance.

**Generalists leveling up** who want to fill gaps across the full stack of disciplines.

**YOLO devs at 2am** who built something that works and now need to figure out testing, security, or deployment without starting over.

## How This Works: The Thermocline Principle

Each section is organized in layers, like ocean depth:

**Surface Layer** - Essential information everyone needs. If you only read this, you won't sink.
- What this step is and why it matters
- Minimum viable version (what you MUST do today)
- Red flags (what happens if you skip this)
- Quick examples

**Mid-Depth** - Practical guidance for competent practitioners.
- Common pitfalls and how to avoid them
- Tool recommendations with reasoning
- Team coordination aspects
- Real-world trade-offs

**Deep Water** - Advanced topics for specialists and mature teams.
- Edge cases and complex scenarios
- Compliance and regulatory considerations
- Enterprise patterns
- Integration with other disciplines

**Read as deep as you need, then surface.** Don't force yourself into deep water when you just need to stay afloat.

## The Philosophy

### 1. Find the Work to Be Done
We start with Jobs-to-be-Done thinking because **building the wrong thing perfectly is still failure**. Before you write a single line of code, understand what problem you're actually solving—not what solution you think you should build.

### 2. Your Product Is Not the Solution
The solution might be a different app, a spreadsheet, a process change, or doing nothing. If you can't articulate the problem without mentioning your product, you haven't found the real job yet.

### 3. Non-Linear by Design
You don't need to read this cover-to-cover. Each section is self-contained enough to be useful on its own:
- Have an idea but don't know where to start? → Begin at "Spot the Job to Be Done"
- Already building but getting security warnings? → Jump to "Threat Modeling" or "Security Testing"
- Code works but keeps breaking in production? → Go to "Monitoring & Logging"
- Familiar with web apps but new to ML? → Use the same workflow, different examples

### 4. Thermoclines Prevent Drowning
Most guides are all-or-nothing: either trivial "Hello World" tutorials or enterprise architecture tomes. We give you escape hatches. Read the surface layer, ship your MVP, come back later for mid-depth when you're ready.

**The YOLO dev doesn't need to know about DREAD scoring for threat modeling.** They need to know: "List 3 things an attacker could do to your system and how to prevent them."

**The senior engineer switching to ML doesn't need to re-learn git.** They need: "Here's how data versioning differs from code versioning."

## What's Covered

### Discovery & Planning
Understand what you're building and why before writing code.
- Spot the Job to Be Done
- Concept of Operations
- Threat Modeling
- Requirements Gathering
- Resource Identification
- Scope Setting

### Design
Plan the architecture and identify risks before implementation.
- Architecture Design
- Data Flow Mapping
- Software Design Document
- Dependency Review

### Development
Write code that works, is secure, and others can maintain.
- Secure Coding Practices
- Code Review Process
- Secret Management
- Supply Chain Security

### Testing
Verify it works, is accessible, and won't break or get hacked.
- Unit/Integration Testing
- Security Testing
- Accessibility Testing
- Compliance Validation

### Deployment
Get your code running reliably in production.
- Infrastructure as Code
- CI/CD Pipeline Security
- Deployment Strategy
- Access Control

### Operations
Keep it running and handle when things go wrong.
- Monitoring & Logging
- Incident Response
- Patch Management
- Backup & Recovery

### Iteration
Learn from what happened and improve.
- Retrospectives
- Security Posture Reviews
- Feature Planning

## DevSecOps Integrated Throughout

Security isn't bolted on at the end. Every section integrates security, operations, and development practices because that's how modern software is actually built.

Threat modeling comes early (in Planning), not as an afterthought. Deployment strategy includes rollback procedures. Testing includes security scanning. This reflects reality.

## What This Isn't

**Not a code tutorial.** We won't teach you Python syntax or React hooks. We teach you the process of building systems.

**Not prescriptive.** We show trade-offs, not dogma. "Always use microservices" is bullshit. "Here's when microservices help and when they hurt" is useful.

**Not comprehensive.** We prioritize the 20% of knowledge that prevents 80% of pain. If you need the remaining 80% of knowledge, we'll point you to domain-specific resources.

**Not linear.** You're not required to read in order. Jump around. Skip sections. Come back later.

## How to Use This Guide

1. **Identify where you are** in the development lifecycle
2. **Jump to that section** (you don't need permission to skip ahead)
3. **Read the surface layer** to get oriented
4. **Dive deeper if needed** based on your project's maturity
5. **Return later** when you hit new challenges

## A Note on Maturity

Early projects need surface-level guidance. "Just get it working" is a legitimate strategy for validating an idea.

As your project grows—more users, more revenue, more risk—you'll naturally need mid-depth and deep-water practices. Compliance requirements, security audits, and scaling challenges will pull you deeper.

**That's fine.** Build for where you are now, not where you might be someday. Come back when the pain points emerge.

## Contributing

This guide is open-source and evolves based on real-world feedback. If you found a section unclear, a strategy that backfired, or a gap we missed—contribute.

We're especially interested in:
- Real examples of what went wrong (and right)
- Domain-specific variations (healthcare, finance, gaming, etc.)
- Trade-offs we missed
- Simpler ways to explain complex topics

## Start Here

Not sure where to begin? Ask yourself:

- **Do I have a clear problem statement?** → Start with "Spot the Job to Be Done"
- **Do I know what I'm building but not how?** → Jump to "Design"
- **Do I have code but it's a mess?** → Visit "Development" practices
- **Does it work but keeps breaking?** → Head to "Testing" or "Operations"
- **Am I repeating the same mistakes?** → Check "Iteration"

**Remember:** You don't need to read everything. Read what you need, when you need it. The rest will be here when you're ready.

---

*"People don't want a quarter-inch drill, they want a quarter-inch hole."* - Theodore Levitt

Now go find out what hole your users actually need.