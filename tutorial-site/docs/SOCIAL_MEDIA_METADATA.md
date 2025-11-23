# Social Media and OpenGraph Metadata

This document describes the comprehensive social media metadata implementation for the "How to Build an App" educational site.

## Overview

All pages automatically include OpenGraph (OG) and Twitter Card meta tags that enable rich previews when shared on social media platforms. The implementation supports:

- **OpenGraph Tags**: For Facebook, LinkedIn, and general social sharing
- **Twitter Card Tags**: For Twitter/X sharing with rich preview cards
- **Article-Specific Tags**: Publishing and modification timestamps for content pages
- **Schema.org Structured Data**: JSON-LD markup for search engines

## Available Props for Layouts

### BaseLayout and ContentLayout Props

```typescript
interface Props {
  title: string;                    // Page title
  description?: string;             // Page description (auto-trimmed to 160 chars)
  keywords?: string[]              // SEO keywords (max 5 used)
  updated?: string;                // ISO 8601 timestamp (triggers article mode)
  schema?: {                        // Structured data configuration
    type: 'WebSite' | 'Article' | 'LearningResource' | 'Course' | 'BreadcrumbList';
    // ... additional schema properties
  };
}
```

## How It Works

### OpenGraph Meta Tags

Every page automatically includes these OpenGraph tags:

```html
<!-- Always Included -->
<meta property="og:type" content="website" />              <!-- or 'article' if updated -->
<meta property="og:title" content="Page Title | How to Build an App" />
<meta property="og:description" content="Page description..." />
<meta property="og:url" content="https://howtobuildanapp.dev/path/" />
<meta property="og:site_name" content="How to Build an App" />
<meta property="og:image" content="https://howtobuildanapp.dev/assets/images/flossin-tech.png" />
<meta property="og:image:alt" content="How to Build an App Logo" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="en_US" />

<!-- Only if 'updated' prop is provided -->
<meta property="article:published_time" content="2025-11-15T10:30:00Z" />
<meta property="article:modified_time" content="2025-11-15T10:30:00Z" />
<meta property="article:tag" content="security, api-keys, environment-variables" />
```

### Twitter Card Meta Tags

Every page includes Twitter Card tags for rich preview display:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@FlosstinTech" />
<meta name="twitter:creator" content="@FlosstinTech" />
<meta name="twitter:title" content="Page Title | How to Build an App" />
<meta name="twitter:description" content="Page description..." />
<meta name="twitter:image" content="https://howtobuildanapp.dev/assets/images/flossin-tech.png" />
<meta name="twitter:image:alt" content="How to Build an App Logo" />
```

## Usage Examples

### Example 1: Homepage (No Article Meta Tags)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout
  title="Home"
  description="Non-linear guide to software development organized using the Thermocline Principle. Learn development lifecycle phases from discovery to operations."
  keywords={["software development", "learning guide", "programming"]}
>
  <!-- content -->
</BaseLayout>
```

**Resulting Meta Tags:**
- `og:type` = "website"
- `article:published_time` = NOT included
- Twitter Card: summary_large_image

---

### Example 2: Content Page (With Timestamps)

```astro
---
import ContentLayout from '../layouts/ContentLayout.astro';

export const frontmatter = {
  title: "Secret Management: The Essentials",
  phase: "03-development",
  topic: "secret-management",
  depth: "surface",
  reading_time: 8,
  prerequisites: [],
  related_topics: ["secure-coding-practices"],
  personas: ["new-developer", "yolo-dev"],
  updated: "2025-11-15",
};
---

<ContentLayout
  title={frontmatter.title}
  description="Learn how to keep API keys, passwords, and credentials secure in your applications. Master environment variables, secret managers, and secure practices."
  keywords={["security", "secrets", "api-keys", "environment-variables", "best-practices"]}
  updated={frontmatter.updated}
>
  <!-- content -->
</ContentLayout>
```

