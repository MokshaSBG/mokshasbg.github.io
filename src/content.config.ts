import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    stack: z.array(z.string()),
    year: z.string(),
    link: z.string().url().optional(),
    repo: z.string().url().optional(),
    order: z.number().default(99),
  }),
});

export const collections = { projects };
