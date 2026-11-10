import { readFile, mkdir, open, rename, unlink, lstat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { mergeAlbums, validateAlbums } from './photo-manifest.mjs';

export const defaultManifestPath = fileURLToPath(new URL('../src/data/albums.json', import.meta.url));

export async function readManifest(destination = defaultManifestPath) {
  try {
    if ((await lstat(destination)).isSymbolicLink()) throw new Error('Refusing to replace a symlink manifest');
    const text = await readFile(destination, 'utf8');
    return { text, albums: validateAlbums(JSON.parse(text)) };
  } catch (error) {
    if (error.code === 'ENOENT') return { text: null, albums: [] };
    throw error;
  }
}

export async function syncAlbums(incoming, { destination = defaultManifestPath, write = false } = {}) {
  const normalized = validateAlbums(incoming);
  const before = await readManifest(destination);
  const albums = mergeAlbums(before.albums, normalized);
  const nextText = `${JSON.stringify(albums, null, 2)}\n`;
  const report = {
    mode: write ? 'write' : 'dry-run',
    added: normalized.filter((item) => !before.albums.some((old) => old.slug === item.slug)).map((item) => item.slug),
    updated: normalized.filter((item) => before.albums.some((old) => old.slug === item.slug)).map((item) => item.slug),
    albums: albums.length,
    photos: albums.reduce((total, item) => total + item.photos.length, 0),
    changed: nextText !== before.text,
    destination,
  };
  if (!write || !report.changed) return report;
  await mkdir(dirname(destination), { recursive: true });
  const temp = `${destination}.${randomUUID()}.tmp`;
  const lock = `${destination}.lock`;
  let handle;
  try {
    handle = await open(lock, 'wx', 0o600);
    // Check after acquiring the lock so a concurrent import cannot lose updates.
    if ((await readManifest(destination)).text !== before.text) throw new Error('Manifest changed during import. Retry after the other writer finishes.');
    const output = await open(temp, 'wx', 0o644);
    try { await output.writeFile(nextText, 'utf8'); await output.sync(); } finally { await output.close(); }
    await rename(temp, destination);
  } finally {
    await unlink(temp).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    if (handle) { await handle.close(); await unlink(lock); }
  }
  return report;
}

async function main(args) {
  if (args.includes('--help')) {
    console.log('Usage: node scripts/sync-photos.mjs --input ./albums-export.json [--write]\nWithout --write, validates and previews the merge without changing files.');
    return;
  }
  let input;
  let write = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1] && !args[i + 1].startsWith('--')) input = args[++i];
    else if (args[i] === '--write') write = true;
    else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  if (!input) throw new Error('--input is required. Use --help for usage.');
  const data = JSON.parse(await readFile(resolve(input), 'utf8'));
  console.log(JSON.stringify(await syncAlbums(data, { write }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { console.error(`Photo sync failed: ${error.message}`); process.exitCode = 1; });
}
