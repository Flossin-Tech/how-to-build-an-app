# App Config Directory

This directory contains configuration files for the interactive learning application, including navigation structure, search indexes, and user progress tracking schemas.

## Purpose

App configuration separates the application logic from content, enabling:

1. **Dynamic navigation** that adapts to user context
2. **Powerful search** across content, topics, and examples
3. **Progress tracking** to show user advancement
4. **Personalization** based on user preferences and history
5. **A/B testing** of different navigation flows

## Directory Structure

```
app-config/
├── navigation/                # Navigation structure and routing
│   ├── menu-structure.json    # Main navigation menu
│   ├── breadcrumbs.json       # Breadcrumb trail configuration
│   ├── quick-links.json       # Contextual quick links
│   └── phase-navigation.json  # Phase-specific navigation
├── search-index/              # Search configuration
│   ├── search-config.json     # Search engine configuration
│   ├── synonyms.json          # Search term synonyms
│   ├── boost-rules.json       # Search result ranking
│   └── facets.json            # Search filters/facets
└── user-progress/             # User progress tracking
    ├── progress-schema.json   # Progress data structure
    ├── achievements.json      # Achievement definitions
    ├── milestones.json        # Learning milestones
    └── analytics-events.json  # Analytics tracking config
```

## Navigation Configuration

### Menu Structure

**File**: `navigation/menu-structure.json`

Defines the primary navigation menu, sidebar, and routing.

```json
{
  "version": "1.0.0",
  "primary_navigation": [
    {
      "id": "home",
      "label": "Home",
      "icon": "home",
      "route": "/",
      "visible": true
    },
    {
      "id": "phases",
      "label": "Development Phases",
      "icon": "phases",
      "route": "/phases",
      "visible": true,
      "children": [
        {
          "id": "discovery-planning",
          "label": "Discovery & Planning",
          "icon": "discovery",
          "route": "/phases/discovery-planning",
          "phase": "01-discovery-planning",
          "order": 1,
          "description": "Understand what you're building and why",
          "color": "#FF6B6B"
        },
        {
          "id": "design",
          "label": "Design",
          "icon": "design",
          "route": "/phases/design",
          "phase": "02-design",
          "order": 2,
          "description": "Plan the architecture and identify risks",
          "color": "#4ECDC4"
        }
        // ... other phases
      ]
    },
    {
      "id": "learning-paths",
      "label": "Learning Paths",
      "icon": "path",
      "route": "/paths",
      "visible": true,
      "children": [
        {
          "id": "personas",
          "label": "By Persona",
          "route": "/paths/personas",
          "description": "Curated paths for different developer types"
        },
        {
          "id": "tracks",
          "label": "By Goal",
          "route": "/paths/tracks",
          "description": "Goal-oriented learning sequences"
        },
        {
          "id": "quick-start",
          "label": "Quick Starts",
          "route": "/paths/quick-starts",
          "description": "Jump in based on your current situation"
        }
      ]
    },
    {
      "id": "examples",
      "label": "Examples",
      "icon": "code",
      "route": "/examples",
      "visible": true
    },
    {
      "id": "search",
      "label": "Search",
      "icon": "search",
      "route": "/search",
      "visible": true,
      "keyboard_shortcut": "Ctrl+K"
    }
  ],

  "secondary_navigation": [
    {
      "id": "progress",
      "label": "My Progress",
      "icon": "progress",
      "route": "/progress",
      "authentication_required": true
    },
    {
      "id": "bookmarks",
      "label": "Bookmarks",
      "icon": "bookmark",
      "route": "/bookmarks",
      "authentication_required": true
    },
    {
      "id": "settings",
      "label": "Settings",
      "icon": "settings",
      "route": "/settings"
    }
  ],

  "mobile_navigation": {
    "bottom_nav": [
      "home",
      "phases",
      "learning-paths",
      "search",
      "progress"
    ],
    "hamburger_menu": [
      "examples",
      "bookmarks",
      "settings"
    ]
  }
}
```

