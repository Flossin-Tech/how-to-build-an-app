# Metadata Directory

This directory contains structured metadata that powers the interactive learning application's navigation, search, recommendations, and progress tracking.

## Purpose

Metadata separates content from structure, enabling:

1. **Dynamic navigation** based on user context
2. **Smart recommendations** for next steps
3. **Dependency tracking** (prerequisites and relationships)
4. **Search and filtering** capabilities
5. **Progress tracking** and completion analytics

## Directory Structure

```
metadata/
├── topics/                    # Individual topic metadata
│   ├── job-to-be-done.json
│   ├── threat-modeling.json
│   ├── architecture-design.json
│   └── [all-topics].json
├── prerequisites/             # Dependency graphs
│   ├── topic-dependencies.json
│   ├── skill-requirements.json
│   └── recommended-sequences.json
└── cross-references/          # Topic relationships
    ├── related-topics.json
    ├── progression-paths.json
    └── conflict-warnings.json
```

## Topic Metadata

Each topic has a JSON file describing its properties, relationships, and context.

### Format: `topics/{topic-slug}.json`

```json
{
  "id": "threat-modeling",
  "slug": "threat-modeling",
  "title": "Threat Modeling",
  "phase": "01-discovery-planning",
  "phase_name": "Discovery & Planning",
  "order_in_phase": 3,

  "description": {
    "short": "Identify and prioritize security threats before building",
    "medium": "A structured approach to identifying, quantifying, and addressing security threats during the planning phase",
    "full": "Threat modeling is a structured process for identifying potential security threats, understanding their likelihood and impact, and planning mitigations before writing code. It's cheaper to fix security issues in design than in production."
  },

  "why_it_matters": [
    "Catches security issues before they're built into the system",
    "Cheaper to fix vulnerabilities in design than production",
    "Helps prioritize security work based on actual risk",
    "Creates shared security understanding across team"
  ],

  "depth_levels": {
    "surface": {
      "reading_time_minutes": 8,
      "difficulty": "beginner",
      "objectives": [
        "Understand what threat modeling is",
        "Identify 3 critical threats to your system",
        "Know when you absolutely must do this"
      ],
      "key_takeaways": [
        "List 3 things an attacker could do to your system",
        "For each threat, identify one mitigation",
        "Don't need formal frameworks for MVP"
      ]
    },
    "mid-depth": {
      "reading_time_minutes": 25,
      "difficulty": "intermediate",
      "objectives": [
        "Use STRIDE framework for systematic analysis",
        "Prioritize threats using risk scoring",
        "Integrate threat modeling into design process"
      ],
      "key_takeaways": [
        "STRIDE covers 6 threat categories systematically",
        "Risk = Likelihood × Impact helps prioritization",
        "Threat modeling is collaborative, not solo work"
      ]
    },
    "deep-water": {
      "reading_time_minutes": 45,
      "difficulty": "advanced",
      "objectives": [
        "Apply DREAD scoring for quantitative risk assessment",
        "Document threat models for compliance",
        "Integrate with enterprise security programs"
      ],
      "key_takeaways": [
        "Quantitative scoring enables business risk decisions",
        "Compliance frameworks require documented threat models",
        "Threat models evolve as systems change"
      ]
    }
  },

  "personas": {
    "highly_relevant": ["new-developer", "yolo-dev"],
    "relevant": ["specialist-expanding", "generalist-leveling-up"],
    "optional": ["busy-developer"]
  },

  "prerequisites": {
    "required": [],
    "recommended": ["job-to-be-done", "concept-of-operations"],
    "helpful": ["architecture-design"]
  },

  "related_topics": {
    "builds_on": ["concept-of-operations"],
    "enables": ["security-testing", "secure-coding-practices"],
    "complements": ["architecture-design", "data-flow-mapping"],
    "alternatives": []
  },

  "common_questions": [
    "Do I need threat modeling for a simple CRUD app?",
    "When in the project should I do threat modeling?",
    "Who should be involved in threat modeling?",
    "How often should I update the threat model?"
  ],

  "red_flags": [
    "Skipping threat modeling for apps handling sensitive data",
    "Doing threat modeling after code is written",
    "Threat modeling as solo activity instead of team exercise",
    "Never revisiting threat model as system evolves"
  ],

  "tools": {
    "surface": ["Whiteboard", "Spreadsheet", "Markdown doc"],
    "mid-depth": ["Microsoft Threat Modeling Tool", "OWASP Threat Dragon", "IriusRisk"],
    "deep-water": ["IriusRisk", "ThreatModeler", "SD Elements"]
  },

  "examples": [
    "/examples/shared/threat-modeling/simple-web-app/",
    "/examples/domain-specific/healthcare/threat-modeling/",
    "/examples/domain-specific/ml-systems/threat-modeling/"
  ],

  "domain_variations": {
    "web-apps": "Focus on OWASP Top 10 threats",
    "mobile-apps": "Consider platform security models (iOS/Android)",
    "ml-systems": "Include model poisoning and adversarial inputs",
    "iot": "Physical access and hardware tampering threats",
    "healthcare": "HIPAA-specific threats to PHI",
    "fintech": "Financial fraud and transaction integrity"
  },

  "compliance_relevance": {
    "SOC2": "Required for Type II certification",
    "HIPAA": "Required as part of security risk assessment",
    "PCI-DSS": "Required for cardholder data systems",
    "ISO27001": "Part of information security risk management",
    "GDPR": "Supports privacy by design requirements"
  },

  "estimated_effort": {
    "first_time": {
      "surface": "1-2 hours",
      "mid-depth": "4-8 hours",
      "deep-water": "2-5 days"
    },
    "ongoing": {
      "surface": "30 minutes per sprint",
      "mid-depth": "2 hours per major feature",
      "deep-water": "Quarterly review, 1-2 days"
    }
  },

  "success_metrics": [
    "Threats identified before implementation",
    "Security vulnerabilities caught in design review",
    "Team can articulate top 3 system threats",
    "Mitigations in place for critical threats"
  ],

  "tags": [
    "security",
    "planning",
    "risk-management",
    "collaborative",
    "devsecops"
  ],

  "content_files": {
    "surface": "/content/01-discovery-planning/threat-modeling/surface/index.md",
    "mid-depth": "/content/01-discovery-planning/threat-modeling/mid-depth/index.md",
    "deep-water": "/content/01-discovery-planning/threat-modeling/deep-water/index.md"
  },

  "last_updated": "2025-11-15",
  "version": "1.0.0"
}
```