**Resulting Meta Tags:**
- `og:type` = "article" (because `updated` is provided)
- `article:published_time` = "2025-11-15"
- `article:modified_time` = "2025-11-15"
- `article:tag` = "security, api-keys, environment-variables, best-practices"

---

### Example 3: Using the Utility Helper

```astro
---
import { generateContentMetadata } from '../utils/seoMetadata';
import ContentLayout from '../layouts/ContentLayout.astro';

export const frontmatter = {
  title: "Threat Modeling",
  updated: "2025-11-14",
};

const metadata = generateContentMetadata({
  title: frontmatter.title,
  description: "Identify security threats early in your development process with structured threat modeling techniques.",
  keywords: ["security", "threat-modeling", "risk-assessment", "dread"],
  updated: frontmatter.updated,
});
---

<ContentLayout {...metadata}>
  <!-- content -->
</ContentLayout>
```

## Meta Tag Specifications

### Character Limits & Display Length

**Title Tags** (og:title, twitter:title)
- Display limit: ~60 characters on desktop, ~40 on mobile
- Implementation: `"${title} | How to Build an App"`
- Example: "Secret Management: The Essentials | How to Build an App"

**Description Tags** (og:description, twitter:description)
- Optimal length: 150-160 characters
- Display limit: ~155 chars on desktop, ~130 on mobile
- Implementation: Auto-trimmed to 160 chars with "..." if longer

**Keywords Meta Tag** (meta name="keywords")
- Used for general SEO
- Maximum: 3-5 keywords recommended
- Implementation: First 5 from keywords array, comma-separated

### Image Specifications

**OpenGraph Image**
- Recommended size: 1200x630 pixels (1.91:1 ratio)
- Format: PNG or JPG
- Current: `/assets/images/flossin-tech.png` (Flossin Tech logo)
- OG meta tags include: `og:image:width`, `og:image:height`, `og:image:alt`

**Twitter Image**
- Recommended size: 1200x675 pixels (16:9 ratio)
- Format: PNG or JPG
- Includes `twitter:image:alt` for accessibility
- Current: Uses same image as OpenGraph

## Search Engine Optimization

### Schema.org Integration

All pages include JSON-LD structured data:

1. **WebSite Schema** (Always present)
   - Site name, description, URL
   - Search action configuration
   - Creator organization and logo

2. **Article Schema** (When using content pages with timestamps)
   - Headline, description, URL
   - Author organization
   - Publication and modification dates
   - Keywords as tags
   - Featured image

3. **LearningResource Schema** (For educational content)
   - Educational level (Beginner, Intermediate, Advanced)
   - Time required
   - Learning outcomes
   - Prerequisites

4. **Course Schema** (For learning paths)
   - Course name and description
   - Provider organization
   - Course steps and structure
   - Estimated time
   - Prerequisites

## Testing & Validation

### Test Tools

1. **Facebook Sharing Debugger**
   - https://developers.facebook.com/tools/debug/
   - Check how your page appears when shared on Facebook

2. **Twitter Card Validator**
   - https://cards-dev.twitter.com/validator
   - Preview Twitter Card appearance

3. **Schema.org Validator**
   - https://validator.schema.org/
   - Validate JSON-LD structured data

4. **Google Rich Results Test**
   - https://search.google.com/test/rich-results
   - Check Google's interpretation of schema

### Manual Testing

**Share a URL:**
1. Copy page URL
2. Paste into Facebook/Twitter share dialog
3. Verify preview shows:
   - Correct title
   - Description without truncation
   - Logo image
   - Correct site name

**Check Meta Tags in Browser:**
```javascript
// In browser console:
document.querySelectorAll('meta[property^="og:"]')  // OpenGraph tags
document.querySelectorAll('meta[name^="twitter:"]')  // Twitter tags
document.querySelectorAll('script[type="application/ld+json"]')  // Schema
```

## Best Practices

### 1. Always Provide Descriptions

