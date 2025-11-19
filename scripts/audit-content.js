#!/usr/bin/env node

/**
 * Content Audit Script
 *
 * Validates that all learning paths reference existing content and metadata
 * Checks content structure consistency
 * Reports gaps and issues
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const ROOT_DIR = path.join(__dirname, '..');

// Tracking statistics
const stats = {
  totalPaths: 0,
  totalSteps: 0,
  validReferences: 0,
  invalidReferences: 0,
  missingContent: [],
  missingMetadata: [],
  extraContent: [],
  warnings: [],
};

/**
 * Find all JSON files in a directory recursively
 */
function findJsonFiles(dir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Find all markdown index files in content directory
 */
function findContentFiles(contentDir) {
  const files = [];

  function walk(currentDir, relativePath = '') {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const newRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, newRelativePath);
      } else if (entry.isFile() && entry.name === 'index.md') {
        files.push({
          fullPath,
          relativePath: path.dirname(newRelativePath),
        });
      }
    }
  }

  walk(contentDir);
  return files;
}

/**
 * Parse phase/topic/depth from content path
 */
function parseContentPath(relativePath) {
  const parts = relativePath.split(path.sep);

  if (parts.length >= 3) {
    return {
      phase: parts[0],
      topic: parts[1],
      depth: parts[2],
    };
  }

  return null;
}

/**
 * Check if content exists for a given phase/topic/depth
 */
function checkContentExists(phase, topic, depth, contentIndex) {
  const key = `${phase}/${topic}/${depth}`;
  return contentIndex.has(key);
}

/**
 * Check if metadata exists for a topic
 */
function checkMetadataExists(topic, metadataDir) {
  const metadataPath = path.join(metadataDir, 'topics', `${topic}.json`);
  return fs.existsSync(metadataPath);
}

/**
 * Validate a single learning path
 */
function validateLearningPath(pathFile, contentIndex, metadataDir) {
  const pathData = JSON.parse(fs.readFileSync(pathFile, 'utf-8'));
  const pathName = path.basename(pathFile, '.json');

  stats.totalPaths++;

  console.log(`\n${colors.cyan}Validating: ${pathName}${colors.reset}`);
  console.log(`  Description: ${pathData.description || 'N/A'}`);
  console.log(`  Category: ${pathData.category || 'N/A'}`);

  let pathValid = true;

  // Extract steps from milestones or journey_steps
  const steps = [];

  if (pathData.milestones) {
    pathData.milestones.forEach(milestone => {
      if (milestone.steps) {
        steps.push(...milestone.steps);
      }
    });
  }

  if (pathData.journey_steps) {
    steps.push(...pathData.journey_steps);
  }

  if (pathData.steps) {
    steps.push(...pathData.steps);
  }

  stats.totalSteps += steps.length;

  // Validate each step
  steps.forEach((step, idx) => {
    if (!step.phase || !step.topic || !step.depth) {
      // Some paths like busy-developer have dynamic steps
      if (step.note || step.problem) {
        return; // Skip validation for dynamic steps
      }

      console.log(`  ${colors.yellow}⚠ Step ${idx + 1}: Missing phase/topic/depth${colors.reset}`);
      stats.warnings.push(`${pathName}: Step ${idx + 1} missing phase/topic/depth`);
      return;
    }

    const { phase, topic, depth } = step;

    // Check content exists
    const contentExists = checkContentExists(phase, topic, depth, contentIndex);

    if (contentExists) {
      stats.validReferences++;
      console.log(`  ${colors.green}✓${colors.reset} ${phase}/${topic}/${depth}`);
    } else {
      stats.invalidReferences++;
      pathValid = false;
      console.log(`  ${colors.red}✗ Missing: ${phase}/${topic}/${depth}${colors.reset}`);
      stats.missingContent.push({
        path: pathName,
        phase,
        topic,
        depth,
      });
    }

    // Check metadata exists
    if (!checkMetadataExists(topic, metadataDir)) {
      console.log(`  ${colors.yellow}⚠ Missing metadata: ${topic}.json${colors.reset}`);

      if (!stats.missingMetadata.find(m => m.topic === topic)) {
        stats.missingMetadata.push({
          topic,
          referencedBy: [pathName],
        });
      } else {
        const existing = stats.missingMetadata.find(m => m.topic === topic);
        if (!existing.referencedBy.includes(pathName)) {
          existing.referencedBy.push(pathName);
        }
      }
    }
  });

  return pathValid;
}

/**
 * Main audit function
 */
