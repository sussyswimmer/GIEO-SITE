# 09 · GIEO's first feedback (November 2026)

This brief overrides `07-redesign.md` and `08-fuller.md` wherever they disagree. Everything they say that is not
named here still stands: the three films, the fallback tiers, the scroll rules, the footer.

## What GIEO said

> overall i really like the website but we think maybe making the elements and font sizes smaller like a bit so
> that its easier for people to navigate
>
> also right now we don't have the ceramic mug and coasters [...] right now we have the bag, and the lipstick
> holders as our main products

They also shared three photo albums: the Lotte Mall Tây Hồ stall (22-23/8/2026), the Mai Châu trip, and the
inspection trip to Mai Châu ("photos of artisans doing their work are in here").

## F1 · Smaller, a bit

Display type comes down by about a fifth, body type by a step, and the page gets shorter. Nothing goes under the
floors: 14 px for any text, 16 px in a paragraph, 18 px for weight 300, 44 px for anything you tap.

Tokens (`src/styles/tokens.css`), all still fluid from 375 to 1440:

| Token | Was (375 → 1440) | Now |
|---|---|---|
| `--fs-hero` | content width / 2.34 | content width / 2.75 (the height cap is unchanged) |
| `--fs-mega` | 56 → 200 | 48 → 160: `clamp(3rem, 0.5352rem + 10.5164vw, 10rem)` |
| `--fs-h2` | 56 → 132 | 44 → 104: `clamp(2.75rem, 1.4296rem + 5.6338vw, 6.5rem)` |
| `--fs-quote` | 32 → 72 | 28 → 60: `clamp(1.75rem, 1.0458rem + 3.0047vw, 3.75rem)` |
| `--fs-h3` | 24 → 36 | 22 → 30: `clamp(1.375rem, 1.1989rem + 0.7512vw, 1.875rem)` |
| `--fs-h4` | 20 → 24 | 18 → 22: `clamp(1.125rem, 1.037rem + 0.3756vw, 1.375rem)` |
| `--fs-lead` | 18 → 26 | 18 → 24: `clamp(1.125rem, 0.993rem + 0.5634vw, 1.5rem)` |
| `--fs-body` | 16 → 18 | 16 → 17: `clamp(1rem, 0.978rem + 0.0939vw, 1.0625rem)` |
| `--space-section` | 56 → 112 | 48 → 96: `clamp(3rem, 1.9437rem + 4.507vw, 6rem)` |
| `--space-section-sm` | 32 → 72 | 28 → 60: `clamp(1.75rem, 1.0458rem + 3.0047vw, 3.75rem)` |

`--fs-ui`, `--fs-caption`, gutters, wrap width, the nav pill, line-heights and the film stage geometry do not move.

Sizes written outside the tokens come down with them:

| Where | Was | Now |
|---|---|---|
| `Weave.tsx` quote, `Hands.tsx` first sentence | `xl:text-[3.5rem]` | `xl:text-[3rem]` |
| `VisionMission.tsx` headings | `clamp(4.5rem,6.4vw,6.5rem)` | `clamp(3.75rem,5.3vw,5.25rem)` |
| `PillarCard.tsx` title / body | `clamp(1.5rem,6.9cqw,3.25rem)` / `clamp(1.125rem,3.3cqw,1.5rem)` | `clamp(1.375rem,5.8cqw,2.75rem)` / `clamp(1.125rem,3cqw,1.375rem)` |
| `PageHeader.tsx` sub-page h1 | `fit(title, 0.5, '3.5rem', '15rem')` | `fit(title, 0.6, '3rem', '12rem')` |
| `CollectionBlock.tsx`, `PartnerBlock.tsx` name minimum | `'3.5rem'` | `'3rem'` |
| `Button.tsx` | `min-h-12 py-3` (48 px) | `min-h-11 py-2.5` (44 px) |
| `Field.tsx` input | `min-h-13` (52 px) | `min-h-12` (48 px) |

The home page also loses about a screen and a half of pinned scroll, because the product run now rests once (F2).

## F2 · The products are the bag and the lipstick holder

There is no mug and no coaster. They leave the film, the copy, the pictures, the tests and the docs.

The names come from GIEO's own printed leaflet, photographed on the stall table (album items 52 and 206). The
collection is **Nối Nếp**, made with Chie Dù Pù Dù Pà:

| id | EN name | EN kind | VI name | VI kind |
|---|---|---|---|---|
| `bag` | Nối Bag | Brocade handbag | Túi Nối | Túi xách vải thủ công |
| `lipstick` | Nếp Keychain | Lipstick holder | Móc Nếp | Móc đựng son dưỡng |

- Tagline, VI verbatim: "Nối nghề. Nối người. Nối tương lai." EN: "Connecting craft. Connecting people.
  Connecting futures." (the first word is hidden in the photo, so the EN line is DRAFT).
- Body, from the leaflet's first clause. VI: "Những sản phẩm được tạo nên từ vải canvas và vải dệt thủ công."
  EN: "Products crafted from canvas and brocade fabrics." (DRAFT for the same reason).
