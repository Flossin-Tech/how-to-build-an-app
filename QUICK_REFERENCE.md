# Directory Structure Quick Reference

A one-page guide to navigating and using this directory structure.

## Directory Cheat Sheet

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `/content/` | All educational content | `{phase}/{topic}/{depth}/index.md` |
| `/learning-paths/` | Curated learning journeys | `personas/*.json`, `tracks/*.json` |
| `/examples/` | Code examples | `shared/*`, `domain-specific/*` |
| `/assets/` | Media resources | `diagrams/*`, `images/*`, `videos/*` |
| `/metadata/` | Topic metadata | `topics/{topic}.json` |
| `/app-config/` | App configuration | `navigation/*`, `search-index/*` |

## Content Organization Pattern

```
content/{phase}/{topic}/{depth}/
```

**Phases** (7 total):
- `01-discovery-planning`
- `02-design`
- `03-development`
- `04-testing`
- `05-deployment`
- `06-operations`
- `07-iteration`

**Topics** (28 total): See full list in STRUCTURE_SUMMARY.md

**Depth Levels** (3 per topic):
- `surface/` - Essential info (5-10 min)
- `mid-depth/` - Practical guidance (15-30 min)
- `deep-water/` - Advanced topics (30-60+ min)

## Common Tasks

### Find Content on a Topic

1. **Identify phase**: Where does this topic fit in the lifecycle?
2. **Navigate**: `/content/{phase}/{topic-slug}/`
3. **Choose depth**: `surface/`, `mid-depth/`, or `deep-water/`
4. **Read**: `index.md` is the main content

Example: `/content/01-discovery-planning/threat-modeling/surface/index.md`

### Find a Learning Path

**By persona**:
- `/learning-paths/personas/new-developer.json`
- `/learning-paths/personas/yolo-dev.json`
- `/learning-paths/personas/specialist-expanding.json`
- `/learning-paths/personas/generalist-leveling-up.json`
- `/learning-paths/personas/busy-developer.json`

**By goal**:
- `/learning-paths/tracks/mvp-launch.json` - Ship MVP quickly
- `/learning-paths/tracks/security-hardening.json` - Improve security
- `/learning-paths/tracks/production-ready.json` - Production scale
- `/learning-paths/tracks/compliance-prep.json` - Audit preparation
- `/learning-paths/tracks/incident-recovery.json` - Recover from incident

**By context**:
- `/learning-paths/suggested-journeys/have-idea.json`
- `/learning-paths/suggested-journeys/code-works-breaks.json`
- `/learning-paths/suggested-journeys/security-warnings.json`
- `/learning-paths/suggested-journeys/switching-domains.json`

### Find Code Examples

**Generic patterns**:
- `/examples/shared/authentication/` - Auth patterns
- `/examples/shared/data-validation/` - Validation patterns
- `/examples/shared/error-handling/` - Error handling patterns
- `/examples/shared/api-design/` - API design patterns

**Domain-specific**:
- `/examples/domain-specific/web-apps/`
- `/examples/domain-specific/mobile-apps/`
- `/examples/domain-specific/ml-systems/`
- `/examples/domain-specific/healthcare/`
- `/examples/domain-specific/fintech/`
- And 5 more domains...

### Find Diagrams and Assets

**Diagrams**:
- `/assets/diagrams/architecture/` - System architecture diagrams
- `/assets/diagrams/data-flow/` - Sequence and data flow diagrams
- `/assets/diagrams/threat-models/` - Security threat diagrams
- `/assets/diagrams/deployment/` - Infrastructure diagrams
- `/assets/diagrams/workflows/` - Process flowcharts

**Images**:
- `/assets/images/screenshots/` - Tool screenshots
- `/assets/images/illustrations/` - Concept illustrations
- `/assets/images/icons/` - UI icons

**Videos**:
- `/assets/videos/screencasts/` - Tool demos (2-5 min)
- `/assets/videos/tutorials/` - Explanations (5-15 min)

### Find Topic Metadata

1. Identify topic slug (kebab-case): `threat-modeling`
2. Navigate: `/metadata/topics/{topic-slug}.json`
3. Find: Prerequisites, related topics, personas, tools, examples, etc.

Example: `/metadata/topics/threat-modeling.json` contains all metadata for threat modeling

### Check Topic Relationships

**Dependencies**:
- `/metadata/prerequisites/topic-dependencies.json` - What to read first
- `/metadata/prerequisites/skill-requirements.json` - Required skills

**Related content**:
- `/metadata/cross-references/related-topics.json` - Topic clusters
- `/metadata/cross-references/progression-paths.json` - When to go deeper

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Directories | lowercase kebab-case | `threat-modeling` |
| Phases | numbered, kebab-case | `01-discovery-planning` |
| Content | `index.md` + supporting | `index.md`, `checklist.md` |
| Metadata | `{topic-slug}.json` | `threat-modeling.json` |
| Diagrams | `diagram.{ext}` | `diagram.mmd`, `diagram.svg` |
| Examples | descriptive + language | `secure-version.py` |

## Content File Structure

Each depth level contains:

```
surface/
├── index.md              # Main content (required)
├── checklist.md          # Actionable checklist (optional)
├── examples.md           # Quick examples (optional)
└── resources.md          # Further reading (optional)
```

## Metadata Schema

Every topic has a JSON metadata file with:

