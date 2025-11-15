# Learning Paths Directory

This directory contains curated learning journeys that guide users through the content in meaningful, goal-oriented sequences.

## Purpose

While the guide is designed for non-linear navigation, many users benefit from suggested paths through the content. Learning paths provide:

1. **Structured journeys** for specific goals or personas
2. **Logical progression** that builds knowledge incrementally
3. **Context-appropriate depth** (when to surface vs. dive deep)
4. **Goal-oriented learning** tied to real-world outcomes

## Directory Structure

```
learning-paths/
├── personas/           # Paths tailored to specific user types
│   ├── new-developer.json
│   ├── yolo-dev.json
│   ├── specialist-expanding.json
│   ├── generalist-leveling-up.json
│   └── busy-developer.json
├── tracks/            # Goal-based learning sequences
│   ├── mvp-launch.json
│   ├── security-hardening.json
│   ├── production-ready.json
│   ├── compliance-prep.json
│   └── incident-recovery.json
└── suggested-journeys/ # Contextual recommendations
    ├── have-idea.json
    ├── code-works-breaks.json
    ├── security-warnings.json
    └── switching-domains.json
```

## Personas

### new-developer.json
**Who**: Developers new to the full software lifecycle
**Goal**: Understand the complete map without drowning in details
**Strategy**: Surface layer across all phases, with selective mid-depth dives
**Example Path**:
1. Job to Be Done (surface)
2. Architecture Design (surface)
3. Secure Coding Practices (surface)
4. Unit Testing (surface)
5. Deployment Strategy (surface)
6. Monitoring & Logging (surface)
7. Retrospectives (surface)

### yolo-dev.json
**Who**: Developers who built something at 2am and now need to productionize
**Goal**: Shore up the gaps without rebuilding from scratch
**Strategy**: Tactical surface dips into critical missing pieces
**Example Path**:
1. Threat Modeling (surface) - "What could go wrong?"
2. Security Testing (surface) - "How do I check?"
3. Secret Management (surface) - "Am I leaking credentials?"
4. Deployment Strategy (surface) - "How do I deploy safely?"
5. Monitoring & Logging (surface) - "How do I know if it breaks?"
6. Backup & Recovery (surface) - "What if I need to rollback?"

### specialist-expanding.json
**Who**: Backend dev learning deployment, Web dev learning ML, etc.
**Goal**: Apply existing process knowledge to new domain
**Strategy**: Skip basics, focus on domain-specific differences at mid-depth
**Example Path**: (Customized based on "from" and "to" domains)
- Common structure: Skip intro topics, jump to domain-specific examples
- Mid-depth for new domain, deep-water for integration points

### generalist-leveling-up.json
**Who**: Developers filling gaps across the full stack
**Goal**: Systematic coverage of weak areas
**Strategy**: Assessment-based path, mid-depth focus, deep-water in areas of interest
**Example Path**: (Personalized after skill assessment)
- Diagnostic quiz identifies gaps
- Mid-depth coverage of weak areas
- Deep-water optional modules for career specialization

### busy-developer.json
**Who**: Developers who need answers right now for current blockers
**Goal**: Just-in-time learning for immediate problems
**Strategy**: Context-aware, minimal time investment, actionable outcomes
**Example Path**: (Dynamic, based on current challenge)
- Identify current blocker
- Surface layer of most relevant topic
- Quick win checklist
- "Come back later" pointers to deeper content

## Tracks

### mvp-launch.json
**Objective**: Ship a minimum viable product
**Timeline**: 2-4 weeks
**Depth**: Surface layer, pragmatic shortcuts
**Topics**:
1. Job to Be Done (surface)
2. Concept of Operations (surface)
3. Threat Modeling (surface) - 3 critical threats only
4. Architecture Design (surface)
5. Secure Coding Practices (surface)
6. Unit Testing (surface) - critical path only
7. Deployment Strategy (surface)
8. Monitoring & Logging (surface) - basic health checks

### security-hardening.json
**Objective**: Improve security posture of existing application
**Timeline**: Ongoing
**Depth**: Mid-depth security topics, surface elsewhere
**Topics**:
1. Threat Modeling (mid-depth)
2. Security Testing (mid-depth)
3. Secure Coding Practices (mid-depth)
4. Secret Management (mid-depth)
5. Supply Chain Security (mid-depth)
6. Access Control (mid-depth)
7. CI/CD Pipeline Security (mid-depth)
8. Security Posture Reviews (mid-depth)

### production-ready.json
**Objective**: Prepare MVP for production scale and reliability
**Timeline**: 4-8 weeks
**Depth**: Mid-depth for operations, surface for unchanged areas
**Topics**:
1. Architecture Design (mid-depth) - review for scale
2. Data Flow Mapping (mid-depth)
3. Integration Testing (mid-depth)
4. Infrastructure as Code (mid-depth)
5. Deployment Strategy (mid-depth) - blue/green, canary
6. Monitoring & Logging (mid-depth)
7. Incident Response (mid-depth)
8. Backup & Recovery (mid-depth)
9. Patch Management (surface)

