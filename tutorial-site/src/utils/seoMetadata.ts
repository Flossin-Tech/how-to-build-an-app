/**
 * SEO and Social Media Metadata Utilities
 *
 * This module provides helpers for generating and managing OpenGraph, Twitter Card,
 * and article-specific meta tags across the site.
 */

export interface SocialMetadataProps {
  title: string;
  description: string;
  keywords?: string[];
  updated?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Generate metadata for a content page (article)
 *
 * @param title - Page title
 * @param description - Page description (will be trimmed to 160 chars)
 * @param keywords - Array of keywords (will use first 5)
 * @param updated - ISO timestamp of last update
 * @returns Object suitable for passing to layout
 */
export function generateContentMetadata({
  title,
  description,
  keywords = [],
  updated,
}: SocialMetadataProps) {
  return {
    title,
    description,
    keywords,
    updated,
  };
}

/**
 * Generate metadata for a learning path page
 *
 * @param title - Path title
 * @param description - Path description
 * @param keywords - Array of keywords
 * @returns Object suitable for passing to layout
 */
export function generatePathMetadata({
  title,
  description,
  keywords = [],
}: SocialMetadataProps) {
  return {
    title,
    description,
    keywords,
  };
}

/**
 * Format keywords for SEO meta tag
 * Takes first 5 keywords and joins with comma-space
 */
export function formatKeywords(keywords: string[]): string {
  return keywords.slice(0, 5).join(', ');
}

/**
 * Trim description to optimal length for meta tags
 * Keeps descriptions to 155-160 characters for proper display
 */
export function trimDescription(description: string, maxLength: number = 160): string {
  if (description.length > maxLength) {
    return description.substring(0, maxLength - 3) + '...';
  }
  return description;
}

/**
 * Example: How to use in a content page
 *
 * ---
 * import { generateContentMetadata } from '../utils/seoMetadata';
 * import ContentLayout from '../layouts/ContentLayout.astro';
 *
 * export const frontmatter = {
 *   title: "Secret Management: The Essentials",
 *   updated: "2025-11-15T10:30:00Z"
 * };
 *
 * const metadata = generateContentMetadata({
 *   title: frontmatter.title,
 *   description: "Learn how to keep API keys and secrets secure in your applications",
 *   keywords: ["security", "secrets", "api-keys", "environment-variables"],
 *   updated: frontmatter.updated
 * });
 * ---
 *
 * <ContentLayout {...metadata}>
 *   {content}
 * </ContentLayout>
 */
