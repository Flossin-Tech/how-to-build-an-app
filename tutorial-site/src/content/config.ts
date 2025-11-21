import { z, defineCollection } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    phase: z.string(),
    topic: z.string(),
    depth: z.enum(['surface', 'mid-depth', 'deep-water']).optional(),
    type: z.string().optional(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    reading_time: z.number().optional(),
    prerequisites: z.array(z.string()).default([]),
    related_topics: z.array(z.string()).default([]),
    personas: z.array(z.string()).default([]),
    updated: z.string().optional(),
  }),
});

export const collections = {
  docs: docsCollection,
};