### Breadcrumbs

**File**: `navigation/breadcrumbs.json`

Configures breadcrumb trail generation.

```json
{
  "templates": {
    "topic_page": [
      {
        "label": "Home",
        "route": "/"
      },
      {
        "label": "{phase_name}",
        "route": "/phases/{phase_slug}"
      },
      {
        "label": "{topic_name}",
        "route": "/phases/{phase_slug}/{topic_slug}"
      },
      {
        "label": "{depth_name}",
        "route": "/phases/{phase_slug}/{topic_slug}/{depth}",
        "current": true
      }
    ],
    "example_page": [
      {
        "label": "Home",
        "route": "/"
      },
      {
        "label": "Examples",
        "route": "/examples"
      },
      {
        "label": "{category_name}",
        "route": "/examples/{category}"
      },
      {
        "label": "{example_name}",
        "route": "/examples/{category}/{example_slug}",
        "current": true
      }
    ],
    "learning_path": [
      {
        "label": "Home",
        "route": "/"
      },
      {
        "label": "Learning Paths",
        "route": "/paths"
      },
      {
        "label": "{path_name}",
        "route": "/paths/{path_type}/{path_slug}",
        "current": true
      }
    ]
  },
  "separator": "/",
  "show_current_page": true,
  "max_items_mobile": 2
}
```

### Quick Links

**File**: `navigation/quick-links.json`

Contextual links shown based on current page and user context.

```json
{
  "global_quick_links": [
    {
      "id": "whats-new",
      "label": "What's New",
      "route": "/whats-new",
      "icon": "sparkles",
      "condition": "show_if_updated_content"
    },
    {
      "id": "random-topic",
      "label": "Random Topic",
      "route": "/random",
      "icon": "shuffle"
    }
  ],

  "contextual_quick_links": {
    "topic_page": {
      "surface": [
        {
          "label": "Dive Deeper",
          "route": "{current_topic}/mid-depth",
          "icon": "arrow-down",
          "description": "Explore mid-depth content for this topic"
        },
        {
          "label": "Related Topics",
          "route": "#related",
          "icon": "link",
          "scroll_to": "related-topics"
        },
        {
          "label": "Examples",
          "route": "/examples?topic={current_topic}",
          "icon": "code"
        }
      ],
      "mid-depth": [
        {
          "label": "Back to Surface",
          "route": "{current_topic}/surface",
          "icon": "arrow-up"
        },
        {
          "label": "Go Deep",
          "route": "{current_topic}/deep-water",
          "icon": "arrow-down",
          "condition": "has_deep_water_content"
        }
      ],
      "deep-water": [
        {
          "label": "Back to Surface",
          "route": "{current_topic}/surface",
          "icon": "arrow-up"
        },
        {
          "label": "Back to Mid-Depth",
          "route": "{current_topic}/mid-depth",
          "icon": "arrow-up"
        }
      ]
    },

    "phase_overview": [
      {
        "label": "Start First Topic",
        "route": "{first_incomplete_topic}",
        "icon": "play",
        "condition": "has_incomplete_topics"
      },
      {
        "label": "Resume Where You Left Off",
        "route": "{last_viewed_topic}",
        "icon": "resume",
        "condition": "has_progress_in_phase"
      }
    ],

    "learning_path": [
      {
        "label": "Continue Path",
        "route": "{next_step_in_path}",
        "icon": "arrow-right",
        "condition": "path_in_progress"
      },
      {
        "label": "Path Progress",
        "route": "#progress",
        "icon": "chart",
        "scroll_to": "path-progress"
      }
    ]
  }
}
```

## Search Configuration

### Search Engine Config

**File**: `search-index/search-config.json`

