# Directory Structure Summary

## Quick Overview

This directory structure supports an interactive, choose-your-own-adventure style learning application for software development. It organizes content by:

- **7 Development Phases**: Discovery & Planning → Design → Development → Testing → Deployment → Operations → Iteration
- **3 Depth Levels**: Surface (5-10 min) → Mid-Depth (15-30 min) → Deep Water (30-60+ min)
- **5 User Personas**: New Developer, YOLO Dev, Specialist Expanding, Generalist Leveling Up, Busy Developer
- **Multiple Learning Paths**: Persona-based, goal-based, and context-based journeys

## High-Level Structure

```
how-to-build-an-app/
│
├── content/              # Educational content (28 topics × 3 depths = 84 distinct content pieces)
├── learning-paths/       # Curated journeys (5 personas + 5 tracks + 4 contextual journeys)
├── examples/            # Code examples (shared patterns + 10 domain-specific areas)
├── assets/              # Diagrams, images, videos
├── metadata/            # Topic metadata, prerequisites, cross-references
└── app-config/          # Navigation, search, progress tracking configuration
```

## Key Directories Explained

### 📚 Content (`/content`)

**Purpose**: All educational content organized by lifecycle phase and topic.

**Structure**:
- 7 phase directories (numbered for ordering: `01-discovery-planning`, `02-design`, etc.)
- Each phase contains multiple topic directories (e.g., `threat-modeling`, `architecture-design`)
- Each topic has 3 depth subdirectories: `surface/`, `mid-depth/`, `deep-water/`
- Each depth contains `index.md` (main content), plus optional checklists, examples, resources

**Example path**: `/content/01-discovery-planning/threat-modeling/surface/index.md`

**Topics by Phase**:
- **Discovery & Planning** (6 topics): Job to Be Done, Concept of Operations, Threat Modeling, Requirements Gathering, Resource Identification, Scope Setting
- **Design** (4 topics): Architecture Design, Data Flow Mapping, Software Design Document, Dependency Review
- **Development** (4 topics): Secure Coding Practices, Code Review Process, Secret Management, Supply Chain Security
- **Testing** (4 topics): Unit/Integration Testing, Security Testing, Accessibility Testing, Compliance Validation
- **Deployment** (4 topics): Infrastructure as Code, CI/CD Pipeline Security, Deployment Strategy, Access Control
- **Operations** (4 topics): Monitoring & Logging, Incident Response, Patch Management, Backup & Recovery
- **Iteration** (3 topics): Retrospectives, Security Posture Reviews, Feature Planning

**Total**: 28 topics × 3 depths = 84 content modules

### 🛤️ Learning Paths (`/learning-paths`)

**Purpose**: Curated sequences guiding users through content based on their goals or context.

**Structure**:
- `personas/`: Paths for specific user types (5 personas)
  - `new-developer.json`: Complete lifecycle overview at surface level
  - `yolo-dev.json`: Tactical surface dips into critical gaps
  - `specialist-expanding.json`: Domain-specific mid-depth focus
  - `generalist-leveling-up.json`: Systematic mid-depth coverage
  - `busy-developer.json`: Just-in-time learning for immediate problems

- `tracks/`: Goal-oriented sequences (5 tracks)
  - `mvp-launch.json`: Ship MVP quickly (2-4 weeks, surface level)
  - `security-hardening.json`: Improve security posture (ongoing, mid-depth)
  - `production-ready.json`: Prepare for production scale (4-8 weeks, mid-depth)
  - `compliance-prep.json`: Prepare for audit (8-16 weeks, deep-water)
  - `incident-recovery.json`: Recover from and prevent incidents (immediate + ongoing)

- `suggested-journeys/`: Context-based entry points (4 journeys)
  - `have-idea.json`: "I have an idea but don't know where to start"
  - `code-works-breaks.json`: "Code works but keeps breaking in production"
  - `security-warnings.json`: "I'm getting security warnings"
  - `switching-domains.json`: "I'm a [X] developer learning [Y]"

### 💻 Examples (`/examples`)

**Purpose**: Practical code examples and case studies illustrating concepts.

**Structure**:
- `shared/`: Cross-domain patterns applicable anywhere
  - `authentication/`: Password auth, OAuth2, JWT, MFA
  - `data-validation/`: Input sanitization, schema validation, API validation
  - `error-handling/`: Graceful degradation, retry strategies, circuit breakers
  - `api-design/`: REST best practices, GraphQL patterns, versioning

