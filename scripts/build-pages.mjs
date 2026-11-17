// Static build for GitHub Pages: `node scripts/build-pages.mjs` writes ./out, ready to publish under
// https://<user>.github.io/<repo>/ (GIEO_BASE_PATH, default /GIEO-SITE).
//
// GitHub Pages serves files only. So, for this build alone:
//   - src/middleware.ts and the on-demand opengraph-image are set aside (and always put back);
//   - every locale is in the URL (src/i18n/routing.ts reads NEXT_PUBLIC_GIEO_STATIC);
//   - paths to public/ files written as "/film/…", "/art/…" in the app get the base path (Next adds it to
//     its own files and links, not to these);
//   - out/index.html sends the bare address to the default locale; .nojekyll lets _next/ through.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.GIEO_BASE_PATH || '/GIEO-SITE';
const aside = ['src/middleware.ts', 'src/app/[locale]/opengraph-image.tsx'].map((f) => path.join(root, f));
const hidden = (f) => `${f}.pages-off`;

let status = 1;
try {
  for (const f of aside) if (fs.existsSync(f)) fs.renameSync(f, hidden(f));
  fs.rmSync(path.join(root, 'out'), { recursive: true, force: true });
  status = spawnSync('npx', ['next', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, GIEO_STATIC: '1', NEXT_PUBLIC_GIEO_STATIC: '1', GIEO_BASE_PATH: base, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || `https://sussyswimmer.github.io${base}` },
  }).status ?? 1;
} finally {
  for (const f of aside) if (fs.existsSync(hidden(f))) fs.renameSync(hidden(f), f);
}
if (status !== 0) process.exit(status);

const out = path.join(root, 'out');
// public/'s top-level folders: a quoted or url()'d "/<folder>/" in the output is a path to one of them.
const dirs = fs.readdirSync(path.join(root, 'public'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const re = new RegExp(`(["'\`(=\\s,])/(${dirs.join('|')})/`, 'g');
let files = 0;
let hits = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      // public/'s own copies hold no app paths
      if (dir === out && dirs.includes(e.name)) continue;
      walk(p);
    } else if (/\.(html|js|css|txt|json)$/.test(e.name)) {
      const src = fs.readFileSync(p, 'utf8');
      let n = 0;
      const next = src.replace(re, (_, lead, d) => (n++, `${lead}${base}/${d}/`));
      if (n) {
        fs.writeFileSync(p, next);
        files++;
        hits += n;
      }
    }
  }
};
walk(out);

fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>GIEO</title><meta http-equiv="refresh" content="0; url=${base}/vi/"><link rel="canonical" href="${base}/vi/"><a href="${base}/vi/">GIEO</a>`,
);
console.log(`pages: ${hits} public paths prefixed with ${base} in ${files} files; out/ is ready`);