```json
{
  "search_engine": "typesense",
  "collections": [
    {
      "name": "topics",
      "fields": [
        {"name": "id", "type": "string"},
        {"name": "title", "type": "string"},
        {"name": "description", "type": "string"},
        {"name": "content", "type": "string"},
        {"name": "phase", "type": "string", "facet": true},
        {"name": "depth", "type": "string", "facet": true},
        {"name": "tags", "type": "string[]", "facet": true},
        {"name": "personas", "type": "string[]", "facet": true},
        {"name": "reading_time", "type": "int32", "facet": true},
        {"name": "difficulty", "type": "string", "facet": true},
        {"name": "last_updated", "type": "int64"}
      ],
      "default_sorting_field": "last_updated"
    },
    {
      "name": "examples",
      "fields": [
        {"name": "id", "type": "string"},
        {"name": "title", "type": "string"},
        {"name": "description", "type": "string"},
        {"name": "code", "type": "string"},
        {"name": "domain", "type": "string", "facet": true},
        {"name": "languages", "type": "string[]", "facet": true},
        {"name": "topics", "type": "string[]", "facet": true},
        {"name": "difficulty", "type": "string", "facet": true}
      ]
    }
  ],

  "search_parameters": {
    "query_by": "title,description,content",
    "query_by_weights": "3,2,1",
    "num_typos": 2,
    "prefix": true,
    "per_page": 20,
    "highlight_full_fields": "title,description",
    "snippet_threshold": 30,
    "drop_tokens_threshold": 10
  },

  "autocomplete": {
    "enabled": true,
    "num_suggestions": 5,
    "highlight": true
  },

  "did_you_mean": {
    "enabled": true,
    "threshold": 0.7
  }
}
```

### Search Synonyms

**File**: `search-index/synonyms.json`

```json
{
  "synonyms": [
    ["security", "infosec", "appsec"],
    ["authentication", "auth", "login"],
    ["authorization", "authz", "permissions"],
    ["ci/cd", "continuous integration", "continuous deployment", "pipeline"],
    ["kubernetes", "k8s", "container orchestration"],
    ["docker", "containers", "containerization"],
    ["monitoring", "observability", "logging"],
    ["testing", "qa", "quality assurance"],
    ["api", "rest", "graphql", "endpoint"],
    ["database", "db", "datastore", "persistence"],
    ["ml", "machine learning", "ai", "artificial intelligence"],
    ["threat modeling", "threat analysis", "risk assessment"],
    ["deployment", "release", "rollout"],
    ["rollback", "revert", "undo deployment"],
    ["microservices", "distributed systems", "service-oriented"],
    ["serverless", "faas", "lambda", "cloud functions"],
    ["iac", "infrastructure as code", "terraform", "cloudformation"],
    ["secret", "credential", "api key", "password", "token"],
    ["vulnerability", "vuln", "security issue", "cve"],
    ["compliance", "regulation", "audit", "certification"]
  ],

  "domain_specific_synonyms": {
    "healthcare": [
      ["phi", "protected health information", "patient data"],
      ["hipaa", "health insurance portability"],
      ["ehr", "electronic health record", "emr"]
    ],
    "fintech": [
      ["pci", "pci-dss", "payment card industry"],
      ["aml", "anti-money laundering"],
      ["kyc", "know your customer"]
    ]
  }
}
```

### Search Boost Rules

**File**: `search-index/boost-rules.json`

Rules for ranking search results based on various factors.

