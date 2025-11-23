/**
 * SEO Utilities for meta tag generation and optimization
 * Helps manage descriptions, keywords, and other SEO metadata
 */

interface MetadataConfig {
  title: string;
  description?: string;
  shortDescription?: string;
  mediumDescription?: string;
  keywords?: string[];
  updated?: string;
  depth?: 'surface' | 'mid-depth' | 'deep-water';
}

/**
 * Select the best description based on available options
 * Priority: mediumDescription > description > shortDescription
 * Ensures optimal meta description length (150-160 characters)
 */
export function selectOptimalDescription(config: MetadataConfig): string {
  const candidate = config.mediumDescription || config.description || config.shortDescription || '';

  if (!candidate) {
    return 'Educational guide on software development and the development lifecycle.';
  }

  return candidate.length > 160
    ? candidate.substring(0, 157) + '...'
    : candidate;
}

/**
 * Generate keywords array from various sources
 * Limits to 3-5 keywords for optimal SEO
 * Deduplicates and filters empty strings
 */
export function generateKeywords(
  provided?: string[],
  depth?: 'surface' | 'mid-depth' | 'deep-water',
  topic?: string
): string[] {
  const keywords = new Set<string>();

  // Add provided keywords
  if (provided && Array.isArray(provided)) {
    provided.slice(0, 3).forEach(kw => {
      if (kw && typeof kw === 'string') {
        keywords.add(kw.trim());
      }
    });
  }

  // Add depth-based keywords if space available
  if (keywords.size < 5 && depth) {
    const depthKeywords: Record<string, string> = {
      'surface': 'beginner-friendly',
      'mid-depth': 'intermediate guide',
      'deep-water': 'advanced tutorial',
    };
    const depthKeyword = depthKeywords[depth];
    if (depthKeyword) {
      keywords.add(depthKeyword);
    }
  }

  // Add topic keyword if space available
  if (keywords.size < 5 && topic) {
    keywords.add(topic);
  }

  return Array.from(keywords).slice(0, 5);
}

/**
 * Format keywords for meta tag (comma-separated string)
 */
export function formatKeywordsForMeta(keywords: string[]): string {
  return keywords
    .filter(kw => kw && typeof kw === 'string')
    .slice(0, 5)
    .join(', ');
}

/**
 * Calculate reading time from content or estimate from description
 */
export function estimateReadingTime(
  readingTime?: number,
  contentLength?: number
): number {
  if (readingTime) {
    return readingTime;
  }

  // Estimate: 200 words per minute
  if (contentLength) {
    return Math.max(1, Math.round(contentLength / 200));
  }

  return 5; // Default estimate
}

/**
 * Format reading time for schema.org ISO 8601 duration
 * Example: PT5M = 5 minutes
 */
export function formatIsoDuration(minutes: number): string {
  if (minutes < 1) return 'PT1M';
  if (minutes < 60) return `PT${minutes}M`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `PT${hours}H${mins}M`;
}

/**
 * Determine educational level based on depth
 */
export function mapDepthToEducationalLevel(
  depth?: 'surface' | 'mid-depth' | 'deep-water'
): 'Beginner' | 'Intermediate' | 'Advanced' | undefined {
  switch (depth) {
    case 'surface':
      return 'Beginner';
    case 'mid-depth':
      return 'Intermediate';
    case 'deep-water':
      return 'Advanced';
    default:
      return undefined;
  }
}

/**
 * Generate description for content pages
 * Combines title with depth level for clarity
 */
export function generatePageDescription(
  title: string,
  depth?: 'surface' | 'mid-depth' | 'deep-water'
): string {
  const depthLabels: Record<string, string> = {
    'surface': '5-10 minute introduction',
    'mid-depth': '15-30 minute guide',
    'deep-water': '30+ minute deep dive',
  };

  const depthLabel = depth ? depthLabels[depth] : 'educational guide';
  return `${title} - ${depthLabel}.`;
}

/**
 * Validate meta description length
 * Returns trimmed version if too long
 */
export function validateMetaDescription(description: string): string {
  if (description.length <= 160) {
    return description;
  }
  return description.substring(0, 157) + '...';
}

/**
 * Create complete metadata object for layout
 */
export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  updated?: string;
  schema?: any;
}

export function buildPageMetadata(config: MetadataConfig): PageMetadata {
  const description = selectOptimalDescription(config);
  const keywords = generateKeywords(config.keywords, config.depth);

  return {
    title: config.title,
    description,
    keywords,
    updated: config.updated,
  };
}