## Topic Metadata Fields

### Core Identification
- **id**: Unique identifier
- **slug**: URL-friendly identifier
- **title**: Display name
- **phase**: Which development lifecycle phase
- **order_in_phase**: Suggested sequence within phase

### Descriptions
- **short**: One-sentence summary (for cards, lists)
- **medium**: Two-sentence explanation (for tooltips, previews)
- **full**: Full paragraph (for topic landing pages)

### Depth Levels
For each depth level (surface, mid-depth, deep-water):
- **reading_time_minutes**: Estimated time to read
- **difficulty**: beginner/intermediate/advanced
- **objectives**: What you'll learn
- **key_takeaways**: Main points to remember

### Audience
- **personas**: Which personas find this relevant
  - **highly_relevant**: Core to their journey
  - **relevant**: Should probably read
  - **optional**: Nice to have

### Relationships
- **prerequisites**: What to read first
  - **required**: Must understand before this topic
  - **recommended**: Helpful context
  - **helpful**: Nice additional background
- **related_topics**: Connections to other topics
  - **builds_on**: This extends those topics
  - **enables**: Reading this unlocks these topics
  - **complements**: Read together for fuller picture
  - **alternatives**: Different approaches to same goal

### Practical Information
- **common_questions**: FAQ that helps with navigation
- **red_flags**: Warning signs this is needed NOW
- **tools**: Recommended tools per depth level
- **examples**: Links to code examples
- **domain_variations**: How this differs by application type
- **compliance_relevance**: Required for which compliance frameworks
- **estimated_effort**: Time investment expectations
- **success_metrics**: How to know you did this well