```json
{
  "boost_rules": [
    {
      "name": "prioritize_user_persona",
      "description": "Boost results matching user's persona",
      "condition": "user_persona_set",
      "boost_by": 5,
      "filter": "personas:{user_persona}"
    },
    {
      "name": "prioritize_current_phase",
      "description": "Boost results from user's current phase",
      "condition": "user_in_learning_path",
      "boost_by": 3,
      "filter": "phase:{user_current_phase}"
    },
    {
      "name": "boost_surface_for_beginners",
      "description": "Show surface content first for new users",
      "condition": "user_is_beginner",
      "boost_by": 4,
      "filter": "depth:surface"
    },
    {
      "name": "boost_recently_updated",
      "description": "Prioritize recently updated content",
      "boost_by": 2,
      "condition": "last_updated > 30_days_ago"
    },
    {
      "name": "boost_highly_rated",
      "description": "Boost content with high user ratings",
      "boost_by": 3,
      "condition": "average_rating >= 4.0"
    },
    {
      "name": "boost_bookmarked_topics",
      "description": "Surface user's bookmarked topics higher",
      "boost_by": 6,
      "condition": "user_bookmarked"
    }
  ],

  "bury_rules": [
    {
      "name": "bury_completed",
      "description": "Lower ranking for already-completed topics",
      "penalty": -2,
      "condition": "user_completed_topic"
    },
    {
      "name": "bury_irrelevant_depth",
      "description": "Lower ranking for depth mismatched to user level",
      "penalty": -3,
      "condition": "depth_mismatch"
    }
  ]
}
```

### Search Facets

**File**: `search-index/facets.json`

```json
{
  "facets": [
    {
      "field": "phase",
      "label": "Development Phase",
      "type": "select_multiple",
      "options": [
        {"value": "01-discovery-planning", "label": "Discovery & Planning"},
        {"value": "02-design", "label": "Design"},
        {"value": "03-development", "label": "Development"},
        {"value": "04-testing", "label": "Testing"},
        {"value": "05-deployment", "label": "Deployment"},
        {"value": "06-operations", "label": "Operations"},
        {"value": "07-iteration", "label": "Iteration"}
      ],
      "default_open": true
    },
    {
      "field": "depth",
      "label": "Depth Level",
      "type": "select_single",
      "options": [
        {"value": "surface", "label": "Surface (5-10 min)"},
        {"value": "mid-depth", "label": "Mid-Depth (15-30 min)"},
        {"value": "deep-water", "label": "Deep Water (30-60+ min)"}
      ],
      "default_value": "surface"
    },
    {
      "field": "difficulty",
      "label": "Difficulty",
      "type": "select_single",
      "options": [
        {"value": "beginner", "label": "Beginner"},
        {"value": "intermediate", "label": "Intermediate"},
        {"value": "advanced", "label": "Advanced"}
      ]
    },
    {
      "field": "reading_time",
      "label": "Reading Time",
      "type": "range",
      "min": 0,
      "max": 60,
      "step": 5,
      "unit": "minutes"
    },
    {
      "field": "tags",
      "label": "Topics",
      "type": "select_multiple",
      "display_count": 10,
      "show_more_threshold": 20
    },
    {
      "field": "personas",
      "label": "Recommended For",
      "type": "select_multiple",
      "options": [
        {"value": "new-developer", "label": "New Developers"},
        {"value": "yolo-dev", "label": "YOLO Devs"},
        {"value": "specialist-expanding", "label": "Specialists Expanding"},
        {"value": "generalist-leveling-up", "label": "Generalists Leveling Up"},
        {"value": "busy-developer", "label": "Busy Developers"}
      ]
    }
  ],

  "facet_display": {
    "layout": "sidebar",
    "collapsible": true,
    "show_counts": true,
    "sort_by": "count_desc"
  }
}
```

## User Progress Configuration

### Progress Schema

**File**: `user-progress/progress-schema.json`

Defines structure for tracking user progress.

