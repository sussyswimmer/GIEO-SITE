# 09 · GIEO's first feedback, applied to the showroom design (November 2026)

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

## The design stays

A first pass rebuilt the site in a different style to answer this. Maxwell rejected it and chose the showroom
design (the vine hero, the roots seam, the weave film, the 3D Collections gallery, the loader, the cursor, the
redone About and Contact; `PROGRESS.md` from "2026-11-17: Collections gallery track"). That pass stays in git
history (`3ceba9d`). This brief changes only what GIEO asked for, in the site's own style:

- display headings about 10 % smaller, nothing else resized (F1);
- the Nối Bag and the Nếp Keychain in 3D, in the same soft style, and no mug or coaster anywhere (F2);
- GIEO's photographs placed as prints (F3).

Layout, motion, colour, copy outside the product blocks and every other size stay as they were.

## F1 · Display headings, about 10 % smaller

Only the four display tokens in `src/styles/tokens.css` move. Body, lead, h3, h4, UI, caption, spacing, buttons
and the film stages do not.

| Token | Was (375 → 1440) | Now |
|---|---|---|
| `--fs-hero` | content width / 2.34, short-screen bound `(100svh - 21rem) / 0.95` | content width / 2.6, bound `/ 1.055` (134 px at 390, 504 px at 1440×900) |
| `--fs-mega` | 56 → 200 | 50 → 180: `clamp(3.15rem, 0.2979rem + 12.169vw, 11.25rem)` |
| `--fs-h2` | 56 → 132 | 50 → 119: `clamp(3.15rem, 1.6447rem + 6.4225vw, 7.425rem)` |
| `--fs-quote` | 32 → 72 | 29 → 65: `clamp(1.8rem, 1.0077rem + 3.3803vw, 4.05rem)` |

## F2 · The products are the Nối Bag and the Nếp Keychain, in 3D

There is no mug and no coaster. They leave the films, the gallery, the copy, the pictures, the models, the tests
and the docs.

The names come from GIEO's printed leaflet (`02-content.md`, "/collections: the Nối Nếp collection"). The
collection is **Nối Nếp**, made with Chie Dù Pù Dù Pà:

| id | EN name | EN kind | VI name | VI kind |
|---|---|---|---|---|
| `bag` | Nối Bag | Brocade handbag | Túi Nối | Túi xách vải thủ công |
| `lipstick` | Nếp Keychain | Lipstick holder | Móc Nếp | Móc đựng son dưỡng |

- Tagline, VI verbatim: "Nối nghề. Nối người. Nối tương lai." EN `DRAFT`: "Connecting craft. Connecting people.
  Connecting futures."
- The leaflet also lists a zip wallet, a fold wallet and prices. None of them is shown, modelled or left in a
  photo's crop.
- Content keys (both locales, all in `_meta.json` `draftKeys`): `home.craft.products.{bag,lipstick}.{name,kind}`,
  `collections.noinep.{name,tagline,body,credit}`, `photos.<id>.alt`. Removed: `home.craft.products.tote|mug|coaster`
  and `collections.hmong.*`. The credit string is unchanged.

### The models, after GIEO's photos

- **Nối Bag:** a soft canvas body gathered into uneven pleats under a straight brocade band that forms the
  opening, a rounded foot, and one brocade handle arching over the band.
- **Nếp Keychain:** a flat sleeve with a brocade front, a plain canvas flap with a rounded lower edge, a wooden
  four-hole button, and a canvas loop tab at the top holding a brass lobster clasp.
- Both in the site's soft, matte, pastel 3D: pink canvas, cream and petal cloth. The films and portraits keep the
  film's plain weave (one mint end), never an invented motif. The Collections showroom draws a calm two-tone
  diamond lattice, like the photos' cloth, that settles to the cloth's average colour when small so it never
  shimmers.

### Where they appear

- **Home, weave film** (`blender/film/weave.py`, `public/film/weave/`): 150 frames. The woven square lifts off
  the loom and drops into the Nối Bag as it rises; the band weaves round the rim and the handle is drawn over;
  the bag rests; the film glides across to the Nếp Keychain, which rests. Beats: thread 0-30, warps 30-50, weave
  50-89, drape 89-109, bag 109-129, lipstick 129-149. Keys: 0, 50, 89, 129, 149. Frames 0 to 89 are unchanged.
