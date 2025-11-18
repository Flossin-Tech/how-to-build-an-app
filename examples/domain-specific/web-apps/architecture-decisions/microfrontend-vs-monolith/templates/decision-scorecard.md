# Architecture Decision Scorecard

**Purpose:** Score multiple architecture options across weighted criteria to make data-driven decision

**Instructions:** Complete scale and capability assessments first, then use this scorecard for final comparison

---

## Decision Context

**Decision Question:** _______________________

**Options Being Compared:**
1. Option A: _______________________
2. Option B: _______________________
3. Option C: _______________________

**Decision Date:** _______________________

**Decision Makers:** _______________________

---

## Criteria Weighting

**Adjust weights based on organizational priorities. Total must equal 100%.**

| Criterion | Weight | Rationale |
|-----------|--------|-----------|
| Scale Appropriateness | _____ % | How well option matches current scale |
| Team Capability | _____ % | Team's ability to build/maintain |
| Cost Efficiency | _____ % | Total cost of ownership |
| Timeline | _____ % | Time to delivery |
| Risk Level | _____ % | Technical, organizational, compliance risk |
| Reversibility | _____ % | Ease of changing course later |
| Performance | _____ % | User experience impact |
| **TOTAL** | **100%** | |

**Example weights:**
- **Finance/Healthcare:** Scale (25%), Capability (30%), Cost (20%), Risk (20%), Timeline (5%)
- **Startup:** Timeline (30%), Cost (25%), Scale (20%), Capability (15%), Risk (10%)
- **Enterprise:** Risk (25%), Capability (25%), Scale (20%), Cost (15%), Timeline (15%)

---

## Scoring Each Option

**Scoring Scale:** 1-10 (1 = Poor fit, 10 = Excellent fit)

### Option A: _______________________

| Criterion | Raw Score (1-10) | Weight | Weighted Score | Evidence/Rationale |
|-----------|------------------|--------|----------------|---------------------|
| Scale Appropriateness | | _____ % | | |
| Team Capability | | _____ % | | |
| Cost Efficiency | | _____ % | | |
| Timeline | | _____ % | | |
| Risk Level | | _____ % | | |
| Reversibility | | _____ % | | |
| Performance | | _____ % | | |
| **TOTAL** | | **100%** | **_____** | |

### Option B: _______________________

| Criterion | Raw Score (1-10) | Weight | Weighted Score | Evidence/Rationale |
|-----------|------------------|--------|----------------|---------------------|
| Scale Appropriateness | | _____ % | | |
| Team Capability | | _____ % | | |
| Cost Efficiency | | _____ % | | |
| Timeline | | _____ % | | |
| Risk Level | | _____ % | | |
| Reversibility | | _____ % | | |
| Performance | | _____ % | | |
| **TOTAL** | | **100%** | **_____** | |

### Option C: _______________________

| Criterion | Raw Score (1-10) | Weight | Weighted Score | Evidence/Rationale |
|-----------|------------------|--------|----------------|---------------------|
| Scale Appropriateness | | _____ % | | |
| Team Capability | | _____ % | | |
| Cost Efficiency | | _____ % | | |
| Timeline | | _____ % | | |
| Risk Level | | _____ % | | |
| Reversibility | | _____ % | | |
| Performance | | _____ % | | |
| **TOTAL** | | **100%** | **_____** | |

---

## Comparative Summary

| Criterion | Option A Score | Option B Score | Option C Score | Winner |
|-----------|----------------|----------------|----------------|--------|
| Scale Appropriateness | | | | |
| Team Capability | | | | |
| Cost Efficiency | | | | |
| Timeline | | | | |
| Risk Level | | | | |
| Reversibility | | | | |
| Performance | | | | |
| **WEIGHTED TOTAL** | **_____** | **_____** | **_____** | **_____** |

**Clear winner?**
- [ ] Yes - Option _____ scores significantly higher (>2 points difference)
- [ ] Close call - Top options within 1-2 points
- [ ] No clear winner - Re-evaluate criteria or gather more data

---

## Detailed Criterion Analysis

### 1. Scale Appropriateness (Weight: _____ %)

**Scoring Guidance:**
- 9-10: Matches current scale perfectly, within optimal range
- 7-8: Close to appropriate scale (2-3x gap)
- 5-6: Moderate mismatch (3-5x gap)
- 3-4: Significant gap (5-10x away from threshold)
- 1-2: Fundamental mismatch (10x+ gap, premature or overkill)

| Option | Score | Gap Analysis |
|--------|-------|--------------|
| A | | Users: _____x gap, Teams: _____x gap |
| B | | Users: _____x gap, Teams: _____x gap |
| C | | Users: _____x gap, Teams: _____x gap |

### 2. Team Capability (Weight: _____ %)

**Scoring Guidance:**
- 9-10: >90% capability match, <10% gap, team ready now
- 7-8: 70-90% match, manageable learning (2-4 weeks)
- 5-6: 50-70% match, moderate learning (4-8 weeks)
- 3-4: 30-50% match, high learning burden (8-16 weeks)
- 1-2: <30% match, >70% gap, unrealistic without major hiring/consulting

| Option | Score | Capability Match | Gap | Learning Investment |
|--------|-------|------------------|-----|---------------------|
| A | | _____ % | _____ % | $_____ / _____ weeks |
| B | | _____ % | _____ % | $_____ / _____ weeks |
| C | | _____ % | _____ % | $_____ / _____ weeks |

### 3. Cost Efficiency (Weight: _____ %)

