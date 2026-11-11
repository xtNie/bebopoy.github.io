# Xiangtong Nie

A personal website for research, writing, and photography, built with Astro. The public interface is in English, with a restrained typographic layout and a separate photography gallery.

- Research entries support publications, projects, authors, venues, abstracts, and resource links. No sample research is published.
- Markdown writing supports drafts. The inherited template post is retained as a draft.
- Photography includes collection and photograph views, category filters, a keyboard/touch lightbox, and credited sample photographs.
- Light and dark appearances, responsive layouts, and static GitHub Pages deployment.

## Run locally

Node 22.19+ and pnpm 10.11:

```sh
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
```

## Add content

See [the content guide](docs/CONTENT.md) for research and writing. Profile details live in `src/data/site.ts`, `src/pages/index.astro`, and `src/pages/about.astro`.

Keep original photographs in `../photography-originals/`, next to this checkout. Use one folder per collection. Originals are not committed or uploaded by the importer.

```sh
pnpm photos:import --input ../photography-originals/weekend --slug weekend --title "Weekend"
# Review the dry run, then write optimized copies and the manifest:
pnpm photos:import --input ../photography-originals/weekend --slug weekend --title "Weekend" --write
pnpm build
```

The importer produces responsive WebP files and updates `src/data/albums.json`. Remove sample collections from that file when replacing them with your work. Sample credits are in `public/photos/demo/CREDITS.txt`. See [the photography guide](docs/PHOTOS.md).

## Deploy

Canonical address: **https://xtnie.github.io/**. The GitHub user-site repository must be named **xtnie.github.io** under **xtNie**. In Settings → Pages, select **GitHub Actions** as the deployment source. The workflow checks, tests, and builds pull requests; pushes to `master` also deploy.

The default base path is `/`. For a temporary project-site deployment, set `SITE_BASE` to its repository path. `SITE_URL` defaults to `https://xtnie.github.io`.

Cloudflare Pages can also build this repository with `pnpm build`, output directory `dist`, and `SITE_URL` set to the chosen domain. No server adapter is required. Image URLs may use an R2 custom domain. The current implementation serves optimized local images; it has not provisioned Cloudflare/R2 or connected AfterFrame. Future AfterFrame exports can pass through `photos:sync` for manifest validation. Never commit credentials.

The original Nuxt source remains available for reference. Astro builds only the current `src/` application and eligible Markdown in `content/`; Git history preserves earlier versions.
