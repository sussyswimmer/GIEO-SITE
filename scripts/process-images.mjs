// Turns assets/photos/<collection>/** into public/img/<collection>/ (AVIF + WebP) and writes
// src/lib/photos-manifest.json, which src/lib/photos.ts reads.
// Usage: node scripts/process-images.mjs [--root <dir>]   (--root defaults to the repo root)
//
// Privacy: EXIF/GPS and all other metadata are dropped (no withMetadata call; sharp strips by
// default). A photo whose consent is not "yes" in assets/consent.csv is listed in the manifest
// with consent:false and writes NO files, so it never reaches public/.
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { REDACTIONS, redact } from './redact-photos.mjs';

export const COLLECTIONS = ['products', 'journal', 'artisans', 'team', 'brocade'];
export const WIDTHS = [640, 1024, 1600, 2400];
const IMG_EXT = /\.(jpe?g|png|webp|tiff?|avif)$/i;

export function slugify(s) {
  return s
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/** Production shows only consent === true; dev shows everything. photos.ts applies the same rule. */
export function visiblePhotos(photos, production) {
  return photos.filter((p) => !production || p.consent === true);
}

/** Parses consent.csv (filename,consent(yes/no),notes). Only the first two fields are read. */
export function parseConsent(text) {
  const rows = new Map();
  const warnings = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || /^filename\s*,/i.test(line)) continue;
    const [file, value] = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
    const v = (value ?? '').toLowerCase();
    if (v !== 'yes' && v !== 'no') {
      warnings.push(`consent.csv: "${file}" has consent "${value ?? ''}", expected yes or no; treated as no`);
    }
    rows.set(file.replace(/\\/g, '/'), v === 'yes');
  }
  return { rows, warnings };
}

// A row keyed "collection/file.jpg" matches exactly. A bare "file.jpg" matches only when that
// basename is unique in the tree, so one row can never grant consent to another folder's file.
function lookup(map, key, tree) {
  if (map.has(key)) return { hit: true, value: map.get(key) };
  const base = path.posix.basename(key);
  if (map.has(base) && tree.filter((k) => path.posix.basename(k) === base).length === 1) {
    return { hit: true, value: map.get(base) };
  }
  return { hit: false };
}

async function walk(dir, rel = '') {
  const out = [];
  for (const e of await fs.readdir(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(dir, r)));
    else if (IMG_EXT.test(e.name)) out.push(r);
  }
  return out.sort();
}