- `domain-specific/`: Application-type specific examples (10 domains)
  - `web-apps/`: SPA security, session management, CSRF protection
  - `mobile-apps/`: Secure storage, certificate pinning, biometric auth
  - `ml-systems/`: Data versioning, model deployment, drift detection
  - `api-services/`: Rate limiting, authentication, documentation
  - `data-pipelines/`: Data validation, monitoring, disaster recovery
  - `gaming/`: Anti-cheat, real-time sync, matchmaking
  - `iot/`: Device security, firmware updates, communication protocols
  - `healthcare/`: PHI protection, HIPAA compliance, audit logging
  - `fintech/`: Payment processing, fraud detection, PCI compliance
  - `saas/`: Multi-tenancy, billing integration, tenant isolation

**Format**: Each example includes:
- Working code (secure and insecure versions)
- Tests demonstrating functionality
- Explanation of trade-offs
- Links to related topics

### 🎨 Assets (`/assets`)

**Purpose**: Visual resources enhancing learning.

**Structure**:
- `diagrams/`: Technical diagrams (Mermaid source + SVG/PNG/PDF exports)
  - `architecture/`: System architecture patterns (microservices, monolith, serverless)
  - `data-flow/`: Sequence diagrams and data flow maps
  - `threat-models/`: Attack trees and threat diagrams
  - `deployment/`: Infrastructure topology and deployment strategies
  - `workflows/`: Process flowcharts (CI/CD, code review, incident response)

- `images/`: Static images
  - `screenshots/`: Tool interfaces and examples
  - `illustrations/`: Concept illustrations (thermocline, security layers)
  - `icons/`: UI icons (phases, depth levels, personas)

- `videos/`: Video content
  - `screencasts/`: Tool demos (2-5 minutes)
  - `tutorials/`: Concept explanations (5-15 minutes)

**Key feature**: All diagrams include source files (`.mmd`, `.drawio`) for version control and editing.

### 📊 Metadata (`/metadata`)

**Purpose**: Structured data powering app features (navigation, search, recommendations).

**Structure**:
- `topics/`: Individual topic metadata JSON files
  - Properties: title, description, reading time, difficulty, objectives
  - Relationships: prerequisites, related topics, enables/builds-on
  - Audience: persona relevance, common questions, red flags
  - Practical: tools, examples, compliance relevance, effort estimates

- `prerequisites/`: Dependency tracking
  - `topic-dependencies.json`: Topic relationship graph
  - `skill-requirements.json`: Required skills per topic
  - `recommended-sequences.json`: Suggested learning sequences

- `cross-references/`: Topic relationships
  - `related-topics.json`: Topic clusters and common pairs
  - `progression-paths.json`: When to suggest deeper depth
  - `conflict-warnings.json`: Mutually exclusive approaches

**Example**: `metadata/topics/threat-modeling.json` contains all metadata for threat modeling topic.

### ⚙️ App Config (`/app-config`)

**Purpose**: Configuration for interactive application features.

**Structure**:
- `navigation/`: Navigation structure
  - `menu-structure.json`: Primary/secondary navigation menus
  - `breadcrumbs.json`: Breadcrumb trail generation rules
  - `quick-links.json`: Contextual links based on current page
  - `phase-navigation.json`: Phase-specific navigation