### Technical
- **tags**: Keywords for search and filtering
- **content_files**: Paths to actual content
- **last_updated**: Freshness indicator
- **version**: For tracking breaking changes

## Prerequisites Metadata

### Format: `prerequisites/topic-dependencies.json`

```json
{
  "dependency_graph": {
    "threat-modeling": {
      "hard_dependencies": [],
      "soft_dependencies": ["job-to-be-done", "concept-of-operations"],
      "unlocks": ["security-testing", "secure-coding-practices"],
      "reasoning": {
        "why_no_hard_deps": "Can be done standalone, though context helps",
        "why_soft_deps": "Understanding the system's purpose helps identify threats",
        "why_unlocks": "Identified threats guide security testing and coding practices"
      }
    },
    "cicd-pipeline-security": {
      "hard_dependencies": ["deployment-strategy"],
      "soft_dependencies": ["secure-coding-practices", "secret-management"],
      "unlocks": [],
      "reasoning": {
        "why_hard_deps": "Need to understand deployment before securing the pipeline",
        "why_soft_deps": "Security concepts apply to pipeline configuration",
        "why_unlocks": "Terminal topic in this area"
      }
    }
  },

  "learning_sequences": {
    "security-focused": [
      "threat-modeling",
      "secure-coding-practices",
      "secret-management",
      "security-testing",
      "access-control",
      "cicd-pipeline-security",
      "incident-response"
    ],
    "architecture-focused": [
      "architecture-design",
      "data-flow-mapping",
      "dependency-review",
      "software-design-document",
      "infrastructure-as-code",
      "deployment-strategy"
    ]
  },

  "circular_dependencies": [],
  "orphaned_topics": []
}
```

### Format: `prerequisites/skill-requirements.json`

```json
{
  "topics": {
    "threat-modeling": {
      "required_skills": [],
      "assumed_knowledge": [
        "Basic understanding of web requests",
        "Awareness that security matters"
      ],
      "teaches": [
        "STRIDE framework",
        "Risk assessment",
        "Threat categorization"
      ]
    },
    "kubernetes-deployment": {
      "required_skills": [
        "Command line proficiency",
        "Understanding of containers",
        "YAML familiarity"
      ],
      "assumed_knowledge": [
        "Basic networking concepts",
        "Linux file system"
      ],
      "teaches": [
        "K8s architecture",
        "Pod management",
        "Service configuration"
      ]
    }
  }
}
```

## Cross-References Metadata

### Format: `cross-references/related-topics.json`

```json
{
  "topic_clusters": {
    "security": {
      "topics": [
        "threat-modeling",
        "secure-coding-practices",
        "security-testing",
        "secret-management",
        "supply-chain-security",
        "access-control",
        "cicd-pipeline-security"
      ],
      "description": "Comprehensive security coverage across lifecycle",
      "suggested_path": "Start with threat-modeling, then branch based on phase"
    },
    "testing": {
      "topics": [
        "unit-integration-testing",
        "security-testing",
        "accessibility-testing",
        "compliance-validation"
      ],
      "description": "Quality assurance and validation",
      "suggested_path": "Unit testing first, then specialized testing types"
    }
  },

  "common_pairs": [
    {
      "topics": ["architecture-design", "data-flow-mapping"],
      "relationship": "Usually done together in design phase",
      "order": "Architecture first, then map data flows within that architecture"
    },
    {
      "topics": ["monitoring-logging", "incident-response"],
      "relationship": "Monitoring enables effective incident response",
      "order": "Set up monitoring before you need incident response"
    }
  ],

  "contradictions": [
    {
      "topics": ["deployment-strategy/blue-green", "deployment-strategy/rolling"],
      "issue": "Mutually exclusive deployment approaches",
      "guidance": "Choose one based on your requirements, documented in deployment-strategy"
    }
  ]
}
```

