# How to Build an App - Tutorial Site

A static tutorial site built with Astro + GitHub Pages that transforms educational content into an interactive, multi-access learning platform.

## Features

✅ **Multiple Navigation Patterns**
- Browse by Phase (7 development lifecycle phases)
- Learning Paths (persona-based, goal-based)
- Direct topic access

✅ **Thermocline Content Architecture**
- Surface (5-10 min) - Essential information
- Mid-Depth (15-30 min) - Practical guidance
- Deep Water (30-60+ min) - Advanced topics

✅ **Built for GitHub Pages**
- Static site generation
- No backend required
- Fast, cheap hosting

✅ **112 Pages Generated**
- From existing markdown content
- Automatic routing and navigation
- Responsive design

## Tech Stack

- **Astro 4.x** - Static site generator
- **MDX** - Markdown with components
- **Tailwind CSS** - Styling with dark mode
- **GitHub Actions** - CI/CD deployment
- **GitHub Pages** - Free hosting

## Project Structure

```
tutorial-site/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── navigation/   # Breadcrumbs, Header
│   │   └── content/      # DepthSwitcher
│   ├── layouts/          # Page layouts
│   ├── pages/            # Static & dynamic routes
│   ├── content/          # Symlink to ../content/
│   ├── data/             # Symlinks to metadata
│   ├── styles/           # Global CSS
│   └── utils/            # Helper functions
├── public/               # Static assets
└── dist/                 # Build output
```

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Content Management

Content is symlinked from the parent `content/` directory:
- `src/content/docs` → `../content/`
- `src/data/metadata` → `../metadata/`
- `src/data/learning-paths` → `../learning-paths/`

To update content:
1. Edit files in `../content/`
2. Astro will hot-reload in development
3. Rebuild for production

### Adding Content

Content files must have this frontmatter:

```yaml
---
title: "Topic Title"
phase: "01-discovery-planning"
topic: "topic-slug"
depth: "surface" # or "mid-depth" or "deep-water"
reading_time: 8
prerequisites: []
related_topics: ["other-topic"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-18"
---
```

## Deployment

### GitHub Actions (Automated)

Pushing to `main` triggers automatic deployment:
1. Checkout code
2. Install dependencies
3. Build site
4. Deploy to GitHub Pages

See `.github/workflows/deploy.yml`

### Manual Deployment

```bash
npm run build
# Copy dist/ contents to your hosting provider
```

## URLs

- Homepage: `/`
- Browse by Phase: `/phases`
- Learning Paths: `/paths`
- About: `/about`
- Content: `/{phase}/{topic}/{depth}`

Example: `/01-discovery-planning/threat-modeling/surface`

## Configuration

### Astro Config (`astro.config.mjs`)

- Site URL: `https://Flossin-Tech.github.io`
- Base path: `/how-to-build-an-app`
- Integrations: MDX, Tailwind
- Output: Static

### Tailwind Config (`tailwind.config.cjs`)

- Dark mode enabled
- Custom color palette (primary, depth indicators)
- Typography plugin for prose styling

## Build Output

Successful build generates:
- **112 static pages** from content
- Optimized CSS (minified)
- Proper HTML structure
- All navigation working

## Known Issues & Solutions

1. **Tailwind Config**: Must use `.cjs` extension for compatibility
2. **README files**: Renamed to `.ignore` to prevent collection conflicts
3. **Unknown languages** (rego, guard): Warnings only, not errors

## Next Steps (Future Enhancements)

- [ ] Learning path pages (personas, tracks, journeys)
- [ ] Client-side search with FlexSearch
- [ ] Progress tracking (localStorage)
- [ ] Mobile navigation improvements
- [ ] Interactive code examples

## Performance

- Lighthouse Score Target: >95
- Build Time: ~3 seconds
- Page Count: 112 pages
- Bundle Size: Optimized by Astro

## License

See parent repository for license information.

## Support

For issues or questions, please refer to the main repository.
