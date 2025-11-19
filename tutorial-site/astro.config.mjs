// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import rehypeMermaid from 'rehype-mermaid';

// https://astro.build/config
export default defineConfig({
  site: 'https://Flossin-Tech.github.io',
  base: '/how-to-build-an-app',
  trailingSlash: 'always',
  integrations: [
    mdx(),
    tailwind(),
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
