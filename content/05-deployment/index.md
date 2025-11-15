# Phase 5: Deployment

Getting your code running reliably in production.

Deployment is the moment of truth. Your code worked on your laptop. It passed tests in CI. Now it needs to work for real users, with real data, under real load—and keep working when things go wrong.

This isn't just about running a deploy script. It's about infrastructure that's reproducible, pipelines that catch problems before they reach users, deployment strategies that let you roll back when something breaks, and configurations that don't leak secrets or crash in different environments.

The difference between a good deployment and a disaster is usually planning. Can you deploy without downtime? Can you roll back in 30 seconds if something breaks? Do you know what changed between this version and the last one? Is your infrastructure defined in code, or is it a pile of manual changes no one remembers?

## Key Questions This Phase Answers

- How do we get code from a developer's machine to production reliably?
- What happens if a deployment breaks production, and how do we recover?
- How do we manage different configurations across dev, staging, and production?
- Who has access to production systems, and how do we control that?
- How do we deploy without downtime or impacting users?

## Topics

| Topic | Surface (5-10 min) | Mid-Depth (15-30 min) | Deep Water (30-60+ min) |
|-------|-------------------|---------------------|---------------------|
| Infrastructure as Code | Coming Soon | Coming Soon | Coming Soon |
| CI/CD Pipeline Security | Coming Soon | Coming Soon | Coming Soon |
| Deployment Strategy | Coming Soon | Coming Soon | Coming Soon |
| Access Control | Coming Soon | Coming Soon | Coming Soon |

## What Comes Next

Getting code into production is just the beginning. Now you need to keep it running, know when something breaks, and respond when things go wrong. That's **[Operations](../06-operations/index.md)**.