- The leaflet also lists a zip wallet and a fold wallet, and prices. GIEO named only the bag and the lipstick
  holder as main products, so the wallets and all prices stay off the site until GIEO asks for them.
- **Open, for GIEO:** the leaflet and GIEO's info sheet say the patterns come from the weaving of the **Thái**
  people in Chiềng Châu, Mai Châu. The site's mission copy, which GIEO wrote, says **H'mông** throughout. Until
  GIEO settles it, the collection copy names no ethnic group, and GIEO's own sentences are left exactly as they
  wrote them. The old draft label "H'mong brocade" over the products becomes "Nối Nếp".

Content keys (both locales, all listed in `_meta.json` `draftKeys`):

```
home.craft.products.bag.name        home.craft.products.bag.kind
home.craft.products.lipstick.name   home.craft.products.lipstick.kind
collections.noinep.name   collections.noinep.tagline   collections.noinep.body   collections.noinep.credit
photos.<id>.alt           one per photo in src/lib/photos-manifest.json
```

`home.craft.products.tote|mug|coaster` and `collections.hmong.*` are removed. The credit string is unchanged.

### The weave film

The film ends on the bag: frames 0 to 129 of the old film, a lossless stream copy (every frame is a keyframe).
Beats: thread 0-30, warps 30-50, weave 50-89, drape 89-109, bag 109-129. Keys: 0, 50, 89, 129. The beat id is
`bag` (was `tote`); the model in the film is still the stylised bag the film has always had, not a likeness of
the Nối Bag. The real products are shown in photographs.

- The product run rests once. `weaveRun` is one `hold`; the pace values stay (wide 54 / 26 svh, phone 48 / 14).
  The floors in `timeline.test.mjs` are restated for one rest: at least 45 svh wide and phone.
- Both product names stand beside the stage in one list, name large and kind small. They light together when the
  bag is at least half in. Nothing lights for a product the film does not show.
- `blender/film/weave.py`, `art.py` and `stills.py` are edited so the scripts still build exactly what ships
  (130 frames, no mug, no coaster). `scripts/encode-film.mjs` matches.
- Gone from `public/`: `film/weave/keys/s-0149.webp`, `s-0169.webp`, `art/products/mug*.webp`,
  `coaster*.webp`, `film/stills/products.webp`, `posters/weave-3-*`, `weave-4-*`. `public/video/weave.mp4`
  (loaded by no page) is cut before the mug appears.
- Left as it is, and listed as open in `PROGRESS.md`: the unmounted R3F weave scene and its `models/weave.glb`,
  which still hold a mug and a coaster nobody can see.

## F3 · Real photographs

Thirteen frames, chosen from 663, are in `assets/photos/` with `assets/consent.csv` and
`assets/photos/SOURCES.md`. `npm run images` writes them to `public/img/` with all metadata stripped.

**The rule (replaces 08's "no photos of people"):** a real GIEO photo may be used when no person in it can be
recognised. Hands and a back view are fine. No face of a child or a teenager, ever, without GIEO's consent for
that photo; the team are minors too. 467 of the 663 frames fail this and are not in the repo.

**Words:** alt text says what is visible and nothing else. No place names, no ethnic group, no "our artisans":
we do not know who is in each frame. Product photos carry the partner credit. No other captions.

Where they go:

| Slot | Photo id | Notes |
|---|---|---|
| Home, Journal grid | `01-loom-weaver` … `06-valley` | The grid `Journal.tsx` already has; it replaces the rail of stills |
| Home, Hands, beside the partner name | `bag-pink`, with `lipstick-on-bag` as a smaller second frame | Replaces `products.webp`. Each frame is labelled with the product name and kind; one credit line |
| Home, Hands, lower | `loom-cloth` | Replaces the cloth still |
| Collections, Nối Nếp swatch | `nep-cloth` | The 16/9 slot that was empty |
| Collections, slabs | `bag-rows`, `lipstick-rows` | Two slabs, name and kind, credit |
| About, story | `sewing-cloth` | Replaces the lotus-seeds still |
| About, partner block | `bag-rows` | Replaces `products.webp`, with the credit |

Frames are calm: `--round-frame` corners, no shadow heavier than the site already uses, at most 60vw wide.
Get involved and Contact take no photo: a trip picture beside "what we're building" would read as a result.

## Checks

- `npm run typecheck`, `lint`, `content:check`, `test:motion`, `test:images`, `build` clean.
- No "mug", "coaster", "ceramic", "cốc", "lót ly" in `src/`, `public/film/weave/manifest.json` or the built HTML.
- Screenshots at 375 and 1440 of every route, both languages; the weave stage at each beat end.
- Vietnamese diacritics intact on "Nối Nếp", "Túi Nối", "Móc Nếp", "Móc đựng son dưỡng" at every size.
- No horizontal overflow at 320, 375, 390, 768, 1024, 1440.