### compliance-prep.json
**Objective**: Prepare for compliance audit (HIPAA, SOC2, etc.)
**Timeline**: 8-16 weeks
**Depth**: Deep-water for compliance topics, mid-depth elsewhere
**Topics**:
1. Requirements Gathering (deep-water) - regulatory requirements
2. Threat Modeling (deep-water) - compliance-specific threats
3. Data Flow Mapping (deep-water) - data classification
4. Secure Coding Practices (deep-water)
5. Compliance Validation (deep-water)
6. Access Control (deep-water)
7. Monitoring & Logging (deep-water) - audit trails
8. Backup & Recovery (deep-water)
9. Security Posture Reviews (deep-water)

### incident-recovery.json
**Objective**: Recover from and prevent future incidents
**Timeline**: Immediate + ongoing
**Depth**: Mid-depth operations, surface preventive measures
**Topics**:
1. Incident Response (mid-depth) - immediate actions
2. Monitoring & Logging (mid-depth) - understand what happened
3. Backup & Recovery (mid-depth) - restore service
4. Threat Modeling (surface) - identify root cause category
5. Security Testing (surface) - prevent recurrence
6. Retrospectives (mid-depth) - learn from incident
7. Patch Management (surface) - if vulnerability-related

## Suggested Journeys

These are contextual entry points based on user's stated situation.

### have-idea.json
**User says**: "I have an idea but don't know where to start"
**Suggested path**:
1. Job to Be Done (surface) - validate the problem
2. Concept of Operations (surface) - sketch the solution
3. Threat Modeling (surface) - identify early risks
4. Architecture Design (surface) - plan structure
5. → Then suggest mvp-launch.json track

### code-works-breaks.json
**User says**: "Code works but keeps breaking in production"
**Suggested path**:
1. Monitoring & Logging (surface) - understand failures
2. Unit/Integration Testing (mid-depth) - catch issues earlier
3. Deployment Strategy (mid-depth) - safer releases
4. Incident Response (surface) - handle breakage better
5. Retrospectives (surface) - learn from patterns
6. → Then suggest production-ready.json track

### security-warnings.json
**User says**: "I'm getting security warnings and don't know what to do"
**Suggested path**:
1. Security Testing (surface) - understand the warnings
2. Threat Modeling (surface) - assess severity
3. Secure Coding Practices (surface) - fix common issues
4. Supply Chain Security (surface) - dependency vulnerabilities
5. Secret Management (surface) - credential leaks
6. → Then suggest security-hardening.json track

### switching-domains.json
**User says**: "I'm a [X] developer learning [Y]"
**Suggested path**: (Dynamic based on X and Y)
- Use specialist-expanding.json persona
- Focus on domain-specific examples
- Skip process topics familiar from X
- Deep-dive differences in Y's patterns

## Path File Format

Each path is a JSON file describing the journey:

```json
{
  "id": "mvp-launch",
  "name": "MVP Launch Track",
  "description": "Ship a minimum viable product quickly and safely",
  "audience": ["new-developer", "yolo-dev"],
  "estimated_hours": 12,
  "difficulty": "beginner",
  "objectives": [
    "Validate product-market fit",
    "Ship working code to production",
    "Implement basic security and monitoring"
  ],
  "prerequisites": [],
  "steps": [
    {
      "order": 1,
      "phase": "01-discovery-planning",
      "topic": "job-to-be-done",
      "depth": "surface",
      "required": true,
      "estimated_minutes": 10,
      "why": "Validate you're solving a real problem before coding"
    },
    {
      "order": 2,
      "phase": "01-discovery-planning",
      "topic": "threat-modeling",
      "depth": "surface",
      "required": true,
      "estimated_minutes": 15,
      "why": "Identify the 3 most critical security risks early",
      "checkpoint": {
        "question": "Have you identified at least 3 potential threats?",
        "required_for_progress": true
      }
    }
  ],
  "milestones": [
    {
      "after_step": 4,
      "title": "Planning Complete",
      "description": "You have a validated idea and basic plan"
    }
  ],
  "related_paths": [
    "production-ready",
    "security-hardening"
  ],
  "next_steps": [
    "Once you ship your MVP, consider the production-ready track",
    "If handling sensitive data, review security-hardening track"
  ]
}
```

## Interactive App Integration

The app will:

1. **Persona Quiz**: Short assessment to recommend starting persona/path
2. **Context Prompt**: "What brings you here today?" → suggest journey
3. **Path Visualization**: Show progress through chosen path
4. **Adaptive Branching**: Suggest detours based on user interactions
5. **Completion Tracking**: Mark steps completed, estimate time remaining
6. **Path Switching**: Easy transition between paths as goals change
7. **Custom Paths**: Let users build their own path from topics

## Creating New Paths

1. Identify the goal or persona
2. Create JSON file in appropriate subdirectory
3. List topics in logical sequence
4. Specify depth level for each step
5. Add checkpoints at key milestones
6. Include "why" for each step (motivates completion)
7. Link to related paths for continuation
8. Test with representative users

## Path Maintenance

- Review paths quarterly for relevance
- Update based on user feedback and drop-off points
- A/B test different sequences for same goal
- Track completion rates and time-to-completion
- Adjust difficulty ratings based on actual user experience