**Scoring Guidance:**
- 9-10: Minimal cost (<$50K Year 1), excellent ROI
- 7-8: Moderate cost ($50-100K Year 1), good ROI
- 5-6: High cost ($100-200K Year 1), acceptable ROI
- 3-4: Very high cost ($200-300K Year 1), questionable ROI
- 1-2: Excessive cost (>$300K Year 1), poor ROI

| Option | Score | Year 1 Total Cost | Opportunity Cost |
|--------|-------|-------------------|------------------|
| A | | $_____ | _____ features not shipped |
| B | | $_____ | _____ features not shipped |
| C | | $_____ | _____ features not shipped |

### 4. Timeline (Weight: _____ %)

**Scoring Guidance:**
- 9-10: <12 weeks to production, fast time to value
- 7-8: 12-16 weeks, acceptable timeline
- 5-6: 16-24 weeks, delayed but manageable
- 3-4: 24-40 weeks, significant delay
- 1-2: >40 weeks, unacceptable delay

| Option | Score | Weeks to Production | vs. Baseline |
|--------|-------|---------------------|--------------|
| A | | _____ weeks | +_____ weeks delay |
| B | | _____ weeks | +_____ weeks delay |
| C | | _____ weeks (baseline) | — |

### 5. Risk Level (Weight: _____ %)

**Scoring Guidance:**
- 9-10: Low risk (<20%), proven patterns, high confidence
- 7-8: Moderate risk (20-40%), manageable concerns
- 5-6: Medium-high risk (40-60%), significant concerns
- 3-4: High risk (60-80%), major concerns, mitigation required
- 1-2: Critical risk (>80%), unacceptable, likely to fail

| Option | Score | Risk Level | Key Risks |
|--------|-------|------------|-----------|
| A | | _____ % | |
| B | | _____ % | |
| C | | _____ % | |

### 6. Reversibility (Weight: _____ %)

**Scoring Guidance:**
- 9-10: Easily reversible, well-documented migration patterns
- 7-8: Reversible with effort, established patterns exist
- 5-6: Difficult to reverse, requires significant refactoring
- 3-4: Very difficult, major project to reverse
- 1-2: Effectively irreversible, requires complete rewrite

| Option | Score | Reversibility Assessment |
|--------|-------|-------------------------|
| A | | Migration path: _____________________ |
| B | | Migration path: _____________________ |
| C | | Migration path: _____________________ |

### 7. Performance (Weight: _____ %)

**Scoring Guidance:**
- 9-10: Significantly improves performance (>30% improvement)
- 7-8: Modest improvement (10-30%)
- 5-6: Neutral (no change)
- 3-4: Degrades performance (-10-30%)
- 1-2: Significantly worse (>30% degradation)

| Option | Score | Performance Impact |
|--------|-------|--------------------|
| A | | TTI: _____ s, Bundle: _____ KB |
| B | | TTI: _____ s, Bundle: _____ KB |
| C | | TTI: _____ s, Bundle: _____ KB |

---

## Sensitivity Analysis

**What if we change weights? Does winner change?**

**Scenario 1:** Heavily weight capability (40%) and risk (30%)
- Winner: Option _____

**Scenario 2:** Heavily weight timeline (40%) and cost (30%)
- Winner: Option _____

**Scenario 3:** Equal weights (all criteria 14-15%)
- Winner: Option _____

**Is winner robust across scenarios?**
- [ ] Yes - Same option wins in all scenarios (high confidence)
- [ ] No - Winner changes based on weights (review priorities)

---

## Qualitative Factors

**Factors not captured in scores:**
- Organizational politics: _______________________
- Team morale/enthusiasm: _______________________
- Vendor lock-in concerns: _______________________
- Compliance/regulatory: _______________________
- Other: _______________________

**Do these change the decision?**
- [ ] No - Scores tell the full story
- [ ] Yes - Qualitative factors favor: Option _____

---

## Final Recommendation

**Recommended Option:** _____________________

**Weighted Score:** _____ / 10

**Key Strengths:**
1. _______________________
2. _______________________
3. _______________________

**Key Weaknesses:**
1. _______________________
2. _______________________
3. _______________________

**Confidence Level:**
- [ ] High (8-10/10) - Clear winner, strong data
- [ ] Medium (5-7/10) - Best option but close call
- [ ] Low (<5/10) - Uncertain, need more data

---

## Implementation Plan (High-Level)

**Phase 1:** _______________________ (Weeks 1-_____)

**Phase 2:** _______________________ (Weeks _____-_____)

**Phase 3:** _______________________ (Weeks _____-_____)

**Success Metrics:**
- _______________________
- _______________________
- _______________________

---

## Re-evaluation Criteria

**When to revisit this decision:**

**Quantitative Triggers:**
- [ ] Users exceed _____ (current: _____)
- [ ] Teams exceed _____ (current: _____)
- [ ] Performance degrades below _____ (current: _____)
- [ ] Costs exceed _____ (current: _____)

**Qualitative Triggers:**
- [ ] Organizational pain exceeds _____ % of team time
- [ ] Technology landscape changes significantly
- [ ] Business strategy shifts (e.g., M&A, new markets)

**Re-evaluation cadence:** [ ] Quarterly [ ] Bi-annually [ ] Annually

---

## Sign-Off

**Decision Approved By:**

| Name | Role | Signature | Date |
|------|------|-----------|------|
| | | | |
| | | | |
| | | | |

**Next Review Date:** _______________________

---

**Template Version:** 1.0
**Last Updated:** November 2025
