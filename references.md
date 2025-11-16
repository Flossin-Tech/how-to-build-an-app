# References

This document contains all external references, citations, and resources referenced throughout the "How to Build an App" educational content. References are organized by category for easy navigation.

---

## Table of Contents

1. [Books & Publications](#books--publications)
2. [Industry Resources & Guides](#industry-resources--guides)
3. [Research Papers](#research-papers)
4. [Industry Case Studies & Blog Posts](#industry-case-studies--blog-posts)
5. [Standards & Frameworks](#standards--frameworks)
6. [Tools & Platform Documentation](#tools--platform-documentation)
7. [Industry Reports & Threat Intelligence](#industry-reports--threat-intelligence)
8. [Academic Research](#academic-research)

---

## Books & Publications

### Product Development & Strategy

**Ries, Eric**
- *The Lean Startup*
- Focus: Lean methodology, validated learning, and rapid iteration

**Cagan, Marty**
- *Inspired: How to Create Tech Products Customers Love*
- Focus: Product management and creating successful technology products

**Torres, Teresa**
- *Continuous Discovery Habits*
- Focus: Continuous product discovery and customer research

**Perri, Melissa**
- *Escaping the Build Trap*
- Focus: Product management and avoiding feature factory patterns

**Christensen, Clayton M.**
- *Competing Against Luck: The Story of Innovation and Customer Choice*
- Focus: Jobs-to-be-Done framework and innovation theory

**Rumelt, Richard**
- *Good Strategy Bad Strategy*
- Focus: Strategic thinking and planning

**McGrath, Rita Gunther**
- *Seeing Around Corners: How to Spot Inflection Points in Business Before They Happen*
- Focus: Strategic inflection points and market changes

**Doerr, John**
- *Measure What Matters*
- Focus: Objectives and Key Results (OKRs) framework

**Gothelf, Jeff & Seiden, Josh**
- *Sense and Respond*
- Focus: Continuous planning and organizational agility

**Cutler, Sean Ellis & Morgan Brown**
- *The North Star Playbook*
- Focus: North Star metrics and growth strategies

### Decision Making & Cognitive Psychology

**Kahneman, Daniel**
- *Thinking, Fast and Slow*
- Focus: Cognitive biases and decision-making processes

**Klein, Gary**
- *Sources of Power: How People Make Decisions*
- Focus: Naturalistic decision making and expert intuition

**Duke, Annie**
- *Thinking in Bets: Making Smarter Decisions When You Don't Have All the Facts*
- Focus: Probabilistic thinking and decision-making under uncertainty

### Organizational Culture & Learning

**Edmondson, Amy C.**
- *The Fearless Organization: Creating Psychological Safety in the Workplace for Learning, Innovation, and Growth*
- Focus: Psychological safety and team performance
- Key research: Google's Project Aristotle findings

**Senge, Peter M.**
- *The Fifth Discipline: The Art & Practice of The Learning Organization*
- Focus: Learning organizations and systems thinking
- Key concepts: Five disciplines for organizational learning

**Meadows, Donella H.**
- *Thinking in Systems: A Primer*
- Focus: Systems thinking and system dynamics

**Dekker, Sidney**
- *The Field Guide to Understanding 'Human Error'*
- Focus: Human factors and error analysis
- Application: Blameless incident analysis

- *Just Culture: Balancing Safety and Accountability*
- Publisher: Ashgate (2012)
- Focus: Just culture framework from aviation safety
- Key insight: Distinguishing human error from reckless behavior

- *Drift into Failure: From Hunting Broken Components to Understanding Complex Systems*
- Focus: How complex systems fail and drift toward danger

**Forsgren, Nicole, Ph.D., Humble, Jez, & Kim, Gene**
- *Accelerate: Building and Scaling High Performing Technology Organizations*
- Focus: DORA metrics and high-performing teams
- Key concepts: Four key metrics for software delivery performance

**Kim, Gene, Debois, Patrick, Willis, John, & Humble, Jez**
- *The DevOps Handbook: How to Create World-Class Agility, Reliability, and Security in Technology Organizations*
- Focus: DevOps practices and cultural transformation

**McChrystal, General Stanley**
- *Team of Teams: New Rules of Engagement for a Complex World*
- Focus: Organizational adaptation and distributed decision-making

### Retrospectives & Facilitation

**Kerth, Norman L.**
- *Project Retrospectives: A Handbook for Team Reviews*
- Focus: Foundational work on retrospectives

**Derby, Esther & Larsen, Diana**
- *Agile Retrospectives: Making Good Teams Great*
- Focus: Practical retrospective techniques and facilitation

**Kaner, Sam**
- *Facilitator's Guide to Participatory Decision-Making*
- Focus: Facilitation techniques and group dynamics

**Rising, Linda & Manns, Mary Lynn**
- *Fearless Change: Patterns for Introducing New Ideas*
- Focus: Change management and organizational patterns

### Operations, Observability & Reliability

**Majors, Charity, Fong-Jones, Liz, & Miranda, George**
- *Observability Engineering: Achieving Production Excellence*
- Publisher: O'Reilly Media (2022)
- ISBN: 978-1492076438
- Focus: High-cardinality observability and modern debugging
- Key chapters: 2 (Debugging with Observability), 4 (Structured Events), 7 (Instrumentation)
- Key quote: "Observability requires access to raw original events. Pre-aggregation destroys the ability to answer unanticipated questions."

**Preston, W. Curtis**
- *Modern Data Protection*
- Publisher: O'Reilly Media (2021)
- Focus: Backup strategies, testing methodologies, and failure scenarios
- Background: 30+ years industry experience

**Krogh, Peter**
- *The DAM Book: Digital Asset Management for Photographers*
- Published: 2009
- Significance: Original source of the 3-2-1 backup rule
- Application: Universal data protection principles

### Software Architecture & Design

**Evans, Eric**
- *Domain-Driven Design: Tackling Complexity in the Heart of Software*
- Focus: Domain modeling and strategic design

**Martin, Robert C. (Uncle Bob)**
- *Clean Code: A Handbook of Agile Software Craftsmanship*
- Focus: Code quality and software craftsmanship

- *Clean Architecture: A Craftsman's Guide to Software Structure and Design*
- Focus: Architecture patterns and design principles

**Feathers, Michael**
- *Working Effectively with Legacy Code*
- Focus: Refactoring and maintaining existing codebases

---

## Industry Resources & Guides

### Google SRE (Site Reliability Engineering)

**Google SRE Book** (Free Online)
- URL: https://sre.google/sre-book/
- Publisher: O'Reilly Media (2016)
- Authors: Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Richard Murphy

**Key Chapters:**
- Chapter 6: Monitoring Distributed Systems
  - URL: https://sre.google/sre-book/monitoring-distributed-systems/
  - Focus: Four Golden Signals (latency, traffic, errors, saturation)
  - Key insight: "If you can only measure four metrics, focus on these four"
  - Reading time: ~40 minutes

- Chapter 10: Practical Alerting from Time-Series Data
  - URL: https://sre.google/sre-book/practical-alerting/
  - Focus: Alert design philosophy and Borgmon architecture
  - Key insight: "Every page should be actionable"
  - Reading time: ~45 minutes

- Release Engineering
  - URL: https://sre.google/sre-book/release-engineering/
  - Focus: Release management and deployment processes

- Embracing Risk (Error Budgets)
  - Focus: Error budget framework and reliability decisions

- Postmortem Culture
  - Focus: Blameless postmortems and learning from failures

**Google SRE Workbook**
- Canarying Releases
  - URL: https://sre.google/workbook/canarying-releases/
  - Focus: Progressive deployment strategies

**Google: "How SRE Relates to DevOps"**
- Publisher: O'Reilly (2017)
- Focus: Implementation of error budgets across organizations
- Key insight: Data-driven reliability decisions eliminate political debates

### Martin Fowler's Resources

**Fowler, Martin**
- Feature Toggles (Feature Flags)
  - URL: https://martinfowler.com/articles/feature-toggles.html
  - Focus: Feature flag patterns and best practices

### Brendan Gregg's Performance Engineering

**Gregg, Brendan**
- The USE Method
  - URL: https://www.brendangregg.com/usemethod.html
  - Focus: Utilization, Saturation, Errors methodology
  - Key insight: "Solves 80% of server issues with 5% of effort"
  - Reading time: 1 hour methodology + 2 hours implementation

- "Thinking Methodically about Performance"
  - Publication: ACM Queue (2013)
  - URL: https://queue.acm.org/detail.cfm?id=2413037
  - Focus: Formalized USE Method in academic context

### Analytics & Product Resources

**Amplitude**
- *The North Star Playbook*
- Focus: Product metrics and North Star framework

**Mixpanel**
- *Product Metrics Guide*
- Focus: Product analytics and metrics

---

## Research Papers

### Distributed Systems & Infrastructure

**"Dapper, a Large-Scale Distributed Systems Tracing Infrastructure"**
- Authors: Benjamin H. Sigelman, Luiz André Barroso, Mike Burrows, Pat Stephenson, Manoj Plakal, Donald Beaver, Saul Jaffe, Chandan Shanbhag
- Organization: Google
- Publication: Google Technical Report (2010)
- URL: https://research.google/pubs/pub36356/
- Key finding: Sampling 1/1000 traces sufficient for production debugging
- Impact: Foundation for Zipkin, Jaeger, and OpenTelemetry

**"Monarch: Google's Planet-Scale In-Memory Time Series Database"**
- Authors: Colin Adams, et al.
- Publication: VLDB 2020
- Focus: Architecture patterns for very large-scale monitoring
- Key insight: Zone-based aggregation and multi-level rollups
- Relevance: How Google handles billions of time series at global scale

### Organizational Psychology & Safety

**Edmondson, Amy C.**
- "Psychological Safety and Learning Behavior in Work Teams"
- Institution: Harvard Business School (1999)
- Key finding: Teams with high psychological safety report more errors, leading to better outcomes
- Relevance: Explains why blameless culture improves incident response

**Weick, Karl E. & Sutcliffe, Kathleen M.**
- *Managing the Unexpected: Resilient Performance in an Age of Uncertainty*
- Published: 2007
- Institution: University of Michigan
- Key finding: High reliability organizations share five key characteristics
- Key quote: "High reliability organizations develop collective mindfulness through preoccupation with failure"
- Relevance: Framework for building incident response culture

**Woods, David D. & Hollnagel, Erik**
- *Resilience Engineering: Concepts and Precepts*
- Published: 2006
- Institution: Ohio State University
- Key finding: Resilience is about recovery speed, not failure prevention
- Key quote: "Resilience is not about preventing failures but about how quickly the system returns to normal operation"
- Relevance: Theoretical foundation for chaos engineering and rapid incident response

**Cook, Richard I.**
- "How Complex Systems Fail"
- Focus: Failure modes in complex systems
- Relevance: Security posture management and system reliability

### Vulnerability & Exploitation Research

**"Patching Zero-Day Vulnerabilities: An Empirical Analysis"**
- Publication: Cybersecurity Journal (2021)
- URL: https://academic.oup.com/cybersecurity/article/7/1/tyab023/6431712
- Focus: Zero-day patching timelines and exploitation curves

---

## Industry Case Studies & Blog Posts

### Netflix Engineering

**Netflix Tech Blog - Chaos Engineering**
- URL: http://techblog.netflix.com/2015/09/chaos-engineering-upgraded.html
- Focus: Chaos Monkey, Simian Army, and production testing
- Key quote: "The best way to avoid failure is to fail constantly. By running Chaos Monkey in production during business hours, we ensure our systems are resilient to instance failures"

**"Chaos Engineering" Series**
- Authors: Netflix Engineering Team
- Timeline: 2011-Present
- Focus: Continuous failure testing at massive scale
- Impact: 65,000+ simulated instance failures
- Resources: Blog posts and conference talks

**"The Netflix Simian Army"**
- Timeline: 2011-2015
- URL: https://netflixtechblog.com/
- Focus: Original chaos engineering implementation
- Results: Quantified outcomes and production resilience

**"Linux Performance Analysis in 60 Seconds"**
- Author: Brendan Gregg (Netflix)
- URL: https://netflixtechblog.com/linux-performance-analysis-in-60-000-milliseconds-accc10403c55
- Focus: Step-by-step performance investigation process
- Key insight: 10 commands that reveal most infrastructure bottlenecks
- Relevance: Practical application of USE Method at scale

**"Chaos Monkey Released Into the Wild"**
- Author: Netflix Engineering Team
- Key quote: "The best defense against major unexpected failures is to fail often"

### Incident Response & Blameless Culture

**Allspaw, John**
- "Blameless PostMortems and a Just Culture"
- Published: 2012
- URL: https://www.adaptivecapacitylabs.com/blog/
- Significance: Foundational text on blameless incident analysis
- Impact: Inspired industry-wide adoption of blameless postmortem culture
- Source: Adapted from Sidney Dekker's Just Culture work in aviation safety
- Key quote: "Traditional postmortem approaches assume there's a root cause and once we fix it, we're safe. But complex systems fail in complex ways"

**PagerDuty**
- Incident Response Documentation
- URL: https://response.pagerduty.com/
- Type: Free, open-source resource
- Content: Templates and real-world guidance for incident response

### Observability & Monitoring

**Honeycomb**
- "Observability-Driven Development"
- URL: https://www.honeycomb.io/blog/observability-driven-development
- Focus: Instrumenting code during development
- Key insight: Observability is not an afterthought
- Relevance: Cultural shift needed for effective observability

**Datadog**
- "Maximizing Application Performance with APM"
- URL: https://www.datadoghq.com/blog/ (multiple posts)
- Focus: Distributed tracing implementation patterns at scale
- Key insight: 30% of users abandon apps after one error
- Business case: Performance directly impacts revenue

**SigNoz**
- "Structured Logging Best Practices"
- Focus: Log structure and observability patterns

**Better Stack**
- "7 Ways to Optimize Elastic Stack in Production"
- Focus: Index lifecycle management, cluster topology, cost optimization

### Cloud & Infrastructure

**AWS**
- RDS Multi-AZ and Cross-Region Replication
- Type: Public documentation
- Focus: Backup and DR implementation at scale
- Content: RTO/RPO tradeoffs and cost models for millions of databases

**Veeam**
- Ransomware Recovery Case Studies
- Focus: Real customer ransomware incidents
- Results: Quantified outcomes showing immutable backup effectiveness

---

## Standards & Frameworks

### Security Standards & Organizations

**OWASP (Open Web Application Security Project)**
- Website: https://owasp.org/
- Focus: Web application security standards and best practices

**OWASP Projects:**
- OWASP Top 10 - Web application security risks
- OWASP Threat Dragon - Threat modeling tool
  - Application: Surface-level threat modeling
- OWASP CycloneDX - SBOM (Software Bill of Materials) format
  - Focus: Strong tooling ecosystem, Dependency-Track integration
- OWASP Dependency-Track
  - URL: https://dependencytrack.org/
  - Type: Open-source SBOM analysis platform
  - Focus: Supply chain vulnerability management

**NIST (National Institute of Standards and Technology)**
- SP 800-207: Zero Trust Architecture
  - Definition: "Zero trust assumes there is no implicit trust granted to assets or user accounts based solely on their physical or network location"
- Various cybersecurity frameworks and guidelines

**CISA (Cybersecurity and Infrastructure Security Agency)**
- SSVC (Stakeholder-Specific Vulnerability Categorization) Guide
  - URL: https://www.cisa.gov/sites/default/files/publications/cisa-ssvc-guide%20508c.pdf
  - Type: Complete implementation guide for vulnerability prioritization
- Threat Intelligence Reports
  - Focus: Vulnerability exploitation timelines and threat actor tactics

**FIRST (Forum of Incident Response and Security Teams)**
- EPSS (Exploit Prediction Scoring System)
  - URL: https://www.first.org/epss/
  - Focus: Machine learning model predicting CVE exploitation likelihood
  - Accuracy: 82% precision at 20% recall
  - API: https://api.first.org/data/v1/epss?cve=CVE-XXXX-XXXXX

### Compliance Frameworks

**SOC 2 (Service Organization Control 2)**
- Focus: Security, availability, processing integrity, confidentiality, privacy

**GDPR (General Data Protection Regulation)**
- Focus: Data protection and privacy in the European Union

**HIPAA (Health Insurance Portability and Accountability Act)**
- Focus: Healthcare data protection and privacy

**PCI-DSS (Payment Card Industry Data Security Standard)**
- Focus: Payment card data security

**ISO Standards**
- Various international standards for security and quality

### Web & Internet Standards

**RFC 7807**
- Title: "Problem Details for HTTP APIs"
- Focus: Standard format for HTTP error responses
- Benefit: Machine-readable and consistent error handling

**WCAG (Web Content Accessibility Guidelines)**
- Focus: Web accessibility standards
- Compliance levels: A, AA, AAA

### Vulnerability Databases

**CVE (Common Vulnerabilities and Exposures)**
- Database: Public vulnerability tracking system
- Format: CVE-YYYY-NNNNN
- Examples referenced:
  - CVE-2021-44228 (Log4j/Log4Shell)
  - CVE-2021-45046 (Log4j follow-up)
  - CVE-2021-45105 (Log4j third vulnerability)
  - CVE-2023-30581 (Undici CRLF injection)
  - CVE-2023-24329 (Python URL parsing)

**CWE (Common Weakness Enumeration)**
- Focus: Software security weaknesses taxonomy

---

## Tools & Platform Documentation

### Deployment & Progressive Delivery

**Flagger**
- URL: https://docs.flagger.app
- Alternative: https://flagger.app
- Focus: Progressive delivery and automated canary deployments
- Integration: Kubernetes, Istio, Linkerd

**Spinnaker**
- URL: https://spinnaker.io/
- Focus: Multi-cloud continuous delivery platform
- Use case: Complex deployment pipelines

**Argo Rollouts**
- URL: https://argo-rollouts.readthedocs.io
- Focus: Kubernetes progressive delivery controller
- Features: Blue-green, canary deployments

### Observability & Monitoring

**OpenTelemetry**
- Main documentation: https://opentelemetry.io/docs/
- Reading time: 3-4 hours for core concepts
- Significance: Industry standard for instrumentation

**Key Resources:**
- Sampling Strategies: https://opentelemetry.io/docs/concepts/sampling/
- Tail Sampling: https://opentelemetry.io/blog/2022/tail-sampling/
- Focus: Trace and metric collection, vendor-neutral observability

**Prometheus**
- Best Practices: https://prometheus.io/docs/practices/
- Focus: Metric naming, label design, cardinality management
- Key feature: Recording rules for pre-aggregation
- Reading time: ~2 hours

**Grafana**
- Focus: Visualization and dashboards
- Integration: Prometheus, Elasticsearch, and other data sources

**Elasticsearch / ELK Stack**
- Focus: Log aggregation and search
- Optimization: Index lifecycle management, cluster topology

### Infrastructure as Code

**Terraform / OpenTofu**
- Focus: Infrastructure provisioning and management
- Use: Multi-cloud infrastructure as code

**Ansible**
- Focus: Configuration management and automation

### Security & Supply Chain

**Sigstore**
- Focus: Software signing and transparency
- Components: Cosign, Rekor, Fulcio

**Cosign**
- Focus: Container signing and verification
- Integration: OIDC-based keyless signing

**SLSA (Supply-chain Levels for Software Artifacts)**
- URL: https://slsa.dev/
- Focus: Supply chain integrity framework
- Format: Provenance attestation (https://slsa.dev/provenance/v0.2)

**Grype**
- Installation: https://raw.githubusercontent.com/anchore/grype/main/install.sh
- Focus: Vulnerability scanning for containers and filesystems

**Dependency-Track**
- Type: Open-source Component Analysis platform
- Integration: SBOM ingestion and vulnerability correlation
- API: https://dtrack.example.com/api/v1/

**SBOM Tools**
- Microsoft SBOM Tool
  - Download: https://github.com/microsoft/sbom-tool/releases/
  - Formats: SPDX, CycloneDX

### Container & Orchestration

**Kubernetes**
- Focus: Container orchestration
- Security: OPA/Gatekeeper for policy enforcement

**Docker**
- Focus: Containerization platform

**OPA (Open Policy Agent) / Gatekeeper**
- Installation: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
- Focus: Policy as code for Kubernetes

### CI/CD & Version Control

**GitHub Actions**
- Focus: CI/CD automation
- Security: OIDC integration for keyless authentication
- Token issuer: https://token.actions.githubusercontent.com

**GitLab CI**
- Focus: Integrated CI/CD platform

**ArgoCD / Flux**
- Focus: GitOps continuous delivery

---

## Industry Reports & Threat Intelligence

### Annual Security Reports

**Verizon Data Breach Investigations Report (DBIR) 2025**
- Focus: Global breach statistics and trends
- Key finding: Vulnerability exploitation accounts for 20% of all breaches (up 34% YoY)
- Mitigation insight: Organizations with timely patching AND compensating controls experience 87% fewer successful exploitations

**Rapid7**
- 2024 Ransomware Landscape Report
  - URL: https://www.rapid7.com/blog/post/2025/01/27/the-2024-ransomware-landscape-looking-back-on-another-painful-year/
  - Focus: Ransomware statistics, patch lag exploitation, threat actor tactics
- Threat Intelligence Reports
  - Focus: Vulnerability exploitation timelines
  - Key finding: Exploitation timeline compressed from 63 days (2018) to 5.4 days (2024)
  - Critical stat: 30% of known exploited vulnerabilities weaponized within 24 hours

**FortiGuard Labs**
- Global Threat Landscape Report 2025
  - URL: https://www.fortinet.com/content/dam/fortinet/assets/threat-reports/threat-landscape-report-2025.pdf
  - Focus: H1 2025 vulnerability statistics
  - Data: 23,600 CVEs published in H1 2025
  - Analysis: Exploitation trends and economic impact

**Risk to Resilience 2025 Report**
- Key finding: 89% of ransomware victims had backup repositories targeted
- Impact: Drives modern backup architecture requirements (immutability, air gaps)

### Vendor Intelligence

**CISA Known Exploited Vulnerabilities (KEV) Catalog**
- Focus: Actively exploited vulnerabilities requiring immediate action
- Update frequency: Continuous

---

## Platform-Specific Documentation

### Databases

**PostgreSQL**
- Continuous Archiving and Point-in-Time Recovery (PITR)
- Focus: WAL archiving, base backups, recovery procedures
- Authors: PostgreSQL core developers

### Cloud Platforms

**AWS (Amazon Web Services)**
- Prescriptive Guidance - Backup and Recovery
  - Focus: Cloud-native backup architectures
  - Content: RTO/RPO decision frameworks, multi-region DR patterns
  - Optimization: Cost strategies

### Operating Systems

**Linux Kernel**
- Livepatch Documentation
  - URL: https://docs.kernel.org/livepatch/livepatch.html
  - Focus: Kernel live patching mechanisms
  - Content: Limitations, consistency models, technical implementation

### Enterprise Systems

**Microsoft**
- WSUS (Windows Server Update Services) Best Practices
  - URL: https://learn.microsoft.com/en-us/intune/configmgr/sum/plan-design/software-updates-best-practices
  - Focus: Enterprise Windows patch management architecture

**Veeam**
- Backup & Replication Best Practice Guide
  - Focus: Enterprise backup patterns
  - Content: 3-2-1-1-0 rule evolution, immutable backups, ransomware defense
  - Update frequency: Regular updates with current threat landscape

---

## Academic Research

### Empirical Software Engineering

**DORA (DevOps Research and Assessment)**
- Lead researcher: Dr. Nicole Forsgren
- Focus: Software delivery performance metrics
- Key metrics: Lead time, deployment frequency, MTTR, change failure rate
- Publication: *Accelerate* (2018)

### Human Factors & Organizational Behavior

**Project Aristotle (Google)**
- Lead researcher: Amy Edmondson (Harvard)
- Finding: Psychological safety is the most important factor in high-performing teams
- Measurement: Seven-question survey for quantifiable baseline

**Snowden, Dave**
- Cynefin Framework
- Focus: Decision-making in complex vs. complicated systems
- Application: Retrospective analysis and system understanding

---

## Notes on Reference Usage

### Citation Frequency by Phase
- **Highest citation density**: 06-operations (monitoring, incident response, backup/recovery, patch management)
- **Second highest**: 07-iteration (retrospectives, feature planning, security reviews)
- **Integrated throughout**: Security and DevSecOps references across all phases

### Reference Types
- **Academic research**: Primarily in deep-water content for theoretical foundations
- **Industry case studies**: Used throughout mid-depth and deep-water for practical examples
- **Standards & frameworks**: Referenced in surface and mid-depth for compliance and best practices
- **Tools documentation**: Linked for hands-on implementation guidance

### Key Contributors & Thought Leaders
- **SRE/Operations**: Google SRE team, Brendan Gregg, Netflix Engineering, Charity Majors
- **Organizational psychology**: Amy Edmondson, Sidney Dekker, Karl Weick
- **Product development**: Marty Cagan, Teresa Torres, Eric Ries
- **Systems thinking**: Peter Senge, Donella Meadows
- **Incident response**: John Allspaw, PagerDuty team

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Maintained By**: How to Build an App Project
**Source Content**: `/content` directory across all 7 development phases

For questions about specific references or to suggest additions, please refer to the contribution guidelines in the main README.
