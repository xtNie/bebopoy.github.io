import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm, access, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateAlbums, mergeAlbums } from '../scripts/photo-manifest.mjs';
import { syncAlbums } from '../scripts/sync-photos.mjs';
import { importLocal } from '../scripts/import-local.mjs';

const picture = (id = 'photo-1') => ({ id, src: `/photos/walk/${id}.webp`, alt: '街角的光', width: 1600, height: 1067, takenAt: '2024-02-29' });
const album = (slug = 'walk') => ({ slug, title: '散步', titleEn: 'A walk', description: '', location: '', category: '日常', year: 2024, demo: false, cover: 'photo-1', photos: [picture()] });

test('rejects invalid dates, unsafe URLs, duplicate identifiers and broken covers', () => {
  for (const takenAt of ['2023-02-29', '2024-02-30', '2024-01-01T24:00:00Z', 'yesterday']) {
    const value = album(); value.photos[0].takenAt = takenAt;
    assert.throws(() => validateAlbums([value]), /date|time|YYYY/);
  }
  for (const src of ['javascript:alert(1)', 'http://example.com/a.jpg', '//example.com/a.jpg', '/photos/../a.jpg', '/photos/%2e%2e/a.jpg', 'https://example.com/../a.jpg', 'https://name:password@example.com/a.jpg', '/photos\\secret.jpg']) {
    const value = album(); value.photos[0].src = src;
    assert.throws(() => validateAlbums([value]), /HTTPS|credentials|traversal|backslashes/);
  }
  assert.throws(() => validateAlbums([album(), album()]), /duplicate album/);
  assert.throws(() => validateAlbums([{ ...album(), photos: [picture(), picture()] }]), /duplicate photo/);
  assert.throws(() => validateAlbums([{ ...album(), cover: 'missing' }]), /cover/);
  assert.throws(() => validateAlbums([{ ...album(), photos: [{ ...picture(), width: 0 }] }]), /width/);
});

test('accepts R2 HTTPS URLs and valid leap-day metadata', () => {
  const value = album();
  value.photos[0].src = 'https://photos.example.com/walk/a.webp';
  value.photos[0].takenAt = '2024-02-29T08:30:00+08:00';
  assert.equal(validateAlbums([value])[0].photos[0].takenAt, value.photos[0].takenAt);
});

test('merges by album slug and photo ID without deleting unrelated work', () => {
  const existing = [album(), album('older')];
  const incoming = { ...album(), title: '新的散步', cover: 'photo-2', photos: [picture('photo-2')] };
  const merged = mergeAlbums(existing, [incoming]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, '新的散步');
  assert.deepEqual(merged[0].photos.map((item) => item.id), ['photo-1', 'photo-2']);
  assert.deepEqual(merged[1], existing[1]);
});

test('dry-run makes no files, write is atomic, and invalid input leaves existing bytes intact', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'photo-sync-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, 'new-directory', 'albums.json');
  const preview = await syncAlbums([album()], { destination });
  assert.equal(preview.mode, 'dry-run');
  await assert.rejects(access(join(directory, 'new-directory')));
  await syncAlbums([album()], { destination, write: true });
  const before = await readFile(destination, 'utf8');
  await assert.rejects(syncAlbums([{ ...album(), cover: 'missing' }], { destination, write: true }));
  assert.equal(await readFile(destination, 'utf8'), before);
  await writeFile(`${destination}.lock`, 'another importer');
  await assert.rejects(syncAlbums([{ ...album(), title: 'new title' }], { destination, write: true }), /EEXIST/);
  assert.equal(await readFile(destination, 'utf8'), before);
  assert.equal(await readFile(`${destination}.lock`, 'utf8'), 'another importer');
});

test('local import retains originals, requires write, produces sized WebP and deduplicates', async (t) => {
  const { default: sharp } = await import('sharp');
  const directory = await mkdtemp(join(tmpdir(), 'photo-local-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = join(directory, 'originals');
  const publicDirectory = join(directory, 'public');
  const destination = join(directory, 'data', 'albums.json');
  await mkdir(input);
  const original = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: '#898476' } }).png().toBuffer();
  await writeFile(join(input, 'walk.png'), original);
  await writeFile(join(input, 'same-picture.png'), original);
  const options = { input, slug: 'walk', title: '散步', date: '2024-02-29' };
  const preview = await importLocal(options, { destination, publicDirectory });
  assert.equal(preview.importedPhotos, 1);
  assert.equal(preview.derivatives, 3);
  assert.equal(preview.skippedDuplicateFiles.length, 1);
  await assert.rejects(access(publicDirectory));
  await assert.rejects(access(destination));
  await importLocal({ ...options, write: true }, { destination, publicDirectory });
  assert.deepEqual(await readFile(join(input, 'walk.png')), original);
  const data = JSON.parse(await readFile(destination, 'utf8'));
  assert.equal(data[0].photos.length, 1);
  assert.equal(data[0].demo, false);
  assert.deepEqual(data[0].photos[0].variants.map((variant) => variant.width), [800, 1600, 1800]);
  for (const variant of data[0].photos[0].variants) {
    const metadata = await sharp(join(publicDirectory, variant.src)).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, variant.width);
    assert.equal(metadata.height, variant.height);
    assert.equal(metadata.exif, undefined);
  }
  const before = await readFile(destination, 'utf8');
  await importLocal({ ...options, write: true }, { destination, publicDirectory });
  assert.equal(await readFile(destination, 'utf8'), before);
  const secondDirectory = join(directory, 'new-photos');
  await mkdir(secondDirectory);
  await sharp({ create: { width: 900, height: 600, channels: 3, background: '#223344' } }).png().toFile(join(secondDirectory, 'second.png'));
  await importLocal({ ...options, input: secondDirectory, write: true }, { destination, publicDirectory });
  const updated = JSON.parse(await readFile(destination, 'utf8'));
  assert.equal(updated[0].photos.length, 2);
  assert.equal(updated[0].cover, data[0].cover, 'incremental imports preserve the chosen cover');
});

test('local import rejects symlink output directories before writing images', async (t) => {
  const { default: sharp } = await import('sharp');
  const directory = await mkdtemp(join(tmpdir(), 'photo-symlink-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = join(directory, 'originals');
  const publicDirectory = join(directory, 'public');
  await mkdir(input);
  await sharp({ create: { width: 10, height: 10, channels: 3, background: '#223344' } }).png().toFile(join(input, 'a.png'));
  await symlink(input, publicDirectory);
  await assert.rejects(importLocal({ input, slug: 'walk', write: true }, { destination: join(directory, 'albums.json'), publicDirectory }), /symlink/);
  await assert.rejects(access(join(input, 'photos')));
});
