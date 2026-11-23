// Self-check for scripts/process-images.mjs. Runs against a temp root, never assets/ or public/.
// Usage: npm run test:images
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { run, visiblePhotos } from './process-images.mjs';

async function makeFixture(file, width, height, exif) {
  let img = sharp({
    create: { width, height, channels: 3, background: { r: 247, g: 240, b: 234 } },
  });
  if (exif) img = img.withMetadata({ exif });
  await img.jpeg().toFile(file);
}

const GPS_EXIF = {
  IFD0: { Artist: 'Fixture Child', ImageDescription: 'fixture with location' },
  IFD3: {
    GPSLatitudeRef: 'N',
    GPSLatitude: '21/1 1/1 30/1',
    GPSLongitudeRef: 'E',
    GPSLongitude: '105/1 50/1 0/1',
  },
};

test('pipeline strips metadata, never upscales, and filters consent in production', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gieo-images-'));
  try {
    const dir = path.join(root, 'assets/photos/journal');
    await fs.mkdir(dir, { recursive: true });
    await makeFixture(path.join(dir, 'consented.jpg'), 1200, 800, GPS_EXIF);
    await makeFixture(path.join(dir, 'tiny.jpg'), 300, 200, GPS_EXIF);
    await makeFixture(path.join(dir, 'private.jpg'), 1200, 800, GPS_EXIF);
    await makeFixture(path.join(dir, 'nocsv.jpg'), 1200, 800, GPS_EXIF);
    await fs.mkdir(path.join(root, 'assets'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'assets/consent.csv'),
      'filename,consent(yes/no),notes\njournal/consented.jpg,yes,ok\njournal/tiny.jpg,yes,\njournal/private.jpg,no,child\n',
    );
    // Alt text lives in the content files as photos.<id>.alt: `consented` has it, `tiny` does not.
    await fs.mkdir(path.join(root, 'src/content'), { recursive: true });
    for (const [l, alt] of [['vi', 'Ảnh thử'], ['en', 'Test photo']]) {
      await fs.writeFile(
        path.join(root, `src/content/${l}.json`),
        JSON.stringify({ photos: { consented: { alt } } }),
      );
    }

    // Sanity: the fixture really carries EXIF and GPS, otherwise the strip check proves nothing.
    const fixtureMeta = await sharp(path.join(dir, 'consented.jpg')).metadata();
    assert.ok(fixtureMeta.exif, 'fixture must carry EXIF');

    const { photos, warnings } = await run({ root });
    const byId = Object.fromEntries(photos.map((p) => [p.id, p]));
    assert.deepEqual(Object.keys(byId).sort(), ['consented', 'nocsv', 'private', 'tiny']);

    // Widths: 1200 px original gets 640, 1024 and its own 1200 (no 1600 or 2400); 300 px gets 300 only.
    assert.deepEqual(byId.consented.variants.map((v) => v.w), [640, 1024, 1200]);
    assert.deepEqual(byId.tiny.variants.map((v) => v.w), [300]);

    // Every written file: no EXIF/XMP/IPTC (so no GPS), and width never above the original.
    for (const [photo, original] of [[byId.consented, 1200], [byId.tiny, 300]]) {
      for (const v of photo.variants) {
        for (const ext of ['avif', 'webp']) {
          const file = path.join(root, 'public', v[ext]);
          const m = await sharp(await fs.readFile(file)).metadata();
          assert.equal(m.exif, undefined, `${file} still has EXIF`);
          assert.equal(m.xmp, undefined, `${file} still has XMP`);
          assert.equal(m.iptc, undefined, `${file} still has IPTC`);
          assert.equal(m.width, v.w);
          assert.ok(m.width <= original, `${file} was upscaled`);
        }
      }
    }

    // Consent: no-consent and missing-CSV photos write no files at all.
    assert.equal(byId.private.consent, false);
    assert.equal(byId.nocsv.consent, false);
    assert.deepEqual(byId.private.variants, []);
    assert.equal(existsSync(path.join(root, 'public/img/journal/private-640.webp')), false);
    assert.equal(existsSync(path.join(root, 'public/img/journal/nocsv-640.webp')), false);
    assert.ok(warnings.some((w) => w.includes('journal/nocsv.jpg')), 'missing CSV row must warn');

    // Alt text: never copied into the manifest; a consented photo without the content key warns.
    assert.equal('alt' in byId.consented, false);
    assert.ok(warnings.some((w) => w.includes('journal/tiny.jpg') && w.includes('photos.tiny.alt')));
    assert.ok(!warnings.some((w) => w.includes('photos.consented.alt')), 'consented has alt in both files');
    assert.ok(!warnings.some((w) => w.includes('photos.private.alt')), 'no alt warning without consent');

    // Production filter: only consent === true. Dev keeps everything.
    assert.deepEqual(visiblePhotos(photos, true).map((p) => p.id).sort(), ['consented', 'tiny']);
    assert.equal(visiblePhotos(photos, false).length, 4);

    // The manifest on disk is what photos.ts reads.
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/lib/photos-manifest.json'), 'utf8'));
    assert.equal(manifest.photos.length, 4);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