function runAudit() {
  console.log(`${colors.bold}${colors.blue}Content Audit Report${colors.reset}`);
  console.log('='.repeat(80));

  // Paths
  const learningPathsDir = path.join(ROOT_DIR, 'learning-paths');
  const contentDir = path.join(ROOT_DIR, 'content');
  const metadataDir = path.join(ROOT_DIR, 'metadata');

  // Check directories exist
  if (!fs.existsSync(learningPathsDir)) {
    console.error(`${colors.red}Error: learning-paths directory not found${colors.reset}`);
    process.exit(1);
  }

  if (!fs.existsSync(contentDir)) {
    console.error(`${colors.red}Error: content directory not found${colors.reset}`);
    process.exit(1);
  }

  // Build content index
  console.log(`\n${colors.bold}Building content index...${colors.reset}`);
  const contentFiles = findContentFiles(contentDir);
  const contentIndex = new Map();

  contentFiles.forEach(file => {
    const parsed = parseContentPath(file.relativePath);
    if (parsed) {
      const key = `${parsed.phase}/${parsed.topic}/${parsed.depth}`;
      contentIndex.set(key, file.fullPath);
    }
  });

  console.log(`Found ${contentFiles.length} content files`);

  // Find all learning paths
  console.log(`\n${colors.bold}Finding learning paths...${colors.reset}`);
  const pathFiles = findJsonFiles(learningPathsDir);
  console.log(`Found ${pathFiles.length} learning path files`);

  // Validate each path
  console.log(`\n${colors.bold}Validating learning paths...${colors.reset}`);

  pathFiles.forEach(pathFile => {
    try {
      validateLearningPath(pathFile, contentIndex, metadataDir);
    } catch (error) {
      console.error(`${colors.red}Error validating ${path.basename(pathFile)}: ${error.message}${colors.reset}`);
      stats.warnings.push(`Failed to parse ${path.basename(pathFile)}: ${error.message}`);
    }
  });

  // Check for orphaned content (content not referenced by any path)
  console.log(`\n${colors.bold}Checking for orphaned content...${colors.reset}`);

  const referencedContent = new Set();
  stats.missingContent.forEach(ref => {
    referencedContent.add(`${ref.phase}/${ref.topic}/${ref.depth}`);
  });

  // This is informational - content not in paths may be intentional
  let orphanedCount = 0;
  contentIndex.forEach((fullPath, key) => {
    if (!referencedContent.has(key)) {
      orphanedCount++;
      // Don't report these as errors, just count them
    }
  });

  console.log(`${orphanedCount} content files not referenced by any learning path (this may be intentional)`);

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.bold}${colors.blue}Summary${colors.reset}`);
  console.log(`${'='.repeat(80)}`);

  console.log(`\n${colors.bold}Learning Paths:${colors.reset}`);
  console.log(`  Total paths: ${stats.totalPaths}`);
  console.log(`  Total steps: ${stats.totalSteps}`);

  console.log(`\n${colors.bold}Content References:${colors.reset}`);
  console.log(`  ${colors.green}✓ Valid: ${stats.validReferences}${colors.reset}`);
  console.log(`  ${colors.red}✗ Invalid: ${stats.invalidReferences}${colors.reset}`);

  if (stats.missingContent.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Missing Content Files (${stats.missingContent.length}):${colors.reset}`);

    // Group by phase/topic
    const grouped = {};
    stats.missingContent.forEach(ref => {
      const key = `${ref.phase}/${ref.topic}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(ref.depth);
    });

    Object.entries(grouped).forEach(([key, depths]) => {
      console.log(`  ${colors.red}✗ ${key}${colors.reset}`);
      depths.forEach(depth => {
        console.log(`    - ${depth}`);
      });
    });
  }

  if (stats.missingMetadata.length > 0) {
    console.log(`\n${colors.bold}${colors.yellow}Missing Metadata Files (${stats.missingMetadata.length}):${colors.reset}`);
    stats.missingMetadata.forEach(meta => {
      console.log(`  ${colors.yellow}⚠ ${meta.topic}.json${colors.reset}`);
      console.log(`    Referenced by: ${meta.referencedBy.join(', ')}`);
    });
  }

  if (stats.warnings.length > 0) {
    console.log(`\n${colors.bold}${colors.yellow}Warnings (${stats.warnings.length}):${colors.reset}`);
    stats.warnings.forEach(warning => {
      console.log(`  ${colors.yellow}⚠ ${warning}${colors.reset}`);
    });
  }

  // Exit code
  const exitCode = stats.invalidReferences > 0 ? 1 : 0;

  if (exitCode === 0) {
    console.log(`\n${colors.bold}${colors.green}✓ Audit passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.bold}${colors.red}✗ Audit failed with ${stats.invalidReferences} invalid references${colors.reset}`);
  }

  console.log('');

  return exitCode;
}

// Run audit
const exitCode = runAudit();
process.exit(exitCode);
