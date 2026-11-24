# Where each photo came from

GIEO shared three albums in November 2026. Eleven frames are kept, from 663. Every frame here
shows no identifiable person. Files are web-size copies (at most 2400 px wide), cropped as listed
and blurred where listed under "Blurred in the file".
Crop boxes are fractions of the original frame: x, y, width, height.

| File | Album | Original | Crop |
|---|---|---|---|
| products/bag-pink.jpg | Lotte Mall Tây Hồ stall, 22-23/8/2026 | album item 10 | 0.5095, 0.3370, 0.3915, 0.3329 (see below) |
| products/lipstick-on-bag.jpg | Lotte Mall Tây Hồ stall | album item 182 | 0.4008, 0.3099, 0.1463, 0.1325 (see below) |
| brocade/nep-cloth.jpg | Inspection trip (Mai Châu) | DSCF1237.JPG | 0.30, 0.30, 0.70, 0.55 |
| journal/01-loom-weaver.jpg | Mai Châu trip, GIEO 2026 | DSCF3872.JPG | 0.34, 0.10, 0.66, 0.90 (removes a distant passer-by) |
| journal/02-stilt-house.jpg | Mai Châu trip | DSCF3681.JPG | whole frame; sign and number plates blurred (see below) |
| journal/03-heddles.jpg | Inspection trip | DSCF1430.JPG | whole frame |
| journal/04-sewing-hands.jpg | Inspection trip | DSCF1385.JPG | whole frame |
| journal/05-cloth-on-loom.jpg | Mai Châu trip | DSCF3897.JPG | whole frame |
| journal/06-valley.jpg | Mai Châu trip | DSCF3768.JPG | whole frame |
| artisans/loom-cloth.jpg | Mai Châu trip | DSCF3895.JPG | whole frame |
| artisans/sewing-cloth.jpg | Inspection trip | DSCF1365.JPG | whole frame |

**The two product photos hold only what the page shows** (re-cut 23/11/2026). The stall table also holds
wallets, printed sheets and GIEO's leaflet, which the site does not show (`docs/09-feedback.md` F2), so each file
is cut to the product from the full-resolution album frame (6240 × 4160) and nothing else is in it. Each crop is
the earlier file's crop followed by the window the "As made" print used to show, tightened where that window
still touched something:

- `bag-pink.jpg`: pixels 3179, 1402, 2443 × 1385 of item 10, scaled to 2400 × 1361. Earlier crop 0.10, 0.25,
  0.90, 0.75, then the print's window 0.455, 0.08 to 0.89, 0.56; the top is 112 px lower than that window to
  drop the out-of-focus yellow cloth behind the bags, which may be someone's clothing.
- `lipstick-on-bag.jpg`: pixels 2501, 1289, 913 × 551 of item 182, at full resolution. Earlier crop 0.36, 0.22,
  0.26, 0.25, then the print's window 0.14, 0.36 to 0.72, 0.90; the left edge is 28 px further in (the blurred
  edge of a zip wallet) and the bottom 11 px higher (the corner of a printed sheet).

Both are saved as JPEG at quality 94 with no metadata (no EXIF, GPS, XMP or ICC).

**Blurred in the file** (23/11/2026). Text that names a place, a shop, a group or a person, and number plates,
are blurred in the source JPEG by `scripts/redact-photos.mjs` (`npm run redact`), which holds the same boxes.
It is re-runnable: a file whose boxes are already blurred is left untouched, and `npm run images` refuses a
listed file that is not. Boxes are pixels of the file as it is now: x, y, width, height.

- `journal/02-stilt-house.jpg` (2400 × 1600): the shop sign under the eaves, 1320, 965, 245 × 105 (the partner's
  name and logo, a trade line naming ethnic minorities, an email address and a Hà Nội street address); the car's
  number plate, 392, 1312, 38 × 24; four motorbike number plates, 12, 1312, 22 × 20; 100, 1302, 30 × 22;
  186, 1296, 38 × 28; 352, 1316, 32 × 24. The web-size copy was blurred once and saved as JPEG at quality 94
  with no metadata.

Not used, and not in the repo: every frame with a recognisable face (467 of the 663 show children or
teenagers), every frame of another group's stall, and every stall frame that cannot be cut free of the wallets,
the printed sheets and the leaflet (two such frames, album items 20 and 37, were removed on 23/11/2026).

To add a photo: put the file under `assets/photos/<collection>/`, add a row to `assets/consent.csv`,
add `photos.<id>.alt` to both `src/content/*.json` files, then run `npm run images`.