```json
{
  "version": "1.0.0",
  "user_progress": {
    "user_id": "string (uuid)",
    "created_at": "timestamp",
    "last_active": "timestamp",

    "profile": {
      "persona": "string (persona_id)",
      "experience_level": "string (beginner|intermediate|advanced)",
      "domains_of_interest": "array<string>",
      "preferred_depth": "string (surface|mid-depth|deep-water)",
      "time_availability": "string (limited|moderate|extensive)"
    },

    "topics_progress": {
      "{topic_id}": {
        "status": "not_started|in_progress|completed",
        "depth_levels_completed": "array<string>",
        "first_visited": "timestamp",
        "last_visited": "timestamp",
        "time_spent_seconds": "integer",
        "completion_percentage": "integer (0-100)",
        "user_rating": "integer (1-5)",
        "notes": "string (user's personal notes)",
        "bookmarked": "boolean"
      }
    },

    "learning_paths": {
      "{path_id}": {
        "status": "not_started|in_progress|completed",
        "started_at": "timestamp",
        "completed_at": "timestamp|null",
        "current_step": "integer",
        "steps_completed": "array<integer>",
        "total_steps": "integer",
        "estimated_time_remaining_minutes": "integer"
      }
    },

    "achievements": {
      "{achievement_id}": {
        "unlocked": "boolean",
        "unlocked_at": "timestamp|null",
        "progress": "integer (0-100)"
      }
    },

    "statistics": {
      "total_topics_viewed": "integer",
      "total_topics_completed": "integer",
      "total_time_spent_minutes": "integer",
      "streak_days": "integer",
      "last_streak_date": "date",
      "favorite_phase": "string (phase_id)",
      "completion_by_phase": {
        "{phase_id}": "integer (0-100)"
      },
      "completion_by_depth": {
        "surface": "integer",
        "mid-depth": "integer",
        "deep-water": "integer"
      }
    },

    "preferences": {
      "theme": "string (light|dark|auto)",
      "font_size": "string (small|medium|large)",
      "code_theme": "string",
      "email_notifications": "boolean",
      "weekly_summary": "boolean",
      "recommended_paths": "boolean"
    }
  }
}
```

### Achievements

**File**: `user-progress/achievements.json`

```json
{
  "achievements": [
    {
      "id": "first-step",
      "title": "First Steps",
      "description": "Complete your first topic",
      "icon": "baby-steps",
      "category": "getting-started",
      "points": 10,
      "unlock_criteria": {
        "topics_completed": 1
      },
      "visible_before_unlock": true
    },
    {
      "id": "surface-explorer",
      "title": "Surface Explorer",
      "description": "Complete surface layer for all 7 phases",
      "icon": "map",
      "category": "breadth",
      "points": 50,
      "unlock_criteria": {
        "phases_with_surface_complete": 7
      }
    },
    {
      "id": "deep-diver",
      "title": "Deep Diver",
      "description": "Complete deep-water content for any topic",
      "icon": "diving",
      "category": "depth",
      "points": 30,
      "unlock_criteria": {
        "deep_water_topics_completed": 1
      }
    },
    {
      "id": "security-specialist",
      "title": "Security Specialist",
      "description": "Complete all security-related topics at mid-depth or higher",
      "icon": "shield",
      "category": "specialization",
      "points": 100,
      "unlock_criteria": {
        "topics_completed_with_tags": {
          "tag": "security",
          "min_depth": "mid-depth",
          "count": "all"
        }
      }
    },
    {
      "id": "path-completer",
      "title": "Path Completer",
      "description": "Complete any learning path",
      "icon": "trophy",
      "category": "completion",
      "points": 75,
      "unlock_criteria": {
        "learning_paths_completed": 1
      }
    },
    {
      "id": "streak-7",
      "title": "Week Warrior",
      "description": "Learn something 7 days in a row",
      "icon": "fire",
      "category": "consistency",
      "points": 40,
      "unlock_criteria": {
        "streak_days": 7
      }
    },
    {
      "id": "helpful-feedback",
      "title": "Helpful Contributor",
      "description": "Rate 10 topics to help others",
      "icon": "star",
      "category": "community",
      "points": 20,
      "unlock_criteria": {
        "topics_rated": 10
      }
    },
    {
      "id": "full-stack",
      "title": "Full Stack Learner",
      "description": "Complete at least one topic in every phase",
      "icon": "stack",
      "category": "breadth",
      "points": 80,
      "unlock_criteria": {
        "phases_with_any_complete": 7
      }
    }
  ],

  "categories": [
    {"id": "getting-started", "label": "Getting Started", "color": "#4ECDC4"},
    {"id": "breadth", "label": "Breadth", "color": "#FF6B6B"},
    {"id": "depth", "label": "Depth", "color": "#45B7D1"},
    {"id": "specialization", "label": "Specialization", "color": "#96CEB4"},
    {"id": "completion", "label": "Completion", "color": "#FFEAA7"},
    {"id": "consistency", "label": "Consistency", "color": "#DFE6E9"},
    {"id": "community", "label": "Community", "color": "#A29BFE"}
  ]
}
```

