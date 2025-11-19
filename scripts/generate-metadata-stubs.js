#!/usr/bin/env node

/**
 * Generate metadata stubs for missing topics
 * Creates basic metadata files that can be filled in later
 */

const fs = require('fs');
const path = require('path');

const METADATA_DIR = path.join(__dirname, '..', 'metadata', 'topics');

// Define the metadata stubs to create
const metadataStubs = [
  {
    id: 'monitoring-logging',
    title: 'Monitoring & Logging',
    phase: '06-operations',
    phase_name: 'Operations',
    order: 1,
    short_desc: 'Understand system health and debug production issues',
    personas: ['new-developer', 'yolo-dev', 'generalist-leveling-up', 'specialist-expanding'],
    related: ['incident-response', 'deployment-strategy', 'performance-scalability-design']
  },
  {
    id: 'deployment-strategy',
    title: 'Deployment Strategy',
    phase: '05-deployment',
    phase_name: 'Deployment',
    order: 3,
    short_desc: 'Deploy safely with rollback capability and progressive rollouts',
    personas: ['new-developer', 'yolo-dev', 'generalist-leveling-up', 'specialist-expanding'],
    related: ['infrastructure-as-code', 'cicd-pipeline-security', 'monitoring-logging']
  },
  {
    id: 'incident-response',
    title: 'Incident Response',
    phase: '06-operations',
    phase_name: 'Operations',
    order: 2,
    short_desc: 'Handle outages and security incidents effectively',
    personas: ['new-developer', 'yolo-dev', 'generalist-leveling-up'],
    related: ['monitoring-logging', 'backup-recovery', 'retrospectives']
  },
  {
    id: 'infrastructure-as-code',
    title: 'Infrastructure as Code',
    phase: '05-deployment',
    phase_name: 'Deployment',
    order: 1,
    short_desc: 'Make infrastructure repeatable and version controlled',
    personas: ['generalist-leveling-up', 'specialist-expanding'],
    related: ['deployment-strategy', 'cicd-pipeline-security']
  },
  {
    id: 'concept-of-operations',
    title: 'Concept of Operations',
    phase: '01-discovery-planning',
    phase_name: 'Discovery & Planning',
    order: 2,
    short_desc: 'Sketch how users will accomplish their goals',
    personas: ['new-developer', 'specialist-expanding'],
    related: ['job-to-be-done', 'requirements-gathering', 'architecture-design']
  },
  {
    id: 'retrospectives',
    title: 'Retrospectives',
    phase: '07-iteration',
    phase_name: 'Iteration',
    order: 1,
    short_desc: 'Learn from successes and failures to improve',
    personas: ['new-developer', 'generalist-leveling-up'],
    related: ['incident-response', 'feature-planning']
  }
];

// Create metadata stub
function createMetadataStub(stub) {
  const metadata = {
    id: stub.id,
    slug: stub.id,
    title: stub.title,
    phase: stub.phase,
    phase_name: stub.phase_name,
    order_in_phase: stub.order,

    description: {
      short: stub.short_desc,
      medium: `${stub.short_desc} - detailed coverage coming soon`,
      full: `Comprehensive guide to ${stub.title.toLowerCase()}. This topic covers essential concepts, practical implementation, and best practices.`
    },

    why_it_matters: [
      `Essential for ${stub.phase_name} phase`,
      "Widely used across all personas",
      "Covered in multiple learning paths"
    ],

    depth_levels: {
      surface: {
        reading_time_minutes: 10,
        difficulty: "beginner",
        objectives: [
          `Understand what ${stub.title.toLowerCase()} is`,
          "Know when and why to use it",
          "Get started with basics"
        ],
        key_takeaways: [
          "Core concepts explained",
          "Practical first steps",
          "Common pitfalls to avoid"
        ]
      },
      "mid-depth": {
        reading_time_minutes: 25,
        difficulty: "intermediate",
        objectives: [
          `Implement ${stub.title.toLowerCase()} effectively`,
          "Integrate with existing workflow",
          "Handle common scenarios"
        ],
        key_takeaways: [
          "Best practices and patterns",
          "Tools and frameworks",
          "Real-world examples"
        ]
      },
      "deep-water": {
        reading_time_minutes: 45,
        difficulty: "advanced",
        objectives: [
          `Master advanced ${stub.title.toLowerCase()} techniques`,
          "Handle complex scenarios",
          "Optimize for scale"
        ],
        key_takeaways: [
          "Advanced patterns",
          "Enterprise considerations",
          "Performance optimization"
        ]
      }
    },

    prerequisites: [],
    related_topics: stub.related,
    personas: stub.personas,
    tools: [],
    frameworks_and_concepts: [],
    compliance_relevance: [],

    estimated_time_to_implement: {
      surface: "1-2 hours",
      mid_depth: "4-8 hours",
      deep_water: "2-5 days"
    },

    common_mistakes: [],
    success_metrics: [],
    when_to_prioritize: [],
    when_to_deprioritize: [],
    examples: [],

    updated: new Date().toISOString().split('T')[0]
  };

  const filePath = path.join(METADATA_DIR, `${stub.id}.json`);

  if (fs.existsSync(filePath)) {
    console.log(`⚠️  ${stub.id}.json already exists - skipping`);
    return false;
  }

  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  console.log(`✓ Created ${stub.id}.json`);
  return true;
}

// Generate all stubs
console.log('Generating metadata stubs...\n');

let created = 0;
metadataStubs.forEach(stub => {
  if (createMetadataStub(stub)) {
    created++;
  }
});

console.log(`\n✓ Created ${created} metadata stub files`);
console.log('Note: These are minimal stubs - expand with detailed content later');
