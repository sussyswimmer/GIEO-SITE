# GIEO website: handoff

How the site is put together, how GIEO changes it without a developer where that is possible, and what is still open before launch. Written 2026-11-24 at the end of Phase 7 (`docs/05-build-plan.md`).

## 1. What lives where

| You want to change | It lives in | Needs a developer? |
|---|---|---|
| Any visible words, both languages | `src/content/vi.json`, `src/content/en.json` | No (section 3) |
| Email, Instagram, Facebook addresses | `src/lib/site.ts` | Small code edit |
| Photos (products, brocade, journal, artisans, team) | `assets/photos/<collection>/` + `assets/consent.csv` | Run one script (section 4) |
| A new collection (a second ethnic group's pattern) | content keys + photos + one block in the Collections page | Yes (section 5) |
| The logo | `src/components/ui/Logo.tsx` | Yes, once GIEO sends the SVG (section 6) |
| Colours and type | `src/styles/tokens.css` (only there) | Yes |
| The three scroll films (seed, weave, lotus) | `blender/` scripts, rendered with `npm run film` | Yes, plus Blender |

The site is Next.js 15 with next-intl. Vietnamese is the default language at `/`; English is at `/en`. Pages: home, `/collections`, `/about`, `/get-involved`, `/contact` (and the same under `/en`).

## 2. Running it

Node 22 and npm 11 (npm 10 reads the lockfile as out of date and `npm ci` refuses; `npx npm@11 ci` works with either).

```bash
npx npm@11 ci
```

```bash
npm run dev
```

The dev server does not see files added to `public/` after it started; restart it. Checks are always run on a production build:

```bash
npm run build && npx next start -p 3101
```

## 3. Editing copy

1. Open `src/content/en.json` and `src/content/vi.json`.
2. Change the value at the same key in both files. Never rename or move a key.
3. Run `npm run content:check`. It must print `OK`.
4. If the string was a DRAFT and GIEO has now approved it, delete its line from `draftKeys` in `src/content/_meta.json`.

Vietnamese must be typed with its real diacritics (ă, ơ, ư, ỗ…), never stripped. An empty string (`""`) means "not known yet": it renders nothing on the live site. Do not fill an empty string with a guess, and never add a number (people helped, workshops run) that GIEO has not confirmed in writing. Full rules: `src/content/README.md`.

**79 strings are DRAFT** (button labels, page intros, the Vietnamese versions of English-only lines). They are listed in `src/content/_meta.json` under `draftKeys`. GIEO needs to read and approve them before launch.

## 4. Adding or swapping photos

1. Put the original files in `assets/photos/<collection>/`. Collections: `products` (file names start with `tote`, `mug` or `coaster`), `brocade`, `journal`, `artisans`, `team`.
2. Add one row per photo with any person in it to `assets/consent.csv`: `filename,consent,notes`, consent is `yes` or `no`. A photo without `yes` is never copied into the site.
3. Run `npm run images`. It makes AVIF and WebP files in four widths under `public/img/`, strips all EXIF and GPS data, and updates `src/lib/photos-manifest.json`. Do not edit the manifest by hand.
4. Add the alt text in both languages as `photos.<id>.alt` in `vi.json` and `en.json` (`<id>` is printed by the script). A photo without alt text in both files is not shown.
5. Rebuild.

Privacy rules (not optional): only photos with consent. Never put a girl's name or village next to her face, in alt text or anywhere else. Hands, looms, landscapes and products need no consent row.

## 5. Adding a collection

Today the site has one collection, H'mong brocade, and the Collections page renders it explicitly. A second one needs a developer:

1. Copy keys: add `collections.<slug>.name`, `.body` and `.credit` in both JSON files.
2. Photos: put the pattern scan in `assets/photos/brocade/` and product photos in `assets/photos/products/`, then extend `collectionPhotos` in `src/lib/photos.ts` with a `<slug>` entry (today it only has `hmong`).
3. Page: in `src/app/[locale]/collections/page.tsx`, add a second `<CollectionBlock id="<slug>" …>` after the H'mong one, with its own `tone`.
4. If the collection has its own products (not tote, mug and coaster), the product list in that page and the product names in `home.craft.products` need the same treatment.

Follow the brand rule in `docs/01-brand.md`: never state what a pattern means unless GIEO has given the meaning.

## 6. Logo

There is no logo file yet. The site shows the word "GIEO" set in the brand serif as a placeholder (`src/components/ui/Logo.tsx`). When GIEO sends an SVG (wordmark and lotus separately, if possible), put it in `assets/logo/` and swap it into that one component. Never redraw or retype it. The lotus film's end crossfade into the logo also waits on this file.

## 7. Deploying

Not deployed yet. Nothing goes live without Maxwell's go-ahead.

- Vercel, import the GitHub repo; framework and build settings are detected.
- Set `NEXT_PUBLIC_SITE_URL` to the final address once there is a domain. Until then canonical links, the sitemap and social cards use the Vercel preview URL.
- After the first preview deploy, run Lighthouse against it (section 8). Every number below was measured locally.

## 8. Checks before any release

All against `npm run build` + `npx next start -p 3101`.

| Command | Checks |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run content:check`, `npm run test:motion` | code and copy |
| `node scripts/qa-lighthouse.mjs` | Lighthouse on all ten routes, mobile and desktop, against the budget in `docs/03-motion-and-3d.md` §7. Add `--base <preview URL>` once deployed. |
| `node scripts/qa-a11y.mjs` | keyboard walk: skip link, every Tab stop ringed and on screen, no trap, phone menu by keyboard, alt text, headings, decorative media hidden |
| `node scripts/qa-fuller-b.mjs all`, `qa-fuller-nav.mjs`, `qa-fuller-pages.mjs`, `qa-density.mjs`, `qa-redesign.mjs` | the scroll story, navigation, density and motion checks from earlier phases (some were written for Maxwell's Windows PC and launch Chrome with D3D11) |

## 9. Open before launch

Every question in `docs/00-open-questions.md`, and every other `TODO(tag)` in the code. A TODO renders nothing on the live site, so none of these breaks a page; each one is a gap.

| # | Tag | What is missing | What the site does meanwhile |
|---|---|---|---|
| 1 | `brand` | Canva deck or PDF: exact colours, fonts, extra copy | Estimated colour tokens in `src/styles/tokens.css` |
| 2 | `logo-svg` | Logo as SVG | Text placeholder "GIEO" (section 6) |
| 3 | `shop` | How people buy today (Shopee, DMs, form, in person) | "Order via Instagram / email" links |
| 4 | `donate` | Whether and how to donate | No donate button; `getInvolved.donate.body` empty |
| 5 | `products` | Product photos and one flat brocade scan | Blender renders of the products; plain-weave texture |
| 6 | `photos` | Which recap and trip photos have consent | Hands, landscapes and products only |
| 7 | `team` | Team list for About | Department list only; `about.teamHeading` empty |
| 8 | `stat` | Any public impact numbers | No numbers anywhere |
| 9 | `domain` | Domain name | Vercel preview URL (section 7) |
| 10 | `lang` | Default language | Follows the browser, Vietnamese when unsure |
| 11 | `mentor` | Who receives mentor sign-ups | `mailto:gieovietnam2026@gmail.com` |
| 12 | `ib` | Permission to use the IB Global Youth Action Fund mark | Text mention only, no logo |
| — | `video` | The "Nhìn lại một mùa GIEO" recap video | Journal shows stills only |
| — | `volunteer` | Volunteer copy | `getInvolved.volunteer.body` empty |
| — | `copy-vi` | Vietnamese for the Journal's closing line | `home.journal.closing` shows in English only |
| — | draft copy | GIEO approval of 79 DRAFT strings (section 3) | Drafts are live text |

Decisions for Maxwell, carried from `PROGRESS.md`:

- **Pins over 150vh.** `CLAUDE.md` caps a pin at 150vh; the hero runs 190svh and the product run 215svh (docs/08). Scroll is never blocked and nothing pins under reduced motion. Approve the exception or ask for it to be cut.
- **Home length.** About 15 screens at 1440×900 against docs/07's 12-screen cap.
- **Not tested here:** Safari (macOS and iOS), Firefox, Samsung Internet (common in Vietnam), a real phone, a real trackpad. This build machine has Chromium only. These need a person and real devices before launch.
- **Lighthouse on the real host.** Local HTTP/2 numbers pass with 21 to 27 ms to spare on two Vietnamese sub-pages; the deciding run is against the Vercel preview.
