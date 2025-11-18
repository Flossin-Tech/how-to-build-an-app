# Architecture Decision Case Studies

**Purpose:** Comprehensive, academic-quality case studies demonstrating quantitative architecture decision-making

**Format:** Research paper structure with full methodology, results, and discussion

---

## What Are Case Studies?

Case studies in this directory are **comprehensive analyses of real-world architecture decisions** following academic research paper conventions. They provide:

1. **Quantitative frameworks** for objective decision-making
2. **Documented thresholds** from industry evidence
3. **Reusable methodologies** applicable across domains
4. **Honest assessment** of trade-offs and limitations

Unlike the practical examples in `/examples/`, these case studies provide deep theoretical backing and research rigor.

---

## Case Study Structure

Each case study follows this research paper format:

### 1. Abstract
- **Background:** Context and triggering event
- **Research Question:** What decision needed to be made?
- **Methodology:** Framework used for decision
- **Key Findings:** Quantitative results
- **Conclusion:** Recommendation with rationale
- **Significance:** Why this matters beyond the specific case

**Reading time:** 2-3 minutes
**Depth level:** Surface summary

### 2. Introduction
- **Problem Statement:** Why this decision matters
- **Organizational Context:** Application, team, constraints
- **Research Question:** Primary and sub-questions
- **Significance:** Contributions to the field

**Reading time:** 5-8 minutes
**Depth level:** Surface to mid-depth transition

### 3. Literature Review
- **Architecture Patterns:** Options considered
- **Documented Scale Thresholds:** Industry evidence
- **Optimization Techniques:** State of the art
- **Team Capability:** Conway's Law, skill matching
- **Research Gap:** What existing literature doesn't cover

**Reading time:** 10-15 minutes
**Depth level:** Mid-depth

### 4. Methodology
- **Decision Framework:** Step-by-step process
- **Options Evaluated:** Detailed descriptions with diagrams
- **Data Collection Methods:** How evidence was gathered
- **Quantitative Metrics:** Formulas and calculations

**Reading time:** 10-15 minutes
**Depth level:** Mid-depth

### 5. Results
- **Scale Appropriateness Analysis:** Gap calculations
- **Team Capability Assessment:** Skill gaps quantified
- **Financial Impact Analysis:** Total cost of ownership
- **Risk Assessment:** Risk matrices
- **Comparative Summary:** All options scored

**Reading time:** 15-20 minutes
**Depth level:** Mid-depth to deep-water

### 6. Discussion
- **Interpretation of Findings:** What the numbers mean
- **Trade-offs and Limitations:** Honest assessment
- **Framework Applicability:** How to generalize

**Reading time:** 10-15 minutes
**Depth level:** Deep-water

### 7. Conclusion
- **Decision Summary:** Final recommendation
- **Implementation Approach:** High-level roadmap
- **Re-evaluation Criteria:** When to revisit
- **Contributions:** What this case study provides

**Reading time:** 5-8 minutes
**Depth level:** Deep-water

### 8. References
- **Academic Citations:** Conway's Law, Fowler, etc.
- **Industry Sources:** Company engineering blogs
- **Technical Documentation:** Framework/tool docs

### 9. Appendices (Optional)
- **Assessment Templates:** Reusable blank forms
- **Detailed Calculations:** Full financial models
- **Diagrams:** Architecture visualizations

---

## Reading Strategy by Persona

### New Developer (Surface)
**Read:** Abstract + Introduction (7-10 minutes)
**Goal:** Understand what decision was made and why

### YOLO Dev (Quick Fix)
**Read:** Abstract + Conclusion (5-10 minutes)
**Goal:** Get the answer and key takeaways fast

### Generalist Leveling Up (Mid-Depth)
**Read:** Abstract → Introduction → Methodology → Results → Conclusion (35-45 minutes)
**Goal:** Learn the decision framework to apply elsewhere

### Specialist Expanding (Deep-Water)
**Read:** Full case study (60-90 minutes)
**Goal:** Deep understanding of methodology, limitations, generalizability

---

## Current Case Studies

### 1. Microfrontend vs. Monolith Decision
**File:** [microfrontend-vs-monolith.md](microfrontend-vs-monolith.md)

**Context:** Finance sector web app, <500 users, 1 small team

**Question:** Should we adopt microfrontends for three new feature areas?

**Answer:** Extended monolith with React.lazy code splitting

**Key Finding:** 10x below scale threshold, 68-78% skill gap, $207K-$332K savings

**Framework:** 5-step quantitative assessment (scale, capability, finance, risk, reversibility)

**Applicable To:** Frontend architecture decisions, team sizing, scale appropriateness

**Reading Time:** 45 minutes (full), 10 minutes (Abstract + Conclusion)

**Related Example:** `/examples/domain-specific/web-apps/architecture-decisions/microfrontend-vs-monolith/`

---

## How to Use Case Studies

### As a Learner

1. **Start with Abstract** - Get the high-level story (3 min)
2. **Read Introduction** - Understand context (5 min)
3. **Skim Methodology** - See the framework (10 min)
4. **Focus on Results** - Learn the quantitative approach (15 min)
5. **Read Discussion** - Understand limitations and applicability (10 min)

**Total:** 43 minutes for solid understanding

### As a Decision-Maker

1. **Read Abstract + Conclusion** - Get the answer (7 min)
2. **Check if your context matches** - Compare constraints (5 min)
3. **If match:** Use templates from `/examples/` to apply framework
4. **If no match:** Adapt methodology to your context

### As a Teacher

1. **Use full case study** for structured learning modules
2. **Abstract + Introduction** as lecture material
3. **Methodology** as workshop exercise (students apply framework)
4. **Results + Discussion** as case discussion material
5. **Templates** from `/examples/` for student practice