### Milestones

**File**: `user-progress/milestones.json`

```json
{
  "milestones": [
    {
      "id": "orientation-complete",
      "title": "Orientation Complete",
      "description": "You understand the guide structure and thermocline principle",
      "criteria": {
        "topics_completed": ["job-to-be-done"]
      },
      "celebration_message": "Great start! You're ready to dive into any topic that matches your needs.",
      "next_steps": [
        "Choose a learning path that fits your goals",
        "Or jump directly to a topic you need right now"
      ]
    },
    {
      "id": "mvp-ready",
      "title": "MVP Ready",
      "description": "You have the knowledge to ship a minimum viable product",
      "criteria": {
        "learning_path_completed": "mvp-launch"
      },
      "celebration_message": "You're ready to ship! Remember: iteration beats perfection.",
      "next_steps": [
        "Start building your MVP",
        "Come back for production-ready track when you're ready to scale"
      ]
    },
    {
      "id": "production-ready",
      "title": "Production Ready",
      "description": "Your app is prepared for production scale and reliability",
      "criteria": {
        "learning_path_completed": "production-ready"
      },
      "celebration_message": "Solid foundation! You're prepared for production challenges.",
      "next_steps": [
        "Consider security-hardening track",
        "Review compliance-prep if handling sensitive data"
      ]
    },
    {
      "id": "security-hardened",
      "title": "Security Hardened",
      "description": "You've implemented comprehensive security practices",
      "criteria": {
        "learning_path_completed": "security-hardening"
      },
      "celebration_message": "Well secured! Your app has defense-in-depth.",
      "next_steps": [
        "Schedule regular security posture reviews",
        "Consider compliance requirements for your domain"
      ]
    },
    {
      "id": "full-cycle",
      "title": "Full Lifecycle Practitioner",
      "description": "You've completed at least surface level for all phases",
      "criteria": {
        "completion_by_phase": {
          "01-discovery-planning": 25,
          "02-design": 25,
          "03-development": 25,
          "04-testing": 25,
          "05-deployment": 25,
          "06-operations": 25,
          "07-iteration": 25
        }
      },
      "celebration_message": "You understand the full software development lifecycle!",
      "next_steps": [
        "Deepen expertise in areas critical to your work",
        "Share your knowledge with others"
      ]
    }
  ]
}
```

## Analytics Events

**File**: `user-progress/analytics-events.json`

