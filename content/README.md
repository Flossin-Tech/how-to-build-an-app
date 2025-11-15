# Content Directory

This directory contains all the educational content organized by the 7 main software development lifecycle phases.

## Structure

Each phase directory follows this pattern:

```
content/
├── 01-discovery-planning/
│   ├── job-to-be-done/
│   │   ├── surface/
│   │   │   └── index.md          # Essential information everyone needs
│   │   ├── mid-depth/
│   │   │   └── index.md          # Practical guidance for practitioners
│   │   └── deep-water/
│   │       └── index.md          # Advanced topics for specialists
│   ├── threat-modeling/
│   └── [other topics]/
├── 02-design/
├── 03-development/
├── 04-testing/
├── 05-deployment/
├── 06-operations/
└── 07-iteration/
```

## Thermocline Depth Levels

Each topic is organized into three depth levels (the Thermocline Principle):

### Surface Layer (`surface/`)
- **Audience**: Everyone, especially new developers and YOLO devs
- **Content**:
  - What this step is and why it matters
  - Minimum viable version (what you MUST do today)
  - Red flags (what happens if you skip this)
  - Quick examples
- **Length**: 5-10 minute read
- **Tone**: Direct, practical, no assumptions

### Mid-Depth Layer (`mid-depth/`)
- **Audience**: Busy developers, specialists expanding out
- **Content**:
  - Common pitfalls and how to avoid them
  - Tool recommendations with reasoning
  - Team coordination aspects
  - Real-world trade-offs
- **Length**: 15-30 minute read
- **Tone**: Experienced peer sharing lessons learned

### Deep Water Layer (`deep-water/`)
- **Audience**: Generalists leveling up, specialists, enterprise teams
- **Content**:
  - Edge cases and complex scenarios
  - Compliance and regulatory considerations
  - Enterprise patterns
  - Integration with other disciplines
- **Length**: 30-60+ minute read
- **Tone**: Expert technical discussion

## File Naming Conventions

- `index.md` - Main content for the depth level
- `checklist.md` - Actionable checklist for this topic at this depth
- `examples.md` - Code examples and case studies specific to this depth
- `resources.md` - External references, tools, and further reading

## Metadata

Each `index.md` file should include YAML frontmatter:

```yaml
---
title: "Threat Modeling"
phase: "01-discovery-planning"
topic: "threat-modeling"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics:
  - "security-testing"
  - "secure-coding-practices"
personas:
  - "new-developer"
  - "yolo-dev"
updated: "2025-11-15"
---
```

## Content Guidelines

1. **Self-Contained**: Each depth level should be readable on its own
2. **Progressive Enhancement**: Surface → Mid-Depth → Deep Water builds knowledge
3. **Cross-Linking**: Reference related topics but don't assume they've been read
4. **Practical Examples**: Use real-world scenarios, not toy examples
5. **No Dogma**: Present trade-offs, not "the one true way"
6. **Jobs-to-be-Done**: Focus on what the developer needs to accomplish

## Integration with Interactive App

The interactive app will:
- Read metadata to build navigation and suggested paths
- Display content progressively based on user's chosen depth
- Track which sections users have read
- Suggest next topics based on prerequisites and related content
- Allow jumping to any section without enforced linear progression

## Adding New Topics

1. Create directory: `content/[phase]/[topic-slug]/`
2. Create depth subdirectories: `surface/`, `mid-depth/`, `deep-water/`
3. Add `index.md` to each depth level with proper frontmatter
4. Update `metadata/topics/[topic-slug].json` with topic metadata
5. Add cross-references to related topics
6. Create examples in `examples/` if reusable across topics
7. Add to appropriate learning paths in `learning-paths/`

## Domain-Specific Variations

Some topics may need domain-specific content (e.g., "Threat Modeling for Healthcare Apps" vs. "Threat Modeling for Games"). These variations can be:

1. **Separate files**: `surface/healthcare.md`, `surface/gaming.md`
2. **Sections within index.md**: Use headings to differentiate
3. **Examples**: Link to domain-specific examples from `examples/domain-specific/`

Document the approach in the topic's metadata.
