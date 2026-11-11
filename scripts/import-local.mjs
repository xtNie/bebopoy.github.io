import { createHash } from 'node:crypto';
import { readFile, readdir, lstat, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateAlbums, validateDate } from './photo-manifest.mjs';
import { defaultManifestPath, readManifest, syncAlbums } from './sync-photos.mjs';

const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.heic', '.heif']);
const defaultPublicDirectory = fileURLToPath(new URL('../public', import.meta.url));

export async function importLocal(options, { destination = defaultManifestPath, publicDirectory = defaultPublicDirectory } = {}) {
  const { input, slug, write = false } = options;
  if (!input || !slug) throw new Error('--input and --slug are required');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('--slug must contain lowercase letters, numbers and single hyphens');
  if (options.date) validateDate(options.date);
  const sourceDirectory = resolve(input);
  if (!(await lstat(sourceDirectory)).isDirectory()) throw new Error('--input must be a directory (not a symlink)');
  const entries = (await readdir(sourceDirectory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const files = entries.filter((entry) => !entry.name.startsWith('.') && entry.isFile() && supported.has(extname(entry.name).toLowerCase()));
  if (!files.length) throw new Error('No supported images found. Export camera RAW files as JPEG first.');
  const { default: sharp } = await import('sharp');
  const previous = (await readManifest(destination)).albums.find((album) => album.slug === slug);
  const knownPhotos = new Map(previous?.photos.map((photo) => [photo.id, photo]) ?? []);
  const photos = [];
  const generatedFiles = [];
  const duplicates = [];
  const ids = new Set();
  let staging;
  const photosDirectory = join(publicDirectory, 'photos');
  const outputDirectory = join(photosDirectory, slug);
  try {
    if (write) {
      for (const directory of [publicDirectory, photosDirectory, outputDirectory]) {
        try {
          const stat = await lstat(directory);
          if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Refusing to write through a non-directory or symlink: ${directory}`);
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      await mkdir(photosDirectory, { recursive: true });
      staging = await mkdtemp(join(photosDirectory, '.import-'));
    }
    for (const file of files) {
      const original = await readFile(join(sourceDirectory, file.name));
      const id = createHash('sha256').update(original).digest('hex').slice(0, 16);
      if (ids.has(id)) { duplicates.push(file.name); continue; }
      ids.add(id);
      let metadata;
      try { metadata = await sharp(original, { failOn: 'error', limitInputPixels: 100000000 }).metadata(); }
      catch (error) { throw new Error(`${file.name}: cannot decode this image; export as JPEG if its format is unsupported (${error.message})`); }
      if (!metadata.width || !metadata.height) throw new Error(`${file.name}: missing image dimensions`);
      if ((metadata.pages ?? 1) > 1) throw new Error(`${file.name}: multi-page or animated images are not supported; export a single still image`);
      const rotated = [5, 6, 7, 8].includes(metadata.orientation);
      const originalWidth = rotated ? metadata.height : metadata.width;
      const originalHeight = rotated ? metadata.width : metadata.height;
      const widths = [...new Set([800, 1600, 2400].map((width) => Math.min(width, originalWidth)))];
      const variants = [];
      for (const width of widths) {
        const filename = `${id}-${width}.webp`;
        let info = { width, height: Math.max(1, Math.round(originalHeight * width / originalWidth)) };
        if (write) {
          // rotate() honors EXIF orientation. Sharp strips EXIF/GPS by default.
          info = await sharp(original, { failOn: 'error', limitInputPixels: 100000000 })
            .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 86, effort: 5 })
            .toFile(join(staging, filename));
          generatedFiles.push(filename);
        }
        variants.push({ src: `/photos/${slug}/${filename}`, width: info.width, height: info.height });
      }
      const largest = variants.at(-1);
      const existing = knownPhotos.get(id);
      photos.push({
        ...existing,
        id,
        ...largest,
        alt: existing?.alt ?? (basename(file.name, extname(file.name)).replace(/[-_]+/g, ' ').trim() || options.title || slug),
        ...(options.date ? { takenAt: options.date } : {}),
        variants,
      });
    }
    const mergedPhotos = new Map((previous?.photos ?? []).map((photo) => [photo.id, photo]));
    for (const photo of photos) mergedPhotos.set(photo.id, photo);
    const incoming = validateAlbums([{
      slug,
      title: options.title ?? previous?.title ?? slug,
      titleEn: options.titleEn ?? previous?.titleEn ?? options.title ?? slug,
      description: options.description ?? previous?.description ?? '',
      location: options.location ?? previous?.location ?? '',
      category: options.category ?? previous?.category ?? 'Everyday',
      year: options.year ?? previous?.year ?? (options.date ? Number(options.date.slice(0, 4)) : new Date().getFullYear()),
      demo: options.demo ?? previous?.demo ?? false,
      cover: previous?.cover && mergedPhotos.has(previous.cover) ? previous.cover : photos[0].id,
      photos: [...mergedPhotos.values()],
    }]);
    // Validate the complete merge before publishing any derivatives.
    await syncAlbums(incoming, { destination, write: false });
    if (write) {
      await mkdir(outputDirectory, { recursive: true });
      for (const filename of generatedFiles) await rename(join(staging, filename), join(outputDirectory, filename));
    }
    const report = await syncAlbums(incoming, { destination, write });
    return {
      ...report,
      input: sourceDirectory,
      importedPhotos: photos.length,
      derivatives: photos.reduce((total, photo) => total + photo.variants.length, 0),
      skippedDuplicateFiles: duplicates,
      skippedEntries: entries.filter((entry) => !files.includes(entry)).map((entry) => entry.name),
      originals: 'untouched; only WebP derivatives are published',
    };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}

function argumentsFrom(args) {
  const result = {};
  const names = { '--input': 'input', '--slug': 'slug', '--title': 'title', '--title-en': 'titleEn', '--description': 'description', '--location': 'location', '--category': 'category', '--date': 'date', '--year': 'year' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--write') result.write = true;
    else if (args[i] === '--demo') result.demo = true;
    else if (names[args[i]] && args[i + 1] && !args[i + 1].startsWith('--')) {
      const key = names[args[i]];
      result[key] = key === 'year' ? Number(args[++i]) : args[++i];
    } else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/import-local.mjs --input ../photography-originals/trip --slug trip --title Weekend [--write]\nOptional: --title-en, --description, --location, --category, --year, --date YYYY-MM-DD, --demo\nWithout --write, reads metadata and previews the import without changing files.');
  } else {
    Promise.resolve().then(() => importLocal(argumentsFrom(args)))
      .then((report) => console.log(JSON.stringify(report, null, 2)))
      .catch((error) => { console.error(`Local photo import failed: ${error.message}`); process.exitCode = 1; });
  }
}