- `search-index/`: Search engine configuration
  - `search-config.json`: Search parameters and collection schemas
  - `synonyms.json`: Search term synonyms (e.g., "auth" = "authentication")
  - `boost-rules.json`: Result ranking rules (boost user's persona, current phase)
  - `facets.json`: Search filters (phase, depth, difficulty, reading time)

- `user-progress/`: Progress tracking schemas
  - `progress-schema.json`: User progress data structure
  - `achievements.json`: Achievement definitions (8 categories)
  - `milestones.json`: Learning milestones (5 major milestones)
  - `analytics-events.json`: Analytics event tracking

## Design Principles

### 1. Content-First Architecture
- **Content is king**: Educational content in simple Markdown files
- **Metadata enables features**: Structure and relationships in JSON
- **App is a view**: Interactive app reads content, doesn't generate it

### 2. Non-Linear by Design
- **No enforced sequence**: Users can jump to any topic
- **Multiple pathways**: Learning paths suggest sequences but don't require them
- **Context-aware**: App suggests relevant next steps based on current location

### 3. Progressive Disclosure (Thermocline Principle)
- **Surface layer**: Essential info everyone needs (5-10 min)
- **Mid-depth**: Practical guidance for practitioners (15-30 min)
- **Deep water**: Advanced topics for specialists (30-60+ min)
- **Users choose depth**: No forced reading of irrelevant detail

### 4. Reusability and DRY
- **Examples referenced, not duplicated**: One OAuth2 example linked from multiple topics
- **Diagrams shared**: Architecture diagrams used in design, deployment, and operations
- **Metadata drives structure**: Topic relationships defined once, used everywhere

### 5. Contribution-Friendly
- **Clear conventions**: Naming patterns, directory structure documented
- **Self-documenting**: README files in every major directory
- **Template-based**: New topics/examples follow established patterns
- **Version-controllable**: Text-based formats (Markdown, JSON, Mermaid)

### 6. Framework-Agnostic
- **Portable content**: Markdown + JSON works with any framework
- **No build-time coupling**: Content doesn't depend on specific SSG or CMS
- **Multiple delivery**: Same content for web, mobile, desktop, or CLI

## Data Flow

```
┌──────────────┐
│   Authors    │
│   write      │
│   content    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Content     │◄── Markdown files + YAML frontmatter
│  (.md)       │
└──────┬───────┘
       │
       ├──────────────────┐
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│  Metadata    │   │   Assets     │
│  (.json)     │   │ (diagrams,   │
│              │   │  images)     │
└──────┬───────┘   └──────┬───────┘
       │                  │
       └─────────┬────────┘
                 ▼
       ┌──────────────────┐
       │  Build Process   │◄── Validates, indexes, generates search data
       │  (CI/CD)         │
       └─────────┬────────┘
                 │
                 ▼
       ┌──────────────────┐
       │  Interactive     │◄── Serves content, tracks progress
       │  App             │
       │  (Web/Mobile)    │
       └─────────┬────────┘
                 │
                 ▼
       ┌──────────────────┐
       │  User Progress   │◄── Stored separately, references content by ID
       │  Database        │
       └──────────────────┘
```

## File Naming Conventions

### Directories
- **Lowercase kebab-case**: `threat-modeling`, not `Threat_Modeling`
- **Descriptive**: Full names, not abbreviations (except industry-standard like `cicd`)
- **Numbered phases**: `01-discovery-planning`, `02-design`, etc. (enforces order)

### Files
- **Content**: `index.md` (main content), `checklist.md`, `examples.md`, `resources.md`
- **Metadata**: `{topic-slug}.json` (matches directory name)
- **Diagrams**: Same base name across formats (`diagram.mmd`, `diagram.svg`, `diagram.png`)
- **Examples**: Descriptive with language (`secure-version.py`, `oauth-flow.js`)

## Statistics

### Content Scale
- **7 phases** in development lifecycle
- **28 topics** across all phases
- **3 depth levels** per topic
- **84 total content modules** (28 topics × 3 depths)
- **5 user personas**
- **14 learning paths** (5 personas + 5 tracks + 4 journeys)

### Example Coverage
- **4 shared example categories** (authentication, validation, error handling, API design)
- **10 domain-specific areas** (web, mobile, ML, API, data, gaming, IoT, healthcare, fintech, SaaS)
- **50+ code examples** planned (conservative estimate)

### Asset Types
- **5 diagram categories** (architecture, data flow, threats, deployment, workflows)
- **3 image types** (screenshots, illustrations, icons)
- **2 video types** (screencasts, tutorials)
- **Multiple formats per asset** (source + exports for diagrams)

## Interactive App Features Enabled

### Navigation
- **Phase-based browsing**: Navigate by development lifecycle phase
- **Topic search**: Full-text search with facets (phase, depth, difficulty, reading time)
- **Breadcrumbs**: Always know where you are in the structure
- **Quick links**: Contextual suggestions based on current page
- **Related topics**: Links to complementary content

### Learning Paths
- **Persona quiz**: Recommend starting path based on user type
- **Goal selection**: Choose track based on objective (MVP, security, compliance)
- **Context prompt**: "What brings you here?" suggests journey
- **Path visualization**: See progress through chosen path
- **Path switching**: Easy transition between paths as goals change

### Progress Tracking
- **Completion tracking**: Mark topics read, track percentage complete
- **Time estimates**: Show time remaining in path
- **Streaks**: Daily learning streak counter
- **Achievements**: Unlock achievements for milestones (8 categories, multiple achievements)
- **Statistics**: Topics completed, time spent, favorite phase

### Personalization
- **Depth preference**: Remember user's preferred depth level
- **Bookmarks**: Save topics for later
- **Notes**: Add personal notes to topics
- **Rating**: Rate topics to help others
- **Search boost**: Prioritize results matching user's persona and current phase

### Recommendations
- **Next steps**: Suggest related topics after completion
- **Dive deeper**: Prompt to explore next depth level
- **Related examples**: Show relevant code examples
- **Path suggestions**: Recommend learning paths based on activity

## Scalability

### Easy to Add
- ✅ **New topic**: Create directory with depth subdirectories, add metadata
- ✅ **New example**: Add to shared or domain-specific, link from metadata
- ✅ **New diagram**: Create source file, export formats, document in README
- ✅ **New learning path**: JSON file defining sequence
- ✅ **New persona**: Add persona path, update metadata relevance
- ✅ **New domain**: Add subdirectory to `examples/domain-specific/`

### Harder to Add (Requires Planning)
- ⚠️ **New phase**: Would require updating all navigation, paths (but structure supports it)
- ⚠️ **New depth level**: Need to decide placement and update all paths
- ⚠️ **Localization**: Need translation workflow and content duplication strategy

### Doesn't Require Changes
- ✅ Adding more topics to existing phases
- ✅ Expanding examples within existing domains
- ✅ Creating new learning paths
- ✅ Updating metadata (prerequisites, relationships)
- ✅ Improving search configuration
- ✅ Adding achievements and milestones

## Technology Stack (Framework-Agnostic)

This structure works with:

### Static Site Generators
- Next.js (React)
- Gatsby (React)
- Hugo (Go)
- Jekyll (Ruby)
- Astro (any framework)
- Eleventy (JavaScript)

### Content Management
- Git-based (content as code)
- Headless CMS (reading from this structure)
- Custom API (serving content from files)

### Search
- Typesense (configured in app-config)
- Algolia
- Elasticsearch
- Client-side search (Lunr.js, FlexSearch)

### Deployment
- Vercel, Netlify (static sites)
- Custom hosting (any platform)
- GitHub Pages (if static)
- Cloud platforms (AWS, GCP, Azure)

## Getting Started

### For Content Authors
1. Read `/content/README.md` for content guidelines
2. Choose a topic to write
3. Create directory structure: `content/{phase}/{topic}/{depth}/index.md`
4. Write content with proper frontmatter
5. Create metadata: `metadata/topics/{topic}.json`
6. Link examples and assets as needed

### For Learning Path Creators
1. Read `/learning-paths/README.md` for path structure
2. Identify goal/persona for the path
3. Create JSON file with sequence of topics
4. Specify depth level for each step
5. Add checkpoints and milestones
6. Test path flow makes sense

### For Example Contributors
1. Read `/examples/README.md` for example format
2. Choose shared or domain-specific location
3. Write code (secure + insecure versions)
4. Add tests and explanations
5. Create metadata file
6. Link from relevant topic metadata

### For App Developers
1. Read `/app-config/README.md` for configuration
2. Load content from `/content` directory
3. Read metadata from `/metadata` for navigation
4. Implement search using `/app-config/search-index`
5. Track progress using `/app-config/user-progress` schema
6. Load learning paths from `/learning-paths`

## Summary

This directory structure creates a **comprehensive, flexible, and scalable foundation** for an interactive learning application. It:

✅ **Organizes 84 content modules** across 7 phases and 3 depth levels
✅ **Supports 14+ learning paths** for different personas and goals
✅ **Enables non-linear navigation** while providing suggested journeys
✅ **Centralizes reusable examples and assets**
✅ **Separates content from app logic** for maintainability
✅ **Scales easily** as content grows
✅ **Remains framework-agnostic** for implementation flexibility
✅ **Facilitates community contributions** with clear conventions

The structure serves three audiences:
1. **Learners**: Clear navigation, multiple entry points, choose-your-own-adventure
2. **Authors**: Well-organized, template-based, easy to contribute
3. **Developers**: Clean APIs (file structure + metadata), framework-agnostic

**Next**: Build prototype app reading from this structure, write first topics to validate, iterate based on feedback.
