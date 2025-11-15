# Phase 2: Design

Planning the architecture and identifying risks before implementation.

You know what you're building and why. Now you need to figure out how. Design is where you make the structural decisions that will either enable or haunt you for the life of the project. How will data flow through your system? What happens when things fail? How will different parts of your application communicate?

Good design doesn't mean planning every detail upfront—it means making the right structural decisions early so you have flexibility later. You're drawing the boundaries, identifying the major components, and thinking through failure modes before you're neck-deep in implementation details.

This is also where you identify dependencies that could break your project. That free API you're planning to use? What happens if it goes down, changes its pricing, or gets acquired? The database schema you're designing? Can it evolve as requirements change, or will you be stuck with it forever?

## Key Questions This Phase Answers

- How should the major components of this system fit together?
- Where does data come from, where does it go, and how does it transform along the way?
- What happens when things fail, and how do we recover gracefully?
- Which third-party dependencies are we betting on, and what's our backup plan?
- How will this system scale, and where are the bottlenecks?

## Topics

| Topic | Surface (5-10 min) | Mid-Depth (15-30 min) | Deep Water (30-60+ min) |
|-------|-------------------|---------------------|---------------------|
| Architecture Design | [Read →](./architecture-design/surface/index.md) | [Read →](./architecture-design/mid-depth/index.md) | [Read →](./architecture-design/deep-water/index.md) |
| Data Flow Mapping | [Read →](./data-flow-mapping/surface/index.md) | [Read →](./data-flow-mapping/mid-depth/index.md) | [Read →](./data-flow-mapping/deep-water/index.md) |
| Software Design Document | [Read →](./software-design-document/surface/index.md) | [Read →](./software-design-document/mid-depth/index.md) | [Read →](./software-design-document/deep-water/index.md) |
| Dependency Review | [Read →](./dependency-review/surface/index.md) | [Read →](./dependency-review/mid-depth/index.md) | [Read →](./dependency-review/deep-water/index.md) |
| API Design | [Read →](./api-design/surface/index.md) | [Read →](./api-design/mid-depth/index.md) | [Read →](./api-design/deep-water/index.md) |
| Database Design | [Read →](./database-design/surface/index.md) | [Read →](./database-design/mid-depth/index.md) | [Read →](./database-design/deep-water/index.md) |
| State Management Design | [Read →](./state-management-design/surface/index.md) | [Read →](./state-management-design/mid-depth/index.md) | [Read →](./state-management-design/deep-water/index.md) |
| Error Handling & Resilience | [Read →](./error-handling-resilience/surface/index.md) | [Read →](./error-handling-resilience/mid-depth/index.md) | [Read →](./error-handling-resilience/deep-water/index.md) |
| Performance & Scalability Design | [Read →](./performance-scalability-design/surface/index.md) | [Read →](./performance-scalability-design/mid-depth/index.md) | [Read →](./performance-scalability-design/deep-water/index.md) |

## What Comes Next

With a solid architectural plan and an understanding of your data flows, dependencies, and failure modes, you're ready to move into **[Development](../03-development/index.md)**—where you'll write code that implements this design while keeping it maintainable and secure.
