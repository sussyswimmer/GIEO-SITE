// Checks src/content/{en,vi}.json against src/content/_meta.json and the client docs.
// Usage: node scripts/check-content.mjs   (exit 0 = pass, 1 = fail)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const en = JSON.parse(read("src/content/en.json"));
const vi = JSON.parse(read("src/content/vi.json"));
const meta = JSON.parse(read("src/content/_meta.json"));
const sourceText = ["docs/02-content.md", "docs/01-brand.md", "CLAUDE.md"]
  .map((p) => read(p).normalize("NFC"))
  .join("\n");

const failures = [];
const warnings = [];

function leaves(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) leaves(v, p, out);
    else out.set(p, v);
  }
  return out;
}

const enL = leaves(en);
const viL = leaves(vi);
const draft = new Set(meta.draftKeys ?? []);

// (a) identical key trees
const enKeys = [...enL.keys()].sort();
const viKeys = [...viL.keys()].sort();
const onlyEn = enKeys.filter((k) => !viL.has(k));
const onlyVi = viKeys.filter((k) => !enL.has(k));
if (onlyEn.length) failures.push(`(a) keys only in en.json: ${onlyEn.join(", ")}`);
if (onlyVi.length) failures.push(`(a) keys only in vi.json: ${onlyVi.join(", ")}`);
for (const [lang, L] of [["en", enL], ["vi", viL]]) {
  for (const [p, v] of L) {
    if (typeof v !== "string") failures.push(`(a) ${lang}.${p} is not a string`);
  }
}

// (c) every string is NFC
for (const [lang, L] of [["en", enL], ["vi", viL]]) {
  for (const [p, v] of L) {
    if (typeof v === "string" && v !== v.normalize("NFC")) failures.push(`(c) ${lang}.${p} is not NFC`);
  }
}

// (d) every draft and todo key path exists
const todoKeys = (meta.todo ?? []).map((t) => t.key);
for (const p of [...draft, ...todoKeys]) {
  if (!enL.has(p) || !viL.has(p)) failures.push(`(d) key path does not exist in both files: ${p}`);
}
for (const t of meta.todo ?? []) {
  if (!t.tag) failures.push(`(d) todo entry has no tag: ${t.key}`);
}

// (b) every non-DRAFT, non-empty string appears verbatim (NFC) in the client docs
for (const [lang, L] of [["en", enL], ["vi", viL]]) {
  for (const [p, v] of L) {
    if (typeof v !== "string" || v === "" || draft.has(p)) continue;
    if (!sourceText.includes(v.normalize("NFC"))) {
      failures.push(`(b) ${lang}.${p} is not verbatim in docs and is not listed in draftKeys`);
    }
  }
}

// Warning only: digits inside DRAFT strings (stats must never be invented).
for (const [lang, L] of [["en", enL], ["vi", viL]]) {
  for (const [p, v] of L) {
    if (draft.has(p) && typeof v === "string" && /\d/.test(v)) {
      warnings.push(`digit in DRAFT string ${lang}.${p}: "${v}"`);
    }
  }
}

for (const w of warnings) console.warn(`WARN ${w}`);
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`check-content: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(
  `check-content: OK (${enL.size} keys, ${draft.size} draft, ${todoKeys.length} todo, ${warnings.length} warning(s))`,
);