- **Home, weave section** (`Weave.tsx`, `motion-runtime.ts` `mountWeave`): the two names beside the stage, each
  with its kind small under it, each lit while its product rests. The run is a rest per product and one change
  between them (`weaveRun`; `WEAVE_PACE` values unchanged). The glide skips frames 129 to 140 while faded
  (`WIPE`). The band lists the two names.
- **Home, Hands** (`public/film/stills/products.webp`): the products still is now the bag with the keychain
  standing in front of it.
- **Collections gallery** (`blender/scripts/weave.py` → `public/models/weave.glb`, `ShowroomScene.tsx`,
  `Showroom.tsx`): the row is intro, Nối Bag, Nếp Keychain, how to order. Each product hangs and turns in its box
  as the tote did; the bag's strap sways, the keychain's clasp swings and the holder rocks round a three-quarter
  view. Each name has its kind small under it; the intro has the tagline. The pinned run keeps each product the
  scroll it had: 219svh on a phone, 171svh from 64rem (`runLength(2)`, set in `globals.css`).
- **Portraits** for the Lite and no-canvas gallery (`blender/film/art.py` → `public/art/products/{bag,lipstick}.webp`).

## F3 · Real photographs, as prints

Thirteen frames, chosen from 663, are in `assets/photos/` with `assets/consent.csv` and
`assets/photos/SOURCES.md`. `npm run images` writes them to `public/img/` with all metadata stripped. Pages look
them up by id (`photo(id, t)` in `src/lib/photos.ts`).

**The rule (replaces 08's "no photos of people"):** a real GIEO photo may be used when no person in it can be
recognised. Hands and a back view are fine. No face of a child or a teenager, ever, without GIEO's consent for
that photo; the team are minors too. Every photo needs a `yes` row in `assets/consent.csv` (a missing row counts
as no) and a source in `assets/photos/SOURCES.md`; a photo renders only with consent and its alt text.

**Words:** alt text (`photos.<id>.alt`, DRAFT) says what is visible and nothing else. No place names, no
ethnic group, no "our artisans": we do not know who is in each frame. Product photos carry their name and kind
and one partner credit. No other captions.

**The print** (`src/components/ui/PhotoPrint.tsx`): a thin cream mat (`--print-mat`), `--round-print` corners,
a soft contact shadow (`--elev-print`, `--elev-print-plum` on plum), a slight tilt, an optional petal glow. It
fades, rises and turns to its tilt as it enters; the picture drifts a little inside its window.

| Where | Photo id |
|---|---|
| Home, Journal | `01-loom-weaver` … `06-valley`: a loose two-row cluster beside the heading from 1024 px, a short sideways strip that scrolls by touch below (no snap, no scrollbar). The still-life rail stays |
| Home, Hands | `loom-cloth`, under the partner paragraph |
| Collections, "As made" (`AsMade.tsx`, on plum after the gallery) | `bag-pink` and `lipstick-on-bag`, cropped to the products with no wallet in frame, each labelled with name and kind; `nep-cloth` between them from 1024 px; the credit once |
| About, partner block | `02-stilt-house` |

`bag-rows`, `lipstick-rows` and `sewing-cloth` have consent and alt text but are not placed. Get involved and
Contact take no photo.

## Open, for GIEO: H'mong or Thái

GIEO's own copy (the Org Info doc, and every sentence of theirs on the site) says H'mong (VI: H'Mông). Their
Nối Nếp leaflet and info sheet say the patterns come from the weaving of the Thái people in Chiềng Châu, Mai
Châu. Until GIEO answers (`00-open-questions.md` #13), their sentences stay exactly as they wrote them, and
anything new about the products (the collection copy, the labels, the alt text) names no ethnic group.

## Checks

- `npm run typecheck`, `lint`, `content:check`, `test:motion`, `test:images`, `test:models`, `build` clean.
- No "mug", "coaster", "ceramic", "cốc sứ", "lót ly", `collections.hmong` or `products.tote` in `src/`,
  `scripts/`, `blender/`, `public/film/weave/manifest.json`, the strings of `public/models/*.glb` or the built
  HTML, except where a test asserts their absence.
- Walk every route in EN and VI with `?tier=full` at 1440×900 and 390×844 on a production build: no console
  errors, no failed requests, no horizontal overflow from 320 to 1440. Compare against the showroom design's
  screenshots: nothing changes but F1, F2 and F3.
- Vietnamese diacritics intact on "Nối Nếp", "Túi Nối", "Móc Nếp", "Móc đựng son dưỡng" at every size.