---

## Relationship to Examples Directory

**Case Studies (this directory):**
- Academic rigor
- Full research methodology
- Comprehensive analysis
- Citable/referenceable
- 45-60 minute read

**Examples (`/examples/domain-specific/`):**
- Practical application
- Quick-reference format
- Actionable templates
- Scenario/approach/lessons structure
- 15-30 minute read

**Usage Pattern:**
- **Deep learning:** Read case study here, then practice with examples
- **Quick application:** Start with examples, reference case study for methodology
- **Teaching:** Case study for theory, examples for hands-on exercises

---

## Writing a New Case Study

### Template Structure

Use this checklist when creating a new architecture decision case study:

**Required Sections:**
- [ ] **Frontmatter** (YAML with title, type, phase, topic, keywords, personas, reading_time)
- [ ] **Abstract** (Background, question, methodology, findings, conclusion, significance)
- [ ] **Introduction** (Problem statement, context, research question, significance)
- [ ] **Literature Review** (Patterns, thresholds, research gap)
- [ ] **Methodology** (Framework, options, data collection, metrics)
- [ ] **Results** (Scale, capability, financial, risk, comparison)
- [ ] **Discussion** (Interpretation, trade-offs, applicability)
- [ ] **Conclusion** (Summary, implementation, re-evaluation)
- [ ] **References** (Citations to industry sources)

**Optional Sections:**
- [ ] **Appendices** (Templates, detailed calculations, additional diagrams)

### Quantitative Rigor

**Every case study must include:**
- [ ] **Documented thresholds** from industry sources (not opinions)
- [ ] **Gap calculations** (current state vs. thresholds, expressed as multipliers)
- [ ] **Capability assessment** (percentage skill gaps)
- [ ] **Financial modeling** (total cost of ownership with opportunity costs)
- [ ] **Risk quantification** (percentage risk levels across dimensions)
- [ ] **Weighted scoring** (objective comparison across options)

### Diagram Integration

**Embed architecture diagrams inline:**
```markdown
![Figure 2: Microfrontend Architecture](/assets/diagrams/architecture/case-name/diagram-name.mmd)
```

**Create diagram directory:**
- Location: `/assets/diagrams/architecture/{case-study-name}/`
- Include: All architecture options, decision flowcharts, comparison matrices
- Formats: Mermaid source (.mmd) + exported PNG/SVG

### Companion Example

**Every case study should have a companion practical example:**

**Create in:** `/examples/domain-specific/{domain}/{category}/{case-name}/`

**Include:**
- README.md (links to case study)
- scenario.md (the problem)
- approach.md (how decided)
- what-went-right.md (success factors)
- what-went-wrong.md (pitfalls avoided)
- takeaways.md (generalizable lessons)
- templates/ (reusable assessment tools)

### Review Checklist

Before publishing a case study:

**Content Quality:**
- [ ] Quantitative evidence for all claims
- [ ] Honest assessment of limitations
- [ ] Trade-offs explicitly discussed
- [ ] No dogmatic statements ("always use X")
- [ ] Framework generalizes beyond specific case

**Structure:**
- [ ] Follows research paper format
- [ ] Abstract is self-contained summary
- [ ] Each section has clear reading time
- [ ] Diagrams embedded at relevant points
- [ ] References properly cited

**Reusability:**
- [ ] Framework applicable to other decisions
- [ ] Templates extracted to companion example
- [ ] Thresholds documented with sources
- [ ] Re-evaluation criteria specified

**Accessibility:**
- [ ] Multiple reading paths for different personas
- [ ] Surface summary (Abstract) for quick understanding
- [ ] Mid-depth methodology for framework learning
- [ ] Deep-water analysis for specialists
- [ ] Clear links to practical examples

---

## Citation Format

When referencing these case studies in content:

**In educational content:**
```markdown
For a comprehensive quantitative framework, see the [Microfrontend vs. Monolith case study](/content/02-design/architecture-design/case-studies/microfrontend-vs-monolith.md).
```

**In practical examples:**
```markdown
This example demonstrates the framework documented in the academic case study. For full methodology, see [case-studies/microfrontend-vs-monolith.md](/content/02-design/architecture-design/case-studies/microfrontend-vs-monolith.md).
```

**In other case studies:**
```markdown
Similar to the microfrontend decision framework (Author, 2025), this case study uses quantitative thresholds to overcome technology enthusiasm bias.
```

---

## Contributing New Case Studies

**Ideal case studies:**
- Real-world decisions (not hypotheticals)
- Quantitative framework applied
- Non-obvious answers (demonstrates value of methodology)
- Generalizable lessons
- Honest about trade-offs

**Domains needed:**
- Backend architecture (microservices, serverless, monolith)
- Database decisions (SQL, NoSQL, NewSQL)
- API design (REST, GraphQL, gRPC)
- Infrastructure (Kubernetes, serverless, VMs)
- Testing strategies (unit, integration, E2E priorities)

**Process:**
1. Draft case study following template
2. Create companion practical example
3. Extract reusable templates
4. Create diagrams
5. Submit for review

---

## Related Documentation

**Content Structure:**
- `/content/02-design/architecture-design/` - Educational content on architecture
- `/examples/domain-specific/` - Practical examples and templates
- `/assets/diagrams/architecture/` - Architecture diagrams

**Metadata:**
- `/metadata/topics/architecture-design.json` - Topic metadata
- `/metadata/cross-references/` - Related topic connections

**Learning Paths:**
- `/learning-paths/personas/` - Persona-specific journeys
- `/learning-paths/tracks/` - Goal-based sequences

---

**Last Updated:** November 18, 2025
**Pattern Version:** 1.0
**Maintainer:** Architecture Working Group