```json
{
  "id": "unique-id",
  "title": "Display Title",
  "description": { "short": "...", "medium": "...", "full": "..." },
  "phase": "01-discovery-planning",
  "depth_levels": { "surface": {...}, "mid-depth": {...}, "deep-water": {...} },
  "personas": { "highly_relevant": [...], "relevant": [...] },
  "prerequisites": { "required": [...], "recommended": [...] },
  "related_topics": { "builds_on": [...], "enables": [...] },
  "tools": { "surface": [...], "mid-depth": [...], "deep-water": [...] },
  "examples": ["/examples/..."],
  "tags": [...],
  "content_files": {...}
}
```

## Learning Path Schema

Each learning path is a JSON file with:

```json
{
  "id": "path-id",
  "name": "Display Name",
  "description": "What this path accomplishes",
  "audience": ["persona-1", "persona-2"],
  "estimated_hours": 12,
  "difficulty": "beginner|intermediate|advanced",
  "steps": [
    {
      "order": 1,
      "phase": "01-discovery-planning",
      "topic": "job-to-be-done",
      "depth": "surface",
      "required": true,
      "estimated_minutes": 10,
      "why": "Reason for this step"
    }
  ],
  "milestones": [...],
  "related_paths": [...],
  "next_steps": [...]
}
```

## Quick Statistics

- **7 phases** in development lifecycle
- **28 topics** across all phases
- **3 depth levels** per topic
- **84 content modules** total
- **5 user personas**
- **5 goal-based tracks**
- **4 contextual journeys**
- **10 domain-specific example areas**

## Navigation URLs (Example)

Based on this structure, URLs would look like:

```
/                                          # Home
/phases                                    # All phases
/phases/discovery-planning                 # Phase overview
/phases/discovery-planning/threat-modeling # Topic overview (all depths)
/phases/discovery-planning/threat-modeling/surface    # Surface content
/phases/discovery-planning/threat-modeling/mid-depth  # Mid-depth content
/phases/discovery-planning/threat-modeling/deep-water # Deep-water content

/paths                                     # Learning paths home
/paths/personas/new-developer              # New developer path
/paths/tracks/mvp-launch                   # MVP launch track
/paths/journeys/have-idea                  # "I have an idea" journey

/examples                                  # Examples home
/examples/shared/authentication            # Shared auth examples
/examples/domain/healthcare                # Healthcare-specific examples

/search                                    # Search page
/search?q=security&phase=testing           # Search with filters

/progress                                  # User progress dashboard
/bookmarks                                 # User's bookmarked topics
```

## README Files Location

Every major directory has a README explaining its purpose:

- `/README.md` - Project overview
- `/content/README.md` - Content organization guide
- `/learning-paths/README.md` - Learning paths guide
- `/examples/README.md` - Examples guide
- `/assets/README.md` - Assets guide
- `/metadata/README.md` - Metadata guide
- `/app-config/README.md` - App config guide

## Search Tips

To find content in this structure:

**By lifecycle phase**:
```bash
ls content/01-discovery-planning/
```

**By depth level**:
```bash
find content -type d -name "surface"
```

**By file type**:
```bash
find . -name "*.json" -path "*/metadata/topics/*"
```

**All topics in a phase**:
```bash
ls -d content/01-discovery-planning/*/
```

**All example domains**:
```bash
ls examples/domain-specific/
```

## Common Patterns

### Adding New Topic

1. Create: `/content/{phase}/{topic-slug}/{surface,mid-depth,deep-water}/`
2. Write: `index.md` in each depth with frontmatter
3. Metadata: `/metadata/topics/{topic-slug}.json`
4. Examples: Link from metadata, create in `/examples/` if needed
5. Assets: Create diagrams in `/assets/diagrams/`, link from content
6. Paths: Add to relevant learning paths

### Adding New Example

1. Choose: `examples/shared/` or `examples/domain-specific/{domain}/`
2. Create: `{example-slug}/` directory
3. Code: Both secure and insecure versions with tests
4. Document: `README.md`, `explanation.md`, `trade-offs.md`
5. Metadata: `{example-slug}.meta.json`
6. Link: Update topic metadata to reference example

### Adding New Learning Path

1. Choose: `personas/`, `tracks/`, or `suggested-journeys/`
2. Create: `{path-slug}.json`
3. Define: Steps, milestones, objectives
4. Link: Related paths and next steps
5. Document: Clear why for each step

## Color Coding (Optional Visual System)

Suggested colors for UI implementation:

| Element | Color | Purpose |
|---------|-------|---------|
| Discovery & Planning | #FF6B6B | Red-ish |
| Design | #4ECDC4 | Teal |
| Development | #45B7D1 | Blue |
| Testing | #96CEB4 | Green |
| Deployment | #FFEAA7 | Yellow |
| Operations | #DFE6E9 | Gray |
| Iteration | #A29BFE | Purple |
| Surface | #E3F2FD | Light blue |
| Mid-Depth | #2196F3 | Medium blue |
| Deep Water | #0D47A1 | Dark blue |

## Getting Help

- **Structure questions**: Read `DIRECTORY_STRUCTURE.md`
- **Quick overview**: Read `STRUCTURE_SUMMARY.md`
- **Specific directory**: Read that directory's `README.md`
- **Content guidelines**: `/content/README.md`
- **Example format**: `/examples/README.md`
- **Metadata schema**: `/metadata/README.md`

## Key Principles Reminder

1. **Non-linear**: Jump to any topic, no forced sequence
2. **Progressive disclosure**: Choose your depth level
3. **Reusable**: Examples and assets shared across topics
4. **Self-contained**: Each depth level readable on its own
5. **Metadata-driven**: Structure enables app features

---

**This is your map**. Use it to navigate the structure efficiently.
