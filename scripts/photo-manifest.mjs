const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function string(value, path, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) fail(path, 'must be a non-empty string');
  if (value.length > 10000) fail(path, 'is too long');
  return value.trim();
}

function dimension(value, path) {
  if (!Number.isInteger(value) || value < 1 || value > 100000) fail(path, 'must be an integer from 1 to 100000');
  return value;
}

function safePath(value, path) {
  let decoded = value;
  // Inspect before URL parsing, which would silently normalize ../ segments.
  for (let i = 0; i < 4; i++) {
    if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.split('/').some((part) => part === '.' || part === '..')) {
      fail(path, 'path traversal, backslashes and control characters are not allowed');
    }
    let next;
    try { next = decodeURIComponent(decoded); } catch { fail(path, 'invalid URL encoding'); }
    if (next === decoded) return;
    decoded = next;
  }
  fail(path, 'excessively nested URL encoding');
}

export function validateSource(value, path = 'src', remoteOnly = false) {
  const source = string(value, path);
  if (source !== value || /\s/.test(source)) fail(path, 'whitespace must be URL-encoded');
  if (/[\\\u0000-\u001f\u007f]/.test(source)) fail(path, 'backslashes and control characters are not allowed');
  if (source.startsWith('https://')) {
    let url;
    try { url = new URL(source); } catch { fail(path, 'invalid HTTPS URL'); }
    if (!url.hostname || url.username || url.password) fail(path, 'must be a public HTTPS URL without credentials');
    const rawPath = source.replace(/^https:\/\/[^/?#]+/, '').split(/[?#]/, 1)[0];
    safePath(rawPath, path);
    return source;
  }
  if (remoteOnly || !source.startsWith('/') || source.startsWith('//') || /[?#]/.test(source)) {
    fail(path, 'must be an HTTPS URL or a root-relative public image path');
  }
  safePath(source, path);
  if (source.endsWith('/')) fail(path, 'must identify an image file');
  return source;
}

export function validateDate(value, path = 'takenAt') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    fail(path, 'use YYYY-MM-DD or an ISO timestamp with timezone');
  }
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || !Number.isFinite(Date.parse(value))) {
    fail(path, 'invalid calendar date');
  }
  if (value.length > 10 && (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59)) fail(path, 'invalid time');
  return value;
}

function photo(value, path) {
  if (!isObject(value)) fail(path, 'must be an object');
  const result = {
    id: string(value.id, `${path}.id`),
    src: validateSource(value.src, `${path}.src`),
    alt: string(value.alt, `${path}.alt`),
    width: dimension(value.width, `${path}.width`),
    height: dimension(value.height, `${path}.height`),
  };
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(result.id)) fail(`${path}.id`, 'use letters, numbers, hyphens or underscores');
  if (value.takenAt !== undefined) result.takenAt = validateDate(value.takenAt, `${path}.takenAt`);
  for (const key of ['camera', 'lens', 'settings']) if (value[key] !== undefined) result[key] = string(value[key], `${path}.${key}`);
  if (value.credit !== undefined) {
    if (!isObject(value.credit)) fail(`${path}.credit`, 'must be an object');
    result.credit = { name: string(value.credit.name, `${path}.credit.name`), url: validateSource(value.credit.url, `${path}.credit.url`, true) };
  }
  if (value.variants !== undefined) {
    if (!Array.isArray(value.variants) || !value.variants.length) fail(`${path}.variants`, 'must be a non-empty array');
    const widths = new Set();
    result.variants = value.variants.map((variant, i) => {
      const at = `${path}.variants[${i}]`;
      if (!isObject(variant)) fail(at, 'must be an object');
      const width = dimension(variant.width, `${at}.width`);
      if (widths.has(width)) fail(at, 'duplicate variant width');
      widths.add(width);
      return { src: validateSource(variant.src, `${at}.src`), width, height: dimension(variant.height, `${at}.height`) };
    }).sort((a, b) => a.width - b.width);
  }
  return result;
}

export function validateAlbums(value) {
  if (!Array.isArray(value)) fail('albums', 'must be an array');
  const slugs = new Set();
  return value.map((album, i) => {
    const path = `albums[${i}]`;
    if (!isObject(album)) fail(path, 'must be an object');
    const slug = string(album.slug, `${path}.slug`);
    if (!slugPattern.test(slug)) fail(`${path}.slug`, 'use lowercase letters, numbers and single hyphens');
    if (slugs.has(slug)) fail(`${path}.slug`, `duplicate album slug ${slug}`);
    slugs.add(slug);
    if (!Number.isInteger(album.year) || album.year < 1800 || album.year > 9999) fail(`${path}.year`, 'must be an integer from 1800 to 9999');
    if (typeof album.demo !== 'boolean') fail(`${path}.demo`, 'must explicitly be true or false');
    if (!Array.isArray(album.photos) || !album.photos.length) fail(`${path}.photos`, 'must contain at least one photo');
    const photos = album.photos.map((item, j) => photo(item, `${path}.photos[${j}]`));
    const ids = new Set(photos.map((item) => item.id));
    if (ids.size !== photos.length) fail(`${path}.photos`, 'duplicate photo IDs within album');
    if (!ids.has(album.cover)) fail(`${path}.cover`, 'must match a photo ID in this album');
    return {
      slug,
      title: string(album.title, `${path}.title`),
      titleEn: string(album.titleEn, `${path}.titleEn`),
      description: string(album.description, `${path}.description`, true),
      location: string(album.location, `${path}.location`, true),
      category: string(album.category, `${path}.category`),
      year: album.year,
      demo: album.demo,
      cover: album.cover,
      photos,
    };
  });
}

export function mergeAlbums(existing, incoming) {
  const albums = new Map(validateAlbums(existing).map((album) => [album.slug, album]));
  for (const album of validateAlbums(incoming)) {
    const previous = albums.get(album.slug);
    const photos = new Map((previous?.photos ?? []).map((item) => [item.id, item]));
    for (const item of album.photos) photos.set(item.id, item);
    albums.set(album.slug, { ...album, photos: [...photos.values()] });
  }
  return validateAlbums([...albums.values()]);
}
