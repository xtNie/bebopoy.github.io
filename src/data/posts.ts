import type { MarkdownInstance } from 'astro';
type Frontmatter = { title?: string; date?: string | Date; tags?: string[]; description?: string; draft?: boolean };
const modules = import.meta.glob<MarkdownInstance<Frontmatter>>('../../content/**/*.md', { eager: true });
export const posts = Object.entries(modules)
  .filter(([path, entry]) => !path.endsWith('/me.md') && !path.endsWith('/404.md') && entry.frontmatter.draft !== true)
  .map(([path, entry]) => ({
    slug: path.split('/content/')[1].replace(/\.md$/, '').toLowerCase(),
    entry,
    title: entry.frontmatter.title || path.split('/').at(-1)!.replace('.md', ''),
    description: entry.frontmatter.description,
    date: entry.frontmatter.date instanceof Date ? entry.frontmatter.date.toISOString() : String(entry.frontmatter.date || ''),
    tags: entry.frontmatter.tags || [],
  }))
  .sort((a, b) => b.date.localeCompare(a.date));
