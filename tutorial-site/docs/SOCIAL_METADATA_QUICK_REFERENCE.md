# Social Media Metadata - Quick Reference

A quick lookup guide for implementing social media meta tags in your Astro pages.

## TL;DR - Basic Usage

```astro
<BaseLayout
  title="Page Title"
  description="One sentence description of the page content"
  keywords={["keyword1", "keyword2", "keyword3"]}
  updated="2025-11-15"  <!-- Only for articles/updated content -->
>
```

---

## Meta Tags Overview

### What Gets Generated Automatically

| Property | Example Value | Used By |
|----------|---------------|---------|
| og:type | "article" (if updated) or "website" | Facebook, LinkedIn |
| og:title | "Page Title \| How to Build an App" | Facebook, LinkedIn |
| og:description | Trimmed to 160 chars | Facebook, LinkedIn |
| og:url | Full canonical URL | Facebook, LinkedIn |
| og:image | Flossin Tech logo | Facebook, LinkedIn |
| twitter:card | summary_large_image | Twitter/X |
| twitter:title | "Page Title \| How to Build an App" | Twitter/X |
| twitter:image | Flossin Tech logo | Twitter/X |
| article:published_time | 2025-11-15 (ISO format) | Twitter/X, Rich Snippets |
| article:modified_time | 2025-11-15 (ISO format) | Google Search |
| article:tag | keyword1, keyword2, keyword3 | Rich Snippets |

---

## Required Props vs Optional

### Always Required
- **title**: Page heading/title

### Recommended (but optional)
- **description**: SEO description (auto-trimmed to 160 chars)
- **keywords**: Array of 3-5 keywords

### Only for Articles/Updated Content
- **updated**: ISO timestamp (triggers article mode)

### Schema.org Data (for advanced SEO)
- **schema**: Object with LearningResource, Course, etc.

---

## File Locations Modified

| File | Changes |
|------|---------|
| src/layouts/BaseLayout.astro | Added OG, Twitter, article meta tags |
| src/layouts/ContentLayout.astro | Extended props for social metadata |
| src/utils/seoMetadata.ts | NEW: Helper functions for metadata |
| docs/SOCIAL_MEDIA_METADATA.md | NEW: Comprehensive guide |
| docs/SOCIAL_METADATA_EXAMPLES.md | NEW: Real-world examples |

---

## Quick Copy-Paste Templates

### Template 1: Homepage

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout
  title="Your Site Name"
  description="Brief description of what your site offers"
  keywords={["primary-keyword", "secondary-keyword", "tertiary-keyword"]}
>
```

### Template 2: Content Page with Timestamps

```astro
---
import ContentLayout from '../layouts/ContentLayout.astro';

export const frontmatter = {
  title: "Page Title",
  updated: "2025-11-15",
};
---

<ContentLayout
  title={frontmatter.title}
  description="Clear, benefit-focused description of page content"
  keywords={["keyword1", "keyword2", "keyword3", "keyword4"]}
  updated={frontmatter.updated}
>
```

### Template 3: Using Helper Function

```astro
---
import { generateContentMetadata } from '../utils/seoMetadata';
import ContentLayout from '../layouts/ContentLayout.astro';

const metadata = generateContentMetadata({
  title: "Page Title",
  description: "Your description here",
  keywords: ["tag1", "tag2", "tag3"],
  updated: "2025-11-15"
});
---

<ContentLayout {...metadata}>
```

---

## Character Limits Quick Reference

| Field | Limit | Notes |
|-------|-------|-------|
| og:title / twitter:title | 60 chars | Includes " \| How to Build an App" |
| description / og:description | 160 chars | Auto-trimmed if longer |
| keywords | 5 max | Only first 5 used from array |

---

## Image Specifications

**Current Image:** `/assets/images/flossin-tech.png`

**OpenGraph Requirements:**
- Size: 1200x630 pixels (1.91:1 ratio)
- Format: PNG or JPG
- Must be publicly accessible

**Twitter Requirements:**
- Size: 1200x675 pixels (16:9 ratio)
- Format: PNG or JPG
- Must be publicly accessible

---

## Common Values (Built-In)

These values are automatically set on every page:

```
og:site_name        = "How to Build an App"
og:locale           = "en_US"
og:image:width      = "1200"
og:image:height     = "630"
twitter:site        = "@FlosstinTech"
twitter:creator     = "@FlosstinTech"
twitter:card        = "summary_large_image"
```

---

## Conditional Logic

The meta tags automatically adjust based on props:

### When `updated` is provided:
- `og:type` becomes "article" (instead of "website")
- `article:published_time` meta tag included
- `article:modified_time` meta tag included
- `article:tag` meta tag included

### When `keywords` are provided:
- `meta name="keywords"` tag included (SEO)
- `article:tag` populated if `updated` also provided

### When neither `updated` nor `keywords` provided:
- Standard website metadata only
- `og:type` stays "website"

---

## Testing Your Changes

### Browser Inspector (Quick Check)

```javascript
// Paste in browser console:
document.querySelectorAll('meta[property^="og:"]')
document.querySelectorAll('meta[name^="twitter:"]')
document.querySelectorAll('script[type="application/ld+json"]')
```

### Official Validators

- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **Schema**: https://validator.schema.org/

---

## Props Reference Cheat Sheet

```typescript
// BaseLayout props
{
  title: string;                  // REQUIRED
  description?: string;           // Optional, default provided
  keywords?: string[];           // Optional, max 5 used
  updated?: string;              // Optional, ISO timestamp
  schema?: { /* ... */ };        // Optional, advanced SEO
}
```

### Description Best Practices

```
GOOD: "Learn API design principles including REST conventions, status codes, and versioning."
BAD:  "This page teaches API design"

