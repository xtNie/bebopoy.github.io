import data from './research.json';

export type ResearchType = 'paper' | 'project';
export type ResearchLink = 'paper' | 'code' | 'data' | 'demo';
export interface ResearchItem {
  slug: string;
  type: ResearchType;
  title: string;
  authors?: string[];
  year: number;
  venue?: string;
  summary: string;
  links: Partial<Record<ResearchLink, string>>;
  status?: string;
  featured?: boolean;
}

export const researchTypeLabel: Record<ResearchType, string> = { paper: 'Publication', project: 'Project' };
export const researchLinkLabel: Record<ResearchLink, string> = { paper: 'Paper', code: 'Code', data: 'Data', demo: 'Demo' };

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string.`);
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function externalUrl(value: unknown, field: string): string {
  const href = text(value, field);
  if (/[\s\\\u0000-\u001f\u007f]/.test(href)) throw new Error(`${field} contains invalid URL characters.`);
  let parsed: URL;
  try { parsed = new URL(href); } catch { throw new Error(`${field} must be a complete HTTPS URL.`); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error(`${field} must be an HTTPS URL without embedded credentials.`);
  }
  return href;
}

/** Runs during Astro builds as well as development, including direct JSON edits. */
export function validateResearch(value: unknown): ResearchItem[] {
  if (!Array.isArray(value)) throw new Error('research.json must contain an array.');
  const slugs = new Set<string>();
  return value.map((entry, index) => {
    const field = `research[${index}]`;
    if (!isRecord(entry)) throw new Error(`${field} must be an object.`);
    const slug = text(entry.slug, `${field}.slug`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${field}.slug must use lowercase letters, numbers, and single hyphens.`);
    if (slugs.has(slug)) throw new Error(`${field}.slug duplicates "${slug}".`);
    slugs.add(slug);
    if (entry.type !== 'paper' && entry.type !== 'project') throw new Error(`${field}.type must be "paper" or "project".`);
    if (!Number.isInteger(entry.year) || (entry.year as number) < 1800 || (entry.year as number) > 9999) {
      throw new Error(`${field}.year must be a four-digit year from 1800 onwards.`);
    }
    if (!isRecord(entry.links)) throw new Error(`${field}.links must be an object (it may be empty).`);
    const links: ResearchItem['links'] = {};
    for (const [key, value] of Object.entries(entry.links)) {
      if (!Object.hasOwn(researchLinkLabel, key)) throw new Error(`${field}.links.${key} is not supported; use paper, code, data, or demo.`);
      links[key as ResearchLink] = externalUrl(value, `${field}.links.${key}`);
    }
    const result: ResearchItem = {
      slug,
      type: entry.type,
      title: text(entry.title, `${field}.title`),
      year: entry.year as number,
      summary: text(entry.summary, `${field}.summary`),
      links,
    };
    if (entry.authors !== undefined) {
      if (!Array.isArray(entry.authors) || entry.authors.length === 0) throw new Error(`${field}.authors must be a non-empty array of names when provided.`);
      result.authors = entry.authors.map((author, i) => text(author, `${field}.authors[${i}]`));
    }
    for (const key of ['venue', 'status'] as const) {
      if (entry[key] !== undefined) result[key] = text(entry[key], `${field}.${key}`);
    }
    if (entry.featured !== undefined) {
      if (typeof entry.featured !== 'boolean') throw new Error(`${field}.featured must be true or false.`);
      result.featured = entry.featured;
    }
    return result;
  });
}

export const researchItems = validateResearch(data).sort((a, b) => b.year - a.year);
const selected = researchItems.filter((item) => item.featured);
export const featuredResearch = (selected.length ? selected : researchItems).slice(0, 3);
