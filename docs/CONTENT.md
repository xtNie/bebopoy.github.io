# Maintaining the personal website

The site puts research first, writing second, and photography last. Public content should describe real work and verified biographical details. Missing information is omitted; the site does not generate publications, achievements, affiliations, or research interests.

## Research and projects

Edit `src/data/research.json`. It is initially an empty array because no public research entries have been supplied. The research page displays “No public entries yet.” until real entries are added. No empty project cards or invented publication counts are rendered.

Each entry uses the following fields:

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | string | Stable URL identifier, using lowercase letters, numbers, and single hyphens. |
| `type` | `"paper"` or `"project"` | Distinguishes a publication from a project. |
| `title` | string | Exact publication title or actual project name. |
| `authors` | optional string array | Preserve the original author order and spelling. Omit when inapplicable. |
| `year` | integer | Actual publication or project year. |
| `venue` | optional string | Journal, conference, repository, or other accurately named venue. |
| `summary` | string | A factual description. Separate paragraphs with `\n\n`; HTML and Markdown are not interpreted. |
| `links` | object | Any of `paper`, `code`, `data`, and `demo`, each containing a full HTTPS URL. An empty object is valid. |
| `status` | optional string | Use accurate wording, such as “Preprint,” when the distinction matters. Do not imply acceptance or publication before it occurs. |
| `featured` | optional boolean | Set to `true` to select an item for the home page. |

Each entry creates `/research/<slug>/`. Research pages are sorted by year, newest first. `featuredResearch` exports up to three explicitly featured entries; if none are selected, it uses the three newest real entries. With an empty file it remains empty.

Validation runs when the research module is loaded during development or production builds. It rejects duplicate slugs, unsupported types or resource keys, invalid years, blank required fields, and unsafe resource URLs. HTTPS links must not embed credentials. Optional fields should be omitted rather than filled with empty strings or speculative information.

Publication detail pages include citation title, ordered authors, and publication year metadata. The schema deliberately does not infer a PDF address, journal title, DOI, acceptance date, or author affiliation from other fields. Extend the schema explicitly if verified information needs additional fields.

## Essays and notes

Writing is stored as Markdown under `content/`. The loader keeps the original folder hierarchy, makes lowercase URL slugs, and excludes the old `me.md`, `404.md`, and any article with `draft: true` from public lists and generated article routes. For a new essay, use a stable lowercase filename, such as `content/essays/reading-notes.md`.

Supported front matter:

```yaml
---
title: The actual title of your essay
date: '2026-11-11'
description: A concise description of the essay.
draft: true
tags:
  - reading
---
```

Write the essay below the closing `---`. Use the actual publication date rather than the example date above. When it is ready to publish, remove `draft: true` or change it to the unquoted boolean `false`. The flag must be a YAML boolean: the quoted string `"true"` does not hide an article. The original example article is retained as a draft. Markdown headings, paragraphs, lists, code, links, and images are rendered by Astro. Published writing appears at `/writing/`, and the loader derives an article route at `/p/<folder>/<filename>/`.

Use `draft: true` for unfinished essays that may be stored in the repository. It is a publishing flag, not access control: source files in a public GitHub repository remain publicly readable. Keep private notes and confidential material outside the repository. Avoid filenames that differ only in capitalization, since article slugs are lowercased.

## Photographs

See [PHOTOS.md](PHOTOS.md) for the local import workflow, manifest format, and optional future R2 / AfterFrame integration. Photographs live in the dedicated gallery. The academic home page uses only a small preview at the end, with any sample photographs explicitly credited.

## Check an update

From the repository root:

```sh
pnpm check
pnpm test
pnpm build
```

Review the generated page before committing. A successful build validates structure and links' URL format; it does not establish that a publication claim is true or that an external destination is available.