```astro
<!-- GOOD -->
<ContentLayout
  title="API Authentication"
  description="Learn different authentication methods (OAuth, JWT, API Keys) and implement them securely in your applications."
  keywords={["authentication", "oauth", "jwt", "api-security"]}
>

<!-- AVOID -->
<ContentLayout
  title="Authentication"
  description="Learn about authentication"  <!-- Too generic -->
>
```

### 2. Use Consistent Keywords

Keep keywords consistent with:
- Frontmatter metadata
- Page headings (H1)
- Content focus areas
- Related topics

```astro
keywords={["testing", "unit-tests", "integration-tests", "test-coverage", "jest"]}
//                ↑ General        ↑ Specific         ↑ Tools/frameworks
```

### 3. Include Update Timestamps for Content Pages

```astro
<!-- For published/updated content -->
<ContentLayout
  title="Deployment Strategy"
  description="..."
  keywords={[...]}
  updated="2025-11-15T10:30:00Z"  <!-- ISO 8601 format -->
>
```

### 4. Keep Titles Descriptive but Concise

```astro
<!-- GOOD (58 chars) -->
title="Secret Management: The Essentials"

<!-- OKAY (52 chars) -->
title="Secure Coding Practices"

<!-- POOR (96 chars) -->
title="Everything You Need to Know About Secret Management and How to Implement It Securely"
```

### 5. Write Descriptions for Click-Through

```astro
<!-- GOOD: Benefits + keywords + CTA implied -->
description="Learn to identify security threats early. Master threat modeling, risk assessment, and mitigation strategies for secure software."

<!-- POOR: Generic, no value proposition -->
description="This page is about threat modeling and security."
```

## Site-Wide Defaults

These values are applied to all pages automatically:

| Property | Value |
|----------|-------|
| og:site_name | "How to Build an App" |
| og:locale | "en_US" |
| og:image | `/assets/images/flossin-tech.png` |
| og:image:width | 1200 |
| og:image:height | 630 |
| twitter:site | @FlosstinTech |
| twitter:creator | @FlosstinTech |
| twitter:card | summary_large_image |

## Troubleshooting

### Issue: Twitter Card Not Showing in Preview

**Solution:** Twitter caches card metadata. Use the validator to refresh:
- https://cards-dev.twitter.com/validator

### Issue: Facebook Shows Old Preview

**Solution:** Clear Facebook's cache:
- https://developers.facebook.com/tools/debug/

### Issue: OpenGraph Image Not Displaying

**Checklist:**
1. Image URL is publicly accessible
2. Image dimensions are 1200x630 (or larger)
3. Image is in JPG or PNG format
4. Image file size is reasonable (< 2MB)
5. URL is absolute (starts with https://)

### Issue: Keywords Not Appearing in Meta Tags

**Checklist:**
1. Keywords array is provided and not empty
2. Keywords array contains strings
3. Maximum 5 keywords are used (only first 5 are included)
4. Check source code with browser DevTools

## Future Enhancements

Potential improvements for future versions:

1. **Dynamic Social Images**: Generate custom images per topic using a service like Vercel OG
2. **Custom Card Images**: Per-topic or per-phase custom images instead of generic logo
3. **Rich Snippets**: FAQ, HowTo, or VideoObject schema for specific content types
4. **Locale Variants**: og:locale:alternate for internationalization
5. **Breadcrumb Navigation**: Automatic breadcrumb schema from URL structure

## Files Modified

### Core Files
- **src/layouts/BaseLayout.astro**: Added comprehensive OG and Twitter meta tags
- **src/layouts/ContentLayout.astro**: Extended props to support social metadata
- **src/utils/seoMetadata.ts**: Helper utilities for metadata generation (new)

### Documentation
- **docs/SOCIAL_MEDIA_METADATA.md**: This guide (new)

## References

- [OpenGraph Protocol](https://ogp.me/)
- [Twitter Card Specification](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org](https://schema.org/)
- [JSON-LD Format](https://json-ld.org/)
- [Astro Meta Tags](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
