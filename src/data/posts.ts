import type {MarkdownInstance} from 'astro';
type Frontmatter={title?:string;date?:string;tags?:string[];description?:string};
const modules=import.meta.glob<MarkdownInstance<Frontmatter>>('../../content/**/*.md',{eager:true});
export const posts=Object.entries(modules).filter(([path])=>!path.endsWith('/me.md')&&!path.endsWith('/404.md')).map(([path,entry])=>({slug:path.split('/content/')[1].replace(/\.md$/,'').toLowerCase(),entry,title:entry.frontmatter.title||path.split('/').at(-1)!.replace('.md',''),date:String(entry.frontmatter.date||''),tags:entry.frontmatter.tags||[]})).sort((a,b)=>b.date.localeCompare(a.date));