async function processOne({ root, entry, consent }) {
  const { collection, rel, key } = entry;
  const input = path.join(root, 'assets/photos', key);
  // rotate() applies the EXIF orientation before the metadata is dropped.
  const base = await sharp(input).rotate().toBuffer();
  const { width: W, height: H } = await sharp(base).metadata();
  const id = slugify(rel.replace(IMG_EXT, '').replace(/\//g, '-'));
  const photo = {
    id,
    collection,
    src: '',
    width: W,
    height: H,
    consent,
    blurDataURL: '',
    variants: [],
  };
  if (!consent) return photo;

  const outDir = path.join(root, 'public/img', collection);
  await fs.mkdir(outDir, { recursive: true });
  // Never upscale: keep every target width up to the original, plus the original width itself when
  // it is below the largest target, so a small original is still served at its full size.
  const widths = WIDTHS.filter((w) => w <= W);
  if (W < WIDTHS[WIDTHS.length - 1] && !widths.includes(W)) widths.push(W);
  for (const w of widths) {
    const name = `${id}-${w}`;
    const pipeline = () => sharp(base).resize({ width: w, withoutEnlargement: true });
    await pipeline().avif({ quality: 55 }).toFile(path.join(outDir, `${name}.avif`));
    await pipeline().webp({ quality: 82 }).toFile(path.join(outDir, `${name}.webp`));
    photo.variants.push({
      w,
      avif: `/img/${collection}/${name}.avif`,
      webp: `/img/${collection}/${name}.webp`,
    });
  }
  const srcVariant = [...photo.variants].reverse().find((v) => v.w <= 1600) ?? photo.variants[0];
  photo.src = srcVariant.webp;
  photo.width = srcVariant.w;
  photo.height = Math.round((H * srcVariant.w) / W);
  const blur = await sharp(base).resize({ width: Math.min(16, W) }).webp({ quality: 40 }).toBuffer();
  photo.blurDataURL = `data:image/webp;base64,${blur.toString('base64')}`;
  return photo;
}


/** Runs the whole pipeline against `root`. Returns the manifest photos and warnings. */
export async function run({ root }) {
  const photosDir = path.join(root, 'assets/photos');
  const warnings = [];

  const consentPath = path.join(root, 'assets/consent.csv');
  const consentParsed = existsSync(consentPath)
    ? parseConsent(await fs.readFile(consentPath, 'utf8'))
    : { rows: new Map(), warnings: [] };
  warnings.push(...consentParsed.warnings);
  // Alt text is copy: photos.<id>.alt in src/content/{vi,en}.json (PLAN.md §5). Only checked here.
  const content = {};
  for (const l of ['vi', 'en']) {
    const file = path.join(root, `src/content/${l}.json`);
    content[l] = existsSync(file) ? JSON.parse(await fs.readFile(file, 'utf8')) : {};
  }

  const entries = [];
  for (const collection of COLLECTIONS) {
    const dir = path.join(photosDir, collection);
    if (!existsSync(dir)) continue;
    for (const rel of await walk(dir)) entries.push({ collection, rel, key: `${collection}/${rel}` });
  }
  const tree = entries.map((e) => e.key);
  // A file with redaction boxes (sign text, number plates) must already be blurred in assets/, so an
  // original copied back over it can never reach public/.
  const listed = Object.fromEntries(Object.entries(REDACTIONS).filter(([k]) => tree.includes(k)));
  for (const r of await redact({ root, check: true, redactions: listed })) {
    if (r.open.length) {
      throw new Error(`${r.file} is not redacted (${r.open.join('; ')}). Run: node scripts/redact-photos.mjs`);
    }
  }
  for (const k of consentParsed.rows.keys()) {
    if (!tree.some((t) => t === k || path.posix.basename(t) === k)) {
      warnings.push(`consent.csv row "${k}" matches no file`);
    }
  }

  // Clear old outputs so a deleted original does not leave a public file behind.
  for (const c of COLLECTIONS) await fs.rm(path.join(root, 'public/img', c), { recursive: true, force: true });

  const photos = [];
  const seen = new Set();
  for (const entry of entries) {
    const id = slugify(entry.rel.replace(IMG_EXT, '').replace(/\//g, '-'));
    // Ids key the alt text (photos.<id>.alt), so they must be unique across collections.
    if (seen.has(id)) throw new Error(`Two originals map to id "${id}" (${entry.key}). Rename one.`);
    seen.add(id);

    const c = lookup(consentParsed.rows, entry.key, tree);
    const consent = c.hit && c.value === true;
    if (!c.hit) warnings.push(`${entry.key}: no consent.csv row, treated as consent:false`);

    const missing = Object.keys(content).filter((l) => !content[l]?.photos?.[id]?.alt);
    if (consent && missing.length) {
      warnings.push(`${entry.key}: no photos.${id}.alt in src/content/{${missing}}.json, so it will not render`);
    }

    try {
      photos.push(await processOne({ root, entry, consent }));
    } catch (err) {
      throw new Error(`Failed on ${entry.key}: ${err.message}`, { cause: err });
    }
  }
  const order = (c) => COLLECTIONS.indexOf(c);
  photos.sort((x, y) => order(x.collection) - order(y.collection) || x.id.localeCompare(y.id));

  const manifestPath = path.join(root, 'src/lib/photos-manifest.json');
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify({ photos }, null, 2)}\n`);
  return { photos, warnings };
}

function parseArgs(argv) {
  const i = argv.indexOf('--root');
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  return { root: i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : repo };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { root } = parseArgs(process.argv.slice(2));
  const { photos, warnings } = await run({ root });
  for (const w of warnings) console.warn(`warn: ${w}`);
  const kept = photos.filter((p) => p.consent).length;
  console.log(`Processed ${photos.length} photos (${kept} with consent: true). Manifest written.`);
}