### Format: `cross-references/progression-paths.json`

```json
{
  "surface_to_mid-depth": {
    "threat-modeling": {
      "trigger_conditions": [
        "User completed surface level",
        "User marked 'want to learn more'",
        "App has >1000 users",
        "Handling sensitive data"
      ],
      "prompt": "Ready to learn systematic threat modeling with STRIDE?",
      "value_proposition": "Cover threats more comprehensively, prioritize with risk scoring",
      "estimated_time": "25 minutes"
    }
  },

  "mid-depth_to_deep-water": {
    "threat-modeling": {
      "trigger_conditions": [
        "User completed mid-depth",
        "Compliance requirement detected",
        "Enterprise environment",
        "User searched for DREAD or compliance"
      ],
      "prompt": "Need compliance documentation or quantitative risk assessment?",
      "value_proposition": "Meet audit requirements, enable business risk decisions",
      "estimated_time": "45 minutes"
    }
  }
}
```

## Usage in Interactive App

### Navigation
```javascript
// Load topic metadata
const topic = loadTopicMetadata('threat-modeling');

// Show prerequisites
if (topic.prerequisites.required.length > 0) {
  showWarning(`Recommended to read ${topic.prerequisites.required.join(', ')} first`);
}

// Suggest related topics
const related = topic.related_topics.complements;
showSidebar(`Also consider reading: ${related.join(', ')}`);
```

### Recommendations
```javascript
// User just completed threat-modeling surface layer
const completedTopic = 'threat-modeling';
const currentDepth = 'surface';

// What's next?
const nextOptions = [
  ...metadata.topics[completedTopic].related_topics.enables,
  ...getRecommendedProgression(completedTopic, currentDepth, userContext)
];

showRecommendations(nextOptions);
```

### Search
```javascript
// User searches "security for healthcare app"
const results = searchTopics({
  tags: ['security'],
  domain: 'healthcare',
  persona: userPersona
});

// Rank by relevance to persona and domain
return rankResults(results, {
  persona: userPersona,
  domain: 'healthcare'
});
```

### Progress Tracking
```javascript
// Calculate completion percentage
const phaseTopics = getTopicsByPhase('01-discovery-planning');
const completed = phaseTopics.filter(t => userProgress.completed.includes(t.id));
const percentComplete = (completed.length / phaseTopics.length) * 100;

// Estimate time remaining
const remaining = phaseTopics.filter(t => !userProgress.completed.includes(t.id));
const estimatedMinutes = remaining.reduce((sum, t) =>
  sum + t.depth_levels[userPreferredDepth].reading_time_minutes, 0
);
```

## Metadata Maintenance

### Adding New Topic
1. Create `topics/{topic-slug}.json` with complete metadata
2. Update `prerequisites/topic-dependencies.json` to include relationships
3. Add to relevant clusters in `cross-references/related-topics.json`
4. Update progression paths if it fits into existing sequences
5. Tag appropriately for search
6. Link to examples

### Updating Existing Topic
1. Update `version` field
2. Update `last_updated` date
3. If breaking change to prerequisites, update dependency graph
4. If objectives change significantly, bump major version
5. Notify users who bookmarked this topic

### Quality Checks
- All `related_topics.enables` should list this topic in their `builds_on`
- No circular `hard_dependencies`
- All `content_files` paths exist
- All `examples` paths exist
- Reading times are realistic (verified by testing)
- `personas.highly_relevant` should match persona path definitions

## Versioning

Metadata uses semantic versioning:
- **Major**: Breaking changes (e.g., topic renamed, prerequisites changed)
- **Minor**: New depth level, significant content addition
- **Patch**: Typo fixes, small clarifications, updated examples

This allows the app to handle changes gracefully and notify users of updates.
