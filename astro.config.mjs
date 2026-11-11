import { defineConfig } from 'astro/config';
// The personal site is served at the root of xtnie.github.io.
export default defineConfig({
  site: process.env.SITE_URL || 'https://xtnie.github.io',
  base: process.env.SITE_BASE || '/',
  devToolbar: {enabled:false},
  output: 'static', trailingSlash: 'always',
});
