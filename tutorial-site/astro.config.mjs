// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import rehypeMermaid from 'rehype-mermaid';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://howtobuildanapp.dev',
  base: '/',
  trailingSlash: 'always',
  integrations: [
    mdx(),
    tailwind(),
    icon({
      include: {
        lucide: ['waves', 'anchor', 'fish', 'library', 'compass', 'info', 'sparkles', 'zap', 'search', 'user', 'target', 'bolt'],
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'nord',
      wrap: true,
    },
    rehypePlugins: [
      [rehypeMermaid, { strategy: 'img-svg' }]
    ],
  },
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  output: 'static',
});
