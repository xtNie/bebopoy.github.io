import { defineConfig } from 'astro/config';
// GitHub project Pages needs this prefix. Set SITE_BASE=/ for Cloudflare or a custom domain.
export default defineConfig({
  site: process.env.SITE_URL || 'https://xtnie.github.io',
  base: process.env.SITE_BASE || '/bebopoy.github.io',
  devToolbar: {enabled:false},
  output: 'static', trailingSlash: 'always',
});