GOOD: "Master Git branching strategies for team collaboration"
BAD:  "About Git branches"
```

### Keyword Selection

```
GOOD: ["api-design", "rest", "http", "design-patterns", "best-practices"]
BAD:  ["api", "design", "rest", "http", "web", "development", "programming", "software"]
```

---

## Common Mistakes

### Mistake 1: Missing Description
```astro
<!-- Don't do this -->
<BaseLayout title="My Page">
```

### Mistake 2: Description Too Long
```astro
<!-- Don't do this - will be truncated awkwardly -->
description="This is a very long description that goes on and on and on about the topic without ever ending and includes way too much information that nobody wants to read in a preview"

<!-- Do this instead -->
description="Clear, concise description of exactly what visitors will learn or accomplish."
```

### Mistake 3: Too Many Keywords
```astro
<!-- Don't do this -->
keywords={["api", "rest", "http", "design", "architecture", "web", "development", "software", "engineering"]}

<!-- Do this instead -->
keywords={["api-design", "rest", "http-verbs", "api-versioning", "best-practices"]}
```

---

## Debugging

### Check if Props Are Being Passed

In your Astro component:
```astro
---
const { title, description, keywords, updated } = Astro.props;
console.log('Layout Props:', { title, description, keywords, updated });
---
```

### Verify Meta Tags in HTML

1. View page source (Ctrl/Cmd + U)
2. Search for `<meta property="og:`
3. Search for `<meta name="twitter:`
4. Verify content matches your props

### Twitter Card Not Showing?

1. Use validator: https://cards-dev.twitter.com/validator
2. Clear Twitter cache for the URL
3. Ensure all required tags are present

---

## ISO 8601 Timestamp Format

For the `updated` prop, use ISO 8601 format:

```
2025-11-15                           ✓ Just date
2025-11-15T10:30:00Z                ✓ Full timestamp
2025-11-15T10:30:00+00:00           ✓ With timezone
```

Common pattern from frontmatter:
```yaml
---
title: "My Article"
updated: "2025-11-15"                # Format from your markdown files
---
```

---

## Performance Impact

- Meta tags: ~1.5KB additional HTML
- No JavaScript required
- No external API calls
- Schema.org JSON-LD: Parsed by search engines only
- **Net impact**: Negligible (~0.1% page size increase)

---

## File References

For detailed documentation, see:

- **Complete Guide**: `docs/SOCIAL_MEDIA_METADATA.md`
- **Examples**: `docs/SOCIAL_METADATA_EXAMPLES.md`
- **Helper Functions**: `src/utils/seoMetadata.ts`
- **Layouts**: `src/layouts/BaseLayout.astro`, `src/layouts/ContentLayout.astro`

---

## Quick FAQ

**Q: Do I have to use the helper function?**
A: No, you can pass props directly to the layout.

**Q: What if I don't provide keywords?**
A: The site still works perfectly, you just miss the SEO keyword meta tag.

**Q: Can I use custom images per page?**
A: Currently all pages use the Flossin Tech logo. To customize, modify `src/layouts/BaseLayout.astro` line 225.

**Q: How often should I update the `updated` timestamp?**
A: Update it whenever you modify content significantly. Small fixes can be skipped.

**Q: Do I need to provide the full URL for og:image?**
A: No, the layout automatically converts relative paths to absolute URLs.

**Q: What's the difference between description and og:description?**
A: They're the same value used in both places - SEO meta tag and social sharing.

---

## Related Tools & Integrations

- **Astro Sitemap**: Integrates with canonical URLs
- **Google Analytics**: Track click-through rates by description
- **Search Console**: Monitor keyword performance
- **Cloudflare Analytics**: Track social referrals

---

**Last Updated:** November 2025
**For latest docs:** See `/tutorial-site/docs/` directory