```json
{
  "events": [
    {
      "name": "page_view",
      "category": "navigation",
      "properties": {
        "page_type": "string (topic|example|path|home)",
        "topic_id": "string|null",
        "phase": "string|null",
        "depth": "string|null"
      }
    },
    {
      "name": "topic_started",
      "category": "learning",
      "properties": {
        "topic_id": "string",
        "depth": "string",
        "source": "string (navigation|search|recommendation)"
      }
    },
    {
      "name": "topic_completed",
      "category": "learning",
      "properties": {
        "topic_id": "string",
        "depth": "string",
        "time_spent_seconds": "integer",
        "scrolled_to_bottom": "boolean"
      }
    },
    {
      "name": "depth_changed",
      "category": "navigation",
      "properties": {
        "topic_id": "string",
        "from_depth": "string",
        "to_depth": "string",
        "direction": "string (deeper|shallower)"
      }
    },
    {
      "name": "search_performed",
      "category": "search",
      "properties": {
        "query": "string",
        "results_count": "integer",
        "filters_applied": "object",
        "clicked_result_position": "integer|null"
      }
    },
    {
      "name": "learning_path_started",
      "category": "learning",
      "properties": {
        "path_id": "string",
        "path_type": "string (persona|track|journey)"
      }
    },
    {
      "name": "learning_path_step_completed",
      "category": "learning",
      "properties": {
        "path_id": "string",
        "step_number": "integer",
        "total_steps": "integer"
      }
    },
    {
      "name": "example_viewed",
      "category": "examples",
      "properties": {
        "example_id": "string",
        "domain": "string",
        "language": "string|null"
      }
    },
    {
      "name": "code_copied",
      "category": "examples",
      "properties": {
        "example_id": "string",
        "language": "string"
      }
    },
    {
      "name": "topic_bookmarked",
      "category": "engagement",
      "properties": {
        "topic_id": "string",
        "action": "string (add|remove)"
      }
    },
    {
      "name": "topic_rated",
      "category": "feedback",
      "properties": {
        "topic_id": "string",
        "rating": "integer (1-5)",
        "feedback_text": "string|null"
      }
    },
    {
      "name": "achievement_unlocked",
      "category": "gamification",
      "properties": {
        "achievement_id": "string",
        "points_earned": "integer"
      }
    }
  ],

  "privacy": {
    "anonymize_search_queries": true,
    "retention_days": 90,
    "exclude_from_analytics": [
      "user_email",
      "user_name",
      "ip_address"
    ]
  }
}
```

## Integration with App

### Loading Configuration

```javascript
// Load navigation config
import menuStructure from './app-config/navigation/menu-structure.json';
import breadcrumbs from './app-config/navigation/breadcrumbs.json';

// Build navigation
function buildNav() {
  return menuStructure.primary_navigation.map(item => ({
    ...item,
    active: currentRoute.startsWith(item.route)
  }));
}

// Generate breadcrumbs
function generateBreadcrumbs(currentPage) {
  const template = breadcrumbs.templates[currentPage.type];
  return template.map(crumb => ({
    label: interpolate(crumb.label, currentPage),
    route: interpolate(crumb.route, currentPage),
    current: crumb.current
  }));
}
```

### Search Integration

```javascript
// Initialize search with config
import searchConfig from './app-config/search-index/search-config.json';
import synonyms from './app-config/search-index/synonyms.json';
import boostRules from './app-config/search-index/boost-rules.json';

async function initializeSearch() {
  const client = new TypesenseClient(searchConfig);

  // Apply synonyms
  await client.synonyms.upsert(synonyms);

  // Configure boost rules based on user context
  const activeBoosts = boostRules.boost_rules.filter(rule =>
    evaluateCondition(rule.condition, userContext)
  );

  return { client, boosts: activeBoosts };
}
```

### Progress Tracking

```javascript
// Track user progress
import progressSchema from './app-config/user-progress/progress-schema.json';
import achievements from './app-config/user-progress/achievements.json';

function updateProgress(userId, topicId, action) {
  const progress = loadUserProgress(userId);

  // Update topic progress
  if (!progress.topics_progress[topicId]) {
    progress.topics_progress[topicId] = initializeTopicProgress();
  }

  progress.topics_progress[topicId] = {
    ...progress.topics_progress[topicId],
    ...action
  };

  // Check for achievement unlocks
  checkAchievements(progress, achievements);

  // Save progress
  saveUserProgress(userId, progress);
}
```

## Customization

App configuration can be customized per deployment:

- **Whitelabel**: Modify navigation labels and branding
- **Feature flags**: Enable/disable features via config
- **A/B testing**: Different nav structures for different user cohorts
- **Localization**: Translate labels and descriptions

## Version Control

- Configuration files are versioned alongside code
- Breaking changes to schema require migration scripts
- Backward compatibility maintained for user progress data
- Configuration changes deployed through standard CI/CD

This enables rapid iteration on app features without changing core content.
